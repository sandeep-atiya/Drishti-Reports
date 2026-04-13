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

// ── PostgreSQL: total calls per campaign per date ─────────────────────────────
//
// Join key : ch_campaign_id (int) — matches campaign_Id (int) in MSSQL.
//            Integer-to-integer join is reliable; no string-matching issues.
// TO_CHAR returns a plain 'YYYY-MM-DD' string — avoids timezone Date-object bugs.
// COUNT(DISTINCT ch_call_id) avoids double-counting interval-split rows (rec_no > 1).

export const pgGetCallsByCampaignDate = ({ startDate, endDate }) => {
  const startExpr = isDatetime(startDate)
    ? `ch_date_added >= :startDate::timestamp without time zone`
    : `ch_date_added >= :startDate::date`;
  const endExpr = isDatetime(endDate)
    ? `ch_date_added <  :endDate::timestamp without time zone`
    : `ch_date_added <  :endDate::date`;

  return getPGSequelize().query(
    `SELECT
       TO_CHAR(ch_date_added::date, 'YYYY-MM-DD')  AS call_date,
       ch_campaign_id                               AS campaign_id,
       campaign_name,
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
       )::int AS calls
     FROM acd_interval_denormalized_entity
     WHERE ${startExpr}
       AND ${endExpr}
       AND campaign_name IS NOT NULL
       AND campaign_name <> ''
     GROUP BY
       TO_CHAR(ch_date_added::date, 'YYYY-MM-DD'),
       ch_campaign_id,
       campaign_name
     ORDER BY campaign_name, TO_CHAR(ch_date_added::date, 'YYYY-MM-DD')`,
    {
      replacements: { startDate, endDate },
      type: QueryTypes.SELECT,
    }
  );
};

// ── MSSQL: order stats per campaign_Id per date ───────────────────────────────
//
// campaign_Id [int] in tblOrderDetails matches ch_campaign_id [int] in PG.
// Verified = orders where disposition_Code = 'Verified' (case-insensitive).

export const msGetOrderStatsByCampaign = ({ startDate, endDate }) => {
  const dtStart = toMSSQLDt(startDate);
  const dtEnd   = toMSSQLDt(endDate);

  return getMSSQLSequelize().query(
    `SELECT
       CONVERT(VARCHAR(10), createdOn, 120)                                           AS order_date,
       campaign_Id,
       COUNT(*)                                                                        AS total_orders,
       SUM(CASE
             WHEN LOWER(LTRIM(RTRIM(ISNULL(disposition_Code, '')))) = 'verified'
             THEN 1 ELSE 0
           END)                                                                        AS verified_orders,
       SUM(CASE
             WHEN LOWER(LTRIM(RTRIM(ISNULL(disposition_Code, '')))) = 'verified'
             THEN ISNULL(total_amount, 0) ELSE 0
           END)                                                                        AS verified_amount
     FROM tblOrderDetails
     WHERE createdOn >= CAST('${dtStart}' AS DATETIME)
       AND createdOn <  CAST('${dtEnd}'   AS DATETIME)
       AND campaign_Id IS NOT NULL
     GROUP BY
       CONVERT(VARCHAR(10), createdOn, 120),
       campaign_Id`,
    { type: QueryTypes.SELECT }
  );
};

const dateWiseCampaignRepository = {
  getCallsByCampaignDate:    pgGetCallsByCampaignDate,
  getOrderStatsByCampaign:   msGetOrderStatsByCampaign,
};

export default dateWiseCampaignRepository;
