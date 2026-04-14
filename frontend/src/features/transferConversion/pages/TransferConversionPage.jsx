import { useState } from 'react';
import {
  Phone, ArrowRightLeft, ShoppingCart, TrendingUp,
  BarChart2, Menu, AlertCircle, FileSpreadsheet,
  ChevronDown, ChevronUp, RefreshCw, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell as RCell,
} from 'recharts';
import { useTransferConversion }  from '../hooks/useTransferConversion';
import TransferFilters             from '../components/TransferFilters';
import TransferTable               from '../components/TransferTable';
import { exportTransferToExcel }   from '../utils/transferHelpers';

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const abbr = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
};

/* ─────────────────────────────────────────────────────────────────
   SVG ARC PROGRESS RING
───────────────────────────────────────────────────────────────── */
const ArcRing = ({ value, max = 100, color, accent, size = 38, sw = 3.5 }) => {
  const r    = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(Math.max(Number(value) || 0, 0), max) / max;
  const dash = pct * circ;
  const cx   = size / 2;
  const gid  = `tg-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={color}  />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color + '18'} strokeWidth={sw} />
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
   KPI CARD
───────────────────────────────────────────────────────────────── */
const KpiCard = ({ icon: Icon, label, value, valueSub, color, accent, ringValue, metrics, barValue, barLabel }) => {
  const barW   = Math.min(barValue ?? 0, 100);
  const ringPct = ringValue ?? 0;

  return (
    <div
      style={{
        background: '#fff', borderRadius: 18,
        border: `1px solid ${color}22`,
        boxShadow: `0 4px 24px ${color}10, 0 1px 4px rgba(0,0,0,.04)`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'transform .22s, box-shadow .22s', position: 'relative',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 36px ${color}20, 0 4px 12px rgba(0,0,0,.08)`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 24px ${color}10, 0 1px 4px rgba(0,0,0,.04)`; }}
    >
      {/* gradient top strip */}
      <div style={{ height: 4, background: `linear-gradient(90deg,${color},${accent})`, flexShrink: 0 }} />

      {/* bg glow */}
      <div style={{ position: 'absolute', top: 4, right: -16, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle,${color}0c 0%,transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ padding: '10px 12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>

        {/* Row 1: icon + label + ring */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: `linear-gradient(135deg,${color},${accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: `0 3px 8px ${color}28`,
            }}>
              <Icon size={14} color="#fff" strokeWidth={2} />
            </div>
            <p style={{ fontSize: 9.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.8px' }}>{label}</p>
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ArcRing value={ringPct} color={color} accent={accent} size={36} sw={3.5} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 7.5, fontWeight: 900, color, lineHeight: 1 }}>{ringPct}%</span>
            </div>
          </div>
        </div>

        {/* Main value */}
        <p style={{
          fontSize: 24, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1,
          background: `linear-gradient(135deg,${color},${accent})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          marginBottom: 2,
        }}>
          {value}
        </p>
        {valueSub && (
          <p style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 0, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{valueSub}</p>
        )}

        {/* Mini metrics grid */}
        {metrics?.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${metrics.length},1fr)`, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${color}14` }}>
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

        {/* Progress bar */}
        {barLabel && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 8.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>{barLabel}</span>
              <span style={{ fontSize: 9.5, fontWeight: 800, color, background: color + '12', padding: '1px 6px', borderRadius: 20 }}>{barValue}%</span>
            </div>
            <div style={{ height: 4, background: color + '12', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${barW}%`, background: `linear-gradient(90deg,${color},${accent})`, borderRadius: 10, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   CONVERSION FUNNEL
───────────────────────────────────────────────────────────────── */
const ConvFunnel = ({ calls, transfers, orders, tCon, transferOrderCon, callsOrderCon }) => {
  const stages = [
    { label: 'Total Calls',      value: calls,     pct: 100,           color: '#3b82f6', accent: '#60a5fa', icon: Phone },
    { label: 'Transfer To Sales',value: transfers,  pct: tCon,          color: '#7c3aed', accent: '#a855f7', icon: ArrowRightLeft },
    { label: 'Orders',           value: orders,     pct: callsOrderCon, color: '#059669', accent: '#10b981', icon: ShoppingCart },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #edf0f7', boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #edf0f7', background: 'linear-gradient(135deg,#fafbff,#f5f3ff)', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(124,58,237,.3)' }}>
          <TrendingUp size={15} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 800, color: '#0d1117', letterSpacing: '-.3px' }}>Conversion Funnel</p>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Calls → Transfers → Orders flow</p>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', gap: 0, alignItems: 'stretch' }}>
        {stages.map((s, i) => {
          const Icon = s.icon;
          const barW = Math.min(s.pct, 100);
          return (
            <div key={s.label} style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                {/* stage block */}
                <div style={{ flex: 1, padding: '0 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${s.color},${s.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 8px ${s.color}28` }}>
                      <Icon size={13} color="#fff" />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px' }}>{s.label}</span>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, background: `linear-gradient(135deg,${s.color},${s.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 4 }}>
                    {abbr(s.value)}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 10, fontVariantNumeric: 'tabular-nums' }}>
                    {s.value?.toLocaleString('en-IN') ?? '0'}
                  </p>
                  {/* funnel bar */}
                  <div style={{ height: 6, background: s.color + '14', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${barW}%`, background: `linear-gradient(90deg,${s.color},${s.accent})`, borderRadius: 8, transition: 'width .8s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.color + '12', padding: '2px 8px', borderRadius: 20 }}>
                    {s.pct}% of calls
                  </span>
                </div>

                {/* arrow connector */}
                {i < stages.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: 30, flexShrink: 0 }}>
                    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
                      <path d="M2 10h20M16 4l6 6-6 6" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* conversion rates strip */}
      <div style={{ margin: '0 24px 20px', padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1px solid #c4b5fd', display: 'flex', flexWrap: 'wrap', gap: 0 }}>
        {[
          { label: 'Transfer Rate',        value: `${tCon}%`,             color: '#7c3aed' },
          { label: 'Transfer → Order Rate', value: `${transferOrderCon}%`, color: '#059669' },
          { label: 'Overall Order Rate',    value: `${callsOrderCon}%`,    color: '#3b82f6' },
        ].map((m, i) => (
          <div key={m.label} style={{
            flex: 1, minWidth: 120, textAlign: 'center',
            borderRight: i < 2 ? '1px solid #c4b5fd' : 'none',
            padding: '0 12px',
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 3 }}>{m.label}</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: m.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   CAMPAIGN CHART
───────────────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(196,181,253,.2)', borderRadius: 12, padding: '10px 14px', fontSize: 12, boxShadow: '0 12px 28px rgba(0,0,0,.35)' }}>
      <p style={{ color: '#c4b5fd', fontWeight: 700, marginBottom: 7, fontSize: 11, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
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

const CampaignChart = ({ rows }) => {
  const [open, setOpen] = useState(true);
  const top  = [...rows].sort((a, b) => (Number(b.Calls) || 0) - (Number(a.Calls) || 0)).slice(0, 10);
  const data = top.map((r) => ({
    name:     (r.Campaign || '').length > 14 ? r.Campaign.slice(0, 14) + '…' : r.Campaign,
    Calls:    Number(r.Calls)              || 0,
    Transfers:Number(r['Transfer To Sales'])|| 0,
    Orders:   Number(r.Orders)             || 0,
  }));

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #edf0f7', boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: open ? '1px solid #edf0f7' : 'none', cursor: 'pointer', userSelect: 'none', background: 'linear-gradient(135deg,#fafbff,#f5f3ff)' }}
        onClick={() => setOpen((o) => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(124,58,237,.3)' }}>
            <BarChart2 size={15} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: '#0d1117', letterSpacing: '-.3px' }}>Top 10 Campaigns</p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Calls · Transfers · Orders comparison</p>
          </div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      {open && (
        <div style={{ padding: '20px 10px 14px' }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 4, right: 16, bottom: 64, left: 0 }} barGap={3} barCategoryGap="26%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-38} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={44} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124,58,237,.06)' }} />
              <Legend wrapperStyle={{ fontSize: 11.5, paddingTop: 10 }} />
              <Bar dataKey="Calls"     name="Calls"     fill="#3b82f6" radius={[5,5,0,0]} maxBarSize={18} />
              <Bar dataKey="Transfers" name="Transfers" fill="#7c3aed" radius={[5,5,0,0]} maxBarSize={18} />
              <Bar dataKey="Orders"    name="Orders"    fill="#10b981" radius={[5,5,0,0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────────────────────────── */
const Skeleton = ({ msg }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
    {msg && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', animation: 'skP 1.4s ease-in-out infinite', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>{msg}</span>
      </div>
    )}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
      {['#3b82f6','#7c3aed','#059669','#d97706'].map((c) => (
        <div key={c} style={{ height: 168, borderRadius: 18, background: '#fff', border: `1px solid ${c}22`, boxShadow: `0 4px 20px ${c}08`, overflow: 'hidden', animation: 'skP 1.4s ease-in-out infinite' }}>
          <div style={{ height: 4, background: c }} />
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c}20` }} />
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: `${c}10` }} />
            </div>
            <div style={{ height: 28, width: '50%', borderRadius: 6, background: `${c}14` }} />
            <div style={{ height: 3, width: '70%', borderRadius: 4, background: `${c}16` }} />
          </div>
        </div>
      ))}
    </div>
    <div style={{ height: 80, borderRadius: 16, background: '#fff', border: '1px solid #edf0f7', animation: 'skP 1.4s ease-in-out infinite' }} />
    <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #edf0f7', overflow: 'hidden', animation: 'skP 1.4s ease-in-out infinite' }}>
      <div style={{ height: 56, background: '#fafbff', borderBottom: '1px solid #edf0f7' }} />
      <div style={{ height: 48, background: 'linear-gradient(135deg,#1e1b4b,#2e1065)' }} />
      {[...Array(5)].map((_, i) => <div key={i} style={{ height: 48, borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fdfcff' : '#fff' }} />)}
    </div>
    <style>{`@keyframes skP{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
const TransferConversionPage = ({ onMenuToggle }) => {
  const { data, loading, loadingMsg, error, fetchReport } = useTransferConversion();

  /* ── Aggregate KPIs ── */
  const kpi = (() => {
    if (!data?.campaignReport?.length) return null;
    const r   = data.campaignReport;
    const sum = (k) => r.reduce((s, row) => s + (Number(row[k]) || 0), 0);
    const calls    = sum('Calls');
    const transfers = sum('Transfer To Sales');
    const orders   = sum('Orders');
    const tCon             = calls     > 0 ? +((transfers / calls)    * 100).toFixed(1) : 0;
    const transferOrderCon = transfers > 0 ? +((orders   / transfers) * 100).toFixed(1) : 0;
    const callsOrderCon    = calls     > 0 ? +((orders   / calls)     * 100).toFixed(1) : 0;
    return { calls, transfers, orders, tCon, transferOrderCon, callsOrderCon };
  })();

  const rows = data?.campaignReport ?? [];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', display: 'flex', flexDirection: 'column' }}>

      {/* ═══ TOPBAR ═══════════════════════════════════════════════════ */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e4e8f0',
        position: 'sticky', top: 0, zIndex: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 56, padding: '0 20px', gap: 12, maxWidth: 1600, margin: '0 auto' }}>

          <button onClick={onMenuToggle} className="md:hidden" style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
            <Menu size={19} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>Reports</span>
              <span style={{ fontSize: 10.5, color: '#cbd5e1' }}>/</span>
              <span style={{ fontSize: 10.5, color: '#5b21b6', fontWeight: 700 }}>Transfer Conversion</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRightLeft size={13} color="#fff" />
              </div>
              <h1 style={{ fontSize: 15, fontWeight: 800, color: '#0d1117', letterSpacing: '-.3px' }}>Transfer Conversion</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#059669', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 20 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', animation: 'liveDot 1.4s ease-in-out infinite' }} />
                Live
              </span>
            </div>
          </div>

          {data && (
            <button
              onClick={() => exportTransferToExcel({ columns: data.columns, campaignReport: data.campaignReport, startDate: data.startDate, endDate: data.endDate })}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, height: 36, padding: '0 16px', borderRadius: 9, border: 'none',
                background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff',
                fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 3px 10px rgba(5,150,105,.3)', transition: 'all .15s',
              }}
            >
              <FileSpreadsheet size={14} />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </header>

      {/* ═══ SUMMARY STRIP (when data exists) ════════════════════════ */}
      {kpi && (
        <div style={{ background: 'linear-gradient(135deg,#2e1065,#4c1d95,#1e1b4b)', borderBottom: '1px solid rgba(196,181,253,.15)' }}>
          <div style={{ maxWidth: 1600, margin: '0 auto', padding: '10px 20px', display: 'flex', flexWrap: 'wrap', gap: 0, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 20, paddingRight: 20, borderRight: '1px solid rgba(196,181,253,.2)' }}>
              <Zap size={13} color="#c4b5fd" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', letterSpacing: '.5px' }}>LIVE</span>
            </div>
            {[
              { label: 'Calls',          value: abbr(kpi.calls),       color: '#93c5fd' },
              { label: 'Transfers',      value: abbr(kpi.transfers),   color: '#c4b5fd' },
              { label: 'Orders',         value: abbr(kpi.orders),      color: '#6ee7b7' },
              { label: 'Transfer Rate',  value: `${kpi.tCon}%`,        color: '#fde68a' },
              { label: 'Transfer→Order', value: `${kpi.transferOrderCon}%`, color: '#fbcfe8' },
              { label: 'Calls→Order',    value: `${kpi.callsOrderCon}%`,    color: '#a5f3fc' },
            ].map((m, i, arr) => (
              <div key={m.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                paddingLeft: 16, paddingRight: 16,
                borderRight: i < arr.length - 1 ? '1px solid rgba(196,181,253,.15)' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(196,181,253,.6)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 1 }}>{m.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 900, color: m.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.3px', lineHeight: 1 }}>{m.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ PAGE BODY ════════════════════════════════════════════════ */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1600, margin: '0 auto', width: '100%' }}>

        {/* Filters */}
        <TransferFilters onFetch={fetchReport} loading={loading} />

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px' }}>
            <AlertCircle size={17} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>Failed to fetch report</p>
              <p style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && <Skeleton msg={loadingMsg} />}

        {/* Data */}
        {!loading && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── KPI Cards ── */}
            {kpi && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
                <KpiCard
                  icon={Phone} label="Total Calls" color="#3b82f6" accent="#60a5fa"
                  value={abbr(kpi.calls)}
                  valueSub={`${kpi.calls.toLocaleString('en-IN')} total calls`}
                  ringValue={kpi.tCon}
                  metrics={[
                    { label: 'Transfers', value: abbr(kpi.transfers), color: '#7c3aed' },
                    { label: 'Orders',    value: abbr(kpi.orders),    color: '#059669' },
                  ]}
                  barValue={kpi.tCon} barLabel="Transfer Rate"
                />
                <KpiCard
                  icon={ArrowRightLeft} label="Transfer To Sales" color="#7c3aed" accent="#a855f7"
                  value={abbr(kpi.transfers)}
                  valueSub={`${kpi.tCon}% of total calls`}
                  ringValue={kpi.tCon}
                  metrics={[
                    { label: 'Rate',   value: `${kpi.tCon}%`,          color: '#7c3aed' },
                    { label: 'Orders', value: abbr(kpi.orders),        color: '#059669' },
                  ]}
                  barValue={kpi.tCon} barLabel="Transfer Conv. Rate"
                />
                <KpiCard
                  icon={ShoppingCart} label="Total Orders" color="#059669" accent="#10b981"
                  value={abbr(kpi.orders)}
                  valueSub={`${kpi.callsOrderCon}% overall order rate`}
                  ringValue={kpi.transferOrderCon}
                  metrics={[
                    { label: 'T→Order',   value: `${kpi.transferOrderCon}%`, color: '#059669' },
                    { label: 'C→Order',   value: `${kpi.callsOrderCon}%`,    color: '#3b82f6' },
                  ]}
                  barValue={kpi.transferOrderCon} barLabel="Transfer Order Conv."
                />
                <KpiCard
                  icon={TrendingUp} label="Transfer Conversion" color="#d97706" accent="#f59e0b"
                  value={`${kpi.tCon}%`}
                  valueSub={`${kpi.transfers.toLocaleString('en-IN')} / ${kpi.calls.toLocaleString('en-IN')}`}
                  ringValue={kpi.tCon}
                  metrics={[
                    { label: 'T→Order', value: `${kpi.transferOrderCon}%`, color: '#059669' },
                    { label: 'C→Order', value: `${kpi.callsOrderCon}%`,    color: '#3b82f6' },
                  ]}
                  barValue={kpi.tCon} barLabel="Conversion Progress"
                />
              </div>
            )}

            {/* ── Conversion Funnel ── */}
            {kpi && (
              <ConvFunnel
                calls={kpi.calls} transfers={kpi.transfers} orders={kpi.orders}
                tCon={kpi.tCon} transferOrderCon={kpi.transferOrderCon} callsOrderCon={kpi.callsOrderCon}
              />
            )}

            {/* ── Campaign Chart ── */}
            {rows.length > 0 && <CampaignChart rows={rows} />}

            {/* ── Campaign Table ── */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #edf0f7', boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #edf0f7', background: 'linear-gradient(135deg,#fafbff,#f5f3ff)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart2 size={14} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#0d1117', letterSpacing: '-.2px' }}>Campaign Report</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Detailed breakdown per campaign</p>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #c4b5fd', padding: '2px 8px', borderRadius: 20 }}>
                    {rows.length} campaigns
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'liveDot 1.4s ease-in-out infinite' }} />
                  <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                    {data.startDate} — {data.endDate}
                  </span>
                </div>
              </div>
              <TransferTable rows={rows} />
            </div>

          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #edf0f7', boxShadow: '0 4px 24px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '72px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(124,58,237,.12)' }}>
              <ArrowRightLeft size={32} color="#a855f7" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0d1117', letterSpacing: '-.3px' }}>No report generated yet</p>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, maxWidth: 300 }}>
                Select a period above and click <strong style={{ color: '#7c3aed' }}>Generate Report</strong> to view transfer conversion data.
              </p>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes liveDot { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  );
};

export default TransferConversionPage;
