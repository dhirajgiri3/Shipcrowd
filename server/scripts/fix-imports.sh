#!/bin/bash
# Comprehensive import path fixer
# Fixes all PascalCase imports to dot-case after file renames

PROJECT_ROOT="/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server"
SRC="$PROJECT_ROOT/src"

echo "=== Fixing All Import Paths ==="
echo ""

# Fix model imports
echo "--- Fixing Model Imports ---"
find "$SRC" -name "*.ts" -type f -exec sed -i '' \
    -e "s|/FlipkartStore'|/flipkart-store.model'|g" \
    -e "s|/FlipkartProductMapping'|/flipkart-product-mapping.model'|g" \
    -e "s|/FlipkartSyncLog'|/flipkart-sync-log.model'|g" \
    -e "s|/AmazonStore'|/amazon-store.model'|g" \
    -e "s|/AmazonProductMapping'|/amazon-product-mapping.model'|g" \
    -e "s|/AmazonSyncLog'|/amazon-sync-log.model'|g" \
    -e "s|/ShopifyStore'|/shopify-store.model'|g" \
    -e "s|/ShopifySyncLog'|/shopify-sync-log.model'|g" \
    -e "s|/WooCommerceStore'|/woocommerce-store.model'|g" \
    -e "s|/WooCommerceProductMapping'|/woocommerce-product-mapping.model'|g" \
    -e "s|/WooCommerceSyncLog'|/woocommerce-sync-log.model'|g" \
    -e "s|/Order'|/order.model'|g" \
    -e "s|/User'|/user.model'|g" \
    -e "s|/Company'|/company.model'|g" \
    -e "s|/Session'|/session.model'|g" \
    -e "s|/Shipment'|/shipment.model'|g" \
    -e "s|/Integration'|/integration.model'|g" \
    -e "s|/Permission'|/permission.model'|g" \
    -e "s|/KYC'|/kyc.model'|g" \
    -e "s|/Zone'|/zone.model'|g" \
    -e "s|/Warehouse'|/warehouse.model'|g" \
    -e "s|/WarehouseLocation'|/warehouse-location.model'|g" \
    -e "s|/WarehouseZone'|/warehouse-zone.model'|g" \
    -e "s|/Inventory'|/inventory.model'|g" \
    -e "s|/RateCard'|/rate-card.model'|g" \
    -e "s|/Coupon'|/coupon.model'|g" \
    -e "s|/AuditLog'|/audit-log.model'|g" \
    -e "s|/CallLog'|/call-log.model'|g" \
    -e "s|/NDREvent'|/ndr-event.model'|g" \
    -e "s|/NDRWorkflow'|/ndr-workflow.model'|g" \
    -e "s|/RTOEvent'|/rto-event.model'|g" \
    -e "s|/WalletTransaction'|/wallet-transaction.model'|g" \
    -e "s|/PickList'|/pick-list.model'|g" \
    -e "s|/PackingStation'|/packing-station.model'|g" \
    -e "s|/StockMovement'|/stock-movement.model'|g" \
    -e "s|/ProductMapping'|/product-mapping.model'|g" \
    -e "s|/WebhookEvent'|/webhook-event.model'|g" \
    -e "s|/WebhookDeadLetter'|/webhook-dead-letter.model'|g" \
    -e "s|/TeamActivity'|/team-activity.model'|g" \
    -e "s|/TeamInvitation'|/team-invitation.model'|g" \
    -e "s|/TeamPermission'|/team-permission.model'|g" \
    -e "s|/ReportConfig'|/report-config.model'|g" \
    {} \;
echo "  Fixed model imports"

# Fix service imports
echo "--- Fixing Service Imports ---"
find "$SRC" -name "*.ts" -type f -exec sed -i '' \
    -e "s|/FlipkartOAuthService'|/flipkart-oauth.service'|g" \
    -e "s|/FlipkartOrderSyncService'|/flipkart-order-sync.service'|g" \
    -e "s|/FlipkartInventorySyncService'|/flipkart-inventory-sync.service'|g" \
    -e "s|/FlipkartProductMappingService'|/flipkart-product-mapping.service'|g" \
    -e "s|/FlipkartWebhookService'|/flipkart-webhook.service'|g" \
    -e "s|/ShopifyOAuthService'|/shopify-oauth.service'|g" \
    -e "s|/ShopifyOrderSyncService'|/shopify-order-sync.service'|g" \
    -e "s|/ShopifyInventorySyncService'|/shopify-inventory-sync.service'|g" \
    -e "s|/ShopifyWebhookService'|/shopify-webhook.service'|g" \
    -e "s|/AmazonOAuthService'|/amazon-oauth.service'|g" \
    -e "s|/AmazonOrderSyncService'|/amazon-order-sync.service'|g" \
    -e "s|/AmazonInventorySyncService'|/amazon-inventory-sync.service'|g" \
    -e "s|/AmazonProductMappingService'|/amazon-product-mapping.service'|g" \
    -e "s|/WooCommerceOAuthService'|/woocommerce-oauth.service'|g" \
    -e "s|/WooCommerceOrderSyncService'|/woocommerce-order-sync.service'|g" \
    -e "s|/WooCommerceInventorySyncService'|/woocommerce-inventory-sync.service'|g" \
    -e "s|/WooCommerceProductMappingService'|/woocommerce-product-mapping.service'|g" \
    -e "s|/WooCommerceWebhookService'|/woocommerce-webhook.service'|g" \
    -e "s|/RTOService'|/rto.service'|g" \
    -e "s|/RTOService.js'|/rto.service'|g" \
    -e "s|/NDRResolutionService'|/ndr-resolution.service'|g" \
    -e "s|/NDRDetectionService'|/ndr-detection.service'|g" \
    -e "s|/NDRClassificationService'|/ndr-classification.service'|g" \
    -e "s|/NDRAnalyticsService'|/ndr-analytics.service'|g" \
    -e "s|/WalletService'|/wallet.service'|g" \
    -e "s|/InventoryService'|/inventory.service'|g" \
    -e "s|/PickingService'|/picking.service'|g" \
    -e "s|/PackingService'|/packing.service'|g" \
    -e "s|/WarehouseNotificationService'|/warehouse-notification.service'|g" \
    -e "s|/AnalyticsService'|/analytics.service'|g" \
    -e "s|/ReportBuilderService'|/report-builder.service'|g" \
    -e "s|/OrderAnalyticsService'|/order-analytics.service'|g" \
    -e "s|/ShipmentAnalyticsService'|/shipment-analytics.service'|g" \
    -e "s|/RevenueAnalyticsService'|/revenue-analytics.service'|g" \
    -e "s|/CustomerAnalyticsService'|/customer-analytics.service'|g" \
    -e "s|/InventoryAnalyticsService'|/inventory-analytics.service'|g" \
    -e "s|/ProductMappingService'|/product-mapping.service'|g" \
    -e "s|/CloudinaryStorageService'|/cloudinary-storage.service'|g" \
    {} \;
