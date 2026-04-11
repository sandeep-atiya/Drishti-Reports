import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import asyncHandler from '../utils/asyncHandler.js';
import transferUniqueCallsReportService from '../services/transfer.unique.calls.report.service.js';
import { createJob, getJob } from '../jobs/jobStore.js';

const COLUMNS = [
  'Process',
  'P Count',
  'Calls',
  'Transfer',
  'Orders',
  'Transfer Con',
  'Transfer Order Con',
  'Call Order Con',
  'AVG. Calls',
  'AVG. Transfer',
  'AVG. Orders',
];

const formatReport = ({ campaignData }) => ({
  columns:        COLUMNS,
  campaignReport: campaignData.map((r) => ({
    'Process':              r.process,
    'P Count':              r.pCount,
    'Calls':                r.calls,
    'Transfer':             r.transferToSales,
    'Orders':               r.orders,
    'Transfer Con':         r.transferCon,
    'Transfer Order Con':   r.transferOrderCon,
    'Call Order Con':       r.callsOrderCon,
    'AVG. Calls':           r.avgCalls,
    'AVG. Transfer':        r.avgTransfer,
    'AVG. Orders':          r.avgOrders,
  })),
});

/**
 * GET /api/v1/reports/transfer-unique-calls?startDate=&endDate=
 */
export const getTransferUniqueCallsReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const diffDays = dayjs(endDate).diff(dayjs(startDate), 'day');

  const jobId = uuidv4();

  createJob(jobId, async () => {
    const report = await transferUniqueCallsReportService.getReport({ startDate, endDate });
    return { ...formatReport(report), startDate, endDate };
  });

  return res.status(202).json({
    success: true,
    async:   true,
    jobId,
    message: `Processing ${diffDays}-day range in background. Poll /jobs/${jobId}.`,
  });
});

/**
 * GET /api/v1/reports/transfer-unique-calls/jobs/:jobId
 */
export const getTransferUniqueCallsJobStatus = asyncHandler(async (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found or already expired.' });
  }

  if (job.status === 'completed') {
    return res.status(200).json({
      success: true,
      status:  'completed',
      ...job.result,
    });
  }

  if (job.status === 'failed') {
    return res.status(500).json({ success: false, status: 'failed', message: job.error });
  }

  return res.status(200).json({
    success: true,
    status:  'active',
    message: 'Report is still being processed. Try again in a few seconds.',
  });
});
