# Frontend Authentication & Order Management System - Implementation Plan

## 🎯 Goal
Create a 100% working authentication and order management system with excellent UX, proper error handling, and clean API integration.

## 📋 Current State Summary

### Authentication Issues
- ❌ Auth initialization disabled - no session restoration on page load
- ❌ AuthGuard completely disabled - no route protection
- ❌ `refreshUser` function missing from context (type mismatch)
- ❌ Token refresh depends on user state (which is never set)
- ⚠️ Duplicate password utilities in two locations

### Order Management Issues
- ❌ OrderProvider NOT wrapped in any layout - will crash if used
- ❌ List pages use MOCK_ORDERS instead of real API
- ❌ No React Query hooks for orders (commented out)
- ❌ Quick order modal disabled
- ⚠️ No pagination state management
- ⚠️ No field-level form validation

### API Infrastructure
- ⚠️ Mixed patterns (class-based vs functional)
- ⚠️ Manual CSRF headers in some files (redundant)
- ⚠️ Type duplication between hooks and /src/types/

---

## 🚀 Implementation Phases

### **PHASE 1: Authentication System Restoration** (Priority: CRITICAL)

#### 1.1 Add Missing `refreshUser` Function
**File:** `client/src/features/auth/context/AuthContext.tsx`

**Action:** Add after `logout` function (line 156):
```typescript
const refreshUser = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);
    const userData = await authApi.getMe();
    setUser(userData);
  } catch (err) {
    const normalizedErr = normalizeError(err as any);
    setError(normalizedErr);
    setUser(null);
  } finally {
    setIsLoading(false);
  }
}, []);
```

**And add to context value (around line 323):**
```typescript
refreshUser, // Add this line
```

---

#### 1.2 Enable Authentication Initialization
**File:** `client/src/features/auth/context/AuthContext.tsx`

**Action:** Replace `initializeAuth` function (lines 44-51):
```typescript
const initializeAuth = useCallback(async () => {
  if (initializeRef.current) return;
  initializeRef.current = true;

  try {
    const userData = await authApi.getMe();
    setUser(userData);
    setupTokenRefresh();
  } catch (err) {
    // User not authenticated - expected for public pages
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth] No active session');
    }
  } finally {
    setIsInitialized(true);
  }
}, [setupTokenRefresh]);
```

**Impact:** Session restoration on page load, authenticated users stay logged in.

---

#### 1.3 Fix Token Refresh
**File:** `client/src/features/auth/context/AuthContext.tsx`

**Action:** Update `setupTokenRefresh` (lines 57-75):
```typescript
const setupTokenRefresh = useCallback(() => {
  if (refreshIntervalRef.current) {
    clearInterval(refreshIntervalRef.current);
  }

  refreshIntervalRef.current = setInterval(async () => {
    try {
      await authApi.refreshToken();
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (err) {
      setUser(null);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
  }, 14 * 60 * 1000);
}, []);
```

**Impact:** Token refresh works independently of user state.

---

#### 1.4 Restore AuthGuard with Selective Protection
**File:** `client/src/features/auth/components/AuthGuard.tsx`

**Action:** Replace entire file:
```typescript
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import type { User } from '@/src/types/auth';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: User['role'];
  redirectTo?: string;
  loadingFallback?: ReactNode;
}

export function AuthGuard({
  children,
  requiredRole,
  redirectTo = '/login',
  loadingFallback,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized } = useAuth();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;

    // Dev mode: Allow /seller/* and /admin/* without auth
    const isDevelopmentRoute =
      pathname?.startsWith('/seller') ||
      pathname?.startsWith('/admin');

    if (isDevelopmentRoute) {
      setShouldRender(true);
      return;
    }

    // All other routes require authentication
    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Check role-based access
    if (requiredRole && user?.role !== requiredRole) {
      router.push('/unauthorized');
      return;
    }

    setShouldRender(true);
  }, [isInitialized, isAuthenticated, user, requiredRole, redirectTo, router, pathname]);

  if (!isInitialized) {
    return loadingFallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!shouldRender) return null;
  return <>{children}</>;
}

export default AuthGuard;
```

