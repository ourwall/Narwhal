const SUPABASE_URL = 'https://wynsipybuskswbogoomx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cBfTt9Z9R6ByKTAYecRVpw_TltjjOCH';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const cameraInput = document.getElementById('camera-input');
const openCameraBtn = document.getElementById('open-camera-btn');
const photoWall = document.getElementById('photo-wall');

const previewModal = document.getElementById('preview-modal');
const previewImg = document.getElementById('preview-img');
const modalCaptionInput = document.getElementById('modal-caption-input');
const retakeBtn = document.getElementById('retake-btn');
const confirmUploadBtn = document.getElementById('confirm-upload-btn');

let selectedFile = null;
const rotations = [-4, -2, 2, 4, -3, 3, -1, 1];

// 1. Fetch initial photo feed
async function loadPhotos() {
  const { data, error } = await supabaseClient
    .from('polaroids')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching photos:', error);
    return;
  }

  photoWall.innerHTML = '';
  if (data) {
    data.forEach((photo, index) => renderPhoto(photo, index));
  }
}

// 2. Render individual Polaroid card
function renderPhoto(photo, index) {
  const tilt = rotations[index % rotations.length];
  const card = document.createElement('div');
  card.className = 'polaroid';
  card.style.transform = `rotate(${tilt}deg)`;

  const captionText = photo.caption ? photo.caption.substring(0, 10) : '';

  card.innerHTML = `
    <div class="image-container">
      <img src="${photo.image_url}" alt="Wedding Moment" />
    </div>
    <div class="caption-text">${captionText}</div>
  `;

  photoWall.appendChild(card);
}

// 3. When photo is taken, pop open the review modal
cameraInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  selectedFile = file;
  previewImg.src = URL.createObjectURL(file);
  modalCaptionInput.value = ''; 
  previewModal.style.display = 'flex';
});

// Retake button (discard photo)
retakeBtn.addEventListener('click', () => {
  selectedFile = null;
  previewModal.style.display = 'none';
  cameraInput.value = '';
});

// Confirm and Upload button
confirmUploadBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    alert('No file found!');
    return;
  }

  const captionValue = modalCaptionInput.value.trim().substring(0, 10);
  previewModal.style.display = 'none';
  openCameraBtn.innerText = 'Uploading...';
  openCameraBtn.style.pointerEvents = 'none';

  try {
    const fileName = `public/${Date.now()}.jpg`;

    // Step 1: Upload to Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('Polaroids')
      .upload(fileName, selectedFile, { contentType: selectedFile.type || 'image/jpeg' });

    if (uploadError) {
      alert('Storage Upload Error: ' + uploadError.message);
      throw uploadError;
    }

    // Step 2: Get Public URL
    const { data: urlData } = supabaseClient.storage
      .from('Polaroids')
      .getPublicUrl(fileName);

    if (!urlData || !urlData.publicUrl) {
      alert('Could not get public URL for image');
      return;
    }

    // Step 3: Insert into Database table 'polaroids'
    const { error: dbError } = await supabaseClient
      .from('polaroids')
      .insert([{ image_url: urlData.publicUrl, caption: captionValue }]);

    if (dbError) {
      alert('Database Insert Error: ' + dbError.message);
      throw dbError;
    }

    // Success! Reset file
    selectedFile = null;
    // Force reload photos to show it immediately
    loadPhotos();

  } catch (err) {
    console.error('General error:', err);
  } finally {
    openCameraBtn.innerText = '📷 Snap Photo';
    openCameraBtn.style.pointerEvents = 'auto';
    cameraInput.value = '';
  }
});

// 4. Real-time updates for everyone's screen
supabaseClient
  .channel('polaroids_channel')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'polaroids' }, (payload) => {
    const card = document.createElement('div');
    card.className = 'polaroid';
    const randomTilt = rotations[Math.floor(Math.random() * rotations.length)];
    card.style.transform = `rotate(${randomTilt}deg)`;

    const captionText = payload.new.caption ? payload.new.caption.substring(0, 10) : '';

    card.innerHTML = `
      <div class="image-container">
        <img src="${payload.new.image_url}" alt="Wedding Moment" />
      </div>
      <div class="caption-text">${captionText}</div>
    `;

    photoWall.prepend(card);
  })
  .subscribe();

loadPhotos();
