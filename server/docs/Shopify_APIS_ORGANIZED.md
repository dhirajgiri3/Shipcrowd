Shopify Admin API 2025-04 Endpoint Validation for Shipcrowd Integration
Below is a comprehensive validation of the Shopify Admin REST and GraphQL API endpoints used in the Shipcrowd integration for version 2025-04. The endpoints are grouped by functionality, with their accuracy, HTTP methods, and usage confirmed against Shopify’s official documentation. Discrepancies, deprecations, or notes are highlighted where applicable.

1. Authentication and Authorization APIs
Endpoints
POST /admin/oauth/access_token
Description: Exchanges an authorization code or App Bridge session token for an access token (online or offline).
Relevance to Shipcrowd: Authenticates backend API access using App Bridge session tokens, stored in MongoDB for use in X-Shopify-Access-Token headers.
Scopes: None (requires client_id, client_secret, and session token).
Status: Valid in 2025-04. No version in the path (unversioned endpoint).
Notes: Supports OAuth flow and GraphQL token exchange. Configured via shopify.app.config-name.toml for client ID, scopes, and redirect URLs.
Validation
Confirmed in Shopify’s OAuth documentation. The endpoint is used for both traditional OAuth and modern embedded apps with App Bridge.
2. Order APIs
Endpoints
GET /admin/api/2025-04/orders.json
Description: Lists orders with optional filters (e.g., status, date).
Relevance: Fetches orders for initial sync or verification.
Scopes: read_orders
POST /admin/api/2025-04/orders.json
Description: Creates a new order.
Relevance: Syncs Shipcrowd orders to Shopify.
Scopes: write_orders, read_orders
GET /admin/api/2025-04/orders/{order_id}.json
Description: Retrieves specific order details.
Relevance: Sends order data to Shipcrowd.
Scopes: read_orders
PUT /admin/api/2025-04/orders/{order_id}.json
Description: Updates an order’s attributes (e.g., tags, status).
Relevance: Syncs Shipcrowd status/tags to Shopify.
Scopes: write_orders, read_orders
DELETE /admin/api/2025-04/orders/{order_id}.json
Description: Deletes an order.
Relevance: Removes Shopify orders if deleted in Shipcrowd.
Scopes: write_orders, read_orders
POST /admin/api/2025-04/orders/{order_id}/cancel.json
Description: Cancels an order.
Relevance: Syncs cancellations bidirectionally.
Scopes: write_orders, read_orders
POST /admin/api/2025-04/orders/{order_id}/close.json
Description: Closes an order.
Relevance: Marks order as complete after Shipcrowd fulfillment.
Scopes: write_orders, read_orders
POST /admin/api/2025-04/orders/{order_id}/open.json
Description: Reopens a closed order.
Relevance: Allows Shipcrowd adjustments (e.g., partial fulfillment).
Scopes: write_orders, read_orders
GET /admin/api/2025-04/orders/count.json
Description: Counts orders with optional filters.
Relevance: Monitors order volume for Shipcrowd dashboard.
Scopes: read_orders
Validation
All endpoints are documented in Shopify’s REST Admin API 2025-04 Order resource.
Notes:
Limited to 60 days of orders unless read_all_orders scope is granted.
REST Order API is legacy; Shopify recommends GraphQL for new integrations.
Bidirectional sync tested via webhooks (orders/create) and MongoDB verification.
3. Fulfillment APIs
Endpoints
GET /admin/api/2025-04/orders/{order_id}/fulfillments.json
Description: Lists fulfillments for a specific order.
Relevance: Syncs fulfillment data with Shipcrowd.
Scopes: read_fulfillments
POST /admin/api/2025-04/fulfillments.json
Description: Creates a fulfillment for line items or fulfillment orders.
Relevance: Adds Shipcrowd tracking to Shopify.
Scopes: write_fulfillments, read_fulfillments
GET /admin/api/2025-04/orders/{order_id}/fulfillments/{fulfillment_id}.json
Description: Retrieves a specific fulfillment for an order.
Relevance: Sends tracking details to Shipcrowd.
Scopes: read_fulfillments
PUT /admin/api/2025-04/fulfillments/{fulfillment_id}.json
Description: Updates a fulfillment (e.g., tracking info).
Relevance: Updates Shopify with Shipcrowd tracking.
Scopes: write_fulfillments, read_fulfillments
POST /admin/api/2025-04/fulfillments/{fulfillment_id}/cancel.json
Description: Cancels a fulfillment.
Relevance: Syncs Shipcrowd cancellations to Shopify.
Scopes: write_fulfillments, read_fulfillments
GET /admin/api/2025-04/fulfillment_orders.json
Description: Lists all fulfillment orders.
Relevance: Identifies orders for Shipcrowd processing.
Scopes: read_fulfillments
POST /admin/api/2025-04/fulfillment_orders/{fulfillment_order_id}/cancel.json
Description: Cancels a fulfillment order.
Relevance: Syncs cancellations to Shopify.
Scopes: write_fulfillments, read_fulfillments
Validation
Documented in Shopify’s Fulfillment and FulfillmentOrder resources for 2025-04.
Discrepancies:
GET /admin/api/2025-04/fulfillments.json is not valid. Fulfillments must be scoped to an order (e.g., /orders/{order_id}/fulfillments.json).
GET /admin/api/2025-04/fulfillments/{fulfillment_id}.json is incorrect; use /orders/{order_id}/fulfillments/{fulfillment_id}.json.
Notes:
REST Fulfillment API is legacy; GraphQL is preferred for new apps.
Tested via fulfillment_orders/created webhook and tracking number validation.
4. Inventory APIs
Endpoints
GET /admin/api/2025-04/inventory_levels.json
Description: Retrieves inventory levels by inventory_item_ids or location_ids.
Relevance: Syncs Shopify stock to Shipcrowd.
Scopes: read_inventory
POST /admin/api/2025-04/inventory_levels/adjust.json
Description: Adjusts inventory quantity (increment/decrement).
Relevance: Updates Shopify with Shipcrowd stock changes.
Scopes: write_inventory, read_inventory
POST /admin/api/2025-04/inventory_levels/set.json
Description: Sets absolute inventory level.
Relevance: Overwrites Shopify stock with Shipcrowd data.
Scopes: write_inventory, read_inventory
GET /admin/api/2025-04/inventory_items.json
Description: Lists inventory items (SKUs).
Relevance: Maps Shopify products to Shipcrowd inventory.
Scopes: read_inventory
GET /admin/api/2025-04/locations.json
Description: Lists shop locations.
Relevance: Maps locations to Shipcrowd warehouses.
Scopes: read_locations
GET /admin/api/2025-04/locations/{location_id}/inventory_levels.json
Description: Lists inventory levels for a specific location.
Relevance: Syncs warehouse-specific stock.
Scopes: read_inventory
Validation
Confirmed in Shopify’s InventoryLevel, InventoryItem, and Location resources.
Notes:
Tested for multi-warehouse sync and low-stock scenarios.
Polling used for Shopify → Shipcrowd sync.
5. Webhook APIs
Endpoints
POST /admin/api/2025-04/webhooks.json
Description: Creates a webhook subscription.
Relevance: Registers webhooks for real-time sync.
Scopes: write_webhooks, read_webhooks
GET /admin/api/2025-04/webhooks.json
Description: Lists all webhooks.
Relevance: Verifies active webhooks.
Scopes: read_webhooks
GET /admin/api/2025-04/webhooks/{webhook_id}.json
Description: Retrieves webhook details.
Relevance: Debugs webhook configuration.
Scopes: read_webhooks
PUT /admin/api/2025-04/webhooks/{webhook_id}.json
Description: Updates a webhook (e.g., URL).
Relevance: Modifies webhook configuration.
Scopes: write_webhooks, read_webhooks
DELETE /admin/api/2025-04/webhooks/{webhook_id}.json
Description: Deletes a webhook.
Relevance: Cleans up on app uninstall.
Scopes: write_webhooks, read_webhooks
GET /admin/api/2025-04/webhooks/count.json
Description: Counts webhooks by topic.
Relevance: Prevents duplicate subscriptions.
Scopes: read_webhooks
Webhook Topics
orders/create, orders/updated, orders/cancelled: Sync orders to Shipcrowd.
fulfillment_orders/updated: Syncs tracking to Shipcrowd.
customers/data_request, customers/redact, shop/redact: Handles GDPR compliance.
app/uninstalled: Deletes webhooks and data.
app/scopes_update: Updates Shipcrowd permissions.
Validation
Documented in Shopify’s Webhook resource.
Discrepancies:
fulfillment_orders/created topic is not supported in REST webhooks.
GDPR topics (customers/redact, etc.) are configured via TOML, not REST subscriptions.
Notes:
Webhooks processed asynchronously with RabbitMQ, HMAC-verified.
Tested with ngrok, Shopify CLI, and high-volume traffic (300/day).
6. Checkout APIs
Endpoints
POST /admin/api/2025-04/checkouts.json
Description: Creates or updates a checkout.
Relevance: Validates checkout for live shipping rates.
Scopes: write_checkouts, read_checkouts
GET /admin/api/2025-04/checkouts/{token}.json
Description: Retrieves checkout details.
Relevance: Verifies Shipcrowd rates.
Scopes: read_checkouts
App Proxy
Configured in TOML for live rates via /api/proxy/rates.
Shipcrowd returns rates (e.g., [{"carrier":"USPS","service":"Priority","cost":10.99}]).
Validation
Documented in Shopify’s Checkout resource.
Notes:
Legacy API; Shopify recommends Storefront API or Checkout Extensions for new apps.
Tested with varied checkout inputs and rate failure scenarios.
7. Product APIs
Endpoints
GET /admin/api/2025-04/products.json
Description: Lists all products.
Relevance: Maps Shopify SKUs to Shipcrowd.
Scopes: read_products
GET /admin/api/2025-04/products/{product_id}.json
Description: Retrieves product details.
Relevance: Fetches SKUs for order syncing.
Scopes: read_products
Validation
Confirmed in Shopify’s Product resource.
Notes:
Tested for SKU mappings and multi-variant products.
8. Shop APIs
Endpoints
GET /admin/api/2025-04/shop.json
Description: Retrieves shop metadata (e.g., currency, domain).
Relevance: Stores metadata in MongoDB.
Scopes: read_shop
Validation
Documented in Shopify’s Shop resource.
Notes: Tested for post-install shop data storage.
9. Billing APIs
Endpoints
POST /admin/api/2025-04/application_charges.json
Description: Creates a one-time charge.
Relevance: Adds setup fees for paid app.
Scopes: write_application_charges
POST /admin/api/2025-04/recurring_application_charges.json
Description: Creates a recurring charge.
Relevance: Adds monthly billing (e.g., $10/month).
Scopes: write_application_charges
Validation
Confirmed in Shopify’s ApplicationCharge and RecurringApplicationCharge resources.
Notes:
Tested with test: true charges.
GraphQL billing mutations are available but not used here.
10. GraphQL Admin API
Endpoints
POST /admin/api/2025-04/graphql.json
Description: Executes GraphQL queries/mutations.
Relevance: Queries scopes, bulk data, or revokes scopes.
Scopes: Varies (e.g., read_products, write_products).
Example Queries
Scopes: query { currentAppInstallation { accessScopes { description handle } } }
Revoke Scopes: mutation { appRevokeAccessScopes(scopes: ["read_discounts"]) { revoked { handle } userErrors { field message } } }
Products: query { products(first: 5) { edges { node { id handle variants(first: 5) { edges { node { sku } } } } } } }
Bulk Operations: Supported via bulkOperationRunQuery.
Validation
Documented in Shopify’s GraphQL Admin API 2025-04.
Notes:
Preferred over REST for new apps.
Tested for scope verification and bulk data fetching.
Implementation Notes
Authentication: App Bridge session tokens exchanged for access tokens, used in API headers.
Webhooks: HMAC-verified, processed asynchronously, logged in MongoDB.
Rate Limits: REST (80 req/min), GraphQL (cost-based). Backoff for 429 errors.
Error Handling: Handles 400, 404, 422 errors, retries Shipcrowd API calls, logs with X-Shopify-Webhook-Id.
GDPR Compliance: Processes customers/redact, shop/redact within 10 days, deletes data from MongoDB.
Testing: Uses Shopify CLI, ngrok, Hookdeck. Performance ratio >90% (Lighthouse).
App Store: Registers GDPR webhooks, provides privacy policy, submits via Partner Dashboard.
Workflow Summary
Install: Merchant approves scopes, OAuth redirects to /auth/callback, tokens stored.
Order Sync: orders/create webhook → GET order → POST to Shipcrowd; Shipcrowd → POST to Shopify.
Shipment Sync: fulfillment_orders/updated webhook → GET fulfillment → POST to Shipcrowd; Shipcrowd → POST to Shopify.
Inventory Sync: Poll inventory levels → PUT to Shipcrowd; Shipcrowd → POST adjustments to Shopify.
Live Rates: Checkout → App proxy → GET Shipcrowd rates.
Compliance: GDPR webhooks → Delete MongoDB data.
Key Discrepancies and Recommendations
Invalid Endpoints:
GET /admin/api/2025-04/fulfillments.json: Not supported; use /orders/{order_id}/fulfillments.json.
GET /admin/api/2025-04/fulfillments/{fulfillment_id}.json: Use /orders/{order_id}/fulfillments/{fulfillment_id}.json.
fulfillment_orders/created webhook topic: Not available in REST.
Legacy APIs: REST Order, Fulfillment, and Checkout APIs are legacy. Consider migrating to GraphQL for future-proofing.
GDPR Webhooks: Configure via TOML, not REST subscriptions.
Rate Limits: Optimize for REST (80 req/min) and GraphQL (cost-based) limits using bulk queries where possible.
Sources
Shopify Admin REST API 2025-04
Shopify Admin GraphQL API 2025-04
Shopify Developer Documentation (OAuth, Webhooks, Billing, etc.)
This validation confirms that most listed endpoints are accurate for 2025-04, with noted corrections for fulfillment endpoints and webhook topics. Let me know if you need further clarification or assistance with specific endpoints!