import { Types } from 'mongoose';
import { CategoryModel } from './category.model';
import { CategoryTreeResponse, CreateCategoryInput, UpdateCategoryInput } from './category.types';

const toResponse = (category: any) => ({
  id: category._id.toString(),
  name: category.name,
  slug: category.slug,
  image: category.image || '',
  isFeatured: Boolean(category.isFeatured),
  isActive: Boolean(category.isActive),
  parentCategory: category.parentCategory
    ? typeof category.parentCategory === 'object'
      ? category.parentCategory._id.toString()
      : category.parentCategory.toString()
    : null,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const isObjectIdLike = (value: string): boolean =>
  Types.ObjectId.isValid(value) && /^[0-9a-fA-F]{24}$/.test(value);

export class CategoryRepository {
  async findAll(onlyActive = true) {
    const filter = onlyActive ? { isActive: true } : {};
    const categories = await CategoryModel.find(filter).sort({ name: 1 }).lean();
    return categories.map(toResponse);
  }

  async findFeatured(onlyActive = true) {
    const filter = onlyActive ? { isFeatured: true, isActive: true } : { isFeatured: true };
    const categories = await CategoryModel.find(filter).sort({ name: 1 }).lean();
    return categories.map(toResponse);
  }

  async findByIdOrSlug(idOrSlug: string) {
    const normalizedValue = idOrSlug.trim();
    const isValidId = isObjectIdLike(normalizedValue);
    let category = null;
    if (isValidId) {
      category = await CategoryModel.findById(normalizedValue).lean();
    }

    // Some existing category records were imported with string `_id` values.
    // Mongoose casts 24-character strings to ObjectId, so findById cannot see
    // those records. The native collection lookup preserves compatibility
    // without changing the current Category schema or existing ObjectIds.
    if (!category) {
      category = await CategoryModel.collection.findOne({ _id: normalizedValue } as any);
    }

    if (!category) {
      category = await CategoryModel.findOne({
        $or: [
          { slug: normalizedValue.toLowerCase() },
          { name: normalizedValue },
          { nameBn: normalizedValue },
          { nameEn: normalizedValue },
        ],
      }).lean();
    }
    return category ? toResponse(category) : null;
  }

  async findRawById(id: string) {
    const normalizedId = id.trim();
    if (!normalizedId) return null;

    if (isObjectIdLike(normalizedId)) {
      const category = await CategoryModel.findById(normalizedId);
      if (category) return category;
    }

    // See findByIdOrSlug: support legacy string category identifiers.
    return CategoryModel.collection.findOne({ _id: normalizedId } as any);
  }

  async findRawBySlug(slug: string) {
    return CategoryModel.findOne({ slug: slug.toLowerCase() });
  }

  async create(data: CreateCategoryInput) {
    const category = await CategoryModel.create({
      ...data,
      parentCategory: data.parentCategory ? new Types.ObjectId(data.parentCategory) : null,
    });
    return toResponse(category);
  }

  async update(id: string, data: UpdateCategoryInput) {
    const updatePayload: any = { ...data };
    if (data.parentCategory !== undefined) {
      updatePayload.parentCategory = data.parentCategory ? new Types.ObjectId(data.parentCategory) : null;
    }

    const existing = await this.findRawById(id);
    if (!existing) return null;

    let updated: any;
    if (typeof (existing as any)._id === 'string') {
      await CategoryModel.collection.updateOne(
        { _id: (existing as any)._id },
        { $set: { ...updatePayload, updatedAt: new Date() } },
      );
      updated = await CategoryModel.collection.findOne({ _id: (existing as any)._id });
    } else {
      updated = await CategoryModel.findByIdAndUpdate(id, updatePayload, {
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
      return CategoryModel.collection.deleteOne({ _id: (existing as any)._id });
    }

    return CategoryModel.findByIdAndDelete(id);
  }

  async buildTree(onlyActive = true): Promise<CategoryTreeResponse[]> {
    const filter = onlyActive ? { isActive: true } : {};
    const categories = await CategoryModel.find(filter).lean();

    const map = new Map<string, CategoryTreeResponse>();

    categories.forEach((cat: any) => {
      map.set(cat._id.toString(), {
        id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        image: cat.image || '',
        isFeatured: Boolean(cat.isFeatured),
        isActive: Boolean(cat.isActive),
        parentCategory: cat.parentCategory ? cat.parentCategory.toString() : null,
        children: [],
      });
    });

    const tree: CategoryTreeResponse[] = [];

    map.forEach((node) => {
      if (node.parentCategory && map.has(node.parentCategory)) {
        map.get(node.parentCategory)!.children.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  }
}

export const categoryRepository = new CategoryRepository();
