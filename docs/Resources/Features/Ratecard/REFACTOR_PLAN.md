# RateCard Pricing Model Refactor Plan

> Note (2026-02-08): Legacy pricing fields (baseRates, weightRules, zoneRules, zoneMultipliers) and migration scripts have been removed. Zone Pricing is now the only supported model.

## Current State Issues

### Problem 1: Dual Pricing Models
- **zoneMultipliers** (scalar: A=1.0, B=1.2, C=1.4) - Generic scaling
- **zoneRules** (additive: zoneId → +₹X) - Specific zone rates
- These conflict and cause confusion

### Problem 2: Schema Complexity
```typescript
baseRates[] {
  carrier, serviceType, basePrice, minWeight, maxWeight
}
weightRules[] {
  minWeight, maxWeight, pricePerKg, carrier, serviceType
}
zoneRules[] {
  zoneId, carrier, serviceType, additionalPrice
}
zoneMultipliers: Map<zone, number>
```

**Current calculation:**
1. Find base rate for weight slab
2. Apply zone multiplier OR zone rule (inconsistent)
3. Add weight charge if over max
4. Add COD, fuel, remote charges

---

## BlueShip's Proven Model

### Schema (Zone Pricing)
```typescript
RateCard {
  // Per-zone base pricing for first X kg
  zonePricing: {
    zoneA: { baseWeight: 0.5, basePrice: 30 },
    zoneB: { baseWeight: 0.5, basePrice: 40 },
    zoneC: { baseWeight: 0.5, basePrice: 50 },
    zoneD: { baseWeight: 0.5, basePrice: 60 },
    zoneE: { baseWeight: 0.5, basePrice: 80 }
  },

  // Additional weight pricing per zone
  additionalWeightPricing: {
    zoneA: 15, // per kg after baseWeight
    zoneB: 20,
    zoneC: 25,
    zoneD: 30,
    zoneE: 40
  },

  // Surcharges
  codPercentage: 2.0,
  codMinimumCharge: 30,
  fuelSurcharge: 10,
  minimumFare: 40,
  gst: 18
}
```

### Calculation (Simple & Deterministic)
```typescript
// Step 1: Get zone (e.g., zoneB)
zone = getZone(fromPin, toPin)

// Step 2: Base charge for first 0.5kg
baseCharge = rateCard.zonePricing[zone].basePrice

// Step 3: Additional weight charge
if (weight > 0.5) {
  additionalKg = weight - 0.5
  weightCharge = additionalKg * rateCard.additionalWeightPricing[zone]
}

// Step 4: Freight = base + weight
freight = baseCharge + weightCharge

// Step 5: Add surcharges
cod = max(orderValue * codPercentage, codMinimumCharge)
fuel = freight * fuelSurcharge / 100
subtotal = freight + cod + fuel

// Step 6: Apply minimum fare
if (subtotal < minimumFare) subtotal = minimumFare

// Step 7: GST
gst = subtotal * 0.18
total = subtotal + gst
```

---

## Proposed shipCrowd Schema (Hybrid Approach)

### Option A: Pure BlueShip Model (RECOMMENDED)
```typescript
interface IRateCard {
  // Basic
  name: string;
  companyId: ObjectId;
  carrier?: string;
  serviceType?: string;
  shipmentType: 'forward' | 'reverse';
  rateCardCategory?: string;

  // Zone Pricing (per-zone base + incremental)
  zonePricing: {
    zoneA: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    zoneB: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    zoneC: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    zoneD: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
    zoneE: { baseWeight: number; basePrice: number; additionalPricePerKg: number };
  };

  // Surcharges
  codPercentage: number;
  codMinimumCharge: number;
  fuelSurcharge: number;
  fuelSurchargeBase: 'freight' | 'freight_cod';
  remoteAreaEnabled: boolean;
  remoteAreaSurcharge: number;
  minimumFare: number;
  minimumFareCalculatedOn: 'freight' | 'freight_overhead';
  gst: number;

  // Advanced (keep from shipCrowd)
  effectiveDates: { startDate: Date; endDate?: Date };
  status: 'draft' | 'active' | 'inactive' | 'expired';
  versionNumber: number;
  parentVersionId?: ObjectId;
  priority: number;
  isSpecialPromotion: boolean;
  isLocked: boolean;
  isDeleted: boolean;

  // Customer Overrides
  customerOverrides: Array<{
    customerId?: ObjectId;
    customerGroup?: string;
    discountPercentage?: number;
    flatDiscount?: number;
  }>;
}
```

### Backward Compatibility Strategy
1. **Keep old fields** (`baseRates`, `weightRules`, `zoneMultipliers`) as deprecated
2. **Add migration script** to convert old cards to new `zonePricing` structure
3. **Pricing service** reads `zonePricing` first, falls back to old model
4. **UI** only creates/edits new model

---

## Migration Steps

### Phase 1: Add New Schema Fields (Non-Breaking)
- [x] Add `zonePricing` field to schema
- [x] Mark `baseRates`, `weightRules`, `zoneMultipliers`, `zoneRules` as deprecated
- [x] Update TypeScript interfaces

### Phase 2: Update Pricing Service
- [x] Add `calculatePricingSimplified()` method using new model
- [x] Update `calculatePricing()` to use new model if available
- [x] Keep fallback to old model for existing cards

### Phase 3: Update UI
- [x] Update RateCard wizard to use new model
- [x] Show zone pricing zone pricing inputs (5 zones × 3 fields)
- [x] Hide advanced base rates/weight rules by default

### Phase 4: Data Migration
- [x] Create migration script to convert all existing cards
- [x] Validate converted cards against old pricing
- [x] Run migration on staging
- [x] Run migration on production

### Phase 5: Deprecation
- [ ] Remove old pricing logic (6 months after migration)
- [ ] Remove deprecated schema fields

---

## Benefits of This Approach

### ✅ Simplicity
- **1 pricing model** instead of 3 conflicting ones
- **Direct zone mapping** (no multipliers vs rules confusion)
- **Easy to understand** for admins and developers

### ✅ Reliability
- **Battle-tested** in BlueShip production
- **Deterministic** (same inputs → same output every time)
- **Fewer edge cases** (no slab overlaps, no carrier fallbacks)

### ✅ Performance
- **Faster calculation** (no complex waterfall logic)
- **Simpler caching** (zone → price, no carrier matching)

### ✅ Maintainability
- **Single source of truth** for pricing
- **Easier testing** (fewer combinations)
- **Better debugging** (clear pricing breakdown)

---

## Next Steps

1. **Implement new schema** ✓ (this PR)
2. **Update pricing service** ✓ (this PR)
3. **Update UI wizard** (next PR)
4. **Write migration script** (next PR)
5. **Test on staging** (before production)
6. **Deploy to production** (with rollback plan)
