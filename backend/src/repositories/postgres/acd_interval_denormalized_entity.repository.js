import { Op } from 'sequelize';
import AcdIntervalDenormalizedEntity from '../../models/postgres/acd_interval_denormalized_entity.model.js';

const buildWhere = ({ setupId, campaignId, userId, callType, isOutbound, startDate, endDate } = {}) => {
  const where = {};

  if (setupId)                                           where.setup_id = setupId;
  if (campaignId !== undefined && campaignId !== null)   where.ch_campaign_id = campaignId;
  if (userId)                                            where.udh_user_id = userId;
  if (callType)                                          where.ch_call_type = callType;
  if (isOutbound !== undefined && isOutbound !== null)   where.ch_is_outbound = isOutbound;

  if (startDate || endDate) {
    where.ch_date_added = {};
    if (startDate) where.ch_date_added[Op.gte] = startDate;
    if (endDate)   where.ch_date_added[Op.lte] = endDate;
  }

  return where;
};

const acdIntervalRepository = {
  /**
   * @param {{ limit?: number, offset?: number }} options
   * @returns {Promise<AcdIntervalDenormalizedEntity[]>}
   */
  findAll: ({ limit = 50, offset = 0 } = {}) =>
    AcdIntervalDenormalizedEntity.findAll({
      order: [['ch_date_added', 'DESC']],
      limit,
      offset,
    }),

  /**
   * @param {Object} filters
   * @returns {Promise<AcdIntervalDenormalizedEntity[]>}
   */
  findByFilters: ({ limit = 50, offset = 0, ...filters } = {}) =>
    AcdIntervalDenormalizedEntity.findAll({
      where: buildWhere(filters),
      order: [['ch_date_added', 'DESC']],
      limit,
      offset,
    }),

  /**
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  count: (filters) =>
    AcdIntervalDenormalizedEntity.count({ where: buildWhere(filters) }),

  /**
   * @param {string} callId
   * @returns {Promise<AcdIntervalDenormalizedEntity|null>}
   */
  findByCallId: (callId) =>
    AcdIntervalDenormalizedEntity.findOne({ where: { ch_call_id: callId } }),

  /**
   * @param {string|number} archiveId
   * @returns {Promise<AcdIntervalDenormalizedEntity|null>}
   */
  findByArchiveId: (archiveId) =>
    AcdIntervalDenormalizedEntity.findOne({ where: { ch_archive_id: archiveId } }),
};

export default acdIntervalRepository;
