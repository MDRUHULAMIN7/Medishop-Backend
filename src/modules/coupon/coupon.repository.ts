import { CouponModel } from './coupon.model';
import { CouponResponse, CreateCouponInput, UpdateCouponInput } from './coupon.types';

const toResponse = (coupon: any): CouponResponse => {
  const now = new Date();
  const endDate = new Date(coupon.endDate);
  const startDate = new Date(coupon.startDate);
  const isExpired = now < startDate || now > endDate;

  return {
    id: coupon._id.toString(),
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : undefined,
    minOrderAmount: Number(coupon.minOrderAmount || 0),
    startDate,
    endDate,
    usageLimit: coupon.usageLimit ? Number(coupon.usageLimit) : undefined,
    usedCount: Number(coupon.usedCount || 0),
    perUserLimit: Number(coupon.perUserLimit || 1),
    isActive: Boolean(coupon.isActive),
    isExpired,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
};

export class CouponRepository {
  async findAll(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    const coupons = await CouponModel.find(filter).sort({ createdAt: -1 }).lean();
    return coupons.map(toResponse);
  }

  async findValidPublicCoupons() {
    const now = new Date();
    const coupons = await CouponModel.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ discountValue: -1 })
      .lean();

    return coupons.map(toResponse);
  }

  async findByCode(code: string) {
    const coupon = await CouponModel.findOne({ code: code.trim().toUpperCase() });
    return coupon;
  }

  async findRawById(id: string) {
    return CouponModel.findById(id);
  }

  async create(data: CreateCouponInput) {
    const coupon = await CouponModel.create({
      ...data,
      code: data.code.trim().toUpperCase(),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    });
    return toResponse(coupon);
  }

  async update(id: string, data: UpdateCouponInput) {
    const updatePayload: any = { ...data };
    if (data.code) updatePayload.code = data.code.trim().toUpperCase();
    if (data.startDate) updatePayload.startDate = new Date(data.startDate);
    if (data.endDate) updatePayload.endDate = new Date(data.endDate);

    const updated = await CouponModel.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    }).lean();

    return updated ? toResponse(updated) : null;
  }

  async delete(id: string) {
    return CouponModel.findByIdAndDelete(id);
  }

  async recordUsage(couponId: string, userId: string, orderId?: string) {
    return CouponModel.findByIdAndUpdate(
      couponId,
      {
        $inc: { usedCount: 1 },
        $push: {
          usedBy: {
            user: userId,
            usedAt: new Date(),
            ...(orderId && { orderId }),
          },
        },
      },
      { new: true }
    );
  }
}

export const couponRepository = new CouponRepository();
