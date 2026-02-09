# ShipCrowd Courier + RateCard Final Refactor Blueprint

**Owner:** Shipping Platform Team
**Status:** Execution-ready, verification-backed
**Updated:** February 9, 2026

---

## 1. Purpose

This document defines the **final target architecture** and **cleanup/refactor path** for:

1. Courier Management
2. RateCard Management
3. Quote -> Book -> Reconciliation lifecycle

Goal: move ShipCrowd to one clean, production-grade system with no redundant legacy ownership of courier/ratecard logic.

---

## 2. Verification Summary (Current System)

This section is based on direct verification of current code and courier API docs.

## 2.1 What exists and is working

### A. New service-level architecture exists and is usable

Implemented models:
- `CourierService`
- `ServiceRateCard`
- `SellerCourierPolicy`
- `QuoteSession`
- `CarrierBillingRecord`
- `PricingVarianceCase`

Verified files:
- `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/courier-service.model.ts`
- `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/service-rate-card.model.ts`
- `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/seller-courier-policy.model.ts`
- `server/src/infrastructure/database/mongoose/models/logistics/shipping/core/quote-session.model.ts`
- `server/src/infrastructure/database/mongoose/models/finance/reconciliation/carrier-billing-record.model.ts`
- `server/src/infrastructure/database/mongoose/models/finance/reconciliation/pricing-variance-case.model.ts`

### B. Runtime path exists for new flow

- Quote engine: `QuoteEngineService`
- Booking from quote: `BookFromQuoteService`
- Reconciliation: `CarrierBillingReconciliationService`

Verified files:
- `server/src/core/application/services/pricing/quote-engine.service.ts`
- `server/src/core/application/services/shipping/book-from-quote.service.ts`
- `server/src/core/application/services/finance/carrier-billing-reconciliation.service.ts`

### C. API-level integration tests for critical new flows pass

Passing suites:
- `service-level-pricing-api.integration.test.ts`
- `service-level-pricing-flow.integration.test.ts`

Coverage includes:
1. quote generation
2. provider timeout partial results
3. book-from-quote success/failure
4. quote session expiry (410)
5. variance auto-close <=5% and open case >5%

### D. Provider docs confirm current hybrid sourcing strategy is feasible

- Velocity/Shipfast: serviceability + shipment charges post-booking, no robust pre-quote API -> table/hybrid prequote is required.
- Ekart: lane-level serviceability and pricing estimate APIs exist.
- Delhivery: pincode serviceability + shipping charge API exists (`kinko` endpoint).

Verified docs:
- `docs/Resources/API/Courier/Shipfast/Shipfast_API.md`
- `docs/Resources/API/Courier/Ekart/Ekart_API.md`
- `docs/Resources/API/Courier/Delhivery/B2C/Delhivery_API_1.md`
- `docs/Resources/API/Courier/Delhivery/B2C/Delhivery_API_2.md`

---

## 3. Verified Architecture Gaps (Must Be Fixed for Final Version)

## 3.1 Courier Management gaps

1. **Dual courier ownership still exists**
- Legacy provider model: `shipping/courier.model.ts`
- New service model: `logistics/shipping/configuration/courier-service.model.ts`

2. **Provider service sync is currently synthetic, not provider-catalog-driven**
- `syncProviderServices` currently creates default service codes from hardcoded service type arrays.
- It does not ingest a true provider service catalog.

3. **Legacy courier routes still active**
- `/admin/couriers`, `/admin/carriers`, `/courier` still serve provider-level flows.

## 3.2 RateCard Management gaps

1. **Dual ratecard ownership still exists**
- Legacy: `RateCard` (`rate-card.model.ts`)
- New: `ServiceRateCard` (`service-rate-card.model.ts`)

2. **Legacy rate calculation APIs still active**
- `ratecard.controller.ts` + `ratecard.routes.ts` remain in primary path.

3. **Not all service-ratecard pricing fields are applied in quote math yet**
- Model supports cod/fuel/rto rule shapes.
- Quote calculator currently mostly uses slab + additional per kg.
- GST/min-fare/COD-surcharge/fuel/rto application is not fully centralized under one service-level pricing formula engine.

