import { Types } from 'mongoose';
import { ProductModel } from '../product/product.model';
import { ReviewModel } from './review.model';
import { CreateReviewInput, ReviewQuery, ReviewResponse } from './review.types';

const toResponse = (review: any): ReviewResponse => ({
  id: review._id.toString(),
  productId: review.product ? (typeof review.product === 'object' ? review.product._id.toString() : review.product.toString()) : '',
  user: {
    id: review.user ? (typeof review.user === 'object' ? review.user._id.toString() : review.user.toString()) : '',
    name: review.user && typeof review.user === 'object' ? review.user.name : 'Verified Buyer',
  },
  orderId: review.order ? (typeof review.order === 'object' ? review.order._id.toString() : review.order.toString()) : '',
  rating: Number(review.rating),
  comment: review.comment,
  isVerifiedPurchase: Boolean(review.isVerifiedPurchase),
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

export class ReviewRepository {
  async create(productId: string, userId: string, orderId: string, input: CreateReviewInput) {
    const created = await ReviewModel.create({
      product: new Types.ObjectId(productId),
      user: new Types.ObjectId(userId),
      order: new Types.ObjectId(orderId),
      rating: input.rating,
      comment: input.comment,
      isVerifiedPurchase: true,
    });

    const populated = await created.populate('user', 'name');
    return toResponse(populated.toObject());
  }

  async findByProductId(productId: string, query: ReviewQuery = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      ReviewModel.find({ product: new Types.ObjectId(productId) })
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReviewModel.countDocuments({ product: new Types.ObjectId(productId) }),
    ]);

    return {
      reviews: reviews.map(toResponse),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findUserReviewForProduct(productId: string, userId: string) {
    const review = await ReviewModel.findOne({
      product: new Types.ObjectId(productId),
      user: new Types.ObjectId(userId),
    }).lean();
    return review ? toResponse(review) : null;
  }

  async updateProductRatingRollup(productId: string) {
    const stats = await ReviewModel.aggregate([
      { $match: { product: new Types.ObjectId(productId) } },
      {
        $group: {
          _id: '$product',
          ratingAverage: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await ProductModel.findByIdAndUpdate(productId, {
        ratingAverage: Number(stats[0].ratingAverage.toFixed(1)),
        ratingCount: stats[0].ratingCount,
      });
    } else {
      await ProductModel.findByIdAndUpdate(productId, {
        ratingAverage: 0,
        ratingCount: 0,
      });
    }
  }
}

export const reviewRepository = new ReviewRepository();
