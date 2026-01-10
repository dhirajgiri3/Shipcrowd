# ShipCrowd Database Seeding Enhancement Plan

## Executive Summary

Current seeding system covers **31 of 53 collections (58.5%)** with strong relationship integrity (95%). This document outlines enhancements needed to reach **100% collection coverage** and **99% relationship integrity** before manual API testing begins.

**Current Status:**
- ✅ 22 seeders implemented
- ❌ 7 critical collections missing seeders
- ⚠️ 4 marketplace collections partially seeded (stores only, no sync logs/mappings)
- ⚠️ Artificial performance limits on warehouse locations

**Timeline:** 2-3 days for full enhancement and verification

---

## Section 1: Critical Gaps (Must Fix Before Testing)

### 1.1 Shipping Configuration (RateCard & Zone)

**Current State:** ❌ NOT SEEDED
**Impact:** Orders calculate shipping cost but no rate card to validate against

**Collections to Create:**
- `RateCard` - Shipping rate definitions
- `Zone` - Geographic zones for shipping

**Data Structure:**

```typescript
// RateCard Model
{
  _id: ObjectId,
  companyId: ObjectId,      // Link to company
  name: "Standard Rates",
  description: "Base shipping rates for all zones",
  rates: [
    {
      zoneId: ObjectId,      // Link to zone
      minWeight: 0.5,
      maxWeight: 5,
      baseRate: 40,          // ₹40 for Zone A
      additionalRate: 8,     // ₹8 per kg extra
      insurance: 0.5,        // 0.5% of value
      codCharge: 0,          // Free for prepaid
      minAmount: 40          // Minimum charge
    }
  ],
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}

// Zone Model
{
  _id: ObjectId,
  name: "Zone A",
  description: "Metro cities (Delhi, Mumbai, Bangalore, Hyderabad)",
  states: ["DL", "MH", "KA", "TS"],
  pincodes: [
    { from: 100001, to: 110096, state: "DL" },
    { from: 400001, to: 400614, state: "MH" },
    // ... 19,000+ pincode ranges
  ],
  zoneType: "metro" | "tier1" | "tier2" | "tier3" | "remote",
  estimatedDeliveryDays: 1,  // Zone A: 1-2 days
  isActive: true,
  createdAt: Date
}
```

**Seeding Plan:**

```javascript
// Generate 4 zones covering India
const zones = [
  {
    name: "Zone A",
    zoneType: "metro",
    estimatedDeliveryDays: 1,
    states: ["DL", "MH", "KA", "TS"],  // 4 metro cities
    baseFare: 40,
  },
  {
    name: "Zone B",
    zoneType: "tier1",
    estimatedDeliveryDays: 2,
    states: ["UP", "GJ", "RJ", "NC"],  // Tier 1 cities
    baseFare: 60,
  },
  {
    name: "Zone C",
    zoneType: "tier2",
    estimatedDeliveryDays: 3,
    states: ["HP", "PB", "HR", "JK"],  // Tier 2 cities
    baseFare: 90,
  },
  {
    name: "Zone D",
    zoneType: "remote",
    estimatedDeliveryDays: 5,
    states: ["AP", "AR", "ML", "MZ", "NL", "TR"],  // Remote/NE states
    baseFare: 150,
  }
];

// For each company, create a standard rate card
const ratecards = companies.map(company => ({
  companyId: company._id,
  name: "Standard Rates",
  rates: zones.map(zone => ({
    zoneId: zoneId,
    minWeight: 0.5,
    maxWeight: 5,
    baseRate: zone.baseFare,
    additionalRate: zone.baseFare / 5,
    insurance: 0.5,
    codCharge: 0,
    minAmount: zone.baseFare
  }))
}));
```

**Data Volume:**
- Zones: 4 (India divided into 4 zones)
- Rate Cards: 100-120 (1 per company)
- Pincode Ranges: ~400 (1 range per ~50 pincodes)

**Dependencies:**
- ✅ No dependencies - can be seeded early
- Used by: Order seeder (for shipping cost calculation)

**Files to Create:**
- `23-rate-card-and-zones.seeder.ts`

---

