# Shopify Integration Setup Guide

Complete guide for integrating Shipcrowd with Shopify stores.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Shopify App Setup](#shopify-app-setup)
3. [Environment Configuration](#environment-configuration)
4. [Server Setup](#server-setup)
5. [OAuth Installation Flow](#oauth-installation-flow)
6. [Product Mapping](#product-mapping)
7. [Webhook Configuration](#webhook-configuration)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- ✅ **Shopify Partner Account** - [Create here](https://partners.shopify.com/signup)
- ✅ **Shopify Development Store** - For testing
- ✅ **Redis Server** - For BullMQ job queues
- ✅ **MongoDB** - Database

### Required Scopes
The app requires these Shopify OAuth scopes:
- `read_orders` - Read order data
- `write_orders` - Update order statuses
- `read_products` - Read product catalog
- `write_products` - Update product information
- `write_inventory` - Push inventory levels
- `read_fulfillments` - Read fulfillment data
- `write_fulfillments` - Create fulfillments
- `read_locations` - Read warehouse locations
- `read_shipping` - Read shipping rates

---

## Shopify App Setup

### Step 1: Create Shopify App

1. Log in to [Shopify Partners](https://partners.shopify.com/)
2. Navigate to **Apps** → **Create App**
3. Choose **Public App** (or Custom App for single store)
4. Fill in app details:
   - **App name**: Shipcrowd Integration
   - **App URL**: `https://yourdomain.com`
   - **Allowed redirection URL(s)**:
     ```
     https://yourdomain.com/api/v1/integrations/shopify/callback
     ```

### Step 2: Configure App Settings

1. Go to **App setup** in your Shopify Partner Dashboard
2. Under **URLs**, set:
   - **App URL**: `https://yourdomain.com/settings/integrations/shopify`
   - **Allowed redirection URL(s)**: `https://yourdomain.com/api/v1/integrations/shopify/callback`

3. Under **GDPR mandatory webhooks** (optional):
   - **Customer data request endpoint**: `https://yourdomain.com/api/v1/webhooks/shopify/gdpr/customer-data`
   - **Customer data erasure endpoint**: `https://yourdomain.com/api/v1/webhooks/shopify/gdpr/customer-erase`
   - **Shop data erasure endpoint**: `https://yourdomain.com/api/v1/webhooks/shopify/gdpr/shop-erase`

### Step 3: Get API Credentials

1. In your app settings, find the **API credentials** section
2. Copy the following:
   - **API key** (Client ID)
   - **API secret key** (Client Secret)
3. Generate a **Webhook secret** (or use the auto-generated one)

---

## Environment Configuration

Add these environment variables to your `.env` file:

```bash
# Shopify Configuration
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here
APP_URL=https://yourdomain.com

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Encryption (for access token storage)
ENCRYPTION_KEY=your_32_byte_hex_key_here

# Frontend URL (for OAuth callback redirects)
FRONTEND_URL=https://app.yourdomain.com
```

### Generate Encryption Key

```bash
# Generate a secure 32-byte encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Server Setup

### Step 1: Install Dependencies

```bash
cd server
npm install
```

Required packages (already in package.json):
- `bullmq` - Job queue management
- `redis` - Redis client
- `axios` - HTTP client
- `crypto` - Built-in (encryption)
- `json2csv` - CSV export

### Step 2: Initialize Queue Manager

In your `server/src/index.ts` or main entry file:

```typescript
import QueueManager from './infrastructure/queue/QueueManager';
import ShopifyOrderSyncJob from './infrastructure/jobs/ShopifyOrderSyncJob';
import ShopifyWebhookProcessorJob from './infrastructure/jobs/ShopifyWebhookProcessorJob';

// Initialize queues on server startup
async function initializeQueues() {
  await QueueManager.initialize();
  await ShopifyOrderSyncJob.initialize();
  await ShopifyWebhookProcessorJob.initialize();

  // Schedule all active stores for auto-sync
  await ShopifyOrderSyncJob.scheduleAllStores();
}

// Call during server startup
await initializeQueues();
```

### Step 3: Register Routes

In your `server/src/presentation/http/routes/v1/index.ts`:

```typescript
import shopifyRoutes from './integrations/shopify.routes';
import productMappingRoutes from './integrations/productMapping.routes';
import shopifyWebhookRoutes from './webhooks/shopify.routes';

// OAuth & Store Management
router.use('/integrations/shopify', shopifyRoutes);

// Product Mapping (merge with shopify routes or separate)
router.use('/integrations/shopify', productMappingRoutes);

// Webhooks (public endpoints)
router.use('/webhooks/shopify', shopifyWebhookRoutes);
```

### Step 4: Start Redis

```bash
# macOS (Homebrew)
brew services start redis

# Linux (systemd)
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### Step 5: Start Server

```bash
npm run dev
```

---

## OAuth Installation Flow

### For Merchants

1. **Merchant clicks "Connect Shopify"** in Shipcrowd dashboard
2. **Merchant enters shop domain**: `example.myshopify.com`
3. **Redirect to installation URL**:
   ```
   GET /api/v1/integrations/shopify/install?shop=example.myshopify.com
   ```
4. **Shopify OAuth screen** appears with permission requests
5. **Merchant approves** permissions
6. **Callback received** with authorization code:
   ```
   GET /api/v1/integrations/shopify/callback?shop=...&code=...&hmac=...&state=...
   ```
7. **Access token exchanged** and encrypted in database
8. **Webhooks registered** automatically (8 topics)
9. **Redirect to success page** in frontend

### Testing OAuth Flow

```bash
# 1. Get installation URL
curl -X GET "http://localhost:3000/api/v1/integrations/shopify/install?shop=your-dev-store.myshopify.com" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response: { installUrl: "https://..." }

# 2. Visit the installUrl in browser
# 3. Approve permissions on Shopify
# 4. Check database for encrypted access token
```

---

## Product Mapping

After OAuth installation, map Shopify products to Shipcrowd SKUs.

### Auto-Mapping (Recommended)

Automatically maps products by exact SKU match:

```bash
POST /api/v1/integrations/shopify/stores/:storeId/mappings/auto
Authorization: Bearer YOUR_JWT_TOKEN
```

Response:
```json
{
  "success": true,
  "mapped": 45,
  "skipped": 5,
  "failed": 0,
  "unmappedSKUs": []
}
```

### Manual Mapping

For products with different SKUs between systems:

```bash
POST /api/v1/integrations/shopify/stores/:storeId/mappings
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "shopifyProductId": "7123456789",
  "shopifyVariantId": "41234567890",
  "shopifySKU": "TSHIRT-BLK-M",
  "shopifyTitle": "Black T-Shirt - Medium",
  "shipcrowdSKU": "APPAREL-TSHIRT-001-BLK-M",
  "shipcrowdProductName": "Premium Black T-Shirt Medium",
  "syncInventory": true,
  "syncOnFulfillment": true
}
```

### CSV Import

For bulk mapping:

1. **Export current mappings** (optional):
   ```bash
   GET /api/v1/integrations/shopify/stores/:storeId/mappings/export
   ```

2. **Prepare CSV** with format:
   ```csv
   shopifyProductId,shopifyVariantId,shopifySKU,shipcrowdSKU,syncInventory
   7123456789,41234567890,TSHIRT-BLK-M,APPAREL-001-BLK-M,true
   7123456789,41234567891,TSHIRT-BLK-L,APPAREL-001-BLK-L,true
   ```

3. **Import CSV**:
   ```bash
   POST /api/v1/integrations/shopify/stores/:storeId/mappings/import
   Content-Type: application/json

   {
     "csvData": "shopifyProductId,shopifyVariantId,..."
   }
   ```

---

## Webhook Configuration

Webhooks are **automatically registered** during OAuth installation.

### Registered Webhooks

| Topic | Endpoint | Purpose |
|-------|----------|---------|
| `orders/create` | `/webhooks/shopify/orders/create` | New order placed |
| `orders/updated` | `/webhooks/shopify/orders/updated` | Order modified |
| `orders/cancelled` | `/webhooks/shopify/orders/cancelled` | Order cancelled |
| `orders/fulfilled` | `/webhooks/shopify/orders/fulfilled` | Order fulfilled |
| `products/update` | `/webhooks/shopify/products/update` | Product changed |
| `inventory_levels/update` | `/webhooks/shopify/inventory_levels/update` | Inventory changed |
| `app/uninstalled` | `/webhooks/shopify/app/uninstalled` | App removed |
| `shop/update` | `/webhooks/shopify/shop/update` | Store settings changed |

### Webhook Security

- ✅ **HMAC-SHA256 verification** on all webhooks
- ✅ **Constant-time comparison** (timing attack safe)
- ✅ **Raw body verification** (prevents tampering)
- ✅ **Duplicate detection** via `X-Shopify-Webhook-Id`

### Testing Webhooks Locally

Use ngrok to expose local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3000
ngrok http 3000

# Update webhook URLs in Shopify Partner Dashboard to:
# https://your-ngrok-url.ngrok.io/api/v1/webhooks/shopify/orders/create
# (repeat for all 8 webhooks)
```

---

## Testing

### Manual Sync Test

```bash
# Trigger order sync manually
POST /api/v1/integrations/shopify/stores/:storeId/sync/orders
Authorization: Bearer YOUR_JWT_TOKEN
```

### Test Connection

```bash
# Verify store connection
POST /api/v1/integrations/shopify/stores/:storeId/test
Authorization: Bearer YOUR_JWT_TOKEN
```

Response:
```json
{
  "success": true,
  "connected": true,
  "message": "Connection is valid"
}
```

### Check Sync Logs

```bash
# Get recent sync logs
GET /api/v1/integrations/shopify/stores/:storeId/sync-logs?limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

### Monitor Job Queues

```bash
# Get queue statistics
GET /api/v1/admin/queues/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Troubleshooting

### Issue: OAuth callback fails with "Invalid HMAC"

**Solution:**
- Verify `SHOPIFY_API_SECRET` matches your Shopify app credentials
- Ensure no URL encoding issues in callback parameters
- Check server logs for HMAC verification details

### Issue: Webhooks not being received

**Solutions:**
1. **Verify webhook URLs** in Shopify Partner Dashboard
2. **Check HMAC verification** - ensure `SHOPIFY_WEBHOOK_SECRET` is correct
3. **Test with ngrok** for local development
4. **Check firewall rules** - webhooks need public access
5. **Review webhook logs** in Shopify Partner Dashboard

### Issue: Orders not syncing

**Solutions:**
1. **Check store status**: `GET /api/v1/integrations/shopify/stores/:id`
   - Ensure `isActive: true` and `isPaused: false`
2. **Verify sync config**:
   ```json
   {
     "syncConfig": {
       "orderSync": {
         "enabled": true,
         "autoSync": true,
         "syncInterval": 15
       }
     }
   }
   ```
3. **Check BullMQ queue**: Ensure Redis is running
4. **Review sync logs** for errors

### Issue: Inventory not updating in Shopify

**Solutions:**
1. **Verify product mappings exist**:
   ```bash
   GET /api/v1/integrations/shopify/stores/:id/mappings?syncInventory=true
   ```
2. **Check mapping has `syncInventory: true`**
3. **Verify GraphQL API permissions** - need `write_inventory` scope
4. **Test manual inventory sync**:
   ```bash
   POST /api/v1/integrations/shopify/mappings/:id/sync
   { "quantity": 50 }
   ```

### Issue: Rate limiting errors

**Solutions:**
1. **Increase sync interval** in store config (default: 15 minutes)
2. **Reduce batch size** in inventory sync (default: 50 SKUs)
3. **Check rate limit headers** in logs
4. **Implement exponential backoff** (already built-in)

### Issue: Access token expired

**Solution:**
- Shopify access tokens don't expire for private/custom apps
- For public apps, implement token refresh (future enhancement)
- Current workaround: Re-install app via OAuth flow

---

## Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Redis server running and accessible
- [ ] MongoDB indexes created
- [ ] HTTPS enabled (required for webhooks)
- [ ] Webhook URLs publicly accessible
- [ ] BullMQ workers initialized
- [ ] Logging configured (Winston)
- [ ] Error monitoring setup (Sentry recommended)
- [ ] Backup strategy for encrypted tokens
- [ ] Rate limiting configured
- [ ] CORS settings verified
- [ ] Shopify app reviewed and approved (for public apps)

---

## Support

For issues or questions:
- GitHub Issues: [shipcrowd/backend/issues](https://github.com/shipcrowd/backend/issues)
- Documentation: [docs.shipcrowd.com](https://docs.shipcrowd.com)
- Email: support@shipcrowd.com

---

## Changelog

### Version 1.0.0 (2025-01-01)
- ✅ OAuth 2.0 authentication
- ✅ Order sync (Shopify → Shipcrowd)
- ✅ Inventory sync (Shipcrowd → Shopify)
- ✅ Product mapping (auto + manual)
- ✅ 8 webhook handlers
- ✅ BullMQ background jobs
- ✅ CSV import/export
- ✅ Comprehensive logging

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Author:** Shipcrowd Development Team
