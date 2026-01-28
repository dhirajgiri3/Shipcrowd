/**
 * API V1 Routes Index
 * Central hub for all API routes, grouped by domain.
 */

import express from 'express';

// ============================================================================
// 1. CORE & AUTHENTICATION
// ============================================================================
import authRoutes from './auth/auth.routes';
import sessionRoutes from './auth/session.routes';
import recoveryRoutes from './auth/recovery.routes';
import consentRoutes from './identity/consent.routes';
import userRoutes from './identity/user.routes';
import profileRoutes from './identity/profile.routes';
import accountRoutes from './identity/account.routes';
import kycRoutes from './identity/kyc.routes';

// ============================================================================
// 2. ORGANIZATION & TEAM
// ============================================================================
import companyRoutes from './organization/company.routes';
import teamRoutes from './organization/team.routes';
import warehouseRoutes from './warehouses/warehouse.routes';
import warehouseWorkflowRoutes from './warehouses';
import onboardingRoutes from './onboarding/onboarding.routes';

// ============================================================================
// 3. COMMUNICATION
// ============================================================================
import notificationRoutes from './communication/notification.routes';
import notificationTemplateRoutes from './communication/notification-template.routes';
import whatsappRoutes from './communication/whatsapp.routes';
import emailRoutes from './communication/email.routes';

// ============================================================================
// 4. LOGISTICS (SHIPPING & ORDERS)
// ============================================================================
import orderRoutes from './shipping/order.routes';
import shipmentRoutes from './shipping/shipment.routes';
import ratecardRoutes from './shipping/ratecard.routes';
import zoneRoutes from './shipping/zone.routes';
import carrierRoutes from './shipping/carrier.routes';
import courierRoutes from './shipping/courier.routes';
import labelTemplateRoutes from './shipping/label-template.routes';
import addressRoutes from './logistics/address.routes';
import pincodeRoutes from './logistics/pincode.routes';
import returnsRoutes from './logistics/returns.routes';
import integrationsRoutes from './integrations';

// ============================================================================
// 5. LOGISTICS (EXCEPTIONS & DISPUTES)
// ============================================================================
import ndrRoutes from './ndr/ndr.routes';
import ndrCommunicationRoutes from './ndr/ndr-communication.routes';
import rtoRoutes from './rto/rto.routes';
import weightDisputesRoutes from './disputes/weight-disputes.routes';
import disputeRoutes from './logistics/dispute.routes';
import fraudRoutes from './fraud/fraud.routes';

// ============================================================================
// 6. FINANCE & BILLING
// ============================================================================
import walletRoutes from './finance/wallet.routes';
import financialsRoutes from './finance/financials.routes';
import billingRoutes from './finance/billing.routes';
import invoiceRoutes from './finance/invoice.routes';
import codRemittanceRoutes from './finance/cod-remittance.routes';
import bankAccountRoutes from './identity/bank-account.routes';
import promoCodeRoutes from './marketing/promo-code.routes';

// ============================================================================
// 7. CRM & SUPPORT
// ============================================================================
import leadRoutes from './crm/leads.routes';
import salesRepRoutes from '../crm/sales-rep.routes';
import callLogRoutes from './crm/call-log.routes';
import crmDisputeRoutes from './crm/disputes.routes';
import supportRoutes from './support/support.routes';

// ============================================================================
// 8. SYSTEM & ANALYTICS
// ============================================================================
import analyticsRoutes from './system/analytics.routes';
import exportRoutes from './analytics/export.routes';
import scheduledReportRoutes from './analytics/scheduled-report.routes';
import auditRoutes from './system/audit.routes';
import healthRoutes from './system/health.routes';
import jobRoutes from './system/job.routes';
import sellerHealthRoutes from './system/seller-health.routes';

// ============================================================================
// 9. ADMIN & CONFIGURATION
// ============================================================================
import userManagementRoutes from './admin/user-management.routes';
import impersonationRoutes from './admin/impersonation.routes';
import featureFlagRoutes from './admin/feature-flag.routes';

