# Shopify Integration - Comprehensive Testing Checklist

## 🎯 Testing Overview

This document provides a complete testing checklist for all Shopify integration features, including the recent cache optimization fixes that ensure orders appear within 30-60 seconds.

---

## ✅ Phase 1: OAuth & Connection (15 min)

### 1.1 Initial Store Connection
- [ ] Navigate to `/seller/integrations/shopify/setup`
- [ ] Enter test store domain (e.g., `my-test-store.myshopify.com`)
- [ ] Click "Connect Store"
- [ ] Verify redirect to Shopify OAuth page
- [ ] Review permissions requested (orders, products, fulfillments, inventory)
- [ ] Click "Install app" / "Authorize"
- [ ] Verify redirect back to ShipCrowd with `?status=success&store=...&storeId=...`
- [ ] Confirm green "Connected" badge appears
- [ ] Confirm store appears in integrations list

**Expected Result:** Store connected successfully with access token saved and encrypted.

### 1.2 OAuth Error Handling
- [ ] Try connecting with invalid store domain (e.g., `nonexistent-store-xyz.myshopify.com`)
- [ ] Verify proper error message displayed
- [ ] Try canceling OAuth on Shopify page (click back/cancel)
- [ ] Verify proper error handling and redirect
- [ ] Check server logs for error tracking

**Expected Result:** Graceful error handling with clear user feedback.

### 1.3 Reconnection
- [ ] Disconnect store (see Phase 7)
- [ ] Reconnect same store
- [ ] Verify new access token generated
- [ ] Verify webhooks re-registered
- [ ] Confirm no duplicate data created

**Expected Result:** Clean reconnection without data duplication.

---

## ✅ Phase 2: Store Management (10 min)

### 2.1 Store List View
- [ ] Navigate to `/seller/integrations`
- [ ] Verify Shopify store card displays:
  - [ ] Store name
  - [ ] Store domain
  - [ ] Connection status (Active/Paused)
  - [ ] Last sync timestamp
  - [ ] Sync health indicator

**API Test:** `GET /api/v1/integrations/shopify/stores`

### 2.2 Store Details Page
- [ ] Click on Shopify store to view details
- [ ] Navigate to `/seller/integrations/shopify/[storeId]`
- [ ] Verify displayed information:
  - [ ] Store name and domain
  - [ ] Connection date
  - [ ] Total orders synced
  - [ ] Last sync timestamp
  - [ ] Sync health percentage
  - [ ] Recent sync activity log
- [ ] Verify action buttons present:
  - [ ] Settings
  - [ ] Sync Orders
  - [ ] View Sync History
  - [ ] Disconnect

**API Test:** `GET /api/v1/integrations/shopify/stores/:id`

### 2.3 Test Connection
- [ ] Use "Test Connection" button (if exposed in UI)
- [ ] Verify API call succeeds: `POST /api/v1/integrations/shopify/stores/:id/test`
- [ ] Confirm response: `{ connected: true }`
- [ ] Try testing with store paused
- [ ] Verify appropriate status returned

**Expected Result:** Connection test validates Shopify API access.

### 2.4 Store Settings
- [ ] Navigate to `/seller/integrations/shopify/[storeId]/settings`
- [ ] Verify settings panel displays:
  - [ ] Sync Configuration
    - [ ] Auto-sync toggle
    - [ ] Sync frequency dropdown (realtime/hourly/daily)
  - [ ] Order Filters
    - [ ] Minimum order value
    - [ ] Status filters
  - [ ] Notifications
    - [ ] Email notifications toggle
    - [ ] Webhook notifications toggle
- [ ] Change sync frequency to "Hourly"
- [ ] Click "Save Settings"
- [ ] Refresh page and verify settings persisted
- [ ] Change back to original settings

**API Test:** `PATCH /api/v1/integrations/shopify/stores/:id/settings`

