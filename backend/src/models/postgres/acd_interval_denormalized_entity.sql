-- Table: public.acd_interval_denormalized_entity

-- DROP TABLE IF EXISTS public.acd_interval_denormalized_entity;

CREATE TABLE IF NOT EXISTS public.acd_interval_denormalized_entity
(
    setup_id character varying COLLATE pg_catalog."default",
    setup_name character varying COLLATE pg_catalog."default",
    ch_archive_id bigint,
    rah_archive_id bigint,
    rrh_archive_id bigint,
    rch_archive_id bigint,
    uch_archive_id bigint,
    ch_setup_time integer,
    ch_ringing_time integer,
    ch_ringing_start_time timestamp without time zone,
    ch_call_id character varying COLLATE pg_catalog."default",
    ch_call_leg_id character varying COLLATE pg_catalog."default",
    ch_contact_center_id integer,
    ch_process_id integer,
    ch_campaign_id integer,
    ch_phone character varying COLLATE pg_catalog."default",
    ch_crt_object_id character varying COLLATE pg_catalog."default",
    ch_customer_id bigint,
    ch_lead_id integer,
    ch_lead_name character varying COLLATE pg_catalog."default",
    ch_dialing_comments character varying COLLATE pg_catalog."default",
    ch_is_outbound boolean,
    ch_call_type character varying COLLATE pg_catalog."default",
    ch_system_disposition character varying COLLATE pg_catalog."default",
    ch_date_added timestamp without time zone,
    ch_call_result character varying COLLATE pg_catalog."default",
    ch_hangup_cause character varying COLLATE pg_catalog."default",
    ch_hangup_cause_description character varying COLLATE pg_catalog."default",
    ch_hangup_cause_code character varying COLLATE pg_catalog."default",
    ch_hangup_first boolean,
    ch_hangup_on_hold boolean,
    ch_call_originate_time timestamp without time zone,
    ch_call_end_time timestamp without time zone,
    ch_ivr_time integer,
    ch_talk_time integer,
    ch_hold_time integer,
    ch_recording_file_url character varying COLLATE pg_catalog."default",
    ch_nodeflow_id character varying COLLATE pg_catalog."default",
    ch_actual_channel character varying COLLATE pg_catalog."default",
    ch_column_1 character varying COLLATE pg_catalog."default",
    ch_value_1 character varying COLLATE pg_catalog."default",
    ch_column_2 character varying COLLATE pg_catalog."default",
    ch_value_2 character varying COLLATE pg_catalog."default",
    ch_column_3 character varying COLLATE pg_catalog."default",
    ch_value_3 character varying COLLATE pg_catalog."default",
    ch_connection_state character varying COLLATE pg_catalog."default",
    ch_connection_state_data character varying COLLATE pg_catalog."default",
    ch_customer_source character varying COLLATE pg_catalog."default",
    ch_is_test_call boolean,
    ch_num_attempts integer,
    ch_hangup_details character varying COLLATE pg_catalog."default",
    ch_related_crt_object_id character varying COLLATE pg_catalog."default",
    ch_nodeflow_meta_data character varying COLLATE pg_catalog."default",
    ch_dialed_call_details character varying COLLATE pg_catalog."default",
    ch_crm_url character varying COLLATE pg_catalog."default",
    ch_src_phone character varying COLLATE pg_catalog."default",
    ch_dst_phone character varying COLLATE pg_catalog."default",
    ch_customer_data character varying COLLATE pg_catalog."default",
    udh_id character varying COLLATE pg_catalog."default",
    udh_call_id character varying COLLATE pg_catalog."default",
    udh_call_leg_id character varying COLLATE pg_catalog."default",
    udh_date_added timestamp without time zone,
    udh_user_disposition_time timestamp without time zone,
    udh_transfer_time timestamp without time zone,
    udh_transfer_to character varying COLLATE pg_catalog."default",
    udh_disposition_details character varying COLLATE pg_catalog."default",
    udh_disposition_class character varying COLLATE pg_catalog."default",
    udh_disposition_code character varying COLLATE pg_catalog."default",
    udh_user_id character varying COLLATE pg_catalog."default",
    udh_session_id character varying COLLATE pg_catalog."default",
    udh_user_crt_object_id character varying COLLATE pg_catalog."default",
    udh_wrap_time integer,
    udh_talk_time integer,
    udh_working boolean,
    udh_campaign_team_id integer,
    udh_disposed_by_crm boolean,
    udh_agent_queue_id integer,
    udh_auto_call_on_time integer,
    udh_auto_call_off_time integer,
    udh_user_connected_time timestamp without time zone,
    udh_user_disconnected_time timestamp without time zone,
    udh_campaign_id integer,
    udh_hold_time integer,
    udh_association_type character varying COLLATE pg_catalog."default",
    udh_request_id character varying COLLATE pg_catalog."default",
    udh_additional_parameters character varying COLLATE pg_catalog."default",
    udh_actual_channel character varying COLLATE pg_catalog."default",
    udh_call_context_id integer,
    udh_call_context_name character varying COLLATE pg_catalog."default",
    udh_phone character varying COLLATE pg_catalog."default",
    uch_call_leg_id character varying COLLATE pg_catalog."default",
    uch_user_id character varying COLLATE pg_catalog."default",
    uch_session_id character varying COLLATE pg_catalog."default",
    uch_crt_object_id character varying COLLATE pg_catalog."default",
    uch_setup_time integer,
    uch_ringing_time integer,
    uch_talk_time integer,
    uch_date_added timestamp without time zone,
    uch_id integer,
    uch_phone character varying COLLATE pg_catalog."default",
    uch_call_context_id integer,
    uch_ringing_start_time timestamp without time zone,
    uch_call_originate_time timestamp without time zone,
    rah_id bigint,
    rah_request_id character varying COLLATE pg_catalog."default",
    rah_wait_time bigint,
    rah_actual_wait_time bigint,
    rah_result character varying COLLATE pg_catalog."default",
    rah_allocated_resource character varying COLLATE pg_catalog."default",
    rah_date_added timestamp without time zone,
    rch_id bigint,
    rch_request_id character varying COLLATE pg_catalog."default",
    rch_service_time bigint,
    rch_allocated_resource character varying COLLATE pg_catalog."default",
    rch_date_added timestamp without time zone,
    rrh_id bigint,
    rrh_request_id character varying COLLATE pg_catalog."default",
    rrh_request_time timestamp without time zone,
    rrh_media_type character varying COLLATE pg_catalog."default",
    rrh_constraint_type character varying COLLATE pg_catalog."default",
    rrh_constraint_id integer,
    rrh_mrt_object_id character varying COLLATE pg_catalog."default",
    rrh_source_context_id integer,
    rrh_request_type character varying COLLATE pg_catalog."default",
    rrh_association_type character varying COLLATE pg_catalog."default",
    rrh_date_added timestamp without time zone,
    first_queue_hit boolean,
    first_queue_answered boolean,
    unique_id bigint,
    max_request_time timestamp without time zone,
    min_request_time timestamp without time zone,
    rrh_source_context_type character varying COLLATE pg_catalog."default",
    rec_no integer,
    interval_start timestamp without time zone,
    interval_end timestamp without time zone,
    interval_start_30_minutes timestamp without time zone,
    interval_end_30_minutes timestamp without time zone,
    interval_start_hour timestamp without time zone,
    interval_end_hour timestamp without time zone,
    interval_start_day timestamp without time zone,
    interval_end_day timestamp without time zone,
    ch_setup_time_in_interval bigint,
    uch_setup_time_in_interval bigint,
    uch_ringing_time_in_interval bigint,
    udh_talk_time_in_interval bigint,
    udh_wrap_time_in_interval bigint,
    rah_wait_time_in_interval bigint,
    ch_ringing_time_in_interval bigint,
    total_talk_time integer,
    total_wrap_time integer,
    total_wait_time bigint,
    cumulative_wait_time bigint,
    campaign_name character varying COLLATE pg_catalog."default",
    username character varying COLLATE pg_catalog."default",
    process_name character varying COLLATE pg_catalog."default",
    queue_name character varying COLLATE pg_catalog."default",
    udh_preview_duration integer,
    udh_preview_start_time timestamp without time zone,
    udh_preview_time_in_interval bigint,
    archiver_comments character varying COLLATE pg_catalog."default",
    ch_filter_source character varying COLLATE pg_catalog."default",
    ch_filter_source_data jsonb,
    ch_dialled_phone character varying COLLATE pg_catalog."default",
    ch_attempt_flow_detail character varying COLLATE pg_catalog."default",
    ch_dtmf_info character varying COLLATE pg_catalog."default",
    udh_notes character varying COLLATE pg_catalog."default",
    udh_customer_hold_time integer,
    ch_vq_request_id character varying COLLATE pg_catalog."default",
    ch_display_phone character varying COLLATE pg_catalog."default",
    ch_unique_identifier character varying COLLATE pg_catalog."default",
    ch_filter_group_source jsonb,
    ch_callback_id character varying COLLATE pg_catalog."default",
    udh_rec_no integer
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.acd_interval_denormalized_entity
    OWNER to postgres;
-- Index: acd_date_campaign_id_idx

-- DROP INDEX IF EXISTS public.acd_date_campaign_id_idx;

CREATE INDEX IF NOT EXISTS acd_date_campaign_id_idx
    ON public.acd_interval_denormalized_entity USING btree
    (ch_date_added ASC NULLS LAST, ch_campaign_id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: acd_date_user_campaign_id_idx

-- DROP INDEX IF EXISTS public.acd_date_user_campaign_id_idx;

CREATE INDEX IF NOT EXISTS acd_date_user_campaign_id_idx
    ON public.acd_interval_denormalized_entity USING btree
    (ch_date_added ASC NULLS LAST, udh_user_id COLLATE pg_catalog."default" ASC NULLS LAST, ch_campaign_id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: acd_denorm_ch_archiver_id_idx

-- DROP INDEX IF EXISTS public.acd_denorm_ch_archiver_id_idx;

CREATE INDEX IF NOT EXISTS acd_denorm_ch_archiver_id_idx
    ON public.acd_interval_denormalized_entity USING btree
    (ch_archive_id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: acd_denorm_ch_call_origin_time_idx

-- DROP INDEX IF EXISTS public.acd_denorm_ch_call_origin_time_idx;

CREATE INDEX IF NOT EXISTS acd_denorm_ch_call_origin_time_idx
    ON public.acd_interval_denormalized_entity USING btree
    (ch_call_originate_time ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: acd_denorm_ch_date_added_idx

-- DROP INDEX IF EXISTS public.acd_denorm_ch_date_added_idx;

CREATE INDEX IF NOT EXISTS acd_denorm_ch_date_added_idx
    ON public.acd_interval_denormalized_entity USING btree
    (ch_date_added ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: acd_denorm_intrvl_start_30_min_idx

-- DROP INDEX IF EXISTS public.acd_denorm_intrvl_start_30_min_idx;

CREATE INDEX IF NOT EXISTS acd_denorm_intrvl_start_30_min_idx
    ON public.acd_interval_denormalized_entity USING btree
    (interval_start_30_minutes ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: acd_denorm_intrvl_start_day_idx

-- DROP INDEX IF EXISTS public.acd_denorm_intrvl_start_day_idx;

CREATE INDEX IF NOT EXISTS acd_denorm_intrvl_start_day_idx
    ON public.acd_interval_denormalized_entity USING btree
    (interval_start_day ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: acd_denorm_intrvl_start_hour_idx

-- DROP INDEX IF EXISTS public.acd_denorm_intrvl_start_hour_idx;

CREATE INDEX IF NOT EXISTS acd_denorm_intrvl_start_hour_idx
    ON public.acd_interval_denormalized_entity USING btree
    (interval_start_hour ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: acd_denorm_intrvl_start_idx

-- DROP INDEX IF EXISTS public.acd_denorm_intrvl_start_idx;

CREATE INDEX IF NOT EXISTS acd_denorm_intrvl_start_idx
    ON public.acd_interval_denormalized_entity USING btree
    (interval_start ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: acd_setup_id_and_ch_archive_id_idx

-- DROP INDEX IF EXISTS public.acd_setup_id_and_ch_archive_id_idx;

CREATE INDEX IF NOT EXISTS acd_setup_id_and_ch_archive_id_idx
    ON public.acd_interval_denormalized_entity USING btree
    (setup_id COLLATE pg_catalog."default" ASC NULLS LAST, ch_archive_id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: acd_setup_id_idx

-- DROP INDEX IF EXISTS public.acd_setup_id_idx;

CREATE INDEX IF NOT EXISTS acd_setup_id_idx
    ON public.acd_interval_denormalized_entity USING btree
    (setup_id COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;