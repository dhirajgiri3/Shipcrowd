# API Contract Changes - Ecommerce Integration Refactor v2

## Overview

This document outlines all API contract changes introduced in the ecommerce integration alignment refactor.

**Version:** 2.0
**Date:** February 2026
**Breaking Changes:** Minimal (backward compatibility maintained where possible)
**Affected Endpoints:** 15+ integration endpoints across 4 platforms

---

## Standardized Endpoints

### Amazon Order Sync Route Normalization

**Old Endpoint (Deprecated):**
```
POST /api/v1/integrations/amazon/stores/:id/sync-orders
```

**New Canonical Endpoint:**
```
POST /api/v1/integrations/amazon/stores/:id/sync/orders
```

**Backward Compatibility:**
- ✅ Old endpoint maintained as alias
- ⚠️ Will be removed in v3.0
- 📝 Update client code to use new endpoint

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "amazon-order-sync-673abc123..."
  },
  "message": "Order sync queued successfully"
}
```

---

## New Endpoints Added

### 1. Sync Logs Endpoints (3 platforms)

**WooCommerce:**
```
GET /api/v1/integrations/woocommerce/stores/:id/sync/logs
```

**Amazon:**
```
GET /api/v1/integrations/amazon/stores/:id/sync/logs
```

**Flipkart:**
```
GET /api/v1/integrations/flipkart/stores/:id/sync/logs
```

**Query Parameters:**
```typescript
{
  limit?: number; // Default: 50, Max: 100
  offset?: number; // Default: 0
}
```

**Response Schema (Normalized across all platforms):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "673abc...",
      "integrationId": "6990ed99a31caad464cfd704",
      "syncId": "673abc...",
      "triggerType": "MANUAL" | "SCHEDULED" | "WEBHOOK",
      "status": "SUCCESS" | "FAILED" | "IN_PROGRESS",
      "startedAt": "2026-02-15T10:30:00.000Z",
      "completedAt": "2026-02-15T10:31:45.000Z",
      "durationMs": 105000,
      "ordersProcessed": 50,
      "ordersSuccess": 48,
      "ordersFailed": 2,
      "details": {
        "message": "Sync completed successfully",
        "errors": [
          {
            "orderId": "123",
            "error": "Invalid address format"
          }
        ]
      }
    }
  ],
  "message": "Sync logs retrieved successfully"
}
```

---

### 2. Flipkart Manual Sync Endpoint (NEW)

**Endpoint:**
```
POST /api/v1/integrations/flipkart/stores/:id/sync/orders
```

**Request Body:**
```json
{
  "hoursBack": 24  // Optional: sync last N hours
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "flipkart-order-sync-673abc..."
  },
  "message": "Order sync queued successfully"
}
```

**Notes:**
- Previously, Flipkart only supported automatic scheduled syncs
- Manual sync now available for all platforms

---

### 3. Platform Settings Update Endpoints

**WooCommerce:**
```
PATCH /api/v1/integrations/woocommerce/stores/:id/settings
```

**Amazon:**
```
PATCH /api/v1/integrations/amazon/stores/:id/settings
```

**Flipkart:**
```
PATCH /api/v1/integrations/flipkart/stores/:id/settings
```

**Request Body:**
```json
{
  "settings": {
    "autoFulfill": true,
    "autoTrackingUpdate": true,
    "lowInventoryAlert": 10
  },
  "syncConfig": {
    "orders": {
      "enabled": true,
      "interval": "EVERY_15_MIN"
    },
    "products": {
      "enabled": true,
      "interval": "HOURLY"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "store": {
      "id": "6990ed99...",
      "platform": "woocommerce",
      "settings": { ... },
      "syncConfig": { ... },
      "stats": { ... }
    }
  },
  "message": "Settings updated successfully"
}
```

---

## Modified Request Payloads

### Connection/Test Credential Compatibility

All platform connection endpoints now support both **canonical** and **legacy** field names for smoother migration.

#### WooCommerce

**Canonical Fields:**
```json
{
  "storeUrl": "https://example.com",
  "consumerKey": "ck_...",
  "consumerSecret": "cs_...",
  "storeName": "My Store"
}
```

