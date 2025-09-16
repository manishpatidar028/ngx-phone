import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { DemoAppComponent } from './app/app.component';

bootstrapApplication(DemoAppComponent, appConfig)
  .catch((err) => console.error(err));
