import Redis from 'ioredis';
import { config } from '../config/env';

const isCloudRedis =
  config.REDIS_HOST.includes('upstash.io') ||
  config.REDIS_HOST.includes('redislabs.com') ||
  config.REDIS_HOST.includes('redis.cache.windows.net');

let redisClient: Redis;

try {
  redisClient = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    tls: isCloudRedis ? {} : undefined, // Upstash & Cloud Redis require TLS/SSL
    lazyConnect: true,
    maxRetriesPerRequest: null, // Recommended for cloud Redis
    retryStrategy(times) {
      if (times > 5) {
        console.warn('⚠️ Redis reconnection attempts exceeded limit. Operating without Redis cache.');
        return null; // Stop retrying after 5 attempts
      }
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis client ready & connected successfully');
  });

  redisClient.on('error', (err) => {
    // Silently handle retry errors without spamming logs
  });
} catch (error) {
  console.warn('⚠️ Failed to initialize Redis client');
}

export { redisClient };
