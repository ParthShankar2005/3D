import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Model Controller — Persistent 3D Model Instance Manager
 * 
 * RULES:
 * 1. Load model.glb ONCE upon startup.
 * 2. NEVER reload or recreate model instance during frame scanning loops.
 * 3. Visibility controlled strictly by arReady single source of truth.
 * 4. Applies smooth scale-in / scale-out animations on appearance & disappearance.
 */
export class ModelController {
  constructor(options = {}) {
    this.modelPath = options.modelPath || '/assets/model.glb';
    this.targetScale = options.targetScale || 0.65;
    
    this.containerGroup = new THREE.Group();
    this.modelMesh = null;
    this.isLoaded = false;

    // Smooth visibility & scale animation properties
    this.currentScaleFactor = 0.001;
    this.animating = false;
    this.visibleState = false;

    this.initLoader();
  }

  initLoader() {
    const loader = new GLTFLoader();
    loader.load(
      this.modelPath,
      (gltf) => {
        this.modelMesh = gltf.scene;

        // Material Enhancer for Diamond & Platinum reflections
        this.modelMesh.traverse((child) => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
              if (mat.name && mat.name.toLowerCase().includes('diamond')) {
                mat.color = new THREE.Color(0xffffff);
                mat.roughness = 0.05;
                mat.metalness = 0.2;
              } else if (mat.name && mat.name.toLowerCase().includes('platinum')) {
                mat.color = new THREE.Color(0xdce2ea);
                mat.roughness = 0.15;
                mat.metalness = 0.9;
              }
              mat.side = THREE.DoubleSide;
            });
          }
        });

        // Set initial scale zero for smooth scale-in
        this.modelMesh.scale.set(0, 0, 0);
        this.containerGroup.add(this.modelMesh);
        this.containerGroup.visible = false;
        this.isLoaded = true;
      },
      undefined,
      (err) => {
        console.error('Error loading model.glb:', err);
      }
    );
  }

  /**
   * Updates model visibility and smooth scale animation on frame tick
   * @param {boolean} arReady 
   * @param {number} deltaTime 
   */
  update(arReady, deltaTime = 0.016) {
    if (!this.isLoaded || !this.containerGroup) return;

    this.visibleState = arReady;

    if (arReady) {
      this.containerGroup.visible = true;
      
      // Smooth scale-in transition towards targetScale (0.65)
      this.currentScaleFactor = THREE.MathUtils.lerp(this.currentScaleFactor, this.targetScale, 0.18);

      // Continuous 3D rotation animation
      if (this.modelMesh) {
        this.modelMesh.rotation.y += 0.015;
      }
    } else {
      // Smooth scale-out transition towards 0
      this.currentScaleFactor = THREE.MathUtils.lerp(this.currentScaleFactor, 0, 0.25);

      if (this.currentScaleFactor < 0.01) {
        this.currentScaleFactor = 0;
        this.containerGroup.visible = false;
      }
    }

    if (this.modelMesh) {
      this.modelMesh.scale.set(this.currentScaleFactor, this.currentScaleFactor, this.currentScaleFactor);
    }
  }

  getGroup() {
    return this.containerGroup;
  }
}
