import dayjs from 'dayjs';
import { getRedis } from '../config/redis.js';
import logger from '../utils/logger.js';

const PREFIX = 'report:drishti:';

/**
 * TTL strategy:
 *  - endDate >= 2 days ago → 24 h  (historical, data is final)
 *  - endDate == yesterday  → 15 min (day closed, may still be processing)
 *  - endDate == today      →  5 min (live data)
 */
const ttlFor = (endDate) => {
  const diffDays = dayjs().startOf('day').diff(dayjs(endDate).startOf('day'), 'day');
  if (diffDays >= 2) return 86400;
  if (diffDays >= 1) return 900;
  return 300;
};

const key = (startDate, endDate) => `${PREFIX}${startDate}:${endDate}`;

/**
 * Returns cached report or null.
 * Never throws — Redis being down is treated as a cache miss.
 */
export const getCachedReport = async (startDate, endDate) => {
  try {
    const raw = await getRedis().get(key(startDate, endDate));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn(`[Cache] GET failed (Redis down?): ${err.message}`);
    return null; // graceful degradation — app continues without cache
  }
};

/**
 * Stores report in Redis.
 * Never throws — a failed cache write is non-fatal.
 */
export const setCachedReport = async (startDate, endDate, data) => {
  try {
    const ttl = ttlFor(endDate);
    await getRedis().setex(key(startDate, endDate), ttl, JSON.stringify(data));
  } catch (err) {
    logger.warn(`[Cache] SET failed (Redis down?): ${err.message}`);
  }
};
