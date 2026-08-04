import { Types } from 'mongoose';

export type DiscountType = 'percentage' | 'fixed_amount';

export interface ICouponUsage {
  user: Types.ObjectId;
  usedAt: Date;
  orderId?: Types.ObjectId;
}

export interface ICoupon {
  _id: Types.ObjectId;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  usedCount: number;
  perUserLimit: number;
  usedBy: ICouponUsage[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CouponResponse {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  usedCount: number;
  perUserLimit: number;
  isActive: boolean;
  isExpired: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApplyCouponInput {
  code: string;
  orderAmount: number;
}

export interface ApplyCouponResponse {
  coupon: {
    id: string;
    code: string;
    discountType: DiscountType;
    discountValue: number;
  };
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

export interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  startDate: string | Date;
  endDate: string | Date;
  usageLimit?: number;
  perUserLimit?: number;
  isActive?: boolean;
}

export interface UpdateCouponInput {
  code?: string;
  description?: string;
  discountType?: DiscountType;
  discountValue?: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  usageLimit?: number;
  perUserLimit?: number;
  isActive?: boolean;
}
