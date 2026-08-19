import crypto from 'crypto';
import { redisClient } from '../../redis/client';
import { AUTH_REDIS_KEYS, AUTH_TTL } from './auth.constants';
import { hashSha256 } from './auth.utils';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

class InMemoryAuthStore {
  private store = new Map<string, MemoryEntry>();
  private sets = new Map<string, Set<string>>();

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  del(...keys: string[]): void {
    for (const key of keys) {
      this.store.delete(key);
      this.sets.delete(key);
    }
  }

  incr(key: string, ttlSeconds: number): number {
    const current = this.get(key);
    const count = current ? parseInt(current, 10) + 1 : 1;
    this.set(key, String(count), ttlSeconds);
    return count;
  }

  sadd(key: string, member: string, _ttlSeconds?: number): void {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    this.sets.get(key)!.add(member);
  }

  srem(key: string, member: string): void {
    const set = this.sets.get(key);
    if (set) {
      set.delete(member);
      if (set.size === 0) this.sets.delete(key);
    }
  }

  smembers(key: string): string[] {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }
}

const inMemoryStore = new InMemoryAuthStore();

const isRedisAvailable = (): boolean => {
  return Boolean(redisClient && redisClient.status === 'ready');
};

export class AuthRepository {
  async storeRegistrationOtp(identifier: string, otp: string) {
    if (isRedisAvailable()) {
      try {
        await redisClient.set(AUTH_REDIS_KEYS.registrationOtp(identifier), hashSha256(otp), 'EX', AUTH_TTL.registrationOtpSeconds);
        await redisClient.set(AUTH_REDIS_KEYS.registrationAttempts(identifier), '0', 'EX', AUTH_TTL.registrationOtpSeconds);
        return;
      } catch (err) {
        console.warn('⚠️ Redis storeRegistrationOtp failed, falling back to memory:', (err as Error).message);
      }
    }
    inMemoryStore.set(AUTH_REDIS_KEYS.registrationOtp(identifier), hashSha256(otp), AUTH_TTL.registrationOtpSeconds);
    inMemoryStore.set(AUTH_REDIS_KEYS.registrationAttempts(identifier), '0', AUTH_TTL.registrationOtpSeconds);
  }

  async getRegistrationOtpHash(identifier: string) {
    if (isRedisAvailable()) {
      try {
        return await redisClient.get(AUTH_REDIS_KEYS.registrationOtp(identifier));
      } catch (err) {
        console.warn('⚠️ Redis getRegistrationOtpHash failed, falling back to memory:', (err as Error).message);
      }
    }
    return inMemoryStore.get(AUTH_REDIS_KEYS.registrationOtp(identifier));
  }

  async incrementRegistrationAttempts(identifier: string) {
    if (isRedisAvailable()) {
      try {
        const key = AUTH_REDIS_KEYS.registrationAttempts(identifier);
        const attempts = await redisClient.incr(key);
        await redisClient.expire(key, AUTH_TTL.registrationOtpSeconds);
        return attempts;
      } catch (err) {
        console.warn('⚠️ Redis incrementRegistrationAttempts failed, falling back to memory:', (err as Error).message);
      }
    }
    return inMemoryStore.incr(AUTH_REDIS_KEYS.registrationAttempts(identifier), AUTH_TTL.registrationOtpSeconds);
  }

  async clearRegistrationOtp(identifier: string) {
    if (isRedisAvailable()) {
      try {
        await redisClient.del(AUTH_REDIS_KEYS.registrationOtp(identifier), AUTH_REDIS_KEYS.registrationAttempts(identifier));
        return;
      } catch (err) {
        console.warn('⚠️ Redis clearRegistrationOtp failed, falling back to memory:', (err as Error).message);
      }
    }
    inMemoryStore.del(AUTH_REDIS_KEYS.registrationOtp(identifier), AUTH_REDIS_KEYS.registrationAttempts(identifier));
  }

  async storeRegistrationSession(token: string, identifier: string) {
    if (isRedisAvailable()) {
      try {
        await redisClient.set(AUTH_REDIS_KEYS.registrationSession(token), identifier, 'EX', AUTH_TTL.registrationSessionSeconds);
        return;
      } catch (err) {
        console.warn('⚠️ Redis storeRegistrationSession failed, falling back to memory:', (err as Error).message);
      }
    }
    inMemoryStore.set(AUTH_REDIS_KEYS.registrationSession(token), identifier, AUTH_TTL.registrationSessionSeconds);
  }

