import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import asyncHandler from '../utils/asyncHandler.js';
import transferReportService from '../services/transfer.report.service.js';
import { createJob, getJob } from '../jobs/jobStore.js';

const COLUMNS = [
  'Campaign',
  'Calls',
  'Transfer To Sales',
  'Orders',
  'Transfer Con',
  'Transfer Order Con',
  'Calls Order Con',
];

const formatReport = ({ campaignData }) => ({
  columns:        COLUMNS,
  campaignReport: campaignData.map((r) => ({
    Campaign:             r.campaign,
    Calls:                r.calls,
    'Transfer To Sales':  r.transferToSales,
    Orders:               r.orders,
    'Transfer Con':       r.transferCon,
    'Transfer Order Con': r.transferOrderCon,
    'Calls Order Con':    r.callsOrderCon,
  })),
});

/**
 * GET /api/v1/reports/transfer?startDate=&endDate=
 *
 * startDate / endDate accept:
 *   • YYYY-MM-DD         (date range — endDate is exclusive, i.e., next day)
 *   • YYYY-MM-DDTHH:mm   (datetime range — for hourly reports)
 *
 * Always processes as a background job to prevent frontend timeout.
 * The PG query runs on raw archival data (up to 1cr records/day) and can
 * take 10–60 s even for a single day, so async + polling is always safer.
 */
export const getTransferReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const diffDays = dayjs(endDate).diff(dayjs(startDate), 'day');

  const jobId = uuidv4();

  // Wrap service call so the stored result already includes formatted data
  // + startDate/endDate needed by the frontend to display the date range header.
  createJob(jobId, async () => {
    const report = await transferReportService.getReport({ startDate, endDate });
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
 * GET /api/v1/reports/transfer/jobs/:jobId
 */
export const getTransferJobStatus = asyncHandler(async (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found or already expired.' });
  }

  if (job.status === 'completed') {
    return res.status(200).json({
      success: true,
      status:  'completed',
      ...job.result,   // already formatted + includes startDate / endDate
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
