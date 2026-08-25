import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = 'https://wynsipybuskswbogoomx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cBfTt9Z9R6ByKTAYecRVpw_TltjjOCH';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPhotos();

    // Subscribe to real-time inserts
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

  const handleCapture = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `public/${Date.now()}.jpg`;

      // 1. Upload photo to Supabase Storage bucket
      const { error: uploadError } = await supabase.storage
        .from('polaroids')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL for the image
      const { data: urlData } = supabase.storage
        .from('polaroids')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // 3. Save photo entry to Database table
      const { error: dbError } = await supabase
        .from('polaroids')
        .insert([{ image_url: imageUrl }]);

      if (dbError) throw dbError;
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Wedding Photo Wall</h1>
        <label style={styles.snapButton}>
          {uploading ? 'Uploading...' : '📷 Take Photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
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
    padding: '10px 16px',
    borderRadius: '20px',
    fontWeight: 'bold',
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
