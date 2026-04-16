import { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Search, X, ChevronsUpDown,
} from 'lucide-react';
import { formatNumber, computeTransferTotals } from '../utils/transferHelpers';

const COLS = [
  { key: 'Campaign',           label: 'Campaign',            align: 'left',   minW: 180, type: 'name'   },
  { key: 'Calls',              label: 'Calls',               align: 'right',  minW: 90,  type: 'number' },
  { key: 'Transfer To Sales',  label: 'Transfer To Sales',   align: 'right',  minW: 148, type: 'number' },
  { key: 'Orders',             label: 'Orders',              align: 'right',  minW: 90,  type: 'number' },
  { key: 'Transfer Con',       label: 'Transfer Con %',      align: 'center', minW: 132, type: 'pct'    },
  { key: 'Transfer Order Con', label: 'Transfer Order Con %',align: 'center', minW: 158, type: 'pct'    },
  { key: 'Calls Order Con',    label: 'Calls Order Con %',   align: 'center', minW: 140, type: 'pct'    },
];

const PAGE_SIZES = [10, 25, 50, 100];

const pctNum = (val) => parseFloat(String(val ?? '').replace('%', '')) || 0;

const pctTheme = (val) => {
  const n = pctNum(val);
  if (n >= 60) return { bg: '#dcfce7', text: '#15803d', bar: '#22c55e', ring: '#bbf7d0' };
  if (n >= 30) return { bg: '#fef9c3', text: '#92400e', bar: '#f59e0b', ring: '#fde68a' };
  return        { bg: '#fee2e2', text: '#b91c1c', bar: '#ef4444', ring: '#fecaca' };
};

const compareRows = (a, b, key, dir, type) => {
  let av = a[key], bv = b[key];
  if (type === 'pct')    { av = pctNum(av);          bv = pctNum(bv); }
  else if (type === 'number') { av = Number(av) || 0; bv = Number(bv) || 0; }
  else                   { av = String(av || '').toLowerCase(); bv = String(bv || '').toLowerCase(); }
  return av < bv ? (dir === 'asc' ? -1 : 1) : av > bv ? (dir === 'asc' ? 1 : -1) : 0;
};

