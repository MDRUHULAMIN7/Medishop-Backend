import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { AppError } from '../utils/AppError';
import { verifyJwt } from '../utils/jwt';
import { config } from '../config/env';
import { AuthUser } from '../modules/auth/auth.types';

const getBearerToken = (header?: string) => {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim();
};

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return next(new AppError('Unauthorized.', HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED'));
  }

  try {
    const decoded = verifyJwt<AuthUser>(token, config.JWT_ACCESS_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };
    return next();
  } catch {
    return next(new AppError('Unauthorized.', HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED'));
  }
};
