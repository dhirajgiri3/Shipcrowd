import express from 'express';
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
// Import other route files here as they are created

const router = express.Router();

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
// Register other routes here as they are created

export default router;
