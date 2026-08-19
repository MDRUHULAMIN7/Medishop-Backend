import { z } from 'zod';

export const scannerSessionIdParamsSchema = z.object({
  sessionId: z.string().min(32).max(128),
});
