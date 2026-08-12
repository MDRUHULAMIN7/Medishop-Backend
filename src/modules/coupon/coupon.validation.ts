import { z } from 'zod';

const discountTypeEnum = z.enum(['percentage', 'fixed', 'fixed_amount']);

export const applyCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  orderAmount: z.number().min(0, 'Order amount must be positive'),
});

export const createCouponSchema = z.object({
  code: z.string().min(2, 'Coupon code must be at least 2 characters').max(50),
  description: z.string().optional(),
  discountType: discountTypeEnum,
  discountValue: z.number().min(0, 'Discount value must be greater than or equal to 0'),
  maxDiscountAmount: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateCouponSchema = z.object({
  code: z.string().min(2).max(50).optional(),
  description: z.string().optional(),
  discountType: discountTypeEnum.optional(),
  discountValue: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const couponIdSchema = z.object({
  id: z.string().min(1, 'Coupon ID is required'),
});