### 2.5 Pause/Resume Sync
- [ ] Click "Pause Sync" button
- [ ] Verify store status changes to "Paused"
- [ ] Create test order in Shopify (should NOT sync)
- [ ] Wait 2 minutes, confirm order doesn't appear
- [ ] Click "Resume Sync"
- [ ] Verify store status changes to "Active"
- [ ] Trigger manual sync
- [ ] Confirm paused order now syncs

**API Tests:**
- `POST /api/v1/integrations/shopify/stores/:id/pause`
- `POST /api/v1/integrations/shopify/stores/:id/resume`

---

## ✅ Phase 3: Manual Order Sync (15 min)

### 3.1 Recent Orders Sync (24 hours)
- [ ] Navigate to `/seller/integrations/shopify/[storeId]/sync`
- [ ] Click "Sync Orders" button
- [ ] Select "Recent Orders (24h)" option
- [ ] Click "Start Sync"
- [ ] Monitor sync progress indicator
- [ ] Wait for completion
- [ ] Verify sync log created with:
  - [ ] Status: Completed
  - [ ] Processed count
  - [ ] Synced count
  - [ ] Failed count (should be 0)
  - [ ] Duration
- [ ] Navigate to `/seller/orders`
- [ ] Filter by source: Shopify
- [ ] Verify orders appear with:
  - [ ] Shopify source badge
  - [ ] Correct order number (matches Shopify)
  - [ ] Customer information
  - [ ] Accurate totals

**API Test:** `POST /api/v1/integrations/shopify/stores/:id/sync/orders`
Body: `{ sinceDate: "2025-02-14T00:00:00.000Z" }`

### 3.2 Full Historical Sync
- [ ] Click "Sync Orders" again
- [ ] Select "All Orders" option
- [ ] Click "Start Sync"
- [ ] Wait for completion (may take longer)
- [ ] Verify sync log shows higher processed count
- [ ] Check for any failed orders
- [ ] Review error messages if any failures

**Expected Result:** All historical orders synced with proper error handling.

### 3.3 Sync Log Review
- [ ] Navigate to sync history page
- [ ] Verify columns display:
  - [ ] Sync date/time
  - [ ] Trigger type (Manual/Scheduled/Webhook)
  - [ ] Status (Success/Failed/In Progress)
  - [ ] Processed count
  - [ ] Success count
  - [ ] Failed count
  - [ ] Duration
- [ ] Click on a sync log to view details
- [ ] Verify detailed breakdown shown
- [ ] Check error details for failed items (if any)

**API Test:** `GET /api/v1/integrations/shopify/stores/:id/sync/logs?page=1&limit=20`

### 3.4 Sync During High Load
- [ ] Create 10+ test orders in Shopify rapidly
- [ ] Trigger manual sync
- [ ] Monitor server logs for queue processing
- [ ] Verify all orders processed successfully
- [ ] Check for race conditions or duplicates

**Expected Result:** All orders synced correctly without duplicates.

---

## ✅ Phase 4: Real-Time Webhook Sync (20 min)

**Prerequisites:**
- ngrok running (`ngrok http 5005`)
- `BACKEND_URL` set to ngrok URL
- Server restarted after env change
- Webhooks registered (check Shopify Admin → Settings → Notifications → Webhooks)

### 4.1 Order Created Webhook
- [ ] Go to Shopify Admin
- [ ] Create a new test order (Products → Draft Orders → Create order)
- [ ] Fill in customer info and products
- [ ] Mark as paid
- [ ] Click "Create order"
- [ ] **Start timer** ⏱️
- [ ] Wait 30-60 seconds
- [ ] Check ShipCrowd Orders page
- [ ] Verify new order appears with:
  - [ ] Source: Shopify badge
  - [ ] Order number matches Shopify
  - [ ] Customer data populated
  - [ ] Products synced correctly
  - [ ] Status: `pending`
  - [ ] Payment status: `paid`
- [ ] **Stop timer** - should be under 60 seconds ✅
- [ ] Check server logs for:
  - `Webhook verified`
  - `Processing orders/create webhook`
  - `Order created from Shopify`
  - `Invalidate order cache`