**Also Accepts (Legacy):**
```json
{
  "siteUrl": "https://example.com",  // Maps to storeUrl
  "consumerKey": "ck_...",
  "consumerSecret": "cs_..."
}
```

#### Amazon

**Canonical Fields (SP-API):**
```json
{
  "sellerId": "A1234567890ABC",
  "marketplaceId": "A21TJRUUN4KGV",
  "sellerName": "My Business",
  "sellerEmail": "seller@example.com",
  "lwaClientId": "amzn1.application-oa2-client.xxx",
  "lwaClientSecret": "amzn1.oa2-cs.xxx",
  "lwaRefreshToken": "Atzr|xxx",
  "awsAccessKeyId": "AKIA...",
  "awsSecretAccessKey": "xxx",
  "roleArn": "arn:aws:iam::...",
  "region": "us-east-1"
}
```

**Also Accepts (Legacy MWS - deprecated):**
```json
{
  "sellerId": "A1234567890ABC",
  "mwsAuthToken": "amzn.mws.xxx"  // Legacy field
}
```

**Note:** MWS is deprecated by Amazon. Use SP-API credentials.

#### Flipkart

**Canonical Fields:**
```json
{
  "sellerId": "SELLER123",
  "sellerName": "My Store",
  "sellerEmail": "seller@example.com",
  "apiKey": "flipkart_api_key",
  "apiSecret": "flipkart_api_secret"
}
```

**Also Accepts (Legacy):**
```json
{
  "accessToken": "SELLER123",  // Maps to sellerId
  "appId": "flipkart_api_key",  // Maps to apiKey
  "appSecret": "flipkart_api_secret"  // Maps to apiSecret
}
```

---

## Response Schema Changes

### Normalized Sync Log Response

All platforms now return the same sync log schema:

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Unique log ID |
| `integrationId` | string | Store/integration ID |
| `syncId` | string | Sync execution ID |
| `triggerType` | enum | `"MANUAL"` \| `"SCHEDULED"` \| `"WEBHOOK"` |
| `status` | enum | `"SUCCESS"` \| `"FAILED"` \| `"IN_PROGRESS"` |
| `startedAt` | ISO timestamp | Sync start time |
| `completedAt` | ISO timestamp | Sync completion time (null if in progress) |
| `durationMs` | number | Duration in milliseconds |
| `ordersProcessed` | number | Total orders attempted |
| `ordersSuccess` | number | Successfully synced orders |
| `ordersFailed` | number | Failed orders |
| `details.message` | string | Summary message |
| `details.errors` | array | Array of error objects |

---

## Webhook Event Model Changes

### New Webhook Event Creation Contract

**New Parameters:**
```typescript
{
  platform: 'shopify' | 'woocommerce' | 'flipkart';  // NEW: Required
  eventId: string;  // NEW: Platform-agnostic event ID
  platformDomain?: string;  // NEW: Optional domain identifier

  // Legacy (deprecated but still supported):
  shopifyId?: string;  // Maps to eventId for Shopify
  shopifyDomain?: string;  // Maps to platformDomain for Shopify
}
```

**Duplicate Detection:**
- Old: Single `shopifyId` unique index
- New: Composite `{ platform, eventId }` unique index
- Allows same webhook ID across different platforms

**Example (WooCommerce):**
```typescript
await WebhookEvent.createEvent({
  storeId: '6990ed99...',
  companyId: '69896c05...',
  platform: 'woocommerce',  // NEW
  topic: 'order.created',
  eventId: 'woo-order.created-6990ed99-12345',  // NEW (deterministic)
  platformDomain: 'https://example.com',  // NEW
  payload: { ... },
  headers: { ... },
  verified: true,
  hmacValid: true
});
```

---

## Frontend Hook Changes

### useEcommerceIntegrations Hook

**Updated Methods:**

#### `useTriggerSync`

**Before:**
```typescript
triggerSync({ integrationId, type: 'SHOPIFY' });
```

**After:**
```typescript
// All platforms use same endpoint pattern
triggerSync({ integrationId, type: 'SHOPIFY' | 'WOOCOMMERCE' | 'AMAZON' | 'FLIPKART' });
```

