# 📞 ngx-phone

A powerful, fully-featured **Angular international phone number input component** with automatic country detection, formatting, validation, and seamless support for both **Reactive & Template-Driven Forms**.

> 🔧 Built using `libphonenumber-js` — fully configurable, accessible, and ideal for global forms.

---

## ✨ Features

- 🌍 International input with emoji flags and dial codes
- 📥 Reactive & Template-Driven Forms support
- ✅ Smart validation (too short, invalid, required, etc.)
- 🔢 Auto-format on valid entry or on blur
- 🏁 Country selector with:
  - Inline or separate button
  - Lockable selection
  - Preferred, only, or excluded countries
- 🔁 Works with `FormControl`, `formControlName`, and `[(ngModel)]`
- 🎯 Fine-grained validation error display control (blur, focus, live, etc.)
- 🧼 Auto-infers country code from number input (with override support)
- 🛠️ Built-in formatting using `AsYouType` & `parsePhoneNumber`
- 🧪 Fully standalone (Angular 14+) or usable via NgModules

---

## 📦 Installation

```bash
npm install ngx-phone libphonenumber-js world-countries
```

---

## 🚀 Getting Started

### ✅ Standalone Component

```typescript
import { NgxPhoneModule } from 'ngx-phone';

@Component({
  standalone: true,
  imports: [NgxPhoneModule],
})
export class YourComponent {}
```

### ✅ NgModule

```typescript
import { NgModule } from '@angular/core';
import { NgxPhoneModule } from 'ngx-phone';

@NgModule({
  imports: [NgxPhoneModule],
})
export class YourModule {}
```

---

## 🧩 Usage Examples

### 🧪 Template-Driven Form

```html
<form #form="ngForm">
  <ngx-phone
    name="phone"
    [(ngModel)]="phone"
    required
    [config]="{
      defaultCountry: 'IN',
      showCountryCodeInInput: true,
      autoFormat: true,
      errorMessages: {
        REQUIRED: 'Phone is required.',
        INVALID: 'Invalid number.'
      }
    }"
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
    [config]="{
      defaultCountry: 'US',
      showCountryCodeInInput: true,
      autoFormat: false
    }"
    (numberChange)="onNumberChange($event)"
    (validationChange)="onValidationChange($event)"
  ></ngx-phone>
</form>
```

---

## ⚙️ Configuration (`[config]` Input)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultCountry` | `string` | `'US'` | Initial country ISO2 code |
| `preferredCountries` | `string[]` | `[]` | Countries pinned to top |
| `onlyCountries` | `string[]` | `[]` | Limit selectable countries |
| `excludeCountries` | `string[]` | `[]` | Exclude countries |
| `fallbackCountry` | `string` | `'US'` | Fallback when detection fails |
| `dialCodeCountryPreference` | `{ [dialCode: string]: string }` | `{}` | Force map dial code to ISO2 |
| `autoDetectCountry` | `boolean` | `false` | Use browser locale to detect country |
| `lockCountrySelection` | `boolean` | `false` | Prevent user from changing country |
| `separateCountrySelector` | `boolean` | `false` | Show selector as separate button |
| `countrySelectPosition` | `'before' \| 'after'` | `'before'` | Position of country selector |
| `showFlags` | `boolean` | `true` | Show emoji flags |
| `showDialCode` | `boolean` | `true` | Show dial code next to flag |
| `showCountryCodeInInput` | `boolean` | `false` | Prepend country code in input |
| `clearInputOnCountryChange` | `boolean` | `true` | Clear input when country changes |
| `readonly` | `boolean` | `false` | Make input read-only |
| `disabled` | `boolean` | `false` | Disable the input |
| `placeholder` | `string` | `'Enter phone number'` | Input placeholder |
| `searchPlaceholder` | `string` | `'Search...'` | Search input placeholder |
| `noResultsText` | `string` | `'No results found'` | Fallback text |
| `searchEnabled` | `boolean` | `true` | Show search box in dropdown |
| `dropdownContainer` | `'body' \| 'parent'` | `'body'` | Append dropdown to |
| `dropdownWidth` | `string` | `'300px'` | Width of country list |
| `dropdownMaxHeight` | `string` | `'300px'` | Max height of list |
| `format` | `'INTERNATIONAL' \| 'NATIONAL' \| 'E164' \| 'RFC3966'` | `'INTERNATIONAL'` | Output format |
| `autoFormat` | `boolean` | `true` | Auto format once valid |
| `validateOnChange` | `boolean` | `true` | Validate on typing |
| `validateOnBlur` | `boolean` | `true` | Validate on blur |
| `strictValidation` | `boolean` | `false` | Require both valid & possible |
| `showErrorsOn` | `'touched' \| 'dirty' \| 'focus' \| 'blur' \| 'always' \| 'live'` | `'dirty'` | When to show errors |
| `showErrorMessages` | `boolean` | `true` | Show error text automatically |
| `showInvalidBorder` | `boolean` | `true` | Show red border on error |
| `errorMessages` | `Partial<Record<PhoneErrorType, string>>` | `{}` | Override default error messages |
| `customPlaceholder` | `(country: Country) => string` | `–` | Custom placeholder per country |
| `customFormat` | `(value: string, country: Country) => string` | `–` | Custom format function |

