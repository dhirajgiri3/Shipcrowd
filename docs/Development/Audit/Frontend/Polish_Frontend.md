# Phase 8: Technical Debt & Client Refactor - Comprehensive Implementation Plan

## Executive Summary

This plan addresses **critical technical debt**, **architectural inconsistencies**, and **security/performance issues** discovered through exhaustive analysis of the ShipCrowd client codebase. Unlike the original Phase 8 plan (focused narrowly on debouncing and error boundaries), this revised plan tackles **systemic issues** that threaten long-term maintainability, security, and developer productivity.

### Scope
- **466 TypeScript files** analyzed
- **27 critical/high severity issues** identified
- **Zero new features** - 100% quality improvement
- **Production blockers**: Mock data in production, auth bypass risks, type safety violations

---

## Critical Findings Summary

### 🔴 CRITICAL (7 issues)
1. **PROD-001**: Mock data hardcoded in OrdersClient.tsx (production blocker)
2. **SEC-001**: Dev auth bypass could leak to production
3. **SEC-002**: Token refresh circuit breaker persists across sessions
4. **ARCH-001**: 264 empty directories in `/src/domains/` (0 bytes, abandoned DDD architecture)
5. **STATE-001**: Duplicate order state (OrderContext vs useOrders hooks)
6. **TYPE-001**: 31 instances of TypeScript `any` (type safety compromised)
7. **API-001**: No retry logic for network errors (mobile UX failure)

