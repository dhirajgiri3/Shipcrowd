# Complete End-to-End Rate Card System Implementation Plan

## Executive Summary

**Goal:** Implement a 100% complete, production-ready rate card management system matching BlueShip's functionality with ShipCrowd's superior architecture.

**Current Status:** 60% Complete
- ✅ Backend models, APIs, calculation engine exist
- ❌ Not integrated into shipment pricing flow
- ❌ Frontend uses mock data instead of real APIs
- ❌ No rate card assignment workflow
- ❌ Zone lookup not utilized during pricing

**Estimated Effort:** 2-3 weeks for complete implementation

---

## Critical Findings from Analysis

### What BlueShip Does Right (Production-Proven)
1. **5-Tier Universal Zone System** (A, B, C, D, E) - simple, predictable
2. **Zone-Specific Pricing** - each zone has different rates per weight slab
3. **Dual Rate Card Model** - "default" (shared) vs "custom" (seller-specific)
4. **Progressive Weight Slabs** - base weight + additional per-unit pricing
5. **Automatic Zone Calculation** - based on city, state, distance, metro classification
6. **Rate Card Assignment Flow** - admins assign rate cards to sellers with tracking
7. **COD Overhead Charges** - percentage-based with minimum threshold
8. **Rate Calculator UI** - sellers can preview rates before shipping

### What ShipCrowd Does Better (Architecture)
1. **Database-Driven Zones** - flexible, company-specific (vs BlueShip's hardcoded)
2. **In-Memory Pincode Cache** - O(1) lookup (vs BlueShip's CSV parsing per request)
3. **Redis Pricing Cache** - 85% faster repeated lookups
4. **Versioning System** - audit trail for rate card changes
5. **Customer Overrides** - granular discount rules
6. **Zone Multipliers** - dynamic rate adjustments
7. **Geospatial Support** - 2dsphere indexes for precise zone boundaries
8. **Pincode Overlap Detection** - prevents data integrity issues

### Critical Gaps Identified
1. ❌ **Shipment creation doesn't calculate pricing** - `shipment.controller.ts:94` calls `ShipmentService.createShipment()` without rate lookup
2. ❌ **Frontend rate calculator is fake** - `RatesClient.tsx:33` says "Mock calculation (replace with API call when ready)"
3. ❌ **No rate card assignment** - `company.controller.ts:42` schema doesn't include `settings.defaultRateCardId`
4. ❌ **DynamicPricingService never used** - comprehensive service exists but not instantiated
5. ❌ **No zone lookup during shipment** - zones exist in DB but never queried during pricing
6. ❌ **No pricing stored in shipments** - missing audit trail of how price was calculated

---

## Implementation Architecture

### Phase 0: Foundation Setup (Day 1-2) - PREREQUISITE

#### 0.1 Courier Management System
**Priority:** CRITICAL - Required before rate card creation

**Files to Create:**
- `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/courier.model.ts`
- `server/src/presentation/http/controllers/shipping/courier.controller.ts`
- `server/src/infrastructure/database/seeders/seeders/22-couriers.seeder.ts`
- `client/src/hooks/api/logistics/use-couriers.ts`

**Implementation Steps:**

1. **Create Courier Model** with schema validation:
   - Unique `code` index (e.g., "delhivery", "dtdc")
   - Array of services with `isActive` flag
   - Optional API config (encrypted credentials)
   - Soft delete support

2. **Create Courier Controller** with CRUD endpoints:
   - GET `/api/v1/couriers` - List active couriers (public)
   - POST `/api/v1/couriers` - Create courier (admin only)
   - PATCH `/api/v1/couriers/:id` - Update courier
   - GET `/api/v1/couriers/:id/services` - Get services for courier

3. **Seed Initial Couriers:**
   ```typescript
   [
     { name: "Delhivery", code: "delhivery", services: ["Surface", "Air", "Express"] },
     { name: "Xpressbees", code: "xpressbees", services: ["Surface", "Air"] },
     { name: "DTDC", code: "dtdc", services: ["Surface", "Air", "Express", "Ground"] },
     { name: "Bluedart", code: "bluedart", services: ["Express", "Dart Apex"] },
     { name: "Ecom Express", code: "ecom-express", services: ["Standard", "Express"] }
   ]
   ```

4. **Update Frontend:**
   - Replace hardcoded courier list in `CreateRatecardClient.tsx`
   - Use `useCouriers()` hook to fetch from API
   - Show loading state while fetching

**Verification:**
- GET `/api/v1/couriers` returns 5 seeded couriers
- Create rate card dropdown populated from DB
- Add new courier via API → appears in dropdown

---

#### 0.2 Default Zone Seeding (Hybrid System)
**Priority:** CRITICAL - Required before rate card assignment

**Files to Modify:**
- `server/src/infrastructure/database/seeders/seeders/23-rate-card-and-zones.seeder.ts`
- `server/src/core/application/services/organization/company-onboarding.service.ts` (NEW)

**Implementation Steps:**

1. **Create Standard Zones Template:**
   - Zone A - Metro (Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad)
   - Zone B - Tier 1 Cities (State capitals + top 50 cities)
   - Zone C - Tier 2 Cities (District headquarters)
   - Zone D - Rest of India
   - Zone E - Special (J&K + Northeast states)

2. **Company Onboarding Service:**
   ```typescript
   class CompanyOnboardingService {
     async createDefaultZones(companyId: string): Promise<void> {
       // Clone 5 standard zones for this company
       // Assign realistic postal codes from Pincode collection
     }

     async createDefaultRateCard(companyId: string): Promise<IRateCard> {
       // Create "Standard Rates" template
       // Includes basic pricing for all couriers × all zones
       // Base rates: Zone A ₹40, B ₹60, C ₹90, D ₹150, E ₹200
     }
   }
   ```

3. **Trigger on Company Creation:**
   - After `company.save()` in `company.controller.ts:107`
   - Call `CompanyOnboardingService.createDefaultZones(companyId)`
   - Call `CompanyOnboardingService.createDefaultRateCard(companyId)`
   - Auto-assign default rate card to company

**Verification:**
- Create new company → 5 zones auto-created
- "Standard Rates" rate card auto-created and assigned
- Company can create shipment immediately (pricing works)

---

### Phase 1: Backend Integration (Week 1) - CRITICAL PATH

#### 1.1 Company Rate Card Assignment
**Files to Modify:**
- `server/src/presentation/http/controllers/organization/company.controller.ts` (lines 42-43)
- `server/src/infrastructure/database/mongoose/models/organization/core/company.model.ts`

**Changes:**
1. Update `updateCompanySchema` to include:
   ```typescript
   settings: z.object({
     defaultRateCardId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
     rateCardType: z.enum(['default', 'custom']).default('default'),
     rateCardAssignedAt: z.date().optional()
   }).optional()
   ```

2. Validation in `updateCompany`:
   - Check if `defaultRateCardId` exists and belongs to company
   - Verify rate card is in 'active' status
   - Create audit log entry

3. Add new endpoint: `POST /api/v1/companies/:companyId/assign-ratecard`
   - Body: `{ rateCardId: string }`
   - Updates `company.settings.defaultRateCardId`
   - Returns updated company

**Verification:** Can assign rate card via API, persists in DB, returns in company GET

---

#### 1.2 Shipment Pricing Integration
**Files to Modify:**
- `server/src/presentation/http/controllers/shipping/shipment.controller.ts` (lines 27-122)
- `server/src/core/application/services/shipping/shipment.service.ts`
- `server/src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model.ts`

**Changes:**

**Step 1: Update Shipment Model**
Add new embedded document for pricing breakdown:
```typescript
pricingDetails?: {
  rateCardId: mongoose.Types.ObjectId;
  rateCardName: string;
  baseRate: number;
  weightCharge: number;
  zoneCharge: number;
  zone: string; // e.g., "zoneB"
  customerDiscount: number;
  subtotal: number;
  codCharge: number;
  gstAmount: number;
  totalPrice: number;
  calculatedAt: Date;
  calculationMethod: 'ratecard' | 'fallback' | 'override';
}
```

**Step 2: Create Pricing Orchestrator Service**
New file: `server/src/core/application/services/pricing/pricing-orchestrator.service.ts`

```typescript
class PricingOrchestratorService {
  async calculateShipmentPricing(input: {
    companyId: string;
    fromPincode: string;
    toPincode: string;
    weight: number;
    dimensions: { length: number; width: number; height: number };
    paymentMode: 'prepaid' | 'cod';
    orderValue: number;
    carrier?: string;
    serviceType?: string;
    customerId?: string;
  }): Promise<PricingBreakdown> {
    // 1. Get company's default rate card
    const company = await Company.findById(companyId);
    if (!company?.settings?.defaultRateCardId) {
      throw new Error('No rate card assigned to company');
    }

    // 2. Get rate card
    const rateCard = await RateCard.findById(company.settings.defaultRateCardId);
    if (!rateCard || rateCard.status !== 'active') {
      throw new Error('Rate card not found or inactive');
    }

    // 3. Determine zone (with caching)
    const zone = await this.getZoneWithCache(fromPincode, toPincode);

    // 4. Calculate pricing using DynamicPricingService
    const pricing = await DynamicPricingService.calculatePricing({
      rateCardId: rateCard._id,
      zone,
      weight,
      dimensions,
      paymentMode,
      orderValue,
      carrier,
      serviceType,
      customerId
    });

    // 5. Return breakdown
    return {
      rateCardId: rateCard._id,
      rateCardName: rateCard.name,
      zone,
      ...pricing
    };
  }

  private async getZoneWithCache(from: string, to: string): Promise<string> {
    // Check Redis cache first
    const cacheKey = `zone:${from}:${to}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    // Calculate zone using PincodeLookupService
    const zoneInfo = PincodeLookupService.getInstance().getZoneFromPincodes(from, to);

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, zoneInfo.zone);

    return zoneInfo.zone;
  }
}
```

**Step 3: Integrate into Shipment Controller**
Modify `createShipment` (line 94):

```typescript
// After warehouse validation (line 91), BEFORE ShipmentService.createShipment (line 94)

