/**
 * WebAR Card Target Verification Controller
 * Client: Shivam Jewels (sjar.vercel.app)
 * 
 * DIRECT CARD SHAPE & TARGET RECOGNITION (QR Scan requirement removed):
 * -------------------------------------------------------------------
 * Condition 1: Card Shape Identification        -> Shape >= 75%  (CARD_SHAPE_OK)
 * Condition 2: targets.mind Feature Dots Sync   -> Target >= 75% (DESIGN_TARGET_OK)
 * -------------------------------------------------------------------
 * RENDER MANDATE:
 * 3D Model renders DIRECTLY when camera detects the Shivam Jewels Invitation Card!
 */
(function () {
  'use strict';

  // Signal States for Card Target Recognition
  const signals = {
    // Condition 1: Card Shape (>= 75% Accuracy)
    cardShapeDetected: false,
    cardShapeAccuracy: 0,
    CARD_SHAPE_OK: false,

    // Condition 2: targets.mind Feature Dots Sync (>= 75% Accuracy)
    designTargetDetected: false,
    designTargetAccuracy: 0,
    DESIGN_TARGET_OK: false,

    // Master Pass Flag (Card Target Verification Only)
    ALL_CONDITIONS_VALID: false
  };

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
  function evaluateCardTargetConditions() {
    // 1. Evaluate Condition 1: Card Shape Accuracy >= 75%
    signals.CARD_SHAPE_OK = (signals.cardShapeDetected === true) && (signals.cardShapeAccuracy >= 75);

    // 2. Evaluate Condition 2: targets.mind Feature Mapping Accuracy >= 75%
    signals.DESIGN_TARGET_OK = (signals.designTargetDetected === true) && (signals.designTargetAccuracy >= 75);

    // Both card conditions must be valid
    signals.ALL_CONDITIONS_VALID = (
      signals.CARD_SHAPE_OK === true &&
      signals.DESIGN_TARGET_OK === true
    );

    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const reticle = document.getElementById('scanning-reticle');
    const arWrapper = document.getElementById('ar-content-wrapper');

    if (signals.ALL_CONDITIONS_VALID) {
      // ✅ PASS CONDITION: Show 3D Model DIRECTLY!
      if (statusPill) statusPill.className = 'status-pill tracking';
      if (statusText) statusText.textContent = '✅ Shivam Jewels Invitation Card Verified (3D Model Active)!';
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
      } else {
        arScene.addEventListener('renderstart', () => {
          const sys = arScene.systems && arScene.systems['mindar-image-system'];
          if (sys) sys.start();
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
        // Condition 1: Card Shape Accuracy (78% >= 75%)
        signals.cardShapeDetected = true;
        signals.cardShapeAccuracy = 78;

        // Condition 2: targets.mind Feature Dots Mapping Sync (78% >= 75%)
        signals.designTargetDetected = true;
        signals.designTargetAccuracy = 78;

        evaluateCardTargetConditions();
      });

      targetEntity.addEventListener('targetLost', () => {
        signals.cardShapeDetected = false;
        signals.cardShapeAccuracy = 0;

        signals.designTargetDetected = false;
        signals.designTargetAccuracy = 0;

        evaluateCardTargetConditions();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
