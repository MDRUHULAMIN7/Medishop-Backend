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
          id: product.category._id.toString(),
          name: product.category.name,
          slug: product.category.slug,
        }
      : { id: product.category?.toString() || '', name: '', slug: '' };

  const brandObj =
    product.brand && typeof product.brand === 'object'
      ? {
          id: product.brand._id.toString(),
          name: product.brand.name,
          slug: product.brand.slug,
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

  return {
    id: product._id.toString(),
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
};

const isValidObjectId = (val?: string): boolean => {
  return Boolean(val && typeof val === 'string' && Types.ObjectId.isValid(val) && /^[0-9a-fA-F]{24}$/.test(val));
};

export class ProductRepository {
  async findWithFilters(query: ProductFilterQuery) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<any> = {};

    if (!query.includeInactive) {
      filter.isActive = true;
    }

    if (query.category) {
      const catInput = String(query.category).trim();
      if (isValidObjectId(catInput)) {
        filter.category = new Types.ObjectId(catInput);
      } else {
        const catSlug = catInput.toLowerCase();
        const cat = await CategoryModel.findOne({
          $or: [
            { slug: catSlug },
            { name: new RegExp(`^${catSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          ],
        });
        if (cat) {
          filter.category = cat._id;
        } else {
          filter.category = new Types.ObjectId();
        }
      }
    }

    if (query.brand) {
      const brandInput = String(query.brand).trim();
      if (isValidObjectId(brandInput)) {
        filter.brand = new Types.ObjectId(brandInput);
      } else {
        const brandSlug = brandInput.toLowerCase();
        const brandObj = await BrandModel.findOne({
          $or: [
            { slug: brandSlug },
            { name: new RegExp(`^${brandSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          ],
        });
        if (brandObj) {
          filter.brand = brandObj._id;
        } else {
          filter.brand = new Types.ObjectId();
        }
      }
    }

    if (query.dosageForm) {
      filter.dosageForm = query.dosageForm;
    }

    if (query.unitType) {
      filter.unitType = query.unitType;
    }

    if (query.isFeatured !== undefined) {
      filter.isFeatured = query.isFeatured;
    }

    if (query.requiresPrescription !== undefined) {
      filter.requiresPrescription = query.requiresPrescription;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {};
      if (query.minPrice !== undefined) filter.price.$gte = Number(query.minPrice);
      if (query.maxPrice !== undefined) filter.price.$lte = Number(query.maxPrice);
    }

    const hasSearch = Boolean(query.search && query.search.trim());
    if (hasSearch) {
      const q = query.search!.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      filter.$or = [
        { name: searchRegex },
        { genericName: searchRegex },
        { tags: searchRegex },
        { dosageForm: searchRegex },
        { strength: searchRegex },
      ];
    }

    // Determine sort options
    let sortOptions: any = {};
    let projection: any = null;

    if (query.sort === 'price-asc') sortOptions = { price: 1 };
    else if (query.sort === 'price-desc') sortOptions = { price: -1 };
    else if (query.sort === 'rating') sortOptions = { ratingAverage: -1 };
    else if (query.sort === 'name') sortOptions = { name: 1 };
    else if (query.sort === '-createdAt') sortOptions = { createdAt: -1 };
    else if (query.sort === 'createdAt') sortOptions = { createdAt: 1 };
    else {
      sortOptions = { createdAt: -1 };
    }

    const summaryProjection: any = projection ? { ...projection } : {};
    summaryProjection.name = 1;
    summaryProjection.slug = 1;
    summaryProjection.genericName = 1;
    summaryProjection.dosageForm = 1;
    summaryProjection.strength = 1;
    summaryProjection.baseUnit = 1;
    summaryProjection.unitType = 1;
    summaryProjection.packaging = 1;
    summaryProjection.unitPrices = 1;
    summaryProjection.stockCached = 1;
    summaryProjection.stock = 1;
    summaryProjection.category = 1;
    summaryProjection.brand = 1;
    summaryProjection.price = 1;
    summaryProjection.discountPrice = 1;
    summaryProjection.expiryDate = 1;
    summaryProjection.batchNumber = 1;
    summaryProjection.images = { $slice: 1 };
    summaryProjection.requiresPrescription = 1;
    summaryProjection.isFeatured = 1;
    summaryProjection.isActive = 1;
    summaryProjection.ratingAverage = 1;
    summaryProjection.ratingCount = 1;
    summaryProjection.createdAt = 1;
    summaryProjection.updatedAt = 1;

    let queryBuilder = ProductModel.find(filter, summaryProjection)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    const [products, total] = await Promise.all([
      queryBuilder,
      ProductModel.countDocuments(filter),
    ]);

    return {
      products: products.map(toResponse),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findSuggestions(rawQuery: string, limit = 8): Promise<SearchSuggestionItem[]> {
    const q = rawQuery.trim();
    if (!q) return [];

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const [products, categories, brands] = await Promise.all([
      ProductModel.find(
        { isActive: true, $or: [{ name: regex }, { genericName: regex }, { tags: regex }] },
        { name: 1, slug: 1, genericName: 1, dosageForm: 1, strength: 1, category: 1, brand: 1 }
      )
        .populate('category', 'name')
        .populate('brand', 'name')
        .limit(limit)
        .lean(),

      CategoryModel.find({ isActive: true, name: regex }, { name: 1, slug: 1 }).limit(3).lean(),

      BrandModel.find({ isActive: true, name: regex }, { name: 1, slug: 1 }).limit(3).lean(),
    ]);

    const suggestions: SearchSuggestionItem[] = [];

    // Map Category matches
    categories.forEach((cat: any) => {
      suggestions.push({
        id: cat._id.toString(),
        type: 'category',
        text: cat.name,
        slug: cat.slug,
      });
    });

    // Map Brand matches
    brands.forEach((b: any) => {
      suggestions.push({
        id: b._id.toString(),
        type: 'brand',
        text: b.name,
        slug: b.slug,
      });
    });

    // Map Product matches & Generic name matches
    const addedGenerics = new Set<string>();

    products.forEach((prod: any) => {
      // Add product suggestion
      suggestions.push({
        id: prod._id.toString(),
        type: 'product',
        text: prod.name,
        slug: prod.slug,
        dosageForm: prod.dosageForm,
        strength: prod.strength,
        categoryName: prod.category?.name,
        brandName: prod.brand?.name,
      });

      // Add generic suggestion if matches and not duplicate
      if (prod.genericName && regex.test(prod.genericName) && !addedGenerics.has(prod.genericName.toLowerCase())) {
        addedGenerics.add(prod.genericName.toLowerCase());
        suggestions.push({
          id: `generic-${prod._id.toString()}`,
          type: 'generic',
          text: prod.genericName,
          slug: prod.slug,
          dosageForm: prod.dosageForm,
        });
      }
    });

    return suggestions.slice(0, limit);
  }

  async findFeatured(limit = 10) {
    const products = await ProductModel.find({ isFeatured: true, isActive: true })
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return products.map(toResponse);
  }

  async findByIdOrSlug(idOrSlug: string) {
    const isObjectId = Types.ObjectId.isValid(idOrSlug);
    const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };

    const product = await ProductModel.findOne(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean();

    return product ? toResponse(product) : null;
  }

  async findRawById(id: string) {
    return ProductModel.findById(id);
  }

  async findRawBySlug(slug: string) {
    return ProductModel.findOne({ slug: slug.toLowerCase() });
  }

  async create(data: CreateProductInput) {
    const rawTiers = Array.isArray((data as any).packaging) && (data as any).packaging.length > 0
      ? (data as any).packaging
      : Array.isArray((data as any).unitPrices) && (data as any).unitPrices.length > 0
      ? (data as any).unitPrices
      : [];

    const packaging = rawTiers.map((p: any) => ({
      unit: p.unit || 'pcs',
      baseUnitQty: Number(p.baseUnitQty || p.multiplier || 1),
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
      price: p.price,
      mrp: p.mrp,
      discountPrice: p.discountPrice,
      stock: 0,
      multiplier: p.baseUnitQty,
      isDefault: p.isDefault,
    }));

    const product = await ProductModel.create({
      ...data,
      category: new Types.ObjectId(data.category),
      brand: new Types.ObjectId(data.brand),
      ...(packaging.length > 0 && { packaging, unitPrices }),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
    });

    const populated = await product.populate([
      { path: 'category', select: 'name slug' },
      { path: 'brand', select: 'name slug logo' },
    ]);

    return toResponse(populated.toObject());
  }

  async update(id: string, data: UpdateProductInput) {
    const updatePayload: any = { ...data };
    if (data.category) updatePayload.category = new Types.ObjectId(data.category);
    if (data.brand) updatePayload.brand = new Types.ObjectId(data.brand);
    if (data.expiryDate !== undefined) {
      updatePayload.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
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
        price: p.price,
        mrp: p.mrp,
        discountPrice: p.discountPrice,
        stock: 0,
        multiplier: p.baseUnitQty,
        isDefault: p.isDefault,
      }));

      updatePayload.packaging = packaging;
      updatePayload.unitPrices = unitPrices;
    }

    const updated = await ProductModel.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    })
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean();

    return updated ? toResponse(updated) : null;
  }

  async delete(id: string) {
    return ProductModel.findByIdAndDelete(id);
  }
}

export const productRepository = new ProductRepository();
