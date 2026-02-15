# Webhook Event Model Platform Migration Guide

## Overview

The `WebhookEvent` model has been enhanced to support multiple ecommerce platforms (Shopify, WooCommerce, Flipkart) with improved duplicate detection and platform-aware querying.

**Migration Type:** Backward-compatible with legacy Shopify webhooks
**Database Migration Required:** No (fields are optional/sparse)
**Runtime Migration Required:** No (legacy code continues to work)
**Recommended Action:** Update webhook controllers to use new platform field

---

## What Changed

### New Fields Added

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | String (enum) | **Yes** | Platform identifier: `'shopify' \| 'woocommerce' \| 'flipkart'` |
| `eventId` | String | **Yes** | Platform-agnostic webhook event identifier |
| `platformDomain` | String | No | Platform-specific domain/identifier |

### Legacy Fields (Deprecated but Supported)

| Field | Status | Migration Path |
|-------|--------|----------------|
| `shopifyId` | Deprecated → use `eventId` | Sparse index, optional |
| `shopifyDomain` | Deprecated → use `platformDomain` | Sparse index, optional |

### Index Changes

**New Composite Unique Index:**
```typescript
{ platform: 1, eventId: 1 }, { unique: true }
```
This replaces the old `shopifyId` unique index for multi-platform duplicate prevention.

**New Platform Query Index:**
```typescript
{ platform: 1, processed: 1 }
```
Enables efficient platform-specific webhook queries.

---

## Migration Steps

### Step 1: Update Webhook Controllers (COMPLETED ✅)

**Before (Shopify-only):**
```typescript
const { event, isDuplicate } = await WebhookEvent.createEvent({
  storeId: store._id,
  companyId: store.companyId,
  topic: 'orders/create',
  shopifyId: webhookId,
  shopifyDomain: store.shopDomain,
  payload,
  headers,
  verified: true,
  hmacValid: true,
});
```

**After (Multi-platform):**
```typescript
const { event, isDuplicate } = await WebhookEvent.createEvent({
  storeId: store._id,
  companyId: store.companyId,
  platform: 'woocommerce', // or 'flipkart'
  topic: 'order.created',
  eventId: 'woo-order.created-${storeId}-${orderId}', // Deterministic
  platformDomain: store.storeUrl,
  payload,
  headers,
  verified: true,
  hmacValid: true,
});
```

### Step 2: Platform-Specific Event ID Generation

**Critical:** Event IDs must be deterministic (NO timestamps) for duplicate detection.

**WooCommerce:**
```typescript
const eventId = `woo-${topic}-${storeId}-${payload.id}`;
```

