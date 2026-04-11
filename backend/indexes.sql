-- ============================================================
-- Run these on PostgreSQL (reportsdb)
-- CONCURRENTLY = no table lock, safe on live DB
-- ============================================================

-- Drop old partial indexes (they were missing conditions so PG couldn't use them)
DROP INDEX CONCURRENTLY IF EXISTS idx_acd_date_campaign;
DROP INDEX CONCURRENTLY IF EXISTS idx_acd_agent_date;

-- ONE covering partial index that matches ALL WHERE conditions in the query.
-- PG can do an index-only scan → no heap access → very fast even for large ranges.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_acd_report_covering
  ON acd_interval_denormalized_entity (ch_date_added, udh_user_id, username, campaign_name, ch_campaign_id)
  WHERE
    ch_system_disposition = 'CONNECTED'
    AND campaign_name IN ('Digital inbound', 'Inbound_2')
    AND ch_hangup_details NOT IN ('Customer_Hangup_Phone', 'Customer_hangup_ui')
    AND udh_disposition_code IS DISTINCT FROM 'Call_Drop'
    AND uch_talk_time > 5;


-- ============================================================
-- Run these on MSSQL (DristhiSoftTechDB_Development)
-- ============================================================

-- Primary index: date range + campaign (covers campaign query)
CREATE INDEX idx_order_createdon_campaign
  ON tblOrderDetails (createdOn, campaign_Id)
  INCLUDE (disposition_Code, total_amount);

-- Secondary: covers agent query
CREATE INDEX idx_order_createdon_agent
  ON tblOrderDetails (createdOn, campaign_Id, AgentID)
  INCLUDE (disposition_Code, total_amount);
