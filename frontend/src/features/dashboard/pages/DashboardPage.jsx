import { useState, useEffect } from 'react';
import {
  BarChart2, ArrowRightLeft, PhoneOff, CalendarDays, Layers,
  Users, Database, TrendingUp, ArrowRight, Menu, Zap,
  Activity, RefreshCw, Phone, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import DashboardCharts from '../components/DashboardCharts';
import useDashboardCharts from '../hooks/useDashboardCharts';

/* ═══════════════════════════════════════════════════════════
   DATA — all reports with metadata
═══════════════════════════════════════════════════════════ */
const REPORTS = [
  {
    id: 'drishti-report',
    title: 'Drishti Report',
    desc: 'Campaign performance with calls, orders, conversions & verified revenue.',
    icon: BarChart2,
    accent: '#4f46e5',
    iconBg: '#eef2ff',
    iconColor: '#4f46e5',
    category: 'Core',
    categoryColor: '#4f46e5',
    categoryBg: '#eef2ff',
    hot: true,
  },
  {
    id: 'transfer-conversion',
    title: 'Transfer Conversion',
    desc: 'Track how transferred calls convert to verified orders per campaign.',
    icon: ArrowRightLeft,
    accent: '#7c3aed',
    iconBg: '#f5f3ff',
    iconColor: '#7c3aed',
    category: 'Transfer',
    categoryColor: '#7c3aed',
    categoryBg: '#f5f3ff',
  },
  {
    id: 'transfer-conversion-unique-calls',
    title: 'Transfer Unique Calls',
    desc: 'Unique call-level transfer conversions, de-duplicated by caller.',
    icon: ArrowRightLeft,
    accent: '#6d28d9',
    iconBg: '#ede9fe',
    iconColor: '#6d28d9',
    category: 'Transfer',
    categoryColor: '#7c3aed',
    categoryBg: '#f5f3ff',
  },
  {
    id: 'transfer-agent-wise',
    title: 'Agent Wise Transfer',
    desc: 'Per-agent breakdown of transfer rates, conversion & verified amounts.',
    icon: Users,
    accent: '#0891b2',
    iconBg: '#ecfeff',
    iconColor: '#0891b2',
    category: 'Transfer',
    categoryColor: '#7c3aed',
    categoryBg: '#f5f3ff',
  },
  {
    id: 'self-hangup',
    title: 'Self Hangup',
    desc: 'Monitor self-hangup patterns and dropout rates across campaigns.',
    icon: PhoneOff,
    accent: '#dc2626',
    iconBg: '#fef2f2',
    iconColor: '#dc2626',
    category: 'Call',
    categoryColor: '#dc2626',
    categoryBg: '#fef2f2',
  },
  {
    id: 'date-wise',
    title: 'Date Wise Report',
    desc: 'Day-by-day call volume, orders and conversion trend over any range.',
    icon: CalendarDays,
    accent: '#0d9488',
    iconBg: '#f0fdfa',
    iconColor: '#0d9488',
    category: 'Date',
    categoryColor: '#0d9488',
    categoryBg: '#f0fdfa',
  },
  {
    id: 'date-wise-campaign',
    title: 'Date Wise Campaign',
    desc: 'Campaign-level daily performance table for cross-campaign comparison.',
    icon: Layers,
    accent: '#059669',
    iconBg: '#ecfdf5',
    iconColor: '#059669',
    category: 'Date',
    categoryColor: '#0d9488',
    categoryBg: '#f0fdfa',
  },
  {
    id: 'sales-conversion',
    title: 'Sales Conversion',
    desc: 'End-to-end sales funnel from call to order to verified revenue.',
    icon: TrendingUp,
    accent: '#d97706',
    iconBg: '#fffbeb',
    iconColor: '#d97706',
    category: 'Sales',
    categoryColor: '#d97706',
    categoryBg: '#fffbeb',
  },
  {
    id: 'sales-hyderabad',
    title: 'Sales Hyderabad',
    desc: 'Hyderabad region sales metrics — orders, conversions & ticket sizes.',
    icon: TrendingUp,
    accent: '#ea580c',
    iconBg: '#fff7ed',
    iconColor: '#ea580c',
    category: 'Sales',
    categoryColor: '#d97706',
    categoryBg: '#fffbeb',
  },
  {
    id: 'doctor-sales',
    title: 'Doctor Sales',
    desc: 'Doctor consultation campaign performance, orders & revenue tracking.',
    icon: Users,
    accent: '#db2777',
    iconBg: '#fdf2f8',
    iconColor: '#db2777',
    category: 'Sales',
    categoryColor: '#d97706',
    categoryBg: '#fffbeb',
  },
  {
    id: 'raw-data',
    title: 'Raw Data Explorer',
    desc: 'Drill into individual call records with advanced filters & KPI exports.',
    icon: Database,
    accent: '#475569',
    iconBg: '#f8fafc',
    iconColor: '#475569',
    category: 'Data',
    categoryColor: '#475569',
    categoryBg: '#f1f5f9',
    badge: 'PG',
  },
];

const CATEGORY_STATS = [
  { label: 'Total Reports', value: 11, icon: Activity,      color: '#4f46e5', bg: '#eef2ff' },
  { label: 'Transfer',      value: 3,  icon: ArrowRightLeft, color: '#7c3aed', bg: '#f5f3ff' },
  { label: 'Sales',         value: 3,  icon: TrendingUp,    color: '#d97706', bg: '#fffbeb' },
  { label: 'Call & Core',   value: 2,  icon: Phone,         color: '#dc2626', bg: '#fef2f2' },
  { label: 'Date Reports',  value: 2,  icon: CalendarDays,  color: '#0d9488', bg: '#f0fdfa' },
  { label: 'Data Tools',    value: 1,  icon: Database,      color: '#475569', bg: '#f1f5f9' },
];

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const DATE_PRESETS_LABEL = { today: 'Today', yesterday: 'Yesterday', 'this-week': 'This Week', 'this-month': 'This Month', custom: 'Custom' };

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const fmtDate = () => new Date().toLocaleDateString('en-IN', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */

/* ── Category stat tile ── */
const StatTile = ({ label, value, icon: Icon, color, bg }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '15px 18px',
      border: '1px solid #edf0f7',
      boxShadow: '0 1px 3px rgba(0,0,0,.05)',
      display: 'flex', alignItems: 'center', gap: '12px',
      transition: 'all .2s',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.05)';
    }}
  >
    <div style={{
      width: 38, height: 38, borderRadius: '10px',
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={17} color={color} />
    </div>
    <div>
      <p style={{ fontSize: '22px', fontWeight: 900, color: '#0d1117', lineHeight: 1, letterSpacing: '-1px' }}>
        {value}
      </p>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', marginTop: 3 }}>
        {label}
      </p>
    </div>
  </div>
);

/* ── Report card ── */
const ReportCard = ({ report, onNavigate }) => {
  const { id, title, desc, icon: Icon, accent, iconBg, iconColor,
    category, categoryColor, categoryBg, hot, badge } = report;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onNavigate(id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: '14px',
        border: `1px solid ${hovered ? accent + '40' : '#edf0f7'}`,
        boxShadow: hovered
          ? `0 8px 28px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.05)`
          : '0 2px 8px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.04)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        transition: 'all .22s ease',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* colored top bar */}
      <div style={{ height: '3px', background: accent, flexShrink: 0 }} />

      <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* icon + badges row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{
            width: 42, height: 42, borderRadius: '11px',
            background: hovered ? accent + '18' : iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .22s',
            flexShrink: 0,
          }}>
            <Icon size={20} color={hovered ? accent : iconColor} strokeWidth={1.8} />
          </div>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* category chip */}
            <span style={{
              background: categoryBg, color: categoryColor,
              fontSize: '10px', fontWeight: 700,
              padding: '2px 9px', borderRadius: '20px',
              letterSpacing: '.5px', textTransform: 'uppercase',
            }}>
              {category}
            </span>
            {/* special badges */}
            {hot && (
              <span style={{
                background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
                color: '#fff', fontSize: '9.5px', fontWeight: 700,
                padding: '2px 8px', borderRadius: '20px', letterSpacing: '.5px',
              }}>
                HOT
              </span>
            )}
            {badge && (
              <span style={{
                background: '#fef3c7', color: '#92400e',
                fontSize: '9.5px', fontWeight: 700,
                padding: '2px 8px', borderRadius: '20px', letterSpacing: '.5px',
              }}>
                {badge}
              </span>
            )}
          </div>
        </div>

        {/* title + desc */}
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: '14.5px', fontWeight: 800, color: '#0d1117',
            letterSpacing: '-.3px', marginBottom: 5,
          }}>
            {title}
          </p>
          <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: 1.55 }}>
            {desc}
          </p>
        </div>

        {/* footer CTA */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 12,
          borderTop: '1px solid #f1f5f9',
          marginTop: 'auto',
        }}>
          <span style={{
            fontSize: '12px', fontWeight: 700,
            color: hovered ? accent : '#94a3b8',
            transition: 'color .2s', letterSpacing: '.2px',
          }}>
            Open Report
          </span>
          <div style={{
            width: 28, height: 28, borderRadius: '8px',
            background: hovered ? accent : '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .2s',
          }}>
            <ArrowRight size={13} color={hovered ? '#fff' : '#94a3b8'} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD PAGE
