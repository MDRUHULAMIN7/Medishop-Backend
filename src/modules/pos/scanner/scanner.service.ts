import crypto from 'crypto';
import { Types } from 'mongoose';
import { config } from '../../../config/env';
import { AppError, ForbiddenError, NotFoundError } from '../../../utils/AppError';
import { UserModel } from '../../user/user.model';
import { ScannerSessionModel } from './scanner.model';
import { IScannerSession, ScannerSessionResponse, ScannerSessionStatus } from './scanner.types';

const SESSION_TTL_MS = 5 * 60 * 1000;
const STAFF_ROLES = ['admin', 'super_admin', 'pharmacist', 'sales_staff', 'inventory_manager'];

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const responseFromSession = (session: IScannerSession, scannerUrl?: string): ScannerSessionResponse => ({
  sessionId: session.sessionId,
  ...(scannerUrl ? { scannerUrl } : {}),
  expiresAt: session.expiresAt,
  status: session.status,
  ...(session.connectedAt ? { connectedAt: session.connectedAt } : {}),
});

export class ScannerSessionService {
  async create(posUserId: string, scannerUrlBase: string) {
    const user: any = await UserModel.findById(posUserId).select('role status').lean();
    if (!user || user.status === 'blocked' || !STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenError('Only authorized POS staff can create scanner sessions');
    }

    // Invalidate older open sessions for this POS user to limit the number of active pairing points.
    await ScannerSessionModel.updateMany(
      { posUserId: new Types.ObjectId(posUserId), status: { $in: ['created', 'connected'] } },
      { $set: { status: 'closed' } }
    );

    const sessionId = crypto.randomBytes(24).toString('base64url');
    const scannerToken = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const session = await ScannerSessionModel.create({
      sessionId,
      posUserId: new Types.ObjectId(posUserId),
      tokenHash: hashToken(scannerToken),
      expiresAt,
      status: 'created',
    });

    const base = scannerUrlBase.replace(/\/$/, '');
    const scannerUrl = `${base}/pos/scanner/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(scannerToken)}`;

    return {
      ...responseFromSession(session.toObject() as IScannerSession, scannerUrl),
      // The raw token is intentionally returned only on session creation.
      scannerToken,
    };
  }

  async getById(sessionId: string) {
    const session: any = await ScannerSessionModel.findOne({ sessionId }).lean();
    if (!session) throw new NotFoundError('Scanner session not found', 'SCANNER_SESSION_NOT_FOUND');
    if (session.status !== 'closed' && session.expiresAt.getTime() <= Date.now()) {
      await ScannerSessionModel.updateOne({ _id: session._id }, { $set: { status: 'expired' } });
      return { ...session, status: 'expired' as ScannerSessionStatus };
    }
    return session;
  }

  async authorize(sessionId: string, scannerToken?: string, ownerUserId?: string) {
    const session = await this.getById(sessionId);
    if (session.status === 'closed' || session.status === 'expired') {
      throw new AppError('Scanner session is no longer active', 410, 'SCANNER_SESSION_EXPIRED');
    }

    if (ownerUserId && session.posUserId.toString() !== ownerUserId) {
      throw new ForbiddenError('Scanner session does not belong to this POS user');
    }

    if (!scannerToken) {
      if (!ownerUserId) throw new ForbiddenError('Scanner session token is required');
    } else {
      const stored: any = await ScannerSessionModel.findById(session._id).select('+tokenHash').lean();
      if (!stored?.tokenHash || !safeEqual(stored.tokenHash, hashToken(scannerToken))) {
        throw new ForbiddenError('Invalid scanner session token');
      }
    }

    return session;
  }

  async markConnected(sessionId: string) {
    await ScannerSessionModel.updateOne(
      { sessionId, status: { $in: ['created', 'connected'] }, expiresAt: { $gt: new Date() } },
      { $set: { status: 'connected', connectedAt: new Date(), lastSeenAt: new Date() } }
    );
  }

  async touch(sessionId: string) {
    await ScannerSessionModel.updateOne({ sessionId, status: { $in: ['created', 'connected'] } }, { $set: { lastSeenAt: new Date() } });
  }

  async close(sessionId: string, ownerUserId: string) {
    const session = await this.authorize(sessionId, undefined, ownerUserId);
    await ScannerSessionModel.updateOne({ _id: session._id }, { $set: { status: 'closed' } });
    return { sessionId, closed: true };
  }

  async closeAllForUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return;
    await ScannerSessionModel.updateMany(
      { posUserId: new Types.ObjectId(userId), status: { $in: ['created', 'connected'] } },
      { $set: { status: 'closed' } }
    );
  }

  toResponse(session: IScannerSession) {
    return responseFromSession(session);
  }
}

export const scannerSessionService = new ScannerSessionService();

export const getScannerClientBaseUrl = (origin?: string) => {
  const configuredUrls = config.CLIENT_URL.split(',').map((url) => url.trim()).filter(Boolean);
  const configured = configuredUrls[0] || 'http://localhost:3000';
  return origin && configuredUrls.includes(origin) ? origin : configured;
};
