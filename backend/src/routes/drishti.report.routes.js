import { Router } from 'express';
import { getDrishtiReport, getJobStatus } from '../controllers/drishti.report.controller.js';
import { validate, drishtiReportSchema } from '../validations/drishti.report.validation.js';

const router = Router();

router.get('/',            validate(drishtiReportSchema), getDrishtiReport);
router.get('/jobs/:jobId', getJobStatus);

export default router;
