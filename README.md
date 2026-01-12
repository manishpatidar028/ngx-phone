# 📞 ngx-phone

A powerful, fully-featured **Angular international phone number input component** with automatic country detection, real-time formatting, validation, and seamless support for both **Reactive & Template-Driven Forms**.

> 🔧 Built using `libphonenumber-js` with enhanced country detection — fully configurable, accessible, and ideal for global forms.

## 🆕 What’s New (Latest Updates)

### 🎨 Advanced Styling with `classNames` (NEW)

`ngx-phone` now supports a **structured `classNames` API** that allows you to fully customize **every internal UI element** without breaking functionality or relying on global CSS hacks.

✅ Works perfectly with **component-level styles**  
✅ No UI or behavioral regressions  
✅ Backward compatible with existing `inputClass`, `containerClass`, etc.

```ts
config: {
  classNames: {
    container: 'my-container',
    label: 'my-label',
    inputGroup: 'my-input-group',
    inputContainer: 'my-input-container',
    phoneInput: 'my-phone-input',
    countryButton: 'my-country-btn',
    flagTrigger: 'my-flag-trigger',
    dropdown: 'my-dropdown',
    searchInput: 'my-search',
    countryItem: 'my-country-item',
    errorMessage: 'my-error'
  }
}
```

---

## ✨ Features

- 🌍 International input with real-time emoji flags and dial codes
- 📥 Reactive & Template-Driven Forms support with proper ControlValueAccessor
- ✅ Smart validation (too short, invalid, required, etc.) with custom validator support
- 🔢 Auto-format as-you-type or on blur with libphonenumber-js
- 🆕 **Intelligent form value patching** with automatic country detection and formatting
- 🆕 **Flexible patch validation** - validate immediately or wait for user interaction
- 🏁 Enhanced country selector with:
  - Inline or separate button positioning
  - Lockable selection
  - Preferred, only, or excluded countries
  - Dial code country preferences for shared codes
- 🔁 Works seamlessly with `FormControl`, `formControlName`, and `[(ngModel)]`
- 🎯 Fine-grained validation error display control (blur, focus, live, etc.)
- 🧠 Auto-detects country code from number input with immediate flag updates
- 🆕 **Smart phone number parsing** - handles various formats automatically:
  - International: `+14155552671`
  - With country code: `1 (704) 843-890`
  - National format: `(704) 232-323`
  - Raw digits: `7048837333`
- 🛠️ Built-in formatting using `AsYouType` & `parsePhoneNumber`
- 🧪 Fully standalone (Angular 14+) or usable via NgModules
- ⚡ Optimized change detection for smooth user experience
- 🏁 Cross-platform emoji flags with smart Windows compatibility detection

---

## 📦 Installation

```bash
npm install ngx-phone libphonenumber-js world-countries
```

---

## 🚀 Getting Started

### ✅ Standalone Component

```typescript
import { NgxPhoneModule } from "ngx-phone";

@Component({
  standalone: true,
  imports: [NgxPhoneModule],
})
export class YourComponent {}
```

### ✅ NgModule

```typescript
import { NgModule } from "@angular/core";
import { NgxPhoneModule } from "ngx-phone";

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
      dialCodeCountryPreference: { '1': 'US', '44': 'GB' },
      errorMessages: {
        REQUIRED: 'Phone is required.',
        INVALID: 'Invalid number.'
      }
    }"
    [customValidators]="[noStartWithZeroValidator]"
    (countryChange)="onCountryChange($event)"
    (numberChange)="onNumberChange($event)"
    (validationChange)="onValidationChange($event)"
  ></ngx-phone>
</form>
```

### 🧬 Reactive Form

```typescript
form = this.fb.group({
  phone: ["", [Validators.required]],
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
      autoFormat: true,
      dialCodeCountryPreference: { '1': 'US', '44': 'GB' }
    }"
    [customValidators]="[customPhoneValidator]"
    (numberChange)="onNumberChange($event)"
    (validationChange)="onValidationChange($event)"
  ></ngx-phone>
</form>
```

### 🆕 Edit Forms with Automatic Validation

