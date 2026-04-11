import * as XLSX from 'xlsx';

export const formatNumber = (val) => {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return '-';
  return n.toLocaleString('en-IN');
};

export const computeTransferAgentWiseTotals = (rows) => {
  if (!rows?.length) return null;

  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const pct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0.0%');

  const calls     = sum('Calls');
  const transfers = sum('Transfer');
  const orders    = sum('Orders');

  return {
    'Date':               'Grand Total',
    'Campaign':           '',
    'Agent':              '',
    'Calls':              calls,
    'Transfer':           transfers,
    'Orders':             orders,
    'Transfer Con':       pct(transfers, calls),
    'Transfer Order Con': pct(orders, transfers),
    'Call Order Con':     pct(orders, calls),
  };
};

export const exportTransferAgentWiseToExcel = ({ columns, agentReport, startDate, endDate }) => {
  const wb = XLSX.utils.book_new();

  const header = columns;
  const body   = (agentReport || []).map((r) => columns.map((c) => r[c] ?? ''));
  const ws     = XLSX.utils.aoa_to_sheet([header, ...body]);

  // Auto-width columns
  const colWidths = columns.map((col) => {
    const maxLen = Math.max(
      col.length,
      ...(agentReport || []).map((r) => String(r[col] ?? '').length),
    );
    return { wch: Math.min(maxLen + 2, 35) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Agent Wise Transfer Conv');
  XLSX.writeFile(wb, `Agent_Wise_Transfer_Conversion_${startDate}_to_${endDate}.xlsx`);
};
