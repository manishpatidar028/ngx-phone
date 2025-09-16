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
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AsYouType } from 'libphonenumber-js';

import {
  Country,
  PhoneErrorType,
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
  @Input() defaultCountry?: string;
  @Input() preferredCountries?: string[];
  @Input() onlyCountries?: string[];
  @Input() excludeCountries?: string[];
  @Input() fallbackCountry: string = 'US';
  @Input() dialCodeCountryPreference: { [dialCode: string]: string } = {};
  @Input() public formControls!: AbstractControl | null;

  @Input() separateCountrySelector = false;
  @Input() countrySelectPosition: 'before' | 'after' = 'before';
  @Input() showFlags = true;
  @Input() showDialCode = true;
  @Input() placeholder = 'Enter phone number';
  @Input() searchPlaceholder = 'Search...';
  @Input() noResultsText = 'No results found';
  @Input() disabled = false;
  @Input() required = false;
  @Input() readonly = false;
  @Input() lockCountrySelection = false;
  @Input() clearInputOnCountryChange = true;
  @Input() showCountryCodeInInput = false;

  @Input() format: 'INTERNATIONAL' | 'NATIONAL' | 'E164' | 'RFC3966' =
    'INTERNATIONAL';
  @Input() formatOnDisplay = true;
  @Input() formatAsYouType = true;
  @Input() nationalMode = false;
  @Input() validateOnBlur = true;
  @Input() validateOnChange = true;
  @Input() autoDetectCountry = false;
  @Input() autoFormat = true;
  @Input() closeOnSelect = true;
  @Input() searchEnabled = true;

  @Input() dropdownContainer: 'body' | 'parent' = 'body';
  @Input() dropdownWidth = '300px';
  @Input() dropdownMaxHeight = '300px';
  @Input() showErrorsOn:
    | 'touched'
    | 'dirty'
    | 'always'
    | 'blur'
    | 'focus'
    | 'live' = 'dirty';

  @Input() containerClass = '';
  @Input() inputClass = '';
  @Input() buttonClass = '';
  @Input() dropdownClass = '';
  @Input() errorClass = '';
  @Input() showErrorMessages = true;
  @Input() showInvalidBorder = true;
  @Input() errorMessages: Partial<Record<PhoneErrorType, string>> = {};

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
    return this.shouldShowError() && this.showInvalidBorder;
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
  isCountryManuallySelected = false;

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
    this.mergeConfig();
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
    if (changes['config']) this.mergeConfig();

    if (
      changes['defaultCountry'] ||
      changes['onlyCountries'] ||
      changes['excludeCountries'] ||
      changes['preferredCountries']
    ) {
      this.loadCountries();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -------------------------------------------------------------------
  // ⚙️ Setup Methods
  // -------------------------------------------------------------------

  /** Merge incoming config with inputs */
  private mergeConfig(): void {
    this.config = { ...this.config, ...this.getAllInputs() };
  }

  /** Collect all @Inputs into a config object */
  private getAllInputs(): Partial<PhoneInputConfig> {
    return {
      defaultCountry: this.defaultCountry,
      preferredCountries: this.preferredCountries,
      onlyCountries: this.onlyCountries,
      excludeCountries: this.excludeCountries,
      fallbackCountry: this.fallbackCountry,
      separateCountrySelector: this.separateCountrySelector,
      showFlags: this.showFlags,
      showDialCode: this.showDialCode,
      dropdownWidth: this.dropdownWidth,
      dropdownMaxHeight: this.dropdownMaxHeight,
    };
  }

  /** Load and filter country list */
  private loadCountries(): void {
    const only = this.onlyCountries || [];
    const exclude = this.excludeCountries || [];
    const preferred = this.preferredCountries || [];

    this.countries = this.countryService.filterCountries(only, exclude);
    this.filteredCountries = [...this.countries];
    this.preferredCountriesList =
      this.countryService.getPreferredCountries(preferred);
  }

  /** Detect or assign the initial country */
  private setInitialCountry(): void {
    if (!this.selectedCountry && this.defaultCountry) {
      const country = this.countryService.getCountryByIso2(this.defaultCountry);
      if (country) {
        this.selectCountry(
          country,
          this.showCountryCodeInInput && !this.separateCountrySelector,
          this.clearInputOnCountryChange && !this.separateCountrySelector
        );
      }
    } else if (this.autoDetectCountry) {
      const locale = navigator.language;
      const code = locale.split('-')[1];
      const country = this.countryService.getCountryByIso2(code);
      if (country)
        this.selectCountry(country, false, this.clearInputOnCountryChange);
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

  /** Process phone number input and country inference */
  private processPhoneNumber(value: string): void {
    const digits = value.replace(/\D/g, '');

    if (
      (!this.selectedCountry || value.startsWith('+')) &&
      !this.isCountryManuallySelected
    ) {
      this.detectCountryFromInput(value);
    }

    if (!this.selectedCountry && digits.length >= 3 && !value.startsWith('+')) {
      this.fallbackToDefaultCountry();
    }

    this.validateNumber();
    this.emitValue();
  }

  /** Try to detect country from phone number */
  private detectCountryFromInput(value: string): void {
    let detected = this.validationService.extractCountry(value);

    if (detected && this.dialCodeCountryPreference && value.startsWith('+')) {
      const preferredIso = this.dialCodeCountryPreference[detected.dialCode];
      const preferred = preferredIso
        ? this.countryService.getCountryByIso2(preferredIso)
        : null;
      if (preferred) detected = preferred;
    }

    if (detected && detected.iso2 !== this.selectedCountry?.iso2) {
      this.selectCountry(detected, false, false);
    }
  }

  /** Use fallback/default country when detection fails */
  private fallbackToDefaultCountry(): void {
    const iso = (
      this.defaultCountry ||
      this.fallbackCountry ||
      'US'
    ).toUpperCase();
    const fallback = this.countryService.getCountryByIso2(iso);
    if (fallback) this.selectCountry(fallback, false, false);
  }

  /** Set selected country and reformat input */
  private selectCountry(
    country: Country,
    updateInput: boolean = true,
    clearInput: boolean = false,
    isManual: boolean = false
  ): void {
    this.selectedCountry = country;
    this.isCountryManuallySelected = isManual;
    this.countryChange.emit(country);

    if (updateInput) {
      if (clearInput || !this.phoneValue) {
        // If empty or requested to clear digits — only insert dial code
        this.phoneValue = this.validationService.formatAsYouType(
          country.dialCode,
          country.iso2
        );
      } else {
        // Retain digits, just update the dial code
        this.rewritePhoneInputWithNewCountryCode(country);
      }

      if (this.phoneInputRef?.nativeElement) {
        this.phoneInputRef.nativeElement.value = this.phoneValue;
        this.phoneInputRef.nativeElement.focus();
      }

      this.onChange(this.phoneValue || null);
    }

    this.validateNumber();
    this.emitValue();
  }

  /** Rewrite input with new dial code */
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

  /** Validate current phone number */
  private validateNumber(): void {
    const trimmed = this.phoneValue?.trim() ?? '';
    const isTemplateDriven = !this.formControls;

    // ✅ Skip initial validation for Template-Driven Form (on untouched input)
    if (
      isTemplateDriven &&
      !this.isFocused &&
      !this.hasUserInteracted &&
      !trimmed
    ) {
      this.validationResult = null;
      return;
    }

    if (!trimmed) {
      this.validationResult = {
        isValid: false,
        isPossible: false,
        error: {
          type: 'REQUIRED',
          message: this.errorMessages.REQUIRED ?? 'Phone number is required.',
        },
      };
      this.isValid = false;
      this.isPossible = false;
      this.validationChange.emit(this.validationResult);
      this.onValidatorChange?.();
      return;
    }

    this.validationResult = this.validationService.validate(
      this.phoneValue,
      this.selectedCountry?.iso2,
      this.errorMessages
    );

    this.isValid = this.validationResult.isValid;
    this.isPossible = this.validationResult.isPossible ?? false;
    this.validationChange.emit(this.validationResult);
    this.onValidatorChange?.();
  }

  /** Emit formatted value */
  private emitValue(): void {
    const isEmpty = !this.phoneValue || !this.phoneValue.trim();

    if (isEmpty) {
      this.phoneNumberValue = null;
      this.onChange(''); // ✅ important
      this.numberChange.emit(null);
    } else {
      this.phoneNumberValue = this.validationService.parsePhoneNumber(
        this.phoneValue,
        this.selectedCountry?.iso2
      );
      this.onChange(this.phoneNumberValue);
      this.numberChange.emit(this.phoneNumberValue);
    }
  }

  // -------------------------------------------------------------------
  // 🔡 Input Event
  // -------------------------------------------------------------------

  /** Handle user input */
  onPhoneInput(value: string): void {
    this.hasUserInteracted = true;
    const inputEl = this.phoneInputRef?.nativeElement;
    const cursorPos = inputEl?.selectionStart ?? value.length;

    this.phoneInput$.next(value);

    if (this.formatAsYouType && this.selectedCountry) {
      const formatter = new AsYouType(this.selectedCountry.iso2 as any);
      const formatted = formatter.input(value);

      if (formatted !== value) {
        this.phoneValue = formatted;

        requestAnimationFrame(() => {
          if (inputEl) {
            const newPos = Math.min(formatted.length, cursorPos);
            inputEl.setSelectionRange(newPos, newPos);
          }
        });
      } else {
        this.phoneValue = value;
      }
    } else {
      this.phoneValue = value;
    }

    // ✅ Emit null if value is cleared
    if (!this.phoneValue.trim()) {
      this.onChange('');
    }

    if (!this.formControls && this.validateOnChange) {
      this.validateNumber(); // 🧠 for template-driven, no formControls
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
      this.validateNumber(); // ✅ Trigger validation on empty
      return;
    }

    if (typeof value === 'string') {
      this.phoneValue = value;
      const country = this.validationService.extractCountry(value);
      if (country) this.selectCountry(country, false);
    } else if (typeof value === 'object') {
      this.phoneValue =
        value.formatted || value.international || value.raw || '';
      if (value.country) {
        this.selectCountry(value.country, false);
      } else if (value.countryCode) {
        const country = this.countryService.getCountryByIso2(value.countryCode);
        if (country) this.selectCountry(country, false);
      }
    }

    this.processPhoneNumber(this.phoneValue);
    this.validateNumber(); // ✅ Force validation after setting value
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
    if (country) this.selectCountry(country);
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
    if (this.phoneInputRef?.nativeElement) {
      this.phoneInputRef.nativeElement.value = '';
    }

    this.emitValue();
  }

  /** Manual validation (called by Angular forms) */
  validate(control: AbstractControl): ValidationErrors | null {
    const trimmed = this.phoneValue?.trim();

    if (!trimmed) {
      return {
        phoneNumber: {
          type: 'REQUIRED',
          message: this.errorMessages.REQUIRED ?? 'Phone number is required.',
        },
      };
    }

    if (
      this.validationResult &&
      !this.validationResult.isValid &&
      this.validationResult.error
    ) {
      return {
        phoneNumber: this.validationResult.error,
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
      { style: style || this.format },
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
    if (this.disabled || this.lockCountrySelection) return;

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
      if (this.searchEnabled && this.searchInputRef?.nativeElement) {
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
   * Called when input loses focus.
   */
  onPhoneBlur(): void {
    this.isFocused = false;
    this.onTouched();
    this.blur.emit();

    if (this.validateOnBlur) {
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
   * Select a country and close the dropdown.
   */
  selectCountryAndClose(country: Country): void {
    this.selectCountry(country, this.showCountryCodeInInput, false, true);
    if (this.closeOnSelect) {
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
    const hasError = !!this.validationResult?.error;
    const hasValue = !!this.phoneValue?.trim();

    // No error at all
    if (!hasError) return false;

    // Reactive Forms
    if (this.formControls) {
      if (this.showErrorsOn === 'touched') return this.formControls.touched;
      if (this.showErrorsOn === 'dirty') return this.formControls.dirty;
      if (this.showErrorsOn === 'always') return true;
    }

    // Template-driven Forms
    switch (this.showErrorsOn) {
      case 'blur':
        return !this.isFocused;
      case 'focus':
        return this.isFocused;
      case 'live':
        return true;
      case 'always':
        return true;
      default:
        // Default fallback: show on blur or typing
        return !this.isFocused || hasValue;
    }
  }
}
