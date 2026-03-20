import { tblOrderDetailsRepository } from '../repositories/index.js';
import { buildPagination } from '../utils/queryBuilder.js';

const tblOrderDetailsService = {
  /**
   * @param {Object} query - validated query params
   * @returns {Promise<{ data: Array, total: number, page: number, limit: number }>}
   */
  getAll: async (query) => {
    const { page, limit, ...filters } = query;
    const { limit: take, offset } = buildPagination(page, limit);

    const [data, total] = await Promise.all([
      tblOrderDetailsRepository.findByFilters({ ...filters, limit: take, offset }),
      tblOrderDetailsRepository.count(filters),
    ]);

    return { data, total, page: parseInt(page, 10), limit: take };
  },

  /**
   * @param {number} id
   * @returns {Promise<Object>}
   */
  getById: async (id) => {
    const record = await tblOrderDetailsRepository.findById(id);
    if (!record) {
      const err = new Error(`Order with id ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    return record;
  },

  /**
   * @param {string} orderNo
   * @returns {Promise<Object>}
   */
  getByOrderNo: async (orderNo) => {
    const record = await tblOrderDetailsRepository.findByOrderNo(orderNo);
    if (!record) {
      const err = new Error(`Order ${orderNo} not found`);
      err.statusCode = 404;
      throw err;
    }
    return record;
  },
};

export default tblOrderDetailsService;
