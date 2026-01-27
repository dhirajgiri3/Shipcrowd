# 🚀 API INTEGRATION IMPLEMENTATION PLAN
**Project**: Shipcrowd Frontend-Backend Integration
**Duration**: 4-5 Weeks
**Status**: Ready to Execute

---

## 📋 OVERVIEW

This document provides a detailed, step-by-step implementation plan to connect all mocked frontend components to real backend APIs. Based on the comprehensive audit, we have identified 18 admin pages, 7 seller pages, and 3 shared components that need full API integration.

---

## 🎯 PHASE 1: CRITICAL BUSINESS OPERATIONS (Week 1-2)

**Goal**: Enable core shipping and order management functionality
**Priority**: 🔴 CRITICAL
**Estimated Effort**: 60-80 hours

---

### 1.1 Admin Orders Management

**Files to Update**:
- `client/app/admin/orders/components/OrdersClient.tsx`

**Current State**:
- Uses `mockOrders` array (6 hardcoded orders)
- Uses `courierRates` array (4 hardcoded courier options)

**Implementation Steps**:

1. **Create API Hook** - `useAdminOrders.ts`
```typescript
// client/src/core/api/hooks/admin/useAdminOrders.ts
export const useAdminOrders = (filters?: OrderFilters) => {
  return useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: () => ordersApi.getAdminOrders(filters)
  });
};

export const useShipOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ShipOrderData) => ordersApi.shipOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'orders']);
    }
  });
};

export const useGetCourierRates = () => {
  return useMutation({
    mutationFn: (orderData: RateRequest) => ratesApi.getCourierRates(orderData)
  });
};
```

2. **Create API Client Methods**
```typescript
// client/src/core/api/clients/admin/OrdersClient.ts
export class AdminOrdersClient {
  async getAdminOrders(filters?: OrderFilters): Promise<Order[]> {
    const response = await apiClient.get('/admin/orders', { params: filters });
    return response.data;
  }

  async shipOrder(data: ShipOrderData): Promise<Shipment> {
    const response = await apiClient.post(`/admin/orders/${data.orderId}/ship`, data);
    return response.data;
  }

  async getCourierRates(orderData: RateRequest): Promise<CourierRate[]> {
    const response = await apiClient.get('/admin/orders/courier-rates', { params: orderData });
    return response.data;
  }
}
```

3. **Update Component**
```typescript
// Remove mockOrders, mockCourierRates
// Add:
const { data: orders, isLoading } = useAdminOrders(filters);
const shipOrderMutation = useShipOrder();
const getCourierRatesMutation = useGetCourierRates();
```

4. **Backend Requirements**
```
GET    /api/admin/orders?status=&search=&page=&limit=
POST   /api/admin/orders/:id/ship
       Body: { courierId, serviceType, awbNumber }
GET    /api/admin/orders/courier-rates?weight=&fromPincode=&toPincode=
```

**Testing Checklist**:
- [ ] Can view all orders across sellers
- [ ] Can filter by status, search by AWB/order ID
- [ ] Can ship orders and assign courier
- [ ] Can fetch real-time courier rates
- [ ] Loading states work correctly
- [ ] Error handling works

---

### 1.2 Admin Sellers Management

**Files to Update**:
- `client/app/admin/sellers/components/SellersClient.tsx`

**Current State**:
- Uses `mockSellers` array (5 hardcoded sellers with stats)

**Implementation Steps**:

1. **Create API Hook** - `useAdminSellers.ts`
```typescript
export const useAdminSellers = (filters?: SellerFilters) => {
  return useQuery({
    queryKey: ['admin', 'sellers', filters],
    queryFn: () => sellersApi.getAllSellers(filters)
  });
};

export const useApproveSeller = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sellerId: string) => sellersApi.approveSeller(sellerId),
    onSuccess: () => queryClient.invalidateQueries(['admin', 'sellers'])
  });
};

export const useSuspendSeller = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sellerId, reason }: { sellerId: string; reason: string }) =>
      sellersApi.suspendSeller(sellerId, reason),
    onSuccess: () => queryClient.invalidateQueries(['admin', 'sellers'])
  });
};

export const useImpersonateSeller = () => {
  return useMutation({
    mutationFn: (sellerId: string) => sellersApi.impersonateSeller(sellerId)
  });
};
```

