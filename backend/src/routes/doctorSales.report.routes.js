import { Router } from 'express';
import {
  getDoctorSalesReport,
  getDoctorSalesJobStatus,
} from '../controllers/doctorSales.report.controller.js';
import { validate, doctorSalesReportSchema } from '../validations/doctorSales.report.validation.js';

const router = Router();

router.get('/',            validate(doctorSalesReportSchema), getDoctorSalesReport);
router.get('/jobs/:jobId', getDoctorSalesJobStatus);

export default router;
