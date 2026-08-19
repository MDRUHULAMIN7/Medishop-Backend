import { Types } from 'mongoose';

export type StockMovementReason =
  | 'pos_sale'
  | 'online_order'
  | 'purchase_restock'
  | 'pos_return'
  | 'order_cancellation'
  | 'manual_adjustment'
  | 'damage_expiry_writeoff';

export interface IStore {
  _id: Types.ObjectId;
  name: string;
  code: string;
  address: string;
  phone: string;
  isMainStore: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInventoryItem {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  store: Types.ObjectId;
  stockQuantity: number;
  minReorderLevel: number;
  batchNumber?: string;
  expiryDate?: Date | null;
  shelfLocation?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IStockLedger {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  store: Types.ObjectId;
  movementType: 'in' | 'out';
  reason: StockMovementReason;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  performedBy: Types.ObjectId;
  note?: string;
  createdAt?: Date;
}

export interface IPosSaleItem {
  product: Types.ObjectId;
  name: string;
  unit?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  buyingPrice?: number;
  batchNumber?: string;
}

export interface IPosSale {
  _id: Types.ObjectId;
  invoiceNumber: string;
  store: Types.ObjectId;
  soldBy: Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerUser?: Types.ObjectId | string;
  items: IPosSaleItem[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: 'cash' | 'card' | 'bkash' | 'nagad';
  status: 'completed' | 'voided' | 'returned';
  voidedReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateStoreInput {
  name: string;
  code: string;
  address: string;
  phone: string;
  isMainStore?: boolean;
  isActive?: boolean;
}

export interface StockAdjustmentInput {
  productId: string;
  storeId?: string;
  quantityChange: number; // positive for restock, negative for reduction
  reason: StockMovementReason;
  note?: string;
}

export interface PosCheckoutInput {
  storeId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerUser?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    unit?: string;
    unitPrice?: number;
    batchNumber?: string;
  }>;
  discountTotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  paidAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'bkash' | 'nagad';
  note?: string;
}
