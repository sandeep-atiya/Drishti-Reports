import { QueryTypes } from "sequelize";
import { getMSSQLSequelize, getPGSequelize } from "../../connections/index.js";
import logger from "../../utils/logger.js";

/**
 * Normalise any phone format to the last 10 digits.
 */
export const normPhone = (p) => {
  if (!p) return null;
  const digits = String(p).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
};

// MSSQL IN-list limit is ~2100 parameters; stay well below it
const MOBILE_BATCH = 1000;

const PROCESS_FILTER_SQL = `
  campaign_name IN (
    'Filtration_utilization',
    'Filtration_Courtesy',
    'Courtesy_1'
  )
`;

// ── PostgreSQL: calls + transfer phones grouped by date, campaign, agent ──────
//
// Each row = one agent's activity for one campaign on one date.
// Calls logic mirrors Transfer Unique Calls: CONNECTED rows with usable phone,
// excluding short CALL_DROP rows (< 5s), keeping NULL-talk-time customer-hangup
// call-drops (they appear in the manual sheet).

// export const pgGetTransferAgentWiseData = ({ startDate, endDate }) =>
//   getPGSequelize().query(
//     `SELECT
//        DATE(ch_date_added)                         AS report_date,
//        campaign_name,
//        COALESCE(udh_user_id, username)             AS agent_name,

//        -- Calls (mirrors Transfer Unique Calls logic)
//        (
//          COUNT(ch_phone) FILTER (
//            WHERE ch_system_disposition = 'CONNECTED'
//              AND NULLIF(BTRIM(ch_phone), '') IS NOT NULL
//          )
//          - COUNT(ch_phone) FILTER (
//            WHERE ch_system_disposition = 'CONNECTED'
//              AND NULLIF(BTRIM(ch_phone), '') IS NOT NULL
//              AND UPPER(COALESCE(udh_disposition_code, '')) IN ('CALL_DROP', 'CALL DROP')
//              AND COALESCE(udh_talk_time, 0) < 5000
//          )
//          + COUNT(ch_phone) FILTER (
//            WHERE ch_system_disposition = 'CONNECTED'
//              AND NULLIF(BTRIM(ch_phone), '') IS NOT NULL
//              AND UPPER(COALESCE(udh_disposition_code, '')) IN ('CALL_DROP', 'CALL DROP')
//              AND uch_talk_time IS NULL
//              AND UPPER(COALESCE(ch_hangup_details, '')) IN ('CUSTOMER_HANGUP_PHONE', 'CUSTOMER_HANGUP_UI')
//          )
//        )::int AS calls,

//        -- Transfers to sales per agent
//        COUNT(DISTINCT ch_call_id) FILTER (
//          WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
//        )::int AS transfer_to_sales,

//        -- Phones transferred by this agent with their transfer timestamps
//        JSON_AGG(
//          JSON_BUILD_OBJECT(
//            'phone', ch_phone,
//            'timestamp', ch_date_added
//          )
//        ) FILTER (
//          WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
//            AND ch_phone IS NOT NULL
//            AND BTRIM(ch_phone) != ''
//        ) AS transfer_phone_details

//      FROM acd_interval_denormalized_entity

//      WHERE
//         rec_no = 1
//         AND first_queue_answered = 't'

//         AND ${PROCESS_FILTER_SQL}

//         AND ch_date_added >= :startDate::timestamp
//         AND ch_date_added <  :endDate::timestamp

//      GROUP BY
//        DATE(ch_date_added),
//        campaign_name,
//        COALESCE(udh_user_id, username)

//      ORDER BY
//        campaign_name    ASC,
//        report_date      ASC,
//        transfer_to_sales DESC,
//        agent_name       ASC`,
//     {
//       replacements: { startDate, endDate },
//       type: QueryTypes.SELECT,
//     },
//   );