**API Endpoint:** `POST /api/v1/webhooks/shopify/orders/create`

**Expected Result:** Order appears in UI within 30-60 seconds of creation.

### 4.2 Order Updated Webhook
- [ ] In Shopify Admin, open the test order
- [ ] Edit customer shipping address
- [ ] Save changes
- [ ] Wait 30-60 seconds
- [ ] Refresh ShipCrowd order details
- [ ] Verify address updated correctly
- [ ] Check status history for "Updated from Shopify webhook" entry

**API Endpoint:** `POST /api/v1/webhooks/shopify/orders/updated`

### 4.3 Order Cancelled Webhook
- [ ] In Shopify Admin, cancel the test order
- [ ] Provide cancellation reason
- [ ] Wait 30-60 seconds
- [ ] Check ShipCrowd Orders page
- [ ] Verify order status changed to `cancelled`
- [ ] Check status history for cancellation comment
- [ ] Verify reason included in comment

**API Endpoint:** `POST /api/v1/webhooks/shopify/orders/cancelled`

### 4.4 Order Fulfilled Webhook
- [ ] Create new order in Shopify
- [ ] In Shopify Admin, fulfill the order
- [ ] Add tracking number (e.g., `TEST123456789`)
- [ ] Select carrier
- [ ] Mark as fulfilled
- [ ] Wait 30-60 seconds
- [ ] Check ShipCrowd order
- [ ] Verify:
  - [ ] Status changed to `delivered`
  - [ ] Tracking number populated
  - [ ] Carrier/provider set
  - [ ] Status history updated

**API Endpoint:** `POST /api/v1/webhooks/shopify/orders/fulfilled`

### 4.5 Webhook HMAC Verification
- [ ] Check server logs for webhook processing
- [ ] Verify "Webhook verified" appears before processing
- [ ] Try sending invalid webhook (wrong HMAC) via cURL:
```bash
curl -X POST http://localhost:5005/api/v1/webhooks/shopify/orders/create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: invalid_hmac" \
  -H "X-Shopify-Shop-Domain: test-store.myshopify.com" \
  -H "X-Shopify-Topic: orders/create" \
  -d '{"id":12345}'
```
- [ ] Verify request rejected with 401/403
- [ ] Check logs for "Invalid webhook signature"

**Expected Result:** HMAC validation prevents unauthorized webhook calls.

### 4.6 Webhook Registration
- [ ] Go to Shopify Admin → Settings → Notifications → Webhooks
- [ ] Verify all webhooks present:
  - [ ] `orders/create` → `.../webhooks/shopify/orders/create`
  - [ ] `orders/updated` → `.../webhooks/shopify/orders/updated`
  - [ ] `orders/cancelled` → `.../webhooks/shopify/orders/cancelled`
  - [ ] `orders/fulfilled` → `.../webhooks/shopify/orders/fulfilled`
  - [ ] `products/update` → `.../webhooks/shopify/products/update`
  - [ ] `inventory_levels/update` → `.../webhooks/shopify/inventory_levels/update`
  - [ ] `app/uninstalled` → `.../webhooks/shopify/app/uninstalled`
  - [ ] `shop/update` → `.../webhooks/shopify/shop/update`
- [ ] Verify all URLs point to correct ngrok/production domain
- [ ] Use "Send test webhook" for each
- [ ] Check server receives and processes each type

---

## ✅ Phase 5: Fulfillment Push (15 min)

### 5.1 Create Fulfillment from ShipCrowd
- [ ] Sync or create Shopify order in ShipCrowd
- [ ] Navigate to order details
- [ ] Click "Ship Now" button
- [ ] Select courier (e.g., Delhivery)
- [ ] Generate AWB/tracking number
- [ ] Create shipment
- [ ] Wait for fulfillment push
- [ ] Go to Shopify Admin → Orders
- [ ] Open the order
- [ ] Verify:
  - [ ] Fulfillment created
  - [ ] Tracking number matches
  - [ ] Tracking URL present
  - [ ] Status shows "Fulfilled"
  - [ ] Customer notification sent (if enabled)

