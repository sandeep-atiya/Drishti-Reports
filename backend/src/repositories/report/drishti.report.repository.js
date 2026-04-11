import { QueryTypes } from 'sequelize';
import { getMSSQLSequelize, getPGSequelize } from '../../connections/index.js';
import { getSQLite } from '../../config/sqlite.js';
import { isSyncReady } from '../../jobs/syncJob.js';
import logger from '../../utils/logger.js';

const CAMPAIGN_NAMES_SQL = `'Digital inbound', 'Inbound_2'`;

// ── SQLite queries (fast — local, pre-aggregated) ─────────────────────────────

const sqliteGetCallsByAgent = ({ startDate, endDate }) => {
  const rows = getSQLite()
    .prepare(`
      SELECT
        udh_user_id,
        username,
        campaign_name,
        campaign_id,
        SUM(calls) AS calls
      FROM calls_daily
      WHERE summary_date >= ? AND summary_date <= ?
      GROUP BY udh_user_id, username, campaign_name, campaign_id
    `)
    .all(startDate, endDate);
  return Promise.resolve(rows);
};

const sqliteGetOrdersByCampaign = ({ startDate, endDate, campaignIds }) => {
  if (!campaignIds?.length) return Promise.resolve([]);
  const ph   = campaignIds.map(() => '?').join(',');
  const rows = getSQLite()
    .prepare(`
      SELECT
        campaign_id                    AS campaign_Id,
        SUM(orders)                    AS orders,
        SUM(verified)                  AS verified,
        SUM(verified_amount)           AS verified_amount
      FROM orders_daily
      WHERE summary_date >= ? AND summary_date <= ?
        AND campaign_id IN (${ph})
      GROUP BY campaign_id
    `)
    .all(startDate, endDate, ...campaignIds.map(Number));
  return Promise.resolve(rows);
};

const sqliteGetOrdersByAgent = ({ startDate, endDate, campaignIds }) => {
  if (!campaignIds?.length) return Promise.resolve([]);
  const ph   = campaignIds.map(() => '?').join(',');
  const rows = getSQLite()
    .prepare(`
      SELECT
        agent_id                       AS AgentID,
        campaign_id                    AS campaign_Id,
        SUM(orders)                    AS orders,
        SUM(verified)                  AS verified,
        SUM(verified_amount)           AS verified_amount
      FROM orders_daily
      WHERE summary_date >= ? AND summary_date <= ?
        AND campaign_id IN (${ph})
      GROUP BY agent_id, campaign_id
    `)
    .all(startDate, endDate, ...campaignIds.map(Number));
  return Promise.resolve(rows);
};

// ── PG / MSSQL fallback (used only before first sync completes) ───────────────

const pgGetCallsByAgent = ({ startDate, endDate }) =>
  getPGSequelize().query(
    `SELECT
       udh_user_id,
       username,
       campaign_name,
       ch_campaign_id AS campaign_id,
       COUNT(*)       AS calls
     FROM acd_interval_denormalized_entity
     WHERE
       ch_system_disposition = 'CONNECTED'
       AND campaign_name IN (${CAMPAIGN_NAMES_SQL})
       AND ch_hangup_details NOT IN ('Customer_Hangup_Phone', 'Customer_hangup_ui')
       AND udh_disposition_code IS DISTINCT FROM 'Call_Drop'
       AND uch_talk_time > 5
       AND ch_date_added >= :startDate::date
       AND ch_date_added <  :endDate::date + INTERVAL '1 day'
     GROUP BY udh_user_id, username, campaign_name, ch_campaign_id`,
    { replacements: { startDate, endDate }, type: QueryTypes.SELECT }
  );

