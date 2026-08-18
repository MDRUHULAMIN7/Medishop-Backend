import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  code: z.string().min(2, 'Store code is required'),
  address: z.string().min(2, 'Address is required'),
  phone: z.string().min(2, 'Phone is required'),
  isMainStore: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  storeId: z.string().optional(),
  quantityChange: z.number().int('Quantity change must be an integer').refine((val) => val !== 0, 'Quantity change cannot be 0'),
  reason: z.enum([
    'pos_sale',
    'online_order',
    'purchase_restock',
    'pos_return',
    'order_cancellation',
    'manual_adjustment',
    'damage_expiry_writeoff',
  ]),
  note: z.string().optional(),
});

export const posCheckoutSchema = z.object({
  storeId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  customerUser: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        unitPrice: z.number().min(0).optional(),
        batchNumber: z.string().optional(),
      })
    )
    .min(1, 'At least 1 item is required for POS sale'),
  discountTotal: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(['cash', 'card', 'bkash', 'nagad']).optional(),
  note: z.string().optional(),
});

export const invoiceNumberParamsSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
});
