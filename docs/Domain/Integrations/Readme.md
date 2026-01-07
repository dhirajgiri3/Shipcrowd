🛠️ E-commerce Channel Integrations (Testing Mode Guide)
Purpose: Validating order ingestion, webhook handling, and status sync without real customer data.
Status: 🟡 Internal Testing Only | 🚫 No Production Data

⚠️ Executive Disclaimer
Important Note for Stakeholders: Sandbox environments vary by platform. Some require verified seller accounts even for testing. Where sandbox access is gated, ShipCrowd will use mock services during internal testing and switch to official sandboxes during production onboarding.

🛍️ 1. Shopify (Testing Mode)
Environment: Development Store (Free, mimics Advanced Shopify plan)

✅ Setup Requirements
Shopify Partner Account (Free)

Register at: https://partners.shopify.com/
No payment information required
Instant approval for most accounts
Development Store

Create via Partner Dashboard → Stores → Add Store → Development Store
Unlimited dev stores allowed per partner account
No expiration date
Full feature parity with Advanced Shopify plan
Custom App

Created inside the Development Store admin
Not listed in Shopify App Store
Access token never expires (unless manually revoked)
🔑 Credentials Required (Env / DB)
Variable	Value Source	Format	Notes
SHOPIFY_SHOP_URL	Development Store	your-test-store.myshopify.com	Use the .myshopify.com domain, not custom domains.
SHOPIFY_ACCESS_TOKEN	App Admin → API Credentials	shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx	Reveal once. Save immediately. Cannot be re-displayed.
SHOPIFY_API_VERSION	System Default	2024-10	Use latest stable version. Update quarterly.
SHOPIFY_WEBHOOK_SECRET	App Settings → Webhooks	32-64 char hex string	Used for HMAC signature verification.
🛠️ Configuration Steps
Step 1: Create Partner Account
Visit https://partners.shopify.com/signup
Fill business details (can use personal info for testing)
Verify email address
Access Partner Dashboard
Step 2: Create Development Store
Partner Dashboard → Stores → Add Store
Select "Development Store"
Store name: shipcrowd-test-store
Store URL: shipcrowd-test-store.myshopify.com
Purpose: "App Development"
Click "Create Development Store"
Step 3: Enable Custom App Development
Log into your dev store admin
Navigate to: Settings → Apps and sales channels
Click "Develop apps" (top right)
Click "Allow custom app development" (if prompted)
Step 4: Create Custom App
Click "Create an app"
App name: "ShipCrowd Integration"
App developer: Select yourself
Click "Create app"
Step 5: Configure API Scopes
Click "Configure Admin API scopes"
Select required scopes:
read_orders - Fetch order details
write_orders - Update order status
read_products - Access product catalog
write_fulfillments - Create fulfillment records
read_customers - Access customer data (optional)
read_inventory - Check stock levels (optional)
Click "Save"
Step 6: Install the App
Click "Install app" button
Review permissions
Click "Install"
IMPORTANT: Copy the shpat_ Access Token immediately
Store securely - it won't be shown again
Step 7: Configure Webhooks
Use ngrok to expose localhost:
ngrok http 5005
Copy the https:// forwarding URL (e.g., https://abc123.ngrok.io)
In Shopify App Settings → Webhooks
Add webhooks:
orders/create: https://abc123.ngrok.io/api/v1/webhooks/shopify/orders/create
orders/updated: https://abc123.ngrok.io/api/v1/webhooks/shopify/orders/updated
fulfillments/create: https://abc123.ngrok.io/api/v1/webhooks/shopify/fulfillments/create
app/uninstalled: https://abc123.ngrok.io/api/v1/webhooks/shopify/app/uninstalled
API version: Select latest stable (e.g., 2024-10)
Format: JSON
⚠️ Testing Notes
Payment Simulation
Bogus Gateway: Built-in test payment gateway
Test card: 1 (successful payment)
Test card: 2 (card declined)
Test card: 3 (insufficient funds)
Real payment gateways (Stripe/PayPal) are disabled in development stores
COD (Cash on Delivery) can be enabled for testing
Rate Limits
Standard Bucket: 40 requests/second refill rate
Burst Bucket: 80 requests max burst
Leaky Bucket Algorithm: Applied per shop, not per app
Monitor X-Shopify-Shop-Api-Call-Limit response header
Reference: https://shopify.dev/docs/api/usage/rate-limits
Draft Orders (Optional Enhancement)
Use Draft Orders to simulate complex edge cases without payment
Create via: Orders → Create order → Save as draft
Useful for testing:
Multi-currency orders
Tax calculation edge cases
Discount combinations
Custom line items
🐛 Common Issues & Solutions
Issue	Cause	Solution
401 Unauthorized	Invalid or revoked access token	Regenerate token from app settings
429 Too Many Requests	Rate limit exceeded	Implement exponential backoff retry
Webhooks not received	Ngrok tunnel expired	Restart ngrok and update webhook URLs
403 Forbidden	Missing API scope	Add required scope and reinstall app
📚 Official Documentation
Partner Program: https://partners.shopify.com/
Development Stores: https://help.shopify.com/en/partners/dashboard/development-stores
Custom Apps: https://shopify.dev/docs/apps/build/authentication/access-tokens/generate-app-access-tokens-admin
Admin API Reference: https://shopify.dev/docs/api/admin-rest
Admin API (GraphQL): https://shopify.dev/docs/api/admin-graphql
Webhooks Guide: https://shopify.dev/docs/apps/build/webhooks
Rate Limits: https://shopify.dev/docs/api/usage/rate-limits
API Versioning: https://shopify.dev/docs/api/usage/versioning
Bogus Gateway: https://help.shopify.com/en/manual/checkout-settings/test-orders
📦 2. Amazon SP-API (Sandbox Mode)
Environment: SP-API Sandbox (Static & Limited Dynamic)