```typescript
// Component
export class EditUserComponent {
  phoneConfig: PhoneInputConfig = {
    autoFormat: true,
    showCountryCodeInInput: true,
    validateOnPatch: true, // ✅ Validate when loading data
    markAsTouchedOnPatch: true, // ✅ Mark as touched immediately
    showErrorsOnPatch: true, // ✅ Show errors right away
    defaultCountry: "US",
  };

  userForm = this.fb.group({
    phone: ["", Validators.required],
  });

  ngOnInit() {
    this.userService.getUser(123).subscribe((user) => {
      this.userForm.patchValue({
        phone: user.phoneNumber, // Any format: "+14155552671", "7048438900", "(704) 843-890"
      });
      // ✅ Automatically formats, validates, and shows errors if invalid
    });
  }
}
```

```html
<form [formGroup]="userForm">
  <ngx-phone formControlName="phone" [config]="phoneConfig"> </ngx-phone>
</form>
```

---

## ⚙️ Configuration (`[config]` Input)

### Country & Detection Settings

| Option                      | Type                             | Default | Description                             |
| --------------------------- | -------------------------------- | ------- | --------------------------------------- |
| `defaultCountry`            | `string`                         | `'US'`  | Initial country ISO2 code               |
| `preferredCountries`        | `string[]`                       | `[]`    | Countries pinned to top of dropdown     |
| `onlyCountries`             | `string[]`                       | `[]`    | Limit selectable countries              |
| `excludeCountries`          | `string[]`                       | `[]`    | Exclude specific countries              |
| `fallbackCountry`           | `string`                         | `'US'`  | Fallback when detection fails           |
| `dialCodeCountryPreference` | `{ [dialCode: string]: string }` | `{}`    | Map dial code to preferred country ISO2 |
| `autoDetectCountry`         | `boolean`                        | `false` | Use browser locale for initial country  |
| `lockCountrySelection`      | `boolean`                        | `false` | Prevent user from changing country      |

### UI & Layout Options

| Option                      | Type                         | Default    | Description                                                         |
| --------------------------- | ---------------------------- | ---------- | ------------------------------------------------------------------- |
| `separateCountrySelector`   | `boolean`                    | `false`    | Show selector as separate button                                    |
| `countrySelectPosition`     | `'before' \| 'after'`        | `'before'` | Position of country selector                                        |
| `flagPosition`              | `'start' \| 'end' \| 'none'` | `'start'`  | Position of inline flag                                             |
| `showFlags`                 | `boolean`                    | `true`     | Show emoji flags                                                    |
| `showDialCode`              | `boolean`                    | `false`    | Show dial code next to flag                                         |
| `showCountryCodeInInput`    | `boolean`                    | `false`    | Prepend country code in input                                       |
| `clearInputOnCountryChange` | `boolean`                    | `false`    | Clear input when country changes                                    |
| `showInlineDivider`         | `boolean`                    | `true`     | Toggle the divider border between the flag and input in inline mode |

### Input & Placeholder Settings

| Option                   | Type                           | Default                | Description                     |
| ------------------------ | ------------------------------ | ---------------------- | ------------------------------- |
| `placeholder`            | `string`                       | `'Enter phone number'` | Input placeholder               |
| `customPlaceholder`      | `(country: Country) => string` | `–`                    | Dynamic placeholder per country |
| `customPlaceholderStyle` | `{ [key: string]: string }`    | `{}`                   | CSS styles for placeholder      |
| `autoFocus`              | `boolean`                      | `false`                | Auto-focus input on load        |

### Label Configuration

| Option          | Type                              | Default | Description                                 |
| --------------- | --------------------------------- | ------- | ------------------------------------------- |
| `label`         | `string`                          | `''`    | Label text                                  |
| `labelClass`    | `string`                          | `''`    | CSS class for label                         |
| `showLabel`     | `boolean`                         | `false` | Show label (auto-enabled if label provided) |
| `labelPosition` | `'top' \| 'floating' \| 'inline'` | `'top'` | Label positioning                           |

### Dropdown Settings

| Option              | Type                          | Default                 | Description                    |
| ------------------- | ----------------------------- | ----------------------- | ------------------------------ |
| `searchEnabled`     | `boolean`                     | `true`                  | Show search box in dropdown    |
| `searchPlaceholder` | `string`                      | `'Search countries...'` | Search input placeholder       |
| `noResultsText`     | `string`                      | `'No countries found'`  | No results fallback text       |
| `dropdownContainer` | `'body' \| 'parent'`          | `'parent'`              | Dropdown attachment            |
| `dropdownWidth`     | `string`                      | `'100%'`                | Width of country dropdown      |
| `dropdownMaxHeight` | `string`                      | `'300px'`               | Max height of dropdown         |
| `dropdownPosition`  | `'auto' \| 'top' \| 'bottom'` | `'auto'`                | Dropdown positioning           |
| `closeOnSelect`     | `boolean`                     | `true`                  | Close dropdown after selection |

