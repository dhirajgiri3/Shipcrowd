# VELOCITY SHIPFAST COURIER API - Integration Context Package
**Integration:** Velocity Shipfast Courier API
**Version:** v1 (Custom API)
**Created:** December 26, 2025
**Updated:** December 27, 2025
**Status:** ✅ IMPLEMENTED (Session 5 Complete)
**Priority:** P0 (CRITICAL - Week 2 Deliverable)
**Base URL:** https://shazam.velocity.in

---

## IMPLEMENTATION STATUS

✅ **Session 5 Complete** - All core functionality implemented!

**Implemented Files:**
- `VelocityTypes.ts` - All TypeScript interfaces (200+ lines)
- `VelocityAuth.ts` - Token management with 24-hour lifecycle (150+ lines)
- `VelocityMapper.ts` - Data transformation layer (250+ lines)
- `VelocityShipfastProvider.ts` - Complete provider with 6 core endpoints (350+ lines)
- `VelocityErrorHandler.ts` - Error handling & retry logic (100+ lines)
- `CourierFactory.ts` - Provider orchestration (100+ lines)
- Extended `Warehouse` model with `carrierDetails` field
- Modified `ShipmentService` for API-based carrier selection

**Total Implementation:** ~1,170 lines of production code

**Next Steps:**
- Unit tests (VelocityMapper, Auth, ErrorHandler)
- Integration tests (complete flow)
- WEEK2_VELOCITY_SHIPFAST_SPEC.md documentation

**See:** `/docs/Development/Specifications/WEEK2_VELOCITY_SHIPFAST_SPEC.md` (pending)

---

## TABLE OF CONTENTS

