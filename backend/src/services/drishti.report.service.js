import drishtiReportRepository from '../repositories/report/drishti.report.repository.js';

const pct = (numerator, denominator) =>
  denominator > 0 ? `${Math.round((numerator / denominator) * 100)}%` : '0%';

const computeMetrics = ({ calls, orders, verified, verifiedAmount }) => {
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
    orderConversion:    pct(o, c),   // Orders / Calls %
    verifiedConversion: pct(v, c),   // Verified / Calls %
    verificationPct:    pct(v, o),   // Verified / Orders %
    rpc:                c > 0 ? Math.round(va / c) : 0,  // Verified Amount / Calls
  };
};

const buildCampaignTable = async ({ startDate, endDate }) => {
  const callsRows = await drishtiReportRepository.getCallsByCampaign({ startDate, endDate });

  const campaignIds = callsRows.map((r) => r.campaign_id).filter(Boolean);
  const ordersRows  = await drishtiReportRepository.getOrdersByCampaign({ startDate, endDate, campaignIds });

  const ordersMap = {};
  for (const row of ordersRows) {
    ordersMap[String(row.campaign_Id)] = row;
  }

  return callsRows.map((r) => {
    const ord = ordersMap[String(r.campaign_id)] || {};
    return {
      campaign: r.campaign_name,
      ...computeMetrics({
        calls:          r.calls,
        orders:         ord.orders          || 0,
        verified:       ord.verified        || 0,
        verifiedAmount: ord.verified_amount || 0,
      }),
    };
  });
};

const buildAgentTable = async ({ startDate, endDate }) => {
  const callsRows = await drishtiReportRepository.getCallsByAgent({ startDate, endDate });

  const campaignIds = [...new Set(callsRows.map((r) => r.campaign_id).filter(Boolean))];
  const ordersRows  = await drishtiReportRepository.getOrdersByAgent({ startDate, endDate, campaignIds });

  // Sum orders per AgentID across campaigns
  const ordersMap = {};
  for (const row of ordersRows) {
    const key = String(row.AgentID);
    if (!ordersMap[key]) ordersMap[key] = { orders: 0, verified: 0, verified_amount: 0 };
    ordersMap[key].orders          += Number(row.orders)          || 0;
    ordersMap[key].verified        += Number(row.verified)        || 0;
    ordersMap[key].verified_amount += Number(row.verified_amount) || 0;
  }

  // Sum calls per agent across campaigns
  const agentMap = {};
  for (const r of callsRows) {
    const key = r.udh_user_id || 'unknown';
    if (!agentMap[key]) {
      agentMap[key] = { agent: r.username || r.udh_user_id || 'Unknown', agentId: r.udh_user_id, calls: 0 };
    }
    agentMap[key].calls += Number(r.calls) || 0;
  }

  return Object.values(agentMap).map((a) => {
    const ord = ordersMap[String(a.agentId)] || {};
    return {
      agent: a.agent,
      ...computeMetrics({
        calls:          a.calls,
        orders:         ord.orders          || 0,
        verified:       ord.verified        || 0,
        verifiedAmount: ord.verified_amount || 0,
      }),
    };
  });
};

const drishtiReportService = {
  /**
   * Returns both campaign-level and agent-level tables in one call.
   */
  getReport: async ({ startDate, endDate }) => {
    const [campaignData, agentData] = await Promise.all([
      buildCampaignTable({ startDate, endDate }),
      buildAgentTable({ startDate, endDate }),
    ]);
    return { campaignData, agentData };
  },
};

export default drishtiReportService;
