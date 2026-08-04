import { NextFunction, Request, Response } from 'express';
import { config } from '../config/env';
import { AppError } from '../utils/AppError';
import { verifyJwt } from '../utils/jwt';
import { AuthUser } from '../modules/auth/auth.types';

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError('Authentication token is required.', 401, 'UNAUTHORIZED'));
  }

  try {
    const decoded = verifyJwt<AuthUser>(token, config.JWT_ACCESS_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