2. **Create API Client Methods**
```typescript
export class AdminSellersClient {
  async getAllSellers(filters?: SellerFilters): Promise<SellerWithStats[]> {
    const response = await apiClient.get('/admin/sellers', { params: filters });
    return response.data;
  }

  async approveSeller(sellerId: string): Promise<void> {
    await apiClient.put(`/admin/sellers/${sellerId}/approve`);
  }

  async suspendSeller(sellerId: string, reason: string): Promise<void> {
    await apiClient.put(`/admin/sellers/${sellerId}/suspend`, { reason });
  }

  async impersonateSeller(sellerId: string): Promise<{ token: string; redirectUrl: string }> {
    const response = await apiClient.post(`/admin/sellers/${sellerId}/impersonate`);
    return response.data;
  }
}
```

3. **Backend Requirements**
```
GET    /api/admin/sellers?status=&search=&kycStatus=
       Response: Array<{ id, companyName, email, stats: { totalOrders, revenue, rtoRate } }>
PUT    /api/admin/sellers/:id/approve
PUT    /api/admin/sellers/:id/suspend
       Body: { reason: string }
POST   /api/admin/sellers/:id/impersonate
       Response: { token: string, redirectUrl: string }
```

**Testing Checklist**:
- [ ] Can view all sellers with stats
- [ ] Can filter by status, KYC status
- [ ] Can approve/suspend sellers
- [ ] Can impersonate seller (switch to seller view)
- [ ] Stats update in real-time

---

### 1.3 Admin Billing & Recharges

**Files to Update**:
- `client/app/admin/billing/components/BillingClient.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useAdminBilling.ts`
```typescript
export const useRechargeHistory = (filters?: RechargeFilters) => {
  return useQuery({
    queryKey: ['admin', 'billing', 'recharges', filters],
    queryFn: () => billingApi.getRechargeHistory(filters)
  });
};

export const useManualBillingEntries = () => {
  return useQuery({
    queryKey: ['admin', 'billing', 'manual-entries'],
    queryFn: () => billingApi.getManualEntries()
  });
};

export const useCreateManualEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ManualEntryData) => billingApi.createManualEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'billing']);
      queryClient.invalidateQueries(['wallet']);
    }
  });
};
```

2. **Backend Requirements**
```
GET    /api/admin/billing/recharges?sellerId=&status=&dateFrom=&dateTo=
       Response: Array<{ id, sellerId, amount, status, gateway, timestamp }>
GET    /api/admin/billing/manual-entries
       Response: Array<{ id, sellerId, type, amount, reason, createdBy, timestamp }>
POST   /api/admin/billing/manual-entry
       Body: { sellerId, type: 'credit'|'debit', amount, reason }
```

**Testing Checklist**:
- [ ] Can view all recharge history
- [ ] Can filter by seller, status, date range
- [ ] Can view manual credit/debit entries
- [ ] Can create manual wallet adjustments
- [ ] Wallet balances update immediately

---

### 1.4 Seller Weight Discrepancies

**Files to Update**:
- `client/app/seller/weight/page.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useWeightDiscrepancies.ts`
```typescript
export const useWeightDiscrepancies = (filters?: DiscrepancyFilters) => {
  return useQuery({
    queryKey: ['weight-discrepancies', filters],
    queryFn: () => weightApi.getDiscrepancies(filters)
  });
};

export const useAcceptDiscrepancy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (discrepancyId: string) => weightApi.acceptDiscrepancy(discrepancyId),
    onSuccess: () => queryClient.invalidateQueries(['weight-discrepancies'])
  });
};

export const useDisputeDiscrepancy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DisputeData) => weightApi.disputeDiscrepancy(data),
    onSuccess: () => queryClient.invalidateQueries(['weight-discrepancies'])
  });
};

export const useWeightStats = () => {
  return useQuery({
    queryKey: ['weight-discrepancies', 'stats'],
    queryFn: () => weightApi.getStats()
  });
};
```

