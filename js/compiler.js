// Browser-based MindAR Target Compiler Tool Logic
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const previewCanvas = document.getElementById('preview-canvas');
  const btnCompile = document.getElementById('btn-compile');
  const btnDownload = document.getElementById('btn-download');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressPercent = document.getElementById('progress-percent');
  const statusLog = document.getElementById('status-log');
  const featureCountEl = document.getElementById('feature-count');

  let loadedImage = null;
  let compiledBuffer = null;

  // Handle Drag & Drop
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-active');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-active');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-active');
      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleImageFile(files[0]);
      }
    });

    dropZone.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFile(e.target.files[0]);
      }
    });
  }

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid JPG or PNG target image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        loadedImage = img;
        renderPreview(img);
        btnCompile.disabled = false;
        btnDownload.disabled = true;
        compiledBuffer = null;
        statusLog.textContent = `Target image loaded: ${img.width}x${img.height}px. Click "Compile Target File" to generate .mind data.`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderPreview(img) {
    const ctx = previewCanvas.getContext('2d');
    previewCanvas.width = img.width;
    previewCanvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  }

  // Load default target image automatically if present
  const defaultImg = new Image();
  defaultImg.onload = () => {
    loadedImage = defaultImg;
    renderPreview(defaultImg);
    if (btnCompile) btnCompile.disabled = false;
    if (statusLog) statusLog.textContent = `Default target image loaded (512x512px). Ready to compile.`;
  };
  defaultImg.src = './assets/target.png';

  // MindAR Compiler execution
  if (btnCompile) {
    btnCompile.addEventListener('click', async () => {
      if (!loadedImage) return;

      btnCompile.disabled = true;
      progressContainer.style.display = 'block';
      progressBar.style.width = '0%';
      progressPercent.textContent = '0%';
      statusLog.textContent = 'Initializing MindAR Compiler engine...';

      try {
        // MindAR Compiler instance
        const compiler = new window.MINDAR.IMAGE.Compiler();
        
        statusLog.textContent = 'Extracting 6DoF tracking feature points...';

        const dataList = await compiler.compileImageTargets([loadedImage], (progress) => {
          const percent = Math.round(progress);
          progressBar.style.width = `${percent}%`;
          progressPercent.textContent = `${percent}%`;
          statusLog.textContent = `Processing image feature scale pyramid... (${percent}%)`;
        });

        statusLog.textContent = 'Building compiled binary target file...';
        
        // Export binary buffer
        compiledBuffer = await compiler.exportData();

        // Calculate total feature points extracted
        let totalFeatures = 0;
        if (dataList && dataList[0] && dataList[0].trackingFeaturePoints) {
          totalFeatures = dataList[0].trackingFeaturePoints.length;
        }
        if (featureCountEl) featureCountEl.textContent = `${totalFeatures} feature points detected`;

        // Draw feature points over preview image
        if (dataList && dataList[0]) {
          drawFeaturePoints(dataList[0]);
        }

        statusLog.textContent = '✅ Compilation complete! Your targets.mind file is ready for download.';
        btnDownload.disabled = false;
        btnCompile.disabled = false;
      } catch (err) {
        console.error('Compiler error:', err);
        statusLog.textContent = `❌ Compilation failed: ${err.message}`;
        btnCompile.disabled = false;
      }
    });
  }

  function drawFeaturePoints(targetData) {
    const ctx = previewCanvas.getContext('2d');
    if (!targetData.trackingFeaturePoints) return;

    ctx.fillStyle = '#06b6d4';
    targetData.trackingFeaturePoints.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!compiledBuffer) return;
      const blob = new Blob([compiledBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'targets.mind';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
});
