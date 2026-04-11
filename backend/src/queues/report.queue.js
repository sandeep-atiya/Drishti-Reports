import { Queue } from 'bullmq';
import { getRedis } from '../config/redis.js';

let queue = null;

export const getReportQueue = () => {
  if (!queue) {
    queue = new Queue('report-generation', { connection: getRedis() });
  }
  return queue;
};