// Calculate pricing
const fromPincode = warehouse.address.postalCode;
const toPincode = order.customerInfo.address.postalCode;

const pricingDetails = await PricingOrchestratorService.calculateShipmentPricing({
  companyId: auth.companyId,
  fromPincode,
  toPincode,
  weight: validation.data.packageDetails.weight,
  dimensions: validation.data.packageDetails.dimensions,
  paymentMode: order.paymentDetails.paymentMode,
  orderValue: order.totals.grandTotal,
  carrier: validation.data.carrier,
  serviceType: validation.data.serviceType,
  customerId: order.customerId
});

// Pass pricing to ShipmentService
const result = await ShipmentService.createShipment({
  order,
  companyId: new mongoose.Types.ObjectId(auth.companyId),
  userId: auth.userId,
  payload: validation.data,
  pricingDetails // NEW
});
```

**Verification:**
- Create shipment → triggers pricing calculation
- Shipment document includes `pricingDetails` with breakdown
- Pricing matches manual calculation
- Fallback to env variable if no rate card

---

#### 1.3 Zone Lookup Optimization
**Files to Modify:**
- `server/src/core/application/services/logistics/pincode-lookup.service.ts`

**Changes:**
1. Ensure singleton is loaded at server startup
2. Add method: `getZoneDetails(from: string, to: string)` that returns:
   ```typescript
   {
     zone: 'zoneA' | 'zoneB' | 'zoneC' | 'zoneD' | 'zoneE';
     fromCity: string;
     toCity: string;
     fromState: string;
     toState: string;
     isMetroToMetro: boolean;
     isSpecialZone: boolean; // J&K/NE
     distance?: number; // if calculated
   }
   ```

3. Cache results in Redis with 1-hour TTL
4. Add telemetry logging for cache hit rate

**Verification:**
- Load test with 1000 zone lookups: <10ms average (with cache)
- Cache hit rate >85%
- Correct zone returned for all test cases (same city = A, same state = B, etc.)

---

#### 1.4 Dynamic Pricing Service Integration
**Files to Modify:**
- `server/src/core/application/services/pricing/dynamic-pricing.service.ts`

**Changes:**
1. Instantiate service in `PricingOrchestratorService`
2. Update `calculatePricing` to accept zone as input (instead of calculating internally)
3. Add detailed breakdown return:
   ```typescript
   {
     baseRate: number;
     weightCharge: number;
     zoneCharge: number;
     customerDiscount: number;
     subtotal: number;
     codCharge: number;
     cgst: number;
     sgst: number;
     igst: number;
     totalPrice: number;
     metadata: {
       appliedRules: string[];
       zoneMultiplier: number;
       effectiveWeight: number;
     }
   }
   ```

**Verification:**
- Manual calculation matches service output
- Customer override discounts applied correctly
- GST split (CGST/SGST vs IGST) based on state matching

---

### Phase 2: Frontend Integration (Week 1-2)

#### 2.1 Rate Calculator API Connection
**Files to Modify:**
- `client/app/seller/rates/components/RatesClient.tsx` (lines 27-51)
- `client/src/hooks/api/logistics/use-rate-calculation.ts` (NEW)

**Changes:**

**Step 1: Create React Hook**
New file: `client/src/hooks/api/logistics/use-rate-calculation.ts`

```typescript
export const useRateCalculation = () => {
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      originPincode: string;
      destinationPincode: string;
      weight: number;
      dimensions?: { length: number; width: number; height: number };
      paymentMode: 'prepaid' | 'cod';
      orderValue?: number;
    }) => {
      const response = await fetch('/api/v1/ratecards/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to calculate rates');
      }

      return response.json();
    },
    onError: (error) => {
      addToast(error.message, 'error');
    }
  });
};
```

**Step 2: Update RatesClient Component**
Replace lines 29-51 (mock calculation) with:

```typescript
const { mutate: calculateRates, isPending } = useRateCalculation();

