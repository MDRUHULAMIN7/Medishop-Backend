import { Schema, model, models, HydratedDocument } from 'mongoose';
import { ICoupon, ICouponUsage } from './coupon.types';

const couponUsageSchema = new Schema<ICouponUsage>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    usedAt: { type: Date, default: Date.now },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { _id: false }
);

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, trim: true },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed_amount'],
      required: true,
      default: 'percentage',
    },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    usageLimit: { type: Number, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    usedBy: { type: [couponUsageSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

export type CouponDocument = HydratedDocument<ICoupon>;

export const CouponModel = models.Coupon || model<ICoupon>('Coupon', couponSchema);
