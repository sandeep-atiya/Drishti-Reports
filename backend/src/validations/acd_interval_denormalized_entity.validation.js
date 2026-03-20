import Joi from 'joi';
import { paginationSchema, dateRangeSchema } from './common.validation.js';

export const getAcdDataSchema = paginationSchema.concat(dateRangeSchema).keys({
  setupId: Joi.string().trim().optional(),
  campaignId: Joi.number().integer().optional(),
  userId: Joi.string().trim().optional(),
  callType: Joi.string().trim().optional(),
  isOutbound: Joi.boolean().optional(),
});

export const getAcdByCallIdSchema = Joi.object({
  callId: Joi.string().trim().required(),
});
