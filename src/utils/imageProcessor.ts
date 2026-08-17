import sharp from 'sharp';
import { logger } from '../middlewares/requestLogger';

export interface ProcessedImageResult {
  mainBuffer: Buffer;
  thumbnailBuffer?: Buffer;
  mimeType: string;
  format: string;
  width?: number;
  height?: number;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  fit?: keyof sharp.FitEnum;
  watermark?: boolean;
  generateThumbnail?: boolean;
  thumbnailSize?: number;
}

/**
 * Generate a subtle, clean SVG watermark for product images
 */
function createWatermarkSvg(text = 'mediShop'): Buffer {
  const svg = `
    <svg width="180" height="40" viewBox="0 0 180 40" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="180" height="40" rx="8" fill="rgba(15, 23, 42, 0.45)" />
      <!-- Small Pill Symbol -->
      <circle cx="22" cy="20" r="7" fill="#3B82F6" opacity="0.85" />
      <path d="M18 20 A4 4 0 0 1 26 20 Z" fill="#FFFFFF" opacity="0.9" />
      <!-- Watermark Brand Text -->
      <text x="36" y="25" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF" opacity="0.85" letter-spacing="0.5">
        ${text}
      </text>
    </svg>
  `;
  return Buffer.from(svg);
}

export class ImageProcessor {
  /**
   * Process a product image:
   * 1. Auto-rotate based on EXIF
   * 2. Resize to max 1200x1200px (preserve aspect ratio)
   * 3. Add subtle bottom-right watermark if requested
   * 4. Compress and convert to WebP (quality 82)
   * 5. Generate 300x300 thumbnail
   */
  static async processProductImage(
    buffer: Buffer,
    watermark = true
  ): Promise<ProcessedImageResult> {
    try {
      let pipeline = sharp(buffer).rotate();
      const metadata = await pipeline.metadata();

      const targetWidth = metadata.width && metadata.width > 1200 ? 1200 : undefined;
      const targetHeight = metadata.height && metadata.height > 1200 ? 1200 : undefined;

      if (targetWidth || targetHeight) {
        pipeline = pipeline.resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      if (watermark) {
        const watermarkBuffer = createWatermarkSvg('mediShop');
        pipeline = pipeline.composite([
          {
            input: watermarkBuffer,
            gravity: 'southeast',
            top: undefined,
            left: undefined,
          },
        ]);
      }

      const mainBuffer = await pipeline
        .webp({ quality: 82, effort: 4 })
        .toBuffer();

      // Generate 300x300 thumbnail
      const thumbnailBuffer = await sharp(buffer)
        .rotate()
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();

      return {
        mainBuffer,
        thumbnailBuffer,
        mimeType: 'image/webp',
        format: 'webp',
      };
    } catch (err: any) {
      logger.error({ err }, 'Sharp product image processing failed, falling back to original');
      return {
        mainBuffer: buffer,
        mimeType: 'image/jpeg',
        format: 'jpeg',
      };
    }
  }

  /**
   * Process User Profile Avatar:
   * 1. Auto-rotate
   * 2. Crop to square 400x400
   * 3. Compress and convert to WebP (quality 85)
   */
  static async processAvatarImage(buffer: Buffer): Promise<ProcessedImageResult> {
    try {
      const mainBuffer = await sharp(buffer)
        .rotate()
        .resize(400, 400, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toBuffer();

      return {
        mainBuffer,
        mimeType: 'image/webp',
        format: 'webp',
      };
    } catch (err: any) {
      logger.error({ err }, 'Sharp avatar processing failed, falling back to original');
      return {
        mainBuffer: buffer,
        mimeType: 'image/jpeg',
        format: 'jpeg',
      };
    }
  }

  /**
   * Process Promotional / Hero Banner Image:
   * 1. Auto-rotate
   * 2. Resize to max 1920x800px
   * 3. Compress and convert to WebP (quality 85)
   */
  static async processBannerImage(buffer: Buffer): Promise<ProcessedImageResult> {
    try {
      const mainBuffer = await sharp(buffer)
        .rotate()
        .resize(1920, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85, effort: 4 })
        .toBuffer();

      return {
        mainBuffer,
        mimeType: 'image/webp',
        format: 'webp',
      };
    } catch (err: any) {
      logger.error({ err }, 'Sharp banner processing failed, falling back to original');
      return {
        mainBuffer: buffer,
        mimeType: 'image/jpeg',
        format: 'jpeg',
      };
    }
  }

  /**
   * Flexible general image processing
   */
  static async processGeneralImage(
    buffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImageResult> {
    try {
      const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 82,
        fit = 'inside',
        watermark = false,
        generateThumbnail = false,
        thumbnailSize = 300,
      } = options;

      let pipeline = sharp(buffer).rotate();

      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit,
        withoutEnlargement: true,
      });

      if (watermark) {
        pipeline = pipeline.composite([
          {
            input: createWatermarkSvg('mediShop'),
            gravity: 'southeast',
          },
        ]);
      }

      const mainBuffer = await pipeline.webp({ quality }).toBuffer();

      let thumbnailBuffer: Buffer | undefined;
      if (generateThumbnail) {
        thumbnailBuffer = await sharp(buffer)
          .rotate()
          .resize(thumbnailSize, thumbnailSize, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer();
      }

      return {
        mainBuffer,
        thumbnailBuffer,
        mimeType: 'image/webp',
        format: 'webp',
      };
    } catch (err: any) {
      logger.error({ err }, 'Sharp general image processing failed');
      return {
        mainBuffer: buffer,
        mimeType: 'image/jpeg',
        format: 'jpeg',
      };
    }
  }
}
