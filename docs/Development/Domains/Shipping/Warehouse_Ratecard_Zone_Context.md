# WAREHOUSE, RATECARD & ZONE MODULES - Context Package
**Modules:** Warehouse Management, Rate Card Management, Zone Management
**Version:** 1.1
**Created:** December 26, 2025
**Last Updated:** December 28, 2025 (Week 5 Implementation)
**Status:** 90% Complete (Week 5 Warehouse Workflows Done)
**Priority:** P1 (Critical - Core Operations)
**Dependencies:** Company, Shipment, Order

---

## TABLE OF CONTENTS

1. [Module Overview](#1-module-overview)
2. [Warehouse Module](#2-warehouse-module)
3. [Picking Workflows](#3-picking-workflows)
4. [Packing Workflows](#4-packing-workflows)
5. [Inventory Management](#5-inventory-management)
6. [Zone Module](#6-zone-module)
7. [RateCard Module](#7-ratecard-module)
8. [Module Relationships](#8-module-relationships)
9. [Known Issues & Gaps](#9-known-issues--gaps)
10. [Testing Requirements](#10-testing-requirements)
11. [Future Enhancements](#11-future-enhancements)

---

## 1. MODULE OVERVIEW

### 1.1 Purpose

This package now encompasses the full **Warehouse Operating System (WOS)** for Shipcrowd, including:
- **Warehouse**: Physical facility management.
- **Inventory**: SKU-level stock tracking and movements.
- **Picking**: Order fulfillment (Pick Lists, Batches).
- **Packing**: Packing stations, box selection, and verified weighing.
- **Zone & RateCard**: Geographic serviceability and pricing (Foundational).

### 1.2 Current Status Summary

| Module | Completion | Priority | Week 5 Status | Notes |
|--------|------------|----------|---------------|-------|
| Warehouse | 100% | P1 | ✅ Implemented | CRUD & Ops Hours active |
| Inventory | 90% | P1 | ✅ Implemented | SKU tracking, Adjustments, Movements |
| Picking | 90% | P1 | ✅ Implemented | Pick List generation, Picking execution |
| Packing | 90% | P1 | ✅ Implemented | Station management, Packing verification |
| Zone | 50% | P2 | ⏳ Pending | Model exists, controllers in Week 6 |
| RateCard | 40% | P2 | ⏳ Pending | Model exists, logic in Week 7 |

---

## 2. WAREHOUSE MODULE

### 2.1 Database Models

**File:** `server/src/infrastructure/database/mongoose/models/WarehouseZone.ts`
Represents physical zones within a warehouse (e.g., "Aisle A", "Bulk Storage").

**File:** `server/src/infrastructure/database/mongoose/models/WarehouseLocation.ts`
Represents specific bin locations (e.g., "A-01-02") with dimensions and max capacity.

### 2.2 Implemented Workflows

**1. Location Management:**
- Define zones (Pick Face, Bulk, Returns).
- Manage bin capacities and types (Standard, Cold Storage).
- Track specific inventory levels per bin.

---

## 3. PICKING WORKFLOWS

### 3.1 Services & Models

**File:** `server/src/core/application/services/warehouse/PickingService.ts`
**Model:** `server/src/infrastructure/database/mongoose/models/PickList.ts`

### 3.2 Key Features
- **Batching Strategies:** Automatic grouping of orders into Pick Lists (Batch, Wave, Zone).
- **Picker Assignment:** Assign lists to specific warehouse staff.
- **Validation:** Barcode scanning verification during picking.
- **Exception Handling:** Skip items with reason codes (Damaged, Missing).

### 3.3 API Endpoints
- `POST /api/v1/picking/pick-lists`: Create optimized pick lists.
- `POST /api/v1/picking/pick-lists/:id/start`: Begin picking session.
- `POST /api/v1/picking/pick-lists/:id/pick`: Confirm item pick (scan).
- `GET /api/v1/picking/my-pick-lists`: Picker's active tasks.

---

## 4. PACKING WORKFLOWS

### 4.1 Services & Models

**File:** `server/src/core/application/services/warehouse/PackingService.ts`
**Model:** `server/src/infrastructure/database/mongoose/models/PackingStation.ts`

### 4.2 Key Features
- **Station Management:** Defining stations with capabilities (Scale, Printer).
- **Session Control:** Locking a station to a specific order/user.
- **Weight Verification:** Comparing actual vs. expected package weight.
- **Label Generation:** Automatic triggers for shipping labels (mock).

### 4.3 API Endpoints
- `POST /api/v1/packing/stations`: Register new stations.
- `POST /api/v1/packing/stations/:id/session/start`: Scan order to pack.
- `POST /api/v1/packing/stations/:id/verify-weight`: QA check.
- `POST /api/v1/packing/stations/:id/session/complete`: Finalize package.

---

## 5. INVENTORY MANAGEMENT

### 5.1 Services & Models

**File:** `server/src/core/application/services/warehouse/InventoryService.ts`
**Models:**
- `Inventory.ts`: SKU-level aggregate stock.
- `StockMovement.ts`: Audit trail of every +1/-1 change.

### 5.2 Key Features
- **Receiving:** Inbound stock from POs.
- **Adjustments:** Cycle counts and damage write-offs.
- **Reservations:** Soft-allocating stock for Confirmed orders.
- **Audit:** Immutable `StockMovement` logs for all changes.

### 5.3 API Endpoints
- `POST /api/v1/inventory/receive`: Inbound stock.
- `POST /api/v1/inventory/adjust`: Manual corrections.
- `POST /api/v1/inventory/check-availability`: Real-time stock check.
- `GET /api/v1/inventory/movements`: Audit trail.

---

## 6. ZONE MODULE

*(Unchanged - See Session 2 spec for Week 6 implementation)*

## 7. RATECARD MODULE

*(Unchanged - See Session 2 spec for Week 7 implementation)*

---

## 8. MODULE RELATIONSHIPS

### Data Flow: Order Fulfillment
1. **Order** Created -> **InventoryService** Reserves Stock.
2. **PickingService** Groups Orders -> Creates **PickList**.
3. Picker executes task -> **StockMovement** logs 'PICK'.
4. Items moved to **PackingStation**.
5. **PackingService** verifies items -> Creates **Package**.
6. **Shipment** generated -> Courier assigned.

---

## 9. KNOWN ISSUES & GAPS

### 9.1 High Priority
1. **Barcode Integration:** Currently accepts manual entry. Needs physical scanner integration logic in frontend.
2. **Zone/RateCard:** Still mock-only. Shipping costs are estimated.

---

## 10. TESTING REQUIREMENTS

### 10.1 Week 5 Standards (Implemented)
- **Static Services:** Stateless architecture allows easy testing.
- **Factories:** `pickingFactory`, `inventoryFactory`, `packingFactory` required for realistic test data.
- **Audit Logs:** All writes must verify audit log creation.

### 10.2 Coverage Goals
- Picking Logic: 90% (Complex grouping logic).
- Inventory Math: 100% (Critical for financial accuracy).
- API Routes: 80% (Happy path + Error states).

---

## 11. FUTURE ENHANCEMENTS

**Week 6:** Zone Management.
**Week 7:** Rate Card Engine.
**Week 11:** Auto-Warehouse Assignment & Geo-Location.
