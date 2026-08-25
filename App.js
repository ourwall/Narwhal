document.addEventListener('DOMContentLoaded', () => {
  const takePhotoBtn = document.getElementById('take-photo-btn');
  const snapBtn = document.getElementById('snap-btn');
  const video = document.getElementById('camera-feed');
  const photoPreview = document.getElementById('photo-preview');
  const cameraSection = document.getElementById('camera-section');
  const pinSection = document.getElementById('pin-section');
  
  // Hidden file input fallback
  let fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.capture = 'environment';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // Main button opens camera mode or fallback
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
        if (cameraSection) cameraSection.style.display = 'block';
      } catch (err) {
        console.warn('Live stream unavailable, launching camera picker:', err);
        fileInput.click();
      }
    });
  }

  // Snap button for live video feed
  if (snapBtn) {
    snapBtn.addEventListener('click', () => {
      if (video && photoPreview) {
        photoPreview.width = video.videoWidth || 320;
        photoPreview.height = video.videoHeight || 320;
        const ctx = photoPreview.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Stop stream tracks
        if (video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        if (cameraSection) cameraSection.style.display = 'none';
        if (pinSection) pinSection.style.display = 'block';
      }
    });
  }

  // Handle image selected from camera picker fallback
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      if (photoPreview) {
        photoPreview.width = img.width || 320;
        photoPreview.height = img.height || 320;
        const ctx = photoPreview.getContext('2d');
        ctx.drawImage(img, 0, 0);
      }
      if (cameraSection) cameraSection.style.display = 'none';
      if (pinSection) pinSection.style.display = 'block';
    };
    img.src = URL.createObjectURL(file);
  });
});

