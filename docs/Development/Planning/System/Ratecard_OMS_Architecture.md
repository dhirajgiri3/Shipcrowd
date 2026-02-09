# ShipCrowd: Complete Service-Level Pricing Migration
## 100% Implementation with Legacy Code Removal

---

## Context

**Why This Migration?**
Currently, the codebase has dual pricing systems (legacy RateCard + new ServiceRateCard) creating maintenance burden, inconsistencies, and technical debt. The new service-level architecture is already 70% implemented and working, but legacy code remains active via feature flags and bridge logic.

**Problem Being Solved:**
- Scattered pricing logic (embedded in QuoteEngine instead of centralized)
- No automatic booking fallback (fails on first provider error)
- Legacy code bloat (1,500+ lines of unused/duplicate code)
- Feature flag complexity (bridge mode in routes)
- Incomplete rule application (COD/fuel/GST not fully enforced)

**Intended Outcome:**
- Single, clean pricing architecture (service-level only)
- 100% centralized formula service for all pricing calculations
- Automatic booking resilience with fallback orchestration
- Zero legacy code (models, services, controllers, routes)
- Production-grade testing and observability

---

## Critical Files Involved

### Files to CREATE:
1. `server/src/core/application/services/pricing/service-rate-card-formula.service.ts` (~500 lines)
2. `server/tests/unit/services/pricing/service-rate-card-formula.service.test.ts` (~300 lines)
3. `server/tests/integration/services/shipping/booking-fallback.integration.test.ts` (~300 lines)
4. `client/app/admin/pricing-studio/page.tsx` (~400 lines)

### Files to MODIFY:
1. `server/src/core/application/services/pricing/quote-engine.service.ts` (lines 645-744)
2. `server/src/core/application/services/shipping/book-from-quote.service.ts` (entire execute method)
3. `server/src/presentation/http/routes/v1/shipping/order.routes.ts` (delete lines 143-186, 291-314)
4. `server/src/core/application/services/metrics/service-level-pricing-metrics.service.ts` (add fallback metrics)
5. `client/app/seller/ship/page.tsx` (add breakdown modal)

### Files to DELETE:
1. `server/src/core/application/services/pricing/pricing-orchestrator.service.ts` (189 lines)
2. `server/src/core/application/services/pricing/dynamic-pricing.service.ts` (~600 lines)
3. `server/src/core/application/services/pricing/rate-card-selector.service.ts` (~200 lines)
4. `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model.ts` (312 lines)
5. `server/src/presentation/http/controllers/shipping/ratecard.controller.ts` (1,030 lines)
6. Associated test files for deleted services

---

## Implementation Plan (8 Weeks)

### **PHASE 1: Foundation - ServiceRateCardFormulaService (Week 1-2)**

**Goal:** Centralize ALL pricing calculations into a single, reusable service.

#### Week 1: Build Formula Service

**Create:** `server/src/core/application/services/pricing/service-rate-card-formula.service.ts`

**Core Responsibilities:**
1. **Chargeable Weight Calculation**
   - Calculate volumetric weight: `(length × width × height) / dimFactor`
   - Provider-specific DIM factors (Ekart: 5000, Delhivery: 5000, Velocity: 4750)
   - Use max(actual, volumetric) as chargeable weight
   - Return both values + which was used

2. **Zone/Slab Matching with Rounding**
   - Normalize zone key (handle "zoneA", "A", "zone_a", "route_a")
   - Find matching slab: `weight >= minKg && weight <= maxKg`
   - If beyond max slab:
     - Calculate extra weight: `weight - maxSlab.maxKg`
     - Round per `roundingUnitKg` and `roundingMode` (ceil/floor/nearest)
     - Add charge: `lastSlab.charge + (roundedExtraWeight × additionalPerKg)`

3. **COD Charge Calculation**
   - Match slab from card `codSurcharges` array
   - Apply flat rate or percentage based on `type`
   - Fallback: 2% of order value, min ₹30

4. **Fuel Surcharge Calculation**
   - Apply percentage from card `fuelSurcharge`
   - Support two modes:
     - `freight`: Apply on base shipping only
     - `freight_cod`: Apply on base shipping + COD charge

5. **GST Calculation**
   - Detect intra-state vs inter-state via pincode lookup
   - Intra-state: CGST + SGST (split 18% / 2)
   - Inter-state: IGST (18% total)
   - Apply on subtotal + COD + fuel

