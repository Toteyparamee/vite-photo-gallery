import React, { useState, useEffect } from 'react';
import PhotoGallery from './Components/PhotoGallery';
import PhotoUpload from './Components/PhotoUpload';
import './App.css';

function App() {
  const [photos, setPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState('gallery');
  const [loading, setLoading] = useState(false);

  // ฟังก์ชันดึงข้อมูลรูปจาก API
  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5050/api/photos');
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลตอน component mount
  useEffect(() => {
    fetchPhotos();
  }, []);

  // Callback เมื่ออัพโหลดเสร็จ
  const handlePhotoUploaded = () => {
    fetchPhotos();               // รีเฟรชรายการรูป
    setActiveTab('gallery');     // เปลี่ยนไปแท็บแกลเลอรี่
  };

  // Callback เมื่อลบรูปเสร็จ
  const handlePhotoDeleted = () => {
    fetchPhotos();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📸 Photo Gallery</h1>
        <nav className="nav-tabs">
          <button 
            className={activeTab === 'gallery' ? 'active' : ''}
            onClick={() => setActiveTab('gallery')}
          >
            รูปภาพทั้งหมด
          </button>
          <button 
            className={activeTab === 'upload' ? 'active' : ''}
            onClick={() => setActiveTab('upload')}
          >
            อัพโหลดรูป
          </button>
        </nav>
      </header>

      <main className="main-content">
        {activeTab === 'gallery' && (
          <PhotoGallery 
            photos={photos} 
            loading={loading} 
            onPhotoDeleted={handlePhotoDeleted}
          />
        )}
        {activeTab === 'upload' && (
          <PhotoUpload onPhotoUploaded={handlePhotoUploaded} />
        )}
      </main>
    </div>
  );
}

export default App;