import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
  slug: z.string().optional(),
  parentCategory: z.string().nullable().optional(),
  image: z.string().url('Image must be a valid URL').or(z.literal('')).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().optional(),
  parentCategory: z.string().nullable().optional(),
  image: z.string().url('Image must be a valid URL').or(z.literal('')).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const categoryIdSchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
});

export const idOrSlugSchema = z.object({
  idOrSlug: z.string().min(1, 'ID or Slug is required'),
});