**API Test:** `POST /api/v1/integrations/shopify/stores/:storeId/orders/:orderId/fulfill`
Body:
```json
{
  "trackingNumber": "SHIP123456789",
  "trackingCompany": "Delhivery",
  "trackingUrl": "https://www.delhivery.com/track/package/SHIP123456789",
  "notifyCustomer": true
}
```

### 5.2 Update Tracking Information
- [ ] Modify shipment tracking in ShipCrowd
- [ ] Update tracking number
- [ ] Trigger tracking update to Shopify
- [ ] Verify tracking updated in Shopify Admin
- [ ] Check customer notification sent (if applicable)

**API Test:** `PUT /api/v1/integrations/shopify/stores/:storeId/fulfillments/:fulfillmentId`

### 5.3 Bulk Fulfillment Sync
- [ ] Create 5+ Shopify orders
- [ ] Sync to ShipCrowd
- [ ] Create shipments for all
- [ ] Run bulk fulfillment sync
- [ ] Verify all fulfillments pushed to Shopify
- [ ] Check sync log for batch results

**API Test:** `POST /api/v1/integrations/shopify/stores/:id/sync/fulfillments`

---

## ✅ Phase 6: Cache Optimization Verification (10 min)

### 6.1 Verify Fast Order Appearance
- [ ] Note current time
- [ ] Create order in Shopify Admin
- [ ] DO NOT refresh ShipCrowd page
- [ ] Wait exactly 30 seconds
- [ ] Order should appear automatically (React Query refetch)
- [ ] If not, click to another tab and back (refetchOnWindowFocus)
- [ ] Verify order appears immediately
- [ ] **Total time from creation to visibility: < 60 seconds** ✅

### 6.2 Check Browser DevTools
- [ ] Open ShipCrowd Orders page
- [ ] Open DevTools → Network tab
- [ ] Filter for `/api/orders` or `/api/v1/orders`
- [ ] Watch for automatic API calls every ~30 seconds
- [ ] Verify `staleTime` behavior
- [ ] Click away to another tab
- [ ] Click back to Orders tab
- [ ] Verify immediate API call (refetchOnWindowFocus)

### 6.3 Backend Cache Verification
- [ ] Check server logs after order creation
- [ ] Verify cache invalidation message:
  - `Invalidate order cache after Shopify sync`
- [ ] Create another order
- [ ] Check Redis (if accessible):
```bash
redis-cli
KEYS company:*:orders
# Should show cache keys
# Create order, then check again - cache should be invalidated
```

### 6.4 Multi-Channel Cache Test
- [ ] Create order in Shopify
- [ ] Verify appears quickly
- [ ] Create order in WooCommerce (if connected)
- [ ] Verify also appears quickly
- [ ] Both should invalidate caches independently

**Expected Result:** All channels benefit from cache optimization (30-60 sec visibility).

---

## ✅ Phase 7: Data Quality & Edge Cases (20 min)

### 7.1 Orders with Missing Customer Data
- [ ] In Shopify, create warehouse fulfillment order (no customer)
- [ ] Or create order via Shopify Draft Orders with minimal data
- [ ] Sync to ShipCrowd
- [ ] Open order details
- [ ] Verify graceful handling:
  - [ ] "No customer" instead of "Guest Customer"
  - [ ] "No email provided" instead of "N/A"
  - [ ] "No phone number" instead of showing "N/A"
  - [ ] "No shipping address provided" for missing address
- [ ] Verify UI shows missing data with proper styling (italic, muted text)

### 7.2 Orders with Special Characters
- [ ] Create Shopify order with:
  - Customer name: `José García O'Brien`
  - Address: `123 Main St., Apt #5B`
  - Product: `T-Shirt - Size L/XL (Blue/Green)`
- [ ] Sync to ShipCrowd
- [ ] Verify all special characters preserved
- [ ] Check database encoding
- [ ] Verify display in UI

