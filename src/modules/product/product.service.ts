import { ConflictError, NotFoundError } from '../../utils/AppError';
import { deleteRedisCacheKeys, deleteRedisCachePattern, getRedisCache, setRedisCache } from '../../utils/redisCache';
import { slugify } from '../../utils/slug';
import { brandRepository } from '../brand/brand.repository';
import { categoryRepository } from '../category/category.repository';
import { productRepository } from './product.repository';
import { CreateProductInput, ProductFilterQuery, SearchSuggestionItem, UpdateProductInput } from './product.types';
import { inventoryService } from '../inventory/inventory.service';

const CACHE_KEYS = {
  LIST_PREFIX: 'cache:products:list:',
  FEATURED: 'cache:products:featured',
  DETAIL_PREFIX: 'cache:products:detail:',
  SUGGESTIONS_PREFIX: 'cache:search:suggestions:',
};

const CACHE_TTL_SECONDS = 1800; // 30 minutes for catalog list
const SUGGESTION_TTL_SECONDS = 3600; // 1 hour for suggestions

const clearProductCache = async () => {
  await deleteRedisCacheKeys(CACHE_KEYS.FEATURED);
  await deleteRedisCachePattern(`${CACHE_KEYS.LIST_PREFIX}*`);
  await deleteRedisCachePattern(`${CACHE_KEYS.SUGGESTIONS_PREFIX}*`);
};

export class ProductService {
  async getProducts(query: ProductFilterQuery) {
    const isIncludeInactive = query.includeInactive === true || String(query.includeInactive) === 'true';
    const filterQuery: ProductFilterQuery = {
      ...query,
      includeInactive: isIncludeInactive,
    };

    if (isIncludeInactive) {
      return productRepository.findWithFilters(filterQuery);
    }

    const cacheKey = `${CACHE_KEYS.LIST_PREFIX}${JSON.stringify(filterQuery)}`;
    const cached = await getRedisCache<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await productRepository.findWithFilters(filterQuery);
    await setRedisCache(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  }

  async getAdminProducts(query: ProductFilterQuery) {
    return productRepository.findAdminProducts(query);
  }

  async getSearchSuggestions(queryText: string, limit = 8): Promise<SearchSuggestionItem[]> {
    const trimmed = queryText.trim().toLowerCase();
    if (!trimmed) {
      return [];
    }

    const cacheKey = `${CACHE_KEYS.SUGGESTIONS_PREFIX}${trimmed}:${limit}`;
    const cached = await getRedisCache<SearchSuggestionItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const suggestions = await productRepository.findSuggestions(trimmed, limit);
    await setRedisCache(cacheKey, suggestions, SUGGESTION_TTL_SECONDS);
    return suggestions;
  }

  async getFeaturedProducts(limit = 10) {
    const cacheKey = `${CACHE_KEYS.FEATURED}:${limit}`;
    const cached = await getRedisCache<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const products = await productRepository.findFeatured(limit);
    await setRedisCache(cacheKey, products, CACHE_TTL_SECONDS);
    return products;
  }

  async getProductByIdOrSlug(idOrSlug: string) {
    const cacheKey = `${CACHE_KEYS.DETAIL_PREFIX}${idOrSlug.toLowerCase()}`;
    const cached = await getRedisCache<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const product = await productRepository.findByIdOrSlug(idOrSlug);
    if (!product) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }

    await setRedisCache(cacheKey, product, CACHE_TTL_SECONDS);
    return product;
  }

