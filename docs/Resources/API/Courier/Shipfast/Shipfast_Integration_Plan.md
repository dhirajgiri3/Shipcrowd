# ShipFast Velocity Courier Complete Integration Plan

**Date**: February 2, 2026
**Version**: 1.0
**Scope**: Complete Velocity ShipFast courier integration with all available APIs
**Estimated Time**: ~35-40 hours

## User Decisions (Confirmed)
- **Rate Calculation**: Use internal rate cards with Velocity zone data
- **Split Flow APIs**: Yes, implement both forward and reverse split flows
- **Reports API**: Include in this implementation phase
- **Scope**: Complete API + All Internal Workflows (including NDR Branching & Notification Preferences)
- **Total Scope**: ~50 hours of implementation

---

## Executive Summary

The ShipFast Velocity API documentation provides **10 API endpoints** for courier integration. Your existing implementation covers **~70%** of these APIs. This plan completes the remaining 30% and enhances the existing implementation with better response mapping, rate calculation integration, and analytics.

### Current vs Complete State

| API | Current Status | After Implementation |
|-----|---------------|---------------------|
| Authentication | COMPLETE | COMPLETE |
| Create Warehouse | COMPLETE | COMPLETE |
| Serviceability | COMPLETE | ENHANCED (with zone) |
| Forward Order Orchestration | COMPLETE | COMPLETE |
| Forward Order Split Flow | MISSING | COMPLETE |
| Reverse Order Orchestration | COMPLETE | COMPLETE |
| Reverse Order Split Flow | MISSING | COMPLETE |
| Cancel Order | COMPLETE | COMPLETE |
| Order Tracking | COMPLETE | COMPLETE |
| Reports API | MISSING | COMPLETE |

### Key Insight from Industry Research

Based on research of major Indian courier APIs (Delhivery, Shiprocket, ClickPost, NimbusPost):

- **Couriers provide execution APIs** - create, track, cancel shipments
- **Aggregators build business logic** - NDR workflows, RTO decisions, COD settlement
- **Typical endpoints** match Velocity's API set almost completely
- **Missing from Velocity** (industry-wide gaps): Webhook registration API, POD image download, direct rate calculation

**Verdict**: Velocity's API is comprehensive for a courier. The "missing" features (NDR workflows, COD settlement, weight reconciliation) are correctly implemented as internal ShipCrowd logic.

---

## Phase 1: Type Definitions (2 hours)

### Files to Modify

**File**: `server/src/infrastructure/external/couriers/velocity/velocity.types.ts`

### New Types to Add

```typescript
// ==================== SPLIT FLOW - FORWARD ORDER ====================

export interface VelocityForwardOrderOnlyResponse {
  pickup_location_added: number;
  order_created: number;
  awb_generated: number;  // Will be 0
  pickup_generated: number;  // Will be 0
  shipment_id: string;  // KEY: Needed for assignCourier step
  order_id: string;
  assigned_date_time: { date: string; timezone_type: number; timezone: string };
  applied_weight: number | null;
  cod: number;
  label_url: string | null;
  manifest_url: string | null;
  routing_code: string | null;
  rto_routing_code: string | null;
  pickup_token_number: string | null;
}

export interface VelocityAssignCourierRequest {
  shipment_id: string;
  carrier_id?: string;  // Optional - auto-assign if blank
}

// ==================== SPLIT FLOW - REVERSE ORDER ====================

export interface VelocityReverseOrderOnlyResponse {
  order_created: number;
  awb_generated: number;  // Will be 0
  pickup_generated: number;  // Will be 0
  pickup_scheduled_date: string | null;
  order_id: string;
  return_id: string;  // KEY: Needed for assignReverseCourier step
  assigned_date_time: { date: string; timezone_type: number; timezone: string };
  cod: number;
}

export interface VelocityAssignReverseCourierRequest {
  return_id: string;
  warehouse_id: string;
  carrier_id?: string;  // Optional
}

// ==================== REPORTS API ====================

export interface VelocityReportsRequest {
  start_date_time: string;  // ISO 8601 format
  end_date_time: string;
  shipment_type: 'forward' | 'return';
}

export interface VelocityReportsSummary {
  count: number;
  sum_of_prepaid_orders: number;
  sum_of_cod_orders: number;
}

export interface VelocityReportsResponse {
  date_range: { start_date_time: string; end_date_time: string };
  shipment_type: 'forward' | 'return';
  summary: {
    // Forward statuses
    pickup_pending?: VelocityReportsSummary;
    in_transit?: VelocityReportsSummary;
    delivered?: VelocityReportsSummary;
    rto_in_transit?: VelocityReportsSummary;
    rto_delivered?: VelocityReportsSummary;
    lost?: VelocityReportsSummary;
    cancelled?: VelocityReportsSummary;
    // Return statuses
    return_pickup_scheduled?: VelocityReportsSummary;
    return_in_transit?: VelocityReportsSummary;
    return_delivered?: VelocityReportsSummary;
    return_lost?: VelocityReportsSummary;
    total_shipments: number;
  };
}

// ==================== ENHANCED SERVICEABILITY ====================

export interface VelocityServiceabilityResult {
  carrier_id: string;
  carrier_name: string;
}

export interface VelocityServiceabilityResponseFull {
  serviceability_results: VelocityServiceabilityResult[];
  zone: string;  // 'zone_a', 'zone_b', etc.
}
```

