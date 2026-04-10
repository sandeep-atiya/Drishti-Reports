import { useState, useRef, useEffect } from 'react';
import {
  CalendarDays, Calendar, Clock3, SlidersHorizontal,
  ChevronDown, Check, Search, CalendarRange,
} from 'lucide-react';

/* ── Date helpers (all string-based, no Date object to avoid UTC shift) ───── */
const pad         = (n) => String(n).padStart(2, '0');
const fmtDate     = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

const nowParts = () => {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h: d.getHours() };
};

const todayStr = () => { const { y, m, d } = nowParts(); return fmtDate(y, m, d); };

// Add N calendar days to a YYYY-MM-DD string without timezone drift
const addDays = (dateStr, n) => {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, mo - 1, d + n);
  return fmtDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};

/* ── Presets ────────────────────────────────────────────────────────────────
   All `start` / `end` values are exclusive-end ranges sent directly to the API:
     date mode   → end = first day NOT included (start of next day)
     hourly mode → end = exclusive end time (e.g. 10:00 means up to 09:59)
──────────────────────────────────────────────────────────────────────────── */
const PRESETS = [
  {
    id: 'today', label: 'Today', icon: CalendarDays, mode: 'date',
    get: () => { const t = todayStr(); return { start: t, end: addDays(t, 1) }; },
  },
  {
    id: 'yesterday', label: 'Yesterday', icon: Calendar, mode: 'date',
    get: () => {
      const t = todayStr();
      const y = addDays(t, -1);
      return { start: y, end: t };
    },
  },
  {
    id: 'this-month', label: 'This Month', icon: CalendarDays, mode: 'date',
    get: () => {
      const { y, m } = nowParts();
      return { start: fmtDate(y, m, 1), end: addDays(todayStr(), 1) };
    },
  },
  {
    id: 'last-month', label: 'Last Month', icon: CalendarRange, mode: 'date',
    get: () => {
      const { y, m } = nowParts();
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      // end = first day of current month (exclusive of last day of prev month)
      return { start: fmtDate(py, pm, 1), end: fmtDate(y, m, 1) };
    },
  },
  {
    id: 'custom-date', label: 'Custom Date Range', icon: SlidersHorizontal, mode: 'date',
    get: null,
  },
  {
    id: 'custom-hour', label: 'Custom Hour Range', icon: Clock3, mode: 'datetime',
    get: null,
  },
];

/* ── Display label for the selected range badge ─────────────────────────── */
const rangeBadge = (start, end, mode) => {
  if (mode === 'datetime') return `${start}  →  ${end}`;
  // For date mode, show end-1 to display the inclusive end to users
  const dispEnd = addDays(end, -1);
  return start === dispEnd ? start : `${start}  →  ${dispEnd}`;
};

