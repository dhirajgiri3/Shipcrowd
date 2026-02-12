# Legacy Deletion Readiness Map

**Document Owner:** Shipping Platform Team  
**Last Updated:** February 11, 2026  
**Status:** Stage A/B complete; Stage C/D readiness active

---

## 1. Purpose

This map defines exactly what still depends on legacy pricing artifacts and what must replace each dependency before deletion.

**Legacy modules in scope:**
1. `server/src/core/application/services/pricing/pricing-orchestrator.service.ts` (removed)
2. `server/src/core/application/services/pricing/dynamic-pricing.service.ts` (removed)
3. `server/src/core/application/services/pricing/rate-card-selector.service.ts` (removed)
4. `server/src/presentation/http/controllers/shipping/ratecard.controller.ts` (removed)
5. `server/src/presentation/http/routes/v1/shipping/ratecard.routes.ts` (removed)
6. `server/src/infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model.ts` (active legacy surface)
7. `server/src/infrastructure/database/mongoose/models/shipping/courier.model.ts` (provider-level Courier model, pending)
8. `enable_service_level_pricing` runtime feature flag references (removed from runtime paths)

---

## 2. Discovery Method

Dependency inventory regenerated with `rg` on February 11, 2026:

```bash
rg -n "pricing-orchestrator.service|dynamic-pricing.service|rate-card-selector.service|controllers/shipping/ratecard.controller|routes/v1/shipping/ratecard.routes|enable_service_level_pricing" server/src server/tests -g "*.ts"
rg -n "rate-card.model|\\bRateCard\\b" server/src -g "*.ts"
rg -n "shipping/courier.model" server/src -g "*.ts"
```

Current raw footprint snapshot:
1. Legacy orchestrator/controller/route/feature-flag patterns: **0 matches**
2. `rate-card.model` import usage in `server/src`: **14 matches**
3. Broad `RateCard` token footprint in `server/src`: **76 matches**
4. `shipping/courier.model` import usage in `server/src`: **2 matches**

### 2.1 Completion Snapshot

Completed in this branch before Stage C:
1. Shipping legacy route/controller chain detached from runtime API.
2. Legacy pricing orchestration chain deleted:
   - `pricing-orchestrator.service.ts`
   - `dynamic-pricing.service.ts`
   - `rate-card-selector.service.ts`
   - `smart-rate-calculator.service.ts`
   - `rate-card-simulation.service.ts`
3. Feature flag runtime gating removed from service-level shipping paths.
4. Regression guard added: `npm run verify:legacy-cutover --prefix server`.

### 2.2 Client Inventory Snapshot (Stage C4 Input)

Client inventory was audited from live paths (not assumptions):

1. `ratecard|RateCard|rate-card` matches in client source (excluding `.next`): **39 files**
2. Canonical inventory file:
   - `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/docs/Development/Domains/Shipping/migration-artifacts/client-ratecard-inventory.md`
3. Stage C4 execution rule:
   - delete only files listed as legacy consumers in the inventory file
   - keep service-level files (`pricing-studio`, `useServiceRateCards`, courier service admin paths)

---

## 3. Dependency Map by Legacy Module

### 3.1 `pricing-orchestrator.service.ts`

**Current status:** removed from codebase.  
**Verification:** no import references remain in `server/src` or `server/tests`.

### 3.2 `dynamic-pricing.service.ts`

**Current status:** removed from codebase.  
**Replacement now active:** quote engine + service-rate-card formula + provider adapters.

### 3.3 `rate-card-selector.service.ts`

**Current status:** removed from codebase.  
**Replacement now active:** service-level card selection in quote engine path.

### 3.4 `ratecard.controller.ts`

**Current status:** removed from codebase.  
**Replacement now active:** shipping routes use canonical quote/recommendation flows.

### 3.5 `rate-card.model.ts` (`RateCard`)

