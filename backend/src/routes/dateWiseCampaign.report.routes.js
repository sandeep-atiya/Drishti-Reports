import { Router } from 'express';
import {
  getDateWiseCampaignReport,
  getDateWiseCampaignJobStatus,
} from '../controllers/dateWiseCampaign.report.controller.js';
import { validate, dateWiseCampaignReportSchema } from '../validations/dateWiseCampaign.report.validation.js';

const router = Router();

router.get('/',            validate(dateWiseCampaignReportSchema), getDateWiseCampaignReport);
router.get('/jobs/:jobId', getDateWiseCampaignJobStatus);

export default router;
