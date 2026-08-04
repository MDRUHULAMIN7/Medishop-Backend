import { z } from 'zod';

export const uploadPrescriptionSchema = z.object({
  note: z.string().optional(),
  images: z.array(z.string().url()).optional(),
});

export const reviewPrescriptionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
});

export const prescriptionIdSchema = z.object({
  id: z.string().min(1, 'Prescription ID is required'),
});

export const prescriptionQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
