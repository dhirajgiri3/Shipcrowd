# Shopify 403 Error Fix Guide

## Problem

When trying to sync orders from Shopify, you're getting a **403 Forbidden** error:

```
2026-02-15 03:26:23 error: Shopify API error
2026-02-15 03:26:23 error: Order sync failed (transaction rolled back)
2026-02-15 03:26:23 error: Request failed with status code 403
```

## Root Cause

The 403 error occurs because your Shopify app doesn't have the required API scopes (permissions) to read orders. This commonly happens when:

1. **App was installed before scopes were updated** - The access token doesn't include new permissions
2. **Scopes were never properly granted** - The OAuth flow didn't request all necessary scopes
3. **API version incompatibility** - Using an incorrect or future API version

## Fixes Applied

### 1. Fixed API Version ✅

**File:** `server/src/infrastructure/external/ecommerce/shopify/shopify.client.ts`

**Changed:** Line 64
```typescript
// Before
this.apiVersion = config.apiVersion || '2026-01';

// After
this.apiVersion = config.apiVersion || '2025-01';
```

The API version was set to `2026-01` (future version) which Shopify doesn't support. Changed to `2025-01`.

### 2. Added Diagnostic Endpoint ✅

**New endpoint:** `GET /api/v1/integrations/shopify/stores/:id/diagnose`

This endpoint checks:
- Current scopes on the access token
- Required scopes for full functionality
- Missing scopes that need to be added
- Whether the app can actually read orders
- Shop information to confirm connection

### 3. Required Scopes

The following scopes are required (defined in `shopify-oauth.service.ts:59-69`):

```
read_orders          ✓ Read order data
write_orders         ✓ Update order status
read_products        ✓ Read product catalog
write_products       ✓ Sync product data
write_inventory      ✓ Update inventory levels
read_fulfillments    ✓ Read fulfillment data
write_fulfillments   ✓ Create/update fulfillments
read_locations       ✓ Read store locations
read_shipping        ✓ Read shipping info
```

## How to Fix (Step-by-Step)

### Step 1: Run Diagnostics

First, check what scopes your app currently has:

```bash
# Get your store ID from the UI or API
GET /api/v1/integrations/shopify/stores/:storeId/diagnose
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "hasRequiredScopes": false,
    "currentScopes": ["read_products", "write_products"],
    "requiredScopes": ["read_orders", "write_orders", ...],
    "missingScopes": ["read_orders", "write_orders", ...],
    "canReadOrders": false,
    "shopInfo": {
      "name": "Your Store Name",
      "domain": "your-store.myshopify.com",
      ...
    }
  }
}
```

If `canReadOrders: false` and `missingScopes` includes `read_orders`, you need to reinstall the app.

### Step 2: Disconnect Current Store

**Option A: Via UI**
1. Go to **Integrations** → **Shopify**
2. Click on your connected store
3. Click **Disconnect**
4. Confirm the action

**Option B: Via API**
```bash
DELETE /api/v1/integrations/shopify/stores/:storeId
```

This will:
- Unregister all webhooks
- Mark the store as inactive
- Clean up the connection

### Step 3: Verify Shopify App Configuration

Before reconnecting, verify your Shopify app settings in the **Shopify Partners Dashboard**:

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Navigate to **Apps** → Your App → **Configuration**
3. Verify **Allowed redirection URL(s)**:
   ```
   https://YOUR-BACKEND-URL/api/v1/integrations/shopify/callback
   ```

   Replace `YOUR-BACKEND-URL` with:
   - **Local dev:** Your ngrok URL (e.g., `https://abc123.ngrok-free.app`)
   - **Production:** Your deployed backend URL

4. Verify **API access scopes** are enabled in your app (if using custom app):
   - Configuration → API access scopes
   - Ensure the scopes match the required list above

### Step 4: Reconnect Store (Fresh OAuth)

