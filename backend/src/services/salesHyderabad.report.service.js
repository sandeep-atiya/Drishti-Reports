import salesHydrabadRepository from '../repositories/report/salesHyderabad.report.repository.js';
import logger from '../utils/logger.js';

const num      = (v) => Number(v) || 0;
const pct      = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0.0%');
const agentKey = (s) => String(s || '').trim().toLowerCase();

/**
 * Map an exact campaign_name (case-insensitive) to a stable internal key.
 * Keys used for individual sheets: unayur_in, inbound_2, digital_inbound, group_a.
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

const salesHydrabadService = {
  /**
   * Build a Sales Hyderabad report — identical logic to Sales Conversion
   * but restricted to agents whose username ends with 'HYD'.
   *
   * Returns five arrays aggregated over the full date range:
   *   overall         – all campaigns merged (includes Campaign column)
   *   unayur_in       – Unayur_IN only
   *   inbound_2       – Inbound_2 only
   *   digital_inbound – Digital Inbound only
   *   group_a         – Group A only
   */
  getReport: async ({ startDate, endDate }) => {
    const t0 = Date.now();

    const [pgRows, groupSFLookup, msRows] = await Promise.all([
      salesHydrabadRepository.getCallsByAgentCampaign({ startDate, endDate }),
      salesHydrabadRepository.getGroupSFCampaignId(),
      salesHydrabadRepository.getOrderStatsByAgentCampaign({ startDate, endDate }),
    ]);

    logger.info(
      `[SalesHyderabad] PG calls:${pgRows.length}  groupSFLookup:${groupSFLookup.length}  ` +
      `MSSQL orders:${msRows.length}  (${Date.now() - t0}ms)`
    );

    const empty = { overall: [], unayur_in: [], inbound_2: [], digital_inbound: [], group_a: [] };
    if (!pgRows.length && !msRows.length) return empty;

    // ── Build campaign_id → campaign_name map ─────────────────────────────────
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

    // ── Assemble PG-driven rows (skip Group SF — no call records) ─────────────
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
          "Agent's Name":         row.agent_id || row.agent_name || 'Unknown',
          'Campaign':             row.campaign_name || '',
          '_campaignKey':         getCampaignKey(row.campaign_name),
          'Calls':                calls,
          'Orders':               orders,
          'Verified':             verified,
          'Verified Amount':      verifiedAmount,
          'Verified Ticket Size': verifiedTicketSize,
          'Order Conversion':     pct(orders,   calls),
          'Verified Conversion':  pct(verified, calls),
          'Verification %':       pct(verified, orders),
          'RPC':                  calls > 0 ? Number((verifiedAmount / calls).toFixed(2)) : 0,
        };
      });

    // ── MSSQL-only rows for Group SF HYD agents ───────────────────────────────
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
          "Agent's Name":         agentName,
          'Campaign':             campaignName,
          '_campaignKey':         'group_sf',
          'Calls':                0,
          'Orders':               orders,
          'Verified':             verified,
          'Verified Amount':      verifiedAmount,
          'Verified Ticket Size': verified > 0 ? Math.round(verifiedAmount / verified) : 0,
          'Order Conversion':     '—',
          'Verified Conversion':  '—',
          'Verification %':       pct(verified, orders),
          'RPC':                  '—',
        });
      }

      logger.info(`[SalesHyderabad] Group SF MSSQL-only rows added: ${groupSFAgentMap.size}`);
    } else {
      logger.warn('[SalesHyderabad] Group SF campaign_Id not found — no MSSQL-only rows added.');
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
      `[SalesHyderabad] Sheets — overall:${overall.length} unayur:${unayur_in.length} ` +
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

export default salesHydrabadService;
