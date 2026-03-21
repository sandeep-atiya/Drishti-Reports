import dayjs from 'dayjs';
import { getRedis } from '../config/redis.js';

const PREFIX = 'report:drishti:';

/**
 * TTL strategy:
 *  - endDate >= 2 days ago → 24 h  (historical, data is final)
 *  - endDate == yesterday   → 15 min (day closed, but may still be processing)
 *  - endDate == today        → 5 min  (live data)
 */
const ttlFor = (endDate) => {
  const diffDays = dayjs().startOf('day').diff(dayjs(endDate).startOf('day'), 'day');
  if (diffDays >= 2) return 86400; // 24 h
  if (diffDays >= 1) return 900;   // 15 min
  return 300;                       // 5 min
};

const key = (startDate, endDate) => `${PREFIX}${startDate}:${endDate}`;

export const getCachedReport = async (startDate, endDate) => {
  const raw = await getRedis().get(key(startDate, endDate));
  return raw ? JSON.parse(raw) : null;
};

export const setCachedReport = async (startDate, endDate, data) => {
  const ttl = ttlFor(endDate);
  await getRedis().setex(key(startDate, endDate), ttl, JSON.stringify(data));
};
