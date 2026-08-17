import { Types } from 'mongoose';
import { DosageForm, UnitType } from '../product/product.types';

export interface ICartItem {
  _id?: Types.ObjectId;
  product: Types.ObjectId;
  quantity: number;
  addedAt?: Date;
}

export interface ICart {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: ICartItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CartItemResponse {
  product: {
    id: string;
    name: string;
    slug: string;
    dosageForm: DosageForm;
    unitType: UnitType;
    images: string[];
    price: number;
    discountPrice?: number;
    effectivePrice: number;
    stock: number;
    inStock: boolean;
    requiresPrescription: boolean;
    isActive: boolean;
  };
  quantity: number;
  itemTotal: number;
  isAvailable: boolean;
  isStockExceeded: boolean;
  maxAvailableQuantity: number;
}

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItemResponse[];
  totalItemCount: number;
  uniqueItemCount: number;
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  hasPrescriptionProducts: boolean;
  hasUnavailableItems: boolean;
  updatedAt?: Date;
}

export interface AddCartItemInput {
  productId: string;
  quantity: number;
  allowPreOrder?: boolean;
}

export interface UpdateCartItemInput {
  quantity: number;
}