### 7.3 High-Value Orders
- [ ] Create order with value > ₹50,000
- [ ] Verify syncs correctly
- [ ] Check if flagged for special handling
- [ ] Verify totals calculated correctly

### 7.4 Multi-Product Orders
- [ ] Create order with 10+ different products
- [ ] Include quantity > 1 for some items
- [ ] Sync to ShipCrowd
- [ ] Verify all line items present
- [ ] Check quantities correct
- [ ] Verify totals match

### 7.5 Refunded Orders
- [ ] Create and fulfill order in Shopify
- [ ] Process full refund
- [ ] Sync to ShipCrowd
- [ ] Verify payment status updated
- [ ] Check status history

### 7.6 Partial Fulfillments
- [ ] Create multi-product order
- [ ] Fulfill only some items in Shopify
- [ ] Sync to ShipCrowd
- [ ] Verify partial fulfillment tracked
- [ ] Check remaining items status

---

## ✅ Phase 8: Product & Inventory (10 min)

### 8.1 Product Update Webhook
- [ ] In Shopify, update product details:
  - Change title
  - Update SKU
  - Modify price
- [ ] Wait for `products/update` webhook
- [ ] Check ShipCrowd product mapping
- [ ] Verify updates reflected

**API Endpoint:** `POST /api/v1/webhooks/shopify/products/update`

### 8.2 Inventory Level Webhook
- [ ] In Shopify, adjust inventory for a product
- [ ] Wait for `inventory_levels/update` webhook
- [ ] Check ShipCrowd inventory sync
- [ ] Verify levels updated

**API Endpoint:** `POST /api/v1/webhooks/shopify/inventory_levels/update`

### 8.3 Product Mapping
- [ ] Navigate to product mapping UI (if available)
- [ ] Map Shopify products to ShipCrowd products
- [ ] Save mappings
- [ ] Create order with mapped product
- [ ] Verify SKU resolution works correctly

---

## ✅ Phase 9: Error Handling & Recovery (15 min)

### 9.1 Network Failures
- [ ] Disconnect internet
- [ ] Try manual sync
- [ ] Verify proper error message
- [ ] Reconnect internet
- [ ] Retry sync
- [ ] Verify recovery

### 9.2 Invalid Token
- [ ] Manually invalidate access token in DB (dev only)
- [ ] Try syncing orders
- [ ] Verify error caught and logged
- [ ] Verify user prompted to reconnect

### 9.3 Shopify API Rate Limiting
- [ ] Trigger rapid API calls (sync large order set)
- [ ] Monitor for rate limit errors
- [ ] Verify backoff/retry logic
- [ ] Check queue processing

### 9.4 Webhook Delivery Failures
- [ ] Stop server
- [ ] Create order in Shopify
- [ ] Restart server
- [ ] Trigger manual sync
- [ ] Verify order still syncs (webhook retry or manual catch)

### 9.5 Duplicate Prevention
- [ ] Sync same orders twice (manual)
- [ ] Verify no duplicates created
- [ ] Check logs for "Order already exists" skips
- [ ] Verify existing orders updated, not duplicated

---

## ✅ Phase 10: Disconnect & Cleanup (5 min)

### 10.1 Store Disconnection
- [ ] Go to store details page
- [ ] Click "Disconnect Store" button
- [ ] Confirm in dialog
- [ ] Verify store removed from integrations list
- [ ] Check Shopify Admin → Settings → Notifications → Webhooks
- [ ] Verify all ShipCrowd webhooks unregistered
- [ ] Verify orders remain in ShipCrowd (data not deleted)
- [ ] Try syncing after disconnect (should fail gracefully)

**API Test:** `DELETE /api/v1/integrations/shopify/stores/:id`

### 10.2 App Uninstall Webhook
- [ ] In Shopify Admin, uninstall the ShipCrowd app
- [ ] Verify `app/uninstalled` webhook received
- [ ] Check ShipCrowd automatically marks store as inactive
- [ ] Verify access token invalidated

