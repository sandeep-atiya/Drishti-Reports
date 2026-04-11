import drishtiReportRepository from '../repositories/report/drishti.report.repository.js';
import { getCachedReport, setCachedReport } from '../utils/cache.js';
import logger from '../utils/logger.js';

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
      logger.info(`[PERF] Cache hit for ${startDate} → ${endDate}`);
      return cached;
    }

    const t0 = Date.now();

    // ── Step 1: calls per agent (SQLite when ready, PG fallback) ─────────
    const pgAgentRows = await drishtiReportRepository.getCallsByAgent({ startDate, endDate });
    logger.info(`[PERF] Calls query done in ${Date.now() - t0}ms  (${pgAgentRows.length} rows)`);

    // ── Step 2: derive campaign-level call totals — merged by campaign_name ──────
    //
    // A campaign may have more than one ch_campaign_id in PG (e.g. old vs. new ID,
    // or inconsistent values in duplicate rows).  Grouping first by campaign_id and
    // then merging by campaign_name ensures:
    //   • The campaign table shows ONE row per campaign name (no duplicates).
    //   • All campaign_ids for the same name are forwarded to MSSQL so no orders
    //     are lost.
    //   • Only campaign_ids that actually appear under the expected campaign names
    //     are forwarded — i.e. we never send IDs that belong to other campaigns.

    // Pass 1 — group by campaign_id (deduplicate PG rows)
    const byId = new Map();
    for (const r of pgAgentRows) {
      const key = String(r.campaign_id ?? '');
      if (!byId.has(key)) {
        byId.set(key, { campaign_name: (r.campaign_name || '').trim(), campaign_id: r.campaign_id, calls: 0 });
      }
      byId.get(key).calls += Number(r.calls) || 0;
    }

    // Pass 2 — merge by campaign_name so each campaign appears only once
    const byName = new Map();
    for (const row of byId.values()) {
      const name = row.campaign_name;
      if (!byName.has(name)) {
        byName.set(name, { campaign_name: name, campaignIds: new Set(), calls: 0 });
      }
      const entry = byName.get(name);
      entry.calls += row.calls;
      if (row.campaign_id != null && row.campaign_id !== '') {
        entry.campaignIds.add(String(row.campaign_id));
      }
    }

    // Flat list of all unique, non-null campaign IDs for the MSSQL filter
    const campaignIds = [...new Set(
      [...byName.values()].flatMap((c) => [...c.campaignIds])
    )].filter(Boolean);

    // ── Step 3: orders queries in parallel (SQLite when ready, MSSQL fallback) ──
    const t1 = Date.now();
    const [mssqlCampaignRows, mssqlAgentRows] = await Promise.all([
      drishtiReportRepository.getOrdersByCampaign({ startDate, endDate, campaignIds }),
      drishtiReportRepository.getOrdersByAgent({ startDate, endDate, campaignIds }),
    ]);
    logger.info(`[PERF] Orders queries done in ${Date.now() - t1}ms`);

    // ── Step 4: build campaign table ──────────────────────────────────────
    // Index MSSQL rows by campaign_Id for fast lookup.
    const mssqlByCampaignId = new Map();
    for (const row of mssqlCampaignRows) {
      mssqlByCampaignId.set(String(row.campaign_Id), row);
    }

    // Build one row per campaign name, summing orders across all campaign IDs
    // that belong to that name (handles the multi-ID-per-campaign case).
    const campaignData = [...byName.values()].map((c) => {
      let orders = 0, verified = 0, verifiedAmount = 0;
      for (const cid of c.campaignIds) {
        const ord = mssqlByCampaignId.get(cid);
        if (ord) {
          orders         += Number(ord.orders)          || 0;
          verified       += Number(ord.verified)        || 0;
          verifiedAmount += Number(ord.verified_amount) || 0;
        }
      }
      return {
        campaign: c.campaign_name,
        ...metrics({ calls: c.calls, orders, verified, verifiedAmount }),
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
    logger.info(`[PERF] Total: ${Date.now() - t0}ms`);

    // Store in cache (fire-and-forget — setCachedReport handles its own errors internally)
    setCachedReport(startDate, endDate, result);

    return result;
  },
};

export default drishtiReportService;
