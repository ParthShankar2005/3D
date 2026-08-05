// WebAR MindAR.js & A-Frame Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const reticle = document.getElementById('scanning-reticle');
  const arScene = document.getElementById('ar-scene');
  const targetEntity = document.getElementById('ar-target');
  const gltfModel = document.getElementById('3d-model-entity');
  const orbitContainer = document.getElementById('orbit-canvas-container');
  
  // Controls
  const btnSpin = document.getElementById('btn-spin');
  const btnColor = document.getElementById('btn-color');
  const btnScaleUp = document.getElementById('btn-scale-up');
  const btnScaleDown = document.getElementById('btn-scale-down');
  const btnReset = document.getElementById('btn-reset');
  const btnMode = document.getElementById('btn-mode');
  const btnAudio = document.getElementById('btn-audio');
  
  // State variables
  let isTracking = false;
  let isOrbitMode = false;
  let isSpinning = true;
  let audioEnabled = true;
  let currentScale = 0.6;
  const scaleStep = 0.15;
  const minScale = 0.2;
  const maxScale = 1.8;
  
  // Color palette sequence for 3D model material tint
  const colorPalette = [
    '#ffffff', // Original / Default
    '#38bdf8', // Neon Cyan
    '#a855f7', // Electric Violet
    '#f43f5e', // Hot Crimson
    '#10b981', // Emerald Green
    '#f59e0b'  # Amber Gold
  ];
  let colorIndex = 0;

  // Synthesized Web Audio API Synthesizer (No external audio files needed!)
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  function playSound(type) {
    if (!audioEnabled || !audioCtx) return;
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
        // Futuristic target lock chime (rising two-tone chord)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15); // C6
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'click') {
        // Soft touch click
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'lost') {
        // Subtle descending tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      console.warn("Web Audio API error:", e);
    }
  }

  // Set up MindAR Target Event Listeners
  if (targetEntity) {
    targetEntity.addEventListener('targetFound', () => {
      isTracking = true;
      statusPill.className = 'status-pill tracking';
      statusText.textContent = 'Target Tracked!';
      if (reticle) reticle.classList.add('hidden');
      playSound('found');
    });

    targetEntity.addEventListener('targetLost', () => {
      isTracking = false;
      if (!isOrbitMode) {
        statusPill.className = 'status-pill searching';
        statusText.textContent = 'Scanning Target...';
        if (reticle) reticle.classList.remove('hidden');
        playSound('lost');
      }
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

  if (btnAudio) {
    btnAudio.addEventListener('click', () => {
      audioEnabled = !audioEnabled;
      btnAudio.classList.toggle('active', audioEnabled);
      const icon = btnAudio.querySelector('i');
      if (icon) {
        icon.className = audioEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
      }
      if (audioEnabled) playSound('click');
    });
  }

  // 3D Orbit Controls Fallback Mode (Three.js Orbit Controls canvas)
  let orbitScene, orbitCamera, orbitRenderer, orbitControls, orbitMesh;

  function initOrbitViewer() {
    if (orbitScene) return; // Already initialized

    const container = document.getElementById('orbit-canvas-container');
    orbitScene = new THREE.Scene();
    
    orbitCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    orbitCamera.position.set(0, 1.2, 2.8);

    orbitRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    orbitRenderer.setSize(window.innerWidth, window.innerHeight);
    orbitRenderer.setPixelRatio(window.devicePixelRatio);
    orbitRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(orbitRenderer.domElement);

    // Orbit Controls
    if (window.THREE.OrbitControls) {
      orbitControls = new THREE.OrbitControls(orbitCamera, orbitRenderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.05;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    orbitScene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2);
    dirLight1.position.set(2, 4, 3);
    orbitScene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 1.5);
    dirLight2.position.set(-2, -2, -2);
    orbitScene.add(dirLight2);

    // Load GLTF Model into Orbit Scene
    const loader = new THREE.GLTFLoader();
    loader.load('./assets/model.glb', (gltf) => {
      orbitMesh = gltf.scene;
      orbitMesh.scale.set(currentScale, currentScale, currentScale);
      orbitScene.add(orbitMesh);
    });

    // Animation Loop
    function animateOrbit() {
      if (isOrbitMode) {
        requestAnimationFrame(animateOrbit);
        if (orbitControls) orbitControls.update();
        if (orbitMesh && isSpinning) {
          orbitMesh.rotation.y += 0.01;
        }
        orbitRenderer.render(orbitScene, orbitCamera);
      }
    }

    window.addEventListener('resize', () => {
      if (orbitCamera && orbitRenderer) {
        orbitCamera.aspect = window.innerWidth / window.innerHeight;
        orbitCamera.updateProjectionMatrix();
        orbitRenderer.setSize(window.innerWidth, window.innerHeight);
      }
    });

    animateOrbit();
  }

  if (btnMode) {
    btnMode.addEventListener('click', () => {
      playSound('click');
      isOrbitMode = !isOrbitMode;

      if (isOrbitMode) {
        btnMode.innerHTML = '<i class="fas fa-camera"></i> <span>AR Camera</span>';
        statusPill.className = 'status-pill orbit';
        statusText.textContent = '3D Orbit Preview';
        if (reticle) reticle.classList.add('hidden');
        if (arScene) arScene.style.display = 'none';
        orbitContainer.classList.add('active');
        initOrbitViewer();
      } else {
        btnMode.innerHTML = '<i class="fas fa-cube"></i> <span>3D Preview</span>';
        statusPill.className = isTracking ? 'status-pill tracking' : 'status-pill searching';
        statusText.textContent = isTracking ? 'Target Tracked!' : 'Scanning Target...';
        if (reticle && !isTracking) reticle.classList.remove('hidden');
        if (arScene) arScene.style.display = 'block';
        orbitContainer.classList.remove('active');
      }
    });
  }

  // Modal actions - Trigger camera start on user click
  const btnStartAr = document.getElementById('btn-start-ar');
  const modalOverlay = document.getElementById('permission-modal');
  if (btnStartAr && modalOverlay) {
    btnStartAr.addEventListener('click', async () => {
      playSound('click');
      modalOverlay.classList.add('hidden');
      if (reticle) reticle.classList.remove('hidden');
      
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // Start MindAR camera system on user gesture click
      try {
        const startARSystem = async () => {
          const arSystem = arScene.systems && arScene.systems['mindar-image-system'];
          if (arSystem) {
            console.log("Invoking mindar-image-system.start()...");
            await arSystem.start();
            console.log("MindAR system started successfully.");
          } else {
            console.warn("arSystem not ready on scene, waiting for renderstart...");
            arScene.addEventListener('renderstart', async () => {
              const sys = arScene.systems['mindar-image-system'];
              if (sys) await sys.start();
            }, { once: true });
          }
        };

        if (arScene.hasLoaded) {
          await startARSystem();
        } else {
          arScene.addEventListener('loaded', startARSystem, { once: true });
        }
      } catch (err) {
        console.error("Camera start error:", err);
      }
    });
  }
});
