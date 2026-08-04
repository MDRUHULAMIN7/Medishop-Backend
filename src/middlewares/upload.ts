import multer from 'multer';
import { AppError } from '../utils/AppError';
import { cloudinary } from '../config/cloudinary';

// Configure multer memory storage (files stored in memory buffer for stream uploading)
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
    fileSize: 5 * 1024 * 1024, // 5MB limit per image
  },
});

export const uploadToCloudinary = (buffer: Buffer, folder = 'medishop/products'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          return reject(new AppError('Cloudinary image upload failed', 500, 'CLOUDINARY_ERROR'));
        }
        resolve(result?.secure_url || '');
      }
    );
    uploadStream.end(buffer);
  });
};
