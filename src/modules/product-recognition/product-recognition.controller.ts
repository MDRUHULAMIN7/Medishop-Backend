import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { getIO } from '../../socket';
import { productRecognitionService } from './product-recognition.service';

export const recognizeProduct = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return ApiResponse.error(res, 'A product image is required', 400, 'IMAGE_REQUIRED');
  }

  const sessionId = req.scannerSession?.sessionId;
  if (sessionId) getIO()?.to(`pos-scanner:${sessionId}`).emit('pos:scanner:recognizing', { sessionId });

  try {
    const result = await productRecognitionService.recognizeProduct({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
    });

    if (sessionId) {
      getIO()?.to(`pos-scanner:${sessionId}`).emit('pos:scanner:result', {
        sessionId,
        matches: result.matches,
        candidates: result.matches,
        provider: result.provider,
        model: result.model,
      });
    }

    return ApiResponse.success(res, result.matches.length ? 'Product matches found' : 'No matching product found', result);
  } catch (error) {
    if ((error as any)?.recognitionCode === 'INVALID_IMAGE') {
      if (sessionId) {
        getIO()?.to(`pos-scanner:${sessionId}`).emit('pos:scanner:error', {
          sessionId,
          message: 'The uploaded file is not a valid readable image.',
        });
      }
      return ApiResponse.error(res, 'The uploaded file is not a valid readable image', 400, 'INVALID_IMAGE');
    }
    if (sessionId) {
      getIO()?.to(`pos-scanner:${sessionId}`).emit('pos:scanner:error', {
        sessionId,
        message: 'Image recognition is temporarily unavailable. Please search the product manually.',
      });
    }
    console.warn('Local product recognition unavailable:', (error as Error).message);
    return ApiResponse.error(
      res,
      'Image recognition is temporarily unavailable. Please search the product manually.',
      503,
      'RECOGNITION_UNAVAILABLE',
    );
  }
});
