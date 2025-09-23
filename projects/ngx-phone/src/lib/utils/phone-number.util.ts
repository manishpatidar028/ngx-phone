// utils/phone-number.util.ts
import {
  Country,
  PhoneInputConfig,
  PhoneNumberValue,
} from '../models/phone-number.model';

/** Pure check: when should we auto-detect country from input */
export function shouldDetectCountryFromInput(
  value: string,
  digits: string,
  selectedCountryIso?: string | null,
  isManualCountrySelection?: boolean,
  isCountryLocked?: boolean
): boolean {
  if (value.startsWith('+')) return true; // international → always detect
  if (!selectedCountryIso) return digits.length >= 1; // no selection yet → detect
  if (isManualCountrySelection) return false; // respect manual choice
  return digits.length >= 1 && !isCountryLocked; // otherwise when enough digits and not locked
}

/** Extract national number from input, using a provided parse function (no service import here) */
export function extractNationalNumber(
  phoneValue: string,
  selectedCountryIso?: string | null,
  currentDialCode?: string | null,
  parse: (
    input: string,
    countryIso?: string
  ) => { country?: any; national?: string } | null = () => null
): string {
  if (!phoneValue) return '';
  const trimmed = phoneValue.trim();
  const dial = currentDialCode || '';

  // If it's an international number, try to parse and use national part when same country
  if (trimmed.startsWith('+')) {
    const parsed = parse(trimmed, selectedCountryIso || undefined);
    if (
      parsed &&
      parsed.country &&
      selectedCountryIso &&
      (parsed.country.iso2 === selectedCountryIso ||
        parsed.country === selectedCountryIso)
    ) {
      return (parsed.national ?? '').replace(/\D/g, '');
    }
  }

  // Manual fallback (keep exact behavior)
  let nationalNumber = trimmed;
  if (trimmed.startsWith('+' + dial.slice(1))) {
    nationalNumber = trimmed.slice(dial.length).trim();
  } else if (dial && trimmed.startsWith(dial)) {
    nationalNumber = trimmed.slice(dial.length).trim();
  } else if (trimmed.startsWith('+')) {
    const match = trimmed.match(/^\+(\d{1,4})\s?(.*)/);
    nationalNumber =
      match && match[2]
        ? match[2]
        : trimmed.slice(2).replace(/^\d{0,3}\s?/, '');
  }

  return nationalNumber.replace(/[\s().-]/g, '').trim();
}

/** Replace existing dial code with a new one and format via provided "as-you-type" fn */
export function rewriteWithNewDialCode(
  rawValue: string,
  currentDialCode: string | undefined,
  newDialCode: string,
  newCountryIso: string,
  asYouType: (input: string, iso?: string) => string
): string {
  const raw = (rawValue || '').trim();
  const curr = currentDialCode || '';

  let numberWithoutDial = raw;
  if (curr && raw.startsWith(curr)) {
    numberWithoutDial = raw.slice(curr.length).trim();
  } else if (curr && raw.startsWith('+' + curr)) {
    numberWithoutDial = raw.slice(curr.length + 1).trim();
  } else {
    numberWithoutDial = raw.replace(/^\+?\d{1,4}/, '').trim();
  }

  const newRaw = `${newDialCode} ${numberWithoutDial}`;
  return asYouType(newRaw, newCountryIso);
}

/** Compute dropdown position purely from geometry */
export function computeDropdownPosition(
  wrapperRect: DOMRect,
  dropdownHeight: number,
  viewportHeight: number
): 'top' | 'bottom' {
  const spaceBelow = viewportHeight - wrapperRect.bottom;
  const spaceAbove = wrapperRect.top;

  if (spaceBelow >= dropdownHeight) return 'bottom';
  if (spaceAbove >= dropdownHeight) return 'top';
  return spaceBelow > spaceAbove ? 'bottom' : 'top';
}

