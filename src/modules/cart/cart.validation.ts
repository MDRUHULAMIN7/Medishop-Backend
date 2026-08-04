import { z } from 'zod';

export const addCartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int('Quantity must be an integer').min(0, 'Quantity cannot be negative'),
});

export const productIdParamsSchema = z.object({
  productId: z.string().min(1, 'Product ID parameter is required'),
});
