# Amazon & Flipkart Integration Guide

## Overview of Marketplace Integrations

Unlike Shopify/WooCommerce (individual stores), Amazon and Flipkart are **marketplaces** where sellers list products alongside thousands of other sellers.

---

## Amazon Integration (Amazon SP-API)

### How Amazon Works
- **Marketplace:** Sellers list on amazon.in, amazon.com, etc.
- **Seller Central:** Dashboard to manage listings, orders, inventory
- **SP-API:** Selling Partner API for programmatic access
- **App Registration:** Required in Amazon Developer Portal

### Architecture
**Amazon has TWO types of apps:**
1. **Private App:** Only for your own seller account
2. **Public App:** For multiple sellers (like Shipcrowd)

**Shipcrowd uses Public App Model:**
- Shipcrowd registers ONE app in Amazon Developer Console
- Each seller authorizes Shipcrowd app to access their Seller Central
- OAuth-like authorization flow (LWA - Login with Amazon)

---

## Seller Onboarding: Connect Amazon

### Step 1: Prerequisites
**Seller needs:**
- Amazon Seller Central account (Professional plan)
- Active seller status on amazon.in
- MWS Auth Token (if migrating from old MWS)
- Shipcrowd account

**Shipcrowd (one-time setup):**
- Register app in Amazon Developer Console
- Get LWA credentials (Client ID, Secret)
- Register OAuth callback URL

### Step 2: Authorize Shipcrowd App

**In Shipcrowd Dashboard:**
1. Go to **Integrations** → **Marketplaces** → **Amazon**
2. Click **Connect Seller Account**
3. Select marketplace: **Amazon India (amazon.in)**
4. Click **Authorize**

**Seller is redirected to Amazon:**
5. Login to Amazon Seller Central
6. Review permissions:
   - Read orders
   - Update inventory
   - Create shipments
   - Read listings
7. Click **Authorize app**

**Amazon redirects back to Shipcrowd:**
8. Shipcrowd exchanges code for tokens:
   - **Access Token** (expires in 1 hour)
   - **Refresh Token** (never expires)
9. Tokens saved encrypted in database
10. Shows "Connected" status

### Step 3: Marketplace & Region Selection

**Amazon has multiple marketplaces:**
- amazon.in (India)
- amazon.com (US)
- amazon.co.uk (UK)
- amazon.de (Germany)
- etc.

**Seller selects active marketplaces:**
- Check: amazon.in
- Shipcrowd syncs orders from selected marketplaces only

### Step 4: Order Sync

**Manual sync (first time):**
- Click **Sync Orders**
- Shipcrowd calls: `getOrders` SP-API endpoint
- Fetches last 30 days by default
- Saves to database

**Automatic sync (ongoing):**
- **No webhooks!** Amazon doesn't support webhooks
- Shipcrowd uses **polling** (checks every 15 minutes)
- Scheduled job: `amazon-order-sync.job.ts`
- Fetches orders updated since last sync

### Step 5: Fulfillment Integration

**Amazon has two fulfillment models:**
1. **FBA (Fulfilled by Amazon):** Amazon handles shipping
2. **FBM (Fulfilled by Merchant):** Seller handles shipping

**For FBM orders:**
- Seller books shipment in Shipcrowd
- Shipcrowd pushes tracking to Amazon via `updateShipmentStatus` API
- Tracking visible in Seller Central and to customer

---

## Amazon API Details

**Authentication:**
```typescript
// Step 1: Get access token using refresh token
POST https://api.amazon.com/auth/o2/token
{
  grant_type: 'refresh_token',
  refresh_token: 'Atzr|xxxxx',
  client_id: 'amzn1.application-oa2-client.xxxxx',
  client_secret: 'xxxxx'
}

// Step 2: Use access token for API calls
GET https://sellingpartnerapi-eu.amazon.com/orders/v0/orders
Headers: {
  'x-amz-access-token': 'Atza|xxxxx'
}
```

**Required Scopes:**
- `sellingpartnerapi::orders::read`
- `sellingpartnerapi::orders::write`
- `sellingpartnerapi::notifications`

**Token Refresh:**
- Access token expires in 1 hour
- Shipcrowd refreshes automatically before each API call
- Refresh token never expires (unless seller revokes)

---

## Flipkart Integration (Flipkart API)

### How Flipkart Works
- **Marketplace:** flipkart.com (India only)
- **Flipkart Seller Hub:** Seller dashboard
- **API Access:** Application ID + Secret
- **Manual API Setup:** No OAuth, seller creates credentials

