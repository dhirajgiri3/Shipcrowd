# WooCommerce Integration Guide

## How WooCommerce Integration Works

**WooCommerce** is a WordPress plugin that turns any WordPress website into an online store. Unlike Shopify (SaaS), WooCommerce stores are self-hosted.

### Architecture
- **No Central App:** Each seller creates their own API credentials
- **Self-Hosted:** Seller controls their server/hosting
- **API Keys:** Consumer Key + Consumer Secret for authentication
- **Webhooks:** Seller's WooCommerce sends data to Shipcrowd

---

## Seller Onboarding: Connect WooCommerce Store

### Step 1: Prerequisites
**Seller needs:**
- WordPress website with WooCommerce plugin installed
- WooCommerce admin access
- HTTPS enabled (required for API access)
- Shipcrowd account

### Step 2: Generate WooCommerce API Keys

**In WooCommerce Admin:**
1. Go to **WooCommerce** → **Settings** → **Advanced** → **REST API**
2. Click **Add Key**
3. Fill in details:
   - **Description:** "Shipcrowd Integration"
   - **User:** Select admin user
   - **Permissions:** Read/Write
4. Click **Generate API Key**
5. Copy the credentials (shown only once!):
   - **Consumer Key:** `ck_xxxxxxxxxxxxx`
   - **Consumer Secret:** `cs_xxxxxxxxxxxxx`
   - **Store URL:** `https://yourstore.com`

### Step 3: Connect to Shipcrowd

**In Shipcrowd Dashboard:**
1. Go to **Integrations** → **Channels** → **WooCommerce**
2. Click **Connect Store**
3. Enter credentials:
   - **Store URL:** `https://yourstore.com`
   - **Consumer Key:** Paste from WooCommerce
   - **Consumer Secret:** Paste from WooCommerce
4. Click **Connect**

**What happens:**
- Shipcrowd tests the connection (GET /wp-json/wc/v3/system_status)
- If successful, saves encrypted credentials to database
- Registers webhook URLs on seller's WooCommerce
- Shows "Connected" status

### Step 4: Webhook Registration

**Shipcrowd automatically creates webhooks in WooCommerce:**
- `order.created` → Send to Shipcrowd when new order
- `order.updated` → Send when order changes
- `order.deleted` → Send when order cancelled

**Webhook endpoints on Shipcrowd:**
- `https://api.shipcrowd.com/api/v1/webhooks/woocommerce/order/created`
- `https://api.shipcrowd.com/api/v1/webhooks/woocommerce/order/updated`
- etc.

### Step 5: Order Sync

**Manual sync (first time):**
- Click **Sync Orders**
- Shipcrowd calls: `GET /wp-json/wc/v3/orders`
- Fetches all historical orders
- Saves to Shipcrowd database

**Automatic sync (ongoing):**
- Customer places order on WooCommerce
- WooCommerce sends webhook to Shipcrowd
- Shipcrowd processes order immediately

---

## Key Differences vs Shopify

| Feature | Shopify | WooCommerce |
|---------|---------|-------------|
| Hosting | SaaS (Shopify servers) | Self-hosted (seller's server) |
| App Model | Central Shipcrowd app | No app, direct API |
| Auth | OAuth (automatic) | API Keys (manual) |
| API | REST + GraphQL | REST only |
| Setup | Click "Install" | Copy/paste keys |
| Cost | Monthly Shopify fees | One-time WooCommerce plugin |

---

## Technical Implementation

**API Authentication:**
```typescript
// WooCommerce uses OAuth 1.0a signature OR Basic Auth
const auth = {
  consumer_key: 'ck_xxxxx',
  consumer_secret: 'cs_xxxxx'
}

// API call example
GET https://yourstore.com/wp-json/wc/v3/orders?consumer_key=xxx&consumer_secret=xxx
```

**Required Scopes:** None (uses API key permissions)

**Webhook Verification:**
- WooCommerce signs webhooks with secret
- Shipcrowd verifies HMAC signature
- Ensures webhook authenticity

---

## Common Issues

**Issue: "SSL required"**
- **Cause:** Store doesn't have HTTPS
- **Solution:** Enable SSL certificate on seller's domain

**Issue: "401 Unauthorized"**
- **Cause:** Wrong API keys
- **Solution:** Regenerate keys in WooCommerce

**Issue: Webhooks not received**
- **Cause:** Firewall blocking outbound webhooks
- **Solution:** Check seller's hosting provider settings

---

## Files Reference

- Service: `server/src/core/application/services/woocommerce/woocommerce-order-sync.service.ts`
- Controller: `server/src/presentation/http/controllers/integrations/woocommerce.controller.ts`
- Webhook: `server/src/presentation/http/controllers/webhooks/channels/woocommerce.webhook.controller.ts`
