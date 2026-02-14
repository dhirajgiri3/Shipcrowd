# Shopify Channel Integration Testing Guide (Manual)

This guide walks you through manually testing all Shopify channel integration features: OAuth connection, order syncing, webhooks, fulfillment push, and related functionality.

---

## 1. Prerequisites

### 1.1 Environment Setup

**Server `.env` (required):**

```env
# Shopify App Credentials (from Shopify Partners Dashboard)
SHOPIFY_API_KEY=<your_shopify_api_key>
SHOPIFY_API_SECRET=<your_shopify_api_secret>
SHOPIFY_WEBHOOK_SECRET=<your_webhook_secret>

# URLs (must be publicly accessible for OAuth callback & webhooks)
BACKEND_URL=https://your-ngrok-url.ngrok-free.app   # or your deployed API URL
FRONTEND_URL=http://localhost:3000                   # or your deployed app URL
```

**Client `.env.local` (optional):**

```env
NEXT_PUBLIC_API_URL=http://localhost:5005   # or your backend URL
```

### 1.2 Shopify Development Store

1. Create a [Shopify Partners](https://partners.shopify.com/) account.
2. Create a **Development Store** (free).
3. In Partners Dashboard → **Apps** → **Create app** → **Create app manually**.
4. Configure the app:
   - **App URL:** `https://your-frontend-url` (e.g. `http://localhost:3000` for dev)
   - **Allowed redirection URL(s):**  
     `https://your-backend-url/api/v1/integrations/shopify/callback`  
     (Use ngrok URL for local dev, e.g. `https://abc123.ngrok-free.app/api/v1/integrations/shopify/callback`)

### 1.3 ngrok (for Local Development)

Shopify OAuth and webhooks require a **public URL**. Use ngrok to expose your local server:

```bash
# Install ngrok
brew install ngrok   # macOS

# Expose backend (default port 5005)
ngrok http 5005
```

Copy the HTTPS URL (e.g. `https://abc123.ngrok-free.app`) and set:

- `BACKEND_URL=https://abc123.ngrok-free.app`
- Update Shopify app redirect URL in Partners Dashboard
- Restart the server after changing `.env`

---

## 2. OAuth Connection Flow

### 2.1 Initiate OAuth

**Flow:** User enters store domain → Clicks Connect → Redirected to Shopify for authorization

**Steps:**

1. Start server: `cd server && npm run dev`
2. Start client: `cd client && npm run dev`
3. Log in as a seller (owner or admin role).
4. Go to **Integrations** → **Shopify** → **Connect Store** (or `/seller/integrations/shopify/setup`).
5. Enter your development store domain:
   - Full: `your-store.myshopify.com`
   - Short: `your-store` (`.myshopify.com` is added automatically)
6. Click **Connect Store**.
7. You should be redirected to Shopify’s OAuth authorization page.
8. Click **Install app** / **Authorize**.
9. You should be redirected back to Shipcrowd with `?status=success&store=...&storeId=...`.

**Expected:**

- Success redirect to `/seller/integrations/shopify/setup?status=error` or `?status=success&store=...&storeId=...`
- On success: “Connected to [store name]” with green badge
- Store appears in Integrations list

**API Reference:**

- `GET /api/v1/integrations/shopify/install?shop=your-store.myshopify.com` (requires auth)
- Returns: `{ installUrl: "https://..." }`

### 2.2 OAuth Callback (Error Handling)

**Steps:**

1. Disconnect the store (or use a fresh store).
2. Manually visit:  
   `GET /api/v1/integrations/shopify/callback?shop=...&code=...&hmac=...&state=...&timestamp=...`  
   with invalid/missing params.
3. You should be redirected to:  
   `/seller/integrations/shopify/setup?status=error&message=...`

---

## 3. Store Management

### 3.1 List Connected Stores

**Steps:**

1. Go to **Integrations** (`/seller/integrations`).
2. Confirm your Shopify store appears with:
   - Store name
   - Domain
   - Status (Active/Inactive)
   - Sync health stats (if available)

**API:** `GET /api/v1/integrations/shopify/stores`

### 3.2 Store Details

**Steps:**

1. From Integrations, click the Shopify store.
2. Or go to `/seller/integrations/shopify/[storeId]`.
3. Verify:
   - Store name, domain, connection status
   - Stats: Sync Health, Total Orders Synced, Last Sync, Connection
   - Recent Sync Activity
   - **Settings** and **Disconnect** buttons

**API:** `GET /api/v1/integrations/shopify/stores/:id`

### 3.3 Test Connection

**Steps:**

1. On the store details page, use **Test Connection** (if exposed in UI).
2. Or call: `POST /api/v1/integrations/shopify/stores/:id/test`
3. Expect: `{ connected: true }` when valid.

### 3.4 Update Settings

**Steps:**

1. Go to **Settings** for the store (`/seller/integrations/shopify/[storeId]/settings`).
2. Change sync frequency, auto-tracking, etc.
3. Save and confirm changes persist.

**API:** `PATCH /api/v1/integrations/shopify/stores/:id/settings`

### 3.5 Pause / Resume Sync

**Steps:**

1. Pause: `POST /api/v1/integrations/shopify/stores/:id/pause`
2. Confirm store shows “Paused”.
3. Resume: `POST /api/v1/integrations/shopify/stores/:id/resume`
4. Confirm store is active again.

### 3.6 Disconnect Store

**Steps:**

1. On store details, click **Disconnect**.
2. Confirm in the dialog.
3. Store should disappear from Integrations.
4. Webhooks should be unregistered in Shopify.

**API:** `DELETE /api/v1/integrations/shopify/stores/:id`

---

## 4. Order Syncing

### 4.1 Manual Order Sync

**Flow:** Trigger sync → Fetch orders from Shopify → Create/update orders in Shipcrowd

**Steps:**

1. Ensure store is connected and not paused.
2. Go to **Sync History** (`/seller/integrations/shopify/[storeId]/sync`).
3. Click **Manual Sync**.
4. Choose:
   - **Recent Orders (24h)** – incremental
   - **All Orders** – full sync
5. Click **Start Sync**.
6. Wait for completion.
7. Check sync logs for processed/synced/failed counts.

**API:** `POST /api/v1/integrations/shopify/stores/:id/sync/orders`  
Body (optional): `{ sinceDate: "2025-02-01T00:00:00.000Z" }`

**Verify:**

- Go to **Orders** (`/seller/orders`).
- Filter/search for orders from the Shopify store.
- Orders should have `source: shopify` and correct `orderNumber`, items, addresses.

### 4.2 Sync Logs

**Steps:**

1. Go to **Sync History** (`/seller/integrations/shopify/[storeId]/sync`).
2. Filter by status: All, Success, Failed, In Progress.
3. Check each log for:
   - Trigger type (Manual, Scheduled, Webhook)
   - Status
   - Processed / Success / Failed counts
   - Duration
   - Errors (if any)

**API:** `GET /api/v1/integrations/shopify/stores/:id/sync/logs?page=1&limit=20`

---

## 5. Webhooks (Real-Time Sync)

Webhooks require a **public URL**. Use ngrok and set `BACKEND_URL` accordingly.

### 5.1 Webhook Registration

Webhooks are registered automatically during OAuth. Topics:

| Topic                  | Purpose                          |
|------------------------|----------------------------------|
| `orders/create`        | New order placed                 |
| `orders/updated`        | Order modified                   |
| `orders/cancelled`     | Order cancelled                  |
| `orders/fulfilled`     | Order fulfilled                  |
| `products/update`       | Product changed                  |
| `inventory_levels/update` | Inventory changed             |
| `app/uninstalled`      | App uninstalled                  |
| `shop/update`          | Shop settings changed            |

**Verify in Shopify Admin:**

1. Settings → Notifications → Webhooks.
2. Confirm webhook URLs point to:  
   `https://YOUR-BACKEND-URL/api/v1/webhooks/shopify/orders/create` (and similar for other topics).

### 5.2 Raw Body for HMAC

Shopify webhooks use HMAC. The app must capture the **raw request body** before JSON parsing. Check that `express.raw()` (or equivalent) is used for webhook routes and that `req.rawBody` is available for verification.

### 5.3 Test Webhooks Manually

**Option A: Create order in Shopify**

1. In Shopify Admin, create a test order.
2. Shopify sends `orders/create` to your webhook URL.
3. In Shipcrowd, confirm the order appears under **Orders** within a short time.

**Option B: Shopify Admin “Send test webhook”**

1. Shopify Admin → Settings → Notifications → Webhooks.
2. Find a webhook and use **Send test webhook**.
3. Check server logs for:
   - `Webhook verified`
   - `Processing orders/create webhook` (or equivalent)

**Option C: cURL (for debugging)**

```bash
# Generate HMAC (Node.js one-liner)
# Replace BODY and SECRET with your values
echo -n '{"id":12345}' | openssl dgst -sha256 -hmac "YOUR_SHOPIFY_WEBHOOK_SECRET" -binary | base64

# Then:
curl -X POST https://YOUR-NGROK-URL/api/v1/webhooks/shopify/orders/create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: <computed_hmac>" \
  -H "X-Shopify-Shop-Domain: your-store.myshopify.com" \
  -H "X-Shopify-Topic: orders/create" \
  -H "X-Shopify-Webhook-Id: test-123" \
  -d '{"id":12345,"name":"#1001"}'
```

### 5.4 Webhook Endpoints

| Endpoint                                      | Topic            |
|-----------------------------------------------|------------------|
| `POST /api/v1/webhooks/shopify/orders/create` | orders/create    |
| `POST /api/v1/webhooks/shopify/orders/updated`| orders/updated   |
| `POST /api/v1/webhooks/shopify/orders/cancelled` | orders/cancelled |
| `POST /api/v1/webhooks/shopify/orders/fulfilled` | orders/fulfilled |
| `POST /api/v1/webhooks/shopify/products/update`  | products/update  |
| `POST /api/v1/webhooks/shopify/inventory_levels/update` | inventory_levels/update |
| `POST /api/v1/webhooks/shopify/app/uninstalled` | app/uninstalled  |
| `POST /api/v1/webhooks/shopify/shop/update`     | shop/update      |

---

## 6. Fulfillment (Push Tracking to Shopify)

### 6.1 Create Fulfillment

**Flow:** Shipcrowd order has AWB → Push fulfillment + tracking to Shopify

**Prerequisites:**

- Order from Shopify (`source: shopify`)
- Order has `sourceId` (Shopify order ID)
- Store is active

**Steps:**

1. Sync or create a Shopify order in Shipcrowd.
2. Book a shipment for that order (get AWB).
3. Fulfillment can be created:
   - Automatically when shipment is booked (if wired in your flow), or
   - Via API:  
     `POST /api/v1/integrations/shopify/stores/:storeId/orders/:orderId/fulfill`  
     Body:  
     `{ trackingNumber, trackingCompany, trackingUrl?, notifyCustomer? }`
4. In Shopify Admin → Orders → [Order], confirm:
   - Fulfillment created
   - Tracking number and URL present
   - Customer notification sent (if `notifyCustomer: true`)

### 6.2 Update Tracking

**Steps:**

1. For an order that already has a fulfillment in Shopify.
2. Call:  
   `PUT /api/v1/integrations/shopify/stores/:storeId/fulfillments/:fulfillmentId`  
   Body:  
   `{ trackingNumber, trackingCompany, trackingUrl }`
3. Confirm tracking is updated in Shopify.

### 6.3 Sync Pending Fulfillments (Bulk)

**Steps:**

1. Ensure some Shopify orders have shipments in Shipcrowd but no fulfillment in Shopify.
2. Call: `POST /api/v1/integrations/shopify/stores/:id/sync/fulfillments`
3. Confirm fulfillments are created in Shopify for those orders.

**API:** `POST /api/v1/integrations/shopify/stores/:id/sync/fulfillments`

---

## 7. Orders Page Verification

### 7.1 Shopify Orders in Orders List

**Steps:**

1. Sync orders from Shopify (manual or webhook).
2. Go to **Orders** (`/seller/orders`).
3. Confirm:
   - Orders appear in the list
   - Source/channel shows Shopify (or equivalent badge)
   - Order number matches Shopify
   - Customer, address, items, and totals are correct

### 7.2 Order Details

**Steps:**

1. Open a Shopify-synced order.
2. Verify:
   - Order number
   - Customer info
   - Shipping address
   - Line items (SKU, name, qty, price)
   - Payment status
   - Fulfillment status
   - Tracking (if fulfillment was pushed)

### 7.3 Order Status Sync

**Steps:**

1. In Shopify Admin, cancel an order.
2. Wait for `orders/cancelled` webhook (or run manual sync).
3. In Shipcrowd, confirm the order status is CANCELLED.

---

## 8. Product Mapping (Optional)

If product mapping is used:

1. Go to product mapping UI (if available).
2. Map Shopify products/variants to Shipcrowd products.
3. Confirm mappings are used during order sync (e.g. SKU resolution).

---

## 9. End-to-End Test Scenarios

### Scenario A: New Order → Sync → Fulfill

1. Create a test order in Shopify.
2. Wait for webhook or trigger manual sync.
3. Confirm order in Shipcrowd Orders.
4. Book a shipment for the order.
5. Confirm fulfillment and tracking in Shopify.

### Scenario B: Order Update

1. In Shopify, update an existing order (e.g. address).
2. Wait for webhook or manual sync.
3. Confirm the order in Shipcrowd reflects the update.

### Scenario C: Order Cancellation

1. Cancel an order in Shopify.
2. Wait for webhook or manual sync.
3. Confirm order status is CANCELLED in Shipcrowd.

### Scenario D: Pause and Resume

1. Pause sync for the store.
2. Create a new order in Shopify.
3. Confirm it does **not** sync (or is skipped).
4. Resume sync.
5. Trigger manual sync and confirm the order appears.

---

## 10. Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | OAuth install | Redirect to Shopify, authorize, redirect back with success |
| 2 | List stores | Connected store appears |
| 3 | Store details | Stats, sync logs, settings visible |
| 4 | Test connection | `connected: true` |
| 5 | Manual order sync | Orders appear in Orders page |
| 6 | Sync logs | Logs show processed/success/failed |
| 7 | Webhook orders/create | New Shopify order syncs automatically |
| 8 | Create fulfillment | Tracking visible in Shopify |
| 9 | Pause/Resume | Pause stops sync, resume restores |
| 10 | Disconnect | Store removed, webhooks unregistered |

---

## 11. Troubleshooting

| Issue | Possible cause | Fix |
|-------|----------------|-----|
| OAuth redirect fails | Invalid redirect URL in Shopify app | Update redirect URL in Partners Dashboard to match `BACKEND_URL` |
| "Invalid HMAC" on callback | Wrong `SHOPIFY_API_SECRET` | Use API secret from Shopify app settings |
| Webhooks not received | localhost URL, ngrok down | Use ngrok, set `BACKEND_URL` to ngrok URL |
| "Invalid webhook signature" | Wrong `SHOPIFY_WEBHOOK_SECRET` or raw body | Use webhook secret from app, ensure raw body is captured |
| Orders not syncing | Store paused, wrong store | Check store is active and not paused |
| Fulfillment fails | No location in Shopify | Ensure at least one fulfillment location exists |
| "Store not found" on webhook | Store inactive or disconnected | Reconnect store, check `isActive` |

---

## 12. File Reference

| Feature | Files |
|---------|-------|
| OAuth | `server/src/core/application/services/shopify/shopify-oauth.service.ts` |
| Order sync | `server/src/core/application/services/shopify/shopify-order-sync.service.ts` |
| Webhooks | `server/src/core/application/services/shopify/shopify-webhook.service.ts` |
| Webhook controller | `server/src/presentation/http/controllers/webhooks/channels/shopify.webhook.controller.ts` |
| Fulfillment | `server/src/core/application/services/shopify/shopify-fulfillment.service.ts` |
| Shopify controller | `server/src/presentation/http/controllers/integrations/shopify.controller.ts` |
| Webhook auth | `server/src/presentation/http/middleware/webhooks/shopify-webhook-auth.middleware.ts` |
| Sync job | `server/src/infrastructure/jobs/marketplaces/shopify/shopify-order-sync.job.ts` |
| Setup UI | `client/app/seller/integrations/shopify/setup/page.tsx` |
| Store UI | `client/app/seller/integrations/shopify/[storeId]/page.tsx` |
| Sync UI | `client/app/seller/integrations/shopify/[storeId]/sync/page.tsx` |
