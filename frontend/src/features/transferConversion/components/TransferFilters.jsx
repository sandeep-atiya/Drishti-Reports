import { useState } from 'react';
import { CalendarDays, Clock3, SlidersHorizontal, Search, Calendar } from 'lucide-react';

const pad         = (n) => String(n).padStart(2, '0');
const fmtDate     = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const nowParts    = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; };
const todayStr    = () => { const { y, m, d } = nowParts(); return fmtDate(y, m, d); };
const addDays     = (dateStr, n) => {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, mo - 1, d + n);
  return fmtDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};

const PRESETS = [
  {
    id: 'today', label: 'Today', short: 'Today', mode: 'date',
    get: () => { const t = todayStr(); return { start: t, end: addDays(t, 1) }; },
  },
  {
    id: 'yesterday', label: 'Yesterday', short: 'Yest.', mode: 'date',
    get: () => { const t = todayStr(); return { start: addDays(t, -1), end: t }; },
  },
  {
    id: 'this-month', label: 'This Month', short: 'This Mo.', mode: 'date',
    get: () => { const { y, m } = nowParts(); return { start: fmtDate(y, m, 1), end: addDays(todayStr(), 1) }; },
  },
  {
    id: 'last-month', label: 'Last Month', short: 'Last Mo.', mode: 'date',
    get: () => {
      const { y, m } = nowParts();
      const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
      return { start: fmtDate(py, pm, 1), end: fmtDate(y, m, 1) };
    },
  },
  { id: 'custom-date', label: 'Custom Date', short: 'Custom', mode: 'date', get: null },
  { id: 'custom-hour', label: 'Custom Hourly', short: 'Hourly', mode: 'datetime', get: null },
];

const rangeBadge = (start, end, mode) => {
  if (mode === 'datetime') return `${start} → ${end}`;
  const dispEnd = addDays(end, -1);
  return start === dispEnd ? start : `${start} → ${dispEnd}`;
};

