import express, { Request, Response } from 'express';
import authRoutes from './auth/auth.routes';
import notificationRoutes from './communication/notification.routes';
import userRoutes from './identity/user.routes';
import companyRoutes from './organization/company.routes';
import whatsappRoutes from './communication/whatsapp.routes';
import kycRoutes from './identity/kyc.routes';
import warehouseRoutes from './shipping/warehouse.routes';
import teamRoutes from './organization/team.routes';
import sessionRoutes from './auth/session.routes';
import auditRoutes from './system/audit.routes';
import accountRoutes from './identity/account.routes';
import emailRoutes from './communication/email.routes';
import profileRoutes from './identity/profile.routes';
import recoveryRoutes from './auth/recovery.routes';
// New routes for 3-Day MVP
import orderRoutes from './shipping/order.routes';
import shipmentRoutes from './shipping/shipment.routes';
import analyticsRoutes from './system/analytics.routes';
import ratecardRoutes from './shipping/ratecard.routes';
import zoneRoutes from './shipping/zone.routes';
// Webhook routes
import velocityWebhookRoutes from './webhooks/velocity.webhook.routes';
// Week 5: Warehouse Workflow Routes
import warehouseWorkflowRoutes from './warehouse';

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
// Webhook routes
router.use('/webhooks/velocity', velocityWebhookRoutes);
// Week 5: Warehouse Workflow Routes (picking, packing, inventory)
router.use('/warehouse', warehouseWorkflowRoutes);

export default router;


