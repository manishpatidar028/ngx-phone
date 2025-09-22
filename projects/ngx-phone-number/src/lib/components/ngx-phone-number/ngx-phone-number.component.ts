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
import { normalizePhoneConfig, NormalizedPhoneConfig } from '../../utils/phone-config.util';
import {
  shouldDetectCountryFromInput as shouldDetectFromInputUtil,
  extractNationalNumber as extractNationalNumberUtil,
  rewriteWithNewDialCode as rewriteWithNewDialCodeUtil,
  computeDropdownPosition,
  isoToEmojiFlag,
  mapValueForControl,
  resolvePreferredCountryByDialCode,
  maybeFormatNumber,
  pickDynamicPhoneError,
} from '../../utils/phone-number.util';

@Component({
  selector: 'ngx-phone',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ngx-phone-number.component.html',
  styleUrls: ['./ngx-phone-number.component.css'],
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
  // -------------------------------------------------------------------
  // ViewChild References (DOM)
  // -------------------------------------------------------------------
  @ViewChild('phoneInput') phoneInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownRef') dropdownRef!: ElementRef;
  @ViewChild('phoneWrapperRef') wrapperRef!: ElementRef;

  // -------------------------------------------------------------------
  // Inputs
  // -------------------------------------------------------------------
  @Input() config: PhoneInputConfig = {};
  @Input() public formControls!: AbstractControl | null;
  @Input() disabled = false;
  @Input() required = false;
  @Input() readonly = false;
  @Input() customValidators: PhoneCustomValidator[] = [];

  // -------------------------------------------------------------------
  // Outputs
  // -------------------------------------------------------------------
  @Output() countryChange = new EventEmitter<Country>();
  @Output() numberChange = new EventEmitter<PhoneNumberValue | null>();
  @Output() validationChange = new EventEmitter<ValidationResult>();
  @Output() blur = new EventEmitter<void>();
  @Output() focus = new EventEmitter<void>();
  @Output() enter = new EventEmitter<void>();

  // -------------------------------------------------------------------
  // Host Bindings (Styling Hooks)
  // -------------------------------------------------------------------
  @HostBinding('class.ngx-phone-number-host') hostClass = true;
  @HostBinding('class.disabled') get isDisabled() {
    return this.disabled;
  }
  @HostBinding('class.focused') get isFocusedClass() {
    return this.isFocused;
  }
  @HostBinding('class.has-error') get hasError() {
    return this.shouldShowError() && this.normalizedConfig.showInvalidBorder;
  }

  // -------------------------------------------------------------------
  // Internal State
  // -------------------------------------------------------------------
  phoneValue = '';
  selectedCountry: Country | null = null;
  phoneNumberValue: PhoneNumberValue | null = null;
  validationResult: ValidationResult | null = null;
  private isValidating = false;

  isValid = false;
  isPossible = false;
  isFocused = false;
  isCountryLocked = false;
  isManualCountrySelection = false; // Track if user manually selected country

  showDropdown = false;
  dropdownPosition: 'top' | 'bottom' = 'bottom';
  actualDropdownPosition: 'top' | 'bottom' = 'bottom'; // For dynamic positioning

  countries: Country[] = [];
  filteredCountries: Country[] = [];
  preferredCountriesList: Country[] = [];

  searchQuery = '';
  highlightedIndex = -1;
  
  // Generate unique IDs for accessibility
  public readonly errorId = `ngx-phone-err-${Math.random()
    .toString(36)
    .slice(2)}`;
  public readonly inputId = `ngx-phone-input-${Math.random()
    .toString(36)
    .slice(2)}`;

  // -------------------------------------------------------------------
  // RxJS Streams
  // -------------------------------------------------------------------
  private destroy$ = new Subject<void>();
  private phoneInput$ = new Subject<string>();
  private searchInput$ = new Subject<string>();

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private hasUserInteracted = false;
  private hasBeenFocused = false; // Track if input has ever been focused
  private hasShownError = false; // Track if error was ever shown during current session

  private _normalized!: NormalizedPhoneConfig;
  get normalizedConfig(): NormalizedPhoneConfig {
    return this._normalized;
  }

  constructor(
    private countryService: CountryService,
    private validationService: PhoneValidationService,
    private cdr: ChangeDetectorRef,
    private platformHelper: PlatformHelper,
    private zone: NgZone
  ) {}

  // -------------------------------------------------------------------
  // Lifecycle Methods
  // -------------------------------------------------------------------
  ngOnInit(): void {
    this._normalized = normalizePhoneConfig(this.config ?? {}); // util
    this.loadCountries();
    this.setInitialCountry();
    this.setupSubscriptions();
    if (this.formControls) {
      this.formControls.statusChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.applyExternalErrors());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this._normalized = normalizePhoneConfig(this.config ?? {}); // util
      this.loadCountries();
      this.setInitialCountry();
    }
  }

  ngAfterViewInit(): void {
    if (
      this.platformHelper.isBrowser &&
      this.normalizedConfig.autoFocus &&
      !this.disabled
    ) {
      setTimeout(() => this.phoneInputRef?.nativeElement?.focus(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -------------------------------------------------------------------
  // Style Helper Methods
  // -------------------------------------------------------------------

  /** Get container styles including custom border */
  getContainerStyles(): { [key: string]: string } {
    const styles: { [key: string]: string } = {};
    
    if (this.normalizedConfig.customContainerBorder && this.normalizedConfig.containerBorderStyle) {
      Object.assign(styles, this.normalizedConfig.containerBorderStyle);
    }
    
    return styles;
  }

  /** Get placeholder styles */
  getPlaceholderStyles(): { [key: string]: string } {
    const styles: { [key: string]: string } = {};
    
    if (this.normalizedConfig.customPlaceholderStyle) {
      Object.assign(styles, this.normalizedConfig.customPlaceholderStyle);
    }
    
    return styles;
  }

  /** Get dropdown styles including proper positioning */
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

  /** Get dropdown CSS classes */
  getDropdownClasses(): string[] {
    const classes = [
      this.actualDropdownPosition === 'top' ? 'dropdown--top' : 'dropdown--bottom',
      this.normalizedConfig.dropdownClass || ''
    ].filter(Boolean);
    
    return classes;
  }

  /** Get flag CSS classes */
  getFlagClasses(): string {
    const classes = [];
    
    if (this.normalizedConfig.flagPosition === 'start') {
      classes.push('flag-start');
    } else if (this.normalizedConfig.flagPosition === 'end') {
      classes.push('flag-end');
    }
    
    return classes.join(' ');
  }

  /** Get effective placeholder text */
  getEffectivePlaceholder(): string {
    if (this.normalizedConfig.customPlaceholder && this.selectedCountry) {
      return this.normalizedConfig.customPlaceholder(this.selectedCountry);
    }
    
    return this.normalizedConfig.placeholder || 'Enter phone number';
  }

  /** Check if inline flag should be shown */
  shouldShowInlineFlag(): boolean {
    return !this.normalizedConfig.separateCountrySelector && 
           this.normalizedConfig.showFlags &&
           this.normalizedConfig.flagPosition !== 'none';
  }

  get displayedError(): { type: string; message: string } | null {
    // PRIORITY 1: External FormControl errors (required, minLength, etc.)
    const external = pickDynamicPhoneError(
      this.formControls?.errors ?? null,
      this.normalizedConfig.errorMessages
    );
    if (external) return external;

    // PRIORITY 2: Component's internal validation errors
    return this.validationResult?.error ?? null;
  }

  // -------------------------------------------------------------------
  // Setup Methods
  // -------------------------------------------------------------------

  /** Load and filter country list */
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

  /** Detect or assign the initial country */
  private setInitialCountry(): void {
    if (!this.selectedCountry && this.normalizedConfig.defaultCountry) {
      const country = this.countryService.getCountryByIso2(
        this.normalizedConfig.defaultCountry
      );
      if (country) {
        this.selectCountry(
          country,
          this.normalizedConfig.showCountryCodeInInput &&
            !this.normalizedConfig.separateCountrySelector,
          this.normalizedConfig.clearInputOnCountryChange &&
            !this.normalizedConfig.separateCountrySelector
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
          this.normalizedConfig.clearInputOnCountryChange
        );
      }
    }
  }

  /** RxJS subscriptions for input + search */
  private setupSubscriptions(): void {
    this.phoneInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => this.processPhoneNumber(val));

    this.searchInput$
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => this.filterCountries(query));
  }

  /** Filter country list based on query */
  private filterCountries(query: string): void {
    if (!query) {
      this.filteredCountries = [...this.countries];
    } else {
      this.filteredCountries = this.countryService.searchCountries(query);
    }
  }

  // -------------------------------------------------------------------
  // Phone Input Logic
  // -------------------------------------------------------------------

  /** Process phone number input and country inference - ENHANCED */
  private processPhoneNumber(value: string): void {
    // Skip if value hasn't actually changed
    if (this.phoneValue === value) {
      return;
    }

    const digits = value.replace(/\D/g, '');
    const trimmedValue = value.trim();

    // Country detection logic (ALWAYS run, regardless of autoFormat)
    if (trimmedValue.startsWith('+')) {
      this.isCountryLocked = false;
      this.isManualCountrySelection = false;
    }

    // Only run additional detection if immediate detection hasn't already handled it
    const shouldDetectCountry = shouldDetectFromInputUtil(trimmedValue, digits);
    if (shouldDetectCountry && !trimmedValue.startsWith('+')) {
      // This handles cases where detection utilities find patterns we didn't catch immediately
      const previousCountryIso = this.selectedCountry?.iso2;
      this.detectCountryFromInput(trimmedValue);
      
      // If country changed, ensure immediate UI update
      if (previousCountryIso !== this.selectedCountry?.iso2) {
        this.cdr.detectChanges();
      }
    }

    if (
      !this.selectedCountry &&
      digits.length >= 3 &&
      !trimmedValue.startsWith('+')
    ) {
      this.fallbackToDefaultCountry();
    }

    // Additional formatting logic - apply as-you-type formatting for ongoing input
    // This handles the case where autoFormat is enabled AND user is continuing to type
    if (
      this.normalizedConfig.autoFormat &&
      trimmedValue.startsWith('+') &&
      this.selectedCountry &&
      digits.length > 2 // Only for longer inputs to avoid conflicts with immediate detection
    ) {
      try {
        const formatted = this.validationService.formatAsYouType(
          trimmedValue,
          this.selectedCountry.iso2
        );
        if (formatted !== this.phoneValue) {
          this.phoneValue = formatted;
          if (this.phoneInputRef?.nativeElement) {
            this.phoneInputRef.nativeElement.value = formatted;
          }
        }
      } catch {
        // Keep original on error
      }
    }

    // SINGLE validation call
    this.validateNumber();

    // SINGLE emission call (only if value actually changed)
    if (this.phoneValue === value) {
      this.emitValue();
    }
  }

  /** Try to detect country from phone number - ENHANCED WITH PREFERENCE SUPPORT */
  private detectCountryFromInput(value: string): void {
    let detected = this.validationService.extractCountry(value);

    if (value.startsWith('+')) {
      // Apply dialCodeCountryPreference if configured
      if (detected && this.normalizedConfig.dialCodeCountryPreference) {
        const dialCodeNumber = detected.dialCode.replace('+', '');
        const preferredIso = this.normalizedConfig.dialCodeCountryPreference[dialCodeNumber];
        
        if (preferredIso) {
          const preferredCountry = this.countryService.getCountryByIso2(preferredIso);
          if (preferredCountry) {
            detected = preferredCountry;
          }
        }
      }
    }

    if (detected && detected.iso2 !== this.selectedCountry?.iso2) {
      this.selectCountry(detected, false, false, false);
      this.countryChange.emit(detected);
      
      // Force change detection to update flag display immediately
      this.cdr.markForCheck();
      
      // Update filtered countries to ensure proper display in dropdown
      this.filterCountries(this.searchQuery);
    }
  }

  /** Use fallback/default country when detection fails */
  private fallbackToDefaultCountry(): void {
    const iso = (
      this.normalizedConfig.defaultCountry ||
      this.normalizedConfig.fallbackCountry ||
      'US'
    ).toUpperCase();
    const fallback = this.countryService.getCountryByIso2(iso);
    if (fallback) this.selectCountry(fallback, false, false);
  }

  /** Set selected country and reformat input - ENHANCED */
  private selectCountry(
    country: Country,
    updateInput: boolean = true,
    clearInput: boolean = false,
    isManual: boolean = false
  ): void {
    const previousCountry = this.selectedCountry;
    this.selectedCountry = country;
    this.isManualCountrySelection = isManual;

    // Only lock country if it was manually selected or if lock is configured
    this.isCountryLocked =
      isManual || this.normalizedConfig.lockCountrySelection;

    if (updateInput) {
      if (clearInput || !this.phoneValue || isManual) {
        // For manual selection or empty input, update with new dial code
        if (isManual && this.phoneValue) {
          // Extract only the national number part from existing input
          const nationalNumber = this.extractNationalNumber(this.phoneValue);
          this.phoneValue = this.validationService.formatAsYouType(
            `${country.dialCode} ${nationalNumber}`,
            country.iso2
          );
        } else {
          // Empty input - just add dial code
          this.phoneValue = this.validationService.formatAsYouType(
            country.dialCode,
            country.iso2
          );
        }
      } else {
        // Retain digits, just update the dial code
        this.rewritePhoneInputWithNewCountryCode(country);
      }

      if (this.phoneInputRef?.nativeElement) {
        this.phoneInputRef.nativeElement.value = this.phoneValue;
        if (isManual) {
          // Focus and position cursor at end for manual selections
          this.phoneInputRef.nativeElement.focus();
          setTimeout(() => {
            const input = this.phoneInputRef.nativeElement;
            input.setSelectionRange(input.value.length, input.value.length);
          }, 0);
        }
      }

      this.onChange(this.phoneValue || null);
    }
    
    // Force UI update if country changed (especially for flag display)
    if (previousCountry?.iso2 !== country.iso2) {
      this.cdr.markForCheck();
    }
  }

  /** Extract national number from current input - IMPROVED */
  private extractNationalNumber(phoneValue: string): string {
    return extractNationalNumberUtil(
      phoneValue,
      this.selectedCountry?.iso2 ?? null,
      this.selectedCountry?.dialCode ?? null,
      (input: string, iso?: string) =>
        this.validationService.parsePhoneNumber(input, iso || undefined)
    );
  }

  private rewritePhoneInputWithNewCountryCode(newCountry: Country): void {
    this.phoneValue = rewriteWithNewDialCodeUtil(
      this.phoneValue,
      this.selectedCountry?.dialCode,
      newCountry.dialCode,
      newCountry.iso2,
      (input, iso) => this.validationService.formatAsYouType(input, iso)
    );
  }

  /** Validate current phone number - ENHANCED FOR REACTIVE FORMS */
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
      // For reactive forms or when user has interacted
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
        // Initial state - no validation
        this.validationResult = null;
        this.isValid = true;
        this.isPossible = false;
        return;
      }
    }

    // Custom validators
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

    // Package validation
    this.validationResult = this.validationService.validate(
      this.phoneValue,
      this.selectedCountry?.iso2,
      this.normalizedConfig.errorMessages,
      []
    );

    this.isValid = this.validationResult.isValid;
    this.isPossible = this.validationResult.isPossible ?? false;

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

  /** Emit formatted value - ENHANCED FOR REACTIVE FORMS */
  private emitValue(): void {
    const isEmpty = !this.phoneValue || !this.phoneValue.trim();

    if (isEmpty) {
      this.phoneNumberValue = null;
      this.onChange('');
    } else {
      this.phoneNumberValue = this.validationService.parsePhoneNumber(
        this.phoneValue,
        this.selectedCountry?.iso2
      );
      this.onChange(this.phoneValue);
    }

    // Only emit the number change - don't trigger validation
    this.numberChange.emit(this.phoneNumberValue);
    this.cdr.markForCheck();
  }

  // -------------------------------------------------------------------
  // Input Event - FIXED TO USE COUNTRYSERVICE
  // -------------------------------------------------------------------

  /** Handle user input - ENHANCED WITH REAL-TIME VALIDATION */
  onPhoneInput(value: string): void {
    if (this.disabled || this.readonly) return;

    this.hasUserInteracted = true;
    const previousValue = this.phoneValue;
    this.phoneValue = value;

    // IMMEDIATE country detection using CountryService
    if (value.startsWith('+') && value !== previousValue) {
      let detectedCountry = this.countryService.detectCountryFromNumber(value);
      
      // Apply dialCodeCountryPreference if configured
      if (detectedCountry && this.normalizedConfig.dialCodeCountryPreference) {
        const dialCodeNumber = detectedCountry.dialCode.replace('+', '');
        const preferredIso = this.normalizedConfig.dialCodeCountryPreference[dialCodeNumber];
        
        if (preferredIso) {
          const preferredCountry = this.countryService.getCountryByIso2(preferredIso);
          if (preferredCountry) {
            detectedCountry = preferredCountry;
          }
        }
      }
      
      if (detectedCountry && detectedCountry.iso2 !== this.selectedCountry?.iso2) {
        // Update country immediately
        this.selectedCountry = detectedCountry;
        
        // Reset country lock status since user is manually entering country code
        this.isCountryLocked = false;
        this.isManualCountrySelection = false;
        
        // Emit country change event
        this.countryChange.emit(detectedCountry);
        
        // Apply formatting if we have enough digits
        const digits = value.replace(/\D/g, '');
        if (digits.length >= 2) {
          try {
            const formatted = this.validationService.formatAsYouType(value, detectedCountry.iso2);
            if (formatted && formatted !== value) {
              this.phoneValue = formatted;
              // Update the DOM input element directly
              if (this.phoneInputRef?.nativeElement) {
                this.phoneInputRef.nativeElement.value = formatted;
              }
            }
          } catch (error) {
            // Keep original value on formatting error
          }
        }
        
        // Force immediate change detection for flag update
        this.cdr.detectChanges();
      } else if (this.selectedCountry) {
        // Apply formatting for existing country
        const digits = value.replace(/\D/g, '');
        if (digits.length >= 2) {
          try {
            const formatted = this.validationService.formatAsYouType(value, this.selectedCountry.iso2);
            if (formatted && formatted !== value) {
              this.phoneValue = formatted;
              // Update the DOM input element directly
              if (this.phoneInputRef?.nativeElement) {
                this.phoneInputRef.nativeElement.value = formatted;
              }
            }
          } catch (error) {
            // Keep original value on formatting error
          }
        }
      }
    }

    // IMMEDIATE validation for real-time error updates (if error was already shown)
    if (this.hasShownError || this.normalizedConfig.showErrorsOn === 'live' || this.normalizedConfig.showErrorsOn === 'always') {
      this.validateNumber();
      this.cdr.markForCheck(); // Ensure UI updates immediately for error state changes
    }

    // Emit immediately for immediate FormControl updates
    this.emitValue();

    // Schedule debounced validation for other cases
    this.phoneInput$.next(value);
  }

  /**
   * Called when search input changes - FIXED.
   */
  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchInput$.next(query);
  }

  // -------------------------------------------------------------------
  // ControlValueAccessor Implementation
  // -------------------------------------------------------------------

  writeValue(value: any): void {
    if (!value) {
      this.phoneValue = '';
      this.selectedCountry = null;
      this.isCountryLocked = false;
      this.isManualCountrySelection = false;
      this.validationResult = null;
      this.isValid = true; // Reset validation state
      this.isPossible = false;
      this.hasShownError = false; // Reset error display tracking

      if (this.phoneInputRef?.nativeElement) {
        this.phoneInputRef.nativeElement.value = '';
      }

      // Set default country after clearing
      setTimeout(() => {
        this.setInitialCountry();
      }, 0);

      return;
    }

    if (typeof value === 'string') {
      this.phoneValue = value;
      // Detect and set country from the input value
      const country = this.validationService.extractCountry(value);
      if (country) {
        this.selectCountry(country, false, false, false);
      }
    } else if (typeof value === 'object') {
      this.phoneValue =
        value.formatted || value.international || value.raw || '';
      if (value.country) {
        this.selectCountry(value.country, false, false, false);
      } else if (value.countryCode) {
        const country = this.countryService.getCountryByIso2(value.countryCode);
        if (country) this.selectCountry(country, false, false, false);
      }
    }

    // Update DOM input if available
    if (this.phoneInputRef?.nativeElement) {
      this.phoneInputRef.nativeElement.value = this.phoneValue;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  onValidatorChange: () => void = () => {};

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  // -------------------------------------------------------------------
  // Public API Methods
  // -------------------------------------------------------------------

  /** Set country by ISO2 code */
  setCountry(countryCode: string): void {
    const country = this.countryService.getCountryByIso2(countryCode);
    if (country) this.selectCountry(country, true, false, true); // Mark as manual selection
  }

  /** Get current parsed phone number value */
  getValue(): PhoneNumberValue | null {
    return this.phoneNumberValue;
  }

  /** Clear input and state */
  clear(): void {
    this.phoneValue = '';
    this.phoneNumberValue = null;
    this.validationResult = null;
    this.isValid = false;
    this.isPossible = false;
    this.hasUserInteracted = false;
    this.hasBeenFocused = false;
    this.hasShownError = false; // Reset error display tracking
    this.isCountryLocked = false;
    this.isManualCountrySelection = false;

    if (this.phoneInputRef?.nativeElement) {
      this.phoneInputRef.nativeElement.value = '';
    }

    this.emitValue();
  }

  /** Manual validation (called by Angular forms) - TYPESCRIPT SAFE */
  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    const isEmpty = !value || (typeof value === 'string' && !value.trim());

    // Let FormControl validators handle empty values (required, etc.)
    if (isEmpty) {
      return null;
    }

    const valueToValidate = typeof value === 'string' ? value : String(value);

    // PRIORITY 1: Custom validators from [customValidators] input
    if (this.customValidators.length > 0) {
      for (const validator of this.customValidators) {
        const customError = validator(
          valueToValidate,
          this.selectedCountry ?? undefined
        );
        if (customError) {
          return {
            [customError.type]: customError,
          };
        }
      }
    }

    // PRIORITY 2: Component validation (libphonenumber)
    const result = this.validationService.validate(
      valueToValidate,
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
  /** Format number using given style */
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

  /** Convert ISO2 country to emoji flag */
  getEmojiFlag(iso2: string): string {
    if (!iso2 || iso2.length !== 2) {
      return '🏳️'; // Default flag if invalid ISO2
    }
    
    // Convert ISO2 code to emoji flag using Unicode regional indicator symbols
    const codePoints = iso2
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    
    return String.fromCodePoint(...codePoints);
  }

  /**
   * Toggle the visibility of the country dropdown and determine its position.
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

  /** trackBy for lists */
  trackByIso = (_: number, c: Country) => c.iso2;

  /**
   * Close the country dropdown.
   */
  closeDropdown(): void {
    this.showDropdown = false;
    this.searchQuery = '';
    this.filterCountries('');
  }

  /**
   * Called when input gains focus - ENHANCED.
   */
  onPhoneFocus(): void {
    this.isFocused = true;
    this.hasUserInteracted = true;
    this.hasBeenFocused = true; // Mark that input has been focused
    this.focus.emit();
    
    // Trigger validation immediately for focus-based error display
    if (this.normalizedConfig.showErrorsOn === 'focus') {
      this.validateNumber();
    }
  }

  /**
   * Called when input loses focus - ENHANCED FOR REACTIVE FORMS.
   */
  onPhoneBlur(): void {
    this.isFocused = false;
    this.onTouched();
    this.blur.emit();

    // Trigger validation on blur if configured
    if (this.normalizedConfig.validateOnBlur || this.normalizedConfig.showErrorsOn === 'blur') {
      this.validateNumber();
    }
  }
  
  /**
   * Handle Enter key press on input field.
   */
  onEnterKey(): void {
    this.enter.emit();
  }

  /**
   * Select a country and close the dropdown - ENHANCED.
   */
  selectCountryAndClose(country: Country): void {
    this.selectCountry(
      country,
      true, // Always update input when selecting from dropdown
      false, // Don't clear existing input
      true // Mark as manual selection
    );

    // Emit the country change event
    this.countryChange.emit(country);

    if (this.normalizedConfig.closeOnSelect) {
      this.closeDropdown();
    }
  }

  /**
   * Dynamically determine whether the dropdown should appear above or below
   * the input field based on available viewport space - ENHANCED.
   */
  private setDropdownPosition(): void {
    if (!this.wrapperRef?.nativeElement || !this.dropdownRef?.nativeElement) {
      return;
    }

    const wrapperRect = this.wrapperRef.nativeElement.getBoundingClientRect();
    const dropdownEl = this.dropdownRef.nativeElement;
    const dropdownHeight = dropdownEl.offsetHeight || 300;

    // Use configured position or auto-detect
    if (this.normalizedConfig.dropdownPosition === 'top') {
      this.actualDropdownPosition = 'top';
    } else if (this.normalizedConfig.dropdownPosition === 'bottom') {
      this.actualDropdownPosition = 'bottom';
    } else {
      // Auto-detect based on available space
      this.actualDropdownPosition = computeDropdownPosition(
        wrapperRect,
        dropdownHeight,
        window.innerHeight
      );
    }

    this.cdr.detectChanges();
  }

  /** Determine if error message should be shown - ENHANCED WITH REAL-TIME PERSISTENT ERROR DISPLAY */
  shouldShowError(): boolean {
    const hasAnyError = !!this.displayedError;

    // Update hasShownError flag if we have an error and user has interacted
    if (hasAnyError && (this.hasUserInteracted || this.hasBeenFocused || this.isFocused)) {
      this.hasShownError = true;
    }

    // Reset hasShownError ONLY when no error exists (error resolved)
    if (!hasAnyError) {
      this.hasShownError = false;
      return false;
    }

    // UNIVERSAL BEHAVIOR: Once error is shown, keep showing until resolved
    if (this.hasShownError) {
      return true;
    }

    // Initial error trigger based on showErrorsOn setting
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

    // Template-driven fallback - initial trigger conditions
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

  private valueForControl(): any {
    const isEmpty = !this.phoneValue || !this.phoneValue.trim();
    if (isEmpty) return '';
    return this.phoneValue;
  }

  /** Pick the highest-priority external (parent) form error, if any. */
  /** Pulls a top-priority error from the parent control, if any. */
  private getExternalError(): { type: string; message: string } | null {
    if (!this.formControls) return null;

    const controlErrors = this.formControls.errors;
    if (!controlErrors) return null;

    // Use the pickDynamicPhoneError util function
    return pickDynamicPhoneError(
      controlErrors,
      this.normalizedConfig.errorMessages
    );
  }
  /** Apply external errors after Angular finishes validating the parent control. */
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

    // If an external error just cleared, re-evaluate our own message
    // (validateNumber will set built-in/custom errors as appropriate)
    if (this.phoneValue) {
      this.validateNumber();
    } else {
      // empty input: keep previous behavior
      this.validationResult = null;
      this.isValid = true;
      this.isPossible = false;
      this.validationChange.emit(this.validationResult as any);
      this.cdr.markForCheck();
    }
  }
}