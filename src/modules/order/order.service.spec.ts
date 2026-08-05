import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../utils/AppError';
import { cartService } from '../cart/cart.service';
import { orderService } from './order.service';

vi.mock('../cart/cart.service');
vi.mock('./order.repository');
vi.mock('../prescription/prescription.repository');

describe('OrderService Unit Tests', () => {
  it('should block checkout if cart is empty', async () => {
    vi.mocked(cartService.getCart).mockResolvedValue({
      id: 'cart-1',
      userId: 'user-1',
      items: [],
      totalItemCount: 0,
      uniqueItemCount: 0,
      subtotal: 0,
      totalDiscount: 0,
      grandTotal: 0,
      hasPrescriptionProducts: false,
      hasUnavailableItems: false,
    });

    await expect(
      orderService.processCheckout('user-1', {
        shippingAddress: {
          recipientName: 'Customer',
          phone: '01700000000',
          district: 'Dhaka',
          thana: 'Mirpur',
          addressLine: 'House 12',
        },
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should block checkout if prescription-required products lack approved prescription', async () => {
    vi.mocked(cartService.getCart).mockResolvedValue({
      id: 'cart-1',
      userId: 'user-1',
      items: [{ isAvailable: true, isStockExceeded: false } as any],
      totalItemCount: 1,
      uniqueItemCount: 1,
      subtotal: 500,
      totalDiscount: 0,
      grandTotal: 500,
      hasPrescriptionProducts: true,
      hasUnavailableItems: false,
    });

    await expect(
      orderService.processCheckout('user-1', {
        shippingAddress: {
          recipientName: 'Customer',
          phone: '01700000000',
          district: 'Dhaka',
          thana: 'Mirpur',
          addressLine: 'House 12',
        },
      })
    ).rejects.toThrow('prescription-required medicines');
  });
});
