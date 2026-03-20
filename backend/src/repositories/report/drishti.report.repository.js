import { QueryTypes } from 'sequelize';
import { getMSSQLSequelize } from '../../connections/index.js';
import { getPGSequelize } from '../../connections/index.js';

const CAMPAIGN_NAMES_SQL = `'Digital inbound', 'Inbound_2'`;

const drishtiReportRepository = {
  /**
   * Calls per campaign from PostgreSQL (Ameyo)
   */
  getCallsByCampaign: ({ startDate, endDate }) => {
    const pgSeq = getPGSequelize();
    return pgSeq.query(
      `SELECT
        campaign_name,
        ch_campaign_id AS campaign_id,
        COUNT(*) AS calls
      FROM acd_interval_denormalized_entity
      WHERE
        ch_system_disposition = 'CONNECTED'
        AND campaign_name IN (${CAMPAIGN_NAMES_SQL})
        AND (ch_hangup_details NOT IN ('Customer_Hangup_Phone', 'Customer_hangup_ui') OR ch_hangup_details IS NULL)
        AND (udh_disposition_code <> 'Call_Drop' OR udh_disposition_code IS NULL)
        AND uch_talk_time > 5
        AND ch_date_added::date >= :startDate
        AND ch_date_added::date <= :endDate
      GROUP BY campaign_name, ch_campaign_id`,
      { replacements: { startDate, endDate }, type: QueryTypes.SELECT }
    );
  },

  /**
   * Calls per agent from PostgreSQL (Ameyo)
   */
  getCallsByAgent: ({ startDate, endDate }) => {
    const pgSeq = getPGSequelize();
    return pgSeq.query(
      `SELECT
        udh_user_id,
        username,
        campaign_name,
        ch_campaign_id AS campaign_id,
        COUNT(*) AS calls
      FROM acd_interval_denormalized_entity
      WHERE
        ch_system_disposition = 'CONNECTED'
        AND campaign_name IN (${CAMPAIGN_NAMES_SQL})
        AND (ch_hangup_details NOT IN ('Customer_Hangup_Phone', 'Customer_hangup_ui') OR ch_hangup_details IS NULL)
        AND (udh_disposition_code <> 'Call_Drop' OR udh_disposition_code IS NULL)
        AND uch_talk_time > 5
        AND ch_date_added::date >= :startDate
        AND ch_date_added::date <= :endDate
      GROUP BY udh_user_id, username, campaign_name, ch_campaign_id`,
      { replacements: { startDate, endDate }, type: QueryTypes.SELECT }
    );
  },

  /**
   * Orders per campaign from MSSQL (CRM)
   * campaignIds: number[]
   */
  getOrdersByCampaign: ({ startDate, endDate, campaignIds }) => {
    if (!campaignIds || campaignIds.length === 0) return Promise.resolve([]);
    const mssqlSeq = getMSSQLSequelize();
    const idList = campaignIds.map(Number).join(',');
    return mssqlSeq.query(
      `SELECT
        campaign_Id,
        COUNT(*) AS orders,
        SUM(CASE WHEN disposition_Code = 'Verified' THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN disposition_Code = 'Verified' THEN ISNULL(total_amount, 0) ELSE 0 END) AS verified_amount
      FROM tblOrderDetails
      WHERE
        CONVERT(DATE, createdOn) >= :startDate
        AND CONVERT(DATE, createdOn) <= :endDate
        AND campaign_Id IN (${idList})
      GROUP BY campaign_Id`,
      { replacements: { startDate, endDate }, type: QueryTypes.SELECT }
    );
  },

  /**
   * Orders per agent from MSSQL (CRM)
   * campaignIds: number[]
   */
  getOrdersByAgent: ({ startDate, endDate, campaignIds }) => {
    if (!campaignIds || campaignIds.length === 0) return Promise.resolve([]);
    const mssqlSeq = getMSSQLSequelize();
    const idList = campaignIds.map(Number).join(',');
    return mssqlSeq.query(
      `SELECT
        AgentID,
        campaign_Id,
        COUNT(*) AS orders,
        SUM(CASE WHEN disposition_Code = 'Verified' THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN disposition_Code = 'Verified' THEN ISNULL(total_amount, 0) ELSE 0 END) AS verified_amount
      FROM tblOrderDetails
      WHERE
        CONVERT(DATE, createdOn) >= :startDate
        AND CONVERT(DATE, createdOn) <= :endDate
        AND campaign_Id IN (${idList})
      GROUP BY AgentID, campaign_Id`,
      { replacements: { startDate, endDate }, type: QueryTypes.SELECT }
    );
  },
};

export default drishtiReportRepository;
