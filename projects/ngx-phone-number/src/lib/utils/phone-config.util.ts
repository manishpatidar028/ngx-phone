import { PhoneInputConfig } from '../models/phone-number.model';

/**
 * Default configuration for phone input component
 * Note: Function properties like customPlaceholder and customFormat are optional
 */
const DEFAULT_CONFIG: Omit<
  Required<PhoneInputConfig>,
  'customPlaceholder' | 'customFormat'
> = {
  // Country selection
  defaultCountry: 'US',
  preferredCountries: [],
  onlyCountries: [],
  excludeCountries: [],
  fallbackCountry: 'US',

  // Country selector UI
  autoDetectCountry: false,
  flagPosition: 'start',
  separateCountrySelector: false,
  countrySelectPosition: 'before',
  showFlags: true,
  showDialCode: false,
  lockCountrySelection: false,
  clearInputOnCountryChange: false,
  showCountryCodeInInput: false,
  showInlineDivider: true,

  // Label configuration
  label: '',
  labelClass: '',
  showLabel: false,
  labelPosition: 'top',

  // Placeholder configuration
  placeholder: 'Enter phone number',
  placeholderClass: '',
  customPlaceholderStyle: {},

  // Input field
  autoFocus: false,
  dialCodeCountryPreference: {},
  valueMode: 'string',

  // Validation
  validateOnBlur: true,
  validateOnChange: true,
  strictValidation: false,
  errorMessages: {
    REQUIRED: 'Phone number is required.',
    INVALID_COUNTRY: 'Invalid or unsupported country.',
    TOO_SHORT: 'Phone number is too short.',
    TOO_LONG: 'Phone number is too long.',
    INVALID: 'Invalid phone number.',
    NOT_A_NUMBER: 'Input is not a valid number.',
  },
  showErrorMessages: true,
  showInvalidBorder: true,
  showErrorsOn: 'dirty',

  // UI Customization
  inputClass: '',
  buttonClass: '',
  containerClass: '',
  dropdownClass: '',
  errorClass: '',
  customContainerBorder: false,
  containerBorderStyle: {},

  // Formatting
  format: 'INTERNATIONAL',
  formatOnDisplay: false,
  nationalMode: false,
  autoFormat: true,

  // Dropdown
  searchEnabled: true,
  searchPlaceholder: 'Search countries...',
  noResultsText: 'No countries found',
  dropdownContainer: 'parent',
  dropdownWidth: '100%',
  dropdownMaxHeight: '300px',
  closeOnSelect: true,
  dropdownPosition: 'auto',
} as const;

/**
 * Internal normalized config type that properly handles optional functions
 */
export type NormalizedPhoneConfig = typeof DEFAULT_CONFIG & {
  customPlaceholder?: (country: any) => string;
  customFormat?: (phoneNumber: string, country: any) => string;
};

/**
 * Normalize phone input configuration by merging with defaults
 */
export function normalizePhoneConfig(
  config: PhoneInputConfig
): NormalizedPhoneConfig {
  const normalized = { ...DEFAULT_CONFIG, ...config };

  // Ensure error messages are properly merged
  normalized.errorMessages = {
    ...DEFAULT_CONFIG.errorMessages,
    ...(config.errorMessages || {}),
  };

  // Ensure placeholder style is properly merged
  normalized.customPlaceholderStyle = {
    ...DEFAULT_CONFIG.customPlaceholderStyle,
    ...(config.customPlaceholderStyle || {}),
  };

  // Ensure container border style is properly merged
  normalized.containerBorderStyle = {
    ...DEFAULT_CONFIG.containerBorderStyle,
    ...(config.containerBorderStyle || {}),
  };

  // Ensure dial code preference is properly merged
  normalized.dialCodeCountryPreference = {
    ...DEFAULT_CONFIG.dialCodeCountryPreference,
    ...(config.dialCodeCountryPreference || {}),
  };

  // Validation for incompatible options
  if (
    normalized.separateCountrySelector &&
    normalized.flagPosition === 'none'
  ) {
    console.warn(
      'NgxPhone: separateCountrySelector is true but flagPosition is "none". Setting showFlags to false.'
    );
    normalized.showFlags = false;
  }

  // Auto-enable label display if label text is provided
  if (normalized.label && !config.showLabel) {
    normalized.showLabel = true;
  }

  // Ensure proper flag positioning
  if (normalized.flagPosition === 'none') {
    normalized.showFlags = false;
  }

  // Validate dropdown position
  if (!['auto', 'top', 'bottom'].includes(normalized.dropdownPosition)) {
    console.warn(
      `NgxPhone: Invalid dropdownPosition "${normalized.dropdownPosition}". Using "auto".`
    );
    normalized.dropdownPosition = 'auto';
  }

  // Validate label position
  if (!['top', 'floating', 'inline'].includes(normalized.labelPosition)) {
    console.warn(
      `NgxPhone: Invalid labelPosition "${normalized.labelPosition}". Using "top".`
    );
    normalized.labelPosition = 'top';
  }

  // Validate show errors on
  if (
    !['touched', 'dirty', 'always', 'blur', 'focus', 'live'].includes(
      normalized.showErrorsOn
    )
  ) {
    console.warn(
      `NgxPhone: Invalid showErrorsOn "${normalized.showErrorsOn}". Using "dirty".`
    );
    normalized.showErrorsOn = 'dirty';
  }

  return normalized;
}

/**
 * Validate configuration for common issues
 */
export function validatePhoneConfig(config: PhoneInputConfig): string[] {
  const warnings: string[] = [];

  if (config.onlyCountries && config.excludeCountries) {
    if (config.onlyCountries.length > 0 && config.excludeCountries.length > 0) {
      warnings.push(
        'Both onlyCountries and excludeCountries are set. onlyCountries will take precedence.'
      );
    }
  }

  if (config.lockCountrySelection && config.autoDetectCountry) {
    warnings.push(
      'lockCountrySelection is true but autoDetectCountry is also true. Country detection will be disabled.'
    );
  }

  if (config.separateCountrySelector && config.flagPosition === 'none') {
    warnings.push(
      'separateCountrySelector is true but flagPosition is "none". Consider setting showFlags to false.'
    );
  }

  if (config.customContainerBorder && !config.containerBorderStyle) {
    warnings.push(
      'customContainerBorder is true but containerBorderStyle is not provided.'
    );
  }

  if (config.customContainerBorder && !config.containerBorderStyle) {
    warnings.push(
      'customContainerBorder is true but containerBorderStyle is not provided.'
    );
  }

  if (config.labelPosition === 'floating' && !config.label) {
    warnings.push('labelPosition is "floating" but no label text is provided.');
  }

  return warnings;
}

/**
 * Helper to get effective placeholder text
 */
export function getEffectivePlaceholder(
  config: NormalizedPhoneConfig,
  selectedCountry: any
): string {
  if (config.customPlaceholder && selectedCountry) {
    try {
      return config.customPlaceholder(selectedCountry);
    } catch (error) {
      console.warn(
        'NgxPhone: Custom placeholder function threw an error:',
        error
      );
    }
  }

  return config.placeholder;
}

/**
 * Helper to determine if custom styles should be applied
 */
export function shouldApplyCustomStyles(
  config: NormalizedPhoneConfig
): boolean {
  return (
    config.customContainerBorder ||
    Object.keys(config.customPlaceholderStyle).length > 0 ||
    Object.keys(config.containerBorderStyle).length > 0
  );
}
