# ShipCrowd Legacy Decommission and Full Migration Runbook

**Document Owner:** Shipping Platform Team
**Last Updated:** February 11, 2026
**Status:** Execution-ready planning document for full legacy retirement
**Environment Assumption:** Development-first (no production users, seeded/local data)

---

## Related Documents

1. **Blueprint (READ FIRST)**: [Courier_RateCard_Final_Refactor_Blueprint.md](./Courier_RateCard_Final_Refactor_Blueprint.md)
   - Target architecture and competitive differentiators
   - Implementation status matrix
   - 90-day execution roadmap
2. **Architecture Guide**: [Service_Level_Pricing_and_Order_Shipment_Architecture_Guide.md](./Service_Level_Pricing_and_Order_Shipment_Architecture_Guide.md)
   - Runtime implementation details
   - End-to-end operational flows
3. **Legacy Deletion Readiness Map**: [Legacy_Deletion_Readiness_Map.md](./Legacy_Deletion_Readiness_Map.md)
   - Decision-complete dependency map and staged deletion order
4. **Migration Artifacts**: [migration-artifacts/](./migration-artifacts/)
   - Reality-check snapshots and verified inventory used for execution gating

---

## ✅ CRITICAL: Blueprint Alignment and Current Execution State

This runbook is now in **stabilized execution mode** after Phase 1-2 completion on branch `codex/feature/service-level-pricing` at commit `95011a33`.

**Prerequisites (Blueprint Phase 1-2) are complete**:
1. ✅ **Centralized Formula Service** implemented (`ServiceRateCardFormulaService`)
   - Quote engine, simulate endpoint, and pricing breakdowns use unified formula contracts.
2. ✅ **Booking Fallback Orchestration** implemented
   - Pre-AWB fallback retries with metrics and attempt metadata are active.
3. ✅ **Contract Lock for Orders Quote/Ship APIs** implemented
   - `GET /api/v1/orders/courier-rates` returns canonical quote-session response.
   - `POST /api/v1/orders/:orderId/ship` requires `sessionId` and `optionId` (422 on missing fields).

**Current Status**:
- Service-level foundation: ✅ Complete
- Formula engine centralized: ✅ Complete
- Booking fallback: ✅ Complete
- Order quote/ship bridge removed: ✅ Complete
- Legacy module deletion: ⚠️ Pending dependency-driven cleanup (next phase)

Proceed with **Phase 3 deletion readiness and controlled decommission**, not broad architecture changes.

---

## 1. Why this document exists

This runbook explains how to migrate ShipCrowd from mixed legacy + new service-level pricing architecture to a fully decommissioned state where:

1. Only the new service-level pricing and quote-session booking architecture is active.
2. Legacy pricing bridges and duplicate code paths are removed.
3. Redundant, orphaned, and over-engineered code is deleted.
4. Shipping and finance behavior remain deterministic and testable.

This is not a generic architecture note. It is a deletion and migration playbook with sequencing, acceptance criteria, and rollback-safe checkpoints.

---

## 2. Current reality snapshot (what is already done)

As of this branch (`codex/feature/service-level-pricing`), the following has already been implemented:

### 2.1 Service-level domain is live in code

New models exist and are exported:

- `CourierService`
- `ServiceRateCard`
- `SellerCourierPolicy`
- `QuoteSession`
- `CarrierBillingRecord`
- `PricingVarianceCase`

Reference:
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/src/infrastructure/database/mongoose/models/index.ts`

### 2.2 Core new workflows exist

- Quote generation: `QuoteEngineService.generateQuotes(...)`
- Quote selection/locking: `QuoteEngineService.selectOption(...)`
- Book-from-quote: `BookFromQuoteService.execute(...)`
- Reconciliation import and variance case lifecycle: `CarrierBillingReconciliationService.importRecords(...)`

References:
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/src/core/application/services/pricing/quote-engine.service.ts`
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/src/core/application/services/shipping/book-from-quote.service.ts`
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/src/core/application/services/finance/carrier-billing-reconciliation.service.ts`

### 2.3 Order quote/ship bridge has been removed

Order runtime now uses service-level contract directly:

- `GET /api/v1/orders/courier-rates` returns canonical quote-session payload.
- `POST /api/v1/orders/:orderId/ship` is quote-session booking only.

No legacy fallback branch remains in `order.routes.ts`.

