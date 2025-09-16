import { NgModule } from '@angular/core';
import { NgxPhoneComponent } from '../lib/components/ngx-phone-number/ngx-phone-number.component';

@NgModule({
  imports: [NgxPhoneComponent], // Standalone component
  exports: [NgxPhoneComponent],
})
export class NgxPhoneModule {}
