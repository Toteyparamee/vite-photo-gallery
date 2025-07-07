ติดตั้ง PostgreSQL
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS (ด้วย Homebrew)
brew install postgresql

# Windows
# ดาวน์โหลดและติดตั้งจาก https://www.postgresql.org/download/windows/

สร้าง Database
sql-- เข้า PostgreSQL console
sudo -u postgres psql

-- สร้าง database
CREATE DATABASE photogallery_app;

-- สร้าง user (ถ้าต้องการ)
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE  photogallery_app TO your_username;

-- ออกจาก console
\q

ติดตั้ง package 
npm install

run web
cd /Users/vite-photo-gallery/backend/
npm run dev
cd /Users/vite-photo-gallery/frontend/
npm run dev

