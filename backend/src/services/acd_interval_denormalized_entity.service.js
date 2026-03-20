import { acdIntervalRepository } from '../repositories/index.js';
import { buildPagination } from '../utils/queryBuilder.js';

const acdIntervalService = {
  /**
   * @param {Object} query - validated query params
   * @returns {Promise<{ data: Array, total: number, page: number, limit: number }>}
   */
  getAll: async (query) => {
    const { page, limit, ...filters } = query;
    const { limit: take, offset } = buildPagination(page, limit);

    const [data, total] = await Promise.all([
      acdIntervalRepository.findByFilters({ ...filters, limit: take, offset }),
      acdIntervalRepository.count(filters),
    ]);

    return { data, total, page: parseInt(page, 10), limit: take };
  },

  /**
   * @param {string} callId
   * @returns {Promise<Object>}
   */
  getByCallId: async (callId) => {
    const record = await acdIntervalRepository.findByCallId(callId);
    if (!record) {
      const err = new Error(`Call record ${callId} not found`);
      err.statusCode = 404;
      throw err;
    }
    return record;
  },
};

export default acdIntervalService;
