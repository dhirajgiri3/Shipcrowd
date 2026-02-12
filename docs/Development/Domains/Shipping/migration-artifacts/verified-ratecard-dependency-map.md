# Verified RateCard Dependency Map

**Generated At:** 2026-02-11 19:52:46 IST  
**Method:** `rg` scans on `server/src` (non-test scope)

## 1. Legacy RateCard Import/Usage Footprint

Scan command:
```bash
rg -n "from .*rate-card\.model|\{\s*RateCard\s*\}|\bRateCard\." server/src --type ts -g "!*.test.ts"
```

Result: **41 legacy matches** (after excluding `service-rate-card.model` references).

High-impact active consumers:
1. `server/src/presentation/http/controllers/admin/admin-ratecard.controller.ts`
2. `server/src/core/application/services/organization/company-onboarding.service.ts`
3. `server/src/core/application/services/rto/rate-card.service.ts`
4. `server/src/core/application/services/pricing/rate-card-import.service.ts`
5. `server/src/presentation/http/controllers/organization/company.controller.ts`
6. `server/src/infrastructure/database/seeders/seeders/23-rate-card-and-zones.seeder.ts`
7. `server/src/infrastructure/database/seeders/seeders/08-shipments.seeder.ts`
8. `server/src/infrastructure/database/seeders/seeders/26-audit-logs.seeder.ts`
9. `server/src/infrastructure/database/indexes.ts`
10. `server/src/infrastructure/database/mongoose/models/index.ts` (legacy export)

## 2. Legacy Field Footprint (`defaultRateCardId`, `pricingDetails.rateCardId`)

Scan command:
```bash
rg -n "defaultRateCardId|\.rateCardId" server/src --type ts
```

Result: **26 matches**.

Core field owners:
1. `server/src/core/application/services/organization/company-onboarding.service.ts`
2. `server/src/presentation/http/controllers/admin/admin-ratecard.controller.ts`
3. `server/src/presentation/http/controllers/organization/company.controller.ts`
4. `server/src/core/application/services/analytics/rate-card-analytics.service.ts`
5. `server/src/infrastructure/database/mongoose/models/organization/core/company.model.ts`
6. `server/src/infrastructure/database/seeders/seeders/23-rate-card-and-zones.seeder.ts`
7. `server/src/infrastructure/database/seeders/seeders/08-shipments.seeder.ts`

## 3. Legacy Courier Model Footprint (Deferred Wave)

Scan command:
```bash
rg -n "Courier\.find|courier\.model|ref:\s*'Courier'|\{\s*Courier\s*\}" server/src --type ts
```

Result: **9 matches**.

Active owners:
1. `server/src/presentation/http/controllers/shipping/courier.controller.ts`
2. `server/src/infrastructure/database/seeders/seeders/29-couriers.seeder.ts`
3. `server/src/infrastructure/database/mongoose/models/index.ts` (legacy export)

## 4. C3 Rewrite Scope (Locked)

Based on verified dependencies, Stage C3 must include:
1. `server/src/core/application/services/organization/company-onboarding.service.ts`
2. `server/src/core/application/services/rto/rate-card.service.ts`
3. `server/src/core/application/services/analytics/rate-card-analytics.service.ts`
4. `server/src/core/application/services/pricing/rate-card-import.service.ts`
5. `server/src/core/application/services/pricing/pricing-cache.service.ts`
6. `server/src/core/application/services/pricing/cod-charge.service.ts`
7. `server/src/core/application/services/disputes/weight-dispute-detection.service.ts`
8. `server/src/presentation/http/controllers/organization/company.controller.ts`
9. `server/src/presentation/http/controllers/admin/admin-ratecard.controller.ts`
