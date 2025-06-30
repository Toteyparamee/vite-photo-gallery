const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { Pool } = require('pg');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5050;

// สร้างโฟลเดอร์ uploads ถ้ายังไม่มี
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Helper function สำหรับสร้าง base URL
const getBaseUrl = (req) => {
    const host = req.get('host');
    const protocol = req.protocol;
    
    // ใช้ protocol และ host ตามที่ request ส่งมา
    return `${protocol}://${host}`;
};

// Trust Proxy สำหรับ reverse proxy
app.set('trust proxy', true);

// CORS Configuration - อนุญาตทุก origin สำหรับ mobile
app.use(cors({
    origin: true, // อนุญาตทุก origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// เพิ่ม middleware สำหรับ preflight requests
app.options('*', cors());

// Middleware สำหรับ debug requests
app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.path} from ${req.get('origin') || 'no-origin'}`);
    console.log(`📱 User-Agent: ${req.get('user-agent')}`);
    console.log(`🔗 Host: ${req.get('host')}`);
    next();
});

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '50mb',
    parameterLimit: 50000
}));

// Static Files Configuration
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, path, stat) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.set('Cache-Control', 'public, max-age=31536000');
    }
}));

// เพิ่ม route สำหรับแสดงรูปโดยตรง
app.get('/api/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    console.log('🖼️ Image request:', filename);
    console.log('📁 Full path:', filePath);
    
    if (!fs.existsSync(filePath)) {
        console.log('❌ File not found:', filePath);
        return res.status(404).json({ error: 'Image not found' });
    }
    
    // ตั้งค่า headers สำหรับแสดงรูป
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    
    switch (ext) {
        case '.png':
            contentType = 'image/png';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
        case '.webp':
            contentType = 'image/webp';
            break;
        case '.svg':
            contentType = 'image/svg+xml';
            break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // ส่งไฟล์
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('❌ Error sending file:', err);
            res.status(500).json({ error: 'Failed to send image' });
        } else {
            console.log('✅ Image sent successfully:', filename);
        }
    });
});

// PostgreSQL connection
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// ทดสอบการเชื่อมต่อ
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection error:', err);
    } else {
        console.log('✅ Connected to PostgreSQL database');
        release();
    }
});

// Multer config สำหรับ mobile
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('📁 Setting destination to uploads/');
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        console.log('📝 Generated filename:', uniqueName);
        cb(null, uniqueName);
    }
});

// Multer limits สำหรับ mobile
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 50 * 1024 * 1024, // 50MB
        fieldSize: 50 * 1024 * 1024,
        fields: 10,
        files: 5
    },
    fileFilter: (req, file, cb) => {
        console.log('🔍 File filter check:', file.originalname, file.mimetype);
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// API Routes

// Route สำหรับทดสอบ connection
app.get('/api/test', (req, res) => {
    console.log('🧪 Test endpoint called');
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        baseUrl: getBaseUrl(req),
        headers: req.headers
    });
});

// Route 1: ดึงรูปทั้งหมด
app.get('/api/photos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM photos ORDER BY upload_date DESC');
        const baseUrl = getBaseUrl(req);
        
        const photosWithUrls = result.rows.map(photo => ({
            ...photo,
            imageUrl: `${baseUrl}/api/image/${photo.filename}`,
            staticUrl: `${baseUrl}/uploads/${photo.filename}`
        }));
        
        console.log(`📊 Fetched ${result.rows.length} photos`);
        res.json(photosWithUrls);
    } catch (error) {
        console.error('Error fetching photos:', error);
        res.status(500).json({ error: 'Failed to fetch photos' });
    }
});

// Route 2: อัพโหลดรูป สำหรับ mobile
app.post('/api/upload', (req, res) => {
    console.log('📤 Upload request received');
    console.log('📋 Headers:', req.headers);
    console.log('🔢 Content-Length:', req.get('content-length'));
    
    upload.single('photo')(req, res, async (err) => {
        if (err) {
            console.error('❌ Multer error:', err);
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'File too large. Max size is 50MB.' });
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({ error: 'Unexpected field name. Use "photo" as field name.' });
                }
            }
            return res.status(400).json({ error: err.message });
        }

        try {
            if (!req.file) {
                console.log('❌ No file in request');
                console.log('📋 Request body:', req.body);
                console.log('📁 Request files:', req.files);
                return res.status(400).json({ error: 'No file uploaded' });
            }

            console.log('📤 File received:', req.file.originalname);
            console.log('💾 Saved as:', req.file.filename);
            console.log('📏 File size:', req.file.size);

            const downloadToken = uuidv4();
            const filePath = req.file.path;
            const baseUrl = getBaseUrl(req);

            const result = await pool.query(
                `INSERT INTO photos (filename, original_name, file_path, file_size, mime_type, download_token) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [
                    req.file.filename,
                    req.file.originalname,
                    filePath,
                    req.file.size,
                    req.file.mimetype,
                    downloadToken
                ]
            );

            const photo = result.rows[0];
            const downloadUrl = `${baseUrl}/api/download/${downloadToken}`;
            const qrCodeDataUrl = await QRCode.toDataURL(downloadUrl);

            console.log('✅ Photo uploaded successfully:', photo.id);

            res.json({
                success: true,
                photo: {
                    ...photo,
                    imageUrl: `${baseUrl}/api/image/${photo.filename}`,
                    staticUrl: `${baseUrl}/uploads/${photo.filename}`
                },
                qrCode: qrCodeDataUrl,
                downloadUrl: downloadUrl
            });
        } catch (error) {
            console.error('❌ Error uploading photo:', error);
            res.status(500).json({ error: 'Failed to upload photo' });
        }
    });
});

