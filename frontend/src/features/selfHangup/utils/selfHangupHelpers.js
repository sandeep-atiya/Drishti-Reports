import * as XLSX from 'xlsx';

export const formatNumber = (val) => {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return '-';
  return n.toLocaleString('en-IN');
};

/**
 * Compute totals row for the table footer.
 * Numeric columns are summed; Self Hangup % is re-derived from the totals.
 */
export const computeSelfHangupTotals = (rows) => {
  if (!rows?.length) return null;

  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);

  const ahPhone  = sum('AGENT_HANGUP_PHONE');
  const ahUi     = sum('AGENT_HANGUP_UI');
  const chPhone  = sum('CUSTOMER_HANGUP_PHONE');
  const sHangup  = sum('SYSTEM_HANGUP');
  const sMedia   = sum('SYSTEM_MEDIA');
  const sRec     = sum('SYSTEM_RECORDING');
  const grand    = ahPhone + ahUi + chPhone + sHangup + sMedia + sRec;
  const self     = ahPhone + ahUi;
  const selfPct  = grand > 0 ? `${((self / grand) * 100).toFixed(1)}%` : '0.0%';

  return {
    "Agent's Name":       'TOTAL',
    AGENT_HANGUP_PHONE:   ahPhone,
    AGENT_HANGUP_UI:      ahUi,
    CUSTOMER_HANGUP_PHONE: chPhone,
    SYSTEM_HANGUP:        sHangup,
    SYSTEM_MEDIA:         sMedia,
    SYSTEM_RECORDING:     sRec,
    'Grand Total':         grand,
    'Total Self Hangup':   self,
    'Self Hangup %':       selfPct,
  };
};

export const exportSelfHangupToExcel = ({ columns, rows, startDate, endDate, campaignName }) => {
  const wb = XLSX.utils.book_new();

  const header = columns;
  const body   = (rows || []).map((r) => columns.map((c) => r[c] ?? ''));
  const ws     = XLSX.utils.aoa_to_sheet([header, ...body]);

  // Auto-width
  const colWidths = columns.map((col) => {
    const maxLen = Math.max(
      col.length,
      ...(rows || []).map((r) => String(r[col] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 35) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Self Hangup');
  const suffix = campaignName ? `_${campaignName}` : '';
  XLSX.writeFile(wb, `Self_Hangup${suffix}_${startDate}_to_${endDate}.xlsx`);
};
