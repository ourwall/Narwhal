import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = 'https://wynsipybuskswbogoomx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cBfTt9Z9R6ByKTAYecRVpw_TltjjOCH';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPhotos();

    // Real-time listener for new photo posts
    const subscription = supabase
      .channel('polaroids_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'polaroids' }, (payload) => {
        setPhotos((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from('polaroids')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching photos:', error);
    else setPhotos(data || []);
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `public/${Date.now()}.jpg`;

      // 1. Upload directly to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('POLAROIDS')
        .upload(fileName, file, { contentType: file.type || 'image/jpeg' });

      if (uploadError) throw uploadError;

      // 2. Fetch public link
      const { data: urlData } = supabase.storage
        .from('POLAROIDS')
        .getPublicUrl(fileName);

      // 3. Save entry to database
      const { error: dbError } = await supabase
        .from('polaroids')
        .insert([{ image_url: urlData.publicUrl }]);

      if (dbError) throw dbError;
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      // Reset input so the same device can take back-to-back photos
      event.target.value = '';
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Wedding Photo Wall</h1>
        <button style={styles.snapButton} onClick={handleButtonClick} disabled={uploading}>
          {uploading ? 'Uploading...' : '📷 Take Photo'}
        </button>
        {/* Hidden native camera trigger */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </header>

      <main style={styles.wall}>
        {photos.map((photo) => (
          <div key={photo.id} style={styles.polaroid}>
            <div style={styles.imageContainer}>
              <img src={photo.image_url} alt="Wedding moment" style={styles.image} />
            </div>
            <p style={styles.date}>
              {new Date(photo.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
      </main>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#121212',
    minHeight: '100vh',
    color: '#fff',
    fontFamily: 'sans-serif',
    paddingBottom: '40px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#1e1e1e',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
  },
  title: { margin: 0, fontSize: '1.2rem' },
  snapButton: {
    backgroundColor: '#ff4081',
    color: '#fff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  wall: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    padding: '20px',
    justifyContent: 'center',
  },
  polaroid: {
    backgroundColor: '#fff',
    padding: '12px 12px 20px 12px',
    borderRadius: '4px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
    width: '240px',
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height: '240px',
    backgroundColor: '#eee',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  date: {
    color: '#333',
    margin: '12px 0 0 0',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
};