✅ Setup Requirements

Amazon Seller Central Account

Required for all SP-API integrations
Can be individual or professional seller account
Must have active listing capability
SP-API Application Registration

Registered via Seller Central → Partner Network → Develop Apps
Application can be in "Draft" state for testing
No app approval needed for self-authorization
Sandbox Access

Automatic with SP-API application
No additional approval required
Separate endpoints from production
🔑 Credentials Required
Variable	Value Source	Format	Notes
AMAZON_SELLER_ID	Seller Central → Settings	A1XXXXXXXXXXXXX	Also called "Merchant Token"
AMAZON_MARKETPLACE_ID	Region-specific	A21TJRUUN4KGV	India (IN) - See full list below
AMAZON_LWA_CLIENT_ID	Developer Central → Apps	amzn1.application-oa2-client.xxxxx	LWA App ID
AMAZON_LWA_CLIENT_SECRET	Developer Central → Apps	64-char alphanumeric	Keep secret!
AMAZON_REFRESH_TOKEN	Self-Authorization Flow	`Atzr	xxxxxxxxxxxxx`
AMAZON_ACCESS_TOKEN	Generated from Refresh Token	`Atza	xxxxxxxxxxxxx`
📍 Marketplace IDs Reference
Region	Marketplace ID	Endpoint Region
India	A21TJRUUN4KGV	eu-west-1
United States	ATVPDKIKX0DER	us-east-1
Canada	A2EUQ1WTGCTBG2	us-east-1
United Kingdom	A1F83G8C2ARO7P	eu-west-1
Germany	A1PA6795UKMFR9	eu-west-1
Full list: https://developer-docs.amazon.com/sp-api/docs/marketplace-ids

🆕 Modern Auth (2024+ Standard)
Amazon SP-API has simplified authentication for new applications:

✅ What You Need (Modern)
LWA (Login with Amazon) credentials only
Client ID
Client Secret
Refresh Token
OAuth 2.0 flow for authorization
No AWS account setup required
❌ What You DON'T Need (Legacy - Deprecated for New Apps)
AWS IAM users
AWS Access Key ID
AWS Secret Access Key
AWS SigV4 request signing
⚠️ Important Clarification
New apps can rely on LWA-only authorization for most Seller APIs, but legacy endpoints and some regional edge cases may still require SigV4 compatibility. For ShipCrowd testing, LWA-only is sufficient.

Reference: https://developer-docs.amazon.com/sp-api/docs/sp-api-authentication-and-authorization

