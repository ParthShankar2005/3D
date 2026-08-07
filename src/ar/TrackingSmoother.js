import * as THREE from 'three';

/**
 * LERP Matrix & Transform Interpolation Smoother
 * Prevents jitter, shaky camera transforms, and pop jumps.
 */
export class TrackingSmoother {
  constructor(options = {}) {
    this.posAlpha = options.posAlpha || 0.25; // Smoothing factor for position
    this.rotAlpha = options.rotAlpha || 0.20; // Smoothing factor for rotation (SLERP)
    this.scaleAlpha = options.scaleAlpha || 0.20;

    this.currentPosition = new THREE.Vector3();
    this.currentQuaternion = new THREE.Quaternion();
    this.currentScale = new THREE.Vector3(1, 1, 1);

    this.initialized = false;
  }

  /**
   * Smoothly interpolates object transform towards target transform
   * @param {THREE.Object3D} targetObject 
   * @param {THREE.Vector3} targetPos 
   * @param {THREE.Quaternion} targetRot 
   * @param {THREE.Vector3} targetScale 
   */
  smooth(targetObject, targetPos, targetRot, targetScale) {
    if (!targetObject) return;

    if (!this.initialized) {
      this.currentPosition.copy(targetPos);
      this.currentQuaternion.copy(targetRot);
      if (targetScale) this.currentScale.copy(targetScale);
      this.initialized = true;
    } else {
      this.currentPosition.lerp(targetPos, this.posAlpha);
      this.currentQuaternion.slerp(targetRot, this.rotAlpha);
      if (targetScale) this.currentScale.lerp(targetScale, this.scaleAlpha);
    }

    targetObject.position.copy(this.currentPosition);
    targetObject.quaternion.copy(this.currentQuaternion);
    targetObject.scale.copy(this.currentScale);
  }

  reset() {
    this.initialized = false;
  }
}
