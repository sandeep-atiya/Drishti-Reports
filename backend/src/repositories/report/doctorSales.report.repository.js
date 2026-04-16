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

// ── Exact campaign names (same as Sales Conversion / Sales Hyderabad) ─────────
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

// ── PostgreSQL: total calls per agent per campaign (Dr agents only) ────────────
//
// All conditions identical to Sales Conversion PLUS:
//   username ILIKE 'Dr%'  — only Doctor agents (username starts with Dr)

export const pgGetCallsByAgentCampaign = ({ startDate, endDate }) => {
  const startExpr = isDatetime(startDate)
    ? `ch_date_added >= :startDate::timestamp without time zone`
    : `ch_date_added >= :startDate::date`;
  const endExpr = isDatetime(endDate)
    ? `ch_date_added <  :endDate::timestamp without time zone`
    : `ch_date_added <  :endDate::date`;

  return getPGSequelize().query(
    `SELECT
       udh_user_id                                  AS agent_id,
       udh_user_id                                  AS agent_name,
       campaign_name,
       ch_campaign_id,
       (
         COUNT(DISTINCT ch_call_id) FILTER (
           WHERE ch_system_disposition = 'CONNECTED'
             AND NULLIF(BTRIM(ch_phone), '') IS NOT NULL
         )
         - COUNT(DISTINCT ch_call_id) FILTER (
           WHERE ch_system_disposition = 'CONNECTED'
             AND NULLIF(BTRIM(ch_phone), '') IS NOT NULL
             AND UPPER(COALESCE(udh_disposition_code, '')) IN ('CALL_DROP', 'CALL DROP')
             AND COALESCE(udh_talk_time, 0) < 5000
         )
         + COUNT(DISTINCT ch_call_id) FILTER (
           WHERE ch_system_disposition = 'CONNECTED'
             AND NULLIF(BTRIM(ch_phone), '') IS NOT NULL
             AND UPPER(COALESCE(udh_disposition_code, '')) IN ('CALL_DROP', 'CALL DROP')
             AND uch_talk_time IS NULL
             AND UPPER(COALESCE(ch_hangup_details, '')) IN ('CUSTOMER_HANGUP_PHONE', 'CUSTOMER_HANGUP_UI')
         )
         - COUNT(DISTINCT ch_call_id) FILTER (
           WHERE ch_system_disposition = 'CONNECTED'
             AND NULLIF(BTRIM(ch_phone), '') IS NOT NULL
             AND LOWER(COALESCE(udh_disposition_code, '')) = 'failed.association'
         )
       )::int AS calls
     FROM acd_interval_denormalized_entity
     WHERE ${startExpr}
       AND ${endExpr}
       AND ${CAMPAIGN_ILIKE}
       AND NOT (
             campaign_name ILIKE 'Unayur_IN'
         AND queue_name IN ('Verification_PendingAgentQueue', 'FreshAgentQueue')
       )
       AND udh_user_id IS NOT NULL
       AND udh_user_id <> ''
       AND username ILIKE 'Dr%'
     GROUP BY
       udh_user_id,
       campaign_name,
       ch_campaign_id
     ORDER BY campaign_name, udh_user_id`,
    {
      replacements: { startDate, endDate },
      type: QueryTypes.SELECT,
    }
  );
};

// ── PostgreSQL: Group SF campaign_id lookup (fast — LIMIT 1) ─────────────────
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

// ── MSSQL: order stats per agent per campaign (Dr agents only) ────────────────
//
// All conditions identical to Sales Conversion PLUS:
//   doctor_name LIKE 'Dr%'  — only Doctor agents

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
       AND LTRIM(RTRIM(doctor_name)) LIKE 'Dr%'
     GROUP BY
       LTRIM(RTRIM(ISNULL(doctor_name, ''))),
       campaign_Id`,
    { type: QueryTypes.SELECT }
  );
};

const doctorSalesRepository = {
  getCallsByAgentCampaign:      pgGetCallsByAgentCampaign,
  getGroupSFCampaignId:         pgGetGroupSFCampaignId,
  getOrderStatsByAgentCampaign: msGetOrderStatsByAgentCampaign,
};

export default doctorSalesRepository;