2. **Backend Requirements**:
```
GET    /api/weight-discrepancies?status=&page=&limit=
       Response: { discrepancies: Array<Discrepancy>, stats: DiscrepancyStats }
POST   /api/weight-discrepancies/:id/accept
POST   /api/weight-discrepancies/:id/dispute
       Body: { reason: string, evidenceUrls: string[] }
GET    /api/weight-discrepancies/stats
       Response: { total, pending, additionalCharges, disputesWonRate }
```

**Testing Checklist**:
- [ ] Can view all weight discrepancies
- [ ] Can accept discrepancies
- [ ] Can dispute with reason and evidence
- [ ] Stats display correctly
- [ ] Filters work (status, date range)

---

### 1.5 Seller Label Generation

**Files to Update**:
- `client/app/seller/label/page.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useLabelGeneration.ts`
```typescript
export const useShipmentForLabel = (awb: string) => {
  return useQuery({
    queryKey: ['shipments', awb, 'label-data'],
    queryFn: () => labelApi.getShipmentLabelData(awb),
    enabled: !!awb
  });
};

export const usePrintLabel = () => {
  return useMutation({
    mutationFn: (data: PrintLabelData) => labelApi.printLabel(data)
  });
};

export const useDownloadLabel = (awb: string) => {
  return useQuery({
    queryKey: ['labels', awb, 'download'],
    queryFn: () => labelApi.downloadLabel(awb),
    enabled: false // Manual trigger
  });
};
```

2. **Backend Requirements**:
```
GET    /api/shipments/:awb/label-data
       Response: { shipment: ShipmentDetails, courier: CourierInfo, barcode: string }
POST   /api/labels/print
       Body: { awbNumbers: string[], printerName?: string, copies: number }
GET    /api/labels/:awb/download
       Response: PDF blob
```

**Testing Checklist**:
- [ ] Can search for shipment by AWB
- [ ] Can view shipment details for label
- [ ] Can print single/multiple labels
- [ ] Can download label PDF
- [ ] Barcode displays correctly

---

### 1.6 Seller KYC Verification

**Files to Update**:
- `client/app/seller/kyc/page.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useKycVerification.ts`
```typescript
export const useVerifyPAN = () => {
  return useMutation({
    mutationFn: (panNumber: string) => kycApi.verifyPAN(panNumber)
  });
};

export const useVerifyGSTIN = () => {
  return useMutation({
    mutationFn: (gstin: string) => kycApi.verifyGSTIN(gstin)
  });
};

export const useLookupIFSC = () => {
  return useMutation({
    mutationFn: (ifsc: string) => kycApi.lookupIFSC(ifsc)
  });
};

export const useVerifyBankAccount = () => {
  return useMutation({
    mutationFn: (data: BankAccountData) => kycApi.verifyBankAccount(data)
  });
};

export const useSubmitKYC = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KYCSubmitData) => kycApi.submitKYC(data),
    onSuccess: () => queryClient.invalidateQueries(['kyc', 'status'])
  });
};

export const useKYCStatus = () => {
  return useQuery({
    queryKey: ['kyc', 'status'],
    queryFn: () => kycApi.getStatus()
  });
};
```

2. **Backend Requirements**:
```
POST   /api/kyc/verify-pan
       Body: { panNumber: string }
       Response: { valid: boolean, name: string }
POST   /api/kyc/verify-gstin
       Body: { gstin: string }
       Response: { valid: boolean, businessName: string, address: string }
GET    /api/kyc/ifsc/:code
       Response: { bank: string, branch: string, address: string }
POST   /api/kyc/verify-bank
       Body: { accountNumber: string, ifsc: string, accountHolderName: string }
       Response: { verified: boolean, nameMatch: boolean }
POST   /api/kyc/submit
       Body: { panDetails, gstDetails, bankDetails, documents }
GET    /api/kyc/status
       Response: { status: 'pending'|'verified'|'rejected', fields: {} }
```

