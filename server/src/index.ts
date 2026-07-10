import express from 'express';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load configurations
dotenv.config();

import { connectDB } from './config/db';
import { initSocket } from './config/socket';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes';
import { getLocalStorageDir } from './config/storage';

// Express app initialization
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Setup Socket.IO
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
initSocket(server, clientUrl);

// Logging
app.use(morgan('dev'));

// Security & Optimization headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Dev environments
  })
);

// CORS configuration
const allowedOrigins = [
  clientUrl,
  clientUrl.replace(/\/$/, ''),
  'http://localhost:5173'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const sanitized = origin.replace(/\/$/, '');
      const match = allowedOrigins.some(o => o.replace(/\/$/, '') === sanitized);
      if (match) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom lightweight cookie parser to avoid external dependencies
app.use((req: any, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie: string) => {
      const parts = cookie.split('=');
      const name = parts[0].trim();
      const val = parts.slice(1).join('='); // handle values that contain '='
      req.cookies[name] = decodeURIComponent(val || '');
    });
  }
  next();
});

// Setup static folders for storing/downloading processed files
const localStoreDir = getLocalStorageDir();
if (!fs.existsSync(localStoreDir)) {
  fs.mkdirSync(localStoreDir, { recursive: true });
}
app.use('/stored_files', express.static(localStoreDir));

// Root API Router
app.use('/api', apiRouter);

// Serve uploads folder for temporary access (optional/protected)
const tempUploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Serve React client static assets in production mode
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/stored_files')) {
        return next();
      }
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  }
}

// 404 Route handling
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Cannot perform ${req.method} on ${req.originalUrl}`
  });
});

// Centralized error boundary
app.use(errorHandler as any);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`   ConvertEase AI Server active on Port ${PORT} `);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Client Endpoint: ${clientUrl}`);
  console.log(`===========================================`);
});
