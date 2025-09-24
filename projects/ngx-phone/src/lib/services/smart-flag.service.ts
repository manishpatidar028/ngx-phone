import { Injectable } from '@angular/core';
import { PlatformHelper } from '../utils/platform.util';

@Injectable({
  providedIn: 'root'
})
export class SmartFlagService {
  private browserSupportsEmoji: boolean | null = null;
  private emojiCheckPerformed = false;

  constructor(private platformHelper: PlatformHelper) {}

  /**
   * Detect if browser properly renders flag emojis using canvas pixel analysis
   */
  private getDoesBrowserSupportFlagEmojis(): boolean {
    if (!this.platformHelper.isBrowser) {
      return false; // Server-side rendering - assume no support
    }

    if (this.emojiCheckPerformed) {
      return this.browserSupportsEmoji!;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.height = 20; // Slightly larger for better detection
      canvas.width = 20;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        this.browserSupportsEmoji = false;
        this.emojiCheckPerformed = true;
        return false;
      }

      ctx.font = `${canvas.height}px sans-serif`;
      ctx.textBaseline = 'top';
      const flagEmoji = '🇺🇸'; // US flag has distinct colors
      ctx.fillText(flagEmoji, 0, 0);

      // Read canvas pixels and search for non-grayscale pixels
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      
      for (let i = 0; i < imageData.length; i += 4) {
        if (imageData[i + 3] === 0) {
          continue; // Skip transparent pixels
        }
        
        // Check if pixel is not grayscale (R !== G || R !== B)
        if (imageData[i] !== imageData[i + 1] || imageData[i] !== imageData[i + 2]) {
          this.browserSupportsEmoji = true;
          this.emojiCheckPerformed = true;
          return true;
        }
      }

      this.browserSupportsEmoji = false;
      this.emojiCheckPerformed = true;
      return false;
    } catch (error) {
      console.warn('Flag emoji detection failed:', error);
      this.browserSupportsEmoji = false;
      this.emojiCheckPerformed = true;
      return false;
    }
  }

  /**
   * Get flag - emoji if supported, fallback image if not
   */
  getFlag(iso2: string): string {
    if (!iso2 || iso2.length !== 2) {
      return this.getFallbackFlag(iso2);
    }

    // Use emoji if browser supports it
    if (this.getDoesBrowserSupportFlagEmojis()) {
      return this.getEmojiFlag(iso2);
    }

    // Fallback to CDN image
    return this.getFlagImage(iso2);
  }

  /**
   * Convert ISO2 to emoji flag
   */
  private getEmojiFlag(iso2: string): string {
    const codePoints = iso2
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  /**
   * Get flag as image from CDN
   */
  private getFlagImage(iso2: string): string {
    const code = iso2.toLowerCase();
    return `<img src="https://flagsapi.com/${iso2.toUpperCase()}/flat/32.png" 
             alt="${iso2} flag" 
             class="flag-img"
             style="width:20px;height:15px;object-fit:cover;"
             loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='inline';">`;
  }

  /**
   * Fallback for invalid country codes
   */
  private getFallbackFlag(iso2: string): string {
    return `<span style="font-size:0.8em;opacity:0.7;">${iso2 || '??'}</span>`;
  }

  /**
   * Check if browser supports emoji flags (public method)
   */
  public supportsEmojiFlags(): boolean {
    return this.getDoesBrowserSupportFlagEmojis();
  }

  /**
   * Force re-check of emoji support (useful for testing)
   */
  public recheckEmojiSupport(): boolean {
    this.emojiCheckPerformed = false;
    this.browserSupportsEmoji = null;
    return this.getDoesBrowserSupportFlagEmojis();
  }
}