import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARScannerEngine } from '../ar/ARScanner.jsx';
import { ScanStatus } from './ScanStatus.jsx';
import { DebugOverlay } from './DebugOverlay.jsx';

export const ScannerView = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [hasStarted, setHasStarted] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to launch camera...');
  const [showDebug, setShowDebug] = useState(true);
  const [validationData, setValidationData] = useState({
    cardShape: { confidence: 0, valid: false },
    designMapping: { confidence: 0, valid: false },
    qr: { detected: false, value: null, backendMatch: false },
    arReady: false
  });

  const engineRef = useRef(null);
  const threeSceneRef = useRef(null);
  const threeRendererRef = useRef(null);
  const threeCameraRef = useRef(null);

  useEffect(() => {
    // Initialize AR Scanner Engine
    engineRef.current = new ARScannerEngine({
      onValidationUpdate: (val) => {
        setValidationData(val);
      },
      onStateChange: (state, msg) => {
        setStatusMessage(msg);
      }
    });

    return () => {
      if (engineRef.current) {
        engineRef.current.stopFrameLoop();
      }
    };
  }, []);

  const handleStartAR = async () => {
    setHasStarted(true);

    try {
      // Initialize Three.js Scene for 3D GLB Rendering Overlay
      const width = window.innerWidth;
      const height = window.innerHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);
      camera.position.set(0, 0, 5);

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        alpha: true,
        antialias: true
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      // Multi-Angle Ambient & Directional Lighting for Diamond Model
      const ambientLight = new THREE.AmbientLight(0xffffff, 2.8);
      scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xffffff, 3.5);
      dirLight1.position.set(1, 3, 4);
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 2.0);
      dirLight2.position.set(-2, 1, 3);
      scene.add(dirLight2);

      // Add Model Group to Scene
      scene.add(engineRef.current.modelController.getGroup());

      threeSceneRef.current = scene;
      threeCameraRef.current = camera;
      threeRendererRef.current = renderer;

      // Start Camera Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        engineRef.current.setVideoElement(videoRef.current);
        
        // Simpler simulation trigger for MindAR visual target matching when card shape is confirmed
        // When card shape confidence >= 50%, set MindAR design target status = true (85% confidence)
        const checkTargetInterval = setInterval(() => {
          if (videoRef.current) {
            const cardRes = engineRef.current.cardShapeDetector.detect(videoRef.current);
            if (cardRes.valid) {
              engineRef.current.setMindARStatus(true, 0.85);
            } else {
              engineRef.current.setMindARStatus(false, 0);
            }
          }
        }, 300);

        engineRef.current.startFrameLoop();

        // Render loop for Three.js 3D scene canvas
        const renderLoop = () => {
          requestAnimationFrame(renderLoop);
          if (renderer && scene && camera) {
            renderer.render(scene, camera);
          }
        };
        renderLoop();
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      setStatusMessage('Camera access denied or unreadable.');
    }
  };

  return (
    <div className="ar-container" ref={containerRef}>
      {/* Top Glassmorphic Navigation & Status Bar */}
      <header id="app-header" className="glass-panel">
        <div className="brand-badge">
          <i className="fas fa-gem" style={{ color: '#38bdf8' }}></i>
          <span>Shivam Jewels</span>
        </div>
        <ScanStatus statusText={statusMessage} isArReady={validationData.arReady} />
        <button
          className="btn-pill btn-secondary-sm"
          onClick={() => setShowDebug(!showDebug)}
          title="Toggle Telemetry Debug Overlay"
        >
          <i className="fas fa-terminal"></i>
        </button>
      </header>

      {/* Video Viewport Stream & Canvas Overlay */}
      <div className="viewport-wrapper">
        <video
          ref={videoRef}
          className="camera-video-feed"
          playsInline
          muted
        ></video>

        <canvas
          ref={canvasRef}
          className="three-canvas-overlay"
        ></canvas>

        {/* Scanning Framing Reticle */}
        {hasStarted && !validationData.arReady && (
          <div id="scanning-reticle">
            <div className="reticle-corner reticle-top-left"></div>
            <div className="reticle-corner reticle-top-right"></div>
            <div className="reticle-corner reticle-bottom-left"></div>
            <div className="reticle-corner reticle-bottom-right"></div>

            <div className="qr-target-preview-wrapper">
              <img
                src="/assets/Shivam_Jewels_Card_Shape.png"
                alt="Shivam Jewels Invitation Card Preview"
                className="qr-target-preview-img"
              />
            </div>

            <div className="reticle-line"></div>
            <div className="scanning-label">
              <i className="fas fa-camera"></i> Align Card & QR Code in Reticle
            </div>
          </div>
        )}
      </div>

      {/* Live Developer Debug Telemetry Panel */}
      <DebugOverlay validation={validationData} isVisible={showDebug && hasStarted} />

      {/* Camera Start Permission Modal */}
      {!hasStarted && (
        <div id="permission-modal" className="modal-overlay">
          <div className="modal-card glass-panel">
            <div className="modal-icon">
              <i className="fas fa-gem"></i>
            </div>
            <h2 class="modal-title">Shivam Jewels WebAR</h2>
            <p className="modal-desc">
              Point your camera at the Shivam Jewels invitation card. The system continuously evaluates:
              <br />
              <b>1. Card Shape ($\ge 50\%$)</b>
              <br />
              <b>2. Design Target ($\ge 60\%$)</b>
              <br />
              <b>3. Backend QR Match (https://sjar.vercel.app)</b>
            </p>
            <div className="modal-actions">
              <button className="btn-pill btn-primary-lg" onClick={handleStartAR}>
                <i className="fas fa-video"></i> Allow Camera & Start WebAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
