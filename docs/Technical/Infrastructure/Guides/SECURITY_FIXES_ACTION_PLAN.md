<!-- 13/01/2026 -->

# Security & Architecture Fixes - Action Plan
**Created:** 2026-01-13
**Priority:** CRITICAL - Must complete before feature development
**Estimated Time:** 8-12 hours

---

## 🔴 PHASE 1: CRITICAL SECURITY FIXES (0-4 hours)

### Task 1.1: Rotate All Exposed Credentials (IMMEDIATE)
**Priority:** P0 - Do this RIGHT NOW
**Time:** 1 hour

**Exposed Services:**
1. ZeptoMail SMTP
2. Twilio (SMS/WhatsApp)
3. DeepVue (KYC)
4. Google OAuth

**Steps:**
```bash
# 1. Generate new credentials from each service
# - ZeptoMail: https://control.zepto.in/settings/smtp/
# - Twilio: https://console.twilio.com/
# - DeepVue: Contact support
# - Google OAuth: https://console.cloud.google.com/

# 2. Update production .env file
nano /path/to/production/.env
# Add new credentials

# 3. Clean .env.example
```

**File to Update:**
- `/server/.env.example` - Replace all real credentials with placeholders

```bash
# Before
SMTP_PASS=PHtE6r0JS+jrj2d78BJU5fbtRc/2NYp//uwzfQEUso1AD6NQF00Hr41/lTDkr0gtBqIUE/bPytlgsu7P5uiMJ2jqPD0aXmqyqK3sx/VYSPOZsbq6x00Zt1wff0bYUzeNA==

# After
SMTP_PASS=your_zeptomail_api_key_here
```

**Git History Cleanup:**
```bash
# Check if .env is in gitignore
cat .gitignore | grep .env

# Use BFG Repo-Cleaner to remove sensitive data from history
git clone --mirror https://github.com/your-org/shipcrowd.git
java -jar bfg.jar --replace-text passwords.txt shipcrowd.git
cd shipcrowd.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

**Enable GitHub Secret Scanning:**
- Go to GitHub repo → Settings → Security → Secret scanning alerts
- Enable Dependabot alerts

---

### Task 1.2: Fix CSRF Token Validation (CRITICAL)
**Priority:** P0
**Time:** 2 hours

**Problem:** Backend generates CSRF tokens but NEVER validates them.

**Solution: Implement Redis-based CSRF token storage**

**File:** `/server/src/presentation/http/middleware/auth/csrf.ts` (new file)

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redisClient } from '../../../infrastructure/cache/redis';
import { logger } from '../../../shared/utils/logger';

const CSRF_TOKEN_EXPIRY = 900; // 15 minutes

/**
 * Generate and store CSRF token in Redis
 */
export const generateCSRFToken = async (sessionId: string): Promise<string> => {
    const token = crypto.randomBytes(32).toString('hex');
    const key = `csrf:${sessionId}:${token}`;

    await redisClient.setex(key, CSRF_TOKEN_EXPIRY, '1');

    return token;
};

/**
 * Validate CSRF token against Redis store
 */
export const validateCSRFToken = async (
    sessionId: string,
    token: string
): Promise<boolean> => {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        return false;
    }

    const key = `csrf:${sessionId}:${token}`;
    const exists = await redisClient.exists(key);

    // Consume token (one-time use for sensitive operations)
    if (exists) {
        await redisClient.del(key);
    }

    return exists === 1;
};

/**
 * CSRF Protection Middleware
 */
export const csrfProtection = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    // Skip for test environment
    if (process.env.NODE_ENV === 'test') {
        next();
        return;
    }

    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
    }

    const csrfToken = req.headers['x-csrf-token'] as string;
    const sessionId = req.session?.id || req.user?.id;

    if (!sessionId) {
        res.status(401).json({
            success: false,
            code: 'SESSION_REQUIRED',
            message: 'Session required for CSRF validation',
        });
        return;
    }

    const isValid = await validateCSRFToken(sessionId, csrfToken);

    if (!isValid) {
        logger.warn('CSRF validation failed', {
            sessionId,
            hasToken: !!csrfToken,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });

        res.status(403).json({
            success: false,
            code: 'CSRF_TOKEN_INVALID',
            message: 'Invalid or expired CSRF token',
        });
        return;
    }

    // Origin validation (additional security layer)
    const origin = req.headers.origin || '';
    const referer = req.headers.referer || '';
    const allowedOrigins = [
        process.env.CLIENT_URL || 'http://localhost:3000',
    ];

    const isValidOrigin = allowedOrigins.some(
        (allowed) => origin === allowed || referer.startsWith(allowed)
    );

    if (!isValidOrigin) {
        logger.warn('CSRF origin validation failed', {
            origin,
            referer,
            ip: req.ip,
        });

        res.status(403).json({
            success: false,
            code: 'CSRF_ORIGIN_INVALID',
            message: 'Invalid request origin',
        });
        return;
    }

    next();
};
```

