import * as XLSX from 'xlsx';

export const formatNumber = (val) => {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return '-';
  return n.toLocaleString('en-IN');
};

export const computeTransferUniqueCallsTotals = (rows) => {
  if (!rows?.length) return null;
  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const pct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0.0%');
  const avg = (n, d) => (d > 0 ? Math.round(n / d) : 0);

  const pCount    = sum('P Count');
  const calls     = sum('Calls');
  const transfers = sum('Transfer');
  const orders    = sum('Orders');

  return {
    'Process':            'Grand Total',
    'P Count':            pCount,
    'Calls':              calls,
    'Transfer':           transfers,
    'Orders':             orders,
    'Transfer Con':       pct(transfers, calls),
    'Transfer Order Con': pct(orders, transfers),
    'Call Order Con':     pct(orders, calls),
    'AVG. Calls':         avg(calls, pCount),
    'AVG. Transfer':      avg(transfers, pCount),
    'AVG. Orders':        avg(orders, pCount),
  };
};

export const exportTransferUniqueCallsToExcel = ({ columns, campaignReport, startDate, endDate }) => {
  const wb = XLSX.utils.book_new();

  const header = columns;
  const body   = (campaignReport || []).map((r) => columns.map((c) => r[c] ?? ''));
  const ws     = XLSX.utils.aoa_to_sheet([header, ...body]);

  // Auto-width columns
  const colWidths = columns.map((col) => {
    const maxLen = Math.max(
      col.length,
      ...(campaignReport || []).map((r) => String(r[col] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 30) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Transfer Conv Unique Calls');
  XLSX.writeFile(wb, `Transfer_Conversion_Unique_Calls_${startDate}_to_${endDate}.xlsx`);
};
