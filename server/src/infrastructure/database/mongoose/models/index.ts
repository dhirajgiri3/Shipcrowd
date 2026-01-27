// Auto-generated barrel export for mongoose models
// Uses new dot-case naming convention and granular domain structure

// IAM (Identity & Access)
export { default as User } from './iam/users/user.model';
export * from './iam/users/user.model';
export { default as Session } from './iam/users/session.model';
export * from './iam/users/session.model';
export { default as MagicLink } from './auth/magic-link.model';
export * from './auth/magic-link.model';
export { default as RecoveryToken } from './auth/recovery-token.model';
export * from './auth/recovery-token.model';
export { default as Permission } from './iam/access/permission.model';
export * from './iam/access/permission.model';
export { default as TeamPermission } from './iam/access/team-permission.model';
export * from './iam/access/team-permission.model';
export { default as TeamInvitation } from './iam/access/team-invitation.model';
export * from './iam/access/team-invitation.model';
export { default as Role } from './iam/role.model';
export * from './iam/role.model';
export { default as Membership } from './iam/membership.model';
export * from './iam/membership.model';

// Organization
export { default as Company } from './organization/core/company.model';
export * from './organization/core/company.model';
export { default as KYC } from './organization/core/kyc.model';
export * from './organization/core/kyc.model';
export { default as TeamActivity } from './organization/teams/team-activity.model';
export * from './organization/teams/team-activity.model';

// CRM
export { default as Lead } from './crm/leads/lead.model';
export * from './crm/leads/lead.model';
export { default as SalesRepresentative } from './crm/sales/sales-representative.model';
export * from './crm/sales/sales-representative.model';
export { default as CallLog } from './crm/communication/call-log.model';
export * from './crm/communication/call-log.model';
export { default as SupportTicket } from './crm/support/support-ticket.model';
export * from './crm/support/support-ticket.model';

// Marketing
export { default as Coupon } from './marketing/promotions/coupon.model';
export * from './marketing/promotions/coupon.model';

// Finance
export { default as Payout } from './finance/payouts/payout.model';
export * from './finance/payouts/payout.model';
export { default as WalletTransaction } from './finance/wallets/wallet-transaction.model';
export * from './finance/wallets/wallet-transaction.model';
export { default as CommissionRule } from './finance/commission/commission-rule.model';
export * from './finance/commission/commission-rule.model';
export { default as CommissionTransaction } from './finance/commission/commission-transaction.model';
export * from './finance/commission/commission-transaction.model';
export { default as CommissionAdjustment } from './finance/commission/commission-adjustment.model';
export * from './finance/commission/commission-adjustment.model';

// Logistics - Inventory
export { default as Inventory } from './logistics/inventory/store/inventory.model';
export * from './logistics/inventory/store/inventory.model';
export { default as StockMovement } from './logistics/inventory/tracking/stock-movement.model';
export * from './logistics/inventory/tracking/stock-movement.model';

// Logistics - Warehouse
export { default as Warehouse } from './logistics/warehouse/structure/warehouse.model';
export * from './logistics/warehouse/structure/warehouse.model';
export { default as WarehouseLocation } from './logistics/warehouse/structure/warehouse-location.model';
export * from './logistics/warehouse/structure/warehouse-location.model';
export { default as WarehouseZone } from './logistics/warehouse/structure/warehouse-zone.model';
export * from './logistics/warehouse/structure/warehouse-zone.model';
export { default as PackingStation } from './logistics/warehouse/activities/packing-station.model';
export * from './logistics/warehouse/activities/packing-station.model';
export { default as PickList } from './logistics/warehouse/activities/pick-list.model';
export * from './logistics/warehouse/activities/pick-list.model';

// Logistics - Shipping
export { default as Shipment } from './logistics/shipping/core/shipment.model';
export * from './logistics/shipping/core/shipment.model';
export { default as Zone } from './logistics/shipping/configuration/zone.model';
export * from './logistics/shipping/configuration/zone.model';
export { default as RateCard } from './logistics/shipping/configuration/rate-card.model';
export * from './logistics/shipping/configuration/rate-card.model';
export { default as Courier } from './shipping/courier.model';
export * from './shipping/courier.model';
export { default as CourierPerformance } from './shipping/courier-performance.model';
export * from './shipping/courier-performance.model';
export { default as LabelTemplate } from './shipping/label-template.model';
export * from './shipping/label-template.model';
export { default as RTOEvent } from './logistics/shipping/exceptions/rto-event.model';
export * from './logistics/shipping/exceptions/rto-event.model';
export { default as NDREvent } from './logistics/shipping/exceptions/ndr-event.model';
export * from './logistics/shipping/exceptions/ndr-event.model';
export { default as NDRWorkflow } from './logistics/shipping/exceptions/ndr-workflow.model';
export * from './logistics/shipping/exceptions/ndr-workflow.model';

