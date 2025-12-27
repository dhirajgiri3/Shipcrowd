# WAREHOUSE, RATECARD & ZONE MODULES - Context Package
**Modules:** Warehouse Management, Rate Card Management, Zone Management
**Version:** 1.0
**Created:** December 26, 2025
**Status:** 60% Complete (Session 2 baseline)
**Priority:** P1-P2 (Important - Supporting Modules)
**Dependencies:** Company, Shipment, Order

---

## TABLE OF CONTENTS

1. [Module Overview](#1-module-overview)
2. [Warehouse Module](#2-warehouse-module)
3. [Zone Module](#3-zone-module)
4. [RateCard Module](#4-ratecard-module)
5. [Module Relationships](#5-module-relationships)
6. [Known Issues & Gaps](#6-known-issues--gaps)
7. [Testing Requirements](#7-testing-requirements)
8. [Future Enhancements](#8-future-enhancements)

---

## 1. MODULE OVERVIEW

### 1.1 Purpose

These three modules work together to enable **intelligent warehouse selection** and **dynamic pricing**:

- **Warehouse**: Stores origin locations for shipments
- **Zone**: Defines geographical serviceability areas
- **RateCard**: Pricing rules based on carrier, weight, and zone

### 1.2 Module Relationships

```
Warehouse
  ├─> Used by Order (warehouseId field)
  ├─> Used by Shipment (pickupDetails.warehouseId)
  └─> Determines origin pincode for carrier selection

Zone
  ├─> Defines postal codes groups
  ├─> Used by RateCard (zoneRules)
  └─> Future: Auto-assign warehouse based on customer zone

RateCard
  ├─> Pricing engine for shipping cost
  ├─> References Zone for zone-based pricing
  └─> Customer-specific discounts
```

### 1.3 Current Status Summary

| Module | Completion | Priority | Week 1 Target | Notes |
|--------|------------|----------|---------------|-------|
| Warehouse | 70% | P1 | 85% | Basic CRUD done, missing geo features |
| Zone | 50% | P2 | 60% | Model exists, no controllers yet |
| RateCard | 40% | P2 | 50% | Model exists, no controllers yet |

---

## 2. WAREHOUSE MODULE

### 2.1 Database Model

**File:** `server/src/infrastructure/database/mongoose/models/Warehouse.ts`

#### Schema Overview

```typescript
interface IWarehouse extends Document {
  // Core Fields
  name: string;                       // Unique name
  companyId: mongoose.Types.ObjectId;

  // Address
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;                  // Default: "India"
    postalCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Contact Information
  contactInfo: {
    name: string;                     // Contact person
    phone: string;
    email?: string;
    alternatePhone?: string;
  };

  // Operating Hours
  operatingHours?: {
    monday: { open: string | null; close: string | null };
    tuesday: { open: string | null; close: string | null };
    wednesday: { open: string | null; close: string | null };
    thursday: { open: string | null; close: string | null };
    friday: { open: string | null; close: string | null };
    saturday: { open: string | null; close: string | null };
    sunday: { open: string | null; close: string | null };
  };

  // Status Flags
  isActive: boolean;                  // Warehouse operational?
  isDefault: boolean;                 // Default warehouse for company
  isDeleted: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

#### Indexes

```typescript
// Automatic
{ name: 1 } // unique

// Manual
{ companyId: 1 }
{ 'address.postalCode': 1 }
{ isActive: 1 }
{ isDefault: 1 }
{ isDeleted: 1 }

// Compound
{ companyId: 1, isActive: 1 }     // Active warehouses listing
{ companyId: 1, isDeleted: 1 }    // Warehouse listing
```

### 2.2 Current Implementation

**Status:** 70% Complete

**Implemented:**
- ✅ Database model with validation
- ✅ Indexes for query optimization
- ✅ Multi-tenancy (companyId filter)
- ✅ Default warehouse flag
- ✅ Operating hours structure
- ✅ Soft delete support

**Missing:**
- ⚪ Warehouse CRUD controllers (Week 5)
- ⚪ Warehouse API routes (Week 5)
- ⚪ Geo-location validation (Week 11)
- ⚪ Auto-assign warehouse logic (Week 11)
- ⚪ Inventory management (Week 12)

### 2.3 Use Cases

**1. Shipment Pickup Location**
```typescript
// Shipment creation uses warehouse for pickup
const originPincode = await ShipmentService.getWarehouseOriginPincode(
  order.warehouseId,
  companyId
);

// If warehouse has coordinates, can calculate distance to customer
const distance = calculateDistance(
  warehouse.address.coordinates,
  customerCoordinates
);
```

**2. Default Warehouse**
```typescript
// Find company's default warehouse
const defaultWarehouse = await Warehouse.findOne({
  companyId,
  isDefault: true,
  isActive: true,
  isDeleted: false
});

// Use for orders without explicit warehouse selection
order.warehouseId = defaultWarehouse._id;
```

**3. Operating Hours Validation**
```typescript
// Check if warehouse is open for pickup
function isWarehouseOpen(warehouse, pickupTime) {
  const day = pickupTime.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const hours = warehouse.operatingHours?.[day];

  if (!hours || !hours.open || !hours.close) return false;

  const pickupHour = pickupTime.getHours();
  const openHour = parseInt(hours.open.split(':')[0]);
  const closeHour = parseInt(hours.close.split(':')[0]);

  return pickupHour >= openHour && pickupHour < closeHour;
}
```

### 2.4 Future Features

**Week 5: Warehouse CRUD**
- POST `/warehouses` - Create warehouse
- GET `/warehouses` - List warehouses
- GET `/warehouses/:id` - Get warehouse details
- PATCH `/warehouses/:id` - Update warehouse
- DELETE `/warehouses/:id` - Soft delete warehouse

**Week 11: Auto-Assignment**
- Geo-location based warehouse selection
- Calculate distance from customer to each warehouse
- Select nearest warehouse with inventory
- Fallback to default warehouse if no match

**Week 12: Inventory Management**
- Track product inventory per warehouse
- Reserve inventory on order creation
- Release inventory on order cancellation
- Low stock alerts

---

## 3. ZONE MODULE

### 3.1 Database Model

**File:** `server/src/infrastructure/database/mongoose/models/Zone.ts`

#### Schema Overview

```typescript
interface IZone extends Document {
  // Core Fields
  name: string;                       // "North Delhi Zone"
  companyId: mongoose.Types.ObjectId;

  // Postal Codes (Max 10,000 per zone)
  postalCodes: string[];              // ["110001", "110002", ...]

  // Geographical Boundaries (Optional)
  geographicalBoundaries?: {
    type: string;                     // "Polygon"
    coordinates: number[][][];        // GeoJSON polygon
  };

  // Serviceability
  serviceability: {
    carriers: string[];               // ["Delhivery", "DTDC", ...]
    serviceTypes: string[];           // ["express", "standard"]
  };

  // Transit Times
  transitTimes: Array<{
    carrier: string;
    serviceType: string;
    minDays: number;
    maxDays: number;
  }>;                                 // Max 100 entries

  // Soft Delete
  isDeleted: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

#### Array Validators

```typescript
// Max 10,000 postal codes per zone
postalCodes: {
  validate: [
    arrayLimit(10000),
    'Maximum 10,000 postal codes per zone'
  ]
}

// Max 100 transit time entries
transitTimes: {
  validate: [
    arrayLimit(100),
    'Maximum 100 transit time entries'
  ]
}
```

#### Indexes

```typescript
// Automatic
{ name: 1 } // unique

// Manual
{ companyId: 1 }
{ postalCodes: 1 }               // Lookup by postal code
{ isDeleted: 1 }

// Compound
{ companyId: 1, name: 1 }
{ companyId: 1, isDeleted: 1 }

// Geospatial (sparse)
{ geographicalBoundaries: '2dsphere' }
```

### 3.2 Current Implementation

**Status:** 50% Complete

**Implemented:**
- ✅ Database model with validation
- ✅ Postal code array storage
- ✅ GeoJSON polygon support (2dsphere index)
- ✅ Transit time tracking
- ✅ Serviceability rules

**Missing:**
- ⚪ Zone CRUD controllers (Week 6)
- ⚪ Zone API routes (Week 6)
- ⚪ Postal code lookup API (Week 6)
- ⚪ Zone-based warehouse assignment (Week 11)
- ⚪ Zone-based pricing (Week 7)

### 3.3 Use Cases

**1. Postal Code Lookup**
```typescript
// Find zone containing a postal code
const zone = await Zone.findOne({
  companyId,
  postalCodes: '110001',
  isDeleted: false
});

// Check serviceability
const isServiceable = zone.serviceability.carriers.includes('Delhivery');
```

**2. Transit Time Estimation**
```typescript
// Get transit time for carrier/service
const transitTimeEntry = zone.transitTimes.find(
  t => t.carrier === 'Delhivery' && t.serviceType === 'express'
);

const estimatedDelivery = new Date();
estimatedDelivery.setDate(
  estimatedDelivery.getDate() + transitTimeEntry.maxDays
);
```

**3. Geospatial Query (Future)**
```typescript
// Find zone containing a lat/long point
const zone = await Zone.findOne({
  geographicalBoundaries: {
    $geoIntersects: {
      $geometry: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    }
  }
});
```

### 3.4 Future Features

**Week 6: Zone CRUD**
- POST `/zones` - Create zone
- GET `/zones` - List zones
- GET `/zones/:id` - Get zone details
- PATCH `/zones/:id` - Update zone
- DELETE `/zones/:id` - Soft delete zone
- GET `/zones/lookup/:postalCode` - Find zone by postal code

**Week 7: Zone-Based Pricing**
- Integrate Zone with RateCard
- Apply zone surcharges
- Distance-based pricing

**Week 11: Auto-Warehouse Assignment**
- Map customer postal code to zone
- Select warehouse serving that zone
- Fallback logic if no zone match

---

## 4. RATECARD MODULE

### 4.1 Database Model

**File:** `server/src/infrastructure/database/mongoose/models/RateCard.ts`

#### Schema Overview

```typescript
interface IRateCard extends Document {
  // Core Fields
  name: string;                       // "Standard Rate Card Q1 2025"
  companyId: mongoose.Types.ObjectId;

  // Base Rates (Max 1,000 entries)
  baseRates: Array<{
    carrier: string;
    serviceType: string;
    basePrice: number;
    minWeight: number;
    maxWeight: number;
  }>;

  // Weight Rules (Max 1,000 entries)
  weightRules: Array<{
    minWeight: number;
    maxWeight: number;
    pricePerKg: number;
    carrier?: string;                 // Optional filter
    serviceType?: string;             // Optional filter
  }>;

  // Zone Rules (Max 1,000 entries)
  zoneRules: Array<{
    zoneId: mongoose.Types.ObjectId;
    carrier: string;
    serviceType: string;
    additionalPrice: number;          // Surcharge for this zone
    transitDays?: number;
  }>;

  // Customer Overrides (Max 500 entries)
  customerOverrides: Array<{
    customerId?: mongoose.Types.ObjectId;
    customerGroup?: string;           // "VIP", "Wholesale", etc.
    discountPercentage?: number;      // 0-100
    flatDiscount?: number;
    carrier?: string;
    serviceType?: string;
  }>;

  // Effective Dates
  effectiveDates: {
    startDate: Date;
    endDate?: Date;
  };

  // Status
  status: 'draft' | 'active' | 'inactive' | 'expired';

  // Versioning
  version: number;
  previousVersionId?: mongoose.Types.ObjectId;

  // Soft Delete
  isDeleted: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

#### Array Validators

```typescript
baseRates: { validate: [arrayLimit(1000), 'Maximum 1,000 base rates'] }
weightRules: { validate: [arrayLimit(1000), 'Maximum 1,000 weight rules'] }
zoneRules: { validate: [arrayLimit(1000), 'Maximum 1,000 zone rules'] }
customerOverrides: { validate: [arrayLimit(500), 'Maximum 500 customer overrides'] }
```

#### Indexes

```typescript
// Automatic
{ name: 1 } // unique

// Manual
{ companyId: 1 }
{ 'effectiveDates.startDate': 1, 'effectiveDates.endDate': 1 }
{ status: 1 }
{ isDeleted: 1 }

// Compound
{ companyId: 1, status: 1 }       // Active rate cards
{ companyId: 1, isDeleted: 1 }    // Rate card listing
```

### 4.2 Current Implementation

**Status:** 40% Complete

**Implemented:**
- ✅ Database model with validation
- ✅ Complex pricing rules structure
- ✅ Customer-specific overrides
- ✅ Versioning system
- ✅ Effective date ranges

**Missing:**
- ⚪ RateCard CRUD controllers (Week 7)
- ⚪ RateCard API routes (Week 7)
- ⚪ Pricing calculation engine (Week 7)
- ⚪ Rate comparison API (Week 7)
- ⚪ Rate card activation/expiration workflow (Week 7)

### 4.3 Pricing Logic (Future)

**Rate Calculation Flow:**
```
1. Find active rate card for company
2. Match carrier + serviceType base rate
3. Apply weight rule if applicable
4. Apply zone rule if destination zone matches
5. Apply customer override if exists
6. Return final calculated rate
```

**Example Calculation:**
```typescript
async function calculateShippingRate(args: {
  companyId: string;
  carrier: string;
  serviceType: string;
  weight: number;          // in kg
  zoneId?: string;
  customerId?: string;
}): Promise<number> {
  // 1. Get active rate card
  const rateCard = await RateCard.findOne({
    companyId: args.companyId,
    status: 'active',
    'effectiveDates.startDate': { $lte: new Date() },
    $or: [
      { 'effectiveDates.endDate': { $gte: new Date() } },
      { 'effectiveDates.endDate': null }
    ]
  });

  // 2. Find base rate
  const baseRate = rateCard.baseRates.find(
    r => r.carrier === args.carrier &&
         r.serviceType === args.serviceType &&
         args.weight >= r.minWeight &&
         args.weight <= r.maxWeight
  );

  let price = baseRate?.basePrice || 0;

  // 3. Apply weight rule
  const weightRule = rateCard.weightRules.find(
    r => args.weight >= r.minWeight &&
         args.weight <= r.maxWeight &&
         (!r.carrier || r.carrier === args.carrier) &&
         (!r.serviceType || r.serviceType === args.serviceType)
  );

  if (weightRule) {
    price += (args.weight - weightRule.minWeight) * weightRule.pricePerKg;
  }

  // 4. Apply zone rule
  if (args.zoneId) {
    const zoneRule = rateCard.zoneRules.find(
      r => String(r.zoneId) === args.zoneId &&
           r.carrier === args.carrier &&
           r.serviceType === args.serviceType
    );

    if (zoneRule) {
      price += zoneRule.additionalPrice;
    }
  }

  // 5. Apply customer override
  if (args.customerId) {
    const override = rateCard.customerOverrides.find(
      r => (r.customerId && String(r.customerId) === args.customerId) &&
           (!r.carrier || r.carrier === args.carrier) &&
           (!r.serviceType || r.serviceType === args.serviceType)
    );

    if (override) {
      if (override.discountPercentage) {
        price -= price * (override.discountPercentage / 100);
      }
      if (override.flatDiscount) {
        price -= override.flatDiscount;
      }
    }
  }

  return Math.max(0, price);  // Ensure non-negative
}
```

### 4.4 Future Features

**Week 7: RateCard CRUD**
- POST `/ratecards` - Create rate card
- GET `/ratecards` - List rate cards
- GET `/ratecards/:id` - Get rate card details
- PATCH `/ratecards/:id` - Update rate card (creates new version)
- DELETE `/ratecards/:id` - Soft delete rate card
- POST `/ratecards/:id/activate` - Activate rate card
- POST `/ratecards/calculate` - Calculate rate for shipment

**Week 8: Rate Versioning**
- Auto-expire old rate cards when new one activated
- Rate card history view
- Rollback to previous version

**Week 9: Advanced Pricing**
- Volume-based discounts
- Promotional pricing
- Time-based pricing (peak hours surcharge)

---

## 5. MODULE RELATIONSHIPS

### 5.1 Data Flow

**Shipment Creation with Warehouse, Zone & RateCard:**

```
User creates order
  ↓
Order assigns default warehouse (or user selects)
  ↓
User initiates shipment creation
  ↓
System gets warehouse origin pincode
  ↓
System finds destination zone by customer postal code
  ↓
System calculates rate using RateCard:
  - Base rate for carrier/service
  - Weight rule
  - Zone surcharge
  - Customer discount
  ↓
System creates shipment with calculated rate
  ↓
Order updated with shipping cost
```

### 5.2 Future Integration (Week 11)

**Auto-Warehouse Assignment:**

```
Customer places order with delivery postal code
  ↓
System looks up zone containing postal code
  ↓
System finds warehouses serving that zone
  ↓
System calculates distance to each warehouse
  ↓
System checks inventory at each warehouse
  ↓
System selects nearest warehouse with stock
  ↓
Order assigned to selected warehouse
```

---

## 6. KNOWN ISSUES & GAPS

### 6.1 High Priority Gaps

**1. No Warehouse CRUD (Week 5)**
- **Issue:** Model exists but no API endpoints
- **Impact:** Warehouses must be manually added to database
- **ETA:** Week 5

**2. No Zone Management (Week 6)**
- **Issue:** Model exists but no controllers
- **Impact:** Cannot create/manage zones via API
- **ETA:** Week 6

**3. No Rate Calculation Engine (Week 7)**
- **Issue:** RateCard model exists but not used
- **Impact:** Shipping costs hardcoded in mock carrier service
- **ETA:** Week 7

### 6.2 Medium Priority Gaps

**4. No Geo-Location Features (Week 11)**
- **Issue:** Coordinates field exists but not used
- **Impact:** Cannot auto-select nearest warehouse
- **ETA:** Week 11

**5. No Inventory Management (Week 12)**
- **Issue:** Warehouse has no inventory tracking
- **Impact:** Cannot prevent over-allocation
- **ETA:** Week 12

**6. No Customer Groups (Week 9)**
- **Issue:** RateCard supports customerGroup but no Group model
- **Impact:** Cannot apply group-based discounts
- **ETA:** Week 9

---

## 7. TESTING REQUIREMENTS

### 7.1 Current Test Coverage: 0%

**Required Coverage:** 70% (Week 1), 85% (Week 16)

### 7.2 Required Tests

**Warehouse Module:**
- ✅ CRUD operations (Week 5)
- ✅ Default warehouse selection
- ✅ Operating hours validation
- ✅ Geo-distance calculation (Week 11)

**Zone Module:**
- ✅ Postal code lookup (Week 6)
- ✅ Geospatial queries (Week 11)
- ✅ Serviceability check (Week 6)

**RateCard Module:**
- ✅ Rate calculation logic (Week 7)
- ✅ Weight rule application
- ✅ Zone surcharge calculation
- ✅ Customer discount application
- ✅ Rate card versioning (Week 8)

---

## 8. FUTURE ENHANCEMENTS

**Week 5:** Warehouse CRUD API
**Week 6:** Zone management API, Postal code lookup
**Week 7:** RateCard CRUD API, Rate calculation engine
**Week 8:** Rate card versioning and history
**Week 9:** Customer groups, Advanced pricing rules
**Week 11:** Auto-warehouse assignment, Geo-location features
**Week 12:** Inventory management per warehouse
**Week 14:** Multi-warehouse order fulfillment
**Week 15:** Rate comparison widget for customers

---

**Document End**
**Last Updated:** December 26, 2025
**Next Review:** Week 5 (Warehouse API Implementation)