const TransferFilters = ({ onFetch, loading }) => {
  const [activeId,      setActiveId]      = useState('today');
  const [startDate,     setStartDate]     = useState(() => PRESETS[0].get().start);
  const [endDate,       setEndDate]       = useState(() => PRESETS[0].get().end);
  const [startDatetime, setStartDatetime] = useState('');
  const [endDatetime,   setEndDatetime]   = useState('');

  const isCustomDate = activeId === 'custom-date';
  const isCustomHour = activeId === 'custom-hour';

  const pick = (p) => {
    setActiveId(p.id);
    if (p.get) {
      const { start, end } = p.get();
      setStartDate(start); setEndDate(end);
    } else {
      const t = todayStr(); setStartDate(t); setEndDate(t);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isCustomHour) {
      if (startDatetime && endDatetime && endDatetime > startDatetime) onFetch({ startDate: startDatetime, endDate: endDatetime });
    } else {
      if (startDate && endDate) onFetch({ startDate, endDate });
    }
  };

  const canSubmit = isCustomHour
    ? (startDatetime && endDatetime && endDatetime > startDatetime)
    : (startDate && endDate);

  const badge = isCustomHour
    ? (startDatetime && endDatetime ? rangeBadge(startDatetime, endDatetime, 'datetime') : null)
    : (startDate && endDate ? rangeBadge(startDate, endDate, 'date') : null);

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #edf0f7',
        boxShadow: '0 2px 8px rgba(0,0,0,.05)', overflow: 'hidden',
      }}>
        {/* header strip */}
        <div style={{
          padding: '13px 20px', borderBottom: '1px solid #edf0f7',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg,#f8faff,#faf5ff)',
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={14} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#0d1117', letterSpacing: '-.2px' }}>Report Filters</p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Select period · Supports date & hourly ranges</p>
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 14 }}>

          {/* Pills */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Period</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESETS.map((p) => {
                const act      = activeId === p.id;
                const isHourly = p.mode === 'datetime';
                return (
                  <button key={p.id} type="button" onClick={() => pick(p)} style={{
                    height: 34, padding: '0 14px', borderRadius: 8, fontFamily: 'inherit',
                    border: act ? 'none' : `1px solid ${isHourly ? '#fde68a' : '#e2e8f0'}`,
                    background: act
                      ? isHourly ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#7c3aed,#a855f7)'
                      : isHourly ? '#fffbeb' : '#f8fafc',
                    color: act ? '#fff' : isHourly ? '#92400e' : '#4a5568',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    boxShadow: act ? (isHourly ? '0 2px 8px rgba(217,119,6,.3)' : '0 2px 8px rgba(124,58,237,.3)') : 'none',
                    transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {isHourly && <Clock3 size={11} />}
                    <span className="hidden sm:inline">{p.label}</span>
                    <span className="sm:hidden">{p.short}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom date range */}
            {isCustomDate && (
              <div style={{
                marginTop: 12, padding: '12px 14px', background: '#faf5ff',
                border: '1px solid #c4b5fd', borderRadius: 10,
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
              }}>
                <SlidersHorizontal size={13} color="#7c3aed" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>Custom Date Range</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: 'From', val: startDate, set: setStartDate, min: undefined, max: endDate || todayStr() },
                    { label: 'To', val: endDate ? addDays(endDate, -1) : '', set: (v) => setEndDate(addDays(v, 1)), min: startDate, max: todayStr() },
                  ].map(({ label, val, set, min, max }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</span>
                      <input type="date" value={val} min={min} max={max} onChange={(e) => set(e.target.value)}
                        style={{ height: 32, padding: '0 10px', borderRadius: 7, border: '1px solid #c4b5fd', background: '#fff', fontSize: 12, color: '#0d1117', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom hourly range */}
            {isCustomHour && (
              <div style={{
                marginTop: 12, padding: '12px 14px', background: '#fffbeb',
                border: '1px solid #fde68a', borderRadius: 10,
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
              }}>
                <Clock3 size={13} color="#d97706" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>Custom Hour Range</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: 'From', val: startDatetime, set: setStartDatetime },
                    { label: 'To',   val: endDatetime,   set: setEndDatetime   },
                  ].map(({ label, val, set }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</span>
                      <input type="datetime-local" value={val} onChange={(e) => set(e.target.value)}
                        style={{ height: 32, padding: '0 10px', borderRadius: 7, border: '1px solid #fde68a', background: '#fff', fontSize: 12, color: '#0d1117', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Badge */}
          {badge && (
            <div style={{ flexShrink: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Selected</p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 8,
                background: isCustomHour ? '#fffbeb' : '#faf5ff',
                border: `1px solid ${isCustomHour ? '#fde68a' : '#c4b5fd'}`,
              }}>
                {isCustomHour
                  ? <Clock3 size={12} color="#d97706" />
                  : <CalendarDays size={12} color="#7c3aed" />
                }
                <span style={{ fontSize: 12, fontWeight: 700, color: isCustomHour ? '#d97706' : '#7c3aed', fontVariantNumeric: 'tabular-nums' }}>{badge}</span>
              </div>
            </div>
          )}

          {/* Generate button */}
          <div style={{ flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: 'transparent', marginBottom: 8, userSelect: 'none' }}>.</p>
            <button type="submit" disabled={loading || !canSubmit} style={{
              height: 40, padding: '0 22px', borderRadius: 10, border: 'none', fontFamily: 'inherit',
              background: (canSubmit && !loading) ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#e2e8f0',
              color: (canSubmit && !loading) ? '#fff' : '#94a3b8',
              fontSize: 13, fontWeight: 700, cursor: (canSubmit && !loading) ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: (canSubmit && !loading) ? '0 4px 14px rgba(124,58,237,.35)' : 'none',
              transition: 'all .15s',
            }}>
              {loading ? (
                <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'tSpin .7s linear infinite', flexShrink: 0 }} />Generating…</>
              ) : (
                <><Search size={14} />Generate Report</>
              )}
            </button>
          </div>

        </div>
      </div>
      <style>{`@keyframes tSpin{to{transform:rotate(360deg)}}`}</style>
    </form>
  );
};

export default TransferFilters;