export const pgGetTransferAgentWiseData = ({ startDate, endDate }) =>
  getPGSequelize().query(
    `SELECT
       DATE(ch_date_added) AS report_date,
       campaign_name,
       udh_user_id AS agent_name,

       -- Count unique call IDs matching dialer logic:
       -- CONNECTED calls, excluding short CALL_DROPs (< 5s talk time).
       -- Removed "+add-back" for NULL-talk-time customer-hangup CALL_DROPs —
       -- dialer never counts zero-talk-time records as valid calls.
       COUNT(DISTINCT ch_call_id) FILTER (
         WHERE ch_system_disposition = 'CONNECTED'
           AND NULLIF(BTRIM(ch_phone), '') IS NOT NULL
           AND NOT (
             UPPER(COALESCE(udh_disposition_code, '')) IN ('CALL_DROP', 'CALL DROP')
             AND COALESCE(udh_talk_time, 0) < 5000
           )
       )::int AS calls,

       -- Transfers to sales
       COUNT(DISTINCT ch_call_id) FILTER (
         WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
       )::int AS transfer_to_sales,

       -- Transfer phone details (JSONB FIX)
       JSONB_AGG(DISTINCT JSONB_BUILD_OBJECT(
         'phone', ch_phone,
         'timestamp', ch_date_added
       )) FILTER (
         WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
           AND ch_phone IS NOT NULL
           AND BTRIM(ch_phone) != ''
       ) AS transfer_phone_details

     FROM acd_interval_denormalized_entity

     WHERE
        rec_no = 1
        AND first_queue_answered = 't'

        -- ✅ Only udh_user_id (no username fallback)
        AND udh_user_id IS NOT NULL
        AND BTRIM(udh_user_id) <> ''

        AND ${PROCESS_FILTER_SQL}

        AND ch_date_added >= :startDate::timestamp
        AND ch_date_added <  :endDate::timestamp

     GROUP BY
       DATE(ch_date_added),
       campaign_name,
       udh_user_id

     ORDER BY
       campaign_name ASC,
       report_date ASC,
       transfer_to_sales DESC,
       agent_name ASC`,
    {
      replacements: { startDate, endDate },
      type: QueryTypes.SELECT,
    },
  );

// ── MSSQL: orders whose mobile matches any of the transferred phones ──────────

export const msGetOrdersByMobilesAgentWise = async ({
  startDate,
  endDate,
  mobiles,
}) => {
  const normSet = [...new Set((mobiles || []).map(normPhone).filter(Boolean))];
  if (!normSet.length) return [];

  // MSSQL stores dates in IST — use raw date strings directly (no UTC shift).
  const toMSSQLDate = (s) => {
    const d = String(s).replace("T", " ").trim();
    return d.length === 10 ? `${d} 00:00:00` : d;
  };
  const dtStart = toMSSQLDate(startDate);
  const dtEnd = toMSSQLDate(endDate);

  // Deduplicate across batches by order id
  const rowsById = new Map();

  for (let i = 0; i < normSet.length; i += MOBILE_BATCH) {
    const batch = normSet.slice(i, i + MOBILE_BATCH);
    const ph = batch.map((m) => `'${m}'`).join(",");

    const rows = await getMSSQLSequelize().query(
      `SELECT
         id,
         CONVERT(VARCHAR(10), createdOn, 120)          AS order_date,
         LTRIM(RTRIM(ISNULL(mobile,   '')))             AS mobile,
         LTRIM(RTRIM(ISNULL(alterMob, '')))             AS alterMob,
         LTRIM(RTRIM(ISNULL(Mobile3,  '')))             AS mobile3
       FROM tblOrderDetails
       WHERE createdOn >= CAST('${dtStart}' AS DATETIME)
         AND createdOn <  CAST('${dtEnd}'   AS DATETIME)
         AND (
           RIGHT(LTRIM(RTRIM(ISNULL(mobile,   ''))), 10) IN (${ph})
           OR RIGHT(LTRIM(RTRIM(ISNULL(alterMob, ''))), 10) IN (${ph})
           OR RIGHT(LTRIM(RTRIM(ISNULL(Mobile3,  ''))), 10) IN (${ph})
         )`,
      { type: QueryTypes.SELECT },
    );

    for (const row of rows) {
      if (!rowsById.has(row.id)) rowsById.set(row.id, row);
    }

    logger.info(
      `[TransferAgentWiseRepo] MSSQL batch ${Math.floor(i / MOBILE_BATCH) + 1}/${Math.ceil(normSet.length / MOBILE_BATCH)}: ${rows.length} rows, ${rowsById.size} unique so far`,
    );
  }

  return [...rowsById.values()];
};