**Update Auth Controller:**

File: `/server/src/presentation/http/controllers/auth/auth.controller.ts`

```typescript
// Add CSRF token endpoint
export const getCSRFToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const sessionId = req.session?.id || req.user?.id;

        if (!sessionId) {
            sendError(res, 'Session required', 'SESSION_REQUIRED', 401);
            return;
        }

        const csrfToken = await generateCSRFToken(sessionId);

        sendSuccess(
            res,
            { csrfToken },
            'CSRF token generated',
            200
        );
    } catch (error) {
        next(error);
    }
};
```

**Update Frontend API Client:**

File: `/client/src/core/api/client.ts`

```typescript
// Fetch CSRF token on app init
let csrfToken: string | null = null;

export const fetchCSRFToken = async (): Promise<void> => {
    try {
        const response = await apiClient.get('/auth/csrf-token');
        csrfToken = response.data.data.csrfToken;
    } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
    }
};

// Add CSRF token to all non-GET requests
apiClient.interceptors.request.use(
    async (config) => {
        // Fetch CSRF token if not present
        if (!csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(config.method?.toUpperCase() || '')) {
            await fetchCSRFToken();
        }

        // Add CSRF token header
        if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(config.method?.toUpperCase() || '')) {
            config.headers['X-CSRF-Token'] = csrfToken;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Refresh CSRF token after it's consumed
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
            // Fetch new token and retry
            await fetchCSRFToken();
            return apiClient(error.config);
        }
        return Promise.reject(error);
    }
);
```

---

### Task 1.3: Remove Development CSRF Bypasses
**Priority:** P0
**Time:** 30 minutes

**File:** `/server/src/presentation/http/middleware/auth/auth.ts` (Lines 193-248)

**Before:**
```typescript
// ❌ INSECURE - Remove this
const isPostmanRequest = userAgent.includes('PostmanRuntime');
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

if (isDevelopment && isPostmanRequest) {
    next();
    return;
}
```

**After:**
```typescript
// ✅ SECURE - Only skip in test environment
if (process.env.NODE_ENV === 'test') {
    next();
    return;
}

// For development API testing, use proper CSRF tokens
// No bypasses allowed
```

---

## 🟠 PHASE 2: HIGH PRIORITY FIXES (4-8 hours)

### Task 2.1: Standardize Controller Responses
**Priority:** P1
**Time:** 3 hours

**Affected Files (18 controllers):**
```
auth/auth.controller.ts
auth/mfa.controller.ts
webhooks/*.ts (4 files)
commission/*.ts (3 files)
organization/team.controller.ts
identity/consent.controller.ts
admin/email-queue.controller.ts
marketing/promo-code.controller.ts
finance/invoice.controller.ts
shipments/*.ts (2 files)
ndr/ndr-communication.controller.ts
logistics/pincode.controller.ts
```

**Pattern to Follow:**

**Before:**
```typescript
// ❌ WRONG
res.status(200).json({
    success: true,
    message: 'TOTP setup initiated',
    data: { qrCode, manualEntryKey }
});
```

**After:**
```typescript
// ✅ CORRECT
import { sendSuccess } from '../../../../shared/utils/responseHelper';

sendSuccess(res, { qrCode, manualEntryKey }, 'TOTP setup initiated');
```

**Automated Fix Script:**

File: `/server/scripts/fix-controller-responses.sh`

```bash
#!/bin/bash

# Find all controllers with res.json() or res.status().json()
grep -rl "res\.status.*\.json\|res\.json" server/src/presentation/http/controllers/ > /tmp/controllers.txt

echo "Found controllers with direct res.json():"
cat /tmp/controllers.txt

echo ""
echo "Run manual refactoring for each file"
```

**Testing:**
```bash
# After refactoring, verify all responses follow standard format
npm run test:integration
```

