import jsQR from 'jsqr';

/**
 * Condition 3 Part A — Camera Frame QR Reader & Temporal Debouncer
 * Scans video frame canvas using jsQR.
 * Includes temporal debouncing (requiredStableQRFrames = 3) to prevent single-frame glitches.
 */
export class QRDetector {
  constructor(options = {}) {
    this.requiredStableFrames = options.requiredStableFrames || 3;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    
    this.consecutiveMatchCount = 0;
    this.lastDetectedValue = null;
    this.confirmedValue = null;
    this.isDetected = false;
    this.frameSkipCounter = 0;
  }

  /**
   * Scans an HTMLVideoElement for QR code
   * @param {HTMLVideoElement} videoElement 
   * @returns {{ detected: boolean, value: string|null, confirmed: boolean, stableFrames: number }}
   */
  scan(videoElement) {
    if (!videoElement || videoElement.readyState < 2) {
      return { detected: false, value: null, confirmed: false, stableFrames: 0 };
    }

    // Process every 2nd frame for high performance (frame skipping)
    this.frameSkipCounter++;
    if (this.frameSkipCounter % 2 !== 0 && this.isDetected) {
      return {
        detected: this.isDetected,
        value: this.confirmedValue || this.lastDetectedValue,
        confirmed: this.consecutiveMatchCount >= this.requiredStableFrames,
        stableFrames: this.consecutiveMatchCount
      };
    }

    const width = videoElement.videoWidth || 640;
    const height = videoElement.videoHeight || 480;

    // Scale canvas down slightly for fast jsQR decoding
    const decodeWidth = 480;
    const decodeHeight = Math.round((height / width) * decodeWidth);

    this.canvas.width = decodeWidth;
    this.canvas.height = decodeHeight;

    this.ctx.drawImage(videoElement, 0, 0, decodeWidth, decodeHeight);
    const imageData = this.ctx.getImageData(0, 0, decodeWidth, decodeHeight);

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code && code.data && code.data.trim().length > 0) {
      const rawValue = code.data.trim();

      if (rawValue === this.lastDetectedValue) {
        this.consecutiveMatchCount++;
      } else {
        this.lastDetectedValue = rawValue;
        this.consecutiveMatchCount = 1;
      }

      this.isDetected = true;

      // Confirm QR value once temporal stability threshold is reached
      if (this.consecutiveMatchCount >= this.requiredStableFrames) {
        this.confirmedValue = rawValue;
      }

      return {
        detected: true,
        value: rawValue,
        confirmed: this.consecutiveMatchCount >= this.requiredStableFrames,
        stableFrames: this.consecutiveMatchCount
      };
    } else {
      // Decay consecutive match count gradually to prevent immediate flicker on single missed frame
      if (this.consecutiveMatchCount > 0) {
        this.consecutiveMatchCount--;
      }
      
      if (this.consecutiveMatchCount === 0) {
        this.isDetected = false;
        this.lastDetectedValue = null;
        this.confirmedValue = null;
      }

      return {
        detected: this.isDetected,
        value: this.confirmedValue,
        confirmed: this.consecutiveMatchCount >= this.requiredStableFrames,
        stableFrames: this.consecutiveMatchCount
      };
    }
  }

  reset() {
    this.consecutiveMatchCount = 0;
    this.lastDetectedValue = null;
    this.confirmedValue = null;
    this.isDetected = false;
  }
}
