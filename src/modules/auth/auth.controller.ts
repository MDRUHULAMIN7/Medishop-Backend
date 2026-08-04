import { Request, Response } from 'express';
import { HTTP_STATUS } from '../../config/constants';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { authService } from './auth.service';

const setRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie(authService.getRefreshCookieName(), refreshToken, authService.getRefreshCookieOptions());
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(authService.getRefreshCookieName(), authService.getRefreshCookieOptions());
};

export const checkIdentifier = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.checkIdentifier(req.body.identifier);
  return ApiResponse.success(res, 'Identifier checked successfully', result);
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.verifyRegistrationOtp(req.body);
  return ApiResponse.success(res, 'OTP verified successfully', result);
});

export const completeRegistration = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.completeRegistration(req.body);
  setRefreshCookie(res, result.refreshToken);
  return ApiResponse.success(
    res,
    'Registration completed successfully',
    { user: result.user, accessToken: result.accessToken },
    HTTP_STATUS.CREATED
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  setRefreshCookie(res, result.refreshToken);
  return ApiResponse.success(res, 'Login successful', { user: result.user, accessToken: result.accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[authService.getRefreshCookieName()];
  if (!token) {
    return ApiResponse.error(res, 'Refresh token is required.', HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED');
  }

  const result = await authService.refresh(token);
  setRefreshCookie(res, result.refreshToken);
  return ApiResponse.success(res, 'Token refreshed successfully', {
    user: result.user,
    accessToken: result.accessToken,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[authService.getRefreshCookieName()];
  if (token) {
    await authService.logout(token);
  }
  clearRefreshCookie(res);
  return ApiResponse.success(res, 'Logged out successfully', { loggedOut: true });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body);
  return ApiResponse.success(res, 'If the account exists, a reset OTP has been sent', result);
});

export const verifyResetOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.verifyResetOtp(req.body);
  return ApiResponse.success(res, 'Reset OTP verified successfully', result);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.resetPassword(req.body);
  return ApiResponse.success(res, 'Password reset successfully', result);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.changePassword(req.user!.id, req.body);
  setRefreshCookie(res, result.refreshToken);
  return ApiResponse.success(res, 'Password changed successfully', {
    user: result.user,
    accessToken: result.accessToken,
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.getMe(req.user!.id);
  return ApiResponse.success(res, 'Authenticated user fetched successfully', result);
});
