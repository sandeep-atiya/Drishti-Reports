import { Router } from 'express';
import {
  getSalesHydrabadReport,
  getSalesHydrabadJobStatus,
} from '../controllers/salesHyderabad.report.controller.js';
import { validate, salesHydrabadReportSchema } from '../validations/salesHyderabad.report.validation.js';

const router = Router();

router.get('/',            validate(salesHydrabadReportSchema), getSalesHydrabadReport);
router.get('/jobs/:jobId', getSalesHydrabadJobStatus);

export default router;
