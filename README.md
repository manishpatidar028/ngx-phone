# 📞 ngx-phone

A powerful, fully-featured **Angular international phone number input component** with automatic country detection, formatting, validation, and seamless support for both **Reactive & Template-Driven Forms**.

> 🔧 Built using `libphonenumber-js`, fully configurable, and ideal for global user forms.
---

## ✨ Features

- 🌍 International phone number input with auto-formatting
- 📱 Country selector with flags and dial codes
- 🧠 Smart validation (too short, too long, invalid, required)
- 🔁 Works with `FormControl`, `formControlName`, and `[(ngModel)]`
- 🧩 Drop-in support for standalone and NgModule-based apps
- 🔒 Lock country selection (optional)
- 🎯 Custom positioning, flags, styles, and placeholder
- 🧪 Full support for custom error visibility (focus, blur, live, etc.)
- 🧼 Public API methods to control from parent
- 🛠️ Built-in formatting using `AsYouType` from `libphonenumber-js`

---

## 📦 Installation

```bash
npm install ngx-phone libphonenumber-js world-countries
```

---

## 🚀 Getting Started

### ✅ Standalone Component Import

```typescript
import { NgxPhoneComponent } from 'ngx-phone';

@Component({
  standalone: true,
  imports: [NgxPhoneComponent],
})
export class YourComponent {}
```

### ✅ NgModule Import

```typescript
import { NgModule } from '@angular/core';
import { NgxPhoneComponent } from 'ngx-phone';

@NgModule({
  imports: [NgxPhoneComponent],
})
export class YourModule {}
```

---

## 🧩 Usage Examples

### 🧪 Template-Driven Form

```html
<form #f="ngForm">
  <ngx-phone
    name="phone"
    [(ngModel)]="phone"
    [defaultCountry]="'IN'"
    required
    [showCountryCodeInInput]="true"
    (countryChange)="onCountryChange($event)"
    (numberChange)="onNumberChange($event)"
    (validationChange)="onValidationChange($event)"
  ></ngx-phone>
</form>
```

### 🧬 Reactive Form

```typescript
form = this.fb.group({
  phone: ['', Validators.required]
});
```

```html
<form [formGroup]="form">
  <ngx-phone
    formControlName="phone"
    [formControls]="form.get('phone')"
    [defaultCountry]="'US'"
    [showCountryCodeInInput]="true"
    (numberChange)="onNumberChange($event)"
    (validationChange)="onValidationChange($event)"
  ></ngx-phone>
</form>
```

---

## ⚙️ Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultCountry` | `string` | `'US'` | Initial country ISO2 code |
| `preferredCountries` | `string[]` | `[]` | Countries pinned to top |
| `onlyCountries` | `string[]` | `[]` | Limit selectable countries |
| `excludeCountries` | `string[]` | `[]` | Exclude countries |
| `fallbackCountry` | `string` | `'US'` | Fallback country |
| `dialCodeCountryPreference` | `{ [dialCode: string]: string }` | `{}` | Map dial code to preferred ISO2 |
| `separateCountrySelector` | `boolean` | `false` | Show selector separate from input |
| `countrySelectPosition` | `'before' \| 'after'` | `'before'` | Position of country selector |
| `showFlags` | `boolean` | `true` | Show country flags |
| `showDialCode` | `boolean` | `true` | Show country dial code |
| `showCountryCodeInInput` | `boolean` | `false` | Show country code in input |
| `lockCountrySelection` | `boolean` | `false` | Prevent changing country |
| `clearInputOnCountryChange` | `boolean` | `true` | Clear input on country change |
| `readonly` | `boolean` | `false` | Make input read-only |
| `disabled` | `boolean` | `false` | Disable the input |
| `placeholder` | `string` | `'Enter phone number'` | Input placeholder |
| `searchPlaceholder` | `string` | `'Search...'` | Search box placeholder |
| `noResultsText` | `string` | `'No results found'` | Text when search returns nothing |
| `searchEnabled` | `boolean` | `true` | Enable search |
| `dropdownContainer` | `'body' \| 'parent'` | `'body'` | Container for dropdown |
| `dropdownWidth` | `string` | `'300px'` | Width of dropdown |
| `dropdownMaxHeight` | `string` | `'300px'` | Max height of dropdown |
| `format` | `'INTERNATIONAL' \| 'NATIONAL' \| 'E164'` | `'INTERNATIONAL'` | Output format |
| `autoFormat` | `boolean` | `true` | Enable smart formatting |
| `validateOnChange` | `boolean` | `true` | Validate while typing |
| `validateOnBlur` | `boolean` | `true` | Validate on blur |
| `autoDetectCountry` | `boolean` | `false` | Detect from browser locale |
| `closeOnSelect` | `boolean` | `true` | Close dropdown on selection |
| `formControls` | `AbstractControl` | `null` | Pass FormControl manually for reactive support |
| `showErrorsOn` | `'touched' \| 'dirty' \| 'blur' \| 'live'` | `'touched'` | When to show validation errors |

