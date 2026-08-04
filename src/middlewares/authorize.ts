import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { AppError } from '../utils/AppError';
import { UserRole } from '../modules/user/user.types';

export const authorize =
  (...allowedRoles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized.', HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden.', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN'));
    }

    return next();
  };
