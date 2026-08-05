import { emitToAdmins } from '../../socket';
import { AppError, NotFoundError, ValidationError } from '../../utils/AppError';
import { cartRepository } from '../cart/cart.repository';
import { cartService } from '../cart/cart.service';
import { couponRepository } from '../coupon/coupon.repository';
import { couponService } from '../coupon/coupon.service';
import { prescriptionRepository } from '../prescription/prescription.repository';
import { ProductModel } from '../product/product.model';
import { userRepository } from '../user/user.repository';
import { orderRepository } from './order.repository';
import { CheckoutInput, OrderResponse } from './order.types';

const generateOrderNumber = (): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `MS-${dateStr}-${randomNum}`;
};

export class OrderService {
  async processCheckout(userId: string, input: CheckoutInput, idempotencyKey?: string): Promise<OrderResponse> {
    // Check Idempotency Key
    if (idempotencyKey) {
      const existingOrder = await orderRepository.findByIdempotencyKey(idempotencyKey);
      if (existingOrder) {
        return existingOrder;
      }
    }

    // 1. Fetch Cart & Validate Items
    const cartResponse = await cartService.getCart(userId);
    if (!cartResponse || cartResponse.items.length === 0) {
      throw new ValidationError('Your cart is empty. Add products before checking out.');
    }

    // 2. Validate Unavailable Items & Stock Exceeded Exit Criteria
    if (cartResponse.hasUnavailableItems) {
      const unavailable = cartResponse.items.filter((item: any) => !item.isAvailable || item.isStockExceeded);
      const itemNames = unavailable.map((i: any) => i.product.name).join(', ');
      throw new ValidationError(
        `Checkout blocked: The following items in your cart are out of stock or unavailable: ${itemNames}`
      );
    }

    // 3. Validate Prescription Requirement Exit Criteria
    if (cartResponse.hasPrescriptionProducts) {
      if (!input.prescriptionId) {
        throw new ValidationError(
          'Checkout blocked: Your cart contains prescription-required medicines. Please attach an approved prescription.'
        );
      }

      const prescription = await prescriptionRepository.findById(input.prescriptionId);
      if (!prescription || prescription.user.id !== userId) {
        throw new NotFoundError('Prescription not found', 'PRESCRIPTION_NOT_FOUND');
      }

      if (prescription.status !== 'approved') {
        throw new ValidationError(
          `Checkout blocked: Your uploaded prescription is currently "${prescription.status}". It must be approved by a pharmacist before checkout.`
        );
      }
    }

    // 4. Resolve Shipping Address
    let shippingAddress = input.shippingAddress;
    if (!shippingAddress && input.shippingAddressId) {
      const user = await userRepository.findById(userId);
      if (user && user.addresses) {
        const addr = (user.addresses as any[]).find((a) => a._id.toString() === input.shippingAddressId);
        if (addr) {
          shippingAddress = {
            recipientName: addr.recipientName,
            phone: addr.phone,
            division: addr.division,
            district: addr.district,
            thana: addr.thana,
            addressLine: addr.addressLine,
            postalCode: addr.postalCode,
          };
        }
      }
    }

    if (!shippingAddress) {
      // Fallback to user's default address if not provided
      const user = await userRepository.findById(userId);
      const defaultAddr = (user?.addresses as any[])?.find((a) => a.isDefault) || (user?.addresses as any[])?.[0];
      if (defaultAddr) {
        shippingAddress = {
          recipientName: defaultAddr.recipientName,
          phone: defaultAddr.phone,
          division: defaultAddr.division,
          district: defaultAddr.district,
          thana: defaultAddr.thana,
          addressLine: defaultAddr.addressLine,
          postalCode: defaultAddr.postalCode,
        };
      }
    }

    if (!shippingAddress || !shippingAddress.recipientName || !shippingAddress.phone || !shippingAddress.district || !shippingAddress.addressLine) {
      throw new ValidationError('Complete shipping address (recipientName, phone, district, thana, addressLine) is required for checkout');
    }

    // 5. Validate & Apply Coupon Code Exit Criteria
    let couponDiscount = 0;
    let appliedCouponCode: string | undefined = undefined;

    if (input.couponCode && input.couponCode.trim()) {
      const couponResult = await couponService.validateAndApplyCoupon(
        {
          code: input.couponCode,
          orderAmount: cartResponse.grandTotal,
        },
        userId
      );
      couponDiscount = couponResult.discountAmount;
      appliedCouponCode = couponResult.coupon.code;
    }

    // 6. Final Stock Re-Check & Atomic Reservation / Lock
    const orderItemSnapshots = [];
    for (const cartItem of cartResponse.items) {
      const product = await ProductModel.findOneAndUpdate(
        {
          _id: cartItem.product.id,
          isActive: true,
          stock: { $gte: cartItem.quantity },
        },
        { $inc: { stock: -cartItem.quantity } },
        { new: true }
      );

      if (!product) {
        throw new AppError(
          `Stock lock failed for "${cartItem.product.name}". Insufficient stock available.`,
          400,
          'STOCK_RESERVATION_FAILED'
        );
      }

      orderItemSnapshots.push({
        product: product._id,
        name: product.name,
        slug: product.slug,
        dosageForm: product.dosageForm,
        unitType: product.unitType,
        image: product.images && product.images.length > 0 ? product.images[0] : '',
        unitPrice: Number(product.price),
        discountPrice: product.discountPrice !== undefined ? Number(product.discountPrice) : undefined,
        effectiveUnitPrice: cartItem.product.effectivePrice,
        quantity: cartItem.quantity,
        totalPrice: cartItem.itemTotal,
        requiresPrescription: Boolean(product.requiresPrescription),
      });
    }

    // 7. Calculate Final Financial Totals & Price Snapshot
    const deliveryCharge = input.deliveryCharge !== undefined ? Number(input.deliveryCharge) : 60;
    const finalGrandTotal = Math.max(0, cartResponse.grandTotal - couponDiscount + deliveryCharge);
    const orderNumber = generateOrderNumber();

    // 8. Create Order Document
    const order = await orderRepository.create({
      orderNumber,
      user: userId,
      items: orderItemSnapshots,
      shippingAddress,
      paymentMethod: input.paymentMethod || 'cod',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      subtotal: cartResponse.subtotal,
      discountTotal: cartResponse.totalDiscount,
      couponCode: appliedCouponCode,
      couponDiscount,
      deliveryCharge,
      grandTotal: finalGrandTotal,
      prescription: input.prescriptionId ? input.prescriptionId : null,
      idempotencyKey,
      note: input.note,
    });

    // 9. Record Coupon Usage (if coupon applied)
    if (appliedCouponCode) {
      const couponDoc = await couponRepository.findByCode(appliedCouponCode);
      if (couponDoc) {
        await couponRepository.recordUsage(couponDoc._id.toString(), userId, order.id);
      }
    }

    // 10. Clear User's Cart Exit Criteria
    await cartService.clearCart(userId);

    // 11. Emit Socket Event to Admin / Order Queue
    emitToAdmins('order:created', {
      event: 'order:created',
      message: `New Order ${order.orderNumber} placed for ৳${order.grandTotal}`,
      order,
    });

    return order;
  }

  async getUserOrders(userId: string) {
    return orderRepository.findByUserId(userId);
  }

  async getOrderById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }
    return order;
  }
}

export const orderService = new OrderService();
