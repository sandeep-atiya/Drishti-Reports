import { Router } from 'express';
import drishtiReportRoutes    from './drishti.report.routes.js';
import transferReportRoutes   from './transfer.report.routes.js';
import selfHangupReportRoutes from './selfHangup.report.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success:   true,
    message:   'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
  });
});

router.use('/reports/drishti',     drishtiReportRoutes);
router.use('/reports/transfer',    transferReportRoutes);
router.use('/reports/selfhangup',  selfHangupReportRoutes);

export default router;