1. [Integration Overview](#1-integration-overview)
2. [Authentication](#2-authentication)
3. [API Endpoints (12 Total)](#3-api-endpoints)
4. [TypeScript Interfaces](#4-typescript-interfaces)
5. [Data Mapping Strategy](#5-data-mapping-strategy)
6. [Error Handling](#6-error-handling)
7. [Rate Limiting & Retry Logic](#7-rate-limiting--retry-logic)
8. [Security Considerations](#8-security-considerations)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Checklist](#10-implementation-checklist)
11. [Week 2 Detailed Specification](#11-week-2-detailed-specification)
12. [Future Enhancements](#12-future-enhancements)

---

## 1. INTEGRATION OVERVIEW

### 1.1 Purpose

Velocity Shipfast is the **primary courier aggregator** for Helix, providing access to multiple Indian courier partners (Delhivery, DTDC, Xpressbees, etc.) through a single API.

### 1.2 Why Velocity Shipfast?

**Advantages:**
- **Multi-Carrier Access**: One API → 15+ courier partners
- **Auto Carrier Selection**: AI-powered best carrier selection
- **Label Generation**: Automatic shipping label PDFs
- **Real-time Tracking**: Unified tracking across all carriers
- **COD Remittance**: Automated COD payment collection
- **NDR Management**: Built-in non-delivery report handling
- **Serviceability Check**: Pre-shipment pincode verification

**vs Building Direct Integrations:**
- Velocity: 12 endpoints → 15+ carriers
- Direct: 12 endpoints × 15 carriers = 180 endpoints
- **Time Saved**: 12 weeks → 1 week

### 1.3 Integration Scope

**Week 2 Implementation:**
- ✅ Authentication & token management
- ✅ Forward Order Orchestration (create shipment)
- ✅ Order Tracking (real-time status)
- ✅ Order Cancellation
- ✅ Serviceability Check (pincode validation)
- ✅ Warehouse Management
- ✅ Label download & storage

**Future (Week 3-4):**
- ⚪ Reverse Order (RTO - Return to Origin)
- ⚪ Reports API (billing, performance)
- ⚪ Weight Discrepancy handling
- ⚪ COD remittance webhooks

### 1.4 API Characteristics

```
Base URL: https://shazam.velocity.in
API Version: v1
Format: REST JSON
Authentication: Token-based (24-hour validity)
Rate Limit: ~100 requests/minute (observed)
Response Time: 1-3 seconds (95th percentile)
Availability: 99.5% SLA
```

---

## 2. AUTHENTICATION

### 2.1 Authentication Endpoint

**POST** `/custom/api/v1/auth-token`

**Purpose:** Obtain 24-hour access token

**Request:**
```json
{
  "username": "+918860606061",
  "password": "Velocity@123"
}
```

**Response (200 OK):**
```json
{
  "token": "16aPVwC64vxqPbTWKlFIxQ"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

### 2.2 Token Management Strategy

**Token Lifecycle:**
```
Generate Token (24hr validity)
  ↓
Store Encrypted in Database
  ↓
Use in Authorization Header
  ↓
Proactive Refresh (at 23 hours)
  ↓
Repeat
```

**Database Schema:**
```typescript
interface VelocityToken {
  token: string;                    // Encrypted
  createdAt: Date;
  expiresAt: Date;                  // createdAt + 24 hours
  isActive: boolean;
}
```

**Refresh Logic:**
```typescript
async function getValidToken(): Promise<string> {
  const token = await VelocityToken.findOne({
    isActive: true,
    expiresAt: { $gt: new Date() }
  });

  // If token expires in < 1 hour, proactively refresh
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  if (!token || token.expiresAt < oneHourFromNow) {
    return await refreshToken();
  }

  return decryptToken(token.token);
}
```

**Security:**
- ✅ Credentials stored in AWS Secrets Manager / environment variables
- ✅ Token encrypted at rest (AES-256-CBC)
- ✅ Never logged in plain text
- ✅ Auto-rotation on expiry

---

## 3. API ENDPOINTS

### 3.1 Endpoint Summary

| # | Endpoint | Method | Purpose | Week 2 | Status |
|---|----------|--------|---------|--------|--------|
| 1 | `/auth-token` | POST | Get auth token | ✅ Yes | P0 |
| 2 | `/forward-order` | POST | Create shipment (orchestration) | ✅ Yes | P0 |
| 3 | `/forward-order-shipment` | POST | Create shipment (manual) | ⚪ No | P2 |
| 4 | `/order-update` | POST | Update order details | ⚪ No | P2 |
| 5 | `/order-tracking` | POST | Track shipments | ✅ Yes | P0 |
| 6 | `/cancel-order` | POST | Cancel shipment | ✅ Yes | P0 |
| 7 | `/serviceability` | POST | Check pincode serviceability | ✅ Yes | P0 |
| 8 | `/warehouse` | POST | Manage pickup locations | ✅ Yes | P1 |
| 9 | `/reverse-order` | POST | Create return shipment | ⚪ Week 3 | P1 |
| 10 | `/reverse-order-shipment` | POST | Create return (manual) | ⚪ Week 3 | P2 |
| 11 | `/reports` | GET | Get reports | ⚪ Week 4 | P2 |
| 12 | `/webhooks` | POST | Receive status updates | ⚪ Week 3 | P1 |

---

### 3.2 ENDPOINT 1: Authentication Token

**Endpoint:** `POST /custom/api/v1/auth-token`
**Authentication:** None (public endpoint)
**Rate Limit:** 10 requests/hour

**Request:**
```json
{
  "username": "+918860606061",
  "password": "Velocity@123"
}
```

**Response (200):**
```json
{
  "token": "16aPVwC64vxqPbTWKlFIxQ"
}
```

**Error Codes:**
- `401`: Invalid credentials
- `429`: Too many requests
- `500`: Server error

**Implementation:**
```typescript
async function authenticateVelocity(): Promise<string> {
  const response = await axios.post(
    `${VELOCITY_BASE_URL}/custom/api/v1/auth-token`,
    {
      username: process.env.VELOCITY_USERNAME,
      password: process.env.VELOCITY_PASSWORD
    }
  );

  const token = response.data.token;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await VelocityToken.create({
    token: encryptToken(token),
    createdAt: new Date(),
    expiresAt,
    isActive: true
  });

  return token;
}
```

---

### 3.3 ENDPOINT 2: Forward Order Orchestration ⭐ CRITICAL

**Endpoint:** `POST /custom/api/v1/forward-order`
**Authentication:** Required (Bearer token in `Authorization` header)
**Rate Limit:** 100 requests/minute

**Purpose:** Create complete forward shipment in one call (order + carrier assignment + label generation)

**Request:**
```json
{
  "order_id": "ORDER-49",
  "order_date": "2018-05-08 12:23",
  "channel_id": "27202",
  "billing_customer_name": "Saurabh",
  "billing_last_name": "Jindal",
  "billing_address": "Incubex, Velocity",
  "billing_city": "Bangalore",
  "billing_pincode": "560102",
  "billing_state": "Karnataka",
  "billing_country": "India",
  "billing_email": "saurabh@velocity.in",
  "billing_phone": "8860697807",
  "shipping_is_billing": true,
  "print_label": true,
  "order_items": [
    {
      "name": "T-shirt Round Neck",
      "sku": "t-shirt-round1474",
      "units": 2,
      "selling_price": 1000,
      "discount": 100,
      "tax": 10
    }
  ],
  "payment_method": "COD",          // "COD" | "PREPAID"
  "sub_total": 990,
  "length": 100,                    // cm
  "breadth": 50,                    // cm
  "height": 10,                     // cm
  "weight": 0.50,                   // kg
  "cod_collectible": 990,           // Required for COD orders
  "pickup_location": "HomeNew",
  "warehouse_id": "WHYYB5",
  "vendor_details": {
    "email": "vendor@example.com",
    "phone": "9879879879",
    "name": "Coco Cookie",
    "address": "Street 1",
    "city": "delhi",
    "state": "new delhi",
    "country": "india",
    "pin_code": "110077",
    "pickup_location": "HomeNew"
  }
}
```

**Field Validation:**
```typescript
const forwardOrderSchema = z.object({
  order_id: z.string().max(50),                 // Unique order ID
  order_date: z.string(),                       // "YYYY-MM-DD HH:mm"
  billing_customer_name: z.string().max(100),
  billing_phone: z.string().regex(/^\d{10}$/),  // 10 digits
  billing_pincode: z.string().regex(/^\d{6}$/), // 6 digits
  billing_address: z.string().max(200),
  billing_city: z.string().max(50),
  billing_state: z.string().max(50),
  billing_country: z.string().default('India'),
  billing_email: z.string().email().optional(),
  payment_method: z.enum(['COD', 'PREPAID']),
  weight: z.number().min(0.1).max(30),          // kg
  length: z.number().min(1).max(200),           // cm
  breadth: z.number().min(1).max(200),          // cm
  height: z.number().min(1).max(200),           // cm
  order_items: z.array(z.object({
    name: z.string(),
    sku: z.string().optional(),
    units: z.number().int().min(1),
    selling_price: z.number().min(0),
    discount: z.number().min(0).default(0),
    tax: z.number().min(0).default(0)
  })),
  warehouse_id: z.string(),                     // "WHYYB5" (test warehouse)
  pickup_location: z.string(),
  cod_collectible: z.number().optional(),       // Required if COD
});
```

**Response (200 OK):**
```json
{
  "shipment_id": "27215690",
  "order_id": "ORDER-49",
  "awb": "SHPHYB123456789",
  "courier_name": "Delhivery Surface",
  "courier_company_id": "1",
  "label_url": "https://shazam.velocity.in/api/label/27215690.pdf",
  "manifest_url": "https://shazam.velocity.in/api/manifest/27215690.pdf",
  "status": "NEW"
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "message": "Validation failed",
  "errors": {
    "billing_pincode": "Invalid pincode format",
    "weight": "Weight exceeds maximum limit"
  }
}
```

**404 Not Found:**
```json
{
  "message": "Warehouse not found",
  "warehouse_id": "INVALID_ID"
}
```

**422 Unprocessable Entity:**
```json
{
  "message": "Destination pincode not serviceable",
  "pincode": "999999",
  "available_carriers": []
}
```

**500 Internal Server Error:**
```json
{
  "message": "Failed to create shipment",
  "error": "Carrier API timeout"
}
```

**Implementation:**
```typescript
async function createForwardOrder(order: IOrder): Promise<VelocityShipmentResponse> {
  const token = await getValidToken();

  const payload = mapOrderToVelocity(order);

  const response = await axios.post(
    `${VELOCITY_BASE_URL}/custom/api/v1/forward-order`,
    payload,
    {
      headers: { Authorization: token },
      timeout: 30000  // 30 seconds
    }
  );

  // Download and store label
  await downloadAndStoreLabel(response.data.label_url, response.data.awb);

  // Update order with tracking info
  await Order.findByIdAndUpdate(order._id, {
    'shippingDetails.trackingNumber': response.data.awb,
    'shippingDetails.provider': response.data.courier_name,
    currentStatus: 'shipped'
  });

  return response.data;
}
```

---

### 3.4 ENDPOINT 3: Order Tracking

**Endpoint:** `POST /custom/api/v1/order-tracking`
**Authentication:** Required
**Rate Limit:** 100 requests/minute

**Purpose:** Track multiple shipments by AWB numbers

**Request:**
```json
{
  "awbs": ["SHPHYB123456789", "SHPHYB987654321"]
}
```

**Response (200):**
```json
[
  {
    "awb": "SHPHYB123456789",
    "order_id": "ORDER-49",
    "status": "in_transit",
    "status_code": "IT",
    "courier_name": "Delhivery Surface",
    "current_location": "Mumbai Hub",
    "estimated_delivery": "2025-12-30",
    "tracking_history": [
      {
        "status": "picked_up",
        "location": "Bangalore Warehouse",
        "timestamp": "2025-12-26 10:00:00",
        "description": "Shipment picked up"
      },
      {
        "status": "in_transit",
        "location": "Mumbai Hub",
        "timestamp": "2025-12-27 08:00:00",
        "description": "In transit to destination"
      }
    ]
  }
]
```

**Status Codes Mapping:**
```typescript
const VELOCITY_STATUS_MAP = {
  'NEW': 'created',
  'PKP': 'picked_up',
  'IT': 'in_transit',
  'OFD': 'out_for_delivery',
  'DEL': 'delivered',
  'NDR': 'ndr',
  'RTO': 'rto',
  'LOST': 'lost',
  'DAMAGED': 'damaged',
  'CANCELLED': 'cancelled'
};
```

**Implementation:**
```typescript
async function trackShipments(awbs: string[]): Promise<VelocityTrackingResponse[]> {
  const token = await getValidToken();

  const response = await axios.post(
    `${VELOCITY_BASE_URL}/custom/api/v1/order-tracking`,
    { awbs },
    { headers: { Authorization: token } }
  );

  // Update local shipment status
  for (const tracking of response.data) {
    await Shipment.findOneAndUpdate(
      { trackingNumber: tracking.awb },
      {
        currentStatus: VELOCITY_STATUS_MAP[tracking.status_code],
        $push: {
          statusHistory: {
            status: VELOCITY_STATUS_MAP[tracking.status_code],
            location: tracking.current_location,
            timestamp: new Date(),
            description: tracking.tracking_history[0]?.description
          }
        }
      }
    );
  }

  return response.data;
}
```

---

### 3.5 ENDPOINT 4: Cancel Order

**Endpoint:** `POST /custom/api/v1/cancel-order`
**Authentication:** Required
**Rate Limit:** 50 requests/minute

**Purpose:** Cancel a shipment before delivery

**Request:**
```json
{
  "awb": "SHPHYB123456789"
}
```

**Response (200):**
```json
{
  "message": "Order cancelled successfully",
  "awb": "SHPHYB123456789",
  "status": "CANCELLED"
}
```

**Error (400):**
```json
{
  "message": "Cannot cancel order in current status",
  "awb": "SHPHYB123456789",
  "current_status": "delivered"
}
```

**Cancellation Rules:**
```typescript
// Can cancel if status is:
const CANCELLABLE_STATUSES = ['NEW', 'PKP', 'IT'];

// Cannot cancel if:
const NON_CANCELLABLE_STATUSES = ['OFD', 'DEL', 'RTO', 'LOST'];
```

---

### 3.6 ENDPOINT 5: Serviceability Check

**Endpoint:** `POST /custom/api/v1/serviceability`
**Authentication:** Required
**Rate Limit:** 200 requests/minute

**Purpose:** Check if a pincode is serviceable before creating order

**Request:**
```json
{
  "pickup_pincode": "560102",
  "delivery_pincode": "400001",
  "cod": 1,                         // 1 = COD, 0 = Prepaid
  "weight": 0.5                     // kg
}
```

**Response (200):**
```json
{
  "delivery_pincode": "400001",
  "is_serviceable": true,
  "available_carriers": [
    {
      "courier_name": "Delhivery Surface",
      "courier_company_id": "1",
      "estimated_delivery_days": 3,
      "rate": 45,
      "cod_available": true
    },
    {
      "courier_name": "DTDC Express",
      "courier_company_id": "5",
      "estimated_delivery_days": 2,
      "rate": 60,
      "cod_available": true
    }
  ]
}
```

**Response (422 - Not Serviceable):**
```json
{
  "delivery_pincode": "999999",
  "is_serviceable": false,
  "available_carriers": [],
  "message": "No carriers service this pincode"
}
```

**Use Cases:**
1. **Pre-Order Validation**: Check serviceability before allowing order
2. **Rate Shopping**: Show customer available carriers and rates
3. **Carrier Selection**: Auto-select cheapest/fastest carrier
4. **COD Availability**: Verify COD is available for pincode

---

### 3.7 ENDPOINT 6: Warehouse Management

**Endpoint:** `POST /custom/api/v1/warehouse`
**Authentication:** Required
**Rate Limit:** 20 requests/minute

**Purpose:** Create/update pickup locations

**Request (Create):**
```json
{
  "name": "Mumbai Warehouse",
  "phone": "9876543210",
  "email": "warehouse@example.com",
  "address": "123 Main Street",
  "address_2": "Andheri East",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "pin_code": "400069",
  "return_address": "123 Main Street",
  "return_city": "Mumbai",
  "return_state": "Maharashtra",
  "return_country": "India",
  "return_pin_code": "400069"
}
```

**Response (200):**
```json
{
  "warehouse_id": "WHXYZ123",
  "name": "Mumbai Warehouse",
  "status": "active",
  "message": "Warehouse created successfully"
}
```

**Implementation:**
```typescript
async function createVelocityWarehouse(warehouse: IWarehouse): Promise<string> {
  const token = await getValidToken();

  const payload = {
    name: warehouse.name,
    phone: warehouse.contactInfo.phone,
    email: warehouse.contactInfo.email,
    address: warehouse.address.line1,
    address_2: warehouse.address.line2 || '',
    city: warehouse.address.city,
    state: warehouse.address.state,
    country: warehouse.address.country,
    pin_code: warehouse.address.postalCode,
    return_address: warehouse.address.line1,
    return_city: warehouse.address.city,
    return_state: warehouse.address.state,
    return_country: warehouse.address.country,
    return_pin_code: warehouse.address.postalCode
  };

  const response = await axios.post(
    `${VELOCITY_BASE_URL}/custom/api/v1/warehouse`,
    payload,
    { headers: { Authorization: token } }
  );

  // Store warehouse_id in local database
  await Warehouse.findByIdAndUpdate(warehouse._id, {
    'carrierDetails.velocityWarehouseId': response.data.warehouse_id
  });

  return response.data.warehouse_id;
}
```

---

## 4. TYPESCRIPT INTERFACES

### 4.1 Request Interfaces

```typescript
// Authentication
interface VelocityAuthRequest {
  username: string;
  password: string;
}

interface VelocityAuthResponse {
  token: string;
}

// Forward Order
interface VelocityForwardOrderRequest {
  order_id: string;
  order_date: string;              // "YYYY-MM-DD HH:mm"
  channel_id?: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email?: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  print_label: boolean;
  order_items: VelocityOrderItem[];
  payment_method: 'COD' | 'PREPAID';
  sub_total: number;
  length: number;                  // cm
  breadth: number;                 // cm
  height: number;                  // cm
  weight: number;                  // kg
  cod_collectible?: number;        // Required for COD
  pickup_location: string;
  warehouse_id: string;
  vendor_details?: VelocityVendorDetails;
}

interface VelocityOrderItem {
  name: string;
  sku?: string;
  units: number;
  selling_price: number;
  discount?: number;
  tax?: number;
}

interface VelocityVendorDetails {
  email: string;
  phone: string;
  name: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  pickup_location: string;
}

// Responses
interface VelocityShipmentResponse {
  shipment_id: string;
  order_id: string;
  awb: string;
  courier_name: string;
  courier_company_id: string;
  label_url: string;
  manifest_url?: string;
  status: string;
}

interface VelocityTrackingRequest {
  awbs: string[];
}

interface VelocityTrackingResponse {
  awb: string;
  order_id: string;
  status: string;
  status_code: string;
  courier_name: string;
  current_location: string;
  estimated_delivery: string;
  tracking_history: VelocityTrackingEvent[];
}

interface VelocityTrackingEvent {
  status: string;
  location: string;
  timestamp: string;
  description: string;
}

// Serviceability
interface VelocityServiceabilityRequest {
  pickup_pincode: string;
  delivery_pincode: string;
  cod: 0 | 1;
  weight: number;
}

interface VelocityServiceabilityResponse {
  delivery_pincode: string;
  is_serviceable: boolean;
  available_carriers: VelocityCarrierOption[];
}

interface VelocityCarrierOption {
  courier_name: string;
  courier_company_id: string;
  estimated_delivery_days: number;
  rate: number;
  cod_available: boolean;
}

// Cancel Order
interface VelocityCancelRequest {
  awb: string;
}

interface VelocityCancelResponse {
  message: string;
  awb: string;
  status: string;
}

// Warehouse
interface VelocityWarehouseRequest {
  name: string;
  phone: string;
  email: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  return_address: string;
  return_city: string;
  return_state: string;
  return_country: string;
  return_pin_code: string;
}

interface VelocityWarehouseResponse {
  warehouse_id: string;
  name: string;
  status: 'active' | 'inactive';
  message: string;
}
```

### 4.2 Error Interfaces

```typescript
interface VelocityAPIError {
  message: string;
  errors?: Record<string, string>;
  error?: string;
  status_code?: number;
}

class VelocityError extends Error {
  statusCode: number;
  velocityError: VelocityAPIError;

  constructor(statusCode: number, velocityError: VelocityAPIError) {
    super(velocityError.message);
    this.statusCode = statusCode;
    this.velocityError = velocityError;
  }
}
```

---

## 5. DATA MAPPING STRATEGY

### 5.1 Order → Velocity Forward Order

```typescript
function mapOrderToVelocity(order: IOrder, warehouse: IWarehouse): VelocityForwardOrderRequest {
  return {
    order_id: order.orderNumber,
    order_date: formatDate(order.createdAt, 'YYYY-MM-DD HH:mm'),
    billing_customer_name: order.customerInfo.name.split(' ')[0],
    billing_last_name: order.customerInfo.name.split(' ').slice(1).join(' ') || '',
    billing_address: order.customerInfo.address.line1,
    billing_city: order.customerInfo.address.city,
    billing_pincode: order.customerInfo.address.postalCode,
    billing_state: order.customerInfo.address.state,
    billing_country: order.customerInfo.address.country,
    billing_email: order.customerInfo.email,
    billing_phone: order.customerInfo.phone.replace(/[^0-9]/g, ''), // Remove +91, spaces
    shipping_is_billing: true,
    print_label: true,
    order_items: order.products.map(p => ({
      name: p.name,
      sku: p.sku || `SKU-${p.name.substring(0, 10)}`,
      units: p.quantity,
      selling_price: p.price,
      discount: 0,
      tax: 0
    })),
    payment_method: order.paymentMethod === 'cod' ? 'COD' : 'PREPAID',
    sub_total: order.totals.subtotal,
    length: calculateTotalLength(order.products),
    breadth: calculateTotalBreadth(order.products),
    height: calculateTotalHeight(order.products),
    weight: calculateTotalWeight(order.products) / 1000, // grams to kg
    cod_collectible: order.paymentMethod === 'cod' ? order.totals.total : undefined,
    pickup_location: warehouse.name,
    warehouse_id: warehouse.carrierDetails?.velocityWarehouseId || 'WHYYB5',
    vendor_details: {
      email: warehouse.contactInfo.email || 'noreply@Helix.com',
      phone: warehouse.contactInfo.phone,
      name: warehouse.contactInfo.name,
      address: warehouse.address.line1,
      address_2: warehouse.address.line2 || '',
      city: warehouse.address.city,
      state: warehouse.address.state,
      country: warehouse.address.country,
      pin_code: warehouse.address.postalCode,
      pickup_location: warehouse.name
    }
  };
}
```

### 5.2 Velocity Tracking → Shipment Status

```typescript
function mapVelocityStatusToShipment(
  velocityStatus: string
): { status: string; description: string } {
  const statusMap: Record<string, { status: string; description: string }> = {
    'NEW': { status: 'created', description: 'Shipment created' },
    'PKP': { status: 'picked_up', description: 'Picked up from warehouse' },
    'IT': { status: 'in_transit', description: 'In transit' },
    'OFD': { status: 'out_for_delivery', description: 'Out for delivery' },
    'DEL': { status: 'delivered', description: 'Delivered' },
    'NDR': { status: 'ndr', description: 'Non-delivery report' },
    'RTO': { status: 'rto', description: 'Return to origin' },
    'LOST': { status: 'lost', description: 'Shipment lost' },
    'DAMAGED': { status: 'damaged', description: 'Shipment damaged' },
    'CANCELLED': { status: 'cancelled', description: 'Shipment cancelled' }
  };

  return statusMap[velocityStatus] || { status: 'unknown', description: 'Unknown status' };
}
```

---

## 6. ERROR HANDLING

### 6.1 Error Classification

```typescript
enum VelocityErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_SERVICEABLE = 'NOT_SERVICEABLE',
  WAREHOUSE_NOT_FOUND = 'WAREHOUSE_NOT_FOUND',
  SHIPMENT_NOT_FOUND = 'SHIPMENT_NOT_FOUND',
  CANNOT_CANCEL = 'CANNOT_CANCEL',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR'
}
```

### 6.2 Error Handling Strategy

```typescript
async function handleVelocityError(error: any): Promise<never> {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 401:
        // Token expired, refresh and retry
        await refreshToken();
        throw new VelocityError(401, {
          message: 'Authentication failed, please retry',
          status_code: 401
        });

      case 400:
        throw new VelocityError(400, {
          message: 'Validation failed',
          errors: data.errors || {},
          status_code: 400
        });

      case 404:
        throw new VelocityError(404, {
          message: data.message || 'Resource not found',
          status_code: 404
        });

      case 422:
        throw new VelocityError(422, {
          message: 'Pincode not serviceable',
          error: data.message,
          status_code: 422
        });

      case 429:
        // Rate limit exceeded, wait and retry
        await sleep(60000); // Wait 1 minute
        throw new VelocityError(429, {
          message: 'Rate limit exceeded, please retry',
          status_code: 429
        });

      case 500:
      default:
        throw new VelocityError(500, {
          message: 'Velocity API error',
          error: data.error || data.message,
          status_code: status
        });
    }
  } else if (error.code === 'ECONNABORTED') {
    // Timeout
    throw new VelocityError(408, {
      message: 'Request timeout',
      status_code: 408
    });
  } else {
    // Network error
    throw new VelocityError(503, {
      message: 'Network error, service unavailable',
      status_code: 503
    });
  }
}
```

---

## 7. RATE LIMITING & RETRY LOGIC

### 7.1 Rate Limiting

**Observed Limits:**
- Authentication: 10 requests/hour
- Forward Order: 100 requests/minute
- Tracking: 100 requests/minute
- Cancellation: 50 requests/minute
- Serviceability: 200 requests/minute
- Warehouse: 20 requests/minute

**Implementation (Token Bucket):**
```typescript
class RateLimiter {
  private tokens: number;
  private capacity: number;
  private refillRate: number;
  private lastRefill: number;

  constructor(capacity: number, refillPerMinute: number) {
    this.tokens = capacity;
    this.capacity = capacity;
    this.refillRate = refillPerMinute / 60000; // per ms
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }

    // Wait for token to be available
    const waitTime = (1 - this.tokens) / this.refillRate;
    await sleep(waitTime);
    this.tokens = 0;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

// Usage
const forwardOrderLimiter = new RateLimiter(100, 100); // 100 requests/min

await forwardOrderLimiter.acquire();
const response = await createForwardOrder(order);
```

### 7.2 Retry Logic

**Retry Strategy:**
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const shouldRetry =
        error.statusCode === 500 ||
        error.statusCode === 503 ||
        error.statusCode === 408 ||
        error.code === 'ECONNABORTED';

      if (!shouldRetry || attempt === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage
const response = await retryWithBackoff(
  () => axios.post(`${VELOCITY_BASE_URL}/custom/api/v1/forward-order`, payload),
  3,
  1000
);
```

---

## 8. SECURITY CONSIDERATIONS

### 8.1 Credential Management

**Storage:**
```bash
# .env (Development)
VELOCITY_USERNAME="+918860606061"
VELOCITY_PASSWORD="Velocity@123"
VELOCITY_BASE_URL="https://shazam.velocity.in"

# AWS Secrets Manager (Production)
aws secretsmanager create-secret \
  --name Helix/velocity/credentials \
  --secret-string '{"username":"+918860606061","password":"Velocity@123"}'
```

**Retrieval:**
```typescript
async function getVelocityCredentials(): Promise<{ username: string; password: string }> {
  if (process.env.NODE_ENV === 'production') {
    const secretsManager = new AWS.SecretsManager();
    const secret = await secretsManager.getSecretValue({
      SecretId: 'Helix/velocity/credentials'
    }).promise();

    return JSON.parse(secret.SecretString);
  } else {
    return {
      username: process.env.VELOCITY_USERNAME!,
      password: process.env.VELOCITY_PASSWORD!
    };
  }
}
```

### 8.2 Token Encryption

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const IV_LENGTH = 16;

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

function decryptToken(encryptedToken: string): string {
  const [ivHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### 8.3 Logging Security

**DO NOT LOG:**
- ❌ Full Velocity username/password
- ❌ Velocity auth token (full)
- ❌ Customer email/phone in plain text

**SAFE TO LOG:**
- ✅ Order IDs
- ✅ AWB numbers
- ✅ Masked tokens (first 4 chars only)
- ✅ API response status codes
- ✅ Error messages (no sensitive data)

```typescript
logger.info('Velocity order created', {
  orderId: order.orderNumber,
  awb: response.awb,
  carrier: response.courier_name,
  token: token.substring(0, 4) + '...' // Mask token
});
```

---

## 9. TESTING STRATEGY

### 9.1 Mock API (Development)

**File:** `tests/mocks/velocityShipfast.mock.ts`

```typescript
export class VelocityShipfastMock {
  async authenticate(): Promise<VelocityAuthResponse> {
    return { token: 'MOCK_TOKEN_' + Date.now() };
  }

  async createForwardOrder(request: VelocityForwardOrderRequest): Promise<VelocityShipmentResponse> {
    return {
      shipment_id: `MOCK_${Math.random().toString(36).substring(7)}`,
      order_id: request.order_id,
      awb: `MOCK_AWB_${Date.now()}`,
      courier_name: 'Delhivery Surface (Mock)',
      courier_company_id: '1',
      label_url: 'https://example.com/mock-label.pdf',
      status: 'NEW'
    };
  }

  async trackShipments(awbs: string[]): Promise<VelocityTrackingResponse[]> {
    return awbs.map(awb => ({
      awb,
      order_id: 'MOCK_ORDER',
      status: 'in_transit',
      status_code: 'IT',
      courier_name: 'Delhivery Surface (Mock)',
      current_location: 'Mumbai Hub',
      estimated_delivery: '2025-12-30',
      tracking_history: [
        {
          status: 'picked_up',
          location: 'Warehouse',
          timestamp: '2025-12-26 10:00:00',
          description: 'Picked up'
        }
      ]
    }));
  }

  async cancelOrder(awb: string): Promise<VelocityCancelResponse> {
    return {
      message: 'Order cancelled successfully (Mock)',
      awb,
      status: 'CANCELLED'
    };
  }

  async checkServiceability(request: VelocityServiceabilityRequest): Promise<VelocityServiceabilityResponse> {
    return {
      delivery_pincode: request.delivery_pincode,
      is_serviceable: true,
      available_carriers: [
        {
          courier_name: 'Delhivery Surface (Mock)',
          courier_company_id: '1',
          estimated_delivery_days: 3,
          rate: 45,
          cod_available: true
        }
      ]
    };
  }

  async createWarehouse(request: VelocityWarehouseRequest): Promise<VelocityWarehouseResponse> {
    return {
      warehouse_id: `MOCK_WH_${Date.now()}`,
      name: request.name,
      status: 'active',
      message: 'Warehouse created successfully (Mock)'
    };
  }
}
```

### 9.2 Integration Tests

**File:** `tests/integration/velocity/velocity.test.ts`

```typescript
describe('Velocity Shipfast Integration', () => {
  let velocityProvider: VelocityShipfastProvider;

  beforeAll(() => {
    velocityProvider = new VelocityShipfastProvider({
      useMock: process.env.NODE_ENV === 'test'
    });
  });

  describe('Authentication', () => {
    it('should authenticate and return token', async () => {
      const token = await velocityProvider.authenticate();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('Forward Order', () => {
    it('should create shipment successfully', async () => {
      const order = await orderFactory();
      const warehouse = await warehouseFactory();

      const response = await velocityProvider.createForwardOrder(order, warehouse);

      expect(response.shipment_id).toBeDefined();
      expect(response.awb).toBeDefined();
      expect(response.label_url).toBeDefined();
    });

    it('should reject invalid pincode', async () => {
      const order = await orderFactory({ pincode: '999999' });
      const warehouse = await warehouseFactory();

      await expect(
        velocityProvider.createForwardOrder(order, warehouse)
      ).rejects.toThrow('Pincode not serviceable');
    });
  });

  describe('Tracking', () => {
    it('should track shipments by AWB', async () => {
      const awbs = ['MOCK_AWB_123', 'MOCK_AWB_456'];
      const tracking = await velocityProvider.trackShipments(awbs);

      expect(tracking).toHaveLength(2);
      expect(tracking[0].awb).toBe(awbs[0]);
    });
  });

  describe('Cancellation', () => {
    it('should cancel shipment successfully', async () => {
      const awb = 'MOCK_AWB_123';
      const response = await velocityProvider.cancelOrder(awb);

      expect(response.status).toBe('CANCELLED');
    });
  });

  describe('Serviceability', () => {
    it('should check serviceability for valid pincode', async () => {
      const result = await velocityProvider.checkServiceability({
        pickup_pincode: '560102',
        delivery_pincode: '400001',
        cod: 1,
        weight: 0.5
      });

      expect(result.is_serviceable).toBe(true);
      expect(result.available_carriers.length).toBeGreaterThan(0);
    });
  });
});
```

### 9.3 Test Coverage Target

**Week 2 Target:** 80%+ coverage

**Coverage Breakdown:**
- VelocityShipfastProvider class: 90%
- VelocityMapper: 95%
- VelocityErrorHandler: 85%
- Integration tests: All happy paths + error scenarios

---

## 10. IMPLEMENTATION CHECKLIST

### Week 2 Day 1: Setup & Authentication
- [ ] Create `infrastructure/integrations/couriers/velocity/` directory
- [ ] Define TypeScript interfaces (`VelocityTypes.ts`)
- [ ] Implement authentication (`VelocityAuth.ts`)
- [ ] Implement token management with encryption
- [ ] Create VelocityShipfastMock class
- [ ] Write authentication tests

### Week 2 Day 2: Forward Order & Tracking
- [ ] Implement `createForwardOrder()` method
- [ ] Implement order → Velocity data mapper
- [ ] Implement label download & storage (S3/local)
- [ ] Implement `trackShipments()` method
- [ ] Implement status mapping (Velocity → Helix)
- [ ] Write forward order tests
- [ ] Write tracking tests

### Week 2 Day 3: Cancellation & Serviceability
- [ ] Implement `cancelOrder()` method
- [ ] Implement `checkServiceability()` method
- [ ] Implement carrier selection algorithm
- [ ] Write cancellation tests
- [ ] Write serviceability tests

### Week 2 Day 4: Warehouse & Error Handling
- [ ] Implement `createWarehouse()` method
- [ ] Implement comprehensive error handling
- [ ] Implement retry logic with exponential backoff
- [ ] Implement rate limiting
- [ ] Write error handling tests

### Week 2 Day 5: Integration & Documentation
- [ ] Integration with ShipmentService
- [ ] Integration with OrderService
- [ ] End-to-end testing with mock API
- [ ] Manual testing with real Velocity API (staging)
- [ ] Update API documentation
- [ ] Security review

---

## 11. WEEK 2 DETAILED SPECIFICATION

### 11.1 File Structure

```
server/src/infrastructure/integrations/couriers/velocity/
├── VelocityShipfastProvider.ts     # Main provider class
├── VelocityTypes.ts                # TypeScript interfaces
├── VelocityAuth.ts                 # Authentication & token management
├── VelocityMapper.ts               # Data transformation
├── VelocityErrorHandler.ts         # Error handling & retry logic
├── VelocityConfig.ts               # Configuration
└── VelocityMock.ts                 # Mock implementation

server/tests/integration/velocity/
├── velocity.test.ts                # Integration tests
├── velocityMapper.test.ts          # Mapper unit tests
└── velocityErrorHandler.test.ts   # Error handler unit tests
```

### 11.2 Environment Variables

```bash
# Velocity Shipfast API
VELOCITY_BASE_URL=https://shazam.velocity.in
VELOCITY_USERNAME="+918860606061"
VELOCITY_PASSWORD="Velocity@123"
VELOCITY_TEST_WAREHOUSE_ID="WHYYB5"

# Token Encryption
ENCRYPTION_KEY=<32-byte-hex-string>

# Feature Flags
USE_VELOCITY_MOCK=false
```

### 11.3 Success Criteria

**By End of Week 2:**
- ✅ All 6 critical endpoints implemented (auth, forward order, tracking, cancel, serviceability, warehouse)
- ✅ 80%+ test coverage
- ✅ Mock API for development
- ✅ Real API integration tested (staging)
- ✅ Error handling comprehensive
- ✅ Rate limiting implemented
- ✅ Security review complete
- ✅ Documentation updated
- ✅ Label download & storage working
- ✅ Shipment creation end-to-end working

---

## 12. FUTURE ENHANCEMENTS

**Week 3:**
- Reverse Order API (RTO)
- Webhook handler for status updates
- Weight discrepancy handling

**Week 4:**
- Reports API (billing, performance)
- COD remittance webhooks
- Bulk order creation

**Week 6:**
- NDR management workflows
- Delivery attempt optimization

**Week 10:**
- Multi-piece shipment support
- International shipping

---

**Document End**
**Last Updated:** December 26, 2025
**Next Review:** Week 2 (During Implementation)
**Priority:** P0 (CRITICAL)
**Estimated Implementation Time:** 5 days (Week 2)
