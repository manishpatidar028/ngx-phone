import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgForm } from '@angular/forms';
import { Country, NgxPhoneModule, PhoneInputConfig, PhoneNumberValue, ValidationError, ValidationResult } from 'ngx-phone';

@Component({
  selector: 'demo-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, NgxPhoneModule, CommonModule],
})
export class DemoAppComponent implements OnInit {
  // Form instances
  reactiveForm!: FormGroup;
  inlineForm!: FormGroup;
  separateForm!: FormGroup;
  materialForm!: FormGroup;
  dynamicForm!: FormGroup;

  // Template-driven form value
  templateFormValue: string = '';

  // Form control references (required for NgxPhoneComponent)
  get phoneReactiveControl(): AbstractControl | null {
    return this.reactiveForm?.get('phoneReactive') || null;
  }

  get phoneInlineControl(): AbstractControl | null {
    return this.inlineForm?.get('phoneInline') || null;
  }

  get phoneSeparateControl(): AbstractControl | null {
    return this.separateForm?.get('phoneSeparate') || null;
  }

  get phoneMaterialControl(): AbstractControl | null {
    return this.materialForm?.get('phoneMaterial') || null;
  }

  get phoneDynamicControl(): AbstractControl | null {
    return this.dynamicForm?.get('phoneDynamic') || null;
  }

  // Configuration objects (properly typed)
  reactiveConfig: PhoneInputConfig = {
    // Label Configuration
    label: 'Business Phone Number',
    labelClass: 'custom-label-class',
    showLabel: true,
    labelPosition: 'top',
    showInlineDivider: false,
    // Basic Settings
    defaultCountry: 'US',
    autoFormat: true,
    showFlags: true,
    flagPosition: 'start',
    separateCountrySelector: false,
    countrySelectPosition: 'before',
    showDialCode: true,

    // Dial Code Preferences
    dialCodeCountryPreference: { '1': 'US', '44': 'GB', '7': 'RU' },

    // Placeholder Customization
    placeholder: 'Enter your business phone',
    customPlaceholderStyle: {
      color: '#6b7280',
      'font-style': 'italic',
      'font-weight': '300',
    },

    // Container Styling
    customContainerBorder: true,
    containerBorderStyle: {
      border: 'none',
      'border-radius': '12px',
      'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
      padding: '4px',
    },

    // CSS Classes
    inputClass: 'custom-phone-input',
    buttonClass: 'custom-flag-button',
    containerClass: 'premium-phone-container',
    dropdownClass: 'custom-dropdown-style',
    errorClass: 'custom-error-style',

    // Dropdown Configuration
    searchEnabled: true,
    searchPlaceholder: 'Search countries...',
    dropdownMaxHeight: '250px',
    dropdownWidth: '300px',
    dropdownPosition: 'auto',
    closeOnSelect: true,

    // Validation Settings
    validateOnChange: true,
    showErrorsOn: 'focus',
    showErrorMessages: true,
    showInvalidBorder: true,

    // Error Messages
    errorMessages: {
      REQUIRED: 'Business phone is required',
      INVALID: 'Please enter a valid phone number',
      TOO_SHORT: 'Phone number is too short',
      TOO_LONG: 'Phone number is too long',
      STARTS_WITH_ZERO: 'Phone cannot start with 0',
    },
  };

  templateConfig: PhoneInputConfig = {
    // Label Configuration
    label: 'Personal Contact',
    labelClass: 'template-label-style',
    showLabel: true,
    labelPosition: 'top',

    // Basic Settings
    defaultCountry: 'GB',
    autoDetectCountry: false,
    showFlags: true,
    flagPosition: 'end',
    separateCountrySelector: true,
    countrySelectPosition: 'before',
    showDialCode: false,

    // Placeholder
    placeholder: 'Mobile or landline number',
    customPlaceholderStyle: {
      color: '#9ca3af',
      'font-size': '14px',
    },

    // Minimal Styling
    inputClass: 'minimal-phone-input',
    buttonClass: 'minimal-flag-button',
    containerClass: 'minimal-phone-container',
    errorClass: 'minimal-error-text',

    // Dropdown
    searchEnabled: false,
    dropdownMaxHeight: '200px',

    // Validation
    showErrorsOn: 'touched',
    errorMessages: {
      REQUIRED: 'Contact number is required',
      INVALID: 'Invalid contact number format',
    },
  };

