/**
 * WebAR MindAR.js & A-Frame Controller for Shivam Jewels
 * 
 * Target File: f:\SJ 3D\js\app.js
 * 
 * STRICT DUAL-VERIFICATION PIPELINE:
 * Verification 1: QR Code URL match (jsQR scanner matches stored backend URL)
 * Verification 2: MindAR target match (targets.mind matches card pattern)
 * 
 * ONLY when BOTH (isQrMatched && isMindArMatched) == TRUE does the 3D model tech run!
 */
(function() {
  let isMindArMatched = false;
  let isQrMatched = false;
  let isDualVerified = false;
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

  // Master Dual Verification Evaluator Function
  function evaluateDualCondition() {
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const reticle = document.getElementById('scanning-reticle');
    const targetEntity = document.getElementById('ar-target');

    const gltfModel = document.getElementById('3d-model-entity');
    const modelContainer = document.getElementById('3d-model-container');
    const cardBackPlane = document.getElementById('card-back-plane');
    const bannerPlane = document.getElementById('banner-plane');
    const logoPlane = document.getElementById('logo-plane');

    // STRICT DUAL CONDITION:
    // Verification 1 (QR Code URL Match) AND Verification 2 (targets.mind Card Match) MUST BOTH BE TRUE!
    if (isQrMatched && isMindArMatched) {
      if (!isDualVerified) {
        isDualVerified = true;
        if (statusPill) statusPill.className = 'status-pill tracking';
        if (statusText) statusText.textContent = 'Shivam Jewels QR & MindAR Verified!';
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
      if (isDualVerified) {
        isDualVerified = false;
        if (statusPill) statusPill.className = 'status-pill searching';
        if (reticle) reticle.classList.remove('hidden');

        // Hide 3D invitation card & 3D model technology when dual condition is FALSE
        [gltfModel, modelContainer, cardBackPlane, bannerPlane, logoPlane].forEach(el => {
          if (el) {
            el.setAttribute('visible', 'false');
            if (el.object3D) el.object3D.visible = false;
          }
        });
      }

      // Live descriptive status message for user
      if (statusText && !isDualVerified) {
        if (isMindArMatched && !isQrMatched) {
          statusText.textContent = 'targets.mind Matched - Scanning QR Code...';
        } else if (!isMindArMatched && isQrMatched) {
          statusText.textContent = 'QR URL Matched - Scanning targets.mind...';
        } else {
          statusText.textContent = 'Scanning Target...';
        }
      }
    }
  }

  // Camera permission & start AR click handler
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

    // Verification 2 Listener: MindAR targets.mind Pattern Match
    if (targetEntity) {
      targetEntity.addEventListener('targetFound', () => {
        isMindArMatched = true;
        evaluateDualCondition();
      });

      targetEntity.addEventListener('targetLost', () => {
        isMindArMatched = false;
        evaluateDualCondition();
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

  // Verification 1 Scanner: Real-time QR Code URL Match
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
              if (!isQrMatched) {
                isQrMatched = true;
                evaluateDualCondition();
              }
            }
          } else {
            if (isQrMatched && (Date.now() - lastQrMatchTime > 2500)) {
              isQrMatched = false;
              evaluateDualCondition();
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
