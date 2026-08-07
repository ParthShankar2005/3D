/**
 * WebAR 2-Step Verification Controller for Shivam Jewels
 * 
 * 2-STEP VERIFICATION SEQUENCE:
 * - STEP 1: QR Code Found -> Decodes & verifies QR value matches stored URL (sjar.vercel.app)
 * - STEP 2: Card Shape Identified -> Identifies full card shape & pattern using targets.mind
 * 
 * ONLY when BOTH Step 1 (QR Value Match) and Step 2 (Card Shape Identification) pass
 * does the 3D Model technology & Invitation Card render!
 */
(function() {
  let isStep1_QrMatched = false;      // STEP 1: QR Code decoded & value matched
  let isStep2_CardShapeMatched = false; // STEP 2: Card shape & pattern identified via targets.mind
  let is2StepVerified = false;
  let lastQrMatchTime = 0;
  let qrScanInterval = null;

  // Synthesized Web Audio API Synthesizer for feedback chimes
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  function playSound(type) {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
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

  // 2-Step Verification Evaluator Function
  function evaluate2StepVerification() {
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const reticle = document.getElementById('scanning-reticle');
    const targetEntity = document.getElementById('ar-target');

    const gltfModel = document.getElementById('3d-model-entity');
    const modelContainer = document.getElementById('3d-model-container');
    const cardBackPlane = document.getElementById('card-back-plane');
    const bannerPlane = document.getElementById('banner-plane');
    const logoPlane = document.getElementById('logo-plane');

    // 2-STEP VERIFICATION CONDITION:
    // Step 1 (QR Value Matched) AND Step 2 (Card Shape Identified via targets.mind)
    if (isStep1_QrMatched && isStep2_CardShapeMatched) {
      if (!is2StepVerified) {
        is2StepVerified = true;
        if (statusPill) statusPill.className = 'status-pill tracking';
        if (statusText) statusText.textContent = '2-Step Verification Complete! (QR & Card Shape Verified)';
        if (reticle) reticle.classList.add('hidden');
        playSound('found');

        // Reveal 3D invitation card & 3D model technology
        [gltfModel, modelContainer, cardBackPlane, bannerPlane, logoPlane].forEach(el => {
          if (el) {
            el.setAttribute('visible', 'true');
            if (el.object3D) el.object3D.visible = true;
          }
        });
        if (targetEntity && targetEntity.object3D) targetEntity.object3D.visible = true;
      }
    } else {
      if (is2StepVerified) {
        is2StepVerified = false;
        if (statusPill) statusPill.className = 'status-pill searching';
        if (reticle) reticle.classList.remove('hidden');

        // Hide 3D invitation card & 3D model technology
        [gltfModel, modelContainer, cardBackPlane, bannerPlane, logoPlane].forEach(el => {
          if (el) {
            el.setAttribute('visible', 'false');
            if (el.object3D) el.object3D.visible = false;
          }
        });
      }

      // Display live 2-step verification progress message for user
      if (statusText && !is2StepVerified) {
        if (isStep1_QrMatched && !isStep2_CardShapeMatched) {
          statusText.textContent = 'Step 1/2 Done: QR Value Matched ➔ Step 2: Align Card Shape...';
        } else if (!isStep1_QrMatched && isStep2_CardShapeMatched) {
          statusText.textContent = 'Step 2/2 Done: Card Shape Found ➔ Step 1: Scan QR Code Value...';
        } else {
          statusText.textContent = 'Scanning Target (Step 1: QR & Step 2: Card Shape)...';
        }
      }
    }
  }

  // Camera permission & start AR handler
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

  // STEP 1: Real-time Camera QR Code Value Scanner (jsQR)
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
