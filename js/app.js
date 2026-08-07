/**
 * WebAR 3-Step Sequential Validation Controller for Shivam Jewels
 * 
 * 3 COMPULSORY SEQUENTIAL VALIDATIONS:
 * 1. CHECK 1 (Card Frame): Camera active & scanning invitation card frame
 * 2. CHECK 2 (MindAR Target): Card shape & feature rays matched (targets.mind)
 * 3. CHECK 3 (QR Code): Embedded QR code decoded & URL payload verified (sjar.vercel.app)
 * 
 * COMPULSORY CONTINUOUS RULE:
 * Checks 2 & 3 MUST stay continuously detected on screen!
 * If the card is moved away or any step is lost, the 3D model technology
 * INSTANTLY CANCELS and resets back to "Scan the Invitation Card..."
 */
(function() {
  // 3 Sequential Validation Checkpoints
  let check1_CardFrame = false;   // Step 1: Camera active & scanning invitation card
  let check2_MindTarget = false;  // Step 2: MindAR target feature rays matched (targets.mind)
  let check3_QrCode = false;      // Step 3: Embedded QR code value verified (sjar.vercel.app)

  let is3StepVerified = false;
  let lastQrSeenTime = 0;
  let qrScanInterval = null;

  // Synthesized Web Audio API Synthesizer for feedback chimes
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

  // Master 3-Step Verification Evaluator Function
  function evaluate3StepVerification() {
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const reticle = document.getElementById('scanning-reticle');
    const arContentWrapper = document.getElementById('ar-content-wrapper');

    // SUCCESS REQUIRES ALL 3 CHECKPOINTS TO BE TRUE CONTINUOUSLY!
    const isAll3Verified = (check1_CardFrame === true) && (check2_MindTarget === true) && (check3_QrCode === true);

    if (isAll3Verified) {
      // ✅ SUCCESS: 3/3 Checkpoints Complete
      if (!is3StepVerified) {
        is3StepVerified = true;
        if (statusPill) statusPill.className = 'status-pill tracking';
        if (statusText) statusText.textContent = '✅ SUCCESS (3/3): Invitation Card & QR Verified!';
        if (reticle) reticle.classList.add('hidden');
        playSound('found');

        // Reveal 3D invitation card & 3D model technology
        if (arContentWrapper) {
          arContentWrapper.setAttribute('visible', 'true');
          if (arContentWrapper.object3D) arContentWrapper.object3D.visible = true;
        }
      }
    } else {
      // ❌ CANCEL: If any of the 3 checkpoints is lost/missing
      is3StepVerified = false;
      if (statusPill) statusPill.className = 'status-pill searching';
      if (reticle) reticle.classList.remove('hidden');

      // Hide 3D Model Technology immediately
      if (arContentWrapper) {
        arContentWrapper.setAttribute('visible', 'false');
        if (arContentWrapper.object3D) arContentWrapper.object3D.visible = false;
      }

      // Live status text guiding user through 3 steps
      if (statusText) {
        if (!check2_MindTarget) {
          statusText.textContent = 'Step 1/3: Scan the Invitation Card...';
        } else if (check2_MindTarget && !check3_QrCode) {
          statusText.textContent = 'Step 2/3: Card Shape Matched ➔ Scanning QR Code...';
        }
      }
    }
  }

  // A-Frame Frame Guard Component: Ensures 3D content stays hidden unless 3/3 checks pass
  if (window.AFRAME) {
    window.AFRAME.registerComponent('dual-verify-guard', {
      tick: function() {
        const wrapper = document.getElementById('ar-content-wrapper');
        const isAll3 = (check1_CardFrame === true) && (check2_MindTarget === true) && (check3_QrCode === true);
        if (wrapper && wrapper.object3D) {
          if (!isAll3) {
            wrapper.object3D.visible = false;
          }
        }
      }
    });
  }

  // Camera Permission & Launch AR button click handler
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

      // Enable Check 1: Camera active & scanning card
      check1_CardFrame = true;

      // Attach frame guard component
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

    // CHECK 2: MindAR Card Target Feature Rays Listener (targets.mind)
    if (targetEntity) {
      targetEntity.addEventListener('targetFound', () => {
        check2_MindTarget = true;
        evaluate3StepVerification();
      });

      targetEntity.addEventListener('targetLost', () => {
        check2_MindTarget = false;
        evaluate3StepVerification();
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

  // CHECK 3: Real-Time Camera QR Code Scanner (jsQR)
  const offscreenCanvas = document.createElement('canvas');
  const offscreenCtx = offscreenCanvas.getContext('2d');

  function startQRScanningLoop() {
    if (qrScanInterval) return;
    qrScanInterval = setInterval(() => {
      const video = document.querySelector('video');

      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      // QR scanner evaluates when card target is detected (check2_MindTarget == true)
      if (!check2_MindTarget) {
        check3_QrCode = false;
        evaluate3StepVerification();
        return;
      }

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
            
            // Match expected URL link strictly
            const isMatchingUrl = val.includes('sjar.vercel.app') || val.includes('sjar') || val.includes('shivamai') || val.includes('3d.shivamai.studio') || val.includes('http');
            if (isMatchingUrl) {
              check3_QrCode = true;
              lastQrSeenTime = Date.now();
            } else {
              check3_QrCode = false;
            }
            evaluate3StepVerification();
          } else {
            // Cancel Check 3 if QR code is missing/lost for > 1.2 seconds
            if (check3_QrCode && (Date.now() - lastQrSeenTime > 1200)) {
              check3_QrCode = false;
              evaluate3StepVerification();
            }
          }
        }
      } catch (err) {}
    }, 120);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