echo "  Fixed service imports"

# Fix client imports
echo "--- Fixing Client Imports ---"
find "$SRC" -name "*.ts" -type f -exec sed -i '' \
    -e "s|/FlipkartClient'|/flipkart.client'|g" \
    -e "s|/AmazonClient'|/amazon.client'|g" \
    -e "s|/ShopifyClient'|/shopify.client'|g" \
    -e "s|/WooCommerceClient'|/woocommerce.client'|g" \
    -e "s|/ExotelClient'|/exotel.client'|g" \
    {} \;
echo "  Fixed client imports"

# Fix other imports
echo "--- Fixing Other Imports ---"
find "$SRC" -name "*.ts" -type f -exec sed -i '' \
    -e "s|/AppError'|/app.error'|g" \
    -e "s|/CourierAdapter'|/courier.adapter'|g" \
    -e "s|/CourierFactory'|/courier.factory'|g" \
    -e "s|/OpenAIService'|/openai.service'|g" \
    -e "s|/WhatsAppService'|/whatsapp.service'|g" \
    -e "s|/VelocityAuth'|/velocity.auth'|g" \
    -e "s|/VelocityMapper'|/velocity.mapper'|g" \
    -e "s|/VelocityErrorHandler'|/velocity-error-handler'|g" \
    -e "s|/VelocityTypes'|/velocity.types'|g" \
    -e "s|/VelocityWebhookTypes'|/velocity-webhook.types'|g" \
    -e "s|/VelocityShipfastProvider'|/velocity-shipfast.provider'|g" \
    -e "s|/WooCommerceTypes'|/woocommerce.types'|g" \
    -e "s|/QueueManager'|/queue.manager'|g" \
    -e "s|/RateLimiter'|/rate.limiter'|g" \
    -e "s|/CacheInvalidationListener'|/cache-invalidation.listener'|g" \
    -e "s|/BaseExportService'|/base-export.service'|g" \
    -e "s|/CSVExportService'|/csv-export.service'|g" \
    -e "s|/ExcelExportService'|/excel-export.service'|g" \
    -e "s|/PDFExportService'|/pdf-export.service'|g" \
    -e "s|/NDRActionExecutors'|/ndr-action-executors'|g" \
    {} \;
echo "  Fixed other imports"

# Fix job imports
echo "--- Fixing Job Imports ---"
find "$SRC" -name "*.ts" -type f -exec sed -i '' \
    -e "s|/AmazonOrderSyncJob'|/amazon-order-sync.job'|g" \
    -e "s|/FlipkartOrderSyncJob'|/flipkart-order-sync.job'|g" \
    -e "s|/ShopifyOrderSyncJob'|/shopify-order-sync.job'|g" \
    -e "s|/WooCommerceOrderSyncJob'|/woocommerce-order-sync.job'|g" \
    -e "s|/NDRResolutionJob'|/ndr-resolution.job'|g" \
    -e "s|/ScheduledReportJob'|/scheduled-report.job'|g" \
    -e "s|/FlipkartWebhookProcessorJob'|/flipkart-webhook-processor.job'|g" \
    -e "s|/ShopifyWebhookProcessorJob'|/shopify-webhook-processor.job'|g" \
    {} \;
echo "  Fixed job imports"

# Fix interface imports
echo "--- Fixing Interface Imports ---"
find "$SRC" -name "*.ts" -type f -exec sed -i '' \
    -e "s|/IInventoryService'|/inventory.interface.service'|g" \
    -e "s|/IPickingService'|/picking.interface.service'|g" \
    -e "s|/IPackingService'|/packing.interface.service'|g" \
    -e "s|/IUserRepository'|/user.repository.interface'|g" \
    -e "s|/IShipmentRepository'|/shipment.repository.interface'|g" \
    {} \;
echo "  Fixed interface imports"

echo ""
echo "=== Import Fixes Complete ==="
