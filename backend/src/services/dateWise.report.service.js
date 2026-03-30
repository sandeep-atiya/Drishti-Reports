import dateWiseRepository from '../repositories/report/dateWise.report.repository.js';
import logger from '../utils/logger.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const num = (v) => Number(v) || 0;
const pct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0.0%');

/**
 * Normalise a DB date value to a YYYY-MM-DD string.
 * PostgreSQL may return Date objects or ISO strings; handle both.
 */
const toDateStr = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v.substring(0, 10);
  if (v instanceof Date)    return v.toISOString().substring(0, 10);
  return String(v).substring(0, 10);
};

/**
 * Case-insensitive, trimmed string key for agent-name matching.
 * PG usernames and MSSQL verifier_name may differ in casing.
 */
const agentKey = (name) => (name || '').trim().toLowerCase();

// ── Service ───────────────────────────────────────────────────────────────────

const dateWiseReportService = {
  /**
   * Build a per-agent, per-date report by joining:
   *   PostgreSQL → calls per agent per day
   *   MS SQL     → orders / verified counts / amounts per agent (verifier_name) per day
   *
   * Join key: DATE + agent username (case-insensitive)
   *
   * Columns returned:
   *   Date | Agents | Calls | Orders | Verified | Verified Amount |
   *   Verified Ticket Size | Order Con | Verified Con | Verification % | RPC
   */
  getReport: async ({ startDate, endDate }) => {
    const t0 = Date.now();

    // ── Step 1: PG – calls per agent per date ────────────────────────────────
    const pgRows = await dateWiseRepository.getCallsByAgentDate({ startDate, endDate });
    logger.info(`[DateWise] PG done: ${pgRows.length} agent-date rows (${Date.now() - t0}ms)`);

    if (!pgRows.length) return [];

    // ── Step 2: MSSQL – order stats per agent (verifier_name) per date ───────
    const msRows = await dateWiseRepository.getOrderStatsByAgent({ startDate, endDate });
    logger.info(`[DateWise] MSSQL done: ${msRows.length} agent-date order rows (${Date.now() - t0}ms)`);

    // ── Step 3: Build MSSQL lookup map ───────────────────────────────────────
    // Key: `${YYYY-MM-DD}|${agentNameLower}`  →  { orders, verified, verifiedAmount }
    const orderMap = new Map();
    for (const row of msRows) {
      const dateStr = toDateStr(row.order_date);
      if (!dateStr) continue;
      const key = `${dateStr}|${agentKey(row.agent_name)}`;
      // Sum up in case of duplicate keys (shouldn't happen, but defensive)
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
      const dateStr = toDateStr(row.call_date);
      const calls   = num(row.calls);

      const key   = `${dateStr}|${agentKey(row.agent_name)}`;
      const stats = orderMap.get(key) || { orders: 0, verified: 0, verifiedAmount: 0 };

      const { orders, verified, verifiedAmount } = stats;

      // Verified Ticket Size = Verified Amount ÷ Verified Orders
      const verifiedTicketSize = verified > 0
        ? Math.round(verifiedAmount / verified)
        : 0;

      // Order Conversion  = Orders ÷ Calls %
      const orderCon = pct(orders, calls);

      // Verified Conversion = Verified ÷ Calls %
      const verifiedCon = pct(verified, calls);

      // Verification % = Verified ÷ Total Orders %
      const verificationPct = pct(verified, orders);

      // RPC = Verified Amount ÷ Total Calls
      const rpc = calls > 0
        ? (verifiedAmount / calls).toFixed(2)
        : '0.00';

      return {
        'Date':                 dateStr,
        'Agents':               row.agent_name || 'Unknown',
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

    // Sort: agent name ascending, then date ascending within each agent
    rows.sort((a, b) => {
      const agentCmp = (a['Agents'] || '').localeCompare(b['Agents'] || '');
      if (agentCmp !== 0) return agentCmp;
      return (a['Date'] || '').localeCompare(b['Date'] || '');
    });

    logger.info(`[DateWise] Assembled ${rows.length} rows  total: ${Date.now() - t0}ms`);
    return rows;
  },
};

export default dateWiseReportService;
