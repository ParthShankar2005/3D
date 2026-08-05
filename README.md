# Shivam Jewels WebAR

An app-less WebAR experience for **Shivam Jewels (JCK Las Vegas Collection)** powered by MindAR.js, A-Frame, and Three.js.

Live Website: [sjar.vercel.app](https://sjar.vercel.app)

## 📁 Project Folder Structure

```
f:\SJ 3D
├── assets/                  # 3D assets, textures, logo planes, and MindAR tracking binaries
│   ├── model.gltf           # 57-Facet Brilliant Cut 3D Diamond GLTF model
│   ├── model.glb            # Binary 3D Diamond GLB asset
│   ├── shivam_banner.png    # JCK Las Vegas Booth Thank You Poster asset
│   ├── shivam_logo.png      # Official Shivam Jewels logo plane asset
│   ├── target.png           # High-res QR target image (encodes https://sjar.vercel.app)
│   └── targets.mind         # MindAR compiled target binary descriptor file
├── css/
│   └── styles.css           # Glassmorphic UI styling system & camera transparency
├── js/
│   ├── app.js               # WebAR MindAR controller, jsQR reader loop, & distance calculator
│   ├── jsQR.js              # Real-time QR frame decoding engine
│   ├── aframe.min.js        # Offline A-Frame 3D engine library
│   └── mindar-image-aframe.prod.js # Offline MindAR tracking engine library
├── scripts/
│   ├── generate_diamond_glb.py # Python script for 57-facet 3D diamond generation
│   ├── generate_qr_target.py   # Python script for clean QR target generation
│   └── compile_mind.js         # Node script for MindAR offline binary compilation
├── index.html               # Main HTML5 entrypoint with WebAR scene & modal
├── server.js                # Express static web server for local testing
├── vercel.json              # Vercel deployment configuration
└── package.json             # NPM dependencies and build scripts
```

## 🚀 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start local server:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.

## 💎 Features
- **Instant 1-Tap Camera Permission**: Synchronous `getUserMedia` prompt on user tap.
- **57-Facet Brilliant Diamond Cut**: Pro-grade diamond geometry with crystal specular reflections.
- **1:1 QR Target Poster Overlay**: JCK Las Vegas Thank You poster overlapping QR code target.
- **Official Shivam Jewels Logo**: Floating 3D logo plane above diamond.
- **Strict Domain QR Scanner**: Embedded `jsQR` scanner matching `sjar.vercel.app`.
- **Real-Time Distance Calculator**: Live 3D distance tracking from phone to target.