// ============================================================================
// 10. WEBHOOKS
// ============================================================================
import velocityWebhookRoutes from './webhooks/velocity.webhook.routes';
import shopifyWebhookRoutes from './webhooks/shopify.routes';
import woocommerceWebhookRoutes from './webhooks/woocommerce.webhook.routes';
import flipkartWebhookRoutes from './webhooks/flipkart.webhook.routes';
import razorpayWebhookRoutes from './webhooks/razorpay.webhook.routes';
import returnWebhooksRoutes from './logistics/return-webhooks.routes';


const router = express.Router();

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

// 1. Core & Auth
router.use('/auth', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/recovery', recoveryRoutes);
router.use('/consent', consentRoutes);
router.use('/users', userRoutes);
router.use('/profile', profileRoutes);
router.use('/account', accountRoutes);
router.use('/kyc', kycRoutes);

// 2. Organization
router.use('/companies', companyRoutes);
router.use('/team', teamRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/warehouse', warehouseWorkflowRoutes); // Workflow: picking, packing
router.use('/onboarding', onboardingRoutes);

// 3. Communication
router.use('/notifications', notificationRoutes);
router.use('/communication', notificationTemplateRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/email', emailRoutes);

// 4. Logistics - Core
router.use('/orders', orderRoutes);
router.use('/admin/orders', orderRoutes); // Alias for frontend admin/orders calls
router.use('/shipments', shipmentRoutes);
router.use('/ratecards', ratecardRoutes);
router.use('/zones', zoneRoutes);
router.use('/admin/carriers', carrierRoutes);
router.use('/courier', courierRoutes);
router.use('/labels', labelTemplateRoutes);
router.use('/logistics/address', addressRoutes);
router.use('/serviceability/address', addressRoutes); // Alias for backward compatibility
router.use('/serviceability', addressRoutes); // Direct mount
router.use('/logistics/pincode', pincodeRoutes);
router.use('/logistics/returns', returnsRoutes);
router.use('/integrations', integrationsRoutes);

// 5. Logistics - Exceptions
router.use('/ndr', ndrRoutes);
router.use('/admin/ndr', ndrRoutes); // Alias for frontend compatibility
router.use('/ndr/communication', ndrCommunicationRoutes);
router.use('/rto', rtoRoutes);
router.use('/disputes/weight', weightDisputesRoutes);
router.use('/weight-discrepancies', weightDisputesRoutes); // Alias for frontend compatibility
router.use('/disputes', disputeRoutes); // General Disputes
router.use('/fraud', fraudRoutes);

// 6. Finance
router.use('/finance/wallet', walletRoutes);
router.use('/finance/financials', financialsRoutes);
router.use('/finance/billing', billingRoutes);
router.use('/billing/invoices', invoiceRoutes);
router.use('/finance/cod-remittance', codRemittanceRoutes);
router.use('/seller/bank-accounts', bankAccountRoutes);
router.use('/promos', promoCodeRoutes);

// 7. CRM
router.use('/crm/leads', leadRoutes);
router.use('/crm/sales-reps', salesRepRoutes);
router.use('/crm/call-logs', callLogRoutes);
router.use('/crm/disputes', crmDisputeRoutes);
router.use('/support', supportRoutes);

// 8. System & Analytics
router.use('/analytics', analyticsRoutes);
router.use('/admin/profit', analyticsRoutes); // Alias for frontend compatibility
router.use('/admin/intelligence', analyticsRoutes); // Alias for frontend compatibility
router.use('/export', exportRoutes);
router.use('/reports', scheduledReportRoutes);
router.use('/audit', auditRoutes);
router.use('/health', healthRoutes);
router.use('/system', jobRoutes);
router.use('/admin/seller-health', sellerHealthRoutes);

// 9. Admin
router.use('/admin/users', userManagementRoutes);
router.use('/admin/impersonation', impersonationRoutes);
router.use('/admin/feature-flags', featureFlagRoutes);

// 10. Webhooks
router.use('/webhooks/velocity', velocityWebhookRoutes);
router.use('/webhooks/shopify', shopifyWebhookRoutes);
router.use('/webhooks/woocommerce', woocommerceWebhookRoutes);
router.use('/webhooks/flipkart', flipkartWebhookRoutes);
router.use('/webhooks/razorpay', razorpayWebhookRoutes);
router.use('/webhooks/returns', returnWebhooksRoutes);

export default router;