Reference:
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/src/presentation/http/routes/v1/shipping/order.routes.ts`

### 2.4 Current cleanup already applied

- Index hygiene migration command exists: `service-level-pricing-index-hygiene`
- Seed verifier exists: `verify:service-level-pricing-seed`
- Focused integration tests pass for quote/book/reconciliation critical path

References:
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/src/infrastructure/database/migrations/runner.ts`
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/scripts/verification/verify-service-level-pricing-seed.ts`
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/tests/integration/services/pricing/service-level-pricing-api.integration.test.ts`
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/tests/integration/services/pricing/service-level-pricing-flow.integration.test.ts`

### 2.5 Critical Implementation Details (Verified from Codebase)

**Provider Timeout Configuration** (`quote-engine.service.ts`, lines 44-48):
- Ekart: 2000ms (uses lane-level serviceability API)
- Delhivery: 1500ms (pincode-based)
- Velocity: 1500ms (pincode-based)

**Quote Session TTL**: 30 minutes (line 253 in `quote-engine.service.ts`)

**Compensation Behavior** (`book-from-quote.service.ts`, lines 210-239):
- Before AWB generation → status: `booking_failed`, refund wallet
- After AWB generation → status: `booking_partial`, refund wallet + keep shipment immutable

**Variance Auto-Resolution** (`carrier-billing-reconciliation.service.ts`, lines 154-206):
- `abs(variancePercent) <= 5%` → Auto-close with status `resolved`
- `abs(variancePercent) > 5%` → Keep open for manual review

**Ranking Weights** (`quote-engine.service.ts`, line 874):
- Price rank: 60%
- Speed rank: 40%

**Balanced Recommendation Logic** (lines 896-901):
- Default `balancedDeltaPercent`: 5%
- If fastest option costs ≤ (cheapest × 1.05), recommend fastest
- Otherwise recommend cheapest

---

## 3. Final end-state definition (no legacy left)

After full migration/decommission, these must be true:

1. Quote generation happens only via service-level architecture.
2. Booking happens only from quote session selection (`sessionId`, `optionId`).
3. Shipment pricing snapshot always contains selected quote dual-ledger fields.
4. Reconciliation always compares billed cost against expected service-level cost snapshot.
5. Legacy pricing services/controllers/routes are removed or converted to thin wrappers around new flow.
6. No duplicate data model ownership for pricing logic.
7. No dead scripts, orphaned routes, or unused legacy DTOs remain.

---

## 4. Decommission principles

### 4.1 Keep or delete decision rule

Delete a component only if all are true:

1. No route calls it directly.
2. No service imports it.
3. No test relies on it for current target behavior.
4. Equivalent behavior exists in the new architecture.

### 4.2 Do not preserve duplicate logic

If both legacy and new implementations compute the same concept (for example quote ranking), keep only one canonical implementation.

### 4.3 No "soft legacy" in hidden code

Deprecated code must not remain as commented blocks, unused helpers, or hidden fallback branches unless explicitly marked as temporary and tracked by checklist item with owner/date.

### 4.4 Deterministic behavior over feature breadth

Prioritize one clean path that is predictable over many fallback branches that are hard to reason about.

---

## 5. Legacy inventory and deletion candidates

This is the practical backlog for deletion, grouped by dependency risk.

## 5.1 High confidence legacy candidates (post-contract-lock)

1. Legacy rate-calculation controller path for seller/admin legacy ratecard APIs.
2. Legacy pricing orchestration path and its dependent dynamic pricing stack.
3. Legacy `RateCard` model and all dependent onboarding/seeding/admin flows.

Primary candidates:
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/src/presentation/http/routes/v1/shipping/order.routes.ts`
  - **Status:** ✅ Already cut over to canonical quote/book contract
  - **Removed:** legacy `/courier-rates` transform and legacy `/ship` fallback branch
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/src/presentation/http/controllers/shipping/ratecard.controller.ts`
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/src/core/application/services/pricing/pricing-orchestrator.service.ts` (189 lines)
  - **Current usage**: Called by legacy `shipmentController.createShipment` when feature flag OFF
  - **Depends on**: `RateCardSelectorService`, `DynamicPricingService`, legacy `RateCard` model
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/src/core/application/services/pricing/dynamic-pricing.service.ts` (24.3KB)
  - **Purpose**: Core legacy pricing calculation with weight slabs, zone lookup, GST, COD
  - **Fallback logic**: Hardcoded rates (50 base + 20/kg) when RateCard missing (line 129-150 in orchestrator)
- `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server/src/core/application/services/pricing/rate-card-selector.service.ts` (6.4KB)
  - **Selection priority**: Customer override → Group override → Time-bound promotion → Company default
- Legacy `RateCard` model at `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model.ts`
  - **NOTE**: Separate from `ServiceRateCard` - both coexist currently

## 5.2 Medium risk candidates (next deletion wave)

1. `RateCard`-centric admin flows.
2. Legacy simulator/import endpoints that overlap service-ratecard equivalents.
3. Client hooks/pages still expecting legacy shaped rate rows.
   - **Action required**: Continue replacing legacy assumptions with canonical quote-session mapping.
   - **Contract now active**: `sessionId`, `optionId`, `expiresAt`, `recommendation`, `isRecommended`, breakdown fields.
   - **Bridge transform status**: ✅ Removed from `order.routes.ts`.

## 5.3 Low risk cleanup candidates

1. Obsolete debug scripts (already deleted):
   - ~~`server/src/scripts/check-shipments.ts`~~
   - ~~`server/src/scripts/debug-sellers.ts`~~
   - ~~`server/src/scripts/debug-shipments-v2.ts`~~
   - ~~`server/src/scripts/seed-admin-users.ts`~~
   - ~~`server/src/scripts/verify-ekart-logging.ts`~~
   - ~~`server/src/scripts/verify-user-debug.ts`~~
   - **Status**: Already removed per git status

2. Orphan utility helpers not referenced by any route/service/test.
   - **Action**: Run `rg -n "import.*from.*<module-name>"` before deleting any utility

3. Duplicate constants/configs superseded by service-level equivalents.
   - **Verify**: `SUPPORTED_PROVIDERS` array exists in `quote-engine.service.ts` (line 36)
   - **Verify**: `PROVIDER_TO_FACTORY_KEY` mapping (lines 38-42)
   - Search for duplicate provider mappings in legacy code

---

## 6. Full migration strategy (phased)

This sequence is strict. Do not reorder.

## Phase 0: Baseline and freeze

### Objective
Freeze current state and make cleanup measurable.

### Actions

1. Create migration branch dedicated to decommission.
2. Capture baseline inventory:
   - route map
   - imports map
   - test baseline
3. Capture baseline command outputs:
   - `npm test --prefix server -- tests/integration/services/pricing/service-level-pricing-api.integration.test.ts tests/integration/services/pricing/service-level-pricing-flow.integration.test.ts`
   - `npm run migrate:service-level-pricing-index-hygiene --prefix server`
   - `npm run verify:service-level-pricing-seed --prefix server`

### Exit criteria

1. Baseline snapshots stored in PR notes.
2. Known unrelated TypeScript failures documented as out-of-scope.

---

## Phase 1: Contract lock (API and payload canonicalization)

### Objective
Lock canonical contracts so consumers cannot regress to legacy assumptions.

### Canonical contracts

1. Quote generation response:
   - `sessionId`
   - `options[]`
   - `recommendation`
   - `expiresAt`
   - `confidence`
   - `providerTimeouts`
2. Booking request (new flow):
   - `sessionId`
   - `optionId`
3. Booking error semantics:
   - expired quote: `410`
   - invalid option/session mismatch: `422`

### Actions

1. Ensure all client code uses quote-session booking payloads.
2. Add tests for negative path invariants.
3. Remove frontend reliance on transformed legacy fields (`courierId`, `rate`, etc.) when source is service-level.

### Exit criteria

1. No active UI path requires legacy quote response shape.
2. API tests enforce status code behavior.

---

## Phase 2: Runtime cutover (feature flag to mandatory new flow)

### Objective
Make new architecture the only runtime path.

### Actions

1. Remove conditional bridge logic from `order.routes.ts`.
2. Route `GET /orders/courier-rates` to either:
   - deprecate and remove, or
   - convert to direct adapter over `QuoteEngineService.generateQuotes` with canonical response shape.
3. Route `POST /orders/:orderId/ship` to quote-based booking only.
4. Remove fallback to `shipmentController.createShipment` for seller shipping path.

### Critical decision

Pick one:

1. Strict API break: remove legacy endpoints entirely.
2. Compatibility alias: keep URL, but enforce new request contract.

Given your requirement (complete cleanup), prefer option 1 unless an external client requires URL continuity.

### Detailed Bridge Logic to Remove

**In `order.routes.ts` lines 143-186** (`GET /courier-rates`):
```javascript
// Current bridge logic:
const featureEnabled = await isFeatureEnabled(req, 'enable_service_level_pricing', false);
if (featureEnabled) {
  // New path: QuoteEngineService.generateQuotes()
  // Then: toLegacyRateRows(quoteResult) for backward compatibility
} else {
  // Legacy path: ratecardController.calculateRate()
}
```

**Action**: Remove `else` block, remove `toLegacyRateRows` transform, return canonical quote response directly.

**In `order.routes.ts` lines 285-315** (`POST /ship`):
```javascript
// Current bridge logic:
const featureEnabled = await isFeatureEnabled(req, 'enable_service_level_pricing', false);
if (featureEnabled && req.body.sessionId) {
  // Validate optionId present (422 if missing)
  // Call: shipmentController.bookFromQuote()
} else {
  // Legacy path: shipmentController.createShipment()
}
```

**Action**: Remove `else` block, require `sessionId` + `optionId` in all requests, make feature flag check obsolete.

### Exit criteria

1. Flag is no longer needed for primary shipping flow.
2. New flow is default and mandatory.
3. `isFeatureEnabled` calls removed from `order.routes.ts`.
4. Legacy `ratecardController.calculateRate` no longer called from `/courier-rates` endpoint.

---

## Phase 3: Data model enforcement

### Objective
Make shipment and reconciliation data structurally dependent on new model.

### Actions

1. Enforce `pricingDetails.selectedQuote` presence for all newly created shipments.
2. Enforce dual-ledger fields for book-from-quote path:
   - `quotedSellAmount`
   - `expectedCostAmount`
   - `expectedMarginAmount`
   - `expectedMarginPercent`
3. Optional migration for historical dev data:
   - mark old shipments as `legacyPricing: true` in metadata (if retained)

### Exit criteria

1. No new shipment can be created without selected quote snapshot.
2. Reconciliation never falls back to non-service-level expected cost for new shipments.

---

## Phase 4: Delete legacy pricing stack

### Objective
Physically remove old pricing code paths.

### Deletion order

1. Delete legacy route branches from `order.routes.ts`.
2. Remove legacy quote/rate endpoint tests.
3. Remove legacy pricing service consumers.
4. Delete legacy pricing services once no imports remain.
5. Remove legacy `RateCard` usage from shipping flow.

### Required command checks between each wave

1. `rg -n "dynamic-pricing|rate-card-selector|pricing-orchestrator|calculateRate" server/src`
   - **Expected before cleanup**: 28+ matches across services
   - **Expected after cleanup**: 0 matches
2. `rg -n "courier-rates" client server/src`
   - **Expected**: Matches only in new quote routes, none in legacy controllers
3. `rg -n "PricingOrchestratorService|DynamicPricingService|RateCardSelectorService" server/src`
   - **Expected after cleanup**: 0 imports (class definitions can remain for reference if documented)
4. Focused integration suite run:
   ```bash
   npm test --prefix server -- tests/integration/services/pricing/service-level-pricing-api.integration.test.ts tests/integration/services/pricing/service-level-pricing-flow.integration.test.ts
   ```

### Exit criteria

1. No imports remain for deleted services.
2. No route references legacy pricing methods.
3. Feature flag `enable_service_level_pricing` can be removed (always-on behavior).
4. Bridge functions `normalizeLegacyRateRequestBody` and `toLegacyRateRows` can be deleted.

### Known Remaining Work After Phase 4

**Shipment Model Concurrency Issue** (not blocking for decommission):
- Location: `server/src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model.ts` (lines 10-15 comment)
- Issue: Carrier webhooks firing simultaneously can overwrite updates
- Fix: Enable optimistic locking with version field checks in `findOneAndUpdate`
- Status: Pre-save hook has `optimisticConcurrency: true` but save() calls still risky

---

## Phase 5: Delete legacy admin/UI surfaces

### Objective
Remove legacy admin ratecard artifacts and align UI to service-level entities only.

### Actions

1. Remove legacy admin pages/hooks for old `RateCard` if superseded.
2. Keep only:
   - Courier Service admin
   - Service RateCard admin
   - Seller Courier Policy admin
3. Update navigation/menu/constants to remove legacy entries.

### Exit criteria

1. Admin UI has one pricing source of truth.
2. No stale page link returns 404/hidden legacy screens.

---

## Phase 6: Clean database artifacts and scripts

### Objective
Remove schema/index and script leftovers tied to legacy behavior.

### Actions

1. Run index hygiene after each schema cleanup wave.
2. Drop legacy-only indexes/collections if no longer used.
3. Delete obsolete debug/seed scripts that target removed legacy path.
4. Keep only migration commands relevant to active architecture.

### Recommended commands

1. `npm run migrate:service-level-pricing-index-hygiene --prefix server`
2. `npm run verify:service-level-pricing-seed --prefix server`
3. `npm run seed:clean --prefix server`
4. `npm run seed:full --prefix server`

### Exit criteria

1. No duplicate index warnings at boot/test.
2. Fresh seed runs produce immediately usable service-level system.

---

## Phase 7: Verification gate (must pass)

This gate is mandatory before merging decommission PR.

### API/Integration

1. Quote generation success with multiple providers.
2. Partial results when one provider times out.
3. Quote session expiry -> `410`.
4. Invalid option/session -> `422`.
5. Book from valid quote session succeeds.
6. Compensation behavior:
   - pre-AWB -> `booking_failed`
   - post-AWB -> `booking_partial`
7. Reconciliation:
   - `<=5%` -> auto-resolved case
   - `>5%` -> open case

### Data integrity

1. Seed verifier passes.
2. No dangling `ServiceRateCard.serviceId` references.
3. Shipment pricing snapshots include selected quote details.

### Static cleanup

1. `rg` shows no dead imports for removed modules.
2. No orphan routes or controller exports.

---

## Phase 8: Documentation and final closure

### Objective
Ensure future maintainers do not reintroduce legacy architecture.

### Actions

1. Update shipping architecture docs to remove mention of legacy fallback.
2. Add ADR note: "Service-level pricing is canonical; legacy pricing removed."
3. Add a lint/check script in CI to fail if deprecated modules are reintroduced.

### Exit criteria

1. Docs and code agree.
2. No contradiction between route behavior and architecture docs.

---

## 7. Practical deletion checklist template

Use this table for each deletion wave.

| Item | Type | Owner | Evidence before delete | Evidence after delete | Done |
|---|---|---|---|---|---|
| Remove legacy quote bridge | Route |  | API test green | No legacy branch in route |  |
| Remove dynamic pricing service consumer | Service |  | `rg` import references | No import references |  |
| Remove legacy admin ratecard page | UI |  | Route exists | Nav + route removed |  |

---

## 8. Anti-regression guardrails

1. Keep focused integration tests as non-optional CI stage.
2. Add one smoke test that books shipment only with quote session contract.
3. Add reconciliation smoke test in CI fixture.
4. Keep seed verifier in CI for dev-data stability.

---

## 9. Known pitfalls and how to avoid them

### Pitfall 1: Deleting bridge routes before frontend cutover

Fix: migrate frontend to canonical quote/book contracts first.

**Verification command**:
```bash
rg -n "sessionId|optionId|expiresAt" client/src --type ts --type tsx
```
Expected: Client code uses new quote session fields.

### Pitfall 2: Removing legacy code but leaving old imports in tests

Fix: run `rg` sweep and fix all stale test mocks.

**Before deleting `PricingOrchestratorService`**:
```bash
rg "PricingOrchestratorService" server/tests
```
Expected: 0 matches after test cleanup.

### Pitfall 3: Assuming all companies have service-level records

Fix: verifier should scope to participating companies or enforce seeder coverage intentionally.

**Validation**: `verify-service-level-pricing-seed.ts` checks:
- Each company has CourierServices
- Each service has both cost + sell ServiceRateCards
- Each seller has SellerCourierPolicy

### Pitfall 4: Breaking path precedence

Fix: static routes (for example `/courier-rates`) must be declared before dynamic `/:orderId` routes if both remain temporarily.

**Current order in `order.routes.ts`**:
```
Line 117: POST / (create order)
Line 131: GET / (list orders)
Line 143: GET /courier-rates (static - correct position)
Line 193: GET /:orderId (dynamic - comes after static)
Line 285: POST /:orderId/ship (dynamic)
```
Status: ✅ Correct precedence maintained.

### Pitfall 5: Partial cleanup leaving orphaned indexes

Fix: After deleting legacy models/fields, run index hygiene migration.

**Command**:
```bash
npm run migrate:service-level-pricing-index-hygiene --prefix server
```

This ensures MongoDB indexes match current schema definitions.

### Pitfall 6: Not handling quote session expiry gracefully

**Current behavior** (`quote-engine.service.ts` lines 307-308):
- Expired session → HTTP 410 Gone
- Invalid optionId → HTTP 422 Unprocessable Entity

Fix: Ensure client handles 410 by regenerating quote instead of retrying expired sessionId.

### Pitfall 7: Concurrency race in quote selection

**Issue**: Multiple simultaneous `selectOption()` calls could race (line 321: `session.save()`).

**Mitigation**: Consider atomic `findOneAndUpdate` instead of `findOne` + `save()` pattern:
```javascript
// Current (racy):
session.selectedOptionId = optionId;
await session.save();

