# SHIPMENT MODULE - Context Package
**Module:** Shipment Management
**Version:** 1.0
**Created:** December 26, 2025
**Status:** 75% Complete (Session 2 baseline)
**Priority:** P0 (Critical - Core Business Module)
**Dependencies:** Order, Warehouse, Carrier (Week 2 Velocity integration)

---

## TABLE OF CONTENTS

1. [Module Overview](#1-module-overview)
2. [Current Implementation Status](#2-current-implementation-status)
3. [Database Model](#3-database-model)
4. [Service Layer](#4-service-layer)
5. [API Endpoints](#5-api-endpoints)
6. [Shipment Lifecycle](#6-shipment-lifecycle)
7. [Carrier Selection](#7-carrier-selection)
8. [NDR (Non-Delivery Report) Handling](#8-ndr-non-delivery-report-handling)
9. [Public Tracking](#9-public-tracking)
10. [Known Issues & Gaps](#10-known-issues--gaps)
11. [Testing Requirements](#11-testing-requirements)
12. [Future Enhancements](#12-future-enhancements)

---

## 1. MODULE OVERVIEW

### 1.1 Purpose

The Shipment module represents **courier-ready packages** that are sent to delivery partners. While Orders capture customer purchase details, Shipments track the physical delivery process from warehouse pickup to customer delivery.

### 1.2 Core Responsibilities

- **Shipment Creation**: Convert orders to courier-ready shipments
- **Carrier Selection**: Auto-select best carrier based on cost/speed/serviceability
- **Tracking**: Real-time status updates from courier webhooks
- **NDR Management**: Handle non-delivery scenarios and reattempts
- **Document Management**: Store shipping labels, invoices, manifests
- **Public Tracking**: Customer-facing tracking page
- **Status Synchronization**: Keep order and shipment statuses in sync

### 1.3 Shipment vs Order

**Key Differences:**

| Aspect | Order | Shipment |
|--------|-------|----------|
| **Purpose** | Customer's purchase record | Physical delivery tracking |
| **Created** | On customer checkout | When order ready to ship |
| **Status** | Business workflow | Courier tracking events |
| **Customer Facing** | Internal/dashboard | Public tracking page |
| **Modifications** | Editable until shipped | Immutable once created |

**Relationship:**
```
Order (1) ──creates──> Shipment (1 or more)
```

### 1.4 Key Features

**Implemented:**
- ✅ Shipment creation from order
- ✅ Automated carrier selection (mock data)
- ✅ Status tracking with history
- ✅ Public tracking page (no auth required)
- ✅ NDR status tracking
- ✅ Document storage (labels, invoices)
- ✅ Optimistic locking for status updates
- ✅ Transaction-wrapped status updates (shipment + order atomic)
- ✅ Soft delete
- ✅ Audit logging

**Missing:**
- ⚪ Velocity Shipfast API integration (Week 2)
- ⚪ Label generation (Week 2)
- ⚪ Manifest generation (Week 2)
- ⚪ Real carrier webhooks (Week 2-3)
- ⚪ NDR workflow UI (Week 6)
- ⚪ RTO (Return to Origin) management (Week 7)

---

## 2. CURRENT IMPLEMENTATION STATUS

### 2.1 Completion Percentage

**Overall Module: 75%**

| Component | Status | Completion | Notes |
|-----------|--------|------------|-------|
| **Model** | ✅ Complete | 100% | Shipment schema fully defined |
| **Service** | 🟡 Partial | 80% | Core logic done, missing API integration |
| **Controller** | ✅ Complete | 100% | All 7 endpoints implemented |
| **Routes** | ✅ Complete | 100% | All routes with middleware |
| **Carrier Selection** | 🟡 Mock | 50% | Mock algorithm, needs real API |
| **Tests** | ⚪ Pending | 0% | No tests written yet |
| **Documentation** | 🟡 Partial | 70% | API docs exist |

### 2.2 File Inventory

**Total Lines of Code: 1,181**

---

## 3. DATABASE MODEL

### 3.1 Shipment Schema Overview

```typescript
interface IShipment extends Document {
  // Core Identifiers
  trackingNumber: string;              // "SHP-20251226-A7B3"
  orderId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  carrier: string;                     // "Delhivery", "DTDC", etc.
  serviceType: string;                 // "express" or "standard"

  // Package Details
  packageDetails: {
    weight: number;                    // In grams
    dimensions: {
      length: number;                  // In cm
      width: number;
      height: number;
    };
    packageCount: number;
    packageType: string;               // "box", "envelope", etc.
    declaredValue: number;             // Insurance value
  };

  // Pickup Details
  pickupDetails?: {
    warehouseId: mongoose.Types.ObjectId;
    pickupDate: Date;
    pickupReference?: string;
    contactPerson: string;
    contactPhone: string;
  };

  // Delivery Details
  deliveryDetails: {
    recipientName: string;
    recipientPhone: string;
    recipientEmail?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    instructions?: string;
  };

  // Payment Details
  paymentDetails: {
    type: 'prepaid' | 'cod';
    codAmount?: number;                // If COD
    shippingCost: number;
    currency: string;                  // "INR"
  };

  // Status Tracking
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    location?: string;                 // "Mumbai Hub"
    description?: string;              // "Out for delivery"
    updatedBy?: mongoose.Types.ObjectId;
  }>;                                  // Max 100 entries
  currentStatus: string;

  // Delivery Dates
  estimatedDelivery?: Date;
  actualDelivery?: Date;

  // Documents
  documents: Array<{
    type: 'label' | 'invoice' | 'manifest';
    url: string;
    createdAt: Date;
  }>;                                  // Max 50 documents

  // Carrier-Specific
  carrierDetails: {
    carrierTrackingNumber?: string;    // Carrier's own AWB
    carrierServiceType?: string;
    carrierAccount?: string;
    manifestId?: string;
  };

  // NDR (Non-Delivery Report)
  ndrDetails?: {
    ndrReason?: string;
    ndrDate?: Date;
    ndrStatus?: 'pending' | 'reattempt' | 'return_initiated' | 'returned' | 'resolved';
    ndrAttempts?: number;
    ndrResolutionDate?: Date;
    ndrComments?: string;
  };

  // Soft Delete
  isDeleted: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  __v: number;                         // Optimistic locking
}
```

### 3.2 Indexes

**Automatic:**
```typescript
trackingNumber: unique index
```

**Manual Indexes:**
```typescript
{ companyId: 1 }
{ orderId: 1 }
{ currentStatus: 1 }
{ 'carrierDetails.carrierTrackingNumber': 1 }
{ 'deliveryDetails.address.postalCode': 1 }
{ isDeleted: 1 }
{ 'ndrDetails.ndrStatus': 1 }
```

**Compound Indexes:**
```typescript
// Shipments page listing
{ companyId: 1, createdAt: -1 }

// Status filtering with date sort
{ companyId: 1, currentStatus: 1, createdAt: -1 }

// Carrier filtering
{ companyId: 1, carrier: 1 }

// NDR management dashboard
{ 'ndrDetails.ndrStatus': 1, companyId: 1 }

// COD vs Prepaid filtering
{ companyId: 1, 'paymentDetails.type': 1 }
```

### 3.3 Concurrency Warning

**CRITICAL ISSUE (Documented in Model):**
```typescript
/**
 * CONCURRENCY WARNING:
 *
 * This model is vulnerable to race conditions during concurrent status updates.
 * Carrier webhooks firing simultaneously can overwrite each other's updates.
 *
 * FIXED in Service Layer: updateShipmentStatus() uses optimistic locking
 */
```

**Fix:** `ShipmentService.updateShipmentStatus()` uses `findOneAndUpdate` with `__v` version check.

---

## 4. SERVICE LAYER

### 4.1 ShipmentService Key Methods

**1. createShipment()**
```typescript
static async createShipment(args: {
  order: any;
  companyId: mongoose.Types.ObjectId;
  userId: string;
  payload: {
    warehouseId?: string;
    serviceType: string;
    carrierOverride?: string;
    instructions?: string;
  };
}): Promise<{
  shipment: any;
  carrierSelection: any;
  updatedOrder: any;
}>
```

**Flow:**
1. Generate unique tracking number (SHP-YYYYMMDD-XXXX)
2. Get warehouse origin pincode
3. Calculate total weight from order products
4. Select best carrier (mock algorithm)
5. Create shipment document
6. Update order status to 'shipped' with optimistic locking
7. Return shipment + carrier selection + updated order

**Carrier Selection:**
```typescript
const carrierResult = selectBestCarrier(
  totalWeight,
  originPincode,
  destinationPincode,
  serviceType  // 'express' or 'standard'
);
```

**Optimistic Locking on Order Update:**
```typescript
const updatedOrder = await Order.findOneAndUpdate(
  { _id: order._id, __v: currentOrderVersion },
  {
    $set: {
      currentStatus: 'shipped',
      'shippingDetails.provider': selectedCarrier,
      'shippingDetails.trackingNumber': trackingNumber,
      // ...
    },
    $push: { statusHistory: shippedStatusEntry },
    $inc: { __v: 1 }
  },
  { new: true }
);

if (!updatedOrder) {
  throw new Error('Order was updated by another process');
}
```

---

**2. updateShipmentStatus() ⭐ WITH TRANSACTION**
```typescript
static async updateShipmentStatus(args: {
  shipmentId: string;
  currentStatus: string;
  newStatus: string;
  currentVersion: number;
  userId: string;
  location?: string;
  description?: string;
}): Promise<{ success: boolean; shipment?: any; error?: string; code?: string }>
```

**CRITICAL FIX (Phase 1):** Wraps shipment + order updates in transaction for atomicity.

**Flow:**
1. Validate status transition
2. Start MongoDB transaction
3. Update shipment with optimistic locking:
   ```typescript
   Shipment.findOneAndUpdate(
     { _id: shipmentId, __v: currentVersion },
     { $set: { currentStatus: newStatus }, $push: { statusHistory }, $inc: { __v: 1 } },
     { new: true, session }  // Use transaction session
   )
   ```
4. Update related order status (in same transaction)
5. Commit transaction or rollback if error

**Order Status Mapping:**
```typescript
{
  'delivered': 'delivered',
  'rto': 'rto',
  'cancelled': 'cancelled',
  'in_transit': 'shipped'
}
```

**Example:**
```
Shipment status: created → in_transit
Order status: shipped (no change)

Shipment status: in_transit → delivered
Order status: shipped → delivered (atomically updated)
```

---

**3. Validation Methods**

**validateOrderForShipment():**
```typescript
static validateOrderForShipment(order: any): { canCreate: boolean; reason?: string; code?: string }
```
- Checks if order status is `pending` or `ready_to_ship`
- Returns validation result

**hasActiveShipment():**
```typescript
static async hasActiveShipment(orderId: mongoose.Types.ObjectId): Promise<boolean>
```
- Checks if order already has an active shipment
- Prevents duplicate shipment creation

**canDeleteShipment():**
```typescript
static canDeleteShipment(currentStatus: string): { canDelete: boolean; reason?: string }
```
- Prevents deletion of shipments in `in_transit`, `out_for_delivery`, or `delivered` status

---

## 5. API ENDPOINTS

### 5.1 Endpoint Summary

**Base Path:** `/api/v1/shipments`

| Method | Endpoint | Auth | CSRF | Description |
|--------|----------|------|------|-------------|
| POST | `/` | ✅ Private | ✅ Yes | Create shipment from order |
| GET | `/` | ✅ Private | ⚪ No | List shipments with filters |
| GET | `/:shipmentId` | ✅ Private | ⚪ No | Get shipment by ID |
| GET | `/tracking/:trackingNumber` | ✅ Private | ⚪ No | Track shipment (authenticated) |
| GET | `/public/track/:trackingNumber` | ⚪ Public | ⚪ No | Track shipment (public) |
| PATCH | `/:shipmentId/status` | ✅ Private | ✅ Yes | Update shipment status |
| DELETE | `/:shipmentId` | ✅ Private | ✅ Yes | Soft delete shipment |

### 5.2 Key Endpoints

#### POST /shipments

**Request:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "serviceType": "express",
  "carrierOverride": "Delhivery",
  "warehouseId": "507f1f77bcf86cd799439012",
  "instructions": "Call before delivery"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Shipment created successfully",
  "data": {
    "shipment": {
      "trackingNumber": "SHP-20251226-A7B3",
      "carrier": "Delhivery",
      "currentStatus": "created",
      "estimatedDelivery": "2025-12-28T10:30:00.000Z",
      // ...
    },
    "carrierSelection": {
      "selectedCarrier": "Delhivery",
      "selectedRate": 45,
      "selectedDeliveryTime": 2,
      "alternativeOptions": [
        { "carrier": "DTDC", "rate": 50, "deliveryTime": 3 },
        { "carrier": "Xpressbees", "rate": 48, "deliveryTime": 2 }
      ]
    }
  }
}
```

---

#### GET /shipments/public/track/:trackingNumber

**Public Endpoint** - No authentication required

**Purpose:** Customer-facing tracking page

**Response (200):**
```json
{
  "success": true,
  "message": "Shipment tracking information retrieved successfully",
  "data": {
    "trackingNumber": "SHP-20251226-A7B3",
    "carrier": "Delhivery",
    "serviceType": "express",
    "currentStatus": "in_transit",
    "estimatedDelivery": "2025-12-28T10:30:00.000Z",
    "actualDelivery": null,
    "createdAt": "2025-12-26T10:30:00.000Z",
    "recipient": {
      "city": "Mumbai",
      "state": "Maharashtra"
      // Name/phone/address hidden for privacy
    },
    "timeline": [
      {
        "status": "created",
        "timestamp": "2025-12-26T10:30:00.000Z",
        "description": "Shipment created"
      },
      {
        "status": "picked_up",
        "timestamp": "2025-12-26T14:00:00.000Z",
        "location": "Mumbai Hub",
        "description": "Picked up from warehouse"
      },
      {
        "status": "in_transit",
        "timestamp": "2025-12-27T08:00:00.000Z",
        "location": "Mumbai Sorting Center",
        "description": "In transit"
      }
    ]
  }
}
```

**Privacy:** Only shows city/state, hides recipient name/phone/full address.

---

#### PATCH /shipments/:shipmentId/status

**Request:**
```json
{
  "status": "delivered",
  "location": "Customer doorstep",
  "description": "Delivered successfully"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Shipment status updated successfully",
  "data": {
    "shipment": {
      "currentStatus": "delivered",
      "actualDelivery": "2025-12-28T10:30:00.000Z",
      "statusHistory": [
        // ... previous statuses
        {
          "status": "delivered",
          "timestamp": "2025-12-28T10:30:00.000Z",
          "location": "Customer doorstep",
          "description": "Delivered successfully",
          "updatedBy": "507f1f77bcf86cd799439013"
        }
      ],
      "__v": 3  // Version incremented
    }
  }
}
```

**Side Effect:** Related order status also updated to 'delivered' in same transaction.

---

## 6. SHIPMENT LIFECYCLE

### 6.1 Shipment Statuses

```
created
  └─> picked_up
       └─> in_transit
            ├─> out_for_delivery
            │     ├─> delivered (Terminal)
            │     └─> ndr (Non-Delivery Report)
            │           ├─> reattempt → out_for_delivery
            │           └─> rto (Return to Origin - Terminal)
            ├─> cancelled (Terminal)
            └─> rto (Terminal)
```

**Status Definitions:**
- **created**: Shipment created, awaiting pickup
- **picked_up**: Picked up from warehouse
- **in_transit**: Moving through courier network
- **out_for_delivery**: Out for delivery to customer
- **delivered**: Delivered to customer
- **ndr**: Non-delivery report (customer unavailable, address issue, etc.)
- **reattempt**: NDR resolved, delivery reattempt scheduled
- **rto**: Return to origin initiated
- **cancelled**: Shipment cancelled

### 6.2 Status Transition Rules

**SHIPMENT_STATUS_TRANSITIONS:**
```typescript
{
  created: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'cancelled'],
  in_transit: ['out_for_delivery', 'rto', 'cancelled'],
  out_for_delivery: ['delivered', 'ndr'],
  ndr: ['reattempt', 'rto'],
  reattempt: ['out_for_delivery'],
  delivered: [],
  rto: [],
  cancelled: []
}
```

**Enforced in:** `ShipmentService.updateShipmentStatus()`

---

## 7. CARRIER SELECTION

### 7.1 Current Implementation (Mock)

**carrier.service.ts:**
```typescript
export function selectBestCarrier(
  weight: number,
  originPincode: string,
  destinationPincode: string,
  serviceType: 'express' | 'standard'
): CarrierSelectionResult
```

**Mock Algorithm:**
- Returns hardcoded rates for Delhivery, DTDC, Xpressbees
- Express: 2-day delivery, ₹45-₹55
- Standard: 3-5 day delivery, ₹30-₹40
- Always selects Delhivery as best option (lowest rate + fast delivery)

**Example Output:**
```json
{
  "selectedCarrier": "Delhivery",
  "selectedRate": 45,
  "selectedDeliveryTime": 2,
  "alternativeOptions": [
    { "carrier": "Delhivery", "rate": 45, "deliveryTime": 2 },
    { "carrier": "DTDC", "rate": 50, "deliveryTime": 3 },
    { "carrier": "Xpressbees", "rate": 48, "deliveryTime": 2 }
  ]
}
```

### 7.2 Week 2: Velocity Shipfast Integration

**Real Carrier Selection:**
- Call Velocity Shipfast `/rates` API
- Pass origin, destination, weight, dimensions
- Receive real-time rates from all integrated couriers
- Select based on cost + delivery time + serviceability
- Create shipment via `/create_shipment` API
- Receive carrier tracking number + shipping label

**Planned Flow:**
```
1. Call Velocity /rates API
2. Parse carrier options
3. Apply business rules (cheapest, fastest, preferred carrier)
4. Call Velocity /create_shipment API
5. Store carrier tracking number in carrierDetails
6. Download and store shipping label in documents array
7. Return shipment to client
```

---

## 8. NDR (NON-DELIVERY REPORT) HANDLING

### 8.1 NDR Scenarios

**Common NDR Reasons:**
- Customer unavailable
- Address incomplete/wrong
- Customer refused delivery
- Delivery location closed
- Security issue at delivery location

### 8.2 NDR Data Structure

```typescript
ndrDetails: {
  ndrReason: "Customer unavailable",
  ndrDate: "2025-12-28T10:30:00.000Z",
  ndrStatus: "pending",  // or 'reattempt', 'return_initiated', 'returned', 'resolved'
  ndrAttempts: 1,
  ndrResolutionDate: null,
  ndrComments: "Called customer, will reattempt tomorrow"
}
```

### 8.3 NDR Workflow (Week 6)

**Planned Flow:**
```
1. Courier webhook: status = ndr
2. Create NDR entry with reason
3. Notify customer via SMS/email
4. Customer/seller chooses action:
   - Reattempt delivery (update address if needed)
   - Cancel and return to origin (RTO)
5. Update ndrStatus based on choice
6. If reattempt: status → reattempt → out_for_delivery
7. If RTO: status → return_initiated → rto
```

---

## 9. PUBLIC TRACKING

### 9.1 Public Endpoint

**GET /api/v1/shipments/public/track/:trackingNumber**

**Features:**
- No authentication required
- Customer-facing tracking page
- Privacy-protected (only shows city/state)
- Timeline view of status history

### 9.2 Frontend Integration

**Tracking Page URL:**
```
https://Shipcrowd.com/track/SHP-20251226-A7B3
```

**Frontend fetches:**
```javascript
const response = await fetch(
  `/api/v1/shipments/public/track/${trackingNumber}`
);
```

**Display:**
- Current status with icon
- Estimated delivery date
- Timeline of status updates
- Recipient city/state only

---

## 10. KNOWN ISSUES & GAPS

### 10.1 High Priority Gaps

**1. No Velocity API Integration (Week 2)**
- **Issue:** Using mock carrier selection
- **Needed:** Real API integration with Velocity Shipfast
- **ETA:** Week 2

**2. No Label Generation (Week 2)**
- **Issue:** No shipping labels created
- **Needed:** Download label from Velocity API, store in S3
- **ETA:** Week 2

**3. No Real Carrier Webhooks (Week 2-3)**
- **Issue:** Manual status updates only
- **Needed:** Webhook handlers for Delhivery, DTDC, Xpressbees
- **ETA:** Week 2-3

### 10.2 Medium Priority Gaps

**4. No NDR Workflow UI (Week 6)**
- **Issue:** NDR data captured but no workflow
- **Needed:** Frontend UI for NDR management
- **ETA:** Week 6

**5. No RTO Management (Week 7)**
- **Issue:** RTO status tracked but no workflow
- **Needed:** RTO initiation, tracking, restocking
- **ETA:** Week 7

**6. No Manifest Generation (Week 2)**
- **Issue:** No daily pickup manifests
- **Needed:** Generate manifest for warehouse pickup
- **ETA:** Week 2

---

## 11. TESTING REQUIREMENTS

### 11.1 Current Test Coverage: 0%

**Required Coverage:** 70% (Week 1), 85% (Week 16)

### 11.2 Required Tests

**Unit Tests (ShipmentService):**
- ✅ `createShipment()` - shipment creation
- ✅ `validateOrderForShipment()` - validation logic
- ✅ `updateShipmentStatus()` - valid transition
- ✅ `updateShipmentStatus()` - invalid transition
- ✅ `updateShipmentStatus()` - concurrent modification
- ✅ `canDeleteShipment()` - deletable statuses

**Integration Tests (Endpoints):**
- ✅ POST `/shipments` - create shipment
- ✅ POST `/shipments` - order not found
- ✅ POST `/shipments` - invalid order status
- ✅ POST `/shipments` - duplicate shipment
- ✅ GET `/shipments` - list with filters
- ✅ GET `/shipments/:id` - get by ID
- ✅ GET `/tracking/:trackingNumber` - track shipment
- ✅ GET `/public/track/:trackingNumber` - public tracking
- ✅ PATCH `/:shipmentId/status` - update status
- ✅ PATCH `/:shipmentId/status` - invalid transition
- ✅ PATCH `/:shipmentId/status` - concurrent modification
- ✅ DELETE `/:shipmentId` - soft delete

---

## 12. FUTURE ENHANCEMENTS

**Week 2:** Velocity Shipfast API, Label generation, Manifests
**Week 3:** Real carrier webhooks
**Week 6:** NDR workflow UI
**Week 7:** RTO management
**Week 10:** Multi-piece shipments
**Week 13:** Insurance claims

---

**Document End**
**Last Updated:** December 26, 2025
**Next Review:** Week 2 (Post-Velocity Integration)
