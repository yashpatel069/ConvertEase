# ConvertEase AI - Document & Image Processing Platform

ConvertEase AI is a production-ready, enterprise-grade document and image processing ecosystem. Built with a responsive, glassmorphic layout, it delivers tools for editing PDFs, resizing and converting images, extracting language text via OCR, and custom pixel filtering inside a Canvas Image Editor.

## 🚀 Key Features

* **PDF Utilities**: Page merges, page splits, page rotations, rearrangements, watermark stampings, password encryption lock/unlock, and Word-to-PDF/PDF-to-Word conversions.
* **Image Converter**: Batch conversions for PNG, JPEG, WEBP, SVG, TIFF, BMP, and ICO formats.
* **Compressor**: Lossy and lossless optimizations with real-time quality slider, size preview, and target size matching.
* **Photo Editor**: Web canvas-based crops, draws, adjustments (brightness, exposure, saturation), filter presets, text overlays, and AI background removals.
* **OCR Scanner**: Server-side OCR text isolator (Tesseract.js) supporting text previews, copies to clipboard, and compilations to DOCX, TXT, or searchable PDFs.
* **Dashboard Suite**: Dynamic Analytics (Recharts), File managers, search filters, and Admin centers.
* **Real-time Engine**: Background async queue with Socket.IO progress.

---

## 🛠️ Tech Stack

### Frontend
* React 19 + TypeScript + Vite
* Tailwind CSS + Framer Motion
* TanStack Query v5 + Axios
* React Hook Form + Zod
* Lucide React + React Hot Toast
* Recharts

### Backend
* Node.js + Express.js + TypeScript
* Multer + Sharp
* pdf-lib + pdf-parse + Mammoth
* Tesseract.js
* Mongoose + MongoDB Atlas
* Socket.IO

---

## 📂 File Structure

```
convert-ease-ai/
├── client/          # React 19 Client
├── server/          # Express.js Server
├── docker-compose.yml
├── .env.example     # Environment Variables Template
└── README.md        # Technical Documentation
```

---

## ⚙️ Development Installation

### Prerequisites
* Node.js v18 or later
* MongoDB Instance (running locally on port 27017, or a MongoDB Atlas URI)

### Backend Configuration
1. Navigate to `/server` and run:
   ```bash
   npm install
   ```
2. Create `server/.env` based on `server/.env.example` (or `root/.env.example`):
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/convertease
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   STORAGE_PROVIDER=local
   ```
3. Boot the backend server in development mode:
   ```bash
   npm run dev
   ```

### Frontend Configuration
1. Navigate to `/client` and run:
   ```bash
   npm install
   ```
2. Launch the Vite hot-reloading development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Deployment

The application is fully containerized. To spin up the databases, backend services, and Nginx-served frontend:

```bash
docker-compose up --build
```
* **Frontend**: `http://localhost:5173`
* **Backend**: `http://localhost:5000`
* **MongoDB**: `http://localhost:27017`
