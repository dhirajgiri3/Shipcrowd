# Architecture Document Fixes Summary

**Date:** February 8, 2026  
**Document:** Courier_Ratecard_Target_Architecture.md  
**Version:** v2 → v3 (Production Ready)  
**Status:** ✅ ALL CRITICAL FIXES APPLIED

---

## Critical Fixes Applied

### 1. [HIGH] Ekart API Capabilities - FIXED ✅

**Problem:** Ekart marked as "TBD/assumed" despite verified API documentation and existing integration code.

**Fix Applied:**
- Changed source strategy from "TABLE primary" to "LIVE_API primary + TABLE fallback"
- Documented actual API endpoints:
  - Auth: `/integrations/v2/auth/token/{client_id}`
  - Serviceability: `/data/v3/serviceability` (lane-level, recommended)
  - Pricing: `/data/pricing/estimate` (detailed estimate)
  - Tracking: `/api/v1/track/{id}` and `/data/v1/elite/track/{wbn}`
  - NDR Actions: `/api/v2/package/ndr`
  - Webhooks: ✅ Supported

**Design Rule:** Use lane-level `/data/v3/serviceability` in quote engine for route-level carrier options, and use `/data/pricing/estimate` when detailed cost breakdown is required.

**Quote Engine Source Strategy Updated:**
```
Delhivery: LIVE_API (primary) → TABLE (fallback)
Ekart: LIVE_API (primary, via /data/v3/serviceability + /data/pricing/estimate) → TABLE (fallback)  [FIXED]
Velocity: TABLE (primary for pre-quotes) → Actual charges captured post-booking
```

---

### 2. [HIGH] Booking Rollback Pattern - FIXED ✅

**Problem:** "Rollback = delete shipment" is unsafe after external AWB creation, violates audit trail integrity.

**Fix Applied:** Saga compensation pattern with immutable records

**Before AWB Creation:**
- Refund wallet
- Mark shipment status: `booking_failed`
- Keep immutable shipment record with failure reason

**After AWB Creation:**
- Keep shipment record (never delete)
- Mark status: `booking_partial`
- Log compensation event
- Refund wallet transaction
- Create support ticket for manual AWB cancellation

**Principle:** Maintain immutable audit trail with compensation status, never delete financial/operational records.

---

### 3. [HIGH] Ekart Serviceability Pattern - FIXED ✅

**Problem:** Quote engine may use weak pincode-level serviceability instead of lane-level.

**Fix Applied:**
- **Primary:** Use `/data/v3/serviceability` (origin + destination lane-level)
  - Returns accurate carrier options for route
  - Returns route-level charge blocks (`forwardDeliveredCharges`, etc.)
  - More reliable for quote generation
- **Fallback:** Use `/api/v2/serviceability/{pincode}` only if lane-level fails

**Quote Engine Step 4 Updated:**
```typescript
4. Parallel Serviceability Check with Timeout Budget:
   - Ekart: Call /data/v3/serviceability (lane-level, 2s timeout)
   - Delhivery: Call /c/api/pin-codes/json/ (1.5s timeout)
   - Velocity: Call /custom/api/v1/serviceability (1.5s timeout)
   - On timeout: Mark provider as unavailable, continue with others
   - Partial results: Return available quotes with confidence: medium flag
```

---

### 4. [MEDIUM] Velocity Auth Description - FIXED ✅

**Problem:** Labeled as "Static Token" which is misleading.

**Fix Applied:**
- Changed to: "Token via Auth API"
- Accurate description: "Token obtained via auth endpoint, 24h validity"
- Endpoint: `/custom/api/v1/auth-token`

---

### 5. [MEDIUM] Quote Latency Target - FIXED ✅

**Problem:** p95 < 1200ms target unrealistic without partial result strategy.

**Fix Applied:** Per-provider timeout budgets + partial results

**Timeout Budget:**
- Ekart serviceability: 2s
- Delhivery serviceability: 1.5s
- Delhivery pricing: 1s
- Velocity serviceability: 1.5s

**Partial Result Strategy:**
- If any provider times out: Continue with successful providers
- Mark partial result options with `confidence: medium`
- Circuit breaker: Skip provider for 30s after 5 consecutive failures
- Better UX: Show available quotes immediately rather than failing entire request

**Graceful Degradation:**
- If Delhivery/Ekart live API fails: Fall back to table with `confidence: low`
- If all providers fail serviceability: Return error with retry suggestion
- If quote engine fails: Return fallback single-provider quote (legacy path)

---

### 6. [MEDIUM] Rollout Strategy - FIXED ✅

**Problem:** Inconsistent wording between "single cutover" and "phased rollout".

**Fix Applied:** Explicit 8-stage rollout with feature flags

**Phased Rollout Plan:**
1. **Week 1-4:** Build data + services (flag OFF, production stable)
2. **Week 5-8:** Build API + Admin UX (flag: `ENABLE_SERVICE_LEVEL_PRICING`, default: false)
3. **Week 9-12:** Build Seller UX + Reconciliation
4. **Week 11:** Enable for internal company only (beta)
5. **Week 12:** Enable for 10% of companies (canary)
6. **Week 13:** Enable for 50% of companies (gradual)
7. **Week 14:** Enable for 100% of companies (full rollout)
8. **Week 15+:** Deprecate legacy (3-month grace period)

**Feature Flag Behavior:**
- `false`: Use existing `RateCard` + `DynamicPricingService` (current)
- `true`: Use new `ServiceRateCard` + `QuoteEngineService`
- **Dual-write period (Week 11-14):** Write to both systems for safety

---

## New Addition: Seller Selection Behavior

**Default Mode:** `manual_with_recommendation`
- Seller sees all allowed quote options
- System pre-selects best option with "RECOMMENDED" tag
- Seller can override and choose any displayed option

**Per-Seller Policy Configuration:**
```typescript
{
  allowedProviders: string[],         // Whitelist
  allowedServiceIds: ObjectId[],      // Specific services
  blockedProviders: string[],         // Blacklist
  blockedServiceIds: ObjectId[],      
  selectionMode: 'manual_with_recommendation' | 'auto' | 'manual_only',
  autoPriority: 'price' | 'speed' | 'balanced',
  balancedDeltaPercent: number        // Default: 5
}
```

**Balanced Priority Rule (Recommended):**
- Choose **fastest** if within **5% cost delta** of cheapest
- Else choose **cheapest**
- Formula: `if (fastestCost <= cheapestCost × 1.05) then fastest else cheapest`

---

## Verification Sources

All fixes verified against:
1. ✅ Local API documentation files:
   - `docs/Resources/API/Courier/Ekart/Ekart_API.md`
   - `docs/Resources/API/Courier/Shipfast/Shipfast_API.md`
   - `docs/Resources/API/Courier/Delhivery/B2C/Delhivery_API_1.md`

2. ✅ Existing provider implementation code:
   - `server/src/infrastructure/external/couriers/ekart/ekart.provider.ts`
   - `server/src/infrastructure/external/couriers/velocity/velocity.auth.ts`

3. ✅ Current data models:
   - All models in `server/src/infrastructure/database/mongoose/models/`

---

## Implementation Status

**Document Status:** ✅ Production Ready - Approved for Implementation

**Next Steps:**
1. ✅ All critical fixes applied
2. ✅ Architecture verified against codebase
3. ✅ API capabilities confirmed
4. ✅ Rollout strategy clarified
5. 🚀 Ready to begin implementation (Week 1)

---

**Approved By:** User (February 8, 2026)  
**Implementation Start:** Week 1 (Data Models)