### Formatting & Validation

| Option              | Type                                                              | Default           | Description                   |
| ------------------- | ----------------------------------------------------------------- | ----------------- | ----------------------------- |
| `format`            | `'INTERNATIONAL' \| 'NATIONAL' \| 'E164' \| 'RFC3966'`            | `'INTERNATIONAL'` | Output format                 |
| `autoFormat`        | `boolean`                                                         | `true`            | Auto format as-you-type       |
| `nationalMode`      | `boolean`                                                         | `false`           | Use national formatting       |
| `validateOnChange`  | `boolean`                                                         | `true`            | Validate while typing         |
| `validateOnBlur`    | `boolean`                                                         | `true`            | Validate on blur              |
| `strictValidation`  | `boolean`                                                         | `false`           | Require both valid & possible |
| `showErrorsOn`      | `'touched' \| 'dirty' \| 'focus' \| 'blur' \| 'always' \| 'live'` | `'dirty'`         | When to show errors           |
| `showErrorMessages` | `boolean`                                                         | `true`            | Show error text automatically |
| `showInvalidBorder` | `boolean`                                                         | `true`            | Show red border on error      |
| `errorMessages`     | `Partial<Record<PhoneErrorType, string>>`                         | `{}`              | Override error messages       |

### 🆕 Patch Behavior (Form Value Loading)

| Option                 | Type      | Default | Description                                                                                |
| ---------------------- | --------- | ------- | ------------------------------------------------------------------------------------------ |
| `validateOnPatch`      | `boolean` | `false` | Run validation when value is patched programmatically                                      |
| `markAsTouchedOnPatch` | `boolean` | `false` | Mark control as touched when patching                                                      |
| `showErrorsOnPatch`    | `boolean` | `false` | Show validation errors immediately on patch                                                |
| `formatOnPatch`        | `boolean` | `true`  | Apply formatting when patching (respects `autoFormat`)                                     |
| `emitOnChangeOnPatch`  | `boolean` | `true`  | Whether to trigger `onChange` when value is patched programmatically (marks form as dirty) |

> **💡 Tip:** Use these options for edit forms where you load existing data and want immediate validation feedback.

### Styling & CSS

| Option                  | Type                        | Default | Description                         |
| ----------------------- | --------------------------- | ------- | ----------------------------------- |
| `inputClass`            | `string`                    | `''`    | CSS class for input element         |
| `buttonClass`           | `string`                    | `''`    | CSS class for flag/selector buttons |
| `containerClass`        | `string`                    | `''`    | CSS class for main container        |
| `dropdownClass`         | `string`                    | `''`    | CSS class for dropdown              |
| `errorClass`            | `string`                    | `''`    | CSS class for error message         |
| `customContainerBorder` | `boolean`                   | `false` | Use custom container border         |
| `containerBorderStyle`  | `{ [key: string]: string }` | `{}`    | Custom border styles                |

### Advanced Options

| Option         | Type                                                                       | Default    | Description            |
| -------------- | -------------------------------------------------------------------------- | ---------- | ---------------------- |
| `valueMode`    | `'object' \| 'e164' \| 'international' \| 'national' \| 'raw' \| 'string'` | `'string'` | Output value format    |
| `customFormat` | `(value: string, country: Country) => string`                              | `–`        | Custom format function |

---

## 🆕 Form Value Patching & Data Loading

One of the most powerful features of ngx-phone is its intelligent handling of phone number patching. Whether you're loading data from an API or setting values programmatically, the component automatically detects the country, formats the number, and updates the flag.

### Supported Input Formats

The component intelligently handles various phone number formats:

```typescript
// All these formats work automatically!
form.patchValue({ phone: "+14155552671" }); // International
form.patchValue({ phone: "1 (704) 843-890" }); // With country code
form.patchValue({ phone: "(704) 232-323" }); // National format
form.patchValue({ phone: "7048437333" }); // Raw digits
form.patchValue({ phone: "+441234567890" }); // UK number
form.patchValue({ phone: "919876543210" }); // India (detects +91)
```

### 🎯 Configuration Presets

Choose the right preset for your use case:

#### Edit Forms (Validate Immediately)

