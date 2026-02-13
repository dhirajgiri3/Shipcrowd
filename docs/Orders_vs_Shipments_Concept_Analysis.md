# Orders vs Shipments: Concept Analysis & Implementation Guide

## Executive Summary

This document provides in-depth research on the **Orders vs Shipments** conceptual separation in e-commerce/logistics platforms, aligns it with Shipcrowd's current architecture, and proposes a clear, standard approach for implementation across the product.

---

## 1. Industry-Standard Concepts

### 1.1 Order (OMS Domain)

**Definition:** An order is a **customer request** captured at checkout. It represents the commercial intent—what the customer wants, where it should go, and how they'll pay.

**Order Lifecycle (Customer-Facing):**
| Stage | Description |
|-------|-------------|
| **Placed** | Customer completes checkout |
| **Confirmed** | Payment verified, order accepted |
| **Processing** | Being prepared for fulfillment |
| **Shipped** | At least one shipment created and handed to carrier |
| **Delivered** | All shipments delivered |
| **Cancelled/RTO** | Order closed (cancelled or returned) |

**Key Characteristics:**
- One order can spawn **multiple shipments** (split by warehouse, shipping category, or customer preference)
- Order status is **derived** from its shipment(s) in many systems
- Order is the **source of truth** for customer, products, payment, and destination

### 1.2 Shipment (Fulfillment/Logistics Domain)

**Definition:** A shipment is the **physical execution** of fulfillment—a parcel (or set of parcels) handed to a carrier for delivery.

**Shipment Lifecycle (Operational):**
| Stage | Description |
|-------|-------------|
| **Created** | Shipment record created, AWB booked with carrier |
| **Picked/Pickup Pending** | Awaiting carrier pickup |
| **In Transit** | With carrier, moving toward destination |
| **Out for Delivery** | Last-mile delivery |
| **Delivered** | Successfully delivered |
| **NDR** | Delivery attempted, address/recipient issue |
| **RTO** | Return to origin |

