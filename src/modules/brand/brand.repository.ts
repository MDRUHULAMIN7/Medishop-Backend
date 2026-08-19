import { Types } from 'mongoose';
import { BrandModel } from './brand.model';
import { BrandResponse, CreateBrandInput, UpdateBrandInput } from './brand.types';

const toResponse = (brand: any): BrandResponse => ({
  id: brand._id.toString(),
  name: brand.name,
  slug: brand.slug,
  logo: brand.logo || '',
  isFeatured: Boolean(brand.isFeatured),
  isActive: Boolean(brand.isActive),
  createdAt: brand.createdAt,
  updatedAt: brand.updatedAt,
});

const isObjectIdLike = (value: string): boolean =>
  Types.ObjectId.isValid(value) && /^[0-9a-fA-F]{24}$/.test(value);

export class BrandRepository {
  async findAll(onlyActive = true) {
    const filter = onlyActive ? { isActive: true } : {};
    const brands = await BrandModel.find(filter).sort({ name: 1 }).lean();
    return brands.map(toResponse);
  }

  async findFeatured(onlyActive = true) {
    const filter = onlyActive ? { isFeatured: true, isActive: true } : { isFeatured: true };
    const brands = await BrandModel.find(filter).sort({ name: 1 }).lean();
    return brands.map(toResponse);
  }

  async findByIdOrSlug(idOrSlug: string) {
    const normalizedValue = idOrSlug.trim();
    const isValidId = isObjectIdLike(normalizedValue);
    let brand = null;
    if (isValidId) {
      brand = await BrandModel.findById(normalizedValue).lean();
    }

    // Support legacy brand records whose imported `_id` is a string.
    if (!brand) {
      brand = await BrandModel.collection.findOne({ _id: normalizedValue } as any);
    }

    if (!brand) {
      brand = await BrandModel.findOne({
        $or: [
          { slug: normalizedValue.toLowerCase() },
          { name: normalizedValue },
          { nameBn: normalizedValue },
          { nameEn: normalizedValue },
        ],
      }).lean();
    }
    return brand ? toResponse(brand) : null;
  }

  async findRawById(id: string) {
    const normalizedId = id.trim();
    if (!normalizedId) return null;

    if (isObjectIdLike(normalizedId)) {
      const brand = await BrandModel.findById(normalizedId);
      if (brand) return brand;
    }

    return BrandModel.collection.findOne({ _id: normalizedId } as any);
  }

  async findRawBySlug(slug: string) {
    return BrandModel.findOne({ slug: slug.toLowerCase() });
  }

  async findRawByName(name: string) {
    return BrandModel.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
  }

  async create(data: CreateBrandInput) {
    const brand = await BrandModel.create(data);
    return toResponse(brand);
  }

  async update(id: string, data: UpdateBrandInput) {
    const existing = await this.findRawById(id);
    if (!existing) return null;

    let updated: any;
    if (typeof (existing as any)._id === 'string') {
      await BrandModel.collection.updateOne(
        { _id: (existing as any)._id },
        { $set: { ...data, updatedAt: new Date() } },
      );
      updated = await BrandModel.collection.findOne({ _id: (existing as any)._id } as any);
    } else {
      updated = await BrandModel.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      }).lean();
    }

    return updated ? toResponse(updated) : null;
  }

  async delete(id: string) {
    const existing = await this.findRawById(id);
    if (!existing) return null;

    if (typeof (existing as any)._id === 'string') {
      return BrandModel.collection.deleteOne({ _id: (existing as any)._id } as any);
    }

    return BrandModel.findByIdAndDelete(id);
  }
}

export const brandRepository = new BrandRepository();
