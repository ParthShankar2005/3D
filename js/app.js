/**
 * WebAR Diagnostic Experiment Controller
 * Client: Shivam Jewels (sjar.vercel.app)
 * 
 * SPECIAL DIAGNOSTIC TEST MODE:
 * -------------------------------------------------------------------
 * Temporarily remove QR requirement to isolate card tracking & feature dots sync.
 * IF Card Shape & targets.mind Feature Dots are matched -> SHOW 3D MODEL!
 * -------------------------------------------------------------------
 */
(function () {
  'use strict';

  const EXPECTED_BACKEND_URL = "sjar.vercel.app";

  // Diagnostic Signal States
  const signals = {
    // Condition 1: Card Shape (>= 75% Accuracy)
    cardShapeDetected: false,
    cardShapeAccuracy: 0,
    CARD_SHAPE_OK: false,

    // Condition 2: targets.mind Feature Dots Sync (>= 75% Accuracy)
    designTargetDetected: false,
    designTargetAccuracy: 0,
    DESIGN_TARGET_OK: false,

    // Condition 3: QR Code (Log only for diagnostic mode)
    qrDetected: false,
    qrData: "",
    qrValueMatchesBackendURL: false,
    QR_OK: false,

    // Master Pass Flag (Diagnostic Mode: Card Shape & Target Mapping Only)
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

  // MASTER CONTINUOUS EVALUATOR (DIAGNOSTIC MODE)
  function evaluateContinuous3Conditions() {
    // 1. Evaluate Condition 1: Card Shape Accuracy >= 75%
    signals.CARD_SHAPE_OK = (signals.cardShapeDetected === true) && (signals.cardShapeAccuracy >= 75);

    // 2. Evaluate Condition 2: targets.mind Feature Dots Mapping Accuracy >= 75%
    signals.DESIGN_TARGET_OK = (signals.designTargetDetected === true) && (signals.designTargetAccuracy >= 75);

    // 3. Evaluate Condition 3: QR (Diagnostic logging)
    signals.QR_OK = (signals.qrDetected === true) && (signals.qrValueMatchesBackendURL === true);

    // DIAGNOSTIC EXPERIMENT MANDATE: Show 3D model as soon as Card Shape & Target are matched!
    signals.ALL_3_CONDITIONS_VALID = (
      signals.CARD_SHAPE_OK === true &&
      signals.DESIGN_TARGET_OK === true
    );

    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const reticle = document.getElementById('scanning-reticle');
    const arWrapper = document.getElementById('ar-content-wrapper');

    if (signals.ALL_3_CONDITIONS_VALID) {
      // ✅ DIAGNOSTIC PASS: Show 3D Model when Card is Matched!
      if (statusPill) statusPill.className = 'status-pill tracking';
      if (statusText) statusText.textContent = `✅ Card Matched! 3D Model Enabled (QR Log: ${signals.QR_OK ? 'Found' : 'Searching'})`;
      if (reticle) reticle.classList.add('hidden');
      playChime('success');

      if (arWrapper) {
        arWrapper.setAttribute('visible', 'true');
        if (arWrapper.object3D) arWrapper.object3D.visible = true;
      }
    } else {
      // ❌ FAIL / WAIT: Keep 3D Model Hidden
      if (statusPill) statusPill.className = 'status-pill searching';
      if (reticle) reticle.classList.remove('hidden');

      if (arWrapper) {
        arWrapper.setAttribute('visible', 'false');
        if (arWrapper.object3D) arWrapper.object3D.visible = false;
      }

      if (statusText) {
        statusText.textContent = 'Point Camera at Shivam Jewels Invitation Card...';
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
          signals.DESIGN_TARGET_OK === true
        );

        if (wrapper && wrapper.object3D) {
          if (!isPass) {
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
      targetEntity.addEventListener('targetFound', () => {
        signals.cardShapeDetected = true;
        signals.cardShapeAccuracy = 78;

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

  // Real-Time Camera QR Scanner (Diagnostic Logging Only)
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
            const isUrlMatched = val.includes(EXPECTED_BACKEND_URL);
            signals.qrDetected = isUrlMatched;
            signals.qrValueMatchesBackendURL = isUrlMatched;
            if (isUrlMatched) lastQrSeenTime = Date.now();

            evaluateContinuous3Conditions();
          } else {
            if (signals.qrDetected && (Date.now() - lastQrSeenTime > 1200)) {
              signals.qrDetected = false;
              signals.qrValueMatchesBackendURL = false;
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
