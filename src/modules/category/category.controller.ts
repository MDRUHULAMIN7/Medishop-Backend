import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { categoryService } from './category.service';

export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const onlyActive = req.query.includeInactive !== 'true';
  const categories = await categoryService.getAllCategories(onlyActive);
  return ApiResponse.success(res, 'Categories fetched successfully', categories);
});

export const getCategoryTree = asyncHandler(async (req: Request, res: Response) => {
  const onlyActive = req.query.includeInactive !== 'true';
  const tree = await categoryService.getCategoryTree(onlyActive);
  return ApiResponse.success(res, 'Category tree fetched successfully', tree);
});

export const getFeaturedCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await categoryService.getFeaturedCategories();
  return ApiResponse.success(res, 'Featured categories fetched successfully', categories);
});

export const getCategoryByIdOrSlug = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.getCategoryByIdOrSlug(req.params.idOrSlug);
  return ApiResponse.success(res, 'Category fetched successfully', category);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.body);
  return ApiResponse.success(res, 'Category created successfully', category, HTTP_STATUS.CREATED);
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  return ApiResponse.success(res, 'Category updated successfully', category);
});

export const toggleFeaturedCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.toggleFeatured(req.params.id);
  return ApiResponse.success(res, 'Category featured status toggled', category);
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await categoryService.deleteCategory(req.params.id);
  return ApiResponse.success(res, 'Category deleted successfully', result);
});