## 3.3 Quote/Booking/Reconciliation gaps

1. **Legacy bridge behavior still retained in order routes**
- `/orders/courier-rates` and `/orders/:orderId/ship` still have flag-based branching.

2. **Chargeable weight is not fully normalized by service-level card rules**
- Quote flow currently uses input weight heavily; volumetric + weight basis + rounding are not fully enforced end-to-end per service card.

3. **Server build has unrelated TypeScript failures**
- These are outside service-level pricing core and need separate cleanup track.

---

## 4. Final End-State Architecture (Single Source of Truth)

After refactor/cleanup, ShipCrowd should have these canonical ownership boundaries:

## 4.1 Courier domain ownership

1. `CourierService` is the only runtime service catalog for shipping decisions.
2. `Courier` (legacy provider-level model) becomes integration metadata only or is retired.
3. Provider config/credentials remain in `Integration`.

## 4.2 Ratecard domain ownership

1. `ServiceRateCard` is the only pricing rule model used for quote runtime.
2. Two card types remain mandatory per service:
   - `cost`: expected carrier cost
   - `sell`: seller-visible price
3. Legacy `RateCard` model is removed from shipment quote/price path.

## 4.3 Order/shipment pricing ownership

1. Quote engine is the only source for seller-visible rate options.
2. Booking must happen from `sessionId + optionId`.
3. Shipment always stores dual-ledger snapshot:
   - `quotedSellAmount`
   - `expectedCostAmount`
   - `expectedMarginAmount`
   - `expectedMarginPercent`

## 4.4 Finance ownership

1. `CarrierBillingRecord` is the billing ingest fact table.
2. `PricingVarianceCase` is the discrepancy lifecycle table.
3. Threshold policy (default 5%) is centrally enforced in reconciliation service.

---

## 5. Final RateCard Creation/Management Design (Admin + Seller)

## 5.1 Why cost and sell cards both are required

This is not unnecessary complexity. It is mandatory for a real aggregator contract model.

- `cost` card answers: what carrier likely charges ShipCrowd.
- `sell` card answers: what seller sees and pays.

Without separation, you lose:
1. margin visibility
2. invoice variance controls
3. pricing strategy flexibility by seller/category

UI should hide complexity by giving one workflow with two tabs/panels (`Cost`, `Sell`) in same screen.

## 5.2 Admin workflow (final)

1. Select Provider (Velocity/Delhivery/Ekart).
2. Select Courier Service (from `CourierService` records for that provider).
3. Configure constraints/SLA if needed at service level.
4. Create/Update **Cost Card** (`cardType=cost`).
5. Create/Update **Sell Card** (`cardType=sell`).
6. Activate card versions with effective dates.

## 5.3 Required pricing rule structure per zone

For each zone (`A-E`):
1. Basic slab table (`minKg`, `maxKg`, `charge`)
2. Additional slab behavior (`additionalPerKg` + rounding)
3. COD rule
4. Fuel surcharge rule
5. Optional RTO rule

## 5.4 Formula engine requirements (must be centralized)

For both cost and sell card calculations:
1. Determine chargeable weight using `weightBasis`, `dimDivisor`, and rounding config.
2. Resolve slab amount for route zone.
3. Apply additional slab overage.
4. Apply COD rule (if COD).
5. Apply fuel surcharge.
6. Apply minimum fare logic.
7. Apply GST where configured.
8. Return full breakdown.

Note: this should be one shared pricing formula service used by quote simulation, quote generation, and admin preview endpoints.

---

## 6. Final Courier Management Design

## 6.1 Entity split

1. Provider account/config: `Integration` + optional provider metadata.
2. Sellable/runtime services: `CourierService`.

## 6.2 Minimum required fields per CourierService

1. `provider`
2. `serviceCode` + optional provider service id
3. `displayName`
4. `serviceType`
5. `constraints` (weight/value/payment modes)
6. `sla` (EDD)
7. `zoneSupport`
8. `status`

## 6.3 Seller policy behavior

Policy entity: `SellerCourierPolicy`

Supported modes:
1. `manual_with_recommendation` (default)
2. `manual_only`
3. `auto`

