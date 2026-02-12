# ShipCrowd Shipping Architecture Documentation Index

**Last Updated:** February 11, 2026
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
| **Backend Engineer** | Plan safe legacy deletions | [Legacy Deletion Readiness Map](./Legacy_Deletion_Readiness_Map.md) | All |
| **Migration Owner** | Validate real dependencies before deletion | [Migration Artifacts](./migration-artifacts/) | All |
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

### 4. [Legacy Deletion Readiness Map](./Legacy_Deletion_Readiness_Map.md)

**Purpose:** Dependency-accurate map to sequence legacy removals safely

**Key Content:**
- Legacy module consumers by domain
- Replacement target and owner per consumer
- Staged deletion order (A-D)
- Deletion readiness gate commands

**Read this if:** You're planning or reviewing deletion PRs and need decision-complete dependency context.

---

### 5. [Migration Artifacts](./migration-artifacts/)

**Purpose:** Reality-checked execution artifacts captured from the live codebase

**Key Content:**
- `architecture-reality-check.md` (model/contract truths)
- `plan-vs-reality-diff.md` (assumption corrections)
- `verified-ratecard-dependency-map.md` (server-side dependency inventory)
- `client-ratecard-inventory.md` (C4 deletion inventory)

**Read this if:** You're about to execute Stage B0/C3/C4 and need exact file-accurate cutover scope.

---

## Execution Sequence (For Implementation Teams)

### Phase 0: Foundation (Current State)
✅ **COMPLETE** - Service-level architecture is implemented and working

**Verification:**
- All 6 models exist and are exported
- Quote → Book → Reconcile lifecycle functional
- Integration tests passing

---

### Phase 1: Core Stabilization (Completed)

**Completed:**
1. `ServiceRateCardFormulaService` centralized pricing logic.
2. Booking fallback orchestration with pre-AWB retry boundaries.
3. Canonical contract lock for order quote + quote-based booking.
4. Service-ratecard simulation upgraded to formula breakdown output.

**Release Gate Command:**
```bash
npm run test:service-level-pricing:gate --prefix server
```

---

### Phase 2: Contract Freeze and Consumer Hardening (Completed)

**Completed:**
1. `/api/v1/orders/courier-rates` returns canonical quote-session payload.
2. `/api/v1/orders/:orderId/ship` enforces `sessionId` and `optionId` with 422 validation.
3. Admin shipment UI now consumes canonical quote mapping and shows breakdown.
4. Admin Pricing Studio route exists at `/admin/pricing-studio`.

---

### Phase 3: Legacy Deletion Readiness (Active Now)

**Objective:**
Build a dependency-accurate removal map before deleting legacy modules.

**Reference:**
- [Legacy_Deletion_Readiness_Map.md](./Legacy_Deletion_Readiness_Map.md)

**Exit Criteria:**
1. Every legacy module has consumer inventory by domain.
2. Every consumer has a replacement target.
3. Deletion order is sequenced and rollback-safe.

---

### Phase 4: Legacy Cleanup Execution (Next)

**Prerequisite:** Phase 3 readiness map approved and tracked.

**Actions:**
1. Migrate remaining legacy consumers off orchestrator/dynamic/selector stack.
2. Retire legacy ratecard controller/routes.
3. Retire legacy `RateCard` model usage in runtime/admin/onboarding/seeders.
4. Remove exports/imports/index bindings once references hit zero.

**Verification Commands:**
```bash
rg "PricingOrchestratorService|DynamicPricingService|RateCardSelectorService" server/src
rg "controllers/shipping/ratecard.controller|ratecardController" server/src
rg "logistics/shipping/configuration/rate-card.model|\\bRateCard\\b" server/src
```

---

### Phase 5: Enhancements (Blueprint Section 12, Post-Launch)

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
| **Centralized Formula** | ✅ Complete | 11, Item 1 | Phase 1 | No |
| **Booking Fallback** | ✅ Complete | 12.5 | Phase 1 | No |
| **Contract Lock** | ✅ Complete | Phase 2 | Phase 2 | No |
| **Legacy Deletion Readiness** | ⚠️ Active (Stage A/B done) | 7-8 | Phase 3 | No |
| **Legacy Cleanup Execution** | ⚠️ Pending | 7-8 | Phase 4 | No |
| **Unified Pricing Studio** | ✅ Initial Delivered | 12.2 | N/A | No |
| **Explainable Quotes** | ⚠️ Partial (75%) | 12.3 | N/A | No |
| **Policy Autopilot** | ⚠️ Partial (50%) | 12.4 | N/A | No |
| **Margin Watch** | ⚠️ Partial (40%) | 12.6 | N/A | No |
| **Enterprise Security** | ⚠️ Partial (55%) | 12.7 | N/A | No |

**Launch-Blocking Items:**
1. None in core service-level pricing path.

**Critical Path:** Stage C/D legacy retirement (admin/onboarding/data model cleanup).

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

**Last Verified:** February 11, 2026
**Architecture Status:** Service-level foundation complete, Stage C/D legacy retirement active