**Impact:**
- All pages protected EXCEPT /seller/* and /admin/* (dev mode)
- Smooth loading experience
- No flash of unauthorized content

---

#### 1.5 Clean Up Duplicate Password Utilities
**Files:**
- DELETE: `client/src/utils/password.ts`
- KEEP: `client/src/shared/utils/password.ts`

**Action:** Search and update all imports from old path to new path.

---

### **PHASE 2: Order Management Integration** (Priority: CRITICAL)

#### 2.1 Create React Query Hooks for Orders
**File:** `client/src/core/api/hooks/useOrders.ts` (NEW FILE)

**Action:** Create file with complete implementation:
```typescript
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions
} from '@tanstack/react-query';
import { orderApi } from '../order.api';
import { handleApiError, showSuccessToast } from '@/lib/error-handler';
import { ApiError } from '../client';
import type {
  Order,
  CreateOrderRequest,
  OrderListParams,
  GetOrdersResponse,
  GetOrderResponse
} from '@/src/types/order';

export const useOrdersList = (
  params?: OrderListParams,
  options?: UseQueryOptions<GetOrdersResponse, ApiError>
) => {
  return useQuery<GetOrdersResponse, ApiError>({
    queryKey: ['orders', params],
    queryFn: async () => await orderApi.getOrders(params),
    staleTime: 30000,
    ...options,
  });
};

export const useOrder = (
  orderId: string,
  options?: UseQueryOptions<GetOrderResponse, ApiError>
) => {
  return useQuery<GetOrderResponse, ApiError>({
    queryKey: ['orders', orderId],
    queryFn: async () => await orderApi.getOrder(orderId),
    enabled: !!orderId,
    staleTime: 60000,
    ...options,
  });
};

export const useCreateOrder = (
  options?: UseMutationOptions<Order, ApiError, CreateOrderRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation<Order, ApiError, CreateOrderRequest>({
    mutationFn: async (data) => {
      const response = await orderApi.createOrder(data);
      return response.data.order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showSuccessToast(`Order ${order.orderNumber} created successfully`);
    },
    onError: (error) => {
      handleApiError(error, 'Create Order Failed');
    },
    ...options,
  });
};

export const useUpdateOrder = (
  options?: UseMutationOptions<
    Order,
    ApiError,
    { orderId: string; data: Partial<CreateOrderRequest> }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation<
    Order,
    ApiError,
    { orderId: string; data: Partial<CreateOrderRequest> }
  >({
    mutationFn: async ({ orderId, data }) => {
      const response = await orderApi.updateOrder(orderId, data);
      return response.data.order;
    },
    onSuccess: (order, variables) => {
      queryClient.setQueryData(['orders', variables.orderId], (old: any) => ({
        ...old,
        data: { order }
      }));
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showSuccessToast('Order updated successfully');
    },
    onError: (error) => {
      handleApiError(error, 'Update Order Failed');
    },
    ...options,
  });
};

export const useDeleteOrder = (
  options?: UseMutationOptions<void, ApiError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (orderId) => {
      await orderApi.deleteOrder(orderId);
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.removeQueries({ queryKey: ['orders', orderId] });
      showSuccessToast('Order deleted successfully');
    },
    onError: (error) => {
      handleApiError(error, 'Delete Order Failed');
    },
    ...options,
  });
};
```

**Impact:** Modern React Query approach with caching and optimistic updates.

---

#### 2.2 Export Order Hooks
**File:** `client/src/core/api/hooks/index.ts`

**Action:** Uncomment line 13:
```typescript
export * from './useOrders';
```

---

#### 2.3 Add OrderProvider to Seller Layout
**File:** `client/app/seller/layout.tsx`

**Action:** Wrap children with OrderProvider:
```typescript
import { OrderProvider } from '@/src/features/orders/context/OrderContext';

export default function SellerLayout({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <OrderProvider>
          {/* existing layout code */}
          {children}
        </OrderProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
```

---

#### 2.4 Replace Mock Data in Orders List
**File:** `client/app/seller/orders/page.tsx`

**Action:**
1. Remove `MOCK_ORDERS` import
2. Add `useOrdersList` hook:
```typescript
import { useOrdersList } from '@/src/core/api/hooks/useOrders';

const [page, setPage] = useState(1);
const [limit] = useState(20);

const { data, isLoading, error, refetch } = useOrdersList({
  page,
  limit,
  search: search || undefined,
  status: activeTab !== 'all' ? activeTab : undefined,
});

const orders = data?.data.orders || [];
const pagination = data?.data.pagination;
```

3. Add loading state:
```typescript
if (isLoading && !orders.length) {
  return <LoadingSkeleton />;
}
```

4. Add error state:
```typescript
if (error) {
  return <ErrorState onRetry={refetch} />;
}
```

---

#### 2.5 Update Create Order Page
**File:** `client/app/seller/orders/create/page.tsx`

**Action:** Replace context-based createOrder with hook:
```typescript
import { useCreateOrder } from '@/src/core/api/hooks/useOrders';

const createOrder = useCreateOrder();

const handleSubmit = async () => {
  try {
    const order = await createOrder.mutateAsync(payload);
    toast.success(`Order ${order.orderNumber} created!`);
    router.push('/seller/orders');
  } catch (err) {
    toast.error(err.message || 'Failed to create order');
  }
};

const isSubmitting = createOrder.isPending;
```

---

#### 2.6 Enable Quick Order Modal
**File:** `client/components/seller/QuickOrderModal.tsx`

**Action:**
1. Add hook:
```typescript
import { useCreateOrder } from '@/src/core/api/hooks/useOrders';

