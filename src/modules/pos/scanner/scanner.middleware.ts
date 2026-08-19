import { NextFunction, Request, Response } from 'express';
import { verifyJwt } from '../../../utils/jwt';
import { config } from '../../../config/env';
import { AppError, ForbiddenError } from '../../../utils/AppError';
import { AuthUser } from '../../auth/auth.types';
import { UserModel } from '../../user/user.model';
import { scannerSessionService } from './scanner.service';

const getBearerToken = (header?: string) => (header?.startsWith('Bearer ') ? header.slice(7).trim() : null);

const getSessionId = (req: Request) =>
  req.params.sessionId || req.body?.scannerSessionId || req.query.scannerSessionId?.toString();

const getScannerToken = (req: Request) =>
  req.body?.scannerToken || req.query.token?.toString() || req.headers['x-scanner-token']?.toString();

export const authenticateScannerSession = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const bearer = getBearerToken(req.headers.authorization);
    const sessionId = getSessionId(req);
    const scannerToken = getScannerToken(req);

    if (bearer) {
      const decoded = verifyJwt<AuthUser>(bearer, config.JWT_ACCESS_SECRET);
      const user: any = await UserModel.findById(decoded.id).select('status role').lean();
      if (!user || user.status === 'blocked') throw new AppError('Unauthorized.', 401, 'UNAUTHORIZED');

      req.user = { id: decoded.id, role: user.role || decoded.role, sessionId: decoded.sessionId };
      if (sessionId) {
        const session = await scannerSessionService.authorize(sessionId, undefined, req.user.id);
        req.scannerSession = session as any;
      }
      return next();
    }

    if (!sessionId || !scannerToken) throw new AppError('Scanner session credentials are required', 401, 'UNAUTHORIZED');

    const session = await scannerSessionService.authorize(sessionId, scannerToken);
    const user: any = await UserModel.findById(session.posUserId).select('status role').lean();
    if (!user || user.status === 'blocked') throw new ForbiddenError('POS staff account is unavailable');

    req.user = { id: session.posUserId.toString(), role: user.role, sessionId: `scanner:${session.sessionId}` };
    req.scannerSession = session as any;
    await scannerSessionService.touch(session.sessionId);
    return next();
  } catch (error) {
    return next(error);
  }
};
