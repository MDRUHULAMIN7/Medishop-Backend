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

const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  unit: z.string().optional(),
  unitMultiplier: z.number().min(1).optional(),
  unitPrice: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
  quantity: z.number().min(1),
  availableQuantity: z.number().min(0).optional(),
  preOrderQuantity: z.number().min(0).optional(),
  fulfillmentType: z.enum(['immediate', 'preorder', 'mixed']).optional(),
});

export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).optional(),
  shippingAddressId: z.string().optional(),
  shippingAddress: shippingAddressSchema.optional(),
  paymentMethod: z.enum(['cod', 'bkash', 'nagad', 'card', 'rocket', 'banking', 'sslcommerz', 'stripe']).optional(),
  couponCode: z.string().optional(),
  prescriptionId: z.string().optional(),
  deliveryCharge: z.number().min(0).optional(),
  isPreOrder: z.boolean().optional(),
  isSplitDelivery: z.boolean().optional(),
  shipment1DeliveryMethod: z.string().optional(),
  shipment2DeliveryMethod: z.string().optional(),
  note: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'partially_paid', 'paid', 'failed', 'refunded']).optional(),
  shipment1Status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  shipment2Status: z.enum(['pending', 'sourcing', 'ready_to_ship', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  shipment1PaymentStatus: z.enum(['pending', 'paid', 'failed']).optional(),
  shipment2PaymentStatus: z.enum(['pending', 'paid', 'failed']).optional(),
  targetShipment: z.enum(['all', 'shipment1', 'shipment2']).optional(),
  paidAmount: z.number().min(0).optional(),
  cancellationReason: z.string().optional(),
  note: z.string().optional(),
});

export const orderIdSchema = z.object({
  id: z.string().min(1, 'Order ID is required'),
});

export const orderQuerySchema = z.object({
  orderStatus: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'partially_paid', 'paid', 'failed', 'refunded']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