---

### Task 2.2: Fix Token Refresh Race Conditions
**Priority:** P1
**Time:** 1 hour (+ 1 hour testing)

**File:** `/client/src/core/api/client.ts`

**Current Status:** Already fixed in code (line 336), but needs verification

**Add Integration Test:**

File: `/client/src/core/api/__tests__/tokenRefresh.test.ts` (new file)

```typescript
import { apiClient } from '../client';
import MockAdapter from 'axios-mock-adapter';

describe('Token Refresh Race Conditions', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(apiClient);
    });

    afterEach(() => {
        mock.restore();
    });

    test('concurrent 401s trigger only one refresh', async () => {
        let refreshCount = 0;

        // Mock refresh endpoint
        mock.onPost('/auth/refresh').reply(() => {
            refreshCount++;
            return [200, {
                success: true,
                data: { user: { id: '1', email: 'test@test.com' } }
            }];
        });

        // Mock endpoints that return 401
        mock.onGet('/endpoint1').replyOnce(401);
        mock.onGet('/endpoint2').replyOnce(401);
        mock.onGet('/endpoint3').replyOnce(401);

        // After refresh, return success
        mock.onGet(/\/endpoint/).reply(200, { success: true, data: {} });

        // Fire 3 simultaneous requests
        await Promise.all([
            apiClient.get('/endpoint1'),
            apiClient.get('/endpoint2'),
            apiClient.get('/endpoint3'),
        ]);

        // Only ONE refresh should occur
        expect(refreshCount).toBe(1);
    });

    test('infinite loop prevented with _retry flag', async () => {
        let requestCount = 0;

        mock.onGet('/protected').reply(() => {
            requestCount++;
            return [401, { success: false, code: 'TOKEN_EXPIRED' }];
        });

        mock.onPost('/auth/refresh').reply(401);

        try {
            await apiClient.get('/protected');
        } catch (error) {
            // Should fail after circuit breaker triggers
        }

        // Should not exceed max retry attempts (3)
        expect(requestCount).toBeLessThanOrEqual(4);
    });
});
```

**Run Test:**
```bash
cd client
npm test -- tokenRefresh.test.ts
```

---

### Task 2.3: Implement Consistent Query Keys
**Priority:** P1
**Time:** 2 hours

**Create Query Key Factory:**

File: `/client/src/core/api/queryKeys.ts` (new file)

```typescript
/**
 * Centralized query key factory
 * Ensures consistent cache invalidation and type safety
 */

export const queryKeys = {
    // Authentication
    auth: {
        all: () => ['auth'] as const,
        profile: () => [...queryKeys.auth.all(), 'profile'] as const,
        me: () => [...queryKeys.auth.all(), 'me'] as const,
    },

    // Wallet
    wallet: {
        all: () => ['wallet'] as const,
        balance: () => [...queryKeys.wallet.all(), 'balance'] as const,
        transactions: (filters?: any) =>
            [...queryKeys.wallet.all(), 'transactions', filters] as const,
        stats: (dateRange?: any) =>
            [...queryKeys.wallet.all(), 'stats', dateRange] as const,
    },

    // Orders
    orders: {
        all: () => ['orders'] as const,
        lists: () => [...queryKeys.orders.all(), 'list'] as const,
        list: (params?: any) =>
            [...queryKeys.orders.lists(), params] as const,
        detail: (id: string) =>
            [...queryKeys.orders.all(), 'detail', id] as const,
    },

    // Shipments
    shipments: {
        all: () => ['shipments'] as const,
        lists: () => [...queryKeys.shipments.all(), 'list'] as const,
        list: (filters?: any) =>
            [...queryKeys.shipments.lists(), filters] as const,
        detail: (id: string) =>
            [...queryKeys.shipments.all(), 'detail', id] as const,
        track: (trackingNumber: string) =>
            [...queryKeys.shipments.all(), 'track', trackingNumber] as const,
    },

    // COD Remittance
    codRemittance: {
        all: () => ['codRemittance'] as const,
        lists: () => [...queryKeys.codRemittance.all(), 'list'] as const,
        list: (filters?: any) =>
            [...queryKeys.codRemittance.lists(), filters] as const,
        detail: (id: string) =>
            [...queryKeys.codRemittance.all(), 'detail', id] as const,
        stats: () => [...queryKeys.codRemittance.all(), 'stats'] as const,
    },

    // Weight Disputes
    weightDisputes: {
        all: () => ['weightDisputes'] as const,
        lists: () => [...queryKeys.weightDisputes.all(), 'list'] as const,
        list: (filters?: any) =>
            [...queryKeys.weightDisputes.lists(), filters] as const,
        detail: (id: string) =>
            [...queryKeys.weightDisputes.all(), 'detail', id] as const,
    },

    // Analytics
    analytics: {
        all: () => ['analytics'] as const,
        dashboard: (period?: string) =>
            [...queryKeys.analytics.all(), 'dashboard', period] as const,
        revenue: (params?: any) =>
            [...queryKeys.analytics.all(), 'revenue', params] as const,
        shipments: (params?: any) =>
            [...queryKeys.analytics.all(), 'shipments', params] as const,
    },

    // Warehouses
    warehouses: {
        all: () => ['warehouses'] as const,
        lists: () => [...queryKeys.warehouses.all(), 'list'] as const,
        list: () => [...queryKeys.warehouses.lists()] as const,
        detail: (id: string) =>
            [...queryKeys.warehouses.all(), 'detail', id] as const,
    },

    // Rate Cards
    rateCards: {
        all: () => ['rateCards'] as const,
        list: () => [...queryKeys.rateCards.all(), 'list'] as const,
        calculate: (params?: any) =>
            [...queryKeys.rateCards.all(), 'calculate', params] as const,
    },
} as const;

// Type-safe query key selector
export type QueryKeys = typeof queryKeys;
```

