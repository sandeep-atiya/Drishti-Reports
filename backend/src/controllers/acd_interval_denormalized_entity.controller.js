import asyncHandler from '../utils/asyncHandler.js';
import acdIntervalService from '../services/acd_interval_denormalized_entity.service.js';

export const getAcdData = asyncHandler(async (req, res) => {
  const result = await acdIntervalService.getAll(req.query);
  res.status(200).json({ success: true, ...result });
});

export const getAcdByCallId = asyncHandler(async (req, res) => {
  const record = await acdIntervalService.getByCallId(req.params.callId);
  res.status(200).json({ success: true, data: record });
});
