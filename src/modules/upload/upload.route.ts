import { Router } from 'express';
import { upload } from '../../middlewares/upload';
import { authenticate } from '../../middlewares/authenticate';
import { uploadSingleImage, uploadMultipleImages } from './upload.controller';

const router = Router();

/**
 * @openapi
 * /upload/single:
 *   post:
 *     summary: Upload and optimize a single image (WebP conversion, resize, compress, optional watermark)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [product, banner, avatar, general]
 *     responses:
 *       200:
 *         description: Image processed & uploaded
 */
router.post('/single', authenticate, upload.single('image'), uploadSingleImage);

/**
 * @openapi
 * /upload/multiple:
 *   post:
 *     summary: Batch upload and optimize multiple product images (WebP conversion & watermarking)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     responses:
 *       200:
 *         description: Images processed & uploaded
 */
router.post('/multiple', authenticate, upload.array('images', 10), uploadMultipleImages);

export default router;
