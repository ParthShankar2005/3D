# Shivam Jewels WebAR — Technical Documentation & Architecture

An app-less WebAR experience for **Shivam Jewels (JCK Las Vegas Collection)** built with MindAR.js, A-Frame, and Three.js.

Live WebAR App: [https://sjar.vercel.app](https://sjar.vercel.app)

---

## 🏗️ Architecture & Component Connections

Below is the connection flow showing how every component in the codebase interacts:

```
                  ┌──────────────────────────────┐
                  │       User Mobile Browser    │
                  └──────────────┬───────────────┘
                                 │ Taps "Allow Camera & Start WebAR"
                                 ▼
                  ┌──────────────────────────────┐
                  │         index.html           │
                  └──────────────┬───────────────┘
                                 │ Loads App Logic
                                 ▼
                  ┌──────────────────────────────┐
                  │          js/app.js           │
                  └──────┬────────────────┬──────┘
                         │                │
      Scans Video Frames │                │ Controls MindAR Target
                         ▼                ▼
     ┌───────────────────────┐   ┌────────────────────────┐
     │       js/jsQR.js      │   │  js/mindar-image-      │
     │                       │   │   aframe.prod.js       │
     └───────────┬───────────┘   └───────────┬────────────┘
                 │ Decodes URL               │ Matches Feature Descriptors
                 └───────────┬───────────────┘
                             │
                             ▼ Matches Target QR
                 ┌───────────────────────┐
                 │       <a-scene>       │
                 └───────────┬───────────┘
                             │ Anchor 0: ar-target
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Poster Card │     │  3D Diamond  │     │ 3D Logo Badge│
│  (plane)     │     │ (gltf-model) │     │   (plane)    │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 📁 Folder Structure & Clear File Descriptions

```
f:\SJ 3D
├── assets/                       # 3D Assets, Textures, & Target Descriptor Binaries
│   ├── model.gltf                # 57-Facet Brilliant Cut Diamond 3D model
│   ├── model.glb                 # Binary GLB version of 3D Diamond
│   ├── shivam_banner.png         # JCK Las Vegas Booth Poster (1:1 QR aspect overlay)
│   ├── shivam_logo.png           # Official Shivam Jewels transparent logo plane
│   ├── target.png                # High-res 1024x1024 QR target image
│   └── targets.mind              # MindAR compiled feature descriptor binary (660 KB)
│
├── css/
│   └── styles.css                # Glassmorphic UI theme & transparent camera feed
│
├── js/
│   ├── app.js                    # WebAR controller, jsQR loop, & distance calculator
│   ├── jsQR.js                   # Real-time QR camera frame decoder engine
│   ├── aframe.min.js             # A-Frame 3D web framework library
│   └── mindar-image-aframe.prod.js # MindAR image tracking engine library
│
├── scripts/                      # Utility Build & Generator Scripts
│   ├── build_diamond.py          # Python script for 57-facet 3D diamond generation
│   ├── build_qr.py               # Python script for clean QR target generation
│   └── compile_mind.js           # Node script for MindAR binary compilation
│
├── index.html                    # HTML5 main entrypoint with <a-scene> container
├── server.js                     # Express static server for local testing
├── vercel.json                   # Vercel deployment configuration
├── package.json                  # NPM dependencies and script shortcuts
└── README.md                     # Technical documentation
```

---

## 🔄 How the Files Connect

1. **`index.html` → `js/app.js`**:
   - `index.html` includes `<script src="./js/app.js">`.
   - The button `<button onclick="handleStartARClick(event)">` directly invokes `window.handleStartARClick()` defined inside `js/app.js`.

2. **`js/app.js` → `js/jsQR.js` & `js/mindar-image-aframe.prod.js`**:
   - `js/app.js` captures raw video frames from `<video>` element created by MindAR and passes them to `jsQR` to decode the QR code string.
   - Upon matching `sjar.vercel.app`, `app.js` triggers `mindar-image-system.start()` to track target position in 6DoF space.

3. **`assets/targets.mind` → `<a-scene>`**:
   - `<a-scene mindar-image="imageTargetSrc: ./assets/targets.mind">` feeds feature descriptors into MindAR to track camera position relative to `target.png`.

4. **`assets/model.gltf` & `assets/shivam_logo.png` → `<a-entity id="ar-target">`**:
   - `<a-gltf-model src="./assets/model.gltf">` renders the 57-facet brilliant 3D diamond.
   - `<a-plane src="./assets/shivam_logo.png">` renders the official Shivam Jewels logo floating above the diamond.

---

## 🛠️ Build Commands

| Command | Action |
| :--- | :--- |
| `npm start` | Start local development server on `http://localhost:3000` |
| `npm run build-diamond` | Re-generate 57-facet 3D diamond GLTF/GLB models (`scripts/build_diamond.py`) |
| `npm run build-qr` | Re-generate clean target QR code image (`scripts/build_qr.py`) |
