import { Types } from 'mongoose';

export type LedgerType =
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'DAMAGE'
  | 'EXPIRED_REMOVAL';

export interface IStockLedgerEntry {
  _id?: Types.ObjectId | string;
  product: Types.ObjectId | string;
  batch: Types.ObjectId | string;
  type: LedgerType;
  quantity: number; // signed: +100 for purchase, -12 for sale, in baseUnit
  baseQtyNeeded?: number; // baseUnit quantity requested at sale time
  unitSold?: string; // unit label customer purchased in (e.g., 'box')
  balanceAfter: number; // batch quantity after this entry
  referenceId?: string; // order ID, invoice ID, or adjustment reference
  performedBy?: Types.ObjectId | string;
  createdAt?: Date;
}
