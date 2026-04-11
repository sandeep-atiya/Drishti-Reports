import { useMemo, useState } from 'react';
import {
  Phone, ArrowRightLeft, ShoppingCart, TrendingUp,
  BarChart2, Menu, AlertCircle, FileSpreadsheet, Users,
} from 'lucide-react';
import { useTransferAgentWise }              from '../hooks/useTransferAgentWise';
import TransferAgentWiseFilters              from '../components/TransferAgentWiseFilters';
import TransferAgentWiseTable                from '../components/TransferAgentWiseTable';
import { exportTransferAgentWiseToExcel }    from '../utils/transferAgentWiseHelpers';

/* ── Compact number abbreviation ─────────────────────────────────────────────── */
const abbr = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  return n.toLocaleString('en-IN');
};

/* ── KPI Card ────────────────────────────────────────────────────────────────── */
const KpiCard = ({ icon, label, value, sub, color }) => {
  const IconEl = icon;
  const styles = {
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', bar: 'bg-violet-500',  val: 'text-violet-700'  },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   bar: 'bg-blue-500',    val: 'text-blue-700'    },
    green:  { bg: 'bg-emerald-50',icon: 'text-emerald-600',bar: 'bg-emerald-500', val: 'text-emerald-700' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  bar: 'bg-amber-500',   val: 'text-amber-700'   },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', bar: 'bg-indigo-500',  val: 'text-indigo-700'  },
  }[color];

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

/* ── Skeleton ────────────────────────────────────────────────────────────────── */
const Skeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {['violet', 'blue', 'green', 'amber'].map((c) => (
        <div key={c} className="bg-white border border-slate-200 shadow-sm overflow-hidden h-24">
          <div className={`h-1 ${
            c === 'violet' ? 'bg-violet-200' : c === 'blue' ? 'bg-blue-200' :
            c === 'green'  ? 'bg-emerald-200' : 'bg-amber-200'
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
        <div key={i} className={`h-11 border-b border-slate-100 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`} />
      ))}
    </div>
  </div>
);

/* ── Main Page ───────────────────────────────────────────────────────────────── */
const TransferAgentWisePage = ({ onMenuToggle }) => {
  const { data, loading, loadingMsg, error, fetchReport } = useTransferAgentWise();

  // Client-side filter state
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedAgent,    setSelectedAgent]    = useState('');

  // Reset client filters when new data loads
  const rawRows = data?.agentReport ?? [];

  // Derive unique campaign + agent lists from the full data
  const campaigns = useMemo(() => [...new Set(rawRows.map((r) => r['Campaign']).filter(Boolean))].sort(), [rawRows]);
  const agents    = useMemo(() => [...new Set(rawRows.map((r) => r['Agent']).filter(Boolean))].sort(), [rawRows]);

  // Apply client-side filters
  const filteredRows = useMemo(() => {
    let rows = rawRows;
    if (selectedCampaign) rows = rows.filter((r) => r['Campaign'] === selectedCampaign);
    if (selectedAgent)    rows = rows.filter((r) => r['Agent']    === selectedAgent);
    return rows;
  }, [rawRows, selectedCampaign, selectedAgent]);

  // KPIs from filtered rows
  const kpi = useMemo(() => {
    if (!filteredRows.length) return null;
    const sum       = (k) => filteredRows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    const calls     = sum('Calls');
    const transfers = sum('Transfer');
    const orders    = sum('Orders');
    const agents    = new Set(filteredRows.map((r) => r['Agent']).filter(Boolean)).size;
    const tCon      = calls > 0 ? `${((transfers / calls) * 100).toFixed(1)}%` : '0.0%';
    return { calls, transfers, orders, agents, tCon };
  }, [filteredRows]);

  const isFiltered = selectedCampaign || selectedAgent;

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
              <span className="text-slate-600 font-medium">Agent Wise Transfer Conversion</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-800">Agent Wise Transfer Conversion</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
          </div>

          {data && (
            <button
              onClick={() => exportTransferAgentWiseToExcel({
                columns:     data.columns,
                agentReport: filteredRows,
                startDate:   data.startDate,
                endDate:     data.endDate,
              })}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.97] transition-all shadow-sm shadow-emerald-200 shrink-0"
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

        {/* Filters (date + client-side campaign/agent after data loads) */}
        <TransferAgentWiseFilters
          onFetch={(params) => {
            setSelectedCampaign('');
            setSelectedAgent('');
            fetchReport(params);
          }}
          loading={loading}
          campaigns={campaigns}
          agents={agents}
          selectedCampaign={selectedCampaign}
          selectedAgent={selectedAgent}
          onCampaignChange={setSelectedCampaign}
          onAgentChange={setSelectedAgent}
        />

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
              <div className="flex items-center gap-2 text-sm text-violet-600 font-medium">
                <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse shrink-0" />
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
                  icon={Phone}         label="Total Calls"        color="blue"
                  value={abbr(kpi.calls)}
                  sub={`${kpi.calls.toLocaleString('en-IN')} calls`}
                />
                <KpiCard
                  icon={ArrowRightLeft} label="Transfer To Sales"  color="violet"
                  value={abbr(kpi.transfers)}
                  sub={`${kpi.tCon} transfer rate`}
                />
                <KpiCard
                  icon={ShoppingCart}  label="Total Orders"       color="green"
                  value={abbr(kpi.orders)}
                  sub={`${kpi.transfers > 0 ? ((kpi.orders / kpi.transfers) * 100).toFixed(1) : '0.0'}% of transfers ordered`}
                />
                <KpiCard
                  icon={TrendingUp}    label="Transfer Conversion" color="amber"
                  value={kpi.tCon}
                  sub={`${kpi.transfers.toLocaleString('en-IN')} / ${kpi.calls.toLocaleString('en-IN')} calls`}
                />
              </div>
            )}

            {/* Table card */}
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <BarChart2 size={15} className="text-violet-500" />
                  <span className="text-sm font-semibold text-slate-700">Agent Report</span>
                  <span className="text-[11px] px-1.5 py-0.5 font-bold bg-violet-100 text-violet-700 min-w-[22px] text-center">
                    {filteredRows.length}
                  </span>
                  {isFiltered && (
                    <span className="text-[10px] px-1.5 py-0.5 font-bold bg-amber-100 text-amber-700 border border-amber-200">
                      filtered
                    </span>
                  )}
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  {kpi && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users size={12} className="text-indigo-400" />
                      <span className="font-semibold text-slate-700">{kpi.agents}</span>
                      <span>agents</span>
                    </div>
                  )}
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-xs font-medium text-slate-500 font-mono">
                      {data.startDate} — {data.endDate}
                    </span>
                  </div>
                </div>
              </div>

              <TransferAgentWiseTable
                rows={filteredRows}
                groupByCampaign={!selectedCampaign}
              />
            </div>

          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="bg-white border border-slate-200 shadow-sm py-20 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 flex items-center justify-center">
              <Users size={30} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-700">No report generated</p>
              <p className="text-sm text-slate-400 mt-1.5 max-w-xs">
                Select a period and click{' '}
                <span className="font-semibold text-violet-600">Generate Report</span>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TransferAgentWisePage;
