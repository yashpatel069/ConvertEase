import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Apply admin access verification
router.use(authenticate as any);
router.use(requireAdmin as any);

router.get('/stats', AdminController.getAdminStats);
router.get('/metrics', AdminController.getServerMetrics);
router.get('/users', AdminController.getUsersList);
router.patch('/users/:id', AdminController.updateUserRole);
router.delete('/users/:id', AdminController.deleteUser);
router.get('/logs', AdminController.getConversionLogs);

export default router;
