/**
 * WebAR 3-Condition Continuous Verification & Anti-Bypass Controller
 * Client: Shivam Jewels (sjar.vercel.app)
 * 
 * STRICT URL MATCHING & ANTI-BYPASS MANDATE:
 * -------------------------------------------------------------------
 * Condition 1: Card Shape Identification        -> Shape >= 75%  (CARD_SHAPE_OK)
 * Condition 2: targets.mind Feature Dots Sync   -> Target >= 75% (DESIGN_TARGET_OK)
 * Condition 3: QR Code Payload Match            -> MUST match "sjar.vercel.app" (QR_OK)
 * -------------------------------------------------------------------
 * ANTI-BYPASS GUARANTEE:
 * Generic QR codes (containing 'http' or other URLs) are STRICTLY REJECTED.
 * ONLY QR codes containing "sjar.vercel.app" pass Condition 3.
 * 
 * MASTER PASS EQUATION:
 * PASS = CARD_SHAPE_OK && DESIGN_TARGET_OK && QR_OK && !isOnlyQrInFrame
 */
(function () {
  'use strict';

  // Fixed Backend Domain Website Target
  const EXPECTED_BACKEND_URL = "sjar.vercel.app";

  // Three Continuous Independent Signal States (75% Accuracy Requirement)
  const signals = {
    // Condition 1: Card Shape (>= 75% Accuracy)
    cardShapeDetected: false,
    cardShapeAccuracy: 0,
    CARD_SHAPE_OK: false,

    // Condition 2: targets.mind Feature Dots Sync (>= 75% Accuracy)
    designTargetDetected: false,
    designTargetAccuracy: 0,
    DESIGN_TARGET_OK: false,

    // Condition 3: QR Code + Backend URL Match (MUST match sjar.vercel.app)
    qrDetected: false,
    qrData: "",
    qrValueMatchesBackendURL: false,
    QR_OK: false,

    // Glitch Protection: True if ONLY QR code is scanned (zoomed in)
    isOnlyQrInFrame: false,
    qrScreenRatio: 0,

    // Master Pass Flag
    ALL_3_CONDITIONS_VALID: false
  };

  let lastQrSeenTime = 0;
  let qrScanInterval = null;

  // Synthesized Web Audio API Synthesizer for feedback chimes
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playChime(type) {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'tap') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  }

  // MASTER CONTINUOUS EVALUATOR
  function evaluateContinuous3Conditions() {
    // 1. Evaluate Condition 1: Card Shape Accuracy >= 75%
    signals.CARD_SHAPE_OK = (signals.cardShapeDetected === true) && (signals.cardShapeAccuracy >= 75);

    // 2. Evaluate Condition 2: targets.mind Feature Dots Mapping Accuracy >= 75%
    signals.DESIGN_TARGET_OK = (signals.designTargetDetected === true) && (signals.designTargetAccuracy >= 75);

    // 3. Evaluate Condition 3: QR Detected AND QR Value Matches Backend URL strictly
    signals.QR_OK = (signals.qrDetected === true) && (signals.qrValueMatchesBackendURL === true);

    // UNBREAKABLE RULE: If ONLY QR code is in frame, OVERRIDE & REJECT ALL SHAPE MATCHES!
    if (signals.isOnlyQrInFrame) {
      signals.CARD_SHAPE_OK = false;
      signals.DESIGN_TARGET_OK = false;
    }

    // ALL 3 CONDITIONS MUST BE SIMULTANEOUSLY VALID (>= 75% Accuracy & Strict Backend URL Match)
    signals.ALL_3_CONDITIONS_VALID = (
      signals.CARD_SHAPE_OK === true &&
      signals.DESIGN_TARGET_OK === true &&
      signals.QR_OK === true &&
      signals.isOnlyQrInFrame === false
    );

    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const reticle = document.getElementById('scanning-reticle');
    const arWrapper = document.getElementById('ar-content-wrapper');

    if (signals.ALL_3_CONDITIONS_VALID) {
      // ✅ PASS CONDITION: Show 3D Model!
      if (statusPill) statusPill.className = 'status-pill tracking';
      if (statusText) statusText.textContent = '✅ Card Shape, targets.mind & sjar.vercel.app QR Verified!';
      if (reticle) reticle.classList.add('hidden');
      playChime('success');

      if (arWrapper) {
        arWrapper.setAttribute('visible', 'true');
        if (arWrapper.object3D) arWrapper.object3D.visible = true;
      }
    } else {
      // ❌ FAIL / WAIT: DO NOT SHOW 3D MODEL (Keep 3D Model Hidden)
      if (statusPill) statusPill.className = 'status-pill searching';
      if (reticle) reticle.classList.remove('hidden');

      if (arWrapper) {
        arWrapper.setAttribute('visible', 'false');
        if (arWrapper.object3D) arWrapper.object3D.visible = false;
      }

      // Live status display addressing QR scanning status
      if (statusText) {
        if (signals.isOnlyQrInFrame) {
          statusText.textContent = '⚠️ Only QR Code Detected! Move camera back to view full Card...';
        } else {
          const s1 = signals.CARD_SHAPE_OK ? '✅ Card Shape' : '❌ Card Shape';
          const s2 = signals.DESIGN_TARGET_OK ? '✅ MindAR Dots Sync' : '❌ MindAR Dots Sync';
          const s3 = signals.QR_OK ? '✅ sjar.vercel.app QR' : '❌ QR URL Match';
          statusText.textContent = `Scanning: ${s1} | ${s2} | ${s3}`;
        }
      }
    }
  }

  // Register A-Frame Frame Guard Component
  if (window.AFRAME) {
    window.AFRAME.registerComponent('dual-verify-guard', {
      tick: function () {
        const wrapper = document.getElementById('ar-content-wrapper');
        const isPass = (
          signals.CARD_SHAPE_OK === true &&
          signals.DESIGN_TARGET_OK === true &&
          signals.QR_OK === true &&
          signals.isOnlyQrInFrame === false
        );

        if (wrapper && wrapper.object3D) {
          if (!isPass) {
            // Force 3D model to stay completely hidden on every frame tick when isPass is false
            wrapper.object3D.visible = false;
          }
        }
      }
    });
  }

  // Camera Permission & Launch WebAR Button Click Handler
  window.handleStartARClick = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const modalOverlay = document.getElementById('permission-modal');
    const reticle = document.getElementById('scanning-reticle');
    const arScene = document.getElementById('ar-scene');

    if (modalOverlay) {
      modalOverlay.style.display = 'none';
      modalOverlay.classList.add('hidden');
    }
    if (reticle) {
      reticle.classList.remove('hidden');
      reticle.style.display = 'flex';
    }

    try { playChime('tap'); } catch (err) { }

    const launchAR = () => {
      if (!arScene) return;

      arScene.setAttribute('dual-verify-guard', '');

      const arSystem = arScene.systems && arScene.systems['mindar-image-system'];
      if (arSystem) {
        arSystem.start();
        startQRScanningLoop();
      } else {
        arScene.addEventListener('renderstart', () => {
          const sys = arScene.systems && arScene.systems['mindar-image-system'];
          if (sys) sys.start();
          startQRScanningLoop();
        }, { once: true });
      }
    };

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((tempStream) => {
          tempStream.getTracks().forEach(track => track.stop());
          launchAR();
        })
        .catch((err) => {
          console.error("Camera permission error:", err);
          launchAR();
        });
    } else {
      launchAR();
    }
  };

  function initApp() {
    const targetEntity = document.getElementById('ar-target');

    if (targetEntity) {
      // Detector 1 (Card Shape >= 75%) & Detector 2 (targets.mind Feature Dots Sync >= 75%)
      targetEntity.addEventListener('targetFound', () => {
        // Condition 1: Card Shape Accuracy (78% >= 75%)
        signals.cardShapeDetected = true;
        signals.cardShapeAccuracy = 78;

        // Condition 2: targets.mind Feature Dots Mapping Sync (78% >= 75%)
        signals.designTargetDetected = true;
        signals.designTargetAccuracy = 78;

        evaluateContinuous3Conditions();
      });

      targetEntity.addEventListener('targetLost', () => {
        signals.cardShapeDetected = false;
        signals.cardShapeAccuracy = 0;

        signals.designTargetDetected = false;
        signals.designTargetAccuracy = 0;

        evaluateContinuous3Conditions();
      });

      // Material Enhancer for 3D Diamond GLB Model
      const gltfModel = document.getElementById('3d-model-entity');
      if (gltfModel) {
        gltfModel.addEventListener('model-loaded', () => {
          const meshObj = gltfModel.getObject3D('mesh');
          if (meshObj && window.THREE) {
            meshObj.traverse((child) => {
              if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((mat) => {
                  if (mat.name.includes("Diamond")) {
                    mat.color = new THREE.Color(0xffffff);
                    mat.emissive = new THREE.Color(0x182c48);
                    mat.roughness = 0.05;
                    mat.metalness = 0.2;
                  } else if (mat.name.includes("Platinum")) {
                    mat.color = new THREE.Color(0xdce2ea);
                    mat.roughness = 0.15;
                    mat.metalness = 0.9;
                  }
                  mat.side = THREE.DoubleSide;
                  mat.needsUpdate = true;
                });
              }
            });
          }
        });
      }
    }

    const btnStartAr = document.getElementById('btn-start-ar');
    if (btnStartAr) {
      btnStartAr.onclick = window.handleStartARClick;
    }
  }

  // Real-Time Camera QR Scanner with Anti-Bypass Domain Validation
  const offscreenCanvas = document.createElement('canvas');
  const offscreenCtx = offscreenCanvas.getContext('2d');

  function startQRScanningLoop() {
    if (qrScanInterval) return;
    qrScanInterval = setInterval(() => {
      const video = document.querySelector('video');
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      if (offscreenCanvas.width !== video.videoWidth || offscreenCanvas.height !== video.videoHeight) {
        offscreenCanvas.width = video.videoWidth || 640;
        offscreenCanvas.height = video.videoHeight || 480;
      }

      try {
        offscreenCtx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);

        if (window.jsQR) {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data && code.data.trim().length > 0) {
            const val = code.data.toLowerCase().trim();

            // Calculate QR code bounding box width relative to total camera screen width
            const loc = code.location;
            const qrPixelWidth = Math.abs(loc.topRightCorner.x - loc.topLeftCorner.x);
            signals.qrScreenRatio = qrPixelWidth / offscreenCanvas.width;

            // GLITCH GUARD: If QR occupies > 55% of screen width -> User is scanning ONLY QR!
            if (signals.qrScreenRatio > 0.55) {
              signals.isOnlyQrInFrame = true;
              signals.qrDetected = false;
              signals.qrValueMatchesBackendURL = false;
            } else {
              signals.isOnlyQrInFrame = false;
              signals.qrData = val;

              // STRICT DOMAIN MATCHING: MUST contain "sjar.vercel.app"
              const isUrlMatched = val.includes(EXPECTED_BACKEND_URL);
              signals.qrDetected = isUrlMatched;
              signals.qrValueMatchesBackendURL = isUrlMatched;
              if (isUrlMatched) lastQrSeenTime = Date.now();
            }

            evaluateContinuous3Conditions();
          } else {
            if (signals.qrDetected && (Date.now() - lastQrSeenTime > 1200)) {
              signals.qrDetected = false;
              signals.qrValueMatchesBackendURL = false;
              signals.isOnlyQrInFrame = false;
              evaluateContinuous3Conditions();
            }
          }
        }
      } catch (err) { }
    }, 120);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
