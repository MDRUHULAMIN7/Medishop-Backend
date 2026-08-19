import { emitToAdmins, emitToUser } from '../../socket';
import { AppError, NotFoundError, ValidationError } from '../../utils/AppError';
import { cartService } from '../cart/cart.service';
import { couponRepository } from '../coupon/coupon.repository';
import { couponService } from '../coupon/coupon.service';
import { notificationService } from '../notification/notification.service';
import { posRepository } from '../pos/pos.repository';
import { prescriptionRepository } from '../prescription/prescription.repository';
import { ProductModel } from '../product/product.model';
import { userRepository } from '../user/user.repository';
import { orderRepository } from './order.repository';
import { CheckoutInput, IOrderItemSnapshot, OrderFilterQuery, OrderResponse, UpdateOrderStatusInput } from './order.types';

const generateOrderNumber = (): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `MS-${dateStr}-${randomNum}`;
};

export class OrderService {
  async processCheckout(userId: string, input: CheckoutInput, idempotencyKey?: string): Promise<OrderResponse | { orders: OrderResponse[]; primaryOrder: OrderResponse }> {
    // Check Idempotency Key
    if (idempotencyKey) {
      const existingOrder = await orderRepository.findByIdempotencyKey(idempotencyKey);
      if (existingOrder) {
        return existingOrder;
      }
    }

    // 1. Fetch Cart & Validate Items
    let cartResponse = await cartService.getCart(userId);

    // Auto populate DB cart for explicit checkout items that are not currently
    // present. Direct pre-order can submit stock and pre-order as two requests.
    if (input.items && input.items.length > 0) {
      const cartProductIds = new Set((cartResponse?.items || []).map((item: any) => item.product.id));
      const missingItems = (!cartResponse || cartResponse.items.length === 0)
        ? input.items
        : input.items.filter((item) => !cartProductIds.has(item.productId));

      for (const item of missingItems) {
        if (item.productId && item.quantity > 0) {
          try {
            await cartService.addItem(userId, {
              productId: item.productId,
              quantity: item.quantity,
              allowPreOrder: Boolean((input as any).isPreOrder || item.preOrderQuantity || item.fulfillmentType === 'preorder' || item.fulfillmentType === 'mixed'),
            });
          } catch (e) {
            console.error('Failed to auto-populate DB cart for item:', item, e);
          }
        }
      }
      if (missingItems.length > 0) {
        cartResponse = await cartService.getCart(userId);
      }
    }

    if (!cartResponse || cartResponse.items.length === 0) {
      throw new ValidationError('Your cart is empty. Add products before checking out.');
    }

    // 2. Validate Unavailable Items & Stock Exceeded Exit Criteria
    const isPreOrderCheckout = Boolean(
      (input as any).isPreOrder ||
      (input.items && input.items.some((i: any) => i.fulfillmentType === 'preorder' || (i.preOrderQuantity && i.preOrderQuantity > 0)))
    );

    if (cartResponse.hasUnavailableItems && !isPreOrderCheckout) {
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

    // When the caller sends explicit items (the direct pre-order flow), only
    // those cart lines belong to this checkout. This prevents an unrelated
    // in-stock cart line from being silently converted into a pre-order.
    const checkoutCartItems = input.items?.length
      ? cartResponse.items.filter((item: any) => input.items!.some((i) => i.productId === item.product.id))
      : cartResponse.items;
    if (checkoutCartItems.length === 0) {
      throw new ValidationError('The selected checkout items are no longer in your cart. Please refresh and try again.');
    }
    const checkoutSubtotal = input.items?.length
      ? input.items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
      : checkoutCartItems.reduce((sum, item: any) => sum + Number(item.itemTotal || 0), 0);

    // 5. Validate & Apply Coupon Code Exit Criteria
    let couponDiscount = 0;
    let appliedCouponCode: string | undefined = undefined;

    if (input.couponCode && input.couponCode.trim()) {
      const couponResult = await couponService.validateAndApplyCoupon(
        {
          code: input.couponCode,
          orderAmount: checkoutSubtotal,
        },
        userId
      );
      couponDiscount = couponResult.discountAmount;
      appliedCouponCode = couponResult.coupon.code;
    }

    // 6. Final Stock Re-Check & Atomic Reservation / Lock
    const orderItemSnapshots: IOrderItemSnapshot[] = [];
    const mainStore = await posRepository.findMainStore();

    for (const cartItem of checkoutCartItems) {
      const clientItem = input.items?.find((i: any) => i.productId === cartItem.product.id);
      const targetQty = Number(clientItem?.quantity || cartItem.quantity);
      const targetProdId = cartItem.product.id;
      const selectedClientItem = clientItem;
      const isItemPreOrder = isPreOrderCheckout || Boolean((cartItem as any).isStockExceeded) || Boolean(selectedClientItem?.preOrderQuantity && selectedClientItem.preOrderQuantity > 0);

      const selectedUnit = clientItem?.unit || (cartItem.product as any).unit || cartItem.product.unitType || 'pcs';
      const unitMultiplier = Math.max(1, Number(clientItem?.unitMultiplier || 1));
      const effectiveUnitPrice = clientItem?.unitPrice !== undefined ? Number(clientItem.unitPrice) : cartItem.product.effectivePrice;
      const itemTotalPrice = clientItem?.totalPrice !== undefined ? Number(clientItem.totalPrice) : (effectiveUnitPrice * targetQty);

      let product = await ProductModel.findById(targetProdId).select('+buyingPrice');
      if (!product) {
        throw new NotFoundError(`Product "${cartItem.product.name}" not found`);
      }

      const currentBaseStock = Math.max(0, Number(product.stockCached || product.stock || 0));
      const unitTier = (Array.isArray(product.packaging) ? product.packaging : []).find((tier: any) => tier.unit === selectedUnit)
        || (Array.isArray(product.unitPrices) ? product.unitPrices.find((tier: any) => tier.unit === selectedUnit) : null);
      const buyingPrice = Number(unitTier?.buyingPrice ?? product.buyingPrice ?? 0);
      const maxFullBoxesInStock = Math.floor(currentBaseStock / unitMultiplier);

      // Never trust the client for inventory quantities. A stale cart (or a
      // malicious request) must not be able to make the decrement negative.
      const requestedAvailableQty = clientItem?.availableQuantity !== undefined
        ? Number(clientItem.availableQuantity)
        : (isItemPreOrder ? maxFullBoxesInStock : targetQty);
      const availQty = Math.max(0, Math.min(targetQty, maxFullBoxesInStock, requestedAvailableQty));

      // The remainder is the pre-order quantity. This keeps the two
      // fulfilment buckets internally consistent even when the client sent
      // contradictory available/pre-order values.
      const preQty = isItemPreOrder ? Math.max(0, targetQty - availQty) : 0;

      const fulfillmentType: 'immediate' | 'preorder' | 'mixed' =
        clientItem?.fulfillmentType || (preQty > 0 ? (availQty > 0 ? 'mixed' : 'preorder') : 'immediate');

      // Deduct available stock in base unit pieces (e.g. 4 boxes * 20 = 80 pcs)
      const baseDeductPieces = Math.min(currentBaseStock, availQty * unitMultiplier);
      if (baseDeductPieces > 0) {
        const updatedProduct = await ProductModel.findOneAndUpdate(
          { _id: targetProdId, stockCached: { $gte: baseDeductPieces } },
          [
            {
              $set: {
                // Product.stock is legacy/denormalized; keep both fields in
                // sync without ever writing a negative number.
                stock: { $max: [0, { $subtract: ['$stock', baseDeductPieces] }] },
                stockCached: { $max: [0, { $subtract: ['$stockCached', baseDeductPieces] }] },
              },
            },
          ],
          { new: true }
        );

        if (!updatedProduct) {
          throw new ValidationError(
            `Stock changed for "${product.name}". Please review the available quantity and try again.`
          );
        }

        // Do not call product.save() here: that document was read before the
        // atomic decrement and could overwrite the fresh stock with stale data.
      }

      const baseSnapshot = {
        product: product._id,
        name: product.name,
        slug: product.slug,
        dosageForm: product.dosageForm,
        unitType: product.unitType,
        unit: selectedUnit,
        unitMultiplier,
        image: product.images && product.images.length > 0 ? product.images[0] : '',
        unitPrice: effectiveUnitPrice,
        discountPrice: product.discountPrice !== undefined ? Number(product.discountPrice) : undefined,
        effectiveUnitPrice,
        buyingPrice,
        requiresPrescription: Boolean(product.requiresPrescription),
      };

      if (availQty > 0) {
        orderItemSnapshots.push({
          ...baseSnapshot,
          quantity: availQty,
          availableQuantity: availQty,
          preOrderQuantity: 0,
          fulfillmentType: 'immediate' as const,
          totalPrice: effectiveUnitPrice * availQty,
        });
      }

      if (preQty > 0) {
        orderItemSnapshots.push({
          ...baseSnapshot,
          quantity: preQty,
          availableQuantity: 0,
          preOrderQuantity: preQty,
          fulfillmentType: 'preorder' as const,
          totalPrice: effectiveUnitPrice * preQty,
        });
      }

      if (availQty === 0 && preQty === 0) {
        orderItemSnapshots.push({
          ...baseSnapshot,
          quantity: targetQty,
          availableQuantity: 0,
          preOrderQuantity: 0,
          fulfillmentType,
          totalPrice: itemTotalPrice,
        });
      }

      // Write to Central Audit Stock Ledger
      if (mainStore && baseDeductPieces > 0) {
        await posRepository.updateStock(
          product._id.toString(),
          mainStore._id.toString(),
          -baseDeductPieces,
          'online_order',
          userId,
          undefined,
          `Online Order Checkout (${selectedUnit} x${targetQty}, deducted ${baseDeductPieces} base units, ${fulfillmentType})`
        );
      }
    }

    // 7. Calculate final totals and create one order per fulfillment bucket.
    const immediateSnapshots = orderItemSnapshots.filter((item) => item.fulfillmentType !== 'preorder');
    const preOrderSnapshots = orderItemSnapshots.filter((item) => item.fulfillmentType === 'preorder' || Number(item.preOrderQuantity || 0) > 0);
    const shouldCreateSeparateOrders = Boolean(input.isSplitDelivery) && immediateSnapshots.length > 0 && preOrderSnapshots.length > 0;
    const isSplitDelivery = Boolean(input.isSplitDelivery || shouldCreateSeparateOrders);
    const hasPreOrderItems = preOrderSnapshots.length > 0;
    const isPreOrder = Boolean(input.isPreOrder) || hasPreOrderItems;
    const deliveryCharge = input.deliveryCharge !== undefined
      ? Number(input.deliveryCharge)
      : isSplitDelivery ? 120 : 60;
    const shipment1DeliveryCharge = isSplitDelivery ? Math.round(deliveryCharge / 2) : deliveryCharge;
    const shipment2DeliveryCharge = isSplitDelivery ? (deliveryCharge - shipment1DeliveryCharge) : 0;

    const createOrderForSnapshots = async (
      snapshots: typeof orderItemSnapshots,
      kind: 'single' | 'immediate' | 'preorder',
      orderDeliveryCharge: number,
      orderCouponDiscount: number,
      orderIdempotencyKey?: string
    ) => {
      const orderSubtotal = snapshots.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
      const orderGrandTotal = Math.max(0, orderSubtotal - orderCouponDiscount + orderDeliveryCharge);
      const orderIsPreOrder = kind === 'preorder' || snapshots.some((item) => Number(item.preOrderQuantity || 0) > 0);
      return orderRepository.create({
        orderNumber: generateOrderNumber(),
        user: userId,
        items: snapshots,
        shippingAddress,
        paymentMethod: input.paymentMethod || 'cod',
        paymentStatus: 'pending',
        orderStatus: 'pending',
        shipment1Status: 'pending',
        shipment2Status: 'pending',
        shipment1PaymentStatus: 'pending',
        shipment2PaymentStatus: 'pending',
        shipment1Total: orderGrandTotal,
        shipment2Total: 0,
        shipment1DeliveryCharge: orderDeliveryCharge,
        shipment2DeliveryCharge: 0,
        paidAmount: 0,
        subtotal: orderSubtotal,
        discountTotal: 0,
        couponCode: appliedCouponCode,
        couponDiscount: orderCouponDiscount,
        deliveryCharge: orderDeliveryCharge,
        isPreOrder: orderIsPreOrder,
        isSplitDelivery: false,
        shipment1DeliveryMethod: kind === 'preorder' ? (input.shipment2DeliveryMethod || input.shipment1DeliveryMethod) : input.shipment1DeliveryMethod,
        shipment2DeliveryMethod: undefined,
        grandTotal: orderGrandTotal,
        prescription: input.prescriptionId ? input.prescriptionId : null,
        idempotencyKey: orderIdempotencyKey,
        note: [input.note, shouldCreateSeparateOrders ? (kind === 'preorder' ? 'Pre-order items separated into this order.' : 'In-stock items separated into this order.') : undefined]
          .filter(Boolean)
          .join(' '),
      });
    };

    let createdOrders: OrderResponse[];
    if (shouldCreateSeparateOrders) {
      const immediateSubtotal = immediateSnapshots.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
      const stockCouponDiscount = checkoutSubtotal > 0 ? Math.round((couponDiscount * immediateSubtotal) / checkoutSubtotal) : 0;
      const preorderCouponDiscount = Math.max(0, couponDiscount - stockCouponDiscount);
      createdOrders = [
        await createOrderForSnapshots(immediateSnapshots, 'immediate', shipment1DeliveryCharge, stockCouponDiscount, idempotencyKey ? `${idempotencyKey}:stock` : undefined),
        await createOrderForSnapshots(preOrderSnapshots, 'preorder', shipment2DeliveryCharge, preorderCouponDiscount, idempotencyKey ? `${idempotencyKey}:preorder` : undefined),
      ];
    } else {
      createdOrders = [
        await createOrderForSnapshots(orderItemSnapshots, isPreOrder ? 'preorder' : 'single', deliveryCharge, couponDiscount, idempotencyKey),
      ];
    }

    const order = createdOrders[0];

    // 9. Record Coupon Usage (if coupon applied)
    if (appliedCouponCode) {
      const couponDoc = await couponRepository.findByCode(appliedCouponCode);
      if (couponDoc) {
        await couponRepository.recordUsage(couponDoc._id.toString(), userId, createdOrders.map((createdOrder) => createdOrder.id).join(','));
      }
    }

    // 10. Clear User's Cart Exit Criteria
    if (checkoutCartItems.length === cartResponse.items.length) {
      await cartService.clearCart(userId);
    } else {
      for (const cartItem of checkoutCartItems) {
        await cartService.removeItem(userId, cartItem.product.id);
      }
    }

    // 11. Create & Persist Notification Feed Item (Exit Criteria)
    await notificationService.createAndSendNotification({
      userId,
      type: 'order_created',
      title: 'Order Placed Successfully',
      message: `Your Order ${order.orderNumber} for ৳${order.grandTotal.toFixed(2)} has been placed successfully!`,
      data: { orderId: order.id, orderNumber: order.orderNumber, grandTotal: order.grandTotal },
    });

    // 12. Emit Real-time Socket Event to Admins & Owning User
    emitToAdmins('order:created', {
      event: 'order:created',
      message: `New Order ${order.orderNumber} placed for ৳${order.grandTotal}`,
      order,
    });
    emitToUser(userId, 'order:created', {
      event: 'order:created',
      message: `Your Order ${order.orderNumber} for ৳${order.grandTotal} has been placed successfully!`,
      order,
    });

    for (const createdOrder of createdOrders.slice(1)) {
      await notificationService.createAndSendNotification({
        userId,
        type: 'order_created',
        title: 'Order Placed Successfully',
        message: `Your Order ${createdOrder.orderNumber} for Tk ${createdOrder.grandTotal.toFixed(2)} has been placed successfully!`,
        data: { orderId: createdOrder.id, orderNumber: createdOrder.orderNumber, grandTotal: createdOrder.grandTotal },
      });

      emitToAdmins('order:created', {
        event: 'order:created',
        message: `New Order ${createdOrder.orderNumber} placed for Tk ${createdOrder.grandTotal}`,
        order: createdOrder,
      });
      emitToUser(userId, 'order:created', {
        event: 'order:created',
        message: `Your Order ${createdOrder.orderNumber} for Tk ${createdOrder.grandTotal} has been placed successfully!`,
        order: createdOrder,
      });
    }

    return createdOrders.length > 1 ? { orders: createdOrders, primaryOrder: createdOrders[0] } : order;
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

  async getAllOrders(query: OrderFilterQuery) {
    return orderRepository.findWithFilters(query);
  }

  async updateOrderStatus(id: string, staffId: string, input: UpdateOrderStatusInput) {
    const rawOrder = await orderRepository.findRawById(id);
    if (!rawOrder) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    const previousStatus = rawOrder.orderStatus;
    const isCancelling = input.orderStatus === 'cancelled' && previousStatus !== 'cancelled';

    // If order is cancelled, restore stock to Central Inventory & write to Stock Ledger
    if (isCancelling) {
      const mainStore = await posRepository.findMainStore();
      for (const item of rawOrder.items) {
        const restorableQty = Math.max(0, Number(item.availableQuantity || 0) * Number(item.unitMultiplier || 1));
        if (restorableQty === 0) continue;
        await ProductModel.findByIdAndUpdate(item.product, {
          $inc: { stock: restorableQty, stockCached: restorableQty },
        });

        await posRepository.updateStock(
          item.product.toString(),
          mainStore._id.toString(),
          restorableQty,
          'order_cancellation',
          staffId,
          rawOrder.orderNumber,
          `Cancelled Order ${rawOrder.orderNumber} Stock Restoration`
        );
      }
    }

    const updatedOrder = await orderRepository.updateStatus(id, input);
    if (!updatedOrder) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    // Create & Persist Notification Feed Item (Exit Criteria)
    await notificationService.createAndSendNotification({
      userId: updatedOrder.userId,
      type: 'order_status_updated',
      title: 'Order Status Updated',
      message: `Your Order ${updatedOrder.orderNumber} status is now "${updatedOrder.orderStatus}".`,
      data: {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        orderStatus: updatedOrder.orderStatus,
        paymentStatus: updatedOrder.paymentStatus,
      },
    });

    // Emit Real-time Socket Event to Admins & Owning User
    emitToAdmins('order:status_changed', {
      event: 'order:status_changed',
      message: `Order ${updatedOrder.orderNumber} updated to ${updatedOrder.orderStatus} (${updatedOrder.paymentStatus})`,
      order: updatedOrder,
    });
    emitToUser(updatedOrder.userId, 'order:status_changed', {
      event: 'order:status_changed',
      message: `Your Order ${updatedOrder.orderNumber} status is now "${updatedOrder.orderStatus}".`,
      order: updatedOrder,
    });

    return updatedOrder;
  }
}

export const orderService = new OrderService();