**Option A: Via UI**
1. Go to **Integrations** → **Shopify** → **Connect Store**
2. Enter your store domain (e.g., `your-store.myshopify.com`)
3. Click **Connect Store**
4. You'll be redirected to Shopify
5. **Review the permissions carefully** - you should see all 9 scopes listed
6. Click **Install app** / **Authorize**
7. You'll be redirected back to Shipcrowd with success message

**Option B: Via API**
```bash
# Step 1: Get install URL
GET /api/v1/integrations/shopify/install?shop=your-store.myshopify.com

# Response
{
  "success": true,
  "data": {
    "installUrl": "https://your-store.myshopify.com/admin/oauth/authorize?..."
  }
}

# Step 2: Visit the installUrl in browser
# Complete the OAuth flow manually
```

### Step 5: Verify Installation

After reconnecting, run diagnostics again:

```bash
GET /api/v1/integrations/shopify/stores/:newStoreId/diagnose
```

**Expected Result:**
```json
{
  "hasRequiredScopes": true,
  "canReadOrders": true,
  "missingScopes": []
}
```

### Step 6: Test Order Sync

Now try syncing orders:

```bash
POST /api/v1/integrations/shopify/stores/:storeId/sync/orders
Content-Type: application/json

{
  "sinceDate": "2025-02-01T00:00:00.000Z"  // optional
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "itemsProcessed": 10,
    "itemsSynced": 8,
    "itemsFailed": 0,
    "itemsSkipped": 2,
    "errors": []
  }
}
```

## Testing Checklist

After fixing the 403 error, test all Shopify integration features:

- [ ] **OAuth & Connection**
  - [ ] Fresh install with all scopes
  - [ ] Test connection endpoint returns success
  - [ ] Diagnostic endpoint shows all scopes present

- [ ] **Order Sync**
  - [ ] Manual order sync (all orders)
  - [ ] Manual order sync (recent 24h)
  - [ ] Orders appear in Orders page
  - [ ] Order details are accurate
  - [ ] Sync logs show success

- [ ] **Webhooks** (requires ngrok for local dev)
  - [ ] Create test order in Shopify Admin
  - [ ] Verify `orders/create` webhook received
  - [ ] Order automatically syncs to Shipcrowd
  - [ ] Update order in Shopify
  - [ ] Verify `orders/updated` webhook received
  - [ ] Cancel order in Shopify
  - [ ] Verify `orders/cancelled` webhook received

- [ ] **Fulfillment Push**
  - [ ] Create fulfillment for Shopify order
  - [ ] Verify tracking appears in Shopify Admin
  - [ ] Update tracking info
  - [ ] Verify update reflected in Shopify

- [ ] **Store Management**
  - [ ] Pause sync
  - [ ] Verify sync doesn't run when paused
  - [ ] Resume sync
  - [ ] Verify sync works after resume
  - [ ] Update store settings
  - [ ] Verify settings persist

## Common Issues

### Issue: "localhost URL detected, skipping webhook registration"

**Cause:** Webhooks require a public URL, but you're using `http://localhost:5005`

**Fix:**
1. Install ngrok: `brew install ngrok`
2. Run: `ngrok http 5005`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)
4. Update `server/.env`:
   ```env
   BACKEND_URL=https://abc123.ngrok-free.app
   ```
5. Update Shopify app redirect URL in Partners Dashboard
6. Restart server
7. Reconnect store (webhooks will be registered)

### Issue: "Invalid HMAC signature"

**Cause:** The `SHOPIFY_API_SECRET` in your `.env` doesn't match the app's secret

**Fix:**
1. Go to Shopify Partners → Apps → Your App → Configuration
2. Copy the **API secret key**
3. Update `server/.env`:
   ```env
   SHOPIFY_API_SECRET=your_actual_secret_here
   ```
4. Restart server
5. Try OAuth again

### Issue: Still getting 403 after reinstall

**Possible causes:**
1. **Old token cached** - Clear the old store record completely, then reconnect
2. **Wrong shop domain** - Make sure you're using the exact domain (e.g., `store.myshopify.com`)
3. **App not approved** - If using a custom app, ensure it's approved/enabled in Shopify Admin
4. **Scopes not in Shopify app config** - Add the scopes in Partners Dashboard, then reconnect

