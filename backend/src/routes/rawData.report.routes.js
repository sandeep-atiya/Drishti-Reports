import { Router }          from 'express';
import { getRawDataReport } from '../controllers/rawData.report.controller.js';
import { validate, rawDataSchema } from '../validations/rawData.report.validation.js';

const router = Router();

router.get('/', validate(rawDataSchema), getRawDataReport);

export default router;
