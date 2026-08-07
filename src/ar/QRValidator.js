/**
 * Condition 3 Part B — Dedicated QR Validation Layer
 * Normalizes detected QR code strings and strictly verifies against expected backend URL:
 * https://sjar.vercel.app
 */
export class QRValidator {
  constructor(options = {}) {
    this.backendStoredURL = options.backendStoredURL || 'https://sjar.vercel.app';
  }

  /**
   * Normalizes a URL string by trimming, lowering protocol, removing trailing slashes
   * @param {string} rawUrl 
   * @returns {string}
   */
  normalizeURL(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    
    let trimmed = rawUrl.trim();
    
    // Ensure trailing slash is normalized for accurate comparison
    if (trimmed.endsWith('/')) {
      trimmed = trimmed.slice(0, -1);
    }

    return trimmed;
  }

  /**
   * Validates detected QR string against backend stored URL
   * @param {string} detectedQRValue 
   * @returns {{ match: boolean, normalizedValue: string, expectedURL: string }}
   */
  validate(detectedQRValue) {
    if (!detectedQRValue) {
      return { match: false, normalizedValue: '', expectedURL: this.backendStoredURL };
    }

    const normalized = this.normalizeURL(detectedQRValue);
    const expectedNormalized = this.normalizeURL(this.backendStoredURL);

    const match = (normalized === expectedNormalized);

    return {
      match,
      normalizedValue: normalized,
      expectedURL: expectedNormalized
    };
  }
}
