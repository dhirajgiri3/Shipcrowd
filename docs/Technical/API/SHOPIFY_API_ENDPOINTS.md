# Shopify Integration API Documentation

Complete reference for all Shopify integration endpoints.

## Base URL

```
https://api.shipcrowd.com/api/v1
```

## Authentication

All endpoints (except webhooks) require JWT authentication:

```
Authorization: Bearer <your_jwt_token>
```

---

## Table of Contents

1. [OAuth & Installation](#oauth--installation)
2. [Store Management](#store-management)
3. [Product Mapping](#product-mapping)
4. [Order Sync](#order-sync)
5. [Inventory Sync](#inventory-sync)
6. [Webhooks](#webhooks)
7. [Sync Logs](#sync-logs)

---

## OAuth & Installation

### 1. Initiate OAuth Installation

Generates Shopify OAuth installation URL.

**Endpoint:** `GET /integrations/shopify/install`

**Auth:** Required (Admin/Company Owner)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shop` | string | Yes | Shopify store domain (e.g., `example.myshopify.com`) |

**Example Request:**
```bash
curl -X GET "https://api.shipcrowd.com/api/v1/integrations/shopify/install?shop=example.myshopify.com" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Response:**
```json
{
  "success": true,
  "installUrl": "https://example.myshopify.com/admin/oauth/authorize?client_id=abc123&scope=read_orders,write_orders&redirect_uri=https://api.shipcrowd.com/api/v1/integrations/shopify/callback&state=base64encodedstate",
  "message": "Redirecting to Shopify for authorization"
}
```

---

### 2. OAuth Callback

Handles OAuth callback from Shopify (automatic redirect).

**Endpoint:** `GET /integrations/shopify/callback`

**Auth:** None (HMAC-verified)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `shop` | string | Store domain |
| `code` | string | Authorization code |
| `hmac` | string | HMAC signature |
| `state` | string | CSRF token |
| `timestamp` | string | Request timestamp |

**Flow:**
1. User approves permissions on Shopify
2. Shopify redirects to callback URL
3. Backend exchanges code for access token
4. Token encrypted and stored in database
5. Webhooks registered automatically
6. User redirected to frontend success page

**Success Redirect:**
```
https://app.shipcrowd.com/settings/integrations/shopify?status=success&store=example.myshopify.com
```

**Error Redirect:**
```
https://app.shipcrowd.com/settings/integrations/shopify?status=error&message=Installation%20failed
```

---

## Store Management

### 3. List Connected Stores

Get all Shopify stores connected to the company.

**Endpoint:** `GET /integrations/shopify/stores`

**Auth:** Required

**Example Request:**
```bash
curl -X GET "https://api.shipcrowd.com/api/v1/integrations/shopify/stores" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "count": 2,
  "stores": [
    {
      "id": "507f1f77bcf86cd799439011",
      "shopDomain": "store1.myshopify.com",
      "shopName": "Main Store",
      "shopEmail": "contact@store1.com",
      "shopCountry": "US",
      "shopCurrency": "USD",
      "shopPlan": "professional",
      "isActive": true,
      "isPaused": false,
      "installedAt": "2025-01-01T00:00:00Z",
      "syncConfig": {
        "orderSync": {
          "enabled": true,
          "autoSync": true,
          "syncInterval": 15,
          "lastSyncAt": "2025-01-01T12:00:00Z",
          "syncStatus": "IDLE",
          "errorCount": 0
        },
        "inventorySync": {
          "enabled": true,
          "autoSync": false,
          "syncInterval": 60,
          "syncDirection": "ONE_WAY",
          "errorCount": 0
        },
        "webhooksEnabled": true
      },
      "stats": {
        "totalOrdersSynced": 1250,
        "totalProductsMapped": 45,
        "totalInventorySyncs": 320,
        "lastOrderSyncAt": "2025-01-01T12:00:00Z"
      },
      "activeWebhooksCount": 8
    }
  ]
}
```

---

### 4. Get Store Details

Get detailed information about a specific store.

**Endpoint:** `GET /integrations/shopify/stores/:id`

**Auth:** Required

**Example Request:**
```bash
curl -X GET "https://api.shipcrowd.com/api/v1/integrations/shopify/stores/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "store": {
    "id": "507f1f77bcf86cd799439011",
    "shopDomain": "store1.myshopify.com",
    "shopName": "Main Store",
    "scope": "read_orders,write_orders,read_products,write_products,write_inventory",
    "webhooks": [
      {
        "topic": "orders/create",
        "shopifyWebhookId": "123456",
        "address": "https://api.shipcrowd.com/api/v1/webhooks/shopify/orders/create",
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 5. Disconnect Store

Disconnect Shopify store and unregister webhooks.

**Endpoint:** `DELETE /integrations/shopify/stores/:id`

**Auth:** Required (Admin/Company Owner)

**Example Request:**
```bash
curl -X DELETE "https://api.shipcrowd.com/api/v1/integrations/shopify/stores/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Store disconnected successfully"
}
```

---

### 6. Test Connection

Verify store connection is still valid.

**Endpoint:** `POST /integrations/shopify/stores/:id/test`

**Auth:** Required

**Example Request:**
```bash
curl -X POST "https://api.shipcrowd.com/api/v1/integrations/shopify/stores/507f1f77bcf86cd799439011/test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "connected": true,
  "message": "Connection is valid"
}
```

---

### 7. Pause/Resume Sync

Pause or resume automatic syncing for a store.

**Endpoint:** `POST /integrations/shopify/stores/:id/pause`

**Endpoint:** `POST /integrations/shopify/stores/:id/resume`

**Auth:** Required (Admin/Company Owner)

**Example Request (Pause):**
```bash
curl -X POST "https://api.shipcrowd.com/api/v1/integrations/shopify/stores/507f1f77bcf86cd799439011/pause" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Sync paused successfully"
}
```

---

## Product Mapping

### 8. Auto-Map Products

Automatically map Shopify products to Shipcrowd SKUs by exact match.

**Endpoint:** `POST /integrations/shopify/stores/:id/mappings/auto`

**Auth:** Required (Admin/Warehouse Manager)

**Example Request:**
```bash
curl -X POST "https://api.shipcrowd.com/api/v1/integrations/shopify/stores/507f1f77bcf86cd799439011/mappings/auto" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "mapped": 45,
  "skipped": 5,
  "failed": 0,
  "unmappedSKUs": [],
  "message": "Auto-mapped 45 products, skipped 5, failed 0"
}
```

---

### 9. List Product Mappings

Get all product mappings with pagination and filters.

**Endpoint:** `GET /integrations/shopify/stores/:id/mappings`

**Auth:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |
| `isActive` | boolean | - | Filter by active status |
| `syncInventory` | boolean | - | Filter by inventory sync enabled |
| `mappingType` | string | - | Filter by type (`AUTO` or `MANUAL`) |
| `search` | string | - | Search in SKU/title |

**Example Request:**
```bash
curl -X GET "https://api.shipcrowd.com/api/v1/integrations/shopify/stores/507f1f77bcf86cd799439011/mappings?page=1&limit=20&syncInventory=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "mappings": [
    {
      "id": "507f1f77bcf86cd799439013",
      "shopifyProductId": "7123456789",
      "shopifyVariantId": "41234567890",
      "shopifySKU": "TSHIRT-BLK-M",
      "shopifyTitle": "Black T-Shirt - Medium",
      "shipcrowdSKU": "APPAREL-001-BLK-M",
      "shipcrowdProductName": "Premium Black T-Shirt Medium",
      "mappingType": "AUTO",
      "syncInventory": true,
      "syncPrice": false,
      "syncOnFulfillment": true,
      "isActive": true,
      "syncErrors": 0,
      "lastSyncAt": "2025-01-01T12:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "pages": 3
}
```

---

### 10. Create Manual Mapping

Create a manual product mapping.

**Endpoint:** `POST /integrations/shopify/stores/:id/mappings`

**Auth:** Required (Admin/Warehouse Manager)

**Request Body:**
```json
{
  "shopifyProductId": "7123456789",
  "shopifyVariantId": "41234567890",
  "shopifySKU": "TSHIRT-BLK-M",
  "shopifyTitle": "Black T-Shirt - Medium",
  "shopifyBarcode": "123456789012",
  "shopifyInventoryItemId": "43123456789",
  "shipcrowdSKU": "APPAREL-001-BLK-M",
  "shipcrowdProductName": "Premium Black T-Shirt Medium",
  "syncInventory": true,
  "syncPrice": false,
  "syncOnFulfillment": true
}
```

**Example Request:**
```bash
curl -X POST "https://api.shipcrowd.com/api/v1/integrations/shopify/stores/507f1f77bcf86cd799439011/mappings" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shopifyProductId":"7123456789","shopifyVariantId":"41234567890",...}'
```

**Example Response:**
```json
{
  "success": true,
  "mapping": {
    "id": "507f1f77bcf86cd799439014",
    "mappingType": "MANUAL",
    ...
  },
  "message": "Product mapping created successfully"
}
```

---

### 11. Delete Mapping

Delete a product mapping.

**Endpoint:** `DELETE /integrations/shopify/mappings/:id`

**Auth:** Required (Admin/Warehouse Manager)

**Example Request:**
```bash
curl -X DELETE "https://api.shipcrowd.com/api/v1/integrations/shopify/mappings/507f1f77bcf86cd799439014" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Product mapping deleted successfully"
}
```

---

### 12. Toggle Mapping Status

Activate or deactivate a product mapping.

**Endpoint:** `POST /integrations/shopify/mappings/:id/toggle`

**Auth:** Required (Admin/Warehouse Manager)

**Request Body:**
```json
{
  "isActive": false
}
```

**Example Request:**
```bash
curl -X POST "https://api.shipcrowd.com/api/v1/integrations/shopify/mappings/507f1f77bcf86cd799439014/toggle" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive":false}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Mapping deactivated successfully"
}
```

---

### 13. Import Mappings (CSV)

Bulk import product mappings from CSV.

**Endpoint:** `POST /integrations/shopify/stores/:id/mappings/import`

**Auth:** Required (Admin/Warehouse Manager)

**Request Body:**
```json
{
  "csvData": "shopifyProductId,shopifyVariantId,shopifySKU,shipcrowdSKU,syncInventory\n7123456789,41234567890,TSHIRT-BLK-M,APPAREL-001-BLK-M,true"
}
```

**Example Response:**
```json
{
  "success": true,
  "imported": 43,
  "failed": 2,
  "errors": [
    "Row 5: Mapping already exists for variant 41234567891",
    "Row 12: Invalid SKU format"
  ],
  "message": "Imported 43 mappings, failed 2"
}
```

---

### 14. Export Mappings (CSV)

Export all product mappings to CSV.

**Endpoint:** `GET /integrations/shopify/stores/:id/mappings/export`

**Auth:** Required (Admin/Warehouse Manager)

**Example Request:**
```bash
curl -X GET "https://api.shipcrowd.com/api/v1/integrations/shopify/stores/507f1f77bcf86cd799439011/mappings/export" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o product-mappings.csv
```

**Response:** CSV file download

---

### 15. Get Mapping Statistics

Get statistics about product mappings for a store.

**Endpoint:** `GET /integrations/shopify/stores/:id/mappings/stats`

**Auth:** Required

**Example Response:**
```json
{
  "success": true,
  "stats": {
    "total": 45,
    "active": 43,
    "inactive": 2,
    "auto": 40,
    "manual": 5,
    "syncing": 43,
    "errors": 1
  }
}
```

---

### 16. Sync Single Product Inventory

Manually sync inventory for a single product mapping.

**Endpoint:** `POST /integrations/shopify/mappings/:id/sync`

**Auth:** Required (Admin/Warehouse Manager)

**Request Body:**
```json
{
  "quantity": 150
}
```

**Example Request:**
```bash
curl -X POST "https://api.shipcrowd.com/api/v1/integrations/shopify/mappings/507f1f77bcf86cd799439014/sync" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity":150}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Inventory synced successfully"
}
```

---

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid request parameters",
  "details": {
    "field": "shopifySKU",
    "message": "SKU is required"
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Resource not found",
  "message": "Store not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

- **General API:** 100 requests per minute per user
- **Shopify API (internal):** 40 req/s burst, 2 req/s steady (leaky bucket)
- **GraphQL:** Cost-based throttling (Shopify limits)

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)

**Response Format:**
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "pages": 3
}
```

---

## Webhooks Reference

See [Webhook Documentation](./SHOPIFY_WEBHOOKS.md) for detailed webhook payload examples.

---

**Last Updated:** January 2025
**API Version:** 1.0.0
