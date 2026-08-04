import { ConflictError, NotFoundError } from '../../utils/AppError';
import { deleteRedisCacheKeys, getRedisCache, setRedisCache } from '../../utils/redisCache';
import { slugify } from '../../utils/slug';
import { brandRepository } from '../brand/brand.repository';
import { categoryRepository } from '../category/category.repository';
import { productRepository } from './product.repository';
import { CreateProductInput, ProductFilterQuery, SearchSuggestionItem, UpdateProductInput } from './product.types';

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
  // Catalog listing and search suggestion keys invalidate or expire via TTL
};

export class ProductService {
  async getProducts(query: ProductFilterQuery) {
    const cacheKey = `${CACHE_KEYS.LIST_PREFIX}${JSON.stringify(query)}`;
    const cached = await getRedisCache<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await productRepository.findWithFilters(query);
    await setRedisCache(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
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

  async createProduct(input: CreateProductInput) {
    const category = await categoryRepository.findRawById(input.category);
    if (!category) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }

    const brand = await brandRepository.findRawById(input.brand);
    if (!brand) {
      throw new NotFoundError('Brand not found', 'BRAND_NOT_FOUND');
    }

    const slug = input.slug ? slugify(input.slug) : slugify(input.name);

    const existingSlug = await productRepository.findRawBySlug(slug);
    if (existingSlug) {
      throw new ConflictError(`Product with slug "${slug}" already exists`, 'SLUG_EXISTS');
    }

    const product = await productRepository.create({
      ...input,
      name: input.name.trim(),
      slug,
    });

    await clearProductCache();
    return product;
  }

  async updateProduct(id: string, input: UpdateProductInput) {
    const existing = await productRepository.findRawById(id);
    if (!existing) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }

    if (input.category) {
      const category = await categoryRepository.findRawById(input.category);
      if (!category) {
        throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
      }
    }

    if (input.brand) {
      const brand = await brandRepository.findRawById(input.brand);
      if (!brand) {
        throw new NotFoundError('Brand not found', 'BRAND_NOT_FOUND');
      }
    }

    let slug = input.slug ? slugify(input.slug) : undefined;
    if (slug && slug !== existing.slug) {
      const duplicateSlug = await productRepository.findRawBySlug(slug);
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
    const product = await productRepository.findRawById(id);
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
    const product = await productRepository.findRawById(id);
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