/* ── Percentage badge with mini bar ───────────────────────────────────────── */
const PctCell = ({ val }) => {
  const n = pctNum(val);
  const { bg, text, bar } = pctTheme(val);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <span style={{
        fontSize: 11, fontWeight: 800, color: text, background: bg,
        padding: '2px 9px', borderRadius: 20, fontVariantNumeric: 'tabular-nums',
        letterSpacing: '.2px',
      }}>
        {val ?? '—'}
      </span>
      <div style={{ width: 56, height: 3, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(n, 100)}%`, background: bar, borderRadius: 4, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
};

/* ── Pagination ───────────────────────────────────────────────────────────── */
const PgBtn = ({ onClick, disabled, children }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0',
    background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: disabled ? '#cbd5e1' : '#475569', cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background .12s',
  }}>{children}</button>
);

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

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          Showing <strong style={{ color: '#0d1117' }}>{from}–{to}</strong> of <strong style={{ color: '#0d1117' }}>{total}</strong>
        </span>
        <select value={pageSize} onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
          style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, color: '#475569', background: '#f8fafc', cursor: 'pointer', outline: 'none' }}>
          {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <PgBtn onClick={() => onPage(1)}          disabled={page === 1}><ChevronsLeft  size={12} /></PgBtn>
        <PgBtn onClick={() => onPage(page - 1)}   disabled={page === 1}><ChevronLeft   size={12} /></PgBtn>
        {pages.map((p, i) => p === '…'
          ? <span key={`e${i}`} style={{ width: 30, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>…</span>
          : <button key={p} onClick={() => onPage(p)} style={{
              width: 30, height: 30, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: p === page ? 'none' : '1px solid #e2e8f0',
              background: p === page ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#fff',
              color: p === page ? '#fff' : '#475569',
              boxShadow: p === page ? '0 2px 8px rgba(124,58,237,.25)' : 'none',
            }}>{p}</button>
        )}
        <PgBtn onClick={() => onPage(page + 1)}   disabled={page === totalPages}><ChevronRight  size={12} /></PgBtn>
        <PgBtn onClick={() => onPage(totalPages)} disabled={page === totalPages}><ChevronsRight size={12} /></PgBtn>
      </div>
    </div>
  );
};

/* ── Sort icon ────────────────────────────────────────────────────────────── */
const SortIcon = ({ col, sort }) => {
  if (sort.key !== col.key) return <ChevronsUpDown size={11} style={{ opacity: .35 }} />;
  return sort.dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN TABLE
══════════════════════════════════════════════════════════════════════════ */
const TransferTable = ({ rows = [] }) => {
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort,     setSort]     = useState({ key: 'Calls', dir: 'desc' });
  const [search,   setSearch]   = useState('');
  const [prevRows, setPrevRows] = useState(rows);

  if (prevRows !== rows) { setPrevRows(rows); setPage(1); }

  const toggleSort = (col) => {
    setSort((s) => s.key === col.key
      ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { key: col.key, dir: col.type === 'name' ? 'asc' : 'desc' });
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => String(r.Campaign || '').toLowerCase().includes(q));
  }, [rows, search]);

  const sorted = useMemo(() => {
    const col = COLS.find((c) => c.key === sort.key);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => compareRows(a, b, sort.key, sort.dir, col.type));
  }, [filtered, sort]);

  const totals   = useMemo(() => computeTransferTotals(rows), [rows]);
  const maxPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  if (!rows.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '72px 20px' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" fill="none" stroke="#a78bfa" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>No records found</p>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Try a different date or time range</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'hidden' }}>

      {/* ── Search toolbar ── */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#fafbff', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px', height: 36 }}>
          <Search size={13} color="#94a3b8" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search campaign…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#0d1117', background: 'transparent', fontFamily: 'inherit' }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}>
              <X size={13} />
            </button>
          )}
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
          {filtered.length !== rows.length
            ? `${filtered.length} / ${rows.length} campaigns`
            : `${rows.length} campaigns`}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: COLS.reduce((s, c) => s + c.minW, 0) }}>

          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: 'linear-gradient(135deg,#1e1b4b,#2e1065)' }}>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  style={{
                    minWidth: col.minW, padding: '13px 14px',
                    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px',
                    whiteSpace: 'nowrap', textAlign: col.align,
                    cursor: 'pointer', userSelect: 'none',
                    borderBottom: '1px solid rgba(255,255,255,.07)',
                    color: sort.key === col.key ? '#c4b5fd' : '#94a3b8',
                    transition: 'color .15s',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {col.label}
                    <SortIcon col={col} sort={sort} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={i}
                style={{ background: i % 2 === 0 ? '#fff' : '#fdfcff', transition: 'background .1s', cursor: 'default' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f3ff'}
                onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fdfcff'}
              >
                {COLS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      minWidth: col.minW, padding: '11px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      textAlign: col.align,
                      color: col.type === 'name' ? '#0d1117' : '#475569',
                      fontWeight: col.type === 'name' ? 600 : 400,
                      fontSize: 13,
                    }}
                  >
                    {col.type === 'pct'
                      ? <PctCell val={row[col.key]} />
                      : col.type === 'number'
                        ? <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(row[col.key])}</span>
                        : <span>{row[col.key] ?? '—'}</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* ── Totals row ── */}
          {totals && (
            <tfoot>
              <tr style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
                {COLS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      minWidth: col.minW, padding: '12px 14px', whiteSpace: 'nowrap',
                      textAlign: col.align,
                      borderTop: '2px solid #c4b5fd',
                      borderLeft: col.key === 'Campaign' ? '3px solid #7c3aed' : 'none',
                    }}
                  >
                    {col.type === 'name'
                      ? <span style={{ fontSize: 10, fontWeight: 900, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL</span>
                      : col.type === 'pct'
                        ? <PctCell val={totals[col.key]} />
                        : <span style={{ fontSize: 13, fontWeight: 800, color: '#3730a3', fontVariantNumeric: 'tabular-nums' }}>{formatNumber(totals[col.key])}</span>
                    }
                  </td>
                ))}
              </tr>
            </tfoot>
          )}

        </table>
      </div>

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

export default TransferTable;