---

## Phase 2: Split Flow APIs Implementation (8 hours)

### Files to Modify

**Primary**: `server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts`
**Secondary**: `server/src/infrastructure/external/couriers/velocity/velocity-error-handler.ts`

### New Methods to Add

#### 2.1 Forward Order Split Flow

```typescript
/**
 * Step 1: Create Forward Order Only (no courier assignment)
 * Endpoint: POST /custom/api/v1/forward-order
 */
async createForwardOrderOnly(data: CourierShipmentData): Promise<{
  shipmentId: string;
  orderId: string;
  success: boolean;
}>;

/**
 * Step 2: Assign Courier to Existing Order
 * Endpoint: POST /custom/api/v1/forward-order-shipment
 */
async assignCourier(shipmentId: string, carrierId?: string): Promise<CourierShipmentResponse>;
```

#### 2.2 Reverse Order Split Flow

```typescript
/**
 * Step 1: Create Reverse Order Only (no courier assignment)
 * Endpoint: POST /custom/api/v1/reverse-order
 */
async createReverseOrderOnly(data: CourierReverseShipmentData): Promise<{
  returnId: string;
  orderId: string;
  success: boolean;
}>;

/**
 * Step 2: Assign Courier to Reverse Order
 * Endpoint: POST /custom/api/v1/reverse-order-shipment
 */
async assignReverseCourier(
  returnId: string,
  warehouseId: string,
  carrierId?: string
): Promise<CourierReverseShipmentResponse>;
```

### Rate Limiters to Add

**File**: `server/src/infrastructure/external/couriers/velocity/velocity-error-handler.ts`

```typescript
export const VelocityRateLimiters = {
  // ... existing ...
  forwardOrderOnly: new RateLimiter(100, 100),
  assignCourier: new RateLimiter(100, 100),
  reverseOrderOnly: new RateLimiter(50, 50),
  assignReverseCourier: new RateLimiter(50, 50),
  reports: new RateLimiter(20, 20),
};
```

---

## Phase 3: Reports API Implementation (3 hours)

### Files to Create/Modify

**Provider Method**: `server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts`
**New Service**: `server/src/core/application/services/analytics/velocity-reports.service.ts`

### Implementation

```typescript
/**
 * Get Summary Reports from Velocity
 * Endpoint: POST /custom/api/v1/reports
 */
async getSummaryReport(
  startDate: Date,
  endDate: Date,
  shipmentType: 'forward' | 'return'
): Promise<VelocityReportsResponse>;
```

### VelocityReportsService

Creates aggregated analytics from Velocity data:
- Combined forward + return summaries
- Total shipment counts by status
- COD vs Prepaid breakdown

---

## Phase 4: Enhanced Rate Calculation (4 hours)

### Problem

Current `getRates()` returns `price: 0` because Velocity serviceability only returns carrier list, not actual rates.

### Solution

Integrate with ShipCrowd's internal `DynamicPricingService`:

1. Call Velocity serviceability → get available carriers + zone
2. Use zone to lookup internal rate card pricing
3. Return combined result with actual prices

### Files to Modify

**Primary**: `server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts`