**Testing Checklist**:
- [ ] PAN verification works
- [ ] GSTIN verification works
- [ ] IFSC lookup works
- [ ] Bank account verification works
- [ ] Can submit complete KYC
- [ ] Can view KYC status
- [ ] Error handling for invalid inputs

---

### 1.7 Seller Wallet Recharge

**Files to Update**:
- `client/app/seller/wallet/recharge/page.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useWalletRecharge.ts`
```typescript
export const useValidatePromo = () => {
  return useMutation({
    mutationFn: (promoCode: string) => walletApi.validatePromo(promoCode)
  });
};

export const useInitiateRecharge = () => {
  return useMutation({
    mutationFn: (data: RechargeData) => walletApi.initiateRecharge(data)
  });
};

export const usePaymentStatus = (paymentId: string) => {
  return useQuery({
    queryKey: ['payment', 'status', paymentId],
    queryFn: () => walletApi.getPaymentStatus(paymentId),
    enabled: !!paymentId,
    refetchInterval: (data) => data?.status === 'pending' ? 2000 : false
  });
};
```

2. **Backend Requirements**:
```
POST   /api/wallet/validate-promo
       Body: { promoCode: string, amount: number }
       Response: { valid: boolean, discount: number, finalAmount: number }
POST   /api/wallet/recharge
       Body: { amount: number, promoCode?: string, gateway: string }
       Response: { paymentId: string, gatewayUrl: string, orderId: string }
GET    /api/payment/status/:id
       Response: { status: 'pending'|'success'|'failed', amount: number, timestamp: string }
```

**Testing Checklist**:
- [ ] Can validate promo codes
- [ ] Can initiate recharge with payment gateway
- [ ] Can track payment status
- [ ] Wallet balance updates after successful payment
- [ ] Failed payments handled gracefully

---

## 🎯 PHASE 2: FINANCIAL & ANALYTICS (Week 3)

**Goal**: Enable accurate financial tracking and business intelligence
**Priority**: 🟡 HIGH
**Estimated Effort**: 40-50 hours

---

### 2.1 Admin Profit Tracking

**Files to Update**:
- `client/app/admin/profit/components/ProfitClient.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useAdminProfit.ts`
```typescript
export const useProfitData = (filters?: ProfitFilters) => {
  return useQuery({
    queryKey: ['admin', 'profit', 'data', filters],
    queryFn: () => profitApi.getProfitData(filters)
  });
};

export const useImportProfitData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => profitApi.importData(file),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'profit']);
    }
  });
};

export const useImportHistory = () => {
  return useQuery({
    queryKey: ['admin', 'profit', 'import-history'],
    queryFn: () => profitApi.getImportHistory()
  });
};

export const useExportProfitData = () => {
  return useMutation({
    mutationFn: (filters: ProfitFilters) => profitApi.exportData(filters)
  });
};
```

2. **Backend Requirements**:
```
GET    /api/admin/profit/data?sellerId=&dateFrom=&dateTo=&courier=
POST   /api/admin/profit/import (multipart/form-data)
GET    /api/admin/profit/import-history
GET    /api/admin/profit/export?filters=
```

---

### 2.2 Admin Financials Overview

**Files to Update**:
- `client/app/admin/financials/components/FinancialsClient.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useAdminFinancials.ts`
```typescript
export const useAdminFinancialsOverview = () => {
  return useQuery({
    queryKey: ['admin', 'financials', 'overview'],
    queryFn: () => financialsApi.getOverview()
  });
};

export const useAdminTransactions = (filters?: TransactionFilters) => {
  return useQuery({
    queryKey: ['admin', 'financials', 'transactions', filters],
    queryFn: () => financialsApi.getTransactions(filters)
  });
};
```

2. **Backend Requirements**:
```
GET    /api/admin/financials/overview
GET    /api/admin/financials/transactions?type=&dateFrom=&dateTo=
```

---

### 2.3 Admin NDR & Returns Management

