import { Router } from 'express';
import tblOrderDetailsRoutes from './tblOrderDetails.routes.js';
import acdIntervalRoutes from './acd_interval_denormalized_entity.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.use('/orders', tblOrderDetailsRoutes);
router.use('/acd', acdIntervalRoutes);

export default router;
