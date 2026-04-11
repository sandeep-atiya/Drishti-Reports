import * as XLSX from 'xlsx';

export const formatCurrency = (val) => {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return '-';
  return '₹' + n.toLocaleString('en-IN');
};

export const formatNumber = (val) => {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return '-';
  return n.toLocaleString('en-IN');
};

export const computeTotals = (rows) => {
  if (!rows || rows.length === 0) return null;
  const sum = (key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  const pct  = (n, d) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '0%');

  const calls          = sum('Calls');
  const orders         = sum('Orders');
  const verified       = sum('Verified');
  const verifiedAmount = sum('Verified Amount');

  return {
    Campaign:                  'TOTAL',
    Calls:                     calls,
    Orders:                    orders,
    Verified:                  verified,
    'Verified Amount':         verifiedAmount,
    'Verified Ticket Size':    verified > 0 ? Math.round(verifiedAmount / verified) : 0,
    'Order Conversion':        pct(orders, calls),
    'Verified Conversion':     pct(verified, calls),
    'Verification %':          pct(verified, orders),
    'RPC (Revenue per Call)':  calls > 0 ? Math.round(verifiedAmount / calls) : 0,
  };
};

export const exportToExcel = ({ columns, campaignReport, startDate, endDate }) => {
  const wb = XLSX.utils.book_new();

  const toSheet = (rows) => {
    const header = columns;
    const body   = (rows || []).map((r) => columns.map((c) => r[c] ?? ''));
    return XLSX.utils.aoa_to_sheet([header, ...body]);
  };

  XLSX.utils.book_append_sheet(wb, toSheet(campaignReport), 'Campaign Report');

  XLSX.writeFile(wb, `Drishti_Report_${startDate}_to_${endDate}.xlsx`);
};
