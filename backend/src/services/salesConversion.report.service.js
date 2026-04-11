import salesConversionRepository from '../repositories/report/salesConversion.report.repository.js';
import logger from '../utils/logger.js';

const num      = (v) => Number(v) || 0;
const pct      = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0.0%');
const agentKey = (s) => String(s || '').trim().toLowerCase();

/**
 * Map an exact campaign_name (case-insensitive) to a stable internal key.
 * Keys used for individual sheets: unayur_in, inbound_2, digital_inbound, group_a.
 * All other campaigns resolve to their own key but appear in Overall sheet only.
 */
const getCampaignKey = (name) => {
  switch ((name || '').trim().toLowerCase()) {
    case 'unayur_in':             return 'unayur_in';
    case 'inbound_2':             return 'inbound_2';
    case 'digital inbound':       return 'digital_inbound';
    case 'group_a':               return 'group_a';
    case 'courtesy':              return 'courtesy';
    case 'agent_consultation':    return 'agent_consultation';
    case 'group_s_pro':           return 'group_s_pro';
    case 'group sf':              return 'group_sf';
    case 'repeat_tracker':        return 'repeat_tracker';
    case 'doctor_consultation_1': return 'doctor_consultation_1';
    case 'inbound_one':           return 'inbound_one';
    case 'doctor_in':             return 'doctor_in';
    default:                      return null;
  }
};