🛠️ Setup Steps
Step 1: Register as SP-API Developer
Log into Seller Central: https://sellercentral.amazon.in/ (or your region)
Navigate to: Apps & Services → Develop Apps
Click "Add new app client"
Read and accept Developer Agreement
Step 2: Create SP-API Application
App name: "ShipCrowd Integration"
OAuth Redirect URIs: https://localhost/callback (for testing)
Select required roles:
Orders (read)
Shipping (read/write)
Fulfillment Outbound (optional)
Click "Save and exit"
Step 3: Get LWA Credentials
From Apps list → View app → LWA credentials
Copy LWA Client ID (starts with amzn1.application-oa2-client.)
Click "View" next to Client Secret
Copy LWA Client Secret (64-char string)
Store securely
Step 4: Self-Authorize (Generate Refresh Token)
In Seller Central → Apps & Services → Manage Your Apps
Find your app → Click "Authorize application"
Review permissions → Click "Confirm"
Copy the Refresh Token displayed
CRITICAL: This is shown only once. Save it immediately.
Step 5: Generate Access Token (Programmatically)
curl -X POST https://api.amazon.com/auth/o2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "client_id=YOUR_LWA_CLIENT_ID" \
  -d "client_secret=YOUR_LWA_CLIENT_SECRET"
Response:

{
  "access_token": "Atza|...",
  "token_type": "bearer",
  "expires_in": 3600
}
🛠️ Sandbox Strategy
Static Sandbox (Primary for Testing)
Recommended for: Predictable, repeatable tests
Endpoint: https://sandbox.sellingpartnerapi-eu.amazon.com (for India/EU)
Behavior: Returns mocked responses based on input patterns
Example: Fetching Order ID TEST_CASE_200 always returns a successfully shipped order
Static Sandbox Order IDs:

Order ID	Response
TEST_CASE_200	Successfully shipped order
TEST_CASE_400	Bad request error
TEST_CASE_404	Order not found
Reference: https://developer-docs.amazon.com/sp-api/docs/orders-api-v0-reference#get-ordersv0ordersorderid

Dynamic Sandbox (Limited Availability)
Warning: Full dynamic simulation is primarily for Vendor APIs, not standard Seller APIs
Availability: Limited endpoints support dynamic behavior
Use: Advanced testing scenarios (inventory updates, shipping confirmations)
Reality Check: Most Seller API testing relies on Static Sandbox
Reference: https://developer-docs-amazon-shipping.readme.io/apis/docs/the-selling-partner-api-sandbox

⚠️ Testing Notes
API Endpoints
Environment	Base URL	Region
Sandbox	https://sandbox.sellingpartnerapi-eu.amazon.com	EU/IN
Production	https://sellingpartnerapi-eu.amazon.com	EU/IN
Rate Limits (Sandbox)
Orders API: 0.016 requests/second (1 request per minute)
Products API: 5 requests/second
Sandbox has same rate limits as production
Monitor x-amzn-RateLimit-Limit response header
Reference: https://developer-docs.amazon.com/sp-api/docs/usage-plans-and-rate-limits-in-the-sp-api

Common Testing Patterns
Fetch Orders: Use TEST_CASE_200 to get sample order
Update Shipment: Use TEST_CASE_200 to confirm shipment
Error Handling: Use TEST_CASE_400 to test error responses
🐛 Common Issues & Solutions
Issue	Cause	Solution
401 Unauthorized	Expired access token	Refresh using refresh_token grant
403 Restricted	Missing role/permission	Update app roles in Developer Central
429 QuotaExceeded	Rate limit hit	Implement exponential backoff
InvalidInput	Wrong marketplace ID	Verify marketplace ID for your region
📚 Official Documentation
Developer Registration: https://developer-docs.amazon.com/sp-api/docs/registering-as-a-developer
SP-API Overview: https://developer-docs.amazon.com/sp-api/docs/the-selling-partner-api
Authorization Guide: https://developer-docs.amazon.com/sp-api/docs/authorizing-selling-partner-api-applications
Sandbox Guide: https://developer-docs.amazon.com/sp-api/docs/the-selling-partner-api-sandbox
Orders API: https://developer-docs.amazon.com/sp-api/docs/orders-api-v0-reference
Shipping API: https://developer-docs.amazon.com/sp-api/docs/shipping-api-v2-reference
Marketplace IDs: https://developer-docs.amazon.com/sp-api/docs/marketplace-ids
Rate Limits: https://developer-docs.amazon.com/sp-api/docs/usage-plans-and-rate-limits-in-the-sp-api
Migration Guide (IAM Removal): https://developer-docs.amazon.com/sp-api/docs/sp-api-authentication-and-authorization
🛒 3. Flipkart Seller API (Sandbox Mode)
Environment: Sandbox API (Simulation-based Testing)

✅ Setup Requirements
Flipkart Seller Account

Register at: https://seller.flipkart.com/
Complete seller onboarding (can use test business details)
Access to Seller Dashboard required
API Application

Created via Flipkart Seller API Developer Portal
Requires approval from Flipkart API team
Typical approval time: 3-5 business days
Sandbox Access

