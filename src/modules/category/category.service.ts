import { ConflictError, NotFoundError } from '../../utils/AppError';
import { deleteRedisCacheKeys, getRedisCache, setRedisCache } from '../../utils/redisCache';
import { slugify } from '../../utils/slug';
import { categoryRepository } from './category.repository';
import { CreateCategoryInput, UpdateCategoryInput } from './category.types';

const CACHE_KEYS = {
  ALL: 'cache:categories:all',
  TREE: 'cache:categories:tree',
  FEATURED: 'cache:categories:featured',
};

const CACHE_TTL_SECONDS = 3600; // 1 hour

const clearCategoryCache = async () => {
  await deleteRedisCacheKeys(
    CACHE_KEYS.ALL,
    `${CACHE_KEYS.ALL}:admin`,
    CACHE_KEYS.TREE,
    `${CACHE_KEYS.TREE}:admin`,
    CACHE_KEYS.FEATURED
  );
};

export class CategoryService {
  async getAllCategories(onlyActive = true) {
    const cacheKey = onlyActive ? CACHE_KEYS.ALL : `${CACHE_KEYS.ALL}:admin`;
    const cached = await getRedisCache<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const categories = await categoryRepository.findAll(onlyActive);
    await setRedisCache(cacheKey, categories, CACHE_TTL_SECONDS);
    return categories;
  }

  async getCategoryTree(onlyActive = true) {
    const cacheKey = onlyActive ? CACHE_KEYS.TREE : `${CACHE_KEYS.TREE}:admin`;
    const cached = await getRedisCache<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const tree = await categoryRepository.buildTree(onlyActive);
    await setRedisCache(cacheKey, tree, CACHE_TTL_SECONDS);
    return tree;
  }

  async getFeaturedCategories() {
    const cached = await getRedisCache<any[]>(CACHE_KEYS.FEATURED);
    if (cached) {
      return cached;
    }

    const categories = await categoryRepository.findFeatured(true);
    await setRedisCache(CACHE_KEYS.FEATURED, categories, CACHE_TTL_SECONDS);
    return categories;
  }

  async getCategoryByIdOrSlug(idOrSlug: string) {
    const category = await categoryRepository.findByIdOrSlug(idOrSlug);
    if (!category) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async createCategory(input: CreateCategoryInput) {
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);

    const existingSlug = await categoryRepository.findRawBySlug(slug);
    if (existingSlug) {
      throw new ConflictError(`Category with slug "${slug}" already exists`, 'SLUG_EXISTS');
    }

    if (input.parentCategory) {
      const parent = await categoryRepository.findRawById(input.parentCategory);
      if (!parent) {
        throw new NotFoundError('Parent category not found', 'PARENT_CATEGORY_NOT_FOUND');
      }
    }

    const category = await categoryRepository.create({
      ...input,
      slug,
    });

    await clearCategoryCache();
    return category;
  }

  async updateCategory(id: string, input: UpdateCategoryInput) {
    const existing = await categoryRepository.findRawById(id);
    if (!existing) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }

    let slug = input.slug ? slugify(input.slug) : undefined;
    if (slug && slug !== existing.slug) {
      const duplicate = await categoryRepository.findRawBySlug(slug);
      if (duplicate && duplicate._id.toString() !== id) {
        throw new ConflictError(`Category with slug "${slug}" already exists`, 'SLUG_EXISTS');
      }
    } else if (input.name && !input.slug) {
      slug = slugify(input.name);
    }

    if (input.parentCategory) {
      if (input.parentCategory === id) {
        throw new ConflictError('A category cannot be its own parent', 'INVALID_PARENT');
      }
      const parent = await categoryRepository.findRawById(input.parentCategory);
      if (!parent) {
        throw new NotFoundError('Parent category not found', 'PARENT_CATEGORY_NOT_FOUND');
      }
    }

    const updated = await categoryRepository.update(id, {
      ...input,
      ...(slug && { slug }),
    });

    await clearCategoryCache();
    return updated;
  }

  async toggleFeatured(id: string) {
    const category = await categoryRepository.findRawById(id);
    if (!category) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }

    const updated = await categoryRepository.update(id, {
      isFeatured: !category.isFeatured,
    });

    await clearCategoryCache();
    return updated;
  }

  async deleteCategory(id: string) {
    const category = await categoryRepository.findRawById(id);
    if (!category) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }

    await categoryRepository.delete(id);
    await clearCategoryCache();
    return { id, deleted: true };
  }
}

export const categoryService = new CategoryService();
