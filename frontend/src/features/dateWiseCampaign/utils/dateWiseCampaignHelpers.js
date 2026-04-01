import * as XLSX from 'xlsx';

export const formatNumber = (val) => {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return '-';
  return n.toLocaleString('en-IN');
};

export const formatCurrency = (val) => {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return '-';
  return `₹${n.toLocaleString('en-IN')}`;
};

const pct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0.0%');

export const computeDateWiseCampaignTotals = (rows) => {
  if (!rows?.length) return null;

  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);

  const calls          = sum('Calls');
  const orders         = sum('Orders');
  const verified       = sum('Verified');
  const verifiedAmount = sum('Verified Amount');

  const verifiedTicketSize = verified > 0 ? Math.round(verifiedAmount / verified) : 0;
  const orderCon           = pct(orders,   calls);
  const verifiedCon        = pct(verified, calls);
  const verificationPct    = pct(verified, orders);
  const rpc                = calls > 0 ? (verifiedAmount / calls).toFixed(2) : '0.00';

  return {
    'Date':                 'TOTAL',
    'Campaign':             '',
    'Calls':                calls,
    'Orders':               orders,
    'Verified':             verified,
    'Verified Amount':      verifiedAmount,
    'Verified Ticket Size': verifiedTicketSize,
    'Order Con':            orderCon,
    'Verified Con':         verifiedCon,
    'Verification %':       verificationPct,
    'RPC':                  rpc,
  };
};

export const exportDateWiseCampaignToExcel = ({ columns, rows, startDate, endDate }) => {
  const wb = XLSX.utils.book_new();

  const sorted = [...(rows || [])].sort((a, b) => {
    const cmpCampaign = (a['Campaign'] || '').localeCompare(b['Campaign'] || '');
    if (cmpCampaign !== 0) return cmpCampaign;
    return (a['Date'] || '').localeCompare(b['Date'] || '');
  });

  const header = columns;
  const body   = sorted.map((r) => columns.map((c) => r[c] ?? ''));
  const ws     = XLSX.utils.aoa_to_sheet([header, ...body]);

  const colWidths = columns.map((col) => {
    const maxLen = Math.max(
      col.length,
      ...(sorted).map((r) => String(r[col] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Date Wise Campaign Report');
  XLSX.writeFile(wb, `Date_Wise_Campaign_Report_${startDate}_to_${endDate}.xlsx`);
};