const salesConversionService = {
  /**
   * Build a Sales Conversion report for all 12 sales campaigns.
   *
   * Returns five arrays aggregated over the full date range:
   *   overall         – all 12 campaigns merged (includes Campaign column)
   *   unayur_in       – Unayur_IN only
   *   inbound_2       – Inbound_2 only
   *   digital_inbound – Digital Inbound only
   *   group_a         – Group A only
   *
   * ── Special handling: Group SF ────────────────────────────────────────────
   * Group SF agents create orders manually in MSSQL. No call records exist in
   * PostgreSQL for this campaign. Group SF rows are built from MSSQL data only:
   *   Calls = 0
   *   Order Conversion / Verified Conversion / RPC = '—' (no calls denominator)
   *   Verification % = Verified ÷ Orders  (still computable)
   *
   * Group SF's ch_campaign_id is discovered via a targeted LIMIT 1 lookup
   * (fast — does not scan the full table).
   */
  getReport: async ({ startDate, endDate }) => {
    const t0 = Date.now();

    // Run all three queries in parallel.
    // getGroupSFCampaignId uses LIMIT 1 — very fast, safe to run every time.
    const [pgRows, groupSFLookup, msRows] = await Promise.all([
      salesConversionRepository.getCallsByAgentCampaign({ startDate, endDate }),
      salesConversionRepository.getGroupSFCampaignId(),
      salesConversionRepository.getOrderStatsByAgentCampaign({ startDate, endDate }),
    ]);

    logger.info(
      `[SalesConversion] PG calls:${pgRows.length}  groupSFLookup:${groupSFLookup.length}  ` +
      `MSSQL orders:${msRows.length}  (${Date.now() - t0}ms)`
    );

    const empty = { overall: [], unayur_in: [], inbound_2: [], digital_inbound: [], group_a: [] };
    if (!pgRows.length && !msRows.length) return empty;

    // ── Build campaign_id → campaign_name map ─────────────────────────────────
    // Use PG call rows (already date-filtered, no extra query) plus the Group SF
    // targeted lookup (LIMIT 1, covers the case where Group SF has no date-range rows).
    const campaignNameMap = new Map();
    for (const r of pgRows) {
      if (r.ch_campaign_id != null) {
        campaignNameMap.set(String(r.ch_campaign_id), r.campaign_name);
      }
    }
    for (const r of groupSFLookup) {
      if (r.ch_campaign_id != null) {
        campaignNameMap.set(String(r.ch_campaign_id), r.campaign_name);
      }
    }

    // Find all campaign_Ids that correspond to Group SF
    const groupSFIds = new Set(
      [...campaignNameMap.entries()]
        .filter(([, name]) => getCampaignKey(name) === 'group_sf')
        .map(([id]) => id)
    );

    // ── Build MSSQL lookup map ────────────────────────────────────────────────
    // Key: `lower(agent_id)|campaign_id`
    const orderMap = new Map();
    for (const row of msRows) {
      const key      = `${agentKey(row.agent_id)}|${String(row.campaign_Id ?? '')}`;
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

    // ── Assemble PG-driven rows (all campaigns with PG call records) ──────────
    // Skip Group SF here — its agents create orders manually so PG call counts
    // are not meaningful. Group SF rows are added separately via MSSQL-only path.
    const rows = pgRows
      .filter((row) => getCampaignKey(row.campaign_name) !== 'group_sf')
      .map((row) => {
      const campaignId = String(row.ch_campaign_id ?? '');
      const calls      = num(row.calls);

      const key   = `${agentKey(row.agent_id)}|${campaignId}`;
      const stats = orderMap.get(key) || { orders: 0, verified: 0, verifiedAmount: 0 };
      const { orders, verified, verifiedAmount } = stats;

      const verifiedTicketSize = verified > 0 ? Math.round(verifiedAmount / verified) : 0;

      return {
        "Agent's Name":        row.agent_name || row.agent_id || 'Unknown',
        'Campaign':            row.campaign_name || '',
        '_campaignKey':        getCampaignKey(row.campaign_name),
        'Calls':               calls,
        'Orders':              orders,
        'Verified':            verified,
        'Verified Amount':     verifiedAmount,
        'Verified Ticket Size': verifiedTicketSize,
        'Order Conversion':    pct(orders,   calls),
        'Verified Conversion': pct(verified, calls),
        'Verification %':      pct(verified, orders),
        'RPC':                 calls > 0 ? Number((verifiedAmount / calls).toFixed(2)) : 0,
      };
    });

    // ── MSSQL-only rows for Group SF ──────────────────────────────────────────
    // Calls = 0; call-based metrics = '—'.
    if (groupSFIds.size > 0) {
      const groupSFAgentMap = new Map();

      for (const row of msRows) {
        const campaignIdStr = String(row.campaign_Id ?? '');
        if (!groupSFIds.has(campaignIdStr)) continue;
        const agId = String(row.agent_id || '').trim();
        if (!agId) continue;

        const existing     = groupSFAgentMap.get(agId.toLowerCase());
        const campaignName = campaignNameMap.get(campaignIdStr) || 'Group SF';

        if (existing) {
          existing.orders         += num(row.total_orders);
          existing.verified       += num(row.verified_orders);
          existing.verifiedAmount += num(row.verified_amount);
        } else {
          groupSFAgentMap.set(agId.toLowerCase(), {
            agentName:      agId,
            campaignName,
            orders:         num(row.total_orders),
            verified:       num(row.verified_orders),
            verifiedAmount: num(row.verified_amount),
          });
        }
      }

      for (const stats of groupSFAgentMap.values()) {
        const { agentName, campaignName, orders, verified, verifiedAmount } = stats;
        rows.push({
          "Agent's Name":        agentName,
          'Campaign':            campaignName,
          '_campaignKey':        'group_sf',
          'Calls':               0,
          'Orders':              orders,
          'Verified':            verified,
          'Verified Amount':     verifiedAmount,
          'Verified Ticket Size': verified > 0 ? Math.round(verifiedAmount / verified) : 0,
          'Order Conversion':    '—',
          'Verified Conversion': '—',
          'Verification %':      pct(verified, orders),
          'RPC':                 '—',
        });
      }

      logger.info(`[SalesConversion] Group SF MSSQL-only rows added: ${groupSFAgentMap.size}`);
    } else {
      logger.warn('[SalesConversion] Group SF campaign_Id not found — no MSSQL-only rows added.');
    }

    // ── Sort: campaign asc, then agent asc ────────────────────────────────────
    rows.sort((a, b) => {
      const cmpCampaign = (a['Campaign'] || '').localeCompare(b['Campaign'] || '');
      if (cmpCampaign !== 0) return cmpCampaign;
      return (a["Agent's Name"] || '').localeCompare(b["Agent's Name"] || '');
    });

    // ── Partition into sheets ─────────────────────────────────────────────────
    const clean = (arr) => arr.map(({ _campaignKey, ...rest }) => rest);

    const overall         = rows;
    const unayur_in       = rows.filter((r) => r._campaignKey === 'unayur_in');
    const inbound_2       = rows.filter((r) => r._campaignKey === 'inbound_2');
    const digital_inbound = rows.filter((r) => r._campaignKey === 'digital_inbound');
    const group_a         = rows.filter((r) => r._campaignKey === 'group_a');

    logger.info(
      `[SalesConversion] Sheets — overall:${overall.length} unayur:${unayur_in.length} ` +
      `inbound2:${inbound_2.length} digital:${digital_inbound.length} groupA:${group_a.length} ` +
      `(${Date.now() - t0}ms)`
    );

    return {
      overall:         clean(overall),
      unayur_in:       clean(unayur_in),
      inbound_2:       clean(inbound_2),
      digital_inbound: clean(digital_inbound),
      group_a:         clean(group_a),
    };
  },
};

export default salesConversionService;
