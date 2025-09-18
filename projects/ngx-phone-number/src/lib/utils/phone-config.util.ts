import { PhoneInputConfig, ValidationMessageMap } from '../models/phone-number.model';

export function normalizePhoneConfig(
  cfg: PhoneInputConfig = {}
): Required<PhoneInputConfig> {
  return {
    // 🌍 Country selection
    defaultCountry: cfg.defaultCountry ?? 'US',
    autoDetectCountry: cfg.autoDetectCountry ?? false,
    preferredCountries: cfg.preferredCountries ?? [],
    onlyCountries: cfg.onlyCountries ?? [],
    excludeCountries: cfg.excludeCountries ?? [],
    fallbackCountry: cfg.fallbackCountry ?? 'US',

    // 🏁 Country selector UI
    flagPosition: cfg.flagPosition ?? 'start',
    separateCountrySelector: cfg.separateCountrySelector ?? false,
    countrySelectPosition: cfg.countrySelectPosition ?? 'before',
    showFlags: cfg.showFlags ?? true,
    showDialCode: cfg.showDialCode ?? true,
    lockCountrySelection: cfg.lockCountrySelection ?? false,
    clearInputOnCountryChange: cfg.clearInputOnCountryChange ?? true,
    showCountryCodeInInput: cfg.showCountryCodeInInput ?? false,

    // 🔡 Input field
    placeholder: cfg.placeholder ?? 'Enter phone number',
    autoFocus: cfg.autoFocus ?? false,
    dialCodeCountryPreference: cfg.dialCodeCountryPreference ?? {},
    valueMode: cfg.valueMode ?? 'e164',

    // 🧠 Validation
    validateOnBlur: cfg.validateOnBlur ?? true,
    validateOnChange: cfg.validateOnChange ?? true,
    strictValidation: cfg.strictValidation ?? false,
    errorMessages: (cfg.errorMessages ?? {}) as ValidationMessageMap,
    showErrorMessages: cfg.showErrorMessages ?? true,
    showInvalidBorder: cfg.showInvalidBorder ?? true,
    showErrorsOn: cfg.showErrorsOn ?? 'dirty',

    // 🎨 UI Customization
    inputClass: cfg.inputClass ?? '',
    buttonClass: cfg.buttonClass ?? '',
    containerClass: cfg.containerClass ?? '',
    dropdownClass: cfg.dropdownClass ?? '',
    errorClass: cfg.errorClass ?? '',

    // 🧮 Formatting
    format: cfg.format ?? 'INTERNATIONAL',
    formatOnDisplay: cfg.formatOnDisplay ?? true,
    nationalMode: cfg.nationalMode ?? false,
    autoFormat: cfg.autoFormat ?? true,

    // 🔍 Dropdown
    searchEnabled: cfg.searchEnabled ?? true,
    searchPlaceholder: cfg.searchPlaceholder ?? 'Search...',
    noResultsText: cfg.noResultsText ?? 'No results found',
    dropdownContainer: cfg.dropdownContainer ?? 'body',
    dropdownWidth: cfg.dropdownWidth ?? '300px',
    dropdownMaxHeight: cfg.dropdownMaxHeight ?? '300px',
    closeOnSelect: cfg.closeOnSelect ?? true,

    // 🧠 Custom logic hooks
    customPlaceholder: cfg.customPlaceholder ?? (() => 'Enter phone number'),
    customFormat: cfg.customFormat ?? ((num, _country) => num),
  };
}
