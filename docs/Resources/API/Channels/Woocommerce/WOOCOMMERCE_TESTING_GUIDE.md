# WooCommerce Integration - Comprehensive Testing Guide

## 🎯 Testing Overview

This document provides a systematic testing guide for WooCommerce integration, covering OAuth connection, order syncing, webhooks, fulfillment push, and real-time cache optimization.

**Key Difference from Shopify:** WooCommerce uses WooCommerce REST API with Consumer Key/Secret authentication instead of OAuth app installation.

---

## 📋 Prerequisites

### Environment Setup

**Server `.env` (required):**

```env
# WooCommerce doesn't need app-level credentials
# Each store connection uses its own Consumer Key/Secret

# URLs
BACKEND_URL=https://your-backend-url.com   # or ngrok for local dev
FRONTEND_URL=http://localhost:3000
```

**Client `.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:5005
```

### WooCommerce Store Requirements

1. **WordPress + WooCommerce installed**
   - WordPress 5.0+
   - WooCommerce 3.5+

2. **WooCommerce REST API enabled**
   - WooCommerce → Settings → Advanced → REST API
   - Or Settings → API (depending on version)

3. **SSL Certificate (HTTPS)**
   - Required for webhook delivery
   - Use Cloudflare, Let's Encrypt, or hosting provider SSL

4. **API Keys Generated**
   - WooCommerce → Settings → Advanced → REST API
   - Click "Add Key"
   - Description: "ShipCrowd Integration"
   - User: Admin user
   - Permissions: Read/Write
   - Copy Consumer Key and Consumer Secret

### ngrok Setup (for Local Testing)

```bash
# Install ngrok
brew install ngrok   # macOS

# Expose backend
ngrok http 5005

# Copy HTTPS URL and set in .env
BACKEND_URL=https://abc123.ngrok-free.app
```

---

## ✅ Phase 1: Store Connection (10 min)

### 1.1 Connect WooCommerce Store

**Flow:** User enters store URL and API credentials → ShipCrowd validates connection → Store saved

**Steps:**

1. [ ] Start server and client
2. [ ] Log in as seller (owner/admin role)
3. [ ] Navigate to **Integrations** → **WooCommerce** → **Connect Store**
4. [ ] Or go to `/seller/integrations/woocommerce/setup`
5. [ ] Fill in connection form:
   - **Store URL:** `https://your-woocommerce-store.com`
   - **Consumer Key:** `ck_xxxxxxxxxxxxxxxxxxxx`
   - **Consumer Secret:** `cs_xxxxxxxxxxxxxxxxxxxx`
   - **Store Name:** (Optional) "My WooCommerce Store"
6. [ ] Click "Test Connection"
7. [ ] Verify connection successful message
8. [ ] Click "Connect Store"
9. [ ] Verify redirect to success page
10. [ ] Confirm store appears in integrations list with:
    - [ ] Green "Connected" badge
    - [ ] Store name and URL
    - [ ] Connection date here

**API Test:**

```bash
POST /api/v1/integrations/woocommerce/stores
Content-Type: application/json

{
  "storeUrl": "https://your-store.com",
  "consumerKey": "ck_xxx",
  "consumerSecret": "cs_xxx",
  "storeName": "My Store"
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "store": {
      "_id": "...",
      "storeName": "My Store",
      "storeUrl": "https://your-store.com",
      "isActive": true,
      "connectionStatus": "connected"
    }
  }
}
```

### 1.2 Connection Validation

**Test invalid credentials:**