Auto priority:
1. `price`
2. `speed`
3. `balanced` (fastest within configured delta, default 5%)

---

## 7. Legacy Cleanup and Deletion Map

This is the exact cleanup scope for final version.

## 7.1 Remove from runtime first

1. Legacy path in `order.routes.ts` for `/orders/courier-rates` fallback and `/orders/:orderId/ship` fallback.
2. Legacy ratecard runtime controller usage from seller shipping flow.

## 7.2 Remove legacy pricing stack after cutover tests pass

Target files to retire or isolate from shipping runtime:
- `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model.ts`
- `server/src/presentation/http/controllers/shipping/ratecard.controller.ts`
- `server/src/presentation/http/routes/v1/shipping/ratecard.routes.ts`
- `server/src/core/application/services/pricing/pricing-orchestrator.service.ts` (if only legacy path uses it)
- `server/src/core/application/services/pricing/rate-card-selector.service.ts` (legacy selection path)

## 7.3 Courier-side legacy retirement

After admin and seller UIs are fully service-level:
- reduce `shipping/courier.model.ts` usage to provider metadata only or retire it.
- retire duplicate provider-management endpoints that duplicate `CourierService` admin function.

---

## 8. Refactor Execution Order (Safe and Complete)

## Phase 1: Canonical pricing formula service

1. Build one formula service that consumes `ServiceRateCard` and returns full cost breakdown.
2. Rewire:
   - quote engine
   - service-ratecard simulate endpoint
   - booking snapshot generation

## Phase 2: Contract lock

1. Make `/quotes/courier-options` canonical quote endpoint.
2. Make `book-from-quote` mandatory for order shipping path.
3. Keep explicit statuses:
   - expired session: `410`
   - invalid option/session mismatch: `422`

## Phase 3: Legacy route cutover

1. Remove legacy fallback branches in order shipping routes.
2. Keep temporary alias route only if frontend migration still in progress.

## Phase 4: Legacy model/service retirement

1. Remove legacy `RateCard` runtime references.
2. Remove dead services/controllers/routes.
3. Run dead-import verification and compile checks.

## Phase 5: Hard verification and signoff

1. Seed + migration verification.
2. Integration tests for quote/book/reconcile.
3. Manual smoke for admin create/update + seller quote/select/book.

---

## 9. Verification Matrix (Final Sprint Exit Criteria)

All must pass before declaring final architecture complete.

1. No duplicate index warnings at boot/test.
2. Quote API returns multi-option output with confidence/providerTimeouts.
3. Booking from quote locks dual-ledger snapshot into shipment.
4. Session expiry returns 410.
5. Invalid option/session mismatch returns 422.
6. Reconciliation import:
   - <=5% -> auto resolved
   - >5% -> open variance case
7. Feature flag OFF legacy regression no longer required after full cutover.
8. No shipping runtime references to legacy `RateCard` stack.

---

## 10. Final Architecture Decision Summary

1. Direction is correct.
2. New service-level foundation is real and already working.
3. Remaining work is cleanup, formula hardening, and ownership consolidation.
4. Do not redesign again; execute consolidation and deletion with strict verification.

---

## 11. Immediate Next Actions (Implementation)

1. Create a dedicated `ServiceRateCardFormulaService` and migrate quote/simulate math to it.
2. Remove legacy fallback paths from `order.routes.ts` once frontend quote-book path is confirmed.
3. Mark legacy `RateCard` controller/routes deprecated and remove runtime imports.
4. Finalize admin workflow to manage only service-level cards and policies.
5. Run full verification matrix and freeze architecture.

---

## 12. Seven Competitive Differentiators - Implementation Status

This section tracks the implementation status of recommended competitive advantages vs BlueShip and similar platforms.

### 12.1 Intent-Based Setup (Guided Outcome-First Onboarding)

**Target State:**
- Replace field-heavy raw forms with business-intent wizard
- Presets like: "COD-heavy, low-RTO, fast metro delivery"
- Auto-generate starter services + ratecards + policies from intent

**Current Status:** ❌ **NOT IMPLEMENTED**