---

## 📤 Output Events

| Output | Type | Description |
|--------|------|-------------|
| `countryChange` | `Country` | Emits selected country |
| `numberChange` | `PhoneNumberValue \| null` | Emits parsed phone number |
| `validationChange` | `ValidationResult` | Emits result with error if any |
| `focus` | `void` | On input focus |
| `blur` | `void` | On input blur |
| `enter` | `void` | On enter key press |

---


## 🌍 Country Codes Reference

Use these ISO2 codes for `onlyCountries`, `excludeCountries`, `defaultCountry`, and `fallbackCountry` configurations:

| Country              | ISO2 Code |
| -------------------- | --------- |
| Afghanistan          | AF        |
| Albania              | AL        |
| Algeria              | DZ        |
| Andorra              | AD        |
| Angola               | AO        |
| Argentina            | AR        |
| Armenia              | AM        |
| Australia            | AU        |
| Austria              | AT        |
| Azerbaijan           | AZ        |
| Bahrain              | BH        |
| Bangladesh           | BD        |
| Belarus              | BY        |
| Belgium              | BE        |
| Belize               | BZ        |
| Benin                | BJ        |
| Bhutan               | BT        |
| Bolivia              | BO        |
| Bosnia & Herzegovina | BA        |
| Botswana             | BW        |
| Brazil               | BR        |
| Brunei               | BN        |
| Bulgaria             | BG        |
| Burkina Faso         | BF        |
| Burundi              | BI        |
| Cambodia             | KH        |
| Cameroon             | CM        |
| Canada               | CA        |
| Cape Verde           | CV        |
| Chad                 | TD        |
| Chile                | CL        |
| China                | CN        |
| Colombia             | CO        |
| Comoros              | KM        |
| Congo (DRC)          | CD        |
| Costa Rica           | CR        |
| Croatia              | HR        |
| Cuba                 | CU        |
| Cyprus               | CY        |
| Czech Republic       | CZ        |
| Denmark              | DK        |
| Djibouti             | DJ        |
| Dominica             | DM        |
| Dominican Republic   | DO        |
| Ecuador              | EC        |
| Egypt                | EG        |
| El Salvador          | SV        |
| Estonia              | EE        |
| Ethiopia             | ET        |
| Fiji                 | FJ        |
| Finland              | FI        |
| France               | FR        |
| Gabon                | GA        |
| Gambia               | GM        |
| Georgia              | GE        |
| Germany              | DE        |
| Ghana                | GH        |
| Greece               | GR        |
| Guatemala            | GT        |
| Guinea               | GN        |
| Guyana               | GY        |
| Haiti                | HT        |
| Honduras             | HN        |
| Hong Kong            | HK        |
| Hungary              | HU        |
| Iceland              | IS        |
| India                | IN        |
| Indonesia            | ID        |
| Iran                 | IR        |
| Iraq                 | IQ        |
| Ireland              | IE        |
| Israel               | IL        |
| Italy                | IT        |
| Jamaica              | JM        |
| Japan                | JP        |
| Jordan               | JO        |
| Kazakhstan           | KZ        |
| Kenya                | KE        |
| Korea (North)        | KP        |
| Korea (South)        | KR        |
| Kuwait               | KW        |
| Kyrgyzstan           | KG        |
| Laos                 | LA        |
| Latvia               | LV        |
| Lebanon              | LB        |
| Lesotho              | LS        |
| Liberia              | LR        |
| Libya                | LY        |
| Liechtenstein        | LI        |
| Lithuania            | LT        |
| Luxembourg           | LU        |
| Madagascar           | MG        |
| Malawi               | MW        |
| Malaysia             | MY        |
| Maldives             | MV        |
| Mali                 | ML        |
| Malta                | MT        |
| Mauritania           | MR        |
| Mauritius            | MU        |
| Mexico               | MX        |
| Moldova              | MD        |
| Monaco               | MC        |
| Mongolia             | MN        |
| Montenegro           | ME        |
| Morocco              | MA        |
| Mozambique           | MZ        |
| Myanmar              | MM        |
| Namibia              | NA        |
| Nepal                | NP        |
| Netherlands          | NL        |
| New Zealand          | NZ        |
| Nicaragua            | NI        |
| Niger                | NE        |
| Nigeria              | NG        |
| North Macedonia      | MK        |
| Norway               | NO        |
| Oman                 | OM        |
| Pakistan             | PK        |
| Palestine            | PS        |
| Panama               | PA        |
| Papua New Guinea     | PG        |
| Paraguay             | PY        |
| Peru                 | PE        |
| Philippines          | PH        |
| Poland               | PL        |
| Portugal             | PT        |
| Qatar                | QA        |
| Romania              | RO        |
| Russia               | RU        |
| Rwanda               | RW        |
| Saudi Arabia         | SA        |
| Senegal              | SN        |
| Serbia               | RS        |
| Seychelles           | SC        |
| Singapore            | SG        |
| Slovakia             | SK        |
| Slovenia             | SI        |
| Somalia              | SO        |
| South Africa         | ZA        |
| Spain                | ES        |
| Sri Lanka            | LK        |
| Sudan                | SD        |
| Suriname             | SR        |
| Sweden               | SE        |
| Switzerland          | CH        |
| Syria                | SY        |
| Taiwan               | TW        |
| Tajikistan           | TJ        |
| Tanzania             | TZ        |
| Thailand             | TH        |
| Togo                 | TG        |
| Trinidad & Tobago    | TT        |
| Tunisia              | TN        |
| Turkey               | TR        |
| Turkmenistan         | TM        |
| Uganda               | UG        |
| Ukraine              | UA        |
| United Arab Emirates | AE        |
| United Kingdom       | GB        |
| United States        | US        |
| Uruguay              | UY        |
| Uzbekistan           | UZ        |
| Venezuela            | VE        |
| Vietnam              | VN        |
| Yemen                | YE        |
| Zambia               | ZM        |
| Zimbabwe             | ZW        |

