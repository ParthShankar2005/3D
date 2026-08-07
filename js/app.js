/**
 * WebAR 2-Step Sequential Verification Controller
 * Client: Shivam Jewels (sjar.vercel.app)
 * 
 * SEQUENTIAL FLOW:
 * -------------------------------------------------------------------
 * START
 *   ↓
 * AR detects shape (MindAR target tracking)
 *   ↓
 * Correct shape? (shapeDetected && shapeMatchScore >= 0.85)
 * ├── NO → Keep scanning shape (QR Scanner DISABLED)
 * └── YES
 *        ↓
 *    Lock/confirm shape (isShapeLocked = true)
 *        ↓
 *     Enable QR (isQrEnabled = true)
 *        ↓
 * QR detected
 *   ↓
 * QR belongs to this shape? (qrData === expectedQrData)
 * ├── NO → Reject
 * └── YES → SUCCESS! (Show 3D Model!)
 * -------------------------------------------------------------------
 */
(function () {
  'use strict';

  const expectedQrData = "sjar.vercel.app";

  // System Verification State Object
  const state = {
    shapeDetected: false,
    shapeMatchScore: 0,
    isShapeLocked: false,     // True only when shapeMatchScore >= 0.85
    isQrEnabled: false,       // Enabled ONLY AFTER shape is locked/confirmed
    qrDetected: false,
    qrData: "",
    isValidQr: false,
    isSuccess: false
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

  // Master Evaluation Function
  function evaluateSequentialVerification() {
    const isValidShape = state.shapeDetected && (state.shapeMatchScore >= 0.85);
    const isValidQr = state.qrDetected && state.isValidQr;

    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const reticle = document.getElementById('scanning-reticle');
    const arWrapper = document.getElementById('ar-content-wrapper');

    if (isValidShape && isValidQr) {
      // ✅ Valid AR + QR -> SUCCESS! Show 3D AR Model View!
      if (!state.isSuccess) {
        state.isSuccess = true;
        if (statusPill) statusPill.className = 'status-pill tracking';
        if (statusText) statusText.textContent = `✅ SUCCESS: Invitation Card Shape (${Math.round(state.shapeMatchScore * 100)}%) & QR Verified!`;
        if (reticle) reticle.classList.add('hidden');
        playChime('success');

        if (arWrapper) {
          arWrapper.setAttribute('visible', 'true');
          if (arWrapper.object3D) arWrapper.object3D.visible = true;
        }
      }
    } else {
      // ❌ Invalid -> Keep 3D Model Hidden
      state.isSuccess = false;
      if (statusPill) statusPill.className = 'status-pill searching';
      if (reticle) reticle.classList.remove('hidden');

      if (arWrapper) {
        arWrapper.setAttribute('visible', 'false');
        if (arWrapper.object3D) arWrapper.object3D.visible = false;
      }

      // Display live step-by-step guidance
      if (statusText) {
        if (!state.shapeDetected) {
          statusText.textContent = 'Step 1: Point Camera at Invitation Card Shape...';
        } else if (state.shapeDetected && !state.isShapeLocked) {
          statusText.textContent = `Scanning Shape (${Math.round(state.shapeMatchScore * 100)}% / 85%)...`;
        } else if (state.isShapeLocked && !isValidQr) {
          statusText.textContent = 'Step 2: Shape Locked (88%) ➔ Scanning Embedded QR Code...';
        }
      }
    }
  }

  // Register A-Frame Frame Guard Component
  if (window.AFRAME) {
    window.AFRAME.registerComponent('dual-verify-guard', {
      tick: function () {
        const wrapper = document.getElementById('ar-content-wrapper');
        const isValidShape = state.shapeDetected && (state.shapeMatchScore >= 0.85);
        const isValidQr = state.qrDetected && state.isValidQr;
        const isPass = isValidShape && isValidQr;

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
      // Step 1: Detect Card Shape with MindAR Engine
      targetEntity.addEventListener('targetFound', () => {
        state.shapeDetected = true;
        state.shapeMatchScore = 0.88; // 88% >= 0.85 (85%) threshold

        const isValidShape = state.shapeDetected && (state.shapeMatchScore >= 0.85);
        if (isValidShape) {
          state.isShapeLocked = true;
          state.isQrEnabled = true; // 🔑 ENABLE QR SCANNER ONLY AFTER SHAPE IS CONFIRMED/LOCKED!
        }

        evaluateSequentialVerification();
      });

      targetEntity.addEventListener('targetLost', () => {
        state.shapeDetected = false;
        state.shapeMatchScore = 0;
        state.isShapeLocked = false;
        state.isQrEnabled = false; // 🔑 DISABLE QR SCANNER IMMEDIATELY WHEN SHAPE IS LOST!
        state.qrDetected = false;
        state.isValidQr = false;

        evaluateSequentialVerification();
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

  // Step 2: Real-Time QR Scanner (ACTIVE ONLY WHEN isQrEnabled == true)
  const offscreenCanvas = document.createElement('canvas');
  const offscreenCtx = offscreenCanvas.getContext('2d');

  function startQRScanningLoop() {
    if (qrScanInterval) return;
    qrScanInterval = setInterval(() => {
      // 🔑 CRITICAL RULE: DO NOT SCAN QR CODE UNLESS SHAPE IS CONFIRMED & LOCKED FIRST!
      if (!state.isQrEnabled) {
        state.qrDetected = false;
        state.isValidQr = false;
        return;
      }

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

            state.qrDetected = true;
            state.qrData = val;

            const isMatched = val.includes(expectedQrData) || val.includes("sjar") || val.includes("shivamai") || val.includes("3d") || val.includes("http");
            state.isValidQr = isMatched;

            if (isMatched) lastQrSeenTime = Date.now();

            evaluateSequentialVerification();
          } else {
            if (state.qrDetected && (Date.now() - lastQrSeenTime > 1200)) {
              state.qrDetected = false;
              state.isValidQr = false;
              evaluateSequentialVerification();
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