### 🔴 HIGH (6 issues)
1. **PERF-001**: Missing React.memo on heavy components (Sidebar, DataTable)
2. **PERF-002**: 15 files use `index` as React key
3. **API-002**: Inconsistent error handling (some hooks toast, others don't)
4. **API-003**: No timeout/cancellation for long-running queries
5. **AUTH-001**: No proactive session expiration warning (work loss)
6. **CODE-001**: @ts-ignore in DataTable.tsx

---

## Phase 8 Goals

### Primary Objectives
1. **Eliminate Production Blockers**: Remove mock data, fix auth vulnerabilities
2. **Architectural Alignment**: Remove dead code (264 empty dirs), consolidate patterns
3. **Type Safety**: Eliminate all `any` types and type suppressions
4. **Performance**: Memoization, debouncing, key optimization
5. **API Reliability**: Retry logic, timeouts, error standardization
6. **Developer Experience**: Clear architecture, no confusion about patterns

### Non-Goals
- ❌ New features
- ❌ Major refactoring beyond alignment fixes
- ❌ Backend changes (noted for future phases)
- ❌ Design system changes

---

## Principles

### Alignment Philosophy
**Definition**: Alignment means conceptual, structural, and behavioral consistency across the entire codebase.

**Rules**:
1. **One Pattern Per Concern**: Authentication logic follows ONE pattern, not three
2. **No Abandoned Code**: Delete or complete, never leave scaffolding
3. **Explicit Conventions**: Document decisions (where components go, when to use context)
4. **Type Safety First**: No `any`, no `@ts-ignore` without exception comments
5. **Security by Default**: All auth/validation code reviewed for edge cases

### Safe Refactoring Strategy
1. **No breaking changes**: All refactors are internal
2. **Feature flags**: Use for risky changes (if needed)
3. **Incremental**: Complete one category before moving to next
4. **Verification**: Test after each category completed
5. **Rollback plan**: Git tags at each milestone

---

## Implementation Plan

## CATEGORY 1: Production Blockers (P0 - DO FIRST)

**Effort**: 4 hours
**Risk**: HIGH (production impacts)
**Dependencies**: None

### Task 1.1: Remove Mock Data from OrdersClient
**File**: `client/app/seller/orders/components/OrdersClient.tsx`

**Current State** (lines 71-118):
```typescript
const MOCK_ORDERS_DATA = useMemo(() => {
  return Array.from({ length: 45 }).map((_, i) => { /* 45 fake orders */ });
}, []);
```

**Action**:
```typescript
// REMOVE lines 71-118 (mock data generation)
// REPLACE line 128 with:
const { data, isLoading, error, refetch } = useOrdersList({
  page: currentPage,
  limit: ordersPerPage,
  status: filterStatus,
  search: searchQuery,
});

// Update component logic to use `data` instead of `MOCK_ORDERS_DATA`
```

**Verification**:
1. Load `/seller/orders` in dev
2. Check Network tab - should see real API call to `/orders`
3. Verify filters, pagination, search work with real data
4. Check error states (disconnect network)

---

### Task 1.2: Fix Auth Bypass Security Risk
**File**: `client/src/features/auth/components/AuthGuard.tsx`

**Current Issue** (lines 43-55):
```typescript
const isDevBypass =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

if (isDevBypass) {
  setShouldRender(true); // ⚠️ Could bypass in prod if env var set wrong
  return;
}
```

**Action**:
```typescript
// ADD runtime hostname check (lines 44-53):
const isDevBypass =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

if (isDevBypass) {
  // SAFETY: Double-check hostname to prevent prod bypass
  if (typeof window !== 'undefined' &&
      !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    console.error('[AuthGuard] SECURITY: Dev bypass attempted on non-localhost domain');
    throw new Error('Development auth bypass is only allowed on localhost');
  }

  console.warn('[AuthGuard] ⚠️ DEV MODE: Auth bypass enabled (localhost only)');
  setShouldRender(true);
  return;
}
```

**Verification**:
1. Test auth bypass on localhost with env var - should work
2. Test with `window.location.hostname = 'example.com'` (simulate prod) - should throw error
3. Check that bypass NEVER works in production build (`NODE_ENV=production`)

---

### Task 1.3: Fix Token Refresh Circuit Breaker Persistence
**File**: `client/src/core/api/client.ts`

**Current Issue** (lines 84-122):
- Circuit breaker state persists across login/logout
- User gets locked out after failed refresh, even after re-login

**Action**:
```typescript
// ADD to AuthContext.tsx logout function (line ~250):
const logout = useCallback(async () => {
  try {
    await authApi.logout();
  } finally {
    // CRITICAL: Reset circuit breaker on logout
    if (typeof window !== 'undefined' && (window as any).resetAuthState) {
      (window as any).resetAuthState();
    }

    setUser(null);
    setIsAuthenticated(false);
    // ... existing logout logic
  }
}, []);

// ENSURE client.ts resetAuthState is called on cross-tab logout (line 69)
// It's already there, verify it works
```

**Verification**:
1. Simulate token refresh failure (backend returns 401)
2. User sees circuit breaker message
3. User logs out
4. User logs back in
5. Verify circuit breaker is reset (new token refresh should be attempted)

---

## CATEGORY 2: Architectural Cleanup (P0)

**Effort**: 2 hours
**Risk**: LOW (only deleting unused code)
**Dependencies**: Category 1 complete

### Task 2.1: Remove Abandoned DDD Architecture
**Location**: `client/src/domains/`

**Issue**: 264 empty directories (0 bytes), completely unused

**Action**:
```bash
# Delete entire domains folder
rm -rf client/src/domains

# Update any references (unlikely, but check):
# Search for imports from '@/src/domains' - should be 0 results
grep -r "from '@/src/domains" client/src
grep -r 'from "@/src/domains' client/src
```

**Verification**:
1. `npm run build` - should succeed
2. Search codebase for `domains` imports - 0 results
3. Check git diff - 264 directories removed

---

### Task 2.2: Remove Empty Scaffolding
**Locations**:
- `client/src/infrastructure/` (empty)
- `client/src/shared/charts/` (3 empty subdirs)
- `client/src/shared/design/` (2 empty subdirs)
- `client/src/shared/ui/data-table/` (empty)
- `client/src/shared/utils/array/`, `/format/`, `/string/`, `/validation/` (all empty)

**Action**:
```bash
# Remove empty infrastructure folder
rm -rf client/src/infrastructure

# Remove empty shared subfolders
rm -rf client/src/shared/charts
rm -rf client/src/shared/design
rm -rf client/src/shared/ui
rm -rf client/src/shared/utils/array
rm -rf client/src/shared/utils/format
rm -rf client/src/shared/utils/string
rm -rf client/src/shared/utils/validation

# Keep: client/src/shared/configs/, /constants/, /types/, /utils/index.ts
```

**Verification**:
1. `npm run build` - should succeed
2. No broken imports

---

### Task 2.3: Consolidate Utils
**Problem**: Utils split across `/src/lib/utils.ts` and `/src/shared/utils/index.ts` (re-exports)

**Action**:
```typescript
// 1. Keep /src/lib/utils.ts as single source of truth (it has 242 lines of actual code)

// 2. DELETE /src/shared/utils/index.ts (it just re-exports from lib)

// 3. Update all imports:
// BEFORE: import { cn } from '@/src/shared/utils';
// AFTER:  import { cn } from '@/src/lib/utils';

// Run find-and-replace:
// Search:  @/src/shared/utils
// Replace: @/src/lib/utils
```

**Files to Update**: Run grep to find all:
```bash
grep -r "@/src/shared/utils" client/src --include="*.ts" --include="*.tsx"
```

**Verification**:
1. `npm run build` - should succeed
2. No imports from `/src/shared/utils`

---

## CATEGORY 3: Type Safety (P0)

**Effort**: 6 hours
**Risk**: MEDIUM (requires careful typing)
**Dependencies**: Category 2 complete

### Task 3.1: Eliminate TypeScript `any` (31 occurrences)
**Strategy**: Replace with proper types or use type parameters

**Priority Files**:

#### 3.1.1: CreateOrderClient.tsx
**Location**: Line 124

```typescript
// BEFORE:
const handleInputChange = (field: string, value: any) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
};

// AFTER:
type OrderFormField = keyof OrderFormData;

const handleInputChange = <K extends OrderFormField>(
  field: K,
  value: OrderFormData[K]
) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
};
```

#### 3.1.2: client.ts (API client)
**Locations**: Multiple (check lines with `originalRequest as any`)

```typescript
// BEFORE:
const retryCount = (originalRequest as any).__retryCount || 0;

// AFTER:
interface RetryableAxiosRequestConfig extends AxiosRequestConfig {
  __retryCount?: number;
}

const retryCount = (originalRequest as RetryableAxiosRequestConfig).__retryCount || 0;
```

**Other Files**: Search and fix:
```bash
# Find all `any` usages:
grep -n ": any" client/src --include="*.ts" --include="*.tsx" -r

# Also search for `any[]`, `any>`, and `as any`:
grep -n "any\[\]" client/src --include="*.ts" --include="*.tsx" -r
grep -n "as any" client/src --include="*.ts" --include="*.tsx" -r
```

**Verification**:
1. Run `npx tsc --noEmit` - should show 0 errors
2. Check that replaced types catch actual errors (add test case)

---

### Task 3.2: Remove @ts-ignore
**File**: `client/components/ui/data/DataTable.tsx`

**Current Issue** (lines 50-53):
```typescript
//@ts-ignore
const aValue = a[sortConfig.key];
//@ts-ignore
const bValue = b[sortConfig.key];
```

**Action**:
```typescript
// REPLACE with proper typing:
const aValue = a[sortConfig.key as keyof T];
const bValue = b[sortConfig.key as keyof T];

// OR better: constrain sortConfig.key at component level
interface DataTableProps<T> {
  data: T[];
  sortConfig: {
    key: keyof T; // ✅ Type-safe key
    direction: 'asc' | 'desc';
  };
}
```

**Verification**:
1. Sorting still works in DataTable
2. TypeScript error gone
3. No runtime errors

---

## CATEGORY 4: State Management Alignment (P0)

**Effort**: 3 hours
**Risk**: MEDIUM (affects API usage patterns)
**Dependencies**: Category 3 complete

### Task 4.1: Deprecate OrderContext
**Problem**: Duplicate state - `OrderContext.tsx` (manual state) vs `useOrders.ts` (React Query)

**Strategy**: Migrate to React Query only

**Step 1: Identify OrderContext consumers**
```bash
grep -r "OrderContext\|useOrderContext" client --include="*.ts" --include="*.tsx"
```

**Step 2: Replace OrderContext with useOrders hook**
```typescript
// BEFORE (using OrderContext):
const { orders, createOrder, isLoading } = useOrderContext();

// AFTER (using React Query hook):
const { data: orders, isLoading } = useOrdersList();
const createMutation = useCreateOrder();

// For create:
createMutation.mutate(orderData, {
  onSuccess: () => {
    toast.success('Order created');
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.list() });
  },
});
```

**Step 3: Delete OrderContext files**
```bash
# After all consumers migrated:
rm client/src/features/orders/context/OrderContext.tsx
rm client/src/features/orders/hooks/useOrders.ts # (if it was the context wrapper)
```

**Verification**:
1. All order operations still work (list, create, update)
2. No imports from `OrderContext`
3. React Query cache handles state correctly

---

### Task 4.2: Consolidate Hook Patterns
**Problem**: Some hooks handle errors automatically, others don't

**Decision**: **ALL hooks delegate error handling to consumers** (consistency)

**Action**:
```typescript
// REMOVE automatic error handling from mutation hooks:
// BEFORE (in useCreateOrder):
export const useCreateOrder = () => {
  return useMutation({
    mutationFn: orderApi.createOrder,
    onError: (error) => {
      handleApiError(error, 'Create Order Failed'); // ❌ Remove this
    },
  });
};

// AFTER:
export const useCreateOrder = () => {
  return useMutation({
    mutationFn: orderApi.createOrder,
    // No onError - consumer handles it
  });
};

// CONSUMER adds error handling:
const createMutation = useCreateOrder();
createMutation.mutate(data, {
  onError: (error) => toast.error(error.message),
  onSuccess: () => toast.success('Order created'),
});
```

**Files to Update**: All hooks in `client/src/core/api/hooks/`

**Verification**:
1. Errors still shown to users (via consumer logic)
2. No duplicate error toasts
3. Consistent pattern across all hooks

---

## CATEGORY 5: Performance Optimization (P1)

**Effort**: 4 hours
**Risk**: LOW (additive changes)
**Dependencies**: None (can run parallel with other categories)

### Task 5.1: Add React.memo to Heavy Components

**Files**:
1. `client/components/seller/Sidebar.tsx`
2. `client/components/ui/data/DataTable.tsx`
3. `client/components/seller/OrderDetailsPanel.tsx`

**Action**:
```typescript
// BEFORE:
export const Sidebar = () => { /* ... */ };

// AFTER:
export const Sidebar = React.memo(() => { /* ... */ });

// OR with comparison function if needed:
export const DataTable = React.memo(<T,>(props: DataTableProps<T>) => {
  /* ... */
}, (prevProps, nextProps) => {
  // Custom comparison for complex props
  return prevProps.data === nextProps.data &&
         prevProps.sortConfig === nextProps.sortConfig;
});
```

**Verification**:
1. Use React DevTools Profiler
2. Measure re-renders before/after
3. Verify sidebar doesn't re-render on order page interactions

---

### Task 5.2: Add Debouncing to Search Inputs
**Files** (from original plan):
1. `src/features/analytics/components/MetricSelector.tsx`
2. `src/features/returns/components/ReturnsTable.tsx`
3. `src/features/ndr/components/NDRCasesTable.tsx`
4. `src/features/disputes/components/WeightDisputesTable.tsx`

**Hook**: `client/src/hooks/useDebouncedValue.ts` (already exists)

**Action**:
```typescript
// BEFORE:
const [searchQuery, setSearchQuery] = useState('');
// API call triggered immediately

// AFTER:
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebouncedValue(searchQuery, 300); // 300ms delay

// Use debouncedSearch in API call:
const { data } = useOrdersList({ search: debouncedSearch });
```

**Verification**:
1. Type fast in search input
2. Check Network tab - only 1 API call after 300ms
3. Verify results load correctly

---

### Task 5.3: Fix React Keys (15 files)
**Problem**: Using `index` as key (causes wrong items updated)

**Strategy**: Use stable ID from data

**Example File**: `src/features/analytics/components/SLADashboard.tsx`

```typescript
// BEFORE:
{metrics.map((metric, index) => (
  <div key={index}>{metric.name}</div>
))}

// AFTER:
{metrics.map((metric) => (
  <div key={metric.id || metric.name}>{metric.name}</div>
))}

// If no ID exists, create one:
const metricsWithIds = useMemo(() =>
  metrics.map((m, i) => ({ ...m, _key: m.id || `metric-${i}` })),
  [metrics]
);

{metricsWithIds.map((metric) => (
  <div key={metric._key}>{metric.name}</div>
))}
```

**Files to Fix**: Run grep to find all:
```bash
grep -n "key={i\|key={index" client/src --include="*.tsx" -r
```

**Verification**:
1. Re-order list items - verify correct items update
2. Add/remove items - no strange behavior

---

## CATEGORY 6: API Reliability (P1)

**Effort**: 3 hours
**Risk**: MEDIUM (changes error handling)
**Dependencies**: Category 4 complete (hooks aligned)

### Task 6.1: Add Network Error Retry
**File**: `client/src/core/api/client.ts`

**Current Issue**: Only retries 5xx errors, not network errors

**Action** (add to response interceptor, around line 478):
```typescript
// EXISTING CODE (line 471-478):
if (error.response?.status && error.response.status >= 500) {
  const retryCount = (originalRequest as RetryableAxiosRequestConfig).__retryCount || 0;
  if (retryCount < 2) {
    // ... retry logic
  }
}

// ADD NEW: Network error retry (after the above block):
if (error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.message === 'Network Error') {

  const retryCount = (originalRequest as RetryableAxiosRequestConfig).__retryCount || 0;

  if (retryCount < 3) { // More retries for network issues
    (originalRequest as RetryableAxiosRequestConfig).__retryCount = retryCount + 1;

    // Exponential backoff
    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s

    console.log(`[API] Network error - Retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);

    await new Promise(resolve => setTimeout(resolve, delay));
    return client(originalRequest);
  }

  console.error('[API] Network error - Max retries exceeded');
}
```

**Verification**:
1. Simulate network error (disconnect WiFi during request)
2. Check console - should see retry attempts
3. After 3 retries, error shown to user

---

### Task 6.2: Add Request Timeout Configuration
**File**: `client/src/core/api/client.ts`

**Action**:
```typescript
// ADD timeout config per request type:
const TIMEOUT_CONFIG = {
  default: 30000, // 30s
  analytics: 60000, // 1min (large queries)
  export: 120000, // 2min (bulk exports)
  upload: 180000, // 3min (file uploads)
};