### Example Usage with Country Codes

```html
<!-- Only allow specific countries -->
<ngx-phone
  [onlyCountries]="['US', 'CA', 'GB', 'AU']"
  [defaultCountry]="'US'"
></ngx-phone>

<!-- Exclude certain countries -->
<ngx-phone
  [excludeCountries]="['KP', 'IR', 'SY']"
  [defaultCountry]="'US'"
></ngx-phone>

<!-- Preferred countries (pinned to top) -->
<ngx-phone
  [preferredCountries]="['US', 'GB', 'CA', 'AU', 'DE', 'FR']"
  [defaultCountry]="'US'"
></ngx-phone>
```

---

## 📦 PhoneNumberValue Model

```typescript
interface PhoneNumberValue {
  countryCode?: string;
  dialCode?: string;
  e164?: string;
  formatted?: string;
  national?: string;
  international?: string;
  rfc3966?: string;
  isValid?: boolean;
  isPossible?: boolean;
  type?: string;
  country?: Country;
  raw?: string;
}
```

---

## ❌ ValidationResult / Errors

```typescript
interface ValidationResult {
  isValid: boolean;
  isPossible: boolean;
  error?: {
    type: 'REQUIRED' | 'INVALID' | 'TOO_SHORT' | 'TOO_LONG' | 'INVALID_COUNTRY';
    message: string;
  };
}
```

---

## 💡 Public Methods

Available via `@ViewChild(NgxPhoneComponent)`:

| Method | Description |
|--------|-------------|
| `getValue()` | Returns `PhoneNumberValue` |
| `clear()` | Clears input |
| `setCountry(code: string)` | Manually select country |
| `formatNumber(style?)` | Returns formatted number |

### Example Usage

```typescript
@ViewChild(NgxPhoneComponent) phoneComponent!: NgxPhoneComponent;

someMethod() {
  // Get current value
  const phoneValue = this.phoneComponent.getValue();
  
  // Clear the input
  this.phoneComponent.clear();
  
  // Set country programmatically
  this.phoneComponent.setCountry('GB');
  
  // Get formatted number
  const formatted = this.phoneComponent.formatNumber('INTERNATIONAL');
}
```

---

## 🧪 Advanced Configuration

### Auto-focus search input in dropdown
- The search input in the country dropdown automatically receives focus when opened

### Auto-detect from browser locale
- Use `navigator.language` to automatically detect user's country

### Dial code preference override
- Use `dialCodeCountryPreference` to map dial codes to preferred countries

### Performance optimizations
- Flags and dropdown use emoji-based rendering for better performance
- Fully accessible with `aria-*` attributes

---

## 🙌 Maintainer

**Manish Patidar**  
🔗 [@manishpatidar028](https://github.com/manishpatidar028)

---

## 📄 License

MIT — Free for personal & commercial use

---

## 🌟 Like this?

If you find this package useful, please consider giving it a ⭐ on [GitHub](https://github.com/manishpatidar028/ngx-phone)!