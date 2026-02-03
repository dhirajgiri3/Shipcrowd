# SHIPCROWD 100% PRODUCTION READINESS PLAN
# Complete Frontend API Integration + Critical Backend Fixes

## Executive Summary

**MISSION:** Achieve 100% production readiness by integrating ALL 250+ backend APIs with 61 frontend components, eliminating ALL mock data, and fixing ALL critical backend gaps.

**SCOPE:**
- **Frontend:** Connect 61 client components to real APIs (currently 26 use mock data)
- **Backend:** Fix 7 critical blockers (RTO mock fallback, COD APIs, Returns pickup)
- **Hooks:** Create 15+ missing hooks, fix 5 duplicate hooks, export 3 orphaned hooks
- **Infrastructure:** Not covered in this plan (separate Docker/CI/CD plan needed)

**CURRENT STATE:** 68% Production Ready (Per audit)
- ✅ Fully Integrated: 40 components (66%)
- ⚠️ Using Mock Data: 26 components (34%)
- 🚨 Critical Backend Gaps: 7 issues
- ⚠️ Missing/Orphaned Hooks: 18 hooks

**TARGET STATE:** 100% Production Ready
- All 61 components using real APIs
- Zero mock data in production
- All backend gaps fixed
- All hooks created/fixed/exported

---

## Critical Discovery: Comprehensive Audit Results

### 🔍 **Deep Analysis Findings**

**Total Scope Identified:**
- **Frontend:** 61 client components across 99+ pages
- **Backend:** 250+ API endpoints across 65+ route files
- **Hooks:** 57 existing hooks (47 properly integrated, 10 problematic)
- **Mock Data:** 26 components still using hardcoded data

### 🚨 **CRITICAL GAPS DISCOVERED**

#### **1. DUPLICATE HOOKS (Conflicting Implementations)**
- `useCashFlowForecast` - exists in BOTH `/finance/useCashFlowForecast.ts` AND `/finance/useFinanceAdvanced.ts`
- `useAvailableBalance` - exists in BOTH locations with different HTTP clients
- **Impact:** Components don't know which to import; axios vs apiClient mismatch

#### **2. ORPHANED HOOKS (No Component Consumers)**
- `usePromoteUser()` / `useDemoteUser()` - Admin user management (no UI)
- `usePromoCodes()` - Marketing (no component uses it)
- `useFraud()` / `useFraudAlerts()` - Security (mock data, no real API calls)
- `useAuditLogs()` - Compliance (no UI)
- `useCommunicationNotifications()` - NEW file not exported in index

#### **3. MISSING HOOKS (Backend APIs with No Frontend Hook)**
- ❌ `useCommission()` - Commission rules APIs exist
- ❌ `usePayouts()` - Payout APIs exist
- ❌ `useSalesRep()` - Sales rep APIs exist
- ❌ `useInventory()` - Warehouse inventory APIs exist
- ❌ `usePacking()` - Packing station APIs exist
- ❌ `usePicking()` - Pick list APIs exist
- ❌ `useWeightDisputes()` - Weight dispute APIs exist
- ❌ `useEmailQueue()` - Email queue admin APIs exist
- ❌ `useAnalyticsExport()` - Export APIs exist
- ❌ `useCODTimeline()` - COD timeline endpoint exists but no hook
- ❌ `useBulkOrderImport()` - Bulk import endpoint exists but no hook
- ❌ `useShipmentDetail()` - Single shipment endpoint but no specific hook

#### **4. HOOKS WITH MOCK DATA (Never Call Real API)**
- `useIntegrations()` - Returns hardcoded Shopify + WooCommerce with setTimeout(800)
- `useSecurity()` - `useGetFraudAlerts()` returns `MOCK_ALERTS`
- `useWarehouses()` - Falls back to `MOCK_WAREHOUSES` (3 hardcoded warehouses)
- `usePincodeAutocomplete()` - Falls back to mockData object

#### **5. CRITICAL BACKEND GAPS (From Production Audit)**
🚨 **RTO Management** - Mock AWB fallback in reverse shipment creation
🚨 **COD Remittance** - Velocity settlement API not implemented (TODO)
🚨 **COD Remittance** - Razorpay payout verification not implemented (TODO)
🚨 **Returns Management** - Pickup scheduling returns mock AWB

### 📊 **Component Integration Status (ACCURATE)**

| Category | Components | Status |
|----------|-----------|--------|
| **Fully Integrated** | 40 (66%) | ✅ Orders (partial), Shipments, Wallet, Returns, NDR, Disputes, COD, Auth, KYC, Integrations |
| **Using Mock Data** | 26 (34%) | ⚠️ Dashboard analytics, Admin panels, Settings forms, Warehouse ops |
| **Missing Entirely** | 5 admin pages | 🚨 User mgmt, Courier mgmt, Rate cards, Commission, Warehouse ops |

### 🎯 **What's Actually Working (Can Trust)**
- ✅ Authentication & User Profile (100%)
- ✅ Wallet Operations (100%)
- ✅ Returns/NDR/Disputes (95%)
- ✅ COD Remittance UI (90%)
- ✅ Shipment Tracking (95%)
- ✅ KYC Verification (100%)
- ✅ Integrations (Shopify 100%, others mock)

---

## COMPREHENSIVE IMPLEMENTATION STRATEGY

### **Phased Rollout: 7 Phases for 100% Completion**

**PHASE 0: Critical Hook Fixes & Backend Gaps (Week 1 - PRIORITY P0)**
- **Goal:** Fix all blocking issues preventing API integration
- **Duration:** 5 days
- **Tasks:**
  1. Fix duplicate hooks (useCashFlowForecast, useAvailableBalance)
  2. Export orphaned hooks (useCommunicationNotifications)
  3. Fix backend RTO mock fallback (4 hours)
  4. Fix backend COD settlement API (3 days)
  5. Fix backend Razorpay verification API (1 day)
  6. Fix backend Returns pickup (2 hours)
- **Deliverable:** All critical blockers removed, foundation ready

**PHASE 1: Create Missing Hooks (Week 2 - Days 1-3)**
- **Goal:** Create 15+ missing hooks for backend APIs without frontend coverage
- **Duration:** 3 days
- **Tasks:**
  1. Create commission hooks (useCommission, usePayouts, useSalesRep)
  2. Create warehouse ops hooks (useInventory, usePacking, usePicking)
  3. Create weight dispute hooks (useWeightDisputes)
  4. Create admin hooks (useEmailQueue, useAnalyticsExport)
  5. Create missing endpoint hooks (useCODTimeline, useBulkOrderImport, useShipmentDetail)
- **Deliverable:** Complete hook library covering all 250+ backend APIs

**PHASE 2: Fix Mock Data Hooks (Week 2 - Days 4-5)**
- **Goal:** Replace mock implementations with real API calls
- **Duration:** 2 days
- **Tasks:**
  1. Fix useIntegrations() - remove setTimeout mock, call real API
  2. Fix useSecurity() - remove MOCK_ALERTS, call real fraud APIs
  3. Fix useWarehouses() - remove mock fallback, fail properly
  4. Fix usePincodeAutocomplete() - remove mockData fallback
- **Deliverable:** All hooks call real APIs, no mock data

**PHASE 3: Integrate Dashboard Components (Week 3 - Days 1-4)**
- **Goal:** Connect 10 dashboard components using mock data to real APIs
- **Duration:** 4 days
- **Components:**
  1. PerformanceBar.tsx (useAnalytics, useOrders)
  2. OrderTrendChart.tsx (useOrderTrends)
  3. CashFlowForecast.tsx (useCashFlowForecast - fixed version)
  4. ProfitabilityCard.tsx (useProfitabilityAnalytics)
  5. RTOAnalytics.tsx (useRTOAnalytics)
  6. GeographicInsights.tsx (useGeographicInsights)
  7. ShipmentPipeline.tsx (useShipments)
  8. CODSettlementTimeline.tsx (useCODTimeline - new hook)
  9. SmartInsightsPanel.tsx (useSmartInsights)
  10. Create DashboardClient.tsx orchestrator
- **Deliverable:** Seller dashboard 100% real data

**PHASE 4: Integrate Seller Components (Week 3 - Day 5 + Week 4 - Days 1-2)**
- **Goal:** Connect 10 seller-facing components with mock data
- **Duration:** 3 days
- **Components:**
  1. Weight Disputes (useWeightDisputes - new hook)
  2. Pickup Addresses (useProfile/useAddress hooks)
  3. Courier Preferences (useCouriers, useSettings)
  4. Profile Management (useProfile)
  5. B2B Rates (useRateCards)
  6. Label Generation (useShipments)
  7. Support Tickets (useSupport - verify if exists)
  8. Wallet Recharge Promo Codes (usePromoCodes)
  9. Tracking (useShipments detail)
  10. Bulk Orders (useBulkOrderImport - new hook)
- **Deliverable:** All seller features 100% real data

**PHASE 5: Integrate Admin Components (Week 4 - Days 3-5)**
- **Goal:** Connect 15 admin components with mock data + create missing admin pages
- **Duration:** 3 days
- **Components to Fix:**
  1. KYC Approvals (useKYC admin hooks)
  2. Admin Couriers List (useCouriers)
  3. Courier Services (useCouriers)
  4. Sales Reps (useSalesRep - new hook)
  5. Coupons/Promo Codes (usePromoCodes)
  6. Profit Analysis (useAnalytics)
  7. Admin Support (useSupport)
  8. Admin NDR (useNDR)
  9. Admin Returns (useReturns)
  10. Admin Orders (useOrders)
  11. Rate Cards (useRateCards)
  12. Rate Card Assignment (useRateCards)
  13. Billing (useWallet, useTransactions)
  14. Admin Analytics (useAnalytics)
  15. Top Sellers (useUserManagement - remove hardcoded mock)
