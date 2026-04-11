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

// ── PostgreSQL: calls + p_count + transfer phones per process ─────────────────
//
// Campaigns: Courtesy_1, Filtration_Courtesy, Filtration_utilization only.
// Calls = CONNECTED dispositions (no talk-time filter).
// Transfers = Transfer to Sales disposition (no talk-time filter — matches telecom report).
// p_count = COUNT(DISTINCT agent) for CONNECTED calls.
// AVG columns are calculated in the service layer.

// export const pgGetTransferUniqueCallsData = ({ startDate, endDate }) =>
//   getPGSequelize().query(
//     `SELECT
//        campaign_name AS process_name,

//        -- Agents (only meaningful for connected calls)
//        COUNT(DISTINCT udh_user_id) FILTER (
//          WHERE ch_system_disposition = 'CONNECTED'
//        )::int AS p_count,

//        -- Connected calls only
//           COUNT(DISTINCT ch_call_id) FILTER (
//           WHERE
//           ch_system_disposition = 'CONNECTED'
//           OR (
//           udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
//           AND ch_system_disposition IN (
//           'PROVIDER_TEMP_FAILURE',
//           'NO_ANSWER'
//       )
//     )
// )::int AS calls,

//        -- Transfer to sales (no talk-time filter — matches telecom report)
//        COUNT(DISTINCT ch_call_id) FILTER (
//          WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
//        )::int AS transfer_to_sales,

//        -- Transfer phones (no talk-time filter)
//        ARRAY_REMOVE(
//          ARRAY_AGG(DISTINCT ch_phone) FILTER (
//            WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
//          ),
//          NULL
//        ) AS transfer_phones

//      FROM acd_interval_denormalized_entity

//      WHERE
//         rec_no = 1
//         AND first_queue_answered = 't'

//         AND ${PROCESS_FILTER_SQL}

//         AND ch_date_added >= :startDate::timestamp
//         AND ch_date_added <  :endDate::timestamp

//      GROUP BY campaign_name

//      ORDER BY calls DESC, campaign_name ASC`,
//     {
//       replacements: { startDate, endDate },
//       type: QueryTypes.SELECT,
//     },
//   );

// export const pgGetTransferUniqueCallsData = ({ startDate, endDate }) =>
//   getPGSequelize().query(
//     `SELECT
//        campaign_name AS process_name,

//        -- Agents (only meaningful for connected calls)
//        COUNT(DISTINCT udh_user_id) FILTER (
//          WHERE ch_system_disposition = 'CONNECTED'
//        )::int AS p_count,

//        -- Connected calls only
//           COUNT(DISTINCT ch_call_id) FILTER (
//           WHERE
//           ch_system_disposition = 'CONNECTED'
//          OR (
//           udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
//          AND ch_system_disposition IN (
//         'PROVIDER_TEMP_FAILURE',
//         'NO_ANSWER'
//         )
//         AND COALESCE(udh_talk_time, 0) >= 5000
//        )
//        )::int AS calls,

//        -- Transfer to sales (no talk-time filter — matches telecom report)
//        COUNT(DISTINCT ch_call_id) FILTER (
//          WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
//        )::int AS transfer_to_sales,

//        -- Transfer phones (no talk-time filter)
//        ARRAY_REMOVE(
//          ARRAY_AGG(DISTINCT ch_phone) FILTER (
//            WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
//          ),
//          NULL
//        ) AS transfer_phones

//      FROM acd_interval_denormalized_entity

//      WHERE
//         rec_no = 1
//         AND first_queue_answered = 't'

//         AND ${PROCESS_FILTER_SQL}

//         AND ch_date_added >= :startDate::timestamp
//         AND ch_date_added <  :endDate::timestamp

//      GROUP BY campaign_name

//      ORDER BY calls DESC, campaign_name ASC`,
//     {
//       replacements: { startDate, endDate },
//       type: QueryTypes.SELECT,
//     },
//   );

// export const pgGetTransferUniqueCallsData = ({ startDate, endDate }) =>
//   getPGSequelize().query(
//     `SELECT
//        campaign_name AS process_name,

//        -- Agents (only meaningful for connected calls)
//        COUNT(DISTINCT udh_user_id) FILTER (
//          WHERE ch_system_disposition = 'CONNECTED'
//        )::int AS p_count,

//        -- Connected calls only
//           COUNT(DISTINCT ch_call_id) FILTER (
//           WHERE
//          ch_system_disposition = 'CONNECTED'
//         OR (
//         udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
//         AND ch_system_disposition IN (
//         'PROVIDER_TEMP_FAILURE',
//         'NO_ANSWER'
//         )
//         AND NOT (
//         ch_hangup_details IN ('Customer_Hangup_Phone', 'Customer_hangup_ui')
//         AND udh_disposition_code IN ('CALL_DROP', 'Call Drop')
//         AND COALESCE(udh_talk_time, 0) < 5000
//         )
//          )
//         ) ::int AS calls,

//        -- Transfer to sales (no talk-time filter — matches telecom report)
//        COUNT(DISTINCT ch_call_id) FILTER (
//          WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
//        )::int AS transfer_to_sales,