  async consumeRegistrationSession(token: string) {
    if (isRedisAvailable()) {
      try {
        const key = AUTH_REDIS_KEYS.registrationSession(token);
        const identifier = await redisClient.get(key);
        if (identifier) {
          await redisClient.del(key);
        }
        return identifier;
      } catch (err) {
        console.warn('⚠️ Redis consumeRegistrationSession failed, falling back to memory:', (err as Error).message);
      }
    }
    const key = AUTH_REDIS_KEYS.registrationSession(token);
    const identifier = inMemoryStore.get(key);
    if (identifier) {
      inMemoryStore.del(key);
    }
    return identifier;
  }

  async storeResetOtp(identifier: string, otp: string) {
    if (isRedisAvailable()) {
      try {
        await redisClient.set(AUTH_REDIS_KEYS.resetOtp(identifier), hashSha256(otp), 'EX', AUTH_TTL.resetOtpSeconds);
        await redisClient.set(AUTH_REDIS_KEYS.resetAttempts(identifier), '0', 'EX', AUTH_TTL.resetOtpSeconds);
        return;
      } catch (err) {
        console.warn('⚠️ Redis storeResetOtp failed, falling back to memory:', (err as Error).message);
      }
    }
    inMemoryStore.set(AUTH_REDIS_KEYS.resetOtp(identifier), hashSha256(otp), AUTH_TTL.resetOtpSeconds);
    inMemoryStore.set(AUTH_REDIS_KEYS.resetAttempts(identifier), '0', AUTH_TTL.resetOtpSeconds);
  }

  async getResetOtpHash(identifier: string) {
    if (isRedisAvailable()) {
      try {
        return await redisClient.get(AUTH_REDIS_KEYS.resetOtp(identifier));
      } catch (err) {
        console.warn('⚠️ Redis getResetOtpHash failed, falling back to memory:', (err as Error).message);
      }
    }
    return inMemoryStore.get(AUTH_REDIS_KEYS.resetOtp(identifier));
  }

  async incrementResetAttempts(identifier: string) {
    if (isRedisAvailable()) {
      try {
        const key = AUTH_REDIS_KEYS.resetAttempts(identifier);
        const attempts = await redisClient.incr(key);
        await redisClient.expire(key, AUTH_TTL.resetOtpSeconds);
        return attempts;
      } catch (err) {
        console.warn('⚠️ Redis incrementResetAttempts failed, falling back to memory:', (err as Error).message);
      }
    }
    return inMemoryStore.incr(AUTH_REDIS_KEYS.resetAttempts(identifier), AUTH_TTL.resetOtpSeconds);
  }

  async clearResetOtp(identifier: string) {
    if (isRedisAvailable()) {
      try {
        await redisClient.del(AUTH_REDIS_KEYS.resetOtp(identifier), AUTH_REDIS_KEYS.resetAttempts(identifier));
        return;
      } catch (err) {
        console.warn('⚠️ Redis clearResetOtp failed, falling back to memory:', (err as Error).message);
      }
    }
    inMemoryStore.del(AUTH_REDIS_KEYS.resetOtp(identifier), AUTH_REDIS_KEYS.resetAttempts(identifier));
  }

  async storeResetSession(token: string, identifier: string) {
    if (isRedisAvailable()) {
      try {
        await redisClient.set(AUTH_REDIS_KEYS.resetSession(token), identifier, 'EX', AUTH_TTL.resetSessionSeconds);
        return;
      } catch (err) {
        console.warn('⚠️ Redis storeResetSession failed, falling back to memory:', (err as Error).message);
      }
    }
    inMemoryStore.set(AUTH_REDIS_KEYS.resetSession(token), identifier, AUTH_TTL.resetSessionSeconds);
  }

