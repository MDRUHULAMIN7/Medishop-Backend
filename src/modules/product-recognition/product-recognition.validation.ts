import { z } from 'zod';

export const recognitionBodySchema = z.object({
  scannerSessionId: z.string().min(32).max(128).optional(),
  scannerToken: z.string().min(32).max(256).optional(),
});
