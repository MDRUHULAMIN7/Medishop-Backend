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
    const isValidId = Types.ObjectId.isValid(idOrSlug) && /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    let brand = null;
    if (isValidId) {
      brand = await BrandModel.findById(idOrSlug).lean();
    }
    if (!brand) {
      brand = await BrandModel.findOne({
        $or: [
          { slug: idOrSlug.toLowerCase() },
          { name: idOrSlug },
          { nameBn: idOrSlug },
          { nameEn: idOrSlug },
        ],
      }).lean();
    }
    return brand ? toResponse(brand) : null;
  }

  async findRawById(id: string) {
    return BrandModel.findById(id);
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
    const updated = await BrandModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();

    return updated ? toResponse(updated) : null;
  }

  async delete(id: string) {
    return BrandModel.findByIdAndDelete(id);
  }
}

export const brandRepository = new BrandRepository();
