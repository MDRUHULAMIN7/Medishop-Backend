import { Types } from 'mongoose';
import { DosageForm, UnitType } from '../product/product.types';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'card';

export interface IOrderItemSnapshot {
  product: Types.ObjectId;
  name: string;
  slug: string;
  dosageForm: DosageForm;
  unitType: UnitType;
  image: string;
  unitPrice: number;
  discountPrice?: number;
  effectiveUnitPrice: number;
  quantity: number;
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
  subtotal: number;
  discountTotal: number;
  couponCode?: string;
  couponDiscount: number;
  deliveryCharge: number;
  grandTotal: number;
  prescription?: Types.ObjectId | null;
  idempotencyKey?: string;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CheckoutInput {
  shippingAddressId?: string;
  shippingAddress?: IOrderShippingAddress;
  paymentMethod?: PaymentMethod;
  couponCode?: string;
  prescriptionId?: string;
  deliveryCharge?: number;
  note?: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  userId: string;
  items: Array<{
    productId: string;
    name: string;
    slug: string;
    dosageForm: DosageForm;
    unitType: UnitType;
    image: string;
    unitPrice: number;
    discountPrice?: number;
    effectiveUnitPrice: number;
    quantity: number;
    totalPrice: number;
    requiresPrescription: boolean;
  }>;
  shippingAddress: IOrderShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  subtotal: number;
  discountTotal: number;
  couponCode?: string;
  couponDiscount: number;
  deliveryCharge: number;
  grandTotal: number;
  prescriptionId?: string | null;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
