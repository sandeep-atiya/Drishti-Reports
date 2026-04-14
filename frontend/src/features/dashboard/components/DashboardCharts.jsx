import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  RefreshCw, AlertCircle, BarChart2, TrendingUp, Activity,
  Phone, Users, ChevronDown, ChevronUp, Clock, Layers,
  ArrowUpRight, ArrowDownRight, Download, Filter, Calendar,
} from 'lucide-react';
import { DATE_PRESETS } from '../hooks/useDashboardCharts';

/* ── design tokens ────────────────────────────────────────────────── */
const C = {
  primary: '#4f46e5', violet: '#7c3aed', green: '#10b981',
  red: '#ef4444', amber: '#f59e0b', cyan: '#0891b2',
  slate: '#64748b', pink: '#db2777',
  border: '#edf0f7', text1: '#0d1117', text2: '#4a5568', text3: '#94a3b8',
  bg: '#f8fafc',
};

/* ── csv export helper ────────────────────────────────────────────── */
const exportCSV = (data, filename) => {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const csv = [
    keys.join(','),
    ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename || 'export.csv'; a.click();
  URL.revokeObjectURL(url);
};

/* ── trend % helper ───────────────────────────────────────────────── */
const pctChange = (curr, prev) => {
  if (prev == null || prev === 0) return null;
  return +((( curr - prev) / prev) * 100).toFixed(1);
};

/* ── shared tooltip ───────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e1b4b', border: '1px solid rgba(165,180,252,.25)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,.3)',
    }}>
      {label && <p style={{ color: '#a5b4fc', fontWeight: 700, marginBottom: 6, fontSize: 11 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: '#fff', marginBottom: 2 }}>
          <span style={{ color: p.fill || p.stroke || '#a5b4fc' }}>■ </span>
          {p.name}: <strong>{formatter ? formatter(p.value) : p.value.toLocaleString('en-IN')}</strong>
        </p>
      ))}
    </div>
  );
};

/* ── scatter tooltip ──────────────────────────────────────────────── */
const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: '#1e1b4b', border: '1px solid rgba(165,180,252,.25)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,.3)',
    }}>
      <p style={{ color: '#a5b4fc', fontWeight: 700, marginBottom: 6 }}>{d.agent}</p>
      <p style={{ color: '#fff', marginBottom: 2 }}>Calls: <strong>{d.calls}</strong></p>
      <p style={{ color: '#fff', marginBottom: 2 }}>Conn. Rate: <strong>{d.connRate}%</strong></p>
      <p style={{ color: '#fff' }}>Avg Talk: <strong>{d.avgTalk}s</strong></p>
    </div>
  );
};

/* ── donut centre label ───────────────────────────────────────────── */
const DonutLabel = ({ cx, cy, total, label }) => (
  <>
    <text x={cx} y={cy - 8}  textAnchor="middle" fill={C.text1} style={{ fontSize: 22, fontWeight: 900 }}>
      {Number(total).toLocaleString('en-IN')}
    </text>
    <text x={cx} y={cy + 12} textAnchor="middle" fill={C.text3} style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>
      {label}
    </text>
  </>
);

