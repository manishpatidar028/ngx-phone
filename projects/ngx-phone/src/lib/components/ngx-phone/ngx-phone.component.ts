import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
  FormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import {
  Country,
  PhoneCustomValidator,
  PhoneInputConfig,
  PhoneNumberValue,
  ValidationResult,
} from '../../models/phone-number.model';

import { CountryService } from '../../services/country.service';
import { PhoneValidationService } from '../../services/phone-validator.service';
import { PlatformHelper } from '../../utils/platform.util';
import {
  normalizePhoneConfig,
  NormalizedPhoneConfig,
} from '../../utils/phone-config.util';
import {
  shouldDetectCountryFromInput as shouldDetectFromInputUtil,
  extractNationalNumber as extractNationalNumberUtil,
  rewriteWithNewDialCode as rewriteWithNewDialCodeUtil,
  computeDropdownPosition,
  pickDynamicPhoneError,
} from '../../utils/phone-number.util';
import { SmartFlagService } from '../../services/smart-flag.service';

/**
 * NgxPhoneComponent - Advanced phone number input component
 * 
 * A comprehensive Angular component for international phone number input with:
 * - Real-time validation using libphonenumber-js
 * - Country detection from input
 * - Customizable formatting and display
 * - Reactive and template-driven forms support
 * - Accessibility features
 * - Smart flag rendering
 * 
 * @example
 * ```html
 * <ngx-phone
 *   [config]="phoneConfig"
 *   [(ngModel)]="phoneNumber"
 *   [required]="true"
 *   (countryChange)="onCountryChange($event)"
 *   (numberChange)="onNumberChange($event)">
 * </ngx-phone>
 * ```
 */
