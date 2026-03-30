import dateWiseRepository from '../repositories/report/dateWise.report.repository.js';
import logger from '../utils/logger.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const num = (v) => Number(v) || 0;
const pct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0.0%');

/**
 * Normalise a DB date value to a "YYYY-MM-DD" string.
 *
 * PG query uses TO_CHAR(..., 'YYYY-MM-DD') so call_date always arrives as a
 * plain string — no Date-object timezone issues.
 * MSSQL uses CONVERT(VARCHAR(10), createdOn, 120) — also a plain string.
 * Both paths are strings, so this function is a safe fallback.
 */
const toDateStr = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v.substring(0, 10);
  // Sequelize may still return a Date object in some drivers;
  // use LOCAL date parts (not UTC) to stay in server timezone
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).substring(0, 10);
};

/**
 * Case-insensitive, trimmed join key for agent-name matching.
 * Both PG.udh_user_id and MSSQL.doctor_name store the same CRM username
 * but casing/whitespace might differ.
 */
const agentKey = (name) => String(name || '').trim().toLowerCase();

// ── Service ───────────────────────────────────────────────────────────────────

const dateWiseReportService = {
  /**
   * Build a per-agent, per-date report by joining:
   *
   *   PostgreSQL  → calls per agent per day
   *                 agent_id = COALESCE(udh_user_id, username)
   *                 e.g. "HammadBT1"
   *
   *   MS SQL      → orders / verified per agent per day
   *                 agent_id = doctor_name (same CRM username string)
   *                 e.g. "HammadBT1"
   *
   * Join key:  DATE  +  LOWER(TRIM(agent_id))
   *
   * Column logic:
   *   Calls            = COUNT(DISTINCT ch_call_id) per agent per date (PG)
   *   Orders           = COUNT(*) grouped by doctor_name + date (MSSQL)
   *   Verified         = orders where disposition_Code = 'Verified'
   *   Verified Amount  = SUM(total_amount) of verified orders
   *   Ticket Size      = Verified Amount ÷ Verified
   *   Order Con        = Orders ÷ Calls %
   *   Verified Con     = Verified ÷ Calls %
   *   Verification %   = Verified ÷ Orders %
   *   RPC              = Verified Amount ÷ Calls
   */
  getReport: async ({ startDate, endDate }) => {
    const t0 = Date.now();

    // ── Step 1: PG – calls per agent per date ────────────────────────────────
    const pgRows = await dateWiseRepository.getCallsByAgentDate({ startDate, endDate });
    logger.info(`[DateWise] PG done: ${pgRows.length} agent-date rows (${Date.now() - t0}ms)`);

    if (!pgRows.length) return [];

    // ── Step 2: MSSQL – order stats per doctor_name per date ─────────────────
    const msRows = await dateWiseRepository.getOrderStatsByAgent({ startDate, endDate });
    logger.info(`[DateWise] MSSQL done: ${msRows.length} agent-date order rows (${Date.now() - t0}ms)`);

    // ── Step 3: Build MSSQL lookup map ───────────────────────────────────────
    // Key: `${YYYY-MM-DD}|${agentNameLower}` → { orders, verified, verifiedAmount }
    const orderMap = new Map();
    for (const row of msRows) {
      const dateStr = toDateStr(row.order_date);
      if (!dateStr) continue;
      const key = `${dateStr}|${agentKey(row.agent_id)}`;
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
      const dateStr = toDateStr(row.call_date);   // always a plain string from TO_CHAR
      const calls   = num(row.calls);

      // agent_id  = COALESCE(udh_user_id, username) from PG — same value as doctor_name in MSSQL
      // agent_name = username from PG — used for display
      const key   = `${dateStr}|${agentKey(row.agent_id)}`;
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
        'Agents':               row.agent_name || row.agent_id || 'Unknown',
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