/* ── connection rate gauge (SVG semicircle) ───────────────────────── */
const ConnGauge = ({ value }) => {
  const pct = Math.min(Math.max(value, 0), 100) / 100;
  const cx = 110, cy = 100, R = 72;
  const track = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;
  const fillColor = value >= 50 ? C.green : value >= 30 ? C.amber : C.red;
  let fillPath = '';
  if (pct > 0) {
    const alpha = (1 - pct) * Math.PI;
    const ex = +(cx + R * Math.cos(alpha)).toFixed(3);
    const ey = +(cy - R * Math.sin(alpha)).toFixed(3);
    const large = pct > 0.5 ? 1 : 0;
    fillPath = `M ${cx - R} ${cy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="220" height="115" viewBox="0 0 220 115" style={{ overflow: 'visible' }}>
        {/* ticks */}
        {[0, 25, 50, 75, 100].map((v) => {
          const a = (1 - v / 100) * Math.PI;
          const x1 = cx + (R - 10) * Math.cos(a), y1 = cy - (R - 10) * Math.sin(a);
          const x2 = cx + (R + 4)  * Math.cos(a), y2 = cy - (R + 4)  * Math.sin(a);
          return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth={1.5} />;
        })}
        {/* track */}
        <path d={track} fill="none" stroke="#e2e8f0" strokeWidth={14} strokeLinecap="round" />
        {/* fill */}
        {pct > 0 && <path d={fillPath} fill="none" stroke={fillColor} strokeWidth={14} strokeLinecap="round" />}
        {/* value */}
        <text x={cx} y={cy - 6}  textAnchor="middle" style={{ fontSize: 32, fontWeight: 900, fill: fillColor }}>{value}%</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 10, fill: C.text3, fontWeight: 700, letterSpacing: 1 }}>CONN. RATE</text>
        {/* scale labels */}
        <text x={cx - R - 6} y={cy + 14} textAnchor="end"   style={{ fontSize: 9, fill: C.text3 }}>0%</text>
        <text x={cx + R + 6} y={cy + 14} textAnchor="start" style={{ fontSize: 9, fill: C.text3 }}>100%</text>
      </svg>
      <p style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>
        {value >= 50 ? 'Good performance' : value >= 30 ? 'Needs attention' : 'Critical — below target'}
      </p>
    </div>
  );
};

/* ── peak-hour heatmap ────────────────────────────────────────────── */
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PeakHeatmap = ({ heatmap }) => {
  const maxVal = Math.max(...heatmap.flat(), 1);
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 560 }}>
        {/* hour headers */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 4, paddingLeft: 38 }}>
          {Array(24).fill(0).map((_, h) => (
            <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: 8.5, color: C.text3, minWidth: 0, fontWeight: 600 }}>
              {h % 6 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>
        {/* rows */}
        {heatmap.map((row, dow) => (
          <div key={dow} style={{ display: 'flex', gap: 2, marginBottom: 2, alignItems: 'center' }}>
            <div style={{ width: 32, flexShrink: 0, fontSize: 10, color: C.text2, fontWeight: 700 }}>
              {DAYS_SHORT[dow]}
            </div>
            {row.map((val, h) => {
              const intensity = val / maxVal;
              return (
                <div
                  key={h}
                  title={`${DAYS_SHORT[dow]} ${h}:00–${h + 1}:00 — ${val.toLocaleString('en-IN')} calls`}
                  style={{
                    flex: 1, height: 22, borderRadius: 3, minWidth: 0,
                    background: val === 0
                      ? '#f1f5f9'
                      : `rgba(79,70,229,${(0.12 + intensity * 0.82).toFixed(2)})`,
                    cursor: 'default',
                    transition: 'opacity .15s',
                  }}
                />
              );
            })}
          </div>
        ))}
        {/* legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, paddingLeft: 38 }}>
          <span style={{ fontSize: 9, color: C.text3, marginRight: 2 }}>Low</span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v, i) => (
            <div key={i} style={{
              width: 18, height: 12, borderRadius: 2,
              background: v === 0 ? '#f1f5f9' : `rgba(79,70,229,${(0.12 + v * 0.82).toFixed(2)})`,
            }} />
          ))}
          <span style={{ fontSize: 9, color: C.text3, marginLeft: 2 }}>High</span>
        </div>
      </div>
    </div>
  );
};

/* ── chart card wrapper ───────────────────────────────────────────── */
const ChartCard = ({ title, subtitle, children, csvData, csvFile }) => (
  <div style={{
    background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`,
    boxShadow: '0 2px 8px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.04)',
    overflow: 'hidden',
  }}>
    <div style={{
      padding: '14px 18px 10px', borderBottom: `1px solid ${C.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text1, letterSpacing: '-.3px' }}>{title}</p>
        {subtitle && <p style={{ fontSize: 11.5, color: C.text3, marginTop: 2 }}>{subtitle}</p>}
      </div>
      {csvData?.length > 0 && (
        <button
          onClick={() => exportCSV(csvData, csvFile)}
          title="Export CSV"
          style={{
            width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`,
            background: '#fff', cursor: 'pointer', color: C.text3, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = C.primary; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff';    e.currentTarget.style.color = C.text3;   }}
        >
          <Download size={12} />
        </button>
      )}
    </div>
    <div style={{ padding: '14px 12px 12px' }}>{children}</div>
  </div>
);

