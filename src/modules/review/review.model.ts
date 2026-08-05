import { Schema, model, models, HydratedDocument } from 'mongoose';
import { IReview } from './review.types';

const reviewSchema = new Schema<IReview>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    isVerifiedPurchase: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

export type ReviewDocument = HydratedDocument<IReview>;

export const ReviewModel = models.Review || model<IReview>('Review', reviewSchema);