**Files to Update**:
- `client/app/admin/ndr/components/NdrClient.tsx`
- `client/app/admin/returns/components/ReturnsClient.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useAdminNDR.ts`
```typescript
export const useAdminNDRList = (filters?: NDRFilters) => {
  return useQuery({
    queryKey: ['admin', 'ndr', 'list', filters],
    queryFn: () => ndrApi.getAdminNDRList(filters)
  });
};

export const useNDRFunnel = () => {
  return useQuery({
    queryKey: ['admin', 'ndr', 'funnel'],
    queryFn: () => ndrApi.getFunnel()
  });
};

export const useResolveReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ResolveReturnData) => returnsApi.resolveReturn(data),
    onSuccess: () => queryClient.invalidateQueries(['admin', 'returns'])
  });
};
```

2. **Backend Requirements**:
```
GET    /api/admin/ndr/list?status=&sellerId=&courier=
GET    /api/admin/ndr/funnel
GET    /api/admin/returns?status=&dateFrom=
PUT    /api/admin/returns/:id/resolve
```

---

### 2.4 Seller B2B Rates Calculator

**Files to Update**:
- `client/app/seller/rates/b2b/page.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useB2BRates.ts`
```typescript
export const useCalculateB2BRates = () => {
  return useMutation({
    mutationFn: (data: B2BRateRequest) => ratesApi.calculateB2BRates(data)
  });
};
```

2. **Backend Requirements**:
```
POST   /api/rates/b2b/calculate
       Body: { fromPincode, toPincode, weight, dimensions, quantity }
```

---

### 2.5 Seller Tracking

**Files to Update**:
- `client/app/seller/tracking/page.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useTracking.ts`
```typescript
export const useTrackShipment = (awb: string) => {
  return useQuery({
    queryKey: ['tracking', awb],
    queryFn: () => trackingApi.trackShipment(awb),
    enabled: !!awb
  });
};

export const useBulkTracking = () => {
  return useMutation({
    mutationFn: (awbs: string[]) => trackingApi.bulkTrack(awbs)
  });
};
```

2. **Backend Requirements**:
```
GET    /api/tracking/:awb
GET    /api/tracking/bulk?awbs[]=&awbs[]=
```

---

### 2.6 Seller COD Settings

**Files to Update**:
- `client/app/seller/cod/settings/page.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useCODSettings.ts`
```typescript
export const useCODPayoutSchedule = () => {
  return useQuery({
    queryKey: ['cod', 'payout-schedule'],
    queryFn: () => codApi.getPayoutSchedule()
  });
};

export const useUpdatePayoutSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PayoutScheduleData) => codApi.updatePayoutSchedule(data),
    onSuccess: () => queryClient.invalidateQueries(['cod'])
  });
};

export const useBankAccountDetails = () => {
  return useQuery({
    queryKey: ['settings', 'bank-account'],
    queryFn: () => settingsApi.getBankAccount()
  });
};
```

2. **Backend Requirements**:
```
GET    /api/cod/payout-schedule
PUT    /api/cod/payout-schedule
GET    /api/settings/bank-account
```

---

## 🎯 PHASE 3: INTELLIGENCE & OPTIMIZATION (Week 4)

**Goal**: Enable AI-driven insights and recommendations
**Priority**: 🟢 MEDIUM
**Estimated Effort**: 30-40 hours

---

### 3.1 Admin Analytics Dashboard

**Files to Update**:
- `client/app/admin/analytics/components/AnalyticsClient.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useAdminAnalytics.ts`
```typescript
export const useDeliveryPerformance = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['admin', 'analytics', 'delivery-performance', dateRange],
    queryFn: () => analyticsApi.getDeliveryPerformance(dateRange)
  });
};

export const useZoneDistribution = () => {
  return useQuery({
    queryKey: ['admin', 'analytics', 'zone-distribution'],
    queryFn: () => analyticsApi.getZoneDistribution()
  });
};
```