**Key Method Signature:**
```typescript
interface FormulaInput {
  serviceRateCard: IServiceRateCard;
  weight: number;
  dimensions: { length, width, height };
  zone: string;
  paymentMode: 'cod' | 'prepaid';
  orderValue: number;
  provider: ServiceLevelProvider;
  fromPincode: string;
  toPincode: string;
}

interface FormulaOutput {
  chargeableWeight: number;
  baseCharge: number;
  weightCharge: number;
  subtotal: number;
  codCharge: number;
  fuelCharge: number;
  rtoCharge: number;
  gstBreakdown: { cgst, sgst, igst, total };
  totalAmount: number;
  breakdown: { /* detailed calculation steps */ };
}

calculatePricing(input: FormulaInput): FormulaOutput;
```

**Implementation Steps:**
1. Create service class with constructor dependency injection
2. Implement `calculateChargeableWeight()` method
3. Implement `findZoneRule()` and `findSlab()` methods
4. Implement `calculateBaseAndWeight()` with rounding logic
5. Implement `calculateCODCharge()` method
6. Implement `calculateFuelSurcharge()` method
7. Implement `calculateGST()` method
8. Implement main `calculatePricing()` orchestration method
9. Add comprehensive JSDoc comments
10. Add input validation with clear error messages

**Testing:** Create unit test file with >95% coverage
- Test volumetric weight calculation (actual vs volumetric scenarios)
- Test slab matching (within range, beyond max, no match)
- Test rounding modes (ceil, floor, nearest)
- Test COD charge (slab-based, fallback)
- Test fuel surcharge (freight vs freight_cod)
- Test GST calculation (intra-state, inter-state)
- Test edge cases (zero weight, missing slabs, invalid zones)

#### Week 2: Wire Formula Service

**Modify:** `server/src/core/application/services/pricing/quote-engine.service.ts`

**Changes:**
- **Lines 645-720 (resolveCost method):**
  - Replace inline `calculateFromCard()` call with `ServiceRateCardFormulaService.calculatePricing()`
  - Use `formulaResult.totalAmount` as amount
  - Use `formulaResult.breakdown` for breakdown object
  - Preserve live rate logic (if `sourceMode: LIVE_API/HYBRID` and live rate exists)

- **Lines 722-744 (resolveSell method):**
  - Same refactor as resolveCost
  - Replace inline calculation with formula service call

**Modify:** `server/src/core/application/services/shipping/book-from-quote.service.ts`

**Enhancement:** Store full breakdown in shipment snapshot
- After getting selected option, re-query cost + sell cards
- Re-calculate pricing with formula service
- Store full breakdown in `pricingDetails.selectedQuote.sellBreakdown` and `costBreakdown`
- Preserve attempt number and fallback metadata

**Modify:** `server/src/presentation/http/controllers/shipping/service-ratecard.controller.ts`

**Add/Enhance:** `simulatePricing` endpoint
- `POST /api/v1/admin/service-ratecards/:id/simulate`
- Accept: weight, dimensions, zone, payment mode, order value, pincodes
- Call formula service with provided card
- Return full breakdown + card metadata

**Exit Criteria:**
- [ ] All formula service unit tests pass (>95% coverage)
- [ ] Quote generation integration tests pass with formula service
- [ ] Simulate endpoint returns full breakdown
- [ ] Book-from-quote stores enhanced breakdown in shipment
- [ ] Manual test: Generate quote → Book → Verify full pricing details in DB

---

### **PHASE 2: Booking Resilience - Automatic Fallback (Week 3-4)**

**Goal:** Implement automatic fallback to next-ranked option when first provider fails (pre-AWB only).

#### Week 3: Build Fallback Orchestration

**Modify:** `server/src/core/application/services/shipping/book-from-quote.service.ts`

**Current Issue:** Lines 79-139 fail immediately on first error, no retry

**Refactor Strategy:**

1. **Add Configuration:**
```typescript
const FALLBACK_CONFIG = {
  enabled: true,
  maxRetries: 3,
  retryOnlyPreAWB: true, // CRITICAL: Never fallback after AWB
  skipOptionsWithSameProvider: false,
};
```

