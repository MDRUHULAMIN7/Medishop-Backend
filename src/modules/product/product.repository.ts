import { FilterQuery, Types } from 'mongoose';
import { BrandModel } from '../brand/brand.model';
import { CategoryModel } from '../category/category.model';
import { ProductModel } from './product.model';
import {
  CreateProductInput,
  ProductFilterQuery,
  ProductResponse,
  SearchSuggestionItem,
  UpdateProductInput,
} from './product.types';

const toResponse = (product: any): ProductResponse => {
  const price = Number(product.price);
  const discountPrice =
    product.discountPrice !== undefined && product.discountPrice !== null
      ? Number(product.discountPrice)
      : undefined;
  const effectivePrice =
    discountPrice !== undefined && discountPrice < price ? discountPrice : price;

  const categoryObj =
    product.category && typeof product.category === 'object'
      ? {
          id: (product.category._id || product.category.id || '').toString(),
          name: product.category.name || '',
          slug: product.category.slug || '',
        }
      : { id: product.category?.toString() || '', name: '', slug: '' };

  const brandObj =
    product.brand && typeof product.brand === 'object'
      ? {
          id: (product.brand._id || product.brand.id || '').toString(),
          name: product.brand.name || '',
          slug: product.brand.slug || '',
          logo: product.brand.logo || '',
        }
      : { id: product.brand?.toString() || '', name: '', slug: '', logo: '' };

  const stockCached =
    product.stockCached !== undefined && product.stockCached !== null
      ? Number(product.stockCached)
      : Number(product.stock || 0);

  const rawPackaging =
    Array.isArray(product.packaging) && product.packaging.length > 0
      ? product.packaging.map((p: any) => ({
          unit: p.unit || 'pcs',
          baseUnitQty: Number(p.baseUnitQty || 1),
          price: Number(p.price || price),
          mrp: p.mrp ? Number(p.mrp) : Number(p.price || price),
          discountPrice: p.discountPrice ? Number(p.discountPrice) : undefined,
          barcode: p.barcode || undefined,
          stock: Math.floor(stockCached / Number(p.baseUnitQty || 1)),
          isDefault: Boolean(p.isDefault),
          isActive: p.isActive !== false,
        }))
      : Array.isArray(product.unitPrices) && product.unitPrices.length > 0
      ? product.unitPrices.map((u: any) => ({
          unit: u.unit || product.unitType || 'pcs',
          baseUnitQty: Number(u.multiplier || 1),
          price: Number(u.price || price),
          mrp: u.mrp ? Number(u.mrp) : Number(u.price || price),
          discountPrice: u.discountPrice ? Number(u.discountPrice) : undefined,
          stock: Math.floor(stockCached / Number(u.multiplier || 1)),
          isDefault: Boolean(u.isDefault),
          isActive: true,
        }))
      : [
          {
            unit: product.unitType || 'pcs',
            baseUnitQty: 1,
            price,
            mrp: price,
            discountPrice,
            stock: stockCached,
            isDefault: true,
            isActive: true,
          },
        ];

  const rawUnitPrices = rawPackaging.map((p: any) => ({
    unit: p.unit,
    unitLabelBn: p.unit === 'pcs' ? 'পিস' : p.unit === 'strip' ? 'পাতা' : p.unit === 'box' ? 'বক্স' : p.unit,
    unitLabelEn: p.unit,
    price: p.price,
    mrp: p.mrp,
    discountPrice: p.discountPrice,
    stock: p.stock,
    multiplier: p.baseUnitQty,
    isDefault: p.isDefault,
  }));

  // ZERO EXPOSURE SECURITY GUARANTEE: Never include buyingPrice in public response
  const response: ProductResponse = {
    id: product._id ? product._id.toString() : product.id,
    name: product.name,
    slug: product.slug,
    genericName: product.genericName,
    dosageForm: product.dosageForm,
    strength: product.strength,
    baseUnit: product.baseUnit || 'pcs',
    packaging: rawPackaging,
    stockCached,
    unitType: product.unitType || 'pcs',
    unitPrices: rawUnitPrices,
    packSize: product.packSize,
    description: product.description,
    tags: Array.isArray(product.tags) ? product.tags : [],
    category: categoryObj,
    brand: brandObj,
    price,
    discountPrice,
    effectivePrice,
    stock: stockCached,
    inStock: stockCached > 0,
    expiryDate: product.expiryDate ? new Date(product.expiryDate) : null,
    batchNumber: product.batchNumber,
    images: Array.isArray(product.images) ? product.images : [],
    requiresPrescription: Boolean(product.requiresPrescription),
    isFeatured: Boolean(product.isFeatured),
    isActive: Boolean(product.isActive),
    ratingAverage: Number(product.ratingAverage || 0),
    ratingCount: Number(product.ratingCount || 0),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };

  return response;
};

