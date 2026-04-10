import { Router } from 'express';
import { getTransferUniqueCallsReport, getTransferUniqueCallsJobStatus } from '../controllers/transfer.unique.calls.report.controller.js';
import { validate, transferUniqueCallsReportSchema } from '../validations/transfer.unique.calls.report.validation.js';

const router = Router();

router.get('/',            validate(transferUniqueCallsReportSchema), getTransferUniqueCallsReport);
router.get('/jobs/:jobId', getTransferUniqueCallsJobStatus);

export default router;
