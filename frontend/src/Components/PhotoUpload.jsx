import React, { useState } from 'react';

const PhotoUpload = ({ onPhotoUploaded }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);

  // เลือกไฟล์
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setUploadResults([]);
  };

  // อัพโหลดไฟล์
  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      alert('กรุณาเลือกไฟล์ก่อน');
      return;
    }

    setUploading(true);
    const results = [];

    // อัพโหลดทีละไฟล์
    for (const file of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append('photo', file);

        const response = await fetch('http://localhost:5050/api/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        
        if (response.ok) {
          results.push({
            file: file.name,
            success: true,
            qrCode: data.qrCode,
            downloadUrl: data.downloadUrl
          });
        } else {
          results.push({
            file: file.name,
            success: false,
            error: data.error
          });
        }
      } catch (error) {
        results.push({
          file: file.name,
          success: false,
          error: error.message
        });
      }
    }

    setUploadResults(results);
    setUploading(false);
    setSelectedFiles([]);
    
    // แจ้ง parent component ถ้ามีการอัพโหลดสำเร็จ
    if (results.some(r => r.success)) {
      onPhotoUploaded();
    }
  };

  // เคลียร์ผลลัพธ์
  const clearResults = () => {
    setUploadResults([]);
    document.getElementById('file-input').value = '';
  };

  return (
    <div className="photo-upload">
      <h2>อัพโหลดรูปภาพ</h2>
      
      <div className="upload-section">
        <div className="file-input-container">
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="file-input"
          />
          <label htmlFor="file-input" className="file-input-label">
            📁 เลือกไฟล์รูปภาพ
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="file-preview">
            <h3>ไฟล์ที่เลือก ({selectedFiles.length} ไฟล์):</h3>
            <ul>
              {selectedFiles.map((file, index) => (
                <li key={index}>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="upload-actions">
          <button 
            className="btn btn-primary"
            onClick={uploadFiles}
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading ? 'กำลังอัพโหลด...' : 'อัพโหลด'}
          </button>
          
          {uploadResults.length > 0 && (
            <button className="btn btn-secondary" onClick={clearResults}>
              เคลียร์ผลลัพธ์
            </button>
          )}
        </div>
      </div>

      {/* แสดงผลการอัพโหลด */}
      {uploadResults.length > 0 && (
        <div className="upload-results">
          <h3>ผลการอัพโหลด</h3>
          {uploadResults.map((result, index) => (
            <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
              <h4>{result.file}</h4>
              {result.success ? (
                <div className="success-content">
                  <p>✅ อัพโหลดสำเร็จ</p>
                  <div className="qr-result">
                    <img src={result.qrCode} alt="QR Code" className="qr-code-small" />
                    <p>QR Code สำหรับดาวน์โหลด</p>
                  </div>
                </div>
              ) : (
                <p className="error-message">❌ {result.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;