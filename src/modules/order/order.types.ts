import { Types } from 'mongoose';
import { DosageForm, UnitType } from '../product/product.types';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PreOrderStatus =
  | 'pending'
  | 'sourcing'
  | 'ready_to_ship'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'partially_paid' | 'paid' | 'failed' | 'refunded';

export type RefundStatus =
  | 'refund_not_required'
  | 'refund_pending'
  | 'refund_processing'
  | 'refunded'
  | 'refund_failed';

export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'card' | 'rocket' | 'banking' | 'sslcommerz' | 'stripe';

export interface OrderDeliveryMethodSnapshot {
  id?: string;
  code?: string;
  nameBn: string;
  nameEn: string;
  charge: number;
  estimatedDaysBn?: string;
  estimatedDaysEn?: string;
  descriptionBn?: string;
  descriptionEn?: string;
}

export interface IOrderItemSnapshot {
  product: Types.ObjectId;
  name: string;
  slug: string;
  dosageForm: DosageForm;
  unitType: UnitType;
  unit?: string;
  unitMultiplier?: number;
  image: string;
  unitPrice: number;
  discountPrice?: number;
  effectiveUnitPrice: number;
  quantity: number;
  availableQuantity?: number;
  preOrderQuantity?: number;
  fulfillmentType?: 'immediate' | 'preorder' | 'mixed';
  totalPrice: number;
  requiresPrescription: boolean;
}

export interface IOrderShippingAddress {
  recipientName: string;
  phone: string;
  division?: string;
  district: string;
  thana: string;
  addressLine: string;
  postalCode?: string;
}

export interface IOrder {
  _id: Types.ObjectId;
  orderNumber: string;
  user: Types.ObjectId;
  items: IOrderItemSnapshot[];
  shippingAddress: IOrderShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: Date;
  refundStatus?: RefundStatus;
  refundAmount?: number;
  refundMethod?: string;
  refundRequestedAt?: Date;
  refundProcessedAt?: Date;
  refundTransactionId?: string;
  refundNote?: string;
  subtotal: number;
  discountTotal: number;
  couponCode?: string;
  couponDiscount: number;
  deliveryCharge: number;
  isPreOrder?: boolean;
  isSplitDelivery?: boolean;
  shipment1DeliveryMethod?: string;
  shipment2DeliveryMethod?: string;
  deliveryMethod?: OrderDeliveryMethodSnapshot | null;
  shipment1DeliveryMethodDetails?: OrderDeliveryMethodSnapshot | null;
  shipment2DeliveryMethodDetails?: OrderDeliveryMethodSnapshot | null;
  shipment1Status?: OrderStatus;
  shipment2Status?: PreOrderStatus;
  shipment1PaymentStatus?: 'pending' | 'paid' | 'failed';
  shipment2PaymentStatus?: 'pending' | 'paid' | 'failed';
  shipment1Total?: number;
  shipment2Total?: number;
  shipment1DeliveryCharge?: number;
  shipment2DeliveryCharge?: number;
  paidAmount?: number;
  estimatedDeliveryDate?: string;
  grandTotal: number;
  prescription?: Types.ObjectId | null;
  idempotencyKey?: string;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CheckoutInput {
  items?: Array<{
    productId: string;
    unit?: string;
    unitMultiplier?: number;
    unitPrice?: number;
    totalPrice?: number;
    quantity: number;
    availableQuantity?: number;
    preOrderQuantity?: number;
    fulfillmentType?: 'immediate' | 'preorder' | 'mixed';
  }>;
  shippingAddressId?: string;
  shippingAddress?: IOrderShippingAddress;
  paymentMethod?: PaymentMethod;
  couponCode?: string;
  prescriptionId?: string;
  deliveryCharge?: number;
  isPreOrder?: boolean;
  isSplitDelivery?: boolean;
  shipment1DeliveryMethod?: string;
  shipment2DeliveryMethod?: string;
  note?: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  userId: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    createdAt?: Date;
  };
  items: Array<{
    productId: string;
    name: string;
    slug: string;
    dosageForm: DosageForm;
    unitType: UnitType;
    unit?: string;
    unitMultiplier?: number;
    image: string;
    unitPrice: number;
    discountPrice?: number;
    effectiveUnitPrice: number;
    quantity: number;
    availableQuantity?: number;
    preOrderQuantity?: number;
    fulfillmentType?: 'immediate' | 'preorder' | 'mixed';
    totalPrice: number;
    requiresPrescription: boolean;
  }>;
  shippingAddress: IOrderShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: Date;
  refundStatus?: RefundStatus;
  refundAmount?: number;
  refundMethod?: string;
  refundRequestedAt?: Date;
  refundProcessedAt?: Date;
  refundTransactionId?: string;
  refundNote?: string;
  subtotal: number;
  discountTotal: number;
  couponCode?: string;
  couponDiscount: number;
  deliveryCharge: number;
  isPreOrder?: boolean;
  isSplitDelivery?: boolean;
  shipment1DeliveryMethod?: string;
  shipment2DeliveryMethod?: string;
  deliveryMethod?: OrderDeliveryMethodSnapshot | null;
  shipment1DeliveryMethodDetails?: OrderDeliveryMethodSnapshot | null;
  shipment2DeliveryMethodDetails?: OrderDeliveryMethodSnapshot | null;
  shipment1Status?: OrderStatus;
  shipment2Status?: PreOrderStatus;
  shipment1PaymentStatus?: 'pending' | 'paid' | 'failed';
  shipment2PaymentStatus?: 'pending' | 'paid' | 'failed';
  shipment1Total?: number;
  shipment2Total?: number;
  shipment1DeliveryCharge?: number;
  shipment2DeliveryCharge?: number;
  paidAmount?: number;
  estimatedDeliveryDate?: string;
  grandTotal: number;
  prescriptionId?: string | null;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateOrderStatusInput {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  shipment1Status?: OrderStatus;
  shipment2Status?: PreOrderStatus;
  shipment1PaymentStatus?: 'pending' | 'paid' | 'failed';
  shipment2PaymentStatus?: 'pending' | 'paid' | 'failed';
  targetShipment?: 'all' | 'shipment1' | 'shipment2';
  paidAmount?: number;
  cancellationReason?: string;
  refundStatus?: RefundStatus;
  refundAmount?: number;
  refundMethod?: string;
  refundTransactionId?: string;
  refundNote?: string;
  note?: string;
}

export interface OrderFilterQuery {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  refundStatus?: RefundStatus;
  page?: number;
  limit?: number;
}