// Better (atomic):
await QuoteSession.findOneAndUpdate(
  { _id: sessionId, expiresAt: { $gte: new Date() } },
  { $set: { selectedOptionId: optionId } },
  { new: true }
);
```

**Status**: Not blocking for decommission, but document for future fix.

---

## 10. Definition of done for full decommission

You are done only when all statements below are true:

1. Legacy pricing routes/branches are removed from runtime path.
2. Legacy pricing services are deleted from codebase (not just unused).
3. New quote/session booking is mandatory for shipment creation path.
4. Reconciliation uses service-level expected cost snapshots.
5. All targeted integration tests are green.
6. Seed + migration hygiene scripts are green.
7. Docs contain only canonical architecture, no outdated fallback guidance.

---

## 11. Suggested execution mode for your project context

Since this product is currently dev-only with seeded data and no live production users, you can run this migration in an aggressive mode:

1. Prefer hard deletion over deprecation comments.
2. Prefer schema cleanup immediately after runtime cutover.
3. Prefer endpoint contract break if no external client lock-in exists.
4. Prefer single canonical implementation even if this means larger one-time refactor.

This minimizes long-term maintenance debt and prevents dual-architecture drift.

---

## 12. Implementation-Specific Deletion Sequence (Verified from Codebase)

This section provides the **exact, line-by-line deletion sequence** based on actual code analysis.

### Step 1: Remove Bridge Logic from Routes (30 min)

**File**: `server/src/presentation/http/routes/v1/shipping/order.routes.ts`

**Delete lines 147-186** (`GET /courier-rates` legacy fallback):
```javascript
// REMOVE THIS BLOCK:
if (featureEnabled) {
  // ... new path ...
} else {
  // Legacy calculation fallback - DELETE THIS
  if (Object.keys(req.query).length > 0) {
    req.body = normalizeLegacyRateRequestBody(...);
  }
  await ratecardController.calculateRate(req, res, next);
}
```

**Replace with**:
```javascript
// Direct canonical path only
const auth = guardChecks(req);
requireCompanyContext(auth);
const quoteInput = { /* ... same as line 155-169 ... */ };
const quoteResult = await QuoteEngineService.generateQuotes(quoteInput);
sendSuccess(res, quoteResult, 'Courier quotes generated');
```

**Delete lines 291-314** (`POST /ship` legacy fallback):
```javascript
// REMOVE THIS BLOCK:
if (featureEnabled && req.body.sessionId) {
  // ... new path ...
} else {
  await shipmentController.createShipment(req, res, next); // DELETE
}
```

**Replace with**:
```javascript
// Require sessionId + optionId always
if (!req.body.sessionId || !req.body.optionId) {
  throw new AppError(
    'sessionId and optionId required for booking',
    ErrorCode.VAL_INVALID_INPUT,
    422
  );
}
req.body = {
  sessionId: req.body.sessionId,
  optionId: req.body.optionId,
  orderId: req.params.orderId,
  warehouseId: req.body.warehouseId,
  instructions: req.body.specialInstructions || req.body.instructions,
};
await shipmentController.bookFromQuote(req, res, next);
```

**Delete helper functions** (lines 44-110):
- `parseNumericQuery` - may be used elsewhere, check first
- `normalizeLegacyRateRequestBody` (lines 49-85) - DELETE
- `resolveLegacyServiceType` (lines 87-93) - DELETE (duplicate of BookFromQuoteService.mapServiceType)
- `toLegacyRateRows` (lines 95-110) - DELETE

**Verification**:
```bash
rg "normalizeLegacyRateRequestBody|toLegacyRateRows|resolveLegacyServiceType" server/src
# Expected: 0 matches after deletion
```

---

### Step 2: Remove Legacy Service Files (45 min)

**Delete entire files** (after verifying no remaining imports):

1. `server/src/core/application/services/pricing/pricing-orchestrator.service.ts` (189 lines)
2. `server/src/core/application/services/pricing/dynamic-pricing.service.ts` (~600 lines)
3. `server/src/core/application/services/pricing/rate-card-selector.service.ts` (~200 lines)

**Pre-deletion verification**:
```bash
# Check for any remaining imports
rg "from.*pricing-orchestrator|from.*dynamic-pricing|from.*rate-card-selector" server/src

