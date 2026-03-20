import { Router } from 'express';
import { getDrishtiReport } from '../controllers/drishti.report.controller.js';
import { validate, drishtiReportSchema } from '../validations/drishti.report.validation.js';

const router = Router();

router.get('/', validate(drishtiReportSchema), getDrishtiReport);

export default router;
