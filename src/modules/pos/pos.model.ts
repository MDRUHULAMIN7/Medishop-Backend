import { Schema, model, models, HydratedDocument } from 'mongoose';
import { IInventoryItem, IPosSale, IPosSaleItem, IStockLedger, IStore } from './pos.types';

// 1. Store Schema
const storeSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    isMainStore: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

export const StoreModel = models.Store || model<IStore>('Store', storeSchema);

// 2. InventoryItem Schema
const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    stockQuantity: { type: Number, required: true, default: 0, min: 0 },
    minReorderLevel: { type: Number, default: 10, min: 0 },
    batchNumber: { type: String, trim: true },
    expiryDate: { type: Date, default: null },
    shelfLocation: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

inventoryItemSchema.index({ product: 1, store: 1 }, { unique: true });

export const InventoryItemModel =
  models.InventoryItem || model<IInventoryItem>('InventoryItem', inventoryItemSchema);

// 3. StockLedger Schema
const stockLedgerSchema = new Schema<IStockLedger>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    movementType: { type: String, enum: ['in', 'out'], required: true },
    reason: {
      type: String,
      enum: [
        'pos_sale',
        'online_order',
        'purchase_restock',
        'pos_return',
        'order_cancellation',
        'manual_adjustment',
        'damage_expiry_writeoff',
      ],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    referenceId: { type: String, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

stockLedgerSchema.index({ createdAt: -1 });

export const StockLedgerModel =
  models.PosStockLedger || model<IStockLedger>('PosStockLedger', stockLedgerSchema);

// 4. PosSale Schema
const posSaleItemSchema = new Schema<IPosSaleItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
    batchNumber: { type: String },
  },
  { _id: false }
);

const posSaleSchema = new Schema<IPosSale>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true, uppercase: true },
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    soldBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, trim: true, default: 'Walk-in Customer' },
    customerPhone: { type: String, trim: true },
    customerEmail: { type: String, trim: true },
    customerAddress: { type: String, trim: true },
    customerUser: { type: Schema.Types.ObjectId, ref: 'User' },
    items: { type: [posSaleItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0 },
    changeAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bkash', 'nagad'],
      default: 'cash',
    },
    status: {
      type: String,
      enum: ['completed', 'voided', 'returned'],
      default: 'completed',
      index: true,
    },
    voidedReason: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

posSaleSchema.index({ createdAt: -1 });

export const PosSaleModel = models.PosSale || model<IPosSale>('PosSale', posSaleSchema);