// UPDATE client creation (line ~197):
const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: TIMEOUT_CONFIG.default,
  // ...
});

// ALLOW per-request override:
// In API functions:
export const exportOrders = (params: ExportParams) => {
  return client.get('/orders/export', {
    params,
    timeout: TIMEOUT_CONFIG.export, // Override timeout
  });
};
```

**Verification**:
1. Test long-running export request
2. Verify timeout doesn't fire prematurely
3. Test that default timeout still applies to normal requests

---

### Task 6.3: Improve Cache Invalidation
**File**: `client/src/core/api/cacheConfig.ts`

**Problem**: Missing cross-domain invalidations

**Action**:
```typescript
// UPDATE INVALIDATION_PATTERNS (around line 20):
export const INVALIDATION_PATTERNS = {
  ORDER_MUTATIONS: {
    UPDATE: () => [
      { queryKey: queryKeys.orders.list() },
      { queryKey: queryKeys.shipments.list() },
      { queryKey: queryKeys.analytics.orders() }, // ✅ ADD
      { queryKey: queryKeys.wallet.balance() },   // ✅ ADD (if order affects wallet)
    ],
    CREATE: () => [
      { queryKey: queryKeys.orders.list() },
      { queryKey: queryKeys.analytics.orders() }, // ✅ ADD
    ],
  },

  SHIPMENT_MUTATIONS: {
    UPDATE: () => [
      { queryKey: queryKeys.shipments.list() },
      { queryKey: queryKeys.ndr.cases() },        // ✅ ADD
      { queryKey: queryKeys.returns.list() },     // ✅ ADD
      { queryKey: queryKeys.analytics.shipments() }, // ✅ ADD
    ],
  },

  WALLET_MUTATIONS: {
    RECHARGE: () => [
      { queryKey: queryKeys.wallet.balance() },
      { queryKey: queryKeys.wallet.transactions() },
      { queryKey: queryKeys.analytics.wallet() }, // ✅ ADD
    ],
  },

  // ✅ ADD NEW: COD remittance affects wallet
  COD_MUTATIONS: {
    REMITTANCE: () => [
      { queryKey: queryKeys.cod.list() },
      { queryKey: queryKeys.wallet.balance() },   // ✅ ADD
      { queryKey: queryKeys.financials.settlements() }, // ✅ ADD
    ],
  },
};
```

**Verification**:
1. Create order → Check analytics dashboard updates
2. Update shipment status → Check NDR/returns lists update
3. Wallet recharge → Check balance updates everywhere

---

## CATEGORY 7: Developer Experience (P2)

**Effort**: 4 hours
**Risk**: LOW (documentation only)
**Dependencies**: All above categories complete

### Task 7.1: Document Component Location Rules
**File**: `client/ARCHITECTURE.md` (NEW)

**Content**:
```markdown
# ShipCrowd Client Architecture

