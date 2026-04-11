import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const host = process.env.REDIS_HOST || '127.0.0.1';
const port = Number.parseInt(process.env.REDIS_PORT || '6379', 10);
const password = process.env.REDIS_PASSWORD || undefined;

const client = new Redis({
  host,
  port,
  password,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
});

try {
  await client.connect();
  const result = await client.flushdb();
  console.log(`[clean:redis] Redis cache cleared on ${host}:${port} (${result})`);
} catch (error) {
  console.error(`[clean:redis] Failed to clear Redis cache: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (client.status !== 'end') {
    await client.quit().catch(() => client.disconnect());
  }
}
