import { useState } from 'react';
import {
  Phone, ShoppingCart, CheckCircle, TrendingUp,
  Download, BarChart2, Users, Menu, AlertCircle, FileSpreadsheet,
} from 'lucide-react';
import { useReports }    from '../hooks/useReports';
import ReportFilters     from '../components/ReportFilters';
import ReportTable       from '../components/ReportTable';
import { exportToExcel, formatCurrency, formatNumber } from '../utils/reportHelpers';

/* ── compact abbreviation for large numbers ── */
const abbr = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  return n.toLocaleString('en-IN');
};

/* ══════════════════════════════════════════════
   KPI Card
══════════════════════════════════════════════ */
const KpiCard = ({ icon: Icon, label, value, sub, color }) => {
  const styles = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   bar: 'bg-blue-500',   val: 'text-blue-700'  },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', bar: 'bg-violet-500', val: 'text-violet-700'},
    green:  { bg: 'bg-emerald-50',icon: 'text-emerald-600',bar: 'bg-emerald-500',val: 'text-emerald-700'},
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', bar: 'bg-orange-500', val: 'text-orange-700'},
  }[color];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
      {/* top accent bar */}
      <div className={`h-1 ${styles.bar}`} />
      <div className="p-4 sm:p-5 flex items-center gap-4 flex-1">
        {/* icon */}
        <div className={`w-11 h-11 rounded-xl ${styles.bg} flex items-center justify-center shrink-0`}>
          <Icon size={20} className={styles.icon} />
        </div>
        {/* text — min-w-0 prevents overflow */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
          <p className={`text-xl font-black mt-0.5 leading-tight tabular-nums truncate ${styles.val}`}>{value}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-1 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   Tab Button
══════════════════════════════════════════════ */
const Tab = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
      active
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
    }`}
  >
    <Icon size={15} />
    <span className="hidden sm:inline">{label}</span>
    <span className="sm:hidden">{label.split(' ')[0]}</span>
    <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold min-w-[22px] text-center ${
      active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
    }`}>{count}</span>
  </button>
);

/* ══════════════════════════════════════════════
   Skeleton
══════════════════════════════════════════════ */
const Skeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {['blue','violet','green','orange'].map((c) => (
        <div key={c} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-24">
          <div className={`h-1 ${c === 'blue' ? 'bg-blue-200' : c === 'violet' ? 'bg-violet-200' : c === 'green' ? 'bg-emerald-200' : 'bg-orange-200'}`} />
          <div className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 bg-slate-100 rounded w-3/4" />
              <div className="h-5 bg-slate-200 rounded w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="h-12 bg-slate-100 border-b border-slate-200" />
      <div className="h-10 bg-slate-800/80" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`h-12 border-b border-slate-100 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`} />
      ))}
    </div>
  </div>
);

/* ══════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════ */
const ReportsPage = ({ onMenuToggle }) => {
  const { data, loading, error, fetchReport } = useReports();
  const [activeTab, setActiveTab] = useState('campaign');

  /* Aggregate campaign-level KPIs */
  const kpi = (() => {
    if (!data?.campaignReport?.length) return null;
    const r   = data.campaignReport;
    const sum = (k) => r.reduce((s, row) => s + (Number(row[k]) || 0), 0);
    const calls    = sum('Calls');
    const orders   = sum('Orders');
    const verified = sum('Verified');
    const revenue  = sum('Verified Amount');
    return { calls, orders, verified, revenue };
  })();

  const rows = data ? (activeTab === 'campaign' ? data.campaignReport : data.agentReport) : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ══ Top Bar ══ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center h-14 px-4 sm:px-6 gap-3 max-w-screen-2xl mx-auto">

          <button onClick={onMenuToggle} className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
            <Menu size={19} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <span>Reports</span>
              <span>/</span>
              <span className="text-slate-600 font-medium">Drishti Report</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-800">Drishti Report</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
          </div>

          {data && (
            <button
              onClick={() => exportToExcel({ columns: data.columns, campaignReport: data.campaignReport, agentReport: data.agentReport, startDate: data.startDate, endDate: data.endDate })}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 active:scale-[0.97] transition-all shadow-sm shadow-emerald-200 shrink-0"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </header>

      {/* ══ Page Body ══ */}
      <div className="flex-1 p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto w-full">

        {/* Filter */}
        <ReportFilters onFetch={fetchReport} loading={loading} />

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4">
            <AlertCircle size={17} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Failed to fetch report</p>
              <p className="text-sm text-red-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Skeleton */}
        {loading && <Skeleton />}

        {/* ── Data ── */}
        {!loading && data && (
          <div className="space-y-5">

            {/* KPI cards */}
            {kpi && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <KpiCard
                  icon={Phone}        label="Total Calls"    color="blue"
                  value={abbr(kpi.calls)}
                  sub={`${kpi.calls.toLocaleString('en-IN')} total calls`}
                />
                <KpiCard
                  icon={ShoppingCart} label="Total Orders"   color="violet"
                  value={abbr(kpi.orders)}
                  sub={`${kpi.calls ? Math.round((kpi.orders / kpi.calls) * 100) : 0}% order conversion`}
                />
                <KpiCard
                  icon={CheckCircle}  label="Verified Orders" color="green"
                  value={abbr(kpi.verified)}
                  sub={`${kpi.orders ? Math.round((kpi.verified / kpi.orders) * 100) : 0}% verified`}
                />
                <KpiCard
                  icon={TrendingUp}   label="Total Revenue"  color="orange"
                  value={`₹${abbr(kpi.revenue)}`}
                  sub={`₹${kpi.calls ? Math.round(kpi.revenue / kpi.calls).toLocaleString('en-IN') : 0} / call`}
                />
              </div>
            )}

            {/* Report table card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

              {/* Tab bar */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50">
                <div className="flex">
                  <Tab active={activeTab === 'campaign'} onClick={() => setActiveTab('campaign')} icon={BarChart2} label="Campaign Report" count={data.campaignReport.length} />
                  <Tab active={activeTab === 'agent'}    onClick={() => setActiveTab('agent')}    icon={Users}    label="Agent Report"    count={data.agentReport.length}    />
                </div>
                <div className="px-4 hidden sm:flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs font-medium text-slate-500 font-mono">{data.startDate} — {data.endDate}</span>
                </div>
              </div>

              {/* Table — no extra padding so it fills the card */}
              <ReportTable rows={rows} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-20 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <BarChart2 size={30} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-700">No report generated</p>
              <p className="text-sm text-slate-400 mt-1.5 max-w-xs">
                Select a period from the dropdown and click{' '}
                <span className="font-semibold text-indigo-600">Generate Report</span>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReportsPage;
