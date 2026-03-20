import { Op } from 'sequelize';
import TblOrderDetails from '../../models/mssql/tblOrderDetails.model.js';

const buildWhere = ({ campaignId, status, callType, dispatchStatus, downloadStatus, startDate, endDate } = {}) => {
  const where = {};

  if (campaignId !== undefined && campaignId !== null) where.campaign_Id = campaignId;
  if (status !== undefined && status !== null)         where.status = status;
  if (callType !== undefined && callType !== null)     where.callType = callType;
  if (dispatchStatus)                                  where.DispatchStatus = dispatchStatus;
  if (downloadStatus)                                  where.DownloadStatus = downloadStatus;

  if (startDate || endDate) {
    where.OrderDate = {};
    if (startDate) where.OrderDate[Op.gte] = startDate;
    if (endDate)   where.OrderDate[Op.lte] = endDate;
  }

  return where;
};

const tblOrderDetailsRepository = {
  /**
   * @param {{ limit?: number, offset?: number }} options
   * @returns {Promise<TblOrderDetails[]>}
   */
  findAll: ({ limit = 50, offset = 0 } = {}) =>
    TblOrderDetails.findAll({ order: [['id', 'DESC']], limit, offset }),

  /**
   * @param {number} id
   * @returns {Promise<TblOrderDetails|null>}
   */
  findById: (id) => TblOrderDetails.findByPk(id),

  /**
   * @param {string} orderNo
   * @returns {Promise<TblOrderDetails|null>}
   */
  findByOrderNo: (orderNo) => TblOrderDetails.findOne({ where: { OrderNo: orderNo } }),

  /**
   * @param {Object} filters
   * @returns {Promise<TblOrderDetails[]>}
   */
  findByFilters: ({ limit = 50, offset = 0, ...filters } = {}) =>
    TblOrderDetails.findAll({
      where: buildWhere(filters),
      order: [['id', 'DESC']],
      limit,
      offset,
    }),

  /**
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  count: (filters) => TblOrderDetails.count({ where: buildWhere(filters) }),
};

export default tblOrderDetailsRepository;
