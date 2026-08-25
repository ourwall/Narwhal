document.addEventListener('DOMContentLoaded', () => {
  const takePhotoBtn = document.getElementById('take-photo-btn');
  const snapBtn = document.getElementById('snap-btn');
  const flipBtn = document.getElementById('flip-btn');
  const video = document.getElementById('camera-feed');
  const photoPreview = document.getElementById('photo-preview');
  const cameraSection = document.getElementById('camera-section');
  const pinSection = document.getElementById('pin-section');
  const uploadBtn = document.getElementById('upload-btn');
  const captionInput = document.getElementById('caption');
  const corkboardGrid = document.getElementById('corkboard-grid');
  
  let currentStream = null;
  let currentFacingMode = 'environment'; // 'environment' = back camera, 'user' = front/selfie camera

  let fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  let capturedDataUrl = '';

  // Stop active camera stream helper
  const stopCurrentStream = () => {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
  };

  // Start stream with specified facingMode
  const startCameraStream = async (facingMode) => {
    stopCurrentStream();
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode } 
      });
      if (video) {
        video.srcObject = currentStream;
        video.play();
      }
      if (cameraSection) cameraSection.style.display = 'flex';
    } catch (err) {
      console.warn('Live stream unavailable, opening camera picker fallback:', err);
      fileInput.click();
    }
  };

  // Open camera feed
  if (takePhotoBtn) {
    takePhotoBtn.addEventListener('click', () => {
      startCameraStream(currentFacingMode);
    });
  }

  // Flip camera toggle button
  if (flipBtn) {
    flipBtn.addEventListener('click', () => {
      currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
      startCameraStream(currentFacingMode);
    });
  }

  // Snap photo
  if (snapBtn) {
    snapBtn.addEventListener('click', () => {
      if (video && photoPreview) {
        photoPreview.width = 300;
        photoPreview.height = 300;
        const ctx = photoPreview.getContext('2d');
        
        // Mirror image on canvas if taking a selfie
        if (currentFacingMode === 'user') {
          ctx.translate(photoPreview.width, 0);
          ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, 0, 0, photoPreview.width, photoPreview.height);
        capturedDataUrl = photoPreview.toDataURL('image/jpeg', 0.8);

        stopCurrentStream();
        
        if (cameraSection) cameraSection.style.display = 'none';
        if (pinSection) pinSection.style.display = 'flex';
      }
    });
  }

  // Handle fallback picker
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      capturedDataUrl = event.target.result;
      if (cameraSection) cameraSection.style.display = 'none';
      if (pinSection) pinSection.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  });

  // Pin photo to board
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      if (!capturedDataUrl) return;

      const captionText = captionInput.value.trim() || '';
      const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      const polaroidDiv = document.createElement('div');
      polaroidDiv.className = 'polaroid';
      
      const randomTilt = (Math.random() * 14 - 7).toFixed(1);
      polaroidDiv.style.transform = `rotate(${randomTilt}deg)`;

      polaroidDiv.innerHTML = `
        <img src="${capturedDataUrl}" alt="Polaroid">
        ${captionText ? `<div class="polaroid-caption">${captionText}</div>` : ''}
        <div class="polaroid-date">${currentDate}</div>
      `;

      corkboardGrid.prepend(polaroidDiv);

      captionInput.value = '';
      capturedDataUrl = '';
      if (pinSection) pinSection.style.display = 'none';
    });
  }
});

