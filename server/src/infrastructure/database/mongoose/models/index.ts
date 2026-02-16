// Auto-generated barrel export for mongoose models
// Uses new dot-case naming convention and granular domain structure

// IAM (Identity & Access)
export * from './auth/magic-link.model';
export { default as MagicLink } from './auth/magic-link.model';
export * from './auth/recovery-token.model';
export { default as RecoveryToken } from './auth/recovery-token.model';
export * from './iam/access/permission.model';
export { default as Permission } from './iam/access/permission.model';
export * from './iam/access/team-invitation.model';
export { default as TeamInvitation } from './iam/access/team-invitation.model';
export * from './iam/membership.model';
export { default as Membership } from './iam/membership.model';
export * from './iam/role.model';
export { default as Role } from './iam/role.model';
export * from './iam/users/session.model';
export { default as Session } from './iam/users/session.model';
export * from './iam/users/user.model';
export { default as User } from './iam/users/user.model';

// Organization
export * from './organization/core/company-group.model';
export { default as CompanyGroup } from './organization/core/company-group.model';
export * from './organization/core/company.model';
export { default as Company } from './organization/core/company.model';
export * from './organization/core/kyc-verification-attempt.model';
export { default as KYCVerificationAttempt } from './organization/core/kyc-verification-attempt.model';
export * from './organization/core/kyc.model';
export { default as KYC } from './organization/core/kyc.model';
export * from './organization/teams/team-activity.model';
export { default as TeamActivity } from './organization/teams/team-activity.model';

// CRM
export * from './crm/communication/call-log.model';
export { default as CallLog } from './crm/communication/call-log.model';
export * from './crm/leads/lead.model';
export { default as Lead } from './crm/leads/lead.model';
export * from './crm/sales/sales-representative.model';
export { default as SalesRepresentative } from './crm/sales/sales-representative.model';
export * from './crm/support/support-ticket.model';
export { default as SupportTicket } from './crm/support/support-ticket.model';

// Marketing
export * from './marketing/promotions/coupon.model';
export { default as Coupon } from './marketing/promotions/coupon.model';

// Finance
export * from './finance/billing/invoice.model';
export { default as Invoice } from './finance/billing/invoice.model';
export * from './finance/commission/commission-adjustment.model';
export { default as CommissionAdjustment } from './finance/commission/commission-adjustment.model';
export * from './finance/commission/commission-rule.model';
export { default as CommissionRule } from './finance/commission/commission-rule.model';
export * from './finance/commission/commission-transaction.model';
export { default as CommissionTransaction } from './finance/commission/commission-transaction.model';
export * from './finance/payouts/cod-remittance.model';
export { default as CODRemittance } from './finance/payouts/cod-remittance.model';
export * from './finance/payouts/payout.model';
export { default as Payout } from './finance/payouts/payout.model';
export * from './finance/payouts/seller-bank-account.model';
export { default as SellerBankAccount } from './finance/payouts/seller-bank-account.model';
export * from './finance/reconciliation/carrier-billing-record.model';
export { default as CarrierBillingRecord } from './finance/reconciliation/carrier-billing-record.model';
export * from './finance/reconciliation/pricing-variance-case.model';
export { default as PricingVarianceCase } from './finance/reconciliation/pricing-variance-case.model';
export * from './finance/wallets/wallet-transaction.model';
export { default as WalletTransaction } from './finance/wallets/wallet-transaction.model';

// Logistics - Inventory
export * from './logistics/inventory/store/inventory.model';
export { default as Inventory } from './logistics/inventory/store/inventory.model';
export * from './logistics/inventory/tracking/stock-movement.model';
export { default as StockMovement } from './logistics/inventory/tracking/stock-movement.model';

// Logistics - Warehouse
export * from './logistics/warehouse/activities/packing-station.model';
export { default as PackingStation } from './logistics/warehouse/activities/packing-station.model';
export * from './logistics/warehouse/activities/pick-list.model';
export { default as PickList } from './logistics/warehouse/activities/pick-list.model';
export * from './logistics/warehouse/structure/warehouse-location.model';
export { default as WarehouseLocation } from './logistics/warehouse/structure/warehouse-location.model';
export * from './logistics/warehouse/structure/warehouse-zone.model';
export { default as WarehouseZone } from './logistics/warehouse/structure/warehouse-zone.model';
export * from './logistics/warehouse/structure/warehouse.model';
export { default as Warehouse } from './logistics/warehouse/structure/warehouse.model';

