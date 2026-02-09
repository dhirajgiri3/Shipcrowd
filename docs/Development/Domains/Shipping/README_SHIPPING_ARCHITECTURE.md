# ShipCrowd Shipping Architecture Documentation Index

**Last Updated:** February 9, 2026
**Status:** Complete documentation set for service-level pricing architecture

---

## Purpose

This index guides you to the right document based on your role and task.

---

## Quick Navigation

| Your Role | Your Task | Read This Document | Section |
|-----------|-----------|-------------------|---------|
| **New Developer** | Understand system architecture | [Architecture Guide](./Service_Level_Pricing_and_Order_Shipment_Architecture_Guide.md) | All |
| **Product/Leadership** | Understand competitive advantages | [Blueprint](./Courier_RateCard_Final_Refactor_Blueprint.md) | Section 12 |
| **Backend Engineer** | Implement missing features | [Blueprint](./Courier_RateCard_Final_Refactor_Blueprint.md) | Section 12-15 |
| **DevOps/SRE** | Execute legacy cleanup | [Decommission Runbook](./Legacy_Decommission_and_Full_Migration_Runbook.md) | Phase 0-8 |
| **QA/Tester** | Verify system behavior | [Architecture Guide](./Service_Level_Pricing_and_Order_Shipment_Architecture_Guide.md) | Section 18 |
| **Finance/Operations** | Understand reconciliation | [Architecture Guide](./Service_Level_Pricing_and_Order_Shipment_Architecture_Guide.md) | Section 5.6F |
| **Admin User** | Configure courier services | [Blueprint](./Courier_RateCard_Final_Refactor_Blueprint.md) | Section 5-6 |

---

## Document Set Overview

### 1. [Courier & RateCard Final Refactor Blueprint](./Courier_RateCard_Final_Refactor_Blueprint.md)

**Purpose:** Strategic roadmap and implementation status