2. **Backend Requirements**:
```
GET    /api/admin/analytics/delivery-performance?from=&to=
GET    /api/admin/analytics/zone-distribution
```

---

### 3.2 Admin Intelligence/AI Insights

**Files to Update**:
- `client/app/admin/intelligence/components/IntelligenceClient.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useAdminIntelligence.ts`
```typescript
export const useAIPredictions = () => {
  return useQuery({
    queryKey: ['admin', 'intelligence', 'predictions'],
    queryFn: () => intelligenceApi.getPredictions()
  });
};

export const useAnomalyDetection = () => {
  return useQuery({
    queryKey: ['admin', 'intelligence', 'anomalies'],
    queryFn: () => intelligenceApi.getAnomalies(),
    refetchInterval: 60000 // Refresh every minute
  });
};

export const useAIInsights = () => {
  return useQuery({
    queryKey: ['admin', 'intelligence', 'insights'],
    queryFn: () => intelligenceApi.getInsights()
  });
};
```

2. **Backend Requirements**:
```
GET    /api/admin/intelligence/predictions
GET    /api/admin/intelligence/anomalies
GET    /api/admin/intelligence/insights
```

---

### 3.3 Admin Rate Card Management

**Files to Update**:
- `client/app/admin/ratecards/assign/components/AssignRatecardClient.tsx`
- `client/app/admin/ratecards/create/components/CreateRatecardClient.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useRateCardManagement.ts`
```typescript
export const useRateCardAssignments = () => {
  return useQuery({
    queryKey: ['admin', 'ratecards', 'assignments'],
    queryFn: () => ratecardsApi.getAssignments()
  });
};

export const useAssignRateCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignRateCardData) => ratecardsApi.assign(data),
    onSuccess: () => queryClient.invalidateQueries(['admin', 'ratecards'])
  });
};

export const useUnassignRateCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => ratecardsApi.unassign(assignmentId),
    onSuccess: () => queryClient.invalidateQueries(['admin', 'ratecards'])
  });
};

export const useAvailableCouriers = () => {
  return useQuery({
    queryKey: ['admin', 'ratecards', 'couriers'],
    queryFn: () => ratecardsApi.getAvailableCouriers()
  });
};
```

2. **Backend Requirements**:
```
GET    /api/admin/ratecards/assignments
POST   /api/admin/ratecards/assign
       Body: { rateCardId, sellerId, priority }
DELETE /api/admin/ratecards/unassign/:id
GET    /api/admin/ratecards/couriers
```

---

### 3.4 Shared Component: CourierRecommendation

**Files to Update**:
- `client/src/components/seller/CourierRecommendation.tsx`

**Implementation Steps**:

1. **Update Component to Use Existing Hook**
```typescript
// Remove getCourierRecommendations mock function
// Remove setTimeout simulation

// Use existing useSmartRateCalculator or create new hook:
const { data: recommendations, isLoading } = useSmartRateCalculator({
  fromPincode,
  toPincode,
  weight,
  dimensions
});

// Or create dedicated recommendation hook:
const { data: recommendations, isLoading } = useCourierRecommendations(orderData);
```

2. **Backend Requirements**:
```
// Option 1: Reuse existing smart rate calculator
POST   /api/rates/smart-calculate

// Option 2: Create dedicated recommendation endpoint
POST   /api/courier-recommendations
       Body: { orderData, preferences }
```

---

### 3.5 Shared Component: NotificationCenter

**Files to Update**:
- `client/src/components/shared/NotificationCenter.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useNotifications.ts`
```typescript
export const useNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications(),
    refetchInterval: 30000 // Poll every 30 seconds
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries(['notifications'])
  });
};

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries(['notifications'])
  });
};

// Optional: WebSocket for real-time notifications
export const useNotificationSocket = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io('/notifications');

    socket.on('new-notification', (notification) => {
      queryClient.setQueryData(['notifications'], (old: Notification[]) => [
        notification,
        ...old
      ]);
    });

    return () => socket.disconnect();
  }, []);
};
```

