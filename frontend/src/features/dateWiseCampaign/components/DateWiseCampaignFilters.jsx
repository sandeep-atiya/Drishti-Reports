import { useState, useRef, useEffect } from 'react';
import {
  CalendarDays, Calendar, CalendarRange, SlidersHorizontal,
  Clock3, ChevronDown, Check, Search,
} from 'lucide-react';

const pad     = (n) => String(n).padStart(2, '0');
const fmtDate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const nowParts = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; };
const todayStr = () => { const { y, m, d } = nowParts(); return fmtDate(y, m, d); };
const addDays  = (dateStr, n) => {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, mo - 1, d + n);
  return fmtDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};
const startOfWeek = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt  = new Date(y, m - 1, d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return fmtDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};

const PRESETS = [
  { id: 'today',         label: 'Today',           icon: CalendarDays,    mode: 'date',
    get: () => { const t = todayStr(); return { start: t, end: addDays(t, 1) }; } },
  { id: 'yesterday',     label: 'Yesterday',       icon: Calendar,        mode: 'date',
    get: () => { const t = todayStr(); const y = addDays(t, -1); return { start: y, end: t }; } },
  { id: 'this-week',     label: 'This Week',       icon: CalendarRange,   mode: 'date',
    get: () => { const t = todayStr(); const mon = startOfWeek(t); return { start: mon, end: addDays(t, 1) }; } },
  { id: 'last-week',     label: 'Last Week',       icon: CalendarRange,   mode: 'date',
    get: () => { const t = todayStr(); const mon = startOfWeek(t); const lastMon = addDays(mon, -7); return { start: lastMon, end: mon }; } },
  { id: 'this-month',    label: 'This Month',      icon: CalendarDays,    mode: 'date',
    get: () => { const { y, m } = nowParts(); return { start: fmtDate(y, m, 1), end: addDays(todayStr(), 1) }; } },
  { id: 'last-month',    label: 'Last Month',      icon: CalendarRange,   mode: 'date',
    get: () => { const { y, m } = nowParts(); const pm = m === 1 ? 12 : m - 1; const py = m === 1 ? y - 1 : y; return { start: fmtDate(py, pm, 1), end: fmtDate(y, m, 1) }; } },
  { id: 'last-3-months', label: 'Last 3 Months',  icon: CalendarRange,   mode: 'date',
    get: () => { const { y, m } = nowParts(); let pm = m - 3; let py = y; if (pm <= 0) { pm += 12; py -= 1; } return { start: fmtDate(py, pm, 1), end: fmtDate(y, m, 1) }; } },
  { id: 'custom-date',   label: 'Custom Date Range', icon: SlidersHorizontal, mode: 'date', get: null },
  { id: 'custom-hour',   label: 'Custom Hour Range', icon: Clock3,           mode: 'datetime', get: null },
];

const rangeBadge = (start, end, mode) => {
  if (mode === 'datetime') return `${start}  →  ${end}`;
  const dispEnd = addDays(end, -1);
  return start === dispEnd ? start : `${start}  →  ${dispEnd}`;
};

const DateWiseCampaignFilters = ({ onFetch, loading }) => {
  const [activeId,      setActiveId]      = useState('this-month');
  const [startDate,     setStartDate]     = useState(() => PRESETS.find(p => p.id === 'this-month').get().start);
  const [endDate,       setEndDate]       = useState(() => PRESETS.find(p => p.id === 'this-month').get().end);
  const [startDatetime, setStartDatetime] = useState('');
  const [endDatetime,   setEndDatetime]   = useState('');
  const [open,          setOpen]          = useState(false);

  const dropRef = useRef(null);
  const active       = PRESETS.find((p) => p.id === activeId);
  const isCustomDate = activeId === 'custom-date';
  const isCustomHour = activeId === 'custom-hour';

  useEffect(() => {
    const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const pick = (p) => {
    setActiveId(p.id);
    if (p.get) { const { start, end } = p.get(); setStartDate(start); setEndDate(end); setOpen(false); }
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
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 shadow-sm px-5 py-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="relative" ref={dropRef}>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Period</label>
          <button
            type="button" onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 pl-3.5 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:bg-white transition-all min-w-[200px] shadow-sm"
          >
            {active && <active.icon size={14} className="text-blue-500 shrink-0" />}
            <span className="flex-1 text-left">{active?.label}</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-64 bg-white border border-slate-200 shadow-xl py-1 overflow-hidden">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const sel  = activeId === p.id;
                return (
                  <button key={p.id} type="button" onClick={() => pick(p)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${sel ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <Icon size={14} className={sel ? 'text-blue-200' : 'text-slate-400'} />
                    <span className="flex-1 text-left font-medium">{p.label}</span>
                    {p.mode === 'datetime' && !sel && <span className="text-[10px] text-slate-400 font-semibold border border-slate-200 px-1.5 py-0.5">HR</span>}
                    {sel && <Check size={13} className="text-blue-200" />}
                  </button>
                );
              })}
              {isCustomDate && (
                <div className="mx-3 my-2 p-3 bg-slate-50 border border-slate-100 space-y-2.5">
                  {[
                    ['From', startDate, setStartDate, null, endDate || todayStr()],
                    ['To', endDate ? addDays(endDate, -1) : '', (v) => setEndDate(addDays(v, 1)), startDate, todayStr()],
                  ].map(([lbl, val, setter, min, max]) => (
                    <div key={lbl}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{lbl}</p>
                      <input type="date" value={val} min={min || undefined} max={max}
                        onChange={(e) => setter(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
                      />
                    </div>
                  ))}
                </div>
              )}
              {isCustomHour && (
                <div className="mx-3 my-2 p-3 bg-slate-50 border border-slate-100 space-y-2.5">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Hourly Range</p>
                  {[['From', startDatetime, setStartDatetime], ['To', endDatetime, setEndDatetime]].map(([lbl, val, setter]) => (
                    <div key={lbl}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{lbl}</p>
                      <input type="datetime-local" value={val} onChange={(e) => setter(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {badge && (
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Selected Range</label>
            <div className={`flex items-center gap-2 px-3.5 py-2.5 border text-sm font-mono font-semibold ${isCustomHour ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
              {isCustomHour ? <Clock3 size={13} className="text-amber-400 shrink-0" /> : <CalendarDays size={13} className="text-blue-400 shrink-0" />}
              <span className="text-xs">{badge}</span>
            </div>
          </div>
        )}

        <div className="ml-auto">
          <label className="block text-[10px] font-semibold text-transparent uppercase tracking-widest mb-1.5 select-none">.</label>
          <button
            type="submit" disabled={loading || !canSubmit}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200/60"
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

export default DateWiseCampaignFilters;
