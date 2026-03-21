import { QueryTypes } from 'sequelize';
import { getMSSQLSequelize, getPGSequelize } from '../../connections/index.js';

const CAMPAIGN_NAMES_SQL = `'Digital inbound', 'Inbound_2'`;

const drishtiReportRepository = {
  /**
   * Single PG query — groups by agent+campaign.
   * Campaign-level totals are derived from this in the service layer (saves one full table scan).
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
        AND ch_hangup_details NOT IN ('Customer_Hangup_Phone', 'Customer_hangup_ui')
        AND udh_disposition_code IS DISTINCT FROM 'Call_Drop'
        AND uch_talk_time > 5
        AND ch_date_added >= :startDate::date
        AND ch_date_added <  :endDate::date + INTERVAL '1 day'
      GROUP BY udh_user_id, username, campaign_name, ch_campaign_id`,
      { replacements: { startDate, endDate }, type: QueryTypes.SELECT }
    );
  },

  /**
   * MSSQL — orders + verified per campaign
   */
  getOrdersByCampaign: ({ startDate, endDate, campaignIds }) => {
    if (!campaignIds?.length) return Promise.resolve([]);
    const idList = campaignIds.map(Number).join(',');
    return getMSSQLSequelize().query(
      `SELECT
        campaign_Id,
        COUNT(*) AS orders,
        SUM(CASE WHEN disposition_Code = 'Verified' THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN disposition_Code = 'Verified' THEN ISNULL(total_amount, 0) ELSE 0 END) AS verified_amount
      FROM tblOrderDetails
      WHERE
        createdOn >= CAST(:startDate AS DATETIME)
        AND createdOn <  DATEADD(day, 1, CAST(:endDate AS DATE))
        AND campaign_Id IN (${idList})
      GROUP BY campaign_Id`,
      { replacements: { startDate, endDate }, type: QueryTypes.SELECT }
    );
  },

  /**
   * MSSQL — orders + verified per agent
   */
  getOrdersByAgent: ({ startDate, endDate, campaignIds }) => {
    if (!campaignIds?.length) return Promise.resolve([]);
    const idList = campaignIds.map(Number).join(',');
    return getMSSQLSequelize().query(
      `SELECT
        AgentID,
        campaign_Id,
        COUNT(*) AS orders,
        SUM(CASE WHEN disposition_Code = 'Verified' THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN disposition_Code = 'Verified' THEN ISNULL(total_amount, 0) ELSE 0 END) AS verified_amount
      FROM tblOrderDetails
      WHERE
        createdOn >= CAST(:startDate AS DATETIME)
        AND createdOn <  DATEADD(day, 1, CAST(:endDate AS DATE))
        AND campaign_Id IN (${idList})
      GROUP BY AgentID, campaign_Id`,
      { replacements: { startDate, endDate }, type: QueryTypes.SELECT }
    );
  },
};

export default drishtiReportRepository;
