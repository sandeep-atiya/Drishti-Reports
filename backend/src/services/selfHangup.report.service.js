import selfHangupRepository from '../repositories/report/selfHangup.report.repository.js';
import logger from '../utils/logger.js';

const num = (v) => Number(v) || 0;
const pct = (n, d) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0.0%');

const selfHangupReportService = {
  /**
   * Build per-agent self-hangup report.
   * Returns array of row objects with computed derived columns.
   */
  getReport: async ({ startDate, endDate, campaignName }) => {
    const t0 = Date.now();

    const rawRows = await selfHangupRepository.getHangupByAgent({
      startDate,
      endDate,
      campaignName: campaignName || null,
    });

    logger.info(
      `[SelfHangup] DB query done in ${Date.now() - t0}ms  (${rawRows.length} rows)`
    );

    const rows = rawRows.map((r) => {
      const ahPhone  = num(r.agent_hangup_phone);
      const ahUi     = num(r.agent_hangup_ui);
      const chPhone  = num(r.customer_hangup_phone);
      const sHangup  = num(r.system_hangup);
      const sMedia   = num(r.system_media);
      const sRec     = num(r.system_recording);

      const grandTotal    = ahPhone + ahUi + chPhone + sHangup + sMedia + sRec;
      const selfHangup    = ahPhone + ahUi;
      const selfHangupPct = pct(selfHangup, grandTotal);

      return {
        'Agent\'s Name':         r.agent_name || 'Unknown',
        AGENT_HANGUP_PHONE:      ahPhone,
        AGENT_HANGUP_UI:         ahUi,
        CUSTOMER_HANGUP_PHONE:   chPhone,
        SYSTEM_HANGUP:           sHangup,
        SYSTEM_MEDIA:            sMedia,
        SYSTEM_RECORDING:        sRec,
        'Grand Total':            grandTotal,
        'Total Self Hangup':      selfHangup,
        'Self Hangup %':          selfHangupPct,
      };
    });

    return rows;
  },

  getCampaigns: async () => {
    const rows = await selfHangupRepository.getCampaignNames();
    return rows.map((r) => r.campaign_name).filter(Boolean);
  },
};

export default selfHangupReportService;