const createOrder = useCreateOrder({
  onSuccess: (order) => {
    addToast(`Order ${order.orderNumber} created!`, 'success');
    onClose();
  }
});
```

2. Replace placeholder submit with real API call:
```typescript
const handleSubmit = async () => {
  // Validation...

  await createOrder.mutateAsync({
    customerInfo: { /* ... */ },
    products: [{ /* ... */ }],
    paymentMethod: formData.paymentMode,
    warehouseId: formData.warehouseId,
  });
};
```

---

### **PHASE 3: API Standardization** (Priority: HIGH)

#### 3.1 Convert companyApi to Class-Based
**File:** `client/src/core/api/companyApi.ts`

**Action:**
1. Convert all functions to class methods
2. Remove manual CSRF headers
3. Export singleton:
```typescript
class CompanyApiService {
  async createCompany(data) { /* ... */ }
  async getCompany(id) { /* ... */ }
  // ... all methods
}

export const companyApi = new CompanyApiService();
```

---

#### 3.2 Convert kycApi to Class-Based
**File:** `client/src/core/api/kycApi.ts`

**Action:** Same pattern as companyApi - convert to class, remove manual CSRF.

---

#### 3.3 Consolidate Types
**Action:** Move any duplicate types from hooks to `/client/src/types/` directory.

---

### **PHASE 4: UX & Error Handling** (Priority: MEDIUM)

#### 4.1 Add Loading Skeletons
**File:** `client/app/seller/orders/page.tsx`

**Action:** Replace loading spinner with skeleton UI showing shimmer cards.

---

#### 4.2 Add Field-Level Validation
**File:** `client/app/seller/orders/create/page.tsx`

**Action:**
1. Add `fieldErrors` state
2. Update validation to set specific field errors
3. Show error messages below each field
4. Highlight invalid fields with red border

---

#### 4.3 Enhance Error Messages
**All mutation hooks**

**Action:** Ensure all errors show clear, actionable messages with retry options.

---

## 📁 Critical Files to Modify

### Must Modify
1. `client/src/features/auth/context/AuthContext.tsx` - Auth initialization, refreshUser, token refresh
2. `client/src/features/auth/components/AuthGuard.tsx` - Route protection with dev mode exceptions
3. `client/src/core/api/hooks/useOrders.ts` - NEW FILE - React Query hooks
4. `client/app/seller/layout.tsx` - Add OrderProvider wrapper
5. `client/app/seller/orders/page.tsx` - Replace mock data with API

### Should Modify
6. `client/app/seller/orders/create/page.tsx` - Use React Query hook
7. `client/components/seller/QuickOrderModal.tsx` - Enable functionality
8. `client/src/core/api/companyApi.ts` - Standardize to class
9. `client/src/core/api/kycApi.ts` - Standardize to class
10. `client/src/core/api/hooks/index.ts` - Uncomment useOrders export

### Clean Up
11. `client/src/utils/password.ts` - DELETE (duplicate)

---

## ✅ Testing Checklist

### Authentication
- [ ] User can register and login
- [ ] Session persists across page refresh
- [ ] Token auto-refreshes every 14 minutes
- [ ] User can logout
- [ ] AuthGuard redirects unauthenticated users (except /seller, /admin)
- [ ] /seller and /admin accessible without auth

### Orders
- [ ] Orders list loads real data
- [ ] Search and filters work
- [ ] Pagination works
- [ ] Create order form submits successfully
- [ ] Quick order modal creates orders
- [ ] Order list auto-refreshes after creation
- [ ] Loading and error states display properly

### UX
- [ ] Loading skeletons show during fetch
- [ ] Field errors highlight invalid inputs
- [ ] Success toasts appear after operations
- [ ] Error messages are clear
- [ ] Failed requests retry automatically

---

## 🎯 Success Criteria

1. ✅ User can login and session persists across refresh
2. ✅ All pages protected except /seller/* and /admin/* routes
3. ✅ Orders list shows real data from API
4. ✅ Order creation works from both create page and quick modal
5. ✅ All forms have field-level validation
6. ✅ Error messages are clear and actionable
7. ✅ Loading states prevent user confusion
8. ✅ API follows consistent class-based pattern

---

## ⚠️ Important Notes

- **Dev Mode Exception:** /seller/* and /admin/* routes remain unguarded for development
- **React Query + Context:** We use BOTH - React Query for server state, Context for UI state
- **No Manual CSRF:** Remove all manual CSRF headers - interceptor handles it
- **Types First:** Always import types from `/src/types/` directory
- **Error Handling:** Every mutation must have onSuccess and onError handlers

---

## 📊 Estimated Timeline

- **Phase 1 (Auth):** 2-3 days
- **Phase 2 (Orders):** 3-4 days
- **Phase 3 (API Standardization):** 1-2 days
- **Phase 4 (UX):** 2-3 days
- **Testing:** 2 days

**Total:** 10-14 days

---

## 🚦 Implementation Order

1. **Start with Phase 1.1-1.3** (Auth core fixes)
2. **Then Phase 1.4** (AuthGuard)
3. **Then Phase 2.1-2.3** (Order hooks setup)
4. **Then Phase 2.4-2.6** (Order UI)
5. **Parallel: Phase 3** (API standardization)
6. **Final: Phase 4** (Polish and UX)
