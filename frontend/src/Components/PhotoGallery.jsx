import React, { useState } from 'react';

const PhotoGallery = ({ photos, loading, onPhotoDeleted }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showQR, setShowQR] = useState({});

  // ฟังก์ชันลบรูป
  const deletePhoto = async (photoId) => {
    if (!window.confirm('คุณต้องการลบรูปนี้หรือไม่?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5050/api/photos/${photoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('ลบรูปเรียบร้อยแล้ว');
        onPhotoDeleted();
      } else {
        alert('เกิดข้อผิดพลาดในการลบรูป');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('เกิดข้อผิดพลาดในการลบรูป');
    }
  };

  // ฟังก์ชันสร้าง QR Code
  const generateQR = async (photoId) => {
    try {
      const response = await fetch(`http://localhost:5050/api/qr/${photoId}`);
      const data = await response.json();
      
      setShowQR(prev => ({
        ...prev,
        [photoId]: data.qrCode
      }));
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('เกิดข้อผิดพลาดในการสร้าง QR Code');
    }
  };

  // ฟังก์ชันปิด QR Code
  const hideQR = (photoId) => {
    setShowQR(prev => {
      const newState = { ...prev };
      delete newState[photoId];
      return newState;
    });
  };

  // ฟังก์ชันแสดงรูปขนาดใหญ่
  const openModal = (photo) => {
    setSelectedPhoto(photo);
  };

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  // ฟังก์ชันสำหรับ URL รูปภาพ
  const getImageUrl = (photo) => {
    // ลองใช้ imageUrl ก่อน ถ้าไม่มีก็ใช้ staticUrl หรือสร้างจาก filename
    if (photo.imageUrl) {
      return photo.imageUrl;
    } else if (photo.staticUrl) {
      return photo.staticUrl;
    } else {
      return `http://localhost:5050/api/image/${photo.filename}`;
    }
  };

  // ฟังก์ชันจัดการข้อผิดพลาดรูป
  const handleImageError = (e, photo) => {
    console.error('Image load error for:', photo.filename);
    // ลองใช้ URL สำรอง
    const fallbackUrl = `http://localhost:5050/uploads/${photo.filename}`;
    if (e.target.src !== fallbackUrl) {
      e.target.src = fallbackUrl;
    } else {
      // ถ้า fallback ก็ล้มเหลว ให้แสดงรูป placeholder
      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <p>กำลังโหลดรูปภาพ...</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="no-photos">
        <p>ยังไม่มีรูปภาพในระบบ</p>
        <p>กรุณาอัพโหลดรูปใหม่</p>
      </div>
    );
  }

  return (
    <div className="photo-gallery">
      <h2>รูปภาพทั้งหมด ({photos.length} รูป)</h2>
      
      <div className="photos-grid">
        {photos.map((photo) => (
          <div key={photo.id} className="photo-card">
            <div className="photo-container">
              <img
                src={getImageUrl(photo)}
                alt={photo.original_name}
                className="photo-thumbnail"
                onClick={() => openModal(photo)}
                onError={(e) => handleImageError(e, photo)}
                onLoad={() => console.log(`✅ Image loaded: ${photo.filename}`)}
              />
              
              <div className="photo-overlay">
                <button 
                  className="btn btn-view"
                  onClick={() => openModal(photo)}
                  title="ดูรูปขนาดใหญ่"
                >
                  👁️
                </button>
                <button 
                  className="btn btn-qr"
                  onClick={() => generateQR(photo.id)}
                  title="สร้าง QR Code"
                >
                  📱
                </button>
                <button 
                  className="btn btn-delete"
                  onClick={() => deletePhoto(photo.id)}
                  title="ลบรูป"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <div className="photo-info">
              <h3>{photo.original_name}</h3>
              <p>ขนาด: {(photo.file_size / 1024 / 1024).toFixed(2)} MB</p>
              <p>อัพโหลด: {new Date(photo.upload_date).toLocaleDateString('th-TH')}</p>
              {photo.download_count > 0 && (
                <p>ดาวน์โหลด: {photo.download_count} ครั้ง</p>
              )}
            </div>

            {/* แสดง QR Code */}
            {showQR[photo.id] && (
              <div className="qr-display">
                <img src={showQR[photo.id]} alt="QR Code" className="qr-code" />
                <button 
                  className="btn btn-close"
                  onClick={() => hideQR(photo.id)}
                >
                  ปิด
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal สำหรับแสดงรูปขนาดใหญ่ */}
      {selectedPhoto && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            <img
              src={getImageUrl(selectedPhoto)}
              alt={selectedPhoto.original_name}
              className="modal-image"
              onError={(e) => handleImageError(e, selectedPhoto)}
            />
            <div className="modal-info">
              <h3>{selectedPhoto.original_name}</h3>
              <p>ขนาด: {(selectedPhoto.file_size / 1024 / 1024).toFixed(2)} MB</p>
              <p>อัพโหลด: {new Date(selectedPhoto.upload_date).toLocaleString('th-TH')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;