/* ── Component ──────────────────────────────────────────────────────────── */
const TransferUniqueCallsFilters = ({ onFetch, loading }) => {
  const [activeId,       setActiveId]       = useState('today');
  const [startDate,      setStartDate]      = useState(() => PRESETS[0].get().start);
  const [endDate,        setEndDate]        = useState(() => PRESETS[0].get().end);
  const [startDatetime,  setStartDatetime]  = useState('');
  const [endDatetime,    setEndDatetime]    = useState('');
  const [open,           setOpen]           = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const active   = PRESETS.find((p) => p.id === activeId);
  const isCustomDate = activeId === 'custom-date';
  const isCustomHour = activeId === 'custom-hour';

  const pick = (p) => {
    setActiveId(p.id);
    if (p.get) {
      const { start, end } = p.get();
      setStartDate(start);
      setEndDate(end);
      setOpen(false);
    } else {
      const t = todayStr();
      setStartDate(t);
      setEndDate(t);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isCustomHour) {
      if (startDatetime && endDatetime && endDatetime > startDatetime) {
        onFetch({ startDate: startDatetime, endDate: endDatetime });
      }
    } else {
      if (startDate && endDate) {
        onFetch({ startDate, endDate });
      }
    }
  };

  const canSubmit = isCustomHour
    ? (startDatetime && endDatetime && endDatetime > startDatetime)
    : (startDate && endDate);

  // Display range for the badge
  const badge = isCustomHour
    ? (startDatetime && endDatetime ? rangeBadge(startDatetime, endDatetime, 'datetime') : null)
    : (startDate && endDate ? rangeBadge(startDate, endDate, 'date') : null);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 shadow-sm px-5 py-4"
    >
      <div className="flex flex-wrap items-end gap-4">

        {/* ── Period dropdown ── */}
        <div className="relative" ref={ref}>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
            Period
          </label>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 pl-3.5 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 hover:border-violet-400 hover:bg-white transition-all min-w-[200px] shadow-sm"
          >
            {active && <active.icon size={14} className="text-violet-500 shrink-0" />}
            <span className="flex-1 text-left">{active?.label}</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-60 bg-white border border-slate-200 shadow-xl py-1 overflow-hidden">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const sel  = activeId === p.id;
                return (
                  <button
                    key={p.id} type="button" onClick={() => pick(p)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      sel ? 'bg-violet-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={14} className={sel ? 'text-violet-200' : 'text-slate-400'} />
                    <span className="flex-1 text-left font-medium">{p.label}</span>
                    {p.mode === 'datetime' && !sel && (
                      <span className="text-[10px] text-slate-400 font-semibold border border-slate-200 px-1.5 py-0.5">HR</span>
                    )}
                    {sel && <Check size={13} className="text-violet-200" />}
                  </button>
                );
              })}

              {/* Custom Date Range pickers */}
              {isCustomDate && (
                <div className="mx-3 my-2 p-3 bg-slate-50 border border-slate-100 space-y-2.5">
                  {[
                    ['From', startDate, setStartDate, null, todayStr()],
                    ['To',   endDate ? addDays(endDate, -1) : '',
                              (v) => setEndDate(addDays(v, 1)),
                              startDate, todayStr()],
                  ].map(([lbl, val, setter, min, max]) => (
                    <div key={lbl}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{lbl}</p>
                      <input
                        type="date" value={val} min={min || undefined} max={max}
                        onChange={(e) => setter(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Hour Range pickers */}
              {isCustomHour && (
                <div className="mx-3 my-2 p-3 bg-slate-50 border border-slate-100 space-y-2.5">
                  <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">
                    Hourly Range
                  </p>
                  {[
                    ['From', startDatetime, setStartDatetime],
                    ['To',   endDatetime,   setEndDatetime],
                  ].map(([lbl, val, setter]) => (
                    <div key={lbl}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{lbl}</p>
                      <input
                        type="datetime-local" value={val}
                        onChange={(e) => setter(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Selected range badge ── */}
        {badge && (
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Selected Range
            </label>
            <div className={`flex items-center gap-2 px-3.5 py-2.5 border text-sm font-mono font-semibold
              ${isCustomHour
                ? 'bg-amber-50 border-amber-100 text-amber-700'
                : 'bg-violet-50 border-violet-100 text-violet-700'
              }`}
            >
              {isCustomHour
                ? <Clock3 size={13} className="text-amber-400 shrink-0" />
                : <CalendarDays size={13} className="text-violet-400 shrink-0" />
              }
              <span className="text-xs">{badge}</span>
            </div>
          </div>
        )}

        {/* ── Generate button ── */}
        <div className="ml-auto">
          <label className="block text-[10px] font-semibold text-transparent uppercase tracking-widest mb-1.5 select-none">.</label>
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-violet-200/60"
          >
            {loading
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" />Generating…</>
              : <><Search size={14} />Generate Report</>
            }
          </button>
        </div>

      </div>
    </form>
  );
};

export default TransferUniqueCallsFilters;
