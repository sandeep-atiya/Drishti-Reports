import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import asyncHandler from '../utils/asyncHandler.js';
import selfHangupReportService from '../services/selfHangup.report.service.js';
import { createJob, getJob } from '../jobs/jobStore.js';
import env from '../config/env.config.js';

const COLUMNS = [
  "Agent's Name",
  'AGENT_HANGUP_PHONE',
  'AGENT_HANGUP_UI',
  'CUSTOMER_HANGUP_PHONE',
  'SYSTEM_HANGUP',
  'SYSTEM_MEDIA',
  'SYSTEM_RECORDING',
  'Grand Total',
  'Total Self Hangup',
  'Self Hangup %',
];

const formatReport = (rows) => ({ columns: COLUMNS, rows });

/**
 * GET /api/v1/reports/selfhangup
 * Query params: startDate, endDate, campaignName (optional)
 *
 * - Range <= LARGE_RANGE_DAYS → synchronous
 * - Range >  LARGE_RANGE_DAYS → async job
 */
export const getSelfHangupReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, campaignName } = req.query;
  const diffDays = dayjs(endDate).diff(dayjs(startDate), 'day');

  if (diffDays <= env.LARGE_RANGE_DAYS) {
    const rows = await selfHangupReportService.getReport({ startDate, endDate, campaignName });
    return res.status(200).json({
      success: true,
      async: false,
      startDate,
      endDate,
      campaignName: campaignName || null,
      ...formatReport(rows),
    });
  }

  // Large range → async job
  const jobId = uuidv4();
  createJob(jobId, () =>
    selfHangupReportService.getReport({ startDate, endDate, campaignName })
  );

  return res.status(202).json({
    success: true,
    async: true,
    jobId,
    message: `Date range is ${diffDays} days. Processing in background. Poll /jobs/${jobId} for result.`,
  });
});

/**
 * GET /api/v1/reports/selfhangup/jobs/:jobId
 */
export const getSelfHangupJobStatus = asyncHandler(async (req, res) => {
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

/**
 * GET /api/v1/reports/selfhangup/campaigns
 * Returns list of distinct campaign names for the filter dropdown.
 */
export const getSelfHangupCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await selfHangupReportService.getCampaigns();
  return res.status(200).json({ success: true, campaigns });
});
