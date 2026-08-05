import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { reviewService } from './review.service';

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.createReview(
    req.params.productId,
    req.user!.id,
    req.body
  );
  return ApiResponse.success(
    res,
    'Review submitted successfully!',
    review,
    HTTP_STATUS.CREATED
  );
});

export const getProductReviews = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.getProductReviews(req.params.productId, req.query as any);
  return ApiResponse.success(
    res,
    'Product reviews fetched successfully',
    result.reviews,
    HTTP_STATUS.OK,
    result.meta
  );
});
