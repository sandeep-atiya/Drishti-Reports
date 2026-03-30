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
// Agent identifier : COALESCE(udh_user_id, username)
//   - udh_user_id  = raw CRM user ID from user-disposition-history (most reliable)
//   - username     = denormalised display name (fallback when udh_user_id is NULL)
//   Both store the same CRM username string (e.g. "HammadBT1") that is also
//   stored in tblOrderDetails.doctor_name on the MSSQL side.
//
// TO_CHAR(..., 'YYYY-MM-DD') returns a plain string — avoids Sequelize returning
// a Date object whose .toISOString() would shift the date by the UTC offset on
// IST (UTC+5:30) servers.
//
// COUNT(DISTINCT ch_call_id) avoids double-counting calls that span multiple
// 10-minute intervals (rec_no > 1 rows in the denormalised table).

export const pgGetCallsByAgentDate = ({ startDate, endDate }) => {
  const startExpr = isDatetime(startDate)
    ? `ch_date_added >= :startDate::timestamp without time zone`
    : `ch_date_added >= :startDate::date`;
  const endExpr = isDatetime(endDate)
    ? `ch_date_added <  :endDate::timestamp without time zone`
    : `ch_date_added <  :endDate::date`;

  return getPGSequelize().query(
    `SELECT
       TO_CHAR(ch_date_added::date, 'YYYY-MM-DD')  AS call_date,
       COALESCE(udh_user_id, username)              AS agent_id,
       username                                     AS agent_name,
       COUNT(DISTINCT ch_call_id)::int              AS calls
     FROM acd_interval_denormalized_entity
     WHERE ${startExpr}
       AND ${endExpr}
       AND COALESCE(udh_user_id, username) IS NOT NULL
       AND COALESCE(udh_user_id, username) <> ''
     GROUP BY
       TO_CHAR(ch_date_added::date, 'YYYY-MM-DD'),
       COALESCE(udh_user_id, username),
       username
     ORDER BY username, TO_CHAR(ch_date_added::date, 'YYYY-MM-DD')`,
    {
      replacements: { startDate, endDate },
      type: QueryTypes.SELECT,
    }
  );
};

// ── MSSQL: order stats per agent (doctor_name) per date ──────────────────────
//
// Column facts from tblOrderDetails.sql schema:
//   doctor_name  varchar(100) ← the sales agent's CRM username (same string as
//                               PG.udh_user_id / PG.username, e.g. "HammadBT1")
//   verifier_name varchar(100) ← the verifier — a DIFFERENT person/role
//   dialer       [int]          ← numeric extension (value = 0 in practice, NOT username)
//   AgentID      [int]          ← numeric FK, NOT a username string
//
// FLOW: Calls → Orders (doctor_name = agent) → Verified (disposition_Code = 'Verified')
//
// Date filter matches the Transfer to Sales report pattern exactly:
//   createdOn >= CAST(startDate AS DATETIME)
//   createdOn <  CAST(endDate   AS DATETIME)
//
// Join key: MSSQL LOWER(TRIM(doctor_name))  ↔  PG LOWER(TRIM(udh_user_id))

export const msGetOrderStatsByAgent = ({ startDate, endDate }) => {
  const dtStart = toMSSQLDt(startDate);
  const dtEnd   = toMSSQLDt(endDate);

  return getMSSQLSequelize().query(
    `SELECT
       CONVERT(VARCHAR(10), createdOn, 120)                                           AS order_date,
       LTRIM(RTRIM(ISNULL(doctor_name, '')))                                          AS agent_id,
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
       AND doctor_name IS NOT NULL
       AND LTRIM(RTRIM(doctor_name)) <> ''
     GROUP BY
       CONVERT(VARCHAR(10), createdOn, 120),
       LTRIM(RTRIM(ISNULL(doctor_name, '')))`,
    { type: QueryTypes.SELECT }
  );
};

const dateWiseRepository = {
  getCallsByAgentDate:  pgGetCallsByAgentDate,
  getOrderStatsByAgent: msGetOrderStatsByAgent,
};

export default dateWiseRepository;