| Consumer | Domain | Current Role | Replacement Target | Owner |
|---|---|---|---|---|
| `server/src/presentation/http/controllers/admin/admin-ratecard.controller.ts` | Admin | Legacy admin ratecard CRUD/analytics | Migrate admin UI/API to `ServiceRateCard` + `CourierService` model | Admin Platform |
| `server/src/presentation/http/controllers/shipping/ratecard.controller.ts` | Legacy shipping API | Runtime and simulation endpoints | Remove after route/controller cutover | Shipping API |
| `server/src/core/application/services/pricing/rate-card-import.service.ts` | Pricing tooling | Legacy CSV import target | Service-ratecard import/update pipeline | Pricing Platform |
| `server/src/core/application/services/pricing/rate-card-simulation.service.ts` | Pricing tooling | Legacy simulation on historical shipments | Service-ratecard formula simulation | Pricing Platform |
| `server/src/core/application/services/pricing/rate-card-selector.service.ts` | Legacy pricing stack | Core card selection | Remove with legacy stack | Pricing Platform |
| `server/src/core/application/services/pricing/pricing-cache.service.ts` | Pricing infra | Legacy ratecard cache keys/lookup semantics | Rewrite cache contracts to service-level keyspace only | Pricing Platform |
| `server/src/core/application/services/pricing/cod-charge.service.ts` | Pricing infra | COD charge helper with legacy card assumptions | Bind to service-ratecard COD rule contracts only | Pricing Platform |
| `server/src/core/application/services/organization/company-onboarding.service.ts` | Onboarding | Creates default legacy ratecard | Create default service-level cards + seller policy | Onboarding |
| `server/src/core/application/services/rto/rate-card.service.ts` | RTO | Reads legacy ratecard for RTO pricing | Use service-ratecard/rto formula config or shipment quote snapshot | RTO/Finance |
| `server/src/core/application/services/disputes/weight-dispute-detection.service.ts` | Disputes | Legacy pricing terminology/assumptions in dispute detection context | Normalize to selected-quote/service-level terminology and references | Disputes |
| `server/src/presentation/http/controllers/organization/company.controller.ts` | Organization admin | Assigns legacy ratecard | Switch assignment model to seller policy/service-ratecard bundles | Org Platform |
| `server/src/infrastructure/database/seeders/seeders/23-rate-card-and-zones.seeder.ts` | Seeders | Seeds legacy ratecards | Remove or convert to service-level equivalents | Data Platform |
| `server/src/infrastructure/database/seeders/seeders/08-shipments.seeder.ts` | Seeders | Depends on legacy ratecards | Rework to quote snapshot/service-level seed path | Data Platform |
| `server/src/infrastructure/database/seeders/seeders/26-audit-logs.seeder.ts` | Seeders | Legacy audit log seed refs | Replace with service-level entities or remove | Data Platform |
| `server/src/infrastructure/database/indexes.ts` | Infra | Creates/drops RateCard indexes | Remove after model retirement | Data Platform |
| `server/src/infrastructure/database/migrations/phase-2/ratecard-scope-migration.ts` | Migrations | Legacy migration artifact | Archive as historical or remove from active runner | Data Platform |
| `server/src/scripts/migrations/migrate-rate-card-versions.ts` | Scripts | Legacy version migration | Archive/remove | Data Platform |
| `server/src/infrastructure/database/mongoose/models/index.ts` | Model exports | Barrel export for RateCard | Remove export after zero imports | Platform Core |
| `server/src/infrastructure/database/mongoose/models/organization/core/company.model.ts` | Schema refs | `ref: 'RateCard'` linkage | Replace with service-level policy/card refs | Platform Core |
| `server/src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model.ts` | Schema refs | Legacy ratecard reference | Keep historical snapshot only or migrate schema ref strategy | Shipping Data |
| `server/src/infrastructure/database/mongoose/models/finance/pricing-audit.model.ts` | Schema refs | Legacy ratecard reference | Point to service-level card or snapshot metadata | Finance Data |

---

### 3.6 `courier.model.ts` (`Courier`)

| Consumer | Domain | Current Role | Replacement Target | Owner |
|---|---|---|---|---|
| `server/src/presentation/http/controllers/shipping/courier.controller.ts` | Shipping admin APIs | Reads/updates provider-level courier config | Move to `CourierService` + `CarrierProfile` driven APIs | Shipping API |
| `server/src/core/application/services/pricing/smart-rate-calculator.service.ts` | Pricing intelligence | Reads active couriers list for recommendation set | Use service-level `CourierService` or provider capability registry | Pricing Platform |
| `server/src/infrastructure/database/seeders/seeders/29-couriers.seeder.ts` | Data platform | Seeds legacy `Courier` collection | Replace with `CourierService`/`CarrierProfile` seeds | Data Platform |
| `server/src/infrastructure/database/mongoose/models/index.ts` | Model exports | Barrel export for `Courier` | Remove after zero import state | Platform Core |

