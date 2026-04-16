import Redis from 'ioredis';
import env from './env.config.js';
import logger from '../utils/logger.js';

let client = null;

/**
 * Returns a singleton ioredis client.
 * The client is lazy-connected — errors are emitted as events, not thrown.
 */
export const getRedis = () => {
  if (!client) {
    client = new Redis({
      host:                 env.redis.host,
      port:                 env.redis.port,
      password:             env.redis.password,
      username:             env.redis.username,
      db:                   env.redis.db,
      maxRetriesPerRequest: null,
      enableReadyCheck:     false,
      lazyConnect:          true,
      retryStrategy:        (times) => Math.min(times * 500, 5000), // back-off, max 5 s
    });

    client.on('connect',   ()    => logger.info('[Redis] Connected'));
    client.on('ready',     ()    => logger.info('[Redis] Ready'));
    client.on('error',     (err) => logger.error(`[Redis] ${err.message}`));
    client.on('close',     ()    => logger.warn('[Redis] Connection closed'));
    client.on('reconnecting', () => logger.warn('[Redis] Reconnecting...'));

    client.connect().catch((err) => logger.error(`[Redis] Initial connect failed: ${err.message}`));
  }
  return client;
};

export const closeRedis = async () => {
  if (client) {
    await client.quit();
    client = null;
  }
};
