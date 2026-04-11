import { QueryTypes } from 'sequelize';
import { getPGSequelize } from '../../connections/index.js';
import { getSQLite }      from '../../config/sqlite.js';
import { isSyncReady }    from '../../jobs/syncJob.js';
import logger             from '../../utils/logger.js';

/**
 * Returns true when the value is a datetime string (contains "T"), e.g. "2024-01-15T10:00".
 * Date-only strings like "2024-01-15" return false.
 */
const isDatetime = (s) => typeof s === 'string' && s.includes('T');

// ── SQLite (fast — local, pre-aggregated by day) ──────────────────────────────

/**
 * Date-only queries from the local hangup_daily cache.
 * endDate is exclusive (e.g. "2024-01-16" means up to and including "2024-01-15").
 */
const sqliteGetHangupByAgent = ({ startDate, endDate, campaignName }) => {
  const db = getSQLite();

  // SQLite stores summary_date as TEXT "YYYY-MM-DD".
  // endDate is exclusive → use < endDate (same semantics as the PG query).
  const campaignFilter = campaignName ? 'AND campaign_name = ?' : '';
  const params = campaignName
    ? [startDate, endDate, campaignName]
    : [startDate, endDate];

  const rows = db.prepare(`
    SELECT
      username                   AS agent_name,
      SUM(agent_hangup_phone)    AS agent_hangup_phone,
      SUM(agent_hangup_ui)       AS agent_hangup_ui,
      SUM(customer_hangup_phone) AS customer_hangup_phone,
      SUM(system_hangup)         AS system_hangup,
      SUM(system_media)          AS system_media,
      SUM(system_recording)      AS system_recording
    FROM hangup_daily
    WHERE summary_date >= ?
      AND summary_date <  ?
      AND username IS NOT NULL
      AND username <> ''
      ${campaignFilter}
    GROUP BY username
    ORDER BY username
  `).all(...params);

  return Promise.resolve(rows);
};

const sqliteGetCampaignNames = ({ startDate, endDate } = {}) => {
  const dateFilter = startDate && endDate
    ? 'AND summary_date >= ? AND summary_date < ?'
    : '';
  const params = startDate && endDate ? [startDate, endDate] : [];

  const rows = getSQLite()
    .prepare(`
      SELECT DISTINCT campaign_name
      FROM hangup_daily
      WHERE campaign_name IS NOT NULL AND campaign_name <> ''
        ${dateFilter}
      ORDER BY campaign_name
    `)
    .all(...params);
  return Promise.resolve(rows);
};

// ── PostgreSQL (live fallback) ────────────────────────────────────────────────

/**
 * Live PG query. Supports both date-only and datetime (hourly) ranges.
 * UPPER(ch_hangup_details) makes matching case-insensitive regardless of
 * how the values are actually stored in the database.
 */
const pgGetHangupByAgent = ({ startDate, endDate, campaignName }) => {
  const campaignFilter = campaignName
    ? `AND campaign_name = :campaignName`
    : '';

  // Use timestamp cast for hourly mode, date cast for date-only mode
  const startExpr = isDatetime(startDate)
    ? `ch_date_added >= :startDate::timestamp without time zone`
    : `ch_date_added >= :startDate::date`;
  const endExpr   = isDatetime(endDate)
    ? `ch_date_added <  :endDate::timestamp without time zone`
    : `ch_date_added <  :endDate::date`;

  return getPGSequelize().query(
    `SELECT
       username                                                                        AS agent_name,
       COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'AGENT_HANGUP_PHONE')        AS agent_hangup_phone,
       COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'AGENT_HANGUP_UI')           AS agent_hangup_ui,
       COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'CUSTOMER_HANGUP_PHONE')     AS customer_hangup_phone,
       COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'SYSTEM_HANGUP')             AS system_hangup,
       COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'SYSTEM_MEDIA')              AS system_media,
       COUNT(*) FILTER (WHERE UPPER(ch_hangup_details) = 'SYSTEM_RECORDING')          AS system_recording
     FROM acd_interval_denormalized_entity
     WHERE ${startExpr}
       AND ${endExpr}
       AND username IS NOT NULL
       AND username <> ''
       ${campaignFilter}
     GROUP BY username
     ORDER BY username`,
    {
      replacements: { startDate, endDate, campaignName: campaignName || null },
      type: QueryTypes.SELECT,
    }
  );
};

const pgGetCampaignNames = ({ startDate, endDate } = {}) => {
  // If specific dates are provided use them (always fast — small scan window).
  // Fallback: last 90 days so the query never does a full-table scan.
  const dateFilter = startDate && endDate
    ? `AND ch_date_added >= :startDate::date AND ch_date_added < :endDate::date`
    : `AND ch_date_added >= CURRENT_DATE - INTERVAL '90 days'`;

  return getPGSequelize().query(
    `SELECT DISTINCT campaign_name
     FROM acd_interval_denormalized_entity
     WHERE campaign_name IS NOT NULL
       AND campaign_name <> ''
       ${dateFilter}
     ORDER BY campaign_name`,
    {
      replacements: startDate && endDate ? { startDate, endDate } : {},
      type: QueryTypes.SELECT,
    }
  );
};

// ── Public repository — SQLite first, live PG fallback ────────────────────────

const selfHangupRepository = {
  getHangupByAgent: async (params) => {
    // Datetime (hourly) queries always hit PG — SQLite is day-aggregated only
    if (!isDatetime(params.startDate) && isSyncReady()) {
      try {
        return await sqliteGetHangupByAgent(params);
      } catch (err) {
        logger.warn(`[SelfHangup Repo] SQLite failed, falling back to PG: ${err.message}`);
      }
    }
    try {
      return await pgGetHangupByAgent(params);
    } catch (err) {
      logger.error(`[SelfHangup Repo] PG query failed: ${err.message}`);
      throw err;
    }
  },

  getCampaignNames: async (params = {}) => {
    if (isSyncReady()) {
      try {
        return await sqliteGetCampaignNames(params);
      } catch (err) {
        logger.warn(`[SelfHangup Repo] SQLite campaigns failed, falling back to PG: ${err.message}`);
      }
    }
    try {
      return await pgGetCampaignNames(params);
    } catch (err) {
      logger.error(`[SelfHangup Repo] PG campaigns query failed: ${err.message}`);
      throw err;
    }
  },
};

export default selfHangupRepository;