# Check for direct usage
rg "PricingOrchestratorService|DynamicPricingService|RateCardSelectorService" server/src

# Expected: Only definitions in the files themselves, no external references
```

**Post-deletion verification**:
```bash
npm run build --prefix server
# Expected: No TypeScript errors related to missing modules
```

---

### Step 3: Remove Legacy RateCard Controller (20 min)

**File**: `server/src/presentation/http/controllers/shipping/ratecard.controller.ts`

**Action**: Delete entire file IF not used by admin routes.

**Verification first**:
```bash
rg "ratecardController|from.*ratecard.controller" server/src/presentation/http/routes
# If matches found, audit admin routes for dependencies
```

**Safe approach**: Mark deprecated instead of deleting immediately:
```javascript
// At top of file:
/**
 * @deprecated Legacy rate calculation controller
 * Superseded by QuoteEngineService + ServiceRateCard
 * Scheduled for removal after admin UI migration complete
 */
```

---

### Step 4: Remove Legacy RateCard Model (30 min)

**File**: `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model.ts`

**Pre-deletion checks**:
```bash
# Check for imports
rg "from.*rate-card.model|RateCard\\.find|RateCard\\.create" server/src

# Check for data dependencies
mongo shipcrowd_dev --eval "db.ratecards.countDocuments()"
# If count > 0, consider data migration to ServiceRateCard or archive
```

**Migration strategy** (if data exists):
1. Export existing RateCard data: `mongoexport --collection=ratecards --out=ratecards_legacy_backup.json`
2. Mark collection as deprecated in schema
3. Drop indexes for RateCard
4. Remove model export from `models/index.ts`

**Rollback safety**: Keep backup JSON for 30 days before permanent deletion.

---

### Step 5: Remove Feature Flag Checks (15 min)

**Files to update**:
- `server/src/presentation/http/routes/v1/shipping/order.routes.ts`
- Any admin routes with `requireFeatureFlag('enable_service_level_pricing')`

**Action**:
```bash
# Find all feature flag usages
rg "enable_service_level_pricing" server/src