## Environment Variables Reference

Ensure these are set in `server/.env`:

```env
# Shopify App Credentials (from Partners Dashboard)
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

# URLs
BACKEND_URL=https://your-ngrok-url.ngrok-free.app   # Public URL for callbacks/webhooks
FRONTEND_URL=http://localhost:3000                   # Your frontend URL
```

## Support Files

- **OAuth Service:** `server/src/core/application/services/shopify/shopify-oauth.service.ts`
- **Order Sync Service:** `server/src/core/application/services/shopify/shopify-order-sync.service.ts`
- **Shopify Client:** `server/src/infrastructure/external/ecommerce/shopify/shopify.client.ts`
- **Controller:** `server/src/presentation/http/controllers/integrations/shopify.controller.ts`
- **Routes:** `server/src/presentation/http/routes/v1/integrations/shopify.routes.ts`

## Quick Debug Commands

```bash
# Check store details
GET /api/v1/integrations/shopify/stores/:storeId

# Run diagnostics
GET /api/v1/integrations/shopify/stores/:storeId/diagnose

# Test connection
POST /api/v1/integrations/shopify/stores/:storeId/test

# View sync logs
GET /api/v1/integrations/shopify/stores/:storeId/sync/logs?page=1&limit=20

# Manual order sync
POST /api/v1/integrations/shopify/stores/:storeId/sync/orders
```

## Next Steps

Once order sync is working:

1. **Set up webhooks** (requires ngrok for local dev)
2. **Test real-time sync** by creating orders in Shopify
3. **Test fulfillment push** by booking shipments
4. **Configure sync settings** (frequency, auto-tracking, etc.)
5. **Monitor sync logs** for any errors

---

**Last Updated:** 2026-02-15
**Status:** ✅ Fixes applied, ready for testing

# Testing the Shopify Diagnostic Endpoint

## Your Store Information

- **Store ID:** `6990ed99a31caad464cfd704`
- **Shop Domain:** `helix-testing-store-1.myshopify.com`
- **Company ID:** `69896c05e5063b94d9f3e342`

## Method 1: Test in Browser Console (Easiest)

1. **Open your browser** where you're logged into Shipcrowd (http://localhost:3000)
2. **Open Developer Tools** (F12 or Cmd+Option+I on Mac)
3. **Go to Console tab**
4. **Paste and run this code:**

```javascript
// Test diagnostic endpoint
fetch('http://localhost:5005/api/v1/integrations/shopify/stores/6990ed99a31caad464cfd704/diagnose', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('=== SHOPIFY DIAGNOSTICS ===');
  console.log(JSON.stringify(data, null, 2));

  if (data.success) {
    const { hasRequiredScopes, canReadOrders, missingScopes, currentScopes, shopInfo } = data.data;

    console.log('\n📊 Results:');
    console.log(`✅ Shop: ${shopInfo.name} (${shopInfo.domain})`);
    console.log(`${hasRequiredScopes ? '✅' : '❌'} Has all required scopes: ${hasRequiredScopes}`);
    console.log(`${canReadOrders ? '✅' : '❌'} Can read orders: ${canReadOrders}`);
    console.log(`\n📋 Current scopes (${currentScopes.length}):`);
    currentScopes.forEach(scope => console.log(`  - ${scope}`));

    if (missingScopes.length > 0) {
      console.log(`\n⚠️  Missing scopes (${missingScopes.length}):`);
      missingScopes.forEach(scope => console.log(`  - ${scope}`));
      console.log('\n💡 Action needed: Reconnect store to get missing scopes');
    } else {
      console.log('\n✅ All scopes present!');
    }
  }
})
.catch(err => console.error('❌ Error:', err));
```

## Method 2: Using Postman/Insomnia

1. **Create a new GET request**
2. **URL:** `http://localhost:5005/api/v1/integrations/shopify/stores/6990ed99a31caad464cfd704/diagnose`
3. **Headers:**
   - `Content-Type: application/json`
