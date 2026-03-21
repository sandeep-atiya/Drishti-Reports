import Redis from 'ioredis';
import env from './env.config.js';

let client = null;

/**
 * Returns a singleton ioredis client.
 * BullMQ requires maxRetriesPerRequest: null.
 */
export const getRedis = () => {
  if (!client) {
    client = new Redis({
      host: env.redis.host,
      port: env.redis.port,
      password: env.redis.password,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    client.on('error', (err) => {
      console.error('[Redis] connection error:', err.message);
    });
  }
  return client;
};

export const closeRedis = async () => {
  if (client) {
    await client.quit();
    client = null;
  }
};
