import { FilterQuery, Types } from 'mongoose';
import { OrderModel } from './order.model';
import {
  OrderDeliveryMethodSnapshot,
  OrderFilterQuery,
  OrderResponse,
  UpdateOrderStatusInput,
} from './order.types';
import { settingsService } from '../settings/settings.service';

const buildDeliveryLookup = (settings: any): Map<string, any> => {
  const options = Array.isArray(settings?.shipping?.options) ? settings.shipping.options : [];
  return new Map<string, any>(
    options
      .map((option: any) => {
        const key = String(option?.code || option?.id || '').trim().toLowerCase();
        return key ? [key, option] as const : null;
      })
      .filter((entry: readonly [string, any] | null): entry is readonly [string, any] => Boolean(entry))
  );
};

const prettyDeliveryName = (code?: string) => {
  if (!code) return 'Delivery';
  return code
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const resolveDeliveryMethod = (
  lookup: Map<string, any>,
  code?: string | null,
  fallback?: any
): OrderDeliveryMethodSnapshot | null => {
  const normalizedCode = String(code || '').trim().toLowerCase();
  const option = normalizedCode ? lookup.get(normalizedCode) : undefined;
  const source = option || fallback;

  if (!source && !normalizedCode) {
    return null;
  }

  return {
    id: source?.id || normalizedCode || fallback?.id,
    code: source?.code || normalizedCode || fallback?.code,
    nameBn: source?.nameBn || prettyDeliveryName(normalizedCode),
    nameEn: source?.nameEn || prettyDeliveryName(normalizedCode),
    charge: Number(source?.charge ?? fallback?.charge ?? 0),
    estimatedDaysBn: source?.estimatedDaysBn || fallback?.estimatedDaysBn,
    estimatedDaysEn: source?.estimatedDaysEn || fallback?.estimatedDaysEn,
    descriptionBn: source?.descriptionBn || fallback?.descriptionBn,
    descriptionEn: source?.descriptionEn || fallback?.descriptionEn,
  };
};

const buildEstimatedDeliveryDate = (
  order: any,
  deliveryMethod: OrderDeliveryMethodSnapshot | null,
  shipment1?: OrderDeliveryMethodSnapshot | null,
  shipment2?: OrderDeliveryMethodSnapshot | null
) => {
  if (order?.estimatedDeliveryDate) {
    return order.estimatedDeliveryDate;
  }

  if (order?.isSplitDelivery) {
    const first = shipment1?.estimatedDaysEn || shipment1?.estimatedDaysBn;
    const second = shipment2?.estimatedDaysEn || shipment2?.estimatedDaysBn;
    const combined = [first, second].filter(Boolean).join(' + ');
    return combined || 'Split delivery';
  }

  return deliveryMethod?.estimatedDaysEn || deliveryMethod?.estimatedDaysBn || '2-3 Working Days';
};

const toResponse = (
  order: any,
  deliveryLookup: Map<string, any>
): OrderResponse => {
  const shipment1Method = resolveDeliveryMethod(deliveryLookup, order.shipment1DeliveryMethod, order.shipment1DeliveryMethodDetails);
  const shipment2Method = resolveDeliveryMethod(deliveryLookup, order.shipment2DeliveryMethod, order.shipment2DeliveryMethodDetails);
  const deliveryMethod =
    resolveDeliveryMethod(deliveryLookup, order.deliveryMethod?.code || order.deliveryMethod?.id || order.shipment1DeliveryMethod || order.shipment2DeliveryMethod, order.deliveryMethod) ||
    shipment1Method ||
    shipment2Method;

  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    userId: order.user ? (typeof order.user === 'object' ? order.user._id.toString() : order.user.toString()) : '',
    user: order.user && typeof order.user === 'object' ? {
      id: order.user._id?.toString(),
      name: order.user.name,
      email: order.user.email,
      phone: order.user.phone,
      role: order.user.role,
      createdAt: order.user.createdAt,
    } : undefined,
    items: (order.items || []).map((item: any) => ({
      productId: item.product ? (typeof item.product === 'object' ? item.product._id.toString() : item.product.toString()) : '',
      name: item.name || item.product?.name || '',
      slug: item.slug || item.product?.slug || '',
      dosageForm: item.dosageForm || item.product?.dosageForm || '',
      unitType: item.unitType || item.product?.unitType || 'pcs',
      unit: item.unit || item.product?.unitType || item.unitType || 'pcs',
      unitMultiplier: item.unitMultiplier !== undefined ? Number(item.unitMultiplier) : undefined,
      image: item.image || (item.product?.images && item.product?.images[0]) || '',
      unitPrice: Number(item.unitPrice || item.product?.price || 0),
      discountPrice: item.discountPrice !== undefined ? Number(item.discountPrice) : undefined,
      effectiveUnitPrice: Number(item.effectiveUnitPrice || item.product?.price || 0),
      quantity: Number(item.quantity),
      availableQuantity: item.availableQuantity !== undefined ? Number(item.availableQuantity) : undefined,
      preOrderQuantity: item.preOrderQuantity !== undefined ? Number(item.preOrderQuantity) : undefined,
      fulfillmentType: item.fulfillmentType || undefined,
      totalPrice: Number(item.totalPrice),
      requiresPrescription: Boolean(item.requiresPrescription),
    })),
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    shipment1Status: order.shipment1Status || order.orderStatus || 'pending',
    shipment2Status: order.shipment2Status || (order.isPreOrder ? 'pending' : 'pending'),
    shipment1PaymentStatus: order.shipment1PaymentStatus || order.paymentStatus || 'pending',
    shipment2PaymentStatus: order.shipment2PaymentStatus || order.paymentStatus || 'pending',
    shipment1Total: Number(order.shipment1Total || 0),
    shipment2Total: Number(order.shipment2Total || 0),
    shipment1DeliveryCharge: Number(order.shipment1DeliveryCharge || 0),
    shipment2DeliveryCharge: Number(order.shipment2DeliveryCharge || 0),
    paidAmount: Number(order.paidAmount || (order.paymentStatus === 'paid' ? order.grandTotal : 0)),
    cancellationReason: order.cancellationReason,
    cancelledBy: order.cancelledBy,
    cancelledAt: order.cancelledAt,
    refundStatus: order.refundStatus,
    refundAmount: Number(order.refundAmount || 0),
    refundMethod: order.refundMethod,
    refundRequestedAt: order.refundRequestedAt,
    refundProcessedAt: order.refundProcessedAt,
    refundTransactionId: order.refundTransactionId,
    refundNote: order.refundNote,
    subtotal: Number(order.subtotal),
    discountTotal: Number(order.discountTotal || 0),
    couponCode: order.couponCode,
    couponDiscount: Number(order.couponDiscount || 0),
    deliveryCharge: Number(order.deliveryCharge || 0),
    isPreOrder: Boolean(order.isPreOrder),
    isSplitDelivery: Boolean(order.isSplitDelivery),
    shipment1DeliveryMethod:
      shipment1Method?.nameEn ||
      shipment1Method?.nameBn ||
      order.shipment1DeliveryMethod ||
      undefined,
    shipment2DeliveryMethod:
      shipment2Method?.nameEn ||
      shipment2Method?.nameBn ||
      order.shipment2DeliveryMethod ||
      undefined,
    deliveryMethod,
    shipment1DeliveryMethodDetails: shipment1Method,
    shipment2DeliveryMethodDetails: shipment2Method,
    estimatedDeliveryDate: buildEstimatedDeliveryDate(order, deliveryMethod, shipment1Method, shipment2Method),
    grandTotal: Number(order.grandTotal),
    prescriptionId: order.prescription ? (typeof order.prescription === 'object' ? order.prescription._id.toString() : order.prescription.toString()) : null,
    note: order.note,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

export class OrderRepository {
  async create(data: any) {
    const publicSettings = await settingsService.getPublicSettings();
    const deliveryLookup = buildDeliveryLookup(publicSettings);
    const created = await OrderModel.create(data);
    const populated = await created.populate([
      { path: 'user', select: 'name email phone role createdAt' },
      { path: 'items.product', select: 'name slug dosageForm unitType images price' },
    ]);
    return toResponse(populated.toObject(), deliveryLookup);
  }

  async findById(id: string) {
    const publicSettings = await settingsService.getPublicSettings();
    const deliveryLookup = buildDeliveryLookup(publicSettings);
    const order = await OrderModel.findById(id)
      .populate('user', 'name email phone role createdAt')
      .populate('items.product', 'name slug dosageForm unitType images price')
      .lean();
    return order ? toResponse(order, deliveryLookup) : null;
  }

  async findRawById(id: string) {
    return OrderModel.findById(id);
  }

  async findByIdempotencyKey(key: string) {
    const publicSettings = await settingsService.getPublicSettings();
    const deliveryLookup = buildDeliveryLookup(publicSettings);
    const order = await OrderModel.findOne({ idempotencyKey: key })
      .populate('user', 'name email phone role createdAt')
      .populate('items.product', 'name slug dosageForm unitType images price')
      .lean();
    return order ? toResponse(order, deliveryLookup) : null;
  }

  async findByUserId(userId: string) {
    const publicSettings = await settingsService.getPublicSettings();
    const deliveryLookup = buildDeliveryLookup(publicSettings);
    const orders = await OrderModel.find({ user: new Types.ObjectId(userId) })
      .populate('user', 'name email phone role createdAt')
      .populate('items.product', 'name slug dosageForm unitType images price')
      .sort({ createdAt: -1 })
      .lean();
    return orders.map((order) => toResponse(order, deliveryLookup));
  }

  async findWithFilters(query: OrderFilterQuery) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const skip = (page - 1) * limit;
    const publicSettings = await settingsService.getPublicSettings();
    const deliveryLookup = buildDeliveryLookup(publicSettings);

    const filter: FilterQuery<any> = {};
    if (query.orderStatus) {
      filter.orderStatus = query.orderStatus;
    }
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    const [orders, total] = await Promise.all([
      OrderModel.find(filter)
        .populate('user', 'name email phone role createdAt')
        .populate('items.product', 'name slug dosageForm unitType images price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OrderModel.countDocuments(filter),
    ]);

    return {
      orders: orders.map((order) => toResponse(order, deliveryLookup)),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(id: string, input: UpdateOrderStatusInput) {
    const publicSettings = await settingsService.getPublicSettings();
    const deliveryLookup = buildDeliveryLookup(publicSettings);
    const existing: any = await OrderModel.findById(id).lean();
    if (!existing) return null;

    const updatePayload: any = {};
    if (input.orderStatus) updatePayload.orderStatus = input.orderStatus;
    if (input.paymentStatus) updatePayload.paymentStatus = input.paymentStatus;
    if (input.shipment1Status) updatePayload.shipment1Status = input.shipment1Status;
    if (input.shipment2Status) updatePayload.shipment2Status = input.shipment2Status;
    if (input.shipment1PaymentStatus) updatePayload.shipment1PaymentStatus = input.shipment1PaymentStatus;
    if (input.shipment2PaymentStatus) updatePayload.shipment2PaymentStatus = input.shipment2PaymentStatus;
    if (input.paidAmount !== undefined) updatePayload.paidAmount = input.paidAmount;
    if (input.cancellationReason) updatePayload.cancellationReason = input.cancellationReason;
    if (input.refundStatus) updatePayload.refundStatus = input.refundStatus;
    if (input.refundAmount !== undefined) updatePayload.refundAmount = input.refundAmount;
    if (input.refundMethod) updatePayload.refundMethod = input.refundMethod;
    if (input.refundTransactionId) updatePayload.refundTransactionId = input.refundTransactionId;
    if (input.refundNote) updatePayload.refundNote = input.refundNote;
    if (input.note) updatePayload.note = input.note;

    // Targeted shipment shortcuts
    if (input.targetShipment === 'shipment1') {
      if (input.orderStatus) updatePayload.shipment1Status = input.orderStatus;
      if (input.paymentStatus) updatePayload.shipment1PaymentStatus = input.paymentStatus;
    } else if (input.targetShipment === 'shipment2') {
      if (input.orderStatus) updatePayload.shipment2Status = input.orderStatus as any;
      if (input.paymentStatus) updatePayload.shipment2PaymentStatus = input.paymentStatus;
    }

    // Auto calculate overall paymentStatus when shipments are updated
    const finalShip1Pay = updatePayload.shipment1PaymentStatus || existing.shipment1PaymentStatus || existing.paymentStatus;
    const finalShip2Pay = updatePayload.shipment2PaymentStatus || existing.shipment2PaymentStatus || existing.paymentStatus;
    const isSplit = existing.isSplitDelivery;

    if (isSplit && !updatePayload.paymentStatus) {
      if (finalShip1Pay === 'paid' && finalShip2Pay === 'paid') {
        updatePayload.paymentStatus = 'paid';
        updatePayload.paidAmount = existing.grandTotal;
      } else if (finalShip1Pay === 'paid' || finalShip2Pay === 'paid') {
        updatePayload.paymentStatus = 'partially_paid';
        if (finalShip1Pay === 'paid') updatePayload.paidAmount = existing.shipment1Total || Math.round(existing.grandTotal / 2);
        if (finalShip2Pay === 'paid') updatePayload.paidAmount = existing.shipment2Total || Math.round(existing.grandTotal / 2);
      }
    }

    const updated = await OrderModel.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    })
      .populate('user', 'name email phone role createdAt')
      .populate('items.product', 'name slug dosageForm unitType images price')
      .lean();

    return updated ? toResponse(updated, deliveryLookup) : null;
  }
}

export const orderRepository = new OrderRepository();