// Orders
export { default as Order } from './orders/core/order.model';
export * from './orders/core/order.model';

// Marketplaces - Amazon
export { default as AmazonStore } from './marketplaces/amazon/amazon-store.model';
export * from './marketplaces/amazon/amazon-store.model';
export { default as AmazonSyncLog } from './marketplaces/amazon/amazon-sync-log.model';
export * from './marketplaces/amazon/amazon-sync-log.model';
export { default as AmazonProductMapping } from './marketplaces/amazon/amazon-product-mapping.model';
export * from './marketplaces/amazon/amazon-product-mapping.model';

// Marketplaces - Flipkart
export { default as FlipkartStore } from './marketplaces/flipkart/flipkart-store.model';
export * from './marketplaces/flipkart/flipkart-store.model';
export { default as FlipkartSyncLog } from './marketplaces/flipkart/flipkart-sync-log.model';
export * from './marketplaces/flipkart/flipkart-sync-log.model';
export { default as FlipkartProductMapping } from './marketplaces/flipkart/flipkart-product-mapping.model';
export * from './marketplaces/flipkart/flipkart-product-mapping.model';

// Marketplaces - Shopify
export { default as ShopifyStore } from './marketplaces/shopify/shopify-store.model';
export * from './marketplaces/shopify/shopify-store.model';
export { default as ShopifySyncLog } from './marketplaces/shopify/shopify-sync-log.model';
export * from './marketplaces/shopify/shopify-sync-log.model';
export { default as ShopifyProductMapping } from './marketplaces/shopify/shopify-product-mapping.model';
export * from './marketplaces/shopify/shopify-product-mapping.model';

// Marketplaces - WooCommerce
export { default as WooCommerceStore } from './marketplaces/woocommerce/woocommerce-store.model';
export * from './marketplaces/woocommerce/woocommerce-store.model';
export { default as WooCommerceSyncLog } from './marketplaces/woocommerce/woocommerce-sync-log.model';
export * from './marketplaces/woocommerce/woocommerce-sync-log.model';
export { default as WooCommerceProductMapping } from './marketplaces/woocommerce/woocommerce-product-mapping.model';
export * from './marketplaces/woocommerce/woocommerce-product-mapping.model';

// Communication
export { default as NotificationTemplate } from './communication/notification-template.model';
export * from './communication/notification-template.model';

// System
export { default as Integration } from './system/integrations/integration.model';
export * from './system/integrations/integration.model';
export { default as WebhookEvent } from './system/integrations/webhook-event.model';
export * from './system/integrations/webhook-event.model';
export { default as WebhookDeadLetter } from './system/integrations/webhook-dead-letter.model';
export * from './system/integrations/webhook-dead-letter.model';
export { default as AuditLog } from './system/audit/audit-log.model';
export * from './system/audit/audit-log.model';
export { default as ScheduledReport } from './analytics/scheduled-report.model';
export * from './analytics/scheduled-report.model';
export { default as ReportConfig } from './system/reporting/report-config.model';
export * from './system/reporting/report-config.model';

// Admin
export { default as ImpersonationSession } from './admin/impersonation-session.model';
export * from './admin/impersonation-session.model';

// System - Feature Flags
export { default as FeatureFlag } from './system/feature-flag.model';
export * from './system/feature-flag.model';

// Onboarding & Gamification
export { default as OnboardingProgress } from './onboarding/onboarding-progress.model';
export * from './onboarding/onboarding-progress.model';
export { default as Achievement } from './onboarding/achievement.model';
export * from './onboarding/achievement.model';
export { default as UserPersona } from './onboarding/user-persona.model';
export * from './onboarding/user-persona.model';
export { default as ProductTour } from './onboarding/product-tour.model';
export * from './onboarding/product-tour.model';
export { default as TourCompletion } from './onboarding/tour-completion.model';
export * from './onboarding/tour-completion.model';
