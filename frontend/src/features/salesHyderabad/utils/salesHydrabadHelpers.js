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

/**
 * Compute aggregate totals for a set of agent rows.
 * Percentage columns are recomputed from raw sums so the footer is accurate.
 */
export const computeSalesHydrabadTotals = (rows, includesCampaign = false) => {
  if (!rows?.length) return null;
  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);

  const calls          = sum('Calls');
  const orders         = sum('Orders');
  const verified       = sum('Verified');
  const verifiedAmount = sum('Verified Amount');

  const verifiedTicketSize = verified > 0 ? Math.round(verifiedAmount / verified) : 0;
  const orderConversion    = pct(orders,   calls);
  const verifiedConversion = pct(verified, calls);
  const verificationPct    = pct(verified, orders);
  const rpc                = calls > 0 ? Number((verifiedAmount / calls).toFixed(2)) : 0;

  const base = {
    "Agent's Name":         'TOTAL',
    'Calls':                calls,
    'Orders':               orders,
    'Verified':             verified,
    'Verified Amount':      verifiedAmount,
    'Verified Ticket Size': verifiedTicketSize,
    'Order Conversion':     orderConversion,
    'Verified Conversion':  verifiedConversion,
    'Verification %':       verificationPct,
    'RPC':                  rpc,
  };

  if (includesCampaign) {
    return { "Agent's Name": 'TOTAL', 'Campaign': '', ...base };
  }
  return base;
};

/**
 * Export Sales Hyderabad report as a 5-sheet Excel workbook.
 */
export const exportSalesHydrabadToExcel = ({
  columns,
  columnsOverall,
  overall,
  unayur_in,
  inbound_2,
  digital_inbound,
  group_a,
  startDate,
  endDate,
}) => {
  const wb = XLSX.utils.book_new();

  const makeSheet = (rows, cols, withTotals = true, includesCampaign = false) => {
    const sorted = [...(rows || [])].sort((a, b) => {
      if (includesCampaign) {
        const cmp = (a['Campaign'] || '').localeCompare(b['Campaign'] || '');
        if (cmp !== 0) return cmp;
      }
      return (a["Agent's Name"] || '').localeCompare(b["Agent's Name"] || '');
    });

    const body = sorted.map((r) => cols.map((c) => r[c] ?? ''));
    const data  = [cols, ...body];

    if (withTotals && sorted.length) {
      const totals = computeSalesHydrabadTotals(sorted, includesCampaign);
      if (totals) data.push(cols.map((c) => totals[c] ?? ''));
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const colWidths = cols.map((col) => {
      const maxLen = Math.max(col.length, ...sorted.map((r) => String(r[col] ?? '').length));
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;
    return ws;
  };

  XLSX.utils.book_append_sheet(wb, makeSheet(overall,         columnsOverall, true, true),  'Overall');
  XLSX.utils.book_append_sheet(wb, makeSheet(unayur_in,       columns,        true, false), 'Unayur_IN');
  XLSX.utils.book_append_sheet(wb, makeSheet(inbound_2,       columns,        true, false), 'Inbound_2');
  XLSX.utils.book_append_sheet(wb, makeSheet(digital_inbound, columns,        true, false), 'Digital Inbound');
  XLSX.utils.book_append_sheet(wb, makeSheet(group_a,         columns,        true, false), 'Group A');

  XLSX.writeFile(wb, `Sales_Hyderabad_${startDate}_to_${endDate}.xlsx`);
};
