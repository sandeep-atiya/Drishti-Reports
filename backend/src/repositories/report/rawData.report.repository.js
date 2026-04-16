import { QueryTypes } from 'sequelize';
import { getPGSequelize } from '../../connections/index.js';

const isDatetime = (s) => typeof s === 'string' && s.includes('T');

export const pgGetRawData = ({
  startDate,
  endDate,
  campaign,
  agent,
  onlyConnected,
  excludeShortCalls,
  excludeCallDrop,
  excludeFailedAssociation,
  excludeUnayurQueues,
  limit,
}) => {
  const startExpr = isDatetime(startDate)
    ? `ch_date_added >= :startDate::timestamp without time zone`
    : `ch_date_added >= :startDate::date`;
  const endExpr = isDatetime(endDate)
    ? `ch_date_added <  :endDate::timestamp without time zone`
    : `ch_date_added <  :endDate::date`;

  const noLimit      = !limit || Number(limit) === 0;
  const conditions   = [startExpr, endExpr];
  const replacements = { startDate, endDate };
  if (!noLimit) replacements.limit = Number(limit);

  if (campaign) {
    conditions.push(`campaign_name ILIKE :campaign`);
    replacements.campaign = campaign;
  }

  if (agent) {
    conditions.push(`udh_user_id ILIKE :agent`);
    replacements.agent = `%${agent}%`;
  }

  if (onlyConnected) {
    conditions.push(`ch_system_disposition = 'CONNECTED'`);
    conditions.push(`NULLIF(BTRIM(ch_phone), '') IS NOT NULL`);
  }

  if (excludeShortCalls) {
    conditions.push(`COALESCE(udh_talk_time, 0) >= 5000`);
  }

  if (excludeCallDrop) {
    conditions.push(
      `NOT (UPPER(COALESCE(udh_disposition_code, '')) IN ('CALL_DROP', 'CALL DROP') AND COALESCE(udh_talk_time, 0) < 5000)`
    );
  }

  if (excludeFailedAssociation) {
    conditions.push(`LOWER(COALESCE(udh_disposition_code, '')) <> 'failed.association'`);
  }

  if (excludeUnayurQueues) {
    conditions.push(
      `NOT (campaign_name ILIKE 'Unayur_IN' AND queue_name IS NOT NULL AND queue_name IN ('Verification_PendingAgentQueue', 'FreshAgentQueue'))`
    );
  }

  return getPGSequelize().query(
    `SELECT
       ch_date_added,
       ch_call_id,
       udh_user_id,
       username,
       campaign_name,
       ch_campaign_id,
       ch_system_disposition,
       udh_disposition_code,
       udh_talk_time,
       uch_talk_time,
       ch_phone,
       ch_hangup_details,
       queue_name
     FROM acd_interval_denormalized_entity
     WHERE ${conditions.join('\n       AND ')}
     ORDER BY ch_date_added DESC
     ${noLimit ? '' : 'LIMIT :limit'}`,
    { replacements, type: QueryTypes.SELECT }
  );
};

const rawDataRepository = { getRawData: pgGetRawData };
export default rawDataRepository;
