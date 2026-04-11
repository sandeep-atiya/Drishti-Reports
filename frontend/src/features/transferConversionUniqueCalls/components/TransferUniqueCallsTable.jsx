import { useState, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatNumber, computeTransferUniqueCallsTotals } from '../utils/transferUniqueCallsHelpers';

const COLS = [
  { key: 'Process',             label: 'Process',             align: 'left',   minW: 180, type: 'name'   },
  { key: 'P Count',             label: 'P Count',             align: 'right',  minW: 90,  type: 'number' },
  { key: 'Calls',               label: 'Calls',               align: 'right',  minW: 90,  type: 'number' },
  { key: 'Transfer',            label: 'Transfer',            align: 'right',  minW: 100, type: 'number' },
  { key: 'Orders',              label: 'Orders',              align: 'right',  minW: 90,  type: 'number' },
  { key: 'Transfer Con',        label: 'Transfer Con',        align: 'center', minW: 118, type: 'pct'    },
  { key: 'Transfer Order Con',  label: 'Transfer Order Con',  align: 'center', minW: 148, type: 'pct'    },
  { key: 'Call Order Con',      label: 'Call Order Con',      align: 'center', minW: 128, type: 'pct'    },
  { key: 'AVG. Calls',          label: 'AVG. Calls',          align: 'right',  minW: 100, type: 'number' },
  { key: 'AVG. Transfer',       label: 'AVG. Transfer',       align: 'right',  minW: 110, type: 'number' },
  { key: 'AVG. Orders',         label: 'AVG. Orders',         align: 'right',  minW: 105, type: 'number' },
];

const PAGE_SIZES = [10, 25, 50, 100];

const fmtCell = (type, val) => {
  if (type === 'number') return formatNumber(val);
  return val ?? '—';
};

const ac = (col) =>
  col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right';

/* ── Pagination ─────────────────────────────────────────────────────────── */
const PgBtn = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick} disabled={disabled}
    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
  >
    {children}
  </button>
);

const Pagination = ({ page, pageSize, total, onPage, onPageSize }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from       = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to         = Math.min(page * pageSize, total);

  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4)       return [1, 2, 3, 4, 5, '…', totalPages];
    if (page >= totalPages - 3) return [1, '…', totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [1, '…', page-1, page, page+1, '…', totalPages];
  }, [page, totalPages]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-white">
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{from}–{to}</span> of{' '}
          <span className="font-semibold text-slate-700">{total}</span>
        </span>
        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
            className="appearance-none pl-2.5 pr-6 py-1 text-xs border border-slate-200 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <PgBtn onClick={() => onPage(1)}          disabled={page === 1}><ChevronsLeft  size={12} /></PgBtn>
        <PgBtn onClick={() => onPage(page - 1)}   disabled={page === 1}><ChevronLeft   size={12} /></PgBtn>
        {pages.map((p, i) => p === '…'
          ? <span key={`e${i}`} className="w-7 text-center text-slate-400 text-xs">…</span>
          : <button key={p} onClick={() => onPage(p)}
              className={`w-7 h-7 text-xs font-semibold transition-all ${
                p === page ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >{p}</button>
        )}
        <PgBtn onClick={() => onPage(page + 1)}   disabled={page === totalPages}><ChevronRight  size={12} /></PgBtn>
        <PgBtn onClick={() => onPage(totalPages)} disabled={page === totalPages}><ChevronsRight size={12} /></PgBtn>
      </div>
    </div>
  );
};

/* ── TransferUniqueCallsTable ───────────────────────────────────────────── */
const TransferUniqueCallsTable = ({ rows = [] }) => {
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [prevRows, setPrevRows] = useState(rows);

  if (prevRows !== rows) { setPrevRows(rows); setPage(1); }

  const totals   = useMemo(() => computeTransferUniqueCallsTotals(rows), [rows]);
  const maxPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <div className="w-12 h-12 bg-slate-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-600">No records found</p>
          <p className="text-xs text-slate-400 mt-0.5">Try a different date or time range</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-slate-200">
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm border-collapse"
          style={{ minWidth: COLS.reduce((s, c) => s + c.minW, 0) }}
        >
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800">
              {COLS.map((col) => (
                <th
                  key={col.key}
                  style={{ minWidth: col.minW }}
                  className={`px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-700 whitespace-nowrap ${ac(col)}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row, i) => (
              <tr key={i} className={`transition-colors hover:bg-violet-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                {COLS.map((col) => (
                  <td
                    key={col.key}
                    style={{ minWidth: col.minW }}
                    className={`px-4 py-3.5 whitespace-nowrap ${ac(col)} ${
                      col.type === 'name'   ? 'font-semibold text-slate-800 text-sm' :
                      col.type === 'pct'    ? 'font-semibold text-violet-600 text-sm tabular-nums' :
                      'text-slate-600 text-sm tabular-nums'
                    }`}
                  >
                    {fmtCell(col.type, row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* Totals row */}
          {totals && (
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                {COLS.map((col) => (
                  <td
                    key={col.key}
                    style={{ minWidth: col.minW }}
                    className={`px-4 py-3.5 whitespace-nowrap ${ac(col)} ${
                      col.type === 'name' ? 'text-xs font-black uppercase tracking-widest text-slate-800' :
                      col.type === 'pct'  ? 'font-bold text-violet-700 text-sm tabular-nums' :
                      'font-bold text-slate-800 text-sm tabular-nums'
                    }`}
                  >
                    {fmtCell(col.type, totals[col.key])}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {rows.length > pageSize && (
        <Pagination
          page={page} pageSize={pageSize} total={rows.length}
          onPage={(p) => setPage(Math.max(1, Math.min(p, maxPages)))}
          onPageSize={(s) => { setPageSize(s); setPage(1); }}
        />
      )}
    </div>
  );
};

export default TransferUniqueCallsTable;
