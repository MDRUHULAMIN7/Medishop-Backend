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
    unitType: {
      type: String,
      enum: UNIT_TYPES,
      required: true,
      default: 'pcs',
      index: true,
    },
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
