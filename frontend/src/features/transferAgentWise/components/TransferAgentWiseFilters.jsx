import { useState, useRef, useEffect, useMemo } from 'react';
import {
  CalendarDays, Calendar, Clock3, SlidersHorizontal,
  ChevronDown, Check, Search, CalendarRange, X, Users, Layers,
} from 'lucide-react';

/* ── Date helpers (string-based, no Date object to avoid UTC shift) ─────────── */
const pad         = (n) => String(n).padStart(2, '0');
const fmtDate     = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

const nowParts = () => {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
};

const todayStr = () => { const { y, m, d } = nowParts(); return fmtDate(y, m, d); };

const addDays = (dateStr, n) => {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, mo - 1, d + n);
  return fmtDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};

/* ── Period Presets ─────────────────────────────────────────────────────────── */
const PRESETS = [
  {
    id: 'today', label: 'Today', icon: CalendarDays, mode: 'date',
    get: () => { const t = todayStr(); return { start: t, end: addDays(t, 1) }; },
  },
  {
    id: 'yesterday', label: 'Yesterday', icon: Calendar, mode: 'date',
    get: () => { const t = todayStr(); return { start: addDays(t, -1), end: t }; },
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
      return { start: fmtDate(py, pm, 1), end: fmtDate(y, m, 1) };
    },
  },
  { id: 'custom-date', label: 'Custom Date Range', icon: SlidersHorizontal, mode: 'date',   get: null },
  { id: 'custom-hour', label: 'Custom Hour Range', icon: Clock3,            mode: 'datetime', get: null },
];

const rangeBadge = (start, end, mode) => {
  if (mode === 'datetime') return `${start}  →  ${end}`;
  const dispEnd = addDays(end, -1);
  return start === dispEnd ? start : `${start}  →  ${dispEnd}`;
};

/* ── Searchable dropdown ────────────────────────────────────────────────────── */
const SearchableDropdown = ({ label, icon: Icon, placeholder, options, value, onChange, color = 'violet' }) => {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const filtered = useMemo(() =>
    options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );

  const ringColor = color === 'amber' ? 'focus:ring-amber-400/30 focus:border-amber-400 hover:border-amber-400' : 'focus:ring-violet-400/30 focus:border-violet-400 hover:border-violet-400';
  const activeBg  = color === 'amber' ? 'bg-amber-600' : 'bg-violet-600';

  return (
    <div className="relative" ref={ref}>
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQuery(''); }}
        className={`flex items-center gap-2 pl-3.5 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 ${ringColor} transition-all min-w-[190px] shadow-sm`}
      >
        {Icon && <Icon size={14} className={`${color === 'amber' ? 'text-amber-500' : 'text-violet-500'} shrink-0`} />}
        <span className="flex-1 text-left truncate max-w-[140px]">
          {value || <span className="text-slate-400 font-normal">{placeholder}</span>}
        </span>
        {value
          ? <X size={13} className="text-slate-400 hover:text-slate-600 shrink-0" onClick={(e) => { e.stopPropagation(); onChange(''); }} />
          : <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        }
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-64 bg-white border border-slate-200 shadow-xl overflow-hidden">
          {/* search */}
          <div className="px-3 py-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all"
            />
          </div>
          {/* all option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
              !value ? `${activeBg} text-white` : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="flex-1 text-left font-medium italic">All {label}s</span>
            {!value && <Check size={13} />}
          </button>
          {/* options */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0
              ? <p className="px-4 py-3 text-xs text-slate-400 text-center">No results</p>
              : filtered.map((opt) => (
                  <button
                    key={opt} type="button"
                    onClick={() => { onChange(opt); setOpen(false); setQuery(''); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                      value === opt ? `${activeBg} text-white` : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex-1 text-left font-medium truncate">{opt}</span>
                    {value === opt && <Check size={13} />}
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main Filters Component ─────────────────────────────────────────────────── */
const TransferAgentWiseFilters = ({
  onFetch,
  loading,
  // Client-side filter props (populated after data loads)
  campaigns = [],
  agents    = [],
  selectedCampaign,
  selectedAgent,
  onCampaignChange,
  onAgentChange,
}) => {
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

  const active       = PRESETS.find((p) => p.id === activeId);
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

  const badge = isCustomHour
    ? (startDatetime && endDatetime ? rangeBadge(startDatetime, endDatetime, 'datetime') : null)
    : (startDate && endDate ? rangeBadge(startDate, endDate, 'date') : null);

  const hasClientFilters = campaigns.length > 0 || agents.length > 0;

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 shadow-sm px-5 py-4 space-y-4">

      {/* ── Row 1: Date controls + Generate button ── */}
      <div className="flex flex-wrap items-end gap-4">

        {/* Period dropdown */}
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
                  <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">Hourly Range</p>
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

        {/* Range badge */}
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

        {/* Generate button */}
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

      {/* ── Row 2: Client-side filters (campaign + agent) ── shown only after data loads */}
      {hasClientFilters && (
        <div className="flex flex-wrap items-end gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest self-center">
            <SlidersHorizontal size={12} />
            <span>Filter Results</span>
          </div>

          {campaigns.length > 0 && (
            <SearchableDropdown
              label="Campaign"
              icon={Layers}
              placeholder="All Campaigns"
              options={campaigns}
              value={selectedCampaign}
              onChange={onCampaignChange}
              color="violet"
            />
          )}

          {agents.length > 0 && (
            <SearchableDropdown
              label="Agent"
              icon={Users}
              placeholder="All Agents"
              options={agents}
              value={selectedAgent}
              onChange={onAgentChange}
              color="amber"
            />
          )}

          {(selectedCampaign || selectedAgent) && (
            <button
              type="button"
              onClick={() => { onCampaignChange(''); onAgentChange(''); }}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-500 border border-slate-200 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all self-end"
            >
              <X size={12} />
              Clear Filters
            </button>
          )}
        </div>
      )}
    </form>
  );
};

export default TransferAgentWiseFilters;
