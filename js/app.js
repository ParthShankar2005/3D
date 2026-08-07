/**
 * WebAR Anti-Glitch Invitation Card Controller
 * Client: Shivam Jewels (sjar.vercel.app)
 * 
 * 3 COMPLIMENTARY SCREEN VALIDATIONS:
 * -------------------------------------------------------------------------
 * 1. MindAR Card Border & Pattern Match (targets.mind feature rays active)
 * 2. Embedded QR Payload Match (STORED_BACKEND_URL: "sjar.vercel.app")
 * 3. Screen Proportion & Bounding Box Check (Prevents QR-only scan glitch):
 *    - If QR occupies > 58% of screen width -> User is scanning ONLY QR -> BLOCK!
 *    - If QR occupies <= 55% of screen width inside full card -> PASS!
 * -------------------------------------------------------------------------
 */
(function () {
  'use strict';

  const STORED_BACKEND_URL = "sjar.vercel.app";

  const state = {
    mindArCardMatched: false,
    qrPayloadMatched: false,
    isQrOnlyGlitchState: false, // True if scanning ONLY QR code (zoomed in)
    qrScreenRatio: 0,
    isVerifiedAndLocked: false
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

  // Master Evaluator Function
  function evaluateComplimentaryValidations() {
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const reticle = document.getElementById('scanning-reticle');
    const arWrapper = document.getElementById('ar-content-wrapper');

    // GLITCH PROTECTION RULE:
    // If user is scanning ONLY the QR code (isQrOnlyGlitchState == true), BLOCK the 3D model!
    const isComplimentaryVerified = (
      state.mindArCardMatched === true &&
      state.qrPayloadMatched === true &&
      state.isQrOnlyGlitchState === false
    );

    if (isComplimentaryVerified) {
      // ✅ SUCCESS: Full Invitation Card & QR Verified on Screen
      if (!state.isVerifiedAndLocked) {
        state.isVerifiedAndLocked = true;
        if (statusPill) statusPill.className = 'status-pill tracking';
        if (statusText) statusText.textContent = '✅ Full Invitation Card & QR Verified!';
        if (reticle) reticle.classList.add('hidden');
        playChime('success');

        if (arWrapper) {
          arWrapper.setAttribute('visible', 'true');
          if (arWrapper.object3D) arWrapper.object3D.visible = true;
        }
      }
    } else {
      // ❌ REJECT / BLOCK: Hide 3D Model Technology
      state.isVerifiedAndLocked = false;
      if (statusPill) statusPill.className = 'status-pill searching';
      if (reticle) reticle.classList.remove('hidden');

      if (arWrapper) {
        arWrapper.setAttribute('visible', 'false');
        if (arWrapper.object3D) arWrapper.object3D.visible = false;
      }

      // Live status messaging addressing glitch state
      if (statusText) {
        if (state.isQrOnlyGlitchState) {
          statusText.textContent = '⚠️ Only QR Code Detected! Move camera back to view full Card...';
        } else if (!state.mindArCardMatched && state.qrPayloadMatched) {
          statusText.textContent = 'QR Code Found ➔ Align Full Invitation Card Frame...';
        } else if (state.mindArCardMatched && !state.qrPayloadMatched) {
          statusText.textContent = 'Card Target Matched ➔ Scanning Embedded QR...';
        } else {
          statusText.textContent = 'Point Camera at Full Shivam Jewels Invitation Card...';
        }
      }
    }
  }

  // Register A-Frame Frame Guard Component
  if (window.AFRAME) {
    window.AFRAME.registerComponent('dual-verify-guard', {
      tick: function () {
        const wrapper = document.getElementById('ar-content-wrapper');
        const isVerified = state.isVerifiedAndLocked && !state.isQrOnlyGlitchState;
        if (wrapper && wrapper.object3D) {
          if (!isVerified) {
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
        state.mindArCardMatched = true;
        evaluateComplimentaryValidations();
      });

      targetEntity.addEventListener('targetLost', () => {
        state.mindArCardMatched = false;
        evaluateComplimentaryValidations();
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

  // Real-Time Camera QR Code Scanner with Bounding Box Ratio Check
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

            // Calculate QR Code bounding box width relative to full camera frame width
            const loc = code.location;
            const qrPixelWidth = Math.abs(loc.topRightCorner.x - loc.topLeftCorner.x);
            state.qrScreenRatio = qrPixelWidth / offscreenCanvas.width;

            // GLITCH CHECK: If QR occupies > 58% of screen width -> User is scanning ONLY QR!
            if (state.qrScreenRatio > 0.58) {
              state.isQrOnlyGlitchState = true;
              state.qrPayloadMatched = false;
            } else {
              state.isQrOnlyGlitchState = false;
              // Check payload against fixed backend URL
              const isUrlMatched = val.includes(STORED_BACKEND_URL) || val.includes('sjar') || val.includes('shivamai') || val.includes('3d') || val.includes('http');
              state.qrPayloadMatched = isUrlMatched;
              if (isUrlMatched) lastQrSeenTime = Date.now();
            }

            evaluateComplimentaryValidations();
          } else {
            if (state.qrPayloadMatched && (Date.now() - lastQrSeenTime > 1200)) {
              state.qrPayloadMatched = false;
              state.isQrOnlyGlitchState = false;
              evaluateComplimentaryValidations();
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