## Component Organization

### Rule: Where to Place Components

1. **Shared UI Primitives** → `/src/components/ui/`
   - Examples: Button, Input, Card, Select
   - Characteristics: Reusable across entire app, no business logic

2. **Feature Components** → `/src/features/[feature]/components/`
   - Examples: OrdersList, ShipmentDetails, WalletCard
   - Characteristics: Feature-specific logic, reusable within feature

3. **Route-Specific Components** → `/app/[route]/components/`
   - Examples: OrdersPageHeader, SettingsTabNav
   - Characteristics: Used only in that route, not reusable

### State Management

- **Server state**: Use TanStack Query hooks (`/src/core/api/hooks/`)
- **Global UI state**: Use Context API (auth, theme)
- **Local state**: Use useState/useReducer
- **URL state**: Use searchParams for filters, pagination

### API Calls

- **ALWAYS use hooks** from `/src/core/api/hooks/`
- **NEVER call axios directly** in components
- **Error handling**: Consumers handle errors (hooks don't toast)

### Type Safety

- **NO `any` types** (exception: genuinely dynamic data, document reason)
- **NO `@ts-ignore`** (fix the root cause instead)
- **Use generics** for reusable components (`DataTable<T>`)

## Folder Structure

```
client/
├── app/                   # Next.js App Router (routes only)
├── src/
│   ├── components/        # Shared UI components
│   │   ├── ui/            # Primitives (Button, Input)
│   │   ├── auth/          # Auth-specific shared components
│   │   └── charts/        # Chart components
│   ├── features/          # Feature modules (analytics, orders, etc.)
│   │   └── [feature]/
│   │       ├── components/
│   │       ├── hooks/     # Feature-specific hooks
│   │       └── types/     # Feature-specific types
│   ├── core/              # Core infrastructure
│   │   ├── api/           # API client, hooks, query config
│   │   ├── config/        # App configuration
│   │   └── providers/     # React providers
│   ├── lib/               # Utility functions
│   ├── types/             # Shared TypeScript types
│   ├── hooks/             # Global React hooks
│   └── config/            # App-wide configuration
```

## Naming Conventions

- **Components**: PascalCase (OrdersList.tsx)
- **Hooks**: camelCase starting with `use` (useOrders.ts)
- **Utils**: camelCase (formatCurrency.ts)
- **Types**: PascalCase (Order, OrderStatus)
- **Constants**: UPPER_SNAKE_CASE (MAX_ORDERS_PER_PAGE)

## Performance Guidelines

- **Memoize heavy components**: Use React.memo for components >100 LOC
- **Debounce search inputs**: Use useDebouncedValue (300ms)
- **Stable keys**: Use IDs, never `index`
- **Code split**: Large features use lazy imports

## Security Checklist

- ✅ No tokens in localStorage (use HTTP-only cookies)
- ✅ No dangerouslySetInnerHTML (except documented exceptions)
- ✅ CSRF tokens on all mutations
- ✅ Validate all user input (client + server)
- ✅ No sensitive data in console.log (dev only)
```

**Verification**: Share with team, gather feedback

---

### Task 7.2: Create Migration Guide
**File**: `client/MIGRATION.md` (NEW)

**Content**: Document breaking changes from Phase 8:
```markdown
# Phase 8 Migration Guide

## OrderContext Deprecated

**BEFORE**:
```typescript
import { useOrderContext } from '@/src/features/orders/context/OrderContext';

const { orders, createOrder } = useOrderContext();
```

**AFTER**:
```typescript
import { useOrdersList, useCreateOrder } from '@/src/core/api/hooks/useOrders';

const { data: orders } = useOrdersList();
const createMutation = useCreateOrder();

createMutation.mutate(orderData);
```

## Utils Import Path Changed

**BEFORE**: `import { cn } from '@/src/shared/utils';`
**AFTER**: `import { cn } from '@/src/lib/utils';`

## Hook Error Handling

Hooks no longer show automatic error toasts. Handle errors in components:

```typescript
const mutation = useCreateOrder();
mutation.mutate(data, {
  onError: (error) => toast.error(error.message),
  onSuccess: () => toast.success('Order created'),
});
```

## Removed Folders

- ❌ `/src/domains/` (entire DDD architecture removed)
- ❌ `/src/infrastructure/`
- ❌ `/src/shared/utils/` (use `/src/lib/utils` instead)
```

---

## CATEGORY 8: Error Boundaries & Resilience (P1)

**Effort**: 2 hours
**Risk**: LOW (additive)
**Dependencies**: None

### Task 8.1: Verify Error Boundary Coverage
**File**: `client/src/components/ErrorBoundary.tsx` (already exists)

**Action**: Ensure all major routes wrapped

**Check Files**:
1. `client/app/layout.tsx` - Root error boundary (line 150)
2. `client/app/seller/layout.tsx` - Should have error boundary
3. `client/app/seller/analytics/layout.tsx` - Add if missing

**Add Error Boundaries**:
```typescript
// In app/seller/analytics/layout.tsx:
import { ErrorBoundary } from '@/src/components/ErrorBoundary';

export default function AnalyticsLayout({ children }: { children: React.Node }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
```

**Verification**:
1. Intentionally throw error in child component
2. Verify error boundary UI shows (not white screen)
3. Check error logged to console

---

### Task 8.2: Add Error Boundary Tests
**File**: `client/src/components/ErrorBoundary.test.tsx` (NEW)

**Action**: Create basic test (future-proofing)

```typescript
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  it('catches errors and displays fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
```

**Verification**: Run `npm test` (if testing setup exists)

---

## CATEGORY 9: Type Checking Audit (P0)

**Effort**: 1 hour
**Risk**: LOW (just verification)
**Dependencies**: Category 3 complete (all `any` removed)

### Task 9.1: Run Full TypeScript Check
**Action**:
```bash
cd client
npx tsc --noEmit --pretty
```

**Expected Result**: 0 errors

**If Errors Found**:
1. Document each error
2. Fix or suppress with exception comment:
   ```typescript
   // @ts-expect-error - TODO: Fix after backend API updated
   const data = response.data.legacyField;
   ```

**Verification**: CI should run this check on every PR

---

### Task 9.2: Add Strict Type Checking to CI
**File**: `.github/workflows/type-check.yml` (NEW, if using GitHub Actions)

```yaml
name: Type Check

on: [pull_request]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
        working-directory: ./client
      - run: npx tsc --noEmit
        working-directory: ./client
```

**Verification**: Open PR, check CI passes

---

## Verification Plan

### End-to-End Testing Checklist

#### 1. Production Blockers Fixed
- [ ] OrdersClient loads real data from API (not mock)
- [ ] Auth bypass only works on localhost (fails on other domains)
- [ ] Token refresh circuit breaker resets after logout/login

#### 2. Architecture Clean
- [ ] `npm run build` succeeds
- [ ] No references to `/src/domains/`
- [ ] No empty folders in `/src/shared/`
- [ ] All utils imported from `/src/lib/utils`

#### 3. Type Safety
- [ ] `npx tsc --noEmit` returns 0 errors
- [ ] No `any` types (except documented exceptions)
- [ ] No `@ts-ignore` directives

#### 4. State Management
- [ ] No imports from `OrderContext`
- [ ] Order CRUD operations work via React Query hooks
- [ ] Cache invalidates correctly (cross-domain)

#### 5. Performance
- [ ] Sidebar doesn't re-render on every order interaction (React DevTools)
- [ ] Search inputs debounced (Network tab shows 1 request after 300ms)
- [ ] No React keys using `index`

#### 6. API Reliability
- [ ] Network errors retry automatically (simulate with WiFi toggle)
- [ ] Long queries timeout correctly (test analytics with large date range)
- [ ] Error handling consistent (all hooks require consumer error handling)

#### 7. Error Boundaries
- [ ] Intentional error caught by ErrorBoundary (not white screen)
- [ ] Error logged to console for debugging

#### 8. Developer Experience
- [ ] ARCHITECTURE.md document exists and is clear
- [ ] MIGRATION.md document exists
- [ ] Team understands new patterns

---

## Rollback Strategy

### Git Tags
```bash
# Before starting Phase 8:
git tag phase-8-start

# After each category:
git tag phase-8-category-1-complete
git tag phase-8-category-2-complete
# ... etc

# If issues found:
git reset --hard phase-8-category-X-complete
```

### Feature Flags (if needed)
**NOT REQUIRED** - All changes are internal refactors, no user-facing changes

---

## Risk Mitigation

### High-Risk Changes

1. **OrderContext Deprecation** (affects multiple components)
   - **Mitigation**: Migrate one component at a time, test each
   - **Rollback**: Git tag before starting

2. **Hook Error Handling Change** (affects all API consumers)
   - **Mitigation**: Update all consumers in same PR
   - **Rollback**: Revert single PR

3. **Token Refresh Changes** (affects auth flow)
   - **Mitigation**: Test logout/login extensively
   - **Rollback**: Auth logic is isolated in AuthContext.tsx

---

## Dependencies & Order of Execution

**Critical Path** (must be done in order):
1. Category 1 (Production Blockers) → MUST BE FIRST
2. Category 2 (Architectural Cleanup) → Safe, no dependencies
3. Category 3 (Type Safety) → Required before Category 4
4. Category 4 (State Management) → Required before Category 6
5. Category 6 (API Reliability) → Requires hooks aligned
6. Category 9 (Type Check Audit) → Must be last

**Parallel Work** (can be done concurrently):
- Category 5 (Performance) can run anytime
- Category 7 (Documentation) can run anytime
- Category 8 (Error Boundaries) can run anytime

**Recommended Order**:
```
Week 1: Cat 1 (P0) → Cat 2 (P0) → Cat 3 (P0)
Week 2: Cat 4 (P0) → Cat 5 (P1) → Cat 8 (P1)
Week 3: Cat 6 (P1) → Cat 9 (P0) → Cat 7 (P2)
```

---

## Success Metrics

### Quantitative
- **Type safety**: 0 TypeScript errors
- **Architecture**: 264 empty directories removed
- **Code quality**: 31 `any` types eliminated
- **Performance**: 30% reduction in re-renders (measured in React DevTools)
- **Reliability**: Network errors retry automatically (3 attempts)

### Qualitative
- Developers can onboard faster (ARCHITECTURE.md exists)
- No confusion about "which hook to use" (OrderContext gone)
- No surprise auth bypasses (localhost check added)
- API errors handled consistently (single pattern)

---

## Post-Phase 8 Recommendations

### Immediate Next Steps (Phase 9 candidates)
1. **Add Testing**: Jest + React Testing Library setup
2. **Implement MFA**: TOTP support for admin accounts
3. **Mobile Optimization**: DataTable horizontal scroll, responsive forms
4. **Bundle Analysis**: Enable webpack analyzer, check for duplicates
5. **Accessibility Audit**: WCAG 2.1 AA compliance

### Long-Term Architecture (Phase 10+)
1. **Service Worker**: Offline-first experience
2. **HTTP Caching**: ETag + Cache-Control headers
3. **Fine-Grained Permissions**: Resource-level authorization
4. **Request Batching**: Combine multiple API calls
5. **Virtual Scrolling**: For tables with >1000 rows

---

## Appendix A: File Change Matrix

| Category | Files Changed | Files Deleted | Risk | Test Coverage |
|----------|---------------|---------------|------|---------------|
| Cat 1    | 3             | 0             | HIGH | Manual        |
| Cat 2    | 0             | 267           | LOW  | Build test    |
| Cat 3    | 35            | 0             | MED  | tsc --noEmit  |
| Cat 4    | 20            | 2             | MED  | Integration   |
| Cat 5    | 20            | 0             | LOW  | Perf profiler |
| Cat 6    | 5             | 0             | MED  | Network sim   |
| Cat 7    | 2 (new docs)  | 0             | NONE | N/A           |
| Cat 8    | 5             | 0             | LOW  | Error test    |
| Cat 9    | 0             | 0             | NONE | CI check      |

**Total**: ~90 files modified, 269 files deleted

---

## Appendix B: Critical Files Reference

### Must-Read Before Editing
1. `client/src/core/api/client.ts` - API client, 608 lines, complex retry logic
2. `client/src/features/auth/context/AuthContext.tsx` - 689 lines, auth state
3. `client/src/core/api/cacheConfig.ts` - Cache invalidation patterns
4. `client/src/features/auth/components/AuthGuard.tsx` - Route protection

### High-Change Frequency (update carefully)
1. `client/app/seller/orders/components/OrdersClient.tsx` - Mock data removal
2. `client/components/ui/data/DataTable.tsx` - @ts-ignore fix
3. `client/src/core/api/hooks/useOrders.ts` - Hook consolidation

---

## Final Notes

### Alignment Achieved
After Phase 8 completion:
- ✅ **Single source of truth** for utilities, state, API calls
- ✅ **No abandoned code** (264 empty dirs removed)
- ✅ **Type safety enforced** (0 `any` types, 0 errors)
- ✅ **Consistent patterns** (all hooks follow same error handling)
- ✅ **Clear architecture** (documented in ARCHITECTURE.md)

### Future-Proofing
- **Onboarding time reduced**: New devs read ARCHITECTURE.md, understand immediately
- **Refactor safety**: Strong types catch breaking changes
- **Performance baseline**: Memoization + debouncing patterns established
- **Security hardened**: Auth bypass locked down, CSRF validated

---

**Phase 8 Revision**: v2.0 - Comprehensive Client Refactor
**Last Updated**: 2026-01-16
**Author**: Claude (via exhaustive codebase analysis)
**Status**: Ready for Review & Approval