```typescript
export class EditProfileComponent {
  phoneConfig: PhoneInputConfig = {
    autoFormat: true,
    showCountryCodeInInput: true,
    validateOnPatch: true, // ✅ Validate on load
    markAsTouchedOnPatch: true, // ✅ Mark as touched
    showErrorsOnPatch: true, // ✅ Show errors immediately
    showErrorsOn: "always",
  };

  profileForm = this.fb.group({
    phone: ["", Validators.required],
  });

  loadUser(id: number) {
    this.api.getUser(id).subscribe((user) => {
      this.profileForm.patchValue({
        phone: user.phoneNumber, // Any format
      });
      // ✅ Validates and shows errors if invalid
    });
  }
}
```

**Visual Result:**

```
Input displays: +1 415-555-2671
Flag: 🇺🇸
Error (if invalid): "Phone number is too short" (shown immediately)
```

#### Create Forms (Validate After Interaction)

```typescript
export class CreateUserComponent {
  phoneConfig: PhoneInputConfig = {
    autoFormat: true,
    validateOnPatch: false, // ❌ Don't validate on load
    markAsTouchedOnPatch: false, // ❌ Don't mark as touched
    showErrorsOn: "touched", // Show errors after user touches
  };

  userForm = this.fb.group({
    phone: [""],
  });

  // User fills form fresh - no immediate validation
}
```

#### Display Mode (Read-Only)

```typescript
export class UserDetailsComponent {
  phoneConfig: PhoneInputConfig = {
    autoFormat: true,
    validateOnPatch: false,
    showErrorMessages: false,
    showCountryCodeInInput: true,
    lockCountrySelection: true,
  };
}
```

### Country Detection on Patch

The component automatically detects and updates the country flag when patching values:

```typescript
// Scenario 1: User previously selected US, then you load UK data
userForm.patchValue({ phone: "+441234567890" });
// Result: Flag updates from 🇺🇸 to 🇬🇧 automatically

// Scenario 2: Loading data with different countries
contacts.forEach((contact) => {
  // Each contact's phone automatically gets correct flag
  // US: +14155552671    → 🇺🇸
  // UK: +441234567890   → 🇬🇧
  // India: +919876543210 → 🇮🇳
});
```

### API Integration Example

```typescript
export class ContactListComponent {
  phoneConfig: PhoneInputConfig = {
    autoFormat: true,
    showCountryCodeInInput: true,
    validateOnPatch: true,
    defaultCountry: "US",
    dialCodeCountryPreference: {
      "1": "US", // Prefer US for +1 numbers
    },
  };

  contacts: Contact[] = [];

  loadContacts() {
    this.api.getContacts().subscribe((contacts) => {
      this.contacts = contacts.map((c) => ({
        ...c,
        // Phone numbers from API might be in various formats:
        // - "+14155552671"
        // - "1-704-843-8900"
        // - "7048438900"
        // All are automatically formatted and validated!
      }));
    });
  }
}
```

```html
<div *ngFor="let contact of contacts">
  <ngx-phone [(ngModel)]="contact.phone" [config]="phoneConfig" name="phone-{{contact.id}}"> </ngx-phone>
  <!-- Flag and formatting automatically correct for each contact -->
</div>
```

### CSV Import Example

```typescript
export class ImportComponent {
  phoneConfig: PhoneInputConfig = {
    autoFormat: true,
    validateOnPatch: true,
    showErrorsOnPatch: true,
    defaultCountry: "US",
  };

  importCSV(file: File) {
    this.csvParser.parse(file).subscribe((rows) => {
      rows.forEach((row) => {
        // CSV might have various formats:
        // "1 (704) 843-890", "(704) 232-323", "7048837333"

        this.form.patchValue({
          phone: row.phoneNumber,
        });
        // ✅ All formats normalized and validated automatically
      });
    });
  }
}
```

---

## 📤 Output Events

| Output             | Type                       | Description                                        |
| ------------------ | -------------------------- | -------------------------------------------------- |
| `numberChange`     | `PhoneNumberValue \| null` | Emits parsed phone number object                   |
| `countryChange`    | `Country`                  | Emits selected country object (including on patch) |
| `validationChange` | `ValidationResult`         | Emits current validation state                     |
| `focus`            | `void`                     | Emitted when input gains focus                     |
| `blur`             | `void`                     | Emitted when input loses focus                     |
| `enter`            | `void`                     | Emitted on Enter key press                         |

### Event Usage Example

