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

// Reusable packaging tier schema (maps to product.model.ts packaging[] subdoc)
const packagingTierSchema = z.object({
  unit: unitTypeEnum,
  baseUnitQty: z.union([z.number().min(1), z.string().transform((v) => Number(v))]).optional().default(1),
  buyingPrice: z.union([z.number().min(0), z.string().transform((v) => (v ? Number(v) : 0))]).optional().default(0),
  price: z.union([z.number().min(0), z.string().transform((v) => Number(v))]),
  mrp: z.union([z.number().min(0), z.string().transform((v) => Number(v))]).optional(),
  discountPrice: z.union([z.number().min(0), z.string().transform((v) => (v ? Number(v) : undefined))]).optional(),
  barcode: z.string().optional(),
  isDefault: z.union([z.boolean(), z.string().transform((v) => v === 'true')]).optional().default(false),
  isActive: z.union([z.boolean(), z.string().transform((v) => v !== 'false')]).optional().default(true),
});

// Reusable unit price tier schema (maps to product.model.ts unitPrices[] subdoc)
const unitPriceTierSchema = z.object({
  unit: unitTypeEnum,
  baseUnitQty: z.union([z.number().min(1), z.string().transform((v) => Number(v))]).optional().default(1),
  unitLabelBn: z.string().optional(),
  unitLabelEn: z.string().optional(),
  buyingPrice: z.union([z.number().min(0), z.string().transform((v) => (v ? Number(v) : 0))]).optional().default(0),
  price: z.union([z.number().min(0), z.string().transform((v) => Number(v))]),
  mrp: z.union([z.number().min(0), z.string().transform((v) => Number(v))]).optional(),
  discountPrice: z.union([z.number().min(0), z.string().transform((v) => (v ? Number(v) : undefined))]).optional(),
  stock: z.union([z.number().min(0), z.string().transform((v) => Number(v))]).optional().default(0),
  multiplier: z.union([z.number().min(1), z.string().transform((v) => Number(v))]).optional().default(1),
  isDefault: z.union([z.boolean(), z.string().transform((v) => v === 'true')]).optional().default(false),
});

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
  slug: z.string().optional(),
  genericName: z.string().optional(),
  dosageForm: dosageFormEnum,
  strength: z.string().optional(),
  baseUnit: z.enum(['pcs', 'ml', 'gm']).optional().default('pcs'),
  unitType: unitTypeEnum,
  packaging: z.array(packagingTierSchema).optional(),
  unitPrices: z.array(unitPriceTierSchema).optional(),
  packSize: z.string().optional(),
  description: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  category: z.string().min(1, 'Category ID is required'),
  brand: z.string().min(1, 'Brand ID is required'),
  buyingPrice: z.union([z.number().min(0), z.string().transform((val) => (val ? Number(val) : 0))]).optional().default(0),
  price: z.union([z.number().min(0), z.string().transform((val) => Number(val))]),
  discountPrice: z
    .union([z.number().min(0), z.string().transform((val) => (val ? Number(val) : undefined))])
    .optional(),
  stock: z.union([z.number().min(0), z.string().transform((val) => Number(val))]),
  expiryDate: z.string().nullable().optional(),
  batchNumber: z.string().optional(),
  images: z.array(z.string()).optional(),
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
  baseUnit: z.enum(['pcs', 'ml', 'gm']).optional(),
  unitType: unitTypeEnum.optional(),
  packaging: z.array(packagingTierSchema).optional(),
  unitPrices: z.array(unitPriceTierSchema).optional(),
  packSize: z.string().optional(),
  description: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  buyingPrice: z.union([z.number().min(0), z.string().transform((val) => (val ? Number(val) : 0))]).optional(),
  price: z.union([z.number().min(0), z.string().transform((val) => Number(val))]).optional(),
  discountPrice: z
    .union([z.number().min(0), z.string().transform((val) => (val ? Number(val) : undefined))])
    .optional(),
  stock: z.union([z.number().min(0), z.string().transform((val) => Number(val))]).optional(),
  expiryDate: z.string().nullable().optional(),
  batchNumber: z.string().optional(),
  images: z.array(z.string()).optional(),
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
  inStock: z.string().optional(),
  includeInactive: z.string().optional(),
});

export const searchSuggestionsQuerySchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().optional(),
});