---

## 📤 Output Events

| Output | Type | Description |
|--------|------|-------------|
| `numberChange` | `PhoneNumberValue \| null` | Emits parsed number |
| `countryChange` | `Country` | Emits selected country |
| `validationChange` | `ValidationResult` | Emits current validation result |
| `focus` | `void` | On input focus |
| `blur` | `void` | On input blur |
| `enter` | `void` | On Enter key press |

---

## 📦 Model: PhoneNumberValue

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

## ❌ Model: ValidationResult

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

## 💡 Public Methods (via `@ViewChild()`)

| Method | Description |
|--------|-------------|
| `getValue()` | Returns parsed `PhoneNumberValue` |
| `clear()` | Clears the input and resets state |
| `setCountry(code: string)` | Programmatically select country |
| `formatNumber(style?)` | Format number in specific style |

### Example Usage

```typescript
import { NgxPhoneComponent } from 'ngx-phone';

@ViewChild(NgxPhoneComponent) phone!: NgxPhoneComponent;

submit() {
  const value = this.phone.getValue();
  console.log(value);
}
```

---

## 🌍 Country Codes

Use ISO2 codes for:
- `defaultCountry`
- `onlyCountries`
- `preferredCountries`
- `excludeCountries`

Full list available at: [ISO 3166-1 alpha-2 codes](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)

---

## ⚙️ Dial Code Preference (Advanced)

You can map dial codes to a preferred country if multiple countries share the same code:

```typescript
[config]="{
  dialCodeCountryPreference: {
    '1': 'US', // Prefer US over Canada for +1
    '44': 'GB'
  }
}"
```

---

## 🎯 Validation Modes

| Mode | Description |
|------|-------------|
| `'touched'` | Show after field is touched |
| `'dirty'` | Show after field is modified |
| `'blur'` | Show on blur |
| `'focus'` | Show on focus |
| `'live'` | Show always while typing |
| `'always'` | Always show if invalid |

---

## 🔧 Custom Validators

By default, `ngx-phone` validates numbers using `libphonenumber-js`. If you need **project-specific validation rules** (e.g., disallowing numbers that start with a certain digit, blocking duplicates, or enforcing custom patterns), you can provide **custom validators**.

### Define a Custom Validator

A custom validator is just a function that implements the `PhoneCustomValidator` type:

```typescript
import { PhoneCustomValidator } from 'ngx-phone';

// Example: disallow numbers starting with 0
export const noStartWithZeroValidator: PhoneCustomValidator = (value) => {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return {
      type: 'STARTS_WITH_ZERO', // custom error code
      message: 'Phone number cannot start with 0', // custom error message
    };
  }
  return null; // ✅ valid
};
```

### Apply Custom Validators

Pass one or more validators to the `ngx-phone` component via the `customValidators` input:

```html
<ngx-phone
  formControlName="phoneReactive"
  [formControls]="phoneReactiveControl"
  [customValidators]="[noStartWithZeroValidator]"
  [config]="{
    defaultCountry: 'US',
    errorMessages: { INVALID: 'Check the number again!' }
  }"
></ngx-phone>
```

### Validation Result

When a custom validator fails, its error object is merged into the component's `validationResult`:

```typescript
{
  "isValid": false,
  "isPossible": true,
  "error": {
    "type": "STARTS_WITH_ZERO",
    "message": "Phone number cannot start with 0"
  }
}
```

### Notes

- ✅ Custom validators run **in addition to** the built-in libphonenumber-js validation.
- ✅ If a custom validator returns an error, it **overrides** the default error message.
- ⚡ You can define **any number of validators** and reuse them across forms.
- ⚡ Validators can be **synchronous or asynchronous** (if you extend `PhoneCustomValidator` to return a `Promise`).

---

## 🎨 Customization

Supports class overrides:

| Input | Description |
|-------|-------------|
| `containerClass` | Wrapper around input & selector |
| `inputClass` | Applied to `<input>` |
| `buttonClass` | Applied to flag/selector button |
| `dropdownClass` | Applied to country list |
| `errorClass` | Applied to error message div |

---

## 🧪 Accessibility

- Flag selector is keyboard-accessible
- Input supports native validation attributes (`required`, `readonly`, etc.)
- Screen reader-friendly country labels

---

## 🧪 Controlled Error Display

| `showErrorMessages` | Behavior |
|---------------------|----------|
| `true` (default) | Shows inline error message below input |
| `false` | You handle errors manually (via `validationChange`) |

---

## 🙌 Maintainer

**Manish Patidar**  
🔗 [GitHub](https://github.com/manishpatidar028)

---

## 📄 License

MIT — Free for personal & commercial use

---

## ⭐ Like this project?

Show your support by giving it a ⭐ on  
**GitHub** → [manishpatidar028/ngx-phone](https://github.com/manishpatidar028/ngx-phone)