```typescript
onCountryChange(country: Country) {
  console.log('Country changed to:', country.name);
  // Triggered both by user selection AND automatic detection on patch
}

onNumberChange(phoneValue: PhoneNumberValue | null) {
  if (phoneValue?.isValid) {
    console.log('Valid E164:', phoneValue.e164);
    this.saveToBackend(phoneValue.e164);
  }
}

onValidationChange(result: ValidationResult) {
  if (!result.isValid && result.error) {
    this.showCustomError(result.error.message);
  }
}
```

---

## 📦 Data Models

### PhoneNumberValue

```typescript
interface PhoneNumberValue {
  countryCode?: string; // ISO2 country code (e.g., 'US')
  dialCode?: string; // Dial code with + (e.g., '+1')
  e164?: string; // E164 format (e.g., '+1234567890')
  formatted?: string; // Formatted display (e.g., '+1 234 567 8900')
  national?: string; // National format (e.g., '(234) 567-8900')
  international?: string; // International format (e.g., '+1 234 567 8900')
  rfc3966?: string; // RFC3966 format (e.g., 'tel:+1-234-567-8900')
  isValid?: boolean; // Is the number valid?
  isPossible?: boolean; // Is the number possibly valid?
  type?: NumberType; // Number type (mobile, fixed, etc.)
  country?: Country; // Full country object
  raw?: string; // Original input value
}
```

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;
  isPossible?: boolean;
  error?: {
    type: "REQUIRED" | "INVALID" | "TOO_SHORT" | "TOO_LONG" | "INVALID_COUNTRY" | "NOT_A_NUMBER" | string;
    message: string;
  };
  type?: NumberType;
}
```

### Country

```typescript
interface Country {
  name: string; // Display name (e.g., 'United States')
  nativeName?: string; // Native language name
  iso2: string; // ISO2 code (e.g., 'US')
  iso3?: string; // ISO3 code (e.g., 'USA')
  dialCode: string; // Dial code (e.g., '+1')
  flag: string; // Emoji flag (e.g., '🇺🇸')
  flagUrl?: string; // Flag image URL
  format?: string; // Phone format pattern
  priority?: number; // Sort priority
  areaCodes?: string[]; // Area codes for this country
}
```

---

## 💡 Public Methods (via `@ViewChild()`)

| Method                     | Returns                    | Description                             |
| -------------------------- | -------------------------- | --------------------------------------- |
| `getValue()`               | `PhoneNumberValue \| null` | Get current parsed phone number         |
| `clear()`                  | `void`                     | Clear input and reset state             |
| `setCountry(code: string)` | `void`                     | Programmatically select country by ISO2 |
| `formatNumber(style?)`     | `string`                   | Format current number in specific style |

### Example Usage

```typescript
import { NgxPhoneComponent } from 'ngx-phone';

@ViewChild(NgxPhoneComponent) phone!: NgxPhoneComponent;

submit() {
  const phoneValue = this.phone.getValue();
  console.log('E164:', phoneValue?.e164);
  console.log('Valid:', phoneValue?.isValid);

  // Format in different styles
  console.log('National:', this.phone.formatNumber('NATIONAL'));
  console.log('International:', this.phone.formatNumber('INTERNATIONAL'));
}

clearPhone() {
  this.phone.clear();
}

setToUK() {
  this.phone.setCountry('GB');
}
```

---

## 🌍 Country Management

### ISO2 Country Codes

Use standard ISO 3166-1 alpha-2 codes for all country-related configurations:

```typescript
// Common examples
"US"; // United States
"GB"; // United Kingdom
"CA"; // Canada
"AU"; // Australia
"IN"; // India
"DE"; // Germany
"FR"; // France
"JP"; // Japan
"CN"; // China
"BR"; // Brazil
```

### Dial Code Country Preferences

When multiple countries share the same dial code, specify your preference:

```typescript
[config]="{
  dialCodeCountryPreference: {
    '1': 'US',      // Prefer US over Canada for +1
    '44': 'GB',     // Prefer UK over other British territories
    '7': 'RU',      // Prefer Russia over Kazakhstan for +7
    '262': 'RE',    // Prefer Réunion over Mayotte for +262
    '590': 'GP'     // Prefer Guadeloupe over other territories
  }
}"
```

This ensures consistent country selection when users type international numbers **and when patching values programmatically**.

---

## 🔧 Custom Validators

For project-specific validation rules beyond standard phone validation, use custom validators:

### Define Custom Validators

```typescript
import { PhoneCustomValidator } from "ngx-phone";

