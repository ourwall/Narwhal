document.addEventListener('DOMContentLoaded', () => {
  const takePhotoBtn = document.getElementById('take-photo-btn');
  const snapBtn = document.getElementById('snap-btn');
  const video = document.getElementById('camera-feed');
  const photoPreview = document.getElementById('photo-preview');
  const cameraSection = document.getElementById('camera-section');
  const pinSection = document.getElementById('pin-section');
  const uploadBtn = document.getElementById('upload-btn');
  const captionInput = document.getElementById('caption');
  const corkboardGrid = document.getElementById('corkboard-grid');
  
  let fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.capture = 'environment';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  let capturedDataUrl = '';

  if (takePhotoBtn) {
    takePhotoBtn.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (video) {
          video.srcObject = stream;
          video.play();
        }
        if (cameraSection) cameraSection.style.display = 'flex';
      } catch (err) {
        fileInput.click();
      }
    });
  }

  if (snapBtn) {
    snapBtn.addEventListener('click', () => {
      if (video && photoPreview) {
        photoPreview.width = 300;
        photoPreview.height = 300;
        const ctx = photoPreview.getContext('2d');
        ctx.drawImage(video, 0, 0, photoPreview.width, photoPreview.height);
        
        capturedDataUrl = photoPreview.toDataURL('image/jpeg', 0.8);

        if (video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        if (cameraSection) cameraSection.style.display = 'none';
        if (pinSection) pinSection.style.display = 'flex';
      }
    });
  }

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

  // Pin photo to the corkboard with a random natural tilt
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      if (!capturedDataUrl) return;

      const captionText = captionInput.value.trim() || '';
      const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      // Create Polaroid element
      const polaroidDiv = document.createElement('div');
      polaroidDiv.className = 'polaroid';
      
      // Random tilt between -7 and +7 degrees for organic look
      const randomTilt = (Math.random() * 14 - 7).toFixed(1);
      polaroidDiv.style.transform = `rotate(${randomTilt}deg)`;

      polaroidDiv.innerHTML = `
        <img src="${capturedDataUrl}" alt="Polaroid">
        ${captionText ? `<div class="polaroid-caption">${captionText}</div>` : ''}
        <div class="polaroid-date">${currentDate}</div>
      `;

      corkboardGrid.prepend(polaroidDiv);

      // Reset UI
      captionInput.value = '';
      capturedDataUrl = '';
      if (pinSection) pinSection.style.display = 'none';
    });
  }
});
