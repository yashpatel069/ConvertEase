import { Router } from 'express';
import { FileController } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all file routes
router.use(authenticate as any);

router.get('/', FileController.getUserFiles as any);
router.get('/recent', FileController.getRecentFiles as any);
router.get('/analytics', FileController.getDashboardAnalytics as any);
router.post('/:id/favorite', FileController.toggleFavorite as any);
router.patch('/:id/rename', FileController.renameFile as any);
router.delete('/:id', FileController.deleteFile as any);
router.get('/:id/download', FileController.downloadFile as any);

export default router;