// Example: Block numbers starting with specific digits
export const noStartWithZeroValidator: PhoneCustomValidator = (value, country) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return {
      type: "STARTS_WITH_ZERO",
      message: "Phone number cannot start with 0",
    };
  }
  return null; // Valid
};

// Example: Country-specific validation
export const usAreaCodeValidator: PhoneCustomValidator = (value, country) => {
  if (country?.iso2 === "US") {
    const digits = value.replace(/\D/g, "");
    const areaCode = digits.substring(1, 4); // Skip country code
    const invalidAreaCodes = ["555", "999"];

    if (invalidAreaCodes.includes(areaCode)) {
      return {
        type: "INVALID_AREA_CODE",
        message: `Area code ${areaCode} is not allowed`,
      };
    }
  }
  return null;
};

// Example: Length validation
export const minLengthValidator: PhoneCustomValidator = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) {
    return {
      type: "TOO_SHORT_CUSTOM",
      message: "Phone number must be at least 10 digits",
    };
  }
  return null;
};
```

### Apply Custom Validators

```typescript
// In component
customValidators = [noStartWithZeroValidator, usAreaCodeValidator];
```

```html
<ngx-phone formControlName="phone" [customValidators]="customValidators" [config]="phoneConfig"></ngx-phone>
```

### Error Message Overrides

You can override error messages in the config:

```typescript
phoneConfig = {
  errorMessages: {
    STARTS_WITH_ZERO: "Invalid: Number cannot begin with 0",
    INVALID_AREA_CODE: "This area code is restricted",
    INVALID: "Please enter a valid phone number",
    REQUIRED: "Phone number is required",
  },
};
```

---

## 🎯 Validation Control

### Error Display Modes

| Mode        | Behavior                              |
| ----------- | ------------------------------------- |
| `'touched'` | Show errors after user touches field  |
| `'dirty'`   | Show errors after user modifies field |
| `'blur'`    | Show errors when field loses focus    |
| `'focus'`   | Show errors while field has focus     |
| `'live'`    | Show errors in real-time while typing |
| `'always'`  | Always show errors if invalid         |

### Custom Error Handling

```typescript
onValidationChange(result: ValidationResult) {
  if (!result.isValid && result.error) {
    console.log('Error type:', result.error.type);
    console.log('Error message:', result.error.message);

    // Custom handling based on error type
    switch (result.error.type) {
      case 'REQUIRED':
        this.showRequiredFieldHighlight();
        break;
      case 'INVALID':
        this.showInvalidNumberTooltip();
        break;
      case 'TOO_SHORT':
        this.showLengthHint();
        break;
    }
  }
}
```

## 🏁 Cross-Platform Flag Support

ngx-phone automatically detects browser emoji flag support and provides robust cross-platform compatibility:

- **Native Emoji Flags**: Used on browsers that properly render them (Chrome, Safari, mobile browsers)
- **Image Fallbacks**: Automatically used on Windows and browsers with poor emoji support
- **Smart Detection**: Canvas-based pixel analysis determines support in real-time
- **Zero Configuration**: Works automatically without any setup required

The smart detection resolves the common Windows issue where Unicode emoji flags appear as country code letters, ensuring consistent flag display across all platforms and browsers.

---

## 🎨 Styling & Theming

### CSS Classes

The component provides several CSS class hooks for custom styling:

```scss
// Main container
.ngx-phone-host {
  font-family: "Inter", sans-serif;
}

// Input styling
.phone-input {
  font-size: 16px;
  padding: 12px;
  border-radius: 8px;
}

// Flag button styling
.flag-trigger {
  padding: 8px;
  &:hover {
    background-color: #f3f4f6;
  }
}

// Error state
.ngx-phone-host.has-error {
  .input-group {
    border-color: #ef4444;
  }
}

