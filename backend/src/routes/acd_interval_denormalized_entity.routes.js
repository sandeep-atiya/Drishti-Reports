import { Router } from 'express';
import {
  getAcdData,
  getAcdByCallId,
} from '../controllers/acd_interval_denormalized_entity.controller.js';
import { validate } from '../validations/common.validation.js';
import { getAcdDataSchema } from '../validations/acd_interval_denormalized_entity.validation.js';

const router = Router();

router.get('/', validate(getAcdDataSchema), getAcdData);
router.get('/call/:callId', getAcdByCallId);

export default router;