2. **Backend Requirements**:
```
GET    /api/notifications?page=&limit=&read=
POST   /api/notifications/:id/read
POST   /api/notifications/mark-all-read
WebSocket: /notifications (optional for real-time)
```

---

### 3.6 Shared Component: SellerHealthDashboard

**Files to Update**:
- `client/src/components/admin/SellerHealthDashboard.tsx`

**Implementation Steps**:

1. **Create API Hook** - `useSellerHealth.ts`
```typescript
export const useSellerHealth = (filters?: HealthFilters) => {
  return useQuery({
    queryKey: ['admin', 'seller-health', filters],
    queryFn: () => sellerHealthApi.getSellerHealth(filters)
  });
};
```

2. **Backend Requirements**:
```
GET    /api/admin/seller-health?status=&metric=
       Response: Array<{
         sellerId, companyName,
         metrics: { revenue, rtoRate, orderTrend },
         healthScore, status
       }>
```

---

## 🎯 PHASE 4: POLISH & CLEANUP (Week 5)

**Goal**: Remove all mock data and fallbacks, production hardening
**Priority**: 🟡 MEDIUM
**Estimated Effort**: 20-30 hours

---

### 4.1 Remove Mock Fallbacks from Dashboard Components

**Files to Update**:
- `client/src/components/seller/dashboard/CashFlowForecast.tsx`
- `client/src/components/seller/dashboard/CODSettlementTimeline.tsx`
- `client/src/components/seller/dashboard/RTOAnalytics.tsx`
- `client/src/components/seller/dashboard/ProfitabilityCard.tsx`

**Steps**:
1. Remove `const MOCK_DATA = ...` declarations
2. Remove `const data = apiData || MOCK_DATA` fallbacks
3. Replace with proper error boundaries
4. Add skeleton loaders for loading states
5. Add empty states for no data

---

### 4.2 Delete Mock Data Library

**Files to Delete**:
```
rm -rf client/src/lib/mockData/
```

**Before deleting, verify**:
- [ ] No components import from `lib/mockData/*`
- [ ] All tests use proper mocking libraries (MSW, vitest mocks)
- [ ] Demo mode in track page uses environment flag

---

### 4.3 Remove setTimeout Simulations

**Files to Update**:
- All files identified in audit with mock setTimeout calls

**Search & Replace**:
```bash
# Find all setTimeout used for mock simulations
grep -r "setTimeout.*mock" client/src/

# Remove or replace with real async operations
```

---

### 4.4 Environment Configuration

