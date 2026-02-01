# ORDER MODULE - Context Package
**Module:** Order Management
**Version:** 1.0
**Created:** December 26, 2025
**Status:** 65% Complete (Session 2 baseline)
**Priority:** P0 (Critical - Core Business Module)
**Dependencies:** Company, Warehouse, User (auth)

---

## TABLE OF CONTENTS

1. [Module Overview](#1-module-overview)
2. [Current Implementation Status](#2-current-implementation-status)
3. [Database Model](#3-database-model)
4. [Service Layer](#4-service-layer)
5. [API Endpoints](#5-api-endpoints)
6. [Order Lifecycle](#6-order-lifecycle)
7. [Bulk Import System](#7-bulk-import-system)
8. [Security & Concurrency](#8-security--concurrency)
9. [Integration Points](#9-integration-points)
10. [Known Issues & Gaps](#10-known-issues--gaps)
11. [Testing Requirements](#11-testing-requirements)
12. [Future Enhancements](#12-future-enhancements)

---

## 1. MODULE OVERVIEW

### 1.1 Purpose

The Order module is the **central business entity** of Shipcrowd. It represents customer orders before they are converted into shipments and sent to courier partners. Orders serve as the source of truth for order details, products, customer information, and payment status.

### 1.2 Core Responsibilities

- **Order Creation**: Manual, API, e-commerce platform integration
- **Order Management**: CRUD operations with status tracking
- **Bulk Import**: CSV-based bulk order uploads
- **Status Tracking**: Order lifecycle from pending to shipped
- **Payment Tracking**: COD vs Prepaid, payment status management
- **Customer Information**: Delivery address and contact details
- **Product Details**: Line items with pricing, quantities, dimensions
- **Warehouse Association**: Multi-warehouse order routing
- **Audit Trail**: Complete status history with timestamps

### 1.3 Order vs Shipment

**Key Distinction:**
- **Order**: Customer's purchase record, product details, payment info
- **Shipment**: Courier-ready package created from an order

**Relationship:**
```
Order (1) ──creates──> Shipment (1 or more)
```

**Example:**
```
Order #12345
  ├─ Product A × 2
  ├─ Product B × 1
  └─ Ships as:
      ├─ Shipment 1: Product A × 2 (Warehouse A, Delhivery)
      └─ Shipment 2: Product B × 1 (Warehouse B, DTDC)
```

### 1.4 Order Sources

```typescript
type OrderSource = 'manual' | 'shopify' | 'woocommerce' | 'api';
```

**Sources:**
- **manual**: Created via Shipcrowd dashboard
- **shopify**: Imported from Shopify via webhook
- **woocommerce**: Imported from WooCommerce via webhook
- **api**: Created via Shipcrowd REST API

**Source Tracking:**
- `source` field identifies origin
- `sourceId` stores external platform's order ID

### 1.5 Key Features

**Implemented:**
- ✅ Order CRUD with pagination and filters
- ✅ Status tracking with history
- ✅ Multi-product support (up to 200 products)
- ✅ Bulk CSV import with transaction safety
- ✅ Optimistic locking for concurrent updates
- ✅ Payment status tracking (COD, Prepaid)
- ✅ Warehouse assignment
- ✅ Soft delete (isDeleted flag)
- ✅ Audit logging
- ✅ Search by order number, customer name, phone
- ✅ Date range filtering

**Missing:**
- ⚪ Shipment creation from order (Week 2)
- ⚪ E-commerce platform webhooks (Week 8-9)
- ⚪ Order cancellation workflow (Week 5)
- ⚪ Order split (multi-shipment) (Week 7)
- ⚪ Auto-assign warehouse based on customer location (Week 11)

---

## 2. CURRENT IMPLEMENTATION STATUS

### 2.1 Completion Percentage

**Overall Module: 65%**

| Component | Status | Completion | Notes |
|-----------|--------|------------|-------|
| **Model** | ✅ Complete | 100% | Order schema fully defined |
| **Service** | 🟡 Partial | 70% | Core logic done, missing shipment creation |
| **Controller** | ✅ Complete | 100% | All 6 endpoints implemented |
| **Routes** | ✅ Complete | 100% | All routes with middleware |
| **Bulk Import** | ✅ Complete | 100% | CSV import with transactions |
| **Validation** | ✅ Complete | 100% | Zod schemas for create/update |
| **Tests** | ⚪ Pending | 0% | No tests written yet |
| **Documentation** | 🟡 Partial | 60% | API docs exist, examples needed |

### 2.2 File Inventory

**Model (1 file):**
- `server/src/infrastructure/database/mongoose/models/Order.ts` (281 lines)

**Service (1 file):**
- `server/src/core/application/services/shipping/order.service.ts` (293 lines)

**Controller (1 file):**
- `server/src/presentation/http/controllers/shipping/order.controller.ts` (302 lines)

**Routes (1 file):**
- `server/src/presentation/http/routes/v1/shipping/order.routes.ts` (76 lines)

**Total Lines of Code: 952**

---

## 3. DATABASE MODEL

### 3.1 Order Schema

**File:** `server/src/infrastructure/database/mongoose/models/Order.ts`

#### 3.1.1 Schema Overview

```typescript
interface IOrder extends Document {
  // Core Identifiers
  orderNumber: string;               // Unique order number (e.g., "ORD-20251226-A7B3")
  companyId: mongoose.Types.ObjectId; // Multi-tenancy isolation

  // Customer Information
  customerInfo: {
    name: string;                    // Required
    email?: string;                  // Optional
    phone: string;                   // Required
    address: {
      line1: string;                 // Required
      line2?: string;                // Optional
      city: string;                  // Required
      state: string;                 // Required
      country: string;               // Default: "India"
      postalCode: string;            // Required (PIN code)
    };
  };

  // Products Array
  products: Array<{
    name: string;                    // Product name
    sku?: string;                    // Stock Keeping Unit
    quantity: number;                // Min: 1
    price: number;                   // Min: 0
    weight?: number;                 // In grams
    dimensions?: {
      length?: number;               // In cm
      width?: number;                // In cm
      height?: number;               // In cm
    };
  }>;                                // Max 200 products

  // Shipping Details
  shippingDetails: {
    provider?: string;               // Courier name (e.g., "Delhivery")
    method?: string;                 // Shipping method (e.g., "Express")
    trackingNumber?: string;         // Courier tracking number
    estimatedDelivery?: Date;
    shippingCost: number;            // Default: 0
  };

  // Payment Information
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'cod' | 'prepaid';

  // Order Source Tracking
  source: 'manual' | 'shopify' | 'woocommerce' | 'api';
  sourceId?: string;                 // External platform order ID

  // Warehouse Assignment
  warehouseId?: mongoose.Types.ObjectId;

  // Status Tracking
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    comment?: string;
    updatedBy?: mongoose.Types.ObjectId; // User who changed status
  }>;                                // Max 100 entries
  currentStatus: string;             // Current order status

  // Financial Totals
  totals: {
    subtotal: number;                // Sum of product prices
    tax: number;                     // Default: 0
    shipping: number;                // Default: 0
    discount: number;                // Default: 0
    total: number;                   // Final amount
  };

  // Additional Fields
  notes?: string;                    // Internal notes
  tags?: string[];                   // Order tags
  isDeleted: boolean;                // Soft delete flag

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Version (for optimistic locking)
  __v: number;
}
```

#### 3.1.2 Indexes

**Automatic Index:**
```typescript
OrderSchema.index({ orderNumber: 1 }, { unique: true });
```

**Manual Indexes:**
```typescript
OrderSchema.index({ companyId: 1 });
OrderSchema.index({ currentStatus: 1 });
OrderSchema.index({ 'customerInfo.phone': 1 });
OrderSchema.index({ 'customerInfo.address.postalCode': 1 });
OrderSchema.index({ isDeleted: 1 });
```

**Compound Indexes (Query Optimization):**
```typescript
// Orders page listing (most recent first)
OrderSchema.index({ companyId: 1, createdAt: -1 });

// Status filtering with date sort
OrderSchema.index({ companyId: 1, currentStatus: 1, createdAt: -1 });

// Payment status filtering
OrderSchema.index({ companyId: 1, paymentStatus: 1 });

// COD vs Prepaid filtering
OrderSchema.index({ companyId: 1, paymentMethod: 1 });
```

**Index Usage:**
```sql
-- Find company's orders sorted by date
db.orders.find({ companyId: X }).sort({ createdAt: -1 })
-- Uses: { companyId: 1, createdAt: -1 }

-- Filter by status + sort by date
db.orders.find({ companyId: X, currentStatus: "pending" }).sort({ createdAt: -1 })
-- Uses: { companyId: 1, currentStatus: 1, createdAt: -1 }

-- Find orders by phone
db.orders.find({ "customerInfo.phone": "9876543210" })
-- Uses: { "customerInfo.phone": 1 }
```

#### 3.1.3 Array Validators

**Purpose:** Prevent DoS attacks and performance issues

```typescript
// Max 200 products per order
products: {
  validate: [
    arrayLimit(200),
    'Maximum 200 products per order (prevents query timeout for bulk orders)'
  ]
}

// Max 100 status history entries
statusHistory: {
  validate: [
    arrayLimit(100),
    'Maximum 100 status entries (prevents memory exhaustion from status loops)'
  ]
}
```

**Rationale:**
- Prevents malicious uploads with thousands of products
- Avoids infinite status update loops
- Keeps document size under MongoDB 16MB limit

#### 3.1.4 Pre-save Hook

**Purpose:** Initialize status history on order creation

```typescript
OrderSchema.pre('save', function (next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.currentStatus,
      timestamp: new Date(),
    });
  }
  next();
});
```

**Effect:**
- New orders automatically get first status entry
- Ensures `statusHistory` is never empty for created orders

#### 3.1.5 Concurrency Warning

**CRITICAL ISSUE (Documented in Model):**

```typescript
/**
 * CONCURRENCY WARNING:
 *
 * This model is vulnerable to race conditions during concurrent status updates.
 * Multiple requests updating currentStatus simultaneously can overwrite each other.
 *
 * Recommended fix (Phase 2 - Controller Refactoring):
 * - Add optimistic locking using version field (__v)
 * - Use findOneAndUpdate with version check instead of save()
 *
 * Reference: docs/Backend-Fixes-Suggestions.md, Section 4 - Race Conditions
 */
```

**Partially Fixed:** Status updates now use optimistic locking in `OrderService.updateOrderStatus()` (Week 1 implementation)

---

## 4. SERVICE LAYER

### 4.1 OrderService

**File:** `server/src/core/application/services/shipping/order.service.ts`

**Purpose:** Encapsulates pure business logic for orders. Framework-agnostic, no HTTP dependencies.

#### 4.1.1 Key Methods

**1. calculateTotals()**

```typescript
static calculateTotals(
  products: Array<{ price: number; quantity: number }>
): { subtotal: number; tax: number; shipping: number; discount: number; total: number }
```

**Purpose:** Calculate order financial totals from products

**Logic:**
```typescript
const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
return { subtotal, tax: 0, shipping: 0, discount: 0, total: subtotal };
```

**Note:** Tax/shipping/discount are hardcoded to 0 for now (Week 4: Tax calculation, Week 7: Shipping cost)

---

**2. getUniqueOrderNumber()**

```typescript
static async getUniqueOrderNumber(maxAttempts = 10): Promise<string | null>
```

**Purpose:** Generate a unique order number with retry logic

**Format:** `ORD-YYYYMMDD-XXXX` (e.g., `ORD-20251226-A7B3`)

**Algorithm:**
1. Generate order number using `generateOrderNumber()` helper
2. Check if exists in database
3. Retry up to 10 times if collision
4. Return null if all attempts fail

**Helper Function (in controller.helpers.ts):**
```typescript
function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const randomStr = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ORD-${dateStr}-${randomStr}`;
}
```

**Collision Probability:**
- Random bytes: 2 bytes = 65,536 combinations
- Date prefix reduces collisions across days
- 10 retries = 655,360 possible numbers per day

---

**3. createOrder()**

```typescript
static async createOrder(args: {
  companyId: mongoose.Types.ObjectId;
  userId: string;
  payload: {
    customerInfo: any;
    products: Array<{ name: string; sku?: string; quantity: number; price: number; weight?: number }>;
    paymentMethod?: string;
    warehouseId?: string;
    notes?: string;
    tags?: string[];
  };
}): Promise<IOrder>
```

**Purpose:** Create a new order

**Flow:**
1. Generate unique order number (retry up to 10 times)
2. Calculate totals from products
3. Create Order document with:
   - Generated order number
   - Provided customer info and products
   - `paymentStatus = 'pending'` (COD) or `'paid'` (Prepaid)
   - `currentStatus = 'pending'`
   - `source = 'manual'`
4. Save to database
5. Return created order

**Default Values:**
- `paymentMethod`: `'prepaid'` if not provided
- `paymentStatus`: `'pending'` if COD, `'paid'` if prepaid
- `source`: `'manual'`
- `currentStatus`: `'pending'`

---

**4. updateOrderStatus()** ⭐ **WITH OPTIMISTIC LOCKING**

```typescript
static async updateOrderStatus(args: {
  orderId: string;
  currentStatus: string;
  newStatus: string;
  currentVersion: number;
  userId: string;
}): Promise<{
  success: boolean;
  order?: IOrder;
  error?: string;
  code?: string;
}>
```

**Purpose:** Update order status with optimistic locking and status transition validation

**Flow:**
1. Validate status transition using `validateStatusTransition()`
2. Create status history entry
3. Use `findOneAndUpdate` with version check:
   ```typescript
   Order.findOneAndUpdate(
     { _id: orderId, __v: currentVersion },  // Match version
     {
       $set: { currentStatus: newStatus },
       $push: { statusHistory: statusEntry },
       $inc: { __v: 1 }                     // Increment version
     },
     { new: true }
   )
   ```
4. If no document updated → concurrent modification detected
5. Return success/failure with error code

**Optimistic Locking:**
- `__v` (Mongoose version field) used for concurrency control
- If another request updated the order, `__v` won't match → update fails
- Controller must retry with fresh data

**Status Transition Validation:**
```typescript
// Defined in shared/validation/schemas.ts
export const ORDER_STATUS_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['shipped'],
  shipped: ['delivered', 'returned'],
  delivered: [],
  cancelled: [],
  returned: []
};
```

**Example:**
- `pending` can transition to `processing` or `cancelled`
- `delivered` is terminal (no further transitions)
- Invalid: `pending` → `delivered` (not allowed)

---

**5. canDeleteOrder()**

```typescript
static canDeleteOrder(
  currentStatus: string
): { canDelete: boolean; reason?: string }
```

**Purpose:** Validate if an order can be deleted based on status

**Logic:**
```typescript
const nonDeletableStatuses = ['shipped', 'delivered'];
if (nonDeletableStatuses.includes(currentStatus)) {
  return {
    canDelete: false,
    reason: `Cannot delete order with status '${currentStatus}'`
  };
}
return { canDelete: true };
```

**Rationale:**
- Orders already shipped/delivered should not be deleted
- Use cancellation workflow instead (Week 5)

---

**6. processBulkOrderRow()**

```typescript
static async processBulkOrderRow(args: {
  row: any;
  rowIndex: number;
  companyId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}): Promise<{ success: boolean; order?: any; error?: string }>
```

**Purpose:** Process a single CSV row into an order within a transaction

**CSV Schema (Required Fields):**
```
customer_name, customer_phone, address_line1, city, state, postal_code,
product_name, quantity, price
```

**Optional Fields:**
```
customer_email, address_line2, country, sku, weight, payment_method
```

**Flow:**
1. Validate required fields present
2. Generate unique order number
3. Parse numeric fields (quantity, price, weight)
4. Calculate subtotal
5. Create Order document
6. Save with session (transaction)
7. Return success/error

**Error Handling:**
- Missing required fields → return error
- Invalid numeric values → return error
- Duplicate order number → retry
- All errors returned, not thrown

---

**7. bulkImportOrders()**

```typescript
static async bulkImportOrders(args: {
  rows: any[];
  companyId: mongoose.Types.ObjectId;
}): Promise<{
  created: Array<{ orderNumber: string; id: any }>;
  errors: Array<{ row: number; error: string; data?: any }>;
}>
```

**Purpose:** Process multiple CSV rows in a transaction

**Flow:**
1. Start MongoDB session and transaction
2. Process each row with `processBulkOrderRow()`
3. Collect created orders and errors
4. If all rows fail → abort transaction, throw error
5. If some succeed → commit transaction, return partial success
6. End session

**Transaction Safety:**
- All-or-nothing if all rows fail
- Partial import allowed if some rows succeed
- Atomic: either all succeed or transaction rolled back

**Example:**
```
Input: 100 CSV rows
Success: 95 orders created
Errors: 5 rows with missing fields
Result: Commit 95 orders, return errors for 5 rows
```

---

## 5. API ENDPOINTS

### 5.1 Endpoint Summary

**Base Path:** `/api/v1/orders`

| Method | Endpoint | Auth | CSRF | Description |
|--------|----------|------|------|-------------|
| POST | `/` | ✅ Private | ✅ Yes | Create order |
| GET | `/` | ✅ Private | ⚪ No | List orders with pagination |
| GET | `/:orderId` | ✅ Private | ⚪ No | Get order by ID |
| PATCH | `/:orderId` | ✅ Private | ✅ Yes | Update order |
| DELETE | `/:orderId` | ✅ Private | ✅ Yes | Soft delete order |
| POST | `/bulk` | ✅ Private | ✅ Yes | Bulk import from CSV |

### 5.2 Detailed Endpoint Specifications

#### 5.2.1 POST /orders

**Purpose:** Create a new order

**Authentication:** Required
**CSRF Protection:** Yes

**Request Body:**
```json
{
  "customerInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "address": {
      "line1": "123 Main St",
      "line2": "Apt 4B",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "postalCode": "400001"
    }
  },
  "products": [
    {
      "name": "Product A",
      "sku": "SKU-001",
      "quantity": 2,
      "price": 500,
      "weight": 250,
      "dimensions": {
        "length": 10,
        "width": 8,
        "height": 5
      }
    }
  ],
  "paymentMethod": "cod",
  "warehouseId": "507f1f77bcf86cd799439011",
  "notes": "Fragile items",
  "tags": ["priority", "gift"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "_id": "507f1f77bcf86cd799439012",
      "orderNumber": "ORD-20251226-A7B3",
      "companyId": "507f1f77bcf86cd799439010",
      "customerInfo": { ... },
      "products": [ ... ],
      "currentStatus": "pending",
      "paymentStatus": "pending",
      "paymentMethod": "cod",
      "totals": {
        "subtotal": 1000,
        "tax": 0,
        "shipping": 0,
        "discount": 0,
        "total": 1000
      },
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2025-12-26T10:30:00.000Z"
        }
      ],
      "createdAt": "2025-12-26T10:30:00.000Z",
      "updatedAt": "2025-12-26T10:30:00.000Z",
      "__v": 0
    }
  }
}
```

**Validation:**
- Zod schema: `createOrderSchema`
- Required: `customerInfo`, `products` (at least 1)
- Max 200 products
- Email format validation (if provided)
- Phone number validation
- Price >= 0, Quantity >= 1

**Audit Log:**
```json
{
  "action": "create",
  "resourceType": "order",
  "resourceId": "507f1f77bcf86cd799439012",
  "details": { "orderNumber": "ORD-20251226-A7B3" }
}
```

---

#### 5.2.2 GET /orders

**Purpose:** List orders with pagination and filters

**Authentication:** Required

**Query Parameters:**
```
?page=1                    // Page number (default: 1)
&limit=20                  // Items per page (default: 20)
&status=pending            // Filter by status
&phone=9876543210          // Search by phone (regex)
&warehouse=507f...         // Filter by warehouse ID
&startDate=2025-12-01      // Filter by date range (>=)
&endDate=2025-12-31        // Filter by date range (<=)
&search=ORD-20251226       // Search by order number, customer name, phone
```

**Response (200):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "orderNumber": "ORD-20251226-A7B3",
      "customerInfo": {
        "name": "John Doe",
        "phone": "9876543210"
      },
      "currentStatus": "pending",
      "paymentStatus": "pending",
      "totals": { "total": 1000 },
      "warehouseId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Mumbai Warehouse",
        "address": "..."
      },
      "createdAt": "2025-12-26T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Features:**
- Multi-tenancy: Automatically filters by `companyId`
- Soft delete: Excludes `isDeleted: true` orders
- Pagination: Default 20 per page
- Sorting: Most recent first (`createdAt: -1`)
- Populate: Warehouse info

**Search Implementation:**
```typescript
if (req.query.search) {
  const searchRegex = { $regex: req.query.search, $options: 'i' };
  filter.$or = [
    { orderNumber: searchRegex },
    { 'customerInfo.name': searchRegex },
    { 'customerInfo.phone': searchRegex },
  ];
}
```

---

#### 5.2.3 GET /orders/:orderId

**Purpose:** Get a single order by ID

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "order": {
      // Complete order object
      "_id": "507f1f77bcf86cd799439012",
      "orderNumber": "ORD-20251226-A7B3",
      // ... all fields
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2025-12-26T10:30:00.000Z"
        },
        {
          "status": "processing",
          "timestamp": "2025-12-26T11:00:00.000Z",
          "comment": "Picked for packing",
          "updatedBy": "507f1f77bcf86cd799439013"
        }
      ],
      "warehouseId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Mumbai Warehouse",
        "address": "..."
      }
    }
  }
}
```

**Security:**
- Validates `orderId` is valid ObjectId
- Checks `companyId` matches authenticated user's company
- Returns 404 if not found or `isDeleted: true`

---

#### 5.2.4 PATCH /orders/:orderId

**Purpose:** Update an order (products, status, customer info)

**Authentication:** Required
**CSRF Protection:** Yes

**Request Body (all fields optional):**
```json
{
  "customerInfo": {
    "phone": "9876543211"
  },
  "products": [
    {
      "name": "Product A",
      "quantity": 3,
      "price": 500
    }
  ],
  "currentStatus": "processing",
  "paymentStatus": "paid",
  "paymentMethod": "prepaid",
  "notes": "Updated notes",
  "tags": ["priority"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order updated successfully",
  "data": {
    "order": {
      // Updated order object
      "__v": 1  // Version incremented if status changed
    }
  }
}
```

**Status Update Logic:**
```typescript
if (validation.data.currentStatus && validation.data.currentStatus !== order.currentStatus) {
  const result = await OrderService.updateOrderStatus({
    orderId: String(order._id),
    currentStatus: order.currentStatus,
    newStatus: validation.data.currentStatus,
    currentVersion: order.__v,
    userId: auth.userId
  });

  if (!result.success) {
    if (result.code === 'CONCURRENT_MODIFICATION') {
      return 409 Conflict;
    } else {
      return 400 Invalid Status Transition;
    }
  }
}
```

**Features:**
- **Optimistic Locking:** Status updates check `__v` version
- **Status Transition Validation:** Prevents invalid status changes
- **Concurrent Modification Detection:** Returns 409 if version mismatch
- **Automatic Total Recalculation:** If products updated
- **Partial Updates:** Only update provided fields

**Validation:**
- Zod schema: `updateOrderSchema`
- All fields optional
- Same validation rules as create

**Audit Log:**
```json
{
  "action": "update",
  "resourceType": "order",
  "resourceId": "507f1f77bcf86cd799439012",
  "details": { "changes": ["currentStatus", "products"] }
}
```

---

#### 5.2.5 DELETE /orders/:orderId

**Purpose:** Soft delete an order

**Authentication:** Required
**CSRF Protection:** Yes

**Response (200):**
```json
{
  "success": true,
  "message": "Order deleted successfully",
  "data": null
}
```

**Logic:**
1. Check if order exists and belongs to company
2. Validate status allows deletion (not shipped/delivered)
3. Set `isDeleted: true`
4. Save order

**Soft Delete:**
- Order remains in database
- `isDeleted: true` flag set
- Excluded from list/get queries
- Can be restored if needed (future feature)

**Status Validation:**
```typescript
const { canDelete, reason } = OrderService.canDeleteOrder(order.currentStatus);
if (!canDelete) {
  return 400 "Cannot delete order with status 'shipped'"
}
```

**Audit Log:**
```json
{
  "action": "delete",
  "resourceType": "order",
  "resourceId": "507f1f77bcf86cd799439012",
  "details": { "softDelete": true }
}
```

---

#### 5.2.6 POST /orders/bulk

**Purpose:** Bulk import orders from CSV file

**Authentication:** Required
**CSRF Protection:** Yes
**File Upload:** Multer middleware

**Request:**
```
Content-Type: multipart/form-data

file: <CSV file>
```

**CSV Format:**
```csv
customer_name,customer_email,customer_phone,address_line1,address_line2,city,state,country,postal_code,product_name,sku,quantity,price,weight,payment_method
John Doe,john@example.com,9876543210,123 Main St,Apt 4B,Mumbai,Maharashtra,India,400001,Product A,SKU-001,2,500,250,cod
Jane Smith,,9876543211,456 Oak Ave,,Delhi,Delhi,India,110001,Product B,,1,1000,,prepaid
```

**Multer Configuration:**
```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});
```

**Response (201):**
```json
{
  "success": true,
  "message": "Imported 95 orders",
  "data": {
    "created": [
      { "orderNumber": "ORD-20251226-A7B3", "id": "507f..." },
      { "orderNumber": "ORD-20251226-B8C4", "id": "507f..." }
    ],
    "errors": [
      {
        "row": 3,
        "error": "Missing fields: customer_phone, postal_code"
      },
      {
        "row": 7,
        "error": "Failed to generate order number"
      }
    ],
    "imported": 95,
    "failed": 5
  }
}
```

**Flow:**
1. Validate file uploaded and is CSV
2. Parse CSV using `csv-parser`
3. Collect all rows
4. Call `OrderService.bulkImportOrders()`
5. Transaction: Process each row
6. Return created orders + errors

**Error Handling:**
- If all rows fail → 400 "No orders imported"
- If some succeed → 201 with partial success
- CSV parse error → 400 "Failed to parse CSV file"

**Transaction Safety:**
- All orders created in single MongoDB transaction
- If database error → rollback all
- Row-level errors collected, transaction still commits if some succeed

**Audit Log:**
```json
{
  "action": "create",
  "resourceType": "order",
  "resourceId": "bulk",
  "details": { "imported": 95, "failed": 5 }
}
```

---

## 6. ORDER LIFECYCLE

### 6.1 Order Statuses

**Defined Status Flow:**
```
pending
  ├─> processing
  │     └─> ready_to_ship
  │           └─> shipped
  │                 ├─> delivered (Terminal)
  │                 └─> returned (Terminal)
  └─> cancelled (Terminal)
```

**Status Definitions:**
- **pending**: Order created, awaiting processing
- **processing**: Order being picked/packed
- **ready_to_ship**: Order packed, ready for courier pickup
- **shipped**: Order handed to courier, tracking active
- **delivered**: Order delivered to customer
- **returned**: Order returned (RTO - Return to Origin)
- **cancelled**: Order cancelled before shipping

### 6.2 Status Transition Rules

**Allowed Transitions (ORDER_STATUS_TRANSITIONS):**
```typescript
{
  pending: ['processing', 'cancelled'],
  processing: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['shipped'],
  shipped: ['delivered', 'returned'],
  delivered: [],
  cancelled: [],
  returned: []
}
```

**Validation:**
- Enforced in `OrderService.updateOrderStatus()`
- Invalid transitions rejected with 400 error
- Example: Cannot go from `pending` directly to `delivered`

### 6.3 Status History Tracking

**Structure:**
```typescript
statusHistory: [
  {
    status: "pending",
    timestamp: "2025-12-26T10:30:00.000Z"
  },
  {
    status: "processing",
    timestamp: "2025-12-26T11:00:00.000Z",
    comment: "Picked for packing",
    updatedBy: "507f1f77bcf86cd799439013"
  },
  {
    status: "shipped",
    timestamp: "2025-12-26T14:00:00.000Z",
    comment: "Handed to Delhivery courier",
    updatedBy: "507f1f77bcf86cd799439013"
  }
]
```

**Features:**
- Complete audit trail of status changes
- Optional comment for each change
- User who made the change tracked
- Automatic timestamp
- Max 100 entries (array validator)

### 6.4 Typical Flow Example

**Day 1: Order Creation**
```
10:30 AM - Customer places order on website (Shopify)
         - Order created: status = pending, paymentStatus = paid (prepaid)
         - Webhook sends order to Shipcrowd API

11:00 AM - Warehouse staff picks order
         - Status: pending → processing
```

**Day 2: Packing & Shipping**
```
09:00 AM - Order packed
         - Status: processing → ready_to_ship

14:00 PM - Courier picks up order
         - Create Shipment from Order (Week 2 feature)
         - Status: ready_to_ship → shipped
         - Tracking number: DL123456789
```

**Day 5: Delivery**
```
11:00 AM - Order delivered
         - Status: shipped → delivered
         - Payment status: paid (COD collected)
```

---

## 7. BULK IMPORT SYSTEM

### 7.1 CSV Schema

**Required Fields:**
```
customer_name
customer_phone
address_line1
city
state
postal_code
product_name
quantity
price
```

**Optional Fields:**
```
customer_email
address_line2
country (default: "India")
sku
weight
payment_method (default: "prepaid")
```

**Example CSV:**
```csv
customer_name,customer_email,customer_phone,address_line1,address_line2,city,state,country,postal_code,product_name,sku,quantity,price,weight,payment_method
John Doe,john@example.com,9876543210,123 Main St,Apt 4B,Mumbai,Maharashtra,India,400001,Product A,SKU-001,2,500,250,cod
Jane Smith,,9876543211,456 Oak Ave,,Delhi,Delhi,India,110001,Product B,,1,1000,,prepaid
```

### 7.2 Processing Flow

**Step 1: File Upload**
- Multer middleware: 5MB limit, CSV only
- File stored in memory buffer

**Step 2: CSV Parsing**
```typescript
const stream = Readable.from(req.file.buffer.toString());
stream
  .pipe(csv())
  .on('data', (row) => rows.push(row))
  .on('end', async () => { ... })
  .on('error', (error) => { ... });
```

**Step 3: Validation**
- Check required fields present
- Parse numeric fields (quantity, price, weight)
- Validate email format (if provided)

**Step 4: Transaction**
```typescript
const session = await mongoose.startSession();
session.startTransaction();

for (let i = 0; i < rows.length; i++) {
  const result = await processBulkOrderRow({ row: rows[i], session });
  if (result.success) {
    created.push(result.order);
  } else {
    errors.push({ row: i + 1, error: result.error });
  }
}

if (created.length > 0) {
  await session.commitTransaction();
} else {
  await session.abortTransaction();
}
```

**Step 5: Response**
- Return created orders + errors
- Audit log with import stats

### 7.3 Error Handling

**Row-Level Errors:**
- Missing required fields
- Invalid data types
- Failed order number generation

**File-Level Errors:**
- File too large (>5MB)
- Not a CSV file
- CSV parsing error

**Partial Success Handling:**
```
100 rows uploaded
95 orders created successfully
5 rows failed validation

Result: Transaction committed, 95 orders saved
Response: 201 with created array + errors array
```

**All Failure Handling:**
```
100 rows uploaded
0 orders created
100 rows failed validation

Result: Transaction aborted, no orders saved
Response: 400 "No orders imported"
```

### 7.4 Performance Considerations

**File Size Limit:**
- 5MB max
- ~10,000 rows at 500 bytes/row
- Prevents memory exhaustion

**Transaction Safety:**
- All-or-nothing if all fail
- Partial commit if some succeed
- Prevents orphaned data

**Concurrency:**
- MongoDB session ensures atomic transaction
- Multiple users can import simultaneously (different sessions)

---

## 8. SECURITY & CONCURRENCY

### 8.1 Multi-Tenancy Isolation

**Implementation:**
```typescript
const filter = { companyId: auth.companyId, isDeleted: false };
```

**Enforcement:**
- Every query includes `companyId` filter
- Users can only see their company's orders
- Middleware extracts `companyId` from JWT
- No cross-company data leakage

**Example:**
```
Company A: companyId = 507f1f77bcf86cd799439010
  - Can only see orders with companyId = 507f1f77bcf86cd799439010
  - Cannot access Company B's orders
```

### 8.2 Optimistic Locking

**Purpose:** Prevent concurrent status updates from overwriting each other

**Implementation:**
```typescript
const updatedOrder = await Order.findOneAndUpdate(
  { _id: orderId, __v: currentVersion },  // Match version
  {
    $set: { currentStatus: newStatus },
    $push: { statusHistory: statusEntry },
    $inc: { __v: 1 }                      // Increment version
  },
  { new: true }
);

if (!updatedOrder) {
  return {
    success: false,
    error: 'Order was updated by another process. Please retry.',
    code: 'CONCURRENT_MODIFICATION'
  };
}
```

**Flow:**
```
Time | User A | User B
-----|--------|-------
10:00 | Get order (v=0) | Get order (v=0)
10:01 | Update status to "processing" (v=0) |
      | Success! v=1 |
10:02 | | Update status to "shipped" (v=0)
      | | FAIL! v doesn't match (DB has v=1)
      | | Return 409 Conflict
```

**Benefits:**
- No lost updates
- Clear error message
- Client can retry with fresh data

### 8.3 CSRF Protection

**Enabled On:**
- POST `/orders`
- PATCH `/orders/:orderId`
- DELETE `/orders/:orderId`
- POST `/orders/bulk`

**Middleware:**
```typescript
router.post('/', authenticate, csrfProtection, asyncHandler(createOrder));
```

**Purpose:**
- Prevent cross-site request forgery
- Requires CSRF token in request header

### 8.4 Input Validation

**Zod Schemas:**
- `createOrderSchema`: Validates order creation
- `updateOrderSchema`: Validates order updates

**Validation Rules:**
- Email format (if provided)
- Phone number format
- Price >= 0
- Quantity >= 1
- Max 200 products
- Max 100 status history entries

**Example:**
```typescript
const validation = createOrderSchema.safeParse(req.body);
if (!validation.success) {
  const errors = validation.error.errors.map(err => ({
    code: 'VALIDATION_ERROR',
    message: err.message,
    field: err.path.join('.'),
  }));
  return sendValidationError(res, errors);
}
```

### 8.5 Soft Delete

**Implementation:**
```typescript
order.isDeleted = true;
await order.save();
```

**Queries:**
```typescript
const filter = { companyId: auth.companyId, isDeleted: false };
```

**Benefits:**
- Data recovery possible
- Audit trail preserved
- No foreign key violations
- Can analyze deleted orders

---

## 9. INTEGRATION POINTS

### 9.1 Warehouse Module

**Relationship:**
```typescript
Order.warehouseId → Warehouse._id
```

**Usage:**
- Order assigned to warehouse for fulfillment
- Warehouse location used for courier selection
- Multi-warehouse routing (Week 11)

**Population:**
```typescript
Order.find()
  .populate('warehouseId', 'name address')
```

**Future (Week 11):**
- Auto-assign warehouse based on customer location
- Serviceability check before assignment

### 9.2 Shipment Module

**Relationship:**
```
Order (1) ──creates──> Shipment (1 or more)
```

**Week 2 Feature:**
- `createShipmentFromOrder()` endpoint
- Converts order to courier-ready shipment
- Calls Velocity Shipfast API
- Updates order status to `shipped`
- Stores tracking number in order

**Data Mapping:**
```typescript
Shipment = {
  orderId: Order._id,
  orderNumber: Order.orderNumber,
  customerInfo: Order.customerInfo,  // Copy
  weight: calculateWeight(Order.products),
  dimensions: calculateDimensions(Order.products),
  paymentMethod: Order.paymentMethod,
  // ... courier-specific fields
}
```

### 9.3 E-Commerce Platforms

**Shopify Integration (Week 8):**
- Webhook: `orders/create`
- Create order with `source: 'shopify'`, `sourceId: <shopify_order_id>`
- Map Shopify order to Shipcrowd order schema
- Auto-create shipment

**WooCommerce Integration (Week 9):**
- Webhook: `order.created`
- Create order with `source: 'woocommerce'`, `sourceId: <wc_order_id>`

**Source Tracking:**
```typescript
{
  source: 'shopify',
  sourceId: '4567890123'  // Shopify order ID
}
```

### 9.4 Payment Gateway

**Razorpay Integration (Week 3):**
- Update `paymentStatus` based on Razorpay webhook
- COD remittance tracking
- Payment link generation for failed payments

**Payment Status Flow:**
```
Prepaid: pending → paid (on successful payment)
COD: pending → paid (on delivery + courier remittance)
Failed: pending → failed → paid (if customer retries)
```

### 9.5 Audit Module

**Every Order Action Logged:**
```typescript
await createAuditLog(
  userId,
  companyId,
  action,        // 'create', 'update', 'delete'
  'order',
  orderId,
  details,
  req
);
```

**Example Logs:**
```json
{ "action": "create", "resourceId": "...", "details": { "orderNumber": "ORD-..." } }
{ "action": "update", "resourceId": "...", "details": { "changes": ["currentStatus"] } }
{ "action": "delete", "resourceId": "...", "details": { "softDelete": true } }
```

---

## 10. KNOWN ISSUES & GAPS

### 10.1 Critical Issues

**None** - All critical features implemented

### 10.2 High Priority Gaps

**1. No Shipment Creation (Week 2)**
- **Issue:** Orders can't be converted to shipments yet
- **Needed:** `POST /orders/:orderId/create-shipment` endpoint
- **ETA:** Week 2 (Velocity Shipfast integration)

**2. No Order Cancellation Workflow (Week 5)**
- **Issue:** Can delete, but no proper cancellation workflow
- **Needed:** `POST /orders/:orderId/cancel` with reason tracking
- **ETA:** Week 5

**3. No Auto-Warehouse Assignment (Week 11)**
- **Issue:** Manual warehouse selection only
- **Needed:** Auto-assign based on customer location + warehouse serviceability
- **ETA:** Week 11

### 10.3 Medium Priority Gaps

**4. No Order Split (Week 7)**
- **Issue:** Can't split multi-product order into multiple shipments
- **Example:** Order with 3 products → 2 shipments from different warehouses
- **ETA:** Week 7

**5. No Tax Calculation (Week 4)**
- **Issue:** `totals.tax` always 0
- **Needed:** GST calculation for India
- **ETA:** Week 4

**6. No Shipping Cost Calculation (Week 7)**
- **Issue:** `totals.shipping` always 0
- **Needed:** Integrate with rate calculation engine
- **ETA:** Week 7

**7. No E-Commerce Webhooks (Week 8-9)**
- **Issue:** Only manual/API orders
- **Needed:** Shopify and WooCommerce webhook handlers
- **ETA:** Week 8 (Shopify), Week 9 (WooCommerce)

### 10.4 Low Priority / Future Enhancements

**8. No Order Templates (Week 13)**
- Reusable order templates for repeat customers

**9. No Order Notes Timeline (Week 14)**
- Internal notes with timestamps and user tracking

**10. No Order Export (Week 15)**
- Export orders to CSV/Excel

---

## 11. TESTING REQUIREMENTS

### 11.1 Current Test Coverage

**Overall Module: 0%**

**Existing Tests:** None

**Required Coverage:** 70% (Week 1 target), 85% (Week 16 target)

### 11.2 Required Unit Tests

**OrderService** ⚪ Pending (15 tests)
- ✅ `calculateTotals()` - subtotal calculation
- ✅ `getUniqueOrderNumber()` - unique generation, retry logic
- ✅ `createOrder()` - order creation with defaults
- ✅ `updateOrderStatus()` - valid transition
- ✅ `updateOrderStatus()` - invalid transition
- ✅ `updateOrderStatus()` - concurrent modification
- ✅ `canDeleteOrder()` - deletable statuses
- ✅ `canDeleteOrder()` - non-deletable statuses
- ✅ `processBulkOrderRow()` - valid row
- ✅ `processBulkOrderRow()` - missing fields
- ✅ `processBulkOrderRow()` - invalid data types
- ✅ `bulkImportOrders()` - all succeed
- ✅ `bulkImportOrders()` - partial success
- ✅ `bulkImportOrders()` - all fail
- ✅ `bulkImportOrders()` - transaction rollback

### 11.3 Required Integration Tests

**Order Endpoints** ⚪ Pending (20 tests)

**POST /orders**
- ✅ Create order successfully
- ✅ Validation error (missing customer info)
- ✅ Validation error (invalid email)
- ✅ Validation error (negative price)
- ✅ Order number generation failure (after 10 retries)

**GET /orders**
- ✅ List orders with pagination
- ✅ Filter by status
- ✅ Filter by date range
- ✅ Search by order number
- ✅ Search by customer name/phone
- ✅ Empty result set

**GET /orders/:orderId**
- ✅ Get order by ID
- ✅ Order not found (404)
- ✅ Invalid ObjectId format (400)
- ✅ Cross-company access denied (404)

**PATCH /orders/:orderId**
- ✅ Update customer info
- ✅ Update products (recalculate totals)
- ✅ Update status (valid transition)
- ✅ Update status (invalid transition) - 400
- ✅ Concurrent modification - 409

**DELETE /orders/:orderId**
- ✅ Delete order (pending status)
- ✅ Cannot delete (shipped status) - 400
- ✅ Soft delete verification

**POST /orders/bulk**
- ✅ Import CSV successfully
- ✅ Partial success (some rows fail)
- ✅ All rows fail - 400
- ✅ Invalid CSV format - 400
- ✅ File too large - 413

### 11.4 Test Data Requirements

**Factories Needed:**
- `orderFactory()` - Create test order
- `csvRowFactory()` - Generate CSV row data
- `bulkOrdersFactory()` - Generate multiple orders

**Mock Services:**
- Warehouse service (for populate)
- Audit log service

### 11.5 Coverage Target

**Week 1:** 70%
**Week 16:** 85%

**Priority:**
1. Core CRUD operations
2. Status transitions and concurrency
3. Bulk import edge cases
4. Validation and error handling

---

## 12. FUTURE ENHANCEMENTS

### 12.1 Planned Features

**Week 2: Shipment Creation**
- `POST /orders/:orderId/create-shipment`
- Convert order to Velocity Shipfast shipment
- Update order status to `shipped`
- Store tracking number

**Week 4: Tax Calculation**
- GST calculation for India
- Update `totals.tax` field
- Tax breakdown by state

**Week 5: Order Cancellation**
- `POST /orders/:orderId/cancel`
- Cancellation reason tracking
- Refund initiation for prepaid orders
- Prevent cancellation if already shipped

**Week 7: Order Split**
- Split multi-product order into multiple shipments
- Different warehouses for different products
- Partial fulfillment tracking

**Week 7: Shipping Cost Calculation**
- Integrate with rate calculation engine
- Update `totals.shipping` field
- Display shipping cost breakdown

**Week 8: Shopify Integration**
- Webhook handler: `orders/create`
- Auto-create order from Shopify
- Sync status back to Shopify

**Week 9: WooCommerce Integration**
- Webhook handler: `order.created`
- Auto-create order from WooCommerce
- Sync status back to WooCommerce

**Week 11: Auto-Warehouse Assignment**
- Assign warehouse based on customer location
- Serviceability check
- Inventory availability check

**Week 13: Order Templates**
- Save order as template
- Reuse template for repeat customers
- Template library

**Week 14: Order Notes Timeline**
- Internal notes with timestamps
- User tracking for each note
- Note categories (internal, customer-facing)

**Week 15: Order Export**
- Export orders to CSV/Excel
- Custom field selection
- Date range export

### 12.2 API Versioning Plan

**Current:** `/api/v1/orders`

**Future (v2):**
- Enhanced product schema (variants, bundles)
- Multi-currency support
- Advanced filtering (GraphQL-style)

**Backward Compatibility:**
- v1 maintained for 6 months after v2 release
- Deprecation warnings in v1 responses

---

## APPENDIX: QUICK REFERENCE

### Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/Shipcrowd

# JWT (for authentication)
JWT_SECRET=<secret>
```

### Common Commands

```bash
# Run order tests
npm test -- order

# Generate metrics
npx tsx scripts/generateMetrics.ts

# Import orders from CSV
curl -X POST http://localhost:5005/api/v1/orders/bulk \
  -H "Authorization: Bearer <token>" \
  -F "file=@orders.csv"
```

### Key File Locations

```
server/src/infrastructure/database/mongoose/models/Order.ts
server/src/core/application/services/shipping/order.service.ts
server/src/presentation/http/controllers/shipping/order.controller.ts
server/src/presentation/http/routes/v1/shipping/order.routes.ts
server/src/shared/validation/schemas.ts (ORDER_STATUS_TRANSITIONS)
server/src/shared/helpers/controller.helpers.ts (generateOrderNumber)
```

### Status Transitions Quick Reference

```
pending → [processing, cancelled]
processing → [ready_to_ship, cancelled]
ready_to_ship → [shipped]
shipped → [delivered, returned]
delivered → []
cancelled → []
returned → []
```

### CSV Import Template

```csv
customer_name,customer_email,customer_phone,address_line1,address_line2,city,state,country,postal_code,product_name,sku,quantity,price,weight,payment_method
John Doe,john@example.com,9876543210,123 Main St,Apt 4B,Mumbai,Maharashtra,India,400001,Product A,SKU-001,2,500,250,cod
```

---

**Document End**
**Last Updated:** December 26, 2025
**Next Review:** Week 2 (Post-Shipment Creation)
