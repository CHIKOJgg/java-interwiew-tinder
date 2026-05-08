import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
let redis = null;

import logger from './logger.js';

if (redisUrl) {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    }
  });

  redis.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  redis.on('connect', () => {
    logger.info('✅ Redis connected successfully');
  });
} else {
  logger.warn('⚠️ REDIS_URL not found. Redis features will be disabled (falling back to memory/DB).');
}

/**
 * Health check for Redis connection.
 * @returns {Promise<boolean>}
 */
export const isConnected = async () => {
  if (!redis) return false;
  try {
    const status = await redis.ping();
    return status === 'PONG';
  } catch {
    return false;
  }
};

export default redis;