// Route 3: สร้าง QR Code สำหรับดาวน์โหลด
app.get('/api/qr/:photoId', async (req, res) => {
    try {
        const { photoId } = req.params;
        const baseUrl = getBaseUrl(req);

        const result = await pool.query('SELECT download_token FROM photos WHERE id = $1', [photoId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        const downloadToken = result.rows[0].download_token;
        const downloadUrl = `${baseUrl}/api/download/${downloadToken}`;
        const qrCodeDataUrl = await QRCode.toDataURL(downloadUrl);

        console.log('🔲 QR Code generated for photo:', photoId);

        res.json({ qrCode: qrCodeDataUrl, downloadUrl: downloadUrl });
    } catch (error) {
        console.error('❌ Error generating QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Route 4: ดาวน์โหลดรูป
app.get('/api/download/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const result = await pool.query('SELECT * FROM photos WHERE download_token = $1', [token]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid download token' });
        }

        const photo = result.rows[0];

        // เพิ่มจำนวนการดาวน์โหลด
        await pool.query('UPDATE photos SET download_count = download_count + 1 WHERE id = $1', [photo.id]);
        
        console.log('⬇️ Download:', photo.original_name);

        // ส่งไฟล์ให้ดาวน์โหลด
        res.download(photo.file_path, photo.original_name);
    } catch (error) {
        console.error('❌ Error downloading photo:', error);
        res.status(500).json({ error: 'Failed to download photo' });
    }
});

// Route 5: ลบรูป
app.delete('/api/photos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('SELECT file_path, original_name FROM photos WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        const filePath = result.rows[0].file_path;
        const fileName = result.rows[0].original_name;

        // ลบไฟล์จากระบบ
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Deleted file:', fileName);
        }

        // ลบจาก database
        await pool.query('DELETE FROM photos WHERE id = $1', [id]);

        console.log('✅ Photo deleted from database:', id);

        res.json({ message: 'Photo deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting photo:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        baseUrl: getBaseUrl(req),
        userAgent: req.get('user-agent')
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('🚨 Global error handler:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }
    
    res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
    console.log(`📡 Local URL: http://localhost:${PORT}`);
    console.log(`🖼️ Static files: http://localhost:${PORT}/uploads/`);
    console.log(`🖼️ Image API: http://localhost:${PORT}/api/image/`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});