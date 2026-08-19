import { Types } from 'mongoose';

export interface IBatch {
  _id?: Types.ObjectId | string;
  product: Types.ObjectId | string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number; // current remaining quantity in baseUnit
  costPrice: number; // cost per baseUnit
  buyingPriceUnit?: string;
  buyingPrice?: number;
  buyingPriceHistory?: BatchBuyingPriceHistory[];
  supplier?: Types.ObjectId | string;
  receivedDate: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BatchBuyingPriceHistory {
  unit: string;
  price: number;
  baseUnitPrice: number;
  receivedAt: Date;
  quantity: number;
  batchNumber: string;
  recordedBy?: Types.ObjectId | string;
}

export interface ReceiveBatchInput {
  productId: string;
  batchNumber: string;
  expiryDate: string | Date;
  quantity: number; // in baseUnit
  costPrice: number; // per baseUnit
  unit?: string;
  supplier?: string;
  purchaseReferenceId?: string;
}
