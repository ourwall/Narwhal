import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = 'https://wynsipybuskswbogoomx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cBfTt9Z9R6ByKTAYecRVpw_TltjjOCH';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      // Basic constraint so any available camera opens reliably
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      alert('Camera error: ' + err.message);
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert('Could not process photo blob.');
        return;
      }
      uploadPhoto(blob);
    }, 'image/jpeg');
  };

  const uploadPhoto = async (blob) => {
    setUploading(true);
    stopCamera();
    try {
      const fileName = `public/${Date.now()}.jpg`;

      // 1. Upload photo to Supabase Storage bucket (matching uppercase name)
      const { error: uploadError } = await supabase.storage
        .from('POLAROIDS')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: urlData } = supabase.storage
        .from('POLAROIDS')
        .getPublicUrl(fileName);

      // 3. Save entry to Database
      const { error: dbError } = await supabase
        .from('polaroids')
        .insert([{ image_url: urlData.publicUrl }]);

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
        {!isCameraOpen ? (
          <button style={styles.snapButton} onClick={startCamera} disabled={uploading}>
            {uploading ? 'Uploading...' : '📷 Open Camera'}
          </button>
        ) : (
          <button style={styles.cancelButton} onClick={stopCamera}>
            Cancel
          </button>
        )}
      </header>

      {/* Embedded Live Viewfinder */}
      {isCameraOpen && (
        <div style={styles.viewfinder}>
          <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
          <button style={styles.captureBtn} onClick={capturePhoto}>
            📸 Snap Photo
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

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
    padding: '10px 16px',
    borderRadius: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelButton: {
    backgroundColor: '#555',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
  },
  viewfinder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    maxWidth: '400px',
    borderRadius: '8px',
  },
  captureBtn: {
    marginTop: '15px',
    backgroundColor: '#ff4081',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '25px',
    fontSize: '1.1rem',
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
