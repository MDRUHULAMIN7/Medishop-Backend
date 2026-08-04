import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { brandService } from './brand.service';

export const getAllBrands = asyncHandler(async (req: Request, res: Response) => {
  const onlyActive = req.query.includeInactive !== 'true';
  const brands = await brandService.getAllBrands(onlyActive);
  return ApiResponse.success(res, 'Brands fetched successfully', brands);
});

export const getFeaturedBrands = asyncHandler(async (req: Request, res: Response) => {
  const brands = await brandService.getFeaturedBrands();
  return ApiResponse.success(res, 'Featured brands fetched successfully', brands);
});

export const getBrandByIdOrSlug = asyncHandler(async (req: Request, res: Response) => {
  const brand = await brandService.getBrandByIdOrSlug(req.params.idOrSlug);
  return ApiResponse.success(res, 'Brand fetched successfully', brand);
});

export const createBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await brandService.createBrand(req.body);
  return ApiResponse.success(res, 'Brand created successfully', brand, HTTP_STATUS.CREATED);
});

export const updateBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await brandService.updateBrand(req.params.id, req.body);
  return ApiResponse.success(res, 'Brand updated successfully', brand);
});

export const toggleFeaturedBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await brandService.toggleFeatured(req.params.id);
  return ApiResponse.success(res, 'Brand featured status toggled', brand);
});

export const deleteBrand = asyncHandler(async (req: Request, res: Response) => {
  const result = await brandService.deleteBrand(req.params.id);
  return ApiResponse.success(res, 'Brand deleted successfully', result);
});
