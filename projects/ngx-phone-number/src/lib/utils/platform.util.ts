import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class PlatformHelper {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}
  get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