const toAdminResponse = (product: any): ProductResponse => {
  const base = toResponse(product);
  const adminPackaging = (base.packaging || []).map((p: any, idx: number) => {
    const rawP = Array.isArray(product.packaging) ? (product.packaging.find((x: any) => x.unit === p.unit) || product.packaging[idx]) : null;
    const rawU = Array.isArray(product.unitPrices) ? (product.unitPrices.find((x: any) => x.unit === p.unit) || product.unitPrices[idx]) : null;
    const tierBuying = (rawP && typeof rawP.buyingPrice === 'number' && rawP.buyingPrice > 0)
      ? rawP.buyingPrice
      : (rawU && typeof rawU.buyingPrice === 'number' && rawU.buyingPrice > 0)
      ? rawU.buyingPrice
      : (rawP?.buyingPrice ?? rawU?.buyingPrice ?? (product.buyingPrice ? Number(product.buyingPrice) * (p.baseUnitQty || 1) : 0));
    return {
      ...p,
      buyingPrice: Number(tierBuying || 0),
    };
  });
  const adminUnitPrices = (base.unitPrices || []).map((u: any, idx: number) => {
    const rawP = Array.isArray(product.packaging) ? (product.packaging.find((x: any) => x.unit === u.unit) || product.packaging[idx]) : null;
    const rawU = Array.isArray(product.unitPrices) ? (product.unitPrices.find((x: any) => x.unit === u.unit) || product.unitPrices[idx]) : null;
    const tierBuying = (rawU && typeof rawU.buyingPrice === 'number' && rawU.buyingPrice > 0)
      ? rawU.buyingPrice
      : (rawP && typeof rawP.buyingPrice === 'number' && rawP.buyingPrice > 0)
      ? rawP.buyingPrice
      : (rawU?.buyingPrice ?? rawP?.buyingPrice ?? (product.buyingPrice ? Number(product.buyingPrice) * (u.multiplier || 1) : 0));
    return {
      ...u,
      buyingPrice: Number(tierBuying || 0),
    };
  });
  const defaultTier = adminUnitPrices.find((u: any) => u.isDefault) || adminUnitPrices[0];

  return {
    ...base,
    packaging: adminPackaging,
    unitPrices: adminUnitPrices,
    buyingPrice: defaultTier?.buyingPrice ?? (product.buyingPrice !== undefined ? Number(product.buyingPrice) : 0),
  };
};

const isValidObjectId = (val?: string): boolean => {
  if (!val) return false;
  return Types.ObjectId.isValid(val) && new Types.ObjectId(val).toString() === val;
};

const splitFilterValues = (value?: string): string[] =>
  value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];

const buildSort = (sort?: string): Record<string, 1 | -1> => {
  switch (sort) {
    case 'price-asc': return { price: 1 };
    case 'price-desc': return { price: -1 };
    case 'rating': return { ratingAverage: -1, ratingCount: -1 };
    case 'newest':
    case '-createdAt': return { createdAt: -1 };
    case 'oldest':
    case 'createdAt': return { createdAt: 1 };
    default: return { createdAt: -1 };
  }
};

export class ProductRepository {
  async findRawById(id: string) {
    if (!isValidObjectId(id)) return null;
    return ProductModel.findById(id).lean();
  }

  async findRawBySlug(slug: string) {
    return ProductModel.findOne({ slug: slug.toLowerCase() }).lean();
  }

  async findById(id: string) {
    if (!isValidObjectId(id)) return null;
    const doc = await ProductModel.findById(id)
      .select('-buyingPrice')
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean();
    return doc ? toResponse(doc) : null;
  }

