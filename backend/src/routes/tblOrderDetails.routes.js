import { Router } from 'express';
import {
  getAllOrders,
  getOrderById,
  getOrderByOrderNo,
} from '../controllers/tblOrderDetails.controller.js';
import { validate } from '../validations/common.validation.js';
import { getOrderDetailsSchema } from '../validations/tblOrderDetails.validation.js';

const router = Router();

router.get('/', validate(getOrderDetailsSchema), getAllOrders);
router.get('/order-no/:orderNo', getOrderByOrderNo);
router.get('/:id', getOrderById);

export default router;
