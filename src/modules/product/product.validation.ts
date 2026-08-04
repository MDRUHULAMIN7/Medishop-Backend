import { z } from 'zod';

const dosageFormEnum = z.enum([
  'tablet',
  'syrup',
  'capsule',
  'saline',
  'injection',
  'ointment',
  'drop',
  'inhaler',
  'powder',
  'suppository',
  'other',
]);

const unitTypeEnum = z.enum([
  'pcs',
  'strip',
  'box',
  'bottle',
  'tube',
  'gm',
  'ml',
  'pack',
]);

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
  slug: z.string().optional(),
  genericName: z.string().optional(),
  dosageForm: dosageFormEnum,
  strength: z.string().optional(),
  unitType: unitTypeEnum,
  packSize: z.string().optional(),
  description: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  category: z.string().min(1, 'Category ID is required'),
  brand: z.string().min(1, 'Brand ID is required'),
  price: z.union([z.number().min(0), z.string().transform((val) => Number(val))]),
  discountPrice: z
    .union([z.number().min(0), z.string().transform((val) => (val ? Number(val) : undefined))])
    .optional(),
  stock: z.union([z.number().min(0), z.string().transform((val) => Number(val))]),
  expiryDate: z.string().nullable().optional(),
  batchNumber: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  requiresPrescription: z.union([z.boolean(), z.string().transform((v) => v === 'true')]).optional(),
  isFeatured: z.union([z.boolean(), z.string().transform((v) => v === 'true')]).optional(),
  isActive: z.union([z.boolean(), z.string().transform((v) => v !== 'false')]).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  slug: z.string().optional(),
  genericName: z.string().optional(),
  dosageForm: dosageFormEnum.optional(),
  strength: z.string().optional(),
  unitType: unitTypeEnum.optional(),
  packSize: z.string().optional(),
  description: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  price: z.union([z.number().min(0), z.string().transform((val) => Number(val))]).optional(),
  discountPrice: z
    .union([z.number().min(0), z.string().transform((val) => (val ? Number(val) : undefined))])
    .optional(),
  stock: z.union([z.number().min(0), z.string().transform((val) => Number(val))]).optional(),
  expiryDate: z.string().nullable().optional(),
  batchNumber: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  requiresPrescription: z.union([z.boolean(), z.string().transform((v) => v === 'true')]).optional(),
  isFeatured: z.union([z.boolean(), z.string().transform((v) => v === 'true')]).optional(),
  isActive: z.union([z.boolean(), z.string().transform((v) => v === 'true')]).optional(),
});

export const productIdSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
});

export const productIdOrSlugSchema = z.object({
  idOrSlug: z.string().min(1, 'ID or Slug is required'),
});

export const productQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  dosageForm: z.string().optional(),
  unitType: z.string().optional(),
  isFeatured: z.string().optional(),
  requiresPrescription: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  includeInactive: z.string().optional(),
});

export const searchSuggestionsQuerySchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().optional(),
});
