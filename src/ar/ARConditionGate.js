/**
 * Central Single Source of Truth — 3-Condition AR Gate & Hysteresis Controller
 * 
 * MANDATORY RULE:
 * AR_READY = cardShapeConfidence >= 0.50 && designMappingConfidence >= 0.60 && qrBackendMatch === true
 * 
 * NEVER USE OR LOGIC.
 */
export class ARConditionGate {
  constructor(options = {}) {
    this.gracePeriodMs = options.gracePeriodMs || 500; // 500ms anti-flicker hysteresis
    this.lastValidTimestamp = 0;
    this.isArReady = false;
  }

  /**
   * Evaluates the 3 mandatory conditions and updates AR_READY state with hysteresis.
   * 
   * @param {object} params
   * @param {number} params.cardShapeConfidence Card shape confidence (0.0 to 1.0)
   * @param {boolean} params.cardShapeValid Card shape valid flag (>= 0.50)
   * @param {number} params.designMappingConfidence Design mapping confidence (0.0 to 1.0)
   * @param {boolean} params.designMappingValid Design mapping valid flag (>= 0.60)
   * @param {boolean} params.qrDetected QR code detected flag
   * @param {string|null} params.qrValue Raw detected QR value
   * @param {boolean} params.qrBackendMatch QR matches https://sjar.vercel.app strictly
   * @returns {object} Central validation object
   */
  evaluate({
    cardShapeConfidence = 0,
    cardShapeValid = false,
    designMappingConfidence = 0,
    designMappingValid = false,
    qrDetected = false,
    qrValue = null,
    qrBackendMatch = false
  }) {
    const now = Date.now();

    // STRICT AND GATE EVALUATION (No OR logic allowed)
    const rawAllThreeTrue = (
      cardShapeValid === true &&
      cardShapeConfidence >= 0.50 &&
      designMappingValid === true &&
      designMappingConfidence >= 0.60 &&
      qrBackendMatch === true
    );

    if (rawAllThreeTrue) {
      this.lastValidTimestamp = now;
      this.isArReady = true;
    } else {
      // Hysteresis Deactivation: Keep 3D model active during short tracking drop grace period (500ms)
      if (this.isArReady && (now - this.lastValidTimestamp < this.gracePeriodMs)) {
        // Retain AR_READY during grace period to prevent flickering
        this.isArReady = true;
      } else {
        this.isArReady = false;
      }
    }

    return {
      cardShape: {
        confidence: cardShapeConfidence,
        valid: cardShapeValid
      },
      designMapping: {
        confidence: designMappingConfidence,
        valid: designMappingValid
      },
      qr: {
        detected: qrDetected,
        value: qrValue,
        backendMatch: qrBackendMatch
      },
      rawAllThreePass: rawAllThreeTrue,
      inGracePeriod: !rawAllThreeTrue && this.isArReady,
      arReady: this.isArReady
    };
  }
}
