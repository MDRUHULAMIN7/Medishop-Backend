import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { ImageProcessor } from '../../utils/imageProcessor';
import { uploadToCloudinary } from '../../middlewares/upload';

export const uploadSingleImage = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    throw new AppError('No image file provided for upload', 400, 'NO_FILE_PROVIDED');
  }

  const type = (req.query.type as string) || (req.body.type as string) || 'general';
  const applyWatermark = req.query.watermark !== 'false' && req.body.watermark !== false;

  let processed;
  let folder = 'medishop/general';

  switch (type) {
    case 'product':
      processed = await ImageProcessor.processProductImage(file.buffer, applyWatermark);
      folder = 'medishop/products';
      break;
    case 'banner':
      processed = await ImageProcessor.processBannerImage(file.buffer);
      folder = 'medishop/banners';
      break;
    case 'avatar':
      processed = await ImageProcessor.processAvatarImage(file.buffer);
      folder = 'medishop/avatars';
      break;
    default:
      processed = await ImageProcessor.processGeneralImage(file.buffer);
      folder = 'medishop/general';
      break;
  }

  const url = await uploadToCloudinary(processed.mainBuffer, folder, 'webp');
  let thumbnailUrl: string | undefined;

  if (processed.thumbnailBuffer) {
    thumbnailUrl = await uploadToCloudinary(processed.thumbnailBuffer, `${folder}/thumbnails`, 'webp');
  }

  return ApiResponse.success(res, 'Image processed and uploaded successfully', {
    url,
    thumbnailUrl: thumbnailUrl || url,
    format: 'webp',
    originalName: file.originalname,
  });
});

export const uploadMultipleImages = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    throw new AppError('No image files provided for upload', 400, 'NO_FILES_PROVIDED');
  }

  const type = (req.query.type as string) || 'product';
  const applyWatermark = req.query.watermark !== 'false';
  const folder = type === 'product' ? 'medishop/products' : 'medishop/general';

  const uploadPromises = files.map(async (file) => {
    const processed = type === 'product'
      ? await ImageProcessor.processProductImage(file.buffer, applyWatermark)
      : await ImageProcessor.processGeneralImage(file.buffer);

    const url = await uploadToCloudinary(processed.mainBuffer, folder, 'webp');
    let thumbnailUrl: string | undefined;

    if (processed.thumbnailBuffer) {
      thumbnailUrl = await uploadToCloudinary(processed.thumbnailBuffer, `${folder}/thumbnails`, 'webp');
    }

    return {
      url,
      thumbnailUrl: thumbnailUrl || url,
      format: 'webp',
      originalName: file.originalname,
    };
  });

  const results = await Promise.all(uploadPromises);

  return ApiResponse.success(res, 'Images processed and uploaded successfully', {
    images: results,
    count: results.length,
  });
});