// Logistics - Shipping
export * from './logistics/shipping/configuration/courier-service.model';
export { default as CourierService } from './logistics/shipping/configuration/courier-service.model';
export * from './logistics/shipping/configuration/routing-rule.model';
export { default as RoutingRule } from './logistics/shipping/configuration/routing-rule.model';
export * from './logistics/shipping/configuration/seller-courier-policy.model';
export { default as SellerCourierPolicy } from './logistics/shipping/configuration/seller-courier-policy.model';
export * from './logistics/shipping/configuration/seller-rate-card.model';
export { default as SellerRateCard } from './logistics/shipping/configuration/seller-rate-card.model';
export * from './logistics/shipping/configuration/service-rate-card.model';
export { default as ServiceRateCard } from './logistics/shipping/configuration/service-rate-card.model';
export * from './logistics/shipping/configuration/zone.model';
export { default as Zone } from './logistics/shipping/configuration/zone.model';
export * from './logistics/shipping/core/quote-session.model';
export { default as QuoteSession } from './logistics/shipping/core/quote-session.model';
export * from './logistics/shipping/core/shipment.model';
export { default as Shipment } from './logistics/shipping/core/shipment.model';
export * from './logistics/shipping/exceptions/ndr-event.model';
export { default as NDREvent } from './logistics/shipping/exceptions/ndr-event.model';
export * from './logistics/shipping/exceptions/ndr-workflow.model';
export { default as NDRWorkflow } from './logistics/shipping/exceptions/ndr-workflow.model';
export * from './logistics/shipping/exceptions/prevention-event.model';
export { default as PreventionEvent } from './logistics/shipping/exceptions/prevention-event.model';
export * from './logistics/shipping/exceptions/rto-event.model';
export { default as RTOEvent } from './logistics/shipping/exceptions/rto-event.model';
export * from './logistics/shipping/manifest-counter.model';
export { default as ManifestCounter } from './logistics/shipping/manifest-counter.model';
export * from './logistics/shipping/manifest.model';
export { default as Manifest } from './logistics/shipping/manifest.model';
export * from './shipping/courier-performance.model';
export { default as CourierPerformance } from './shipping/courier-performance.model';
export * from './shipping/label-template.model';
export { default as LabelTemplate } from './shipping/label-template.model';

// Orders
export * from './orders/core/order.model';
export { default as Order } from './orders/core/order.model';

// Marketplaces - Amazon
export * from './marketplaces/amazon/amazon-product-mapping.model';
export { default as AmazonProductMapping } from './marketplaces/amazon/amazon-product-mapping.model';
export * from './marketplaces/amazon/amazon-store.model';
export { default as AmazonStore } from './marketplaces/amazon/amazon-store.model';
export * from './marketplaces/amazon/amazon-sync-log.model';
export { default as AmazonSyncLog } from './marketplaces/amazon/amazon-sync-log.model';

// Marketplaces - Flipkart
export * from './marketplaces/flipkart/flipkart-product-mapping.model';
export { default as FlipkartProductMapping } from './marketplaces/flipkart/flipkart-product-mapping.model';
export * from './marketplaces/flipkart/flipkart-store.model';
export { default as FlipkartStore } from './marketplaces/flipkart/flipkart-store.model';
export * from './marketplaces/flipkart/flipkart-sync-log.model';
export { default as FlipkartSyncLog } from './marketplaces/flipkart/flipkart-sync-log.model';

// Marketplaces - Shopify
export * from './marketplaces/shopify/shopify-product-mapping.model';
export { default as ShopifyProductMapping } from './marketplaces/shopify/shopify-product-mapping.model';
export * from './marketplaces/shopify/shopify-store.model';
export { default as ShopifyStore } from './marketplaces/shopify/shopify-store.model';
export * from './marketplaces/sync-log.model';
export { SyncLog } from './marketplaces/sync-log.model';

// Marketplaces - WooCommerce
export * from './marketplaces/woocommerce/woocommerce-product-mapping.model';
export { default as WooCommerceProductMapping } from './marketplaces/woocommerce/woocommerce-product-mapping.model';
export * from './marketplaces/woocommerce/woocommerce-store.model';
export { default as WooCommerceStore } from './marketplaces/woocommerce/woocommerce-store.model';
export * from './marketplaces/woocommerce/woocommerce-sync-log.model';
export { default as WooCommerceSyncLog } from './marketplaces/woocommerce/woocommerce-sync-log.model';

// Risk Engine
export * from './risk/blacklist-item.model';
export { default as BlacklistItem } from './risk/blacklist-item.model';

// Communication
export * from './communication/notification-template.model';
export { default as NotificationTemplate } from './communication/notification-template.model';

// System
export * from './analytics/scheduled-report.model';
export { default as ScheduledReport } from './analytics/scheduled-report.model';
export * from './system/audit/audit-log.model';
export { default as AuditLog } from './system/audit/audit-log.model';
export * from './system/integrations/integration.model';
export { default as Integration } from './system/integrations/integration.model';
export * from './system/integrations/webhook-dead-letter.model';
export { default as WebhookDeadLetter } from './system/integrations/webhook-dead-letter.model';
export * from './system/integrations/webhook-event.model';
export { default as WebhookEvent } from './system/integrations/webhook-event.model';
export * from './system/reporting/report-config.model';
export { default as ReportConfig } from './system/reporting/report-config.model';

// Admin
export * from './admin/impersonation-session.model';
export { default as ImpersonationSession } from './admin/impersonation-session.model';

// System - Feature Flags
export * from './system/feature-flag.model';
export { default as FeatureFlag } from './system/feature-flag.model';

// System - Job Tracking
export * from './system/bulk-order-import-job.model';
export { BulkOrderImportJob } from './system/bulk-order-import-job.model';
export * from './system/seller-export-job.model';
export { SellerExportJob } from './system/seller-export-job.model';

// Onboarding & Gamification
export * from './onboarding/achievement.model';
export { default as Achievement } from './onboarding/achievement.model';
export * from './onboarding/onboarding-progress.model';
export { default as OnboardingProgress } from './onboarding/onboarding-progress.model';
export * from './onboarding/product-tour.model';
export { default as ProductTour } from './onboarding/product-tour.model';
export * from './onboarding/tour-completion.model';
export { default as TourCompletion } from './onboarding/tour-completion.model';
export * from './onboarding/user-persona.model';
export { default as UserPersona } from './onboarding/user-persona.model';