  inlineConfig: PhoneInputConfig = {
    label: 'Phone:',
    labelClass: 'inline-label-style',
    showLabel: true,
    labelPosition: 'inline',

    defaultCountry: 'CA',
    placeholder: '(555) 123-4567',

    inputClass: 'inline-phone-input',
    containerClass: 'inline-container',
    customPlaceholderStyle: {
      color: '#6b7280',
      'font-style': 'italic',
      'font-weight': '300',
    },

    // Container Styling
    customContainerBorder: true,
    containerBorderStyle: {
      border: '2px solid #e5e7eb',
      'border-radius': '12px',
      'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
      padding: '4px',
    },

    showErrorsOn: 'blur',
    errorMessages: {
      REQUIRED: 'Required field',
    },
  };

  separateConfig: PhoneInputConfig = {
    label: 'International Number',
    showLabel: true,
    labelPosition: 'top',

    separateCountrySelector: true,
    countrySelectPosition: 'before',
    showFlags: true,
    showDialCode: true,

    defaultCountry: 'AU',
    preferredCountries: ['AU', 'NZ', 'US', 'GB'],

    buttonClass: 'separate-country-btn',
    inputClass: 'separate-phone-input',
    containerClass: 'separate-container',

    placeholder: 'Enter number without country code',
  };

  materialConfig: PhoneInputConfig = {
    label: 'Phone Number',
    labelClass: 'mat-label-style',
    showLabel: true,
    labelPosition: 'inline',

    defaultCountry: 'DE',

    customContainerBorder: true,
    containerBorderStyle: {
      border: 'none',
      'border-bottom': '2px solid #e0e0e0',
      'border-radius': '4px 4px 0 0',
      'background-color': '#fafafa',
      padding: '8px 12px',
      transition: 'all 0.2s ease-in-out',
    },

    inputClass: 'mat-phone-input',
    buttonClass: 'mat-flag-button',
    containerClass: 'mat-phone-container',
    errorClass: 'mat-error-text',

    placeholder: '',
    showErrorsOn: 'focus',

    errorMessages: {
      REQUIRED: 'Phone number is required',
      INVALID: 'Enter a valid phone number',
    },
  };

  dynamicConfig: PhoneInputConfig = {
    label: 'Contact Number',
    showLabel: true,

    defaultCountry: 'FR',
    customPlaceholder: this.getCustomPlaceholder.bind(this),

    dialCodeCountryPreference: { '33': 'FR', '1': 'CA' },

    containerClass: 'dynamic-container',
    inputClass: 'dynamic-input',
  };

  // Event tracking
  formValues: any = {};
  eventLog: string[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForms();
  }

  private initializeForms(): void {
    // Reactive forms with proper validators
    this.reactiveForm = this.fb.group({
      phoneReactive: ['', [Validators.required]],
    });

    this.inlineForm = this.fb.group({
      phoneInline: ['', [Validators.required]],
    });

    this.separateForm = this.fb.group({
      phoneSeparate: [''],
    });

    this.materialForm = this.fb.group({
      phoneMaterial: ['', [Validators.required]],
    });

    this.dynamicForm = this.fb.group({
      phoneDynamic: [''],
    });
  }

  // Custom validator function
  noStartWithZeroValidator = (
    value: string,
    country?: Country
  ): ValidationError | null => {
    if (!value) return null;

    const digits = value.replace(/\D/g, '');
    if (digits.length > 0 && digits[0] === '0') {
      return {
        type: 'STARTS_WITH_ZERO',
        message: 'Phone number cannot start with 0',
      };
    }
    return null;
  };

  // Custom placeholder function
  getCustomPlaceholder(country: Country): string {
    const placeholders: { [key: string]: string } = {
      US: 'e.g., (555) 123-4567',
      GB: 'e.g., 020 7946 0958',
      FR: 'e.g., 01 42 68 53 00',
      DE: 'e.g., 030 12345678',
      AU: 'e.g., (02) 1234 5678',
      CA: 'e.g., (416) 555-0123',
    };

    return placeholders[country.iso2] || `Enter ${country.name} phone number`;
  }