  async findAdminById(id: string) {
    if (!isValidObjectId(id)) return null;
    const doc = await ProductModel.findById(id)
      .select('+buyingPrice')
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean();
    return doc ? toAdminResponse(doc) : null;
  }

  async findBySlug(slug: string) {
    const doc = await ProductModel.findOne({ slug: slug.toLowerCase() })
      .select('-buyingPrice')
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean();
    return doc ? toResponse(doc) : null;
  }

  async findByIdOrSlug(idOrSlug: string) {
    if (isValidObjectId(idOrSlug)) {
      return this.findById(idOrSlug);
    }
    return this.findBySlug(idOrSlug);
  }

  async findAdminByIdOrSlug(idOrSlug: string) {
    if (isValidObjectId(idOrSlug)) {
      return this.findAdminById(idOrSlug);
    }
    const doc = await ProductModel.findOne({ slug: idOrSlug.toLowerCase() })
      .select('+buyingPrice')
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean();
    return doc ? toAdminResponse(doc) : null;
  }

  async findAll(query: ProductFilterQuery = {}) {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      search,
      category,
      brand,
      dosageForm,
      unitType,
      isFeatured,
      requiresPrescription,
      minPrice,
      maxPrice,
      inStock,
      includeInactive = false,
    } = query;

    const filter: FilterQuery<any> = {};

    if (!includeInactive) {
      filter.isActive = true;
    }

    const categoryValues = splitFilterValues(category);
    if (categoryValues.length > 0) {
      const categoryIds = categoryValues.filter(isValidObjectId).map((value) => new Types.ObjectId(value));
      const categorySlugs = categoryValues.filter((value) => !isValidObjectId(value));
      if (categorySlugs.length > 0) {
        const slugDocs = await CategoryModel.find({ slug: { $in: categorySlugs } }).select('_id').lean();
        categoryIds.push(...slugDocs.map((doc: any) => doc._id));
      }
      if (categoryIds.length === 0) return { products: [], total: 0, page, limit, totalPages: 0 };
      filter.category = categoryIds.length === 1 ? categoryIds[0] : { $in: categoryIds };
    }

    const brandValues = splitFilterValues(brand);
    if (brandValues.length > 0) {
      const brandIds = brandValues.filter(isValidObjectId).map((value) => new Types.ObjectId(value));
      const brandSlugs = brandValues.filter((value) => !isValidObjectId(value));
      if (brandSlugs.length > 0) {
        const slugDocs = await BrandModel.find({ slug: { $in: brandSlugs } }).select('_id').lean();
        brandIds.push(...slugDocs.map((doc: any) => doc._id));
      }
      if (brandIds.length === 0) return { products: [], total: 0, page, limit, totalPages: 0 };
      filter.brand = brandIds.length === 1 ? brandIds[0] : { $in: brandIds };
    }

