import { useState } from 'react';
import { Phone, PhoneCall, PhoneOff, Clock, AlertTriangle, Users, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { RAW_COLUMNS } from '../utils/rawDataHelpers';
import { fetchRawData } from '../services/rawData.api';

// ── Write Excel from a row array ──────────────────────────────────────────────
const writeExcel = (kpiRows, label, startDate, endDate) => {
  const headers = RAW_COLUMNS.map((c) => c.label);
  const body    = kpiRows.map((r) => RAW_COLUMNS.map((c) => r[c.key] ?? ''));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  ws['!cols'] = RAW_COLUMNS.map((c) => {
    const maxLen = Math.max(
      c.label.length,
      ...kpiRows.slice(0, 200).map((r) => String(r[c.key] ?? '').length),
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });

  const wb   = XLSX.utils.book_new();
  const safe = label.replace(/[:/\\?*[\]]/g, '_').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safe);
  const fileName = `${label.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// ── KPI row filter functions (applied after fetching all rows) ────────────────
const KPI_FILTERS = {
  'Total Calls':     () => true,
  'Connected':       (r) => String(r.ch_system_disposition || '').toUpperCase() === 'CONNECTED',
  'Not Connected':   (r) => String(r.ch_system_disposition || '').toUpperCase() !== 'CONNECTED',
  'Avg Talk Time':   (r) => String(r.ch_system_disposition || '').toUpperCase() === 'CONNECTED',
  'Call Drops':      (r) => {
    const d = String(r.udh_disposition_code || '').toUpperCase();
    return d === 'CALL_DROP' || d === 'CALL DROP';
  },
};

// ── Color style map ───────────────────────────────────────────────────────────
const STYLES = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   bar: 'bg-blue-500',   val: 'text-blue-700',   btn: 'text-blue-500 hover:bg-blue-50'   },
  green:  { bg: 'bg-emerald-50',icon: 'text-emerald-500',bar: 'bg-emerald-500',val: 'text-emerald-700', btn: 'text-emerald-500 hover:bg-emerald-50' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-500', bar: 'bg-orange-500', val: 'text-orange-700',  btn: 'text-orange-500 hover:bg-orange-50'  },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-500', bar: 'bg-violet-500', val: 'text-violet-700',  btn: 'text-violet-500 hover:bg-violet-50'  },
  red:    { bg: 'bg-red-50',    icon: 'text-red-500',    bar: 'bg-red-500',    val: 'text-red-700',     btn: 'text-red-500 hover:bg-red-50'         },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-500', bar: 'bg-indigo-500', val: 'text-indigo-700',  btn: 'text-indigo-500 hover:bg-indigo-50'  },
};

// ── Single KPI card ───────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color, icon: Icon, canDownload, fetchParams, startDate, endDate }) => {
  const [dlLoading, setDlLoading] = useState(false);
  const s = STYLES[color] || STYLES.blue;

  const handleDownload = async () => {
    if (!canDownload || !fetchParams) return;
    setDlLoading(true);
    try {
      // Fetch ALL rows (no limit) using the same filters
      const response = await fetchRawData({ ...fetchParams, limit: 0 });
      const allRows  = response?.rows ?? [];

      // Apply KPI-specific row filter
      const filterFn  = KPI_FILTERS[label] ?? (() => true);
      const kpiRows   = allRows.filter(filterFn);

      if (kpiRows.length === 0) {
        alert('No rows found for this KPI.');
        return;
      }
      writeExcel(kpiRows, label, startDate, endDate);
    } catch (err) {
      alert('Download failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDlLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col min-h-[130px] group">
      {/* Colored accent bar */}
      <div className={`h-1.5 ${s.bar}`} />

      <div className="px-4 pt-4 pb-3 flex items-start gap-3 flex-1">
        {/* Icon bubble */}
        <div className={`w-11 h-11 ${s.bg} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon size={20} className={s.icon} />
        </div>

        {/* Text block */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">
            {label}
          </p>
          <p className={`text-[1.6rem] font-black leading-none tabular-nums ${s.val}`}>
            {value}
          </p>
          {sub && (
            <p className="text-[11px] text-slate-400 mt-1.5 leading-tight">{sub}</p>
          )}
        </div>
      </div>

      {/* Download footer */}
      {canDownload && (
        <button
          type="button"
          disabled={dlLoading}
          onClick={handleDownload}
          title={`Download all ${label} records (no row limit)`}
          className={`flex items-center gap-1.5 px-4 py-2 border-t border-slate-100 text-[10px] font-semibold text-slate-400 ${s.btn} transition-colors w-full disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {dlLoading
            ? <><Loader2 size={11} className="animate-spin" /><span>Fetching all rows…</span></>
            : <><Download size={11} /><span>Download all rows</span></>
          }
        </button>
      )}
    </div>
  );
};

// ── Main KPI cards section ────────────────────────────────────────────────────
const RawDataKpiCards = ({ rows, startDate, endDate, fetchParams }) => {
  if (!rows?.length) return null;

  // Compute display values from in-memory rows (for the card numbers)
  const connected  = rows.filter((r) => String(r.ch_system_disposition || '').toUpperCase() === 'CONNECTED');
  const notConn    = rows.filter((r) => String(r.ch_system_disposition || '').toUpperCase() !== 'CONNECTED');
  const callDrops  = rows.filter((r) => {
    const d = String(r.udh_disposition_code || '').toUpperCase();
    return d === 'CALL_DROP' || d === 'CALL DROP';
  });

  const talkTimes = connected
    .map((r) => Number(r.udh_talk_time))
    .filter((v) => !isNaN(v) && v > 0);
  const avgTalkSec = talkTimes.length > 0
    ? (talkTimes.reduce((a, b) => a + b, 0) / talkTimes.length / 1000).toFixed(1)
    : null;

  const uniqueAgents = new Set(rows.map((r) => r.udh_user_id).filter(Boolean)).size;
  const connPct      = ((connected.length / rows.length) * 100).toFixed(1);

  const KPIS = [
    {
      label:       'Total Calls',
      value:       rows.length.toLocaleString('en-IN'),
      sub:         `${uniqueAgents} agent${uniqueAgents !== 1 ? 's' : ''}  ·  ${startDate}`,
      color:       'blue',
      icon:        Phone,
      canDownload: true,
    },
    {
      label:       'Connected',
      value:       connected.length.toLocaleString('en-IN'),
      sub:         `${connPct}% connection rate`,
      color:       'green',
      icon:        PhoneCall,
      canDownload: true,
    },
    {
      label:       'Not Connected',
      value:       notConn.length.toLocaleString('en-IN'),
      sub:         `${(100 - parseFloat(connPct)).toFixed(1)}% of total`,
      color:       'orange',
      icon:        PhoneOff,
      canDownload: true,
    },
    {
      label:       'Avg Talk Time',
      value:       avgTalkSec ? `${avgTalkSec}s` : '—',
      sub:         `over ${talkTimes.length.toLocaleString('en-IN')} connected calls`,
      color:       'violet',
      icon:        Clock,
      canDownload: talkTimes.length > 0,
    },
    {
      label:       'Call Drops',
      value:       callDrops.length.toLocaleString('en-IN'),
      sub:         callDrops.length > 0
        ? `${((callDrops.length / rows.length) * 100).toFixed(1)}% of total`
        : 'none detected',
      color:       'red',
      icon:        AlertTriangle,
      canDownload: callDrops.length > 0,
    },
    {
      label:       'Unique Agents',
      value:       uniqueAgents.toLocaleString('en-IN'),
      sub:         `${rows.length.toLocaleString('en-IN')} total interactions`,
      color:       'indigo',
      icon:        Users,
      canDownload: false,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Summary KPIs
        </span>
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-[10px] text-slate-300 font-mono">
          {rows.length.toLocaleString('en-IN')} rows in view
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPIS.map((kpi) => (
          <KpiCard
            key={kpi.label}
            {...kpi}
            fetchParams={fetchParams}
            startDate={startDate}
            endDate={endDate}
          />
        ))}
      </div>
    </div>
  );
};

export default RawDataKpiCards;
