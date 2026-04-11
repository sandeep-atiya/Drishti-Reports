/**
 * Doctor Sales Report Constants
 */

export const PRESET_RANGES = {
  THIS_MONTH: 'thisMonth',
  LAST_MONTH: 'lastMonth',
  LAST_3_MONTHS: 'last3Months',
  LAST_6_MONTHS: 'last6Months',
  THIS_YEAR: 'thisYear',
  CUSTOM: 'custom',
};

export const SHEETS = {
  OVERALL: 'overall',
  UNAYUR_IN: 'unayur_in',
  INBOUND_2: 'inbound_2',
  DIGITAL_INBOUND: 'digital_inbound',
  GROUP_A: 'group_a',
};

export const COLUMNS = {
  DOCTOR_NAME: "Doctor's Name",
  CAMPAIGN: 'Campaign',
  CALLS: 'Calls',
  ORDERS: 'Orders',
  VERIFIED: 'Verified',
  VERIFIED_AMOUNT: 'Verified Amount',
  VERIFIED_TICKET_SIZE: 'Verified Ticket Size',
  ORDER_CONVERSION: 'Order Conversion',
  VERIFIED_CONVERSION: 'Verified Conversion',
  VERIFICATION_PERCENT: 'Verification %',
  RPC: 'RPC',
};

export const ITEMS_PER_PAGE = 20;
export const JOB_POLL_INTERVAL = 5000; // 5 seconds
export const JOB_POLL_MAX_ATTEMPTS = 60; // 5 minutes
