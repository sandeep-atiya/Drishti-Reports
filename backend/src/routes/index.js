import { Router } from 'express';
import drishtiReportRoutes          from './drishti.report.routes.js';
import transferReportRoutes         from './transfer.report.routes.js';
import selfHangupReportRoutes       from './selfHangup.report.routes.js';
import dateWiseReportRoutes         from './dateWise.report.routes.js';
import dateWiseCampaignReportRoutes from './dateWiseCampaign.report.routes.js';
import salesConversionReportRoutes  from './salesConversion.report.routes.js';
import salesHydrabadReportRoutes          from './salesHyderabad.report.routes.js';
import transferUniqueCallsReportRoutes    from './transfer.unique.calls.report.routes.js';
import transferAgentWiseReportRoutes      from './transfer.agent.wise.report.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success:   true,
    message:   'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
  });
});

router.use('/reports/drishti',           drishtiReportRoutes);
router.use('/reports/transfer',          transferReportRoutes);
router.use('/reports/selfhangup',        selfHangupReportRoutes);
router.use('/reports/datewise',          dateWiseReportRoutes);
router.use('/reports/datewise-campaign', dateWiseCampaignReportRoutes);
router.use('/reports/sales-conversion',  salesConversionReportRoutes);
router.use('/reports/sales-hyderabad',        salesHydrabadReportRoutes);
router.use('/reports/transfer-unique-calls',  transferUniqueCallsReportRoutes);
router.use('/reports/transfer-agent-wise',    transferAgentWiseReportRoutes);

export default router;