1. [ ] Try connecting with wrong Consumer Key
2. [ ] Verify error: "Invalid API credentials"
3. [ ] Try connecting with wrong Consumer Secret
4. [ ] Verify error: "Authentication failed"
5. [ ] Try invalid store URL (http:// instead of https://)
6. [ ] Verify error: "SSL required for webhooks"
7. [ ] Try non-existent domain
8. [ ] Verify error: "Store unreachable"

**Expected Result:** Clear error messages for each failure case.

### 1.3 Duplicate Store Prevention

1. [ ] Connect a WooCommerce store successfully
2. [ ] Try connecting the same store URL again
3. [ ] Verify error: "Store already connected"
4. [ ] Check no duplicate created in database

**Expected Result:** One store per unique URL per company.

---

## ✅ Phase 2: Store Management (10 min)

### 2.1 List Connected Stores

**Steps:**

1. [ ] Navigate to `/seller/integrations`
2. [ ] Verify WooCommerce store card displays:
   - [ ] Store name
   - [ ] Store URL
   - [ ] Connection status (Active/Inactive)
   - [ ] Last sync timestamp
   - [ ] Total orders synced
   - [ ] Sync health indicator

**API Test:** `GET /api/v1/integrations/woocommerce/stores`

### 2.2 Store Details

1. [ ] Click on WooCommerce store
2. [ ] Navigate to `/seller/integrations/woocommerce/[storeId]`
3. [ ] Verify displayed information:
   - [ ] Store name and URL
   - [ ] API connection status
   - [ ] Connection date
   - [ ] Total orders synced
   - [ ] Last sync timestamp
   - [ ] Sync success rate
   - [ ] Recent sync activity
4. [ ] Verify action buttons:
   - [ ] Settings
   - [ ] Sync Orders
   - [ ] View Sync History
   - [ ] Test Connection
   - [ ] Disconnect

**API Test:** `GET /api/v1/integrations/woocommerce/stores/:id`

### 2.3 Test Connection (Periodic)

1. [ ] Click "Test Connection" button
2. [ ] Verify API makes test call to WooCommerce
3. [ ] Confirm success message: "Connected"
4. [ ] Try with invalid credentials (update to wrong secret in DB)
5. [ ] Verify error: "Connection failed - Re-authenticate"

**API Test:** `POST /api/v1/integrations/woocommerce/stores/:id/test`

### 2.4 Update Store Settings

1. [ ] Navigate to `/seller/integrations/woocommerce/[storeId]/settings`
2. [ ] Verify settings panel shows:
   - **Sync Configuration**
     - [ ] Auto-sync enabled toggle
     - [ ] Sync frequency (Hourly/Daily/Manual)
   - **Order Filters**
     - [ ] Minimum order value
     - [ ] Order status filters (pending, processing, completed)
   - **Notifications**
     - [ ] Email on sync failure
     - [ ] Webhook notifications
3. [ ] Change sync frequency to "Daily"
4. [ ] Enable minimum order value: ₹500
5. [ ] Click "Save Settings"
6. [ ] Refresh page
7. [ ] Verify settings persisted
8. [ ] Change back to original

**API Test:**

```bash
PATCH /api/v1/integrations/woocommerce/stores/:id/settings
Content-Type: application/json

{
  "settings": {
    "autoSync": true,
    "syncFrequency": "daily",
    "orderFilters": {
      "minOrderValue": 500,
      "statuses": ["processing", "completed"]
    }
  }
}
```

### 2.5 Update API Credentials

1. [ ] Go to store settings
2. [ ] Click "Update Credentials"
3. [ ] Enter new Consumer Key/Secret
4. [ ] Click "Save"
5. [ ] Verify connection tested automatically
6. [ ] Confirm credentials updated

**API Test:** `PATCH /api/v1/integrations/woocommerce/stores/:id/credentials`

---

## ✅ Phase 3: Manual Order Sync (15 min)

### 3.1 Recent Orders Sync

**Steps:**

1. [ ] Navigate to `/seller/integrations/woocommerce/[storeId]/sync`
2. [ ] Click "Sync Orders" button
3. [ ] Select "Recent Orders (Last 7 days)"
4. [ ] Click "Start Sync"
5. [ ] Monitor progress bar
6. [ ] Wait for completion
7. [ ] Verify sync log created:
   - [ ] Status: Completed
   - [ ] Orders processed count
   - [ ] Orders synced count
   - [ ] Failed count
   - [ ] Duration
8. [ ] Navigate to `/seller/orders`
9. [ ] Filter by source: WooCommerce
10. [ ] Verify orders display with:
    - [ ] WooCommerce source badge (purple)
    - [ ] Correct order number (#1234)
    - [ ] Customer information
    - [ ] Billing/shipping address
    - [ ] Line items with SKUs
    - [ ] Payment status
    - [ ] Order status (pending/processing/completed)
    - [ ] Accurate totals

**API Test:**

```bash
POST /api/v1/integrations/woocommerce/stores/:id/sync/orders
Content-Type: application/json

{
  "sinceDate": "2025-02-08T00:00:00.000Z"
}
```

### 3.2 Full Historical Sync

1. [ ] Click "Sync Orders"
2. [ ] Select "All Orders" option
3. [ ] Click "Start Sync"
4. [ ] Wait for completion (may take several minutes)
5. [ ] Verify sync log shows all historical orders
6. [ ] Check processed vs synced counts
7. [ ] Review any failed orders and error messages

**Expected Result:** All orders synced with warehouse assignment from company defaults.

### 3.3 Sync Status Filtering

1. [ ] Create orders in WooCommerce with different statuses:
   - Pending payment
   - Processing
   - Completed
   - On-hold
   - Cancelled
   - Refunded
2. [ ] Configure sync to include only "processing" and "completed"
3. [ ] Run manual sync
4. [ ] Verify only matching statuses synced
5. [ ] Check others excluded in sync log

**Expected Result:** Status filters work correctly.

### 3.4 Sync Logs Review

1. [ ] Navigate to sync history
2. [ ] Verify columns:
   - [ ] Sync timestamp
   - [ ] Trigger (Manual/Scheduled/Webhook)
   - [ ] Status (Success/Failed/In Progress)
   - [ ] Processed count
   - [ ] Synced count
   - [ ] Failed count
   - [ ] Duration
3. [ ] Click on a sync log
4. [ ] View detailed breakdown
5. [ ] Check error details for failures

**API Test:** `GET /api/v1/integrations/woocommerce/stores/:id/sync/logs?page=1&limit=20`

---

## ✅ Phase 4: Real-Time Webhook Sync (20 min)

**Prerequisites:**
- HTTPS enabled on WooCommerce store
- ngrok running (for local dev)
- `BACKEND_URL` set to public URL
- Server restarted

### 4.1 Webhook Registration

**Automatic registration during store connection:**

1. [ ] After connecting store, verify webhooks registered in WooCommerce
2. [ ] Go to WooCommerce → Settings → Advanced → Webhooks
3. [ ] Confirm webhooks present:
   - [ ] `order.created` → `https://.../webhooks/woocommerce/orders/created`
   - [ ] `order.updated` → `https://.../webhooks/woocommerce/orders/updated`
   - [ ] `order.deleted` → `https://.../webhooks/woocommerce/orders/deleted`
   - [ ] `order.restored` → `https://.../webhooks/woocommerce/orders/restored`
4. [ ] Verify all show "Active" status
5. [ ] Check delivery URL matches `BACKEND_URL`

**API Endpoints:**
- `POST /api/v1/webhooks/woocommerce/orders/created`
- `POST /api/v1/webhooks/woocommerce/orders/updated`
- `POST /api/v1/webhooks/woocommerce/orders/deleted`
- `POST /api/v1/webhooks/woocommerce/orders/restored`

### 4.2 Order Created Webhook

**Steps:**

1. [ ] Go to WooCommerce Admin
2. [ ] Click "Orders" → "Add Order"
3. [ ] Fill in customer details:
   - First name, Last name
   - Email, Phone
   - Billing address
   - Shipping address
4. [ ] Add products (2-3 items)
5. [ ] Set payment method: "Cash on delivery"
6. [ ] Click "Create"
7. [ ] **Start timer** ⏱️
8. [ ] Wait 30-60 seconds
9. [ ] Check ShipCrowd Orders page
10. [ ] Verify new order appears:
    - [ ] Source: WooCommerce badge
    - [ ] Order number matches (#1234)
    - [ ] Customer data populated
    - [ ] Products synced correctly
    - [ ] Status: `pending` or `processing`
    - [ ] Payment method: COD
11. [ ] **Stop timer** - should be under 60 seconds ✅
12. [ ] Check server logs:
    - `Webhook signature verified`
    - `Processing order.created webhook`
    - `WooCommerce order synced`
    - `Invalidate order cache`

**Expected Result:** Order appears in UI within 30-60 seconds.

### 4.3 Order Updated Webhook

1. [ ] In WooCommerce, open the test order
2. [ ] Edit customer shipping address
3. [ ] Change order status to "Processing"
4. [ ] Click "Update"
5. [ ] Wait 30-60 seconds
6. [ ] Refresh ShipCrowd order details
7. [ ] Verify:
   - [ ] Address updated
   - [ ] Status changed to `processing`
   - [ ] Status history shows update
   - [ ] Cache invalidated (check logs)

**Expected Result:** Updates reflected within 60 seconds.

### 4.4 Order Completed Webhook

1. [ ] Mark WooCommerce order as "Completed"
2. [ ] Wait 30-60 seconds
3. [ ] Check ShipCrowd order
4. [ ] Verify status changed to `delivered` or `completed`
5. [ ] Check status history

### 4.5 Order Cancelled/Deleted Webhook

1. [ ] Cancel order in WooCommerce
2. [ ] Wait 30-60 seconds
3. [ ] Verify ShipCrowd order status: `cancelled`
4. [ ] Try deleting order (move to trash)
5. [ ] Verify `order.deleted` webhook received
6. [ ] Check appropriate handling (soft delete or status update)

### 4.6 Webhook Signature Verification

**WooCommerce uses HMAC-SHA256 signature:**

1. [ ] Check server logs for webhook processing
2. [ ] Verify "Webhook signature verified" before processing
3. [ ] Try sending invalid webhook:

```bash
curl -X POST http://localhost:5005/api/v1/webhooks/woocommerce/orders/created \
  -H "Content-Type: application/json" \
  -H "X-WC-Webhook-Signature: invalid_signature" \
  -H "X-WC-Webhook-Source: https://your-store.com" \
  -H "X-WC-Webhook-Topic: order.created" \
  -d '{"id":12345}'
```

4. [ ] Verify request rejected with 401
5. [ ] Check logs for "Invalid webhook signature"

**Expected Result:** Signature validation prevents unauthorized calls.

### 4.7 Webhook Delivery Test (from WooCommerce)

1. [ ] WooCommerce → Settings → Advanced → Webhooks
2. [ ] Click on "order.created" webhook
3. [ ] Scroll to "Logs" section
4. [ ] Check recent deliveries
5. [ ] Verify HTTP 200 responses
6. [ ] Check for failed deliveries (should be none)
7. [ ] Click "View" on a delivery
8. [ ] Verify request and response details

---

## ✅ Phase 5: Fulfillment & Tracking Push (15 min)

### 5.1 Create Order Note with Tracking

**WooCommerce doesn't have native fulfillment API, so we use order notes:**

1. [ ] Sync WooCommerce order to ShipCrowd
2. [ ] Create shipment in ShipCrowd
3. [ ] Get AWB/tracking number
4. [ ] Trigger tracking push to WooCommerce
5. [ ] Go to WooCommerce Admin → Orders → [Order]
6. [ ] Verify:
   - [ ] Order note added with tracking info
   - [ ] Note visible to customer (if configured)
   - [ ] Tracking number and URL included
   - [ ] Courier name mentioned

**API Test:**

```bash
POST /api/v1/integrations/woocommerce/stores/:storeId/orders/:orderId/fulfill
Content-Type: application/json

{
  "trackingNumber": "SHIP123456789",
  "trackingCompany": "Delhivery",
  "trackingUrl": "https://www.delhivery.com/track/package/SHIP123456789",
  "notifyCustomer": true
}
```

### 5.2 Update Order Status on Fulfillment

1. [ ] Configure fulfillment to auto-update order status
2. [ ] Create shipment for WooCommerce order
3. [ ] Verify WooCommerce order status changes to "Completed"
4. [ ] Check customer email sent (if WooCommerce is configured)

### 5.3 Custom Order Meta for Tracking

**If using WooCommerce tracking plugins:**

1. [ ] Push tracking to WooCommerce custom meta fields
2. [ ] Verify `_tracking_number`, `_tracking_provider` set
3. [ ] Check if WooCommerce tracking plugins display data

### 5.4 Bulk Fulfillment Sync

1. [ ] Create 5+ WooCommerce orders
2. [ ] Sync to ShipCrowd
3. [ ] Create shipments for all
4. [ ] Run bulk fulfillment sync
5. [ ] Verify tracking pushed to all WooCommerce orders
6. [ ] Check sync log for results

**API Test:** `POST /api/v1/integrations/woocommerce/stores/:id/sync/fulfillments`

---

## ✅ Phase 6: Cache Optimization & Performance (10 min)

### 6.1 Fast Order Visibility Test

1. [ ] Open ShipCrowd Orders page
2. [ ] Note current time
3. [ ] Create order in WooCommerce
4. [ ] DO NOT refresh page
5. [ ] Wait 30 seconds
6. [ ] Order should auto-appear (React Query refetch)
7. [ ] If not, click to another tab and back
8. [ ] Verify order appears immediately
9. [ ] **Total time: < 60 seconds** ✅

### 6.2 DevTools Network Monitoring

1. [ ] Open DevTools → Network
2. [ ] Filter for `/api/orders`
3. [ ] Watch for automatic API calls every ~30 seconds
4. [ ] Create WooCommerce order
5. [ ] Wait for next auto-refetch (max 30s)
6. [ ] Verify new order appears

### 6.3 Backend Cache Invalidation

1. [ ] Check server logs after order creation
2. [ ] Verify cache invalidation message:
   - `Invalidate order cache after WooCommerce sync`
3. [ ] Monitor Redis cache (if accessible)
4. [ ] Verify cache tags cleared

### 6.4 Webhook → UI Latency

1. [ ] Use server logs to track timing:
   - Webhook received timestamp
   - Order saved timestamp
   - Cache invalidated timestamp
2. [ ] Calculate backend processing time
3. [ ] Add frontend refetch time (max 30s)
4. [ ] **Total latency: < 60 seconds** ✅

---

## ✅ Phase 7: Data Quality & Edge Cases (20 min)

### 7.1 Guest Checkout Orders

1. [ ] In WooCommerce, enable guest checkout
2. [ ] Create order without customer account
3. [ ] Use minimal info (name + email only)
4. [ ] Sync to ShipCrowd
5. [ ] Verify:
   - [ ] Customer name populated
   - [ ] Email present
   - [ ] "No phone number" shown gracefully
   - [ ] No account reference

### 7.2 Virtual/Downloadable Products

1. [ ] Create WooCommerce order with virtual products
2. [ ] Sync to ShipCrowd
3. [ ] Verify:
   - [ ] Products synced
   - [ ] No shipping address required
   - [ ] Handled appropriately (may skip shipping)

### 7.3 Variable Products

1. [ ] Create order with variable products (different sizes/colors)
2. [ ] Sync to ShipCrowd
3. [ ] Verify:
   - [ ] Variation details captured
   - [ ] SKU from variation used
   - [ ] Attributes visible (Size: L, Color: Blue)

### 7.4 Coupons & Discounts

1. [ ] Create WooCommerce order with coupon applied
2. [ ] Sync to ShipCrowd
3. [ ] Verify:
   - [ ] Discount amount captured
   - [ ] Totals match (subtotal - discount + tax + shipping)
   - [ ] Coupon code visible

### 7.5 Tax Calculations

1. [ ] Enable tax in WooCommerce
2. [ ] Create order with multiple tax rates
3. [ ] Sync to ShipCrowd
4. [ ] Verify:
   - [ ] Tax amount matches
   - [ ] Tax breakdown visible
   - [ ] Totals calculated correctly

### 7.6 Multi-Currency Orders

1. [ ] Install WooCommerce multi-currency plugin
2. [ ] Create order in USD or EUR
3. [ ] Sync to ShipCrowd
4. [ ] Verify:
   - [ ] Currency converted to INR
   - [ ] Exchange rate applied
   - [ ] Original currency noted

### 7.7 Shipping Methods

1. [ ] Create orders with different shipping methods:
   - Flat rate
   - Free shipping
   - Local pickup
2. [ ] Sync all to ShipCrowd
3. [ ] Verify shipping costs correct

### 7.8 Payment Gateways

1. [ ] Create orders with different payment methods:
   - COD
   - Credit card
   - PayPal
   - Razorpay
2. [ ] Sync to ShipCrowd
3. [ ] Verify payment method captured
4. [ ] Check payment status (paid/pending/failed)

---

## ✅ Phase 8: Product & Inventory Sync (10 min)

### 8.1 Product Mapping

1. [ ] Navigate to product mapping UI
2. [ ] Map WooCommerce products to ShipCrowd inventory
3. [ ] Use SKU matching or manual mapping
4. [ ] Save mappings
5. [ ] Create order with mapped product
6. [ ] Verify inventory deduction

### 8.2 Inventory Updates (if implemented)

1. [ ] Update stock in ShipCrowd
2. [ ] Push to WooCommerce
3. [ ] Verify WooCommerce stock updated
4. [ ] Check stock status (in stock/out of stock)

### 8.3 Low Stock Alerts

1. [ ] Set low stock threshold
2. [ ] Sync product with low stock
3. [ ] Verify alert triggered (if implemented)

---

## ✅ Phase 9: Error Handling & Recovery (15 min)

### 9.1 API Authentication Failure

1. [ ] Change Consumer Secret in WooCommerce
2. [ ] Try syncing orders
3. [ ] Verify error: "Authentication failed"
4. [ ] Update credentials in ShipCrowd
5. [ ] Retry sync
6. [ ] Verify recovery

### 9.2 Network Timeouts

1. [ ] Simulate slow network (use browser DevTools)
2. [ ] Trigger manual sync
3. [ ] Verify timeout handling
4. [ ] Check retry logic

### 9.3 Invalid WooCommerce Data

1. [ ] Create order with invalid/missing data
2. [ ] Sync to ShipCrowd
3. [ ] Verify:
   - [ ] Error logged clearly
   - [ ] Order skipped (not partially synced)
   - [ ] Other orders still process

### 9.4 Webhook Delivery Failures

1. [ ] Stop ShipCrowd server
2. [ ] Create order in WooCommerce
3. [ ] Restart server
4. [ ] Trigger manual sync
5. [ ] Verify order still syncs (catch-up mechanism)

### 9.5 Duplicate Prevention

1. [ ] Sync same orders twice
2. [ ] Verify no duplicates created
3. [ ] Check logs for "already exists" skips
4. [ ] Verify updates applied to existing orders

---

## ✅ Phase 10: Disconnect & Cleanup (5 min)

### 10.1 Disconnect Store

1. [ ] Go to store details page
2. [ ] Click "Disconnect Store"
3. [ ] Confirm in dialog
4. [ ] Verify store removed from integrations
5. [ ] Check WooCommerce → Webhooks
6. [ ] Verify ShipCrowd webhooks removed/deactivated
7. [ ] Verify orders remain in ShipCrowd (data preserved)

**API Test:** `DELETE /api/v1/integrations/woocommerce/stores/:id`

### 10.2 Reconnection After Disconnect

1. [ ] Disconnect store
2. [ ] Reconnect same store
3. [ ] Verify webhooks re-registered
4. [ ] Trigger sync
5. [ ] Verify no duplicates created
6. [ ] Check existing orders updated

---

## 🎯 Complete Testing Checklist

| # | Feature | Test Type | Time | Status |
|---|---------|-----------|------|--------|
| 1 | Store Connection | Manual + API | 5 min | ⬜ |
| 2 | Invalid Credentials | Manual | 5 min | ⬜ |
| 3 | Duplicate Prevention | Manual | 2 min | ⬜ |
| 4 | Store List | Manual + API | 2 min | ⬜ |
| 5 | Store Details | Manual + API | 3 min | ⬜ |
| 6 | Test Connection | Manual + API | 2 min | ⬜ |
| 7 | Update Settings | Manual + API | 5 min | ⬜ |
| 8 | Update Credentials | Manual + API | 3 min | ⬜ |
| 9 | Recent Orders Sync | Manual + API | 5 min | ⬜ |
| 10 | Full Historical Sync | Manual + API | 5 min | ⬜ |
| 11 | Sync Status Filtering | Manual | 5 min | ⬜ |
| 12 | Sync Logs Review | Manual + API | 3 min | ⬜ |
| 13 | Webhook Registration | Manual | 3 min | ⬜ |
| 14 | Order Created Webhook | Webhook | 3 min | ⬜ |
| 15 | Order Updated Webhook | Webhook | 3 min | ⬜ |
| 16 | Order Completed Webhook | Webhook | 2 min | ⬜ |
| 17 | Order Cancelled Webhook | Webhook | 2 min | ⬜ |
| 18 | Webhook Signature Verify | API + Webhook | 5 min | ⬜ |
| 19 | Webhook Delivery Test | Manual | 3 min | ⬜ |
| 20 | Tracking Push (Note) | Manual + API | 5 min | ⬜ |
| 21 | Status Update on Ship | Manual | 3 min | ⬜ |
| 22 | Custom Meta Tracking | Manual | 3 min | ⬜ |
| 23 | Bulk Fulfillment Sync | API | 5 min | ⬜ |
| 24 | Fast Order Visibility | Manual | 3 min | ⬜ |
| 25 | DevTools Monitoring | Manual | 3 min | ⬜ |
| 26 | Cache Invalidation | Manual | 3 min | ⬜ |
| 27 | Webhook Latency | Manual | 3 min | ⬜ |
| 28 | Guest Checkout | Manual | 3 min | ⬜ |
| 29 | Virtual Products | Manual | 3 min | ⬜ |
| 30 | Variable Products | Manual | 3 min | ⬜ |
| 31 | Coupons & Discounts | Manual | 3 min | ⬜ |
| 32 | Tax Calculations | Manual | 3 min | ⬜ |
| 33 | Multi-Currency | Manual | 3 min | ⬜ |
| 34 | Shipping Methods | Manual | 3 min | ⬜ |
| 35 | Payment Gateways | Manual | 3 min | ⬜ |
| 36 | Product Mapping | Manual | 5 min | ⬜ |
| 37 | Inventory Sync | Manual | 3 min | ⬜ |
| 38 | Auth Failure Recovery | Manual | 5 min | ⬜ |
| 39 | Network Timeouts | Manual | 3 min | ⬜ |
| 40 | Invalid Data Handling | Manual | 3 min | ⬜ |
| 41 | Webhook Failures | Manual | 5 min | ⬜ |
| 42 | Duplicate Prevention | Manual | 3 min | ⬜ |
| 43 | Disconnect Store | Manual + API | 3 min | ⬜ |
| 44 | Reconnection | Manual | 5 min | ⬜ |

**Total Estimated Time:** ~2.5 hours

---

## 🔍 Key Differences: WooCommerce vs Shopify

| Feature | WooCommerce | Shopify |
|---------|-------------|---------|
| **Auth Method** | Consumer Key/Secret (API keys) | OAuth 2.0 (app installation) |
| **Connection Flow** | Direct credentials entry | OAuth redirect flow |
| **Webhook Signature** | HMAC-SHA256 with secret | HMAC-SHA256 with webhook secret |
| **Fulfillment API** | No native API (use order notes) | Native fulfillment API |
| **Product Sync** | WooCommerce REST API | Shopify Admin API |
| **Inventory Sync** | Stock quantity API | Inventory levels API |
| **Multi-Store** | One key per store | One app, multiple installs |
| **Webhook Topics** | `order.created`, `order.updated` | `orders/create`, `orders/updated` |
| **SSL Requirement** | Required for webhooks | Required for production |

---

## 📋 Test Report Template

```markdown
## WooCommerce Integration Test Report

**Date:** 2025-02-15
**Tester:** [Your Name]
**Environment:** Development / Staging / Production
**Store URL:** [Store URL]

### Test Results Summary
- Total Tests: 44
- Passed: __
- Failed: __
- Skipped: __

### Failed Tests
1. [Test Name] - [Reason] - [Priority: High/Medium/Low]

### Performance Metrics
- Store Connection: __ seconds
- Manual Sync (100 orders): __ seconds
- Webhook → UI Visibility: __ seconds (Target: <60s)
- Fulfillment Push: __ seconds

### Issues Found
- [ ] [Issue description] - [Severity] - [Status]

### Notes
[Any observations, concerns, or recommendations]
```

---

## 🐛 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "REST API disabled" | WooCommerce API not enabled | Enable in WooCommerce → Settings → Advanced → REST API |
| "Consumer key invalid" | Wrong credentials | Regenerate keys in WooCommerce |
| "SSL required" | Store uses HTTP | Install SSL certificate |
| Webhooks not delivered | Firewall/server blocking | Whitelist WooCommerce IPs, use ngrok for local |
| "Signature verification failed" | Secret mismatch | Verify webhook secret matches |
| Orders not syncing | Wrong status filter | Check order status mapping |
| Product SKU mismatch | Mapping not configured | Set up product mapping |

---

## 🚀 Next Steps

1. ✅ Complete all 44 test cases
2. 📋 Document any bugs or issues
3. 🔧 Fix critical problems
4. 🔄 Retest failed scenarios
5. 📊 Generate detailed test report
6. ✨ Move to Amazon/Flipkart testing

---

## 📚 Related Documentation

- [Shopify Testing Guide](../Shopify/SHOPIFY_COMPREHENSIVE_TESTING.md)
- [Amazon Testing Guide](../Amazon/AMAZON_TESTING_GUIDE.md) (Coming soon)
- [Flipkart Testing Guide](../Flipkart/FLIPKART_TESTING_GUIDE.md) (Coming soon)
- [Cache Optimization Guide](../../CACHE_OPTIMIZATION.md)
