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

export interface IUnitPriceOption {
  unit: UnitType;
  unitLabelBn?: string;
  unitLabelEn?: string;
  buyingPrice?: number;
  price: number;
  mrp?: number;
  discountPrice?: number;
  stock: number;
  multiplier?: number;
  isDefault?: boolean;
}

export interface IPackagingUnit {
  unit: UnitType;
  baseUnitQty: number; // how many baseUnits in 1 unit (box=100, strip=10, pcs=1)
  buyingPrice?: number;
  price: number;
  mrp?: number;
  discountPrice?: number;
  barcode?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface IProduct {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  genericName?: string;
  dosageForm: DosageForm;
  strength?: string;
  baseUnit: 'pcs' | 'ml' | 'gm';
  packaging: IPackagingUnit[];
  stockCached: number; // denormalized stock in baseUnit
  lowStockThreshold: number;
  unitType: UnitType;
  unitPrices?: IUnitPriceOption[];
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
  buyingPrice?: number;
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
  baseUnit?: 'pcs' | 'ml' | 'gm';
  packaging?: IPackagingUnit[];
  stockCached?: number;
  lowStockThreshold?: number;
  unitType: UnitType;
  unitPrices: IUnitPriceOption[];
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
  buyingPrice?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  genericName?: string;
  dosageForm: DosageForm;
  strength?: string;
  baseUnit?: 'pcs' | 'ml' | 'gm';
  packaging?: IPackagingUnit[];
  stockCached?: number;
  lowStockThreshold?: number;
  unitType?: UnitType;
  unitPrices?: IUnitPriceOption[];
  packSize?: string;
  description?: string;
  tags?: string[];
  category: string;
  brand: string;
  price: number;
  buyingPrice?: number;
  discountPrice?: number;
  stock?: number;
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
  baseUnit?: 'pcs' | 'ml' | 'gm';
  packaging?: IPackagingUnit[];
  stockCached?: number;
  lowStockThreshold?: number;
  unitType?: UnitType;
  unitPrices?: IUnitPriceOption[];
  packSize?: string;
  description?: string;
  tags?: string[];
  category?: string;
  brand?: string;
  price?: number;
  buyingPrice?: number;
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
  inStock?: boolean;
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