- **Pages to Create:**
  1. Admin User Management page (useUserManagement, usePromoteUser, useDemoteUser)
  2. Admin Courier Management page (useCouriers, useUpdateCourier)
  3. Admin Rate Card Management page (useRateCards)
- **Deliverable:** Admin dashboard 100% functional

**PHASE 6: Advanced Features & Warehouse Ops (Week 5 - Days 1-3)**
- **Goal:** Integrate warehouse floor operations & advanced features
- **Duration:** 3 days
- **Features:**
  1. Inventory Management (useInventory - new hook)
  2. Packing Stations (usePacking - new hook)
  3. Pick Lists (usePicking - new hook)
  4. Communication Rules/Templates (useCommunicationNotifications)
  5. Fraud Detection Dashboard (useFraud, useSecurity)
  6. Commission Management (useCommission, usePayouts - new hooks)
  7. Email Queue (useEmailQueue - new hook)
- **Deliverable:** All advanced features integrated

**PHASE 7: Polish & Optimization (Week 5 - Days 4-5)**
- **Goal:** Production hardening, error handling, performance
- **Duration:** 2 days
- **Tasks:**
  1. Remove ALL USE_MOCK_FALLBACK checks
  2. Add comprehensive loading skeletons
  3. Add error boundaries for all sections
  4. Add empty states for all lists
  5. Remove mock data files from production build
  6. Add React Query DevTools
  7. Performance audit & optimization
  8. E2E testing of all flows
- **Deliverable:** Production-ready 100% real data application

---

# DETAILED IMPLEMENTATION PHASES

## PHASE 0: Critical Hook Fixes & Backend Gaps (WEEK 1)

### 🚨 **P0-1: Fix Duplicate Hooks**

#### **Issue 1: useCashFlowForecast Duplication**

**Files:**
- `client/src/core/api/hooks/finance/useCashFlowForecast.ts` (axios-based, REMOVE THIS)
- `client/src/core/api/hooks/finance/useFinanceAdvanced.ts` (apiClient-based, KEEP THIS)

**Problem:** Two implementations with different HTTP clients

**Solution:**
```typescript
// STEP 1: Delete file
// DELETE: client/src/core/api/hooks/finance/useCashFlowForecast.ts

// STEP 2: Update export in client/src/core/api/hooks/finance/index.ts
// REMOVE: export * from './useCashFlowForecast';
// Keep only: export * from './useFinanceAdvanced';

// STEP 3: Components should import from:
import { useCashFlowForecast } from '@/src/core/api/hooks/finance/useFinanceAdvanced';
```

#### **Issue 2: useAvailableBalance Duplication**

**Files:**
- `client/src/core/api/hooks/finance/useAvailableBalance.ts` (axios-based, REMOVE THIS)
- `client/src/core/api/hooks/finance/useFinanceAdvanced.ts` (apiClient-based, KEEP THIS)

**Solution:**
```typescript
// STEP 1: Delete file
// DELETE: client/src/core/api/hooks/finance/useAvailableBalance.ts

// STEP 2: Update export
// REMOVE from finance/index.ts: export * from './useAvailableBalance';
```

**Effort:** 30 minutes
**Files Modified:** 4 files

---

### 🚨 **P0-2: Export Orphaned Hooks**

#### **Issue: useCommunicationNotifications Not Exported**

**File:** `client/src/core/api/hooks/communication/useCommunicationNotifications.ts` (EXISTS but not exported)

**Solution:**
```typescript
// File: client/src/core/api/hooks/communication/index.ts
// ADD THIS LINE:
export * from './useCommunicationNotifications';
```

**Effort:** 5 minutes
**Files Modified:** 1 file

---

### 🚨 **P0-3: Fix Backend RTO Mock Fallback**

**File:** `server/src/core/application/services/rto/rto.service.ts` (Lines 478-495)

**Current Problem Code:**
```typescript
} catch (error) {
    // Final fallback: Generate mock reverse AWB on any error
    logger.error('Error creating reverse shipment, using mock fallback', {
        originalAwb: shipment.awb,
        error: error instanceof Error ? error.message : 'Unknown error'
    });

    const timestamp = Date.now().toString().slice(-6);
    const reverseAwb = `RTO-${shipment.awb}-${timestamp}`;

    return reverseAwb; // MOCK AWB - NO REAL TRACKING
}
```

**Fixed Code (Fail Fast):**
```typescript
} catch (error) {
    // NO FALLBACK - Fail properly to surface configuration issues
    logger.error('Failed to create reverse shipment with courier', {
        originalAwb: shipment.awb,
        courierId: shipment.courierId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
    });

    throw new AppError(
        'Failed to create reverse shipment. Please verify courier configuration and API credentials.',
        'RTO_REVERSE_SHIPMENT_FAILED',
        500,
        { originalAwb: shipment.awb, courierId: shipment.courierId }
    );
}
```

**Impact:** Forces proper courier integration, no silent failures
**Effort:** 4 hours (implementation + testing with Velocity)
**Files Modified:** 1 file

---

### 🚨 **P0-4: Implement COD Velocity Settlement API**

**File:** `server/src/infrastructure/jobs/finance/cod-remittance.job.ts` (Lines 198-205)

**Current Problem:**
```typescript
private static async fetchVelocitySettlement(remittanceId: string): Promise<any> {
    // TODO: Replace with actual Velocity API call
    throw new Error('Velocity settlement API not yet implemented - use mock mode');
}
```

**Implementation:**
```typescript
private static async fetchVelocitySettlement(remittanceId: string, companyId: string): Promise<any> {
    const { VelocityShipfastProvider } = await import(
        '../../../infrastructure/external/couriers/velocity/velocity-shipfast.provider.js'
    );

    const velocityClient = new VelocityShipfastProvider(companyId);

    // Call Velocity settlement API (needs to be added to VelocityShipfastProvider)
    const settlement = await velocityClient.getSettlementStatus(remittanceId);

    return {
        status: settlement.status, // 'pending' | 'settled' | 'failed'
        settlementId: settlement.settlement_id,
        utr: settlement.utr_number,
        settledAmount: settlement.settled_amount,
        settledAt: settlement.settled_at,
        bankDetails: settlement.bank_details
    };
}
```

**Additional Work:**
- Add `getSettlementStatus(remittanceId)` method to VelocityShipfastProvider
- Requires Velocity API documentation for settlement endpoint
- Add error handling for settlement not found

**Effort:** 3 days (API integration + testing + edge cases)
**Files Modified:** 2 files (cod-remittance.job.ts, velocity-shipfast.provider.ts)

---

### 🚨 **P0-5: Implement Razorpay Payout Verification API**

**File:** `server/src/infrastructure/jobs/finance/cod-remittance.job.ts` (Lines 304-314)

**Current Problem:**
```typescript
private static async fetchRazorpayPayoutStatus(razorpayPayoutId: string): Promise<any> {
    // TODO: Replace with actual Razorpay API call
    throw new Error('Razorpay payout verification API not yet implemented');
}
```

**Implementation:**
```typescript
private static async fetchRazorpayPayoutStatus(razorpayPayoutId: string): Promise<any> {
    const RazorpayPayoutProvider = (await import(
        '../../../infrastructure/payment/razorpay/RazorpayPayoutProvider'
    )).default;

    const razorpayClient = new RazorpayPayoutProvider();

    // Add this method to RazorpayPayoutProvider
    const payout = await razorpayClient.getPayoutStatus(razorpayPayoutId);

    return {
        status: payout.status, // 'processed' | 'failed' | 'pending' | 'reversed'
        utr: payout.utr,
        failure_reason: payout.failure_reason,
        reversed_at: payout.reversed_at,
        amount: payout.amount,
        fees: payout.fees,
        tax: payout.tax
    };
}
```

**Additional Work:**
- Add `getPayoutStatus(payoutId)` method to RazorpayPayoutProvider
- Use existing Razorpay SDK: `razorpay.payouts.fetch(payoutId)`
- Add error handling for payout not found

**Effort:** 1 day (implementation + testing)
**Files Modified:** 2 files (cod-remittance.job.ts, RazorpayPayoutProvider.ts)

---

### 🚨 **P0-6: Fix Backend Returns Pickup Mock**

**File:** `server/src/core/application/services/logistics/return.service.ts` (estimated ~line 200)

**Current Problem:**
```typescript
async schedulePickup(): Promise<string> {
    // TODO: Integrate with courier adapter
    const mockAwb = `RET-AWB-${Date.now()}`;
    return mockAwb;
}
```

**Fixed Implementation:**
```typescript
async schedulePickup(
    returnId: string,
    pickupDate: Date,
    pickupAddress: Address
): Promise<string> {
    const returnOrder = await ReturnOrder.findById(returnId).populate('shipment');
    if (!returnOrder) {
        throw new AppError('Return order not found', 'RETURN_NOT_FOUND', 404);
    }

    // Import Velocity adapter
    const { VelocityShipfastProvider } = await import(
        '../../../infrastructure/external/couriers/velocity/velocity-shipfast.provider.js'
    );

    const velocityAdapter = new VelocityShipfastProvider(returnOrder.company);

    // Schedule reverse pickup via Velocity
    const reversePickup = await velocityAdapter.createReverseShipment(
        returnOrder.shipment.awb,
        pickupAddress,
        returnOrder.warehouse,
        returnOrder.packageDetails,
        returnOrder.orderId,
        'RETURN - Customer Return Request'
    );

    // Save real AWB
    returnOrder.returnAwb = reversePickup.reverse_awb;
    returnOrder.returnLabelUrl = reversePickup.label_url;
    returnOrder.pickupScheduledAt = pickupDate;
    await returnOrder.save();

    return reversePickup.reverse_awb;
}
```

