# Flipkart Seller API Integration Guide for Shipcrowd

**API Version**: Developer API v3.0  
**Last Updated**: January 7, 2026  
**Integration Type**: Server-to-Server (Marketplace Seller)  
**Authentication**: OAuth 2.0 (Client Credentials + Authorization Code)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Orders & Shipments API](#orders--shipments-api)
4. [Dispatch Management](#dispatch-management)
5. [Label & Invoice Generation](#label--invoice-generation)
6. [Self-Ship API](#self-ship-api)
7. [Returns Management](#returns-management)
8. [Listings & Inventory](#listings--inventory)
9. [Notifications Service](#notifications-service)
10. [Implementation Details](#implementation-details)
11. [Common Issues & Solutions](#common-issues--solutions)
12. [Sandbox Testing](#sandbox-testing)

---

## Overview

Shipcrowd integrates with Flipkart Seller API v3 to enable marketplace sellers to manage their orders, shipments, and fulfillment operations. This integration allows:

- **Order Ingestion**: Fetch approved orders awaiting fulfillment
- **Shipment Management**: Generate labels, mark as ready to dispatch
- **Self-Ship**: Manage logistics through third-party couriers
- **Label Generation**: Download shipping labels and invoices
- **Real-time Updates**: Subscribe to order notifications via push mechanism

### Architecture Overview

```mermaid
graph TD
    subgraph Flipkart ["Flipkart Marketplace"]
        FO[Flipkart Orders]
        FN[Notification Service]
    end

    subgraph Auth ["Authentication Layer"]
        OA[OAuth 2.0 Server]
        AT[Access Token Cache]
    end

    subgraph Shipcrowd ["Shipcrowd Backend"]
        P[Polling Service]
        NH[Notification Handler]
        OM[Order Manager]
        DM[Dispatch Manager]
        DB[(MongoDB)]
    end

    subgraph Logistics ["Fulfillment"]
        V[Velocity API]
        FS[Flipkart Self-Ship]
    end

    FO -->|Poll Orders| P
    FN -->|Push Notifications| NH
    P --> OA
    NH --> OA
    OA --> AT
    AT --> OM
    OM --> DB
    OM --> DM
    DM --> V
    DM --> FS
```

### API Quota Limits

| API | Rate Limit | Notes |
|:----|:-----------|:------|
| **General APIs** | ~100 req/min | Not explicitly documented |
| **Affiliate API** | 20 req/sec | For product catalog |
| **Bulk FSN Update** | 10 FSNs per request | Listing updates |
| **Token Validity** | 60 days | Access token |
| **Refresh Token** | 180 days | Used to generate new access tokens |

**⚠️ Important**: Exceeding rate limits may result in API access suspension or termination.

---

## Authentication & Authorization

### 1.1 OAuth 2.0 Authentication

Flipkart supports two OAuth 2.0 flows depending on your application type:

1. **Client Credentials Flow**: For self-access applications (seller managing own account)
2. **Authorization Code Flow**: For third-party applications (partners/aggregators managing multiple sellers)

### 1.2 Self-Access Application Setup

**For sellers integrating APIs for their own store:**

**Step 1: Create Application**

1. Log into **Flipkart Seller Dashboard**: https://seller.flipkart.com/
2. Navigate to **Manage Profile** → **Developer Access**
3. Click **"Create New Access"**
4. Fill in details:
   ```
   Application Name: Shipcrowd Integration
   Description: Order and shipment management for Shipcrowd
   ```
5. Click **"Submit"**

**Step 2: Get Credentials**

After creation, you'll receive:
- **Application ID** (Client ID): `app_xxxxxxxxxxxxx`
- **Application Secret**: 64-character hexadecimal string

**⚠️ Critical**: Store these credentials securely. The secret cannot be retrieved later.

### 1.3 Third-Party Application Setup

**For partners/aggregators managing multiple sellers:**

**Step 1: Register as Partner**

1. Visit **Flipkart Partner Portal**
2. Indicate you are an **API Partner**
3. Submit business verification documents
4. Wait for Flipkart approval (3-5 business days)

**Step 2: Create Application**

1. Log into Partner Dashboard
2. Navigate to **Profile** → **Manage API Access**
3. Click **"Create Application"**
4. Fill in details:
   ```
   Application Name: Shipcrowd Multi-Seller Integration
   Description: Aggregator platform for order management
   Redirect URL: https://Shipcrowd.com/auth/flipkart/callback
   ```
   **⚠️ Important**: Redirect URL must be HTTPS.

**Step 3: Get Credentials**

- **Client ID**: `app_xxxxxxxxxxxxx`
- **Client Secret**: 64-character string
- **Redirect URI**: As configured above

### 1.4 Generating Access Tokens (Client Credentials Flow)

**For self-access applications:**

**Endpoint**: `POST /oauth-service/oauth/token`

**Base URL**:
- Production: `https://api.flipkart.net`
- Sandbox: `https://sandbox-api.flipkart.net`

**Request**:
```bash
curl -X POST https://api.flipkart.net/oauth-service/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "scope=Seller_Api" \
  -d "client_id=app_xxxxxxxxxxxxx" \
  -d "client_secret=YOUR_APP_SECRET"
```

**Alternative (Basic Auth)**:
```bash
# Base64 encode: app_id:app_secret
echo -n "app_xxxxxxxxxxxxx:YOUR_SECRET" | base64

curl -X POST https://api.flipkart.net/oauth-service/oauth/token \
  -H "Authorization: Basic YXBwX3h4eHh4eHh4eHh4eHh4eDpZT1VSX1NFQ1JFVA==" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "scope=Seller_Api"
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJTZWxsZXJfQXBpIl0sImV4cCI6MTY3MzE4NDAwMCwianRpIjoiMTIzNDU2NzgtYWJjZC0xMjM0LWFiY2QtMTIzNDU2Nzg5MGFiIiwiY2xpZW50X2lkIjoiYXBwX3h4eHh4eHh4eHh4eHh4In0.xxxxxxxxxxxxxxxxx",
  "token_type": "Bearer",
  "expires_in": 5184000,
  "scope": "Seller_Api",
  "jti": "12345678-abcd-1234-abcd-1234567890ab"
}
```

**Token Lifespan**:
- **Access Token**: 60 days (`expires_in: 5184000` seconds)
- **Refresh Token**: 180 days (if provided)

### 1.5 Authorization Code Flow (Third-Party Apps)

**Step 1: Redirect Seller to Authorization URL**

```javascript
const authorizationUrl = `https://api.flipkart.net/oauth-service/oauth/authorize` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=Seller_Api` +
  `&state=${CSRF_TOKEN}` +
  `&response_type=code`;

// Redirect seller to this URL
res.redirect(authorizationUrl);
```

**Step 2: Handle Callback**

After seller authorizes, Flipkart redirects to:
```
https://Shipcrowd.com/auth/flipkart/callback?code=AUTH_CODE&state=CSRF_TOKEN
```

**Step 3: Exchange Code for Token**

```bash
curl -X POST https://api.flipkart.net/oauth-service/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE" \
  -d "client_id=app_xxxxxxxxxxxxx" \
  -d "client_secret=YOUR_SECRET" \
  -d "redirect_uri=https://Shipcrowd.com/auth/flipkart/callback"
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 5184000,
  "scope": "Seller_Api"
}
```

### 1.6 Token Management Implementation

**⚠️ Critical Issue**: Access tokens expire in ~1 hour despite `expires_in: 5184000` in response.

**Implementation**:
```javascript
class FlipkartAuthService {
  static async getAccessToken(sellerId) {
    const seller = await Seller.findOne({ flipkartSellerId: sellerId });
    
    // Check if cached token is still valid
    // ⚠️ Use 1 hour expiry, not the expires_in value
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    
    if (seller.flipkartAccessToken && seller.tokenExpiresAt > oneHourFromNow) {
      return seller.flipkartAccessToken;
    }
    
    // Generate new access token
    const response = await axios.post(
      'https://api.flipkart.net/oauth-service/oauth/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'Seller_Api',
        client_id: seller.flipkartAppId || process.env.FLIPKART_APP_ID,
        client_secret: seller.flipkartAppSecret || process.env.FLIPKART_APP_SECRET
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    // Cache token with 55-minute expiry (5 min buffer)
    await Seller.updateOne(
      { flipkartSellerId: sellerId },
      {
        flipkartAccessToken: response.data.access_token,
        tokenExpiresAt: new Date(Date.now() + 55 * 60 * 1000)
      }
    );
    
    return response.data.access_token;
  }
}
```

### 1.7 Automatic Token Refresh on 401

**Critical Implementation**:
```javascript
async function callFlipkartAPI(endpoint, options, sellerId) {
  let accessToken = await FlipkartAuthService.getAccessToken(sellerId);
  
  try {
    const response = await axios({
      ...options,
      url: `https://api.flipkart.net${endpoint}`,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
    
  } catch (error) {
    // Token expired - refresh and retry
    if (error.response?.status === 401) {
      console.log('Token expired, refreshing...');
      
      // Force token refresh
      await Seller.updateOne(
        { flipkartSellerId: sellerId },
        { tokenExpiresAt: new Date(0) }
      );
      
      accessToken = await FlipkartAuthService.getAccessToken(sellerId);
      
      // Retry request
      const retryResponse = await axios({
        ...options,
        url: `https://api.flipkart.net${endpoint}`,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return retryResponse.data;
    }
    
    throw error;
  }
}
```

---

## Orders & Shipments API

### 2.1 Search Shipments

**Endpoint**: `POST /v3/orders/search`

**Purpose**: Fetch shipments that need processing from seller location.

**Request Body**:
```json
{
  "filter": {
    "states": ["APPROVED", "READY_TO_PACK", "PACKED"],
    "orderDate": {
      "fromDate": "2026-01-01T00:00:00.000Z",
      "toDate": "2026-01-07T23:59:59.999Z"
    },
    "type": "postpaid"
  },
  "pagination": {
    "pageSize": 20
  }
}
```

**Filter Parameters**:

| Parameter | Type | Description | Values |
|:----------|:-----|:------------|:-------|
| `states` | array | Shipment states | `APPROVED`, `READY_TO_PACK`, `PACKED`, `READY_TO_DISPATCH`, `SHIPPED`, `DELIVERED`, `CANCELLED` |
| `orderDate` | object | Date range filter | `fromDate`, `toDate` |
| `type` | string | Payment type | `postpaid` (prepaid), `cod` (cash on delivery) |
| `skus` | array | Filter by SKUs | `["SKU-001", "SKU-002"]` |

**Response**:
```json
{
  "shipments": [
    {
      "shipmentId": "SHIP1234567890",
      "orderId": "OD123456789012345",
      "orderDate": "2026-01-07T10:00:00.000Z",
      "orderItemId": "001",
      "quantity": 1,
      "sku": "TS-BLK-M",
      "fsn": "TSHGPZE9RTABCDEF",
      "hsn": "6109",
      "productTitle": "Classic Black T-Shirt - Medium",
      "mrp": 999.00,
      "sellingPrice": 899.00,
      "totalPrice": 899.00,
      "dispatchByDate": "2026-01-08T23:59:59.999Z",
      "dispatchAfterDate": "2026-01-07T18:30:00.000Z",
      "deliveryDate": "2026-01-10T23:59:59.999Z",
      "shippingProvider": "EKART",
      "trackingId": null,
      "invoice": {
        "invoiceDate": "2026-01-07T10:00:00.000Z",
        "invoiceNumber": null,
        "serialNumber": "00212345"
      },
      "state": "APPROVED",
      "buyerDetails": {
        "name": "Rajesh Kumar",
        "phone": "+919876543210",
        "alternatePhone": null
      },
      "shippingAddress": {
        "name": "Rajesh Kumar",
        "addressLine1": "123 MG Road",
        "addressLine2": "Near Central Mall",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "landmark": "Opposite HDFC Bank",
        "phone": "+919876543210"
      },
      "facilityId": "F123456",
      "facilityName": "Mumbai Warehouse"
    }
  ],
  "hasMore": true,
  "nextPageUrl": "/v3/orders/search?marker=eyJzaGlwbWVudElkIjoiU0hJUDEyMzQ1Njc4OTAifQ=="
}
```

**Pagination**:
```javascript
async function fetchAllShipments(sellerId, filters) {
  let allShipments = [];
  let hasMore = true;
  let marker = null;
  
  while (hasMore) {
    const response = await callFlipkartAPI(
      '/v3/orders/search',
      {
        method: 'POST',
        data: {
          filter: filters,
          pagination: {
            pageSize: 50,
            ...(marker && { marker })
          }
        }
      },
      sellerId
    );
    
    allShipments = allShipments.concat(response.shipments);
    hasMore = response.hasMore;
    
    if (hasMore && response.nextPageUrl) {
      // Extract marker from nextPageUrl
      const url = new URL(response.nextPageUrl, 'https://api.flipkart.net');
      marker = url.searchParams.get('marker');
    }
  }
  
  return allShipments;
}
```

### 2.2 Get Order Details

**Endpoint**: `GET /v3/shipments/{shipmentIds}`

**Purpose**: Fetch detailed information for specific shipments.

**Example**:
```bash
curl -X GET \
  'https://api.flipkart.net/v3/shipments/SHIP1234567890,SHIP0987654321' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Response**: Similar to search response but with full details for each shipment.

### 2.3 Get Shipping Details

**Endpoint**: `GET /v3/shipments/{shipmentIds}/shippingDetails`

**Purpose**: Retrieve tracking ID, delivery address, and billing details.

**Response**:
```json
{
  "shippingDetails": [
    {
      "shipmentId": "SHIP1234567890",
      "trackingId": "EK1234567890IN",
      "shippingProvider": "EKART",
      "deliveryAddress": {
        "name": "Rajesh Kumar",
        "addressLine1": "123 MG Road",
        "addressLine2": "Near Central Mall",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001",
        "phone": "+919876543210"
      },
      "billingAddress": {
        "name": "Rajesh Kumar",
        "addressLine1": "123 MG Road",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
      }
    }
  ]
}
```

---

## Dispatch Management

### 3.1 Generate Labels & Invoices

**Endpoint**: `POST /v3/shipments/{shipmentIds}/labels`

**Purpose**: Generate shipping labels and invoices. This also marks shipments as `PACKED`.

**Request**:
```bash
curl -X POST \
  'https://api.flipkart.net/v3/shipments/SHIP1234567890/labels' \
  -H 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

**Response**:
```json
{
  "status": "SUCCESS",
  "message": "Labels generated successfully"
}
```

### 3.2 Download Labels

**Endpoint**: `GET /v3/shipments/{shipmentIds}/labels`

**Purpose**: Download generated labels, invoices, and shipping manifests.

**Response**:
```json
{
  "labelResponses": [
    {
      "shipmentId": "SHIP1234567890",
      "label": {
        "base64String": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdl...",
        "format": "PDF"
      },
      "invoice": {
        "base64String": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdl...",
        "format": "PDF"
      },
      "manifest": {
        "base64String": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdl...",
        "format": "PDF"
      }
    }
  ]
}
```

**Implementation**:
```javascript
async function generateAndDownloadLabels(shipmentIds, sellerId) {
  // Step 1: Trigger label generation
  await callFlipkartAPI(
    `/v3/shipments/${shipmentIds.join(',')}/labels`,
    { method: 'POST' },
    sellerId
  );
  
  // Step 2: Wait for generation (usually instant)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 3: Download labels
  const response = await callFlipkartAPI(
    `/v3/shipments/${shipmentIds.join(',')}/labels`,
    { method: 'GET' },
    sellerId
  );
  
  // Step 4: Save to storage
  for (const labelResponse of response.labelResponses) {
    const labelBuffer = Buffer.from(labelResponse.label.base64String, 'base64');
    const invoiceBuffer = Buffer.from(labelResponse.invoice.base64String, 'base64');
    
    await saveLabelToS3(labelBuffer, `labels/${labelResponse.shipmentId}.pdf`);
    await saveLabelToS3(invoiceBuffer, `invoices/${labelResponse.shipmentId}.pdf`);
    
    await ShipcrowdOrder.updateOne(
      { channelShipmentId: labelResponse.shipmentId },
      {
        'shipment.labelUrl': `https://s3.amazonaws.com/Shipcrowd/labels/${labelResponse.shipmentId}.pdf`,
        'shipment.invoiceUrl': `https://s3.amazonaws.com/Shipcrowd/invoices/${labelResponse.shipmentId}.pdf`,
        'shipment.status': 'PACKED'
      }
    );
  }
}
```

### 3.3 Mark Ready to Dispatch

**Endpoint**: `POST /v3/shipments/dispatch`

**Purpose**: Mark shipments as `READY_TO_DISPATCH`. This notifies logistics partner for pickup.

**Request Body**:
```json
{
  "shipmentIds": ["SHIP1234567890", "SHIP0987654321"]
}
```

**Response**:
```json
{
  "successful": ["SHIP1234567890", "SHIP0987654321"],
  "failed": []
}
```

**Workflow**:
```javascript
async function markReadyForDispatch(shipmentIds, sellerId) {
  const response = await callFlipkartAPI(
    '/v3/shipments/dispatch',
    {
      method: 'POST',
      data: { shipmentIds }
    },
    sellerId
  );
  
  // Update successful shipments
  for (const shipmentId of response.successful) {
    await ShipcrowdOrder.updateOne(
      { channelShipmentId: shipmentId },
      {
        'shipment.status': 'READY_TO_DISPATCH',
        'shipment.readyToDispatchAt': new Date()
      }
    );
  }
  
  // Log failed shipments
  if (response.failed.length > 0) {
    console.error('Failed to mark ready for dispatch:', response.failed);
  }
}
```

---

## Self-Ship API

### 4.1 Overview

Self-Ship APIs allow sellers to use their own logistics partners instead of Flipkart's default couriers.

**Use Cases**:
- Using Shipcrowd's Velocity aggregator
- Preferred courier contracts
- Specific delivery requirements

### 4.2 Self-Ship Dispatch

**Endpoint**: `POST /v3/shipments/selfShip/dispatch`

**Purpose**: Mark order items as dispatched with custom courier details.

**Request Body**:
```json
{
  "shipments": [
    {
      "shipmentId": "SHIP1234567890",
      "invoice": {
        "invoiceNumber": "INV-2026-0107-001",
        "invoiceDate": "2026-01-07T12:00:00.000Z",
        "invoiceAmount": 899.00,
        "taxRate": 18.0,
        "subTotal": 762.71,
        "cgst": 68.14,
        "sgst": 68.14,
        "igst": 0.00
      },
      "trackingId": "DL1234567890IN",
      "courierName": "Delhivery",
      "courierCode": "DELHIVERY"
    }
  ]
}
```

**Courier Codes** (India):
- `BLUEDART`
- `DELHIVERY`
- `DTDC`
- `ECOM_EXPRESS`
- `FEDEX`
- `DHL`
- `INDIA_POST`

**Response**:
```json
{
  "responses": [
    {
      "shipmentId": "SHIP1234567890",
      "status": "SUCCESS",
      "message": "Shipment marked as dispatched"
    }
  ]
}
```

**Implementation**:
```javascript
async function selfShipDispatch(order, shipment, sellerId) {
  const response = await callFlipkartAPI(
    '/v3/shipments/selfShip/dispatch',
    {
      method: 'POST',
      data: {
        shipments: [
          {
            shipmentId: order.channelShipmentId,
            invoice: {
              invoiceNumber: shipment.invoiceNumber,
              invoiceDate: shipment.invoiceDate.toISOString(),
              invoiceAmount: order.financials.total,
              taxRate: 18.0,
              subTotal: order.financials.total / 1.18,
              cgst: (order.financials.total / 1.18) * 0.09,
              sgst: (order.financials.total / 1.18) * 0.09,
              igst: 0.00
            },
            trackingId: shipment.awbNumber,
            courierName: shipment.courierName,
            courierCode: shipment.courierCode.toUpperCase()
          }
        ]
      }
    },
    sellerId
  );
  
  await ShipcrowdOrder.updateOne(
    { _id: order._id },
    {
      'shipment.dispatchedToFlipkart': true,
      'shipment.dispatchedAt': new Date()
    }
  );
}
```

### 4.3 Update Delivery Date

**Endpoint**: `PUT /v3/shipments/selfShip/deliveryDate`

**Purpose**: Update expected delivery date for self-ship orders.

**Request Body**:
```json
{
  "shipmentId": "SHIP1234567890",
  "deliveryDate": "2026-01-10T23:59:59.999Z"
}
```

---

## Returns Management

### 5.1 Get Return Orders

**Endpoint**: `POST /v3/returns/search`

**Request Body**:
```json
{
  "filter": {
    "states": ["CUSTOMER_RETURN_REQUESTED", "RETURN_APPROVED"],
    "returnDate": {
      "fromDate": "2026-01-01T00:00:00.000Z",
      "toDate": "2026-01-07T23:59:59.999Z"
    }
  }
}
```

**Return States**:
- `CUSTOMER_RETURN_REQUESTED`
- `RETURN_APPROVED`
- `RETURN_REJECTED`
- `PICKUP_SCHEDULED`
- `PICKED_UP`
- `RETURN_COMPLETED`

### 5.2 Accept/Reject Return

**Endpoint**: `POST /v3/returns/{returnId}/decide`

**Request Body**:
```json
{
  "action": "APPROVE",
  "comment": "Return approved. Item defective."
}
```

**Actions**:
- `APPROVE`: Accept return request
- `REJECT`: Decline return with reason

---

## Listings & Inventory

### 6.1 Update Inventory

**Endpoint**: `POST /v3/inventory/update`

**Purpose**: Update stock levels for FSNs (Flipkart Serial Numbers).

**Request Body**:
```json
{
  "inventories": [
    {
      "fsn": "TSHGPZE9RTABCDEF",
      "sku": "TS-BLK-M",
      "facilityId": "F123456",
      "quantity": 50
    }
  ]
}
```

**⚠️ Limit**: Maximum 10 FSNs per request.

**Response**:
```json
{
  "responses": [
    {
      "fsn": "TSHGPZE9RTABCDEF",
      "status": "SUCCESS",
      "message": "Inventory updated"
    }
  ]
}
```

### 6.2 Get Listings

**Endpoint**: `GET /v3/listings`

**Query Parameters**:
- `sku`: Filter by SKU
- `fsn`: Filter by FSN
- `status`: `ACTIVE`, `INACTIVE`, `REJECTED`

---

## Notifications Service

### 7.1 Overview

Flipkart provides a push-based notification service to avoid aggressive polling.

**Notification Types**:
- Order status changes
- Return requests
- Inventory alerts
- Payment updates

### 7.2 Subscribe to Notifications

**Setup** (via Seller Dashboard):
1. Navigate to **Settings** → **Notifications**
2. Click **"Configure Webhook"**
3. Enter webhook URL: `https://Shipcrowd.com/webhooks/flipkart`
4. Select notification types
5. Save configuration

**Webhook Payload**:
```json
{
  "eventType": "ORDER_STATUS_CHANGE",
  "timestamp": "2026-01-07T12:30:00.000Z",
  "data": {
    "orderId": "OD123456789012345",
    "shipmentId": "SHIP1234567890",
    "oldStatus": "APPROVED",
    "newStatus": "READY_TO_PACK"
  }
}
```

**Implementation**:
```javascript
app.post('/webhooks/flipkart', async (req, res) => {
  const notification = req.body;
  
  // Acknowledge receipt immediately
  res.status(200).send('OK');
  
  // Process asynchronously
  try {
    if (notification.eventType === 'ORDER_STATUS_CHANGE') {
      await syncOrderFromFlipkart(notification.data.shipmentId);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});
```

---

## Common Issues & Solutions

### Issue 1: 401 Unauthorized After 1 Hour

**Symptoms**: API calls fail with `401` despite token showing 60 days validity.

**Root Cause**: Access tokens actually expire in ~1 hour, not 60 days as indicated in `expires_in`.

**Solution**: Implement automatic token refresh on 401 (see Section 1.7).

---

### Issue 2: Labels Not Generated

**Symptoms**: `GET /labels` returns empty response after `POST /labels`.

**Causes**:
1. Insufficient wait time after POST
2. Shipment not in correct state

**Solutions**:
- Wait 2-5 seconds after POST before GET
- Verify shipment is in `APPROVED` or `READY_TO_PACK` state
- Check invoice details are complete

---

### Issue 3: Self-Ship Dispatch Fails

**Symptoms**: `422 Unprocessable Entity` for self-ship dispatch.

**Causes**:
1. Invalid courier code
2. Missing invoice details
3. Incorrect tax calculations

**Solutions**:
- Use uppercase courier codes from approved list
- Include all invoice fields (number, date, amount, taxes)
- Calculate CGST + SGST = 18% (9% each for intra-state)
- Use IGST for inter-state shipments

---

## Sandbox Testing

### 8.1 Sandbox Environment

**Base URL**: `https://sandbox-api.flipkart.net`

**Access**: Request via Seller Portal → Support → API GA Node

### 8.2 Sandbox Features

**Available Testing Scenarios**:
1. **Create Test Orders**: Generate orders in sandbox
2. **Modify Dispatch Dates**: Change timelines for testing
3. **Hold/Release Orders**: Test order lifecycle
4. **Mark Shipped**: Simulate courier updates
5. **Process Returns**: Test return workflows

**Test Order Creation**:
```bash
# Via Sandbox Testing Tool (GUI)
# Navigate to: https://seller.flipkart.com/sandbox-testing-tool
# Follow UI to create test shipments
```

### 8.3 Production Testing Checklist

- [ ] Test token refresh on expiry
- [ ] Verify label generation for all shipment types
- [ ] Test self-ship dispatch with Velocity
- [ ] Confirm webhook notifications
- [ ] Test return acceptance/rejection
- [ ] Verify inventory sync
- [ ] Test COD and prepaid orders separately
- [ ] Validate invoice generation

---

## Implementation Best Practices

### 9.1 Polling Strategy

**Recommended Schedule**:
```javascript
// Fetch new orders every 5 minutes
setInterval(async () => {
  const shipments = await fetchAllShipments(sellerId, {
    states: ['APPROVED'],
    orderDate: {
      fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      toDate: new Date().toISOString()
    }
  });
  
  for (const shipment of shipments) {
    await createShipcrowdOrder(shipment, sellerId);
  }
}, 5 * 60 * 1000);
```

### 9.2 Error Handling

```javascript
async function safeFlipkartCall(endpoint, options, sellerId, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await callFlipkartAPI(endpoint, options, sellerId);
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limit - exponential backoff
        const waitTime = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (error.response?.status === 500 && i < retries - 1) {
        // Server error - retry
        continue;
      }
      
      throw error;
    }
  }
}
```

---

**Document Version**: 2.0 (Comprehensive)  
**Last Reviewed**: January 7, 2026  
**Next Review**: April 1, 2026  
**Maintained By**: Shipcrowd Technical Team

**Official References**:
- Developer Portal: https://seller.flipkart.com/api-docs
- API Overview: https://seller.flipkart.com/api-docs/FMSAPI.html
- OAuth Guide: https://seller.flipkart.com/api-docs/oauth-guide.html
- Orders V3 API: https://seller.flipkart.com/api-docs/order-api-v3.html
- Shipments API: https://github.com/Flipkart/flipkart-seller-api-java-sdk/blob/master/docs/ShipmentV3Api.md
- Sandbox Guide: https://flipkart.github.io/fk-api-platform-docs/docs/mp-api_versioned/sandbox-ap-is
- Self-Serve API: https://github.com/Flipkart/flipkart-seller-api-java-sdk/blob/master/docs/SelfServeApi.md
