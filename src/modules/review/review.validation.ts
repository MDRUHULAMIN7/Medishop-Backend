import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  comment: z.string().optional(),
});

export const productIdParamsSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export const reviewQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});
