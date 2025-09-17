import {
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
  Renderer2,
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
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

import {
  Country,
  PhoneCustomValidator,
  PhoneInputConfig,
  PhoneNumberValue,
  ValidationResult,
} from '../../models/phone-number.model';
import { CountryService } from '../../services/country.service';
import { PhoneValidationService } from '../../services/phone-validator.service';

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
  implements OnInit, OnDestroy, OnChanges, ControlValueAccessor, Validator
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

  // -------------------------------------------------------------------
  // 🔁 RxJS Streams
  // -------------------------------------------------------------------
  private destroy$ = new Subject<void>();
  private phoneInput$ = new Subject<string>();
  private searchInput$ = new Subject<string>();

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private hasUserInteracted = false;

  constructor(
    private countryService: CountryService,
    private validationService: PhoneValidationService,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2,
    private elementRef: ElementRef
  ) {}

  // -------------------------------------------------------------------
  // 🚀 Lifecycle Methods
  // -------------------------------------------------------------------
  ngOnInit(): void {
    this.loadCountries();
    this.setInitialCountry();
    this.setupSubscriptions();
    this.formControls?.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(100), distinctUntilChanged())
      .subscribe(() => {
        this.validateNumber();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.loadCountries();
      this.setInitialCountry();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get normalizedConfig(): Required<PhoneInputConfig> {
    return {
      // 🌍 Country selection
      defaultCountry: this.config.defaultCountry ?? 'US',
      autoDetectCountry: this.config.autoDetectCountry ?? false,
      preferredCountries: this.config.preferredCountries ?? [],
      onlyCountries: this.config.onlyCountries ?? [],
      excludeCountries: this.config.excludeCountries ?? [],
      fallbackCountry: this.config.fallbackCountry ?? 'US',

      // 🏁 Country selector UI
      flagPosition: this.config.flagPosition ?? 'start',
      separateCountrySelector: this.config.separateCountrySelector ?? false,
      countrySelectPosition: this.config.countrySelectPosition ?? 'before',
      showFlags: this.config.showFlags ?? true,
      showDialCode: this.config.showDialCode ?? true,
      lockCountrySelection: this.config.lockCountrySelection ?? false,
      clearInputOnCountryChange: this.config.clearInputOnCountryChange ?? true,
      showCountryCodeInInput: this.config.showCountryCodeInInput ?? false,

      // 🔡 Input field
      placeholder: this.config.placeholder ?? 'Enter phone number',
      autoFocus: this.config.autoFocus ?? false,
      dialCodeCountryPreference: this.config.dialCodeCountryPreference ?? {},

      // 🧠 Validation
      validateOnBlur: this.config.validateOnBlur ?? true,
      validateOnChange: this.config.validateOnChange ?? true,
      strictValidation: this.config.strictValidation ?? false,
      errorMessages: this.config.errorMessages ?? {},
      showErrorMessages: this.config.showErrorMessages ?? true,
      showInvalidBorder: this.config.showInvalidBorder ?? true,
      showErrorsOn: this.config.showErrorsOn ?? 'dirty',

      // 🎨 UI Customization
      inputClass: this.config.inputClass ?? '',
      buttonClass: this.config.buttonClass ?? '',
      containerClass: this.config.containerClass ?? '',
      dropdownClass: this.config.dropdownClass ?? '',
      errorClass: this.config.errorClass ?? '',

      // 🧮 Formatting
      format: this.config.format ?? 'INTERNATIONAL',
      formatOnDisplay: this.config.formatOnDisplay ?? true,
      nationalMode: this.config.nationalMode ?? false,
      autoFormat: this.config.autoFormat ?? true,

      // 🔍 Dropdown
      searchEnabled: this.config.searchEnabled ?? true,
      searchPlaceholder: this.config.searchPlaceholder ?? 'Search...',
      noResultsText: this.config.noResultsText ?? 'No results found',
      dropdownContainer: this.config.dropdownContainer ?? 'body',
      dropdownWidth: this.config.dropdownWidth ?? '300px',
      dropdownMaxHeight: this.config.dropdownMaxHeight ?? '300px',
      closeOnSelect: this.config.closeOnSelect ?? true,

      // 🧠 Custom logic hooks
      customPlaceholder:
        this.config.customPlaceholder ?? (() => 'Enter phone number'),
      customFormat: this.config.customFormat ?? ((num, _country) => num),
    };
  }

  // -------------------------------------------------------------------
  // ⚙️ Setup Methods
  // -------------------------------------------------------------------

  /** Load and filter country list */
  private loadCountries(): void {
    const only = this.normalizedConfig.onlyCountries || [];
    const exclude = this.normalizedConfig.excludeCountries || [];
    const preferred = this.normalizedConfig.preferredCountries || [];

    this.countries = this.countryService.filterCountries(only, exclude);
    this.filteredCountries = [...this.countries];
    this.preferredCountriesList =
      this.countryService.getPreferredCountries(preferred);
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
    } else if (this.normalizedConfig.autoDetectCountry) {
      const locale = navigator.language;
      const code = locale.split('-')[1];
      const country = this.countryService.getCountryByIso2(code);
      if (country)
        this.selectCountry(
          country,
          false,
          this.normalizedConfig.clearInputOnCountryChange
        );
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
    const digits = value.replace(/\D/g, '');
    const trimmedValue = value.trim();

    // Reset country lock when user starts typing international format
    if (trimmedValue.startsWith('+')) {
      this.isCountryLocked = false;
      this.isManualCountrySelection = false;
    }

    // Enhanced country detection logic
    const shouldDetectCountry = this.shouldDetectCountryFromInput(
      trimmedValue,
      digits
    );

    if (shouldDetectCountry) {
      this.detectCountryFromInput(trimmedValue);
    }

    // Fallback to default country only if no country detected and no international format
    if (
      !this.selectedCountry &&
      digits.length >= 3 &&
      !trimmedValue.startsWith('+')
    ) {
      this.fallbackToDefaultCountry();
    }

    // SPECIAL CASE: Even if autoFormat is false, format international numbers
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
            const cursorPosition =
              this.phoneInputRef.nativeElement.selectionStart || 0;
            this.phoneInputRef.nativeElement.value = formatted;
            // Try to maintain cursor position
            setTimeout(() => {
              const newPos = Math.min(
                cursorPosition + (formatted.length - trimmedValue.length),
                formatted.length
              );
              this.phoneInputRef.nativeElement.setSelectionRange(
                newPos,
                newPos
              );
            }, 0);
          }
        }
      } catch {
        // If formatting fails, keep original value
      }
    }

    this.validateNumber();
    this.emitValue();
  }

  /** Determine if we should detect country from input - NEW METHOD */
  private shouldDetectCountryFromInput(value: string, digits: string): boolean {
    // Always detect for international format
    if (value.startsWith('+')) {
      return true;
    }

    // If no country is selected yet
    if (!this.selectedCountry) {
      return digits.length >= 1;
    }

    // If user manually selected a country, don't auto-detect unless it's international format
    if (this.isManualCountrySelection) {
      return false;
    }

    // For non-manual selections, detect when there's enough input
    return digits.length >= 1 && !this.isCountryLocked;
  }

  /** Try to detect country from phone number - ENHANCED */
  private detectCountryFromInput(value: string): void {
    let detected = this.validationService.extractCountry(value);

    // Handle dial code preferences for international format
    if (
      detected &&
      this.normalizedConfig.dialCodeCountryPreference &&
      value.startsWith('+')
    ) {
      // Extract the dial code from the detected country (remove the '+')
      const dialCodeNumber = detected.dialCode.replace('+', '');
      const preferredIso =
        this.normalizedConfig.dialCodeCountryPreference[dialCodeNumber];

      const preferred = preferredIso
        ? this.countryService.getCountryByIso2(preferredIso)
        : null;

      if (preferred) {
        detected = preferred;
        console.log(
          `Dial code preference applied: ${dialCodeNumber} -> ${preferredIso}`
        );
      }
    }

    // Only change country if we detected a different one
    if (detected && detected.iso2 !== this.selectedCountry?.iso2) {
      this.selectCountry(detected, false, false, false);

      // Emit country change event for auto-detected countries
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

    this.validateNumber();
    this.emitValue();
  }

  /** Extract national number from current input - IMPROVED */
  private extractNationalNumber(phoneValue: string): string {
    if (!phoneValue) {
      return '';
    }

    const trimmed = phoneValue.trim();

    // If it's an international number, use libphonenumber to parse it properly
    if (trimmed.startsWith('+')) {
      try {
        const parsed = this.validationService.parsePhoneNumber(trimmed);
        if (parsed && parsed.country && this.selectedCountry) {
          // If the parsed number is from the current country, extract national number
          const parsedFromLibPhone = parsePhoneNumberFromString(trimmed);
          if (
            parsedFromLibPhone &&
            parsedFromLibPhone.country === this.selectedCountry.iso2
          ) {
            return parsedFromLibPhone.nationalNumber.toString();
          }
        }
      } catch {
        // Fall through to manual extraction
      }
    }

    // Manual extraction for various formats
    const currentDialCode = this.selectedCountry?.dialCode || '';
    let nationalNumber = trimmed;

    // Remove international prefix and current dial code
    if (trimmed.startsWith('+' + currentDialCode.slice(1))) {
      // International format: +1 234 567 8900
      nationalNumber = trimmed.slice(currentDialCode.length).trim();
    } else if (trimmed.startsWith(currentDialCode)) {
      // Dial code format: 1 234 567 8900
      nationalNumber = trimmed.slice(currentDialCode.length).trim();
    } else if (trimmed.startsWith('+')) {
      // Different country's international format
      // Extract everything after the dial code
      const match = trimmed.match(/^\+(\d{1,4})\s?(.*)/);
      if (match && match[2]) {
        nationalNumber = match[2];
      } else {
        // Fallback: remove first 2-5 digits which could be dial code
        nationalNumber = trimmed.slice(2).replace(/^\d{0,3}\s?/, '');
      }
    }

    // Clean up the national number - remove only formatting, keep all digits
    return nationalNumber.replace(/[\s\(\)\-\.]/g, '').trim();
  }
  private rewritePhoneInputWithNewCountryCode(newCountry: Country): void {
    const raw = this.phoneValue.trim();

    // Extract current country dial code (if present)
    const currentDialCode = this.selectedCountry?.dialCode ?? '';

    let numberWithoutDialCode = raw;

    if (raw.startsWith(currentDialCode)) {
      // Already has old dial code without +
      numberWithoutDialCode = raw.slice(currentDialCode.length).trim();
    } else if (raw.startsWith('+' + currentDialCode)) {
      // Starts with +dial code
      numberWithoutDialCode = raw.slice(currentDialCode.length + 1).trim();
    } else {
      // Attempt basic pattern match
      numberWithoutDialCode = raw.replace(/^\+?\d{1,4}/, '').trim();
    }

    const newRaw = `${newCountry.dialCode} ${numberWithoutDialCode}`;

    this.phoneValue = this.validationService.formatAsYouType(
      newRaw,
      newCountry.iso2
    );
  }

  /** Validate current phone number - ENHANCED FOR REACTIVE FORMS */
  private validateNumber(): void {
    const trimmed = this.phoneValue?.trim() ?? '';
    const isTemplateDriven = !this.formControls;

    // Skip initial validation for Template-Driven Form (on untouched input)
    if (
      isTemplateDriven &&
      !this.isFocused &&
      !this.hasUserInteracted &&
      !trimmed
    ) {
      this.validationResult = null;
      this.isValid = true; // Don't show as invalid initially
      this.isPossible = false;
      return;
    }

    // Handle empty value
    // Handle empty value
    if (!trimmed) {
      // 🟢 If untouched/unmodified, skip showing required error
      if (!this.hasUserInteracted && !this.isFocused) {
        this.validationResult = null;
        this.isValid = true;
        this.isPossible = false;
        return;
      }

      this.validationResult = {
        isValid: this.required ? false : true,
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
      this.isValid = this.required ? false : true;
      this.isPossible = false;
      this.validationChange.emit(this.validationResult);

      if (this.formControls) {
        this.onValidatorChange?.();
      }
      return;
    }

    // Perform validation using the validation service
    this.validationResult = this.validationService.validate(
      this.phoneValue,
      this.selectedCountry?.iso2,
      this.normalizedConfig.errorMessages,
      this.customValidators
    );

    this.isValid = this.validationResult.isValid;
    this.isPossible = this.validationResult.isPossible ?? false;

    // Auto-format if valid and auto-format is enabled
    if (this.isValid && this.normalizedConfig.autoFormat) {
      const formatStyle = this.normalizedConfig.format;
      const countryIso =
        this.selectedCountry?.iso2 ||
        this.normalizedConfig.defaultCountry ||
        'US';

      const formatted = this.validationService.format(
        this.phoneValue,
        { style: formatStyle },
        countryIso
      );

      if (formatted !== this.phoneValue) {
        this.phoneValue = formatted;
        if (this.phoneInputRef?.nativeElement) {
          this.phoneInputRef.nativeElement.value = formatted;
        }
      }
    }

    // Run custom validators if provided
    if (this.customValidators.length > 0) {
      for (const validator of this.customValidators) {
        const error = validator(
          this.phoneValue,
          this.selectedCountry ?? undefined
        );
        if (error) {
          this.validationResult = {
            isValid: false,
            isPossible: this.validationResult.isPossible,
            error,
          };
          this.isValid = false;
          break;
        }
      }
    }

    this.validationChange.emit(this.validationResult);

    // Essential for reactive forms - trigger validator change
    this.onValidatorChange?.();
  }

  /** Emit formatted value - ENHANCED FOR REACTIVE FORMS */
  private emitValue(): void {
    const isEmpty = !this.phoneValue || !this.phoneValue.trim();

    if (isEmpty) {
      this.phoneNumberValue = null;
      this.onChange(''); // Emit empty string for reactive forms
      this.numberChange.emit(null);
    } else {
      this.phoneNumberValue = this.validationService.parsePhoneNumber(
        this.phoneValue,
        this.selectedCountry?.iso2
      );

      // For reactive forms, emit the parsed object or formatted string based on configuration
      const valueToEmit = this.phoneNumberValue || this.phoneValue;
      this.onChange(valueToEmit);
      this.numberChange.emit(this.phoneNumberValue);
    }

    // Trigger change detection for reactive forms
    this.cdr.markForCheck();
  }

  // -------------------------------------------------------------------
  // 🔡 Input Event
  // -------------------------------------------------------------------

  /** Handle user input - ENHANCED FOR REACTIVE FORMS */
  onPhoneInput(value: string): void {
    this.hasUserInteracted = true;
    this.phoneValue = value;

    // Emit the change immediately to keep reactive forms in sync
    this.phoneInput$.next(value);

    // For reactive forms, emit the value immediately to prevent desynchronization
    if (this.formControls) {
      // Always emit the current value to maintain sync with reactive forms
      if (!value.trim()) {
        this.onChange('');
      } else {
        // For reactive forms, we might want to emit the raw value during typing
        this.onChange(value);
      }
    } else {
      // Template-driven forms - emit null if cleared
      if (!this.phoneValue.trim()) {
        this.onChange('');
      }
    }

    // Validate immediately for reactive forms if configured
    if (this.formControls && this.normalizedConfig.validateOnChange) {
      this.validateNumber();
    } else if (!this.formControls && this.normalizedConfig.validateOnChange) {
      this.validateNumber(); // Template-driven forms
    }

    this.emitValue();
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

    // Process and validate the new value
    if (this.phoneValue) {
      this.processPhoneNumber(this.phoneValue);
    }

    // Force validation after setting value for reactive forms
    setTimeout(() => {
      this.validateNumber();
    }, 0);
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
    const showOn = this.normalizedConfig.showErrorsOn ?? 'dirty';
    const untouched = !control.touched && !control.dirty;
    if (untouched && showOn !== 'always' && showOn !== 'live') {
      return null;
    }

    // ✅ Detect required either via input OR Angular Validators.required
    const isRequired =
      this.required ||
      (typeof control.hasValidator === 'function' &&
        control.hasValidator(Validators.required));

    const trimmed = this.phoneValue?.trim();

    if (isRequired && !trimmed) {
      return {
        phoneNumber: {
          type: 'REQUIRED',
          message:
            this.normalizedConfig.errorMessages.REQUIRED ??
            'Phone number is required.',
        },
      };
    }

    // fallback to validation service results
    if (
      this.validationResult &&
      !this.validationResult.isValid &&
      this.validationResult.error
    ) {
      return {
        phoneNumber: {
          type: this.validationResult.error.type,
          message: this.validationResult.error.message,
        },
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
    return iso2
      .toUpperCase()
      .replace(/./g, (char) =>
        String.fromCodePoint(127397 + char.charCodeAt(0))
      );
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

    // Show invisibly first to get real dimensions
    this.cdr.detectChanges();

    // Delay until after dropdown is rendered
    requestAnimationFrame(() => {
      this.setDropdownPosition();
      this.cdr.detectChanges();

      // Optional: focus search input
      if (
        this.normalizedConfig.searchEnabled &&
        this.searchInputRef?.nativeElement
      ) {
        this.searchInputRef.nativeElement.focus();
      }
    });
  }

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
    this.onTouched(); // Critical for reactive forms
    this.blur.emit();

    if (this.normalizedConfig.validateOnBlur) {
      this.validateNumber();

      // Auto-format on blur if valid
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

          // Emit the formatted value
          this.onChange(this.phoneNumberValue || formatted);
        }
      }
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
   * the input field based on available viewport space.
   */
  private setDropdownPosition(): void {
    if (!this.wrapperRef || !this.dropdownRef) return;

    const wrapperRect = this.wrapperRef.nativeElement.getBoundingClientRect();
    const dropdownEl = this.dropdownRef.nativeElement;

    const dropdownHeight = dropdownEl.offsetHeight || 300;
    const spaceBelow = window.innerHeight - wrapperRect.bottom;
    const spaceAbove = wrapperRect.top;

    // Choose where it fits better
    if (spaceBelow >= dropdownHeight) {
      this.dropdownPosition = 'bottom';
    } else if (spaceAbove >= dropdownHeight) {
      this.dropdownPosition = 'top';
    } else {
      // If it doesn't fully fit, prefer the side with more space
      this.dropdownPosition = spaceBelow > spaceAbove ? 'bottom' : 'top';
    }

    this.cdr.detectChanges();
  }

  /** Determine if error message should be shown */
  shouldShowError(): boolean {
    const hasComponentError = !!this.validationResult?.error;
    const hasValue = !!this.phoneValue?.trim();

    if (!hasComponentError) return false;

    // ✅ Reactive Forms
    if (this.formControls) {
      const control = this.formControls;
      const showOn = this.normalizedConfig.showErrorsOn;

      switch (showOn) {
        case 'touched':
          return control.touched && control.invalid;
        case 'dirty':
          return control.dirty && control.invalid;
        case 'always':
          return control.invalid;
        case 'live':
          return control.invalid;
        default:
          return control.touched || hasValue;
      }
    }

    // ✅ Template-driven Forms fallback
    switch (this.normalizedConfig.showErrorsOn) {
      case 'blur':
        return !this.isFocused && hasComponentError;
      case 'focus':
        return this.isFocused && hasComponentError;
      case 'live':
        return hasComponentError;
      case 'always':
        return true;
      default:
        return !this.isFocused || hasValue;
    }
  }
}
