import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../../config/constants';
import { ApiResponse } from '../../../utils/ApiResponse';
import { asyncHandler } from '../../../utils/asyncHandler';
import { getScannerClientBaseUrl, scannerSessionService } from './scanner.service';

export const createScannerSession = asyncHandler(async (req: Request, res: Response) => {
  const result = await scannerSessionService.create(req.user!.id, getScannerClientBaseUrl(req.headers.origin));
  return ApiResponse.success(res, 'Scanner session created successfully', result, HTTP_STATUS.CREATED);
});

export const getScannerSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await scannerSessionService.getById(req.params.sessionId);
  return ApiResponse.success(res, 'Scanner session fetched successfully', scannerSessionService.toResponse(session as any));
});

export const closeScannerSession = asyncHandler(async (req: Request, res: Response) => {
  const result = await scannerSessionService.close(req.params.sessionId, req.user!.id);
  return ApiResponse.success(res, 'Scanner session closed successfully', result);
});