**Key Content:**
- **Section 3:** Verified architecture gaps (what's missing)
- **Section 4:** Target end-state architecture (single source of truth)
- **Section 5-6:** Admin workflow for courier/ratecard management
- **Section 7-8:** Legacy cleanup map and execution order
- **Section 12:** Seven competitive differentiators (vs BlueShip) with implementation status
- **Section 13:** Implementation status matrix (honest reality check)
- **Section 15:** 90-day execution roadmap with sprint breakdown
- **Section 16:** Acceptance criteria per phase

**Read this if:** You need to understand what's implemented, what's missing, and what to build next.

---

### 2. [Service-Level Pricing and Order-Shipment Architecture Guide](./Service_Level_Pricing_and_Order_Shipment_Architecture_Guide.md)

**Purpose:** Deep technical implementation reference

**Key Content:**
- **Section 3:** Core domain entities (models, schemas, indexes, logic)
- **Section 4-5:** API surfaces and end-to-end runtime lifecycle
- **Section 6-7:** Recommendation logic and confidence model
- **Section 15:** Implementation edge cases and gotchas (critical for debugging)
- **Section 16:** Operational runbook (debugging scenarios, performance tuning)
- **Section 17:** Future enhancements (volumetric weight, multi-piece shipments)
- **Section 18:** Testing strategy checklist

**Read this if:** You're implementing features, debugging issues, or need to understand how the system works.

---

### 3. [Legacy Decommission and Full Migration Runbook](./Legacy_Decommission_and_Full_Migration_Runbook.md)

**Purpose:** Step-by-step legacy cleanup execution plan

**Key Content:**
- **Section 2:** Current reality (what's done, what's still legacy)
- **Section 5:** Legacy inventory and deletion candidates (with line numbers)
- **Section 6:** Phased migration strategy (Phase 0-8)
- **Section 9:** Known pitfalls and how to avoid them
- **Section 12:** Implementation-specific deletion sequence (exact commands)
- **Section 13:** Rollback plan
- **Section 14-15:** Post-decommission maintenance and success metrics

**Read this if:** You're executing legacy code removal or need a deletion checklist.

---

## Execution Sequence (For Implementation Teams)

### Phase 0: Foundation (Current State)
✅ **COMPLETE** - Service-level architecture is implemented and working

**Verification:**
- All 6 models exist and are exported
- Quote → Book → Reconcile lifecycle functional
- Integration tests passing

---

### Phase 1: Critical Missing Features (MUST DO FIRST)

**Priority 1: Centralized Formula Service** (Blueprint Section 11, Item 1)
- Consolidate all pricing logic (COD/fuel/RTO/GST) into `ServiceRateCardFormulaService`
- Enforce volumetric weight calculation
- Wire into quote engine, simulate endpoint, booking

**Timeline:** 2 weeks
**Blocker:** YES - Cannot remove legacy until formula is centralized

**Priority 2: Booking Fallback Orchestration** (Blueprint Section 12.5)
- Implement automatic fallback to next-ranked option on booking failure
- Safe boundary: only fallback pre-AWB
- Track fallback metrics

**Timeline:** 2 weeks
**Blocker:** YES - Critical for production booking success rate

**Verification Commands:**
```bash
# Formula service integration (after implementation)
npm test --prefix server -- tests/integration/services/pricing/

# Booking flow (current tests - fallback tests to be added after implementation)
npm test --prefix server -- tests/integration/services/pricing/service-level-pricing-flow.integration.test.ts
```

**Exit Criteria:**
- [ ] All quote options use centralized formula
- [ ] Booking success rate ≥ 95% in staging with fallback enabled
- [ ] Integration tests: 100% pass

---

### Phase 2: Contract Lock (Blueprint Phase 2)

**Actions:**
1. Make `/quotes/courier-options` the canonical quote endpoint
2. Make `book-from-quote` mandatory for all order shipping
3. Ensure status codes: 410 (expired session), 422 (invalid option)

**Timeline:** 1 week

**Verification:**
```bash
# API contract tests
npm test --prefix server -- tests/integration/services/pricing/service-level-pricing-api.integration.test.ts

# Status code enforcement
curl -X POST /api/v1/orders/:orderId/ship -d '{"sessionId":"expired"}' # Expect 410
curl -X POST /api/v1/orders/:orderId/ship -d '{"sessionId":"valid","optionId":"invalid"}' # Expect 422
```

**Exit Criteria:**
- [ ] Session expiry returns 410 (verified)
- [ ] Invalid optionId returns 422 (verified)
- [ ] All shipments use book-from-quote flow

---

### Phase 3: Legacy Cleanup (Decommission Runbook Phase 3-4)

**Prerequisites:** Phase 1-2 complete

**Actions:**
1. Remove bridge logic from `order.routes.ts` (lines 143-186, 291-314)
2. Remove feature flag `enable_service_level_pricing`
3. Delete legacy services (PricingOrchestrator, DynamicPricing, RateCardSelector)
4. Delete legacy models (RateCard)
5. Delete legacy controllers/routes (ratecard.controller.ts, ratecard.routes.ts)

**Timeline:** 2 weeks

**Verification Commands:**
```bash
# No legacy imports
rg "PricingOrchestratorService|DynamicPricingService|RateCardSelectorService" server/src
# Expected: 0 matches

# No legacy route references
rg "ratecardController\\.calculateRate|normalizeLegacyRateRequestBody" server/src
# Expected: 0 matches

# Build passes
npm run build --prefix server
# Expected: No TypeScript errors

# All tests green
npm test --prefix server
# Expected: All tests pass
```

**Exit Criteria (Decommission Runbook Section 10):**
- [ ] No duplicate index warnings
- [ ] Quote API returns multi-option output with confidence/providerTimeouts
- [ ] Booking from quote locks dual-ledger snapshot
- [ ] Session expiry → 410, Invalid option → 422
- [ ] Reconciliation: ≤5% auto-close, >5% open case
- [ ] No shipping runtime references to legacy RateCard stack

---

### Phase 4: Enhancements (Blueprint Section 12, Post-Launch)

**Sprint 7-8:** Policy autopilot presets + risk-aware constraints
**Sprint 9-10:** Variance drift heatmaps + automated alerts
**Sprint 11-12:** Intent-based setup wizard + preset library

**Timeline:** 6 weeks (post-launch)

**Priority:** Medium (powerful features, not launch-blocking)

---

## Implementation Status Dashboard

| Component | Status | Blueprint Section | Decommission Phase | Blocking Launch? |
|-----------|--------|-------------------|-------------------|------------------|
| **Service-Level Foundation** | ✅ Complete | 2.1 | N/A | N/A |
| **Quote Engine** | ✅ Complete | 2.1B | N/A | N/A |
| **Book-from-Quote** | ✅ Complete | 2.1B | N/A | N/A |
| **Reconciliation** | ✅ Complete | 2.1B | N/A | N/A |
| **Centralized Formula** | ❌ Not Started | 11, Item 1 | Phase 1 | **YES** |
| **Booking Fallback** | ❌ Not Started | 12.5 | Phase 1 | **YES** |
| **Contract Lock** | ⚠️ Partial | Phase 2 | Phase 2 | No |
| **Legacy Cleanup** | ⚠️ Pending | 7-8 | Phase 3-4 | No |
| **Unified Pricing Studio** | ⚠️ Partial (60%) | 12.2 | N/A | No |
| **Explainable Quotes** | ⚠️ Partial (75%) | 12.3 | N/A | No |
| **Policy Autopilot** | ⚠️ Partial (50%) | 12.4 | N/A | No |
| **Margin Watch** | ⚠️ Partial (40%) | 12.6 | N/A | No |
| **Enterprise Security** | ⚠️ Partial (55%) | 12.7 | N/A | No |

**Launch-Blocking Items:**
1. ❌ Centralized formula service (2 weeks)
2. ❌ Booking fallback orchestration (2 weeks)

**Critical Path:** 4 weeks until launch-ready

---

## Troubleshooting Guide

### "Which document should I read?"

**Problem:** I need to understand how provider timeouts work
**Solution:** [Architecture Guide](./Service_Level_Pricing_and_Order_Shipment_Architecture_Guide.md), Section 15.1

**Problem:** I need to know what legacy code to delete
**Solution:** [Decommission Runbook](./Legacy_Decommission_and_Full_Migration_Runbook.md), Section 5-12

**Problem:** I need to understand why cost and sell cards are separate
**Solution:** [Blueprint](./Courier_RateCard_Final_Refactor_Blueprint.md), Section 5.1

**Problem:** I need to implement margin watch alerts
**Solution:** [Blueprint](./Courier_RateCard_Final_Refactor_Blueprint.md), Section 12.6

**Problem:** I need to debug why a quote option is missing
**Solution:** [Architecture Guide](./Service_Level_Pricing_and_Order_Shipment_Architecture_Guide.md), Section 16.1

**Problem:** I need the exact commands to verify seed data
**Solution:** [Architecture Guide](./Service_Level_Pricing_and_Order_Shipment_Architecture_Guide.md), Section 16.3

---

## Key Contacts and Ownership

| Domain | Owner | Document Sections |
|--------|-------|-------------------|
| **Service-Level Pricing Architecture** | Shipping Platform Team | All docs, Section 3-5 |
| **Quote Engine Logic** | Pricing Team | Architecture Guide, Section 5.2 |
| **Booking Orchestration** | Fulfillment Team | Architecture Guide, Section 5.4 |
| **Finance Reconciliation** | Finance Ops Team | Architecture Guide, Section 5.6 |
| **Legacy Cleanup Execution** | DevOps Team | Decommission Runbook, All phases |
| **Admin UI/UX** | Frontend Team | Blueprint, Section 5.2 |

---

## Document Maintenance

**Update Frequency:** After each sprint or major feature completion

**Review Cycle:** Monthly architecture review meeting

**Ownership:** Shipping Platform Team lead

**Version Control:** All docs tracked in Git, changes reviewed in PRs

---

## Quick Commands Reference

```bash
# Verify service-level pricing seed
npm run verify:service-level-pricing-seed --prefix server

# Run index hygiene migration
npm run migrate:service-level-pricing-index-hygiene --prefix server

# Run integration tests (quote/book/reconcile)
npm test --prefix server -- tests/integration/services/pricing/

# Check for legacy imports (should return 0 matches after cleanup)
rg "PricingOrchestratorService|DynamicPricingService|RateCardSelectorService" server/src

# Build verification
npm run build --prefix server

# Full test suite
npm test --prefix server
```

---

## Next Steps

1. **If you're NEW to the system:** Start with [Architecture Guide](./Service_Level_Pricing_and_Order_Shipment_Architecture_Guide.md), read sections 1-5
2. **If you're IMPLEMENTING features:** Read [Blueprint](./Courier_RateCard_Final_Refactor_Blueprint.md), Section 12-15 for roadmap
3. **If you're CLEANING UP legacy:** Read [Decommission Runbook](./Legacy_Decommission_and_Full_Migration_Runbook.md), verify prerequisites first
4. **If you're DEBUGGING:** Use [Architecture Guide](./Service_Level_Pricing_and_Order_Shipment_Architecture_Guide.md), Section 15-16

---

**Last Verified:** February 9, 2026
**Architecture Status:** Service-level foundation complete, 2 critical features blocking launch, legacy cleanup pending