```typescript
async getRates(request: CourierRateRequest): Promise<CourierRateResponse[]> {
  // 1. Get serviceability from Velocity (carriers + zone)
  const serviceability = await this.checkServiceabilityWithDetails(request);

  // 2. For each carrier, calculate price using internal rate cards
  const rates: CourierRateResponse[] = [];
  for (const carrier of serviceability.carriers) {
    const pricing = await DynamicPricingService.calculatePricing({
      fromPincode: request.origin.pincode,
      toPincode: request.destination.pincode,
      weight: request.package.weight,
      paymentMode: request.paymentMode,
      externalZone: serviceability.zone,  // Use Velocity's zone
    });

    rates.push({
      basePrice: pricing.shipping,
      taxes: pricing.tax.total,
      total: pricing.total,
      currency: 'INR',
      serviceType: carrier.carrier_name,
      carrierId: carrier.carrier_id,
      zone: serviceability.zone,
    });
  }

  return rates.sort((a, b) => a.total - b.total);
}
```

---

## Phase 5: Enhanced Response Mapping (3 hours)

### Problem

Current implementation doesn't capture all fields from Velocity responses (zone, charges breakdown, routing codes).

### Solution

Update VelocityMapper and Shipment model to capture all useful fields.

### Files to Modify

**Mapper**: `server/src/infrastructure/external/couriers/velocity/velocity.mapper.ts`
**Model**: `server/src/infrastructure/database/mongoose/models/logistics/shipping/shipment.model.ts`

### New Fields in Shipment.carrierDetails

```typescript
carrierDetails: {
  // Existing fields...

  // New Velocity-specific fields
  velocityOrderId: String,
  velocityShipmentId: String,
  zone: String,
  routingCode: String,
  rtoRoutingCode: String,
  pickupTokenNumber: String,
  appliedWeight: Number,
  deadWeightBilling: Boolean,
  manifestUrl: String,

  // Charges breakdown from Velocity
  charges: {
    forwardShippingCharges: Number,
    forwardCodCharges: Number,
    rtoCharges: Number,
    reverseCharges: Number,
    qcCharges: Number,
    platformFee: Number,
  },

  courierAssignedAt: Date,
  pickupScheduledDate: Date,
}
```

---

## Phase 6: Interface Updates (1 hour)

### File to Modify

`server/src/infrastructure/external/couriers/base/courier.adapter.ts`

### Add Optional Split Flow Methods

```typescript
export interface ICourierAdapter {
  // ... existing required methods ...

  // Split Flow Methods (optional - not all couriers support)
  createOrderOnly?(data: CourierShipmentData): Promise<{
    orderId: string;
    providerOrderId: string;
  }>;

  assignCourierToOrder?(
    providerOrderId: string,
    carrierId?: string
  ): Promise<CourierShipmentResponse>;

  createReverseOrderOnly?(data: CourierReverseShipmentData): Promise<{
    orderId: string;
    providerReturnId: string;
  }>;

  assignCourierToReverseOrder?(
    providerReturnId: string,
    warehouseId: string,
    carrierId?: string
  ): Promise<CourierReverseShipmentResponse>;

  // Reports (optional)
  getSummaryReport?(
    startDate: Date,
    endDate: Date,
    type: 'forward' | 'return'
  ): Promise<any>;
}

// Enhanced CourierRateResponse
export interface CourierRateResponse {
  basePrice: number;
  taxes: number;
  total: number;
  currency: string;
  serviceType?: string;
  carrierId?: string;      // NEW: For split flow carrier selection
  estimatedDeliveryDays?: number;
  zone?: string;           // NEW: From serviceability
}
```

---

## Phase 7: Testing (8 hours)

### Unit Tests

**File**: `server/tests/unit/velocity/VelocitySplitFlow.test.ts`

```typescript
describe('Velocity Split Flow APIs', () => {
  describe('createForwardOrderOnly', () => {
    it('should create order without courier assignment');
    it('should return shipment_id for step 2');
    it('should not generate AWB (awb_generated = 0)');
    it('should handle validation errors');
  });

  describe('assignCourier', () => {
    it('should assign courier with specific carrier_id');
    it('should auto-assign if carrier_id is blank');
    it('should return AWB and label URL');
    it('should handle invalid shipment_id');
  });

  // Similar tests for reverse flow...
});

describe('Velocity Reports API', () => {
  it('should fetch forward shipment summary');
  it('should fetch return shipment summary');
  it('should handle date range correctly');
  it('should handle empty results');
});

describe('Velocity Enhanced getRates', () => {
  it('should return actual prices from internal rate cards');
  it('should include carrier_id in results');
  it('should include zone from serviceability');
  it('should sort by price ascending');
});
```

