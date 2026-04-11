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
    `WITH best AS (
       SELECT
         ch_call_id,
         udh_user_id,
         username,
         campaign_name,
         ch_campaign_id,
         ROW_NUMBER() OVER (
           PARTITION BY ch_call_id
           ORDER BY
             COALESCE(udh_talk_time, 0) DESC,
             (ch_system_disposition = 'CONNECTED')::int DESC,
             ch_call_end_time DESC NULLS LAST
         ) AS rn
       FROM acd_interval_denormalized_entity
       WHERE
         campaign_name IN (${CAMPAIGN_NAMES_SQL})
         AND ch_date_added >= :startDate::date
         AND ch_date_added <  :endDate::date + INTERVAL '1 day'
     )
     SELECT
       udh_user_id,
       username,
       campaign_name,
       ch_campaign_id                  AS campaign_id,
       COUNT(DISTINCT ch_call_id)::int AS calls
     FROM best
     WHERE rn = 1
     GROUP BY udh_user_id, username, campaign_name, ch_campaign_id`,
    { replacements: { startDate, endDate }, type: QueryTypes.SELECT }
  );

// Returns 'YYYY-MM-DD 00:00:00' for the day AFTER endDate (exclusive upper bound).
// MSSQL tblOrderDetails.createdOn is stored in UTC — use UTC midnight boundaries
// directly (matching the reference Book3 query: @fromDate/'@toDate pattern).
const nextDayStr = (yyyymmdd) => {
  const d = new Date(`${yyyymmdd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10) + ' 00:00:00';
};

const msGetOrdersByCampaign = ({ startDate, endDate }) => {
  const fromDt = `${startDate} 00:00:00`;
  const toDt   = nextDayStr(endDate);
  return getMSSQLSequelize().query(
    `SELECT
       od.campaign_Id,
       COUNT(*)                                                                         AS orders,
       SUM(CASE WHEN od.disposition_Code = 'Verified' THEN 1    ELSE 0    END)         AS verified,
       SUM(CASE WHEN od.disposition_Code = 'Verified' THEN ISNULL(od.total_amount,0) ELSE 0 END) AS verified_amount
     FROM tblOrderDetails od WITH (NOLOCK)
     WHERE od.campaign_Id IN (
       SELECT campaignId FROM MainLink WITH (NOLOCK)
       WHERE CampaignName IN (${CAMPAIGN_NAMES_SQL})
     )
     AND od.CreatedOn >= CAST('${fromDt}' AS DATETIME)
     AND od.CreatedOn <  CAST('${toDt}'   AS DATETIME)
     GROUP BY od.campaign_Id`,
    { type: QueryTypes.SELECT }
  );
};

const msGetOrdersByAgent = ({ startDate, endDate }) => {
  const fromDt = `${startDate} 00:00:00`;
  const toDt   = nextDayStr(endDate);
  return getMSSQLSequelize().query(
    `SELECT
       od.AgentID,
       od.campaign_Id,
       COUNT(*)                                                                         AS orders,
       SUM(CASE WHEN od.disposition_Code = 'Verified' THEN 1    ELSE 0    END)         AS verified,
       SUM(CASE WHEN od.disposition_Code = 'Verified' THEN ISNULL(od.total_amount,0) ELSE 0 END) AS verified_amount
     FROM tblOrderDetails od WITH (NOLOCK)
     WHERE od.campaign_Id IN (
       SELECT campaignId FROM MainLink WITH (NOLOCK)
       WHERE CampaignName IN (${CAMPAIGN_NAMES_SQL})
     )
     AND od.CreatedOn >= CAST('${fromDt}' AS DATETIME)
     AND od.CreatedOn <  CAST('${toDt}'   AS DATETIME)
     GROUP BY od.AgentID, od.campaign_Id`,
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
