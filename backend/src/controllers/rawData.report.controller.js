import asyncHandler  from '../utils/asyncHandler.js';
import rawDataService from '../services/rawData.report.service.js';

/**
 * GET /api/v1/reports/raw-data
 * Query params: startDate, endDate, campaign, agent,
 *               onlyConnected, excludeShortCalls, excludeCallDrop,
 *               excludeFailedAssociation, excludeUnayurQueues, limit
 */
export const getRawDataReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, limit } = req.query;
  const result = await rawDataService.getRawData(req.query);
  return res.status(200).json({ success: true, startDate, endDate, limit: Number(limit), ...result });
});
