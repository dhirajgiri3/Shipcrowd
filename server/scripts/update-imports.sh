#!/bin/bash
# Update Import Paths Script
# Updates all TypeScript import statements to match new file names

PROJECT_ROOT="/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server"

echo "=== Updating Import Paths ==="
echo ""

# Model imports - update the models index.ts first
echo "--- Updating Models Index ---"
cat > "$PROJECT_ROOT/src/infrastructure/database/mongoose/models/index.ts" << 'ENDOFINDEX'
// Auto-generated barrel export for mongoose models
// Uses new dot-case naming convention

// Core Models
export * from './user.model';
export * from './company.model';
export * from './session.model';
export * from './permission.model';
export * from './kyc.model';

// Shipping Models
export * from './shipment.model';
export * from './order.model';
export * from './rate-card.model';
export * from './zone.model';
export * from './warehouse.model';
export * from './warehouse-location.model';
export * from './warehouse-zone.model';

// Inventory & Warehouse
export * from './inventory.model';
export * from './pick-list.model';
export * from './packing-station.model';
export * from './stock-movement.model';

// NDR & RTO
export * from './ndr-event.model';
export * from './ndr-workflow.model';
export * from './rto-event.model';

// Wallet & Billing
export * from './wallet-transaction.model';
export * from './coupon.model';

// Integrations
export * from './integration.model';
export * from './product-mapping.model';
export * from './webhook-event.model';
export * from './webhook-dead-letter.model';

// Shopify
export * from './shopify-store.model';
export * from './shopify-sync-log.model';

// WooCommerce
export * from './woocommerce-store.model';
export * from './woocommerce-product-mapping.model';
export * from './woocommerce-sync-log.model';

// Amazon
export * from './amazon-store.model';
export * from './amazon-product-mapping.model';
export * from './amazon-sync-log.model';

// Flipkart
export * from './flipkart-store.model';
export * from './flipkart-product-mapping.model';
export * from './flipkart-sync-log.model';

// Team & Activity
export * from './team-activity.model';
export * from './team-invitation.model';
export * from './team-permission.model';

// Communication
export * from './call-log.model';

// System
export * from './audit-log.model';
export * from './report-config.model';
ENDOFINDEX
echo "  Updated models/index.ts"

echo ""
echo "--- Updating Import Paths in Source Files ---"

# Create a mapping file for sed replacements
# Format: old_import -> new_import
declare -A imports=(
    # Models - PascalCase to dot-case
    ["from './User'"]="from './user.model'"
    ["from './Shipment'"]="from './shipment.model'"
    ["from './Order'"]="from './order.model'"
    ["from './Company'"]="from './company.model'"
    ["from './Session'"]="from './session.model'"
    ["from './Permission'"]="from './permission.model'"
    ["from './KYC'"]="from './kyc.model'"
    ["from './Zone'"]="from './zone.model'"
    ["from './Warehouse'"]="from './warehouse.model'"
    ["from './Inventory'"]="from './inventory.model'"
    ["from './Integration'"]="from './integration.model'"
    ["from './RateCard'"]="from './rate-card.model'"
    ["from './Coupon'"]="from './coupon.model'"
    ["from './AuditLog'"]="from './audit-log.model'"
    ["from './CallLog'"]="from './call-log.model'"
    ["from './NDREvent'"]="from './ndr-event.model'"
    ["from './NDRWorkflow'"]="from './ndr-workflow.model'"
    ["from './RTOEvent'"]="from './rto-event.model'"
    ["from './WalletTransaction'"]="from './wallet-transaction.model'"
    ["from './WarehouseLocation'"]="from './warehouse-location.model'"
    ["from './WarehouseZone'"]="from './warehouse-zone.model'"
    ["from './PickList'"]="from './pick-list.model'"
    ["from './PackingStation'"]="from './packing-station.model'"
    ["from './StockMovement'"]="from './stock-movement.model'"
    ["from './ProductMapping'"]="from './product-mapping.model'"
    ["from './WebhookEvent'"]="from './webhook-event.model'"
    ["from './WebhookDeadLetter'"]="from './webhook-dead-letter.model'"
    ["from './TeamActivity'"]="from './team-activity.model'"
    ["from './TeamInvitation'"]="from './team-invitation.model'"
    ["from './TeamPermission'"]="from './team-permission.model'"
    ["from './ReportConfig'"]="from './report-config.model'"
    
    # Shopify
    ["from './ShopifyStore'"]="from './shopify-store.model'"
    ["from './ShopifySyncLog'"]="from './shopify-sync-log.model'"
    
    # WooCommerce
    ["from './WooCommerceStore'"]="from './woocommerce-store.model'"
    ["from './WooCommerceProductMapping'"]="from './woocommerce-product-mapping.model'"
    ["from './WooCommerceSyncLog'"]="from './woocommerce-sync-log.model'"
    
    # Amazon
    ["from './AmazonStore'"]="from './amazon-store.model'"
    ["from './AmazonProductMapping'"]="from './amazon-product-mapping.model'"
    ["from './AmazonSyncLog'"]="from './amazon-sync-log.model'"
    
    # Flipkart
    ["from './FlipkartStore'"]="from './flipkart-store.model'"
    ["from './FlipkartProductMapping'"]="from './flipkart-product-mapping.model'"
    ["from './FlipkartSyncLog'"]="from './flipkart-sync-log.model'"
)

# Run sed replacements on all TypeScript files
for old in "${!imports[@]}"; do
    new="${imports[$old]}"
    # Escape special characters for sed
    old_escaped=$(printf '%s\n' "$old" | sed 's/[[\.*^$()+?{|]/\\&/g')
    new_escaped=$(printf '%s\n' "$new" | sed 's/[&/\]/\\&/g')
    
    find "$PROJECT_ROOT/src" -name "*.ts" -type f -exec \
        sed -i '' "s|$old_escaped|$new_escaped|g" {} \;
done

echo "  Updated model imports in all source files"

echo ""
echo "=== Import Path Update Complete ==="
echo ""
echo "Next: Run TypeScript compilation to verify"