### Integration Tests

**File**: `server/tests/integration/velocity/velocity-complete.integration.test.ts`

```typescript
describe('Velocity Complete Flow Integration', () => {
  it('should complete split flow: createOrderOnly -> getRates -> assignCourier');
  it('should complete reverse split flow: createReverseOrderOnly -> assignReverseCourier');
  it('should match internal rates with Velocity zone');
  it('should capture all response fields in shipment model');
});
```

---

## Phase 8: Documentation (2 hours)

### Files to Create

1. **API Documentation**: `docs/Resources/API/Courier/Shipfast/Velocity_Integration_Guide.md`
   - All available endpoints
   - Request/response examples
   - Error handling
   - Split flow usage guide

2. **Internal Logic Documentation**: Update existing Foundation document
   - Document what features use internal logic vs API
   - NDR workflow (tracking-based detection)
   - COD settlement (MIS file import)
   - Weight reconciliation (webhook-based)

---

## Implementation Sequence

| Step | Task | Files | Est. Time |
|------|------|-------|-----------|
| 1 | Add new type definitions | `velocity.types.ts` | 2h |
| 2 | Add rate limiters | `velocity-error-handler.ts` | 30m |
| 3 | Implement `createForwardOrderOnly()` | `velocity-shipfast.provider.ts` | 2h |
| 4 | Implement `assignCourier()` | `velocity-shipfast.provider.ts` | 1.5h |
| 5 | Implement `createReverseOrderOnly()` | `velocity-shipfast.provider.ts` | 2h |
| 6 | Implement `assignReverseCourier()` | `velocity-shipfast.provider.ts` | 1.5h |
| 7 | Implement `getSummaryReport()` | `velocity-shipfast.provider.ts` | 2h |
| 8 | Create `VelocityReportsService` | New file | 1h |
| 9 | Enhance `getRates()` with pricing | `velocity-shipfast.provider.ts` | 4h |
| 10 | Update response mapping | `velocity.mapper.ts` | 2h |
| 11 | Update Shipment model | `shipment.model.ts` | 1h |
| 12 | Update base interface | `courier.adapter.ts` | 1h |
| 13 | Write unit tests | New test files | 5h |
| 14 | Write integration tests | New test files | 3h |
| 15 | Update documentation | Doc files | 2h |

**Total: ~35 hours**

---

## Verification Plan

### Manual API Testing (Against Velocity Staging)

```bash
# 1. Serviceability with zone
POST /custom/api/v1/serviceability
{ "from": "110001", "to": "400001", "payment_mode": "prepaid", "shipment_type": "forward" }
# Verify: zone field is returned

# 2. Split Flow - Forward
POST /custom/api/v1/forward-order
# Verify: shipment_id returned, awb_generated = 0

POST /custom/api/v1/forward-order-shipment
{ "shipment_id": "SHIXXX", "carrier_id": "CARXXX" }
# Verify: AWB and label_url returned

# 3. Split Flow - Reverse
POST /custom/api/v1/reverse-order
# Verify: return_id returned, awb_generated = 0

POST /custom/api/v1/reverse-order-shipment
{ "return_id": "RETXXX", "warehouse_id": "WHXXX" }
# Verify: AWB returned

# 4. Reports
POST /custom/api/v1/reports
{ "start_date_time": "2026-01-01T00:00:00Z", "end_date_time": "2026-02-01T00:00:00Z", "shipment_type": "forward" }
# Verify: Summary with status counts
```

### Automated Test Verification

```bash
# Run unit tests
cd server && npm run test tests/unit/velocity/

# Run integration tests
cd server && npm run test tests/integration/velocity/

# Verify all pass before deployment
```

---

## What's NOT Implemented (By Design)

These features are **correctly** implemented as internal ShipCrowd logic, not via Velocity API:

| Feature | Why Internal | Implementation |
|---------|-------------|----------------|
| NDR Workflow | Velocity has no NDR API; detect from tracking | `velocity-webhook.service.ts` |
| RTO Decisions | Business logic, not courier function | `rto.service.ts` |
| COD Settlement | Velocity provides MIS files, not API | `velocity-remittance.service.ts` |
| Weight Dispute | Detected via webhook `SHIPMENT_WEIGHT_SCANNED` | `weight-dispute-detection.service.ts` |
| Rate Cards | ShipCrowd manages pricing, not Velocity | `dynamic-pricing.service.ts` |
| Fraud Detection | Aggregator responsibility | Future: `risk-engine.service.ts` |