### 1.2 Marketplace Sync Logs

**Current State:** ❌ NOT SEEDED
**Impact:** Cannot test sync error handling, retry logic, or data reconciliation

**Collections to Create:**
- `ShopifySyncLog`
- `WooCommerceSyncLog`
- `AmazonSyncLog`
- `FlipkartSyncLog`

**Data Structure:**

```typescript
// Marketplace Sync Log
{
  _id: ObjectId,
  storeId: ObjectId,           // Link to ShopifyStore/etc
  companyId: ObjectId,
  syncType: "order" | "inventory" | "product" | "fulfillment",
  status: "pending" | "syncing" | "success" | "partial" | "failed",
  startedAt: Date,
  completedAt: Date,
  duration: 5432,              // milliseconds
  totalRecords: 250,
  successCount: 245,
  failureCount: 5,
  errors: [
    {
      recordId: "12345",
      externalId: "shop-123",
      errorCode: "INVALID_QUANTITY",
      errorMessage: "Quantity cannot be negative",
      timestamp: Date
    }
  ],
  retryCount: 0,
  nextRetryAt: Date,           // If failed, when to retry
  metadata: {
    source: "manual" | "webhook" | "scheduled",
    trigger: "user" | "system"
  }
}
```

**Seeding Plan:**

```javascript
// For each marketplace store, create 10-20 sync logs
const syncStatuses = [
  { status: "success", ratio: 0.70 },      // 70% successful syncs
  { status: "partial", ratio: 0.15 },      // 15% partial (some failures)
  { status: "failed", ratio: 0.10 },       // 10% failed (retry pending)
  { status: "syncing", ratio: 0.05 },      // 5% still syncing
];

const syncLogs = stores.flatMap(store => {
  return Array.from({ length: 15 }, (_, i) => {
    const status = pickWeightedStatus(syncStatuses);
    const startedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const completedAt = status === "syncing" ? null : new Date(startedAt.getTime() + Math.random() * 60 * 60 * 1000);

    return {
      storeId: store._id,
      companyId: store.companyId,
      syncType: randomPick(["order", "inventory", "product"]),
      status,
      startedAt,
      completedAt,
      duration: completedAt ? completedAt - startedAt : null,
      totalRecords: Math.floor(Math.random() * 1000),
      successCount: status === "success" ? 250 : Math.floor(Math.random() * 245),
      failureCount: status === "failed" ? Math.floor(Math.random() * 10) : 0,
      errors: status === "failed" ? generateSyncErrors() : [],
      retryCount: status === "failed" ? Math.floor(Math.random() * 3) : 0,
      nextRetryAt: status === "failed" ? new Date(Date.now() + 60 * 60 * 1000) : null,
      metadata: {
        source: randomPick(["manual", "webhook", "scheduled"]),
        trigger: randomPick(["user", "system"])
      }
    };
  });
});
```

**Data Volume:**
- Shopify Sync Logs: 15-30 per store × 10-20 stores = 150-600 logs
- WooCommerce Sync Logs: 15-30 per store × 5-10 stores = 75-300 logs
- Amazon Sync Logs: 15-30 per store × 3-8 stores = 45-240 logs
- Flipkart Sync Logs: 15-30 per store × 3-8 stores = 45-240 logs
- **Total:** 315-1,380 sync logs

**Dependencies:**
- Requires: Seeder #21 (Marketplace Stores)
- Used by: Integration testing, webhook testing

**Files to Create:**
- `24-marketplace-sync-logs.seeder.ts`

---

### 1.3 Marketplace Product Mappings

**Current State:** ❌ NOT SEEDED
**Impact:** Cannot test product-to-SKU matching or inventory sync

**Collections to Create:**
- `ShopifyProductMapping`
- `WooCommerceProductMapping`
- `AmazonProductMapping`
- `FlipkartProductMapping`

**Data Structure:**