2. **Refactor `execute()` Method:**
   - Get selected option from session
   - Get ranked fallback options: `[selectedOption, ...otherOptionsRankedByScore]`
   - Loop through options (max 3 attempts)
   - For each option:
     - Try `attemptBookingWithOption()`
     - On success: Record metrics, return result
     - On error:
       - Check if recoverable (`isRecoverableError()`)
       - If non-recoverable (AWB generated): Apply compensation, stop immediately
       - If recoverable: Log warning, continue to next option
   - If all options exhausted: Throw last error

3. **New Helper Methods:**

```typescript
getRankedFallbackOptions(session, initialOption): QuoteOptionOutput[] {
  // Return [initialOption, ...remainingOptionsRankedByScore]
}

async attemptBookingWithOption(option, session, order, input, attemptNumber) {
  // Create unique idempotency key per attempt
  // Call ShipmentService.createShipment()
  // Lock option selection on success
  // Return booking result with fallback metadata
}

isRecoverableError(error): boolean {
  // Extract AWB from error hint
  // If AWB exists: return false (non-recoverable)
  // Check error code: timeout/serviceability = recoverable
  // Default: true (safe for pre-AWB failures)
}
```

4. **Add Fallback Metadata to Response:**
```typescript
return {
  sessionId,
  optionId,
  shipment,
  carrierSelection,
  pricingSnapshot,
  fallbackInfo: {
    attemptNumber,
    fallbackUsed: attemptNumber > 1,
    totalOptionsAvailable: session.options.length,
  },
};
```

#### Week 4: Testing & Observability

**Create:** `server/tests/integration/services/shipping/booking-fallback.integration.test.ts`

**Test Scenarios:**
1. **First option succeeds** - No fallback triggered
2. **First option fails (pre-AWB), second succeeds** - Fallback works
3. **First two fail, third succeeds** - Multi-fallback works
4. **All options fail** - Error thrown, metrics recorded
5. **First option fails post-AWB** - No fallback, compensation applied
6. **Verify metrics** - Fallback usage tracked correctly
7. **Verify idempotency** - Each attempt has unique key

**Modify:** `server/src/core/application/services/metrics/service-level-pricing-metrics.service.ts`

**Add Metrics:**
```typescript
recordBookingSuccess(meta?: { attemptNumber, provider, fallbackUsed });
recordBookingFailure(stage, meta?: { attemptNumber, fallbackAttempted, allOptionsExhausted });
recordFallbackEvent({ sessionId, initialProvider, fallbackProvider, attemptNumber, reason });
```

**Exit Criteria:**
- [ ] All 7 fallback integration tests pass
- [ ] Metrics correctly track fallback usage
- [ ] Manual test: Mock first provider failure → Verify fallback to second
- [ ] Manual test: Mock post-AWB failure → Verify no fallback, compensation applied
- [ ] Performance: Fallback adds <500ms overhead per retry

---

### **PHASE 3: Legacy Removal (Week 5-6)**

**Goal:** Delete all legacy code, enforce service-level as only path.

#### Week 5: Delete Bridge Code & Services

**Day 1: Remove Bridge Logic**

**Modify:** `server/src/presentation/http/routes/v1/shipping/order.routes.ts`

**Delete:**
- Lines 143-186 (GET /courier-rates legacy fallback)
- Lines 291-314 (POST /ship legacy fallback)
- Lines 44-110 (helper functions: `normalizeLegacyRateRequestBody`, `resolveLegacyServiceType`, `toLegacyRateRows`)

**Replace with:**
- GET /courier-rates: Direct call to `QuoteEngineService.generateQuotes()`
- POST /:orderId/ship: Enforce `sessionId` and `optionId` required, call `bookFromQuote()`

**Verification:**
```bash
rg "normalizeLegacyRateRequestBody|toLegacyRateRows" server/src
# Expected: 0 matches
```

**Day 2-3: Delete Legacy Services**

**Delete Files:**
1. `server/src/core/application/services/pricing/pricing-orchestrator.service.ts`
2. `server/src/core/application/services/pricing/dynamic-pricing.service.ts`
3. `server/src/core/application/services/pricing/rate-card-selector.service.ts`

**Pre-deletion Check:**
```bash
rg "PricingOrchestratorService|DynamicPricingService|RateCardSelectorService" server/src
# Expected: Only definitions in files themselves, no external imports
```

**Post-deletion:**
- Update `services/index.ts` to remove exports
- Run build: `npm run build --prefix server`

