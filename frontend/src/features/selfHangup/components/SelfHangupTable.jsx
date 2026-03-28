import { useState, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from 'lucide-react';
import { formatNumber, computeSelfHangupTotals } from '../utils/selfHangupHelpers';

const COLS = [
  { key: "Agent's Name",        label: "Agent's Name",         align: 'left',   minW: 180, type: 'name'   },
  { key: 'AGENT_HANGUP_PHONE',  label: 'Agent Hangup Phone',   align: 'right',  minW: 145, type: 'number' },
  { key: 'AGENT_HANGUP_UI',     label: 'Agent Hangup UI',      align: 'right',  minW: 130, type: 'number' },
  { key: 'CUSTOMER_HANGUP_PHONE', label: 'Customer Hangup',    align: 'right',  minW: 130, type: 'number' },
  { key: 'SYSTEM_HANGUP',       label: 'System Hangup',        align: 'right',  minW: 120, type: 'number' },
  { key: 'SYSTEM_MEDIA',        label: 'System Media',         align: 'right',  minW: 120, type: 'number' },
  { key: 'SYSTEM_RECORDING',    label: 'System Recording',     align: 'right',  minW: 140, type: 'number' },
  { key: 'Grand Total',         label: 'Grand Total',          align: 'right',  minW: 110, type: 'grand'  },
  { key: 'Total Self Hangup',   label: 'Total Self Hangup',    align: 'right',  minW: 145, type: 'self'   },
  { key: 'Self Hangup %',       label: 'Self Hangup %',        align: 'center', minW: 120, type: 'pct'   },
];

const PAGE_SIZES = [10, 25, 50, 100, 200];

const ac = (col) =>
  col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right';

const fmtCell = (type, val) => {
  if (type === 'pct') return val ?? '0.0%';
  if (type === 'number' || type === 'grand' || type === 'self') return formatNumber(val);
  return val ?? '—';
};

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
            className="appearance-none pl-2.5 pr-6 py-1 text-xs border border-slate-200 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
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
                p === page ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >{p}</button>
        )}
        <PgBtn onClick={() => onPage(page + 1)}   disabled={page === totalPages}><ChevronRight  size={12} /></PgBtn>
        <PgBtn onClick={() => onPage(totalPages)} disabled={page === totalPages}><ChevronsRight size={12} /></PgBtn>
      </div>
    </div>
  );
};

/* ── SelfHangupTable ────────────────────────────────────────────────────── */
const SelfHangupTable = ({ rows = [] }) => {
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(25);
  const [search,     setSearch]     = useState('');
  const [prevRows,   setPrevRows]   = useState(rows);

  if (prevRows !== rows) { setPrevRows(rows); setPage(1); setSearch(''); }

  // Client-side agent search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      String(r["Agent's Name"] || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totals   = useMemo(() => computeSelfHangupTotals(filtered), [filtered]);
  const maxPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

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
          <p className="text-xs text-slate-400 mt-0.5">Try a different date range or campaign</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Agent search bar */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search agent name…"
          className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
        />
        {search && (
          <button onClick={() => { setSearch(''); setPage(1); }} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
        {search && (
          <span className="text-xs text-slate-400 shrink-0">
            {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

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
                  className={`px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-700 whitespace-nowrap ${ac(col)} ${
                    col.type === 'grand'  ? 'text-amber-300'  :
                    col.type === 'self'  ? 'text-orange-300' :
                    col.type === 'pct'   ? 'text-red-300'    :
                    'text-slate-300'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row, i) => (
              <tr
                key={i}
                className={`transition-colors hover:bg-orange-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                {COLS.map((col) => (
                  <td
                    key={col.key}
                    style={{ minWidth: col.minW }}
                    className={`px-4 py-3 whitespace-nowrap ${ac(col)} ${
                      col.type === 'name'   ? 'font-semibold text-slate-800 text-sm'           :
                      col.type === 'pct'   ? 'font-bold text-red-600 text-sm tabular-nums'    :
                      col.type === 'grand' ? 'font-bold text-amber-700 text-sm tabular-nums'  :
                      col.type === 'self'  ? 'font-bold text-orange-700 text-sm tabular-nums' :
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
                    className={`px-4 py-3.5 whitespace-nowrap font-bold ${ac(col)} ${
                      col.type === 'name'   ? 'text-xs font-black uppercase tracking-widest text-slate-800' :
                      col.type === 'pct'   ? 'text-red-700 text-sm tabular-nums'    :
                      col.type === 'grand' ? 'text-amber-800 text-sm tabular-nums'  :
                      col.type === 'self'  ? 'text-orange-800 text-sm tabular-nums' :
                      'text-slate-800 text-sm tabular-nums'
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

      {filtered.length > pageSize && (
        <Pagination
          page={page} pageSize={pageSize} total={filtered.length}
          onPage={(p) => setPage(Math.max(1, Math.min(p, maxPages)))}
          onPageSize={(s) => { setPageSize(s); setPage(1); }}
        />
      )}
    </div>
  );
};

export default SelfHangupTable;