const handleCalculate = () => {
  if (!formData.originPincode || !formData.destinationPincode || !formData.weight) {
    addToast('Please fill in required fields', 'error');
    return;
  }

  // Validate pincodes
  if (!/^\d{6}$/.test(formData.originPincode) || !/^\d{6}$/.test(formData.destinationPincode)) {
    addToast('Invalid pincode format (6 digits required)', 'error');
    return;
  }

  calculateRates({
    originPincode: formData.originPincode,
    destinationPincode: formData.destinationPincode,
    weight: parseFloat(formData.weight),
    dimensions: formData.length && formData.width && formData.height ? {
      length: parseFloat(formData.length),
      width: parseFloat(formData.width),
      height: parseFloat(formData.height)
    } : undefined,
    paymentMode: formData.paymentMode as 'prepaid' | 'cod',
    orderValue: formData.paymentMode === 'cod' ? 1000 : undefined // TODO: Add order value input
  }, {
    onSuccess: (data) => {
      setCalculatedRates(data.rates);
      setShowResults(true);
      addToast('Rates calculated successfully!', 'success');
    }
  });
};
```

**Verification:**
- Fill rate calculator form → API called with correct payload
- Results display real rates from backend
- Loading state shows during API call
- Error handling displays meaningful messages

---

#### 2.2 Create Rate Card Form Integration
**Files to Modify:**
- `client/app/admin/ratecards/create/components/CreateRatecardClient.tsx` (lines 101-104)
- `client/src/hooks/api/logistics/use-ratecards.ts` (UPDATE)

**Changes:**

**Step 1: Add Create Mutation to Hook**
Update `client/src/hooks/api/logistics/use-ratecards.ts`:

```typescript
export const useCreateRateCard = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateRateCardInput) => {
      const response = await fetch('/api/v1/ratecards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create rate card');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratecards'] });
      addToast('Rate card created successfully!', 'success');
    },
    onError: (error) => {
      addToast(error.message, 'error');
    }
  });
};
```

**Step 2: Update CreateRatecardClient**
Replace line 101-104 (fake toast) with:

```typescript
const { mutate: createRateCard, isPending } = useCreateRateCard();
const router = useRouter();

const handleSubmit = () => {
  // Validate required fields
  if (!formData.courierProviderId || !formData.courierServiceId || !formData.rateCardCategory) {
    addToast('Please fill all required fields', 'error');
    return;
  }

  // Validate zone prices
  if (!formData.basicZoneA || !formData.basicZoneB) {
    addToast('Please set at least Zone A and Zone B prices', 'error');
    return;
  }

  // Transform form data to API format
  const payload = {
    name: `${formData.courierProviderId}-${formData.courierServiceId}-${formData.rateCardCategory}`,
    baseRates: [{
      carrier: formData.courierProviderId,
      serviceType: formData.courierServiceId,
      basePrice: parseFloat(formData.basicZoneA) || 0,
      minWeight: 0,
      maxWeight: parseFloat(formData.basicWeight) / 1000 // Convert g to kg
    }],
    weightRules: [{
      minWeight: parseFloat(formData.basicWeight) / 1000,
      maxWeight: 100, // TODO: Make configurable
      pricePerKg: parseFloat(formData.additionalZoneA) / (parseFloat(formData.additionalWeight) / 1000),
      carrier: formData.courierProviderId,
      serviceType: formData.courierServiceId
    }],
    zoneRules: [
      { zoneId: 'zoneA', carrier: formData.courierProviderId, serviceType: formData.courierServiceId, additionalPrice: parseFloat(formData.basicZoneA) || 0 },
      { zoneId: 'zoneB', carrier: formData.courierProviderId, serviceType: formData.courierServiceId, additionalPrice: parseFloat(formData.basicZoneB) || 0 },
      { zoneId: 'zoneC', carrier: formData.courierProviderId, serviceType: formData.courierServiceId, additionalPrice: parseFloat(formData.basicZoneC) || 0 },
      { zoneId: 'zoneD', carrier: formData.courierProviderId, serviceType: formData.courierServiceId, additionalPrice: parseFloat(formData.basicZoneD) || 0 },
      { zoneId: 'zoneE', carrier: formData.courierProviderId, serviceType: formData.courierServiceId, additionalPrice: parseFloat(formData.basicZoneE) || 0 },
    ].filter(z => z.additionalPrice > 0),
    status: formData.status,
    effectiveDates: {
      startDate: new Date()
    }
  };

  createRateCard(payload, {
    onSuccess: () => {
      router.push('/admin/ratecards');
    }
  });
};

