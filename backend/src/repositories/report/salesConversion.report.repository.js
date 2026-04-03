import { QueryTypes } from 'sequelize';
import { getPGSequelize, getMSSQLSequelize } from '../../connections/index.js';

const isDatetime = (s) => typeof s === 'string' && s.includes('T');

const toMSSQLDt = (s) => {
  if (!s) return s;
  let dt = String(s).replace('T', ' ');
  if (dt.length === 10) dt += ' 00:00:00';
  else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(dt)) dt += ':00';
  return dt;
};

// ── Exact campaign names (as confirmed by the business) ───────────────────────
// Used in both the calls query and the campaign-ID lookup query.
// ILIKE is used for case-insensitive matching in case DB casing drifts.
const CAMPAIGN_ILIKE = `(
       campaign_name ILIKE 'Unayur_IN'
    OR campaign_name ILIKE 'Inbound_2'
    OR campaign_name ILIKE 'Courtesy'
    OR campaign_name ILIKE 'Agent_Consultation'
    OR campaign_name ILIKE 'Group_S_Pro'
    OR campaign_name ILIKE 'Group SF'
    OR campaign_name ILIKE 'Repeat_Tracker'
    OR campaign_name ILIKE 'Digital inbound'
    OR campaign_name ILIKE 'Doctor_consultation_1'
    OR campaign_name ILIKE 'Inbound_One'
    OR campaign_name ILIKE 'Doctor_IN'
    OR campaign_name ILIKE 'Group_A'
  )`;

// ── PostgreSQL: total calls per agent per campaign ────────────────────────────
//
// All 12 target sales campaigns are included.
//
// Unayur_IN special rule:
//   Exclude rows where queue_name IN ('Verification_PendingAgentQueue', 'FreshAgentQueue')
//   All other campaigns have no queue-name restriction.
//
// Agent identifier: COALESCE(udh_user_id, username)
//
// COUNT(DISTINCT ch_call_id) avoids double-counting multi-interval rows.
//
// Call quality filters:
//   1. uch_talk_time > 5              — exclude calls ≤ 5 seconds
//   2. ch_hangup_details NOT IN (...)  — exclude customer-side hangups
//   3. udh_disposition_code IS DISTINCT FROM 'CALL_DROP'
//
// NOTE: Group SF agents create orders manually — NO call records exist in PG
//       for this campaign. It produces zero rows from this query.
//       Group SF orders are added via the MSSQL-only path in the service.

export const pgGetCallsByAgentCampaign = ({ startDate, endDate }) => {
  const startExpr = isDatetime(startDate)
    ? `ch_date_added >= :startDate::timestamp without time zone`
    : `ch_date_added >= :startDate::date`;
  const endExpr = isDatetime(endDate)
    ? `ch_date_added <  :endDate::timestamp without time zone`
    : `ch_date_added <  :endDate::date`;

  return getPGSequelize().query(
    `SELECT
       COALESCE(udh_user_id, username)              AS agent_id,
       username                                     AS agent_name,
       campaign_name,
       ch_campaign_id,
       COUNT(DISTINCT ch_call_id)::int              AS calls
     FROM acd_interval_denormalized_entity
     WHERE ${startExpr}
       AND ${endExpr}
       AND ${CAMPAIGN_ILIKE}
       AND NOT (
             campaign_name ILIKE 'Unayur_IN'
         AND queue_name IN ('Verification_PendingAgentQueue', 'FreshAgentQueue')
       )
       AND COALESCE(udh_user_id, username) IS NOT NULL
       AND COALESCE(udh_user_id, username) <> ''
       AND uch_talk_time > 5
       AND (ch_hangup_details IS NULL OR ch_hangup_details NOT IN ('Customer_Hangup_Phone', 'Customer_hangup_ui'))
       AND udh_disposition_code IS DISTINCT FROM 'CALL_DROP'
     GROUP BY
       COALESCE(udh_user_id, username),
       username,
       campaign_name,
       ch_campaign_id
     ORDER BY campaign_name, username`,
    {
      replacements: { startDate, endDate },
      type: QueryTypes.SELECT,
    }
  );
};

// ── PostgreSQL: Group SF campaign_id lookup (fast — LIMIT 1) ─────────────────
//
// Group SF agents create orders manually — no call records appear in PG for the
// queried date range. We still need its ch_campaign_id to match MSSQL campaign_Id.
// This query scans only the Group SF campaign rows and stops after the first hit,
// so it is fast regardless of total table size.

export const pgGetGroupSFCampaignId = () => {
  return getPGSequelize().query(
    `SELECT ch_campaign_id, campaign_name
     FROM acd_interval_denormalized_entity
     WHERE campaign_name ILIKE 'Group SF'
       AND ch_campaign_id IS NOT NULL
     LIMIT 1`,
    { type: QueryTypes.SELECT }
  );
};

// ── MSSQL: order stats per agent per campaign ─────────────────────────────────
//
// No campaign filter — the service applies campaign filtering via campaign_Id
// discovered from the PG campaign ID map. This also captures Group SF orders.

export const msGetOrderStatsByAgentCampaign = ({ startDate, endDate }) => {
  const dtStart = toMSSQLDt(startDate);
  const dtEnd   = toMSSQLDt(endDate);

  return getMSSQLSequelize().query(
    `SELECT
       LTRIM(RTRIM(ISNULL(doctor_name, '')))                                            AS agent_id,
       campaign_Id,
       COUNT(*)                                                                          AS total_orders,
       SUM(CASE
             WHEN LOWER(LTRIM(RTRIM(ISNULL(disposition_Code, '')))) = 'verified'
             THEN 1 ELSE 0
           END)                                                                          AS verified_orders,
       SUM(CASE
             WHEN LOWER(LTRIM(RTRIM(ISNULL(disposition_Code, '')))) = 'verified'
             THEN ISNULL(total_amount, 0) ELSE 0
           END)                                                                          AS verified_amount
     FROM tblOrderDetails
     WHERE createdOn >= CAST('${dtStart}' AS DATETIME)
       AND createdOn <  CAST('${dtEnd}'   AS DATETIME)
       AND doctor_name IS NOT NULL
       AND LTRIM(RTRIM(doctor_name)) <> ''
     GROUP BY
       LTRIM(RTRIM(ISNULL(doctor_name, ''))),
       campaign_Id`,
    { type: QueryTypes.SELECT }
  );
};

const salesConversionRepository = {
  getCallsByAgentCampaign:      pgGetCallsByAgentCampaign,
  getGroupSFCampaignId:         pgGetGroupSFCampaignId,
  getOrderStatsByAgentCampaign: msGetOrderStatsByAgentCampaign,
};

export default salesConversionRepository;
