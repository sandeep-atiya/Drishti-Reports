import dateWiseCampaignRepository from '../repositories/report/dateWiseCampaign.report.repository.js';
import logger from '../utils/logger.js';

const num = (v) => Number(v) || 0;
const pct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0.0%');

const toDateStr = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v.substring(0, 10);
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).substring(0, 10);
};

const dateWiseCampaignService = {
  /**
   * Build a per-campaign, per-date report by joining:
   *
   *   PostgreSQL  → calls per campaign per day
   *                 join key: ch_campaign_id  (int)
   *
   *   MS SQL      → orders / verified per campaign per day
   *                 join key: campaign_Id     (int)  ← same integer, reliable match
   *
   * Join key:  `${YYYY-MM-DD}|${campaign_id}`
   *
   * Column logic:
   *   Calls           = COUNT(DISTINCT ch_call_id) per campaign per date  (PG)
   *   Orders          = COUNT(*) grouped by campaign_Id + date            (MSSQL)
   *   Verified        = orders where disposition_Code = 'Verified'
   *   Verified Amount = SUM(total_amount) of verified orders
   *   Ticket Size     = Verified Amount ÷ Verified
   *   Order Con       = Orders ÷ Calls %
   *   Verified Con    = Verified ÷ Calls %
   *   Verification %  = Verified ÷ Orders %
   *   RPC             = Verified Amount ÷ Calls
   */
  getReport: async ({ startDate, endDate }) => {
    const t0 = Date.now();

    // ── Step 1: PG – calls per campaign per date ──────────────────────────────
    const pgRows = await dateWiseCampaignRepository.getCallsByCampaignDate({ startDate, endDate });
    logger.info(`[DateWiseCampaign] PG done: ${pgRows.length} campaign-date rows (${Date.now() - t0}ms)`);

    if (!pgRows.length) return [];

    // ── Step 2: MSSQL – order stats per campaign_Id per date ─────────────────
    const msRows = await dateWiseCampaignRepository.getOrderStatsByCampaign({ startDate, endDate });
    logger.info(`[DateWiseCampaign] MSSQL done: ${msRows.length} campaign-date order rows (${Date.now() - t0}ms)`);

    // ── Step 3: Build MSSQL lookup map ───────────────────────────────────────
    // Key: `${YYYY-MM-DD}|${campaign_id}` — integer campaign IDs on both sides
    const orderMap = new Map();
    for (const row of msRows) {
      const dateStr    = toDateStr(row.order_date);
      const campaignId = String(row.campaign_Id ?? '');
      if (!dateStr || !campaignId) continue;
      const key      = `${dateStr}|${campaignId}`;
      const existing = orderMap.get(key);
      if (existing) {
        existing.orders         += num(row.total_orders);
        existing.verified       += num(row.verified_orders);
        existing.verifiedAmount += num(row.verified_amount);
      } else {
        orderMap.set(key, {
          orders:         num(row.total_orders),
          verified:       num(row.verified_orders),
          verifiedAmount: num(row.verified_amount),
        });
      }
    }

    // ── Step 4: Assemble final rows ───────────────────────────────────────────
    const rows = pgRows.map((row) => {
      const dateStr    = toDateStr(row.call_date);
      const campaignId = String(row.campaign_id ?? '');
      const calls      = num(row.calls);

      const key   = `${dateStr}|${campaignId}`;
      const stats = orderMap.get(key) || { orders: 0, verified: 0, verifiedAmount: 0 };

      const { orders, verified, verifiedAmount } = stats;

      const verifiedTicketSize = verified > 0
        ? Math.round(verifiedAmount / verified)
        : 0;

      const orderCon        = pct(orders,   calls);
      const verifiedCon     = pct(verified, calls);
      const verificationPct = pct(verified, orders);
      const rpc             = calls > 0
        ? (verifiedAmount / calls).toFixed(2)
        : '0.00';

      return {
        'Date':                 dateStr,
        'Campaign':             row.campaign_name || 'Unknown',
        'Calls':                calls,
        'Orders':               orders,
        'Verified':             verified,
        'Verified Amount':      verifiedAmount,
        'Verified Ticket Size': verifiedTicketSize,
        'Order Con':            orderCon,
        'Verified Con':         verifiedCon,
        'Verification %':       verificationPct,
        'RPC':                  rpc,
      };
    });

    // Sort: campaign name ascending, then date ascending within each campaign
    rows.sort((a, b) => {
      const cmpCampaign = (a['Campaign'] || '').localeCompare(b['Campaign'] || '');
      if (cmpCampaign !== 0) return cmpCampaign;
      return (a['Date'] || '').localeCompare(b['Date'] || '');
    });

    logger.info(`[DateWiseCampaign] Assembled ${rows.length} rows  total: ${Date.now() - t0}ms`);
    return rows;
  },
};

export default dateWiseCampaignService;