**Update All Hooks to Use Query Keys:**

Example: `/client/src/core/api/hooks/useWallet.ts`

```typescript
import { queryKeys } from '../queryKeys';

// Before
queryKey: ['wallet', 'balance'],

// After
queryKey: queryKeys.wallet.balance(),
```

---

### Task 2.4: Remove Mock Data from Production Hooks
**Priority:** P1
**Time:** 1 hour

**Files to Fix:**
- `useAnalytics.ts`
- `useIntegrations.ts`
- `useSettlements.ts`
- `useSellerActions.ts`

**Before:**
```typescript
export const useIntegrations = () => {
    return useQuery({
        queryFn: async () => {
            await new Promise(resolve => setTimeout(resolve, 800));
            return { integrations: mockData };
        },
    });
};
```

**After:**
```typescript
import { queryKeys } from '../queryKeys';

export const useIntegrations = (options?: UseQueryOptions) => {
    return useQuery({
        queryKey: queryKeys.integrations.list(),
        queryFn: async () => {
            const response = await apiClient.get('/integrations');
            return response.data.data;
        },
        retry: 1,
        ...options,
    });
};
```

---

## 🟡 PHASE 3: ARCHITECTURE IMPROVEMENTS (8-12 hours)

### Task 3.1: Verify Route Authentication
**Priority:** P2
**Time:** 2 hours

**Audit All Routes:**

File: `/server/scripts/audit-routes.sh` (new file)

```bash
#!/bin/bash

echo "=== Auditing Route Authentication ==="
echo ""

# Find all route files
find server/src/presentation/http/routes -name "*.routes.ts" | while read file; do
    echo "File: $file"

    # Check if authenticate middleware is used
    if grep -q "authenticate" "$file"; then
        echo "  ✅ Has authentication"
    else
        echo "  ⚠️  No authentication found"
    fi

    # Check for authorization
    if grep -q "authorize" "$file"; then
        echo "  ✅ Has authorization (role-based)"
    fi

    echo ""
done
```

**Run Audit:**
```bash
chmod +x server/scripts/audit-routes.sh
./server/scripts/audit-routes.sh
```

**Add Missing Authentication:**

Example fix for `/server/src/presentation/http/routes/v1/finance/wallet.routes.ts`:

```typescript
import { authenticate } from '../../../middleware/auth/auth';

const router = Router();

// ✅ All routes protected
router.use(authenticate);

router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.post('/recharge', walletController.rechargeWallet);
```

---

### Task 3.2: Improve CORS Configuration
**Priority:** P2
**Time:** 30 minutes

**File:** `/server/src/app.ts`

```typescript
// Support multiple origins
const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URL_STAGING,
    'https://app.shipcrowd.com',
    'https://staging.shipcrowd.com',
].filter(Boolean);

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman in dev)
        if (!origin && process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }

        if (origin && allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'X-Requested-With',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
```

---