### Architecture
**Flipkart uses API Key Model:**
- NO central app registration
- Each seller generates their own API credentials
- Direct API integration (like WooCommerce)

---

## Seller Onboarding: Connect Flipkart

### Step 1: Generate Flipkart API Credentials

**In Flipkart Seller Hub:**
1. Go to **Settings** → **API Integration**
2. Click **Generate Credentials**
3. Fill in:
   - **Application Name:** "Shipcrowd"
   - **Purpose:** "Order management and fulfillment"
4. Accept terms and generate
5. Copy credentials:
   - **Application ID:** `app_xxxxxxxxxxxxx`
   - **Application Secret:** `secret_xxxxxxxxxx`
   - **Seller ID:** `FMSELLER12345`

### Step 2: Connect to Shipcrowd

**In Shipcrowd Dashboard:**
1. Go to **Integrations** → **Marketplaces** → **Flipkart**
2. Click **Connect Account**
3. Enter credentials:
   - **Seller ID:** From Flipkart
   - **Application ID:** From Flipkart
   - **Application Secret:** From Flipkart
4. Click **Connect**

**What happens:**
- Shipcrowd tests connection: `GET /sellers/v3/orders`
- If successful, saves encrypted credentials
- No webhooks (Flipkart doesn't support them)
- Shows "Connected" status

### Step 3: Order Sync

**Manual sync:**
- Click **Sync Orders**
- Shipcrowd calls: `GET /sellers/v3/orders`
- Fetches orders by date range

**Automatic sync:**
- **Polling-based** (like Amazon)
- Scheduled job runs every 15 minutes
- Fetches orders updated since last sync

---

## Comparison Table

| Feature | Shopify | WooCommerce | Amazon | Flipkart |
|---------|---------|-------------|--------|----------|
| Type | SaaS Store | Self-hosted Store | Marketplace | Marketplace |
| App Model | Central OAuth app | No app | Central OAuth app | No app |
| Auth | OAuth | API Keys | LWA OAuth | API Keys |
| Setup | Auto | Manual copy-paste | Auto | Manual copy-paste |
| Webhooks | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| Sync | Real-time | Real-time | Polling (15min) | Polling (15min) |
| Token Refresh | Auto | N/A | Auto (hourly) | N/A |
| Fulfillment | Push tracking | Push tracking | Push tracking | Push tracking |
| Multi-region | No | No | Yes (amazon.in, .com, etc) | No (India only) |

---

## Summary

### Shopify
- **Developer:** Creates ONE app
- **Seller:** Clicks "Connect", authorizes app
- **Sync:** Real-time webhooks

### WooCommerce
- **Developer:** Nothing (no central app)
- **Seller:** Generates API keys, pastes in Shipcrowd
- **Sync:** Real-time webhooks

### Amazon
- **Developer:** Creates ONE app (LWA)
- **Seller:** Clicks "Connect", authorizes in Seller Central
- **Sync:** Polling every 15 minutes (no webhooks)
- **Special:** Multi-marketplace support (IN, US, UK, etc)

### Flipkart
- **Developer:** Nothing (no central app)
- **Seller:** Generates API keys, pastes in Shipcrowd
- **Sync:** Polling every 15 minutes (no webhooks)
- **Special:** India only

---

## Key Takeaways

1. **OAuth Model (Shopify, Amazon):**
   - Better UX (one-click connect)
   - Shipcrowd controls app
   - Automatic token refresh

2. **API Key Model (WooCommerce, Flipkart):**
   - More setup for seller
   - No central app needed
   - Manual credential management

3. **Webhooks vs Polling:**
   - Webhooks = Instant (Shopify, WooCommerce)
   - Polling = 15-min delay (Amazon, Flipkart)

4. **Marketplaces vs Stores:**
   - Marketplaces (Amazon, Flipkart): Seller is one of many
   - Stores (Shopify, WooCommerce): Seller owns entire site

---

## Files Reference

**Amazon:**
- Service: `server/src/core/application/services/amazon/amazon-order-sync.service.ts`
- OAuth: `server/src/core/application/services/amazon/amazon-oauth.service.ts`
- Job: `server/src/infrastructure/jobs/marketplaces/amazon/amazon-order-sync.job.ts`

**Flipkart:**
- Service: `server/src/core/application/services/flipkart/flipkart-order-sync.service.ts`
- Job: `server/src/infrastructure/jobs/marketplaces/flipkart/flipkart-order-sync.job.ts`