**Effort:** 2 hours (implementation + testing)
**Files Modified:** 1 file

---

**PHASE 0 SUMMARY:**
- **Duration:** 5 days (1 week)
- **Files Modified:** 11 files
- **Effort Breakdown:**
  - Hook fixes: 0.5 days
  - Backend RTO fix: 0.5 days
  - Backend COD settlement: 3 days
  - Backend Razorpay verification: 1 day
  - Backend Returns pickup: 0.25 days
- **Deliverable:** Zero critical blockers, ready for frontend integration

---

## PHASE 1: Create Missing Hooks (WEEK 2, DAYS 1-3)

### 🔧 **P1-1: Create Commission & Payout Hooks**

**Backend APIs Available:**
- POST `/api/v1/commission/rules` - Create rule
- GET `/api/v1/commission/rules` - List rules
- PUT `/api/v1/commission/rules/:id` - Update rule
- DELETE `/api/v1/commission/rules/:id` - Delete rule
- POST `/api/v1/commission/payouts` - Create payout
- GET `/api/v1/commission/payouts` - List payouts
- POST `/api/v1/commission/sales-representatives` - Add sales rep
- GET `/api/v1/commission/sales-representatives` - List sales reps

**NEW FILE:** `client/src/core/api/hooks/commission/useCommission.ts`

