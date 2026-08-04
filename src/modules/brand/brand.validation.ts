import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters').max(100),
  slug: z.string().optional(),
  logo: z.string().url('Logo must be a valid URL').or(z.literal('')).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateBrandSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().optional(),
  logo: z.string().url('Logo must be a valid URL').or(z.literal('')).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const brandIdSchema = z.object({
  id: z.string().min(1, 'Brand ID is required'),
});

export const brandIdOrSlugSchema = z.object({
  idOrSlug: z.string().min(1, 'ID or Slug is required'),
});