// Custom dropdown styling
.country-dropdown {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}
```

## 🎨 Advanced Styling with `classNames` (Recommended)

ngx-phone provides a powerful **class mapping system** that allows you to override
**every internal CSS class** used by the component — without breaking structure or behavior.

This is the **preferred styling approach** for design systems and UI libraries.

### 🔹 Why `classNames`?

- ✔ Full control over internal structure
- ✔ No need to rely on deep selectors
- ✔ Safe upgrades (structure remains stable)
- ✔ Works with Tailwind, Bootstrap, custom CSS

---

### 📦 Available Class Keys

```ts
interface PhoneClassMap {
  container: string;
  label: string;
  inputGroup: string;
  inputContainer: string;
  phoneInput: string;
  countryButton: string;
  flagTrigger: string;
  dropdown: string;
  searchInput: string;
  countryItem: string;
  errorMessage: string;
}
```

### Custom CSS Variables

```scss
:root {
  --ngx-phone-border-color: #d1d5db;
  --ngx-phone-focus-color: #3b82f6;
  --ngx-phone-error-color: #ef4444;
  --ngx-phone-border-radius: 8px;
}
```

### Configuration-Based Styling

```typescript
styleConfig = {
  inputClass: "custom-phone-input",
  buttonClass: "custom-flag-button",
  containerClass: "phone-container",
  errorClass: "phone-error-text",
  customContainerBorder: true,
  containerBorderStyle: {
    border: "2px solid #e5e7eb",
    "border-radius": "12px",
    "box-shadow": "0 1px 3px rgba(0,0,0,0.1)",
  },
  customPlaceholderStyle: {
    color: "#9ca3af",
    "font-style": "italic",
  },
};
```

---

## 🧪 Accessibility Features

- **Keyboard Navigation**: Full keyboard support for dropdown and input
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Logical tab order and focus states
- **High Contrast**: Respects `prefers-contrast: high` media query
- **Reduced Motion**: Respects `prefers-reduced-motion` settings

### ARIA Attributes

```html
<!-- Automatically applied -->
<input aria-label="Phone number input" aria-invalid="false" aria-describedby="error-message-id" aria-expanded="false" />

<button aria-label="Select country: United States" aria-expanded="false" />

<div role="listbox" aria-label="Country selection" />
```

---

## 📱 Responsive Design

The component is fully responsive with mobile-first design:

```scss
// Automatic responsive behavior
@media (max-width: 640px) {
  .country-dropdown {
    max-width: calc(100vw - 2rem);
    margin: 0 1rem;
  }

  .input-group.separate {
    flex-direction: column;
    gap: 0.5rem;
  }
}
```

---

## 🚀 Performance Optimization

### Optimizations Included:

- **Debounced Validation**: 300ms debounce on input validation
- **Change Detection**: Optimized with `OnPush` strategy where applicable
- **Virtual Scrolling**: For large country lists (coming in v2.0)
- **Lazy Loading**: Country data loaded on demand
- **Memory Management**: Proper cleanup of subscriptions and event listeners

### Best Practices:

```typescript
// Use OnPush change detection in parent components
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent {}

// Limit country lists for better performance
phoneConfig = {
  onlyCountries: ["US", "CA", "GB", "AU"], // Faster dropdown
  searchEnabled: false, // Disable for small lists
};
```

---

## 🧪 Testing

### Unit Testing Example

```typescript
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NgxPhoneModule } from "ngx-phone";

describe("PhoneInputComponent", () => {
  let component: YourComponent;
  let fixture: ComponentFixture<YourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxPhoneModule],
      declarations: [YourComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(YourComponent);
    component = fixture.componentInstance;
  });

  it("should format US number correctly", () => {
    const phoneComponent = fixture.debugElement.query(By.directive(NgxPhoneComponent));
    phoneComponent.componentInstance.writeValue("+12345678901");

    expect(phoneComponent.componentInstance.getValue()?.formatted).toBe("+1 234 567 8901");
  });

  it("should detect country from patched value", () => {
    const phoneComponent = fixture.debugElement.query(By.directive(NgxPhoneComponent));
    phoneComponent.componentInstance.writeValue("+441234567890");

    expect(phoneComponent.componentInstance.selectedCountry?.iso2).toBe("GB");
  });

  it("should handle various formats on patch", () => {
    const phoneComponent = fixture.debugElement.query(By.directive(NgxPhoneComponent));

    // Test different formats
    phoneComponent.componentInstance.writeValue("1 (704) 843-890");
    expect(phoneComponent.componentInstance.selectedCountry?.iso2).toBe("US");

    phoneComponent.componentInstance.writeValue("7048437333");
    expect(phoneComponent.componentInstance.phoneValue).toContain("704");
  });
});
```

### E2E Testing Example

```typescript
// Cypress example
cy.get("[data-cy=phone-input]").type("+1234567890").should("have.value", "+1 234 567 8901");

cy.get("[data-cy=country-flag]").should("contain.text", "🇺🇸");