═══════════════════════════════════════════════════════════ */
const DashboardPage = ({ onNavigate, onMenuToggle, user }) => {
  const [time, setTime] = useState(new Date());

  /* lift the charts hook so the header can show live KPIs */
  const chartsHook = useDashboardCharts();
  const { charts, chartsPrev, loading: chartsLoading, error: chartsError,
    preset, load, totalRows, selectedCampaign, setSelectedCampaign,
    campaigns, customStart, customEnd } = chartsHook;

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const name     = user?.fullName || user?.username || 'there';
  const timeStr  = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  /* quick trend badge helper */
  const trendBadge = (curr, prev, inverse = false) => {
    if (prev == null || prev === 0 || curr == null) return null;
    const pct = (((curr - prev) / prev) * 100).toFixed(1);
    const up  = curr > prev;
    const good = inverse ? !up : up;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        fontSize: 10, fontWeight: 700,
        color: good ? '#059669' : '#dc2626',
        background: good ? '#ecfdf5' : '#fef2f2',
        borderRadius: 20, padding: '1px 7px', marginLeft: 6,
      }}>
        {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
        {Math.abs(pct)}%
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', flexDirection: 'column' }}>

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <header style={{
        height: 60, background: '#fff',
        borderBottom: '1px solid #e4e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 26px', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* mobile menu */}
          <button
            onClick={onMenuToggle}
            className="md:hidden"
            style={{
              width: 34, height: 34, border: '1px solid #e4e8f0', borderRadius: '9px',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#4a5568',
            }}
          >
            <Menu size={16} />
          </button>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 800, color: '#0d1117', letterSpacing: '-.3px' }}>
              Dashboard
            </p>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: 1 }}>
              {fmtDate()} · {timeStr}
            </p>
          </div>
        </div>

        {/* right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* live indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: '20px',
            background: '#f0fdf4', border: '1px solid #bbf7d0',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#10b981',
              boxShadow: '0 0 0 3px rgba(16,185,129,.2)',
              animation: 'livePulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#059669' }}>Live</span>
          </div>

          <button
            onClick={() => load(preset, customStart, customEnd)}
            disabled={chartsLoading}
            style={{
              height: 35, padding: '0 16px',
              background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              color: '#fff', border: 'none', borderRadius: '9px',
              fontSize: '12.5px', fontWeight: 700, cursor: chartsLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 10px rgba(79,70,229,.35)',
              fontFamily: 'inherit', opacity: chartsLoading ? .7 : 1,
              transition: 'all .15s',
            }}
            onMouseEnter={(e) => { if (!chartsLoading) { e.currentTarget.style.boxShadow = '0 4px 18px rgba(79,70,229,.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(79,70,229,.35)'; e.currentTarget.style.transform = 'none'; }}
          >
            <RefreshCw size={13} style={{ animation: chartsLoading ? 'liveRefreshSpin .8s linear infinite' : 'none' }} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* ── LIVE METRICS STRIP ──────────────────────────────────── */}
      {charts && (
        <div style={{
          background: '#fff', borderBottom: '1px solid #e4e8f0',
          padding: '0 26px',
          display: 'flex', alignItems: 'center', gap: 0,
          overflowX: 'auto',
        }}>
          {[
            { label: 'Total Calls',   value: charts.summary.total,        prev: chartsPrev?.summary?.total,        color: '#4f46e5', inverse: false },
            { label: 'Connected',     value: charts.summary.connected,     prev: chartsPrev?.summary?.connected,    color: '#10b981', inverse: false },
            { label: 'Conn. Rate',    value: `${charts.summary.connRate}%`, prev: chartsPrev?.summary?.connRate,    color: '#0891b2', inverse: false, isStr: true },
            { label: 'Call Drops',    value: charts.summary.callDrops,     prev: chartsPrev?.summary?.callDrops,    color: '#ef4444', inverse: true  },
            { label: 'Avg Talk',      value: `${charts.summary.avgTalk}s`, prev: null,                              color: '#7c3aed', isStr: true     },
            { label: 'Agents Active', value: charts.summary.uniqueAgents,  prev: chartsPrev?.summary?.uniqueAgents, color: '#d97706', inverse: false },
          ].map((m, i, arr) => (
            <div
              key={m.label}
              style={{
                padding: '10px 20px', flexShrink: 0,
                borderRight: i < arr.length - 1 ? '1px solid #e4e8f0' : 'none',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', whiteSpace: 'nowrap' }}>{m.label}</p>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: 17, fontWeight: 900, color: m.color, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                    {typeof m.value === 'number' ? m.value.toLocaleString('en-IN') : m.value}
                  </p>
                  {!m.isStr && trendBadge(m.value, m.prev, m.inverse)}
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', padding: '0 0 0 20px', flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              {totalRows.toLocaleString('en-IN')} records · {preset === 'custom' ? 'Custom' : DATE_PRESETS_LABEL[preset]}
            </p>
          </div>
        </div>
      )}

      {/* ── PAGE CONTENT ────────────────────────────────────── */}
      <div style={{ padding: '26px', flex: 1, maxWidth: 1500, width: '100%', margin: '0 auto' }}>

        {/* ── GREETING ── */}
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0d1117', letterSpacing: '-.5px', marginBottom: 4 }}>
            {getGreeting()}, {name} 👋
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748b' }}>
            Here's an overview of all your reports. Click any card to open the report.
          </p>
        </div>

        {/* ── INSIGHT BANNER ── */}
        <div style={{
          background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)',
          border: '1px solid #c7d2fe',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 16,
          marginBottom: 22,
          flexWrap: 'wrap',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79,70,229,.35)',
          }}>
            <Zap size={20} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#3730a3', marginBottom: 3 }}>
              11 Reports Available · Real-time Data · Excel Export on Every Report
            </p>
            <p style={{ fontSize: '12px', color: '#6366f1', lineHeight: 1.5 }}>
              Use the cards below to navigate between reports. Each report has filters, KPI summaries, and direct Excel download.
              Raw Data Explorer supports per-KPI downloads with no row limit.
            </p>
          </div>
          <button
            onClick={() => onNavigate('raw-data')}
            style={{
              height: 36, padding: '0 18px', flexShrink: 0,
              background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              color: '#fff', border: 'none', borderRadius: '9px',
              fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79,70,229,.3)',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
              transition: 'all .2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(79,70,229,.3)'; e.currentTarget.style.transform = 'none'; }}
          >
            Explore Raw Data →
          </button>
        </div>

        {/* ── CATEGORY STAT TILES ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: 28,
        }}>
          {CATEGORY_STATS.map((s) => (
            <StatTile key={s.label} {...s} />
          ))}
        </div>

        {/* ── CHARTS SECTION ── */}
        <div style={{ marginBottom: 36 }}>
          <DashboardCharts
            charts={charts}
            chartsPrev={chartsPrev}
            loading={chartsLoading}
            error={chartsError}
            preset={preset}
            load={load}
            totalRows={totalRows}
            selectedCampaign={selectedCampaign}
            setSelectedCampaign={setSelectedCampaign}
            campaigns={campaigns}
            customStart={customStart}
            customEnd={customEnd}
          />
        </div>

        {/* ── REPORT CARDS GRID ── */}
        <div style={{ marginBottom: 10 }}>
          {/* section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#0d1117', letterSpacing: '-.2px' }}>
              All Reports
            </p>
            <div style={{
              background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              color: '#fff', fontSize: '10px', fontWeight: 700,
              padding: '2px 9px', borderRadius: '20px',
            }}>
              11
            </div>
            <div style={{ flex: 1, height: '1px', background: '#e4e8f0' }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {REPORTS.map((r) => (
              <ReportCard key={r.id} report={r} onNavigate={onNavigate} />
            ))}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          marginTop: 30, paddingTop: 20,
          borderTop: '1px solid #e4e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
        }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
            Drishti Reports Platform · v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
            {REPORTS.length} reports · Data refreshes on each fetch
          </p>
        </div>
      </div>

      <style>{`
        @keyframes livePulse {
          0%,100% { box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
          50%      { box-shadow: 0 0 0 5px rgba(16,185,129,.30); }
        }
        @keyframes liveRefreshSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DashboardPage;