# Remove middleware:
# Before:
authenticate,
requireFeatureFlag('enable_service_level_pricing'),
asyncHandler(...)

# After:
authenticate,
asyncHandler(...)
```

**Feature flag retirement**:
- Remove flag definition from feature flags config/database
- Document in changelog: "enable_service_level_pricing flag removed - always ON"

---

### Step 6: Cleanup Imports in Remaining Files (15 min)

**Files likely to have stale imports**:
- `server/src/presentation/http/controllers/shipping/shipment.controller.ts`
- Any test files that mocked legacy services

**Commands**:
```bash
# Remove unused imports
rg "import.*PricingOrchestratorService" server/src
rg "import.*DynamicPricingService" server/src
rg "import.*RateCardSelectorService" server/src
rg "import.*rate-card.model" server/src
```

**Auto-fix** (if using ESLint):
```bash
npm run lint:fix --prefix server
```

---

### Step 7: Update Tests (30 min)

**Remove legacy test files**:
- Any tests specifically for `PricingOrchestratorService`
- Any tests specifically for `DynamicPricingService`
- Any tests specifically for `RateCardSelectorService`

**Update integration tests**:
- Remove feature flag mocking if it toggled between old/new paths
- Ensure all shipment creation tests use `bookFromQuote` flow

**Add regression prevention tests**:
```javascript
// Ensure legacy endpoints no longer accept old payloads
describe('POST /api/v1/orders/:orderId/ship - legacy payload rejection', () => {
  it('should reject booking without sessionId', async () => {
    const res = await request(app)
      .post('/api/v1/orders/123/ship')
      .send({
        courierId: 'ekart', // legacy field
        serviceType: 'express', // legacy field
      });
    expect(res.status).toBe(422);
    expect(res.body.error).toContain('sessionId');
  });
});
```

---

### Step 8: Final Verification Gate (Must Pass)

Run all verification commands in sequence:

```bash
# 1. No legacy imports remain
rg "PricingOrchestratorService|DynamicPricingService|RateCardSelectorService|rate-card.model" server/src
# Expected: 0 matches