  async consumeResetSession(token: string) {
    if (isRedisAvailable()) {
      try {
        const key = AUTH_REDIS_KEYS.resetSession(token);
        const identifier = await redisClient.get(key);
        if (identifier) {
          await redisClient.del(key);
        }
        return identifier;
      } catch (err) {
        console.warn('⚠️ Redis consumeResetSession failed, falling back to memory:', (err as Error).message);
      }
    }
    const key = AUTH_REDIS_KEYS.resetSession(token);
    const identifier = inMemoryStore.get(key);
    if (identifier) {
      inMemoryStore.del(key);
    }
    return identifier;
  }

  async storeRefreshSession(userId: string, sessionId: string, refreshToken: string) {
    if (isRedisAvailable()) {
      try {
        const sessionKey = AUTH_REDIS_KEYS.refreshSession(userId, sessionId);
        const sessionsKey = AUTH_REDIS_KEYS.refreshSessions(userId);
        const tokenHash = hashSha256(refreshToken);

        await redisClient
          .multi()
          .set(sessionKey, tokenHash, 'EX', AUTH_TTL.refreshSessionSeconds)
          .sadd(sessionsKey, sessionId)
          .expire(sessionsKey, AUTH_TTL.refreshSessionSeconds)
          .exec();
        return;
      } catch (err) {
        console.warn('⚠️ Redis storeRefreshSession failed, falling back to memory:', (err as Error).message);
      }
    }
    const sessionKey = AUTH_REDIS_KEYS.refreshSession(userId, sessionId);
    const sessionsKey = AUTH_REDIS_KEYS.refreshSessions(userId);
    const tokenHash = hashSha256(refreshToken);
    inMemoryStore.set(sessionKey, tokenHash, AUTH_TTL.refreshSessionSeconds);
    inMemoryStore.sadd(sessionsKey, sessionId, AUTH_TTL.refreshSessionSeconds);
  }

  async getRefreshSessionHash(userId: string, sessionId: string) {
    if (isRedisAvailable()) {
      try {
        return await redisClient.get(AUTH_REDIS_KEYS.refreshSession(userId, sessionId));
      } catch (err) {
        console.warn('⚠️ Redis getRefreshSessionHash failed, falling back to memory:', (err as Error).message);
      }
    }
    return inMemoryStore.get(AUTH_REDIS_KEYS.refreshSession(userId, sessionId));
  }

  async deleteRefreshSession(userId: string, sessionId: string) {
    if (isRedisAvailable()) {
      try {
        await redisClient
          .multi()
          .del(AUTH_REDIS_KEYS.refreshSession(userId, sessionId))
          .srem(AUTH_REDIS_KEYS.refreshSessions(userId), sessionId)
          .exec();
        return;
      } catch (err) {
        console.warn('⚠️ Redis deleteRefreshSession failed, falling back to memory:', (err as Error).message);
      }
    }
    inMemoryStore.del(AUTH_REDIS_KEYS.refreshSession(userId, sessionId));
    inMemoryStore.srem(AUTH_REDIS_KEYS.refreshSessions(userId), sessionId);
  }

  async revokeAllRefreshSessions(userId: string) {
    if (isRedisAvailable()) {
      try {
        const sessionsKey = AUTH_REDIS_KEYS.refreshSessions(userId);
        const sessionIds = await redisClient.smembers(sessionsKey);
        if (sessionIds.length > 0) {
          const keys = sessionIds.map((sessionId) => AUTH_REDIS_KEYS.refreshSession(userId, sessionId));
          await redisClient.del(...keys);
        }
        await redisClient.del(sessionsKey);
        return;
      } catch (err) {
        console.warn('⚠️ Redis revokeAllRefreshSessions failed, falling back to memory:', (err as Error).message);
      }
    }
    const sessionsKey = AUTH_REDIS_KEYS.refreshSessions(userId);
    const sessionIds = inMemoryStore.smembers(sessionsKey);
    if (sessionIds.length > 0) {
      const keys = sessionIds.map((sessionId) => AUTH_REDIS_KEYS.refreshSession(userId, sessionId));
      inMemoryStore.del(...keys);
    }
    inMemoryStore.del(sessionsKey);
  }

  async rotateRefreshSession(userId: string, sessionId: string, refreshToken: string) {
    return this.storeRefreshSession(userId, sessionId, refreshToken);
  }

  hash(value: string) {
    return hashSha256(value);
  }
}

export const authRepository = new AuthRepository();
