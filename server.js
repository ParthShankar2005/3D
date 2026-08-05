const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and essential headers for MindAR camera access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Opener-Policy', 'same-origin');
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Serve static files from root directory
app.use(express.static(__dirname));

// Main route fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Get local Network IP address for mobile device testing
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

http.createServer(app).listen(PORT, () => {
  console.log(`
=====================================================
🚀 WebAR Experience Server Running!
=====================================================
💻 Local Access: http://localhost:${PORT}
📱 Mobile Wi-Fi: http://${localIp}:${PORT}
=====================================================
  `);
});
