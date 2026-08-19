import { Schema, model, models, HydratedDocument } from 'mongoose';
import { IBatch } from './batch.types';

const batchSchema = new Schema<IBatch>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    batchNumber: { type: String, required: true, trim: true },
    expiryDate: { type: Date, required: true, index: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    costPrice: { type: Number, required: true, min: 0, default: 0 },
    buyingPriceUnit: { type: String, trim: true },
    buyingPrice: { type: Number, min: 0 },
    buyingPriceHistory: [
      {
        unit: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        baseUnitPrice: { type: Number, required: true, min: 0 },
        receivedAt: { type: Date, required: true, default: Date.now },
        quantity: { type: Number, required: true, min: 0 },
        batchNumber: { type: String, required: true, trim: true },
        recordedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      },
    ],
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
    receivedDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// FEFO Query Compound Index
batchSchema.index({ product: 1, isActive: 1, expiryDate: 1 });
// Product + BatchNumber Unique Index for batch upsert idempotency
batchSchema.index({ product: 1, batchNumber: 1 }, { unique: true });

export type BatchDocument = HydratedDocument<IBatch>;

export const BatchModel = models.Batch || model<IBatch>('Batch', batchSchema);
