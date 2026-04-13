import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import asyncHandler from '../utils/asyncHandler.js';
import drishtiReportService from '../services/drishti.report.service.js';
import { getCachedReport } from '../utils/cache.js';
import { createJob, getJob } from '../jobs/jobStore.js';
import env from '../config/env.config.js';

const COLUMNS = [
  'Campaign',
  'Calls',
  'Orders',
  'Verified',
  'Verified Amount',
  'Verified Ticket Size',
  'Order Conversion',
  'Verified Conversion',
  'Verification %',
  'RPC (Revenue per Call)',
];

const formatReport = ({ campaignData }) => ({
  columns: COLUMNS,
  campaignReport: campaignData.map((r) => ({
    Campaign:                 r.campaign,
    Calls:                    r.calls,
    Orders:                   r.orders,
    Verified:                 r.verified,
    'Verified Amount':        r.verifiedAmount,
    'Verified Ticket Size':   r.verifiedTicketSize,
    'Order Conversion':       r.orderConversion,
    'Verified Conversion':    r.verifiedConversion,
    'Verification %':         r.verificationPct,
    'RPC (Revenue per Call)': r.rpc,
  })),
});

/**
 * GET /api/v1/reports/drishti?startDate=&endDate=
 *
 * - Range <= LARGE_RANGE_DAYS → responds synchronously (with Redis cache)
 * - Range >  LARGE_RANGE_DAYS → starts background job, returns jobId immediately
 */
export const getDrishtiReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const diffDays = dayjs(endDate).diff(dayjs(startDate), 'day');

  if (diffDays <= env.LARGE_RANGE_DAYS) {
    // ── Synchronous path ─────────────────────────────────────────────────
    const { campaignData } = await drishtiReportService.getReport({ startDate, endDate });
    return res.status(200).json({
      success: true, startDate, endDate, async: false,
      ...formatReport({ campaignData }),
    });
  }

  // ── Async path: large date range ─────────────────────────────────────
  // Check Redis cache first — a previous job may have already computed this range
  const cached = await getCachedReport(startDate, endDate);
  if (cached) {
    return res.status(200).json({
      success: true, startDate, endDate, async: false,
      ...formatReport(cached),
    });
  }

  const jobId = uuidv4();
  createJob(jobId, () => drishtiReportService.getReport({ startDate, endDate }));

  return res.status(202).json({
    success: true,
    async:   true,
    jobId,
    message: `Date range is ${diffDays} days. Processing in background. Poll /jobs/${jobId} for result.`,
  });
});

/**
 * GET /api/v1/reports/drishti/jobs/:jobId
 */
export const getJobStatus = asyncHandler(async (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found or already expired.' });
  }

  if (job.status === 'completed') {
    return res.status(200).json({
      success: true,
      status:  'completed',
      ...formatReport({ campaignData: job.result.campaignData }),
    });
  }

  if (job.status === 'failed') {
    return res.status(500).json({
      success: false,
      status:  'failed',
      message: job.error,
    });
  }

  return res.status(200).json({
    success: true,
    status:  'active',
    message: 'Report is still being processed. Try again in a few seconds.',
  });
});
