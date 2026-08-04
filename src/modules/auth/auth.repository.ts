import crypto from 'crypto';
import { redisClient } from '../../redis/client';
import { AppError } from '../../utils/AppError';
import { AUTH_REDIS_KEYS, AUTH_TTL } from './auth.constants';
import { hashSha256 } from './auth.utils';

const ensureRedis = async () => {
  if (!redisClient) {
    throw new AppError('Redis client is unavailable', 503, 'REDIS_UNAVAILABLE');
  }

  if (redisClient.status === 'wait') {
    await redisClient.connect().catch((error) => {
      throw new AppError(error.message || 'Redis connection failed', 503, 'REDIS_UNAVAILABLE');
    });
  }
};

export class AuthRepository {
  private async withRedis<T>(handler: (client: typeof redisClient) => Promise<T>) {
    await ensureRedis();
    return handler(redisClient);
  }

  async storeRegistrationOtp(identifier: string, otp: string) {
    return this.withRedis(async (client) => {
      await client.set(AUTH_REDIS_KEYS.registrationOtp(identifier), hashSha256(otp), 'EX', AUTH_TTL.registrationOtpSeconds);
      await client.set(AUTH_REDIS_KEYS.registrationAttempts(identifier), '0', 'EX', AUTH_TTL.registrationOtpSeconds);
    });
  }

  async getRegistrationOtpHash(identifier: string) {
    return this.withRedis((client) => client.get(AUTH_REDIS_KEYS.registrationOtp(identifier)));
  }

  async incrementRegistrationAttempts(identifier: string) {
    return this.withRedis(async (client) => {
      const key = AUTH_REDIS_KEYS.registrationAttempts(identifier);
      const attempts = await client.incr(key);
      await client.expire(key, AUTH_TTL.registrationOtpSeconds);
      return attempts;
    });
  }

  async clearRegistrationOtp(identifier: string) {
    return this.withRedis((client) =>
      client.del(AUTH_REDIS_KEYS.registrationOtp(identifier), AUTH_REDIS_KEYS.registrationAttempts(identifier))
    );
  }

  async storeRegistrationSession(token: string, identifier: string) {
    return this.withRedis((client) =>
      client.set(AUTH_REDIS_KEYS.registrationSession(token), identifier, 'EX', AUTH_TTL.registrationSessionSeconds)
    );
  }

  async consumeRegistrationSession(token: string) {
    return this.withRedis(async (client) => {
      const key = AUTH_REDIS_KEYS.registrationSession(token);
      const identifier = await client.get(key);
      if (identifier) {
        await client.del(key);
      }
      return identifier;
    });
  }

  async storeResetOtp(identifier: string, otp: string) {
    return this.withRedis(async (client) => {
      await client.set(AUTH_REDIS_KEYS.resetOtp(identifier), hashSha256(otp), 'EX', AUTH_TTL.resetOtpSeconds);
      await client.set(AUTH_REDIS_KEYS.resetAttempts(identifier), '0', 'EX', AUTH_TTL.resetOtpSeconds);
    });
  }

  async getResetOtpHash(identifier: string) {
    return this.withRedis((client) => client.get(AUTH_REDIS_KEYS.resetOtp(identifier)));
  }

  async incrementResetAttempts(identifier: string) {
    return this.withRedis(async (client) => {
      const key = AUTH_REDIS_KEYS.resetAttempts(identifier);
      const attempts = await client.incr(key);
      await client.expire(key, AUTH_TTL.resetOtpSeconds);
      return attempts;
    });
  }

  async clearResetOtp(identifier: string) {
    return this.withRedis((client) =>
      client.del(AUTH_REDIS_KEYS.resetOtp(identifier), AUTH_REDIS_KEYS.resetAttempts(identifier))
    );
  }

  async storeResetSession(token: string, identifier: string) {
    return this.withRedis((client) =>
      client.set(AUTH_REDIS_KEYS.resetSession(token), identifier, 'EX', AUTH_TTL.resetSessionSeconds)
    );
  }

  async consumeResetSession(token: string) {
    return this.withRedis(async (client) => {
      const key = AUTH_REDIS_KEYS.resetSession(token);
      const identifier = await client.get(key);
      if (identifier) {
        await client.del(key);
      }
      return identifier;
    });
  }

  async storeRefreshSession(userId: string, sessionId: string, refreshToken: string) {
    return this.withRedis(async (client) => {
      const sessionKey = AUTH_REDIS_KEYS.refreshSession(userId, sessionId);
      const sessionsKey = AUTH_REDIS_KEYS.refreshSessions(userId);
      const tokenHash = hashSha256(refreshToken);

      await client
        .multi()
        .set(sessionKey, tokenHash, 'EX', AUTH_TTL.refreshSessionSeconds)
        .sadd(sessionsKey, sessionId)
        .expire(sessionsKey, AUTH_TTL.refreshSessionSeconds)
        .exec();
    });
  }

  async getRefreshSessionHash(userId: string, sessionId: string) {
    return this.withRedis((client) => client.get(AUTH_REDIS_KEYS.refreshSession(userId, sessionId)));
  }

  async deleteRefreshSession(userId: string, sessionId: string) {
    return this.withRedis(async (client) => {
      await client
        .multi()
        .del(AUTH_REDIS_KEYS.refreshSession(userId, sessionId))
        .srem(AUTH_REDIS_KEYS.refreshSessions(userId), sessionId)
        .exec();
    });
  }

  async revokeAllRefreshSessions(userId: string) {
    return this.withRedis(async (client) => {
      const sessionsKey = AUTH_REDIS_KEYS.refreshSessions(userId);
      const sessionIds = await client.smembers(sessionsKey);
      if (sessionIds.length > 0) {
        const keys = sessionIds.map((sessionId) => AUTH_REDIS_KEYS.refreshSession(userId, sessionId));
        await client.del(...keys);
      }
      await client.del(sessionsKey);
    });
  }

  async rotateRefreshSession(userId: string, sessionId: string, refreshToken: string) {
    return this.storeRefreshSession(userId, sessionId, refreshToken);
  }

  hash(value: string) {
    return hashSha256(value);
  }
}

export const authRepository = new AuthRepository();