@Component({
  selector: 'ngx-phone',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ngx-phone.component.html',
  styleUrls: ['./ngx-phone.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NgxPhoneComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => NgxPhoneComponent),
      multi: true,
    },
  ],
})
export class NgxPhoneComponent
  implements
    OnInit,
    AfterViewInit,
    OnDestroy,
    OnChanges,
    ControlValueAccessor,
    Validator
{
  // ===================================================================
  // ViewChild References - DOM element access
  // ===================================================================
  @ViewChild('phoneInput') phoneInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownRef') dropdownRef!: ElementRef;
  @ViewChild('phoneWrapperRef') wrapperRef!: ElementRef;

  // ===================================================================
  // Component Inputs - Configuration and state from parent
  // ===================================================================
  
  /** Component configuration object */
  @Input() config: PhoneInputConfig = {};
  
  /** Reference to parent FormControl for reactive forms */
  @Input() public formControls!: AbstractControl | null;
  
  /** Whether the input is disabled */
  @Input() disabled = false;
  
  /** Whether the input is required */
  @Input() required = false;
  
  /** Whether the input is read-only */
  @Input() readonly = false;
  
  /** Custom validation functions */
  @Input() customValidators: PhoneCustomValidator[] = [];

  // ===================================================================
  // Component Outputs - Events emitted to parent
  // ===================================================================
  
  /** Emitted when country selection changes */
  @Output() countryChange = new EventEmitter<Country>();
  
  /** Emitted when phone number value changes */
  @Output() numberChange = new EventEmitter<PhoneNumberValue | null>();
  
  /** Emitted when validation result changes */
  @Output() validationChange = new EventEmitter<ValidationResult>();
  
  /** Emitted when input loses focus */
  @Output() blur = new EventEmitter<void>();
  
  /** Emitted when input gains focus */
  @Output() focus = new EventEmitter<void>();
  
  /** Emitted when Enter key is pressed */
  @Output() enter = new EventEmitter<void>();

  // ===================================================================
  // Host Bindings - CSS classes applied to component host element
  // ===================================================================
  
  /** Main component CSS class */
  @HostBinding('class.ngx-phone-host') hostClass = true;
  
  /** Disabled state CSS class */
  @HostBinding('class.disabled') get isDisabled() {
    return this.disabled;
  }
  
  /** Focused state CSS class */
  @HostBinding('class.focused') get isFocusedClass() {
    return this.isFocused;
  }
  
  /** Error state CSS class */
  @HostBinding('class.has-error') get hasError() {
    return this.shouldShowError() && this.normalizedConfig.showInvalidBorder;
  }

  // ===================================================================
  // Component State - Internal data and flags
  // ===================================================================
  
  /** Current phone number value as string */
  phoneValue = '';
  
  /** Currently selected country */
  selectedCountry: Country | null = null;
  
  /** Parsed phone number object */
  phoneNumberValue: PhoneNumberValue | null = null;
  
  /** Current validation result */
  validationResult: ValidationResult | null = null;

  /** Validation state flags */
  isValid = false;
  isPossible = false;
  
  /** UI interaction state flags */
  isFocused = false;
  isCountryLocked = false;
  isManualCountrySelection = false;

  /** Dropdown state */
  showDropdown = false;
  dropdownPosition: 'top' | 'bottom' = 'bottom';
  actualDropdownPosition: 'top' | 'bottom' = 'bottom';

  /** Country data arrays */
  countries: Country[] = [];
  filteredCountries: Country[] = [];
  preferredCountriesList: Country[] = [];

  /** Search functionality */
  searchQuery = '';
  highlightedIndex = -1;

  /** Accessibility IDs */
  public readonly errorId = `ngx-phone-err-${Math.random()
    .toString(36)
    .slice(2)}`;
  public readonly inputId = `ngx-phone-input-${Math.random()
    .toString(36)
    .slice(2)}`;

  // ===================================================================
  // RxJS Streams - Reactive programming streams
  // ===================================================================
  
  /** Cleanup stream for subscriptions */
  private destroy$ = new Subject<void>();
  
  /** Phone input debouncing stream */
  private phoneInput$ = new Subject<string>();
  
  /** Search input debouncing stream */
  private searchInput$ = new Subject<string>();

  /** ControlValueAccessor callback functions */
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  /** User interaction tracking */
  private hasUserInteracted = false;
  private hasBeenFocused = false;
  private hasShownError = false;

  /** Internal validation state */
  private isValidating = false;

  /** Normalized configuration cache */
  private _normalized!: NormalizedPhoneConfig;
  get normalizedConfig(): NormalizedPhoneConfig {
    return this._normalized;
  }

  constructor(
    private countryService: CountryService,
    private validationService: PhoneValidationService,
    private cdr: ChangeDetectorRef,
    private platformHelper: PlatformHelper,
    private smartFlagService: SmartFlagService
  ) {}

  // ===================================================================
  // Angular Lifecycle Methods
  // ===================================================================

  /**
   * Component initialization
   * Sets up configuration, loads countries, and establishes subscriptions
   */
  ngOnInit(): void {
    this._normalized = normalizePhoneConfig(this.config ?? {});
    this.loadCountries();
    this.setInitialCountry();
    this.setupSubscriptions();
    
    if (this.formControls) {
      this.formControls.statusChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.applyExternalErrors());
    }
  }

  /**
   * Handle configuration changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this._normalized = normalizePhoneConfig(this.config ?? {});
      this.loadCountries();
      this.setInitialCountry();
    }
  }

  /**
   * Post-view initialization
   * Handles auto-focus if configured
   */
  ngAfterViewInit(): void {
    if (
      this.platformHelper.isBrowser &&
      this.normalizedConfig.autoFocus &&
      !this.disabled
    ) {
      setTimeout(() => this.phoneInputRef?.nativeElement?.focus(), 0);
    }
  }

  /**
   * Component cleanup
   * Completes all RxJS streams to prevent memory leaks
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===================================================================
  // Style and UI Helper Methods
  // ===================================================================

  /**
   * Get container styles including custom borders
   */
  getContainerStyles(): { [key: string]: string } {
    const styles: { [key: string]: string } = {};

    if (
      this.normalizedConfig.customContainerBorder &&
      this.normalizedConfig.containerBorderStyle
    ) {
      Object.assign(styles, this.normalizedConfig.containerBorderStyle);
    }

    return styles;
  }

  /**
   * Get placeholder styles for custom styling
   */
  getPlaceholderStyles(): { [key: string]: string } {
    const styles: { [key: string]: string } = {};

    if (this.normalizedConfig.customPlaceholderStyle) {
      Object.assign(styles, this.normalizedConfig.customPlaceholderStyle);
    }

    return styles;
  }

  /**
   * Get dropdown positioning styles
   */
  getDropdownStyles(): { [key: string]: string } {
    const styles: { [key: string]: string } = {};

    if (this.actualDropdownPosition === 'top') {
      styles['bottom'] = '100%';
      styles['top'] = 'auto';
      styles['margin-bottom'] = '4px';
    } else {
      styles['top'] = '100%';
      styles['bottom'] = 'auto';
      styles['margin-top'] = '4px';
    }

    return styles;
  }

  /**
   * Get CSS classes for dropdown positioning
   */
  getDropdownClasses(): string[] {
    const classes = [
      this.actualDropdownPosition === 'top'
        ? 'dropdown--top'
        : 'dropdown--bottom',
      this.normalizedConfig.dropdownClass || '',
    ].filter(Boolean);

    return classes;
  }

  /**
   * Get CSS classes for flag positioning
   */
  getFlagClasses(): string {
    return [
      this.normalizedConfig.flagPosition === 'start'
        ? 'flag-start'
        : 'flag-end',
      this.normalizedConfig.showInlineDivider === false ? 'no-divider' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Get effective placeholder text (custom or default)
   */
  getEffectivePlaceholder(): string {
    if (this.normalizedConfig.customPlaceholder && this.selectedCountry) {
      return this.normalizedConfig.customPlaceholder(this.selectedCountry);
    }

    return this.normalizedConfig.placeholder || 'Enter phone number';
  }

  /**
   * Determine if inline flag should be displayed
   */
  shouldShowInlineFlag(): boolean {
    return (
      !this.normalizedConfig.separateCountrySelector &&
      this.normalizedConfig.showFlags &&
      this.normalizedConfig.flagPosition !== 'none'
    );
  }

  /**
   * Get the current error to display (external or internal)
   */
  get displayedError(): { type: string; message: string } | null {
    // Priority 1: External FormControl errors (required, minLength, etc.)
    const external = pickDynamicPhoneError(
      this.formControls?.errors ?? null,
      this.normalizedConfig.errorMessages
    );
    if (external) return external;

    // Priority 2: Component's internal validation errors
    return this.validationResult?.error ?? null;
  }

  // ===================================================================
  // Setup and Configuration Methods
  // ===================================================================

  /**
   * Load and filter the country list based on configuration
   */
  private loadCountries(): void {
    const only = (this._normalized?.onlyCountries ??
      this.config?.onlyCountries ??
      []) as string[];
    const exclude = (this._normalized?.excludeCountries ??
      this.config?.excludeCountries ??
      []) as string[];
    const preferred = (this._normalized?.preferredCountries ??
      this.config?.preferredCountries ??
      []) as string[];

    this.countries = this.countryService.filterCountries(only, exclude);
    this.filteredCountries = [...this.countries];
    this.preferredCountriesList = this.countryService.getPreferredCountries(
      preferred as string[]
    );
  }

  /**
   * Set the initial country based on configuration
   * Default countries are treated as manual selections to prevent override
   */
  private setInitialCountry(): void {
    if (this.selectedCountry) {
      return;
    }

    if (this.normalizedConfig.defaultCountry) {
      const country = this.countryService.getCountryByIso2(
        this.normalizedConfig.defaultCountry
      );
      if (country) {
        this.selectCountry(
          country,
          this.normalizedConfig.showCountryCodeInInput &&
            !this.normalizedConfig.separateCountrySelector,
          this.normalizedConfig.clearInputOnCountryChange &&
            !this.normalizedConfig.separateCountrySelector,
          true // Mark as manual to prevent auto-detection override
        );
      }
    } else if (
      this.normalizedConfig.autoDetectCountry &&
      this.platformHelper.isBrowser
    ) {
      const locale = navigator.language || '';
      const code = locale.split('-')[1];
      const country = code
        ? this.countryService.getCountryByIso2(code)
        : undefined;
      if (country) {
        this.selectCountry(
          country,
          false,
          this.normalizedConfig.clearInputOnCountryChange,
          false
        );
      }
    }
  }

  /**
   * Set up RxJS subscriptions for input debouncing
   */
  private setupSubscriptions(): void {
    this.phoneInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => this.processPhoneNumber(val));

    this.searchInput$
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => this.filterCountries(query));
  }

  /**
   * Filter country list based on search query
   */
  private filterCountries(query: string): void {
    if (!query) {
      this.filteredCountries = [...this.countries];
    } else {
      this.filteredCountries = this.countryService.searchCountries(query);
    }
  }

  // ===================================================================
  // Phone Input Logic - Core validation and formatting
  // ===================================================================

  /**
   * Process phone number input with debouncing
   * Handles country detection, formatting, and validation
   */
  private processPhoneNumber(value: string): void {
    if (this.phoneValue === value) {
      return;
    }

    const digits = value.replace(/\D/g, '');
    const trimmedValue = value.trim();

    // Reset country lock only when switching from national to international format
    if (trimmedValue.startsWith('+')) {
      if (!this.phoneValue.startsWith('+')) {
        this.isCountryLocked = false;
        this.isManualCountrySelection = false;
      }
    }

    // Country detection - only for international numbers or when no country exists
    const shouldDetectCountry = shouldDetectFromInputUtil(trimmedValue, digits);
    if (
      shouldDetectCountry &&
      !this.isManualCountrySelection &&
      !this.isCountryLocked
    ) {
      if (trimmedValue.startsWith('+') || !this.selectedCountry) {
        const previousCountryIso = this.selectedCountry?.iso2;
        this.detectCountryFromInput(trimmedValue);

        if (previousCountryIso !== this.selectedCountry?.iso2) {
          this.cdr.detectChanges();
        }
      }
    }

    // Fallback country only when no country is selected and user hasn't manually chosen
    if (
      !this.selectedCountry &&
      !this.isManualCountrySelection &&
      digits.length >= 3 &&
      !trimmedValue.startsWith('+')
    ) {
      this.fallbackToDefaultCountry();
    }

    // Apply formatting if auto-format is enabled and we have a country
    if (
      this.normalizedConfig.autoFormat &&
      this.selectedCountry &&
      digits.length > 0
    ) {
      try {
        let toFormat = trimmedValue;

        // For national format, prepend the country code for formatting
        if (!trimmedValue.startsWith('+')) {
          toFormat = `${this.selectedCountry.dialCode} ${trimmedValue}`;
        }

        const formatted = this.validationService.formatAsYouType(
          toFormat,
          this.selectedCountry.iso2
        );

        if (formatted && formatted !== this.phoneValue) {
          // Remove country code from display for national format
          if (
            !trimmedValue.startsWith('+') &&
            formatted.includes(this.selectedCountry.dialCode)
          ) {
            const nationalFormatted = formatted
              .replace(this.selectedCountry.dialCode, '')
              .trim();
            this.phoneValue = nationalFormatted;
          } else {
            this.phoneValue = formatted;
          }

          if (this.phoneInputRef?.nativeElement) {
            this.phoneInputRef.nativeElement.value = this.phoneValue;
          }
        }
      } catch {
        // Keep original value on formatting error
      }
    }

    this.validateNumber();

    if (this.phoneValue === value) {
      this.emitValue();
    }
  }

  /**
   * Detect country from phone number input
   * Respects manual country selection and dial code preferences
   */
  private detectCountryFromInput(value: string): void {
    if (this.isManualCountrySelection || this.isCountryLocked) {
      return;
    }

    let detected = this.validationService.extractCountry(value);

    // Apply dial code country preference for international numbers
    if (value.startsWith('+')) {
      if (detected && this.normalizedConfig.dialCodeCountryPreference) {
        const dialCodeNumber = detected.dialCode.replace('+', '');
        const preferredIso =
          this.normalizedConfig.dialCodeCountryPreference[dialCodeNumber];

        if (preferredIso) {
          const preferredCountry =
            this.countryService.getCountryByIso2(preferredIso);
          if (preferredCountry) {
            detected = preferredCountry;
          }
        }
      }
    }

    if (detected && detected.iso2 !== this.selectedCountry?.iso2) {
      this.selectCountry(detected, false, false, false);
      this.countryChange.emit(detected);
      this.cdr.markForCheck();
      this.filterCountries(this.searchQuery);
    }
  }

  /**
   * Use fallback/default country when detection fails
   * Only when no manual selection has been made
   */
  private fallbackToDefaultCountry(): void {
    if (
      this.isManualCountrySelection ||
      this.isCountryLocked ||
      this.selectedCountry
    ) {
      return;
    }

    const iso = (
      this.normalizedConfig.defaultCountry ||
      this.normalizedConfig.fallbackCountry ||
      'US'
    ).toUpperCase();
    const fallback = this.countryService.getCountryByIso2(iso);
    if (fallback) this.selectCountry(fallback, false, false);
  }

  /**
   * Set selected country and reformat input
   * Properly tracks manual selections to prevent unwanted changes
   */
  private selectCountry(
    country: Country,
    updateInput: boolean = true,
    clearInput: boolean = false,
    isManual: boolean = false
  ): void {
    const previousCountry = this.selectedCountry;
    this.selectedCountry = country;

    // Set manual selection flags for user-initiated changes
    if (isManual) {
      this.isManualCountrySelection = true;
      this.isCountryLocked = true;
    }

    // Prevent automatic detection from overriding manual selections
    if (this.isManualCountrySelection && !isManual) {
      this.selectedCountry = previousCountry;
      return;
    }

    if (updateInput) {
      if (clearInput || !this.phoneValue || isManual) {
        if (isManual && this.phoneValue) {
          const nationalNumber = this.extractNationalNumber(this.phoneValue);
          if (
            this.normalizedConfig.showCountryCodeInInput ||
            this.normalizedConfig.separateCountrySelector
          ) {
            this.phoneValue = this.validationService.formatAsYouType(
              `${country.dialCode} ${nationalNumber}`,
              country.iso2
            );
          } else {
            const fullFormatted = this.validationService.formatAsYouType(
              `${country.dialCode} ${nationalNumber}`,
              country.iso2
            );
            this.phoneValue = fullFormatted
              .replace(country.dialCode, '')
              .trim();
          }
        } else {
          if (
            this.normalizedConfig.showCountryCodeInInput ||
            this.normalizedConfig.separateCountrySelector
          ) {
            this.phoneValue = this.validationService.formatAsYouType(
              country.dialCode,
              country.iso2
            );
          } else {
            this.phoneValue = '';
          }
        }
      } else {
        this.rewritePhoneInputWithNewCountryCode(country);
      }

      if (this.phoneInputRef?.nativeElement) {
        this.phoneInputRef.nativeElement.value = this.phoneValue;
        if (isManual) {
          this.phoneInputRef.nativeElement.focus();
          setTimeout(() => {
            const input = this.phoneInputRef.nativeElement;
            input.setSelectionRange(input.value.length, input.value.length);
          }, 0);
        }
      }

      this.onChange(this.phoneValue || null);
    }

    if (previousCountry?.iso2 !== country.iso2) {
      this.cdr.markForCheck();
    }
  }

  /**
   * Extract national number from current input value
   */
  private extractNationalNumber(phoneValue: string): string {
    return extractNationalNumberUtil(
      phoneValue,
      this.selectedCountry?.iso2 ?? null,
      this.selectedCountry?.dialCode ?? null,
      (input: string, iso?: string) =>
        this.validationService.parsePhoneNumber(input, iso || undefined)
    );
  }

  /**
   * Rewrite phone input with new country code while preserving digits
   */
  private rewritePhoneInputWithNewCountryCode(newCountry: Country): void {
    this.phoneValue = rewriteWithNewDialCodeUtil(
      this.phoneValue,
      this.selectedCountry?.dialCode,
      newCountry.dialCode,
      newCountry.iso2,
      (input, iso) => this.validationService.formatAsYouType(input, iso)
    );
  }

  /**
   * Validate current phone number
   * Enhanced for both reactive and template-driven forms
   */
  private validateNumber(): void {
    const trimmed = (this.phoneValue ?? '').trim();
    const isTemplateDriven = !this.formControls;

    // Skip validation during initialization for template-driven forms
    if (
      isTemplateDriven &&
      !this.isFocused &&
      !this.hasUserInteracted &&
      !this.hasBeenFocused &&
      !trimmed
    ) {
      this.validationResult = null;
      this.isValid = true;
      this.isPossible = false;
      return;
    }

    // Handle empty values
    if (!trimmed) {
      if (this.formControls || this.hasUserInteracted || this.hasBeenFocused) {
        this.validationResult = {
          isValid: !this.required,
          isPossible: false,
          error: this.required
            ? {
                type: 'REQUIRED',
                message:
                  this.normalizedConfig.errorMessages.REQUIRED ??
                  'Phone number is required.',
              }
            : undefined,
        };

        this.isValid = this.validationResult.isValid;
        this.isPossible = false;
        this.validationChange.emit(this.validationResult);
        return;
      } else {
        this.validationResult = null;
        this.isValid = true;
        this.isPossible = false;
        return;
      }
    }

    // Custom validation first
    if (this.customValidators.length > 0) {
      for (const validator of this.customValidators) {
        const customError = validator(
          this.phoneValue,
          this.selectedCountry ?? undefined
        );
        if (customError) {
          this.validationResult = {
            isValid: false,
            isPossible: false,
            error: customError,
          };
          this.isValid = false;
          this.isPossible = false;
          this.validationChange.emit(this.validationResult);
          return;
        }
      }
    }

    // Libphonenumber validation
    this.validationResult = this.validationService.validate(
      this.phoneValue,
      this.selectedCountry?.iso2,
      this.normalizedConfig.errorMessages,
      []
    );

    this.isValid = this.validationResult.isValid;
    this.isPossible = this.validationResult.isPossible ?? false;

    // Apply final formatting for valid numbers
    if (this.isValid && this.normalizedConfig.autoFormat) {
      const formatted = this.validationService.format(
        this.phoneValue,
        { style: this.normalizedConfig.format },
        this.selectedCountry?.iso2 ||
          this.normalizedConfig.defaultCountry ||
          'US'
      );

      if (formatted !== this.phoneValue) {
        this.phoneValue = formatted;
        if (this.phoneInputRef?.nativeElement) {
          this.phoneInputRef.nativeElement.value = formatted;
        }
      }
    }

    this.validationChange.emit(this.validationResult);
  }

  /**
   * Emit current value to parent components and forms
   * Respects the configured valueMode for proper form integration
   */
  private emitValue(): void {
    const isEmpty = !this.phoneValue || !this.phoneValue.trim();

    if (isEmpty) {
      this.phoneNumberValue = null;
      this.onChange(this.normalizedConfig.valueMode === 'object' ? null : '');
    } else {
      // Parse the phone number
      this.phoneNumberValue = this.validationService.parsePhoneNumber(
        this.phoneValue,
        this.selectedCountry?.iso2
      );
      
      // Emit value based on configured valueMode
      const valueToEmit = this.getValueByMode();
      this.onChange(valueToEmit);
    }

    this.numberChange.emit(this.phoneNumberValue);
    this.cdr.markForCheck();
  }

  /**
   * Get value in the format specified by valueMode configuration
   */
  private getValueByMode(): any {
    const phoneNumber = this.phoneNumberValue;
    const rawValue = this.phoneValue.trim();

    // Handle empty values consistently
    if (!rawValue) {
      switch (this.normalizedConfig.valueMode) {
        case 'object':
          return null;
        default:
          return '';
      }
    }

    switch (this.normalizedConfig.valueMode) {
      case 'object':
        // Always return the parsed object if available, or create minimal object
        if (phoneNumber) {
          return phoneNumber;
        } else if (rawValue) {
          // Create minimal object for unparseable but non-empty input
          return {
            raw: rawValue,
            isValid: false,
            isPossible: false
          };
        }
        return null;
      
      case 'e164':
        return phoneNumber?.e164 || rawValue;
      
      case 'international':
        return phoneNumber?.international || rawValue;
      
      case 'national':
        return phoneNumber?.national || rawValue;
      
      case 'raw':
        return rawValue;
      
      case 'string':
      default:
        return phoneNumber?.international || rawValue;
    }
  }

  // ===================================================================
  // Input Event Handlers
  // ===================================================================

  /**
   * Handle user input with real-time validation and formatting
   * Respects manual country selections and prevents unwanted changes
   */
  onPhoneInput(value: string): void {
    if (this.disabled || this.readonly) return;

    this.hasUserInteracted = true;
    const previousValue = this.phoneValue;
    this.phoneValue = value;

    // Country detection for international format only
    if (value.startsWith('+') && value !== previousValue) {
      // Reset manual flags only when switching to international format
      if (!previousValue.startsWith('+') || previousValue === '') {
        this.isManualCountrySelection = false;
        this.isCountryLocked = false;
      }

      // Proceed with detection if not manually locked
      if (!this.isManualCountrySelection && !this.isCountryLocked) {
        let detectedCountry =
          this.countryService.detectCountryFromNumber(value);

        // Apply dial code preferences
        if (
          detectedCountry &&
          this.normalizedConfig.dialCodeCountryPreference
        ) {
          const dialCodeNumber = detectedCountry.dialCode.replace('+', '');
          const preferredIso =
            this.normalizedConfig.dialCodeCountryPreference[dialCodeNumber];

          if (preferredIso) {
            const preferredCountry =
              this.countryService.getCountryByIso2(preferredIso);
            if (preferredCountry) {
              detectedCountry = preferredCountry;
            }
          }
        }

        if (
          detectedCountry &&
          detectedCountry.iso2 !== this.selectedCountry?.iso2
        ) {
          this.selectedCountry = detectedCountry;
          this.countryChange.emit(detectedCountry);

          // Apply formatting for detected country
          const digits = value.replace(/\D/g, '');
          if (digits.length >= 2) {
            try {
              const formatted = this.validationService.formatAsYouType(
                value,
                detectedCountry.iso2
              );
              if (formatted && formatted !== value) {
                this.phoneValue = formatted;
                if (this.phoneInputRef?.nativeElement) {
                  this.phoneInputRef.nativeElement.value = formatted;
                }
              }
            } catch (error) {
              // Keep original value on error
            }
          }

          this.cdr.detectChanges();
        }
      }
    } else if (this.selectedCountry && !value.startsWith('+')) {
      // Format national numbers without changing country
      const digits = value.replace(/\D/g, '');
      if (digits.length >= 1 && this.normalizedConfig.autoFormat) {
        try {
          const fullNumber = `${this.selectedCountry.dialCode} ${value}`;
          const formatted = this.validationService.formatAsYouType(
            fullNumber,
            this.selectedCountry.iso2
          );

          if (formatted && formatted.includes(this.selectedCountry.dialCode)) {
            const nationalPart = formatted
              .replace(this.selectedCountry.dialCode, '')
              .trim();
            if (nationalPart && nationalPart !== value) {
              this.phoneValue = nationalPart;
              if (this.phoneInputRef?.nativeElement) {
                this.phoneInputRef.nativeElement.value = nationalPart;
              }
            }
          }
        } catch (error) {
          // Keep original value on error
        }
      }
    }

    // Real-time validation for immediate feedback
    if (
      this.hasShownError ||
      this.normalizedConfig.showErrorsOn === 'live' ||
      this.normalizedConfig.showErrorsOn === 'always'
    ) {
      this.validateNumber();
      this.cdr.markForCheck();
    }

    this.emitValue();
    this.phoneInput$.next(value);
  }

  /**
   * Handle search input changes in country dropdown
   */
  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchInput$.next(query);
  }

  // ===================================================================
  // ControlValueAccessor Implementation
  // ===================================================================

  /**
   * Write value from parent component or form control
   * Handles different value formats based on valueMode configuration
   */
  writeValue(value: any): void {
    if (!value) {
      this.phoneValue = '';
      this.selectedCountry = null;
      this.isCountryLocked = false;
      this.isManualCountrySelection = false;
      this.validationResult = null;
      this.isValid = true;
      this.isPossible = false;
      this.hasShownError = false;

      if (this.phoneInputRef?.nativeElement) {
        this.phoneInputRef.nativeElement.value = '';
      }

      setTimeout(() => {
        this.setInitialCountry();
      }, 0);

      return;
    }

    // Handle different value types based on valueMode
    if (typeof value === 'string') {
      this.phoneValue = value;
      const country = this.validationService.extractCountry(value);
      if (country) {
        this.selectCountry(country, false, false, false);
      }
    } else if (typeof value === 'object' && value !== null) {
      // Handle PhoneNumberValue object
      this.phoneValue = this.extractDisplayValueFromObject(value);
      
      if (value.country) {
        this.selectCountry(value.country, false, false, false);
      } else if (value.countryCode) {
        const country = this.countryService.getCountryByIso2(value.countryCode);
        if (country) this.selectCountry(country, false, false, false);
      } else if (value.e164 || value.international) {
        // Try to detect country from the phone number
        const numberToAnalyze = value.e164 || value.international || value.raw;
        const country = this.validationService.extractCountry(numberToAnalyze);
        if (country) {
          this.selectCountry(country, false, false, false);
        }
      }
    }

    if (this.phoneInputRef?.nativeElement) {
      this.phoneInputRef.nativeElement.value = this.phoneValue;
    }
  }

  /**
   * Extract the appropriate display value from a PhoneNumberValue object
   */
  private extractDisplayValueFromObject(value: any): string {
    // Priority order for display value extraction
    if (value.formatted) return value.formatted;
    if (value.international) return value.international;
    if (value.national) return value.national;
    if (value.e164) return value.e164;
    if (value.raw) return value.raw;
    
    return '';
  }

  /**
   * Register onChange callback for form integration
   */
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  /**
   * Register onTouched callback for form integration
   */
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  /**
   * Register validator change callback
   */
  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  /**
   * Set component disabled state
   */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  // ===================================================================
  // Public API Methods
  // ===================================================================

  /**
   * Set country by ISO2 code programmatically
   */
  setCountry(countryCode: string): void {
    const country = this.countryService.getCountryByIso2(countryCode);
    if (country) this.selectCountry(country, true, false, true);
  }

  /**
   * Get current phone number value in the configured valueMode format
   */
  getValue(): any {
    return this.getValueByMode();
  }

  /**
   * Clear input and reset state
   */
  clear(): void {
    this.phoneValue = '';
    this.phoneNumberValue = null;
    this.validationResult = null;
    this.isValid = false;
    this.isPossible = false;
    this.hasUserInteracted = false;
    this.hasBeenFocused = false;
    this.hasShownError = false;
    this.isCountryLocked = false;
    this.isManualCountrySelection = false;

    if (this.phoneInputRef?.nativeElement) {
      this.phoneInputRef.nativeElement.value = '';
    }

    this.emitValue();
  }

  /**
   * Validate control value (called by Angular forms)
   */
  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    
    // Handle different value types based on valueMode
    let isEmpty = false;
    let phoneStringToValidate = '';
    
    if (!value) {
      isEmpty = true;
    } else if (typeof value === 'string') {
      isEmpty = !value.trim();
      phoneStringToValidate = value;
    } else if (typeof value === 'object' && value !== null) {
      // For object mode, use the raw phone string from component state
      phoneStringToValidate = this.phoneValue || '';
      isEmpty = !phoneStringToValidate.trim();
    } else {
      phoneStringToValidate = String(value);
      isEmpty = !phoneStringToValidate.trim();
    }

    if (isEmpty) {
      return null;
    }

    // Custom validators first
    if (this.customValidators.length > 0) {
      for (const validator of this.customValidators) {
        const customError = validator(
          phoneStringToValidate,
          this.selectedCountry ?? undefined
        );
        if (customError) {
          return {
            [customError.type]: customError,
          };
        }
      }
    }

    // Component validation - use the phone string, not the object
    const result = this.validationService.validate(
      phoneStringToValidate,
      this.selectedCountry?.iso2,
      this.normalizedConfig.errorMessages,
      []
    );

    if (!result.isValid && result.error) {
      return {
        [result.error.type]: result.error,
      };
    }

    return null;
  }

  /**
   * Format number using specified style
   */
  formatNumber(
    style?: 'INTERNATIONAL' | 'NATIONAL' | 'E164' | 'RFC3966'
  ): string {
    if (!this.phoneValue) return '';
    return this.validationService.format(
      this.phoneValue,
      { style: style || this.normalizedConfig.format },
      this.selectedCountry?.iso2
    );
  }

  /**
   * Toggle country dropdown visibility
   */
  toggleDropdown(): void {
    if (this.disabled || this.normalizedConfig.lockCountrySelection) return;

    if (this.showDropdown) {
      this.closeDropdown();
      return;
    }

    this.showDropdown = true;
    this.cdr.detectChanges();

    if (!this.platformHelper.isBrowser) return;

    requestAnimationFrame(() => {
      this.setDropdownPosition();
      this.cdr.detectChanges();

      if (
        this.normalizedConfig.searchEnabled &&
        this.searchInputRef?.nativeElement
      ) {
        this.searchInputRef.nativeElement.focus();
      }
    });
  }

  /**
   * Track by function for country list performance
   */
  trackByIso = (_: number, c: Country) => c.iso2;

  /**
   * Close the country dropdown
   */
  closeDropdown(): void {
    this.showDropdown = false;
    this.searchQuery = '';
    this.filterCountries('');
  }

  /**
   * Handle input focus event
   */
  onPhoneFocus(): void {
    this.isFocused = true;
    this.hasUserInteracted = true;
    this.hasBeenFocused = true;
    this.focus.emit();

    if (this.normalizedConfig.showErrorsOn === 'focus') {
      this.validateNumber();
    }
  }

  /**
   * Handle input blur event
   */
  onPhoneBlur(): void {
    this.isFocused = false;
    this.onTouched();
    this.blur.emit();

    if (
      this.normalizedConfig.validateOnBlur ||
      this.normalizedConfig.showErrorsOn === 'blur'
    ) {
      this.validateNumber();
    }
  }

  /**
   * Handle Enter key press
   */
  onEnterKey(): void {
    this.enter.emit();
  }

  /**
   * Select country from dropdown and close it
   * Always treated as manual selection
   */
  selectCountryAndClose(country: Country): void {
    this.selectCountry(
      country,
      true,
      false,
      true // Always mark dropdown selections as manual
    );

    this.countryChange.emit(country);

    if (this.normalizedConfig.closeOnSelect) {
      this.closeDropdown();
    }

    this.validateNumber();
    this.cdr.detectChanges();
  }

  /**
   * Set dropdown position based on available viewport space
   */
  private setDropdownPosition(): void {
    if (!this.wrapperRef?.nativeElement || !this.dropdownRef?.nativeElement) {
      return;
    }

    const wrapperRect = this.wrapperRef.nativeElement.getBoundingClientRect();
    const dropdownEl = this.dropdownRef.nativeElement;
    const dropdownHeight = dropdownEl.offsetHeight || 300;

    if (this.normalizedConfig.dropdownPosition === 'top') {
      this.actualDropdownPosition = 'top';
    } else if (this.normalizedConfig.dropdownPosition === 'bottom') {
      this.actualDropdownPosition = 'bottom';
    } else {
      this.actualDropdownPosition = computeDropdownPosition(
        wrapperRect,
        dropdownHeight,
        window.innerHeight
      );
    }

    this.cdr.detectChanges();
  }

  /**
   * Determine if error message should be displayed
   * Enhanced with persistent error display after first occurrence
   */
  shouldShowError(): boolean {
    const hasAnyError = !!this.displayedError;

    // Mark error as shown if conditions are met
    if (
      hasAnyError &&
      (this.hasUserInteracted || this.hasBeenFocused || this.isFocused)
    ) {
      this.hasShownError = true;
    }

    // Reset flag only when error is resolved
    if (!hasAnyError) {
      this.hasShownError = false;
      return false;
    }

    // Keep showing error once it has been displayed
    if (this.hasShownError) {
      return true;
    }

    // Initial error trigger conditions
    if (this.formControls) {
      const c = this.formControls;
      switch (this.normalizedConfig.showErrorsOn) {
        case 'touched':
          return c.touched && c.invalid;
        case 'dirty':
          return c.dirty && c.invalid;
        case 'focus':
          return this.isFocused && c.invalid;
        case 'blur':
          return !this.isFocused && c.touched && c.invalid;
        case 'always':
        case 'live':
          return c.invalid;
        default:
          return c.dirty && c.invalid;
      }
    }

    // Template-driven form fallback
    switch (this.normalizedConfig.showErrorsOn) {
      case 'blur':
        return !this.isFocused && this.hasBeenFocused && hasAnyError;
      case 'focus':
        return this.isFocused && hasAnyError;
      case 'live':
      case 'always':
        return hasAnyError;
      case 'touched':
        return this.hasUserInteracted && hasAnyError;
      case 'dirty':
        return this.hasUserInteracted && hasAnyError;
      default:
        return this.hasUserInteracted && hasAnyError;
    }
  }

  /**
   * Get external error from parent form control
   */
  private getExternalError(): { type: string; message: string } | null {
    if (!this.formControls) return null;

    const controlErrors = this.formControls.errors;
    if (!controlErrors) return null;

    return pickDynamicPhoneError(
      controlErrors,
      this.normalizedConfig.errorMessages
    );
  }

  /**
   * Apply external errors from parent form control
   */
  private applyExternalErrors(): void {
    const external = this.getExternalError();

    if (external) {
      this.validationResult = {
        isValid: false,
        isPossible: this.validationResult?.isPossible ?? false,
        error: external,
      };
      this.isValid = false;
      this.validationChange.emit(this.validationResult);
      this.cdr.markForCheck();
      return;
    }

    // Re-evaluate internal validation when external error clears
    if (this.phoneValue) {
      this.validateNumber();
    } else {
      this.validationResult = null;
      this.isValid = true;
      this.isPossible = false;
      this.validationChange.emit(this.validationResult as any);
      this.cdr.markForCheck();
    }
  }

  /**
   * Get country flag using smart flag service
   */
  getCountryFlag(iso2: string): string {
    return this.smartFlagService.getFlag(iso2);
  }

  /**
   * Legacy method - delegates to smart flag service
   */
  getEmojiFlag(iso2: string): string {
    return this.getCountryFlag(iso2);
  }

  /**
   * Check if flag content is an HTML image element
   */
  isImageFlag(flagContent: string): boolean {
    return flagContent.includes('<img');
  }
}