# 2. No legacy route handlers remain
rg "ratecardController\\.calculateRate|normalizeLegacyRateRequestBody|toLegacyRateRows" server/src
# Expected: 0 matches

# 3. No feature flag checks remain
rg "enable_service_level_pricing" server/src
# Expected: 0 matches (or only in migration/deprecation notes)

# 4. Build succeeds
npm run build --prefix server
# Expected: Clean build, no TypeScript errors

# 5. Integration tests pass
npm test --prefix server -- tests/integration/services/pricing/
# Expected: All tests green

# 6. Seed verification passes
npm run verify:service-level-pricing-seed --prefix server
# Expected: All companies have complete service-level setup

# 7. Migration hygiene passes
npm run migrate:service-level-pricing-index-hygiene --prefix server
# Expected: No orphaned indexes, no schema mismatches
```

**Gate criteria**: ALL 7 checks must pass before merging decommission PR.

---

## 13. Rollback Plan (If Decommission Fails)

### Rollback Triggers
- Integration tests fail after deletion
- Critical production issue discovered (if deployed)
- Missing dependency discovered late in process

### Rollback Steps

1. **Immediate**: Revert Git commits
   ```bash
   git revert <decommission-commit-range>
   git push origin main
   ```

2. **Re-enable feature flag** (if flag was removed):
   ```javascript
   // Temporarily restore in routes:
   const featureEnabled = await isFeatureEnabled(req, 'enable_service_level_pricing', false);
   ```

3. **Restore deleted files from Git history**:
   ```bash
   git checkout <previous-commit> -- server/src/core/application/services/pricing/
   ```

4. **Run seed again** to ensure data consistency:
   ```bash
   npm run seed:clean --prefix server
   npm run seed:full --prefix server
   ```

5. **Document rollback** in runbook:
   - Why rollback was triggered
   - What was missing
   - What needs to be fixed before retry

### Rollback Prevention

- **Never delete and refactor in same PR** - separate into deletion PR + cleanup PR
- **Keep feature flag for 1 sprint after deletion** - allows instant rollback via config
- **Tag release before deletion** - easy revert point

---

## 14. Post-Decommission Maintenance

### Documentation Updates Required

1. **Update Architecture Guide** to remove all legacy references
2. **Update API documentation** to reflect only canonical contracts
3. **Update developer onboarding** to remove legacy system explanations
4. **Add ADR (Architecture Decision Record)**:
   ```
   Title: Legacy Pricing System Decommissioned
   Date: <completion-date>
   Status: Accepted
   Decision: Service-level pricing is now the only pricing path
   Consequences: Simpler codebase, single source of truth for rates
   ```

### Monitoring After Decommission

1. **Track quote generation performance**:
   - Provider timeout rates should remain <5%
   - Average quote generation time <1.5s

2. **Track booking success rates**:
   - Should remain ≥95%
   - Track 410 (expired session) rates - should be <10% of total bookings

3. **Track variance case volumes**:
   - Auto-closed (≤5%) should be >80% of cases
   - Open cases (>5%) should be <20%

### Code Quality Gates (Post-Decommission)

1. **Prevent legacy re-introduction**:
   ```javascript
   // Add to ESLint config:
   {
     "no-restricted-imports": ["error", {
       "patterns": ["**/pricing-orchestrator*", "**/dynamic-pricing*", "**/rate-card-selector*"]
     }]
   }
   ```

2. **Prevent legacy models re-introduction**:
   ```bash
   # Add to pre-commit hook:
   if git diff --cached --name-only | grep -E "rate-card\.model\.ts$"; then
     echo "ERROR: Legacy RateCard model is deprecated. Use ServiceRateCard instead."
     exit 1
   fi
   ```

---

## 15. Success Metrics (30 Days Post-Decommission)

Track these metrics to validate decommission success:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Lines of code removed | >1,500 | `git diff --stat` |
| Active pricing code paths | 1 (service-level only) | Code audit |
| Quote generation p95 latency | <2.0s | Metrics dashboard |
| Booking success rate | ≥95% | Metrics dashboard |
| Variance auto-close rate | ≥80% | Finance reports |
| Developer onboarding time | -20% (faster) | Team survey |
| Production incidents related to pricing | 0 | Incident log |

**Review checkpoint**: 30 days after merge, assess metrics and document lessons learned.

---

## 16. Execution Hardening Addendum (v3 Lock)

This addendum is now mandatory for execution and addresses the final pre-execution gaps identified during migration review.

### 16.1 Source-of-Truth Plan Artifacts (Stage B0)

Before Stage C/D execution, keep these audited artifacts updated:

1. `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/docs/Development/Domains/Shipping/migration-artifacts/architecture-reality-check.md`
2. `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/docs/Development/Domains/Shipping/migration-artifacts/plan-vs-reality-diff.md`
3. `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/docs/Development/Domains/Shipping/migration-artifacts/verified-ratecard-dependency-map.md`
4. `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/docs/Development/Domains/Shipping/migration-artifacts/client-ratecard-inventory.md`

### 16.2 Locked Shipment Status Sets for D1 Migration

Use explicit status sets for migration branching (do not leave "terminal" undefined):

```typescript
const TERMINAL_STATUSES = [
  'delivered',
  'rto',
  'rto_delivered',
  'cancelled',
  'lost',
];

