import asyncHandler from '../utils/asyncHandler.js';
import tblOrderDetailsService from '../services/tblOrderDetails.service.js';

export const getAllOrders = asyncHandler(async (req, res) => {
  const result = await tblOrderDetailsService.getAll(req.query);
  res.status(200).json({ success: true, ...result });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const record = await tblOrderDetailsService.getById(parseInt(req.params.id, 10));
  res.status(200).json({ success: true, data: record });
});

export const getOrderByOrderNo = asyncHandler(async (req, res) => {
  const record = await tblOrderDetailsService.getByOrderNo(req.params.orderNo);
  res.status(200).json({ success: true, data: record });
});
