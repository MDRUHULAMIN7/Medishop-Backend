import { Types } from 'mongoose';

export type DosageForm =
  | 'tablet'
  | 'syrup'
  | 'capsule'
  | 'saline'
  | 'injection'
  | 'ointment'
  | 'drop'
  | 'inhaler'
  | 'powder'
  | 'suppository'
  | 'other';

export type UnitType = 'pcs' | 'strip' | 'box' | 'bottle' | 'tube' | 'gm' | 'ml' | 'pack';

export interface IProduct {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  genericName?: string;
  dosageForm: DosageForm;
  strength?: string;
  unitType: UnitType;
  packSize?: string;
  description?: string;
  tags: string[];
  category: Types.ObjectId;
  brand: Types.ObjectId;
  price: number;
  discountPrice?: number;
  stock: number;
  expiryDate?: Date | null;
  batchNumber?: string;
  images: string[];
  requiresPrescription: boolean;
  isFeatured: boolean;
  isActive: boolean;
  ratingAverage: number;
  ratingCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  genericName?: string;
  dosageForm: DosageForm;
  strength?: string;
  unitType: UnitType;
  packSize?: string;
  description?: string;
  tags: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  brand: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  price: number;
  discountPrice?: number;
  effectivePrice: number;
  stock: number;
  inStock: boolean;
  expiryDate?: Date | null;
  batchNumber?: string;
  images: string[];
  requiresPrescription: boolean;
  isFeatured: boolean;
  isActive: boolean;
  ratingAverage: number;
  ratingCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  genericName?: string;
  dosageForm: DosageForm;
  strength?: string;
  unitType: UnitType;
  packSize?: string;
  description?: string;
  tags?: string[];
  category: string;
  brand: string;
  price: number;
  discountPrice?: number;
  stock: number;
  expiryDate?: string | Date | null;
  batchNumber?: string;
  images?: string[];
  requiresPrescription?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  genericName?: string;
  dosageForm?: DosageForm;
  strength?: string;
  unitType?: UnitType;
  packSize?: string;
  description?: string;
  tags?: string[];
  category?: string;
  brand?: string;
  price?: number;
  discountPrice?: number;
  stock?: number;
  expiryDate?: string | Date | null;
  batchNumber?: string;
  images?: string[];
  requiresPrescription?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
}

export interface ProductFilterQuery {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  category?: string;
  brand?: string;
  dosageForm?: DosageForm;
  unitType?: UnitType;
  isFeatured?: boolean;
  requiresPrescription?: boolean;
  minPrice?: number;
  maxPrice?: number;
  includeInactive?: boolean;
}

export interface SearchSuggestionItem {
  id: string;
  type: 'product' | 'generic' | 'category' | 'brand';
  text: string;
  slug: string;
  dosageForm?: DosageForm;
  strength?: string;
  categoryName?: string;
  brandName?: string;
}