**API Endpoint:** `POST /api/v1/webhooks/shopify/app/uninstalled`

---

## 🎯 Complete Testing Matrix

| Feature | Manual Test | API Test | Webhook Test | Time |
|---------|------------|----------|--------------|------|
| OAuth Connection | ✅ | ✅ | - | 5 min |
| Store List | ✅ | ✅ | - | 2 min |
| Store Details | ✅ | ✅ | - | 3 min |
| Settings | ✅ | ✅ | - | 5 min |
| Pause/Resume | ✅ | ✅ | - | 5 min |
| Manual Sync (Recent) | ✅ | ✅ | - | 5 min |
| Manual Sync (Full) | ✅ | ✅ | - | 5 min |
| Sync Logs | ✅ | ✅ | - | 3 min |
| Order Created | ✅ | - | ✅ | 3 min |
| Order Updated | ✅ | - | ✅ | 3 min |
| Order Cancelled | ✅ | - | ✅ | 3 min |
| Order Fulfilled | ✅ | - | ✅ | 3 min |
| HMAC Verification | - | ✅ | ✅ | 5 min |
| Webhook Registration | ✅ | - | - | 5 min |
| Create Fulfillment | ✅ | ✅ | - | 5 min |
| Update Tracking | ✅ | ✅ | - | 3 min |
| Bulk Fulfillment | ✅ | ✅ | - | 5 min |
| Cache Speed Test | ✅ | - | - | 5 min |
| DevTools Monitoring | ✅ | - | - | 5 min |
| Missing Customer Data | ✅ | - | - | 3 min |
| Special Characters | ✅ | - | - | 3 min |
| High-Value Orders | ✅ | - | - | 2 min |
| Multi-Product | ✅ | - | - | 3 min |
| Refunds | ✅ | - | - | 3 min |
| Partial Fulfillment | ✅ | - | - | 3 min |
| Product Update | ✅ | - | ✅ | 2 min |
| Inventory Update | ✅ | - | ✅ | 2 min |
| Product Mapping | ✅ | - | - | 5 min |
| Network Failures | ✅ | - | - | 3 min |
| Invalid Token | ✅ | - | - | 3 min |
| Rate Limiting | ✅ | ✅ | - | 5 min |
| Webhook Failures | ✅ | - | - | 5 min |
| Duplicate Prevention | ✅ | - | - | 3 min |
| Disconnect | ✅ | ✅ | - | 3 min |
| App Uninstall | ✅ | - | ✅ | 2 min |

**Total Estimated Time:** ~2.5 hours for complete testing

---

## 🐛 Known Issues & Workarounds

| Issue | Status | Workaround |
|-------|--------|------------|
| HMAC bypass in development | Expected | Set `NODE_ENV=development` for dev stores |
| Webhooks not received on localhost | Expected | Use ngrok for local testing |
| Protected customer data access | Shopify Approval Required | Use development stores |
| Rate limiting during bulk sync | Expected | Implemented with retry logic |

---

## 📝 Test Report Template

```markdown
## Shopify Integration Test Report

**Date:** 2025-02-15
**Tester:** [Your Name]
**Environment:** Development / Staging / Production
**Store:** [Store Domain]

### Test Results Summary
- Total Tests: 35
- Passed: __
- Failed: __
- Skipped: __

### Failed Tests
1. [Test Name] - [Reason] - [Priority: High/Medium/Low]

### Performance Metrics
- OAuth Connection: __ seconds
- Manual Sync (100 orders): __ seconds
- Webhook → UI Visibility: __ seconds (Target: <60s)
- Fulfillment Push: __ seconds

### Notes
[Any observations, concerns, or recommendations]
```

---

## 🚀 Next Steps After Testing

1. ✅ Mark completed tests
2. 📋 Document any bugs found
3. 🔧 Fix critical issues
4. 🔄 Retest failed scenarios
5. 📊 Generate test report
6. ✨ Test WooCommerce (see WOOCOMMERCE_TESTING_GUIDE.md)
