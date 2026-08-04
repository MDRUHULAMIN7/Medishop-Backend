import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { UserRole } from '../modules/user/user.types';

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden.', 403, 'FORBIDDEN'));
    }

    return next();
  };
};
