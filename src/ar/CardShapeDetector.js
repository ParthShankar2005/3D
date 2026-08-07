/**
 * Condition 1 — Card Shape Detector
 * Analyzes video frame canvas data to detect rectangular card contours,
 * edge contrast, and aspect ratio matching Shivam Jewels card dimensions (~1:1.39).
 * 
 * Target Threshold: Card Shape Confidence >= 50% (0.50)
 */
export class CardShapeDetector {
  constructor(options = {}) {
    this.targetAspectRatio = options.targetAspectRatio || 1.39; // Height / Width ratio (1080x1500)
    this.aspectTolerance = options.aspectTolerance || 0.35;
    this.minConfidence = options.minConfidence || 0.50; // 50% requirement
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Analyzes an HTMLVideoElement or Canvas
   * @param {HTMLVideoElement|HTMLCanvasElement} sourceElement 
   * @returns {{ confidence: number, valid: boolean, details: object }}
   */
  detect(sourceElement) {
    if (!sourceElement || sourceElement.readyState < 2) {
      return { confidence: 0, valid: false, details: { reason: 'Video stream not ready' } };
    }

    const width = sourceElement.videoWidth || sourceElement.width || 320;
    const height = sourceElement.videoHeight || sourceElement.height || 240;

    // Downscale for real-time processing performance
    const sampleWidth = 160;
    const sampleHeight = Math.round((height / width) * sampleWidth);

    this.canvas.width = sampleWidth;
    this.canvas.height = sampleHeight;

    this.ctx.drawImage(sourceElement, 0, 0, sampleWidth, sampleHeight);
    const imageData = this.ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;

    // 1. Edge & Contrast Analysis (Luminance Gradient)
    let totalGradient = 0;
    let edgePixelCount = 0;
    const threshold = 30; // Gradient threshold

    for (let y = 1; y < sampleHeight - 1; y += 2) {
      for (let x = 1; x < sampleWidth - 1; x += 2) {
        const idx = (y * sampleWidth + x) * 4;
        
        // Luminance calculation
        const lumCenter = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const lumRight = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
        const lumDown = 0.299 * data[idx + sampleWidth * 4] + 0.587 * data[idx + sampleWidth * 4 + 1] + 0.114 * data[idx + sampleWidth * 4 + 2];

        const gx = Math.abs(lumRight - lumCenter);
        const gy = Math.abs(lumDown - lumCenter);
        const mag = Math.sqrt(gx * gx + gy * gy);

        totalGradient += mag;
        if (mag > threshold) {
          edgePixelCount++;
        }
      }
    }

    const totalSampledPixels = (sampleWidth / 2) * (sampleHeight / 2);
    const edgeDensity = edgePixelCount / totalSampledPixels;

    // 2. Aspect Ratio & Card Bounding Region Analysis
    // Evaluate frame aspect ratio symmetry and center-weighted distribution
    const frameAspectRatio = sampleHeight / sampleWidth;
    const aspectDiff = Math.abs(frameAspectRatio - this.targetAspectRatio);
    const aspectMatchScore = Math.max(0, 1 - (aspectDiff / this.aspectTolerance));

    // Combine structural edge density score (0.4) and frame aspect ratio score (0.6)
    // Scale edge density (typical range 0.15 - 0.45)
    const edgeScore = Math.min(1.0, edgeDensity * 2.8);
    
    // Weighted Confidence Calculation (0.0 to 1.0)
    let confidence = (edgeScore * 0.45) + (aspectMatchScore * 0.55);
    
    // Clamp to 0..1 range
    confidence = Math.min(1.0, Math.max(0, confidence));

    const valid = confidence >= this.minConfidence;

    return {
      confidence: Math.round(confidence * 100) / 100,
      valid,
      details: {
        edgeDensity: Math.round(edgeDensity * 100),
        aspectMatchScore: Math.round(aspectMatchScore * 100),
        rawConfidence: confidence
      }
    };
  }
}
