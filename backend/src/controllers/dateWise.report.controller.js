import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import asyncHandler from '../utils/asyncHandler.js';
import dateWiseReportService from '../services/dateWise.report.service.js';
import { createJob, getJob } from '../jobs/jobStore.js';
import env from '../config/env.config.js';

const COLUMNS = [
  'Date',
  'Agents',
  'Calls',
  'Orders',
  'Verified',
  'Verified Amount',
  'Verified Ticket Size',
  'Order Con',
  'Verified Con',
  'Verification %',
  'RPC',
];

const formatReport = (rows) => ({ columns: COLUMNS, rows });

/**
 * GET /api/v1/reports/datewise
 * Query params: startDate, endDate
 *
 * - Range <= LARGE_RANGE_DAYS → synchronous response
 * - Range >  LARGE_RANGE_DAYS → async background job
 */
export const getDateWiseReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const diffDays = dayjs(endDate).diff(dayjs(startDate), 'day');

  if (diffDays <= env.LARGE_RANGE_DAYS) {
    const rows = await dateWiseReportService.getReport({ startDate, endDate });
    return res.status(200).json({
      success: true,
      async: false,
      startDate,
      endDate,
      ...formatReport(rows),
    });
  }

  // Large range → spin up a background job
  const jobId = uuidv4();
  createJob(jobId, () =>
    dateWiseReportService.getReport({ startDate, endDate })
  );

  return res.status(202).json({
    success: true,
    async: true,
    jobId,
    message: `Date range is ${diffDays} days. Processing in background. Poll /jobs/${jobId} for result.`,
  });
});

/**
 * GET /api/v1/reports/datewise/jobs/:jobId
 */
export const getDateWiseJobStatus = asyncHandler(async (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found or already expired.' });
  }

  if (job.status === 'completed') {
    return res.status(200).json({
      success: true,
      status: 'completed',
      ...formatReport(job.result),
    });
  }

  if (job.status === 'failed') {
    return res.status(500).json({
      success: false,
      status: 'failed',
      message: job.error,
    });
  }

  return res.status(200).json({
    success: true,
    status: 'active',
    message: 'Report is still being processed. Try again in a few seconds.',
  });
});
