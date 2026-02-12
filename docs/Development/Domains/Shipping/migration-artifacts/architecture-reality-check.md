# Architecture Reality Check

**Generated At:** 2026-02-11 19:52:46 IST  
**Branch:** `codex/feature/service-level-pricing`  
**Baseline Commit:** `95011a33`

## 1. Runtime Pricing Contract Reality

1. `QuoteOptionOutput` does **not** use `sellCardId` / `costCardId`.
2. Current source-of-truth fields are:
   - `serviceId`
   - `quotedAmount`
   - `costAmount`
3. Shipment snapshot structure already carries:
   - `pricingDetails.selectedQuote.serviceId`
   - `pricingDetails.selectedQuote.quotedSellAmount`
   - `pricingDetails.selectedQuote.expectedCostAmount`

## 2. Policy Model Reality

1. Runtime policy source is `SellerCourierPolicy` (per seller, per company).
2. Policy is not modeled as a runtime company-level default object.
3. Migration strategy must bootstrap per-seller policy rows for companies still using `settings.defaultRateCardId`.

## 3. Active Legacy Dependency Reality

1. Legacy `RateCard` imports are still active in admin/onboarding/rto/seeders/migrations.
2. `defaultRateCardId` / `pricingDetails.rateCardId` references still exist in active code.
3. Legacy `Courier` model is still active in admin courier controller and courier seeder.

## 4. Shipment Status Reality (for D1 migration branching)

Observed across shipment services, webhook mappers, and jobs:

- Terminal statuses to treat as immutable in migration scripts:
  - `delivered`
  - `rto`
  - `rto_delivered`
  - `cancelled`
  - `lost`
- In-flight statuses to treat as mutable/operational:
  - `created`
  - `ready_to_ship`
  - `pending_pickup`
  - `picked_up`
  - `shipped`
  - `awaiting_carrier_sync`
  - `in_transit`
  - `out_for_delivery`
  - `ndr`
  - `rto_initiated`
  - `rto_in_transit`

## 5. Immediate Migration Guardrails Locked

1. Do not introduce new `sellCardId`/`costCardId` fields.
2. Keep `SellerCourierPolicy` as runtime policy source of truth.
3. Keep legacy compatibility markers explicit during parity window:
   - `pricingDetails.rateCardId = null`
   - `pricingDetails.rateCardName = "service-level-pricing"`
   - `pricingDetails.calculationMethod = "override"`
