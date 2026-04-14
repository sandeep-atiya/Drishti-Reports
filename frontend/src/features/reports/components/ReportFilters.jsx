import { useState, useEffect } from 'react';
import { CalendarDays, ChevronDown, Search, X, Clock3, CalendarRange, SlidersHorizontal } from 'lucide-react';

const pad         = (n) => String(n).padStart(2, '0');
const fmtDate     = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const now         = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; };
const todayStr    = () => { const { y, m, d } = now(); return fmtDate(y, m, d); };

const PRESETS = [
  {
    id: 'this-month', label: 'This Month', short: 'This Mo.',
    get: () => { const { y, m, d } = now(); return { start: fmtDate(y, m, 1), end: fmtDate(y, m, d) }; },
  },
  {
    id: 'last-month', label: 'Last Month', short: 'Last Mo.',
    get: () => {
      const { y, m } = now();
      const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
      return { start: fmtDate(py, pm, 1), end: fmtDate(py, pm, daysInMonth(py, pm)) };
    },
  },
  {
    id: 'last-3', label: 'Last 3 Months', short: '3 Months',
    get: () => {
      const { y, m, d } = now();
      const raw = m - 2; const sm = raw <= 0 ? raw + 12 : raw, sy = raw <= 0 ? y - 1 : y;
      return { start: fmtDate(sy, sm, 1), end: fmtDate(y, m, d) };
    },
  },
  {
    id: 'last-6', label: 'Last 6 Months', short: '6 Months',
    get: () => {
      const { y, m, d } = now();
      const raw = m - 5; const sm = raw <= 0 ? raw + 12 : raw, sy = raw <= 0 ? y - 1 : y;
      return { start: fmtDate(sy, sm, 1), end: fmtDate(y, m, d) };
    },
  },
  {
    id: 'this-year', label: 'This Year', short: 'This Yr.',
    get: () => { const { y, m, d } = now(); return { start: fmtDate(y, 1, 1), end: fmtDate(y, m, d) }; },
  },
  { id: 'custom', label: 'Custom Range', short: 'Custom', get: null },
];

const ReportFilters = ({ onFetch, loading }) => {
  const init                       = PRESETS[1].get();
  const [activeId,  setActiveId]   = useState('last-month');
  const [startDate, setStartDate]  = useState(init.start);
  const [endDate,   setEndDate]    = useState(init.end);
  const [showCustom, setShowCustom] = useState(false);

  const pick = (p) => {
    setActiveId(p.id);
    if (p.get) {
      const { start, end } = p.get();
      setStartDate(start);
      setEndDate(end);
      setShowCustom(false);
    } else {
      setShowCustom(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (startDate && endDate && startDate <= endDate) onFetch({ startDate, endDate });
  };

  const canGenerate = !loading && startDate && endDate && startDate <= endDate;

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #edf0f7',
        boxShadow: '0 2px 8px rgba(0,0,0,.05)', overflow: 'hidden',
      }}>
        {/* ── header strip ── */}
        <div style={{
          padding: '13px 20px', borderBottom: '1px solid #edf0f7',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg,#f8faff,#f3f0ff)',
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={14} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#0d1117', letterSpacing: '-.2px' }}>Report Filters</p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Select a period to generate the Drishti Report</p>
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 14 }}>
          {/* ── Period preset pills ── */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>
              Period
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESETS.map((p) => {
                const active = activeId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pick(p)}
                    style={{
                      height: 34, padding: '0 14px', borderRadius: 8,
                      border: active ? 'none' : '1px solid #e2e8f0',
                      background: active ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#f8fafc',
                      color: active ? '#fff' : '#4a5568',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: active ? '0 2px 8px rgba(79,70,229,.3)' : 'none',
                      transition: 'all .15s',
                    }}
                  >
                    <span className="hidden sm:inline">{p.label}</span>
                    <span className="sm:hidden">{p.short}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Custom range inputs ── */}
            {showCustom && (
              <div style={{
                marginTop: 12, padding: '12px 14px',
                background: '#f8faff', border: '1px solid #c7d2fe',
                borderRadius: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
              }}>
                <SlidersHorizontal size={13} color="#6366f1" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5' }}>Custom Range</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: 'From', val: startDate, set: setStartDate, min: undefined, max: endDate || todayStr() },
                    { label: 'To',   val: endDate,   set: setEndDate,   min: startDate, max: todayStr() },
                  ].map(({ label, val, set, min, max }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</span>
                      <input
                        type="date" value={val} min={min} max={max}
                        onChange={(e) => set(e.target.value)}
                        style={{
                          height: 32, padding: '0 10px', borderRadius: 7,
                          border: '1px solid #c7d2fe', background: '#fff',
                          fontSize: 12, color: '#0d1117', fontFamily: 'inherit', outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Selected range badge ── */}
          {startDate && endDate && (
            <div style={{ flexShrink: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>
                Selected
              </p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 13px', borderRadius: 8,
                background: '#eef2ff', border: '1px solid #c7d2fe',
              }}>
                <CalendarDays size={12} color="#6366f1" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>
                  {startDate}
                </span>
                <span style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600 }}>→</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>
                  {endDate}
                </span>
              </div>
            </div>
          )}

          {/* ── Generate button ── */}
          <div style={{ flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: 'transparent', marginBottom: 8, userSelect: 'none' }}>.</p>
            <button
              type="submit"
              disabled={!canGenerate}
              style={{
                height: 40, padding: '0 22px', borderRadius: 10, border: 'none',
                background: canGenerate ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#e2e8f0',
                color: canGenerate ? '#fff' : '#94a3b8',
                fontSize: 13, fontWeight: 700, cursor: canGenerate ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'inherit',
                boxShadow: canGenerate ? '0 4px 14px rgba(79,70,229,.35)' : 'none',
                transition: 'all .15s',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'dSpin .7s linear infinite', flexShrink: 0 }} />
                  Generating…
                </>
              ) : (
                <>
                  <Search size={14} />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes dSpin{to{transform:rotate(360deg)}}`}</style>
    </form>
  );
};

export default ReportFilters;
