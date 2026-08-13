import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { AppError } from '../utils/AppError';
import { UserRole } from '../modules/user/user.types';

export const authorize =
  (...allowedRoles: (UserRole | string)[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized.', HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED'));
    }

    const userRole = req.user.role;
    const isSuperOrAdmin = userRole === 'admin' || userRole === 'super_admin';

    if (!isSuperOrAdmin && !allowedRoles.includes(userRole)) {
      return next(new AppError('Access denied: insufficient permissions.', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN'));
    }

    return next();
  };