---

## Critical Files Summary

| File | Purpose |
|------|---------|
| `server/src/infrastructure/external/couriers/velocity/velocity.types.ts` | All type definitions |
| `server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts` | Main provider with all API methods |
| `server/src/infrastructure/external/couriers/velocity/velocity.mapper.ts` | Request/response transformation |
| `server/src/infrastructure/external/couriers/velocity/velocity-error-handler.ts` | Error handling + rate limiters |
| `server/src/infrastructure/external/couriers/base/courier.adapter.ts` | Base interface for all couriers |
| `server/src/infrastructure/database/mongoose/models/logistics/shipping/shipment.model.ts` | Shipment data model |
| `server/src/core/application/services/analytics/velocity-reports.service.ts` | NEW: Reports aggregation service |

---

---

# PART 2: Internal Workflow Features

## What Already Exists — Verified Assessment

Based on **deep codebase analysis** (logic, field mapping, API alignment, and integration points), below is the verified status. "Production-Ready" means the feature works end-to-end without stubs or critical gaps.

| Feature | Verified Status | Production-Ready? | Key Files | Notes |
|---------|-----------------|-------------------|-----------|--------|
| NDR Detection | 90% | Yes | `ndr-detection.service.ts` | Pattern matching & duplicate detection present. No Velocity-specific NDR mapping. |
| NDR Classification | 95% | Yes | `ndr-classification.service.ts` | OpenAI integration & batch processing (10 NDRs concurrent). |
| NDR Resolution | 100% | Yes | `ndr-resolution.service.ts` | Conditional branching supported via workflow `conditions`; auto-skips actions when customer responds. |
| NDR Communication | 100% | Yes | `ndr-communication.service.ts` | WhatsApp + SMS + Email implemented with notification preferences support. |
| NDR Analytics | 95% | Yes | `ndr-analytics.service.ts` | Aggregation pipelines, courier breakdown, trends. |
| RTO Service | 95% | Yes | `rto.service.ts` | Reverse pickup scheduling implemented via courier adapter; Velocity auto-schedule supported. |
| COD Remittance | 100% | Yes | `cod-remittance.service.ts` | Settlement webhook reconciles shipments, batches, and alerts. |
| COD Excel Parser | 95% | Yes | `remittance-reconciliation.service.ts` | Provider mapping + override support; header normalization improved. |
| Email Service | 100% | Yes | `email.service.ts` | SendGrid, ZeptoMail, SMTP; retries + circuit breaker. |
| SMS Service | 85% | Yes | `sms.service.ts` | Twilio with retry. **No rate limiting or queueing.** |
| WhatsApp Service | 95% | Yes | `whatsapp.service.ts` (external) | Meta Business API, templates, mock mode. |
| Voice Calling | 90% | Yes | `exotel.client.ts` | Exotel client: initiateCall, getCallStatus, mock mode. |

---

## Critical Issues (Resolved)

The following items were previously flagged and are now **resolved**:
- ✅ RTO reverse pickup scheduling implemented via courier adapter (Velocity auto-schedule supported).
- ✅ NDR conditional branching supported via workflow `conditions` and runtime evaluation.
- ✅ COD settlement webhook fully reconciles shipments and batches with discrepancy alerts.
- ✅ COD MIS parsing supports configurable column mapping and header normalization.
- ✅ NDR SMS channel implemented and wired into workflows.

Remaining enhancements (optional):
- SMS rate limiting/queueing for very high-volume campaigns.

---

## What to Do Next — Execution Roadmap

**Goal**: Shipfast Velocity 100% integrated — all APIs complete, all internal workflows working (no stubs/mocks), with proper testing and verification.

**Approach**: Implement in four tiers. Fix existing gaps first so nothing is "fake complete," then complete missing APIs, then add new workflow features, then lock in quality with tests and docs.

### Tier 1 — Fix Critical Gaps (Existing Features Actually Work)

| # | Task | Phase / Ref | Est. | Why First |
|---|------|-------------|------|-----------|
| 1 | **COD Settlement Webhook** — implement reconciliation logic | Phase 11 | 3h | Webhook is currently mocked; settlement data never applied. |
| 2 | **RTO Pickup Scheduling** — implement `scheduleReversePickup` | Phase 10 | 4h | Method is stubbed; RTO flow incomplete. |
| 3 | **NDR Communication SMS** — add SMS branch in `sendNDRNotification` | Additional gap | ~1h | `channel: 'sms'` / `'all'` currently does nothing for SMS. |
| 4 | **COD Excel Parser** — configurable column mapping (per provider or header map) | Critical issue #4 | ~2h | Non-standard MIS headers (e.g. "Ref No", "Value") fail silently. |

