import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { uploadToCloudinary } from '../../middlewares/upload';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { prescriptionService } from './prescription.service';

export const uploadPrescription = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  let imageUrls: string[] = req.body.images || [];

  if (files && files.length > 0) {
    const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer, 'medishop/prescriptions'));
    const uploadedUrls = await Promise.all(uploadPromises);
    imageUrls = [...imageUrls, ...uploadedUrls];
  }

  const prescription = await prescriptionService.uploadPrescription(req.user!.id, {
    images: imageUrls,
    note: req.body.note,
  });

  return ApiResponse.success(
    res,
    'Prescription uploaded successfully and submitted to pharmacist review queue',
    prescription,
    HTTP_STATUS.CREATED
  );
});

export const getMyPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const prescriptions = await prescriptionService.getMyPrescriptions(req.user!.id);
  return ApiResponse.success(res, 'My prescriptions fetched successfully', prescriptions);
});

export const getMyPrescriptionById = asyncHandler(async (req: Request, res: Response) => {
  const prescription = await prescriptionService.getMyPrescriptionById(req.user!.id, req.params.id);
  return ApiResponse.success(res, 'Prescription details fetched successfully', prescription);
});

export const getPrescriptionQueue = asyncHandler(async (req: Request, res: Response) => {
  const result = await prescriptionService.getPrescriptionQueue(req.query as any);
  return ApiResponse.success(
    res,
    'Pharmacist review queue fetched successfully',
    result.prescriptions,
    HTTP_STATUS.OK,
    result.meta
  );
});

export const getPrescriptionById = asyncHandler(async (req: Request, res: Response) => {
  const prescription = await prescriptionService.getPrescriptionById(req.params.id);
  return ApiResponse.success(res, 'Prescription details fetched successfully', prescription);
});

export const reviewPrescription = asyncHandler(async (req: Request, res: Response) => {
  const prescription = await prescriptionService.reviewPrescription(
    req.params.id,
    req.user!.id,
    req.body
  );
  return ApiResponse.success(res, `Prescription ${req.body.status} successfully`, prescription);
});
