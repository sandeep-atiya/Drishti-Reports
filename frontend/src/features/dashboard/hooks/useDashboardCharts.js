import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { fetchRawData } from '../../rawData/services/rawData.api';

/* ── date helpers ─────────────────────────────────────────────────── */
const pad       = (n) => String(n).padStart(2, '0');
const fmtDate   = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const todayStr  = () => { const d = new Date(); return fmtDate(d.getFullYear(), d.getMonth() + 1, d.getDate()); };
const addDays   = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return fmtDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};
const startOfWeek = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const diff = dt.getDay() === 0 ? -6 : 1 - dt.getDay();
  dt.setDate(dt.getDate() + diff);
  return fmtDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};
const daysBetween = (a, b) => {
  const da = new Date(a), db = new Date(b);
  return Math.round((db - da) / 86400000);
};

export const DATE_PRESETS = [
  { id: 'today',      label: 'Today',
    get: () => { const t = todayStr(); return { startDate: t, endDate: addDays(t, 1) }; } },
  { id: 'yesterday',  label: 'Yesterday',
    get: () => { const t = todayStr(); const y = addDays(t, -1); return { startDate: y, endDate: t }; } },
  { id: 'this-week',  label: 'This Week',
    get: () => { const t = todayStr(); return { startDate: startOfWeek(t), endDate: addDays(t, 1) }; } },
  { id: 'this-month', label: 'This Month',
    get: () => { const d = new Date(); return { startDate: fmtDate(d.getFullYear(), d.getMonth() + 1, 1), endDate: addDays(todayStr(), 1) }; } },
  { id: 'custom',     label: 'Custom', get: null },
];

/* build the "previous period" range for comparison */
const getPrevRange = (startDate, endDate) => {
  const days = Math.max(1, daysBetween(startDate, endDate));
  return { startDate: addDays(startDate, -days), endDate: startDate };
};

/* ── compute all chart data from raw rows ─────────────────────────── */
export const computeCharts = (rows) => {
  if (!rows?.length) return null;

  const campMap  = {};
  const hourMap  = Array(24).fill(0);
  const dispMap  = {};
  const codeMap  = {};
  const agentMap = {};
  const queueMap = {};
  const dayMap   = {};
  // heatmap[dayOfWeek 0=Sun…6][hour 0–23]
  const heatmap  = Array(7).fill(null).map(() => Array(24).fill(0));

  rows.forEach((r) => {
    const camp  = r.campaign_name || 'Unknown';
    const disp  = String(r.ch_system_disposition || 'UNKNOWN').toUpperCase();
    const code  = r.udh_disposition_code || 'Other';
    const agent = r.udh_user_id || 'Unknown';
    const queue = r.queue_name || 'Unknown';
    const isConnected = disp === 'CONNECTED';
    const talkMs = Number(r.udh_talk_time) || 0;

    /* campaign */
    if (!campMap[camp]) campMap[camp] = { name: camp, calls: 0, connected: 0, talkMs: 0, talkN: 0 };
    campMap[camp].calls++;
    if (isConnected) {
      campMap[camp].connected++;
      if (talkMs > 0) { campMap[camp].talkMs += talkMs; campMap[camp].talkN++; }
    }

    /* hourly + heatmap */
    if (r.ch_date_added) {
      const dt  = new Date(r.ch_date_added);
      const h   = dt.getHours();
      const dow = dt.getDay();
      if (!isNaN(h)) { hourMap[h]++; heatmap[dow][h]++; }
    }

    /* disposition */
    dispMap[disp] = (dispMap[disp] || 0) + 1;

    /* disposition code */
    codeMap[code] = (codeMap[code] || 0) + 1;

    /* agent */
    if (!agentMap[agent]) agentMap[agent] = { agent, calls: 0, connected: 0, talkMs: 0, talkN: 0 };
    agentMap[agent].calls++;
    if (isConnected) {
      agentMap[agent].connected++;
      if (talkMs > 0) { agentMap[agent].talkMs += talkMs; agentMap[agent].talkN++; }
    }

    /* queue */
    queueMap[queue] = (queueMap[queue] || 0) + 1;

    /* daily */
    if (r.ch_date_added) {
      const day = String(r.ch_date_added).slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { date: day, calls: 0, connected: 0 };
      dayMap[day].calls++;
      if (isConnected) dayMap[day].connected++;
    }
  });

  /* campaign: top 12 */
  const campaignData = Object.values(campMap)
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 12)
    .map((c) => ({
      ...c,
      connRate:     c.calls > 0 ? +((c.connected / c.calls) * 100).toFixed(1) : 0,
      avgTalkSec:   c.talkN  > 0 ? +(c.talkMs / c.talkN / 1000).toFixed(1) : 0,
      notConnected: c.calls - c.connected,
    }));

  /* hourly */
  const hourlyData = hourMap.map((calls, h) => ({ hour: `${pad(h)}:00`, calls }));

  /* disposition donut */
  const DISP_COLORS = {
    CONNECTED: '#10b981', 'NOT CONNECTED': '#ef4444',
    BUSY: '#f59e0b', 'NO ANSWER': '#64748b',
    FAILED: '#dc2626', UNKNOWN: '#94a3b8',
  };
  const dispData = Object.entries(dispMap)
    .map(([name, value]) => ({ name, value, fill: DISP_COLORS[name] || '#a5b4fc' }))
    .sort((a, b) => b.value - a.value);

  /* hangup code donut top 8 */
  const CODE_COLORS = ['#4f46e5','#7c3aed','#ef4444','#f59e0b','#10b981','#0891b2','#db2777','#94a3b8'];
  const codeData = Object.entries(codeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value], i) => ({ name, value, fill: CODE_COLORS[i % CODE_COLORS.length] }));

  /* top 10 agents */
  const agentData = Object.values(agentMap)
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10)
    .map((a) => ({
      ...a,
      notConnected: a.calls - a.connected,
      connRate:    a.calls > 0 ? +((a.connected / a.calls) * 100).toFixed(1) : 0,
      avgTalkSec:  a.talkN  > 0 ? +(a.talkMs / a.talkN / 1000).toFixed(1) : 0,
    }));

  /* scatter: all agents */
  const scatterData = Object.values(agentMap).map((a) => ({
    agent:    a.agent,
    calls:    a.calls,
    connRate: a.calls > 0 ? +((a.connected / a.calls) * 100).toFixed(1) : 0,
    avgTalk:  a.talkN  > 0 ? +(a.talkMs / a.talkN / 1000).toFixed(1) : 0,
  }));

  /* queue top 10 */
  const queueData = Object.entries(queueMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, calls]) => ({ name, calls }));

  /* daily sorted */
  const dailyData = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

  /* talk-time histogram */
  const talkBuckets = { '0–30s': 0, '30–60s': 0, '1–2 min': 0, '2–3 min': 0, '3–5 min': 0, '5 min+': 0 };
  rows.forEach((r) => {
    const s = Number(r.udh_talk_time) / 1000;
    if (s <= 0 || isNaN(s)) return;
    if (s < 30)       talkBuckets['0–30s']++;
    else if (s < 60)  talkBuckets['30–60s']++;
    else if (s < 120) talkBuckets['1–2 min']++;
    else if (s < 180) talkBuckets['2–3 min']++;
    else if (s < 300) talkBuckets['3–5 min']++;
    else              talkBuckets['5 min+']++;
  });
  const talkHistogram = Object.entries(talkBuckets).map(([bucket, count]) => ({ bucket, count }));

  /* summary KPIs */
  const total        = rows.length;
  const connected    = rows.filter((r) => String(r.ch_system_disposition || '').toUpperCase() === 'CONNECTED').length;
  const callDrops    = rows.filter((r) => String(r.udh_disposition_code  || '').toUpperCase().includes('CALL_DROP')).length;
  const validTalk    = rows.map((r) => Number(r.udh_talk_time)).filter((v) => v > 0 && !isNaN(v));
  const avgTalk      = validTalk.length ? (validTalk.reduce((a, b) => a + b, 0) / validTalk.length / 1000).toFixed(1) : 0;
  const uniqueAgents = new Set(rows.map((r) => r.udh_user_id).filter(Boolean)).size;

  return {
    campaignData, hourlyData, dispData, codeData,
    agentData, scatterData, queueData, dailyData, heatmap, talkHistogram,
    summary: { total, connected, callDrops, avgTalk, uniqueAgents,
      connRate: total > 0 ? +((connected / total) * 100).toFixed(1) : 0 },
  };
};

