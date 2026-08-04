import { AppError, ConflictError, NotFoundError, ValidationError } from '../../utils/AppError';
import { deleteRedisCacheKeys, getRedisCache, setRedisCache } from '../../utils/redisCache';
import { couponRepository } from './coupon.repository';
import { ApplyCouponInput, ApplyCouponResponse, CreateCouponInput, UpdateCouponInput } from './coupon.types';

const CACHE_KEYS = {
  VALID_PUBLIC: 'cache:coupons:valid',
};

const CACHE_TTL_SECONDS = 3600; // 1 hour

const clearCouponCache = async () => {
  await deleteRedisCacheKeys(CACHE_KEYS.VALID_PUBLIC);
};

export class CouponService {
  async getValidPublicCoupons() {
    const cached = await getRedisCache<any[]>(CACHE_KEYS.VALID_PUBLIC);
    if (cached) {
      return cached;
    }

    const coupons = await couponRepository.findValidPublicCoupons();
    await setRedisCache(CACHE_KEYS.VALID_PUBLIC, coupons, CACHE_TTL_SECONDS);
    return coupons;
  }

  async validateAndApplyCoupon(input: ApplyCouponInput, userId?: string): Promise<ApplyCouponResponse> {
    const code = input.code.trim().toUpperCase();
    const coupon = await couponRepository.findByCode(code);

    if (!coupon) {
      throw new NotFoundError(`Coupon code "${code}" is invalid or does not exist`, 'COUPON_NOT_FOUND');
    }

    if (!coupon.isActive) {
      throw new AppError(`Coupon code "${code}" is currently disabled`, 400, 'COUPON_INACTIVE');
    }

    const now = new Date();
    if (now < new Date(coupon.startDate)) {
      throw new AppError(`Coupon code "${code}" is not yet active`, 400, 'COUPON_NOT_STARTED');
    }

    if (now > new Date(coupon.endDate)) {
      throw new AppError(`Coupon code "${code}" has expired`, 400, 'COUPON_EXPIRED');
    }

    if (coupon.usageLimit !== undefined && coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError(`Coupon code "${code}" has reached its total usage limit`, 400, 'COUPON_EXHAUSTED');
    }

    if (userId && coupon.usedBy && coupon.usedBy.length > 0) {
      const userUsageCount = coupon.usedBy.filter(
        (usage: any) => usage.user && usage.user.toString() === userId
      ).length;

      if (userUsageCount >= (coupon.perUserLimit || 1)) {
        throw new AppError(
          `You have already redeemed coupon "${code}" the maximum allowed times (${coupon.perUserLimit || 1})`,
          400,
          'COUPON_USER_LIMIT_EXCEEDED'
        );
      }
    }

    const orderAmount = Number(input.orderAmount);
    const minOrderAmount = Number(coupon.minOrderAmount || 0);

    if (orderAmount < minOrderAmount) {
      const shortfall = minOrderAmount - orderAmount;
      throw new AppError(
        `Minimum cart total of ৳${minOrderAmount} required to apply coupon "${code}". Add ৳${shortfall} more to your cart.`,
        400,
        'COUPON_MIN_ORDER_NOT_MET'
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderAmount * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    // Ensure discount doesn't exceed order amount
    discountAmount = Math.min(discountAmount, orderAmount);
    const finalAmount = Math.max(0, orderAmount - discountAmount);

    return {
      coupon: {
        id: coupon._id.toString(),
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
      },
      originalAmount: orderAmount,
      discountAmount: Number(discountAmount.toFixed(2)),
      finalAmount: Number(finalAmount.toFixed(2)),
      message: `Coupon "${code}" applied successfully! You saved ৳${discountAmount.toFixed(2)}.`,
    };
  }

  async getAllCoupons(includeInactive = true) {
    return couponRepository.findAll(includeInactive);
  }

  async getCouponById(id: string) {
    const coupon = await couponRepository.findRawById(id);
    if (!coupon) {
      throw new NotFoundError('Coupon not found', 'COUPON_NOT_FOUND');
    }
    return coupon;
  }

  async createCoupon(input: CreateCouponInput) {
    const code = input.code.trim().toUpperCase();
    const existing = await couponRepository.findByCode(code);
    if (existing) {
      throw new ConflictError(`Coupon code "${code}" already exists`, 'COUPON_EXISTS');
    }

    if (new Date(input.startDate) >= new Date(input.endDate)) {
      throw new ValidationError('End date must be after start date');
    }

    const coupon = await couponRepository.create(input);
    await clearCouponCache();
    return coupon;
  }

  async updateCoupon(id: string, input: UpdateCouponInput) {
    const existing = await couponRepository.findRawById(id);
    if (!existing) {
      throw new NotFoundError('Coupon not found', 'COUPON_NOT_FOUND');
    }

    if (input.code && input.code.trim().toUpperCase() !== existing.code) {
      const duplicate = await couponRepository.findByCode(input.code);
      if (duplicate && duplicate._id.toString() !== id) {
        throw new ConflictError(`Coupon code "${input.code}" already exists`, 'COUPON_EXISTS');
      }
    }

    const startDate = input.startDate ? new Date(input.startDate) : existing.startDate;
    const endDate = input.endDate ? new Date(input.endDate) : existing.endDate;

    if (startDate >= endDate) {
      throw new ValidationError('End date must be after start date');
    }

    const updated = await couponRepository.update(id, input);
    await clearCouponCache();
    return updated;
  }

  async deleteCoupon(id: string) {
    const existing = await couponRepository.findRawById(id);
    if (!existing) {
      throw new NotFoundError('Coupon not found', 'COUPON_NOT_FOUND');
    }

    await couponRepository.delete(id);
    await clearCouponCache();
    return { id, deleted: true };
  }
}

export const couponService = new CouponService();
