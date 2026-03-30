import { QueryTypes } from 'sequelize';
import { getPGSequelize, getMSSQLSequelize } from '../../connections/index.js';

/**
 * Returns true when the value is a datetime string (contains "T"),
 * e.g. "2024-01-15T10:00".  Date-only strings return false.
 */
const isDatetime = (s) => typeof s === 'string' && s.includes('T');

/**
 * Normalise a date/datetime string for MSSQL CAST AS DATETIME.
 * SQL Server rejects the ISO 8601 'T' separator and requires explicit seconds.
 */
const toMSSQLDt = (s) => {
  if (!s) return s;
  let dt = String(s).replace('T', ' ');
  if (dt.length === 10) dt += ' 00:00:00';
  else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(dt)) dt += ':00';
  return dt;
};

// ── PostgreSQL: total calls per agent per date ────────────────────────────────
//
// Uses uch_user_id (user channel history) as the agent identifier.
// COUNT(DISTINCT ch_call_id) avoids double-counting calls that span
// multiple 10-minute intervals (rec_no > 1 rows in the denormalised table).

export const pgGetCallsByAgentDate = ({ startDate, endDate }) => {
  const startExpr = isDatetime(startDate)
    ? `ch_date_added >= :startDate::timestamp without time zone`
    : `ch_date_added >= :startDate::date`;
  const endExpr = isDatetime(endDate)
    ? `ch_date_added <  :endDate::timestamp without time zone`
    : `ch_date_added <  :endDate::date`;

  return getPGSequelize().query(
    `SELECT
       ch_date_added::date                  AS call_date,
       uch_user_id                          AS agent_name,
       COUNT(DISTINCT ch_call_id)::int      AS calls
     FROM acd_interval_denormalized_entity
     WHERE ${startExpr}
       AND ${endExpr}
       AND uch_user_id IS NOT NULL
       AND uch_user_id <> ''
     GROUP BY ch_date_added::date, uch_user_id
     ORDER BY uch_user_id, ch_date_added::date`,
    {
      replacements: { startDate, endDate },
      type: QueryTypes.SELECT,
    }
  );
};

// ── MSSQL: order stats per agent (dialer) per date ───────────────────────────
//
// FLOW: Calls → Orders created by those calls → Verified orders → Amounts
//
// "dialer"         = the sales agent who created the order (matches uch_user_id).
// "Orders"         = all orders booked in the date range, grouped by agent + date.
// "Verified"       = orders whose disposition_Code is 'VERIFIED' (any casing).
// "Verified Amount"= SUM of total_amount for verified orders.

export const msGetOrderStatsByAgent = ({ startDate, endDate }) => {
  const dtStart = toMSSQLDt(startDate);
  const dtEnd   = toMSSQLDt(endDate);

  return getMSSQLSequelize().query(
    `SELECT
       CONVERT(VARCHAR(10), createdOn, 120)                                           AS order_date,
       LTRIM(RTRIM(ISNULL(dialer, '')))                                               AS agent_name,
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
       AND dialer IS NOT NULL
       AND LTRIM(RTRIM(dialer)) <> ''
     GROUP BY
       CONVERT(VARCHAR(10), createdOn, 120),
       LTRIM(RTRIM(ISNULL(dialer, '')))`,
    { type: QueryTypes.SELECT }
  );
};

const dateWiseRepository = {
  getCallsByAgentDate:  pgGetCallsByAgentDate,
  getOrderStatsByAgent: msGetOrderStatsByAgent,
};

export default dateWiseRepository;
