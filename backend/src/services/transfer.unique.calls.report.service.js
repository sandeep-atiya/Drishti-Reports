import {
  pgGetTransferUniqueCallsData,
  msGetOrdersByMobilesUniqueCalls,
  normPhone,
} from "../repositories/report/transfer.unique.calls.report.repository.js";
import { getRedis } from "../config/redis.js";
import logger from "../utils/logger.js";

const PREFIX = "report:transfer-unique-calls:v10:";
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
const avg = (n, d) => (d > 0 ? Math.round(n / d) : 0);

const PROCESS_ORDER = [
  "Courtesy_1",
  "Filtration_Courtesy",
  "Filtration_utilization",
];

const transferUniqueCallsReportService = {
  getReport: async ({ startDate, endDate }) => {
    const cached = await getCache(startDate, endDate);
    if (cached) {
      logger.info(
        `[TransferUniqueCallsSvc] Cache hit ${startDate} -> ${endDate}`,
      );
      return cached;
    }

    const t0 = Date.now();

    const pgRows = await pgGetTransferUniqueCallsData({ startDate, endDate });
    logger.info(
      `[TransferUniqueCallsSvc] PG done: ${pgRows.length} process rows (${Date.now() - t0}ms)`,
    );

    // Keep every process associated with a phone. A first-match-only map causes
    // orders to drift into the wrong process when the same number appears more
    // than once in transfer data.
    const phoneMap = new Map();
    const allPhones = new Set();

    for (const row of pgRows) {
      for (const phone of row.transfer_phones || []) {
        if (!phone) continue;

        allPhones.add(phone);

        const norm = normPhone(phone);
        if (!norm) continue;

        if (!phoneMap.has(norm)) phoneMap.set(norm, new Set());
        phoneMap.get(norm).add(row.process_name);
      }
    }

    const msRows = await msGetOrdersByMobilesUniqueCalls({
      startDate,
      endDate,
      mobiles: [...allPhones],
    });
    logger.info(
      `[TransferUniqueCallsSvc] MSSQL done: ${msRows.length} matched orders (${Date.now() - t0}ms)`,
    );

    // Build the set of transfer phones that have at least one matched order.
    // Logic mirrors the Excel/telecom report: count unique PHONE NUMBERS with
    // an order (not unique order rows), with cross-campaign deduplication so
    // the same phone is counted only once (for the first campaign in PROCESS_ORDER).
    const phonesWithOrder = new Set();
    for (const ord of msRows) {
      for (const rawMob of [ord.mobile, ord.alterMob, ord.mobile3]) {
        const norm = normPhone(rawMob);
        if (norm && phoneMap.has(norm)) phonesWithOrder.add(norm);
      }
    }

    const ordersByProcess = {};
    const globalSeenPhones = new Set();

    for (const processName of PROCESS_ORDER) {
      for (const [norm, processes] of phoneMap) {
        if (!processes.has(processName)) continue;
        if (!phonesWithOrder.has(norm)) continue;
        if (globalSeenPhones.has(norm)) continue; // cross-campaign dedup
        ordersByProcess[processName] = (ordersByProcess[processName] || 0) + 1;
        globalSeenPhones.add(norm);
      }
    }

    const pgMap = new Map(pgRows.map((row) => [row.process_name, row]));

    const campaignData = PROCESS_ORDER.map((processName) => {
      const row = pgMap.get(processName);
      const calls = Number(row?.calls) || 0;
      const transfers = Number(row?.transfer_to_sales) || 0;
      const pCount = Number(row?.p_count) || 0;
      const orders = ordersByProcess[processName] || 0;

      return {
        process: processName,
        pCount,
        calls,
        transferToSales: transfers,
        orders,
        transferCon: pct(transfers, calls),
        transferOrderCon: pct(orders, transfers),
        callsOrderCon: pct(orders, calls),
        avgCalls: avg(calls, pCount),
        avgTransfer: avg(transfers, pCount),
        avgOrders: avg(orders, pCount),
      };
    }).filter((row) => row.calls > 0 || row.transferToSales > 0 || row.orders > 0 || row.pCount > 0);

    const result = { campaignData };
    logger.info(`[TransferUniqueCallsSvc] Total: ${Date.now() - t0}ms`);

    setCache(startDate, endDate, result);
    return result;
  },
};

export default transferUniqueCallsReportService;
