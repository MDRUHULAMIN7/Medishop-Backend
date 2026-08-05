import { describe, expect, it, vi } from 'vitest';
import { AppError, NotFoundError } from '../../utils/AppError';
import { couponRepository } from './coupon.repository';
import { couponService } from './coupon.service';

vi.mock('./coupon.repository');

describe('CouponService Unit Tests (Exit Criteria & Edge Cases)', () => {
  it('should throw NotFoundError if coupon code does not exist', async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue(null);

    await expect(
      couponService.validateAndApplyCoupon({ code: 'INVALID100', orderAmount: 500 })
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw AppError if coupon is inactive', async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue({
      code: 'INACTIVE50',
      isActive: false,
    } as any);

    await expect(
      couponService.validateAndApplyCoupon({ code: 'INACTIVE50', orderAmount: 500 })
    ).rejects.toThrow('currently disabled');
  });

  it('should throw AppError if coupon has expired', async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue({
      code: 'EXPIRED100',
      isActive: true,
      startDate: new Date('2020-01-01'),
      endDate: new Date('2020-01-02'),
    } as any);

    await expect(
      couponService.validateAndApplyCoupon({ code: 'EXPIRED100', orderAmount: 500 })
    ).rejects.toThrow('expired');
  });

  it('should throw AppError if minimum order amount is not met', async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue({
      code: 'MIN1000',
      isActive: true,
      startDate: new Date('2020-01-01'),
      endDate: new Date('2030-01-01'),
      minOrderAmount: 1000,
    } as any);

    await expect(
      couponService.validateAndApplyCoupon({ code: 'MIN1000', orderAmount: 800 })
    ).rejects.toThrow('Minimum cart total of ৳1000 required');
  });

  it('should correctly calculate percentage discount with maximum cap', async () => {
    vi.mocked(couponRepository.findByCode).mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      code: 'PROMO20',
      isActive: true,
      discountType: 'percentage',
      discountValue: 20, // 20%
      maxDiscountAmount: 100, // max ৳100
      minOrderAmount: 500,
      startDate: new Date('2020-01-01'),
      endDate: new Date('2030-01-01'),
    } as any);

    // 20% of 1000 is 200, but capped at 100
    const result = await couponService.validateAndApplyCoupon({ code: 'PROMO20', orderAmount: 1000 });
    expect(result.discountAmount).toBe(100);
    expect(result.finalAmount).toBe(900);
  });
});
