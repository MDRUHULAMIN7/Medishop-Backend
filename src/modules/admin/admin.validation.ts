import { z } from 'zod';

export const lowStockQuerySchema = z.object({
  threshold: z.string().optional(),
});

export const adminAnalyticsQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  channel: z.enum(['all', 'online', 'pos']).optional(),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  staffId: z.string().optional(),
  includeRows: z.enum(['true', 'false']).optional(),
});

export const productInsightsParamsSchema = z.object({
  productId: z.string().min(1),
});
