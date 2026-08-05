const express = require('express');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  // 1. Start local express server
  const app = express();
  app.use(express.static(__dirname));
  const server = app.listen(PORT);
  console.log(`Local compiler server started on http://localhost:${PORT}`);

  // 2. Launch headless Edge browser
  console.log('Launching headless Edge browser...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=IsolateOrigins,site-per-process']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  console.log('Navigating to http://localhost:3333/compiler.html');
  await page.goto(`http://localhost:${PORT}/compiler.html`, { waitUntil: 'networkidle0' });

  // Wait for MindAR script to initialize on page
  await page.waitForFunction(() => window.MINDAR && window.MINDAR.IMAGE && window.MINDAR.IMAGE.Compiler, { timeout: 15000 });

  console.log('Starting MindAR feature target compilation...');

  const mindBufferArray = await page.evaluate(async () => {
    const compiler = new window.MINDAR.IMAGE.Compiler();

    const img = new Image();
    img.src = '/assets/target.png';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (e) => reject(new Error('Failed to load /assets/target.png'));
    });

    console.log(`Target image loaded in browser context: ${img.width}x${img.height}`);

    const dataList = await compiler.compileImageTargets([img], (progress) => {
      console.log(`Progress: ${Math.round(progress)}%`);
    });

    console.log(`Feature extraction complete! Extracted points: ${dataList[0].trackingFeaturePoints.length}`);

    const buffer = await compiler.exportData();
    return Array.from(new Uint8Array(buffer));
  });

  console.log(`Exported MindAR target data: ${mindBufferArray.length} bytes`);
  const buffer = Buffer.from(mindBufferArray);
  const outputPath = path.resolve(__dirname, 'assets', 'targets.mind');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Successfully compiled and saved ${outputPath}!`);

  await browser.close();
  server.close();
})().catch(err => {
  console.error('Compilation script error:', err);
  process.exit(1);
});
