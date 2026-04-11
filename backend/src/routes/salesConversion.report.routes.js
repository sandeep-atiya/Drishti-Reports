import { Router } from 'express';
import {
  getSalesConversionReport,
  getSalesConversionJobStatus,
} from '../controllers/salesConversion.report.controller.js';
import { validate, salesConversionReportSchema } from '../validations/salesConversion.report.validation.js';

const router = Router();

router.get('/',            validate(salesConversionReportSchema), getSalesConversionReport);
router.get('/jobs/:jobId', getSalesConversionJobStatus);

export default router;
