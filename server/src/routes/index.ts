import { Router } from 'express';
import authRoutes from './authRoutes';
import fileRoutes from './fileRoutes';
import conversionRoutes from './conversionRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

// API Namespace mounts
router.use('/auth', authRoutes);
router.use('/files', fileRoutes);
router.use('/process', conversionRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

export default router;
