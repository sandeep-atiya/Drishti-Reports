import rawDataRepository from '../repositories/report/rawData.report.repository.js';
import logger from '../utils/logger.js';

const rawDataService = {
  getRawData: async (params) => {
    const t0   = Date.now();
    const rows = await rawDataRepository.getRawData(params);
    logger.info(`[RawData] rows:${rows.length} limit:${params.limit} (${Date.now() - t0}ms)`);
    return { rows, count: rows.length };
  },
};

export default rawDataService;