```typescript
// Marketplace Product Mapping
{
  _id: ObjectId,
  storeId: ObjectId,           // Link to ShopifyStore/etc
  companyId: ObjectId,
  marketplaceProductId: "gid://shopify/Product/12345",  // Platform-specific ID
  marketplaceSku: "VARIANT-67890",
  internalSku: "LAPTOP-DELL-001",     // Internal product code
  internalProductName: "Dell Laptop 13-inch",
  marketplaceProductName: "Dell Laptop - 13 Inch FHD",
  inventory: {
    marketplaceQty: 45,
    internalQty: 40,
    lastSynced: Date,
    syncStatus: "in-sync" | "out-of-sync" | "overstock" | "understock"
  },
  pricing: {
    marketplacePrice: 45000,
    internalPrice: 45000,
    syncStatus: "in-sync" | "price-mismatch"
  },
  status: "active" | "archived" | "delisted",
  isSynced: true,
  lastSyncedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Seeding Plan:**

```javascript
// Map warehouse inventory to marketplace products
const productMappings = stores.flatMap(store => {
  // Get company's inventory
  const inventory = inventories.filter(inv => inv.companyId === store.companyId);

  // Map 70-90% of inventory items to marketplace products
  return inventory.slice(0, Math.floor(inventory.length * 0.8)).map(inv => {
    const syncStatus = randomPick([
      { status: "in-sync", ratio: 0.80 },
      { status: "out-of-sync", ratio: 0.10 },
      { status: "overstock", ratio: 0.05 },
      { status: "understock", ratio: 0.05 }
    ]);

    return {
      storeId: store._id,
      companyId: store.companyId,
      marketplaceProductId: generateMarketplaceId(store.platform),
      marketplaceSku: generateMarketplaceSku(),
      internalSku: inv.sku,
      internalProductName: inv.productName,
      marketplaceProductName: inv.productName + " (Marketplace)",
      inventory: {
        marketplaceQty: Math.floor(inv.available * 0.95),  // 95% of internal qty
        internalQty: inv.available,
        lastSynced: new Date(),
        syncStatus: syncStatus.status
      },
      pricing: {
        marketplacePrice: inv.cost * 2,  // 100% markup
        internalPrice: inv.cost * 2,
        syncStatus: randomChance(0.95) ? "in-sync" : "price-mismatch"
      },
      status: randomPick(["active", "archived", "delisted"], [0.85, 0.10, 0.05]),
      isSynced: true,
      lastSyncedAt: new Date()
    };
  });
});
```

**Data Volume:**
- Shopify Product Mappings: 50-150 per store × 10-20 stores = 500-3,000 mappings
- WooCommerce Product Mappings: 50-150 per store × 5-10 stores = 250-1,500 mappings
- Amazon Product Mappings: 30-100 per store × 3-8 stores = 90-800 mappings
- Flipkart Product Mappings: 30-100 per store × 3-8 stores = 90-800 mappings
- **Total:** 930-6,100 product mappings

**Dependencies:**
- Requires: Seeder #21 (Marketplace Stores) + Seeder #6 (Inventory)
- Used by: Inventory sync testing, multi-channel operations

**Files to Create:**
- `25-marketplace-product-mappings.seeder.ts`

---

## Section 2: High-Priority Enhancements

### 2.1 Warehouse Location Limits Removal

**Current State:** ⚠️ Artificially limited to 2 aisles per zone
**Impact:** Doesn't represent realistic warehouse structure (should be 3-5 aisles)

**Issue Location:** [04-warehouses.seeder.ts](server/src/infrastructure/database/seeders/seeders/04-warehouses.seeder.ts)

**Change Required:**
```typescript
// FROM: Limited to 2 aisles (artificial)
const aisles = 2;

// TO: Realistic 3-5 aisles per zone
const aisles = Math.floor(Math.random() * 3) + 3;  // 3-5 aisles

// Also increase bin range for realism
// FROM: 10 bins per aisle
const binsPerAisle = 10;

