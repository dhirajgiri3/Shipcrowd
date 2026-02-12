# ADR: Service-Level Pricing Strategy Defaults

- Status: Accepted
- Date: 2026-02-12
- Owners: Shipping Platform

## Context

Service-level pricing currently supports multiple data sources and configuration patterns:

- Table-driven rate cards
- Live courier rate APIs
- Hybrid flows where live rates and configured pricing may diverge

To reduce pricing nondeterminism and simplify rollout safety, strategy defaults and core semantics must be explicit and stable across code, APIs, and admin behavior.

## Decision

### 1) Default pricing strategy

Default strategy is `TABLE_PRIMARY_LIVE_VALIDATE`.

- Table pricing is authoritative for computed quote totals.
- Live rates are fetched when available for drift visibility, not for overriding seller price by default.
- Strategy overrides must be explicit and feature-flagged.

### 2) Slab boundary semantics

Weight slab boundaries use half-open intervals: `[minKg, maxKg)`.

- Lower bound is inclusive.
- Upper bound is exclusive.
- This convention is shared across validation, simulation, and quote computation.

### 3) Effective window semantics

Rate card effective windows use `[startDate, endDate)`.

- `startDate` is inclusive.
- `endDate` is exclusive.
- Open-ended windows are allowed by omitting `endDate`.

### 4) Overlap policy

For active cards, overlapping windows for the same tuple `(companyId, serviceId, cardType)` are invalid and must be rejected at write time.

### 5) Tax baseline

Runtime baseline for courier service billing remains aligned to current implementation (18% path), unless tenant-specific tax profile logic explicitly overrides it.

### 6) Rollout control

The following environment flags are reserved for rollout gating:

- `SERVICE_LEVEL_PRICING_STRATEGY_ENABLED`
- `SERVICE_LEVEL_RTO_PRICING_ENABLED`
- `SERVICE_LEVEL_ZONE_MATRIX_ENABLED`

In this phase, these flags are read-only plumbing and do not change runtime behavior.

### 7) RTO fallback semantics

When a zone has no explicit `rtoRule`, runtime applies `forward_mirror` fallback.

- Fallback charge mirrors forward freight subtotal only (`baseCharge + weightCharge`).
- Fuel and COD are not part of fallback base.
- Pricing breakdown must expose fallback usage for auditability.

## Consequences

### Positive

- Reduces ambiguity in pricing behavior.
- Establishes deterministic boundaries before strategy and validation hardening PRs.
- Creates a shared reference for API/UI/backend implementations.

### Trade-offs

- Some existing data may rely on implicit semantics and will require normalization in subsequent PRs.
- Deferred advanced zone realism is explicitly acknowledged.

## Follow-up Work

- Implement discriminated COD rule validation and slab persistence guarantees.
- Enforce active window overlap rejection at write time.
- Introduce canonical strategy orchestrator and provider context propagation.
- Implement RTO pricing with documented fallback behavior.
- Expand provider-specific service mapping for additional carriers as they add service identifiers.