    if (dosageForm) filter.dosageForm = dosageForm;
    if (unitType) filter.unitType = unitType;
    if (typeof isFeatured === 'boolean') filter.isFeatured = isFeatured;
    if (typeof requiresPrescription === 'boolean') filter.requiresPrescription = requiresPrescription;
    if (inStock === true) filter.stock = { $gt: 0 };

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { genericName: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      ProductModel.find(filter)
        .select('-buyingPrice')
        .sort(buildSort(sort))
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug')
        .populate('brand', 'name slug logo')
        .lean(),
      ProductModel.countDocuments(filter),
    ]);

    const products = docs.map(toResponse);
    const totalPages = Math.ceil(total / limit);

    return {
      products,
      total,
      page,
      limit,
      totalPages,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findWithFilters(query: ProductFilterQuery = {}) {
    return this.findAll(query);
  }

  async findFeatured(limit = 10) {
    const res = await this.findAll({ isFeatured: true, limit, includeInactive: false });
    return res.products;
  }

  async findSuggestions(queryText: string, limit = 8): Promise<SearchSuggestionItem[]> {
    const regex = new RegExp(queryText.trim(), 'i');
    const docs = await ProductModel.find({
      isActive: true,
      $or: [{ name: regex }, { genericName: regex }],
    })
      .select('name slug genericName dosageForm strength')
      .limit(limit)
      .lean();

    return docs.map((d: any) => ({
      id: d._id.toString(),
      type: 'product',
      text: d.name,
      slug: d.slug,
      dosageForm: d.dosageForm,
      strength: d.strength,
    }));
  }

  async findAdminProducts(query: ProductFilterQuery = {}) {
    const {
      page = 1,
      limit = 50,
      sort = '-createdAt',
      search,
      category,
      brand,
      dosageForm,
      unitType,
      isFeatured,
      requiresPrescription,
      minPrice,
      maxPrice,
      inStock,
      includeInactive = true,
    } = query;

    const filter: FilterQuery<any> = {};

    if (!includeInactive) {
      filter.isActive = true;
    }

    const categoryValues = splitFilterValues(category);
    if (categoryValues.length > 0) {
      const categoryIds = categoryValues.filter(isValidObjectId).map((value) => new Types.ObjectId(value));
      const categorySlugs = categoryValues.filter((value) => !isValidObjectId(value));
      if (categorySlugs.length > 0) {
        const slugDocs = await CategoryModel.find({ slug: { $in: categorySlugs } }).select('_id').lean();
        categoryIds.push(...slugDocs.map((doc: any) => doc._id));
      }
      if (categoryIds.length === 0) return { products: [], total: 0, page, limit, totalPages: 0, meta: { total: 0, page, limit, totalPages: 0 } };
      filter.category = categoryIds.length === 1 ? categoryIds[0] : { $in: categoryIds };
    }

    const brandValues = splitFilterValues(brand);
    if (brandValues.length > 0) {
      const brandIds = brandValues.filter(isValidObjectId).map((value) => new Types.ObjectId(value));
      const brandSlugs = brandValues.filter((value) => !isValidObjectId(value));
      if (brandSlugs.length > 0) {
        const slugDocs = await BrandModel.find({ slug: { $in: brandSlugs } }).select('_id').lean();
        brandIds.push(...slugDocs.map((doc: any) => doc._id));
      }
      if (brandIds.length === 0) return { products: [], total: 0, page, limit, totalPages: 0, meta: { total: 0, page, limit, totalPages: 0 } };
      filter.brand = brandIds.length === 1 ? brandIds[0] : { $in: brandIds };
    }

    if (dosageForm) filter.dosageForm = dosageForm;
    if (unitType) filter.unitType = unitType;
    if (typeof isFeatured === 'boolean') filter.isFeatured = isFeatured;
    if (typeof requiresPrescription === 'boolean') filter.requiresPrescription = requiresPrescription;
    if (inStock === true) filter.stock = { $gt: 0 };

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { genericName: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      ProductModel.find(filter)
        .select('+buyingPrice')
        .sort(buildSort(sort))
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug')
        .populate('brand', 'name slug logo')
        .lean(),
      ProductModel.countDocuments(filter),
    ]);

    const products = docs.map(toAdminResponse);
    const totalPages = Math.ceil(total / limit);

    return {
      products,
      total,
      page,
      limit,
      totalPages,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async create(data: CreateProductInput) {
    const categoryId = new Types.ObjectId(data.category);
    const brandId = new Types.ObjectId(data.brand);

    const generatedSlug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    const initialStock = Number(data.stock || data.stockCached || 0);

    const rawTiers = Array.isArray(data.packaging) && data.packaging.length > 0
      ? data.packaging
      : Array.isArray(data.unitPrices) && data.unitPrices.length > 0
      ? data.unitPrices
      : [];

    const packaging = rawTiers.map((p: any) => ({
      unit: p.unit || 'pcs',
      baseUnitQty: Number(p.baseUnitQty || p.multiplier || 1),
      buyingPrice: Number(p.buyingPrice !== undefined ? p.buyingPrice : (data.buyingPrice || 0)),
      price: Number(p.price || data.price),
      mrp: p.mrp ? Number(p.mrp) : Number(p.price || data.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : undefined,
      barcode: p.barcode || undefined,
      isDefault: Boolean(p.isDefault),
      isActive: p.isActive !== false,
    }));

    const unitPrices = packaging.map((p: any) => ({
      unit: p.unit,
      unitLabelBn: p.unit === 'pcs' ? 'পিস' : p.unit === 'strip' ? 'পাতা' : p.unit === 'box' ? 'বক্স' : p.unit === 'bottle' ? 'বোতল' : p.unit === 'tube' ? 'টিউব' : p.unit === 'pack' ? 'প্যাক' : p.unit,
      unitLabelEn: p.unit,
      buyingPrice: p.buyingPrice,
      price: p.price,
      mrp: p.mrp,
      discountPrice: p.discountPrice,
      stock: Math.floor(initialStock / p.baseUnitQty),
      multiplier: p.baseUnitQty,
      isDefault: p.isDefault,
    }));

    const defaultPackagingTier = packaging.find((p: any) => p.isDefault) || packaging[0];
    const computedBuyingPrice = defaultPackagingTier ? defaultPackagingTier.buyingPrice : (data.buyingPrice !== undefined ? Number(data.buyingPrice) : 0);

    const product = await ProductModel.create({
      ...data,
      slug: generatedSlug,
      category: categoryId,
      brand: brandId,
      stockCached: initialStock,
      stock: initialStock,
      buyingPrice: computedBuyingPrice,
      ...(packaging.length > 0 && { packaging, unitPrices }),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
    });

    const populated = await product.populate([
      { path: 'category', select: 'name slug' },
      { path: 'brand', select: 'name slug logo' },
    ]);

    return toAdminResponse(populated.toObject());
  }

  async update(id: string, data: UpdateProductInput) {
    const updatePayload: any = { ...data };
    if (data.category) updatePayload.category = new Types.ObjectId(data.category);
    if (data.brand) updatePayload.brand = new Types.ObjectId(data.brand);
    if (data.expiryDate !== undefined) {
      updatePayload.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    }
    if (data.buyingPrice !== undefined) {
      updatePayload.buyingPrice = Number(data.buyingPrice);
    }

    if (data.stock !== undefined) {
      updatePayload.stockCached = Number(data.stock);
      updatePayload.stock = Number(data.stock);
    }

    const rawTiers = Array.isArray((data as any).packaging) && (data as any).packaging.length > 0
      ? (data as any).packaging
      : Array.isArray((data as any).unitPrices) && (data as any).unitPrices.length > 0
      ? (data as any).unitPrices
      : null;

    if (rawTiers && rawTiers.length > 0) {
      const packaging = rawTiers.map((p: any) => ({
        unit: p.unit || 'pcs',
        baseUnitQty: Number(p.baseUnitQty || p.multiplier || 1),
        buyingPrice: Number(p.buyingPrice !== undefined ? p.buyingPrice : (data.buyingPrice || 0)),
        price: Number(p.price || data.price || 0),
        mrp: p.mrp ? Number(p.mrp) : Number(p.price || data.price || 0),
        discountPrice: p.discountPrice ? Number(p.discountPrice) : undefined,
        barcode: p.barcode || undefined,
        isDefault: Boolean(p.isDefault),
        isActive: p.isActive !== false,
      }));

      const unitPrices = packaging.map((p: any) => ({
        unit: p.unit,
        unitLabelBn: p.unit === 'pcs' ? 'পিস' : p.unit === 'strip' ? 'পাতা' : p.unit === 'box' ? 'বক্স' : p.unit === 'bottle' ? 'বোতল' : p.unit === 'tube' ? 'টিউব' : p.unit === 'pack' ? 'প্যাক' : p.unit,
        unitLabelEn: p.unit,
        buyingPrice: p.buyingPrice,
        price: p.price,
        mrp: p.mrp,
        discountPrice: p.discountPrice,
        stock: 0,
        multiplier: p.baseUnitQty,
        isDefault: p.isDefault,
      }));

      const defaultPackagingTier = packaging.find((p: any) => p.isDefault) || packaging[0];
      if (defaultPackagingTier) {
        updatePayload.buyingPrice = defaultPackagingTier.buyingPrice;
      }

      updatePayload.packaging = packaging;
      updatePayload.unitPrices = unitPrices;
    }

    const updated = await ProductModel.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    })
      .select('+buyingPrice')
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean();

    return updated ? toAdminResponse(updated) : null;
  }

  async delete(id: string) {
    return ProductModel.findByIdAndDelete(id);
  }
}

export const productRepository = new ProductRepository();
