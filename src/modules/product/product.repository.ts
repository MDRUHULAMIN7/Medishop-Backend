import { FilterQuery, Types } from 'mongoose';
import { ProductModel } from './product.model';
import {
  CreateProductInput,
  ProductFilterQuery,
  ProductResponse,
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

  return {
    id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    genericName: product.genericName,
    dosageForm: product.dosageForm,
    strength: product.strength,
    unitType: product.unitType,
    packSize: product.packSize,
    description: product.description,
    category: categoryObj,
    brand: brandObj,
    price,
    discountPrice,
    effectivePrice,
    stock: Number(product.stock),
    inStock: Number(product.stock) > 0,
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
      filter.category = Types.ObjectId.isValid(query.category)
        ? new Types.ObjectId(query.category)
        : query.category;
    }

    if (query.brand) {
      filter.brand = Types.ObjectId.isValid(query.brand)
        ? new Types.ObjectId(query.brand)
        : query.brand;
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

    if (query.search && query.search.trim()) {
      filter.$text = { $search: query.search.trim() };
    }

    // Sort mapping
    let sortOptions: any = { createdAt: -1 };
    if (query.sort) {
      if (query.sort === 'price-asc') sortOptions = { price: 1 };
      else if (query.sort === 'price-desc') sortOptions = { price: -1 };
      else if (query.sort === 'rating') sortOptions = { ratingAverage: -1 };
      else if (query.sort === 'name') sortOptions = { name: 1 };
      else if (query.sort === '-createdAt') sortOptions = { createdAt: -1 };
      else if (query.sort === 'createdAt') sortOptions = { createdAt: 1 };
    }

    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .populate('category', 'name slug')
        .populate('brand', 'name slug logo')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
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
    const product = await ProductModel.create({
      ...data,
      category: new Types.ObjectId(data.category),
      brand: new Types.ObjectId(data.brand),
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
