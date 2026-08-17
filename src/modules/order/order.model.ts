import { Schema, model, models, HydratedDocument } from 'mongoose';
import { IOrder, IOrderItemSnapshot, IOrderShippingAddress } from './order.types';

const orderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    dosageForm: { type: String, required: true },
    unitType: { type: String, required: true },
    unit: { type: String, default: 'pcs' },
    unitMultiplier: { type: Number, default: 1 },
    image: { type: String, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    effectiveUnitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    availableQuantity: { type: Number, default: 0 },
    preOrderQuantity: { type: Number, default: 0 },
    fulfillmentType: {
      type: String,
      enum: ['immediate', 'preorder', 'mixed'],
      default: 'immediate',
    },
    totalPrice: { type: Number, required: true, min: 0 },
    requiresPrescription: { type: Boolean, default: false },
  },
  { _id: false }
);

const orderShippingAddressSchema = new Schema<IOrderShippingAddress>(
  {
    recipientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    division: { type: String, trim: true },
    district: { type: String, required: true, trim: true },
    thana: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
    postalCode: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true, uppercase: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSnapshotSchema], required: true },
    shippingAddress: { type: orderShippingAddressSchema, required: true },
    paymentMethod: {
      type: String,
      enum: ['cod', 'bkash', 'nagad', 'card', 'rocket', 'banking', 'sslcommerz', 'stripe'],
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    shipment1Status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    shipment2Status: {
      type: String,
      enum: ['pending', 'sourcing', 'ready_to_ship', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    shipment1PaymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    shipment2PaymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    shipment1Total: { type: Number, default: 0, min: 0 },
    shipment2Total: { type: Number, default: 0, min: 0 },
    shipment1DeliveryCharge: { type: Number, default: 0, min: 0 },
    shipment2DeliveryCharge: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    cancellationReason: { type: String, trim: true },
    cancelledBy: { type: String, trim: true },
    cancelledAt: { type: Date, default: null },
    refundStatus: {
      type: String,
      enum: [
        'refund_not_required',
        'refund_pending',
        'refund_processing',
        'refunded',
        'refund_failed',
      ],
      default: 'refund_not_required',
      index: true,
    },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundMethod: { type: String, trim: true },
    refundRequestedAt: { type: Date, default: null },
    refundProcessedAt: { type: Date, default: null },
    refundTransactionId: { type: String, trim: true },
    refundNote: { type: String, trim: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, uppercase: true, trim: true },
    couponDiscount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 60, min: 0 },
    isPreOrder: { type: Boolean, default: false },
    isSplitDelivery: { type: Boolean, default: false },
    shipment1DeliveryMethod: { type: String, trim: true },
    shipment2DeliveryMethod: { type: String, trim: true },
    grandTotal: { type: Number, required: true, min: 0 },
    prescription: { type: Schema.Types.ObjectId, ref: 'Prescription', default: null },
    idempotencyKey: { type: String, index: true, sparse: true },
    note: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ refundStatus: 1, createdAt: -1 });

export type OrderDocument = HydratedDocument<IOrder>;

export const OrderModel = models.Order || model<IOrder>('Order', orderSchema);
