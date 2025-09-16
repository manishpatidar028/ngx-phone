import { Injectable } from '@angular/core';
import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  isPossiblePhoneNumber,
  validatePhoneNumberLength,
  ParseError,
  PhoneNumber,
  CountryCode,
  AsYouType,
  getCountryCallingCode,
  getExampleNumber,
  isSupportedCountry
} from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/examples.mobile.json';

import { 
  PhoneNumberValue, 
  ValidationResult, 
  ValidationError,
  FormatOptions,
  Country 
} from '../models/phone-number.model';
import { CountryService } from './country.service';

@Injectable({
  providedIn: 'root'
})
export class PhoneValidationService {
  
  constructor(private countryService: CountryService) {}

  /**
   * Parse phone number string
   */
  parsePhoneNumber(
    phoneNumber: string,
    countryCode?: string
  ): PhoneNumberValue | null {
    if (!phoneNumber) {
      return null;
    }

    try {
      const parsed = countryCode
        ? parsePhoneNumberFromString(phoneNumber, countryCode as CountryCode)
        : parsePhoneNumberFromString(phoneNumber);

      if (!parsed) {
        return {
          raw: phoneNumber,
          isValid: false,
          isPossible: false
        };
      }

      const country = this.countryService.getCountryByIso2(parsed.country || '');

      return {
        countryCode: parsed.country as CountryCode,
        dialCode: '+' + parsed.countryCallingCode,
        e164: parsed.format('E.164'),
        formatted: parsed.formatInternational(),
        national: parsed.formatNational(),
        international: parsed.formatInternational(),
        rfc3966: parsed.format('RFC3966'),
        isValid: parsed.isValid(),
        isPossible: parsed.isPossible(),
        type: parsed.getType(),
        country: country,
        raw: phoneNumber
      };
    } catch (error) {
      return {
        raw: phoneNumber,
        isValid: false,
        isPossible: false
      };
    }
  }

  /**
   * Validate phone number
   */
  validate(
    phoneNumber: string,
    countryCode?: string
  ): ValidationResult {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return {
        isValid: false,
        error: {
          type: 'REQUIRED',
          message: 'Phone number is required'
        }
      };
    }

