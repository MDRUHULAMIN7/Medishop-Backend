import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { courierService } from './courier.service';

export const getCourierProviderStatus = asyncHandler(async (_req: Request, res: Response) => {
  return ApiResponse.success(
    res,
    'Courier provider status fetched successfully',
    courierService.getProviderStatus()
  );
});

export const getCourierZones = asyncHandler(async (req: Request, res: Response) => {
  const district = typeof req.query.district === 'string' ? req.query.district : undefined;

  return ApiResponse.success(res, 'Courier zones fetched successfully', {
    zones: courierService.getZones(district),
    providerStatus: courierService.getProviderStatus(),
  });
});

export const calculateCourierFee = asyncHandler(async (req: Request, res: Response) => {
  const result = await courierService.calculateDeliveryFee(req.body);
  return ApiResponse.success(res, 'Courier fee calculated successfully', result);
});

export const createCourierShipment = asyncHandler(async (req: Request, res: Response) => {
  const result = await courierService.createShipment(req.body);
  return ApiResponse.success(res, 'Shipment created successfully', result, HTTP_STATUS.CREATED);
});

export const trackCourierShipment = asyncHandler(async (req: Request, res: Response) => {
  const { trackingNumber } = req.params;
  const result = await courierService.trackShipment(trackingNumber);
  return ApiResponse.success(res, 'Shipment tracking fetched successfully', result);
});

export const cancelCourierShipment = asyncHandler(async (req: Request, res: Response) => {
  const { trackingNumber } = req.params;
  const result = await courierService.cancelShipment(trackingNumber, req.body.reason);
  return ApiResponse.success(res, 'Shipment cancelled successfully', result);
});

export const requestCourierPickup = asyncHandler(async (req: Request, res: Response) => {
  const result = await courierService.requestPickup(req.body);
  return ApiResponse.success(res, 'Pickup request created successfully', result, HTTP_STATUS.CREATED);
});

export const getCourierShipments = asyncHandler(async (_req: Request, res: Response) => {
  return ApiResponse.success(res, 'Courier shipments fetched successfully', {
    shipments: courierService.getStoredShipments(),
    providerStatus: courierService.getProviderStatus(),
  });
});
