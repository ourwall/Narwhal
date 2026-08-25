document.addEventListener('DOMContentLoaded', () => {
  const cameraFeed = document.getElementById('camera-feed');
  const snapBtn = document.getElementById('snap-btn');
  const cameraSection = document.getElementById('camera-section');
  const pinSection = document.getElementById('pin-section');
  const photoPreview = document.getElementById('photo-preview');
  const captionInput = document.getElementById('caption');
  const uploadBtn = document.getElementById('upload-btn');
  const corkboardGrid = document.getElementById('corkboard-grid');

  let imageStream = null;

  async function startCamera() {
    try {
      imageStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      if (cameraFeed) cameraFeed.srcObject = imageStream;
    } catch (err) {
      console.warn("Live stream blocked. Using camera picker fallback:", err);
      
      let fileInput = document.getElementById('camera-fallback');
      if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.capture = 'environment';
        fileInput.id = 'camera-fallback';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
      }

      if (snapBtn) {
        snapBtn.onclick = () => fileInput.click();
      }

      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const img = new Image();
        img.onload = () => {
          photoPreview.width = img.width || 320;
          photoPreview.height = img.height || 320;
          const context = photoPreview.getContext('2d');
          context.drawImage(img, 0, 0);

          cameraSection.style.display = 'none';
          pinSection.style.display = 'block';
        };
        img.src = URL.createObjectURL(file);
      };
    }
  }

  startCamera();

  if (snapBtn) {
    snapBtn.addEventListener('click', () => {
      if (!imageStream) return;

      photoPreview.width = cameraFeed.videoWidth || 320;
      photoPreview.height = cameraFeed.videoHeight || 320;

      const context = photoPreview.getContext('2d');
      context.drawImage(cameraFeed, 0, 0, photoPreview.width, photoPreview.height);

      cameraSection.style.display = 'none';
      pinSection.style.display = 'block';
    });
  }

  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      const captionText = captionInput.value.trim();

      if (captionText.length > 10) {
        alert("Caption must be 10 characters or less!");
        return;
      }

      const photoDataUrl = photoPreview.toDataURL('image/jpeg');
      
      const now = new Date();
      const dateString = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + 
                         ', ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const card = document.createElement('div');
      card.className = 'polaroid-card';

      card.innerHTML = `
        <img src="${photoDataUrl}" alt="Live Polaroid">
        <p class="polaroid-caption">${captionText || 'Live Moment'}</p>
        <p class="polaroid-date">${dateString}</p>
      `;

      corkboardGrid.prepend(card);

      captionInput.value = '';
      pinSection.style.display = 'none';
      cameraSection.style.display = 'block';
    });
  }
});
