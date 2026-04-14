import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ChevronDown, ChevronUp, ChevronsUpDown, Search, X,
} from 'lucide-react';
import { formatCurrency, formatNumber, computeTotals } from '../utils/reportHelpers';

/* ── column definitions ─────────────────────────────────────────── */
const COLS = [
  { key: 'Campaign',               label: 'Campaign',        align: 'left',   minW: 170, type: 'name'     },
  { key: 'Calls',                  label: 'Calls',           align: 'right',  minW: 90,  type: 'number'   },
  { key: 'Orders',                 label: 'Orders',          align: 'right',  minW: 88,  type: 'number'   },
  { key: 'Verified',               label: 'Verified',        align: 'right',  minW: 88,  type: 'number'   },
  { key: 'Verified Amount',        label: 'Verified Amt.',   align: 'right',  minW: 140, type: 'currency' },
  { key: 'Verified Ticket Size',   label: 'Ticket Size',     align: 'right',  minW: 110, type: 'currency' },
  { key: 'Order Conversion',       label: 'Order Conv.',     align: 'center', minW: 105, type: 'pct'      },
  { key: 'Verified Conversion',    label: 'Verified Conv.',  align: 'center', minW: 118, type: 'pct'      },
  { key: 'Verification %',         label: 'Verif. %',        align: 'center', minW: 100, type: 'pct'      },
  { key: 'RPC (Revenue per Call)', label: 'RPC',             align: 'right',  minW: 95,  type: 'currency' },
];

const PAGE_SIZES = [10, 25, 50, 100];

/* ── helpers ─────────────────────────────────────────────────────── */
const pctNum = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace('%', ''));
  return isNaN(n) ? null : n;
};

const pctColor = (n) => {
  if (n === null) return { text: '#64748b', bg: '#f1f5f9', bar: '#cbd5e1' };
  if (n >= 60)    return { text: '#059669', bg: '#ecfdf5', bar: '#10b981' };
  if (n >= 40)    return { text: '#d97706', bg: '#fffbeb', bar: '#f59e0b' };
  return           { text: '#dc2626', bg: '#fef2f2', bar: '#ef4444' };
};

const numVal = (row, key) => Number(row[key]) || 0;

/* ── sort comparator ─────────────────────────────────────────────── */
const compareRows = (a, b, key, dir, type) => {
  let av, bv;
  if (type === 'pct') {
    av = pctNum(a[key]) ?? -1;
    bv = pctNum(b[key]) ?? -1;
  } else if (type === 'currency' || type === 'number') {
    av = Number(a[key]) || 0;
    bv = Number(b[key]) || 0;
  } else {
    av = String(a[key] ?? '').toLowerCase();
    bv = String(b[key] ?? '').toLowerCase();
  }
  if (av < bv) return dir === 'asc' ? -1 : 1;
  if (av > bv) return dir === 'asc' ?  1 : -1;
  return 0;
};