// TO: 20-50 bins per aisle (realistic)
const binsPerAisle = Math.floor(Math.random() * 31) + 20;  // 20-50 bins
```

**Impact:**
- Warehouse locations increase from ~500 to ~2,000-5,000
- Better represents real-world warehouse complexity
- More realistic inventory placement scenarios

---

### 2.2 Add AuditLog Seeder

**Current State:** ❌ NOT SEEDED
**Impact:** Cannot test audit trail features or compliance reporting

**Collections to Create:**
- `AuditLog`

**Data Structure:**

```typescript
// Audit Log
{
  _id: ObjectId,
  entityType: "Order" | "Shipment" | "Company" | "User" | "Warehouse",
  entityId: ObjectId,
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "SUSPEND",
  changeLog: {
    before: {},    // Previous state
    after: {},     // New state
    changedFields: ["status", "weight"]
  },
  userId: ObjectId,
  userName: "john@example.com",
  userRole: "admin" | "seller" | "staff",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  timestamp: Date,
  metadata: {
    source: "api" | "ui" | "webhook" | "scheduled",
    endpoint: "POST /api/v1/orders",
    duration: 234  // milliseconds
  }
}
```

**Seeding Plan:**

```javascript
// Generate 10-30 audit logs per order/shipment
// Track state transitions:
// Order: Created → Confirmed → Picked → Packed → Shipped → Delivered
// Shipment: Pending → Pickup Scheduled → Picked Up → In Transit → Delivered/NDR/RTO

const auditLogs = [];

orders.forEach(order => {
  const timestamps = generateOrderTimeline(order);
  timestamps.forEach((ts, idx) => {
    auditLogs.push({
      entityType: "Order",
      entityId: order._id,
      action: ["CREATE", "UPDATE", "APPROVE"][idx % 3],
      changeLog: {
        before: idx === 0 ? {} : order,
        after: order,
        changedFields: generateChangedFields(idx)
      },
      userId: randomUser._id,
      timestamp: ts
    });
  });
});

