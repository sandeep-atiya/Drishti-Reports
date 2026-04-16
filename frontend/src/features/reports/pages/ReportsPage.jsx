import { useState } from 'react';
import {
  Phone, ShoppingCart, CheckCircle, TrendingUp, BarChart2,
  Menu, AlertCircle, FileSpreadsheet, Zap, ChevronDown, ChevronUp,
  Target, Award, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useReports }    from '../hooks/useReports';
import ReportFilters     from '../components/ReportFilters';
import ReportTable       from '../components/ReportTable';
import { exportToExcel } from '../utils/reportHelpers';

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const abbr = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1e7)  return `${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5)  return `${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3)  return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
};
const abbrCurr = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1e7)  return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5)  return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3)  return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

/* ─────────────────────────────────────────────────────────────────
   SVG ARC PROGRESS RING
───────────────────────────────────────────────────────────────── */
const ArcRing = ({ value, max = 100, color, accent, size = 56, sw = 5 }) => {
  const r    = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(Math.max(Number(value) || 0, 0), max) / max;
  const dash = pct * circ;
  const cx   = size / 2;
  const gid  = `rg-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={color}  />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
      </defs>
      {/* track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color + '18'} strokeWidth={sw} />
      {/* fill */}
      {pct > 0 && (
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke={`url(#${gid})`} strokeWidth={sw}
          strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────────
   KPI CARD  — full modern design
───────────────────────────────────────────────────────────────── */
const KpiCard = ({
  icon: Icon, label, value, valueSub,
  color, accent, ringValue, ringLabel,
  metrics, barValue, barLabel,
}) => {
  const barW = Math.min(barValue ?? 0, 100);
  const ringPct = ringValue ?? 0;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      border: `1px solid ${color}22`,
      boxShadow: `0 4px 24px ${color}10, 0 1px 4px rgba(0,0,0,.04)`,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'transform .22s, box-shadow .22s',
      position: 'relative',
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 12px 36px ${color}20, 0 4px 12px rgba(0,0,0,.08)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = `0 4px 24px ${color}10, 0 1px 4px rgba(0,0,0,.04)`;
      }}
    >
      {/* ── gradient top strip ── */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${accent})`, flexShrink: 0 }} />

      {/* ── subtle bg glow in top-right ── */}
      <div style={{
        position: 'absolute', top: 4, right: -16, width: 90, height: 90,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}0c 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ padding: '10px 12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>

        {/* ── Row 1: icon + label + arc ring ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: `linear-gradient(135deg, ${color}, ${accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: `0 3px 8px ${color}28`,
            }}>
              <Icon size={14} color="#fff" strokeWidth={2} />
            </div>
            <p style={{ fontSize: 9.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.8px' }}>
              {label}
            </p>
          </div>

          {/* arc ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ArcRing value={ringPct} color={color} accent={accent} size={36} sw={3.5} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 7.5, fontWeight: 900, color, lineHeight: 1 }}>{ringPct}%</span>
            </div>
          </div>
        </div>

        {/* ── Main value ── */}
        <p style={{
          fontSize: 24, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1,
          background: `linear-gradient(135deg, ${color}, ${accent})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', marginBottom: 2,
        }}>
          {value}
        </p>
        {valueSub && (
          <p style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 0, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{valueSub}</p>
        )}

        {/* ── Mini metrics grid ── */}
        {metrics?.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${metrics.length}, 1fr)`,
            marginTop: 8, paddingTop: 8, borderTop: `1px solid ${color}14`,
          }}>
            {metrics.map((m, i) => (
              <div key={m.label} style={{
                paddingRight: i < metrics.length - 1 ? 7 : 0,
                marginRight:  i < metrics.length - 1 ? 7 : 0,
                borderRight:  i < metrics.length - 1 ? `1px solid ${color}12` : 'none',
              }}>
                <p style={{ fontSize: 8, fontWeight: 700, color: '#b0bec5', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>{m.label}</p>
                <p style={{ fontSize: 12, fontWeight: 900, color: m.color || '#0d1117', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.3px' }}>{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Progress bar ── */}
        {barLabel && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 8.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>{barLabel}</span>
              <span style={{ fontSize: 9.5, fontWeight: 800, color, background: color + '12', padding: '1px 6px', borderRadius: 20 }}>{barValue}%</span>
            </div>
            <div style={{ height: 4, background: color + '12', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${barW}%`,
                background: `linear-gradient(90deg, ${color}, ${accent})`,
                borderRadius: 10, transition: 'width 1s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   CHART TOOLTIP
───────────────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(165,180,252,.22)', borderRadius: 12, padding: '10px 14px', fontSize: 12, boxShadow: '0 12px 28px rgba(0,0,0,.35)' }}>
      <p style={{ color: '#a5b4fc', fontWeight: 700, marginBottom: 7, fontSize: 11, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: '#f1f5f9', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill, flexShrink: 0 }} />
          <span style={{ color: '#94a3b8' }}>{p.name}:</span>
          <strong>{Number(p.value).toLocaleString('en-IN')}</strong>
        </p>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   CAMPAIGN CHART
───────────────────────────────────────────────────────────────── */
const CampaignChart = ({ rows }) => {
  const [open, setOpen] = useState(true);
  const top  = [...rows].sort((a, b) => (Number(b.Calls) || 0) - (Number(a.Calls) || 0)).slice(0, 10);
  const data = top.map((r) => ({
    name:     (r.Campaign || '').length > 14 ? r.Campaign.slice(0, 14) + '…' : r.Campaign,
    Calls:    Number(r.Calls)    || 0,
    Orders:   Number(r.Orders)   || 0,
    Verified: Number(r.Verified) || 0,
  }));

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #edf0f7',
      boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden',
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: open ? '1px solid #edf0f7' : 'none', cursor: 'pointer', userSelect: 'none', background: 'linear-gradient(135deg,#fafbff,#f5f3ff)' }}
        onClick={() => setOpen((o) => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(79,70,229,.3)' }}>
            <BarChart2 size={15} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: '#0d1117', letterSpacing: '-.3px' }}>Top 10 Campaigns</p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Calls · Orders · Verified comparison</p>
          </div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      {open && (
        <div style={{ padding: '20px 10px 14px' }}>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={data} margin={{ top: 4, right: 16, bottom: 64, left: 0 }} barGap={3} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-38} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={44} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,.06)' }} />
              <Legend wrapperStyle={{ fontSize: 11.5, paddingTop: 10 }} />
              <Bar dataKey="Calls"    name="Calls"    fill="#4f46e5" radius={[5,5,0,0]} maxBarSize={20} />
              <Bar dataKey="Orders"   name="Orders"   fill="#7c3aed" radius={[5,5,0,0]} maxBarSize={20} />
              <Bar dataKey="Verified" name="Verified" fill="#10b981" radius={[5,5,0,0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   LOADING SKELETON
───────────────────────────────────────────────────────────────── */
const Skeleton = ({ msg }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
    {msg && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'skPulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>{msg}</span>
      </div>
    )}

    {/* KPI skeletons */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
      {[
        { c: '#4f46e5', a: '#6366f1' },
        { c: '#7c3aed', a: '#a855f7' },
        { c: '#059669', a: '#10b981' },
        { c: '#d97706', a: '#f59e0b' },
      ].map(({ c, a }) => (
        <div key={c} style={{
          height: 168, borderRadius: 18, background: '#fff',
          border: `1px solid ${c}22`,
          boxShadow: `0 4px 20px ${c}08`,
          overflow: 'hidden', animation: 'skPulse 1.4s ease-in-out infinite',
        }}>
          <div style={{ height: 5, background: `linear-gradient(90deg,${c},${a})` }} />
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `${c}20` }} />
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: `${c}10` }} />
            </div>
            <div style={{ height: 38, width: '55%', borderRadius: 8, background: `${c}12` }} />
            <div style={{ height: 3, width: '75%', borderRadius: 4, background: `${c}18` }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 28, borderRadius: 6, background: '#f1f5f9' }} />)}
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* chart skeleton */}
    <div style={{ height: 80, borderRadius: 16, background: '#fff', border: '1px solid #edf0f7', animation: 'skPulse 1.4s ease-in-out infinite' }} />

    {/* table skeleton */}
    <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #edf0f7', overflow: 'hidden', animation: 'skPulse 1.4s ease-in-out infinite' }}>
      <div style={{ height: 56, background: '#fafbff', borderBottom: '1px solid #edf0f7' }} />
      <div style={{ height: 48, background: 'linear-gradient(135deg,#1e293b,#0f172a)' }} />
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ height: 48, borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafbff' : '#fff' }} />
      ))}
    </div>
    <style>{`@keyframes skPulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
const ReportsPage = ({ onMenuToggle }) => {
  const { data, loading, loadingMsg, error, fetchReport } = useReports();

  /* ── aggregate KPIs ── */
  const kpi = (() => {
    if (!data?.campaignReport?.length) return null;
    const r   = data.campaignReport;
    const sum = (k) => r.reduce((s, row) => s + (Number(row[k]) || 0), 0);
    const calls    = sum('Calls');
    const orders   = sum('Orders');
    const verified = sum('Verified');
    const revenue  = sum('Verified Amount');
    const orderConv  = calls    > 0 ? +((orders   / calls)   * 100).toFixed(1) : 0;
    const verifConv  = calls    > 0 ? +((verified / calls)   * 100).toFixed(1) : 0;
    const verifRate  = orders   > 0 ? +((verified / orders)  * 100).toFixed(1) : 0;
    const rpc        = calls    > 0 ? Math.round(revenue / calls) : 0;
    const avgTicket  = verified > 0 ? Math.round(revenue / verified) : 0;
    return { calls, orders, verified, revenue, orderConv, verifConv, verifRate, rpc, avgTicket };
  })();

  const rows = data?.campaignReport ?? [];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', flexDirection: 'column' }}>

      {/* ════ TOPBAR ════════════════════════════════════════════════ */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e4e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,.06)', height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onMenuToggle} className="md:hidden" style={{ width: 36, height: 36, border: '1px solid #e4e8f0', borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4a5568' }}>
            <Menu size={17} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(79,70,229,.35)', flexShrink: 0 }}>
              <TrendingUp size={18} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#0d1117', letterSpacing: '-.4px' }}>Drishti Report</p>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 20, padding: '2px 10px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'rptLiveDot 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#059669', letterSpacing: '.3px' }}>LIVE</span>
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                Campaign performance · Orders · Conversions · Revenue analytics
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data && (
            <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 8, padding: '6px 12px', background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 9 }}>
              <Activity size={12} color="#6366f1" />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>
                {data.startDate} → {data.endDate}
              </span>
            </div>
          )}
          {data && (
            <button
              onClick={() => exportToExcel({ columns: data.columns, campaignReport: data.campaignReport, startDate: data.startDate, endDate: data.endDate })}
              style={{
                height: 38, padding: '0 18px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#059669,#10b981)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(16,185,129,.35)', transition: 'all .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,.45)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,.35)'; }}
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </header>

      {/* ════ PAGE BODY ══════════════════════════════════════════════ */}
      <div style={{ flex: 1, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1600, width: '100%', margin: '0 auto' }}>

        {/* ── Filters ── */}
        <ReportFilters onFetch={fetchReport} loading={loading} />

        {/* ── Error ── */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertCircle size={17} color="#ef4444" />
            </div>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: '#991b1b' }}>Failed to fetch report</p>
              <p style={{ fontSize: 12.5, color: '#ef4444', marginTop: 3 }}>{error}</p>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && <Skeleton msg={loadingMsg} />}

        {/* ════ DATA ═══════════════════════════════════════════════ */}
        {!loading && data && (
          <>
            {/* ── Quick summary banner ── */}
            {kpi && (
              <div style={{
                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                borderRadius: 14, padding: '14px 22px',
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0,
                boxShadow: '0 6px 24px rgba(79,70,229,.3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24, flexShrink: 0 }}>
                  <Award size={16} color="rgba(255,255,255,.8)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Summary</span>
                </div>
                {[
                  { label: 'Calls',     value: kpi.calls.toLocaleString('en-IN') },
                  { label: 'Orders',    value: kpi.orders.toLocaleString('en-IN') },
                  { label: 'Verified',  value: kpi.verified.toLocaleString('en-IN') },
                  { label: 'Revenue',   value: abbrCurr(kpi.revenue) },
                  { label: 'Order Conv.', value: `${kpi.orderConv}%` },
                  { label: 'Verif. Rate', value: `${kpi.verifRate}%` },
                  { label: 'RPC',       value: `₹${kpi.rpc.toLocaleString('en-IN')}` },
                ].map((m, i, arr) => (
                  <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ padding: '4px 18px', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,.18)' : 'none' }}>
                      <p style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.7px' }}>{m.label}</p>
                      <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px', marginTop: 2 }}>{m.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── KPI Cards ── */}
            {kpi && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>

                {/* Card 1: Total Calls */}
                <KpiCard
                  icon={Phone}
                  label="Total Calls"
                  value={abbr(kpi.calls)}
                  valueSub={`${kpi.calls.toLocaleString('en-IN')} total dialled calls`}
                  color="#4f46e5" accent="#6366f1"
                  ringValue={kpi.orderConv} ringLabel="Ord.Conv"
                  metrics={[
                    { label: 'Orders',    value: abbr(kpi.orders),    color: '#7c3aed' },
                    { label: 'Verified',  value: abbr(kpi.verified),  color: '#059669' },
                    { label: 'Revenue',   value: abbrCurr(kpi.revenue), color: '#d97706' },
                  ]}
                  barValue={kpi.orderConv} barLabel="Order Conversion Rate"
                />

                {/* Card 2: Total Orders */}
                <KpiCard
                  icon={ShoppingCart}
                  label="Total Orders"
                  value={abbr(kpi.orders)}
                  valueSub={`from ${kpi.calls.toLocaleString('en-IN')} calls made`}
                  color="#7c3aed" accent="#a855f7"
                  ringValue={kpi.orderConv} ringLabel="Conv.%"
                  metrics={[
                    { label: 'Conv. Rate',  value: `${kpi.orderConv}%`,  color: '#7c3aed' },
                    { label: 'Verified',    value: abbr(kpi.verified),    color: '#059669' },
                    { label: 'Verif. Rate', value: `${kpi.verifRate}%`,   color: '#0891b2' },
                  ]}
                  barValue={kpi.orderConv} barLabel="Order Conversion Rate"
                />

                {/* Card 3: Verified Orders */}
                <KpiCard
                  icon={CheckCircle}
                  label="Verified Orders"
                  value={abbr(kpi.verified)}
                  valueSub={`${kpi.verifRate}% of orders verified`}
                  color="#059669" accent="#10b981"
                  ringValue={kpi.verifRate} ringLabel="Verif.%"
                  metrics={[
                    { label: 'Verif. Conv', value: `${kpi.verifConv}%`,    color: '#059669' },
                    { label: 'Avg Ticket',  value: abbrCurr(kpi.avgTicket), color: '#d97706' },
                    { label: 'Revenue',     value: abbrCurr(kpi.revenue),   color: '#4f46e5' },
                  ]}
                  barValue={kpi.verifRate} barLabel="Verification Rate"
                />

                {/* Card 4: Total Revenue */}
                <KpiCard
                  icon={TrendingUp}
                  label="Total Revenue"
                  value={abbrCurr(kpi.revenue)}
                  valueSub={`₹${kpi.rpc.toLocaleString('en-IN')} revenue per call`}
                  color="#d97706" accent="#f59e0b"
                  ringValue={kpi.verifConv} ringLabel="V.Conv"
                  metrics={[
                    { label: 'RPC',        value: `₹${kpi.rpc.toLocaleString('en-IN')}`,         color: '#d97706' },
                    { label: 'Ticket Size', value: abbrCurr(kpi.avgTicket),                       color: '#059669' },
                    { label: 'Verif. Conv', value: `${kpi.verifConv}%`,                           color: '#7c3aed' },
                  ]}
                  barValue={kpi.verifConv} barLabel="Verified Conversion Rate"
                />
              </div>
            )}

            {/* ── Campaign Chart ── */}
            {rows.length > 0 && <CampaignChart rows={rows} />}

            {/* ── Table card ── */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #edf0f7', boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
              {/* table card header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', background: 'linear-gradient(135deg,#fafbff,#f5f3ff)',
                borderBottom: '1px solid #edf0f7', flexWrap: 'wrap', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(79,70,229,.28)' }}>
                    <BarChart2 size={15} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#0d1117', letterSpacing: '-.3px' }}>Campaign Report</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{data.startDate} — {data.endDate}</p>
                  </div>
                  <span style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 20, letterSpacing: '.2px' }}>
                    {rows.length} campaigns
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 20, padding: '5px 12px' }}>
                  <Zap size={11} color="#059669" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>Sort · Search · Export CSV per chart</span>
                </div>
              </div>

              <ReportTable rows={rows} />
            </div>
          </>
        )}

        {/* ── Empty state ── */}
        {!data && !loading && !error && (
          <div style={{
            background: '#fff', borderRadius: 18, border: '1px solid #edf0f7',
            boxShadow: '0 4px 20px rgba(0,0,0,.05)',
            padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
          }}>
            {/* illustration */}
            <div style={{ position: 'relative' }}>
              <div style={{ width: 80, height: 80, borderRadius: 22, background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', border: '2px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={36} color="#6366f1" strokeWidth={1.5} />
              </div>
              <div style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(16,185,129,.4)' }}>
                <Target size={11} color="#fff" />
              </div>
            </div>

            <div style={{ textAlign: 'center', maxWidth: 380 }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#0d1117', letterSpacing: '-.5px', marginBottom: 8 }}>
                No report generated yet
              </p>
              <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>
                Choose a time period above and click{' '}
                <span style={{ color: '#4f46e5', fontWeight: 700 }}>Generate Report</span>{' '}
                to see your campaign analytics with full KPI breakdown.
              </p>
            </div>

            {/* feature chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 }}>
              {[
                { label: 'Calls & Orders',       color: '#4f46e5', bg: '#eef2ff' },
                { label: 'Verified Revenue',      color: '#059669', bg: '#ecfdf5' },
                { label: 'Conversion Rates',      color: '#7c3aed', bg: '#f5f3ff' },
                { label: 'Ticket Size Analysis',  color: '#d97706', bg: '#fffbeb' },
                { label: 'RPC Breakdown',         color: '#0891b2', bg: '#ecfeff' },
                { label: 'Excel Export',          color: '#059669', bg: '#ecfdf5' },
              ].map((f) => (
                <span key={f.label} style={{ background: f.bg, border: `1px solid ${f.color}25`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: f.color }}>
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes rptLiveDot {
          0%,100% { box-shadow: 0 0 0 2px rgba(16,185,129,.15); }
          50%      { box-shadow: 0 0 0 4px rgba(16,185,129,.30); }
        }
        @keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  );
};

export default ReportsPage;
