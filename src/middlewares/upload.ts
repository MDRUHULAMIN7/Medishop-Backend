import multer from 'multer';
import { AppError } from '../utils/AppError';
import { cloudinary } from '../config/cloudinary';
import { logger } from './requestLogger';

// Configure multer memory storage (files stored in memory buffer for stream uploading & Sharp processing)
const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed!', 400, 'INVALID_FILE_TYPE') as any, false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per upload
  },
});

export const uploadToCloudinary = (
  buffer: Buffer,
  folder = 'medishop/products',
  format = 'webp'
): Promise<string> => {
  return new Promise((resolve) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;

    if (!cloudName || !apiKey || cloudName === 'demo' || apiKey === 'demo') {
      const mime = format === 'webp' ? 'image/webp' : 'image/jpeg';
      const base64 = `data:${mime};base64,${buffer.toString('base64')}`;
      return resolve(base64);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format,
      },
      (error, result) => {
        if (error) {
          logger.warn({ error }, 'Cloudinary upload failed, falling back to WebP data URI');
          const mime = format === 'webp' ? 'image/webp' : 'image/jpeg';
          const base64 = `data:${mime};base64,${buffer.toString('base64')}`;
          return resolve(base64);
        }
        resolve(result?.secure_url || '');
      }
    );
    uploadStream.end(buffer);
  });
};
