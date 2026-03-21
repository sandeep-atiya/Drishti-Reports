-- ============================================================
-- Run these on PostgreSQL (reportsdb)
-- CONCURRENTLY = no table lock, safe on live DB
-- ============================================================

-- Primary index: date range + campaign filter (most critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_acd_date_campaign
  ON acd_interval_denormalized_entity (ch_date_added, campaign_name)
  WHERE ch_system_disposition = 'CONNECTED'
    AND uch_talk_time > 5;

-- Secondary: covers the GROUP BY columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_acd_agent_date
  ON acd_interval_denormalized_entity (ch_date_added, udh_user_id, username, ch_campaign_id)
  WHERE ch_system_disposition = 'CONNECTED'
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