**Key Characteristics:**
- A shipment **belongs to** exactly one order (in Shipcrowd's 1:1 model)
- Shipment is the **source of truth** for tracking, carrier, AWB, and delivery status
- Shipment page = **post-ship** operational view (tracking, labels, manifests)

### 1.3 Relationship

```
Order (1) ────────────── (0..n) Shipment
   │                              │
   ├─ customerInfo                ├─ trackingNumber
   ├─ products                    ├─ carrier
   ├─ totals                      ├─ currentStatus
   ├─ currentStatus (derived)     ├─ estimatedDelivery
   └─ paymentMethod               └─ orderId (FK)
```

**Industry Patterns:**
1. **Monolithic:** E-commerce platform handles both order and shipment
2. **Distributed:** OMS for orders; external WMS/TMS for shipments
3. **Hybrid (Recommended):** Commerce engine manages order + initial split; OMS/WMS manages fulfillment splits

Shipcrowd follows a **hybrid** model: Orders are created in Shipcrowd; shipments are created when seller ships from an order (order-centric flow).

---

## 2. Shipcrowd's Current Model

### 2.1 Data Model

| Entity | Primary Use | Status Field | Key Filters |
|--------|------------|--------------|-------------|
| **Order** | Customer request, products, payment | `currentStatus` | `unshipped`, `shipped`, `delivered`, `pending`, etc. |
| **Shipment** | Physical parcel with carrier | `currentStatus` | `created`, `in_transit`, `delivered`, `ndr`, `rto` |

**Order Status Alias (Backend):**
```ts
unshipped → ['pending', 'ready_to_ship', 'new', 'ready']
```

**Order Statuses (Full):** `new`, `ready`, `pending`, `shipped`, `delivered`, `rto`, `cancelled`, `processing`, `in_transit`, etc.

**Shipment Statuses:** `created`, `picked`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `ndr`, `rto`, `returned`, etc.

### 2.2 Current Page Behavior

| Page | Data Source | Intended Scope | Current Issue |
|------|-------------|----------------|----------------|
| **Seller Orders** | `GET /orders` | All orders (filtered by status) | Shows both unshipped and shipped; tabs: all, unshipped, shipped, delivered |
| **Seller Shipments** | `GET /shipments` | All shipments | Also fetches `unshipped` orders for legacy "Ship from Shipments" modal (when order-centric shipping disabled) |
| **Admin Orders** | `GET /admin/orders` | All orders across sellers | Same as seller, broader scope |
| **Admin Shipments** | `GET /shipments` (admin) | All shipments across sellers | Same as seller, broader scope |

### 2.3 Overlap & Confusion

1. **Orders page** shows `shipped` and `delivered` orders—these have associated shipments. User sees order-centric view.
2. **Shipments page** shows all shipments—each links to an order. User sees shipment-centric view.
3. **Redundancy:** A shipped order appears on Orders (tab: shipped) AND its shipment appears on Shipments. Different views of the same fulfillment event.
4. **Legacy flow:** Shipments page had a "Ship" modal that listed unshipped orders—duplicating Orders page responsibility.

---

## 3. Recommended Approach: Clear Separation

### 3.1 Conceptual Rule

| Page | Primary Entity | Scope | User Intent |
|------|----------------|------|-------------|
| **Orders** | Order | Orders **not yet fully shipped** (actionable for fulfillment) | "What do I need to ship?" |
| **Shipments** | Shipment | Orders **already shipped** (actionable for tracking/ops) | "Where are my parcels?" |

### 3.2 Definition of "Shipped" for Orders

An order is **shipped** when:
- At least one **active** shipment exists for that order
- Order `currentStatus` is updated to `shipped` when shipment is created (already done in `ShipmentService.createShipment`)

**Unshipped orders:** `pending`, `ready_to_ship`, `new`, `ready`, `processing` (no shipment yet, or shipment failed before AWB)

**Shipped orders:** Have at least one shipment in `created` or later status.

### 3.3 Recommended Page Logic

#### Orders Page (Seller & Admin)

**Purpose:** Manage orders that need fulfillment attention.

**Default view:** Orders where `currentStatus` ∈ unshipped statuses (no shipment, or not yet shipped).

**Tabs/Filters:**
| Tab | Backend Filter | Description |
|-----|----------------|-------------|
| **All** | (none) | All orders |
| **To Ship** | `status=unshipped` | Pending, ready, new, ready_to_ship—need shipping action |
| **Shipped** | `status=shipped` | Has shipment, in transit |
| **Delivered** | `status=delivered` | Delivered |
| **RTO / Cancelled** | `status=rto`, `status=cancelled` | Closed/exception states |

**Key behavior:**
- **Ship Now** (order-centric): Opens quote modal, books shipment, invalidates orders + shipments.
- Orders page is the **primary** place to create shipments (order-centric flow).

#### Shipments Page (Seller & Admin)

**Purpose:** Track and manage parcels already in the logistics pipeline.

**Scope:** Only orders that **have at least one shipment**.

**Data source:** `GET /shipments` (existing API)—returns shipments, which imply shipped orders.

**Tabs/Filters:**
| Tab | Backend Filter | Description |
|-----|----------------|-------------|
| **All** | (none) | All shipments |
| **Pending Pickup** | `status=pending` (created, ready_to_ship) | Awaiting carrier pickup |
| **In Transit** | `status=in_transit` | picked, in_transit, out_for_delivery |
| **Delivered** | `status=delivered` | Delivered |
| **NDR** | `status=ndr` | Delivery attempted, needs action |
| **RTO** | `status=rto` | Return to origin |

**Key behavior:**
- **No "Ship" action** on Shipments page when order-centric shipping is enabled (ship from Orders only).
- **Track**, **Label**, **Manifest**—operational actions on existing shipments.
- Optional: "Ship more orders" could deep-link to Orders page with `unshipped` filter.

### 3.4 Summary Table

| | Orders Page | Shipments Page |
|---|-------------|----------------|
| **Entity** | Order | Shipment |
| **API** | `GET /orders` | `GET /shipments` |
| **Primary focus** | Unshipped (to ship) | Shipped (to track) |
| **Create shipment** | Yes (Ship Now) | No (when order-centric) |
| **Track parcel** | Via order detail → shipment link | Yes (primary) |
| **Bulk labels** | No | Yes |
| **Manifest** | No | Yes |

---

## 4. Implementation Plan

### 4.1 Backend Changes

#### 4.1.1 Order API (`GET /orders`)

**Current:** Supports `status=unshipped`, `status=shipped`, `status=delivered`, etc.

**Required:** Ensure `unshipped` correctly excludes orders that have an active shipment. Current alias:
```ts
unshipped: ['pending', 'ready_to_ship', 'new', 'ready']
```

**Verification:** Orders with `currentStatus: 'shipped'` should NOT appear when `status=unshipped`. This is already correct—`unshipped` maps to pending-like statuses; `shipped` is separate.

**Optional enhancement:** Add `hasShipment` or `fulfillmentStatus` to order response for UI to show "Shipped" badge without extra lookup.

#### 4.1.2 Shipments API (`GET /shipments`)

**Current:** Returns all shipments for company. No filter by "order shipped or not"—shipments are by definition for shipped orders.

**Required:** No change. Shipments API already returns only records that exist (i.e., orders that have been shipped).

#### 4.1.3 Stats / Filter Counts

**Orders:** `pendingShipments` in globalStats = count of orders with `currentStatus: 'pending'` (or unshipped). Already implemented.

**Shipments:** Stats by shipment status (pending, in_transit, delivered, ndr, rto). Already in `useShipmentStats`.

### 4.2 Frontend Changes

#### 4.2.1 Seller Orders Page (`OrdersClient.tsx`)

- **Default tab:** Consider defaulting to `To Ship` (unshipped) for faster actionability.
- **Tabs:** `all` | `unshipped` | `shipped` | `delivered` (align with backend status).
- **Ship Now:** Only for unshipped orders (already gated by `getShipDisabledReason`).
- **Remove:** Any shipment-creation UI from Orders when order-centric is on (already done—Ship is in Orders).

#### 4.2.2 Seller Shipments Page (`ShipmentsClient.tsx`)

- **Legacy "Ship" modal removed** (Feb 2025). Shipments page now only shows existing shipments—no shipment creation.
- **Focus:** Tracking, labels, manifests, NDR handling.
- **Ship orders:** Use the Orders page exclusively (Ship Now from order detail).

#### 4.2.3 Admin Pages

- Mirror seller logic: Admin Orders = order management; Admin Shipments = shipment tracking.
- Admin Orders: `GET /admin/orders` with same status filters.
- Admin Shipments: `GET /shipments` (admin sees all companies or filtered by company).

### 4.3 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORDERS PAGE                               │
│  GET /orders?status=unshipped|shipped|delivered|all               │
│                                                                   │
│  [To Ship] → unshipped orders → Ship Now → POST /orders/:id/ship  │
│  [Shipped] → shipped orders   → View → Order detail → Shipment    │
│  [Delivered] → delivered     → View only                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ On ship success: invalidate orders + shipments
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SHIPMENTS PAGE                               │
│  GET /shipments?status=pending|in_transit|delivered|ndr|rto       │
│                                                                   │
│  All records = orders that have been shipped                      │
│  Actions: Track, Label, Manifest, NDR                             │
│  (No "Ship" when order-centric enabled)                           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Migration / Feature Flag

1. **Order-centric shipping (current):** Shipments page no longer has "Ship" modal—removed. Orders page is the only place to create shipments.
2. **`isOrderCentricShippingEnabled()`:** Still used on Orders page to show/hide the Ship button. Default: `true`.

---

## 5. Edge Cases & Clarifications

### 5.1 Order with Multiple Shipments

Shipcrowd currently supports 1 order : 1 shipment (simplified). If multiple shipments per order are added later:
- Orders page: Order shows "Shipped" when at least one shipment exists.
- Shipments page: Each shipment is a row; order number links to order.

### 5.2 Awaiting Sync / Partial Failure

If shipment is `created` but carrier API failed (`awaiting_carrier_sync`):
- Order may still be `pending` until AWB is confirmed.
- Shipment exists but is in exception state.
- **Recommendation:** Count as "shipped" for Orders page (shipment record exists); show in Shipments with "Awaiting Sync" badge.

### 5.3 Cancelled Orders

- Cancelled orders: Show in Orders with "Cancelled" tab/filter.
- Do not show in Shipments (no shipment, or shipment was cancelled).

### 5.4 RTO

- Order status `rto`: Order is in return flow.
- Shipment status `rto`: Parcel is returning.
- Both pages can show RTO: Orders (order-centric) and Shipments (parcel-centric).

---

## 6. Checklist for Implementation

### Phase 1: Clarify & Document
- [x] Document Orders vs Shipments concept (this doc)
- [ ] Align product/UX spec with this model
- [ ] Update Developer_Instructions.md with this logic

### Phase 2: Backend
- [ ] Verify `unshipped` filter excludes orders with active shipment
- [ ] Add `shippingDetails` or `hasShipment` to order response if needed for UI
- [ ] Ensure shipment creation updates order `currentStatus` to `shipped`

### Phase 3: Seller Frontend
- [ ] Orders: Default tab to "To Ship" (unshipped)
- [ ] Orders: Ensure tabs map correctly to API status
- [x] Shipments: Legacy "Ship" modal and Create Shipment button removed (Feb 2025)

### Phase 4: Admin Frontend
- [ ] Admin Orders: Same tab logic as seller
- [ ] Admin Shipments: Same as seller (no Ship when order-centric)

### Phase 5: Testing & Rollout
- [ ] E2E: Ship from Orders → verify order moves to Shipped, shipment appears on Shipments
- [ ] E2E: Shipments page shows only shipped orders' parcels
- [ ] Document for support/CS team

---

## 7. References

- Commerce Layer: [Shipments and shipping categories](https://commercelayer.io/docs/data-model/shipments-and-shipping-categories)
- commercetools: [Shipping and Delivery Overview](https://docs.commercetools.com/api/shipping-delivery-overview)
- Order lifecycle: [Deck Commerce](https://www.deckcommerce.com/blog/orderlifecycle)
- OMS vs WMS: [TechTarget](https://www.techtarget.com/searcherp/tip/WMS-vs-OMS-Learn-the-differences-between-the-two-systems)