**Flipkart:**
```typescript
const resourceId = payload.orderId || payload.order_id || payload.id;
const hash = crypto.createHash('sha256');
hash.update(topic);
hash.update(String(resourceId));
if (payload.status) {
  hash.update(String(payload.status));
}
const eventId = `flipkart-${topic.replace(/\//g, '-')}-${resourceId}-${hash.digest('hex').substring(0, 16)}`;
```

**Shopify:**
```typescript
// Use X-Shopify-Webhook-Id header directly
const eventId = req.headers['x-shopify-webhook-id'];
```

### Step 3: Update Webhook Queries (Optional)

**Platform-specific queries:**
```typescript
// Get unprocessed WooCommerce webhooks only
const wooWebhooks = await WebhookEvent.getUnprocessed(100, 'woocommerce');

// Get failed Flipkart webhooks
const failedFlipkart = await WebhookEvent.getFailedEvents(50, 'flipkart');

// Get queue size per platform
const queueSize = await WebhookEvent.getQueueSize('shopify');
```

---

## Backward Compatibility

### Legacy Shopify Code Still Works ✅

Existing Shopify webhook code using `shopifyId` and `shopifyDomain` continues to work:

```typescript
// OLD CODE - STILL WORKS
const { event, isDuplicate } = await WebhookEvent.createEvent({
  storeId: store._id,
  companyId: store.companyId,
  topic: 'orders/create',
  shopifyId: req.headers['x-shopify-webhook-id'],
  shopifyDomain: req.headers['x-shopify-shop-domain'],
  // ... other fields
});
```

The model automatically handles both patterns:
- If `platform` and `eventId` are provided → uses new composite key
- If only `shopifyId` is provided → treated as legacy Shopify webhook

### Database Migration Not Required

No migration script needed because:
- New fields have sparse indexes (allow null)
- Legacy fields remain functional
- Duplicate prevention works for both patterns

---

## Topic Enum Extended

**Shopify topics:**
```typescript
'orders/create', 'orders/updated', 'orders/cancelled', 'orders/fulfilled',
'products/update', 'inventory_levels/update', 'app/uninstalled', 'shop/update'
```

**WooCommerce topics:**
```typescript
'order.created', 'order.updated', 'order.deleted',
'product.created', 'product.updated', 'product.deleted',
'customer.created', 'customer.updated'
```

**Flipkart topics:**
```typescript
'order/create', 'order/approve', 'order/ready-to-dispatch', 'order/dispatch',
'order/deliver', 'order/cancel', 'order/return', 'inventory/update'
```

---

## Updated Controllers

### ✅ WooCommerce Webhook Controller
**File:** `server/src/presentation/http/controllers/webhooks/channels/woocommerce.webhook.controller.ts`
- All handlers use `platform: 'woocommerce'`
- Deterministic event IDs (no timestamps)
- Duplicate detection before queueing

### ✅ Flipkart Webhook Controller
**File:** `server/src/presentation/http/controllers/webhooks/channels/flipkart.webhook.controller.ts`
- All handlers use `platform: 'flipkart'`
- Deterministic event IDs with hash (no `Date.now()`)
- Supports multiple webhooks per order (status-based)

### ✅ Shopify Webhook Controller
**Note:** Shopify controller should be updated to use new platform field (recommended but not required)

---

## Testing Checklist

### Database Level
- [ ] Create WooCommerce webhook event → verify `platform: 'woocommerce'` stored
- [ ] Create Flipkart webhook event → verify `platform: 'flipkart'` stored
- [ ] Create duplicate WooCommerce webhook → verify `isDuplicate: true` returned
- [ ] Create duplicate Flipkart webhook → verify `isDuplicate: true` returned
- [ ] Query `getUnprocessed('woocommerce')` → only returns WooCommerce events
- [ ] Query `getQueueSize('flipkart')` → only counts Flipkart events

### Controller Level
- [ ] Send WooCommerce webhook → event persisted with correct platform
- [ ] Send same WooCommerce webhook twice → second returns duplicate
- [ ] Send Flipkart webhook → event persisted with deterministic ID
- [ ] Send same Flipkart webhook twice → duplicate detected
- [ ] Verify webhook queue jobs created after persistence

### Worker Level
- [ ] WooCommerce webhook processor consumes from queue
- [ ] Flipkart webhook processor consumes from queue
- [ ] Failed webhooks appear in dead letter queue per platform

---

## Rollback Plan

If issues arise:

1. **No database rollback needed** - Legacy fields still work
2. **Code rollback:**
   - Revert webhook controller changes
   - Old Shopify code using `shopifyId` continues working
   - No data loss

3. **Index cleanup (optional):**
   ```javascript
   db.webhookevents.dropIndex({ platform: 1, eventId: 1 });
   db.webhookevents.dropIndex({ platform: 1, processed: 1 });
   ```

---

## Performance Impact

### Positive
- ✅ Platform-specific queries are more efficient
- ✅ Duplicate detection works across all platforms
- ✅ Dead letter queue can be filtered per platform

### Neutral
- Composite unique index adds minimal overhead
- Sparse indexes on legacy fields have no impact

---

## Next Steps

1. **Monitor webhook processing:**
   ```javascript
   // Platform-specific queue sizes
   const shopifyQueue = await WebhookEvent.getQueueSize('shopify');
   const wooQueue = await WebhookEvent.getQueueSize('woocommerce');
   const flipkartQueue = await WebhookEvent.getQueueSize('flipkart');
   ```

2. **Update Shopify controller (recommended):**
   - Migrate Shopify webhooks to use `platform: 'shopify'` and `eventId`
   - Maintains consistency across all platforms

3. **Add monitoring dashboard:**
   - Platform-specific webhook stats
   - Failed event tracking per platform
   - Processing time metrics per platform

---

## FAQs

**Q: Do I need to run a database migration?**
A: No, the changes are backward-compatible with sparse indexes.

**Q: Will old Shopify webhooks break?**
A: No, legacy `shopifyId`/`shopifyDomain` fields still work.

**Q: What happens to existing webhook events in the database?**
A: They remain queryable. New platform field is only required for new events.

**Q: Can I query all webhooks regardless of platform?**
A: Yes, omit the `platform` parameter in query methods.

**Q: What if the same webhook payload is sent by multiple platforms?**
A: Each platform has its own namespace via the composite `{ platform, eventId }` key.

---

**Migration Status:** ✅ Complete
**Database Impact:** Zero (backward-compatible)
**Code Impact:** Localized to webhook controllers
**Rollback Risk:** Low (legacy code continues working)
