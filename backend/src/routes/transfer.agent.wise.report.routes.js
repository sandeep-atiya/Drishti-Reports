import { Router } from 'express';
import { getTransferAgentWiseReport, getTransferAgentWiseJobStatus } from '../controllers/transfer.agent.wise.report.controller.js';
import { validate, transferAgentWiseReportSchema }                   from '../validations/transfer.agent.wise.report.validation.js';

const router = Router();

router.get('/',            validate(transferAgentWiseReportSchema), getTransferAgentWiseReport);
router.get('/jobs/:jobId', getTransferAgentWiseJobStatus);

export default router;
