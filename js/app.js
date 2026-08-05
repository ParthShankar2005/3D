/**
 * WebAR MindAR.js & A-Frame Controller for Shivam Jewels
 * 
 * Handles camera permission, real-time QR code decoding,
 * MindAR target tracking, and camera-to-target distance calculation.
 */
// Register native 57-Facet Brilliant Diamond component for instant 100% WebGL visibility
if (window.AFRAME) {
  AFRAME.registerComponent('diamond-mesh', {
    init: function () {
      const el = this.el;
      const segments = 16;
      const ang = (2 * Math.PI) / segments;

      const raw_verts = [
        [0.0, -0.85, 0.0] // 0: Culet (Bottom Point)
      ];

      // Lower Pavilion, Pavilion, Girdle Lower, Girdle Upper, Crown, Table
      for (let i = 0; i < segments; i++) raw_verts.push([0.35 * Math.cos(i * ang), -0.5, 0.35 * Math.sin(i * ang)]);
      for (let i = 0; i < segments; i++) raw_verts.push([0.75 * Math.cos((i + 0.5) * ang), -0.2, 0.75 * Math.sin((i + 0.5) * ang)]);
      for (let i = 0; i < segments; i++) raw_verts.push([1.0 * Math.cos(i * ang), -0.02, 1.0 * Math.sin(i * ang)]);
      for (let i = 0; i < segments; i++) raw_verts.push([1.0 * Math.cos(i * ang), 0.02, 1.0 * Math.sin(i * ang)]);
      for (let i = 0; i < segments; i++) raw_verts.push([0.70 * Math.cos((i + 0.5) * ang), 0.28, 0.70 * Math.sin((i + 0.5) * ang)]);
      for (let i = 0; i < segments; i++) raw_verts.push([0.50 * Math.cos(i * ang), 0.42, 0.50 * Math.sin(i * ang)]);

      const raw_faces = [];
      for (let i = 0; i < segments; i++) {
        const nxt = (i + 1) % segments;
        raw_faces.push([0, nxt + 1, i + 1]);
        raw_faces.push([i + 1, nxt + 1, nxt + 17]);
        raw_faces.push([i + 1, nxt + 17, i + 17]);
        raw_faces.push([i + 17, nxt + 17, nxt + 33]);
        raw_faces.push([i + 17, nxt + 33, i + 33]);
        raw_faces.push([i + 33, nxt + 33, nxt + 49]);
        raw_faces.push([i + 33, nxt + 49, i + 49]);
        raw_faces.push([i + 49, nxt + 49, nxt + 65]);
        raw_faces.push([i + 49, nxt + 65, i + 65]);
        raw_faces.push([i + 65, nxt + 65, i + 81]);
        raw_faces.push([nxt + 65, nxt + 81, i + 81]);
      }

      const table_center_idx = raw_verts.length;
      raw_verts.push([0.0, 0.42, 0.0]);
      for (let i = 0; i < segments; i++) {
        const nxt = (i + 1) % segments;
        raw_faces.push([table_center_idx, i + 81, nxt + 81]);
      }

      const positions = [];
      const normals = [];

      for (let f = 0; f < raw_faces.length; f++) {
        const face = raw_faces[f];
        const p1 = raw_verts[face[0]];
        const p2 = raw_verts[face[1]];
        const p3 = raw_verts[face[2]];

        const v1 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
        const v2 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
        const nx = v1[1] * v2[2] - v1[2] * v2[1];
        const ny = v1[2] * v2[0] - v1[0] * v2[2];
        const nz = v1[0] * v2[1] - v1[1] * v2[0];
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
        const norm = [nx / len, ny / len, nz / len];

        positions.push(...p1, ...p2, ...p3);
        normals.push(...norm, ...norm, ...norm);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

      const material = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        metalness: 0.2,
        roughness: 0.05,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      el.setObject3D('mesh', mesh);
    }
  });
}

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

    // Real-time camera-to-target distance calculator
    function updateDistanceTracking() {
      if (!isTracking) return;
      const camera = document.querySelector('a-camera');
      if (camera && targetEntity && targetEntity.object3D) {
        const camPos = camera.object3D.position;
        const targetPos = targetEntity.object3D.position;
        const dist = camPos.distanceTo(targetPos);

        if (dist > 0.01 && statusText) {
          statusText.textContent = `Shivam Jewels QR Matched (${dist.toFixed(2)}m)`;
        }
      }
    }

    setInterval(updateDistanceTracking, 200);

    // Target tracking event listeners
    if (targetEntity) {
      targetEntity.addEventListener('targetFound', () => {
        isTracking = true;
        if (statusPill) statusPill.className = 'status-pill tracking';
        if (statusText) statusText.textContent = 'Shivam Jewels QR Matched!';
        if (reticle) reticle.classList.add('hidden');
        playSound('found');

        // Ensure 3D diamond dial, logo plane & target entities are explicitly visible
        const gltfModel = document.getElementById('3d-model-entity');
        const logoPlane = document.getElementById('logo-plane');
        if (gltfModel) {
          gltfModel.setAttribute('visible', 'true');
          if (gltfModel.object3D) gltfModel.object3D.visible = true;
        }
        if (logoPlane) {
          logoPlane.setAttribute('visible', 'true');
          if (logoPlane.object3D) logoPlane.object3D.visible = true;
        }
        if (targetEntity.object3D) targetEntity.object3D.visible = true;
      });

      targetEntity.addEventListener('targetLost', () => {
        isTracking = false;
        if (statusPill) statusPill.className = 'status-pill searching';
        if (statusText) statusText.textContent = 'Scanning Target...';
        if (reticle) reticle.classList.remove('hidden');
      });
    }

    const btnStartAr = document.getElementById('btn-start-ar');
    if (btnStartAr) {
      btnStartAr.onclick = window.handleStartARClick;
    }
  }

  // Real-time Camera QR Code Scanner using jsQR
  const offscreenCanvas = document.createElement('canvas');
  const offscreenCtx = offscreenCanvas.getContext('2d');
  let lastQrMatchTime = 0;

  function startQRScanningLoop() {
    if (qrScanInterval) return;
    qrScanInterval = setInterval(() => {
      const video = document.querySelector('video');
      const gltfModel = document.getElementById('3d-model-entity');
      const targetEntity = document.getElementById('ar-target');
      const statusPill = document.getElementById('status-pill');
      const statusText = document.getElementById('status-text');
      const reticle = document.getElementById('scanning-reticle');

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
            
            // Match website link or target domain strictly
            const isMatchingUrl = val.includes('sjar.vercel.app') || val.includes('sjar') || val.includes('shivamai') || val.includes('3d.shivamai.studio');
            if (isMatchingUrl) {
              lastQrMatchTime = Date.now();

              if (!isTracking) {
                isTracking = true;
                if (statusPill) statusPill.className = 'status-pill tracking';
                if (statusText) statusText.textContent = 'Shivam Jewels QR Matched!';
                if (reticle) reticle.classList.add('hidden');
                playSound('found');

                if (gltfModel) gltfModel.setAttribute('visible', 'true');
                if (targetEntity) targetEntity.object3D.visible = true;
              }
            }
          } else {
            if (isTracking && (Date.now() - lastQrMatchTime > 3000)) {
              const isMindARTracking = targetEntity && targetEntity.object3D && targetEntity.object3D.visible;
              if (!isMindARTracking) {
                isTracking = false;
                if (statusPill) statusPill.className = 'status-pill searching';
                if (statusText) statusText.textContent = 'Scanning Target...';
                if (reticle) reticle.classList.remove('hidden');
              }
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
