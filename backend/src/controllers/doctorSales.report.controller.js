import { v4 as uuidv4 } from 'uuid';
import dayjs            from 'dayjs';
import asyncHandler     from '../utils/asyncHandler.js';
import doctorSalesService from '../services/doctorSales.report.service.js';
import { getCachedReport } from '../utils/cache.js';
import { createJob, getJob } from '../jobs/jobStore.js';
import env              from '../config/env.config.js';

// Columns for individual campaign sheets (no Campaign column)
const SHEET_COLUMNS = [
  "Doctor's Name",
  'Calls',
  'Orders',
  'Verified',
  'Verified Amount',
  'Verified Ticket Size',
  'Order Conversion',
  'Verified Conversion',
  'Verification %',
  'RPC',
];

// Columns for the Overall sheet (Campaign column added)
const OVERALL_COLUMNS = [
  "Doctor's Name",
  'Campaign',
  'Calls',
  'Orders',
  'Verified',
  'Verified Amount',
  'Verified Ticket Size',
  'Order Conversion',
  'Verified Conversion',
  'Verification %',
  'RPC',
];

const formatResponse = (sheets, startDate, endDate) => ({
  columns:        SHEET_COLUMNS,
  columnsOverall: OVERALL_COLUMNS,
  startDate,
  endDate,
  overall:         sheets.overall,
  unayur_in:       sheets.unayur_in,
  inbound_2:       sheets.inbound_2,
  digital_inbound: sheets.digital_inbound,
  group_a:         sheets.group_a,
});

/**
 * GET /api/v1/reports/doctor-sales
 * Query params: startDate, endDate
 *
 * - Range <= LARGE_RANGE_DAYS → responds synchronously (with Redis cache)
 * - Range >  LARGE_RANGE_DAYS → starts background job, returns jobId immediately
 */
export const getDoctorSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const diffDays = dayjs(endDate).diff(dayjs(startDate), 'day');

  if (diffDays <= env.LARGE_RANGE_DAYS) {
    // ── Synchronous path ─────────────────────────────────────────────────
    const sheets = await doctorSalesService.getReport({ startDate, endDate });
    return res.status(200).json({
      success: true,
      async:   false,
      ...formatResponse(sheets, startDate, endDate),
    });
  }

  // ── Async path: large date range ─────────────────────────────────────
  // Check Redis cache first — a previous job may have already computed this range
  const cached = await getCachedReport(startDate, endDate);
  if (cached) {
    return res.status(200).json({
      success: true,
      async:   false,
      ...formatResponse(cached, startDate, endDate),
    });
  }

  const jobId = uuidv4();
  createJob(jobId, () => doctorSalesService.getReport({ startDate, endDate }));

  return res.status(202).json({
    success: true,
    async:   true,
    jobId,
    message: `Date range is ${diffDays} days. Processing in background. Poll /jobs/${jobId} for result.`,
  });
});

/**
 * GET /api/v1/reports/doctor-sales/jobs/:jobId
 */
export const getDoctorSalesJobStatus = asyncHandler(async (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found or already expired.' });
  }

  if (job.status === 'completed') {
    return res.status(200).json({
      success: true,
      status:  'completed',
      ...formatResponse(job.result, job.startDate, job.endDate),
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