  async getAdminProductByIdOrSlug(idOrSlug: string) {
    const product = await productRepository.findAdminByIdOrSlug(idOrSlug);
    if (!product) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }
    return product;
  }

  async createProduct(input: CreateProductInput) {
    const category = await categoryRepository.findByIdOrSlug(input.category);
    if (!category) {
      throw new NotFoundError(`Category "${input.category}" not found`, 'CATEGORY_NOT_FOUND');
    }
    input.category = category.id;

    const brand = await brandRepository.findByIdOrSlug(input.brand);
    if (!brand) {
      throw new NotFoundError(`Brand "${input.brand}" not found`, 'BRAND_NOT_FOUND');
    }
    input.brand = brand.id;

    const slug = input.slug ? slugify(input.slug) : slugify(input.name);

    const existingSlug = await productRepository.findRawBySlug(slug);
    if (existingSlug) {
      throw new ConflictError(`Product with slug "${slug}" already exists`, 'SLUG_EXISTS');
    }

    const baseUnit = input.baseUnit || 'pcs';
    const packaging = Array.isArray(input.packaging) && input.packaging.length > 0
      ? input.packaging
      : Array.isArray((input as any).unitPrices) && (input as any).unitPrices.length > 0
      ? (input as any).unitPrices.map((u: any) => ({
          unit: u.unit || 'pcs',
          baseUnitQty: Number(u.baseUnitQty || u.multiplier || 1),
          price: Number(u.price || input.price || 0),
          mrp: u.mrp ? Number(u.mrp) : Number(u.price || input.price || 0),
          discountPrice: u.discountPrice ? Number(u.discountPrice) : undefined,
          isDefault: Boolean(u.isDefault),
          isActive: true,
        }))
      : [
          {
            unit: input.unitType || 'pcs',
            baseUnitQty: 1,
            price: Number(input.price || 0),
            mrp: Number(input.price || 0),
            discountPrice: input.discountPrice ? Number(input.discountPrice) : undefined,
            isDefault: true,
            isActive: true,
          },
        ];

    const initialStock = Number(input.stock || (input as any).stockCached || 0);

    const product = await productRepository.create({
      ...input,
      name: input.name.trim(),
      slug,
      baseUnit,
      packaging,
      stockCached: initialStock,
    });

    if (initialStock > 0) {
      try {
        const batchNum = input.batchNumber ? input.batchNumber.trim() : `INIT-${Date.now().toString().slice(-6)}`;
        const expDate = input.expiryDate ? new Date(input.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        await inventoryService.receiveBatch({
          productId: product.id,
          batchNumber: batchNum,
          expiryDate: expDate,
          quantity: initialStock,
          costPrice: Number(input.price || 0),
          purchaseReferenceId: `INIT-PROD-${product.id}`,
        });
      } catch (err) {
        console.warn('⚠️ Initial batch creation warning for product:', (err as Error).message);
      }
    }

    await clearProductCache();
    return product;
  }

  async updateProduct(id: string, input: UpdateProductInput) {
    const existing: any = await productRepository.findRawById(id);
    if (!existing) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }

    if (input.category) {
      const category = await categoryRepository.findByIdOrSlug(input.category);
      if (!category) {
        throw new NotFoundError(`Category "${input.category}" not found`, 'CATEGORY_NOT_FOUND');
      }
      input.category = category.id;
    }

    if (input.brand) {
      const brand = await brandRepository.findByIdOrSlug(input.brand);
      if (!brand) {
        throw new NotFoundError(`Brand "${input.brand}" not found`, 'BRAND_NOT_FOUND');
      }
      input.brand = brand.id;
    }

    let slug = input.slug ? slugify(input.slug) : undefined;
    if (slug && slug !== existing.slug) {
      const duplicateSlug: any = await productRepository.findRawBySlug(slug);
      if (duplicateSlug && duplicateSlug._id.toString() !== id) {
        throw new ConflictError(`Product with slug "${slug}" already exists`, 'SLUG_EXISTS');
      }
    } else if (input.name && !input.slug) {
      slug = slugify(input.name);
    }

    const updated = await productRepository.update(id, {
      ...input,
      ...(input.name && { name: input.name.trim() }),
      ...(slug && { slug }),
    });

    await clearProductCache();
    await deleteRedisCacheKeys(`${CACHE_KEYS.DETAIL_PREFIX}${existing._id.toString()}`, `${CACHE_KEYS.DETAIL_PREFIX}${existing.slug}`);
    return updated;
  }

  async toggleFeatured(id: string) {
    const product: any = await productRepository.findRawById(id);
    if (!product) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }

    const updated = await productRepository.update(id, {
      isFeatured: !product.isFeatured,
    });

    await clearProductCache();
    return updated;
  }

  async deleteProduct(id: string) {
    const product: any = await productRepository.findRawById(id);
    if (!product) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }

    await productRepository.delete(id);
    await clearProductCache();
    await deleteRedisCacheKeys(`${CACHE_KEYS.DETAIL_PREFIX}${product._id.toString()}`, `${CACHE_KEYS.DETAIL_PREFIX}${product.slug}`);
    return { id, deleted: true };
  }
}

export const productService = new ProductService();
