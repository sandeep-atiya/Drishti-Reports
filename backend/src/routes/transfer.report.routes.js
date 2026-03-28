import { Router } from 'express';
import { getTransferReport, getTransferJobStatus } from '../controllers/transfer.report.controller.js';
import { validate, transferReportSchema } from '../validations/transfer.report.validation.js';

const router = Router();

router.get('/',            validate(transferReportSchema), getTransferReport);
router.get('/jobs/:jobId', getTransferJobStatus);

export default router;
