const SUPABASE_URL = 'https://wynsipybuskswbogoomx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cBfTt9Z9R6ByKTAYecRVpw_TltjjOCH';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const cameraInput = document.getElementById('camera-input');
const uploadLabel = document.getElementById('upload-label');
const photoWall = document.getElementById('photo-wall');

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
    data.forEach(renderPhoto);
  }
}

// 2. Render individual photo card
function renderPhoto(photo) {
  const timeString = new Date(photo.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const card = document.createElement('div');
  card.className = 'polaroid';
  card.innerHTML = `
    <div class="image-container">
      <img src="${photo.image_url}" alt="Wedding Moment" />
    </div>
    <p class="date">${timeString}</p>
  `;

  photoWall.appendChild(card);
}

// 3. Handle photo upload
cameraInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  uploadLabel.innerText = 'Uploading...';

  try {
    const fileName = `public/${Date.now()}.jpg`;

    // Storage upload
    const { error: uploadError } = await supabaseClient.storage
      .from('POLAROIDS')
      .upload(fileName, file, { contentType: file.type || 'image/jpeg' });

    if (uploadError) throw uploadError;

    // Public URL retrieval
    const { data: urlData } = supabaseClient.storage
      .from('POLAROIDS')
      .getPublicUrl(fileName);

    // Database record creation
    const { error: dbError } = await supabaseClient
      .from('polaroids')
      .insert([{ image_url: urlData.publicUrl }]);

    if (dbError) throw dbError;

  } catch (err) {
    alert('Upload error: ' + err.message);
  } finally {
    uploadLabel.innerText = '📷 Take Photo';
    cameraInput.value = '';
  }
});

// 4. Listen for real-time inserts
supabaseClient
  .channel('polaroids_channel')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'polaroids' }, (payload) => {
    // Insert new photo at the top
    const timeString = new Date(payload.new.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    const card = document.createElement('div');
    card.className = 'polaroid';
    card.innerHTML = `
      <div class="image-container">
        <img src="${payload.new.image_url}" alt="Wedding Moment" />
      </div>
      <p class="date">${timeString}</p>
    `;

    photoWall.prepend(card);
  })
  .subscribe();

// Load photos on initialization
loadPhotos();