**Outcome**: Settlement webhook, RTO pickup, NDR SMS, and MIS parsing are real and verifiable.

### Tier 2 — Complete Velocity API (100% API Coverage)

| # | Task | Phase | Est. | Notes |
|---|------|-------|------|--------|
| 1 | Type definitions (split flow + reports) | Phase 1 | 2h | `velocity.types.ts` |
| 2 | Rate limiters for new endpoints | Phase 2 | 30m | `velocity-error-handler.ts` |
| 3 | `createForwardOrderOnly()` + `assignCourier()` | Phases 3–4 | 3.5h | Split flow forward |
| 4 | `createReverseOrderOnly()` + `assignReverseCourier()` | Phases 5–6 | 3.5h | Split flow reverse |
| 5 | `getSummaryReport()` | Phase 7 | 2h | Reports API |
| 6 | Enhanced `getRates()` with internal pricing + zone | Phase 8 | 4h | Real rates from rate cards |
| 7 | Response mapping + Shipment model fields | Phase 5 (mapping) | 2h | Capture zone, routing, charges |

**Outcome**: All 10 Velocity endpoints implemented and usable; rates and reports aligned with plan.

### Tier 3 — Internal Workflow Enhancements

| # | Task | Phase | Est. | Notes |
|---|------|-------|------|--------|
| 1 | **NDR Workflow Branching** — conditions on customer response | Phase 12 | 4h | Fix linear-only resolution. |
| 2 | Lost Shipment Detection job + service | Phase 9 | 6h | New feature. |
| 3 | Customer Notification Preferences (model + service) | Phase 13 | 4h | Opt-in/opt-out, quiet hours. |

**Outcome**: NDR resolution supports branching; lost shipment detection and notification preferences are in place.

### Tier 4 — Quality & Verification

| # | Task | Phase | Est. | Notes |
|---|------|-------|------|--------|
| 1 | Unit tests (Velocity, lost shipment, NDR workflow, settlement, RTO) | Phase 14 | 6h | Cover new and fixed code. |
| 2 | Integration tests (split flow, reports, settlement webhook) | Phase 15 | 4h | End-to-end against staging/mock. |
| 3 | Documentation (Velocity Integration Guide, plan updates) | Phase 16 | 2h | API usage, split flow, verification steps. |
| 4 | **Verification checklist** | — | — | Run plan’s verification steps; confirm no stubs/mocks in critical paths. |

**Outcome**: Features are tested and documented; Shipfast Velocity integration is verifiable and maintainable.

### Suggested Order (One by One)

1. **Tier 1** (fix gaps) → **Tier 2** (API completion) → **Tier 3** (workflow features) → **Tier 4** (tests + docs).  
2. Within each tier, do items in the table order unless you have a reason to reorder (e.g. dependency).  
3. After each item (or small batch), run relevant tests and update the plan’s verification section so progress is clear.

### Summary

| Tier | Focus | Est. Total |
|------|--------|------------|
| 1 | Fix critical gaps | ~10h |
| 2 | Complete Velocity API | ~17h |
| 3 | Internal workflow enhancements | ~14h |
| 4 | Quality & verification | ~12h |
| **Total** | **Shipfast 100% integrated, tested, documented** | **~53h** |

Yes — the plan is to implement these features one by one per the Integration Plan (using the order above), so Shipfast Velocity is 100% integrated with all features working and proper testing and verification.

---

## Phase 9: Lost Shipment Detection (NEW - 6 hours)

**Problem**: No detection for shipments stuck in transit 14+ days without updates.

### Files to Create

**Job**: `server/src/infrastructure/jobs/logistics/lost-shipment-detection.job.ts`

