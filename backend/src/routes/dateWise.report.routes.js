import { Router } from 'express';
import {
  getDateWiseReport,
  getDateWiseJobStatus,
} from '../controllers/dateWise.report.controller.js';
import { validate, dateWiseReportSchema } from '../validations/dateWise.report.validation.js';

const router = Router();

router.get('/',            validate(dateWiseReportSchema), getDateWiseReport);
router.get('/jobs/:jobId', getDateWiseJobStatus);

export default router;
