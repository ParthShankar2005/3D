const express = require('express');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const app = express();
  // Serve the workspace root so /assets/ and /js/ paths work cleanly
  const rootDir = path.resolve(__dirname, '..');
  app.use(express.static(rootDir));
  const server = app.listen(PORT);
  console.log(`Local compiler server started on http://localhost:${PORT}`);

  console.log('Launching headless Edge browser...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=IsolateOrigins,site-per-process']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  console.log(`Navigating to http://localhost:${PORT}/scripts/compiler.html`);
  await page.goto(`http://localhost:${PORT}/scripts/compiler.html`, { waitUntil: 'networkidle0' });

  await page.waitForFunction(() => window.MINDAR && window.MINDAR.IMAGE && window.MINDAR.IMAGE.Compiler, { timeout: 15000 });

  console.log('Starting MindAR feature target compilation for Shivam_Jewels_Card_Shape.png (Card Shape ONLY, NO QR code)...');

  const mindBufferArray = await page.evaluate(async () => {
    const compiler = new window.MINDAR.IMAGE.Compiler();

    const img = new Image();
    img.src = '/assets/Shivam_Jewels_Card_Shape.png';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (e) => reject(new Error('Failed to load /assets/Shivam_Jewels_Card_Shape.png'));
    });

    console.log(`Target Card Shape image loaded: ${img.width}x${img.height}`);

    await compiler.compileImageTargets([img], (progress) => {
      console.log(`Feature Extraction Progress: ${Math.round(progress)}%`);
    });

    console.log(`Feature extraction complete! Exporting binary buffer...`);

    const buffer = await compiler.exportData();
    return Array.from(new Uint8Array(buffer));
  });

  console.log(`Exported MindAR target data: ${mindBufferArray.length} bytes`);
  const buffer = Buffer.from(mindBufferArray);
  const outputPath = path.resolve(rootDir, 'assets', 'targets.mind');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Successfully compiled and saved ${outputPath}!`);

  await browser.close();
  server.close();
})().catch(err => {
  console.error('Compilation script error:', err);
  process.exit(1);
});