// Test patching
cy.get("@phoneInput").invoke("val", "+441234567890").trigger("input");
cy.get("[data-cy=country-flag]").should("contain.text", "🇬🇧");
```

---

## ❓ FAQ

### Why isn't my country showing up?

Check that the country's ISO2 code is included in your `onlyCountries` array, or not excluded in `excludeCountries`.

### How do I handle multiple countries with the same dial code?

Use `dialCodeCountryPreference` to specify which country should be selected by default:

```typescript
dialCodeCountryPreference: { '1': 'US' } // Prefer US over Canada for +1
```

### Can I customize the validation messages?

Yes, use the `errorMessages` config and/or custom validators:

```typescript
config: {
  errorMessages: {
    INVALID: 'Please check your phone number',
    REQUIRED: 'Phone number is required'
  }
}
```

### How do I validate immediately when loading data?

Use the patch behavior options:

```typescript
config: {
  validateOnPatch: true,
  markAsTouchedOnPatch: true,
  showErrorsOnPatch: true
}
```

### Why doesn't the flag update when I patch a value?

Make sure you're not blocking country detection. The component automatically resets manual selection flags when patching. If you have `lockCountrySelection: true`, remove it or the flag won't update.

### What formats does the component accept on patch?

The component intelligently handles:

- International: `+14155552671`
- With country code: `1 (704) 843-890`
- National: `(704) 232-323`
- Raw digits: `7048437333`

All formats are automatically normalized, formatted, and validated.

### How do I integrate with Angular Material?

The component works seamlessly with Angular Material form fields:

```html
<mat-form-field>
  <mat-label>Phone Number</mat-label>
  <ngx-phone formControlName="phone" [config]="phoneConfig"></ngx-phone>
  <mat-error *ngIf="form.get('phone')?.hasError('INVALID')"> Invalid phone number </mat-error>
</mat-form-field>
```

---

## 🙌 Contributing

We welcome contributions! Please read our contributing guidelines and submit pull requests to our GitHub repository.

### Development Setup

```bash
git clone https://github.com/manishpatidar028/ngx-phone.git
cd ngx-phone
npm install
npm run build
npm run test
```

---

## 🙌 Maintainer

**Manish Patidar**  
🔗 [GitHub](https://github.com/manishpatidar028) | [LinkedIn](https://www.linkedin.com/in/manish-patidar-30628b152/)

---

## 📄 License

MIT License - Free for personal & commercial use

---

## ⭐ Support

If this library helps your project, please consider:

- ⭐ Starring the repo on [GitHub](https://github.com/manishpatidar028/ngx-phone)
- 🐛 Reporting issues and feature requests
- 📖 Contributing to documentation
- 💡 Sharing your use cases and feedback

---

## 🔗 Links

- **GitHub Repository**: [manishpatidar028/ngx-phone](https://github.com/manishpatidar028/ngx-phone)
- **NPM Package**: [ngx-phone](https://www.npmjs.com/package/ngx-phone)
- **Demo**: [Live Demo](https://ngx-phone-number-tlkv.vercel.app/)
- **Documentation**: Coming Soon 🚧
- **Issues & Support**: [GitHub Issues](https://github.com/manishpatidar028/ngx-phone/issues)

---

## 📋 Changelog

### v1.3.1 (Latest)

- ✨ **NEW:** `emitOnChangeOnPatch` feature flag to control form dirty state during programmatic updates.
- ⚡ **IMPROVE:** Fixed several linting warnings and optimized internal component logic.

### v1.3.0

✨ NEW: classNames styling system (non-breaking)

⚡ IMPROVED: Component-level styling support clarified

### v1.2.6

- ✨ **NEW:** Intelligent form value patching with automatic country detection
- ✨ **NEW:** Flexible patch validation options (`validateOnPatch`, `markAsTouchedOnPatch`, `showErrorsOnPatch`)
- ✨ **NEW:** Smart phone number parsing - handles various formats automatically
- ✨ **NEW:** Automatic flag updates when patching values
- ✨ **NEW:** Respects `showCountryCodeInInput` during patch operations
- 🐛 **FIX:** Country flag now updates correctly when patching values after manual selection
- 🐛 **FIX:** Dial code display now respects configuration during patch
- ⚡ **IMPROVE:** Enhanced country detection algorithm
- ⚡ **IMPROVE:** Better handling of international vs national formats
- 📚 **DOCS:** Comprehensive documentation for patch behavior and form integration
