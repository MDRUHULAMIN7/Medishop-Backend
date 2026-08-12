import { Schema, model, models, HydratedDocument } from 'mongoose';
import { IProduct } from './product.types';

const DOSAGE_FORMS = [
  'tablet',
  'syrup',
  'capsule',
  'saline',
  'injection',
  'ointment',
  'drop',
  'inhaler',
  'powder',
  'suppository',
  'other',
];

const UNIT_TYPES = ['pcs', 'strip', 'box', 'bottle', 'tube', 'gm', 'ml', 'pack'];

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    genericName: { type: String, trim: true, index: true },
    dosageForm: {
      type: String,
      enum: DOSAGE_FORMS,
      required: true,
      default: 'tablet',
      index: true,
    },
    strength: { type: String, trim: true },
    baseUnit: {
      type: String,
      enum: ['pcs', 'ml', 'gm'],
      default: 'pcs',
      required: true,
      index: true,
    },
    packaging: [
      {
        unit: { type: String, enum: UNIT_TYPES, required: true },
        baseUnitQty: { type: Number, required: true, min: 1, default: 1 },
        price: { type: Number, required: true, min: 0 },
        mrp: { type: Number, min: 0 },
        discountPrice: { type: Number, min: 0 },
        barcode: { type: String, trim: true },
        isDefault: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
      },
    ],
    stockCached: { type: Number, required: true, min: 0, default: 0, index: true },
    lowStockThreshold: { type: Number, default: 10 },
    unitType: {
      type: String,
      enum: UNIT_TYPES,
      required: true,
      default: 'pcs',
      index: true,
    },
    unitPrices: [
      {
        unit: { type: String, enum: UNIT_TYPES, required: true },
        unitLabelBn: { type: String, trim: true },
        unitLabelEn: { type: String, trim: true },
        price: { type: Number, required: true, min: 0 },
        mrp: { type: Number, min: 0 },
        discountPrice: { type: Number, min: 0 },
        stock: { type: Number, min: 0, default: 0 },
        multiplier: { type: Number, default: 1 },
        isDefault: { type: Boolean, default: false },
      },
    ],
    packSize: { type: String, trim: true },
    description: { type: String, trim: true },
    tags: { type: [String], default: [], index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0, default: undefined },
    stock: { type: Number, required: true, min: 0, default: 0 },
    expiryDate: { type: Date, default: null },
    batchNumber: { type: String, trim: true },
    images: { type: [String], default: [] },
    requiresPrescription: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound Indexes for fast queries & catalog filtering
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ dosageForm: 1, isActive: 1 });
productSchema.index({ price: 1, isActive: 1 });

// Full-Text Search Index across name, genericName, tags, and description with field weighting
productSchema.index(
  {
    name: 'text',
    genericName: 'text',
    tags: 'text',
    description: 'text',
  },
  {
    weights: {
      name: 10,
      genericName: 5,
      tags: 3,
      description: 1,
    },
    name: 'product_text_search',
  }
);

export type ProductDocument = HydratedDocument<IProduct>;

export const ProductModel = models.Product || model<IProduct>('Product', productSchema);
