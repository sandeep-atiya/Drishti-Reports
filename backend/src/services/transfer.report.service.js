import { pgGetTransferData, sqliteGetTransferData, msGetOrdersByMobiles, normPhone } from '../repositories/report/transfer.report.repository.js';
import { getRedis } from '../config/redis.js';
import logger from '../utils/logger.js';

// ── Cache (separate Redis namespace from Drishti report) ──────────────────────
const PREFIX  = 'report:transfer:';
const cacheKey = (s, e) => `${PREFIX}${s}:${e}`;

const getCache = async (s, e) => {
  try {
    const raw = await getRedis().get(cacheKey(s, e));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const setCache = async (s, e, data, ttl = 300) => {
  try { await getRedis().setex(cacheKey(s, e), ttl, JSON.stringify(data)); }
  catch { /* non-fatal */ }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const pct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0.0%');

// Preserve fixed campaign display order in the final table
const CAMPAIGN_ORDER = [
  'Filtration_utilization',
  'Filtration_Courtesy',
  'Courtesy_1',
  'Fresh',
  'Verification Pending',
];

// ── Service ───────────────────────────────────────────────────────────────────

const transferReportService = {
  getReport: async ({ startDate, endDate }) => {
    const cached = await getCache(startDate, endDate);
    if (cached) {
      logger.info(`[TransferSvc] Cache hit ${startDate} → ${endDate}`);
      return cached;
    }

    const t0 = Date.now();

    // ── Step 1: Fetch calls + transfer_to_sales + phone arrays per campaign ──────
    // Date-only queries (YYYY-MM-DD) are served from the local SQLite cache —
    // same architecture as the Drishti report. Datetime queries (hourly range)
    // fall back to direct PG since sub-day data is not cached.
    const isDateOnly = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
    const useSQLite  = isDateOnly(startDate) && isDateOnly(endDate);

    let pgRows = useSQLite
      ? sqliteGetTransferData({ startDate, endDate })
      : await pgGetTransferData({ startDate, endDate });

    // If SQLite returned nothing (e.g. cache was just wiped and sync hasn't
    // completed yet), fall back to a direct PG query so the report still works.
    if (useSQLite && pgRows.length === 0) {
      logger.warn('[TransferSvc] SQLite returned no rows — falling back to direct PG query');
      pgRows = await pgGetTransferData({ startDate, endDate });
    }

    logger.info(`[TransferSvc] ${useSQLite ? 'SQLite' : 'PG'} done: ${pgRows.length} campaign rows (${Date.now() - t0}ms)`);

    // ── Step 2: Build normalised-phone → campaign_name map ────────────────────
    // One phone can technically appear in multiple campaigns; first occurrence wins
    // so the order CAMPAIGN_ORDER determines which campaign gets credit on conflict.
    const phoneMap   = new Map();   // norm10 → campaign_name
    const allPhones  = [];          // raw phones (includes duplicates across campaigns)

    for (const name of CAMPAIGN_ORDER) {
      const row = pgRows.find((r) => r.campaign_name === name);
      if (!row) continue;
      for (const phone of row.transfer_phones || []) {
        if (!phone) continue;
        allPhones.push(phone);
        const norm = normPhone(phone);
        if (norm && !phoneMap.has(norm)) phoneMap.set(norm, name);
      }
    }

    // ── Step 3: MSSQL — orders matching any transfer phone ────────────────────
    const msRows = await msGetOrdersByMobiles({ startDate, endDate, mobiles: allPhones });
    logger.info(`[TransferSvc] MSSQL done: ${msRows.length} matched orders (${Date.now() - t0}ms)`);

    // ── Step 4: Count orders per campaign (one order → at most one campaign) ──
    // Normalise all three mobile columns of each order and look up the first
    // campaign match.  Using a per-order `seen` set prevents double-counting an
    // order in the same campaign when two of its mobiles map to the same campaign.
    const ordersByCampaign = {};
    for (const ord of msRows) {
      const campaignsSeen = new Set();
      for (const rawMob of [ord.mobile, ord.alterMob, ord.mobile3]) {
        const norm = normPhone(rawMob);
        if (!norm) continue;
        const camp = phoneMap.get(norm);
        if (camp && !campaignsSeen.has(camp)) {
          ordersByCampaign[camp] = (ordersByCampaign[camp] || 0) + 1;
          campaignsSeen.add(camp);
        }
      }
    }

    // ── Step 5: Assemble final rows in fixed order ────────────────────────────
    const pgMap = Object.fromEntries(pgRows.map((r) => [r.campaign_name, r]));

    // Always emit all 5 campaigns in fixed order.
    // If a campaign has no qualifying PG rows in this range, show zeros so
    // the user can see all campaigns at a glance rather than a partial table.
    const campaignData = CAMPAIGN_ORDER.map((name) => {
      const pg        = pgMap[name];
      const calls     = pg ? Number(pg.calls)             || 0 : 0;
      const transfers = pg ? Number(pg.transfer_to_sales) || 0 : 0;
      const orders    = ordersByCampaign[name]             || 0;

      return {
        campaign:         name,
        calls,
        transferToSales:  transfers,
        orders,
        transferCon:      pct(transfers, calls),
        transferOrderCon: pct(orders, transfers),
        callsOrderCon:    pct(orders, calls),
      };
    });

    const result = { campaignData };
    logger.info(`[TransferSvc] Total: ${Date.now() - t0}ms`);

    setCache(startDate, endDate, result);
    return result;
  },
};

export default transferReportService;
