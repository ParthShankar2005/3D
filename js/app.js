// WebAR MindAR.js & A-Frame Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const reticle = document.getElementById('scanning-reticle');
  const arScene = document.getElementById('ar-scene');
  const targetEntity = document.getElementById('ar-target');
  const gltfModel = document.getElementById('3d-model-entity');
  // State variables
  let isTracking = false;

  // Synthesized Web Audio API Synthesizer
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
      console.warn("Web Audio API error:", e);
    }
  }

  // Continuous background camera-to-target distance calculator
  function updateDistanceTracking() {
    if (!isTracking) return;
    const camera = document.querySelector('a-camera');
    if (camera && targetEntity && targetEntity.object3D) {
      const camPos = camera.object3D.position;
      const targetPos = targetEntity.object3D.position;
      const dist = camPos.distanceTo(targetPos);

      if (dist > 0.01) {
        statusText.textContent = `Shivam Jewels QR Matched (${dist.toFixed(2)}m)`;
      }
    }
  }

  setInterval(updateDistanceTracking, 200);

  // Set up MindAR Target Event Listeners
  if (targetEntity) {
    targetEntity.addEventListener('targetFound', () => {
      isTracking = true;
      statusPill.className = 'status-pill tracking';
      statusText.textContent = 'Shivam Jewels QR Matched!';
      if (reticle) reticle.classList.add('hidden');
      playSound('found');
    });

    targetEntity.addEventListener('targetLost', () => {
      isTracking = false;
      statusPill.className = 'status-pill searching';
      statusText.textContent = 'Scanning Target...';
      if (reticle) reticle.classList.remove('hidden');
    });
  }

  // Auto-Spin Logic using A-Frame animation component or continuous tick
  function updateSpin() {
    if (gltfModel) {
      if (isSpinning) {
        gltfModel.setAttribute('animation', {
          property: 'rotation',
          to: '0 360 0',
          loop: true,
          dur: 8000,
          easing: 'linear'
        });
      } else {
        gltfModel.removeAttribute('animation');
      }
    }
  }

  // Control Event Listeners
  if (btnSpin) {
    btnSpin.addEventListener('click', () => {
      playSound('click');
      isSpinning = !isSpinning;
      btnSpin.classList.toggle('active', isSpinning);
      updateSpin();
    });
  }

  if (btnColor) {
    btnColor.addEventListener('click', () => {
      playSound('click');
      colorIndex = (colorIndex + 1) % colorPalette.length;
      const targetColor = colorPalette[colorIndex];
      
      // Update mesh material color in A-Frame
      const mesh = gltfModel.getObject3D('mesh');
      if (mesh) {
        mesh.traverse((node) => {
          if (node.isMesh && node.material) {
            node.material.color.setStyle(targetColor);
          }
        });
      }
      btnColor.style.borderColor = targetColor;
    });
  }

  if (btnScaleUp) {
    btnScaleUp.addEventListener('click', () => {
      playSound('click');
      if (currentScale < maxScale) {
        currentScale = Math.min(maxScale, currentScale + scaleStep);
        updateScale();
      }
    });
  }

  if (btnScaleDown) {
    btnScaleDown.addEventListener('click', () => {
      playSound('click');
      if (currentScale > minScale) {
        currentScale = Math.max(minScale, currentScale - scaleStep);
        updateScale();
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      playSound('click');
      currentScale = 0.6;
      colorIndex = 0;
      isSpinning = true;
      if (btnSpin) btnSpin.classList.add('active');
      updateScale();
      updateSpin();
      const mesh = gltfModel.getObject3D('mesh');
      if (mesh) {
        mesh.traverse((node) => {
          if (node.isMesh && node.material) {
            node.material.color.setStyle('#ffffff');
          }
        });
      }
    });
  }

  function updateScale() {
    if (gltfModel) {
      gltfModel.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);
    }
  }

    });
  }
  // Real-time Camera QR Code Scanner using jsQR
  let qrScanInterval = null;
  const offscreenCanvas = document.createElement('canvas');
  const offscreenCtx = offscreenCanvas.getContext('2d');
  let lastQrMatchTime = 0;

  function startQRScanningLoop() {
    if (qrScanInterval) return;
    console.log("Starting real-time camera QR scanner loop...");

    qrScanInterval = setInterval(() => {
      if (isOrbitMode) return;

      const video = document.querySelector('video');
      if (!video || video.readyState < 2) return;

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
            console.log("QR Code decoded from camera:", val);
            
            // Match website link or target domain strictly
            const isMatchingUrl = val.includes('sjar.vercel.app') || val.includes('sjar') || val.includes('shivamai') || val.includes('3d.shivamai.studio');
            if (isMatchingUrl) {
              lastQrMatchTime = Date.now();

              if (!isTracking) {
                isTracking = true;
                statusPill.className = 'status-pill tracking';
                statusText.textContent = 'QR Code Scanned!';
                if (reticle) reticle.classList.add('hidden');
                playSound('found');

                if (gltfModel) {
                  gltfModel.setAttribute('visible', 'true');
                }
                if (targetEntity) {
                  targetEntity.object3D.visible = true;
                }
              }
            }
          } else {
            // Clear tracking status if QR is no longer visible and MindAR anchor isn't tracking
            if (isTracking && (Date.now() - lastQrMatchTime > 3000)) {
              const isMindARTracking = targetEntity && targetEntity.object3D && targetEntity.object3D.visible;
              if (!isMindARTracking) {
                isTracking = false;
                statusPill.className = 'status-pill searching';
                statusText.textContent = 'Scanning Target...';
                if (reticle) reticle.classList.remove('hidden');
              }
            }
          }
        }
      } catch (err) {
        // Ignore cross-origin canvas error if any
      }
    }, 150);
  }

  // Modal actions - Trigger instant camera permission request on user click gesture
  const btnStartAr = document.getElementById('btn-start-ar');
  const modalOverlay = document.getElementById('permission-modal');
  if (btnStartAr && modalOverlay) {
    btnStartAr.addEventListener('click', function(e) {
      if (e) e.preventDefault();
      console.log("Allow Camera button tapped by user.");

      try {
        playSound('click');
      } catch (aErr) {}

      // Synchronously request camera permission on user gesture (iOS Safari & Android Chrome standard)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          .then((tempStream) => {
            console.log("Camera permission granted on first tap!");
            tempStream.getTracks().forEach(track => track.stop());

            modalOverlay.classList.add('hidden');
            if (reticle) reticle.classList.remove('hidden');

            const arSystem = arScene.systems && arScene.systems['mindar-image-system'];
            if (arSystem) {
              arSystem.start();
              startQRScanningLoop();
            } else {
              arScene.addEventListener('renderstart', () => {
                const sys = arScene.systems['mindar-image-system'];
                if (sys) sys.start();
                startQRScanningLoop();
              }, { once: true });
            }
          })
          .catch((err) => {
            console.error("Camera permission denied:", err);
            alert("Camera permission is required for WebAR. Please allow camera access in your mobile browser settings.");
          });
      } else {
        modalOverlay.classList.add('hidden');
        if (reticle) reticle.classList.remove('hidden');
        const arSystem = arScene.systems && arScene.systems['mindar-image-system'];
        if (arSystem) {
          arSystem.start();
          startQRScanningLoop();
        }
      }
    });
  }
});
