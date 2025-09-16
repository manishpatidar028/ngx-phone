// demo-app.component.ts
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { NgxPhoneModule } from 'ngx-phone-number';

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

  constructor(private fb: FormBuilder) {
    this.reactiveForm = this.fb.group({
      phoneReactive: new FormControl('', Validators.required),
    });
  }

  // Getters for reactive form fields
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

  // Submit handlers
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