/* ── cell renderer ───────────────────────────────────────────────── */
const Cell = ({ type, val, isTotal }) => {
  if (type === 'pct') {
    const n = pctNum(val);
    const c = pctColor(n);
    const w = n !== null ? Math.min(n, 100) : 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: isTotal ? c.text : c.text,
          background: c.bg, padding: '2px 9px', borderRadius: 20,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {val ?? '—'}
        </span>
        {!isTotal && n !== null && (
          <div style={{ width: 52, height: 3, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${w}%`, height: '100%', background: c.bar, borderRadius: 2, transition: 'width .3s' }} />
          </div>
        )}
      </div>
    );
  }
  if (type === 'currency') {
    const n = Number(val);
    const text = (isNaN(n) || val == null) ? '—' : '₹' + n.toLocaleString('en-IN');
    return <span style={{ color: isTotal ? '#059669' : '#059669', fontWeight: isTotal ? 800 : 600, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{text}</span>;
  }
  if (type === 'number') {
    const n = Number(val);
    const text = (isNaN(n) || val == null) ? '—' : n.toLocaleString('en-IN');
    return <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: isTotal ? 800 : 500 }}>{text}</span>;
  }
  if (type === 'name') {
    return (
      <span style={{ fontWeight: isTotal ? 900 : 600, fontSize: isTotal ? 11 : 13, textTransform: isTotal ? 'uppercase' : 'none', letterSpacing: isTotal ? '.8px' : 0, color: isTotal ? '#4f46e5' : '#0d1117' }}>
        {val ?? '—'}
      </span>
    );
  }
  return <span>{val ?? '—'}</span>;
};

/* ── sort icon ───────────────────────────────────────────────────── */
const SortIcon = ({ colKey, sortKey, sortDir }) => {
  if (colKey !== sortKey) return <ChevronsUpDown size={11} style={{ opacity: .35, flexShrink: 0 }} />;
  return sortDir === 'asc'
    ? <ChevronUp   size={11} style={{ color: '#a5b4fc', flexShrink: 0 }} />
    : <ChevronDown size={11} style={{ color: '#a5b4fc', flexShrink: 0 }} />;
};

/* ── pagination ──────────────────────────────────────────────────── */
const Pagination = ({ page, pageSize, total, onPage, onPageSize }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4)       return [1, 2, 3, 4, 5, '…', totalPages];
    if (page >= totalPages - 3) return [1, '…', totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [1, '…', page-1, page, page+1, '…', totalPages];
  }, [page, totalPages]);

  const PgBtn = ({ onClick, disabled, children }) => (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        width: 30, height: 30, borderRadius: 7, border: 'none',
        background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: disabled ? '#cbd5e1' : '#64748b', transition: 'all .15s',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = '#eef2ff'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >{children}</button>
  );

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, padding: '12px 16px', borderTop: '1px solid #edf0f7', background: '#fafbff',
    }}>
      {/* left: showing + page size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          Showing <strong style={{ color: '#0d1117' }}>{from}–{to}</strong> of{' '}
          <strong style={{ color: '#0d1117' }}>{total}</strong>
        </span>
        <div style={{ position: 'relative' }}>
          <select
            value={pageSize}
            onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
            style={{
              height: 28, padding: '0 24px 0 10px', borderRadius: 7,
              border: '1px solid #e2e8f0', background: '#fff',
              fontSize: 12, color: '#4a5568', fontFamily: 'inherit',
              outline: 'none', cursor: 'pointer', appearance: 'none',
            }}
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
          <ChevronDown size={10} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* right: page buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <PgBtn onClick={() => onPage(1)}          disabled={page === 1}><ChevronsLeft  size={13} /></PgBtn>
        <PgBtn onClick={() => onPage(page - 1)}   disabled={page === 1}><ChevronLeft   size={13} /></PgBtn>
        {pages.map((p, i) => p === '…'
          ? <span key={`e${i}`} style={{ width: 28, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>…</span>
          : (
            <button key={p} onClick={() => onPage(p)} style={{
              width: 30, height: 30, borderRadius: 7, border: 'none',
              background: p === page ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent',
              color: p === page ? '#fff' : '#4a5568',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: p === page ? '0 2px 6px rgba(79,70,229,.3)' : 'none',
              transition: 'all .15s',
            }}>{p}</button>
          )
        )}
        <PgBtn onClick={() => onPage(page + 1)}   disabled={page === totalPages}><ChevronRight  size={13} /></PgBtn>
        <PgBtn onClick={() => onPage(totalPages)} disabled={page === totalPages}><ChevronsRight size={13} /></PgBtn>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MAIN TABLE COMPONENT
══════════════════════════════════════════════════════════════════ */
const ReportTable = ({ rows = [] }) => {
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search,   setSearch]   = useState('');
  const [sortKey,  setSortKey]  = useState('Calls');
  const [sortDir,  setSortDir]  = useState('desc');
  const [prevRows, setPrevRows] = useState(rows);

  if (prevRows !== rows) { setPrevRows(rows); setPage(1); setSearch(''); }

  const handleSort = (col) => {
    if (sortKey === col.key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col.key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const filtered = useMemo(() =>
    search.trim()
      ? rows.filter((r) => String(r.Campaign ?? '').toLowerCase().includes(search.toLowerCase()))
      : rows,
    [rows, search]
  );

  const sorted = useMemo(() => {
    const col = COLS.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => compareRows(a, b, col.key, sortDir, col.type));
  }, [filtered, sortKey, sortDir]);

  const totals   = useMemo(() => computeTotals(sorted), [sorted]);
  const maxPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  /* ── empty state ── */
  if (!rows.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 20px', background: '#fafbff' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#4a5568' }}>No records found</p>
        <p style={{ fontSize: 12, color: '#94a3b8' }}>Try a different date range</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
      {/* ── search + stats bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10, padding: '12px 16px', borderBottom: '1px solid #edf0f7',
        background: '#fafbff',
      }}>
        <div style={{ position: 'relative', minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text" placeholder="Search campaign…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              height: 32, paddingLeft: 30, paddingRight: search ? 28 : 12, paddingTop: 0, paddingBottom: 0,
              borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff',
              fontSize: 12, color: '#0d1117', fontFamily: 'inherit', outline: 'none', width: '100%',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {search && filtered.length !== rows.length && (
            <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, background: '#eef2ff', padding: '3px 10px', borderRadius: 20 }}>
              {filtered.length} of {rows.length} campaigns
            </span>
          )}
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
            {rows.length} campaign{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          minWidth: COLS.reduce((s, c) => s + c.minW, 0),
        }}>
          {/* HEADER */}
          <thead>
            <tr style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '13px 14px',
                    fontSize: 11, fontWeight: 700,
                    color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '.7px',
                    textAlign: col.align,
                    minWidth: col.minW, whiteSpace: 'nowrap',
                    cursor: 'pointer', userSelect: 'none',
                    borderBottom: '2px solid #334155',
                    transition: 'color .15s',
                  }}
                  onClick={() => handleSort(col)}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = col.key === sortKey ? '#a5b4fc' : '#94a3b8'; }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: col.key === sortKey ? '#a5b4fc' : 'inherit' }}>
                    {col.label}
                    <SortIcon colKey={col.key} sortKey={sortKey} sortDir={sortDir} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={i}
                style={{
                  background: i % 2 === 0 ? '#fff' : '#fafbff',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background .12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbff'; }}
              >
                {COLS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '11px 14px',
                      textAlign: col.align,
                      minWidth: col.minW, whiteSpace: 'nowrap',
                      fontSize: 13, color: '#374151',
                      borderLeft: col.key === 'Campaign' ? '3px solid transparent' : undefined,
                    }}
                  >
                    <Cell type={col.type} val={row[col.key]} isTotal={false} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* TOTALS */}
          {totals && (
            <tfoot>
              <tr style={{ background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', borderTop: '2px solid #c7d2fe' }}>
                {COLS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '12px 14px', textAlign: col.align,
                      minWidth: col.minW, whiteSpace: 'nowrap',
                      fontSize: 13,
                      borderLeft: col.key === 'Campaign' ? '3px solid #6366f1' : undefined,
                    }}
                  >
                    <Cell type={col.type} val={totals[col.key]} isTotal />
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* PAGINATION */}
      {sorted.length > pageSize && (
        <Pagination
          page={page} pageSize={pageSize} total={sorted.length}
          onPage={(p) => setPage(Math.max(1, Math.min(p, maxPages)))}
          onPageSize={(s) => { setPageSize(s); setPage(1); }}
        />
      )}
    </div>
  );
};

export default ReportTable;