**Add to `.env.example`**:
```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# Feature Flags
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_ENABLE_DEMO_KEYWORDS=false
NEXT_PUBLIC_ENABLE_DEV_TOOLS=true

# Payment Gateway
NEXT_PUBLIC_RAZORPAY_KEY=your_key_here

# Analytics
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

---

### 4.5 Add Error Boundaries

**Create Global Error Boundary**:
```typescript
// client/src/components/errors/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  // Handle API errors, show user-friendly messages
  // Log errors to monitoring service
}
```

---

### 4.6 Update Tests

**For each component**:
1. Replace mock data imports with MSW handlers
2. Update tests to use real API contracts
3. Add integration tests for critical flows

---

## 📊 PROGRESS TRACKING

### Overall Progress

- [ ] **Phase 1: Critical Operations** (0/7 complete)
  - [ ] Admin Orders
  - [ ] Admin Sellers
  - [ ] Admin Billing
  - [ ] Weight Discrepancies
  - [ ] Label Generation
  - [ ] KYC Verification
  - [ ] Wallet Recharge

- [ ] **Phase 2: Financial & Analytics** (0/6 complete)
  - [ ] Admin Profit
  - [ ] Admin Financials
  - [ ] Admin NDR & Returns
  - [ ] B2B Rates
  - [ ] Tracking
  - [ ] COD Settings

- [ ] **Phase 3: Intelligence** (0/6 complete)
  - [ ] Admin Analytics
  - [ ] AI Intelligence
  - [ ] Rate Card Management
  - [ ] Courier Recommendations
  - [ ] Notification Center
  - [ ] Seller Health Dashboard

- [ ] **Phase 4: Cleanup** (0/6 complete)
  - [ ] Remove fallbacks
  - [ ] Delete mock library
  - [ ] Remove setTimeout
  - [ ] Environment config
  - [ ] Error boundaries
  - [ ] Update tests

---

## 🛠️ IMPLEMENTATION CHECKLIST (Per Feature)

For each feature, follow this checklist:

### Backend Setup
- [ ] Create API endpoint(s)
- [ ] Add request/response validation
- [ ] Add authentication/authorization
- [ ] Add error handling
- [ ] Add logging
- [ ] Write API tests

### Frontend Setup
- [ ] Create TypeScript types/interfaces
- [ ] Create API client methods
- [ ] Create React Query hooks
- [ ] Update query keys configuration
- [ ] Update component to use hooks
- [ ] Remove mock data
- [ ] Remove setTimeout simulations

### Testing
- [ ] Write unit tests for hooks
- [ ] Write integration tests
- [ ] Test loading states
- [ ] Test error states
- [ ] Test success states
- [ ] Test edge cases

### Documentation
- [ ] Update API documentation
- [ ] Update component documentation
- [ ] Add usage examples
- [ ] Update changelog

---

## 🚨 CRITICAL PATH DEPENDENCIES

### Must Complete First
1. Fix NDR endpoint mismatch (`/api/ndr/cases` vs `/ndr/events`)
2. Implement authentication for admin endpoints
3. Set up error logging infrastructure

### Parallel Work Streams

**Stream 1: Admin Panel** (Backend + Frontend Dev 1)
- Orders → Sellers → Billing → Profit

**Stream 2: Seller Operations** (Backend + Frontend Dev 2)
- Weight → Label → KYC → Wallet

**Stream 3: Analytics** (Backend + Frontend Dev 3)
- Admin Analytics → Intelligence → Rate Cards

---

## 📈 SUCCESS METRICS

### Per Phase
- **Phase 1**: Core shipping operations functional
  - Sellers can complete KYC
  - Sellers can create shipments and print labels
  - Sellers can recharge wallet
  - Admin can manage orders and sellers

- **Phase 2**: Financial visibility complete
  - Real-time profit tracking
  - Accurate wallet transactions
  - NDR/Returns management functional

- **Phase 3**: Intelligence enabled
  - AI recommendations working
  - Real-time notifications
  - Analytics dashboards live

- **Phase 4**: Production ready
  - Zero mock data in production build
  - All tests passing
  - Performance metrics met

### Overall Success Criteria
- [ ] 100% API integration (no mock data)
- [ ] < 500ms API response time (p95)
- [ ] < 1% error rate
- [ ] 100% test coverage for API hooks
- [ ] Zero production console errors

---

## 🔧 TOOLS & RESOURCES

### Development Tools
- **API Client**: Axios (already in use)
- **State Management**: React Query (already in use)
- **Type Safety**: TypeScript strict mode
- **API Testing**: Postman/Insomnia collections
- **Mocking**: MSW (Mock Service Worker)

### Monitoring & Debugging
- **API Monitoring**: Add request/response interceptors
- **Error Tracking**: Sentry or similar
- **Performance**: React Query DevTools
- **Network**: Browser DevTools Network tab

---

## 📝 NOTES

### Common Patterns

**API Hook Pattern**:
```typescript
export const useFeature = (params) => {
  return useQuery({
    queryKey: ['feature', params],
    queryFn: () => api.getFeature(params)
  });
};
```

**Mutation Pattern**:
```typescript
export const useUpdateFeature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.updateFeature(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['feature']);
    }
  });
};
```

**Error Handling Pattern**:
```typescript
const { data, error, isLoading } = useFeature();

if (isLoading) return <Skeleton />;
if (error) return <ErrorDisplay error={error} />;
if (!data) return <EmptyState />;
```

---

**End of Implementation Plan**

*Follow this plan systematically to achieve 100% frontend-backend integration. Update progress checkboxes as you complete each item.*
