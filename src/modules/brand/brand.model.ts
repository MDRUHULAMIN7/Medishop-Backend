import { Schema, model, models, HydratedDocument } from 'mongoose';
import { IBrand } from './brand.types';

const brandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    logo: { type: String, default: '' },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

brandSchema.index({ isFeatured: 1, isActive: 1 });

export type BrandDocument = HydratedDocument<IBrand>;

export const BrandModel = models.Brand || model<IBrand>('Brand', brandSchema);
