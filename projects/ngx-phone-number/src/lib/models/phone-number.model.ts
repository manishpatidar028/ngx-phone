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

/**
 * Phone input configuration
 */
export interface PhoneInputConfig {
  // Country selection
  defaultCountry?: CountryCode | string;
  preferredCountries?: (CountryCode | string)[];
  onlyCountries?: (CountryCode | string)[];
  excludeCountries?: (CountryCode | string)[];
  
  // Display options
  flagPosition?: 'start' | 'end' | 'none';
  separateCountrySelector?: boolean;
  countrySelectPosition?: 'before' | 'after';
  showFlags?: boolean;
  showDialCode?: boolean;
  showPlaceholder?: boolean;
  showExampleNumber?: boolean;
  
  // Formatting options
  format?: 'INTERNATIONAL' | 'NATIONAL' | 'E164' | 'RFC3966';
  formatOnDisplay?: boolean;
  formatAsYouType?: boolean;
  nationalMode?: boolean;
  
  // Validation options
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  strictValidation?: boolean;
  
  // UI customization
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  
  // CSS classes
  containerClass?: string;
  inputClass?: string;
  buttonClass?: string;
  dropdownClass?: string;
  errorClass?: string;
  
  // Behavior
  autoFocus?: boolean;
  autoFormat?: boolean;
  autoDetectCountry?: boolean;
  closeOnSelect?: boolean;
  searchEnabled?: boolean;
  
  // Advanced
  customPlaceholder?: (country: Country) => string;
  customFormat?: (phoneNumber: string, country: Country) => string;
  
  // Dropdown
  dropdownContainer?: 'body' | 'parent';
  dropdownWidth?: string;
  dropdownMaxHeight?: string;
  fallbackCountry?: string;
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
  type: 'REQUIRED' | 'INVALID_COUNTRY' | 'TOO_SHORT' | 'TOO_LONG' | 'INVALID' | 'NOT_A_NUMBER';
  message: string;
}

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