**Evidence:**
- Admin UI in `client/app/admin/couriers/services/components/ServicesClient.tsx:42` is form-driven
- No wizard or preset-based setup flow exists
- Services/ratecards/policies entered as raw technical fields

**Implementation Gap:**
- [ ] Design intent taxonomy (COD-heavy, metro-focused, margin-protect, etc.)
- [ ] Build wizard UI component
- [ ] Create backend preset templates
- [ ] Auto-generation logic for services + cards + policies from intent
- [ ] A/B test adoption rates vs raw form approach

**Priority:** Medium (UX improvement, not blocking)

---

### 12.2 Unified Pricing Studio (Cost + Sell in Business-Friendly UX)

**Target State:**
- Keep dual-ledger (`cost`/`sell`) internally
- UI shows one studio with side-by-side tabs + live margin preview
- Formula explanation pane for transparency
- Publish workflow with approval gates

**Current Status:** ⚠️ **PARTIAL (60% complete)**

**Evidence:**
- ✅ Dual card model exists (`cost`/`sell`) in `service-rate-card.model.ts:181`
- ✅ UI hooks exist in `client/src/core/api/hooks/admin/couriers/useServiceRateCards.ts:1`
- ✅ Simulate endpoint exists in `service-ratecard.controller.ts:180`
- ❌ No unified "studio" view with live margin preview
- ❌ No publish approval workflow (fields exist: `approvedBy/approvedAt`, workflow doesn't)
- ❌ No formula explanation for business users

**Implementation Gap:**
- [ ] Build unified studio UI component (cost tab, sell tab, margin preview panel)
- [ ] Add real-time margin calculation on input change
- [ ] Implement maker-checker approval workflow for publish
- [ ] Add formula breakdown explanation UI
- [ ] Version comparison view (compare current vs proposed card)

**Priority:** High (core value prop for admin experience)

---

### 12.3 Explainable Quote Engine ("Why Recommended")

**Target State:**
- Every quote option shows structured explanation:
  - Price rank reason
  - ETA confidence source
  - Margin impact
  - Risk flags (timeout/fallback/serviceability uncertainty)
- Transparent fallback trail (live failed → hybrid → table)

**Current Status:** ⚠️ **PARTIAL-STRONG (75% complete)**

**Evidence:**
- ✅ Quote carries margin, confidence, ranking in `quote-engine.service.ts:240`
- ✅ Tags exist: `CHEAPEST`, `FASTEST`, `RECOMMENDED` (line 867)
- ✅ Provider timeout tracked in `providerTimeouts` (line 256)
- ⚠️ Confidence levels exist but no structured reason object
- ❌ No explicit fallback trail in API response (live → table path not exposed)

**Implementation Gap:**
- [ ] Add `explanation` object per quote option:
  ```typescript
  explanation: {
    recommendationReason: string, // "Fastest within 5% of cheapest"
    pricingSource: "live" | "table" | "hybrid",
    fallbackReason?: string, // "Provider timeout, used table rate"
    confidenceFactors: string[], // ["lane-level zone", "recent rate update"]
    riskFlags: string[] // ["high variance history", "provider instability"]
  }
  ```
- [ ] Expose fallback chain in response
- [ ] Add UI component to display explanation

**Priority:** High (transparency builds trust, reduces support load)

---

### 12.4 Policy-Driven Automation (Seller Autopilot Presets)

**Target State:**
- Business-friendly policy presets:
  - "Margin Protect" (never book below X% margin)
  - "Fastest under X days"
  - "Cheapest under Y% risk"
  - "Preferred providers only"
- Risk-aware policy dimensions (uncertainty ceiling)
- One-click preset library

**Current Status:** ⚠️ **PARTIAL (50% complete)**

**Evidence:**
- ✅ Policy engine supports `selectionMode`, `autoPriority`, `balancedDeltaPercent` in `schemas.ts:359`
- ✅ Runtime filtering/recommendation in `quote-engine.service.ts:385`
- ❌ No preset library or one-click assignment
- ❌ No risk-awareness in policy (e.g., confidence ceiling)
- ❌ No margin floor enforcement

**Implementation Gap:**
- [ ] Define preset taxonomy with business names
- [ ] Build preset library backend (seed data)
- [ ] Add risk/margin constraints to policy model:
  ```typescript
  constraints: {
    minMarginPercent?: number,
    maxConfidenceLevel?: "low" | "medium" | "high",
    maxVarianceHistoryPercent?: number
  }
  ```
- [ ] Enforce constraints in quote engine
- [ ] UI for preset selection + customization

**Priority:** Medium (powerful for advanced users, not essential for launch)

---

### 12.5 Reliability-First Booking Orchestration

**Target State:**
- Resilient booking with:
  - Idempotent booking keys ✅
  - Retry with backoff
  - Provider circuit breakers
  - **Automatic fallback to next-ranked option BEFORE AWB**
- Safe fallback boundary (only pre-AWB, never post-AWB)

**Current Status:** ⚠️ **MOSTLY IMPLEMENTED (80% complete), ONE MAJOR GAP**

**Evidence:**
- ✅ Idempotent booking key in `book-from-quote.service.ts:75`
- ✅ Immutable compensation states (`booking_failed`, `booking_partial`) in line 210
- ✅ Provider retries/circuit breakers in adapters (e.g., `velocity-shipfast.provider.ts:81`)
- ❌ **NO automatic fallback to next option when first provider fails BEFORE AWB**

**Implementation Gap:**
- [ ] Add fallback orchestration to `BookFromQuoteService`:
  ```typescript
  async executeWithFallback(input: BookFromQuoteInput) {
    const { session, option } = await getSelectedOption(...);
    const rankedOptions = session.options.sort((a, b) => b.rankScore - a.rankScore);

    for (const option of rankedOptions) {
      try {
        return await this.attemptBooking(option);
      } catch (error) {
        if (hasAWB(error)) throw error; // Never fallback after AWB
        logger.warn(`Booking failed for ${option.provider}, trying next option`);
        continue;
      }
    }
    throw new Error("All providers failed");
  }
  ```
- [ ] Define safe fallback policy (max attempts, timeout budget)
- [ ] Metrics: track fallback success rate

**Priority:** HIGH (critical for production booking success rate)

---

### 12.6 Continuous Cost Drift + Margin Watch

**Target State:**
- Real-time reconciliation intelligence:
  - Variance heatmap by provider/lane/weight slab
  - Automated alerts when drift crosses threshold
  - Suggested card adjustments (not auto-apply)
- Proactive margin protection, not reactive invoice shock

**Current Status:** ⚠️ **PARTIAL (40% complete)**

**Evidence:**
- ✅ Billing import + variance evaluation in `carrier-billing-reconciliation.service.ts:52`
- ✅ Auto-close (`<= 5%`) and open case (`> 5%`) in line 154
- ❌ No drift heatmaps
- ❌ No automated operational alerts
- ❌ No suggested card adjustment engine

**Implementation Gap:**
- [ ] Build variance analytics aggregation:
  ```typescript
  interface VarianceDriftReport {
    provider: string;
    lane: { from: string; to: string };
    weightSlab: { min: number; max: number };
    avgVariancePercent: number;
    sampleSize: number;
    trendDirection: "increasing" | "stable" | "decreasing";
  }
  ```
- [ ] Scheduled job: daily drift analysis
- [ ] Alert engine: Slack/email when drift > threshold for X consecutive days
- [ ] Recommendation engine: "Cost card Zone A slab 0-1kg is 15% below billed average → suggest increase to ₹Y"

**Priority:** Medium (powerful for finance, not blocking launch)

---

### 12.7 Enterprise Security + Change Governance

**Target State:**
- Maker-checker approval for ratecard publish
- Signed versioned ratecard releases
- Strict RBAC for pricing edits
- Immutable audit logs for quote/price/policy changes
- Webhook signature enforcement + secret rotation

**Current Status:** ⚠️ **PARTIAL (55% complete)**

**Evidence:**
- ✅ RBAC middleware (`requireAccess`) widely used
- ✅ Webhook signature verification in `webhook-signature.middleware.ts:21`
- ✅ `ServiceRateCard` has `approvedBy/approvedAt` fields (line 168 in model)
- ❌ No maker-checker workflow implementation
- ❌ No signed/versioned release process
- ❌ No secret rotation workflow

**Implementation Gap:**
- [ ] Maker-checker workflow:
  ```typescript
  // Add to ServiceRateCard
  publishStatus: "draft" | "pending_approval" | "approved" | "published";
  submittedBy?: ObjectId;
  submittedAt?: Date;
  approvalNotes?: string;
  ```
- [ ] Approval UI for admins
- [ ] Versioned publish: increment `version` on approve, keep history
- [ ] Secret rotation API for webhook signatures
- [ ] Immutable audit log service (append-only)

**Priority:** Medium-High (required for enterprise clients, not immediate)

---

## 13. Implementation Status Summary Matrix

| Differentiator | Status | Completion % | Priority | Blocking Launch? |
|----------------|--------|--------------|----------|------------------|
| 1. Intent-Based Setup | ❌ Not Started | 0% | Medium | No |
| 2. Unified Pricing Studio | ⚠️ Partial | 60% | High | No |
| 3. Explainable Quotes | ⚠️ Partial-Strong | 75% | High | No |
| 4. Policy Autopilot | ⚠️ Partial | 50% | Medium | No |
| 5. Booking Orchestration | ⚠️ Mostly Done | 80% | **HIGH** | **YES** (fallback critical) |
| 6. Margin Watch | ⚠️ Partial | 40% | Medium | No |
| 7. Enterprise Security | ⚠️ Partial | 55% | Medium-High | No |

**Critical Path for Launch:**
1. **#5 Booking Orchestration Fallback** (pre-AWB retry) - MUST HAVE
2. **#2 Unified Pricing Studio** margin preview - SHOULD HAVE (admin experience)
3. **#3 Explainable Quotes** reason object - SHOULD HAVE (trust/transparency)

**Post-Launch Roadmap:**
- Sprint 1-2: Complete #5, #2, #3
- Sprint 3-4: Enterprise security (#7) for B2B clients
- Sprint 5-6: Policy autopilot (#4) + margin watch (#6)
- Sprint 7+: Intent-based setup (#1) as UX polish

---

## 14. Honest Reality Check

Your pasted "enhanced architecture" description is **aspirational** in parts. Here's what's actually true today:

### What's Working (Verified in Code)
✅ Service-level pricing foundation (models, services, APIs)
✅ Quote → Book → Reconcile lifecycle functional
✅ Dual-ledger cost/sell separation
✅ Provider timeout handling with partial results
✅ Variance auto-close within threshold
✅ Compensation saga (pre-AWB vs post-AWB)
✅ Integration tests passing

### What's Still Legacy (Bridge Mode)
⚠️ Legacy route fallbacks active (`order.routes.ts:143`, `order.routes.ts:291`)
⚠️ Dual model ownership (Courier vs CourierService, RateCard vs ServiceRateCard)
⚠️ Legacy pricing services still in codebase (not deleted yet)

### What's Missing (Gaps vs Blueprint)
❌ Centralized formula engine (COD/fuel/RTO/GST not fully integrated)
❌ Volumetric weight not enforced end-to-end
❌ Automatic booking fallback orchestration
❌ Drift heatmaps and margin watch alerts
❌ Maker-checker approval workflow
❌ Intent-based wizard setup

---

## 15. 90-Day Execution Roadmap

If you want to **complete this blueprint**, here's the strict execution plan:

### Sprint 1-2 (Weeks 1-4): Critical Path + Launch Blockers

**Week 1-2:**
- [ ] Build `ServiceRateCardFormulaService` (centralized pricing formula)
  - Input: service card, weight, zone, payment mode, order value
  - Output: full breakdown (base + weight + COD + fuel + GST)
- [ ] Migrate `QuoteEngineService.resolveCost/resolveSell` to use formula service
- [ ] Migrate `service-ratecard.controller.ts:simulate` to use formula service
- [ ] Add volumetric weight calculation to formula service
- [ ] **Test: All integration tests pass with formula service**

**Week 3-4:**
- [ ] Implement booking fallback orchestration in `BookFromQuoteService`
  - Safe boundary: only fallback pre-AWB
  - Try next-ranked option on first failure
  - Track fallback metrics
- [ ] Add fallback integration tests
- [ ] **Gate: Booking success rate ≥ 95% in staging**

### Sprint 3-4 (Weeks 5-8): Admin UX + Transparency

**Week 5-6:**
- [ ] Build unified pricing studio UI component
  - Cost tab, Sell tab, Margin preview panel
  - Real-time calculation on input change
  - Formula breakdown display
- [ ] Implement maker-checker approval workflow
  - Add approval queue UI
  - Email notifications for pending approvals
- [ ] **Test: Admin can create, preview, submit, approve, publish card**

**Week 7-8:**
- [ ] Add quote explanation object to API response
- [ ] Build explanation display UI component for sellers
- [ ] Add fallback trail to response (live → table path)
- [ ] **Test: Seller sees clear "why recommended" reason**

### Sprint 5-6 (Weeks 9-12): Legacy Cleanup

**Week 9-10:**
- [ ] Remove legacy fallback from `order.routes.ts` (lines 143-186, 291-314)
- [ ] Remove feature flag `enable_service_level_pricing` (always ON)
- [ ] Delete legacy services:
  - `pricing-orchestrator.service.ts`
  - `dynamic-pricing.service.ts`
  - `rate-card-selector.service.ts`
- [ ] Delete legacy models/controllers:
  - `rate-card.model.ts`
  - `ratecard.controller.ts`
  - `ratecard.routes.ts`
- [ ] **Gate: Build passes, no dead imports, all tests green**

**Week 11-12:**
- [ ] Run full verification matrix (Section 9)
- [ ] Seed verification: all companies have complete service-level setup
- [ ] Performance testing: quote latency p95 < 2s
- [ ] **FREEZE ARCHITECTURE - No more redesigns**

### Post-Sprint (Weeks 13+): Enhancements

**Sprint 7-8:**
- [ ] Policy autopilot presets (margin protect, fastest under X days)
- [ ] Risk-aware constraints (min margin %, max confidence level)

**Sprint 9-10:**
- [ ] Variance drift heatmaps
- [ ] Automated drift alerts (Slack/email)
- [ ] Suggested card adjustment recommendations

**Sprint 11-12:**
- [ ] Intent-based setup wizard
- [ ] Preset templates library
- [ ] A/B test wizard vs raw forms

---

## 16. Acceptance Criteria Per Phase

### Phase 1 (Formula Service)
- [ ] All quote options use centralized formula
- [ ] COD/fuel/RTO/GST applied per card rules
- [ ] Volumetric weight calculation matches provider standards
- [ ] Simulate endpoint returns identical results to quote runtime
- [ ] Integration tests: 100% pass

### Phase 2 (Contract Lock)
- [ ] `/quotes/courier-options` is only quote endpoint
- [ ] `book-from-quote` is only booking path
- [ ] Session expiry → 410 (verified in test)
- [ ] Invalid optionId → 422 (verified in test)
- [ ] Booking fallback works pre-AWB (verified in test)

### Phase 3 (Legacy Cutover)
- [ ] No legacy fallback in `order.routes.ts`
- [ ] Feature flag removed from codebase
- [ ] Backward compatibility: legacy client gets migration guide

### Phase 4 (Legacy Deletion)
- [ ] `rg "RateCard\\.find|PricingOrchestratorService"` → 0 matches
- [ ] `npm run build` passes with 0 TypeScript errors
- [ ] All integration tests green

### Phase 5 (Final Verification)
- [ ] Seed verifier: `verify:service-level-pricing-seed` passes
- [ ] Migration hygiene: `migrate:service-level-pricing-index-hygiene` passes
- [ ] Quote generation: p95 latency < 2s, success rate > 98%
- [ ] Booking: success rate > 95%, compensation saga works
- [ ] Reconciliation: ≤5% auto-close, >5% open case
- [ ] Manual smoke: admin creates service + cards, seller quotes + books

---

This is your **true, honest, verified implementation status** and **realistic execution plan**.
