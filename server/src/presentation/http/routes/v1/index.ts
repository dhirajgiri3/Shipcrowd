import express, { Request, Response } from 'express';
import authRoutes from './auth.routes';
import notificationRoutes from './notification.routes';
import userRoutes from './user.routes';
import companyRoutes from './company.routes';
import whatsappRoutes from './whatsapp.routes';
import kycRoutes from './kyc.routes';
import warehouseRoutes from './warehouse.routes';
import teamRoutes from './team.routes';
import sessionRoutes from './session.routes';
import auditRoutes from './audit.routes';
import accountRoutes from './account.routes';
import emailRoutes from './email.routes';
import profileRoutes from './profile.routes';
import recoveryRoutes from './recovery.routes';
// New routes for 3-Day MVP
import orderRoutes from './order.routes';
import shipmentRoutes from './shipment.routes';
import analyticsRoutes from './analytics.routes';
import ratecardRoutes from './ratecard.routes';
import zoneRoutes from './zone.routes';

const router = express.Router();

// Health check endpoint with version info
router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
    });
});

// Register routes
router.use('/auth', authRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/kyc', kycRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/team', teamRoutes);
router.use('/sessions', sessionRoutes);
router.use('/audit', auditRoutes);
router.use('/account', accountRoutes);
router.use('/email', emailRoutes);
router.use('/profile', profileRoutes);
router.use('/recovery', recoveryRoutes);
// New routes for 3-Day MVP
router.use('/orders', orderRoutes);
router.use('/shipments', shipmentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/ratecards', ratecardRoutes);
router.use('/zones', zoneRoutes);

export default router;