---

## 4. Domain Buckets (Owner Workstreams)

1. **Shipping Runtime/API**  
   Files: `shipment.controller`, `carrier.service`, `order.service`, `ratecard.routes`, `courier.routes`
2. **Pricing Platform**  
   Files: `smart-rate-calculator`, `rate-card-import`, `rate-card-simulation`, selector/orchestrator chain
3. **Admin Platform**  
   Files: `admin-ratecard.controller`, admin ratecard UI/API consumers
4. **Data Platform (Seeders/Migrations/Indexes)**  
   Files: `seeders/*rate-card*`, `indexes.ts`, migration scripts
5. **Onboarding/Organization**  
   Files: `company-onboarding.service`, `company.controller`
6. **Disputes/RTO/Finance**  
   Files: `weight-dispute-detection.service`, `rto/rate-card.service`, pricing audit model refs
7. **Carrier Configuration**  
   Files: `shipping/courier.controller`, `smart-rate-calculator.service`, `seeders/29-couriers.seeder`

---

## 5. Deletion Order (Decision-Complete)

### Stage A — Route and Controller Isolation
1. Remove runtime exposure of `shipping/ratecard.routes.ts` and `ratecard.controller.ts` from active API surface.
2. Replace `courier.routes.ts` smart-calculate binding with service-level recommendation endpoint.
3. Confirm no route imports `ratecard.controller.ts`.

**Status:** ✅ Completed (February 11, 2026)

### Stage B — Pricing Stack Replacement
1. Migrate all consumers of `pricing-orchestrator.service.ts` to quote engine + formula service.
2. Migrate all consumers of `dynamic-pricing.service.ts` to service-level pricing contracts.
3. Remove `rate-card-selector.service.ts`, then `pricing-orchestrator.service.ts`, then `dynamic-pricing.service.ts`.

**Status:** ✅ Completed (February 11, 2026)

### Stage C — Admin and Onboarding Migration
1. Move admin ratecard workflows from `RateCard` to `ServiceRateCard` + `CourierService`.
2. Replace onboarding default RateCard creation with service-level setup.
3. Replace organization assignment flows with service-level policy constructs.
4. Rewrite/retire remaining legacy service consumers:
   - `rate-card-import.service.ts`
   - `pricing-cache.service.ts`
   - `cod-charge.service.ts`
   - `weight-dispute-detection.service.ts`
5. Add bootstrap policy orchestration contract:
   - `POST /api/v1/companies/:companyId/seller-policies/bootstrap`
   - Scope active sellers only, skip existing policies, admin-only

**Status:** ⚠️ In progress (active next execution wave)

### Stage D — Data Layer Retirement
1. Remove `RateCard` from active indexes, barrel exports, and schema refs (after zero runtime usage).
2. Migrate/remove legacy seeders and legacy ratecard migration scripts.
3. Remove `rate-card.model.ts` only when zero imports confirmed.

**Status:** ⚠️ Pending (blocked on Stage C)

---

## 6. Readiness Gates

```bash
# Stage A/B regression guard (must stay green)
npm run verify:legacy-cutover --prefix server

# Zero route usage of legacy controller
rg "controllers/shipping/ratecard.controller|ratecardController" server/src/presentation/http/routes -g "*.ts"

# Zero service imports of legacy pricing stack
rg "pricing-orchestrator.service|dynamic-pricing.service|rate-card-selector.service" server/src -g "*.ts"
```

```bash
# Stage C/D hard-deletion gate (target state; not yet zero)
# Zero model imports of legacy RateCard
rg "logistics/shipping/configuration/rate-card.model" server/src -g "*.ts"

# Zero model imports of legacy Courier model
rg "shipping/courier.model|\\{\\s*Courier\\s*\\}" server/src -g "*.ts"

# Zero runtime references to service-level pricing feature flag
rg "enable_service_level_pricing" server/src -g "*.ts"
```

Current expected state:
1. Stage A/B checks: zero matches and `verify:legacy-cutover` must pass.
2. Stage C/D checks: non-zero until admin/onboarding/data migration completes.
3. Full deletion-ready state: all checks return zero matches.

---

## 7. Notes

1. This map is a planning artifact and intentionally keeps legacy modules in place until dependency migration is complete.
2. Do not delete legacy files directly from this map; execute staged PRs and validate each stage with integration gates.
