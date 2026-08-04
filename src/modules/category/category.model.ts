import { Schema, model, models, HydratedDocument } from 'mongoose';
import { ICategory } from './category.types';

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    image: { type: String, default: '' },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

categorySchema.index({ parentCategory: 1, isActive: 1 });
categorySchema.index({ isFeatured: 1, isActive: 1 });

export type CategoryDocument = HydratedDocument<ICategory>;

export const CategoryModel = models.Category || model<ICategory>('Category', categorySchema);
