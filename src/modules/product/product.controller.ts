import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { uploadToCloudinary } from '../../middlewares/upload';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { productService } from './product.service';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.getProducts(req.query as any);
  return ApiResponse.success(res, 'Products fetched successfully', result.products, HTTP_STATUS.OK, result.meta);
});

export const getSearchSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const queryText = (req.query.q || req.query.query || req.query.search || '') as string;
  const limit = req.query.limit ? Number(req.query.limit) : 8;
  const suggestions = await productService.getSearchSuggestions(queryText, limit);
  return ApiResponse.success(res, 'Search suggestions fetched successfully', suggestions);
});

export const getFeaturedProducts = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const products = await productService.getFeaturedProducts(limit);
  return ApiResponse.success(res, 'Featured products fetched successfully', products);
});

export const getProductByIdOrSlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductByIdOrSlug(req.params.idOrSlug);
  return ApiResponse.success(res, 'Product details fetched successfully', product);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  let imageUrls: string[] = req.body.images || [];

  if (files && files.length > 0) {
    const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer, 'medishop/products'));
    const uploadedUrls = await Promise.all(uploadPromises);
    imageUrls = [...imageUrls, ...uploadedUrls];
  }

  const tags = req.body.tags
    ? Array.isArray(req.body.tags)
      ? req.body.tags
      : String(req.body.tags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
    : [];

  const payload = {
    ...req.body,
    tags,
    images: imageUrls,
    price: Number(req.body.price),
    discountPrice: req.body.discountPrice ? Number(req.body.discountPrice) : undefined,
    stock: Number(req.body.stock),
    isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true,
    requiresPrescription: req.body.requiresPrescription === 'true' || req.body.requiresPrescription === true,
    isActive: req.body.isActive !== 'false' && req.body.isActive !== false,
  };

  const product = await productService.createProduct(payload);
  return ApiResponse.success(res, 'Product created successfully', product, HTTP_STATUS.CREATED);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  let imageUrls: string[] | undefined = req.body.images;

  if (files && files.length > 0) {
    const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer, 'medishop/products'));
    const uploadedUrls = await Promise.all(uploadPromises);
    imageUrls = [...(imageUrls || []), ...uploadedUrls];
  }

  const tags = req.body.tags
    ? Array.isArray(req.body.tags)
      ? req.body.tags
      : String(req.body.tags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
    : undefined;

  const payload = {
    ...req.body,
    ...(tags !== undefined && { tags }),
    ...(imageUrls !== undefined && { images: imageUrls }),
    ...(req.body.price !== undefined && { price: Number(req.body.price) }),
    ...(req.body.discountPrice !== undefined && {
      discountPrice: req.body.discountPrice ? Number(req.body.discountPrice) : undefined,
    }),
    ...(req.body.stock !== undefined && { stock: Number(req.body.stock) }),
    ...(req.body.isFeatured !== undefined && {
      isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true,
    }),
    ...(req.body.requiresPrescription !== undefined && {
      requiresPrescription:
        req.body.requiresPrescription === 'true' || req.body.requiresPrescription === true,
    }),
    ...(req.body.isActive !== undefined && {
      isActive: req.body.isActive === 'true' || req.body.isActive === true,
    }),
  };

  const product = await productService.updateProduct(req.params.id, payload);
  return ApiResponse.success(res, 'Product updated successfully', product);
});

export const toggleFeaturedProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.toggleFeatured(req.params.id);
  return ApiResponse.success(res, 'Product feature status toggled', product);
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.deleteProduct(req.params.id);
  return ApiResponse.success(res, 'Product deleted successfully', result);
});
