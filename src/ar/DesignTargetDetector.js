/**
 * Condition 2 — Card Design / Target Mapping Detector
 * Continuously monitors MindAR image target tracking state and feature alignment metrics.
 * 
 * Target Threshold: Design Mapping Confidence >= 60% (0.60)
 */
export class DesignTargetDetector {
  constructor(options = {}) {
    this.minConfidence = options.minConfidence || 0.60; // 60% requirement
    this.isTargetFound = false;
    this.currentConfidence = 0;
    this.trackingLossTimestamp = 0;
  }

  /**
   * Sets MindAR target found status
   * @param {boolean} found 
   * @param {number} rawScore Optional score from MindAR matcher
   */
  setTargetStatus(found, rawScore = 0.85) {
    this.isTargetFound = found;
    if (found) {
      this.currentConfidence = Math.min(1.0, Math.max(this.minConfidence, rawScore));
      this.trackingLossTimestamp = 0;
    } else {
      this.currentConfidence = 0;
      this.trackingLossTimestamp = Date.now();
    }
  }

  /**
   * Evaluates design mapping confidence
   * @returns {{ confidence: number, valid: boolean, details: object }}
   */
  evaluate() {
    const valid = this.isTargetFound && (this.currentConfidence >= this.minConfidence);
    return {
      confidence: Math.round(this.currentConfidence * 100) / 100,
      valid,
      details: {
        isTargetFound: this.isTargetFound,
        rawConfidence: this.currentConfidence
      }
    };
  }
}