/* ── kpi card with trend + sparkline ─────────────────────────────── */
const KpiCard = ({ label, value, color, bg, prevValue, sparkData, icon: Icon, suffix = '' }) => {
  const change  = pctChange(typeof value === 'number' ? value : parseFloat(value), prevValue);
  const isUp    = change > 0;
  const isGood  = label === 'Call Drops' ? !isUp : isUp; // drops going up is bad
  const trendColor = change === null ? C.text3 : isGood ? C.green : C.red;

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: `1px solid ${C.border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,.05)',
      padding: '15px 16px 10px',
      overflow: 'hidden', position: 'relative',
      transition: 'all .2s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.09)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none';              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.05)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={15} color={color} />
        </div>
        {change !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2,
            background: isGood ? '#ecfdf5' : '#fef2f2',
            borderRadius: 20, padding: '2px 8px',
          }}>
            {isUp
              ? <ArrowUpRight   size={11} color={trendColor} />
              : <ArrowDownRight size={11} color={trendColor} />}
            <span style={{ fontSize: 10.5, fontWeight: 700, color: trendColor }}>
              {Math.abs(change)}%
            </span>
          </div>
        )}
      </div>

      <p style={{ fontSize: 24, fontWeight: 900, color, letterSpacing: '-1.5px', lineHeight: 1, marginTop: 10 }}>
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}{suffix}
      </p>
      <p style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '.7px', marginTop: 4 }}>
        {label}
      </p>
      {change !== null && (
        <p style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
          vs prev period
        </p>
      )}

      {/* mini sparkline */}
      {sparkData?.length > 1 && (
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 80, height: 38, opacity: 0.35 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <Area dataKey="calls" stroke={color} fill={`url(#spark-${label})`} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

/* ── collapsible section wrapper ─────────────────────────────────── */
const Section = ({ title, icon: Icon, count, children, defaultOpen = true, gridCols }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 28 }}>
      {/* divider */}
      <div style={{ height: 1, background: '#e4e8f0', marginBottom: 14 }} />
      {/* header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: open ? 16 : 0, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen((o) => !o)}
      >
        {Icon && (
          <div style={{ width: 30, height: 30, borderRadius: 9, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={14} color={C.primary} />
          </div>
        )}
        <p style={{ fontSize: 13, fontWeight: 800, color: C.text1, letterSpacing: '-.2px', flex: 1 }}>{title}</p>
        {count && (
          <span style={{ background: C.primary + '18', color: C.primary, fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
            {count} charts
          </span>
        )}
        <div style={{
          width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.border}`,
          background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text3,
        }}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: gridCols || 'repeat(auto-fill, minmax(440px, 1fr))', gap: 16 }}>
          {children}
        </div>
      )}
    </div>
  );
};

/* ── skeleton ─────────────────────────────────────────────────────── */
const Skeleton = () => (
  <>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
      {Array(6).fill(0).map((_, i) => (
        <div key={i} style={{ height: 100, borderRadius: 14, background: '#fff', border: `1px solid ${C.border}`, animation: 'dashPulse 1.4s ease-in-out infinite' }} />
      ))}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 16 }}>
      {Array(6).fill(0).map((_, i) => (
        <div key={i} style={{ height: 320, borderRadius: 14, background: '#fff', border: `1px solid ${C.border}`, animation: 'dashPulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
    <style>{`@keyframes dashPulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
  </>
);

/* ── empty state ──────────────────────────────────────────────────── */
const Empty = ({ msg }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8, color: C.text3 }}>
    <Activity size={28} />
    <p style={{ fontSize: 13, fontWeight: 600 }}>{msg || 'No data for this period'}</p>
  </div>
);

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT  (all data passed as props from DashboardPage)
════════════════════════════════════════════════════════════════════ */
const DashboardCharts = ({
  charts, chartsPrev, loading, error, preset, load, totalRows,
  selectedCampaign, setSelectedCampaign, campaigns, customStart, customEnd,
}) => {
  const [localStart, setLocalStart] = useState(customStart || '');
  const [localEnd,   setLocalEnd]   = useState(customEnd   || '');

  const spark = charts?.dailyData?.length > 1
    ? charts.dailyData.slice(-14)
    : charts?.hourlyData;

  const prev = chartsPrev?.summary;

  return (
    <div>
      {/* ── section header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79,70,229,.3)',
          }}>
            <BarChart2 size={16} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: C.text1, letterSpacing: '-.3px' }}>Live Analytics</p>
            <p style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>
              {loading ? 'Loading…' : `${totalRows.toLocaleString('en-IN')} records analysed`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* campaign filter */}
          {campaigns.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 9, padding: '0 10px', height: 34 }}>
              <Filter size={12} color={C.text3} />
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: 12, fontWeight: 600, color: C.text2, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', maxWidth: 160 }}
              >
                <option value="all">All Campaigns</option>
                {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* period preset buttons */}
          {DATE_PRESETS.filter((p) => p.id !== 'custom').map((p) => (
            <button
              key={p.id}
              onClick={() => load(p.id)}
              disabled={loading}
              style={{
                height: 34, padding: '0 14px', borderRadius: 9, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                transition: 'all .15s',
                background: preset === p.id ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#fff',
                color:      preset === p.id ? '#fff' : C.text2,
                boxShadow:  preset === p.id ? '0 2px 8px rgba(79,70,229,.3)' : `0 1px 3px rgba(0,0,0,.06),inset 0 0 0 1px ${C.border}`,
                opacity: loading ? .6 : 1,
              }}
            >{p.label}</button>
          ))}

          {/* custom button */}
          <button
            onClick={() => load('custom', localStart || '', localEnd || '')}
            disabled={loading}
            style={{
              height: 34, padding: '0 12px', borderRadius: 9, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all .15s',
              background: preset === 'custom' ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#fff',
              color:      preset === 'custom' ? '#fff' : C.text2,
              boxShadow:  preset === 'custom' ? '0 2px 8px rgba(79,70,229,.3)' : `0 1px 3px rgba(0,0,0,.06),inset 0 0 0 1px ${C.border}`,
              opacity: loading ? .6 : 1,
            }}
          >
            <Calendar size={12} />
            Custom
          </button>

          {/* refresh */}
          <button
            onClick={() => load(preset, localStart, localEnd)}
            disabled={loading}
            style={{
              width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.border}`,
              background: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.text2, transition: 'all .15s',
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'dashSpin .8s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── custom date row ── */}
      {(preset === 'custom' || (!['today','yesterday','this-week','this-month'].includes(preset))) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
          background: '#eef2ff', border: `1px solid #c7d2fe`, borderRadius: 10, padding: '10px 14px',
          flexWrap: 'wrap',
        }}>
          <Calendar size={14} color={C.primary} />
          <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>Custom Range:</span>
          <input
            type="date" value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            max={localEnd || undefined}
            style={{ height: 30, padding: '0 10px', borderRadius: 7, border: `1px solid #c7d2fe`, fontSize: 12, fontFamily: 'inherit', outline: 'none', color: C.text1, background: '#fff' }}
          />
          <span style={{ fontSize: 12, color: C.text3, fontWeight: 600 }}>to</span>
          <input
            type="date" value={localEnd}
            onChange={(e) => setLocalEnd(e.target.value)}
            min={localStart || undefined}
            style={{ height: 30, padding: '0 10px', borderRadius: 7, border: `1px solid #c7d2fe`, fontSize: 12, fontFamily: 'inherit', outline: 'none', color: C.text1, background: '#fff' }}
          />
          <button
            onClick={() => { if (localStart && localEnd) load('custom', localStart, localEnd); }}
            disabled={!localStart || !localEnd || loading}
            style={{
              height: 30, padding: '0 16px', borderRadius: 7, border: 'none',
              background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              opacity: (!localStart || !localEnd) ? .5 : 1,
            }}
          >Apply</button>
        </div>
      )}

      {/* ── error ── */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991b1b', fontSize: 13 }}>
          <AlertCircle size={15} /> <span>{error}</span>
        </div>
      )}

      {loading && <Skeleton />}

      {!loading && charts && (
        <>
          {/* ══ KPI STRIP ══════════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 6 }}>
            <KpiCard label="Total Calls"    value={charts.summary.total}         color={C.primary}  bg="#eef2ff"  icon={Phone}      prevValue={prev?.total}        sparkData={spark} />
            <KpiCard label="Connected"      value={charts.summary.connected}      color={C.green}    bg="#ecfdf5"  icon={Activity}   prevValue={prev?.connected}    sparkData={spark} />
            <KpiCard label="Conn. Rate"     value={charts.summary.connRate}       color={C.cyan}     bg="#ecfeff"  icon={TrendingUp} prevValue={prev?.connRate}     suffix="%" />
            <KpiCard label="Call Drops"     value={charts.summary.callDrops}      color={C.red}      bg="#fef2f2"  icon={AlertCircle} prevValue={prev?.callDrops}  sparkData={spark} />
            <KpiCard label="Avg Talk"       value={`${charts.summary.avgTalk}s`}  color={C.violet}   bg="#f5f3ff"  icon={Clock}      prevValue={prev?.avgTalk != null ? parseFloat(prev.avgTalk) : null} />
            <KpiCard label="Unique Agents"  value={charts.summary.uniqueAgents}   color="#d97706"    bg="#fffbeb"  icon={Users}      prevValue={prev?.uniqueAgents} />
          </div>

          {/* ══ SECTION 1 — CALL VOLUME ════════════════════════════ */}
          <Section title="Call Volume" icon={Phone} count={2}>
            {/* Campaign bar */}
            <ChartCard
              title="Campaign Call Volume"
              subtitle="Total vs connected per campaign"
              csvData={charts.campaignData}
              csvFile="campaign_volume.csv"
            >
              {charts.campaignData.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.campaignData} margin={{ top: 4, right: 8, bottom: 60, left: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.text2 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: C.text3 }} width={38} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Bar dataKey="calls"     name="Total Calls" fill={C.primary} radius={[4,4,0,0]} maxBarSize={22} />
                    <Bar dataKey="connected" name="Connected"   fill={C.green}   radius={[4,4,0,0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>

            {/* Daily / hourly area */}
            <ChartCard
              title={charts.dailyData.length > 1 ? 'Daily Call Trend' : 'Hourly Call Distribution'}
              subtitle={charts.dailyData.length > 1 ? 'Calls & connected per day' : 'Call volume by hour of day'}
              csvData={charts.dailyData.length > 1 ? charts.dailyData : charts.hourlyData}
              csvFile="call_trend.csv"
            >
              {(() => {
                const isDaily   = charts.dailyData.length > 1;
                const chartData = isDaily ? charts.dailyData : charts.hourlyData;
                const xKey      = isDaily ? 'date' : 'hour';
                return chartData.length ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: isDaily ? 40 : 10, left: 0 }}>
                      <defs>
                        <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.primary} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={C.primary} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gConn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.green} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={C.green} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                      <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: C.text2 }} angle={isDaily ? -30 : 0} textAnchor={isDaily ? 'end' : 'middle'} interval={isDaily ? 0 : 2} />
                      <YAxis tick={{ fontSize: 10, fill: C.text3 }} width={36} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area dataKey="calls"     name="Total Calls" stroke={C.primary} fill="url(#gCalls)" strokeWidth={2} dot={false} />
                      {isDaily && <Area dataKey="connected" name="Connected" stroke={C.green} fill="url(#gConn)" strokeWidth={2} dot={false} />}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <Empty />;
              })()}
            </ChartCard>
          </Section>

          {/* ══ SECTION 2 — DISPOSITION ANALYSIS ══════════════════ */}
          <Section title="Disposition Analysis" icon={BarChart2} count={2}>
            {/* Disposition donut */}
            <ChartCard
              title="Disposition Breakdown"
              subtitle="Call outcome distribution"
              csvData={charts.dispData}
              csvFile="disposition.csv"
            >
              {charts.dispData.length ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ResponsiveContainer width="55%" height={240}>
                    <PieChart>
                      <Pie data={charts.dispData} cx="50%" cy="50%" innerRadius={66} outerRadius={100} paddingAngle={3} dataKey="value">
                        {charts.dispData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        <DonutLabel cx={100} cy={120} total={charts.summary.total} label="Total" />
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {charts.dispData.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.fill, flexShrink: 0 }} />
                          <span style={{ fontSize: 11.5, color: C.text2, fontWeight: 600 }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: C.text1 }}>{d.value.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <Empty />}
            </ChartCard>

            {/* Disposition code donut */}
            <ChartCard
              title="Disposition Code Analysis"
              subtitle="Top 8 hangup codes"
              csvData={charts.codeData}
              csvFile="disp_codes.csv"
            >
              {charts.codeData.length ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ResponsiveContainer width="50%" height={240}>
                    <PieChart>
                      <Pie data={charts.codeData} cx="50%" cy="50%" innerRadius={58} outerRadius={94} paddingAngle={2} dataKey="value">
                        {charts.codeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {charts.codeData.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: C.text2, fontWeight: 600, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: C.text1 }}>{d.value.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <Empty />}
            </ChartCard>
          </Section>

          {/* ══ SECTION 3 — AGENT PERFORMANCE ══════════════════════ */}
          <Section title="Agent Performance" icon={Users} count={2}>
            {/* Top agents stacked bar */}
            <ChartCard
              title="Top 10 Agents by Call Volume"
              subtitle="Connected vs not connected"
              csvData={charts.agentData}
              csvFile="top_agents.csv"
            >
              {charts.agentData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart layout="vertical" data={charts.agentData} margin={{ top: 0, right: 30, bottom: 0, left: 10 }} barGap={1}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: C.text3 }} />
                    <YAxis dataKey="agent" type="category" width={72} tick={{ fontSize: 10, fill: C.text2 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="connected"    name="Connected"     fill={C.green}   radius={[0,4,4,0]} maxBarSize={13} stackId="a" />
                    <Bar dataKey="notConnected" name="Not Connected" fill="#e2e8f0"   radius={[0,4,4,0]} maxBarSize={13} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>

            {/* Agent scatter */}
            <ChartCard
              title="Agent Performance Scatter"
              subtitle="Calls volume vs connection rate — each dot is one agent"
              csvData={charts.scatterData}
              csvFile="agent_scatter.csv"
            >
              {charts.scatterData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                    <XAxis dataKey="calls"    type="number" name="Calls"      tick={{ fontSize: 10, fill: C.text3 }} label={{ value: 'Calls', position: 'insideBottom', offset: -4, style: { fontSize: 10, fill: C.text3 } }} />
                    <YAxis dataKey="connRate" type="number" name="Conn Rate"  tick={{ fontSize: 10, fill: C.text3 }} unit="%" label={{ value: 'Conn %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: C.text3 } }} />
                    <ZAxis dataKey="avgTalk"  range={[40, 300]} name="Avg Talk" />
                    <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={charts.scatterData} fill={C.primary} fillOpacity={0.75} />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>
          </Section>

          {/* ══ SECTION 4 — CAMPAIGN DEEP DIVE ════════════════════ */}
          <Section title="Campaign Deep Dive" icon={TrendingUp} count={3}>
            {/* Avg talk time */}
            <ChartCard
              title="Avg Talk Time by Campaign"
              subtitle="Average connected call duration in seconds"
              csvData={charts.campaignData.filter((c) => c.avgTalkSec > 0)}
              csvFile="avg_talk.csv"
            >
              {charts.campaignData.filter((c) => c.avgTalkSec > 0).length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.campaignData.filter((c) => c.avgTalkSec > 0)} margin={{ top: 4, right: 8, bottom: 60, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.text2 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: C.text3 }} width={42} unit="s" />
                    <Tooltip content={<CustomTooltip formatter={(v) => `${v}s`} />} />
                    <Bar dataKey="avgTalkSec" name="Avg Talk (sec)" radius={[5,5,0,0]} maxBarSize={28}>
                      {charts.campaignData.filter((c) => c.avgTalkSec > 0).map((_, i) => (
                        <Cell key={i} fill={`hsl(${250 + i * 8},68%,${56 + i * 2}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty msg="No talk time data" />}
            </ChartCard>

            {/* Connection rate line */}
            <ChartCard
              title="Connection Rate by Campaign"
              subtitle="% of calls connected per campaign"
              csvData={charts.campaignData}
              csvFile="conn_rate.csv"
            >
              {charts.campaignData.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={charts.campaignData} margin={{ top: 4, right: 8, bottom: 60, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.text2 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: C.text3 }} width={38} unit="%" domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
                    <Line dataKey="connRate" name="Conn. Rate" stroke={C.cyan} strokeWidth={2.5}
                      dot={{ fill: C.cyan, r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>

            {/* Talk-time histogram */}
            <ChartCard
              title="Call Duration Distribution"
              subtitle="How long are connected calls?"
              csvData={charts.talkHistogram}
              csvFile="talk_histogram.csv"
            >
              {charts.talkHistogram.some((b) => b.count > 0) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.talkHistogram} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: C.text2 }} />
                    <YAxis tick={{ fontSize: 10, fill: C.text3 }} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Calls" radius={[6,6,0,0]} maxBarSize={50}>
                      {charts.talkHistogram.map((_, i) => (
                        <Cell key={i} fill={`hsl(${210 + i * 18},65%,${52 + i * 3}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty msg="No talk time data" />}
            </ChartCard>
          </Section>

          {/* ══ SECTION 5 — INFRASTRUCTURE ═════════════════════════ */}
          <Section title="Infrastructure & Queues" icon={Layers} count={2}>
            {/* Queue distribution */}
            <ChartCard
              title="Queue Distribution"
              subtitle="Call volume across all queues"
              csvData={charts.queueData}
              csvFile="queues.csv"
            >
              {charts.queueData.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart layout="vertical" data={charts.queueData} margin={{ top: 0, right: 30, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: C.text3 }} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fill: C.text2 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="calls" name="Calls" radius={[0,5,5,0]} maxBarSize={18}>
                      {charts.queueData.map((_, i) => (
                        <Cell key={i} fill={`hsl(${200 + i * 12},65%,${52 + i * 2}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>

            {/* Connection rate gauge */}
            <ChartCard title="Connection Rate Gauge" subtitle="Overall health indicator for the selected period">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 16 }}>
                <ConnGauge value={charts.summary.connRate} />
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { label: '≥ 50%', color: C.green, text: 'Good' },
                    { label: '30–50%', color: C.amber, text: 'Attention' },
                    { label: '< 30%', color: C.red, text: 'Critical' },
                  ].map((t) => (
                    <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: C.text2, fontWeight: 600 }}>{t.label} — {t.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </Section>

          {/* ══ SECTION 6 — TEMPORAL PATTERNS ══════════════════════ */}
          <Section title="Temporal Patterns" icon={Clock} count={1} gridCols="1fr">
            <ChartCard
              title="Peak Hour Heatmap"
              subtitle="Call volume by day of week & hour — hover cells for exact count"
              csvData={DAYS_SHORT.flatMap((d, dow) =>
                Array(24).fill(0).map((_, h) => ({ day: d, hour: h, calls: charts.heatmap[dow][h] }))
              )}
              csvFile="heatmap.csv"
            >
              {charts.heatmap.flat().some((v) => v > 0)
                ? <PeakHeatmap heatmap={charts.heatmap} />
                : <Empty />}
            </ChartCard>
          </Section>
        </>
      )}

      {!loading && !charts && !error && (
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, padding: '60px 20px', textAlign: 'center', color: C.text3 }}>
          <TrendingUp size={36} style={{ marginBottom: 12, opacity: .4 }} />
          <p style={{ fontWeight: 700, fontSize: 14 }}>No data for selected period</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Try a different date range</p>
        </div>
      )}

      <style>{`
        @keyframes dashSpin { to { transform: rotate(360deg); } }
        @keyframes dashPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
      `}</style>
    </div>
  );
};

export default DashboardCharts;