**Day 4: Delete Legacy Controller**

**Delete File:**
- `server/src/presentation/http/controllers/shipping/ratecard.controller.ts` (1,030 lines)

**Pre-deletion Check:**
```bash
rg "ratecardController|from.*ratecard.controller" server/src/presentation/http/routes
# If matches found, verify they're admin-only routes, mark deprecated instead
```

**Update:**
- Remove from `controllers/index.ts` exports

**Day 5: Delete Legacy Model**

**Delete File:**
- `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model.ts` (312 lines)

**Pre-deletion:**
1. Export data backup: `mongoexport --collection=ratecards --out=ratecards_backup.json`
2. Archive backup for 30 days
3. Verify zero production usage

**Update:**
- Remove from `models/index.ts` exports

**Verification:**
```bash
rg "\bRateCard\b" server/src
# Expected: Only ServiceRateCard references, not legacy RateCard
```

#### Week 6: Feature Flag Removal & Cleanup

**Day 1: Remove Feature Flag**

**Find all usages:**
```bash
rg "enable_service_level_pricing" server/src
```

**Remove:**
- Feature flag checks in routes
- Feature flag from database/config
- Feature flag documentation

**Day 2: Update Imports**

**Auto-fix:**
```bash
npm run lint:fix --prefix server
```

**Manual fixes:**
- Remove unused imports after service deletions
- Update any circular dependencies

**Day 3-4: Update Tests**

**Delete:**
- Test files for deleted services
- Feature flag mocking in tests

**Add:**
- Regression prevention tests (ensure legacy endpoints reject old payloads)

**Day 5: Final Verification Gate**

**Run ALL checks:**
```bash
# 1. No legacy imports
rg "PricingOrchestratorService|DynamicPricingService|RateCardSelectorService|rate-card.model" server/src
# Expected: 0 matches

# 2. No legacy routes
rg "ratecardController\\.calculateRate|normalizeLegacyRateRequestBody" server/src
# Expected: 0 matches

# 3. No feature flag
rg "enable_service_level_pricing" server/src
# Expected: 0 matches

# 4. Build passes
npm run build --prefix server

# 5. Tests pass
npm test --prefix server

# 6. Seed verification
npm run verify:service-level-pricing-seed --prefix server

# 7. Index hygiene
npm run migrate:service-level-pricing-index-hygiene --prefix server
```

**Gate:** ALL 7 checks must pass.

**Exit Criteria:**
- [ ] All 7 verification commands green
- [ ] Zero TypeScript errors
- [ ] All integration tests green
- [ ] Manual test: Order → Quote → Book → Verify
- [ ] Code review confirms no dead code

---

### **PHASE 4: Verification & Testing (Week 7)**

**Goal:** Comprehensive testing to ensure stability.

#### Testing Checklist

**Automated Tests:**
```bash
npm test --prefix server -- tests/unit/
npm test --prefix server -- tests/integration/
npm test --prefix server -- tests/integration/services/pricing/
```

**Manual Smoke Tests:**

1. **Happy Path:**
   - Create order → Generate quotes → Select option → Book → Verify shipment
   - Import billing (within 5%) → Verify auto-closed

2. **Provider Timeout:**
   - Mock Ekart timeout → Verify other providers still return options
   - Verify `providerTimeouts.ekart = true` in response

3. **Booking Fallback:**
   - Mock first provider failure → Verify second option used
   - Verify `fallbackInfo.fallbackUsed = true`

4. **Quote Expiry:**
   - Generate quote → Wait 31min → Book → Verify HTTP 410

5. **Compensation:**
   - Mock booking failure → Verify `booking_failed` status
   - Verify wallet refunded

**Performance Benchmarks:**
- Quote generation p95: <1.5s
- Booking p95: <2.0s
- Booking with fallback p95: <3.0s
- Formula calculation avg: <10ms

**Seed Verification:**
```bash
npm run seed:clean --prefix server
npm run seed:full --prefix server
npm run verify:service-level-pricing-seed --prefix server
```

**Exit Criteria:**
- [ ] All automated tests green
- [ ] All 5 manual scenarios pass
- [ ] Performance within targets
- [ ] Seed verification green
- [ ] No errors in logs

---

### **PHASE 5: Admin UI Enhancement (Week 8)**

**Goal:** Unified pricing studio and breakdown display.