```typescript
/**
 * Lost Shipment Detection Job
 * Runs daily to identify potentially lost shipments
 *
 * Detection Criteria:
 * 1. Status "in_transit" or "out_for_delivery" for > 14 days
 * 2. No tracking updates for > 7 days
 * 3. NDR created but not resolved in > 10 days
 */
export class LostShipmentDetectionJob {
  async execute(): Promise<void>;
  private async findStuckInTransit(): Promise<Shipment[]>;
  private async findNoRecentUpdates(): Promise<Shipment[]>;
  private async findStaleNDRs(): Promise<Shipment[]>;
  private async escalateToAdmin(shipments: Shipment[]): Promise<void>;
  private async notifySeller(shipment: Shipment): Promise<void>;
}
```

**Service**: `server/src/core/application/services/shipping/lost-shipment.service.ts`

```typescript
export class LostShipmentService {
  // Query criteria for different stuck patterns
  async getStuckShipments(companyId: string, criteria: StuckCriteria): Promise<Shipment[]>;

  // Mark shipment as potentially lost
  async markAsPotentiallyLost(shipmentId: string, reason: string): Promise<void>;

  // Escalate to admin dashboard
  async escalate(shipmentId: string, priority: 'low' | 'medium' | 'high'): Promise<void>;

  // Insurance claim workflow trigger
  async initiateInsuranceClaim(shipmentId: string): Promise<void>;

  // Analytics
  async getLostShipmentStats(companyId: string, dateRange: DateRange): Promise<LostStats>;
}
```

**Model Update**: `server/src/infrastructure/database/mongoose/models/logistics/shipping/shipment.model.ts`

Add fields:
```typescript
lostShipmentDetails?: {
  detectedAt: Date;
  reason: 'stuck_in_transit' | 'no_updates' | 'stale_ndr' | 'manual';
  daysStuck: number;
  escalatedAt?: Date;
  escalationPriority?: 'low' | 'medium' | 'high';
  resolvedAt?: Date;
  resolution?: 'found' | 'confirmed_lost';
}
```

---

## Phase 10: RTO Pickup Scheduling (4 hours)

**Problem**: `scheduleReversePickup` is stubbed/commented out.

### Files to Modify

**File**: `server/src/core/application/services/shipping/rto.service.ts`

Uncomment and complete:
```typescript
/**
 * Schedule Reverse Pickup with Velocity
 * Uses: POST /custom/api/v1/reverse-order-shipment (if split flow)
 * Or schedule via existing reverse shipment
 */
async scheduleReversePickup(
  rtoEventId: string,
  preferredDate?: Date,
  timeSlot?: 'morning' | 'afternoon' | 'evening'
): Promise<{ success: boolean; scheduledDate: Date; pickupToken?: string }>;
```

**Integration**: Connect to Velocity's pickup scheduling if available, or use existing reverse shipment flow.

---

## Phase 11: Velocity Settlement Webhook (3 hours)

**Problem**: `handleSettlementWebhook` has mocked reconciliation logic.

### Files to Modify

**File**: `server/src/core/application/services/webhooks/velocity-webhook.service.ts`

Complete the settlement webhook handler:
```typescript
async handleSettlementWebhook(payload: VelocitySettlementPayload): Promise<void> {
  // 1. Parse settlement data (AWBs, amounts, dates)
  // 2. Match with internal COD remittance batches
  // 3. Update remittance status if amounts match
  // 4. Flag discrepancies for manual review
  // 5. Trigger payout if auto-payout enabled
}
```

**New Type**: `server/src/infrastructure/external/couriers/velocity/velocity-webhook.types.ts`
```typescript
export interface VelocitySettlementPayload {
  event_type: 'SETTLEMENT_COMPLETED';
  settlement_id: string;
  settlement_date: string;
  total_amount: number;
  shipments: Array<{
    awb: string;
    cod_amount: number;
    shipping_deduction: number;
    net_amount: number;
  }>;
}
```

---

## Phase 12: NDR Workflow Branching Enhancement (4 hours)

**Problem**: NDR workflows are static sequences, no conditional logic based on customer response.

### Files to Modify

**File**: `server/src/core/application/services/ndr/ndr-resolution.service.ts`

Add conditional evaluation:
```typescript
/**
 * Evaluate workflow conditions based on customer response
 */
private async evaluateWorkflowConditions(
  ndrEvent: NDREvent,
  customerResponse: CustomerResponse
): Promise<NextAction> {
  // If customer confirms address → skip address update step
  // If customer requests specific date → schedule reattempt
  // If customer refuses → trigger RTO immediately
  // If no response after X hours → escalate
}
```

**Model Update**: `server/src/infrastructure/database/mongoose/models/ndr/ndr-workflow.model.ts`

