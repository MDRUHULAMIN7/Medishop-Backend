import { FilterQuery, Types } from 'mongoose';
import { OrderModel } from './order.model';
import { OrderFilterQuery, OrderResponse, UpdateOrderStatusInput } from './order.types';

const toResponse = (order: any): OrderResponse => ({
  id: order._id.toString(),
  orderNumber: order.orderNumber,
  userId: order.user ? (typeof order.user === 'object' ? order.user._id.toString() : order.user.toString()) : '',
  items: (order.items || []).map((item: any) => ({
    productId: item.product ? (typeof item.product === 'object' ? item.product._id.toString() : item.product.toString()) : '',
    name: item.name,
    slug: item.slug,
    dosageForm: item.dosageForm,
    unitType: item.unitType,
    image: item.image || '',
    unitPrice: Number(item.unitPrice),
    discountPrice: item.discountPrice !== undefined ? Number(item.discountPrice) : undefined,
    effectiveUnitPrice: Number(item.effectiveUnitPrice),
    quantity: Number(item.quantity),
    totalPrice: Number(item.totalPrice),
    requiresPrescription: Boolean(item.requiresPrescription),
  })),
  shippingAddress: order.shippingAddress,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  subtotal: Number(order.subtotal),
  discountTotal: Number(order.discountTotal || 0),
  couponCode: order.couponCode,
  couponDiscount: Number(order.couponDiscount || 0),
  deliveryCharge: Number(order.deliveryCharge || 0),
  grandTotal: Number(order.grandTotal),
  prescriptionId: order.prescription ? (typeof order.prescription === 'object' ? order.prescription._id.toString() : order.prescription.toString()) : null,
  note: order.note,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

export class OrderRepository {
  async create(data: any) {
    const created = await OrderModel.create(data);
    return toResponse(created.toObject());
  }

  async findById(id: string) {
    const order = await OrderModel.findById(id).lean();
    return order ? toResponse(order) : null;
  }

  async findRawById(id: string) {
    return OrderModel.findById(id);
  }

  async findByIdempotencyKey(key: string) {
    const order = await OrderModel.findOne({ idempotencyKey: key }).lean();
    return order ? toResponse(order) : null;
  }

  async findByUserId(userId: string) {
    const orders = await OrderModel.find({ user: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).lean();
    return orders.map(toResponse);
  }

  async findWithFilters(query: OrderFilterQuery) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<any> = {};
    if (query.orderStatus) {
      filter.orderStatus = query.orderStatus;
    }
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    const [orders, total] = await Promise.all([
      OrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      OrderModel.countDocuments(filter),
    ]);

    return {
      orders: orders.map(toResponse),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(id: string, input: UpdateOrderStatusInput) {
    const updatePayload: any = {};
    if (input.orderStatus) updatePayload.orderStatus = input.orderStatus;
    if (input.paymentStatus) updatePayload.paymentStatus = input.paymentStatus;
    if (input.note) updatePayload.note = input.note;

    const updated = await OrderModel.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    }).lean();

    return updated ? toResponse(updated) : null;
  }
}

export const orderRepository = new OrderRepository();
