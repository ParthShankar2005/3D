/**
 * WebAR 2-Step Verification Controller for Shivam Jewels
 * 
 * 2-STEP VERIFICATION MANDATE:
 * - STEP 1: QR Code Value Match (jsQR decodes camera feed & matches stored URL)
 * - STEP 2: Card Shape & Pattern Match (MindAR identifies full card shape from targets.mind)
 * 
 * CRITICAL RULE: If ONLY the QR code is scanned without Step 2, OR if ONLY the card shape is seen without Step 1,
 * the 3D model technology STAYS COMPLETELY HIDDEN (FALSE CONDITION).
 * 
 * ONLY when (Step 1 AND Step 2) ARE BOTH TRUE does the 3D model tech activate!
 */
(function() {
  let isStep1_QrMatched = false;        // Step 1: QR Code Value Matched
  let isStep2_CardShapeMatched = false; // Step 2: Card Shape & Target Pattern Matched
  let is2StepVerified = false;
  let lastQrMatchTime = 0;
  let qrScanInterval = null;

  // Web Audio API Chime Synthesizer
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  function playSound(type) {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;
      if (type === 'found') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'click') {
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

  // Master 2-Step Gatekeeper Evaluator
  function evaluate2StepVerification() {
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const reticle = document.getElementById('scanning-reticle');
    const arContentWrapper = document.getElementById('ar-content-wrapper');

    // BOTH CONDITIONS MUST BE TRUE SIMULTANEOUSLY!
    const isBothVerified = (isStep1_QrMatched === true) && (isStep2_CardShapeMatched === true);

    if (isBothVerified) {
      // ✅ TRUE CONDITION: Both QR Code & Card Shape Verified
      if (!is2StepVerified) {
        is2StepVerified = true;
        if (statusPill) statusPill.className = 'status-pill tracking';
        if (statusText) statusText.textContent = '2-Step Verification Complete! (QR & Card Shape Verified)';
        if (reticle) reticle.classList.add('hidden');
        playSound('found');

        // Reveal the 3D content wrapper
        if (arContentWrapper) {
          arContentWrapper.setAttribute('visible', 'true');
          if (arContentWrapper.object3D) arContentWrapper.object3D.visible = true;
        }
      }
    } else {
      // ❌ FALSE CONDITION: Only QR scanned OR Only Card Shape seen -> HIDE ALL 3D MODEL TECH!
      is2StepVerified = false;
      if (statusPill) statusPill.className = 'status-pill searching';
      if (reticle) reticle.classList.remove('hidden');

      if (arContentWrapper) {
        arContentWrapper.setAttribute('visible', 'false');
        if (arContentWrapper.object3D) arContentWrapper.object3D.visible = false;
      }

      // Display clear progress status message to the user
      if (statusText) {
        if (isStep1_QrMatched && !isStep2_CardShapeMatched) {
          statusText.textContent = 'Step 1/2: QR Code Scanned ➔ Align Full Card Shape...';
        } else if (!isStep1_QrMatched && isStep2_CardShapeMatched) {
          statusText.textContent = 'Step 2/2: Card Shape Found ➔ Scanning QR Code Value...';
        } else {
          statusText.textContent = 'Scanning Target (Step 1: QR & Step 2: Card Shape)...';
        }
      }
    }
  }

  // Register A-Frame Component Guard to enforce strict visibility on every frame render
  if (window.AFRAME) {
    window.AFRAME.registerComponent('dual-verify-guard', {
      tick: function() {
        const wrapper = document.getElementById('ar-content-wrapper');
        const isBothVerified = (isStep1_QrMatched === true) && (isStep2_CardShapeMatched === true);
        if (wrapper && wrapper.object3D) {
          if (!isBothVerified) {
            wrapper.object3D.visible = false;
          }
        }
      }
    });
  }

  // Camera Permission & Start WebAR Click Handler
  window.handleStartARClick = function(e) {
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

    try { playSound('click'); } catch (err) {}

    const launchAR = () => {
      if (!arScene) return;
      
      // Attach dual-verify-guard component to scene
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

    // STEP 2: Card Shape & Pattern Identification Listener (targets.mind)
    if (targetEntity) {
      targetEntity.addEventListener('targetFound', () => {
        isStep2_CardShapeMatched = true;
        evaluate2StepVerification();
      });

      targetEntity.addEventListener('targetLost', () => {
        isStep2_CardShapeMatched = false;
        evaluate2StepVerification();
      });

      // Material enhancer for 3D GLB model
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

  // STEP 1: Real-Time Camera QR Code Value Scanner (jsQR)
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
            
            // Match stored backend URL link strictly
            const isMatchingUrl = val.includes('sjar.vercel.app') || val.includes('sjar') || val.includes('shivamai') || val.includes('3d.shivamai.studio');
            if (isMatchingUrl) {
              lastQrMatchTime = Date.now();
              if (!isStep1_QrMatched) {
                isStep1_QrMatched = true;
                evaluate2StepVerification();
              }
            }
          } else {
            // Reset Step 1 if QR code is no longer detected in camera stream for 2.5 seconds
            if (isStep1_QrMatched && (Date.now() - lastQrMatchTime > 2500)) {
              isStep1_QrMatched = false;
              evaluate2StepVerification();
            }
          }
        }
      } catch (err) {}
    }, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
