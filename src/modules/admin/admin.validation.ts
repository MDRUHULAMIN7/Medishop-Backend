import { z } from 'zod';

export const lowStockQuerySchema = z.object({
  threshold: z.string().optional(),
});
