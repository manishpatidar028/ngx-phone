import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SmartFlagService {
  /** Always return flag image from CDN */
  getFlag(iso2: string): string {
    if (!iso2 || iso2.length !== 2) {
      return `<img src="https://cdn.jsdelivr.net/npm/flag-icons@6.6.6/flags/4x3/un.svg"
                  class="flag-img" alt="World flag"/>`;
    }

    return `<img src="https://cdn.jsdelivr.net/npm/flag-icons@6.6.6/flags/4x3/${iso2.toLowerCase()}.svg"
                class="flag-img" alt="${iso2.toUpperCase()} flag"/>`;
  }

  /** Alias for backward compatibility */
  getEmojiFlag(iso2: string): string {
    return this.getFlag(iso2);
  }

  /** Optional helper for template */
  isImageFlag(_: string): boolean {
    return true;
  }
}
