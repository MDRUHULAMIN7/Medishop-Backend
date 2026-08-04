import { Types } from 'mongoose';

export interface IBrand {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  logo?: string;
  isFeatured: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BrandResponse {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  isFeatured: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateBrandInput {
  name: string;
  slug?: string;
  logo?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}

export interface UpdateBrandInput {
  name?: string;
  slug?: string;
  logo?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}
