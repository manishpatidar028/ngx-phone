import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
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
import { normalizePhoneConfig } from '../../utils/phone-config.util';
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
  // 📍 ViewChild References (DOM)
  // -------------------------------------------------------------------
  @ViewChild('phoneInput') phoneInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownRef') dropdownRef!: ElementRef;
  @ViewChild('phoneWrapperRef') wrapperRef!: ElementRef;

  // -------------------------------------------------------------------
  // 📥 Inputs
  // -------------------------------------------------------------------
  @Input() config: PhoneInputConfig = {};
  @Input() public formControls!: AbstractControl | null;
  @Input() disabled = false;
  @Input() required = false;
  @Input() readonly = false;
  @Input() customValidators: PhoneCustomValidator[] = [];

  // -------------------------------------------------------------------
  // 📤 Outputs
  // -------------------------------------------------------------------
  @Output() countryChange = new EventEmitter<Country>();
  @Output() numberChange = new EventEmitter<PhoneNumberValue | null>();
  @Output() validationChange = new EventEmitter<ValidationResult>();
  @Output() blur = new EventEmitter<void>();
  @Output() focus = new EventEmitter<void>();
  @Output() enter = new EventEmitter<void>();

  // -------------------------------------------------------------------
  // 🔒 Host Bindings (Styling Hooks)
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
  // 🧠 Internal State
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

  countries: Country[] = [];
  filteredCountries: Country[] = [];
  preferredCountriesList: Country[] = [];

  searchQuery = '';
  highlightedIndex = -1;
  public readonly errorId = `ngx-phone-err-${Math.random()
    .toString(36)
    .slice(2)}`;

  // -------------------------------------------------------------------
  // 🔁 RxJS Streams
  // -------------------------------------------------------------------
  private destroy$ = new Subject<void>();
  private phoneInput$ = new Subject<string>();
  private searchInput$ = new Subject<string>();

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private hasUserInteracted = false;

  private _normalized!: Required<PhoneInputConfig>;
  get normalizedConfig(): Required<PhoneInputConfig> {
    return this._normalized;
  }

  constructor(
    private countryService: CountryService,
    private validationService: PhoneValidationService,
    private cdr: ChangeDetectorRef,
    private platformHelper: PlatformHelper
  ) {}

  // -------------------------------------------------------------------
  // 🚀 Lifecycle Methods
  // -------------------------------------------------------------------
  ngOnInit(): void {
    this._normalized = normalizePhoneConfig(this.config ?? {}); // ✅ util
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
      this._normalized = normalizePhoneConfig(this.config ?? {}); // ✅ util
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
  // ⚙️ Setup Methods
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
  // 📞 Phone Input Logic
  // -------------------------------------------------------------------

  /** Process phone number input and country inference - ENHANCED */
  private processPhoneNumber(value: string): void {
    // Skip if value hasn't actually changed
    if (this.phoneValue === value) {
      return;
    }

    const digits = value.replace(/\D/g, '');
    const trimmedValue = value.trim();

    // Country detection logic (without validation)
    if (trimmedValue.startsWith('+')) {
      this.isCountryLocked = false;
      this.isManualCountrySelection = false;
    }

    const shouldDetectCountry = shouldDetectFromInputUtil(trimmedValue, digits);
    if (shouldDetectCountry) {
      this.detectCountryFromInput(trimmedValue);
    }

    if (
      !this.selectedCountry &&
      digits.length >= 3 &&
      !trimmedValue.startsWith('+')
    ) {
      this.fallbackToDefaultCountry();
    }

    // Formatting logic
    if (
      !this.normalizedConfig.autoFormat &&
      trimmedValue.startsWith('+') &&
      this.selectedCountry
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

    // SINGLE emission call
    this.emitValue();
  }

  /** Try to detect country from phone number - ENHANCED */
  private detectCountryFromInput(value: string): void {
    let detected = this.validationService.extractCountry(value);

    if (value.startsWith('+')) {
      detected = resolvePreferredCountryByDialCode(
        detected,
        this.normalizedConfig.dialCodeCountryPreference,
        (iso) => this.countryService.getCountryByIso2(iso)
      );
    }

    if (detected && detected.iso2 !== this.selectedCountry?.iso2) {
      this.selectCountry(detected, false, false, false);
      this.countryChange.emit(detected);
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

    // Skip validation during initialization
    if (
      isTemplateDriven &&
      !this.isFocused &&
      !this.hasUserInteracted &&
      !trimmed
    ) {
      this.validationResult = null;
      this.isValid = true;
      this.isPossible = false;
      return;
    }

    // Handle empty values
    if (!trimmed) {
      if (!this.hasUserInteracted && !this.isFocused) {
        this.validationResult = null;
        this.isValid = true;
        this.isPossible = false;
        return;
      }

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
  // 🔡 Input Event
  // -------------------------------------------------------------------

  /** Handle user input - ENHANCED FOR REACTIVE FORMS */
  onPhoneInput(value: string): void {
    if (this.disabled || this.readonly) return;

    this.hasUserInteracted = true;
    this.phoneValue = value;

    // Emit immediately for immediate FormControl updates
    this.emitValue();

    // Cancel any pending debounced validation to avoid duplicates
    // Then schedule the new one
    this.phoneInput$.next(value);
  }

  // -------------------------------------------------------------------
  // 🧠 ControlValueAccessor Implementation
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
  // 🧩 Public API Methods
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
    return isoToEmojiFlag(iso2);
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

  /** 🔧 trackBy for lists */
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
   * Called when search input changes.
   */
  onSearchChange(query: string): void {
    this.searchInput$.next(query);
  }

  /**
   * Called when input gains focus.
   */
  onPhoneFocus(): void {
    this.isFocused = true;
    this.hasUserInteracted = true;
    this.focus.emit();
  }

  /**
   * Called when input loses focus - ENHANCED FOR REACTIVE FORMS.
   */
  onPhoneBlur(): void {
    this.isFocused = false;
    this.onTouched();
    this.blur.emit();

    // REMOVE all validation on blur - let the debounced validation handle it
    // The validateOnBlur logic is causing duplicate validations
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
   * the input field based on available viewport space.
   */
  private setDropdownPosition(): void {
    const wrapperRect = this.wrapperRef.nativeElement.getBoundingClientRect();
    const dropdownEl = this.dropdownRef.nativeElement;
    const dropdownHeight = dropdownEl.offsetHeight || 300;

    this.dropdownPosition = computeDropdownPosition(
      wrapperRect,
      dropdownHeight,
      window.innerHeight
    );

    this.cdr.detectChanges();
  }

  /** Determine if error message should be shown */
  shouldShowError(): boolean {
    const hasAnyError = !!this.displayedError;

    if (!hasAnyError) return false;

    // Reactive Forms
    if (this.formControls) {
      const c = this.formControls;
      switch (this.normalizedConfig.showErrorsOn) {
        case 'touched':
          return c.touched && c.invalid;
        case 'dirty':
          return c.dirty && c.invalid;
        case 'always':
        case 'live':
          return c.invalid;
        default:
          return c.dirty && c.invalid;
      }
    }

    // Template-driven fallback
    switch (this.normalizedConfig.showErrorsOn) {
      case 'blur':
        return !this.isFocused && hasAnyError;
      case 'focus':
        return this.isFocused && hasAnyError;
      case 'live':
      case 'always':
        return hasAnyError;
      case 'touched':
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