/** Convert ISO2 to emoji flag (pure) */
export function isoToEmojiFlag(iso2: string): string {
  return (iso2 || '')
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/** Map control value according to config.valueMode (pure) */
export function mapValueForControl(
  valueMode: NonNullable<PhoneInputConfig['valueMode']>,
  phoneNumberValue: PhoneNumberValue | null,
  phoneValue: string
): any {
  const v = phoneNumberValue;
  const trimmed = (phoneValue || '').trim();

  // If we have input but no parsed value, return the raw input
  if (!v && trimmed) {
    return trimmed;
  }

  switch (valueMode) {
    case 'e164':
      return v?.e164 ?? (trimmed || '');
    case 'international':
      return v?.international ?? trimmed;
    case 'national':
      return v?.national ?? trimmed;
    case 'raw':
      return trimmed;
    case 'string':
      return v?.international ?? trimmed;
    case 'object':
    default:
      return v ?? (trimmed ? { raw: trimmed } : null);
  }
}

/** If number is valid and autoFormat is on, return formatted text; otherwise return original */
export function maybeFormatNumber(
  isValid: boolean,
  phoneValue: string,
  normalized: Required<PhoneInputConfig>,
  formatFn: (
    value: string,
    opts: { style: Required<PhoneInputConfig>['format'] },
    countryIso?: string
  ) => string,
  countryIso?: string
): string {
  if (!isValid || !normalized.autoFormat) return phoneValue;
  const iso = countryIso || normalized.defaultCountry || 'US';
  return formatFn(phoneValue, { style: normalized.format }, iso);
}

/** Given a detected Country and dialCodeCountryPreference, return preferred Country (or original) */
export function resolvePreferredCountryByDialCode(
  detected: Country | undefined | null,
  dialCodeCountryPreference: Record<string, string> | undefined,
  getByIso2: (iso2: string) => Country | undefined
): Country | undefined {
  if (!detected) return detected ?? undefined;
  if (!dialCodeCountryPreference) return detected;

  const dialCodeNumber = detected.dialCode.replace('+', '');
  const preferredIso = dialCodeCountryPreference[dialCodeNumber];
  if (!preferredIso) return detected;

  const preferred = getByIso2(preferredIso);
  return preferred ?? detected;
}

export type ExternalPhoneError = { type: string; message: string };

export interface ErrorKeyMap {
  typeKeys?: string[]; // e.g. ["type", "code"]
  messageKeys?: string[]; // e.g. ["message", "msg"]
}

const CAMEL_TO_SNAKE_UPPER = (s: string) =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();

/** Best-effort message lookup with multiple key variants */
function pickMessageForKey(
  primaryKey: string,
  fallbackKey: string,
  messages: Record<string, string>
): string | undefined {
  const candidates = [
    primaryKey, // exact (e.g. "duplicatePhone")
    fallbackKey, // outer error key if different
    primaryKey.toUpperCase(), // "DUPLICATEPHONE"
    fallbackKey.toUpperCase(), // "DUPLICATEPHONE"
    primaryKey.toLowerCase(), // "duplicatephone"
    fallbackKey.toLowerCase(), // "duplicatephone"
    CAMEL_TO_SNAKE_UPPER(primaryKey), // "DUPLICATE_PHONE"
  ];
  return candidates.map((k) => messages[k]).find(Boolean);
}

/**
 * Scans control.errors and returns the first error shaped like:
 *  - { anyKey: { type/message … } }  (dynamic prop names OK)
 *  - { anyKey: true }                (boolean-style)
 *  - Angular built-ins (required, minlength, maxlength, pattern)
 *
 * Looks up the message by **matching the key as-is first** (so "duplicatePhone"
 * matches errorMessages["duplicatePhone"]).
 */
export function pickDynamicPhoneError(
  errs: Record<string, any> | null | undefined,
  errorMessages: Record<string, string> = {},
  keyMap?: ErrorKeyMap
): ExternalPhoneError | null {
  if (!errs) return null;

  const typeKeys = keyMap?.typeKeys ?? ['type', 'code', 'name', 'kind'];
  const messageKeys = keyMap?.messageKeys ?? [
    'message',
    'msg',
    'text',
    'error',
  ];

  const getFirstKey = (obj: any, keys: string[]) =>
    keys.find((k) => obj && Object.prototype.hasOwnProperty.call(obj, k));

  for (const [outerKey, val] of Object.entries(errs)) {
    if (val === true) {
      // Look up message in errorMessages config
      const message =
        pickMessageForKey(outerKey, outerKey, errorMessages) ||
        `${outerKey} validation failed`;

      return { type: outerKey, message };
    }
  }

  for (const [outerKey, val] of Object.entries(errs)) {
    // 🔵 NEW: { key: "Your custom message" }
    if (typeof val === 'string') {
      return { type: outerKey, message: val };
    }

    // 🔵 NEW: { key: { key: "Your custom message" } }
    if (val && typeof val === 'object' && typeof val[outerKey] === 'string') {
      return { type: outerKey, message: String(val[outerKey]) };
    }

    // Existing: object with { type, message } (any key names)
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const tKey = getFirstKey(val, typeKeys);
      const mKey = getFirstKey(val, messageKeys);

      const typeRaw = (tKey ? String(val[tKey]) : outerKey) || outerKey;
      let message = mKey ? String(val[mKey]) : undefined;

      if (!message) {
        message = pickMessageForKey(typeRaw, outerKey, errorMessages);
      }
      return {
        type: typeRaw,
        message: message || 'Invalid phone number.',
      };
    }
  }
  if (errs['phoneInvalid']) {
    const phoneError = errs['phoneInvalid'];
    return {
      type: phoneError.type || 'phoneInvalid',
      message: phoneError.message || 'Invalid phone number',
    };
  }

  // Angular built-ins … (unchanged)
  if (errs['required']) {
    return {
      type: 'required',
      message:
        errorMessages['required'] ??
        errorMessages['REQUIRED'] ??
        'Phone number is required.',
    };
  }
  if (errs['minlength']) {
    const { requiredLength, actualLength } = errs['minlength'] || {};
    return {
      type: 'minlength',
      message:
        errorMessages['minlength'] ??
        errorMessages['MINLENGTH'] ??
        `Minimum length is ${requiredLength}, current is ${actualLength}.`,
    };
  }
  if (errs['maxlength']) {
    const { requiredLength, actualLength } = errs['maxlength'] || {};
    return {
      type: 'maxlength',
      message:
        errorMessages['maxlength'] ??
        errorMessages['MAXLENGTH'] ??
        `Maximum length is ${requiredLength}, current is ${actualLength}.`,
    };
  }
  if (errs['pattern']) {
    return {
      type: 'pattern',
      message:
        errorMessages['pattern'] ??
        errorMessages['PATTERN'] ??
        'Number format is invalid.',
    };
  }

  return null;
}