// Update button
<Button onClick={handleSubmit} disabled={isPending}>
  <Save className="h-4 w-4 mr-2" />
  {isPending ? 'Saving...' : 'Save Rate Card'}
</Button>
```

**Verification:**
- Fill create form → submits to backend
- Rate card appears in list view
- Form validation catches empty fields
- Success redirects to list page

---

#### 2.3 Rate Card Assignment UI
**Files to Create:**
- `client/app/admin/companies/[companyId]/settings/components/RateCardSettings.tsx` (NEW)

**Changes:**

**Step 1: Create Component**
New file with:
- Dropdown to select rate card (fetch from `useRateCards()`)
- Display current assigned rate card (if any)
- "Save" button to call `POST /api/v1/companies/:companyId/assign-ratecard`
- Show assignment timestamp and who assigned

**Step 2: Add to Company Settings Page**
Integrate into existing company settings route

**Verification:**
- Dropdown shows all active rate cards
- Assign button updates company
- Refresh page shows assigned rate card
- Audit log created

---

### Phase 3: Zone Management (Week 2)

#### 3.1 Pincode Master Seeding
**Files to Modify:**
- `server/src/infrastructure/database/seeders/seeders/24-pincode-master.seeder.ts` (NEW)

**Changes:**
1. Load BlueShip's `pincodes.csv` (154,798 rows)
2. Transform to ShipCrowd's Pincode model schema
3. Bulk insert with batch size 1000
4. Add indexes after seeding
5. Load into `PincodeLookupService` memory cache

**Script:**
```typescript
async up() {
  const csvPath = path.join(__dirname, '../../../data/pincodes.csv');
  const pincodes = await csv().fromFile(csvPath);

  const batches = chunk(pincodes, 1000);
  for (const batch of batches) {
    await Pincode.insertMany(batch.map(row => ({
      pincode: row.pincode,
      postOffice: row.city, // Map to available field
      district: row.city,
      state: row.state,
      city: row.city,
      region: mapStateToRegion(row.state),
      isActive: true,
      serviceability: {} // Populate via carrier APIs later
    })));
  }

  // Load into memory cache
  await PincodeLookupService.getInstance().loadPincodesFromCSV();
}
```

**Verification:**
- 154,798 pincodes loaded
- Query time: <1ms (indexed)
- Memory cache loaded: O(1) lookup
- No duplicates

---

#### 3.2 Zone Seeding with Realistic Postal Codes
**Files to Modify:**
- `server/src/infrastructure/database/seeders/seeders/23-rate-card-and-zones.seeder.ts`

**Changes:**
1. Update zone seeding to use REAL postal codes from Pincode collection
2. Zone A (Metro): Mumbai (400xxx), Delhi (110xxx), Bangalore (560xxx), Hyderabad (500xxx)
3. Zone B (Tier 1): All state capitals + major cities
4. Zone C (Tier 2): All district headquarters
5. Zone D (Rest): All other serviceable pincodes
6. Zone E (Special): J&K (19xxxx), NE states (7xxxxx)

**Verification:**
- All zones have >100 postal codes
- No pincode overlap across zones
- Zone lookup returns correct zone for test pincodes

---

#### 3.3 Zone Management UI Enhancement
**Files to Modify:**
- `client/app/admin/zones/components/ZonesClient.tsx`
- `client/app/admin/zones/create/components/CreateZoneClient.tsx` (NEW)

**Changes:**
1. Add "Bulk Import" button to upload CSV with pincodes
2. Visual preview of pincode ranges (e.g., "400001-400099")
3. Map view showing zone coverage (optional - Phase 4)
4. Overlap detection warning before save
5. Export zone to CSV

**Verification:**
- Bulk import 1000 pincodes → success
- Overlap detection prevents duplicate pincode
- Export → download CSV with zone details

---

### Phase 4: Advanced Features (Week 2-3)

#### 4.1 Multi-Courier Rate Comparison
**Files to Create:**
- `server/src/core/application/services/pricing/multi-carrier-pricing.service.ts` (NEW)

**Changes:**
1. Service that fetches ALL active rate cards for company
2. Calculates pricing for EACH carrier + service type combo
3. Sorts by price (ascending)
4. Returns top 5 with breakdown
5. Includes ETA estimates from zone transit times

**API Endpoint:**
- `POST /api/v1/ratecards/compare`
- Body: `{ fromPincode, toPincode, weight, dimensions, paymentMode, orderValue }`
- Returns: Array of `{ carrier, serviceType, price, breakdown, eta, recommended: boolean }`

**Verification:**
- Returns 5 carriers sorted by price
- Price matches individual calculation
- ETA matches zone transit times
- "Recommended" flag on best value (price/eta ratio)

---

#### 4.2 Rate Card Versioning UI
**Files to Create:**
- `client/app/admin/ratecards/[id]/history/components/RateCardHistory.tsx` (NEW)

**Changes:**
1. Display list of all versions for a rate card
2. Show diff between versions (changed prices highlighted)
3. "Rollback" button to restore previous version
4. Timeline view with user who made change + timestamp

**Verification:**
- Edit rate card → new version created
- History shows all versions
- Rollback restores previous prices
- Audit log tracks rollback action

---

#### 4.3 Rate Card Templates
**Files to Modify:**
- `server/src/presentation/http/controllers/shipping/ratecard.controller.ts`
- `client/app/admin/ratecards/components/RatecardsClient.tsx`

**Changes:**
1. Add "Duplicate" button on rate card list
2. API endpoint: `POST /api/v1/ratecards/:id/clone`
3. Creates new rate card with "(Copy)" suffix
4. Status defaults to "draft"
5. Allows bulk creation of similar rate cards

**Verification:**
- Clone rate card → new draft created
- Edit clone → original unchanged
- Activate clone → both can be active

---

#### 4.4 Bulk Operations
**Files to Create:**
- `server/src/presentation/http/controllers/shipping/ratecard-bulk.controller.ts` (NEW)
- `client/app/admin/ratecards/bulk-import/components/BulkImportClient.tsx` (NEW)

**Changes:**
1. **Export:** Download all rate cards as CSV
2. **Import:** Upload CSV to create/update rate cards
3. **Bulk Edit:** Select multiple rate cards → apply percentage increase/decrease
4. **Bulk Activate/Deactivate:** Change status of multiple cards

**CSV Format:**
```
carrier,serviceType,category,basicWeight,basicZoneA,basicZoneB,basicZoneC,basicZoneD,basicZoneE,additionalWeight,additionalZoneA,additionalZoneB,...
```

**Verification:**
- Export → CSV with all rate cards
- Import → creates new rate cards
- Bulk edit 10% increase → all prices updated
- Validation errors displayed for invalid rows

---

### Phase 5: Analytics & Monitoring (Week 3)

#### 5.1 Rate Card Usage Analytics
**Files to Create:**
- `server/src/core/application/services/analytics/rate-card-analytics.service.ts` (NEW)
- `client/app/admin/ratecards/[id]/analytics/components/RateCardAnalytics.tsx` (NEW)

**Changes:**
1. Track every time a rate card is used in shipment creation
2. Store aggregated stats:
   - Total shipments using this rate card
   - Total revenue generated
   - Average shipment cost
   - Most used carrier/service combo
   - Zone distribution (% in each zone)
   - Top customers using this rate card

**Dashboard Widgets:**
- Line chart: Revenue over time
- Pie chart: Zone distribution
- Table: Top 10 customers by volume
- Stat cards: Avg cost, total shipments, total revenue

**Verification:**
- Create 100 test shipments → analytics updated
- Charts display correct data
- Date range filter works
- Export analytics to PDF

---

#### 5.2 Pricing Cache Monitoring
**Files to Modify:**
- `server/src/core/application/services/pricing/pricing-cache.service.ts`

**Changes:**
1. Add telemetry dashboard endpoint: `GET /api/v1/pricing/cache/stats`
2. Returns:
   - Cache hit rate (%)
   - Average lookup time (ms)
   - Cache size (MB)
   - Eviction rate
   - Top 10 most cached zones

**Admin UI:**
- Display cache stats in admin dashboard
- "Clear Cache" button (invalidates all pricing caches)
- Chart showing cache performance over 24 hours

**Verification:**
- Dashboard shows >85% hit rate
- Clear cache → hit rate drops then recovers
- Stats updated every 5 minutes

---

#### 5.3 Rate Card Comparison Report
**Files to Create:**
- `server/src/core/application/services/reporting/rate-card-comparison.service.ts` (NEW)
- `client/app/admin/ratecards/compare/components/CompareRateCards.tsx` (NEW)

**Changes:**
1. Select 2-5 rate cards to compare side-by-side
2. Generate table showing:
   - Base rates by carrier
   - Zone prices (A-E)
   - Weight slab pricing
   - Customer override rules
   - Effective date ranges

3. Highlight differences (color-coded)
4. Export comparison to PDF

**Verification:**
- Select 3 rate cards → comparison table generated
- Differences highlighted in yellow
- Export PDF → formatted correctly

---

## Hybrid Zone System Architecture (KEY DESIGN DECISION)

Based on user selection of "Hybrid: Default 5-zone + Custom zones", here's the implementation strategy:

### Zone Model Schema Update
**File:** `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/zone.model.ts`

Add new field:
```typescript
interface IZone extends Document {
  // ... existing fields ...
  zoneType: 'standard' | 'custom';  // NEW: Track if zone is default or custom
  standardZoneCode?: 'zoneA' | 'zoneB' | 'zoneC' | 'zoneD' | 'zoneE';  // NEW: For standard zones
}
```

### Zone Lookup Logic (Updated)
**File:** `server/src/core/application/services/logistics/pincode-lookup.service.ts`

```typescript
async getZoneForCompany(companyId: string, fromPincode: string, toPincode: string): Promise<string> {
  // Step 1: Check if company has custom zones for these pincodes
  const customZone = await Zone.findOne({
    companyId,
    zoneType: 'custom',
    postalCodes: { $in: [fromPincode, toPincode] },
    isDeleted: false
  });

  if (customZone) {
    return customZone.name; // Use custom zone
  }

  // Step 2: Fall back to standard zone calculation (BlueShip logic)
  const standardZone = this.getZoneFromPincodes(fromPincode, toPincode);

  // Step 3: Get company's standard zone document (for transit times, etc.)
  const zoneDoc = await Zone.findOne({
    companyId,
    zoneType: 'standard',
    standardZoneCode: standardZone.zone,
    isDeleted: false
  });

  return zoneDoc ? zoneDoc._id.toString() : standardZone.zone;
}
```

### Rate Card Zone Rules (Updated)
**File:** `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model.ts`

Update `zoneRules` to support both:
```typescript
zoneRules: Array<{
  zoneId: ObjectId;                 // References Zone._id (for custom zones)
  zoneCode?: string;                // OR standard zone code (zoneA, zoneB, etc.)
  carrier: string;
  serviceType: string;
  additionalPrice: number;
  transitDays?: number;
}>;
```

### Default Zone Creation (5 Standard Zones)
**File:** `server/src/core/application/services/organization/company-onboarding.service.ts`

```typescript
async createDefaultZones(companyId: string): Promise<IZone[]> {
  const standardZones = [
    {
      name: 'Zone A - Metro',
      companyId,
      zoneType: 'standard',
      standardZoneCode: 'zoneA',
      postalCodes: [], // Dynamically calculated, not stored
      serviceability: { carriers: ['all'], serviceTypes: ['all'] },
      transitTimes: [{ carrier: 'all', serviceType: 'all', minDays: 1, maxDays: 2 }]
    },
    {
      name: 'Zone B - Tier 1',
      companyId,
      zoneType: 'standard',
      standardZoneCode: 'zoneB',
      postalCodes: [],
      transitTimes: [{ carrier: 'all', serviceType: 'all', minDays: 2, maxDays: 3 }]
    },
    {
      name: 'Zone C - Tier 2',
      companyId,
      zoneType: 'standard',
      standardZoneCode: 'zoneC',
      postalCodes: [],
      transitTimes: [{ carrier: 'all', serviceType: 'all', minDays: 3, maxDays: 5 }]
    },
    {
      name: 'Zone D - Rest of India',
      companyId,
      zoneType: 'standard',
      standardZoneCode: 'zoneD',
      postalCodes: [],
      transitTimes: [{ carrier: 'all', serviceType: 'all', minDays: 5, maxDays: 7 }]
    },
    {
      name: 'Zone E - Special (J&K/NE)',
      companyId,
      zoneType: 'standard',
      standardZoneCode: 'zoneE',
      postalCodes: [],
      transitTimes: [{ carrier: 'all', serviceType: 'all', minDays: 7, maxDays: 10 }]
    }
  ];

  return await Zone.insertMany(standardZones);
}
```

### Benefits of Hybrid Approach
1. ✅ **Simplicity for 90% of companies:** Standard 5-zone system works out-of-box
2. ✅ **Flexibility for advanced users:** Can add custom zones (e.g., "Express Metro", "ODA Regions")
3. ✅ **No pincode overlap issues:** Standard zones calculated dynamically, custom zones validated
4. ✅ **Backward compatibility:** Matches BlueShip's zone logic by default
5. ✅ **Easy migration:** Existing rate cards can use `zoneCode` instead of `zoneId`

### UI Impact
**Admin Zone Management:**
- Tab 1: "Standard Zones" (view-only, shows zoneA-E with logic explanation)
- Tab 2: "Custom Zones" (create/edit/delete, pincode assignment)

**Rate Card Creation:**
- Zone dropdown shows: "Zone A - Metro (Standard)", "Zone B - Tier 1 (Standard)", ... + any custom zones

---

## Critical File Reference

### Backend Files to Modify/Create

**Phase 0 (Foundation):**
1. 🆕 `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/courier.model.ts` - NEW courier model
2. 🆕 `server/src/presentation/http/controllers/shipping/courier.controller.ts` - NEW courier CRUD
3. 🆕 `server/src/infrastructure/database/seeders/seeders/22-couriers.seeder.ts` - NEW seeder for 5 couriers
4. ✏️ `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/zone.model.ts` - Add zoneType + standardZoneCode
5. 🆕 `server/src/core/application/services/organization/company-onboarding.service.ts` - NEW onboarding automation
6. ✏️ `server/src/presentation/http/controllers/organization/company.controller.ts:107` - Hook onboarding service

**Phase 1 (Backend Integration):**
7. ✏️ `server/src/presentation/http/controllers/organization/company.controller.ts:42-43` - Add rate card assignment schema
8. 🆕 `server/src/presentation/http/controllers/organization/company.controller.ts` - Add POST assign-ratecard endpoint
9. ✏️ `server/src/presentation/http/controllers/shipping/shipment.controller.ts:94` - Integrate pricing
10. ✏️ `server/src/core/application/services/shipping/shipment.service.ts` - Accept pricing parameter
11. ✏️ `server/src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model.ts` - Add pricingDetails field
12. 🆕 `server/src/core/application/services/pricing/pricing-orchestrator.service.ts` - NEW orchestrator
13. ✏️ `server/src/core/application/services/pricing/dynamic-pricing.service.ts` - Update zone input
14. ✏️ `server/src/core/application/services/logistics/pincode-lookup.service.ts` - Add getZoneForCompany method
15. 🆕 `server/src/infrastructure/database/seeders/seeders/24-pincode-master.seeder.ts` - NEW seeder for 154k pincodes

### Frontend Files to Modify/Create

**Phase 0 (Foundation):**
1. 🆕 `client/src/hooks/api/logistics/use-couriers.ts` - NEW hook for courier fetching
2. ✏️ `client/app/admin/ratecards/create/components/CreateRatecardClient.tsx:24-30` - Replace hardcoded couriers with useCouriers()

**Phase 2 (Frontend Integration):**
3. ✏️ `client/app/seller/rates/components/RatesClient.tsx:27-51` - Replace mock with API
4. 🆕 `client/src/hooks/api/logistics/use-rate-calculation.ts` - NEW hook for rate calculation
5. ✏️ `client/app/admin/ratecards/create/components/CreateRatecardClient.tsx:101-104` - Add submit handler
6. ✏️ `client/src/hooks/api/logistics/use-ratecards.ts` - Add useCreateRateCard mutation
7. 🆕 `client/app/admin/companies/[companyId]/settings/components/RateCardSettings.tsx` - NEW component for assignment

**Phase 3 (Zone Management):**
8. ✏️ `client/app/admin/zones/components/ZonesClient.tsx` - Add bulk import + standard/custom tabs
9. 🆕 `client/app/admin/zones/bulk-import/components/BulkImportZones.tsx` - NEW bulk import UI

---

## Verification Plan

### Unit Tests (Optional for MVP, Recommended for Production)
- `RateCardService.calculateRTOCharges()` - Test all zone scenarios
- `PincodeLookupService.getZoneFromPincodes()` - Test zone logic
- `DynamicPricingService.calculatePricing()` - Test GST calculation
- `PricingOrchestratorService.calculateShipmentPricing()` - Integration test

### Manual Testing Checklist

#### Backend API Testing (Postman/Thunder Client)
1. ✅ **Create Rate Card**
   - POST `/api/v1/ratecards`
   - Body: Valid rate card with zones A-E
   - Expected: 201 Created, returns rate card with ID

2. ✅ **Assign Rate Card to Company**
   - POST `/api/v1/companies/:companyId/assign-ratecard`
   - Body: `{ rateCardId: "<id>" }`
   - Expected: 200 OK, company.settings.defaultRateCardId updated

3. ✅ **Calculate Rate**
   - POST `/api/v1/ratecards/calculate`
   - Body: `{ originPincode: "400001", destinationPincode: "110001", weight: 1.5, paymentMode: "prepaid" }`
   - Expected: 200 OK, returns breakdown with zone = "zoneC" (both metro)

4. ✅ **Create Shipment (with pricing)**
   - POST `/api/v1/shipments`
   - Body: Valid shipment payload
   - Expected: 201 Created, shipment.pricingDetails populated with calculation

5. ✅ **Zone Lookup**
   - Manual test: `PincodeLookupService.getInstance().getZoneFromPincodes("400001", "110001")`
   - Expected: Returns "zoneC" (both Mumbai and Delhi are metro)

#### Frontend UI Testing
1. ✅ **Rate Calculator**
   - Navigate to `/seller/rates`
   - Fill: Origin = 400001, Destination = 560001, Weight = 1kg
   - Click "Calculate"
   - Expected: Shows 5 carriers with prices, sorted by cost

2. ✅ **Create Rate Card**
   - Navigate to `/admin/ratecards/create`
   - Fill: Courier = Delhivery, Service = Surface, Category = lite
   - Set Zone A = ₹40, Zone B = ₹60, Zone C = ₹90
   - Click "Save"
   - Expected: Redirects to list, new card appears

3. ✅ **Assign Rate Card**
   - Navigate to `/admin/companies/:companyId/settings`
   - Select rate card from dropdown
   - Click "Assign"
   - Expected: Toast success, dropdown shows assigned card on refresh

4. ✅ **Create Shipment (E2E)**
   - Navigate to `/seller/orders/:orderId`
   - Click "Ship Now"
   - Expected: Shows calculated shipping cost in summary
   - Complete shipment creation
   - Expected: Shipment created, pricing details visible in shipment view

#### Edge Cases
1. ✅ **No Rate Card Assigned**
   - Company without defaultRateCardId
   - Create shipment
   - Expected: Falls back to env variable (₹50) or error message

2. ✅ **Invalid Pincode**
   - Calculate rate with pincode "999999"
   - Expected: 400 Bad Request, error message "Invalid pincode"

3. ✅ **Inactive Rate Card**
   - Assign rate card, then set status = "inactive"
   - Create shipment
   - Expected: Error "Rate card not active"

4. ✅ **Same Pincode (Zone A)**
   - Calculate rate from 400001 → 400099
   - Expected: zone = "zoneA", lowest price

5. ✅ **J&K Pincode (Zone E)**
   - Calculate rate from 400001 → 190001 (Srinagar)
   - Expected: zone = "zoneE", highest price

---

## Risk Mitigation

### Performance Risks
1. **Risk:** Zone lookup slow (DB query per shipment)
   - **Mitigation:** Redis cache with 1-hour TTL (Target: <10ms lookup)

2. **Risk:** Rate calculation slow (complex logic)
   - **Mitigation:** Cache rate card in Redis (30min TTL), index baseRates by carrier

3. **Risk:** Pincode CSV parsing slow (154k rows)
   - **Mitigation:** In-memory singleton loaded at startup, O(1) Map lookup

### Data Integrity Risks
1. **Risk:** Pincode overlap across zones
   - **Mitigation:** Overlap detection in zone controller (pre-save validation)

2. **Risk:** Multiple active rate cards for same carrier/company
   - **Mitigation:** Unique compound index on (companyId, carrier, serviceType, status='active')

3. **Risk:** Rate card deleted while in use
   - **Mitigation:** Soft delete flag, prevent deletion if used in shipments

### Business Logic Risks
1. **Risk:** Zone calculation mismatch (e.g., distance-based vs state-based)
   - **Mitigation:** Add `zoneBType` field to rate card, respect setting during calculation

2. **Risk:** COD charge calculation wrong
   - **Mitigation:** Unit tests for COD logic (Max of percentage or minimum)

3. **Risk:** GST calculation wrong (CGST/SGST vs IGST)
   - **Mitigation:** Use GSTService with state mapping, validate against Govt rates

---

## Success Metrics

### Phase 1 Completion (Week 1)
- ✅ Shipment creation calculates pricing (100% of shipments)
- ✅ Pricing details stored in shipment document
- ✅ Rate card assignment API functional
- ✅ Zone lookup working with Redis cache (<10ms)

### Phase 2 Completion (Week 2)
- ✅ Frontend rate calculator uses backend API (0% mock data)
- ✅ Admin can create rate cards via UI
- ✅ Admin can assign rate cards to companies
- ✅ Pincode master seeded (154,798 rows)

### Phase 3 Completion (Week 2-3)
- ✅ Zone management UI functional
- ✅ Bulk import/export working
- ✅ Multi-carrier rate comparison working
- ✅ Rate card versioning tracking changes

### Production Readiness (Week 3)
- ✅ 85%+ Redis cache hit rate
- ✅ <100ms average pricing calculation
- ✅ Zero pricing errors in production
- ✅ Analytics dashboard live
- ✅ 100% E2E test pass rate

---

## User Decisions (Confirmed)

✅ **Zone Strategy:** HYBRID - Default 5-zone system (zoneA-E) with option for custom company-specific zones
   - System seeds 5 standard zones on company creation
   - Companies can add custom zones if needed
   - Rate cards can reference either standard or custom zones

✅ **Default Rate Card:** AUTO-ASSIGN template on company creation
   - System creates "Standard Rates" template automatically
   - Reduces onboarding friction, immediate shipping capability
   - Template includes basic rates for all 5 zones

✅ **Courier Data:** DATABASE STORAGE (MongoDB documents)
   - Couriers stored in `couriers` collection
   - Includes services, status, logo URL, API credentials
   - Allows adding new couriers without code deployment

✅ **COD Charges:** PER RATE CARD configuration
   - Each rate card has own `codPercentage` and `codMinimumCharge`
   - Enables different seller tiers with different COD costs
   - Matches BlueShip model for maximum flexibility

### Additional Implementation Required

#### Phase 0: Courier Management Foundation (Before Phase 1)

**New Model Required:**
```typescript
// server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/courier.model.ts
interface ICourier extends Document {
  name: string;                    // "Delhivery", "DTDC", etc.
  code: string;                    // "delhivery", "dtdc" (unique slug)
  logo: string;                    // URL to courier logo
  isActive: boolean;               // Can be used for rate cards

