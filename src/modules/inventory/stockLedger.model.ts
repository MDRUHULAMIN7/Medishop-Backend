import { Schema, model, models, HydratedDocument } from 'mongoose';
import { IStockLedgerEntry } from './stockLedger.types';

const LEDGER_TYPES = [
  'PURCHASE',
  'SALE',
  'RETURN',
  'ADJUSTMENT',
  'DAMAGE',
  'EXPIRED_REMOVAL',
];

const stockLedgerSchema = new Schema<IStockLedgerEntry>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch', default: null, index: true },
    type: { type: String, enum: LEDGER_TYPES, required: true, index: true },
    quantity: { type: Number, required: true }, // signed (+ / -) in baseUnit
    baseQtyNeeded: { type: Number },
    unitSold: { type: String, trim: true },
    balanceAfter: { type: Number, required: true },
    referenceId: { type: String, trim: true, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-Only: No updatedAt
    versionKey: false,
  }
);

// Product Audit Index
stockLedgerSchema.index({ product: 1, createdAt: -1 });

// Batch Audit Index
stockLedgerSchema.index({ batch: 1, createdAt: -1 });

// Partial Unique Index for Idempotency Guard (protects against double deductions on network retries)
stockLedgerSchema.index(
  { referenceId: 1, type: 1, batch: 1 },
  {
    unique: true,
    partialFilterExpression: { referenceId: { $exists: true, $type: 'string' } },
  }
);

export type StockLedgerDocument = HydratedDocument<IStockLedgerEntry>;

export const StockLedgerModel =
  models.StockLedger || model<IStockLedgerEntry>('StockLedger', stockLedgerSchema);
