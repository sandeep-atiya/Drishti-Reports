import asyncHandler from '../utils/asyncHandler.js';
import drishtiReportService from '../services/drishti.report.service.js';

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

export const getDrishtiReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const { campaignData, agentData } = await drishtiReportService.getReport({ startDate, endDate });

  res.status(200).json({
    success:   true,
    startDate,
    endDate,
    columns:   COLUMNS,
    campaignReport: campaignData.map((r) => ({
      Campaign:              r.campaign,
      Calls:                 r.calls,
      Orders:                r.orders,
      Verified:              r.verified,
      'Verified Amount':     r.verifiedAmount,
      'Verified Ticket Size':r.verifiedTicketSize,
      'Order Conversion':    r.orderConversion,
      'Verified Conversion': r.verifiedConversion,
      'Verification %':      r.verificationPct,
      'RPC (Revenue per Call)': r.rpc,
    })),
    agentReport: agentData.map((r) => ({
      Campaign:              r.agent,
      Calls:                 r.calls,
      Orders:                r.orders,
      Verified:              r.verified,
      'Verified Amount':     r.verifiedAmount,
      'Verified Ticket Size':r.verifiedTicketSize,
      'Order Conversion':    r.orderConversion,
      'Verified Conversion': r.verifiedConversion,
      'Verification %':      r.verificationPct,
      'RPC (Revenue per Call)': r.rpc,
    })),
  });
});