/* ── hook ─────────────────────────────────────────────────────────── */
const useDashboardCharts = () => {
  const [raw,          setRaw]          = useState(null);
  const [rawPrev,      setRawPrev]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [preset,       setPreset]       = useState('today');
  const [customStart,  setCustomStart]  = useState('');
  const [customEnd,    setCustomEnd]    = useState('');
  const [selCampaign,  setSelCampaign]  = useState('all');
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const load = useCallback(async (presetId, startDateIn, endDateIn) => {
    let startDate, endDate;

    if (presetId === 'custom') {
      startDate = startDateIn;
      endDate   = endDateIn;
      if (!startDate || !endDate || startDate >= endDate) return;
      setCustomStart(startDate);
      setCustomEnd(endDate);
    } else {
      const p = DATE_PRESETS.find((x) => x.id === presetId) || DATE_PRESETS[0];
      ({ startDate, endDate } = p.get());
    }

    const prev = getPrevRange(startDate, endDate);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setPreset(presetId);

    try {
      const [curr, prevRes] = await Promise.all([
        fetchRawData({ startDate, endDate, limit: 0 }),
        fetchRawData({ startDate: prev.startDate, endDate: prev.endDate, limit: 0 }),
      ]);
      if (!ctrl.signal.aborted) { setRaw(curr); setRawPrev(prevRes); }
    } catch (err) {
      if (err.name !== 'AbortError')
        setError(err.response?.data?.message || err.message || 'Failed to load');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  /* auto-load today on mount */
  useEffect(() => { load('today'); }, [load]);

  /* filter rows by selected campaign */
  const filterRows = useCallback((rows) => {
    if (!rows) return null;
    if (selCampaign === 'all') return rows;
    return rows.filter((r) => (r.campaign_name || 'Unknown') === selCampaign);
  }, [selCampaign]);

  const charts     = useMemo(() => computeCharts(filterRows(raw?.rows)),     [raw,     filterRows]);
  const chartsPrev = useMemo(() => computeCharts(filterRows(rawPrev?.rows)), [rawPrev, filterRows]);

  /* unique campaign list */
  const campaigns = useMemo(() => {
    if (!raw?.rows) return [];
    return Array.from(new Set(raw.rows.map((r) => r.campaign_name || 'Unknown').filter(Boolean))).sort();
  }, [raw]);

  const totalRows = selCampaign === 'all'
    ? (raw?.count || 0)
    : (filterRows(raw?.rows)?.length || 0);

  return {
    charts, chartsPrev, loading, error, preset, load, totalRows,
    selectedCampaign: selCampaign, setSelectedCampaign: setSelCampaign,
    campaigns, customStart, customEnd,
  };
};

export default useDashboardCharts;
