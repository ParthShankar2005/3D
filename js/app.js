/**
 * WebAR MindAR.js Controller for Shivam Jewels
 * 
 * Image Target Tracking for Full Invitation Card (Shivam_Jewels_Invitation_Card.png)
 * 
 * MindAR tracks the pattern of feature rays across the full invitation card image
 * and renders the 3D card back, tilted banner (-20°), upside logo (2.1x), and rotating
 * 3D diamond ring scaled to the card size.
 */
(function() {
  let isTracking = false;
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

  // Global click handler for Allow Camera & Start WebAR button
  window.handleStartARClick = function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const modalOverlay = document.getElementById('permission-modal');
    const reticle = document.getElementById('scanning-reticle');
    const arScene = document.getElementById('ar-scene');

    // Hide permission modal and reveal scanning reticle
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
      modalOverlay.classList.add('hidden');
    }
    if (reticle) {
      reticle.classList.remove('hidden');
      reticle.style.display = 'flex';
    }

    try { playSound('click'); } catch (err) {}

    // Launch MindAR camera system & QR scanner loop
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

    // Request camera permission synchronously on user tap gesture
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
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const reticle = document.getElementById('scanning-reticle');
    const targetEntity = document.getElementById('ar-target');

    // Real-time camera-to-target distance tracking
    function updateDistanceTracking() {
      if (!isTracking) return;
      const camera = document.querySelector('a-camera');
      if (camera && targetEntity && targetEntity.object3D) {
        const camPos = camera.object3D.position;
        const targetPos = targetEntity.object3D.position;
        const dist = camPos.distanceTo(targetPos);

        if (dist > 0.01 && statusText) {
          statusText.textContent = `Shivam Jewels Card Matched (${dist.toFixed(2)}m)`;
        }
      }
    }

    setInterval(updateDistanceTracking, 200);

    // MindAR Target tracking event listeners (Fires when scanning full invitation card image)
    if (targetEntity) {
      targetEntity.addEventListener('targetFound', () => {
        isTracking = true;
        if (statusPill) statusPill.className = 'status-pill tracking';
        if (statusText) statusText.textContent = 'Shivam Jewels Invitation Card Matched!';
        if (reticle) reticle.classList.add('hidden');
        playSound('found');

        // Reveal 3D invitation card elements scaled to the full card size
        const gltfModel = document.getElementById('3d-model-entity');
        const modelContainer = document.getElementById('3d-model-container');
        const cardBackPlane = document.getElementById('card-back-plane');
        const bannerPlane = document.getElementById('banner-plane');
        const logoPlane = document.getElementById('logo-plane');
        
        [gltfModel, modelContainer, cardBackPlane, bannerPlane, logoPlane].forEach(el => {
          if (el) {
            el.setAttribute('visible', 'true');
            if (el.object3D) el.object3D.visible = true;
          }
        });
        if (targetEntity.object3D) targetEntity.object3D.visible = true;
      });

      targetEntity.addEventListener('targetLost', () => {
        isTracking = false;
        if (statusPill) statusPill.className = 'status-pill searching';
        if (statusText) statusText.textContent = 'Scanning Invitation Card...';
        if (reticle) reticle.classList.remove('hidden');

        // Hide 3D invitation card elements when target lost
        const gltfModel = document.getElementById('3d-model-entity');
        const modelContainer = document.getElementById('3d-model-container');
        const cardBackPlane = document.getElementById('card-back-plane');
        const bannerPlane = document.getElementById('banner-plane');
        const logoPlane = document.getElementById('logo-plane');
        
        [gltfModel, modelContainer, cardBackPlane, bannerPlane, logoPlane].forEach(el => {
          if (el) {
            el.setAttribute('visible', 'false');
            if (el.object3D) el.object3D.visible = false;
          }
        });
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

  // Auxiliary QR Scanner (Updates status if QR detected before full target alignment)
  const offscreenCanvas = document.createElement('canvas');
  const offscreenCtx = offscreenCanvas.getContext('2d');

  function startQRScanningLoop() {
    if (qrScanInterval) return;
    qrScanInterval = setInterval(() => {
      const video = document.querySelector('video');
      const statusText = document.getElementById('status-text');

      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA || isTracking) return;

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

          if (code && code.data && code.data.trim().length > 0 && statusText) {
            statusText.textContent = "QR Code Detected - Align Full Card...";
          }
        }
      } catch (err) {}
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
