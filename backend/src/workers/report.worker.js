import { Worker } from 'bullmq';
import { getRedis } from '../config/redis.js';
import drishtiReportService from '../services/drishti.report.service.js';
import { setCachedReport } from '../utils/cache.js';
import logger from '../utils/logger.js';

let worker = null;

export const startReportWorker = () => {
  if (worker) return worker;

  worker = new Worker(
    'report-generation',
    async (job) => {
      const { startDate, endDate } = job.data;
      logger.info(`[Worker] Job ${job.id} started: ${startDate} → ${endDate}`);

      const result = await drishtiReportService.getReport({ startDate, endDate });

      // Store in Redis so repeated requests for the same range are instant
      await setCachedReport(startDate, endDate, result);

      return result;
    },
    {
      connection: getRedis(),
      concurrency: 2, // at most 2 large-range jobs at a time
    }
  );

  worker.on('completed', (job) => logger.info(`[Worker] Job ${job.id} completed`));
  worker.on('failed', (job, err) => logger.error(`[Worker] Job ${job.id} failed: ${err.message}`));

  return worker;
};

export const stopReportWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};
