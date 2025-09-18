// demo-app.component.ts
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  ValidationErrors,
  ValidatorFn,
  AbstractControl,
} from '@angular/forms';
import {
  NgxPhoneModule,
  PhoneCustomValidator,
  PhoneValidationService,
} from 'ngx-phone-number'; // ✅ import the service

@Component({
  selector: 'demo-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, NgxPhoneModule, CommonModule],
})
export class DemoAppComponent {
  reactiveForm: FormGroup;
  templateFormValue: any = '';

  constructor(
    private fb: FormBuilder,
    private phoneValidator: PhoneValidationService // ✅ inject service
  ) {
    this.reactiveForm = this.fb.group({
      phoneReactive: new FormControl('', [
        Validators.required,
        this.phoneNumberValidator(), // ✅ custom validator
      ]),
    });
  }

  noStartWithZeroValidator: PhoneCustomValidator = (value, country) => {
    console.log('🔍 Custom validator called with:', value, country);

    const digits = value.replace(/\D/g, '');
    console.log('🔍 Extracted digits:', digits);

    if (digits.startsWith('0')) {
      console.log('🔍 Returning STARTS_WITH_ZERO error');
      return {
        type: 'STARTS_WITH_ZERO',
        message: 'Phone number cannot start with 0',
      };
    }

    console.log('🔍 Custom validator passed');
    return null;
  };

  phoneNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const raw = control.value.toString();
      let nationalPart = '';

      // Handle formatted US/Canada numbers (+1 xxx)
      if (raw.startsWith('+1')) {
        nationalPart = raw.replace(/^\+1\s*/, '').replace(/\D/g, '');
      } else {
        // For unformatted or other countries
        const digits = raw.replace(/\D/g, '');
        nationalPart = digits.startsWith('1') ? digits.substring(1) : digits;
      }

      console.log('National part extracted:', nationalPart);

      // PRIORITY 1: Check if it starts with 9 (highest priority)
      if (nationalPart.startsWith('9')) {
        console.log('National number starts with 9, returning error');
        return { STARTS_WITH_9: true };
      }

      // Add more FormControl-level validations here if needed
      // PRIORITY 2: Check other conditions...

      return null; // This validator passed, let component validator run
    };
  }

  // Getters
  get phoneReactiveControl(): FormControl {
    return this.reactiveForm.get('phoneReactive') as FormControl;
  }

  // Event hooks
  onCountryChange(event: any, field: string) {
    console.log(`[${field}] Country changed:`, event);
  }

  onNumberChange(event: any, field: string) {
    console.log(`[${field}] Number changed:`, event);
  }

  onValidationChange(event: any, field: string) {
    console.log(`[${field}] Validation:`, event);
    console.log(
      `[${field}] FormControl errors:`,
      this.phoneReactiveControl.errors
    );
    console.log(
      `[${field}] FormControl valid:`,
      this.phoneReactiveControl.valid
    );
  }

  onFocus(field: string) {
    console.log(`[${field}] Input focused`);
  }

  onBlur(field: string) {
    console.log(`[${field}] Input blurred`);
  }

  onEnter(field: string) {
    console.log(`[${field}] Enter pressed`);
  }

  submitReactiveForm() {
    console.log('Reactive Form Value:', this.reactiveForm.value);

    if (this.reactiveForm.valid) {
      alert('✅ Reactive form submitted successfully!');
      console.log('Submitted Value:', this.reactiveForm.value);
    } else {
      alert('❌ Reactive form is invalid!');
    }
  }

  submitTemplateForm(form: any) {
    if (form.valid) {
      alert('✅ Template form submitted successfully!');
      console.log('Submitted Value:', this.templateFormValue);
    } else {
      alert('❌ Template form is invalid!');
    }
  }

  resetForms() {
    this.reactiveForm.reset();
    this.templateFormValue = '';
  }
}