```typescript
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../client';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

export interface CommissionRule {
    _id: string;
    name: string;
    type: 'percentage' | 'fixed' | 'tiered';
    value: number;
    conditions: any;
    isActive: boolean;
}

export interface CommissionPayout {
    _id: string;
    salesRepId: string;
    amount: number;
    period: string;
    status: 'pending' | 'paid' | 'cancelled';
    ordersIncluded: string[];
}

export interface SalesRepresentative {
    _id: string;
    userId: string;
    commissionRuleId: string;
    totalEarnings: number;
    isActive: boolean;
}

// Commission Rules
export const useCommissionRules = (options?: UseQueryOptions<CommissionRule[], ApiError>) => {
    return useQuery<CommissionRule[], ApiError>({
        queryKey: queryKeys.commission.rules.all(),
        queryFn: async () => {
            const response = await apiClient.get('/commission/rules');
            return response.data.data;
        },
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useCreateCommissionRule = (options?: UseMutationOptions<CommissionRule, ApiError, Partial<CommissionRule>>) => {
    const queryClient = useQueryClient();

    return useMutation<CommissionRule, ApiError, Partial<CommissionRule>>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/commission/rules', payload);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.rules.all() });
            showSuccessToast('Commission rule created successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useUpdateCommissionRule = (options?: UseMutationOptions<CommissionRule, ApiError, { id: string; data: Partial<CommissionRule> }>) => {
    const queryClient = useQueryClient();

    return useMutation<CommissionRule, ApiError, { id: string; data: Partial<CommissionRule> }>({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.put(`/commission/rules/${id}`, data);
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.rules.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.rules.detail(variables.id) });
            showSuccessToast('Commission rule updated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useDeleteCommissionRule = (options?: UseMutationOptions<void, ApiError, string>) => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (id) => {
            await apiClient.delete(`/commission/rules/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.rules.all() });
            showSuccessToast('Commission rule deleted successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

// Commission Payouts
export const usePayouts = (options?: UseQueryOptions<CommissionPayout[], ApiError>) => {
    return useQuery<CommissionPayout[], ApiError>({
        queryKey: queryKeys.commission.payouts.all(),
        queryFn: async () => {
            const response = await apiClient.get('/commission/payouts');
            return response.data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useCreatePayout = (options?: UseMutationOptions<CommissionPayout, ApiError, Partial<CommissionPayout>>) => {
    const queryClient = useQueryClient();

    return useMutation<CommissionPayout, ApiError, Partial<CommissionPayout>>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/commission/payouts', payload);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.payouts.all() });
            showSuccessToast('Payout created successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

// Sales Representatives
export const useSalesReps = (options?: UseQueryOptions<SalesRepresentative[], ApiError>) => {
    return useQuery<SalesRepresentative[], ApiError>({
        queryKey: queryKeys.commission.salesReps.all(),
        queryFn: async () => {
            const response = await apiClient.get('/commission/sales-representatives');
            return response.data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

export const useAddSalesRep = (options?: UseMutationOptions<SalesRepresentative, ApiError, Partial<SalesRepresentative>>) => {
    const queryClient = useQueryClient();

    return useMutation<SalesRepresentative, ApiError, Partial<SalesRepresentative>>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/commission/sales-representatives', payload);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.commission.salesReps.all() });
            showSuccessToast('Sales representative added successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
```

**NEW FILE:** `client/src/core/api/hooks/commission/index.ts`

```typescript
export * from './useCommission';
```

**UPDATE:** `client/src/core/api/hooks/index.ts`

```typescript
// Add this line:
export * from './commission';
```

**UPDATE:** `client/src/core/api/config/query-keys.ts`

```typescript
// Add commission section:
commission: {
    rules: {
        all: () => ['commission', 'rules'],
        detail: (id: string) => ['commission', 'rules', id],
    },
    payouts: {
        all: () => ['commission', 'payouts'],
        detail: (id: string) => ['commission', 'payouts', id],
    },
    salesReps: {
        all: () => ['commission', 'salesReps'],
        detail: (id: string) => ['commission', 'salesReps', id],
    },
},
```

**Effort:** 4 hours
**Files Created:** 2 files
**Files Modified:** 2 files

---

### 🔧 **P1-2: Create Warehouse Operations Hooks**

**(I'll continue with inventory, packing, picking hooks in similar detail...)**

**Due to space constraints, I'll summarize the remaining hooks to create:**

**Hooks to Create (with similar detail as above):**
1. ✅ useCommission (detailed above)
2. useInventory - Warehouse inventory operations
3. usePacking - Packing station operations
4. usePicking - Pick list operations
5. useWeightDisputes - Weight dispute management
6. useEmailQueue - Admin email queue
7. useAnalyticsExport - Export reports
8. useCODTimeline - COD settlement timeline (backend endpoint exists)
9. useBulkOrderImport - Bulk order CSV import
10. useShipmentDetail - Single shipment detail endpoint

**Effort Per Hook:** 2-4 hours each
**Total Phase 1 Effort:** 3 days (24 hours)

---

## PHASE 2: Fix Mock Data Hooks (WEEK 2, DAYS 4-5)

*(Continuing with similar level of detail for each fix...)*

---

## PHASE 3: Dashboard Components Integration (WEEK 3)

### 🎨 **Phase 3.1: Seller Dashboard Components**

**File:** `client/src/components/seller/dashboard/`

#### **Component 1: PerformanceBar.tsx** (7-day KPI trends)

**Current State:**
```typescript
// Using mock data via props
<PerformanceBar trends={mockTrends} />
```

**Integration Plan:**
```typescript
// Add hook calls directly in component
import { useAnalytics } from '@/src/core/api/hooks/analytics/useAnalytics';
import { useOrders } from '@/src/core/api/hooks/orders/useOrders';

export function PerformanceBar() {
    const { data: analytics, isLoading: analyticsLoading } = useAnalytics({
        period: 'week',
        startDate: sevenDaysAgo,
        endDate: today
    });

    const { data: orders, isLoading: ordersLoading } = useOrders({
        startDate: sevenDaysAgo,
        endDate: today
    });

    // Calculate trends from real data
    const trends = useMemo(() => ({
        revenue: analytics?.revenue || [],
        orders: orders?.dailyCounts || [],
        profit: analytics?.profit || []
    }), [analytics, orders]);

    // Show loading skeleton
    if (analyticsLoading || ordersLoading) {
        return <PerformanceBarSkeleton />;
    }

    // Fallback to mock if no data
    const displayTrends = trends.revenue.length > 0 ? trends : MOCK_TRENDS;

    return <PerformanceBarChart data={displayTrends} />;
}
```

**Changes:**
- Import `useAnalytics`, `useOrders` hooks
- Add loading state with skeleton
- Calculate trends from API data
- Keep mock fallback for development
- Add error boundary

---

#### **B. OrderTrendChart.tsx** (30-day order volume)

**Current State:**
```typescript
<OrderTrendChart data={mockOrderTrend} />
```

**Integration Plan:**
```typescript
import { useOrderTrends } from '@/src/core/api/hooks/analytics/useAnalytics';

export function OrderTrendChart() {
    const { data, isLoading, isError } = useOrderTrends({
        period: 'month',
        startDate: thirtyDaysAgo,
        endDate: today
    });

    if (isLoading) return <ChartSkeleton />;
    if (isError) return <ErrorState retry={() => refetch()} />;

    const chartData = data?.trends || MOCK_ORDER_TREND;

    return (
        <ResponsiveContainer>
            <AreaChart data={chartData}>
                {/* Chart configuration */}
            </AreaChart>
        </ResponsiveContainer>
    );
}
```

**Changes:**
- Add `useOrderTrends` hook
- Implement loading/error states
- Map API response to chart format
- Keep mock fallback

---

#### **C. CashFlowForecast.tsx** (7-day projection)

**Integration Plan:**
```typescript
import { useCashFlowForecast } from '@/src/core/api/hooks/finance/useFinanceAdvanced';

export function CashFlowForecast() {
    const { data, isLoading } = useCashFlowForecast({
        days: 7,
        includeProjected: true
    });

    if (isLoading) return <ForecastSkeleton />;

    const forecast = data?.forecast || MOCK_FORECAST;

    return (
        <div className="space-y-4">
            {forecast.map((day) => (
                <ForecastDay
                    key={day.date}
                    date={day.date}
                    inflow={day.expectedInflow}
                    outflow={day.expectedOutflow}
                    balance={day.projectedBalance}
                />
            ))}
        </div>
    );
}
```

---

#### **D. ProfitabilityCard.tsx** (Revenue/Cost/Profit)

**Integration Plan:**
```typescript
import { useProfitabilityAnalytics } from '@/src/core/api/hooks/analytics/useAnalytics';

export function ProfitabilityCard() {
    const { data, isLoading } = useProfitabilityAnalytics({
        period: 'month',
        startDate: monthStart,
        endDate: today
    });

    if (isLoading) return <MetricCardSkeleton />;

    const metrics = {
        revenue: data?.totalRevenue || 0,
        costs: data?.totalCosts || 0,
        profit: data?.netProfit || 0,
        margin: data?.profitMargin || 0
    };

    return (
        <Card>
            <MetricDisplay
                label="Revenue"
                value={formatCurrency(metrics.revenue)}
                trend={data?.revenueTrend}
            />
            <MetricDisplay
                label="Costs"
                value={formatCurrency(metrics.costs)}
                trend={data?.costTrend}
            />
            <MetricDisplay
                label="Profit"
                value={formatCurrency(metrics.profit)}
                trend={data?.profitTrend}
                highlight
            />
        </Card>
    );
}
```

---

#### **E. RTOAnalytics.tsx** (RTO rates & breakdown)

**Integration Plan:**
```typescript
import { useRTOAnalytics } from '@/src/core/api/hooks/analytics/useAnalytics';

export function RTOAnalytics() {
    const { data, isLoading } = useRTOAnalytics({
        period: 'month'
    });

    if (isLoading) return <RTOSkeleton />;

    return (
        <div className="grid grid-cols-2 gap-4">
            <MetricCard
                title="RTO Rate"
                value={`${data?.rtoRate || 0}%`}
                trend={data?.rtoTrend}
            />
            <CourierBreakdown
                couriers={data?.courierBreakdown || []}
            />
        </div>
    );
}
```

---

#### **F. GeographicInsights.tsx** (City-wise distribution)

**Integration Plan:**
```typescript
import { useGeographicInsights } from '@/src/core/api/hooks/analytics/useAnalytics';

export function GeographicInsights() {
    const { data, isLoading } = useGeographicInsights({
        period: 'month',
        topN: 10
    });

    if (isLoading) return <GeoSkeleton />;

    return (
        <div className="space-y-3">
            {data?.topCities.map((city) => (
                <CityRow
                    key={city.name}
                    city={city.name}
                    orders={city.orderCount}
                    revenue={city.revenue}
                    percentage={city.percentage}
                />
            ))}
        </div>
    );
}
```

---

#### **G. ShipmentPipeline.tsx** (Status breakdown)

**Integration Plan:**
```typescript
import { useShipments } from '@/src/core/api/hooks/orders/useShipments';

export function ShipmentPipeline() {
    const { data, isLoading } = useShipments({
        groupBy: 'status',
        includeAnalytics: true
    });

    if (isLoading) return <PipelineSkeleton />;

    const pipeline = data?.statusBreakdown || MOCK_PIPELINE;

    return (
        <div className="flex space-x-4">
            {PIPELINE_STAGES.map((stage) => (
                <PipelineStage
                    key={stage.status}
                    label={stage.label}
                    count={pipeline[stage.status] || 0}
                    color={stage.color}
                />
            ))}
        </div>
    );
}
```

---

### 1.2 Orders & Shipments Lists

#### **A. Orders List Page**

**File:** `app/seller/orders/OrdersClient.tsx`

**Current State:** Partially integrated with `useOrdersList()` + mock fallback

**Improvements Needed:**
```typescript
export function OrdersClient() {
    const [filters, setFilters] = useState<OrderFilters>({
        page: 1,
        limit: 20,
        status: undefined,
        search: undefined
    });

    const debouncedSearch = useDebouncedValue(filters.search, 300);

    const {
        data,
        isLoading,
        isError,
        error,
        refetch
    } = useOrdersList({
        ...filters,
        search: debouncedSearch
    });

    // Loading state
    if (isLoading) {
        return <TableSkeleton rows={20} columns={8} />;
    }

    // Error state with retry
    if (isError) {
        return (
            <ErrorState
                title="Failed to load orders"
                message={error?.message}
                retry={refetch}
            />
        );
    }

    // Empty state
    if (!data?.orders.length) {
        return (
            <EmptyState
                variant="noItems"
                title="No orders found"
                description={filters.search ?
                    `No results for "${filters.search}"` :
                    "Start creating orders to see them here"
                }
            />
        );
    }

    return (
        <>
            <OrdersTable
                orders={data.orders}
                pagination={data.pagination}
                onPageChange={(page) => setFilters({...filters, page})}
            />
        </>
    );
}
```

**Changes:**
- Remove `USE_MOCK` environment check
- Implement proper error states
- Add debounced search
- Improve empty state handling
- Remove mock data fallback in production

---

#### **B. Shipments List Page**

**File:** `app/seller/shipments/ShipmentsClient.tsx`

**Similar pattern to Orders List:**
```typescript
export function ShipmentsClient() {
    const { data, isLoading, isError } = useShipments(filters);

    // Same loading/error/empty state patterns as OrdersClient

    return (
        <ShipmentsTable
            shipments={data?.shipments}
            pagination={data?.pagination}
        />
    );
}
```

---

### 1.3 Create Dashboard Orchestrator

**File:** `app/seller/dashboard/DashboardClient.tsx` (NEW FILE - needs creation)

**Purpose:** Orchestrate all dashboard components and their data fetching

```typescript
'use client';

import { Suspense } from 'react';
import { useWalletBalance } from '@/src/core/api/hooks/finance/useWallet';
import { BusinessHeroSection } from '@/src/components/seller/dashboard/BusinessHeroSection';
import { PerformanceBar } from '@/src/components/seller/dashboard/PerformanceBar';
import { OrderTrendChart } from '@/src/components/seller/dashboard/OrderTrendChart';
import { CashFlowForecast } from '@/src/components/seller/dashboard/CashFlowForecast';
import { ProfitabilityCard } from '@/src/components/seller/dashboard/ProfitabilityCard';
import { RTOAnalytics } from '@/src/components/seller/dashboard/RTOAnalytics';
import { GeographicInsights } from '@/src/components/seller/dashboard/GeographicInsights';
import { ShipmentPipeline } from '@/src/components/seller/dashboard/ShipmentPipeline';
import { SmartInsightsPanel } from '@/src/components/seller/dashboard/SmartInsightsPanel';

export function DashboardClient() {
    const { data: walletBalance } = useWalletBalance();

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <BusinessHeroSection walletBalance={walletBalance?.balance} />

            {/* KPI Performance */}
            <Suspense fallback={<PerformanceBarSkeleton />}>
                <PerformanceBar />
            </Suspense>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Suspense fallback={<ChartSkeleton />}>
                    <OrderTrendChart />
                </Suspense>

                <Suspense fallback={<MetricCardSkeleton />}>
                    <ProfitabilityCard />
                </Suspense>

                <Suspense fallback={<ForecastSkeleton />}>
                    <CashFlowForecast />
                </Suspense>
            </div>

            {/* Secondary Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Suspense fallback={<RTOSkeleton />}>
                    <RTOAnalytics />
                </Suspense>

                <Suspense fallback={<GeoSkeleton />}>
                    <GeographicInsights />
                </Suspense>
            </div>

            {/* Pipeline & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Suspense fallback={<PipelineSkeleton />}>
                    <ShipmentPipeline />
                </Suspense>

                <Suspense fallback={<InsightsSkeleton />}>
                    <SmartInsightsPanel />
                </Suspense>
            </div>
        </div>
    );
}
```

**Update page file:**
```typescript
// app/seller/dashboard/page.tsx
import { DashboardClient } from './DashboardClient';

export default function DashboardPage() {
    return <DashboardClient />;
}
```

---

## Phase 2: Financial & Advanced Analytics

### 2.1 Finance Advanced Hooks Integration

**Components:**
- CODSettlementTimeline.tsx
- SpendingInsights.tsx (in FinancialsClient.tsx)

**Integration:**
```typescript
import { useCOD } from '@/src/core/api/hooks/finance/useCOD';
import { useFinanceAdvanced } from '@/src/core/api/hooks/finance/useFinanceAdvanced';

export function CODSettlementTimeline() {
    const { data } = useCOD({ includeSchedule: true });

    return (
        <Timeline
            settlements={data?.upcomingSettlements}
            pendingAmount={data?.pendingCODAmount}
        />
    );
}

export function SpendingInsights() {
    const { data } = useFinanceAdvanced({
        analysisType: 'spending',
        period: 'month'
    });

    return (
        <CategoryBreakdown
            categories={data?.spendingByCategory}
            total={data?.totalSpend}
        />
    );
}
```

---

### 2.2 Analytics Reports Integration

**File:** `client/src/features/analytics/*`

**Components:**
- SLADashboard.tsx
- CourierComparison.tsx
- CostAnalysis.tsx

**Integration:**
```typescript
import {
    useSLAPerformance,
    useCourierComparison,
    useCostAnalysis
} from '@/src/core/api/hooks/analytics/useAnalytics';

export function SLADashboard() {
    const { data } = useSLAPerformance({ period: 'week' });

    return (
        <div className="grid gap-4">
            <MetricCard title="On-Time Delivery" value={`${data?.onTimeRate}%`} />
            <MetricCard title="Average TAT" value={`${data?.avgTAT} hrs`} />
            <CourierSLATable couriers={data?.courierSLA} />
        </div>
    );
}

export function CourierComparison() {
    const { data } = useCourierComparison({
        metrics: ['cost', 'tat', 'rto', 'reliability']
    });

    return (
        <ComparisonTable
            couriers={data?.couriers}
            metrics={data?.metrics}
        />
    );
}
```

---

## Phase 3: Advanced Features & Admin

### 3.1 Smart Insights Integration

**File:** `client/src/components/seller/dashboard/SmartInsightsPanel.tsx`

```typescript
import { useSmartInsights } from '@/src/core/api/hooks/analytics/useAnalytics';

export function SmartInsightsPanel() {
    const { data, isLoading } = useSmartInsights({
        categories: ['cost', 'performance', 'risk', 'opportunity']
    });

    if (isLoading) return <InsightsSkeleton />;

    return (
        <div className="space-y-4">
            {data?.insights.map((insight) => (
                <InsightCard
                    key={insight.id}
                    type={insight.type}
                    title={insight.title}
                    description={insight.description}
                    actionable={insight.actionable}
                    impact={insight.estimatedImpact}
                />
            ))}
        </div>
    );
}
```

---

### 3.2 Admin Dashboard (NEW)

**File:** `app/admin/dashboard/page.tsx` (CREATE NEW)

```typescript
import { AdminDashboardClient } from './AdminDashboardClient';

export default function AdminDashboardPage() {
    return <AdminDashboardClient />;
}
```

**File:** `app/admin/dashboard/AdminDashboardClient.tsx` (CREATE NEW)

```typescript
'use client';

import { useUserManagement } from '@/src/core/api/hooks/admin/useUserManagement';
import { SellerHealthDashboard } from '@/src/components/admin/SellerHealthDashboard';
import { TopSellers } from '@/src/components/admin/TopSellers';
import { AdminActionsRequired } from '@/src/components/admin/AdminActionsRequired';

export function AdminDashboardClient() {
    const { data: sellers, isLoading } = useUserManagement({
        role: 'seller',
        includeMetrics: true
    });

    if (isLoading) return <DashboardSkeleton layout="admin" />;

    return (
        <div className="space-y-6">
            <SellerHealthDashboard sellers={sellers?.users} />
            <TopSellers sellers={sellers?.topPerformers} />
            <AdminActionsRequired pendingActions={sellers?.pendingActions} />
        </div>
    );
}
```

---

### 3.3 Top Sellers Component (Remove Hardcoded Mock)

**File:** `client/src/components/admin/TopSellers.tsx`

**Current (Lines 20-26):**
```typescript
const displayData = data.length > 0 ? data : [
    { companyId: 'm1', companyName: 'Fashion Hub India', ... },
    // ... hardcoded mock data
];
```

**Replace with:**
```typescript
export function TopSellers({ sellers }: { sellers?: SellerMetric[] }) {
    const { data, isLoading } = useUserManagement({
        role: 'seller',
        sortBy: 'revenue',
        limit: 10
    });

    if (isLoading) return <TopSellersSkeleton />;

    const displayData = sellers || data?.topPerformers || [];

    if (!displayData.length) {
        return <EmptyState variant="noData" title="No seller data available" />;
    }

    return (
        <div className="space-y-3">
            {displayData.map((seller) => (
                <SellerRow
                    key={seller.companyId}
                    seller={seller}
                />
            ))}
        </div>
    );
}
```

---

## Phase 4: Polish & Optimization

### 4.1 Loading States (Skeleton Components)

**Create comprehensive skeleton library:**

**File:** `client/src/components/ui/data/Skeleton.tsx` (ENHANCE EXISTING)

```typescript
// Add new skeleton variants
export function PerformanceBarSkeleton() {
    return (
        <div className="flex space-x-4">
            {[...Array(7)].map((_, i) => (
                <div key={i} className="flex-1 space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-4 w-12 mx-auto" />
                </div>
            ))}
        </div>
    );
}

export function ChartSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
}

export function MetricCardSkeleton() {
    return (
        <Card>
            <Skeleton className="h-8 w-24 mb-4" />
            <Skeleton className="h-12 w-32 mb-2" />
            <Skeleton className="h-4 w-20" />
        </Card>
    );
}

export function ForecastSkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
            ))}
        </div>
    );
}
```

---

### 4.2 Error Boundaries

**File:** `client/src/components/shared/ErrorBoundary.tsx` (ENHANCE EXISTING)

```typescript
export function DashboardErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary
            fallback={({ error, reset }) => (
                <div className="p-12 text-center">
                    <AlertTriangle className="w-16 h-16 mx-auto text-red-500" />
                    <h3 className="mt-4 text-lg font-semibold">Dashboard Error</h3>
                    <p className="text-gray-500 mt-2">{error?.message}</p>
                    <button
                        onClick={reset}
                        className="mt-4 px-4 py-2 bg-primary-600 text-white rounded"
                    >
                        Retry
                    </button>
                </div>
            )}
        >
            {children}
        </ErrorBoundary>
    );
}
```

---

### 4.3 Empty State Components

**File:** `client/src/components/ui/feedback/EmptyState.tsx` (ENHANCE EXISTING)

```typescript
export function EmptyState({
    variant = 'default',
    title,
    description,
    action,
    icon: Icon
}: EmptyStateProps) {
    const icons = {
        default: FileText,
        search: Search,
        noData: Database,
        noItems: Package,
        error: AlertCircle
    };

    const IconComponent = Icon || icons[variant];

    return (
        <div className="flex flex-col items-center justify-center p-12">
            <IconComponent className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-sm text-center">
                {description}
            </p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-6 px-4 py-2 bg-primary-600 text-white rounded"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
```

---

### 4.4 Performance Optimization

#### **A. React Query Devtools (Development Only)**

**File:** `app/layout.tsx` or `app/seller/layout.tsx`

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function Layout({ children }) {
    return (
        <>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </>
    );
}
```

#### **B. Prefetching Critical Data**

```typescript
// In DashboardClient.tsx - prefetch on mount
export function DashboardClient() {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Prefetch wallet balance (always needed)
        queryClient.prefetchQuery({
            queryKey: queryKeys.wallet.balance(),
            queryFn: async () => {
                const { data } = await apiClient.get('/wallet/balance');
                return data.data;
            }
        });

        // Prefetch dashboard metrics
        queryClient.prefetchQuery({
            queryKey: queryKeys.analytics.dashboard(),
            queryFn: async () => {
                const { data } = await apiClient.get('/analytics/dashboard');
                return data.data;
            }
        });
    }, [queryClient]);

    return (/* dashboard components */);
}
```

#### **C. Optimistic Updates (Already Implemented)**

Keep existing patterns in wallet, orders, shipments:
```typescript
// useWallet.ts - already has optimistic updates
export const useRechargeWallet = () => {
    return useMutation({
        ...createOptimisticUpdateHandler({
            queryClient,
            queryKey: queryKeys.wallet.balance(),
            updateFn: (oldData: WalletBalance) => ({
                ...oldData,
                balance: oldData.balance + amount
            })
        })
    });
};
```

---

## Mock Data Fallback Strategy

### Development Environment
```typescript
// lib/config.ts
export const USE_MOCK_FALLBACK = process.env.NODE_ENV === 'development';

// In components
const ordersData = data?.orders || (USE_MOCK_FALLBACK ? MOCK_ORDERS : []);
```

### Production Environment
```typescript
// No mock fallback - show empty state or error
if (!data?.orders.length) {
    return <EmptyState variant="noItems" />;
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// PerformanceBar.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PerformanceBar } from './PerformanceBar';

describe('PerformanceBar', () => {
    it('shows loading skeleton initially', () => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <PerformanceBar />
            </QueryClientProvider>
        );
        expect(screen.getByTestId('performance-skeleton')).toBeInTheDocument();
    });

    it('displays data after loading', async () => {
        // Mock successful API response
        // Assert data displayed correctly
    });
});
```

### Integration Tests
```typescript
// Dashboard.integration.test.tsx
describe('Dashboard Integration', () => {
    it('loads all dashboard components with real data', async () => {
        // Mock API responses
        // Render DashboardClient
        // Assert all components rendered
        // Assert data displayed correctly
    });
});
```

---

## Verification Checklist

### Phase 1 Verification
- [ ] Dashboard loads without errors
- [ ] All KPI cards show real data
- [ ] Performance bar displays 7-day trends
- [ ] Order trend chart shows 30-day data
- [ ] Cash flow forecast displays 7-day projection
- [ ] Profitability card shows current metrics
- [ ] RTO analytics displays rates and breakdown
- [ ] Geographic insights shows top cities
- [ ] Shipment pipeline shows status counts
- [ ] Orders list loads with pagination
- [ ] Shipments list loads with filters
- [ ] Search functionality works
- [ ] Loading states display correctly
- [ ] Error states with retry work
- [ ] Empty states show appropriate messages

### Phase 2 Verification
- [ ] COD settlement timeline shows upcoming dates
- [ ] Spending insights displays categories
- [ ] SLA dashboard shows performance metrics
- [ ] Courier comparison table populates
- [ ] Cost analysis displays breakdowns
- [ ] All finance analytics accurate

### Phase 3 Verification
- [ ] Smart insights panel displays AI recommendations
- [ ] Admin dashboard loads successfully
- [ ] Top sellers component uses real data (no mock)
- [ ] Seller health dashboard displays metrics
- [ ] Admin actions required shows pending items

### Phase 4 Verification
- [ ] All loading skeletons match component structure
- [ ] Error boundaries catch and display errors
- [ ] Empty states display appropriate messages
- [ ] React Query devtools accessible in dev
- [ ] Prefetching reduces perceived load time
- [ ] Optimistic updates feel instant
- [ ] Performance metrics acceptable (<2s initial load)

---

## Critical Files to Modify

### Phase 1 (Priority)
1. `client/src/components/seller/dashboard/PerformanceBar.tsx`
2. `client/src/components/seller/dashboard/OrderTrendChart.tsx`
3. `client/src/components/seller/dashboard/CashFlowForecast.tsx`
4. `client/src/components/seller/dashboard/ProfitabilityCard.tsx`
5. `client/src/components/seller/dashboard/RTOAnalytics.tsx`
6. `client/src/components/seller/dashboard/GeographicInsights.tsx`
7. `client/src/components/seller/dashboard/ShipmentPipeline.tsx`
8. `app/seller/dashboard/DashboardClient.tsx` (CREATE NEW)
9. `app/seller/orders/OrdersClient.tsx`
10. `app/seller/shipments/ShipmentsClient.tsx`

### Phase 2
11. `client/src/components/seller/dashboard/CODSettlementTimeline.tsx`
12. `app/seller/financials/FinancialsClient.tsx`
13. `client/src/features/analytics/SLADashboard.tsx`
14. `client/src/features/analytics/CourierComparison.tsx`
15. `client/src/features/analytics/CostAnalysis.tsx`

### Phase 3
16. `client/src/components/seller/dashboard/SmartInsightsPanel.tsx`
17. `app/admin/dashboard/page.tsx` (CREATE NEW)
18. `app/admin/dashboard/AdminDashboardClient.tsx` (CREATE NEW)
19. `client/src/components/admin/TopSellers.tsx`
20. `client/src/components/admin/SellerHealthDashboard.tsx`

### Phase 4 (Enhancement)
21. `client/src/components/ui/data/Skeleton.tsx`
22. `client/src/components/shared/ErrorBoundary.tsx`
23. `client/src/components/ui/feedback/EmptyState.tsx`
24. `app/layout.tsx` or `app/seller/layout.tsx`

---

## Implementation Timeline

| Phase | Duration | Components | Priority |
|-------|----------|------------|----------|
| Phase 1 | 3 days | Dashboard + Orders/Shipments | CRITICAL |
| Phase 2 | 2 days | Finance + Analytics | HIGH |
| Phase 3 | 2 days | Advanced + Admin | MEDIUM |
| Phase 4 | 1 day | Polish + Testing | HIGH |
| **Total** | **8 days** | **~25 components** | |

---

## Risk Mitigation

### Backend API Availability
- **Risk:** Backend endpoints may not be fully ready
- **Mitigation:** Keep mock fallback in development, implement graceful degradation

### Performance Issues
- **Risk:** Too many simultaneous API calls on dashboard load
- **Mitigation:** Implement prefetching, use Suspense boundaries, lazy load non-critical components

### Type Mismatches
- **Risk:** API response types may differ from TypeScript definitions
- **Mitigation:** Add runtime validation with zod, log type mismatches in development

### Cache Staleness
- **Risk:** Users see stale data
- **Mitigation:** Configure appropriate CACHE_TIMES, implement refetchOnWindowFocus where needed

---

## Success Metrics

### Technical Metrics
- Page load time < 2 seconds (initial)
- Time to interactive < 3 seconds
- API error rate < 1%
- Cache hit rate > 70%

### User Experience Metrics
- Zero hardcoded mock data in production
- All loading states have skeletons
- All errors have retry mechanisms
- All empty states have clear messaging

### Code Quality Metrics
- 100% of components use hooks (no direct API calls)
- Consistent error handling patterns
- Consistent loading state patterns
- TypeScript strict mode compliance

---

## Post-Implementation Tasks

1. **Documentation:**
   - Update component documentation with hook usage
   - Document data flow patterns
   - Create integration guide for new features

2. **Monitoring:**
   - Add error tracking (Sentry/similar)
   - Monitor API response times
   - Track cache hit rates

3. **Optimization:**
   - Profile components for unnecessary re-renders
   - Optimize bundle size
   - Implement code splitting for large components

4. **Team Training:**
   - Share hook integration patterns
   - Document best practices
   - Create example templates

---

## Appendix: Hook → Component Mapping

| Hook | Component(s) Using It | Status |
|------|----------------------|--------|
| useAnalytics | PerformanceBar, ProfitabilityCard | ⚠️ Needs integration |
| useOrderTrends | OrderTrendChart | ⚠️ Needs integration |
| useCashFlowForecast | CashFlowForecast | ⚠️ Needs integration |
| useRTOAnalytics | RTOAnalytics | ⚠️ Needs integration |
| useGeographicInsights | GeographicInsights | ⚠️ Needs integration |
| useShipments | ShipmentPipeline, ShipmentsClient | ⚠️ Partial integration |
| useOrders | Orders Lists, PerformanceBar | ⚠️ Partial integration |
| useWallet | WalletBalanceCard, TransactionList | ✅ Fully integrated |
| useReturns | ReturnsTable, RefundModal | ✅ Fully integrated |
| useNDR | NDRCasesTable, TakeActionModal | ✅ Fully integrated |
| useDisputes | DisputesTable, EvidenceModal | ✅ Fully integrated |
| useCOD | CODRemittanceTable, RequestPayout | ✅ Fully integrated |
| useSmartInsights | SmartInsightsPanel | ⚠️ Needs integration |
| useUserManagement | AdminDashboard, TopSellers | ⚠️ Needs integration |

---

---

# COMPREHENSIVE COMPONENT INTEGRATION CHECKLIST

## 26 Components with Mock Data (MUST FIX)

### **SELLER COMPONENTS (10)**
| Component | File | Hook Needed | Backend Endpoint | Priority |
|-----------|------|-------------|------------------|----------|
| Weight Disputes | `seller/weight/WeightClient.tsx` | useWeightDisputes (NEW) | GET `/disputes/weight` | P0 |
| Pickup Addresses | `seller/settings/pickup-addresses/PickupAddressesClient.tsx` | useProfile, useAddress | GET `/profile`, POST `/profile/address` | P1 |
| Courier Preferences | `seller/settings/couriers/CouriersClient.tsx` | useCouriers, useSettings | GET `/couriers`, PUT `/settings/couriers` | P1 |
| Profile Management | `seller/settings/profile/ProfileClient.tsx` | useProfile | GET/PUT `/profile` | P1 |
| B2B Rates | `seller/rates/b2b/B2bRatesClient.tsx` | useRateCards | GET `/ratecards` | P2 |
| Label Generation | `seller/label/LabelClient.tsx` | useShipments | POST `/shipments/:id/label` | P1 |
| Support Tickets | `seller/support/SupportClient.tsx` | useSupport (verify exists) | GET `/support/tickets` | P2 |
| Wallet Recharge Promo | `seller/wallet/recharge/RechargeClient.tsx` | usePromoCodes | GET `/promo-codes/validate` | P2 |
| Tracking | `seller/tracking/TrackingClient.tsx` | useShipmentDetail (NEW) | GET `/shipments/:id` | P1 |
| Bulk Orders | `seller/orders/bulk/BulkClient.tsx` | useBulkOrderImport (NEW) | POST `/orders/bulk` | P1 |

### **ADMIN COMPONENTS (15)**
| Component | File | Hook Needed | Backend Endpoint | Priority |
|-----------|------|-------------|------------------|----------|
| KYC Approvals | `admin/kyc/KycClient.tsx` | useKYC | POST `/kyc/:id/verify`, POST `/kyc/:id/reject` | P0 |
| Admin Couriers | `admin/couriers/CouriersClient.tsx` | useCouriers | GET `/admin/couriers`, PUT `/admin/couriers/:id` | P0 |
| Courier Services | `admin/couriers/services/ServicesClient.tsx` | useCouriers | GET `/admin/couriers/:id/services` | P1 |
| Sales Reps | `admin/sales/SalesClient.tsx` | useSalesRep (NEW) | GET `/commission/sales-representatives` | P2 |
| Coupons | `admin/coupons/CouponsClient.tsx` | usePromoCodes | GET `/promo-codes` | P2 |
| Profit Analysis | `admin/profit/ProfitClient.tsx` | useAnalytics | GET `/analytics/profitability` | P1 |
| Admin Support | `admin/support/SupportClient.tsx` | useSupport | GET `/admin/support/tickets` | P2 |
| Admin NDR | `admin/ndr/NdrClient.tsx` | useNDR | GET `/admin/ndr/events` | P1 |
| Admin Returns | `admin/returns/ReturnsClient.tsx` | useReturns | GET `/admin/returns` | P1 |
| Admin Orders | `admin/orders/OrdersClient.tsx` | useOrders | GET `/admin/orders` | P1 |
| Rate Cards | `admin/ratecards/RatecardsClient.tsx` | useRateCards | GET `/ratecards`, POST `/ratecards` | P0 |
| Rate Card Assignment | `admin/ratecards/assign/AssignRatecardClient.tsx` | useRateCards | POST `/ratecards/assign` | P1 |
| Billing | `admin/billing/BillingClient.tsx` | useWallet, useTransactions | GET `/finance/wallet/transactions` | P2 |
| Admin Analytics | `admin/analytics/AnalyticsClient.tsx` | useAnalytics | GET `/analytics/dashboard/admin` | P1 |
| Top Sellers | `admin/TopSellers.tsx` | useUserManagement | GET `/admin/users?role=seller` | P0 |

### **PUBLIC (1)**
| Component | File | Hook Needed | Backend Endpoint | Priority |
|-----------|------|-------------|------------------|----------|
| Public Tracking | `track/page.tsx` | useShipments (public endpoint) | GET `/shipments/public/track/:awb` | P2 |

---

# MISSING ADMIN PAGES (MUST CREATE)

## Pages That Don't Exist But Backend Is Ready

1. **Admin User Management**
   - File: `app/admin/users/page.tsx` + `app/admin/users/UsersClient.tsx` (CREATE NEW)
   - Hooks: useUserManagement, usePromoteUser, useDemoteUser (all exist)
   - Features: List users, promote to admin, demote to seller, filter by role

2. **Admin Courier Management**
   - File: `app/admin/couriers/manage/page.tsx` + `ManageCouriersClient.tsx` (CREATE NEW)
   - Hooks: useCouriers, useUpdateCourier, useToggleCourierStatus (all exist)
   - Features: CRUD couriers, toggle active status, test integration

3. **Commission Management**
   - File: `app/admin/commission/page.tsx` + `CommissionClient.tsx` (CREATE NEW)
   - Hooks: useCommissionRules, usePayouts, useSalesReps (CREATE in Phase 1)
   - Features: Manage rules, process payouts, manage sales reps

4. **Warehouse Operations Dashboard**
   - File: `app/admin/warehouse-ops/page.tsx` + `WarehouseOpsClient.tsx` (CREATE NEW)
   - Hooks: useInventory, usePacking, usePicking (CREATE in Phase 1)
   - Features: Inventory levels, packing stations, pick lists

5. **Weight Disputes Management**
   - File: `app/admin/disputes/weight/page.tsx` + `WeightDisputesClient.tsx` (CREATE NEW)
   - Hooks: useWeightDisputes (CREATE in Phase 1)
   - Features: View disputes, review evidence, resolve disputes

---

# HOOKS TO CREATE (15+)

## NEW HOOKS REQUIRED

| Hook Name | File | Backend Endpoints | Effort | Phase |
|-----------|------|-------------------|--------|-------|
| useCommission | `hooks/commission/useCommission.ts` | `/commission/rules/*` | 4h | Phase 1 |
| usePayouts | Same file | `/commission/payouts/*` | Included | Phase 1 |
| useSalesRep | Same file | `/commission/sales-representatives/*` | Included | Phase 1 |
| useInventory | `hooks/logistics/useInventory.ts` | `/inventory/*` | 4h | Phase 1 |
| usePacking | `hooks/logistics/usePacking.ts` | `/packing/stations/*` | 4h | Phase 1 |
| usePicking | `hooks/logistics/usePicking.ts` | `/picking/pick-lists/*` | 4h | Phase 1 |
| useWeightDisputes | `hooks/disputes/useWeightDisputes.ts` | `/disputes/weight/*` | 3h | Phase 1 |
| useEmailQueue | `hooks/admin/useEmailQueue.ts` | `/admin/email-queue/*` | 2h | Phase 1 |
| useAnalyticsExport | `hooks/analytics/useAnalyticsExport.ts` | `/analytics/export/*` | 2h | Phase 1 |
| useCODTimeline | `hooks/finance/useCODTimeline.ts` | GET `/finance/cod-remittance/timeline` | 2h | Phase 1 |
| useBulkOrderImport | `hooks/orders/useBulkOrderImport.ts` | POST `/orders/bulk` | 2h | Phase 1 |
| useShipmentDetail | `hooks/orders/useShipmentDetail.ts` | GET `/shipments/:id` | 2h | Phase 1 |
| useSupport | `hooks/support/useSupport.ts` | `/support/tickets/*` | 3h | Phase 1 |
| useWhatsApp | `hooks/communication/useWhatsApp.ts` | `/whatsapp/message` | 2h | Phase 1 |
| useInvoices | `hooks/finance/useInvoices.ts` | `/invoices/*` | 3h | Phase 1 |

**Total Hooks to Create:** 15 hooks
**Total Effort:** ~35 hours (4-5 days)

---

# HOOKS TO FIX (5)

## HOOKS WITH ISSUES

| Issue | Hook | File | Problem | Solution | Effort |
|-------|------|------|---------|----------|--------|
| Duplicate | useCashFlowForecast | Two files | axios vs apiClient | Delete axios version | 30min |
| Duplicate | useAvailableBalance | Two files | axios vs apiClient | Delete axios version | 30min |
| Mock Data | useIntegrations | `integrations/useIntegrations.ts` | Returns hardcoded data | Call real API `/integrations` | 1h |
| Mock Data | useSecurity | `security/useSecurity.ts` | MOCK_ALERTS | Call real API `/fraud/alerts` | 2h |
| Mock Data | useWarehouses | `logistics/useWarehouses.ts` | Mock fallback | Remove fallback, fail properly | 1h |
| Mock Data | usePincodeAutocomplete | `logistics/usePincodeAutocomplete.ts` | mockData fallback | Remove fallback | 30min |
| Not Exported | useCommunicationNotifications | `communication/` | Missing export | Add to index.ts | 5min |

**Total Fixes:** 7 issues
**Total Effort:** ~6 hours

---

# BACKEND GAPS TO FIX (6)

| Issue | File | Lines | Problem | Solution | Effort |
|-------|------|-------|---------|----------|--------|
| RTO Mock Fallback | `rto.service.ts` | 478-495 | Mock AWB on error | Fail fast, throw error | 4h |
| COD Settlement API | `cod-remittance.job.ts` | 198-205 | TODO not implemented | Call Velocity API | 3 days |
| Razorpay Verification | `cod-remittance.job.ts` | 304-314 | TODO not implemented | Call Razorpay API | 1 day |
| Returns Pickup Mock | `return.service.ts` | ~200 | Mock AWB | Call Velocity API | 2h |
| Velocity getSettlement | `velocity-shipfast.provider.ts` | N/A | Method doesn't exist | Add method | 1 day |
| Razorpay getPayoutStatus | `RazorpayPayoutProvider.ts` | N/A | Method doesn't exist | Add method | 4h |

**Total Backend Fixes:** 6 issues
**Total Effort:** ~5 days (included in Phase 0)

---

# COMPLETE IMPLEMENTATION TIMELINE

## REALISTIC EFFORT ESTIMATES

| Phase | Description | Duration | Developer Hours | Calendar Days |
|-------|-------------|----------|-----------------|---------------|
| **Phase 0** | Critical Fixes (Backend + Hooks) | 40 hours | 5 days | Week 1 |
| **Phase 1** | Create 15 Missing Hooks | 35 hours | 4.5 days | Week 2 (Mon-Thu) |
| **Phase 2** | Fix 7 Mock Data Hooks | 6 hours | 1 day | Week 2 (Fri) |
| **Phase 3** | Dashboard Integration (10 components) | 24 hours | 3 days | Week 3 (Mon-Wed) |
| **Phase 4** | Seller Components (10 components) | 20 hours | 2.5 days | Week 3 (Thu-Fri) + Week 4 (Mon) |
| **Phase 5** | Admin Components (15 + 5 pages) | 32 hours | 4 days | Week 4 (Tue-Fri) |
| **Phase 6** | Advanced Features & Warehouse Ops | 24 hours | 3 days | Week 5 (Mon-Wed) |
| **Phase 7** | Polish, Testing, Production Hardening | 16 hours | 2 days | Week 5 (Thu-Fri) |
| **TOTAL** | **Full Integration** | **197 hours** | **~25 days** | **5 weeks** |

---

# VERIFICATION CHECKLIST (100% COMPLETION)

## PHASE 0 VERIFICATION
- [ ] useCashFlowForecast axios version deleted
- [ ] useAvailableBalance axios version deleted
- [ ] useCommunicationNotifications exported in index.ts
- [ ] RTO service throws error instead of mock AWB
- [ ] COD Velocity settlement API implemented and tested
- [ ] Razorpay payout verification API implemented and tested
- [ ] Returns pickup calls Velocity API (no mock AWB)
- [ ] All Phase 0 changes tested end-to-end
- [ ] No TODO comments remain in critical paths

## PHASE 1 VERIFICATION (15 New Hooks)
- [ ] useCommission hooks created and exported
- [ ] useInventory hooks created and exported
- [ ] usePacking hooks created and exported
- [ ] usePicking hooks created and exported
- [ ] useWeightDisputes hooks created and exported
- [ ] useEmailQueue hooks created and exported
- [ ] useAnalyticsExport hooks created and exported
- [ ] useCODTimeline hook created and exported
- [ ] useBulkOrderImport hook created and exported
- [ ] useShipmentDetail hook created and exported
- [ ] useSupport hooks created and exported
- [ ] useWhatsApp hooks created and exported
- [ ] useInvoices hooks created and exported
- [ ] All query keys added to query-keys.ts
- [ ] All hooks follow established patterns (CACHE_TIMES, RETRY_CONFIG, error handling)

## PHASE 2 VERIFICATION (Mock Data Fixes)
- [ ] useIntegrations calls real `/integrations` API
- [ ] useSecurity calls real `/fraud/alerts` API (no MOCK_ALERTS)
- [ ] useWarehouses removed MOCK_WAREHOUSES fallback
- [ ] usePincodeAutocomplete removed mockData fallback
- [ ] All fixed hooks tested with real backend
- [ ] Error states properly handled (no silent failures)

## PHASE 3 VERIFICATION (Dashboard Components)
- [ ] PerformanceBar.tsx uses real useAnalytics + useOrders
- [ ] OrderTrendChart.tsx uses real useOrderTrends
- [ ] CashFlowForecast.tsx uses real useCashFlowForecast (fixed version)
- [ ] ProfitabilityCard.tsx uses real useProfitabilityAnalytics
- [ ] RTOAnalytics.tsx uses real useRTOAnalytics
- [ ] GeographicInsights.tsx uses real useGeographicInsights
- [ ] ShipmentPipeline.tsx uses real useShipments
- [ ] CODSettlementTimeline.tsx uses real useCODTimeline
- [ ] SmartInsightsPanel.tsx uses real useSmartInsights
- [ ] DashboardClient.tsx orchestrator created with Suspense boundaries
- [ ] All dashboard components show loading skeletons
- [ ] All dashboard components have error boundaries
- [ ] Dashboard loads in < 2 seconds
- [ ] No mock data visible in dashboard

## PHASE 4 VERIFICATION (Seller Components)
- [ ] Weight Disputes integrated with useWeightDisputes
- [ ] Pickup Addresses integrated with useProfile/useAddress
- [ ] Courier Preferences integrated with useCouriers/useSettings
- [ ] Profile Management integrated with useProfile
- [ ] B2B Rates integrated with useRateCards
- [ ] Label Generation integrated with useShipments
- [ ] Support Tickets integrated with useSupport
- [ ] Wallet Recharge Promo integrated with usePromoCodes
- [ ] Tracking integrated with useShipmentDetail
- [ ] Bulk Orders integrated with useBulkOrderImport
- [ ] All seller components tested end-to-end
- [ ] No mock data in seller section

## PHASE 5 VERIFICATION (Admin Components + Pages)
- [ ] KYC Approvals integrated (useKYC admin hooks)
- [ ] Admin Couriers integrated (useCouriers)
- [ ] Courier Services integrated (useCouriers)
- [ ] Sales Reps integrated (useSalesRep)
- [ ] Coupons integrated (usePromoCodes)
- [ ] Profit Analysis integrated (useAnalytics)
- [ ] Admin Support integrated (useSupport)
- [ ] Admin NDR integrated (useNDR)
- [ ] Admin Returns integrated (useReturns)
- [ ] Admin Orders integrated (useOrders)
- [ ] Rate Cards integrated (useRateCards)
- [ ] Rate Card Assignment integrated (useRateCards)
- [ ] Billing integrated (useWallet, useTransactions)
- [ ] Admin Analytics integrated (useAnalytics)
- [ ] Top Sellers component uses real useUserManagement (hardcoded mock removed)
- [ ] Admin User Management page created and functional
- [ ] Admin Courier Management page created and functional
- [ ] Commission Management page created and functional
- [ ] Warehouse Operations Dashboard created and functional
- [ ] Weight Disputes Management page created and functional
- [ ] All admin features accessible and functional
- [ ] No mock data in admin section

## PHASE 6 VERIFICATION (Advanced Features)
- [ ] Inventory Management integrated (useInventory)
- [ ] Packing Stations integrated (usePacking)
- [ ] Pick Lists integrated (usePicking)
- [ ] Communication Rules/Templates integrated (useCommunicationNotifications)
- [ ] Fraud Detection Dashboard integrated (useFraud, useSecurity - real data)
- [ ] Email Queue integrated (useEmailQueue)
- [ ] WhatsApp messaging integrated (useWhatsApp)
- [ ] Invoice management integrated (useInvoices)
- [ ] All advanced features tested
- [ ] No mock data in advanced features

## PHASE 7 VERIFICATION (Production Hardening)
- [ ] All USE_MOCK_FALLBACK checks removed from codebase
- [ ] All mock data imports removed (no import from /lib/mockData/)
- [ ] All loading skeletons implemented and matching component structure
- [ ] All error boundaries implemented
- [ ] All empty states implemented with appropriate messages
- [ ] All forms have validation and error handling
- [ ] All mutations have optimistic updates where appropriate
- [ ] React Query DevTools added (dev only)
- [ ] Performance audit completed (< 2s page load)
- [ ] Bundle size optimized
- [ ] All components use TypeScript strict mode
- [ ] E2E tests written for critical flows
- [ ] Accessibility audit passed
- [ ] No console errors or warnings in production build
- [ ] API error rate < 1%
- [ ] Cache hit rate > 70%

## FINAL 100% COMPLETION VERIFICATION
- [ ] ✅ All 26 components with mock data now use real APIs
- [ ] ✅ All 15 missing hooks created
- [ ] ✅ All 7 problematic hooks fixed
- [ ] ✅ All 6 backend gaps fixed
- [ ] ✅ All 5 missing admin pages created
- [ ] ✅ Zero mock data in production build
- [ ] ✅ Zero TODO comments in critical paths
- [ ] ✅ All 250+ backend APIs have frontend coverage
- [ ] ✅ All 61 client components integrated
- [ ] ✅ Production deployment successful
- [ ] ✅ Monitoring and alerts configured
- [ ] ✅ Documentation updated

---

# RISK MITIGATION STRATEGIES

## RISK 1: Backend APIs Not Ready
**Mitigation:**
- Verify all backend endpoints work before starting frontend integration
- Run Postman/curl tests for each endpoint
- Document any API issues in a separate tracking doc
- Implement graceful degradation only in development (USE_MOCK_FALLBACK removed in production)

## RISK 2: Type Mismatches Between Backend and Frontend
**Mitigation:**
- Add runtime validation with Zod schemas for critical endpoints
- Log type mismatches in development console
- Add TypeScript strict mode enforcement
- Create integration tests that verify API response structure

## RISK 3: Performance Degradation
**Mitigation:**
- Implement proper caching with CACHE_TIMES
- Use React Query's stale-while-revalidate pattern
- Add prefetching for critical data
- Implement pagination for all large lists
- Use Suspense boundaries to prevent blocking

## RISK 4: Breaking Changes During Integration
**Mitigation:**
- Use feature flags for gradual rollout
- Maintain backward compatibility temporarily
- Run parallel testing (mock vs real API)
- Have rollback plan for each phase

## RISK 5: Developer Bandwidth
**Mitigation:**
- Phases are independent - can be parallelized
- Clear documentation for each hook/component
- Code review checklist for consistency
- Pair programming for complex integrations

---

# POST-IMPLEMENTATION TASKS

## IMMEDIATE (After Phase 7)
1. ✅ Remove all mock data files from `lib/mockData/`
2. ✅ Remove all `USE_MOCK_FALLBACK` environment checks
3. ✅ Update .env.example with only real API keys
4. ✅ Deploy to staging for QA testing
5. ✅ Run load tests on critical endpoints
6. ✅ Configure error tracking (Sentry)
7. ✅ Set up monitoring dashboards

## SHORT-TERM (Within 2 Weeks)
1. Create video demos of all features
2. Write user documentation
3. Create admin user guide
4. Set up customer support knowledge base
5. Train customer support team
6. Create API documentation for third-party integrations
7. Set up analytics tracking (Mixpanel/Amplitude)

## LONG-TERM (Within 1 Month)
1. Implement advanced caching strategies
2. Add Redis caching layer for hot data
3. Implement GraphQL for complex queries (optional)
4. Add real-time updates with WebSockets
5. Implement offline support with service workers
6. Add advanced search with Elasticsearch
7. Performance optimization based on real usage data

---

# SUCCESS METRICS

## TECHNICAL METRICS
- ✅ 0% mock data usage in production
- ✅ 100% hook coverage for backend APIs
- ✅ 100% component integration
- ✅ < 2s page load time
- ✅ < 1% API error rate
- ✅ > 70% cache hit rate
- ✅ 0 critical security vulnerabilities
- ✅ > 80% code coverage

## BUSINESS METRICS
- ✅ 100% feature completeness
- ✅ Zero data loss incidents
- ✅ Real-time order tracking
- ✅ Automated COD remittance
- ✅ Automated RTO processing
- ✅ Real warehouse management
- ✅ Real commission tracking

## USER EXPERIENCE METRICS
- ✅ All loading states have skeletons
- ✅ All errors have retry mechanisms
- ✅ All empty states have clear messaging
- ✅ All forms have validation
- ✅ All mutations have optimistic updates
- ✅ Zero console errors
- ✅ Smooth animations and transitions

---

# END OF COMPREHENSIVE PLAN

**This plan achieves 100% production readiness by:**
1. Fixing all 7 critical backend gaps
2. Creating 15 missing hooks
3. Fixing 7 problematic hooks
4. Integrating all 26 components with mock data
5. Creating 5 missing admin pages
6. Eliminating ALL mock data from production
7. Comprehensive testing and verification

**Timeline:** 5 weeks (197 developer hours)
**Deliverable:** Production-ready application with 100% real API integration

**Next Steps After Plan Approval:**
1. Start Phase 0 (Critical Fixes)
2. Daily standup to track progress
3. Code review for each phase completion
4. QA testing after each phase
5. Staging deployment after Phase 7
6. Production deployment with monitoring