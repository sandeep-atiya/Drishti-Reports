import { useState, useRef, useEffect } from 'react';
import {
  CalendarDays, ChevronDown, Check, Search,
  Calendar, Clock3, CalendarRange, SlidersHorizontal,
} from 'lucide-react';

/* ── date helpers (runtime-relative, works for any year) ── */
const pad         = (n) => String(n).padStart(2, '0');
const fmtDate     = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const now         = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; };
const todayStr    = () => { const { y, m, d } = now(); return fmtDate(y, m, d); };

const PRESETS = [
  {
    id: 'this-month', label: 'This Month', icon: CalendarDays,
    get: () => { const { y, m, d } = now(); return { start: fmtDate(y, m, 1), end: fmtDate(y, m, d) }; },
  },
  {
    id: 'last-month', label: 'Last Month', icon: Calendar,
    get: () => {
      const { y, m } = now();
      const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
      return { start: fmtDate(py, pm, 1), end: fmtDate(py, pm, daysInMonth(py, pm)) };
    },
  },
  {
    id: 'last-3', label: 'Last 3 Months', icon: Clock3,
    get: () => {
      const { y, m, d } = now();
      const raw = m - 2; const sm = raw <= 0 ? raw + 12 : raw, sy = raw <= 0 ? y - 1 : y;
      return { start: fmtDate(sy, sm, 1), end: fmtDate(y, m, d) };
    },
  },
  {
    id: 'last-6', label: 'Last 6 Months', icon: CalendarRange,
    get: () => {
      const { y, m, d } = now();
      const raw = m - 5; const sm = raw <= 0 ? raw + 12 : raw, sy = raw <= 0 ? y - 1 : y;
      return { start: fmtDate(sy, sm, 1), end: fmtDate(y, m, d) };
    },
  },
  {
    id: 'this-year', label: 'This Year', icon: CalendarRange,
    get: () => { const { y, m, d } = now(); return { start: fmtDate(y, 1, 1), end: fmtDate(y, m, d) }; },
  },
  { id: 'custom', label: 'Custom Range', icon: SlidersHorizontal, get: null },
];

const ReportFilters = ({ onFetch, loading }) => {
  const init                          = PRESETS[1].get();
  const [activeId,  setActiveId]      = useState('last-month');
  const [startDate, setStartDate]     = useState(init.start);
  const [endDate,   setEndDate]       = useState(init.end);
  const [open,      setOpen]          = useState(false);
  const ref                           = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const pick = (p) => {
    setActiveId(p.id);
    if (p.get) { const { start, end } = p.get(); setStartDate(start); setEndDate(end); setOpen(false); }
  };

  const active   = PRESETS.find((p) => p.id === activeId);
  const isCustom = activeId === 'custom';

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (startDate && endDate) onFetch({ startDate, endDate }); }}
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
            className="flex items-center gap-2 pl-3.5 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 hover:border-indigo-400 hover:bg-white transition-all min-w-[180px] shadow-sm"
          >
            {active && <active.icon size={14} className="text-indigo-500 shrink-0" />}
            <span className="flex-1 text-left">{active?.label}</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-52 bg-white border border-slate-200 shadow-xl py-1 overflow-hidden">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const sel  = activeId === p.id;
                return (
                  <button
                    key={p.id} type="button" onClick={() => pick(p)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      sel ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={14} className={sel ? 'text-indigo-200' : 'text-slate-400'} />
                    <span className="flex-1 text-left font-medium">{p.label}</span>
                    {sel && <Check size={13} className="text-indigo-200" />}
                  </button>
                );
              })}

              {isCustom && (
                <div className="mx-3 my-2 p-3 bg-slate-50 border border-slate-100 space-y-2.5">
                  {[['From', startDate, setStartDate, null, endDate || todayStr()],
                    ['To',   endDate,   setEndDate,   startDate, todayStr()]
                  ].map(([lbl, val, setter, min, max]) => (
                    <div key={lbl}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{lbl}</p>
                      <input
                        type="date" value={val} min={min} max={max}
                        onChange={(e) => setter(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Date range badge ── */}
        {startDate && endDate && (
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Selected Range
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-50 border border-indigo-100 text-sm font-mono font-semibold text-indigo-700">
              <CalendarDays size={13} className="text-indigo-400 shrink-0" />
              <span>{startDate}</span>
              <span className="text-indigo-300 font-sans font-bold">→</span>
              <span>{endDate}</span>
            </div>
          </div>
        )}

        {/* ── Generate button ── */}
        <div className="ml-auto">
          <label className="block text-[10px] font-semibold text-transparent uppercase tracking-widest mb-1.5 select-none">.</label>
          <button
            type="submit"
            disabled={loading || !startDate || !endDate}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200/60"
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

export default ReportFilters;