#### Pricing Studio

**Create:** `client/app/admin/pricing-studio/page.tsx`

**Features:**
1. **Rate Card Selector** - Dropdown to select ServiceRateCard
2. **Simulation Panel** - Input fields + Calculate button + Full breakdown display
3. **Margin Preview** - Side-by-side cost vs sell comparison with visual indicators
4. **Formula Breakdown** - Expandable details showing calculation steps

#### Quote Explanation UI

**Modify:** `client/app/seller/ship/page.tsx`

**Add:** "View Breakdown" button per quote option → Modal showing:
- Chargeable weight (actual vs volumetric)
- Base charge (from slab)
- Weight charge (extra kg × rate)
- COD charge (if applicable)
- Fuel surcharge
- GST breakdown
- Total

#### ServiceRateCard Admin Enhancement

**Modify:** `client/app/admin/service-ratecards/page.tsx`

**Add:**
1. Inline "Test Pricing" button on each card row
2. Margin analysis stats (avg, min, max margin %)
3. Formula validation on save (warn if gaps in slabs, unreasonable values)

**Exit Criteria:**
- [ ] Pricing studio loads and calculates correctly
- [ ] Margin preview matches backend calculations
- [ ] Quote breakdown modal displays full details
- [ ] Formula validation warns on save

---

## Rollback Strategy

**Pre-Phase 3 Safety Net:**
- Tag release: `git tag v1.9-pre-legacy-removal`
- Create database backup
- Document restore commands

**Per-Phase Rollback:**

**Phase 1/2:** Revert specific files via Git
```bash
git revert <commit-hash>
```

**Phase 3 (Critical):** Full restoration
```bash
git checkout v1.9-pre-legacy-removal -- server/src/core/application/services/pricing/
git checkout v1.9-pre-legacy-removal -- server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model.ts
```

**Database Rollback:**
```bash
mongorestore --collection=ratecards ratecards_backup.json
```

---

## Success Metrics (30 Days Post-Migration)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Lines of code removed | >1,500 | `git diff --stat` |
| Active pricing paths | 1 (service-level only) | Code audit |
| Quote generation p95 latency | <2.0s | Metrics dashboard |
| Booking success rate | ≥95% | Metrics dashboard |
| Fallback usage rate | 5-15% | Fallback metrics |
| Variance auto-close rate | ≥80% | Finance reports |
| Production incidents | 0 | Incident log |

---

## Timeline Summary

| Week | Phase | Deliverables | Risk Level |
|------|-------|-------------|-----------|
| 1-2 | Foundation | Formula service + wiring | Medium |
| 3-4 | Resilience | Fallback orchestration | Medium |
| 5 | Legacy Removal 1 | Delete services/routes | **High** |
| 6 | Legacy Removal 2 | Delete models/flags | **High** |
| 7 | Verification | Full testing | Low |
| 8 | UI Enhancement | Pricing studio | Low |

**Total: 8 Weeks**

**Critical Dependencies:** Phase 1 must complete before Phase 2. Phase 2 must complete before Phase 3.

---

## Verification Steps Before Implementation

**Pre-flight Checks:**
```bash
# 1. All existing tests pass
npm test --prefix server

# 2. Current seed works
npm run seed:full --prefix server

# 3. No uncommitted changes
git status

# 4. Create feature branch
git checkout -b feature/complete-service-level-migration

# 5. Tag current state
git tag v1.9-pre-migration
```

**Post-implementation Validation:**
```bash
# 1. All new tests pass
npm test --prefix server

# 2. Build succeeds
npm run build --prefix server

# 3. Seed verification
npm run verify:service-level-pricing-seed --prefix server

# 4. No legacy references
rg "PricingOrchestratorService|DynamicPricingService|RateCardSelectorService" server/src

# 5. Performance benchmarks
# Run load tests for quote/booking endpoints
```

---

This plan achieves **100% service-level pricing implementation with complete legacy removal** through:
1. ✅ Centralized formula service (all pricing logic in one place)
2. ✅ Automatic booking resilience (fallback orchestration)
3. ✅ Zero legacy code (1,500+ lines removed)
4. ✅ Production-grade testing (>95% coverage)
5. ✅ Enhanced admin UI (pricing studio, breakdowns)

**Next Steps:** Execute Phase 1 Week 1 - Create ServiceRateCardFormulaService.
