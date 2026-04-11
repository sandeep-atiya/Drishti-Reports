import { useMemo } from 'react';
import {
  Phone, PhoneOff, AlertTriangle, Server,
  BarChart2, Menu, AlertCircle, FileSpreadsheet, TrendingDown,
} from 'lucide-react';
import { useSelfHangup }          from '../hooks/useSelfHangup';
import SelfHangupFilters          from '../components/SelfHangupFilters';
import SelfHangupTable            from '../components/SelfHangupTable';
import { exportSelfHangupToExcel } from '../utils/selfHangupHelpers';

/* ── Number abbreviation ─────────────────────────────────────────────────── */
const abbr = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  return n.toLocaleString('en-IN');
};

/* ── KPI Card ────────────────────────────────────────────────────────────── */
const KpiCard = ({ icon, label, value, sub, color }) => {
  const IconEl = icon;
  const styles = {
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', bar: 'bg-orange-500',  val: 'text-orange-700' },
    red:    { bg: 'bg-red-50',    icon: 'text-red-600',    bar: 'bg-red-500',     val: 'text-red-700'    },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  bar: 'bg-amber-500',   val: 'text-amber-700'  },
    slate:  { bg: 'bg-slate-100', icon: 'text-slate-600',  bar: 'bg-slate-500',   val: 'text-slate-700'  },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   bar: 'bg-blue-500',    val: 'text-blue-700'   },
  }[color] || {};

  return (
    <div className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col min-h-[140px]">
      <div className={`h-1.5 ${styles.bar}`} />
      <div className="px-6 py-5 flex items-center gap-5 flex-1">
        <div className={`w-14 h-14 ${styles.bg} flex items-center justify-center shrink-0`}>
          <IconEl size={24} className={styles.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
          <p className={`text-2xl font-black mt-1 leading-tight tabular-nums truncate ${styles.val}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-2 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
};

/* ── Skeleton ────────────────────────────────────────────────────────────── */
const Skeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {['orange', 'red', 'amber', 'slate'].map((c) => (
        <div key={c} className="bg-white border border-slate-200 shadow-sm overflow-hidden h-24">
          <div className={`h-1 ${
            c === 'orange' ? 'bg-orange-200' : c === 'red' ? 'bg-red-200' :
            c === 'amber'  ? 'bg-amber-200'  : 'bg-slate-200'
          }`} />
          <div className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 bg-slate-100 w-3/4" />
              <div className="h-5 bg-slate-200 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="h-12 bg-slate-800/80" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className={`h-12 border-b border-slate-100 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`} />
      ))}
    </div>
  </div>
);

/* ── Main Page ───────────────────────────────────────────────────────────── */
const SelfHangupPage = ({ onMenuToggle }) => {
  const { data, loading, loadingMsg, error, fetchReport } = useSelfHangup();

  /* Aggregate KPIs */
  const kpi = useMemo(() => {
    if (!data?.rows?.length) return null;
    const r        = data.rows;
    const sum      = (k) => r.reduce((s, row) => s + (Number(row[k]) || 0), 0);
    const grand    = sum('Grand Total');
    const self     = sum('Total Self Hangup');
    const ahPhone  = sum('AGENT_HANGUP_PHONE');
    const ahUi     = sum('AGENT_HANGUP_UI');
    const agents   = r.length;
    const selfPct  = grand > 0 ? `${((self / grand) * 100).toFixed(1)}%` : '0.0%';
    return { grand, self, ahPhone, ahUi, agents, selfPct };
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top Bar ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center h-14 px-4 sm:px-6 gap-3 max-w-screen-2xl mx-auto">

          <button onClick={onMenuToggle} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 transition-colors">
            <Menu size={19} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <span>Reports</span>
              <span>/</span>
              <span className="text-slate-600 font-medium">Self Hangup</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-800">Self Hangup Report</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 bg-orange-500 animate-pulse" />
                Live
              </span>
            </div>
          </div>

          {data && (
            <button
              onClick={() => exportSelfHangupToExcel({
                columns:      data.columns,
                rows:         data.rows,
                startDate:    data.startDate,
                endDate:      data.endDate,
                campaignName: data.campaignName,
              })}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 active:scale-[0.97] transition-all shadow-sm shadow-orange-200 shrink-0"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Page Body ── */}
      <div className="flex-1 p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto w-full">

        {/* Filters */}
        <SelfHangupFilters onFetch={fetchReport} loading={loading} />

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 px-4 py-4">
            <AlertCircle size={17} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Failed to fetch report</p>
              <p className="text-sm text-red-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {loadingMsg && (
              <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shrink-0" />
                {loadingMsg}
              </div>
            )}
            <Skeleton />
          </div>
        )}

        {/* Data */}
        {!loading && data && (
          <div className="space-y-5">

            {/* KPI cards */}
            {kpi && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <KpiCard
                  icon={Phone}        label="Grand Total Calls"   color="slate"
                  value={abbr(kpi.grand)}
                  sub={`${kpi.agents} agent${kpi.agents !== 1 ? 's' : ''}`}
                />
                <KpiCard
                  icon={PhoneOff}     label="Total Self Hangup"   color="orange"
                  value={abbr(kpi.self)}
                  sub={`${kpi.selfPct} of grand total`}
                />
                <KpiCard
                  icon={AlertTriangle} label="Agent Hangup Phone"  color="red"
                  value={abbr(kpi.ahPhone)}
                  sub={`${kpi.grand > 0 ? ((kpi.ahPhone / kpi.grand) * 100).toFixed(1) : 0}% of total`}
                />
                <KpiCard
                  icon={Server}       label="Agent Hangup UI"     color="amber"
                  value={abbr(kpi.ahUi)}
                  sub={`${kpi.grand > 0 ? ((kpi.ahUi / kpi.grand) * 100).toFixed(1) : 0}% of total`}
                />
              </div>
            )}

            {/* Self Hangup % highlight banner */}
            {kpi && (
              <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-md shadow-orange-200">
                <div className="flex items-center gap-3">
                  <TrendingDown size={22} className="text-orange-200 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-orange-200">Overall Self Hangup Rate</p>
                    <p className="text-3xl font-black tabular-nums leading-tight">{kpi.selfPct}</p>
                  </div>
                </div>
                <div className="flex gap-8 text-sm">
                  <div>
                    <p className="text-orange-200 text-[11px] font-semibold uppercase tracking-wide">Total Self</p>
                    <p className="font-bold tabular-nums">{kpi.self.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-orange-200 text-[11px] font-semibold uppercase tracking-wide">Grand Total</p>
                    <p className="font-bold tabular-nums">{kpi.grand.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-orange-200 text-[11px] font-semibold uppercase tracking-wide">Date Range</p>
                    <p className="font-bold font-mono text-xs">{data.startDate} → {data.endDate}</p>
                  </div>
                  {data.campaignName && (
                    <div>
                      <p className="text-orange-200 text-[11px] font-semibold uppercase tracking-wide">Campaign</p>
                      <p className="font-bold text-xs truncate max-w-[160px]">{data.campaignName}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Agent table */}
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <BarChart2 size={15} className="text-orange-500" />
                  <span className="text-sm font-semibold text-slate-700">Agent Hangup Breakdown</span>
                  <span className="text-[11px] px-1.5 py-0.5 font-bold bg-orange-100 text-orange-700 min-w-[22px] text-center">
                    {data.rows.length}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-400 animate-pulse shrink-0" />
                  <span className="text-xs font-medium text-slate-500 font-mono">
                    {data.startDate} — {data.endDate}
                  </span>
                </div>
              </div>

              <SelfHangupTable rows={data.rows} />
            </div>

          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="bg-white border border-slate-200 shadow-sm py-20 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 flex items-center justify-center">
              <PhoneOff size={30} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-700">No report generated</p>
              <p className="text-sm text-slate-400 mt-1.5 max-w-xs">
                Select a period and click{' '}
                <span className="font-semibold text-orange-600">Generate Report</span>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SelfHangupPage;