//        -- Transfer phones (no talk-time filter)
//        ARRAY_REMOVE(
//          ARRAY_AGG(DISTINCT ch_phone) FILTER (
//            WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
//          ),
//          NULL
//        ) AS transfer_phones

//      FROM acd_interval_denormalized_entity

//      WHERE
//         rec_no = 1
//         AND first_queue_answered = 't'

//         AND ${PROCESS_FILTER_SQL}

//         AND ch_date_added >= :startDate::timestamp
//         AND ch_date_added <  :endDate::timestamp

//      GROUP BY campaign_name

//      ORDER BY calls DESC, campaign_name ASC`,
//     {
//       replacements: { startDate, endDate },
//       type: QueryTypes.SELECT,
//     },
//   );

export const pgGetTransferUniqueCallsData = ({ startDate, endDate }) =>
  getPGSequelize().query(
    `SELECT
       campaign_name AS process_name,

       -- Agents (only meaningful for connected calls)
       COUNT(DISTINCT udh_user_id) FILTER (
         WHERE ch_system_disposition = 'CONNECTED'
       )::int AS p_count,

       -- Match the manual Excel count more closely:
       -- 1) count connected rows with a usable phone
       -- 2) exclude short CALL_DROP rows (< 5s) which the manual workbook
       --    appears to treat as failed/invalid calls
       -- 3) keep NULL uch_talk_time customer-hangup call-drops, because they
       --    are present in the manual sheet for 2026-04-07
       (
         COUNT(ch_phone) FILTER (
           WHERE ch_system_disposition = 'CONNECTED'
             AND NULLIF(BTRIM(ch_phone), '') IS NOT NULL
         )
         - COUNT(ch_phone) FILTER (
           WHERE ch_system_disposition = 'CONNECTED'
             AND NULLIF(BTRIM(ch_phone), '') IS NOT NULL
             AND UPPER(COALESCE(udh_disposition_code, '')) IN ('CALL_DROP', 'CALL DROP')
             AND COALESCE(udh_talk_time, 0) < 5000
         )
         + COUNT(ch_phone) FILTER (
           WHERE ch_system_disposition = 'CONNECTED'
             AND NULLIF(BTRIM(ch_phone), '') IS NOT NULL
             AND UPPER(COALESCE(udh_disposition_code, '')) IN ('CALL_DROP', 'CALL DROP')
             AND uch_talk_time IS NULL
             AND UPPER(COALESCE(ch_hangup_details, '')) IN ('CUSTOMER_HANGUP_PHONE', 'CUSTOMER_HANGUP_UI')
         )
       )::int AS calls,



       -- Transfer to sales (no talk-time filter — matches telecom report)
       COUNT(DISTINCT ch_call_id) FILTER (
         WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
       )::int AS transfer_to_sales,

       -- Transfer phones (no talk-time filter)
       ARRAY_REMOVE(
         ARRAY_AGG(DISTINCT ch_phone) FILTER (
           WHERE udh_disposition_code IN ('Transfer to Sales', 'Transfer_to_sales')
         ),
         NULL
       ) AS transfer_phones

     FROM acd_interval_denormalized_entity

     WHERE
        rec_no = 1
        AND first_queue_answered = 't'

        AND ${PROCESS_FILTER_SQL}

        AND ch_date_added >= :startDate::timestamp
        AND ch_date_added <  :endDate::timestamp

     GROUP BY campaign_name

     ORDER BY calls DESC, campaign_name ASC`,
    {
      replacements: { startDate, endDate },
      type: QueryTypes.SELECT,
    },
  );

// ── MSSQL: orders whose mobile matches any of the transferred phones ──────────

export const msGetOrdersByMobilesUniqueCalls = async ({
  startDate,
  endDate,
  mobiles,
}) => {
  const normSet = [...new Set((mobiles || []).map(normPhone).filter(Boolean))];
  if (!normSet.length) return [];

  // MSSQL stores dates in IST — use the raw date strings directly (no UTC conversion).
  // Append time so a plain YYYY-MM-DD string becomes a midnight timestamp.
  const toMSSQLDate = (s) => {
    const d = String(s).replace("T", " ").trim();
    return d.length === 10 ? `${d} 00:00:00` : d;
  };
  const dtStart = toMSSQLDate(startDate);
  const dtEnd = toMSSQLDate(endDate);

  // Collect rows into a Map keyed by order id to deduplicate across batches.
  const rowsById = new Map();

  for (let i = 0; i < normSet.length; i += MOBILE_BATCH) {
    const batch = normSet.slice(i, i + MOBILE_BATCH);
    const ph = batch.map((m) => `'${m}'`).join(",");

    const rows = await getMSSQLSequelize().query(
      `SELECT
         id,
         LTRIM(RTRIM(ISNULL(mobile,   ''))) AS mobile,
         LTRIM(RTRIM(ISNULL(alterMob, ''))) AS alterMob,
         LTRIM(RTRIM(ISNULL(Mobile3,  ''))) AS mobile3
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
      `[TransferUniqueCallsRepo] MSSQL batch ${Math.floor(i / MOBILE_BATCH) + 1}/${Math.ceil(normSet.length / MOBILE_BATCH)}: ${rows.length} rows, ${rowsById.size} unique so far`,
    );
  }

  return [...rowsById.values()];
};
