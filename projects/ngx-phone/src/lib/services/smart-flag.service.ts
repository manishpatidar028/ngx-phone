import { Injectable } from '@angular/core';
import { flag } from 'country-emoji'; // ✅ single source of truth

@Injectable({
  providedIn: 'root',
})
export class SmartFlagService {
  constructor() {}

  /**
   * Get emoji flag for a given ISO2 code.
   * Always relies on country-emoji.
   * If invalid → return 🌐 (world flag).
   */
  getFlag(iso2: string): string {
    if (!iso2 || iso2.length !== 2) {
      return '🌐'; // fallback
    }

    const emoji = flag(iso2.toUpperCase());
    return emoji || '🌐'; // always return an emoji
  }
}
