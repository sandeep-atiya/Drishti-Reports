import { useState, useMemo } from 'react';
import {
  Phone, ShoppingCart, BadgeCheck, IndianRupee,
  BarChart2, Menu, AlertCircle, FileSpreadsheet, TrendingUp, Users,
} from 'lucide-react';
import { useSalesConversion }             from '../hooks/useSalesConversion';
import SalesConversionFilters             from '../components/SalesConversionFilters';
import SalesConversionTable               from '../components/SalesConversionTable';
import { exportSalesConversionToExcel }   from '../utils/salesConversionHelpers';

const abbr = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  return n.toLocaleString('en-IN');
};
const abbrCurrency = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const KpiCard = ({ icon, label, value, sub, color }) => {
  const IconEl = icon;
  const styles = {
    blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    bar: 'bg-blue-500',    val: 'text-blue-700'    },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', bar: 'bg-emerald-500', val: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   bar: 'bg-amber-500',   val: 'text-amber-700'   },
    purple:  { bg: 'bg-purple-50',  icon: 'text-purple-600',  bar: 'bg-purple-500',  val: 'text-purple-700'  },
    slate:   { bg: 'bg-slate-100',  icon: 'text-slate-600',   bar: 'bg-slate-500',   val: 'text-slate-700'   },
    sky:     { bg: 'bg-sky-50',     icon: 'text-sky-600',     bar: 'bg-sky-500',     val: 'text-sky-700'     },
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

const Skeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {['blue','emerald','amber','slate','purple','sky'].map((c) => (
        <div key={c} className="bg-white border border-slate-200 shadow-sm overflow-hidden h-24">
          <div className="h-1 bg-slate-200" />
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
      <div className="h-10 bg-slate-200" />
      <div className="h-12 bg-slate-800/80" />
      {[...Array(8)].map((_, i) => (
        <div key={i} className={`h-12 border-b border-slate-100 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`} />
      ))}
    </div>
  </div>
);

const TABS = [
  { id: 'overall',         label: 'Overall',         key: 'overall',         isOverall: true  },
  { id: 'unayur_in',       label: 'Unayur_IN',       key: 'unayur_in',       isOverall: false },
  { id: 'inbound_2',       label: 'Inbound_2',       key: 'inbound_2',       isOverall: false },
  { id: 'digital_inbound', label: 'Digital Inbound', key: 'digital_inbound', isOverall: false },
  { id: 'group_a',         label: 'Group A',         key: 'group_a',         isOverall: false },
];

const useSheetKpi = (rows) => useMemo(() => {
  if (!rows?.length) return null;
  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const calls          = sum('Calls');
  const orders         = sum('Orders');
  const verified       = sum('Verified');
  const verifiedAmount = sum('Verified Amount');
  const agents         = new Set(rows.map((r) => r["Agent's Name"])).size;
  const overallVerPct  = orders  > 0 ? `${((verified / orders) * 100).toFixed(1)}%` : '0.0%';
  const overallOrdCon  = calls   > 0 ? `${((orders  / calls)  * 100).toFixed(1)}%` : '0.0%';
  const avgTicket      = verified > 0 ? Math.round(verifiedAmount / verified) : 0;
  const avgRpc         = calls   > 0 ? Math.round(verifiedAmount / calls)    : 0;
  return { calls, orders, verified, verifiedAmount, agents, overallVerPct, overallOrdCon, avgTicket, avgRpc };
}, [rows]);

const SalesConversionPage = ({ onMenuToggle }) => {
  const { data, loading, loadingMsg, error, fetchReport } = useSalesConversion();
  const [activeTab, setActiveTab] = useState('overall');

  const activeTabDef  = TABS.find((t) => t.id === activeTab);
  const activeRows    = data ? (data[activeTabDef?.key] || []) : [];
  const kpi           = useSheetKpi(activeRows);

  const tabCount = (key) => (data ? (data[key] || []).length : null);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center h-14 px-4 sm:px-6 gap-3 max-w-screen-2xl mx-auto">
          <button onClick={onMenuToggle} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 transition-colors">
            <Menu size={19} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <span>Reports</span><span>/</span>
              <span className="text-slate-600 font-medium">Sales Conversion</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-800">Sales Conversion Report</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 bg-blue-500 animate-pulse" />Live
              </span>
            </div>
          </div>
          {data && (
            <button
              onClick={() => exportSalesConversionToExcel({
                columns:         data.columns,
                columnsOverall:  data.columnsOverall,
                overall:         data.overall,
                unayur_in:       data.unayur_in,
                inbound_2:       data.inbound_2,
                digital_inbound: data.digital_inbound,
                group_a:         data.group_a,
                startDate:       data.startDate,
                endDate:         data.endDate,
              })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm shadow-blue-200 shrink-0"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto w-full">
        <SalesConversionFilters onFetch={fetchReport} loading={loading} />

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 px-4 py-4">
            <AlertCircle size={17} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Failed to fetch report</p>
              <p className="text-sm text-red-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {loadingMsg && (
              <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shrink-0" />
                {loadingMsg}
              </div>
            )}
            <Skeleton />
          </div>
        )}

        {!loading && data && (
          <div className="space-y-5">
            {/* Campaign Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto bg-white border border-slate-200 shadow-sm px-2 py-2">
              {TABS.map((tab) => {
                const count = tabCount(tab.key);
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                    {count !== null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 min-w-[20px] text-center ${
                        activeTab === tab.id ? 'bg-blue-500 text-blue-100' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* KPI Cards */}
            {kpi && (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                <KpiCard icon={Phone}        label="Total Calls"     color="slate"
                  value={abbr(kpi.calls)}
                  sub={`${kpi.agents} agent${kpi.agents !== 1 ? 's' : ''}`}
                />
                <KpiCard icon={ShoppingCart} label="Total Orders"    color="blue"
                  value={abbr(kpi.orders)}
                  sub={`Order Con: ${kpi.overallOrdCon}`}
                />
                <KpiCard icon={BadgeCheck}   label="Total Verified"  color="emerald"
                  value={abbr(kpi.verified)}
                  sub={`Verification: ${kpi.overallVerPct}`}
                />
                <KpiCard icon={IndianRupee}  label="Verified Amount" color="amber"
                  value={abbrCurrency(kpi.verifiedAmount)}
                  sub={`Avg Ticket: ₹${abbr(kpi.avgTicket)}`}
                />
                <KpiCard icon={TrendingUp}   label="Avg Ticket Size" color="sky"
                  value={`₹${abbr(kpi.avgTicket)}`}
                  sub="Verified Amt ÷ Verified"
                />
                <KpiCard icon={BarChart2}    label="Avg RPC"         color="purple"
                  value={`₹${abbr(kpi.avgRpc)}`}
                  sub="Verified Amt ÷ Total Calls"
                />
              </div>
            )}

            {/* Summary banner */}
            {kpi && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-md shadow-blue-200">
                <div className="flex items-center gap-3">
                  <BadgeCheck size={22} className="text-blue-200 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-blue-200">Overall Verification Rate</p>
                    <p className="text-3xl font-black tabular-nums leading-tight">{kpi.overallVerPct}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-8 text-sm">
                  <div><p className="text-blue-200 text-[11px] font-semibold uppercase tracking-wide">Total Calls</p><p className="font-bold tabular-nums">{kpi.calls.toLocaleString('en-IN')}</p></div>
                  <div><p className="text-blue-200 text-[11px] font-semibold uppercase tracking-wide">Total Orders</p><p className="font-bold tabular-nums">{kpi.orders.toLocaleString('en-IN')}</p></div>
                  <div><p className="text-blue-200 text-[11px] font-semibold uppercase tracking-wide">Verified Orders</p><p className="font-bold tabular-nums">{kpi.verified.toLocaleString('en-IN')}</p></div>
                  <div><p className="text-blue-200 text-[11px] font-semibold uppercase tracking-wide">Verified Amount</p><p className="font-bold tabular-nums">{abbrCurrency(kpi.verifiedAmount)}</p></div>
                  <div><p className="text-blue-200 text-[11px] font-semibold uppercase tracking-wide">Date Range</p><p className="font-bold font-mono text-xs">{data.startDate} → {data.endDate}</p></div>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-blue-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    {activeTabDef?.label} — Agent Breakdown
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 font-bold bg-blue-100 text-blue-700 min-w-[22px] text-center">
                    {activeRows.length}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 animate-pulse shrink-0" />
                  <span className="text-xs font-medium text-slate-500 font-mono">
                    {data.startDate} — {data.endDate}
                  </span>
                </div>
              </div>
              <SalesConversionTable rows={activeRows} isOverall={activeTabDef?.isOverall} />
            </div>
          </div>
        )}

        {!data && !loading && !error && (
          <div className="bg-white border border-slate-200 shadow-sm py-20 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 flex items-center justify-center">
              <Users size={30} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-700">No report generated</p>
              <p className="text-sm text-slate-400 mt-1.5 max-w-xs">
                Select a period and click{' '}
                <span className="font-semibold text-blue-600">Generate Report</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesConversionPage;