const IN_FLIGHT_STATUSES = [
  'created',
  'ready_to_ship',
  'pending_pickup',
  'picked_up',
  'shipped',
  'awaiting_carrier_sync',
  'in_transit',
  'out_for_delivery',
  'ndr',
  'rto_initiated',
  'rto_in_transit',
];
```

Migration rule:
1. Terminal + legacy-only shipment: preserve under `pricingDetails.legacyRateCardSnapshot`.
2. In-flight + missing `pricingDetails.selectedQuote`: flag `migration_anomaly`, do not retro-calculate quote.

### 16.3 Bootstrap Endpoint Contract (B2)

Add and enforce this API contract for policy bootstrapping:

- `POST /api/v1/companies/:companyId/seller-policies/bootstrap`

Contract:
1. Scope: active seller users only (`role='seller'`, `isActive=true`, `companyId=:companyId`).
2. Conflict handling: skip existing `SellerCourierPolicy` records (`preserveExisting=true` behavior).
3. Auth: admin-only.
4. Scale behavior:
   - `<100` sellers: synchronous execution.
   - `>=100` sellers: enqueue async bootstrap job.
5. Response payload:

```json
{
  "created": 0,
  "skipped": 0,
  "errors": []
}
```

### 16.4 Client C4 Inventory Rule

Do not execute C4 based on assumed filenames. Use audited inventory:

1. `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/docs/Development/Domains/Shipping/migration-artifacts/client-ratecard-inventory.md`
2. Keep service-level files (`pricing-studio`, `useServiceRateCards`, courier service admin flows).
3. Remove only validated legacy-ratecard consumers listed in Stage C4 inventory.