  // Event handlers
  onCountryChange(country: Country, formType: string): void {
    this.eventLog.unshift(
      `[${formType}] Country changed to: ${country.name} (${country.iso2})`
    );
    this.limitEventLog();
  }

  onNumberChange(value: PhoneNumberValue | null, formType: string): void {
    this.formValues[formType] = value;
    if (value) {
      this.eventLog.unshift(
        `[${formType}] Number: ${value.formatted || value.raw} (Valid: ${
          value.isValid
        })`
      );
    } else {
      this.eventLog.unshift(`[${formType}] Number cleared`);
    }
    this.limitEventLog();
  }

  onValidationChange(result: ValidationResult, formType: string): void {
    const status = result.isValid ? 'Valid' : `Invalid (${result.error?.type})`;
    this.eventLog.unshift(`[${formType}] Validation: ${status}`);
    this.limitEventLog();
  }

  onFocus(formType: string): void {
    this.eventLog.unshift(`[${formType}] Input focused`);
    this.limitEventLog();
  }

  onBlur(formType: string): void {
    this.eventLog.unshift(`[${formType}] Input blurred`);
    this.limitEventLog();
  }

  onEnter(formType: string): void {
    this.eventLog.unshift(`[${formType}] Enter key pressed`);
    this.limitEventLog();
  }

  // Material design focus/blur handlers
  onMaterialFocus(): void {
    // Add focused class to material container
    const container = document.querySelector('.mat-phone-container');
    if (container) {
      container.classList.add('mat-focused');
    }
  }

  onMaterialBlur(): void {
    // Remove focused class from material container
    const container = document.querySelector('.mat-phone-container');
    if (container) {
      container.classList.remove('mat-focused');
    }
  }

  // Form submission handlers
  submitReactiveForm(): void {
    if (this.reactiveForm.valid) {
      console.log('Reactive Form Submitted:', this.reactiveForm.value);
      this.eventLog.unshift('✅ Reactive form submitted successfully');
    } else {
      console.log('Reactive Form Invalid:', this.reactiveForm.errors);
      this.eventLog.unshift('❌ Reactive form validation failed');
    }
    this.limitEventLog();
  }

  submitTemplateForm(form: NgForm): void {
    if (form.valid) {
      console.log('Template Form Submitted:', form.value);
      this.eventLog.unshift('✅ Template form submitted successfully');
    } else {
      console.log('Template Form Invalid:', form.errors);
      this.eventLog.unshift('❌ Template form validation failed');
    }
    this.limitEventLog();
  }

  // Control methods
  resetForms(): void {
    this.reactiveForm.reset();
    this.inlineForm.reset();
    this.separateForm.reset();
    this.materialForm.reset();
    this.dynamicForm.reset();
    this.templateFormValue = '';
    this.formValues = {};
    this.eventLog = [];
  }

  setTestValues(): void {
    this.reactiveForm.get('phoneReactive')?.setValue('+1 555 123 4567');
    this.inlineForm.get('phoneInline')?.setValue('+1 416 555 0123');
    this.separateForm.get('phoneSeparate')?.setValue('+61 2 1234 5678');
    this.materialForm.get('phoneMaterial')?.setValue('+49 30 12345678');
    this.dynamicForm.get('phoneDynamic')?.setValue('+33 1 42 68 53 00');
    this.templateFormValue = '+44 20 7946 0958';

    this.eventLog.unshift('📋 Test values set for all forms');
    this.limitEventLog();
  }

  toggleStyles(): void {
    // Toggle custom styles on/off
    const styleElements = document.querySelectorAll('.custom-styles-enabled');
    styleElements.forEach((el) => {
      el.classList.toggle('styles-disabled');
    });

    this.eventLog.unshift('🎨 Custom styles toggled');
    this.limitEventLog();
  }

  private limitEventLog(): void {
    if (this.eventLog.length > 20) {
      this.eventLog = this.eventLog.slice(0, 20);
    }
  }

  // Getters for template display
  get reactiveFormValue(): any {
    return this.reactiveForm?.value || {};
  }

  get reactiveFormValid(): boolean {
    return this.reactiveForm?.valid || false;
  }

  get templateFormValid(): boolean {
    return !!this.templateFormValue && this.templateFormValue.length > 0;
  }
}