  services: Array<{
    serviceType: string;           // "Surface", "Air", "Express"
    displayName: string;           // "Delhivery Surface"
    isActive: boolean;
    avgTransitDays: number;        // For ETA calculation
  }>;

  apiConfig?: {                    // Optional: for future courier API integration
    baseUrl: string;
    authType: 'bearer' | 'basic' | 'apikey';
    credentials: any;              // Encrypted
    isConfigured: boolean;
  };

  contactInfo?: {
    supportEmail: string;
    supportPhone: string;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

**Seeder Required:**
```typescript
// server/src/infrastructure/database/seeders/seeders/22-couriers.seeder.ts
// Seeds: Delhivery, Xpressbees, DTDC, Bluedart, EcomExpress
```

**API Endpoints:**
```typescript
GET    /api/v1/couriers           // List all active couriers
GET    /api/v1/couriers/:id       // Get courier details
POST   /api/v1/couriers           // Create courier (admin only)
PATCH  /api/v1/couriers/:id       // Update courier
DELETE /api/v1/couriers/:id       // Soft delete courier
```

**Frontend Hook:**
```typescript
// client/src/hooks/api/logistics/use-couriers.ts
export const useCouriers = () => {
  return useQuery({
    queryKey: ['couriers'],
    queryFn: async () => {
      const response = await fetch('/api/v1/couriers');
      return response.json();
    }
  });
};
```

**Update CreateRatecardClient.tsx:**
Replace lines 24-30 (hardcoded couriers) with:
```typescript
const { data: couriers, isLoading } = useCouriers();
```

---

## Implementation Priority Order (UPDATED)

If time/resources are limited, implement in this sequence:

### Phase 0: Foundation (Day 1-2) - PREREQUISITE
1. ✅ Courier management system (Phase 0.1)
2. ✅ Default zone seeding (Phase 0.2)
3. ✅ Company onboarding service
4. ✅ Run seeders (couriers + pincodes)

**Exit Criteria:** New company auto-gets 5 zones + default rate card

---

### Phase 1: Core Backend (Day 3-5) - CRITICAL PATH
5. ✅ Company rate card assignment API (Phase 1.1)
6. ✅ Shipment pricing integration (Phase 1.2)
7. ✅ Zone lookup optimization (Phase 1.3)
8. ✅ Dynamic pricing service integration (Phase 1.4)
9. ✅ Pricing orchestrator service (NEW)

**Exit Criteria:** Create shipment → pricing calculated → stored in shipment.pricingDetails

---

### Phase 2: Core Frontend (Day 6-8) - USER FACING
10. ✅ Rate calculator API connection (Phase 2.1)
11. ✅ Create rate card form integration (Phase 2.2)
12. ✅ Rate card assignment UI (Phase 2.3)
13. ✅ Update CreateRatecardClient to use DB couriers

**Exit Criteria:** Sellers can calculate rates, admins can create/assign rate cards via UI

---

### Phase 3: Data & Polish (Day 9-10)
14. ✅ Pincode master seeding (Phase 3.1) - 154k pincodes
15. ✅ Zone seeding with real postal codes (Phase 3.2)
16. ✅ Zone management UI enhancement (Phase 3.3)

**Exit Criteria:** All pincodes loaded, zone lookup 100% accurate

---

### Phase 4: Advanced Features (Week 2-3) - OPTIONAL
17. ⭐ Multi-carrier rate comparison (Phase 4.1)
18. ⭐ Rate card versioning UI (Phase 4.2)
19. ⭐ Rate card templates/cloning (Phase 4.3)
20. ⭐ Bulk operations (Phase 4.4)

**Exit Criteria:** Production-grade features for scale

---

### Phase 5: Analytics & Monitoring (Week 3+) - FUTURE
21. 📊 Rate card usage analytics (Phase 5.1)
22. 📊 Pricing cache monitoring (Phase 5.2)
23. 📊 Rate card comparison report (Phase 5.3)

**Exit Criteria:** Data-driven insights for rate optimization

---

## Daily Implementation Schedule (Fast-Track: 10 Days)

### Day 1: Foundation Setup
- [ ] Morning: Create Courier model + controller + seeder
- [ ] Afternoon: Run courier seeder, test API endpoints
- [ ] Evening: Create useCouriers hook, update CreateRatecardClient

### Day 2: Onboarding Automation
- [ ] Morning: Create CompanyOnboardingService
- [ ] Afternoon: Implement createDefaultZones + createDefaultRateCard
- [ ] Evening: Hook into company creation, test E2E

### Day 3: Backend Integration Part 1
- [ ] Morning: Update Company model schema for defaultRateCardId
- [ ] Afternoon: Create assign-ratecard endpoint + validation
- [ ] Evening: Test rate card assignment API

### Day 4: Backend Integration Part 2
- [ ] Morning: Create PricingOrchestratorService
- [ ] Afternoon: Add pricingDetails to Shipment model
- [ ] Evening: Integrate pricing into shipment.controller.ts

### Day 5: Zone & Pricing Logic
- [ ] Morning: Update PincodeLookupService with getZoneDetails
- [ ] Afternoon: Integrate DynamicPricingService
- [ ] Evening: Test E2E pricing calculation

### Day 6: Frontend Rate Calculator
- [ ] Morning: Create useRateCalculation hook
- [ ] Afternoon: Update RatesClient.tsx (remove mock)
- [ ] Evening: Test rate calculator E2E

### Day 7: Frontend Rate Card Creation
- [ ] Morning: Update CreateRatecardClient submit handler
- [ ] Afternoon: Add form validation + error handling
- [ ] Evening: Test rate card creation E2E

### Day 8: Frontend Assignment UI
- [ ] Morning: Create RateCardSettings component
- [ ] Afternoon: Integrate into company settings page
- [ ] Evening: Test rate card assignment E2E

### Day 9: Data Seeding
- [ ] Morning: Create pincode master seeder (154k rows)
- [ ] Afternoon: Run seeder, verify Pincode collection
- [ ] Evening: Update zone seeder with real postal codes

### Day 10: Testing & Polish
- [ ] Morning: Run all manual test cases (verification plan)
- [ ] Afternoon: Fix bugs, optimize performance
- [ ] Evening: Production deployment prep

**Total:** 10 days to MVP (100% working rate card system)

---

## Conclusion

This plan provides a comprehensive, production-ready roadmap to achieve a **100% complete end-to-end rate card system** matching BlueShip's proven workflow while leveraging ShipCrowd's superior architecture.

**Key Success Factors:**
- ✅ Backend models already exist (60% done)
- ✅ Clear integration points identified
- ✅ BlueShip's production logic documented
- ✅ Performance optimizations planned (Redis caching)
- ✅ Data integrity safeguards (overlap detection, validation)
- ✅ Comprehensive verification plan

**Estimated Timeline:** 2-3 weeks for complete implementation (MVP in 1 week, full feature set in 3 weeks)

**Next Steps:**
1. User clarifies open questions
2. Start Phase 1.1 (Company rate card assignment)
3. Iterative development with daily verification
4. Production deployment with monitoring

Let's build this! 🚀
