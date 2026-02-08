# ShipCrowd RateCard Management System: Comprehensive Technical Reference

> Note (2026-02-08): Legacy pricing fields (baseRates, weightRules, zoneRules, zoneMultipliers) and migration scripts have been removed. Zone Pricing is now the only supported model.

**Document Version:** 3.2 (Definitive Edition - Corrected)  
**Last Updated:** February 8, 2026  
**Status:** Production / Recently Refactored  
**Author:** Engineering Team (Logistics Core)  
**System Version:** v3.0.0 (Unified Zone Pricing)

---

## 📖 Table of Contents

1.  [Executive Summary](#1-executive-summary)
2.  [System Architecture & Design Philosophy](#2-system-architecture--design-philosophy)
3.  [Core Data Models (Deep Dive)](#3-core-data-models-deep-dive)
4.  [Database Strategy & Indexing](#4-database-strategy--indexing)
5.  [The Unified Pricing Engine](#5-the-unified-pricing-engine)
6.  [Zone Logic & Determination](#6-zone-logic--determination)
7.  [Operational Workflows](#7-operational-workflows)
8.  [Detailed Courier Profiles (20+ Integrations)](#8-detailed-courier-profiles-20-integrations)
9.  [Migration & Backward Compatibility](#9-migration--backward-compatibility)
10. [Troubleshooting & Error Codes](#10-troubleshooting--error-codes)
11. [API Reference Implementation](#11-api-reference-implementation)
12. [Glossary & Terminology](#12-glossary--terminology)
13. [Recent Refactor (February 2026)](#13-recent-refactor-february-2026)

---

## 1. Executive Summary

### 1.1 The Need for Version 3
The ShipCrowd RateCard Management System determines the shipping cost for every single order processed through our platform. In the fast-paced world of Indian logistics, accuracy is paramount. A difference of ₹5 per shipment can lead to losses of lakhs per month at scale.

Our legacy system (v1) was built on a "flexibility-first" approach, attempting to support every possible pricing model simultaneously (Base Rates, Weight Slabs, Zone Multipliers, Zone Rules). While theoretically powerful, in practice, it led to:
*   **Non-Determinism:** It was often unclear *which* rule was applying to a shipment.
*   **Performance Bottlenecks:** Calculating a price required multiple database lookups and complex waterfall logic (~150ms/req).
*   **Operational Friction:** Administering conflicting rules was error-prone, leading to billing disputes with couriers.

The **v3 Refactor** (completed Feb 2026) introduces a **Unified Zone Pricing Architecture**. We have standardized on the models used by industry giants (like Blue Dart, Delhivery, and aggregators like Shiprocket/ClickPost): **Zone-Based Base + Incremental Pricing**.

### 1.2 Key Improvements at a Glance

| Metric | Legacy System (v1) | Production System (v3) | Business Impact |
| :--- | :--- | :--- | :--- |
| **Pricing Model** | 3 Conflicting Models | **1 Unified Model** | Zero ambiguity in billing. |
| **Calc Speed** | ~150ms | **~45ms** | 3x capacity increase for high-traffic sales. |
| **Code Size** | 450 Lines (Core Logic) | **180 Lines** (Core Logic) | Easier maintenance, fewer bugs. |
| **Edge Cases** | 47 Known Issues | **<5 Edge Cases** | Drastic reduction in support tickets. |
| **Seeding** | Broken/Outdated | **10 Production Templates** | Instant onboarding for new merchants. |

---

## 2. System Architecture & Design Philosophy

### 2.1 The "Zone Pricing" Philosophy
The core design philosophy of v3 is **Simplicity > Complexity**. 
Instead of a rule engine that evaluates arbitrary conditions, we enforce a strict structure:
1.  **Geography defines Zone.**
2.  **Zone defines Price.**
3.  **Weight defines Multiplier.**

#### The Universal Formula
Every shipment price is calculated using this standard formula:

```math
Freight = BasePrice + max(0, ceil(ChargeableWeight - BaseWeight)) * AdditionalPricePerKg
```

### 2.2 Component Overview

#### A. The Rate Card Manager (Admin)
The administrative interface allows Operations teams to configure rates. Crucially, strictly enforcing the v3 model means the UI is now simpler: a grid of **5 Zones** × **3 Fields** (Base Weight, Base Price, Extra/kg).

#### B. The Selection Engine
Before pricing can happen, the system must select the *correct* Rate Card.
Selection Logic (in priority order):

1.  **Filter by Company:** `companyId`
2.  **Filter by Status:** `status: 'active'`, `isDeleted: false` (Explicitly prevents picking deleted cards)
3.  **Filter by Date:** `startDate <= NOW` AND (`endDate == null` OR `endDate >= NOW`)
4.  **Filter by Type:** `shipmentType` ('forward' vs 'reverse')
5.  **Filter by Category:** `rateCardCategory` (e.g., 'economy', 'standard', 'premium') - *New in v3*

**Priority Logic:**
The system selects the "Best Match" based on specificity:
1.  **Customer-Specific Override:** Card assigned to specific customer ID.
2.  **Customer Group Override:** Card assigned to customer group (e.g., 'vip', 'enterprise').
3.  **Special Promotion:** Time-bound promotional cards (`isSpecialPromotion: true`).
4.  **Default Card:** Company's default rate card (`company.settings.defaultRateCardId`).
5.  **Fallback:** Any active, non-deleted card matching filters.

#### C. The Pricing Engine
A pure-function calculator. It takes `Inputs` (Weight, Pincodes, Value) and `RateCard` configuration, and outputs a `Price Breakdown`. It does *not* make database calls itself (for performance), relying on the caller to provide the necessary data.

---

## 3. Core Data Models (Deep Dive)

### 3.1 The `RateCard` Schema (v2)

The `RateCard` is the central source of truth.

```typescript
/**
 * RateCard Schema Definition v2
 * Located: server/src/models/RateCard.ts
 */
interface IRateCard {
    _id: ObjectId;
    
    // --- Identity ---
    name: string;                   // "Delhivery Surface Standard"
    companyId: ObjectId;            // Merchant Owner
    carrier: string;                // "DELHIVERY"
    serviceType: string;            // "Surface"
    shipmentType: 'forward' | 'reverse'; 
    rateCardCategory?: string;      // NEW: "economy", "standard", "heavy_freight"

    // --- The Core: Zone Pricing MAP ---
    // This object completely replaces the old arrays of rules.
    zonePricing: {
        [key in 'zoneA' | 'zoneB' | 'zoneC' | 'zoneD' | 'zoneE']: {
            baseWeight: number;       // kg (e.g., 0.5)
            basePrice: number;        // INR (e.g., 40)
            additionalPricePerKg: number; // INR (e.g., 10)
        }
    };

    // --- Surcharges ---
    fuelSurcharge: number;          // Percentage (e.g., 10 = 10%)
    fuelSurchargeBase: 'freight' | 'freight_cod'; // NEW: Defines calc basis
    
    // COD Configuration (Fixed in v3)
    codPercentage: number;          // Percentage (e.g., 2.0 = 2%)
    codMinimumCharge: number;       // Flat Floor (e.g., 30 = ₹30)
    
    // Advanced COD Slabs (Optional)
    codSurcharges?: Array<{
        min: number;
        max: number;
        value: number;
        type: 'flat' | 'percentage';
    }>;
    
    // Min Fare Strategy
    minimumFare: number;            // Absolute floor price (e.g., ₹40)
    minimumFareCalculatedOn: 'freight' | 'freight_overhead';
    // 'freight': Checks against Base + Weight Charge only.
    // 'freight_overhead': Checks against (Base + Weight + Fuel + COD).
    
    // Remote Area (ODA)
    remoteAreaEnabled: boolean;
    remoteAreaSurcharge: number;    // Flat fee (e.g., ₹50)

    // --- Configuration Logic ---
    zoneBType: 'state' | 'distance'; 
    // 'state': Same State
    // 'distance': < 500km
    
    // --- Meta ---
    versionNumber: number;          // v2, v3, etc.
    parentVersionId?: ObjectId;     // For audit trails
    isDeleted: boolean;             // Soft delete only

    // --- Deprecated v1 Fields (Preserved for Rollback) ---
    baseRates?: any[];
    weightRules?: any[];
    zoneMultipliers?: any;
    zoneRules?: any[];
}
```

### 3.2 The `Zone` Concept
Zones categorize the "distance difficulty" of a shipment.

*   **Zone A (Local):** Same City. Cheapest rates. High operational efficiency.
*   **Zone B (Regional):** Same State OR < 500km. Moderate rates. Trucking lanes.
*   **Zone C (Metro):** Top Metros (DEL, BOM, BLR, MAA, CCU, HYD). High volume, competitive rates (often cheaper than B).
*   **Zone D (National):** Rest of India (ROI). Air or Long-haul Surface. Standard rates.
*   **Zone E (Special):** North East (NE), J&K, Islands. Expensive. Complex logistics.

---

## 4. Database Strategy & Indexing

To achieve the ~45ms pricing target, database performance is critical. We use MongoDB specifically for its document flexibility and read performance.

### 4.1 Indexing Strategy
We enforce Compound Indexes to satisfy the Selection Engine's queries in a single "Index Scan" (IXSCAN).

```javascript
// Scope: RateCard Collection
db.ratecards.createIndex({ 
    companyId: 1, 
    status: 1, 
    isDeleted: 1, 
    "effectiveDates.startDate": 1 
});

// Explanation:
// 1. companyId: High cardinality, best filter.
// 2. status/isDeleted: Boolean filters to exclude garbage.
// 3. startDate: Range filter for validity.
```

### 4.2 Caching Layer (Redis)
While Rate Cards change infrequently, Zone Mappings (Pincode -> Pincode) do not change often.
*   **Rate Cards:** Cached for 15 minutes. Invalidated on Update/Save.
*   **Zone Pairs:** Cached for 24 hours. (e.g., `ZONE:110001:560001` -> 'C').

---

## 5. The Unified Pricing Engine

### 5.1 The Calculation Pipeline
The engine executes a linear pipeline.

```typescript
// 1. Input Normalization
const weight = Math.max(actualWeight, (L*W*H)/Divisor);
const zone = ZoneService.resolve(fromPin, toPin);

// 2. Base Cost
const { baseWeight, basePrice, extraRate } = rateCard.zonePricing[zone];
let total = basePrice;

// 3. Weight Increments
// 3. Weight Increments
if (weight > baseWeight) {
    const extraWeight = weight - baseWeight;
    // Exact decimal calculation (No CEIL)
    total += extraWeight * extraRate;
}

// 4. Surcharges
// Fuel calculation depends on base configuration
const fuelBasis = rateCard.fuelSurchargeBase === 'freight_cod' 
    ? (total + codCharge) 
    : total;
const fuel = fuelBasis * (rateCard.fuelSurcharge / 100);

const remote = isRemote ? rateCard.remoteAreaSurcharge : 0;

// COD Logic (Corrected in v3)
let codCharge = 0;
if (inputs.paymentMode === 'COD') {
    // Check for advanced slabs first
    if (rateCard.codSurcharges?.length) {
         // ... find matching slab based on Order Value ...
         codCharge = calculateSlabCOD(inputs.declaredValue, rateCard.codSurcharges);
    } else {
        // Fallback to simple percentage
        const codCalc = inputs.declaredValue * (rateCard.codPercentage / 100);
        codCharge = Math.max(codCalc, rateCard.codMinimumCharge);
    }
}

// 5. Min Fare Check (Sophisticated Logic)
if (rateCard.minimumFare) {
    const minimumBase = rateCard.minimumFareCalculatedOn === 'freight_overhead'
        ? (total + fuel + remote + codCharge)  // All charges
        : total;                               // Just freight

    if (minimumBase < rateCard.minimumFare) {
        // Add difference to total
        const diff = rateCard.minimumFare - minimumBase;
        total += diff;
    }
}
// Legacy fallback
else if (rateCard.minimumCall && total < rateCard.minimumCall) {
    total = rateCard.minimumCall;
}

// 6. Tax
return (total + fuel + remote + codCharge) * 1.18; // 18% GST estimate
```

### 5.2 Chargeable Weight Logic
"Chargeable Weight" is the greater of Actual Weight vs. Volumetric Weight.
*   **Volumetric Formula:** `(Length x Width x Height) / Divisor`
*   **Standard Divisor:** 5000 (Most couriers)
*   **Exceptions:** Ekart (4750), FedEx Surface (4500 sometimes).

*Example:*
Box: 20cm x 20cm x 20cm. Actual: 500g.
Volumetric: (8000 / 5000) = 1.6kg.
Chargeable: **1.6kg** (Rounded to **2kg** usually).
Price calculated on 2kg, not 0.5kg.

---

## 6. Zone Logic & Determination

### 6.1 Handling `zoneBType`
This setting solves a major industry pain point: **"What is a Region?"**
*   **Scenario:** Hosur (TN) to Bangalore (KA).
*   **State Logic:** Different States -> **Zone D (National)**. Expensive.
*   **Distance Logic:** Distance < 40km -> **Zone B (Regional)**. Cheap.

The v3 engine checks `rateCard.zoneBType`:
*   If `distance`: Calls internal Geo-Service (Haversine formula).
*   If `state`: Checks state string equality.

### 6.2 Metro City Definitions
We maintain a hardcoded list of "Core Metros" for Zone C logic.
*   **New Delhi** (110xxx)
*   **Gurgaon** (122xxx)
*   **Noida** (201xxx)
*   **Mumbai** (400xxx)
*   **Bangalore** (560xxx)
*   **Chennai** (600xxx)
*   **Kolkata** (700xxx)
*   **Hyderabad** (500xxx)
*   **Ahmedabad** (380xxx)
*   **Pune** (411xxx)

*(Note: Pincode prefixes are illustrative; system uses full mappings)*

---

## 7. Operational Workflows

### 7.1 Seeding Default Cards
When a new Company is created, we seed 10 standard rate cards.
**File:** `server/src/infrastructure/database/seeders/23-rate-card-and-zones.seeder.ts`
**Command:** `npm run seed:23`

This creates **10 Standard Templates** with `version: 'v2'` and populated `zonePricing`:
1.  **Economy Surface:** Low base rates, high TAT. Good for bulk.
2.  **Standard Surface:** Default choice.
3.  **Express Air:** High rates, low TAT. Low base weight (0.5kg).
4.  **Heavy Freight (Surface):** High base weight (10kg). For B2B.
5.  **Metro Sprint:** Discounted Zone C rates.
6.  **Reverse Logistics:** Higher base rates (includes pickup cost).
7.  **COD Saver:** 1.5% COD (vs standard 2%).
8.  **Remote Access:** High Zone E surcharges built-in.
9.  **Festive Peak:** Temporary card (higher rates).
10. **Enterprise Gold:** Flat rates for VIPs.

*Note: Legacy fields (`baseRates`, `weightRules`) are explicitly set to empty arrays `[]` in these new templates.*

### 7.2 Creating a Custom Card
1.  Admin logs into Dashboard -> Settings -> Rate Cards.
2.  Clicks "Create New".
3.  Selects "Clone from Standard" (Recommended) or "Scratch".
4.  Enters Base/Extra rates for Zones A-E.
5.  Clicks "Publish". 
    *   System sets `effectiveDate` to Now.
    *   System sets `zonePricing` structure.
    *   System validates no negative numbers.

---

## 8. Detailed Courier Profiles (20+ Integrations)

ShipCrowd integrates with the following carriers. Their configuration within our RateCard system is detailed below.

### 8.1 Delhivery
*   **Tier:** Tier 1 (National)
*   **Services:** Surface (10kg+), Express (0.5kg)
*   **Divisor:** 5000
*   **COD:** Yes. ~1.5% or ₹30 min.
*   **Zones:** Standard classification.
*   **Notes:** Best API reliability. Strict weight audits. Requires manifest API.

### 8.2 Blue Dart
*   **Tier:** Tier 1 (Premium)
*   **Services:** Apex (Air), Surface
*   **Divisor:** 5000
*   **COD:** Yes. High fees (~2.5%).
*   **Zones:** Very specific non-standard zones, but we map them to our A-E model.
*   **Notes:** No reverse pickup in many ODA areas. Best for documents/high-value.

### 8.3 DTDC
*   **Tier:** Tier 1 (Legacy Network)
*   **Services:** Lite, Plus, Prime
*   **Divisor:** 5000
*   **COD:** Yes.
*   **Notes:** "Prime" guarantees next-day in metros. Tracking API is Polling-based, not Webhook-based.

### 8.4 Xpressbees
*   **Tier:** Tier 1 (E-com)
*   **Services:** Standard
*   **Divisor:** 5000
*   **COD:** Yes.
*   **Notes:** Originated from FirstCry. Excellent Reverse Logistics capabilities.

### 8.5 Ecom Express
*   **Tier:** Tier 1 (Rural)
*   **Services:** Ecom Ground
*   **Divisor:** 5000
*   **COD:** Yes. Supports "Open Box Delivery" in some contracts.
*   **Notes:** Deepest reach in Tier 3/4 towns.

### 8.6 Ekart Logistics
*   **Tier:** Tier 1 (Captive)
*   **Services:** Standard
*   **Divisor:** **4750** (Special Config Required)
*   **COD:** Yes.
*   **Notes:** Flipkart's logistics arm. Very efficient but strict packaging rules.

### 8.7 Shadowfax
*   **Tier:** Tier 2 (Hyperlocal + Intercity)
*   **Services:** Surface, Air, Hyperlocal (Bike)
*   **Divisor:** 5000
*   **Notes:** Uses gig workforce. Very fast for intracity (Zone A).

### 8.8 Smartr Logistics
*   **Tier:** Tier 2 (Air focused)
*   **Services:** Air Express
*   **Divisor:** 5000
*   **Notes:** New player, formed by ex-BlueDart execs. High service levels.

### 8.9 Amazon Shipping
*   **Tier:** Tier 1
*   **Services:** SWA (Ship with Amazon)
*   **Divisor:** 5000
*   **Notes:** Available only to select sellers. Extremely reliable.

### 8.10 India Post
*   **Tier:** Government
*   **Services:** Speed Post
*   **Divisor:** N/A (Actual Weight mostly)
*   **COD:** Limit ₹50,000.
*   **Notes:** The ONLY option for some remote villages. Tracking is slow.

### 8.11 Gati KWE
*   **Tier:** Heavy Surface
*   **Services:** Surface Express
*   **Divisor:** 4500/5000 depending on contract.
*   **Notes:** Best for >20kg shipments.

### 8.12 Spoton (acquired by Delhivery)
*   **Tier:** B2B
*   **Notes:** Now integrated into Delhivery Surface networks mostly.

### 8.13 Safexpress
*   **Tier:** B2B Logistics
*   **Services:** B2B Surface
*   **Notes:** Palletized shipping specialist.

### 8.14 VRL Logistics
*   **Tier:** Regional (South/West)
*   **Availability:** Hub-to-Hub mostly.

### 8.15 TCI Express
*   **Tier:** B2B
*   **Notes:** Competitor to Gati/Safexpress.

### 8.16 Shree Maruti Courier
*   **Tier:** Regional (Gujarat/West)
*   **Notes:** Very strong in Gujarat/Maharashtra lanes. inexpensive.

### 8.17 Trackon
*   **Tier:** Regional (North)
*   **Notes:** Strong in Delhi/Punjab/Haryana.

### 8.18 The Professional Couriers (TPC)
*   **Tier:** Regional (South)
*   **Notes:** Extensive network in TN/Kerala/KA. API capabilities limited.

### 8.19 Porter
*   **Tier:** Hyperlocal
*   **Notes:** Instant delivery vehicle booking. Not standard courier.

### 8.20 Dunzo
*   **Tier:** Hyperlocal
*   **Notes:** Bike delivery for small items < 5km.

---

## 9. Migration & Backward Compatibility

### 9.1 The Migration Script
We provide a utility to convert v1 cards to v2.
**File:** `server/src/infrastructure/database/migrations/convert-ratecards-to-zone pricing-model.ts`
**Run Migration:**
```bash
ts-node server/src/infrastructure/database/migrations/convert-ratecards-to-zone pricing-model.ts
```

**Logic:**
1.  Fetch all Rate Cards.
2.  For each card, "simulate" pricing for generic weights (0.5kg, 1kg) for each Zone.
3.  Reverse-engineer the `BasePrice` and `ExtraPrice`.
4.  Write to `zonePricing`.
5.  **Validation:** Calculates price with v2 model and compares with v1 result. **Tolerance: ±5%**. If variance > 5%, the card is skipped and logged for manual review.
6.  **Flagging:** Successfully migrated cards are marked with `_migrated: true`.
7.  **Rollback Safety:** Legacy fields (`baseRates`) are preserved as-is.

### 9.2 Backward Compatibility & Rollback
The Service layer implements a strict fallback check:
1.  **Check:** Does `rateCard.zonePricing` exist?
2.  **Yes:** Call `calculateShippingCostSimplified()` (Unified Model).
3.  **No:** Call `calculateShippingCost()` (Legacy Model).

**To Rollback:**
Simply unset the `zonePricing` field on the document in MongoDB. The system will instantly revert to using the legacy fields. No code deployment is required.

---

## 10. Troubleshooting & Error Codes

### 10.1 Common Error Codes

| Error Code | Meaning | Cause | Resolution |
| :--- | :--- | :--- | :--- |
| `ERR_NO_RATE_CARD` | No Card Found | Company has no active rate card, or date range expired. | Check `effectiveDates`, enable a card. |
| `ERR_ZONE_NOT_FOUND` | Zone Resolve Failed | Pincodes are invalid or unmapped. | Update Pincode Master DB. |
| `PRC_NO_RATE_FOR_CARRIER_SERVICE` | Strict Mode Fail | Carrier/Service combination not found in rate card. | Verify carrier service mappings. |
| `ERR_PRICE_BELOW_MIN` | Minimum Fare Error | Calculated freight < Minimum Fare. | (System auto-adjusts, this is a warning). |
| `ERR_INVALID_ZONE_TYPE` | Config Error | `zoneBType` is invalid/missing. | Set to 'state' or 'distance'. |
| `ERR_DB_TIMEOUT` | Slow Query | Index miss on selection. | Check MongoDB indexes. |

### 10.2 Debugging specific prices
To debug why a specific price was returned:
1.  Check the `meta` object in the API response.
2.  It contains `pricingModel: 'zone_pricing'` (confirms v2 was used).
3.  It contains `zone: 'C'` (confirms the zone resolution).
4.  Manually calculated: `Base(ZoneC) + (Weight-BaseWt)*Extra`.
5.  Check Surcharges.

---

## 11. API Reference Implementation

### 11.1 Calculate Pricing Endpoint

**POST** `/api/v1/pricing/calculate`

**Request:**
```json
{
  "companyId": "65c4a8f...",
  "pickupPincode": "560001",
  "deliveryPincode": "110001",
  "weight": 1.2,
  "length": 10,
  "width": 10,
  "height": 10,
  "declaredValue": 2000,
  "paymentMode": "COD",
  "shipmentType": "forward"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "freightCharge": 100,
    "codCharge": 40,
    "fuelSurcharge": 10,
    "remoteAreaCharge": 0,
    "subTotal": 150,
    "gst": 27,
    "totalAmount": 177,
    "meta": {
      "courier": "Delhivery",
      "zone": "C",
      "chargeableWeight": 1.5,
      "appliedRateCardId": "65d...",
      "pricingModel": "zone_pricing" 
    }
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": {
    "code": "ERR_NO_RATE_CARD",
    "message": "No active rate card found for company X covering pincodes Y->Z"
  }
}
```

---

## 12. Glossary & Terminology

*   **AWB (Air Waybill):** The unique tracking number assigned by the courier.
*   **Chargeable Weight:** The greater of Volumetric vs Actual weight. The weight you pay for.
*   **COD (Cash on Delivery):** Payment collected from customer at doorstep.
*   **Consignee:** The customer receiving the package.
*   **Consignor:** The merchant sending the package.
*   **Forward Logistics:** Seller -> Customer shipping.
*   **Last Mile:** The final leg of delivery (Hub -> Customer).
*   **Line Haul:** The long-distance transport (City -> City).
*   **Manifest:** A daily summary document of all shipments handed over to a courier.
*   **NDR (Non-Delivery Report):** Issue raised when delivery fails (Door locked, Customer unavailable).
*   **ODA (Out of Delivery Area):** Remote location requiring extra surcharge.
*   **RTO (Return to Origin):** Shipment undelivered and returned to seller.
*   **Reverse Logistics:** Customer -> Seller returns.
*   **Volumetric Weight:** Calculated weight based on package dimensions.

---

## 13. Recent Refactor (February 2026)

### 13.1 Critical Bug Fixes Implemented
In February 2026, we completed a comprehensive refactor that fixed 5 critical bugs in the system.

1.  **COD Configuration Alignment**
    *   **Issue:** Service read non-existent `codCharges.percentage` field.
    *   **Fix:** Now correctly reads `codPercentage` and `codMinimumCharge`.
    *   **Impact:** COD charges now work correctly for all shipments.

2.  **Minimum Fare Implementation**
    *   **Issue:** `minimumFare` field was completely ignored.
    *   **Fix:** Implemented proper logic with `freight` vs `freight_overhead` modes.
    *   **Impact:** Minimum fare now applies correctly based on configuration.

3.  **Zone B Type Mapping**
    *   **Issue:** Inconsistent zone type values and missing strict validation.
    *   **Fix:** Standardized to `state | distance` and ensured strict passing to zone calculation service.
    *   **Impact:** Accurate zone B pricing.

4.  **Rate Card Selection**
    *   **Issue:** Could pick deleted/inactive cards; ignored filters.
    *   **Fix:** Added strict filters for `isDeleted`, date validity, `shipmentType` (forward/reverse), and `rateCardCategory`.
    *   **Impact:** Reliable card selection.

5.  **Pricing Model Refactor**
    *   **Issue:** 3 conflicting models causing debugging nightmares.
    *   **Fix:** Introduced unified `zonePricing`.
    *   **Impact:** 100% deterministic pricing.

### 13.2 For Complete Details
For technical deep-dives into these fixes, refer to:
*   [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Detailed fix explanations
*   [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) - Technical design
*   [COMPLETE_REFACTOR_SUMMARY.md](./COMPLETE_REFACTOR_SUMMARY.md) - High-level overview

---

**© 2026 ShipCrowd Logistics Platform. Confidential & Proprietary.**
