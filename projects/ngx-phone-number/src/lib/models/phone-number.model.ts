/**
 * Phone number input models and interfaces
 */

import { CountryCode, NumberType } from 'libphonenumber-js';

/**
 * Country information extended from world-countries
 */
export interface Country {
  name: string;
  nativeName?: string;
  iso2: string; // ISO 3166-1 alpha-2
  iso3?: string; // ISO 3166-1 alpha-3
  dialCode: string;
  flag: string; // Emoji or CSS class
  flagUrl?: string;
  format?: string;
  priority?: number;
  areaCodes?: string[];
  hasAreaCodes?: boolean;
  isAreaCode?: boolean;
  mainCode?: string;
  emoji?: string;
  unicode?: string;
  image?: string;
}

export type BuiltInErrorType =
  | 'REQUIRED'
  | 'INVALID_COUNTRY'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID'
  | 'NOT_A_NUMBER';

/**
 * Phone input configuration
 */
export interface PhoneInputConfig {
  // 🌍 Country selection
  defaultCountry?: CountryCode | string;
  preferredCountries?: (CountryCode | string)[];
  onlyCountries?: (CountryCode | string)[];
  excludeCountries?: (CountryCode | string)[];
  fallbackCountry?: CountryCode | string;

  // 🏁 Country selector UI
  autoDetectCountry?: boolean;
  flagPosition?: 'start' | 'end' | 'none';
  separateCountrySelector?: boolean;
  countrySelectPosition?: 'before' | 'after';
  showFlags?: boolean;
  showDialCode?: boolean;
  lockCountrySelection?: boolean;
  clearInputOnCountryChange?: boolean;
  showCountryCodeInInput?: boolean;

  // 🔡 Input field
  placeholder?: string;
  autoFocus?: boolean;
  dialCodeCountryPreference?: { [dialCode: string]: string };

  // 🧠 Validation
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  strictValidation?: boolean;
  errorMessages?: Partial<Record<PhoneErrorType, string>>;
  showErrorMessages?: boolean;
  showInvalidBorder?: boolean;
  showErrorsOn?: 'touched' | 'dirty' | 'always' | 'blur' | 'focus' | 'live';

  // 🎨 UI Customization
  inputClass?: string;
  buttonClass?: string;
  containerClass?: string;
  dropdownClass?: string;
  errorClass?: string;

  // 🧮 Formatting
  format?: 'INTERNATIONAL' | 'NATIONAL' | 'E164' | 'RFC3966';
  formatOnDisplay?: boolean;
  nationalMode?: boolean;
  autoFormat?: boolean;

  // 🔍 Dropdown
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  noResultsText?: string;
  dropdownContainer?: 'body' | 'parent';
  dropdownWidth?: string;
  dropdownMaxHeight?: string;
  closeOnSelect?: boolean;

  // 🧠 Custom logic hooks
  customPlaceholder?: (country: Country) => string;
  customFormat?: (phoneNumber: string, country: Country) => string;
}


/**
 * Phone number value object
 */
export interface PhoneNumberValue {
  countryCode?: CountryCode;
  dialCode?: string;
  e164?: string;
  formatted?: string;
  national?: string;
  international?: string;
  rfc3966?: string;
  isValid?: boolean;
  isPossible?: boolean;
  type?: NumberType;
  country?: Country;
  raw?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  isPossible?: boolean;
  error?: ValidationError;
  type?: NumberType;
}

/**
 * Validation errors
 */
export interface ValidationError {
  type: BuiltInErrorType | string;
  message: string;
}

export type PhoneErrorType =
  | 'REQUIRED'
  | 'INVALID_COUNTRY'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID'
  | 'NOT_A_NUMBER';

/**
 * Component events
 */
export interface PhoneNumberEvents {
  countryChange: (country: Country) => void;
  numberChange: (value: PhoneNumberValue) => void;
  validationChange: (result: ValidationResult) => void;
  blur: () => void;
  focus: () => void;
  enter: () => void;
}

/**
 * Search options for country dropdown
 */
export interface CountrySearchOptions {
  searchBy?: ('name' | 'dialCode' | 'iso2' | 'iso3')[];
  minLength?: number;
  debounceTime?: number;
}

/**
 * Format options
 */
export interface FormatOptions {
  style?: 'INTERNATIONAL' | 'NATIONAL' | 'E164' | 'RFC3966';
  removeDialCode?: boolean;
  addSpaceAfterDialCode?: boolean;
}

export type PhoneCustomValidator = (
  value: string,
  country?: Country
) => ValidationError | null;