// Convert an IST date string to UTC MSSQL datetime string.
// IST midnight = UTC 18:30 of the previous day.
// e.g. '2026-04-06' → '2026-04-05 18:30:00'
const istToUtcDt = (s) => {
  if (!s) return s;
  let dt = String(s).replace('T', ' ').trim();
  if (dt.length === 10) dt += ' 00:00:00';
  else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(dt)) dt += ':00';
  // Subtract 5h30m: parse as UTC base and subtract 330 min
  const [datePart, timePart] = dt.split(' ');
  const [h, mi, se] = (timePart || '00:00:00').split(':').map(Number);
  const base = new Date(`${datePart}T${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}:${String(se).padStart(2,'0')}Z`);
  base.setUTCMinutes(base.getUTCMinutes() - 330);
  return base.toISOString().replace('T', ' ').slice(0, 19);
};

const msGetOrdersByCampaign = ({ startDate, endDate, campaignIds }) => {
  if (!campaignIds?.length) return Promise.resolve([]);
  const idList  = campaignIds.map(Number).join(',');
  const utcStart = istToUtcDt(startDate);
  // endDate is inclusive (YYYY-MM-DD) → add 1 day in IST then convert to UTC
  const endNext  = istToUtcDt(
    (() => { const d = new Date(`${endDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0,10); })()
  );
  return getMSSQLSequelize().query(
    `SELECT
       campaign_Id,
       COUNT(*) AS orders,
       SUM(CASE WHEN disposition_Code = 'Verified' THEN 1 ELSE 0 END) AS verified,
       SUM(CASE WHEN disposition_Code = 'Verified' THEN ISNULL(total_amount,0) ELSE 0 END) AS verified_amount
     FROM tblOrderDetails
     WHERE
       createdOn >= CAST('${utcStart}' AS DATETIME)
       AND createdOn <  CAST('${endNext}'  AS DATETIME)
       AND campaign_Id IN (${idList})
     GROUP BY campaign_Id`,
    { type: QueryTypes.SELECT }
  );
};

const msGetOrdersByAgent = ({ startDate, endDate, campaignIds }) => {
  if (!campaignIds?.length) return Promise.resolve([]);
  const idList  = campaignIds.map(Number).join(',');
  const utcStart = istToUtcDt(startDate);
  const endNext  = istToUtcDt(
    (() => { const d = new Date(`${endDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0,10); })()
  );
  return getMSSQLSequelize().query(
    `SELECT
       AgentID,
       campaign_Id,
       COUNT(*) AS orders,
       SUM(CASE WHEN disposition_Code = 'Verified' THEN 1 ELSE 0 END) AS verified,
       SUM(CASE WHEN disposition_Code = 'Verified' THEN ISNULL(total_amount,0) ELSE 0 END) AS verified_amount
     FROM tblOrderDetails
     WHERE
       createdOn >= CAST('${utcStart}' AS DATETIME)
       AND createdOn <  CAST('${endNext}'  AS DATETIME)
       AND campaign_Id IN (${idList})
     GROUP BY AgentID, campaign_Id`,
    { type: QueryTypes.SELECT }
  );
};

// ── Public repository — SQLite first, live DB fallback on any error ───────────

const drishtiReportRepository = {
  getCallsByAgent: async (params) => {
    if (isSyncReady()) {
      try {
        return await sqliteGetCallsByAgent(params);
      } catch (err) {
        logger.warn(`[Repo] SQLite calls failed, falling back to PostgreSQL: ${err.message}`);
      }
    }
    return pgGetCallsByAgent(params);
  },

  getOrdersByCampaign: async (params) => {
    if (isSyncReady()) {
      try {
        return await sqliteGetOrdersByCampaign(params);
      } catch (err) {
        logger.warn(`[Repo] SQLite orders-by-campaign failed, falling back to MSSQL: ${err.message}`);
      }
    }
    return msGetOrdersByCampaign(params);
  },

  getOrdersByAgent: async (params) => {
    if (isSyncReady()) {
      try {
        return await sqliteGetOrdersByAgent(params);
      } catch (err) {
        logger.warn(`[Repo] SQLite orders-by-agent failed, falling back to MSSQL: ${err.message}`);
      }
    }
    return msGetOrdersByAgent(params);
  },
};

export default drishtiReportRepository;
