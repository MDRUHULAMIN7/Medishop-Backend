import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/AppError';
import { OrderModel } from '../order/order.model';
import { ProductModel } from '../product/product.model';
import { reviewRepository } from './review.repository';
import { CreateReviewInput, ReviewQuery } from './review.types';

export class ReviewService {
  async createReview(productId: string, userId: string, input: CreateReviewInput) {
    const product = await ProductModel.findById(productId);
    if (!product || !product.isActive) {
      throw new NotFoundError('Product not found or inactive', 'PRODUCT_NOT_FOUND');
    }

    // Check if user already reviewed this product
    const existingReview = await reviewRepository.findUserReviewForProduct(productId, userId);
    if (existingReview) {
      throw new ConflictError('You have already submitted a review for this product', 'REVIEW_EXISTS');
    }

    // Verified-Purchase Exit Criteria Verification:
    // Find an order placed by the user containing this product with orderStatus === 'delivered'
    const deliveredOrder = await OrderModel.findOne({
      user: userId,
      orderStatus: 'delivered',
      'items.product': productId,
    }).lean();

    if (!deliveredOrder || Array.isArray(deliveredOrder)) {
      throw new ForbiddenError(
        'Review rejected: Only verified buyers who have purchased and received (delivered) this product can submit a review.',
        'VERIFIED_PURCHASE_REQUIRED'
      );
    }

    const orderDoc = deliveredOrder as any;

    const review = await reviewRepository.create(
      productId,
      userId,
      orderDoc._id.toString(),
      input
    );

    // Recalculate and update Product ratingAverage & ratingCount rollup
    await reviewRepository.updateProductRatingRollup(productId);

    return review;
  }

  async getProductReviews(productId: string, query: ReviewQuery) {
    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }

    return reviewRepository.findByProductId(productId, query);
  }
}

export const reviewService = new ReviewService();
