import { Types } from 'mongoose';

export interface IReview {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  user: Types.ObjectId;
  order: Types.ObjectId;
  rating: number; // 1 to 5
  comment?: string;
  isVerifiedPurchase: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReviewResponse {
  id: string;
  productId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  orderId: string;
  rating: number;
  comment?: string;
  isVerifiedPurchase: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateReviewInput {
  rating: number;
  comment?: string;
}

export interface ReviewQuery {
  page?: number;
  limit?: number;
}
