import { ConflictError, NotFoundError } from '../../utils/AppError';
import { deleteRedisCacheKeys, getRedisCache, setRedisCache } from '../../utils/redisCache';
import { slugify } from '../../utils/slug';
import { brandRepository } from './brand.repository';
import { CreateBrandInput, UpdateBrandInput } from './brand.types';

const CACHE_KEYS = {
  ALL: 'cache:brands:all',
  FEATURED: 'cache:brands:featured',
};

const CACHE_TTL_SECONDS = 3600; // 1 hour

const clearBrandCache = async () => {
  await deleteRedisCacheKeys(CACHE_KEYS.ALL, CACHE_KEYS.FEATURED);
};

export class BrandService {
  async getAllBrands(onlyActive = true) {
    const cacheKey = onlyActive ? CACHE_KEYS.ALL : `${CACHE_KEYS.ALL}:admin`;
    const cached = await getRedisCache<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const brands = await brandRepository.findAll(onlyActive);
    await setRedisCache(cacheKey, brands, CACHE_TTL_SECONDS);
    return brands;
  }

  async getFeaturedBrands() {
    const cached = await getRedisCache<any[]>(CACHE_KEYS.FEATURED);
    if (cached) {
      return cached;
    }

    const brands = await brandRepository.findFeatured(true);
    await setRedisCache(CACHE_KEYS.FEATURED, brands, CACHE_TTL_SECONDS);
    return brands;
  }

  async getBrandByIdOrSlug(idOrSlug: string) {
    const brand = await brandRepository.findByIdOrSlug(idOrSlug);
    if (!brand) {
      throw new NotFoundError('Brand not found', 'BRAND_NOT_FOUND');
    }
    return brand;
  }

  async createBrand(input: CreateBrandInput) {
    const existingName = await brandRepository.findRawByName(input.name);
    if (existingName) {
      throw new ConflictError(`Brand with name "${input.name}" already exists`, 'BRAND_EXISTS');
    }

    const slug = input.slug ? slugify(input.slug) : slugify(input.name);

    const existingSlug = await brandRepository.findRawBySlug(slug);
    if (existingSlug) {
      throw new ConflictError(`Brand with slug "${slug}" already exists`, 'SLUG_EXISTS');
    }

    const brand = await brandRepository.create({
      ...input,
      name: input.name.trim(),
      slug,
    });

    await clearBrandCache();
    return brand;
  }

  async updateBrand(id: string, input: UpdateBrandInput) {
    const existing = await brandRepository.findRawById(id);
    if (!existing) {
      throw new NotFoundError('Brand not found', 'BRAND_NOT_FOUND');
    }

    if (input.name && input.name.trim() !== existing.name) {
      const duplicateName = await brandRepository.findRawByName(input.name);
      if (duplicateName && duplicateName._id.toString() !== id) {
        throw new ConflictError(`Brand with name "${input.name}" already exists`, 'BRAND_EXISTS');
      }
    }

    let slug = input.slug ? slugify(input.slug) : undefined;
    if (slug && slug !== existing.slug) {
      const duplicateSlug = await brandRepository.findRawBySlug(slug);
      if (duplicateSlug && duplicateSlug._id.toString() !== id) {
        throw new ConflictError(`Brand with slug "${slug}" already exists`, 'SLUG_EXISTS');
      }
    } else if (input.name && !input.slug) {
      slug = slugify(input.name);
    }

    const updated = await brandRepository.update(id, {
      ...input,
      ...(input.name && { name: input.name.trim() }),
      ...(slug && { slug }),
    });

    await clearBrandCache();
    return updated;
  }

  async toggleFeatured(id: string) {
    const brand = await brandRepository.findRawById(id);
    if (!brand) {
      throw new NotFoundError('Brand not found', 'BRAND_NOT_FOUND');
    }

    const updated = await brandRepository.update(id, {
      isFeatured: !brand.isFeatured,
    });

    await clearBrandCache();
    return updated;
  }

  async deleteBrand(id: string) {
    const brand = await brandRepository.findRawById(id);
    if (!brand) {
      throw new NotFoundError('Brand not found', 'BRAND_NOT_FOUND');
    }

    await brandRepository.delete(id);
    await clearBrandCache();
    return { id, deleted: true };
  }
}

export const brandService = new BrandService();