### Task 3.3: Add Request Cancellation Support
**Priority:** P2
**Time:** 1 hour

**Update All Query Hooks:**

File: `/client/src/core/api/hooks/useOrders.ts` (example)

```typescript
export const useOrders = (filters?: OrderFilters) => {
    return useQuery({
        queryKey: queryKeys.orders.list(filters),
        queryFn: async ({ signal }) => {
            const response = await apiClient.get('/orders', {
                params: filters,
                signal, // ✅ Pass AbortSignal
            });
            return response.data.data;
        },
        staleTime: 30000,
    });
};
```

**Repeat for all hooks** (useShipments, useWallet, useAnalytics, etc.)

---

### Task 3.4: Fix Optimistic Updates
**Priority:** P2
**Time:** 1 hour

**File:** `/client/src/core/api/hooks/useOrders.ts`

```typescript
export const useUpdateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, data }: UpdateOrderParams) => {
            const response = await apiClient.patch(`/orders/${orderId}`, data);
            return response.data.data;
        },
        onMutate: async ({ orderId, data }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({
                queryKey: queryKeys.orders.detail(orderId)
            });

            // Snapshot previous value
            const previousOrder = queryClient.getQueryData(
                queryKeys.orders.detail(orderId)
            );

            // Optimistically update
            if (previousOrder) {
                queryClient.setQueryData(
                    queryKeys.orders.detail(orderId),
                    (old: any) => ({
                        ...old,
                        data: { order: { ...old.data.order, ...data } }
                    })
                );
            }

            return { previousOrder };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousOrder) {
                queryClient.setQueryData(
                    queryKeys.orders.detail(variables.orderId),
                    context.previousOrder
                );
            }
            showErrorToast(getErrorMessage(err));
        },
        onSettled: (_, __, variables) => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({
                queryKey: queryKeys.orders.detail(variables.orderId)
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.orders.lists()
            });
        },
    });
};
```

---

## 📋 VERIFICATION CHECKLIST

### Security Verification
- [ ] All exposed credentials rotated
- [ ] `.env.example` cleaned of real credentials
- [ ] CSRF tokens stored in Redis
- [ ] CSRF validation implemented
- [ ] Development bypasses removed
- [ ] Token refresh race conditions tested
- [ ] Integration tests passing

### Architecture Verification
- [ ] All 18 controllers refactored to use response helpers
- [ ] Query key factory implemented
- [ ] All hooks using centralized query keys
- [ ] Mock data removed from production hooks
- [ ] Request cancellation added to all queries
- [ ] Optimistic updates properly implemented

### Route Security Verification
- [ ] All protected routes have authentication middleware
- [ ] Admin routes have authorization middleware
- [ ] Public routes explicitly marked
- [ ] CORS configuration supports multiple origins

### Testing Verification
- [ ] Token refresh race condition tests pass
- [ ] CSRF validation tests pass
- [ ] Integration tests pass
- [ ] E2E auth flow tests pass

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Deploying to Production
- [ ] All credentials rotated
- [ ] Environment variables set correctly
- [ ] `NODE_ENV=production` set
- [ ] HTTPS enabled
- [ ] CORS origins configured for production domain
- [ ] Rate limiting enabled
- [ ] Security headers verified
- [ ] Database backups configured
- [ ] Monitoring enabled (Sentry, DataDog, etc.)
- [ ] Load testing completed

---

## 📊 ESTIMATED TIME BREAKDOWN

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 (Critical) | 3 tasks | 4 hours |
| Phase 2 (High Priority) | 4 tasks | 4 hours |
| Phase 3 (Architecture) | 4 tasks | 4 hours |
| **Total** | **11 tasks** | **12 hours** |

---

## 🎯 SUCCESS CRITERIA

The integration infrastructure is considered "bulletproof" when:

1. ✅ All security vulnerabilities fixed (P0)
2. ✅ Token refresh tested with 100+ concurrent requests
3. ✅ CSRF protection validated with penetration testing
4. ✅ All controllers use standardized response format
5. ✅ Query cache invalidation works correctly
6. ✅ No race conditions in optimistic updates
7. ✅ All routes properly authenticated
8. ✅ Integration tests pass with 100% coverage
9. ✅ Performance benchmarks met (< 200ms API response time)
10. ✅ Security audit passes

---

**Next Step:** Begin with Phase 1, Task 1.1 (Rotate Credentials) IMMEDIATELY.