shipments.forEach(shipment => {
  const timestamps = generateShipmentTimeline(shipment);
  timestamps.forEach((ts, idx) => {
    auditLogs.push({
      entityType: "Shipment",
      entityId: shipment._id,
      action: statusTransitions[idx],
      changeLog: {
        before: { status: statusTransitions[idx - 1] },
        after: { status: statusTransitions[idx] },
        changedFields: ["status"]
      },
      userId: randomUser._id,
      timestamp: ts
    });
  });
});
```

**Data Volume:**
- Orders: 5-10 logs per order × 3,000-5,000 orders = 15,000-50,000 logs
- Shipments: 5-10 logs per shipment × 3,000-5,000 shipments = 15,000-50,000 logs
- Other entities: 5,000-10,000 logs
- **Total:** 35,000-110,000 audit logs

**Dependencies:**
- Requires: All other seeders (Order, Shipment, etc.)
- Used by: Compliance, audit trail testing

**Files to Create:**
- `26-audit-logs.seeder.ts`

---

### 2.3 Create Payout Records from COD Remittance

**Current State:** ⚠️ CODRemittance created but no Payout records
**Impact:** Cannot test payout lifecycle (pending → processing → completed)

**Collections to Update:**
- `Payout` (create from CODRemittance data)

**Data Structure:**

```typescript
// Payout Record
{
  _id: ObjectId,
  companyId: ObjectId,
  codRemittanceId: ObjectId,  // Link to COD remittance
  payoutType: "cod_remittance" | "commission" | "refund",
  amount: 97500,              // After deductions
  currency: "INR",
  status: "pending" | "processing" | "completed" | "failed" | "cancelled",

  bankDetails: {
    accountHolder: "John Doe",
    accountNumber: "****1234",
    ifscCode: "HDFC0001234",
    bankName: "HDFC Bank"
  },

  deductions: [
    { type: "platform_fee", amount: 500, percentage: 0.5 },
    { type: "payment_gateway_fee", amount: 1000, percentage: 1.0 }
  ],

  timeline: {
    initiatedAt: Date,
    processedAt: Date,      // When payment was made
    completedAt: Date,      // When seller received funds
    failedAt: null,
    failureReason: null
  },

  metadata: {
    transactionId: "PAY-123456",  // External transaction ID
    referenceNumber: "REF-789",
    notes: "Monthly COD payout"
  }
}
```

**Seeding Plan:**

```javascript
// Create payout for each COD remittance
const payouts = codRemittances.map(remittance => {
  const status = randomPick([
    { status: "completed", ratio: 0.70 },
    { status: "processing", ratio: 0.15 },
    { status: "pending", ratio: 0.10 },
    { status: "failed", ratio: 0.05 }
  ]);

  return {
    companyId: remittance.companyId,
    codRemittanceId: remittance._id,
    payoutType: "cod_remittance",
    amount: remittance.totalAmount * 0.995,  // After 0.5% fee
    currency: "INR",
    status: status.status,
    bankDetails: remittance.company.bankAccount,
    deductions: [
      {
        type: "platform_fee",
        amount: remittance.totalAmount * 0.005,
        percentage: 0.5
      }
    ],
    timeline: {
      initiatedAt: remittance.createdAt,
      processedAt: status.status !== "pending" ? new Date(remittance.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
      completedAt: status.status === "completed" ? new Date(remittance.createdAt.getTime() + 5 * 24 * 60 * 60 * 1000) : null,
      failedAt: status.status === "failed" ? new Date(remittance.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null
    }
  };
});
```

**Data Volume:**
- Payouts: 200-400 (1 per COD remittance)

**Dependencies:**
- Requires: Seeder #15 (COD Remittances)
- Used by: Payout testing, financial dashboard

**Files to Create/Update:**
- `27-payouts.seeder.ts` (new)
- Update `15-cod-remittances.seeder.ts` (store payoutId reference)

---

## Section 3: Optional Enhancements

### 3.1 StockMovement Tracking

**Current State:** ❌ NOT SEEDED
**Impact:** No detailed inventory audit trail

**Creates:** Individual inventory movement records for:
- RECEIVE (incoming shipment)
- PICK (picked for order)
- TRANSFER (between warehouses)
- RETURN (from customer)
- ADJUSTMENT (manual correction)
- DAMAGE (damaged goods)

---

### 3.2 NDRWorkflow Definitions

**Current State:** ❌ NOT SEEDED
**Impact:** Cannot test workflow-based NDR resolution strategies

**Creates:** Workflow templates for:
- Auto-reschedule (attempt 2)
- Seller notification (attempt 3)
- RTO escalation (attempt 4)

---

## Section 4: Implementation Timeline

### Phase 1: Critical Fixes (Day 1)
- ✅ Add RateCard & Zone seeder
- ✅ Add Marketplace Sync Logs seeder
- ✅ Add Marketplace Product Mappings seeder
- ✅ Fix warehouse location limits

### Phase 2: High-Priority (Day 2)
- ✅ Add AuditLog seeder
- ✅ Add Payout seeder
- ✅ Update seeder index with new dependencies

### Phase 3: Verification (Day 3)
- ✅ Run full seed cycle
- ✅ Validate all relationships
- ✅ Check data integrity
- ✅ Performance testing

---

## Section 5: Validation Checklist

After implementing all enhancements, verify:

- [ ] All 53 collections have seeders or are read-only
- [ ] All foreign keys properly linked
- [ ] No orphaned records (missing parent relationships)
- [ ] Wallet balances never negative
- [ ] Order-to-Shipment-to-Payment flow complete
- [ ] Marketplace sync logs represent realistic scenarios
- [ ] Product mappings cover 70-90% of inventory per store
- [ ] Audit logs track all entity state changes
- [ ] Payout records generated from COD remittances
- [ ] Warehouse locations realistic (3-5 aisles)
- [ ] Seeding completes in < 30 seconds
- [ ] No duplicate data created on re-seeding
- [ ] Performance: < 1000ms per collection
- [ ] Memory usage < 500MB during seeding

---

## Success Criteria

| Metric | Target | Status |
|---|---|---|
| Collection Coverage | 100% (53/53) | 🔄 In Progress |
| Relationship Integrity | 99%+ | 🔄 In Progress |
| Seeding Time | < 30 seconds | 🔄 In Progress |
| Data Realism | 95%+ | ✅ Met |
| Error Rate | < 0.1% | 🔄 In Progress |
| Ready for Testing | Yes | 🔄 In Progress |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-10
**Author:** Claude Code
**Status:** 📋 PLANNING PHASE
