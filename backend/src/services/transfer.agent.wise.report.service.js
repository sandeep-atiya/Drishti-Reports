import {
  pgGetTransferAgentWiseData,
  msGetOrdersByMobilesAgentWise,
  normPhone,
} from "../repositories/report/transfer.agent.wise.report.repository.js";
import { getRedis } from "../config/redis.js";
import logger from "../utils/logger.js";

const PREFIX   = "report:transfer-agent-wise:v2:";
const cacheKey = (s, e) => `${PREFIX}${s}:${e}`;

const getCache = async (s, e) => {
  try {
    const raw = await getRedis().get(cacheKey(s, e));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setCache = async (s, e, data, ttl = 300) => {
  try {
    await getRedis().setex(cacheKey(s, e), ttl, JSON.stringify(data));
  } catch {
    // non-fatal
  }
};

const pct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "0.0%");

/** Format PG DATE value as "DD-Mon" (e.g. "01-Apr") without timezone drift. */
const fmtDate = (d) => {
  if (!d) return "";
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  // PG DATE comes back as "YYYY-MM-DD" or a Date object
  const str = String(d).split("T")[0]; // "YYYY-MM-DD"
  const [, m, day] = str.split("-").map(Number);
  return `${String(day).padStart(2, "0")}-${MONTHS[m - 1]}`;
};

const transferAgentWiseReportService = {
  getReport: async ({ startDate, endDate }) => {
    const cached = await getCache(startDate, endDate);
    if (cached) {
      logger.info(`[TransferAgentWiseSvc] Cache hit ${startDate} -> ${endDate}`);
      return cached;
    }

    const t0 = Date.now();

    // ── Step 1: PostgreSQL — one row per (date, campaign, agent) ──────────────
    const pgRows = await pgGetTransferAgentWiseData({ startDate, endDate });
    logger.info(
      `[TransferAgentWiseSvc] PG done: ${pgRows.length} agent rows (${Date.now() - t0}ms)`,
    );

    if (!pgRows.length) {
      const result = { agentRows: [] };
      setCache(startDate, endDate, result);
      return result;
    }

    // ── Step 2: Collect ALL unique transfer phones with agent ownership ─────────
    // For each phone, track which agent transferred it and WHEN (timestamp).
    // Key insight: If the same phone is transferred by multiple agents on the same
    // day, we assign any resulting orders to the LAST agent (latest transfer timestamp).
    //
    // Map: normPhone → { date: "YYYY-MM-DD", idx: rowIndex, timestamp: ISO string }
    // We keep ONLY the most recent transfer per (phone, date) combination.
    const phoneToAgent = new Map(); // normPhone → best agent entry for that phone
    const allPhones    = new Set(); // raw phones for MSSQL lookup

    for (let i = 0; i < pgRows.length; i++) {
      const row = pgRows[i];
      const reportDate = String(row.report_date).split("T")[0]; // "YYYY-MM-DD"
      
      // transfer_phone_details is now a JSON array with {phone, timestamp}
      const details = Array.isArray(row.transfer_phone_details) 
        ? row.transfer_phone_details 
        : (row.transfer_phone_details ? JSON.parse(row.transfer_phone_details) : []);
      
      for (const detail of details) {
        if (!detail || !detail.phone) continue;
        const rawPhone = detail.phone;
        const timestamp = detail.timestamp; // ISO string from PG
        
        allPhones.add(rawPhone);
        const norm = normPhone(rawPhone);
        if (!norm) continue;

        // For each (phone, date) pair, keep only the agent with the LATEST timestamp
        const key = `${norm}:${reportDate}`;
        const current = phoneToAgent.get(key);
        
        if (!current || new Date(timestamp) > new Date(current.timestamp)) {
          phoneToAgent.set(key, { idx: i, date: reportDate, timestamp, phone: norm });
        }
      }
    }

    // ── Step 3: MSSQL — find orders matching any transfer phone ───────────────
    // MSSQL now returns order_date ("YYYY-MM-DD") so we can enforce same-day matching.
    const msRows = await msGetOrdersByMobilesAgentWise({
      startDate,
      endDate,
      mobiles: [...allPhones],
    });
    logger.info(
      `[TransferAgentWiseSvc] MSSQL done: ${msRows.length} matched orders (${Date.now() - t0}ms)`,
    );

    // ── Step 4: Build per-row order counts (single agent per phone per date) ────
    // Each order is credited to exactly ONE agent: the one who transferred the phone
    // most recently (latest timestamp) on the order date.
    // This prevents double-counting when multiple agents transfer the same phone.
    const ordersPerRow = new Array(pgRows.length).fill(0);
    const seenPerRow   = pgRows.map(() => new Set()); // avoid counting same phone twice per agent

    for (const ord of msRows) {
      const orderDate = String(ord.order_date); // "YYYY-MM-DD" from MSSQL CONVERT
      
      for (const rawMob of [ord.mobile, ord.alterMob, ord.mobile3]) {
        const norm = normPhone(rawMob);
        if (!norm) continue;

        // Find the agent who transferred this phone (most recent transfer on this date)
        const key = `${norm}:${orderDate}`;
        const agentEntry = phoneToAgent.get(key);

        if (agentEntry && !seenPerRow[agentEntry.idx].has(norm)) {
          seenPerRow[agentEntry.idx].add(norm);
          ordersPerRow[agentEntry.idx]++;
        }
      }
    }

    // ── Step 5: Build the final report rows ───────────────────────────────────
    const agentRows = pgRows
      .map((row, i) => {
        const calls     = Number(row.calls)            || 0;
        const transfers = Number(row.transfer_to_sales) || 0;
        const orders    = ordersPerRow[i]               || 0;

        return {
          date:              fmtDate(row.report_date),
          campaign:          row.campaign_name   || "",
          agent:             row.agent_name      || "",
          calls,
          transferToSales:   transfers,
          orders,
          transferCon:       pct(transfers, calls),
          transferOrderCon:  pct(orders, transfers),
          callOrderCon:      pct(orders, calls),
        };
      })
      // Drop rows where agent did nothing meaningful
      .filter((r) => r.calls > 0 || r.transferToSales > 0 || r.orders > 0);

    const result = { agentRows };
    logger.info(`[TransferAgentWiseSvc] Total: ${Date.now() - t0}ms`);

    setCache(startDate, endDate, result);
    return result;
  },
};

export default transferAgentWiseReportService;
