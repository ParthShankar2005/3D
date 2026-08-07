/**
 * Explicit State Machine Manager for WebAR Experience
 * States: IDLE, SCANNING, CARD_DETECTED, DESIGN_DETECTED, QR_DETECTED, VALIDATING, AR_READY, TRACKING_LOST
 */
export const ARState = {
  IDLE: 'IDLE',
  SCANNING: 'SCANNING',
  CARD_DETECTED: 'CARD_DETECTED',
  DESIGN_DETECTED: 'DESIGN_DETECTED',
  QR_DETECTED: 'QR_DETECTED',
  VALIDATING: 'VALIDATING',
  AR_READY: 'AR_READY',
  TRACKING_LOST: 'TRACKING_LOST'
};

export class ARStateManager {
  constructor() {
    this.currentState = ARState.IDLE;
    this.listeners = new Set();
  }

  /**
   * Updates state based on 3-Condition Gate evaluation
   * @param {object} validation Central validation object from ARConditionGate
   */
  update(validation) {
    let nextState = ARState.SCANNING;

    if (validation.arReady) {
      nextState = ARState.AR_READY;
    } else if (validation.qr.detected && validation.qr.backendMatch) {
      nextState = ARState.VALIDATING;
    } else if (validation.qr.detected) {
      nextState = ARState.QR_DETECTED;
    } else if (validation.designMapping.valid) {
      nextState = ARState.DESIGN_DETECTED;
    } else if (validation.cardShape.valid) {
      nextState = ARState.CARD_DETECTED;
    } else {
      nextState = ARState.SCANNING;
    }

    if (nextState !== this.currentState) {
      this.currentState = nextState;
      this.notifyListeners(this.currentState);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(state) {
    this.listeners.forEach(fn => fn(state));
  }

  get UserFacingStatusMessage() {
    switch (this.currentState) {
      case ARState.IDLE:
        return 'Ready to start camera...';
      case ARState.SCANNING:
        return 'Searching for invitation card...';
      case ARState.CARD_DETECTED:
        return 'Card shape detected...';
      case ARState.DESIGN_DETECTED:
        return 'Recognizing card design...';
      case ARState.QR_DETECTED:
        return 'Card recognized. Scan the QR code...';
      case ARState.VALIDATING:
        return 'QR verified. Preparing AR...';
      case ARState.AR_READY:
        return '✅ AR Ready — Shivam Jewels 3D Experience Active';
      case ARState.TRACKING_LOST:
        return 'Tracking lost. Adjusting camera...';
      default:
        return 'Scanning target...';
    }
  }
}
