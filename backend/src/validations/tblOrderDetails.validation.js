import Joi from 'joi';
import { paginationSchema, dateRangeSchema } from './common.validation.js';

export const getOrderDetailsSchema = paginationSchema.concat(dateRangeSchema).keys({
  campaignId: Joi.number().integer().optional(),
  status: Joi.number().integer().optional(),
  callType: Joi.number().integer().optional(),
  dispatchStatus: Joi.string().trim().uppercase().max(3).optional(),
  downloadStatus: Joi.string().trim().uppercase().max(3).optional(),
  ptId: Joi.string().trim().max(50).optional(),
  orderNo: Joi.string().trim().max(50).optional(),
});

export const getOrderByIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const getOrderByOrderNoSchema = Joi.object({
  orderNo: Joi.string().trim().max(50).required(),
});
