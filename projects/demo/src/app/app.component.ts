// demo-app.component.ts
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
  imports: [FormsModule, ReactiveFormsModule, NgxPhoneModule],
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

  noStartWithZeroValidator: PhoneCustomValidator = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      return {
        type: 'STARTS_WITH_ZERO',
        message: 'Phone number cannot start with 0',
      };
    }
    return null;
  };

  /** ✅ Custom validator with extra check: number must not start with 9 */
  phoneNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) return null; // Let `Validators.required` handle empty

      // Validate using the package's service (inject it in constructor)
      const result = this.phoneValidator.validate(value);

      if (!result?.isValid) {
        return {
          phoneNumber: result?.error ?? {
            type: 'INVALID',
            message: 'Phone number is invalid',
          },
        };
      }

      // Remove non-digit characters
      const digits = value.replace(/\D/g, '');

      // ❌ Custom logic: should not start with '9'
      if (digits.startsWith('9')) {
        return {
          phoneNumber: {
            type: 'STARTS_WITH_9',
            message: 'Phone number should not start with 9',
          },
        };
      }

      return null; // ✅ valid
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
