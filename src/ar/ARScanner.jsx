import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CardShapeDetector } from './CardShapeDetector.js';
import { DesignTargetDetector } from './DesignTargetDetector.js';
import { QRDetector } from './QRDetector.js';
import { QRValidator } from './QRValidator.js';
import { ARConditionGate } from './ARConditionGate.js';
import { ARStateManager } from './ARStateManager.js';
import { ModelController } from './ModelController.js';
import { TrackingSmoother } from './TrackingSmoother.js';

export class ARScannerEngine {
  constructor(options = {}) {
    this.onValidationUpdate = options.onValidationUpdate || (() => {});
    this.onStateChange = options.onStateChange || (() => {});

    // Detectors & Layer Instances
    this.cardShapeDetector = new CardShapeDetector({ minConfidence: 0.50 });
    this.designTargetDetector = new DesignTargetDetector({ minConfidence: 0.60 });
    this.qrDetector = new QRDetector({ requiredStableFrames: 3 });
    this.qrValidator = new QRValidator({ backendStoredURL: 'https://sjar.vercel.app' });
    
    // Gate & State Machine
    this.conditionGate = new ARConditionGate({ gracePeriodMs: 500 });
    this.stateManager = new ARStateManager();

    // 3D Engine & Smoothing
    this.modelController = new ModelController({ modelPath: '/assets/model.glb', targetScale: 0.65 });
    this.smoother = new TrackingSmoother({ posAlpha: 0.25, rotAlpha: 0.20 });

    this.videoElement = null;
    this.animFrameId = null;
    this.isRunning = false;

    this.stateManager.subscribe((state) => {
      this.onStateChange(state, this.stateManager.UserFacingStatusMessage);
    });
  }

  setVideoElement(video) {
    this.videoElement = video;
  }

  setMindARStatus(found, score = 0.85) {
    this.designTargetDetector.setTargetStatus(found, score);
  }

  startFrameLoop() {
    if (this.isRunning) return;
    this.isRunning = true;

    const tick = () => {
      if (!this.isRunning) return;

      this.processFrame();
      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  stopFrameLoop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  processFrame() {
    if (!this.videoElement) return;

    // 1. Condition 1 Evaluation (Card Shape)
    const cardShapeResult = this.cardShapeDetector.detect(this.videoElement);

    // 2. Condition 2 Evaluation (Design Target Mapping)
    const designTargetResult = this.designTargetDetector.evaluate();

    // 3. Condition 3 Evaluation (QR Code & Backend URL Match)
    const qrResult = this.qrDetector.scan(this.videoElement);
    const qrValidationResult = this.qrValidator.validate(qrResult.value);
    const qrBackendMatch = qrResult.confirmed && qrValidationResult.match;

    // 4. Central 3-Condition AR Gate Evaluation
    const validation = this.conditionGate.evaluate({
      cardShapeConfidence: cardShapeResult.confidence,
      cardShapeValid: cardShapeResult.valid,
      designMappingConfidence: designTargetResult.confidence,
      designMappingValid: designTargetResult.valid,
      qrDetected: qrResult.detected,
      qrValue: qrResult.value,
      qrBackendMatch
    });

    // 5. Update State Machine & 3D Model Lifecycle
    this.stateManager.update(validation);
    this.modelController.update(validation.arReady);

    // Broadcast live telemetry update
    this.onValidationUpdate(validation);
  }
}
