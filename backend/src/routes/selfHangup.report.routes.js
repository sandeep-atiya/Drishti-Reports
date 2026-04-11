import { Router } from 'express';
import {
  getSelfHangupReport,
  getSelfHangupJobStatus,
  getSelfHangupCampaigns,
} from '../controllers/selfHangup.report.controller.js';
import { validate, selfHangupReportSchema } from '../validations/selfHangup.report.validation.js';

const router = Router();

router.get('/campaigns',    getSelfHangupCampaigns);
router.get('/',             validate(selfHangupReportSchema), getSelfHangupReport);
router.get('/jobs/:jobId',  getSelfHangupJobStatus);

export default router;
