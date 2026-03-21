import dayjs from 'dayjs';
import drishtiReportService from '../services/drishti.report.service.js';
import logger from '../utils/logger.js';

const getRanges = () => {
  const today = dayjs();
  const y     = today.year();
  return [
    { label: 'This Month',    start: today.startOf('month').format('YYYY-MM-DD'),                      end: today.format('YYYY-MM-DD') },
    { label: 'Last Month',    start: today.subtract(1,'month').startOf('month').format('YYYY-MM-DD'),  end: today.subtract(1,'month').endOf('month').format('YYYY-MM-DD') },
    { label: 'Last 3 Months', start: today.subtract(2,'month').startOf('month').format('YYYY-MM-DD'),  end: today.format('YYYY-MM-DD') },
    { label: 'Last 6 Months', start: today.subtract(5,'month').startOf('month').format('YYYY-MM-DD'),  end: today.format('YYYY-MM-DD') },
    { label: 'This Year',     start: `${y}-01-01`,                                                     end: today.format('YYYY-MM-DD') },
    { label: 'Last Year',     start: `${y - 1}-01-01`,                                                 end: `${y - 1}-12-31` },
  ];
};

/**
 * Pre-computes all common date ranges and stores them in Redis.
 * Called after each sync so the cache always reflects fresh SQLite data.
 */
export const warmCache = async () => {
  const ranges = getRanges();
  logger.info(`[CacheWarmer] Warming ${ranges.length} ranges...`);

  for (const range of ranges) {
    try {
      await drishtiReportService.getReport({ startDate: range.start, endDate: range.end });
      logger.info(`[CacheWarmer] "${range.label}" cached`);
    } catch (err) {
      logger.error(`[CacheWarmer] "${range.label}" failed: ${err.message}`);
    }
  }

  logger.info('[CacheWarmer] Done');
};