**Endpoint Mapping:**
- Shopify: `POST /stores/:id/sync/orders`
- WooCommerce: `POST /stores/:id/sync/orders`
- Amazon: `POST /stores/:id/sync/orders` (no longer `/sync-orders`)
- Flipkart: `POST /stores/:id/sync/orders` (NEW - was unsupported)

#### `useSyncLogs`

**Before:**
```typescript
// Only worked for Shopify
useSyncLogs(integrationId, 'SHOPIFY');
```

**After:**
```typescript
// Works for all platforms
useSyncLogs(integrationId, 'SHOPIFY' | 'WOOCOMMERCE' | 'AMAZON' | 'FLIPKART');
```

**Response:** Normalized schema across all platforms

---

## Breaking Changes Summary

### ⚠️ Minor Breaking Changes

1. **Amazon sync endpoint path:**
   - Old: `/sync-orders`
   - New: `/sync/orders`
   - **Mitigation:** Alias maintained for backward compatibility

2. **Webhook event model:**
   - `platform` field now required for new webhooks
   - **Mitigation:** Legacy `shopifyId` still works for Shopify

### ✅ Non-Breaking Changes

1. **New sync logs endpoints:** Additive, no existing functionality removed
2. **Settings update endpoints:** New feature, no breaking changes
3. **Credential field aliases:** Accepts both old and new field names
4. **Flipkart manual sync:** New capability, no existing behavior changed

---

## Migration Guide for Clients

### Step 1: Update Sync Endpoint Calls

**Replace:**
```typescript
POST /integrations/amazon/stores/:id/sync-orders
```

**With:**
```typescript
POST /integrations/amazon/stores/:id/sync/orders
```

### Step 2: Use Normalized Sync Log Schema

Update your sync log parsing to expect the normalized schema:

```typescript
interface SyncLog {
  _id: string;
  integrationId: string;
  syncId: string;
  triggerType: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK';
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  ordersProcessed: number;
  ordersSuccess: number;
  ordersFailed: number;
  details: {
    message: string;
    errors: Array<{ orderId: string; error: string }>;
  };
}
```

### Step 3: Update Credential Payloads (Optional)

Migrate to canonical field names for clarity:

**WooCommerce:** `storeUrl` instead of `siteUrl`
**Amazon:** Use SP-API credentials instead of MWS
**Flipkart:** `sellerId`, `apiKey`, `apiSecret` instead of `accessToken`, `appId`, `appSecret`

**Note:** Legacy fields still work, but canonical names are recommended.

---

## Testing Checklist

### Backend
- [ ] Amazon sync uses `/sync/orders` endpoint
- [ ] Old Amazon `/sync-orders` endpoint still works (alias)
- [ ] WooCommerce sync logs endpoint returns normalized schema
- [ ] Amazon sync logs endpoint returns normalized schema
- [ ] Flipkart sync logs endpoint returns normalized schema
- [ ] Flipkart manual sync endpoint works
- [ ] Settings update works for all platforms
- [ ] Credential compatibility works (both old and new field names)

### Frontend
- [ ] Sync logs render for all 4 platforms
- [ ] Manual sync button works for Flipkart
- [ ] Amazon sync uses correct endpoint
- [ ] Sync log schema parsing works correctly
- [ ] Credential forms accept both old and new field names

### Webhooks
- [ ] WooCommerce webhooks persist with `platform: 'woocommerce'`
- [ ] Flipkart webhooks persist with `platform: 'flipkart'`
- [ ] Duplicate WooCommerce webhooks are detected
- [ ] Duplicate Flipkart webhooks are detected
- [ ] Platform-specific webhook queries work

---

## Rollback Plan

If issues arise, rollback is safe:

1. **Backend:** Revert route changes, old aliases remain
2. **Frontend:** Revert to old endpoint paths (aliases work)
3. **Webhooks:** Legacy `shopifyId` still functional
4. **Database:** No migrations required, changes are additive

**Data Loss Risk:** None (all changes are backward-compatible)

---

## Support

For questions or issues:
- Documentation: `/docs/Resources/Testing/`
- Migration guides: `/docs/migrations/`
- API reference: `/docs/API_CONTRACT_CHANGES_v2.md` (this file)

---

**Version:** 2.0
**Status:** ✅ Complete
**Breaking Changes:** Minimal (aliases maintained)
**Recommended Action:** Update to canonical endpoints and field names
