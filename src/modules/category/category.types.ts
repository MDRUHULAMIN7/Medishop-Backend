import { Types } from 'mongoose';

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  parentCategory?: Types.ObjectId | null;
  image?: string;
  isFeatured: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryTreeResponse {
  id: string;
  name: string;
  slug: string;
  image?: string;
  isFeatured: boolean;
  isActive: boolean;
  parentCategory?: string | null;
  children: CategoryTreeResponse[];
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  parentCategory?: string | null;
  image?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  parentCategory?: string | null;
  image?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}
