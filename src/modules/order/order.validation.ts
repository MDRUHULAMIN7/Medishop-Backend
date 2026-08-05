import { z } from 'zod';

const shippingAddressSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  division: z.string().optional(),
  district: z.string().min(1, 'District is required'),
  thana: z.string().min(1, 'Thana is required'),
  addressLine: z.string().min(1, 'Address line is required'),
  postalCode: z.string().optional(),
});

export const checkoutSchema = z.object({
  shippingAddressId: z.string().optional(),
  shippingAddress: shippingAddressSchema.optional(),
  paymentMethod: z.enum(['cod', 'bkash', 'nagad', 'card']).optional(),
  couponCode: z.string().optional(),
  prescriptionId: z.string().optional(),
  deliveryCharge: z.number().min(0).optional(),
  note: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  note: z.string().optional(),
});

export const orderIdSchema = z.object({
  id: z.string().min(1, 'Order ID is required'),
});

export const orderQuerySchema = z.object({
  orderStatus: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
