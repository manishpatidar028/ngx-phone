import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import countries from 'world-countries';
import { getCountryCallingCode, getExampleNumber, CountryCode } from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/examples.mobile.json';
import { Country } from '../models/phone-number.model';

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private countries: Country[] = [];
  private selectedCountry$ = new BehaviorSubject<Country | null>(null);
  
  constructor() {
    this.initializeCountries();
  }

  /**
   * Initialize countries from world-countries data
   */
private initializeCountries(): void {
  const worldCountries = countries; // ✅ FIXED

  this.countries = worldCountries
    .map(country => {
      const iso2 = country.cca2;
      let dialCode = '';

      try {
        dialCode = '+' + getCountryCallingCode(iso2 as CountryCode);
      } catch {
        if (country.idd && country.idd.root) {
          dialCode = country.idd.root;
          if (country.idd.suffixes && country.idd.suffixes[0]) {
            dialCode += country.idd.suffixes[0];
          }
        }
      }

      if (!dialCode) return null;

      return {
        name: country.name.common,
        nativeName: country.name.native ? 
          Object.values(country.name.native)[0]?.common : 
          country.name.common,
        iso2: iso2,
        iso3: country.cca3,
        dialCode: dialCode,
        flag: country.flag || this.getFlagEmoji(iso2),
        emoji: country.flag,
        flagUrl: `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`,
        format: this.getPhoneFormat(iso2),
        priority: this.getCountryPriority(iso2),
        areaCodes: this.getAreaCodes(iso2)
      } as Country;
    })
    .filter((country): country is Country => country !== null)
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return (a.priority || 999) - (b.priority || 999);
      }
      return a.name.localeCompare(b.name);
    });
}


  /**
   * Get flag emoji for country
   */
  private getFlagEmoji(iso2: string): string {
    const codePoints = iso2
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  /**
   * Get phone format for country
   */
  private getPhoneFormat(iso2: string): string {
    try {
      const example = getExampleNumber(iso2 as CountryCode, examples);
      if (example) {
        // Convert example to format pattern
        const formatted = example.formatInternational();
        return formatted.replace(/\d/g, 'x');
      }
    } catch {
      // Fallback formats for common countries
      const formats: { [key: string]: string } = {
        'US': '(xxx) xxx-xxxx',
        'GB': 'xxxx xxxxxx',
        'CA': '(xxx) xxx-xxxx',
        'AU': 'xxx xxx xxx',
        'IN': 'xxxxx xxxxx',
        'DE': 'xxxx xxxxxxx',
        'FR': 'x xx xx xx xx',
        'IT': 'xxx xxx xxxx',
        'ES': 'xxx xx xx xx',
        'BR': '(xx) xxxxx-xxxx',
        'MX': 'xxx xxx xxxx',
        'JP': 'xx-xxxx-xxxx',
        'CN': 'xxx xxxx xxxx',
        'RU': 'xxx xxx-xx-xx',
        'KR': 'xx-xxxx-xxxx'
      };
      return formats[iso2] || 'xxxx xxxxx';
    }
    return 'xxxx xxxxx';
  }

  /**
   * Get country priority for sorting
   */
  private getCountryPriority(iso2: string): number {
    const priorities: { [key: string]: number } = {
      'US': 0,
      'GB': 1,
      'CA': 2,
      'AU': 3,
      'IN': 4,
      'DE': 5,
      'FR': 6,
      'IT': 7,
      'ES': 8,
      'BR': 9,
      'MX': 10,
      'JP': 11,
      'CN': 12,
      'RU': 13,
      'KR': 14
    };
    return priorities[iso2] || 999;
  }

  /**
   * Get area codes for countries with multiple regions
   */
  private getAreaCodes(iso2: string): string[] | undefined {
    const areaCodes: { [key: string]: string[] } = {
      'CA': ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '672', '705', '709', '742', '778', '780', '782', '807', '819', '825', '867', '873', '902', '905'],
      'US': [], // US has too many area codes to list
      'RU': ['495', '499', '812', '343', '351', '347', '861', '862', '863', '383', '381', '385', '387', '863', '866', '867', '869', '844', '845', '846', '847', '841', '842', '843']
    };
    return areaCodes[iso2];
  }

  /**
   * Get all countries
   */
  getAllCountries(): Country[] {
    return [...this.countries];
  }

  /**
   * Get country by ISO2 code
   */
  getCountryByIso2(iso2: string): Country | undefined {
    return this.countries.find(c => c.iso2.toLowerCase() === iso2.toLowerCase());
  }

  /**
   * Get country by dial code
   */
  getCountryByDialCode(dialCode: string): Country | undefined {
    const clean = dialCode.replace(/\D/g, '');
    return this.countries.find(c => c.dialCode.replace(/\D/g, '') === clean);
  }

  /**
   * Get countries by dial code (for countries sharing codes)
   */
  getCountriesByDialCode(dialCode: string): Country[] {
    const clean = dialCode.replace(/\D/g, '');
    return this.countries.filter(c => c.dialCode.replace(/\D/g, '') === clean);
  }

  /**
   * Search countries
   */
  searchCountries(query: string, searchBy: string[] = ['name', 'dialCode', 'iso2']): Country[] {
    const lowerQuery = query.toLowerCase();
    
    return this.countries.filter(country => {
      if (searchBy.includes('name') && country.name.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      if (searchBy.includes('dialCode') && country.dialCode.includes(query)) {
        return true;
      }
      if (searchBy.includes('iso2') && country.iso2.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      if (searchBy.includes('iso3') && country.iso3?.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      return false;
    });
  }

  /**
   * Get preferred countries
   */
  getPreferredCountries(codes: string[]): Country[] {
    return codes
      .map(code => this.getCountryByIso2(code))
      .filter((c): c is Country => c !== undefined);
  }

  /**
   * Filter countries
   */
  filterCountries(
    onlyCountries?: string[],
    excludeCountries?: string[]
  ): Country[] {
    let filtered = [...this.countries];

    if (onlyCountries && onlyCountries.length > 0) {
      const only = new Set(onlyCountries.map(c => c.toUpperCase()));
      filtered = filtered.filter(c => only.has(c.iso2.toUpperCase()));
    }

    if (excludeCountries && excludeCountries.length > 0) {
      const exclude = new Set(excludeCountries.map(c => c.toUpperCase()));
      filtered = filtered.filter(c => !exclude.has(c.iso2.toUpperCase()));
    }

    return filtered;
  }

  /**
   * Set selected country
   */
  setSelectedCountry(country: Country | null): void {
    this.selectedCountry$.next(country);
  }

  /**
   * Get selected country observable
   */
  getSelectedCountry(): Observable<Country | null> {
    return this.selectedCountry$.asObservable();
  }

  /**
   * Detect country from phone number
   */
  detectCountryFromNumber(phoneNumber: string): Country | undefined {
    // Remove all non-digits except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    if (!cleaned) return undefined;

    // Check if starts with +
    if (cleaned.startsWith('+')) {
      // Try to match country codes from longest to shortest
      for (let len = 4; len >= 1; len--) {
        if (cleaned.length > len) {
          const possibleCode = cleaned.substring(0, len + 1); // +1 for the + sign
          const country = this.getCountryByDialCode(possibleCode);
          if (country) {
            return country;
          }
        }
      }
    } else if (cleaned.length >= 2) {
      // Default to US if no country code
      return this.getCountryByIso2('US');
    }

    return undefined;
  }

  /**
   * Get example number for country
   */
  getExampleNumber(iso2: string): string {
    try {
      const example = getExampleNumber(iso2 as CountryCode, examples);
      return example ? example.formatInternational() : '';
    } catch {
      return '';
    }
  }
}