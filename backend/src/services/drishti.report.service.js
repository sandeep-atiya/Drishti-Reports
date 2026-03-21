import drishtiReportRepository from '../repositories/report/drishti.report.repository.js';
import { getCachedReport, setCachedReport } from '../utils/cache.js';

const pct = (n, d) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '0%');

const metrics = ({ calls, orders, verified, verifiedAmount }) => {
  const c  = Number(calls)          || 0;
  const o  = Number(orders)         || 0;
  const v  = Number(verified)       || 0;
  const va = Number(verifiedAmount) || 0;
  return {
    calls:              c,
    orders:             o,
    verified:           v,
    verifiedAmount:     va,
    verifiedTicketSize: v > 0 ? Math.round(va / v) : 0,
    orderConversion:    pct(o, c),
    verifiedConversion: pct(v, c),
    verificationPct:    pct(v, o),
    rpc:                c > 0 ? Math.round(va / c) : 0,
  };
};

const drishtiReportService = {
  getReport: async ({ startDate, endDate }) => {
    // ── Cache check ───────────────────────────────────────────────────────
    const cached = await getCachedReport(startDate, endDate);
    if (cached) {
      console.log(`[PERF] Cache hit for ${startDate} → ${endDate}`);
      return cached;
    }

    const t0 = Date.now();

    // ── Step 1: single PG query (one table scan instead of two) ──────────
    const pgAgentRows = await drishtiReportRepository.getCallsByAgent({ startDate, endDate });
    console.log(`[PERF] PG query done in ${Date.now() - t0}ms  (${pgAgentRows.length} agent rows)`);

    // ── Step 2: derive campaign-level call totals from agent rows (no extra DB hit) ──
    const pgCampaignMap = {};
    for (const r of pgAgentRows) {
      const key = String(r.campaign_id);
      if (!pgCampaignMap[key]) {
        pgCampaignMap[key] = { campaign_name: r.campaign_name, campaign_id: r.campaign_id, calls: 0 };
      }
      pgCampaignMap[key].calls += Number(r.calls) || 0;
    }
    const pgCampaignRows = Object.values(pgCampaignMap);

    // unique campaign IDs for MSSQL filter
    const campaignIds = pgCampaignRows.map((r) => r.campaign_id).filter(Boolean);

    // ── Step 3: both MSSQL queries in parallel ────────────────────────────
    const t1 = Date.now();
    const [mssqlCampaignRows, mssqlAgentRows] = await Promise.all([
      drishtiReportRepository.getOrdersByCampaign({ startDate, endDate, campaignIds }),
      drishtiReportRepository.getOrdersByAgent({ startDate, endDate, campaignIds }),
    ]);
    console.log(`[PERF] MSSQL queries done in ${Date.now() - t1}ms`);

    // ── Step 4: build campaign table ──────────────────────────────────────
    const campaignOrdersMap = {};
    for (const row of mssqlCampaignRows) {
      campaignOrdersMap[String(row.campaign_Id)] = row;
    }

    const campaignData = pgCampaignRows.map((r) => {
      const ord = campaignOrdersMap[String(r.campaign_id)] || {};
      return {
        campaign: r.campaign_name,
        ...metrics({
          calls:          r.calls,
          orders:         ord.orders          || 0,
          verified:       ord.verified        || 0,
          verifiedAmount: ord.verified_amount || 0,
        }),
      };
    });

    // ── Step 5: build agent table ─────────────────────────────────────────
    const agentOrdersMap = {};
    for (const row of mssqlAgentRows) {
      const key = String(row.AgentID);
      if (!agentOrdersMap[key]) agentOrdersMap[key] = { orders: 0, verified: 0, verified_amount: 0 };
      agentOrdersMap[key].orders          += Number(row.orders)          || 0;
      agentOrdersMap[key].verified        += Number(row.verified)        || 0;
      agentOrdersMap[key].verified_amount += Number(row.verified_amount) || 0;
    }

    const agentCallsMap = {};
    for (const r of pgAgentRows) {
      const key = r.udh_user_id || 'unknown';
      if (!agentCallsMap[key]) {
        agentCallsMap[key] = { agent: r.username || r.udh_user_id || 'Unknown', agentId: r.udh_user_id, calls: 0 };
      }
      agentCallsMap[key].calls += Number(r.calls) || 0;
    }

    const agentData = Object.values(agentCallsMap).map((a) => {
      const ord = agentOrdersMap[String(a.agentId)] || {};
      return {
        agent: a.agent,
        ...metrics({
          calls:          a.calls,
          orders:         ord.orders          || 0,
          verified:       ord.verified        || 0,
          verifiedAmount: ord.verified_amount || 0,
        }),
      };
    });

    const result = { campaignData, agentData };
    console.log(`[PERF] Total: ${Date.now() - t0}ms`);

    // Store in cache (fire-and-forget — don't block the response)
    setCachedReport(startDate, endDate, result).catch(() => {});

    return result;
  },
};

export default drishtiReportService;
