const SUPABASE_URL = 'https://wynsipybuskswbogoomx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cBfTt9Z9R6ByKTAYecRVpw_TltjjOCH';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const cameraInput = document.getElementById('camera-input');
const openCameraBtn = document.getElementById('open-camera-btn');
const captionInput = document.getElementById('caption-input');
const photoWall = document.getElementById('photo-wall');

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

// 2. Render individual Polaroid card with a random slight tilt
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

// 3. Handle photo selection & upload with caption
cameraInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const captionValue = captionInput.value.trim().substring(0, 10);
  openCameraBtn.innerText = 'Uploading...';
  openCameraBtn.style.pointerEvents = 'none';

  try {
    const fileName = `public/${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from('POLAROIDS')
      .upload(fileName, file, { contentType: file.type || 'image/jpeg' });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseClient.storage
      .from('POLAROIDS')
      .getPublicUrl(fileName);

    const { error: dbError } = await supabaseClient
      .from('polaroids')
      .insert([{ image_url: urlData.publicUrl, caption: captionValue }]);

    if (dbError) throw dbError;

    captionInput.value = '';

  } catch (err) {
    alert('Upload error: ' + err.message);
  } finally {
    openCameraBtn.innerText = '📷 Open Camera';
    openCameraBtn.style.pointerEvents = 'auto';
    cameraInput.value = '';
  }
});

// 4. Listen for real-time inserts
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