4. **Authentication:**
   - Use the same cookies from your browser session
   - Or copy the `refreshToken` cookie from browser DevTools → Application → Cookies
5. **Send the request**

## Method 3: Using cURL (from terminal)

You'll need to get your auth token first from the browser. Here's how:

1. **Open DevTools** (F12) in your browser where you're logged in
2. **Go to Application → Cookies → http://localhost:3000**
3. **Copy the `refreshToken` value**
4. **Run this command:**

```bash
curl -X GET \
  'http://localhost:5005/api/v1/integrations/shopify/stores/6990ed99a31caad464cfd704/diagnose' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: refreshToken=YOUR_TOKEN_HERE' \
  | jq .
```

Replace `YOUR_TOKEN_HERE` with your actual token.

## Expected Response

### If store has missing scopes (current state):

```json
{
  "success": true,
  "message": "Diagnostics completed",
  "data": {
    "hasRequiredScopes": false,
    "currentScopes": [
      "read_products",
      "write_products",
      "read_fulfillments",
      "write_fulfillments"
    ],
    "requiredScopes": [
      "read_orders",
      "write_orders",
      "read_products",
      "write_products",
      "write_inventory",
      "read_fulfillments",
      "write_fulfillments",
      "read_locations",
      "read_shipping"
    ],
    "missingScopes": [
      "read_orders",
      "write_orders",
      "write_inventory",
      "read_locations",
      "read_shipping"
    ],
    "canReadOrders": false,
    "shopInfo": {
      "name": "Helix Testing Store 1",
      "email": "your-email@example.com",
      "domain": "helix-testing-store-1.myshopify.com",
      "currency": "INR",
      "planName": "partner_test"
    }
  }
}
```

**What this means:**
- ❌ `hasRequiredScopes: false` - Missing some permissions
- ❌ `canReadOrders: false` - Cannot read orders (causes 403 error)
- ⚠️  `missingScopes` shows what's missing
- 💡 **Action:** Reconnect the store to get all scopes

### If store has all scopes (after reconnecting):

```json
{
  "success": true,
  "message": "Diagnostics completed",
  "data": {
    "hasRequiredScopes": true,
    "currentScopes": [
      "read_orders",
      "write_orders",
      "read_products",
      "write_products",
      "write_inventory",
      "read_fulfillments",
      "write_fulfillments",
      "read_locations",
      "read_shipping"
    ],
    "requiredScopes": [...],
    "missingScopes": [],
    "canReadOrders": true,
    "shopInfo": {...}
  }
}
```

**What this means:**
- ✅ `hasRequiredScopes: true` - All permissions granted
- ✅ `canReadOrders: true` - Can successfully read orders
- ✅ `missingScopes: []` - No missing permissions
- 🎉 **Ready:** Order sync should now work!

## Next Steps Based on Results

### If `canReadOrders: false`:

1. **Disconnect current store:**
   - Go to http://localhost:3000/seller/integrations
   - Click on your Shopify store
   - Click "Disconnect"

2. **Reconnect with fresh OAuth:**
   - Click "Connect Store"
   - Enter: `helix-testing-store-1.myshopify.com`
   - Authorize all permissions when prompted
   - Make sure you see **all 9 scopes** listed

3. **Run diagnostics again** to verify all scopes are present

4. **Test order sync:**
   - Try syncing orders again
   - Should work without 403 error

### If `canReadOrders: true`:

- ✅ Your store already has the correct permissions
- The 403 error might be due to the old API version
- Try order sync now - it should work with the updated API version

## Troubleshooting

### Error: "Authentication required"

- Make sure you're logged into Shipcrowd in the same browser
- Try copying the `refreshToken` cookie and using it explicitly

### Error: "Store not found"

- Verify the store ID is correct: `6990ed99a31caad464cfd704`
- Check if you're using the right company account

### Diagnostic endpoint doesn't exist

- Make sure the server was restarted after applying the fixes
- Check server logs for any startup errors

---

**Quick Test:** Open your browser console on localhost:3000 and paste the JavaScript code from Method 1 above!
