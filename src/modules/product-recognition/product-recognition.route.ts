import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticateScannerSession } from '../pos/scanner/scanner.middleware';
import { recognizeProduct } from './product-recognition.controller';
import { recognitionBodySchema } from './product-recognition.validation';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      const error = Object.assign(new Error('Only JPEG, PNG, and WebP images are accepted'), {
        statusCode: 400,
        errorCode: 'INVALID_IMAGE_TYPE',
      });
      return callback(error);
    }
    return callback(null, true);
  },
});

const recognitionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many recognition requests. Try again shortly.', errorCode: 'RECOGNITION_RATE_LIMITED' },
});

const router = Router();

router.post(
  '/',
  recognitionLimiter,
  upload.single('image'),
  authenticateScannerSession,
  authorize('admin', 'super_admin', 'pharmacist', 'sales_staff', 'inventory_manager'),
  validateRequest({ body: recognitionBodySchema }),
  recognizeProduct
);

export default router;