Add conditional fields:
```typescript
actions: [{
  type: string;
  delay: number;
  conditions?: {
    field: string;  // e.g., 'customerResponse.action'
    operator: 'equals' | 'contains' | 'exists' | 'not_exists';
    value: any;
    nextAction: string;  // Jump to specific action if condition met
  }[];
}]
```

---

## Phase 13: Customer Notification Preferences (4 hours)

**Problem**: No opt-in/opt-out system for customer communications.

### Files to Create

**Model**: `server/src/infrastructure/database/mongoose/models/customer/notification-preference.model.ts`

```typescript
export interface INotificationPreference {
  customerId: ObjectId;
  phone: string;
  email?: string;
  channels: {
    whatsapp: { enabled: boolean; optedOutAt?: Date };
    sms: { enabled: boolean; optedOutAt?: Date };
    email: { enabled: boolean; optedOutAt?: Date };
  };
  categories: {
    shipmentUpdates: boolean;
    ndrAlerts: boolean;
    marketing: boolean;
    promotions: boolean;
  };
  frequency: 'all' | 'important_only' | 'minimal';
  quietHours?: { start: string; end: string };  // e.g., "22:00" to "08:00"
}
```

**Service**: `server/src/core/application/services/customer/notification-preference.service.ts`

---

## Updated Implementation Sequence

| Phase | Task | Est. Time | Priority |
|-------|------|-----------|----------|
| **API Completion** |||
| 1 | Type definitions for split flow + reports | 2h | HIGH |
| 2 | Rate limiters for new endpoints | 30m | HIGH |
| 3 | `createForwardOrderOnly()` | 2h | HIGH |
| 4 | `assignCourier()` | 1.5h | HIGH |
| 5 | `createReverseOrderOnly()` | 2h | HIGH |
| 6 | `assignReverseCourier()` | 1.5h | HIGH |
| 7 | `getSummaryReport()` | 2h | MEDIUM |
| 8 | Enhanced `getRates()` with internal pricing | 4h | HIGH |
| **Internal Workflows** |||
| 9 | Lost Shipment Detection Job + Service | 6h | HIGH |
| 10 | RTO Pickup Scheduling (uncomment + complete) | 4h | MEDIUM |
| 11 | Velocity Settlement Webhook (complete) | 3h | MEDIUM |
| 12 | NDR Workflow Branching | 4h | MEDIUM |
| 13 | Customer Notification Preferences | 4h | MEDIUM |
| **Quality** |||
| 14 | Unit tests for new features | 6h | HIGH |
| 15 | Integration tests | 4h | HIGH |
| 16 | Documentation updates | 2h | MEDIUM |

**Total: ~48-50 hours**

---

## Verification Plan

### API Testing
```bash
# Split Flow
curl -X POST /custom/api/v1/forward-order  # Should return shipment_id
curl -X POST /custom/api/v1/forward-order-shipment  # Should return AWB

# Reports
curl -X POST /custom/api/v1/reports  # Should return summary stats
```

### Lost Shipment Detection
```bash
# Run job manually
npm run job:lost-shipment-detection

# Check results
db.shipments.find({ "lostShipmentDetails.detectedAt": { $exists: true } })
```

### Settlement Webhook
```bash
# Simulate webhook
curl -X POST /api/v1/webhooks/velocity \
  -H "Content-Type: application/json" \
  -d '{"event_type": "SETTLEMENT_COMPLETED", "shipments": [...]}'

# Verify reconciliation
db.cod_remittances.find({ status: "reconciled" })
```

### Unit Tests
```bash
cd server
npm run test tests/unit/velocity/
npm run test tests/unit/lost-shipment/
npm run test tests/unit/ndr-workflow/
```

---

## Sources

Research was conducted using:
- [Delhivery API Documentation](https://one.delhivery.com/developer-portal/documents)
- [ClickPost Carrier Integration](https://www.clickpost.ai/carrier-integration)
- [Shiprocket API](https://apidocs.shiprocket.in/)
- [Indian Courier API GitHub](https://github.com/rajatdhoot123/indian-courier-api)
- [Delhivery Express API Reference](https://delhivery-express-api-doc.readme.io/reference/introduction-1)
- [ClickPost vs Shiprocket Comparison](https://wareiq.com/resources/blogs/clickpost-vs-shiprocket-vs-wareiq/)
- [NimbusPost Features](https://www.clickpost.ai/carrier-integration/nimbus-post)