    try {
      // Check if valid
      const isValid = countryCode
        ? isValidPhoneNumber(phoneNumber, countryCode as CountryCode)
        : isValidPhoneNumber(phoneNumber);

      // Check if possible
      const isPossible = countryCode
        ? isPossiblePhoneNumber(phoneNumber, countryCode as CountryCode)
        : isPossiblePhoneNumber(phoneNumber);

      // Get validation details
      if (!isValid) {
        const lengthValidation = countryCode
          ? validatePhoneNumberLength(phoneNumber, countryCode as CountryCode)
          : validatePhoneNumberLength(phoneNumber);

        let errorType: ValidationError['type'] = 'INVALID';
        let errorMessage = 'Invalid phone number';

        switch (lengthValidation) {
          case 'TOO_SHORT':
            errorType = 'TOO_SHORT';
            errorMessage = 'Phone number is too short';
            break;
          case 'TOO_LONG':
            errorType = 'TOO_LONG';
            errorMessage = 'Phone number is too long';
            break;
          case 'INVALID_COUNTRY':
            errorType = 'INVALID_COUNTRY';
            errorMessage = 'Invalid country code';
            break;
          case 'NOT_A_NUMBER':
            errorType = 'NOT_A_NUMBER';
            errorMessage = 'Not a valid phone number';
            break;
        }

        return {
          isValid: false,
          isPossible: isPossible,
          error: {
            type: errorType,
            message: errorMessage
          }
        };
      }

      // Parse to get type
      const parsed = countryCode
        ? parsePhoneNumberFromString(phoneNumber, countryCode as CountryCode)
        : parsePhoneNumberFromString(phoneNumber);

      return {
        isValid: true,
        isPossible: true,
        type: parsed?.getType()
      };
    } catch (error) {
      return {
        isValid: false,
        isPossible: false,
        error: {
          type: 'INVALID',
          message: 'Unable to validate phone number'
        }
      };
    }
  }

  /**
   * Format phone number as you type
   */
  formatAsYouType(
    phoneNumber: string,
    countryCode?: string
  ): string {
    try {
      const formatter = new AsYouType(countryCode as CountryCode);
      return formatter.input(phoneNumber);
    } catch {
      return phoneNumber;
    }
  }

  /**
   * Format phone number with options
   */
  format(
    phoneNumber: string,
    options?: FormatOptions,
    countryCode?: string
  ): string {
    try {
      const parsed = countryCode
        ? parsePhoneNumberFromString(phoneNumber, countryCode as CountryCode)
        : parsePhoneNumberFromString(phoneNumber);

      if (!parsed) {
        return phoneNumber;
      }

      const style = options?.style || 'INTERNATIONAL';
      
      let formatted: string;
      switch (style) {
        case 'NATIONAL':
          formatted = parsed.formatNational();
          break;
        case 'E164':
          formatted = parsed.format('E.164');
          break;
        case 'RFC3966':
          formatted = parsed.format('RFC3966');
          break;
        case 'INTERNATIONAL':
        default:
          formatted = parsed.formatInternational();
          break;
      }

      // Apply additional formatting options
      if (options?.removeDialCode && style !== 'E164') {
        const dialCode = '+' + parsed.countryCallingCode;
        formatted = formatted.replace(dialCode, '').trim();
      }

      if (options?.addSpaceAfterDialCode && style === 'INTERNATIONAL') {
        const dialCode = '+' + parsed.countryCallingCode;
        if (!formatted.includes(dialCode + ' ')) {
          formatted = formatted.replace(dialCode, dialCode + ' ');
        }
      }

      return formatted;
    } catch {
      return phoneNumber;
    }
  }

  /**
   * Check if phone number is valid
   */
  isValid(phoneNumber: string, countryCode?: string): boolean {
    try {
      return countryCode
        ? isValidPhoneNumber(phoneNumber, countryCode as CountryCode)
        : isValidPhoneNumber(phoneNumber);
    } catch {
      return false;
    }
  }

  /**
   * Check if phone number is possible
   */
  isPossible(phoneNumber: string, countryCode?: string): boolean {
    try {
      return countryCode
        ? isPossiblePhoneNumber(phoneNumber, countryCode as CountryCode)
        : isPossiblePhoneNumber(phoneNumber);
    } catch {
      return false;
    }
  }

  /**
   * Get example number for country
   */
  getExampleNumber(countryCode: string, type: 'MOBILE' | 'FIXED_LINE' = 'MOBILE'): string {
    try {
      if (!isSupportedCountry(countryCode as CountryCode)) {
        return '';
      }
      
      const example = getExampleNumber(countryCode as CountryCode, examples);
      return example ? example.formatInternational() : '';
    } catch {
      return '';
    }
  }

  /**
   * Get country calling code
   */
  getCountryCallingCode(countryCode: string): string {
    try {
      if (!isSupportedCountry(countryCode as CountryCode)) {
        return '';
      }
      return '+' + getCountryCallingCode(countryCode as CountryCode);
    } catch {
      return '';
    }
  }

  /**
   * Extract country from phone number
   */
  extractCountry(phoneNumber: string): Country | undefined {
    try {
      const parsed = parsePhoneNumberFromString(phoneNumber);
      if (parsed && parsed.country) {
        return this.countryService.getCountryByIso2(parsed.country);
      }
    } catch {
      // Try manual detection
    }
    
    return this.countryService.detectCountryFromNumber(phoneNumber);
  }

  /**
   * Compare two phone numbers
   */
  isSameNumber(number1: string, number2: string): boolean {
    try {
      const parsed1 = parsePhoneNumberFromString(number1);
      const parsed2 = parsePhoneNumberFromString(number2);

      if (parsed1 && parsed2) {
        return parsed1.format('E.164') === parsed2.format('E.164');
      }
    } catch {
      // Fallback to simple comparison
    }

    // Simple comparison
    const clean1 = number1.replace(/\D/g, '');
    const clean2 = number2.replace(/\D/g, '');
    return clean1 === clean2;
  }

  /**
   * Get formatted placeholder for country
   */
  getPlaceholder(countryCode: string): string {
    const example = this.getExampleNumber(countryCode);
    if (example) {
      // Replace digits with placeholder character
      return example.replace(/\d/g, '•');
    }
    return 'Enter phone number';
  }

  /**
   * Split phone number into parts
   */
  splitPhoneNumber(phoneNumber: string): {
    dialCode?: string;
    areaCode?: string;
    localNumber?: string;
  } {
    try {
      const parsed = parsePhoneNumberFromString(phoneNumber);
      if (!parsed) {
        return { localNumber: phoneNumber };
      }

      const dialCode = '+' + parsed.countryCallingCode;
      const national = parsed.nationalNumber.toString();
      
      // Try to extract area code (simplified logic)
      let areaCode = '';
      let localNumber = national;
      
      if (parsed.country === 'US' || parsed.country === 'CA') {
        // North American format
        if (national.length >= 10) {
          areaCode = national.substring(0, 3);
          localNumber = national.substring(3);
        }
      }

      return {
        dialCode,
        areaCode,
        localNumber
      };
    } catch {
      return { localNumber: phoneNumber };
    }
  }

  /**
   * Get AsYouType formatter instance
   */
  getFormatter(countryCode?: string): AsYouType {
    return new AsYouType(countryCode as CountryCode);
  }
}