import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { AppError } from '../utils/AppError';
import { verifyJwt } from '../utils/jwt';
import { config } from '../config/env';
import { AuthUser } from '../modules/auth/auth.types';
import { UserModel } from '../modules/user/user.model';
import { emitToUser } from '../socket';

const getBearerToken = (header?: string) => {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim();
};

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return next(new AppError('Unauthorized.', HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED'));
  }

  try {
    const decoded = verifyJwt<AuthUser>(token, config.JWT_ACCESS_SECRET);
    const user = (await UserModel.findById(decoded.id).select('status role').lean()) as { status?: string; role?: AuthUser['role'] } | null;
    if (!user || user.status === 'blocked') {
      if (user?.status === 'blocked') {
        emitToUser(decoded.id, 'account:blocked', { message: 'Your account has been blocked. Access is restricted.' });
      }
      return next(new AppError('Your account has been blocked or is unavailable.', HTTP_STATUS.FORBIDDEN, 'ACCOUNT_BLOCKED'));
    }
    req.user = {
      id: decoded.id,
      role: user.role || decoded.role,
      sessionId: decoded.sessionId,
    };
    return next();
  } catch {
    return next(new AppError('Unauthorized.', HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED'));
  }
};
