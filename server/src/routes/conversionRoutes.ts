import { Router, Response, NextFunction } from 'express';
import { ConversionController } from '../controllers/conversionController';
import { upload } from '../middleware/upload';
import { processingLimiter } from '../middleware/rateLimiter';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';

const router = Router();

// Middleware to optionally attach user ID if signed in
const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = '';
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'development_access_token_secret_129847120394871029348'
      ) as { userId: string };

      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }
  } catch (error) {
    // Ignore errors for guests and continue
  }
  next();
};

// All processing routes accept guest operations but track users when logged in
router.use(optionalAuthenticate as any);
router.use(processingLimiter);

router.post('/convert', upload.single('file'), ConversionController.convertFile as any);
router.post('/compress', upload.single('file'), ConversionController.compressImage as any);
router.post('/pdf-op', upload.single('file'), ConversionController.pdfOperations as any);
router.post('/merge', upload.array('files', 20), ConversionController.mergePDFs as any);
router.post('/ocr', upload.single('file'), ConversionController.processOCR as any);

export default router;
