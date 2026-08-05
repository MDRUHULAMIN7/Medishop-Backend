import { Schema, model, models, HydratedDocument } from 'mongoose';
import { IOrder, IOrderItemSnapshot, IOrderShippingAddress } from './order.types';

const orderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    dosageForm: { type: String, required: true },
    unitType: { type: String, required: true },
    image: { type: String, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    effectiveUnitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
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
      enum: ['cod', 'bkash', 'nagad', 'card'],
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, uppercase: true, trim: true },
    couponDiscount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 60, min: 0 },
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

export type OrderDocument = HydratedDocument<IOrder>;

export const OrderModel = models.Order || model<IOrder>('Order', orderSchema);
