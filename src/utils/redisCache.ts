import { redisClient } from '../redis/client';

export const getRedisCache = async <T>(key: string): Promise<T | null> => {
  try {
    if (!redisClient || redisClient.status !== 'ready') return null;
    const data = await redisClient.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch (err) {
    console.warn(`⚠️ Redis GET error for key "${key}":`, (err as Error).message);
    return null;
  }
};

export const setRedisCache = async (key: string, value: unknown, ttlSeconds = 3600): Promise<void> => {
  try {
    if (!redisClient || redisClient.status !== 'ready') return;
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.warn(`⚠️ Redis SET error for key "${key}":`, (err as Error).message);
  }
};

export const deleteRedisCacheKeys = async (...keys: string[]): Promise<void> => {
  try {
    if (!redisClient || redisClient.status !== 'ready' || keys.length === 0) return;
    await redisClient.del(...keys);
  } catch (err) {
    console.warn(`⚠️ Redis DEL error for keys "${keys.join(', ')}":`, (err as Error).message);
  }
};