Available after application approval
Separate credentials from production
Limited to simulation tools (no live marketplace access)
🔑 Credentials Required
Variable	Value Source	Format	Notes
FLIPKART_APP_ID	API Developer Portal	app_xxxxxxxxxxxxx	Acts as your OAuth Client ID
FLIPKART_APP_SECRET	API Developer Portal	64-char hex string	Acts as your OAuth Client Secret
FLIPKART_ACCESS_TOKEN	Generated via OAuth	Bearer xxxxxxxxxxxxx	Expires in ~1 hour
FLIPKART_TOKEN_EXPIRY	Token response	3600 (seconds)	Used for auto-refresh logic
🛠️ Configuration Steps
Step 1: Register as Flipkart Seller
Visit: https://seller.flipkart.com/sell-online
Click "Start Selling"
Complete registration (business details, GSTIN, bank account)
Verify email and phone
Access Seller Hub
Step 2: Request API Access
From Seller Hub → Settings → API Access
Click "Request API Access"
Fill application form:
Business purpose
Expected API usage volume
Technical contact details
Submit for approval
Wait for approval (typically 3-5 business days)
Step 3: Create Application
Once approved, access API Developer Portal
Create New Application
App Name: "ShipCrowd Integration"
Generate credentials:
App ID (Client ID)
App Secret (Client Secret)
Save credentials securely
Step 4: Generate Access Token (OAuth Flow)
Token Endpoint: https://api.flipkart.net/oauth-service/oauth/token

Request:

curl -X POST https://api.flipkart.net/oauth-service/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "scope=Seller_Api" \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_APP_SECRET"
Response:

{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
Step 5: Configure Sandbox Environment
Base URLs:

Production: https://api.flipkart.net
Sandbox: https://sandbox-api.flipkart.net (verify with API team for latest URL)
API Version: V3 (latest stable)

⚠️ Critical: Token Auto-Refresh Logic
Problem: Access tokens expire in ~1 hour (not 60 days as commonly misunderstood).

Solution: Implement automatic token refresh on 401 Unauthorized:

async function callFlipkartAPI(endpoint, options) {
  let response = await fetch(endpoint, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (response.status === 401) {
    // Token expired - refresh it
    accessToken = await refreshFlipkartToken();
    
    // Retry request
    response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
  }
  
  return response;
}
🛠️ Sandbox Testing Features
Flipkart provides a Sandbox Testing Tool in the API Developer Portal:

Create Test Orders:

Simulate order creation without affecting live marketplace
Generate test order IDs
Control order states (Approved, Packed, Shipped, Delivered)
Dispatch Simulation:

Mark orders as "Ready to Dispatch"
Generate shipping labels
Update tracking information
Return Simulation:

Initiate customer returns
Process return requests
Update return status
Access: https://seller.flipkart.com/api-docs/sandbox-testing-tool.html

⚠️ Testing Notes
API Version Compatibility
V3 (Recommended): Latest features, better error handling
V2 (Legacy): Being phased out
Always check API version in endpoint URL: /fos-mp-order-api/v3/orders
Rate Limits
Standard: 100 requests/minute per app
Burst: 10 requests/second
Monitor X-RateLimit-Remaining header
Common Endpoints
Endpoint	Method	Purpose
/v3/orders/search	GET	Fetch orders
/v3/shipments/{shipmentId}/dispatch	POST	Mark as dispatched
/v3/shipments/{shipmentId}/labels	GET	Download shipping label
/v3/returns/{returnId}	GET	Get return details
🐛 Common Issues & Solutions
Issue	Cause	Solution
401 Unauthorized	Token expired (~1 hour)	Implement auto-refresh logic
403 Forbidden	App not approved for API	Contact Flipkart API support
422 Unprocessable Entity	Invalid order state transition	Check order lifecycle rules
500 Internal Server Error	Flipkart server issue	Retry with exponential backoff
📚 Official Documentation
Seller Hub: https://seller.flipkart.com/
API Overview: https://seller.flipkart.com/api-docs/FMSAPI.html
Authentication: https://seller.flipkart.com/api-docs/oauth-guide.html
Self-Serve API: https://github.com/Flipkart/flipkart-seller-api-java-sdk/blob/master/docs/SelfServeApi.md
Orders V3 API: https://seller.flipkart.com/api-docs/order-api-v3.html
Shipments API: https://github.com/Flipkart/flipkart-seller-api-java-sdk/blob/master/docs/ShipmentV3Api.md
Sandbox Guide: https://flipkart.github.io/fk-api-platform-docs/docs/mp-api_versioned/sandbox-ap-is
API Platform Docs: https://flipkart.github.io/fk-api-platform-docs/docs/intro
Rate Limits: https://seller.flipkart.com/api-docs/rate-limits.html
🌐 4. WooCommerce (Local Testing)
Environment: Localhost / Staging WordPress Site

✅ Setup Requirements
WordPress + WooCommerce

WordPress 5.8+ (latest recommended)
WooCommerce 6.0+ (latest recommended)
PHP 7.4+ (8.0+ recommended)
MySQL 5.6+ or MariaDB 10.3+
Local Development Environment

XAMPP (Windows/Mac/Linux): https://www.apachefriends.org/
Docker: https://hub.docker.com/_/wordpress
LocalWP (Recommended): https://localwp.com/
MAMP (Mac): https://www.mamp.info/
Permalinks Configuration

CRITICAL: Must be set to anything except "Plain"
Recommended: "Post name" structure
Without this, REST API will completely fail
🔑 Credentials Required
Variable	Value Source	Format	Notes
WOO_STORE_URL	Local server	http://localhost:8000	Must match protocol exactly (http vs https)
WOO_CONSUMER_KEY	WC Settings → Advanced → REST API	ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx	43-char alphanumeric
WOO_CONSUMER_SECRET	WC Settings → Advanced → REST API	cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx	43-char alphanumeric
WOO_API_VERSION	System Default	wc/v3	Latest stable version
🛠️ Configuration Steps
Step 1: Install WordPress Locally
Option A: Using LocalWP (Easiest)

Download LocalWP: https://localwp.com/
Install and launch
Click "Create a new site"
Site name: shipcrowd-test-store
PHP version: 8.0+
Click "Continue" → "Add Site"
Access site: http://shipcrowd-test-store.local
Option B: Using Docker

docker run -d \
  -p 8080:80 \
  -e WORDPRESS_DB_HOST=db:3306 \
  -e WORDPRESS_DB_USER=wordpress \
  -e WORDPRESS_DB_PASSWORD=wordpress \
  -e WORDPRESS_DB_NAME=wordpress \
  wordpress:latest
Step 2: Install WooCommerce Plugin
WordPress Admin → Plugins → Add New
Search "WooCommerce"
Click "Install Now" → "Activate"
Complete WooCommerce Setup Wizard (can skip for testing)
Step 3: Configure Permalinks (CRITICAL STEP)
WordPress Admin → Settings → Permalinks
DO NOT select "Plain"
Select "Post name" (recommended for clean URLs)
Click "Save Changes"
Why This Matters:

REST API uses pretty URLs like /wp-json/wc/v3/orders
"Plain" permalinks break this structure
API will return 404 Not Found without proper permalinks
This is the #1 cause of "WooCommerce API not working" issues
Reference: https://stackoverflow.com/questions/56618526/how-can-i-use-the-woocommerce-rest-api-with-plain-permalinks

Step 4: Generate API Keys
WooCommerce → Settings → Advanced → REST API
Click "Add key"
Description: "ShipCrowd Integration"
User: Select admin user (usually yourself)
Permissions: Read/Write (required for order updates)
Click "Generate API key"
IMPORTANT:

Consumer Key and Secret are shown only once
Copy both immediately
Store securely (environment variables or password manager)
Step 5: Test API Connection
Using cURL:

curl -u "ck_xxx:cs_xxx" \
  http://localhost:8000/wp-json/wc/v3/orders
Expected Response:

[
  {
    "id": 123,
    "status": "completed",
    "total": "50.00",
    ...
  }
]
⚠️ Critical Configuration Notes
SSL/HTTPS on Localhost
If testing on http://localhost (no SSL):

WooCommerce REST API works fine over HTTP locally
For Node.js API clients, you may need:
const agent = new https.Agent({  
  rejectUnauthorized: false  // ONLY for localhost testing
});
NEVER use rejectUnauthorized: false in production
Authentication Method
WooCommerce REST API uses HTTP Basic Authentication:

Username: Consumer Key
Password: Consumer Secret
Do NOT send credentials in URL query string for production
Use Authorization header: Authorization: Basic base64(key:secret)
🛠️ Testing Features
Create Test Products
Products → Add New
Product name: "Test Product"
Regular price: ₹100
Inventory: Manage stock (enabled)
Stock quantity: 50
Publish
Create Test Orders
WooCommerce → Orders → Add Order
Add customer (can create test customer)
Add products
Set billing/shipping address
Order status: "Processing"
Click "Create"
Webhook Configuration (Optional)
WooCommerce → Settings → Advanced → Webhooks
Add webhook:
Name: "Order Created"
Status: "Active"
Topic: "Order created"
Delivery URL: https://your-ngrok-url.ngrok.io/api/v1/webhooks/woocommerce/orders/created
API Version: WC version (e.g., WC/v3)
Save webhook
Copy "Secret" for signature verification
⚠️ Testing Notes
API Endpoints Format
All endpoints follow this structure:

{STORE_URL}/wp-json/wc/{API_VERSION}/{RESOURCE}
Examples:

Orders: http://localhost:8000/wp-json/wc/v3/orders
Products: http://localhost:8000/wp-json/wc/v3/products
Customers: http://localhost:8000/wp-json/wc/v3/customers
Reference: https://woocommerce.github.io/woocommerce-rest-api-docs/

Rate Limits
WooCommerce has no built-in rate limiting by default
Limit is determined by server resources (PHP/MySQL)
For production, consider plugins like "WP REST API Controller"
Common Query Parameters
Parameter	Example	Purpose
per_page	?per_page=50	Limit results (max 100)
page	?page=2	Pagination
status	?status=processing	Filter by order status
after	?after=2024-01-01T00:00:00	Orders after date
🐛 Common Issues & Solutions
Issue	Cause	Solution
404 Not Found for /wp-json/	Permalinks set to "Plain"	Change to "Post name" in Settings → Permalinks
401 Unauthorized	Invalid Consumer Key/Secret	Regenerate API keys
403 Forbidden	Insufficient permissions	Ensure API key user is admin
CORS errors from browser	Localhost security restrictions	Use server-side API calls (Node.js) not browser
consumer_key is missing	Credentials not sent correctly	Use Basic Auth, not query params
📚 Official Documentation
WooCommerce REST API Docs: https://woocommerce.github.io/woocommerce-rest-api-docs/
Authentication Guide: https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication
Orders API: https://woocommerce.github.io/woocommerce-rest-api-docs/#orders
Products API: https://woocommerce.github.io/woocommerce-rest-api-docs/#products
Customers API: https://woocommerce.github.io/woocommerce-rest-api-docs/#customers
Webhooks: https://woocommerce.github.io/woocommerce-rest-api-docs/#webhooks
Development Environment Setup: https://developer.woocommerce.com/docs/how-to-set-up-woocommerce-development-environment/
Permalink Issues: https://stackoverflow.com/questions/56618526/how-can-i-use-the-woocommerce-rest-api-with-plain-permalinks
LocalWP (Recommended Tool): https://localwp.com/
📋 Summary Checklist for Developers
Platform	Auth Type	Access Token Life	Refresh Token Life	Test Orders Source
Shopify	Header Token (shpat_)	Permanent (until revoked)	N/A (no refresh needed)	Admin / Draft Orders
Amazon	OAuth 2.0 (LWA)	1 hour	Indefinite (until revoked)	Static Sandbox Mocks
Flipkart	OAuth 2.0 (Client Credentials)	~1 hour	N/A (use client credentials)	API Sandbox Tool
WooCommerce	HTTP Basic Auth	Permanent	N/A (no OAuth)	WP Admin (Manual)
⚠️ Important Notes for Testing
✅ What This Testing Includes	❌ What This Testing Does NOT Include
Sandbox/test credentials only	No live production credentials
Simulated test orders	No real customer orders
Webhook validation	No real payments or payouts
API error handling	No real customer data
Rate limit testing	No seller onboarding
Token refresh logic	No production deployments
Order status sync	No real inventory updates
Label generation simulation	No actual shipping
🔧 Next Steps After Testing
Validate Integration Logic:

Order ingestion and mapping
Webhook signature verification
Error handling and retry logic
Token refresh automation
Performance Testing:

Bulk order sync (100+ orders)
Concurrent webhook handling
Rate limit compliance
Production Readiness:

Switch to production credentials
Enable monitoring and logging
Set up error alerting
Document runbook for common issues
Seller Onboarding Prep:

Create OAuth onboarding flows
Build credential management UI
Implement webhook registration automation
Create seller documentation
Document Version: 2.0 (Comprehensive & Verified)
Last Updated: January 7, 2026
Author: ShipCrowd Development Team
Status: ✅ Executive-Grade Documentation - Ready for Stakeholder Review