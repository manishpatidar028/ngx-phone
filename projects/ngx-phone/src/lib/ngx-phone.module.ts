import { NgModule } from '@angular/core';
import { NgxPhoneComponent } from './components/ngx-phone/ngx-phone.component';

@NgModule({
  imports: [NgxPhoneComponent], // Standalone component
  exports: [NgxPhoneComponent],
})
export class NgxPhoneModule {}
