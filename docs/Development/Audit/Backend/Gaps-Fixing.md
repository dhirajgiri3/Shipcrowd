# Shipcrowd Backend Gap Fix - Master Implementation Plan

**Status:** 📋 READY TO EXECUTE
**Based On:** Automated Audit Results (2026-01-07 23:33:01)
**Duration:** 6 weeks (240 hours)
**Team:** 2 developers (recommended)
**Start Date:** 2026-01-08
**Target Completion:** 2026-02-19

---

## Executive Summary

### Audit Results (Real Numbers)

| Category | Count | Severity | Priority |
|----------|-------|----------|----------|
| **Mock/Placeholder Code** | 107 | 🔴 CRITICAL | P0 |
| **TODOs (untracked)** | 40 | 🔴 HIGH | P0 |
| **Controllers without Auth** | 36 | 🔴 CRITICAL | P0 |
| **Services without Transactions** | 20 | 🔴 CRITICAL | P0 |
| **Services without Tests** | 48 | 🟡 MEDIUM | P1 |
| **Services without Docs** | 9 | 🟡 MEDIUM | P2 |
| **Services without Error Handling** | 7 | 🔴 HIGH | P1 |
| **TOTAL GAPS** | **267** | | |

### Strategic Approach

**Why This Plan Works:**
1. ✅ **Data-Driven** - Based on actual audit, not estimates
2. ✅ **Risk-Prioritized** - Critical gaps (data corruption, security) first
3. ✅ **Systematic** - Clear patterns for similar fixes
4. ✅ **Measurable** - Daily/weekly metrics tracking
5. ✅ **Realistic** - 30% buffer for unknowns

**Key Optimizations from Original Plan:**
- Reduced 8 weeks → 6 weeks (parallelization)
- Combined related fixes (e.g., auth + transactions in same services)
- Automated verification scripts (50% faster testing)
- Template-based fixes (reusable patterns)

---

## Table of Contents

1. [Phase 0: Preparation (Week 0 - 16h)](#phase-0-preparation)
2. [Phase 1: Critical Data Integrity (Week 1 - 80h)](#phase-1-critical-data-integrity)
3. [Phase 2: Security & Authorization (Week 2 - 80h)](#phase-2-security--authorization)
4. [Phase 3: Integration Completion (Week 3-4 - 160h)](#phase-3-integration-completion)
5. [Phase 4: Testing & Quality (Week 5 - 80h)](#phase-4-testing--quality)
6. [Phase 5: Deployment & Verification (Week 6 - 80h)](#phase-5-deployment--verification)
7. [Daily Execution Pattern](#daily-execution-pattern)
8. [Success Metrics](#success-metrics)
9. [Risk Mitigation](#risk-mitigation)

---

## Phase 0: Preparation (Week 0 - 16 hours)

**Goal:** Set up infrastructure for efficient execution

### Day 1: Tooling & Automation (8 hours)

#### Task 0.1: Create Fix Templates (3h)

```bash
# File: scripts/templates/transaction-fix.template.ts
```

```typescript
// TEMPLATE: Add transaction to service method
import mongoose from 'mongoose';

async methodName() {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // TODO: Add existing logic here with { session } option
        await Model1.updateOne({ _id }, data, { session });
        await Model2.create(data, { session });

        await session.commitTransaction();

        logger.info('Operation completed successfully');

    } catch (error) {
        await session.abortTransaction();
        logger.error('Operation failed, transaction rolled back', { error });
        throw error;
    } finally {
        session.endSession();
    }
}
```

**Create Templates For:**
- ✅ Transaction pattern (`transaction-fix.template.ts`)
- ✅ Authorization middleware (`auth-fix.template.ts`)
- ✅ Integration replacement (`integration-fix.template.ts`)
- ✅ Error handling pattern (`error-handling.template.ts`)
- ✅ Unit test structure (`test-fix.template.ts`)

#### Task 0.2: Verification Scripts (3h)

```bash
# File: scripts/verify-fixes.sh
```

```bash
#!/bin/bash

echo "🔍 Verification Suite"
echo "===================="

# 1. Check for remaining TODOs
echo "\n📝 Checking TODOs..."
TODO_COUNT=$(grep -r "TODO" server/src --include="*.ts" | wc -l)
if [ $TODO_COUNT -eq 0 ]; then
    echo "✅ No TODOs remaining"
else
    echo "❌ Found $TODO_COUNT TODOs"
    exit 1
fi

# 2. Check for mock code
echo "\n🎭 Checking for mocks..."
MOCK_COUNT=$(grep -ri "for now\|mock\|placeholder" server/src --include="*.ts" | wc -l)
if [ $MOCK_COUNT -eq 0 ]; then
    echo "✅ No mock code remaining"
else
    echo "❌ Found $MOCK_COUNT mock instances"
    exit 1
fi

# 3. Check authorization
echo "\n🔒 Checking authorization..."
UNAUTH_COUNT=$(grep -L "requireRole\|authorize" server/src/presentation/http/controllers/**/*.ts | wc -l)
if [ $UNAUTH_COUNT -eq 0 ]; then
    echo "✅ All controllers have authorization"
else
    echo "❌ Found $UNAUTH_COUNT controllers without auth"
    exit 1
fi

# 4. Run tests
echo "\n🧪 Running tests..."
npm test -- --coverage --silent
COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
if (( $(echo "$COVERAGE >= 90" | bc -l) )); then
    echo "✅ Coverage: $COVERAGE% (target: 90%)"
else
    echo "❌ Coverage: $COVERAGE% (below 90%)"
    exit 1
fi

echo "\n✅ All verifications passed!"
```

**Create Scripts For:**
- ✅ Gap verification (`verify-fixes.sh`)
- ✅ Test coverage check (`check-coverage.sh`)
- ✅ Transaction validation (`verify-transactions.sh`)
- ✅ Integration completeness (`verify-integrations.sh`)

#### Task 0.3: Tracking Setup (2h)

**Create Tracking Spreadsheet:**

```
File: tracking/progress-tracker.csv

Week,Phase,Service,Status,GapsFixed,TestCoverage,TimeSpent
1,P1,commission-approval.service.ts,In Progress,0/3,0%,0h
1,P1,rto.service.ts,Not Started,0/5,0%,0h
...
```

**Create Daily Report Template:**

```markdown
# Daily Progress Report - 2026-01-XX

## Completed Today
- [x] Service: `example.service.ts`
  - Fixed gaps: Transaction support, Error handling
  - Tests: 85% coverage
  - Time: 4.5h

## Gaps Closed
- Critical: 3 (transactions, auth)
- High: 2 (TODOs)
- Medium: 1 (docs)

## Blockers
- None / [List blockers]

## Tomorrow's Plan
- Service: `next.service.ts`
- Expected: Close 4 gaps
```

---

## Phase 1: Critical Data Integrity (Week 1 - 80 hours)

**Goal:** Fix all services with data corruption risks (transactions + related issues)

### Priority: CRITICAL (P0)
**Impact:** Data corruption, financial loss, inventory desync

### Services to Fix (20 total)

**Tier 1 - Financial Critical (40h):**

| # | Service | Issues | Impact | Time |
|---|---------|--------|--------|------|
| 1 | `commission-approval.service.ts` | 6 updates, no txn, no auth, 2 TODOs | Commission fraud | 6h |
| 2 | `commission-calculation.service.ts` | 3 updates, no txn, mock rate | Wrong payouts | 4h |
| 3 | `sales-representative.service.ts` | 6 updates, no txn | Data inconsistency | 6h |
| 4 | `wallet.service.ts` | ✅ Already has txns | N/A | ✅ |
| 5 | `rto.service.ts` | 5 TODOs, mocks, no txn on order update | RTO failures | 8h |

**Tier 2 - Inventory/Order Critical (40h):**

| # | Service | Issues | Impact | Time |
|---|---------|--------|--------|------|
| 6 | `amazon-order-sync.service.ts` | 9 updates, no txn, no tests | Order desync | 6h |
| 7 | `shopify-order-sync.service.ts` | 4 updates, no txn, 4 TODOs | Order desync | 5h |
| 8 | `flipkart-order-sync.service.ts` | 4 updates, no txn, mocks | Order desync | 5h |
| 9 | `woocommerce-order-sync.service.ts` | 6 updates, no txn, mocks | Order desync | 6h |
| 10 | `amazon-inventory-sync.service.ts` | 5 updates, no txn, mocks | Stock errors | 4h |
| 11 | `shopify-inventory-sync.service.ts` | 3 updates, no txn, mocks | Stock errors | 4h |

### Implementation Pattern

**Step 1: Add Transaction Support**

```typescript
// BEFORE (❌ Risk of partial updates)
async updateCommission(id: string, data: UpdateData) {
    // No transaction - if #2 fails, #1 is already saved!
    await Commission.updateOne({ _id: id }, data); // #1
    await Order.updateOne({ commissionId: id }, { ... }); // #2
    await Wallet.create({ ... }); // #3
}

// AFTER (✅ Atomic operation)
async updateCommission(id: string, data: UpdateData) {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // All succeed or all fail together
        await Commission.updateOne({ _id: id }, data, { session });
        await Order.updateOne({ commissionId: id }, { ... }, { session });
        await Wallet.create({ ... }, { session });

        await session.commitTransaction();

        logger.info('Commission updated successfully', { id });

    } catch (error) {
        await session.abortTransaction();
        logger.error('Commission update failed, rolled back', { id, error });
        throw new AppError('Commission update failed', 'UPDATE_FAILED', 500);
    } finally {
        session.endSession();
    }
}
```

**Step 2: Add Authorization (if controller exists)**

```typescript
// In controller file
import { requireRole } from '@/middleware/authorization.middleware';

router.patch('/:id/approve',
    authenticate,
    requireRole(['admin', 'finance_manager']), // ← Add this
    validateRequest(approveCommissionSchema),
    controller.approveCommission
);
```

**Step 3: Replace Mocks with Real Implementations**

```typescript
// BEFORE (❌ Mock)
async calculateCharge() {
    // TODO: Integrate rate card
    return 50; // Hardcoded!
}

// AFTER (✅ Real integration)
async calculateCharge(weight: number, zone: string, type: string) {
    const charge = await RateCardService.calculateCharge({
        weight,
        zone,
        serviceType: type,
    });

    if (!charge) {
        throw new AppError('Rate not found', 'RATE_NOT_FOUND', 404);
    }

    return charge;
}
```

**Step 4: Resolve TODOs**

```typescript
// BEFORE
// TODO: Send notification to seller
logger.info('Notification sent'); // Not actually sent!

// AFTER
await NotificationService.send({
    to: seller.email,
    template: 'commission_approved',
    data: { commissionId, amount, date },
});
```

**Step 5: Add Tests**

```typescript
// tests/unit/services/commission/commission-approval.service.test.ts

describe('CommissionApprovalService', () => {
    describe('approveCommission', () => {
        it('should update commission, order, and wallet atomically', async () => {
            // Arrange
            const mockCommission = { _id: '123', amount: 100 };
            const session = await mongoose.startSession();

            // Act
            await service.approveCommission('123', { approved: true });

            // Assert
            expect(Commission.updateOne).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object),
                expect.objectContaining({ session })
            );
            expect(Wallet.create).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ session })
            );
        });

        it('should rollback all changes on failure', async () => {
            // Arrange
            Wallet.create.mockRejectedValue(new Error('Wallet error'));

            // Act & Assert
            await expect(
                service.approveCommission('123', { approved: true })
            ).rejects.toThrow();

            // Verify commission was NOT updated (rolled back)
            const commission = await Commission.findById('123');
            expect(commission.approved).toBe(false);
        });
    });
});
```

### Daily Execution (Week 1)

**Day 1 (16h total, 2 developers):**
- Developer A: `commission-approval.service.ts` (6h) + `commission-calculation.service.ts` (4h)
- Developer B: `sales-representative.service.ts` (6h) + `rto.service.ts` start (2h)

**Day 2 (16h total):**
- Developer A: `amazon-order-sync.service.ts` (6h)
- Developer B: `rto.service.ts` complete (6h) + `shopify-order-sync.service.ts` start (2h)

**Day 3 (16h total):**
- Developer A: `flipkart-order-sync.service.ts` (5h) + `woocommerce-order-sync.service.ts` (6h)
- Developer B: `shopify-order-sync.service.ts` complete (3h) + `amazon-inventory-sync.service.ts` (4h)

**Day 4 (16h total):**
- Developer A: Write integration tests for Tier 1 (8h)
- Developer B: `shopify-inventory-sync.service.ts` (4h) + Write tests for Tier 2 (4h)

**Day 5 (16h total):**
- Both: Code review, staging deployment, verification (8h each)

### Verification Checklist (Week 1)

```bash
# Run automated verification
./scripts/verify-phase1.sh
```

**Manual Checks:**
- ✅ All 20 services use transactions
- ✅ Transaction tests pass (rollback verified)
- ✅ No data inconsistency in staging
- ✅ All Tier 1 services have authorization
- ✅ All TODOs in these services resolved
- ✅ All mocks replaced with real implementations
- ✅ Test coverage >80% for fixed services

**Metrics:**
- Gaps closed: ~60 (transactions + TODOs + mocks)
- Code review: 100% approval
- Tests: >80% coverage
- Deploy: Staging successful

---

## Phase 2: Security & Authorization (Week 2 - 80 hours)

**Goal:** Add authorization to all 36 controllers + fix security gaps

### Priority: CRITICAL (P0)
**Impact:** Unauthorized access, data breaches

### Controllers to Fix (36 total)

**Tier 1 - Admin-Only Endpoints (High Risk):**

| # | Controller | Endpoints Needing Auth | Impact | Time |
|---|------------|----------------------|--------|------|
| 1 | `weight-disputes.controller.ts` | `/resolve`, `/approve` | Dispute fraud | 2h |
| 2 | `audit.controller.ts` | `/logs`, `/export` | Log exposure | 2h |
| 3 | `analytics.controller.ts` | All endpoints | Data leak | 2h |
| 4 | `export.controller.ts` | `/export` | Data theft | 2h |
| 5 | `auth-analytics.controller.ts` | All endpoints | Auth data leak | 2h |
| 6 | `company.controller.ts` | `/suspend`, `/delete` | Company manipulation | 2h |
| 7 | `team.controller.ts` | Role management | Privilege escalation | 2h |

**Tier 2 - Manager/Seller Endpoints (Medium Risk):**

| # | Controller | Auth Needed | Time |
|---|------------|-------------|------|
| 8-15 | Marketplace controllers (8) | Role-based | 16h |
| 16-20 | Warehouse controllers (5) | Role-based | 10h |
| 21-25 | Communication controllers (5) | Role-based | 10h |

**Tier 3 - Public with Rate Limiting:**

| # | Controller | Protection Needed | Time |
|---|------------|-------------------|------|
| 26 | `address-update.controller.ts` | Rate limit | 1h |
| 27-36 | Webhook controllers (10) | Signature validation | 10h |

### Implementation Pattern

**Step 1: Create Authorization Middleware (4h)**

```typescript
// File: src/presentation/http/middleware/authorization.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@/types/express';
import { AppError } from '@/shared/errors/AppError';
import { createAuditLog } from '@/services/audit/audit.service';

export interface AuthorizationOptions {
    roles?: ('admin' | 'seller' | 'staff')[];
    teamRoles?: ('owner' | 'admin' | 'manager' | 'member' | 'viewer')[];
    requireCompanyMatch?: boolean;
}

export const authorize = (options: AuthorizationOptions) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthRequest;
        const user = authReq.user;

        if (!user) {
            throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
        }

        // Check platform role
        if (options.roles && !options.roles.includes(user.role)) {
            // Log failed authorization attempt
            await createAuditLog(
                user._id,
                user.companyId,
                'authorization_failed',
                'security',
                null,
                {
                    resource: req.path,
                    requiredRoles: options.roles,
                    userRole: user.role,
                },
                req
            );

            throw new AppError('Insufficient permissions', 'FORBIDDEN', 403);
        }

        // Check team role
        if (options.teamRoles && !options.teamRoles.includes(user.teamRole)) {
            await createAuditLog(
                user._id,
                user.companyId,
                'authorization_failed',
                'security',
                null,
                {
                    resource: req.path,
                    requiredTeamRoles: options.teamRoles,
                    userTeamRole: user.teamRole,
                },
                req
            );

            throw new AppError('Insufficient team permissions', 'FORBIDDEN', 403);
        }

        // Check company match (prevent cross-company access)
        if (options.requireCompanyMatch) {
            const resourceCompanyId = req.params.companyId || req.body.companyId;

            if (resourceCompanyId && resourceCompanyId !== user.companyId) {
                await createAuditLog(
                    user._id,
                    user.companyId,
                    'unauthorized_company_access_attempt',
                    'security',
                    null,
                    {
                        attemptedCompanyId: resourceCompanyId,
                        userCompanyId: user.companyId,
                    },
                    req
                );

                throw new AppError('Cannot access other company resources', 'FORBIDDEN', 403);
            }
        }

        next();
    };
};

// Convenience helpers
export const requireAdmin = () => authorize({ roles: ['admin'] });
export const requireSeller = () => authorize({ roles: ['seller'] });
export const requireOwner = () => authorize({ teamRoles: ['owner'] });
export const requireManager = () => authorize({ teamRoles: ['owner', 'admin', 'manager'] });
```

**Step 2: Apply to Controllers**

```typescript
// BEFORE (❌ No authorization)
router.patch('/:id/resolve',
    authenticate,
    validateRequest(resolveDisputeSchema),
    controller.resolveDispute
);

// AFTER (✅ Admin-only)
import { requireAdmin, authorize } from '@/middleware/authorization.middleware';

router.patch('/:id/resolve',
    authenticate,
    requireAdmin(), // Only platform admins
    validateRequest(resolveDisputeSchema),
    controller.resolveDispute
);

// Team role example
router.post('/invite',
    authenticate,
    authorize({ teamRoles: ['owner', 'admin'] }), // Owner or team admin
    validateRequest(inviteTeamMemberSchema),
    controller.inviteTeamMember
);

// Company isolation example
router.get('/:companyId/orders',
    authenticate,
    authorize({
        roles: ['seller'],
        requireCompanyMatch: true // Prevent accessing other companies
    }),
    controller.getOrders
);
```

**Step 3: Add Rate Limiting**

```typescript
// File: src/presentation/http/middleware/rate-limiter.middleware.ts

import rateLimit from 'express-rate-limit';

export const publicEndpointLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: {
        success: false,
        error: {
            code: 'WEBHOOK_RATE_LIMIT',
            message: 'Too many webhook requests',
        },
    },
});

// Apply to routes
router.post('/address-update',
    publicEndpointLimiter, // ← Add rate limiting
    validateRequest(addressUpdateSchema),
    controller.updateAddress
);
```

**Step 4: Webhook Signature Validation**

```typescript
// Already implemented in webhook controllers
// Verify it's being used:

import { validateWebhookSignature } from '@/middleware/webhook-auth.middleware';

router.post('/shopify/webhook',
    webhookLimiter,
    validateWebhookSignature('shopify'), // ✅ Verify this exists
    controller.handleWebhook
);
```

### Daily Execution (Week 2)

**Day 1 (16h total):**
- Developer A: Create authorization middleware (4h) + Apply to Tier 1 controllers #1-4 (8h)
- Developer B: Create test suite for authorization (4h) + Apply to Tier 1 controllers #5-7 (6h)

**Day 2 (16h total):**
- Developer A: Marketplace controllers #8-11 (8h)
- Developer B: Marketplace controllers #12-15 (8h)

**Day 3 (16h total):**
- Developer A: Warehouse controllers #16-20 (10h)
- Developer B: Communication controllers #21-25 (10h)

**Day 4 (16h total):**
- Developer A: Rate limiting + webhook validation #26-36 (11h)
- Developer B: Write comprehensive authorization tests (8h)

**Day 5 (16h total):**
- Both: Security audit, penetration testing, code review (8h each)

### Verification Checklist (Week 2)

```bash
# Run automated security checks
./scripts/verify-phase2.sh
```

**Manual Security Tests:**
- ✅ Non-admin cannot resolve disputes (403)
- ✅ Non-manager cannot view analytics (403)
- ✅ Seller cannot access other company's data (403)
- ✅ Rate limiting works (429 after limit)
- ✅ Webhook without valid signature rejected (401)
- ✅ Audit logs created for failed auth attempts

**Metrics:**
- Controllers secured: 36/36
- Authorization tests: >95% coverage
- Penetration test: 0 vulnerabilities
- Audit logging: 100% of auth failures

---

## Phase 3: Integration Completion (Week 3-4 - 160 hours)

**Goal:** Replace all 107 mock/placeholder instances with real implementations

### Priority: CRITICAL (P0)
**Impact:** System cannot function in production

### Integration Categories

| Category | Instances | Time | Developer |
|----------|-----------|------|-----------|
| **Courier APIs** | 40 | 50h | Dev A |
| **Inventory Service** | 25 | 30h | Dev B |
| **Rate Card Service** | 15 | 20h | Dev A |
| **Notification Service** | 12 | 20h | Dev B |
| **Other (SKU, Warehouse)** | 15 | 20h | Both |
| **Testing** | - | 20h | Both |
| **TOTAL** | **107** | **160h** | |

### Week 3: Core Integrations (80h)

#### 3.1: Courier API Integration (50h - Developer A)

**Services to Fix:**

1. `rto.service.ts` - `createReverseShipment()`
2. `address-update.controller.ts` - `requestReattempt()`
3. `ndr-action-executors.ts` - `requestReattempt()`
4. `shipment.service.ts` - `getRates()`

**Implementation:**

```typescript
// File: infrastructure/external/couriers/courier-client.service.ts

import axios, { AxiosInstance } from 'axios';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/utils/logger';

export interface ReverseShipmentRequest {
    awb: string;
    pickupAddress: Address;
    dropAddress: Address;
    weight: number;
    dimensions: Dimensions;
    reason: string;
}

export interface ReverseShipmentResponse {
    reverseAwb: string;
    pickupDate: Date;
    estimatedDelivery: Date;
}

export class CourierClientService {
    private client: AxiosInstance;
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.COURIER_API_KEY!;
        this.baseUrl = process.env.COURIER_API_URL!;

        if (!this.apiKey || !this.baseUrl) {
            throw new Error('Courier API credentials not configured');
        }

        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 seconds
        });

        // Add retry logic
        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const config = error.config;

                // Retry on 5xx errors (max 3 attempts)
                if (error.response?.status >= 500 && config.__retryCount < 3) {
                    config.__retryCount = (config.__retryCount || 0) + 1;

                    // Exponential backoff: 1s, 2s, 4s
                    const delay = Math.pow(2, config.__retryCount) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));

                    return this.client(config);
                }

                throw error;
            }
        );
    }

    /**
     * Create reverse shipment for RTO
     */
    async createReverseShipment(
        data: ReverseShipmentRequest
    ): Promise<ReverseShipmentResponse> {
        try {
            logger.info('Creating reverse shipment', { awb: data.awb });

            const response = await this.client.post('/reverse-shipment', {
                original_awb: data.awb,
                pickup_address: {
                    name: data.pickupAddress.name,
                    phone: data.pickupAddress.phone,
                    address_line_1: data.pickupAddress.line1,
                    address_line_2: data.pickupAddress.line2,
                    city: data.pickupAddress.city,
                    state: data.pickupAddress.state,
                    pincode: data.pickupAddress.pincode,
                },
                drop_address: {
                    name: data.dropAddress.name,
                    phone: data.dropAddress.phone,
                    address_line_1: data.dropAddress.line1,
                    address_line_2: data.dropAddress.line2,
                    city: data.dropAddress.city,
                    state: data.dropAddress.state,
                    pincode: data.dropAddress.pincode,
                },
                weight: data.weight,
                length: data.dimensions.length,
                breadth: data.dimensions.breadth,
                height: data.dimensions.height,
                reason: data.reason,
            });

            logger.info('Reverse shipment created', {
                originalAwb: data.awb,
                reverseAwb: response.data.reverse_awb,
            });

            return {
                reverseAwb: response.data.reverse_awb,
                pickupDate: new Date(response.data.pickup_date),
                estimatedDelivery: new Date(response.data.estimated_delivery),
            };

        } catch (error) {
            logger.error('Failed to create reverse shipment', {
                awb: data.awb,
                error: error.message,
            });

            if (error.response?.status === 400) {
                throw new AppError(
                    error.response.data.message || 'Invalid shipment data',
                    'INVALID_SHIPMENT_DATA',
                    400
                );
            }

            if (error.response?.status === 404) {
                throw new AppError(
                    'Original shipment not found',
                    'SHIPMENT_NOT_FOUND',
                    404
                );
            }

            throw new AppError(
                'Failed to create reverse shipment',
                'REVERSE_SHIPMENT_FAILED',
                500
            );
        }
    }

    /**
     * Request delivery reattempt
     */
    async requestReattempt(awb: string, reattemptDate: Date): Promise<void> {
        try {
            logger.info('Requesting reattempt', { awb, date: reattemptDate });

            await this.client.post('/reattempt', {
                awb,
                reattempt_date: reattemptDate.toISOString().split('T')[0],
            });

            logger.info('Reattempt requested successfully', { awb });

        } catch (error) {
            logger.error('Failed to request reattempt', {
                awb,
                error: error.message,
            });

            throw new AppError(
                'Failed to request reattempt',
                'REATTEMPT_FAILED',
                500
            );
        }
    }

    /**
     * Get shipping rates
     */
    async getRates(
        origin: string,
        destination: string,
        weight: number
    ): Promise<{ rate: number; zone: string }> {
        try {
            const response = await this.client.get('/rates', {
                params: {
                    origin_pincode: origin,
                    destination_pincode: destination,
                    weight,
                },
            });

            return {
                rate: response.data.rate,
                zone: response.data.zone,
            };

        } catch (error) {
            logger.error('Failed to get rates', { error: error.message });

            throw new AppError(
                'Failed to get shipping rates',
                'RATE_FETCH_FAILED',
                500
            );
        }
    }
}

// Export singleton instance
export const courierClient = new CourierClientService();
```

**Update RTO Service:**

```typescript
// File: core/application/services/rto/rto.service.ts

import { courierClient } from '@/infrastructure/external/couriers/courier-client.service';

export class RTOService {
    async triggerRTO(shipmentId: string, reason: string) {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            const shipment = await Shipment.findById(shipmentId).session(session);

            // BEFORE: Mock reverse AWB
            // const reverseAwb = `RTO-${shipment.awb}`;

            // AFTER: Real courier API call
            const reverseShipment = await courierClient.createReverseShipment({
                awb: shipment.awb,
                pickupAddress: shipment.deliveryDetails,
                dropAddress: shipment.pickupDetails,
                weight: shipment.weight,
                dimensions: shipment.dimensions,
                reason,
            });

            const reverseAwb = reverseShipment.reverseAwb;

            // Update shipment with reverse AWB
            shipment.status = 'rto_initiated';
            shipment.rtoDetails = {
                reverseAwb,
                initiatedAt: new Date(),
                reason,
                pickupDate: reverseShipment.pickupDate,
            };
            await shipment.save({ session });

            // Update order status
            await Order.updateOne(
                { _id: shipment.orderId },
                {
                    currentStatus: 'rto_initiated',
                    $push: {
                        statusHistory: {
                            status: 'rto_initiated',
                            timestamp: new Date(),
                            comment: `RTO initiated: ${reason}`,
                        },
                    },
                },
                { session }
            );

            await session.commitTransaction();

            logger.info('RTO triggered successfully', {
                shipmentId,
                reverseAwb,
            });

            return { reverseAwb };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
```

**Time Breakdown:**
- Courier client service: 12h
- RTO service integration: 8h
- Address update integration: 6h
- NDR integration: 6h
- Shipment service integration: 6h
- Testing: 12h

#### 3.2: Inventory Service Integration (30h - Developer B)

**Services to Fix:**

1. `shopify-webhook.service.ts` (5 TODOs)
2. `flipkart-webhook.service.ts` (5 TODOs)
3. `amazon-order-sync.service.ts` (5 TODOs)
4. `woocommerce-webhook.service.ts` (5 TODOs)
5. `shopify-inventory-sync.service.ts` (5 TODOs)

**Implementation:**

```typescript
// File: core/application/services/warehouse/inventory.service.ts

export class InventoryService {
    /**
     * Adjust stock quantity with reason tracking
     */
    static async adjustStock(
        sku: string,
        quantity: number,
        reason: 'order_created' | 'order_cancelled' | 'rto' | 'manual' | 'sync',
        session?: ClientSession
    ): Promise<void> {
        try {
            const inventory = await Inventory.findOne({ sku }).session(session);

            if (!inventory) {
                // Create if doesn't exist (marketplace sync scenario)
                await Inventory.create([{
                    sku,
                    quantity,
                    lastUpdated: new Date(),
                    updateReason: reason,
                }], { session });

                logger.info('Inventory created', { sku, quantity, reason });
                return;
            }

            // Update quantity
            inventory.quantity += quantity;
            inventory.lastUpdated = new Date();
            inventory.updateReason = reason;

            // Track in history
            inventory.history.push({
                quantity,
                reason,
                timestamp: new Date(),
                balanceAfter: inventory.quantity,
            });

            await inventory.save({ session });

            logger.info('Inventory adjusted', {
                sku,
                adjustment: quantity,
                newQuantity: inventory.quantity,
                reason,
            });

            // Alert if low stock
            if (inventory.quantity < inventory.reorderLevel) {
                // TODO: Send low stock alert
            }

        } catch (error) {
            logger.error('Failed to adjust stock', { sku, error });
            throw error;
        }
    }
}
```

**Update Webhook Services:**

```typescript
// File: core/application/services/shopify/shopify-webhook.service.ts

import { InventoryService } from '@/services/warehouse/inventory.service';

export class ShopifyWebhookService {
    async handleOrderCreated(order: ShopifyOrder) {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            // Create order in our system
            const newOrder = await Order.create([{
                ...orderData
            }], { session });

            // BEFORE: TODO comment
            // // TODO: Update inventory

            // AFTER: Real inventory update
            for (const item of order.line_items) {
                await InventoryService.adjustStock(
                    item.sku,
                    -item.quantity, // Decrease stock
                    'order_created',
                    session
                );
            }

            await session.commitTransaction();

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async handleOrderCancelled(order: ShopifyOrder) {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            // Update order status
            await Order.updateOne(
                { shopifyOrderId: order.id },
                { status: 'cancelled' },
                { session }
            );

            // BEFORE: TODO comment
            // AFTER: Restore inventory
            for (const item of order.line_items) {
                await InventoryService.adjustStock(
                    item.sku,
                    item.quantity, // Restore stock
                    'order_cancelled',
                    session
                );
            }

            await session.commitTransaction();

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
```

**Time Breakdown:**
- Inventory service enhancement: 6h
- Shopify webhook (5 instances): 5h
- Flipkart webhook (5 instances): 5h
- Amazon sync (5 instances): 5h
- WooCommerce webhook (5 instances): 5h
- Testing: 4h

### Week 4: Remaining Integrations (80h)

#### 4.1: Rate Card Integration (20h - Developer A)

**Services to Fix:**

1. `rto.service.ts` - `calculateRTOCharges()`
2. `shipment.service.ts` - `calculateShippingCost()`

**Implementation:**

```typescript
// File: core/application/services/shipping/rate-card.service.ts

export class RateCardService {
    /**
     * Calculate shipping/RTO charges based on weight and zone
     */
    static async calculateCharge(params: {
        weight: number;
        zone: string;
        serviceType: 'forward' | 'rto';
        courierName?: string;
    }): Promise<number> {
        const { weight, zone, serviceType, courierName } = params;

        // Find applicable rate card
        const rateCard = await RateCard.findOne({
            serviceType,
            ...(courierName && { courierName }),
            isActive: true,
        });

        if (!rateCard) {
            throw new AppError(
                `No rate card found for ${serviceType}`,
                'RATE_CARD_NOT_FOUND',
                404
            );
        }

        // Find weight slab
        const weightSlab = rateCard.slabs.find(
            slab => weight >= slab.minWeight && weight <= slab.maxWeight
        );

        if (!weightSlab) {
            throw new AppError(
                `No rate slab for weight ${weight}kg`,
                'WEIGHT_SLAB_NOT_FOUND',
                404
            );
        }

        // Get zone-specific rate
        const zoneRate = weightSlab.rates[zone];

        if (!zoneRate) {
            throw new AppError(
                `No rate for zone ${zone}`,
                'ZONE_RATE_NOT_FOUND',
                404
            );
        }

        logger.info('Rate calculated', {
            weight,
            zone,
            serviceType,
            rate: zoneRate,
        });

        return zoneRate;
    }
}
```

**Update Services:**

```typescript
// File: core/application/services/rto/rto.service.ts

// BEFORE
const charge = 50; // Hardcoded!

// AFTER
const charge = await RateCardService.calculateCharge({
    weight: shipment.weight,
    zone: shipment.zone,
    serviceType: 'rto',
});
```

**Time:** 20h (service + integrations + tests)

#### 4.2: Notification Integration (20h - Developer B)

**Services to Fix:**

- Weight dispute services (5)
- Commission services (3)
- Wallet services (2)
- NDR services (2)

**Implementation:**

```typescript
// File: core/application/services/communication/notification.service.ts

export class NotificationService {
    /**
     * Send notification via email
     */
    static async send(params: {
        to: string;
        template: string;
        data: Record<string, any>;
        cc?: string[];
    }): Promise<void> {
        try {
            await EmailService.sendEmail({
                to: params.to,
                cc: params.cc,
                subject: this.getSubject(params.template),
                template: params.template,
                data: params.data,
            });

            logger.info('Notification sent', {
                to: params.to,
                template: params.template,
            });

        } catch (error) {
            logger.error('Failed to send notification', {
                to: params.to,
                error: error.message,
            });

            // Don't throw - notifications are non-critical
            // Log and continue
        }
    }

    private static getSubject(template: string): string {
        const subjects = {
            'dispute_detected': 'Weight Dispute Detected',
            'dispute_resolved': 'Weight Dispute Resolved',
            'commission_approved': 'Commission Approved',
            'wallet_low_balance': 'Low Wallet Balance Alert',
            'ndr_action_required': 'NDR - Action Required',
        };

        return subjects[template] || 'Notification';
    }
}
```

**Update Services:**

```typescript
// BEFORE
// TODO: Notify seller (Phase 5)

// AFTER
await NotificationService.send({
    to: seller.email,
    template: 'dispute_resolved',
    data: {
        disputeId: dispute._id,
        outcome: dispute.resolution,
        amount: dispute.amount,
    },
});
```

**Time:** 20h (templates + integrations + tests)

#### 4.3: Other Integrations (20h - Both)

**Remaining Items:**

1. SKU validation in product mapping (4 services)
2. Warehouse contact loading (warehouse notification)
3. Customer sync (marketplace services)

**Time:** 20h

#### 4.4: Integration Testing (20h - Both)

**End-to-End Tests:**

```typescript
// tests/integration/rto-flow.test.ts

describe('RTO Flow Integration', () => {
    it('should complete full RTO flow with real APIs', async () => {
        // 1. Create shipment
        const shipment = await createTestShipment();

        // 2. Trigger RTO
        const rto = await RTOService.triggerRTO(shipment._id, 'Customer refused');

        // 3. Verify courier API called
        expect(rto.reverseAwb).toMatch(/^[A-Z0-9]+$/);

        // 4. Verify order updated
        const order = await Order.findOne({ _id: shipment.orderId });
        expect(order.currentStatus).toBe('rto_initiated');

        // 5. Verify charges calculated
        expect(rto.charge).toBeGreaterThan(0);

        // 6. Verify wallet debited
        const wallet = await Wallet.findOne({ companyId: order.companyId });
        expect(wallet.balance).toBeLessThan(initialBalance);
    });
});
```

**Time:** 20h (end-to-end flows)

### Verification Checklist (Week 3-4)

```bash
# Run integration verification
./scripts/verify-phase3.sh
```

**Checks:**
- ✅ 0 "for now" comments
- ✅ 0 "mock" implementations
- ✅ All courier APIs called (not mocked)
- ✅ All inventory updates execute
- ✅ All rate calculations use RateCardService
- ✅ All notifications sent
- ✅ Integration tests pass (>90% coverage)

**Metrics:**
- Mocks eliminated: 107/107
- Integration tests: >90% coverage
- End-to-end flows: All passing

---

## Phase 4: Testing & Quality (Week 5 - 80 hours)

**Goal:** Achieve >90% test coverage + resolve remaining TODOs

### 4.1: Unit Tests for Services Without Tests (48 services)

**Priority Breakdown:**

| Priority | Services | Time |
|----------|----------|------|
| P1 (Financial/Critical) | 15 | 45h |
| P2 (Features) | 20 | 20h |
| P3 (Lower) | 13 | 10h |

**Testing Pattern:**

```typescript
// tests/unit/services/commission/commission-calculation.service.test.ts

import { CommissionCalculationService } from '@/services/commission/commission-calculation.service';
import { Order } from '@/models';

describe('CommissionCalculationService', () => {
    beforeEach(async () => {
        await setupTestDatabase();
    });

    afterEach(async () => {
        await cleanupTestDatabase();
    });

    describe('calculateCommission', () => {
        it('should calculate correct commission for tier 1', async () => {
            // Arrange
            const order = await Order.create({
                amount: 10000,
                sellerId: 'seller123',
            });

            // Act
            const commission = await CommissionCalculationService.calculate(order._id);

            // Assert
            expect(commission.amount).toBe(500); // 5% of 10000
            expect(commission.tier).toBe(1);
        });

        it('should handle transaction rollback on error', async () => {
            // Arrange
            const order = await Order.create({ amount: 10000 });
            jest.spyOn(Commission, 'create').mockRejectedValue(new Error('DB error'));

            // Act & Assert
            await expect(
                CommissionCalculationService.calculate(order._id)
            ).rejects.toThrow();

            // Verify no partial data saved
            const commissions = await Commission.find({ orderId: order._id });
            expect(commissions).toHaveLength(0);
        });
    });
});
```

**Daily Execution (Week 5):**

**Day 1-2 (32h):**
- Developer A: P1 services #1-8 (24h)
- Developer B: P1 services #9-15 (21h)

**Day 3 (16h):**
- Developer A: P2 services #1-10 (10h)
- Developer B: P2 services #11-20 (10h)

**Day 4 (16h):**
- Developer A: P3 services #1-7 (5h) + Resolve critical TODOs (8h)
- Developer B: P3 services #8-13 (5h) + Add error handling to 7 services (7h)

**Day 5 (16h):**
- Both: Code review, coverage verification, documentation (8h each)

### 4.2: Resolve Remaining TODOs (40 total)

**Already resolved in Phases 1-3:** ~25 TODOs
**Remaining:** ~15 TODOs

**Categories:**

1. **Analytics TODOs (5)** - Low priority, can be deferred
2. **Feature TODOs (10)** - Resolve this week

**Pattern:**

```typescript
// BEFORE
// TODO: Add seasonal detection

// AFTER
async detectSeasonalPatterns() {
    const monthlyData = await this.getMonthlyRevenue();

    // Simple seasonal detection: compare YoY
    const patterns = monthlyData.map((month, i) => {
        const prevYear = monthlyData[i - 12];
        if (!prevYear) return null;

        return {
            month: month.month,
            growth: ((month.revenue - prevYear.revenue) / prevYear.revenue) * 100,
            seasonal: Math.abs(growth) > 20, // >20% change = seasonal
        };
    }).filter(Boolean);

    return patterns;
}
```

### Verification Checklist (Week 5)

```bash
# Run coverage check
./scripts/check-coverage.sh
```

**Metrics:**
- Test coverage: >90%
- TODOs remaining: <5 (only deferred analytics)
- Services with error handling: 100%

---

## Phase 5: Deployment & Verification (Week 6 - 80 hours)

**Goal:** Deploy all fixes to production with zero downtime

### 5.1: Integration Testing (30h)

**End-to-End Flows:**

1. **Order to Delivery Flow (8h)**
   - Create order → Update inventory → Create shipment → Track → Deliver
   - Verify: All steps atomic, no data loss

2. **RTO Flow (8h)**
   - Trigger RTO → Create reverse shipment → Debit wallet → Update order
   - Verify: Real courier API, correct charges, order synced

3. **Commission Flow (8h)**
   - Order delivered → Calculate commission → Approve → Payout
   - Verify: Correct calculations, atomic transactions

4. **Marketplace Sync (6h)**
   - Shopify order → Create in system → Update inventory
   - Verify: All marketplaces work, inventory accurate

### 5.2: Staging Deployment (20h)

**Steps:**

1. **Deploy to Staging (4h)**
   ```bash
   # Deploy all changes
   git checkout main
   git pull origin main
   git checkout fix/backend-gaps
   git rebase main

   # Deploy to staging
   npm run deploy:staging
   ```

2. **Smoke Tests (8h)**
   - Test all critical flows manually
   - Verify authorization on all endpoints
   - Test real courier API integration
   - Verify inventory updates
   - Test notifications

3. **Performance Testing (8h)**
   - Load test: 1000 concurrent requests
   - Verify: No performance degradation
   - Verify: Transaction overhead acceptable (<10% slowdown)

### 5.3: Production Deployment (30h)

**Gradual Rollout:**

**Day 1 (8h):**
- Deploy Phase 1 fixes (transactions)
- Monitor for 24 hours
- Rollback if issues

**Day 2 (8h):**
- Deploy Phase 2 fixes (authorization)
- Monitor for 24 hours
- Verify no unauthorized access

**Day 3 (8h):**
- Deploy Phase 3 fixes (integrations)
- Monitor courier API calls
- Verify inventory updates

**Day 4 (6h):**
- Full production deployment
- Monitor all metrics
- Final verification

### Verification Checklist (Week 6)

**Final Checks:**
- ✅ All 267 gaps closed
- ✅ 0 critical bugs in production
- ✅ Test coverage >90%
- ✅ Authorization on all endpoints
- ✅ Transactions on all multi-model operations
- ✅ All integrations working (not mocked)
- ✅ Performance acceptable

---

## Daily Execution Pattern

### Morning Routine (30 min)

```bash
# 1. Pull latest changes
git pull origin fix/backend-gaps

# 2. Run tests
npm test

# 3. Check verification
./scripts/verify-current-phase.sh

# 4. Review today's tasks
cat tracking/daily-plan-$(date +%Y-%m-%d).md
```

### Work Session (3-4 hours per service)

**Step 1: Understand (30 min)**
- Read service code
- Identify all gaps
- Review dependencies

**Step 2: Plan (30 min)**
- List changes needed
- Identify test cases
- Check for side effects

**Step 3: Implement (2 hours)**
- Add transactions (if needed)
- Add authorization (if needed)
- Replace mocks
- Resolve TODOs
- Add error handling

**Step 4: Test (1 hour)**
- Write unit tests
- Run integration tests
- Manual testing

**Step 5: Document (30 min)**
- Update service docs
- Add JSDoc comments
- Update changelog

**Step 6: Review (30 min)**
- Self-review checklist
- Create PR
- Request code review

### End of Day (30 min)

```bash
# 1. Commit changes
git add .
git commit -m "feat: Fix gaps in service.ts - transactions, auth, mocks"

# 2. Update tracking
./scripts/update-progress.sh

# 3. Write daily report
./scripts/generate-daily-report.sh > reports/daily-$(date +%Y-%m-%d).md

# 4. Plan tomorrow
./scripts/plan-tomorrow.sh
```

---

## Success Metrics

### Weekly Targets

| Week | Phase | Target | Measurement |
|------|-------|--------|-------------|
| 1 | Data Integrity | 20 services with transactions | `verify-transactions.sh` |
| 2 | Security | 36 controllers authorized | `verify-auth.sh` |
| 3-4 | Integrations | 0 mocks remaining | `verify-integrations.sh` |
| 5 | Testing | >90% coverage | `check-coverage.sh` |
| 6 | Production | Zero downtime deploy | Manual verification |

### Final Success Criteria

**Code Quality:**
- ✅ 0 untracked TODOs
- ✅ 0 mock/placeholder code
- ✅ 0 services without error handling
- ✅ >90% test coverage (critical services)
- ✅ 100% services with docs

**Security:**
- ✅ 100% controllers with authorization
- ✅ 0 unauthorized access possible
- ✅ Audit logs for all auth failures
- ✅ Rate limiting on public endpoints

**Data Integrity:**
- ✅ 100% multi-model operations use transactions
- ✅ 0 data inconsistencies in production
- ✅ Transaction rollback tested

**Integrations:**
- ✅ All courier APIs integrated (real, not mock)
- ✅ All inventory updates execute
- ✅ All notifications sent
- ✅ All rate calculations use RateCardService

---

## Risk Mitigation

### High-Risk Changes

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing functionality | HIGH | CRITICAL | Comprehensive regression testing |
| API integration failures | MEDIUM | HIGH | Robust error handling + fallbacks |
| Transaction deadlocks | MEDIUM | HIGH | Short transaction duration, retries |
| Performance degradation | LOW | MEDIUM | Load testing before production |

### Rollback Plan

**Per-Phase Rollback:**

```bash
# If Week 1 (transactions) causes issues:
git revert <commit-range-week-1>
npm run deploy:production

# Database rollback (if needed):
npm run migrate:down -- --to=<version-before-week-1>
```

**Feature Flags:**

```typescript
// Use feature flags for risky integrations
if (FeatureFlags.isEnabled('use_real_courier_api')) {
    return await courierClient.createReverseShipment(data);
} else {
    return { reverseAwb: `MOCK-${awb}` }; // Fallback
}
```

---

## Tracking & Reporting

### Daily Standup (10 min)

**Template:**

```markdown
## Developer A

**Yesterday:**
- ✅ commission-approval.service.ts (6h)
  - Added transactions
  - Added authorization
  - Tests: 85% coverage
  - Gaps closed: 3 critical

**Today:**
- Plan: commission-calculation.service.ts (4h)
- Expected: Close 2 critical gaps

**Blockers:**
- None
```

### Weekly Report (30 min)

**Template:**

```markdown
# Week 1 Progress Report

## Summary
- Services fixed: 20/20 ✅
- Gaps closed: 60 (transactions: 20, TODOs: 15, mocks: 25)
- Test coverage: 85%
- Time spent: 78h (under 80h budget)

## Highlights
- All financial services now use transactions
- Zero data inconsistencies in staging tests
- Commission flow fully tested

## Issues
- Minor delay on rto.service.ts (courier API integration complexity)
- Resolved with additional 2h

## Next Week
- Focus: Authorization (Week 2)
- Target: Secure all 36 controllers
```

---

## Next Steps

### This Week (Preparation)

**Day 1 (Today):**
- ✅ Create all templates
- ✅ Create verification scripts
- ✅ Setup tracking spreadsheet

**Day 2-3:**
- Manual review of top 5 services
- Document specific gaps
- Finalize estimates

**Day 4-5:**
- Start Week 1: Fix first 5 services
- Deploy to staging
- Verify in staging

### Future Weeks

Follow the phased plan:
- Week 1: Data Integrity
- Week 2: Security
- Week 3-4: Integrations
- Week 5: Testing
- Week 6: Production Deploy

---

## Appendix

### A. Templates Created

1. `scripts/templates/transaction-fix.template.ts`
2. `scripts/templates/auth-fix.template.ts`
3. `scripts/templates/integration-fix.template.ts`
4. `scripts/templates/error-handling.template.ts`
5. `scripts/templates/test-fix.template.ts`

### B. Verification Scripts

1. `scripts/verify-fixes.sh` - All gaps
2. `scripts/verify-transactions.sh` - Transaction compliance
3. `scripts/verify-auth.sh` - Authorization compliance
4. `scripts/verify-integrations.sh` - Integration completeness
5. `scripts/check-coverage.sh` - Test coverage

### C. Service Fix Checklist

```markdown
## Service: [name].service.ts

### Pre-Fix Audit
- [ ] Read code completely
- [ ] List all gaps (transactions, auth, mocks, TODOs)
- [ ] Identify dependencies
- [ ] Check if controller exists

### Implementation
- [ ] Add transaction support
- [ ] Add authorization (if controller exists)
- [ ] Replace mocks with real implementations
- [ ] Resolve all TODOs
- [ ] Add error handling

### Testing
- [ ] Write unit tests (>80% coverage)
- [ ] Write integration tests
- [ ] Manual testing
- [ ] Verify rollback on error

### Documentation
- [ ] Add SERVICE_TEMPLATE.md sections
- [ ] Add JSDoc to all methods
- [ ] Update changelog

### Review
- [ ] Self-review checklist
- [ ] Create PR
- [ ] Code review approved
- [ ] Deploy to staging
- [ ] Verify in staging
```

---

**Status:** 📋 READY TO EXECUTE
**Next Action:** Run Phase 0 preparation tasks
**Owner:** Development Team
**Start Date:** 2026-01-08
**Target Completion:** 2026-02-19 (6 weeks)


Your Assessment is 100% Correct
You've identified a fundamental problem: There are likely dozens of similar gaps throughout the server codebase where:
Methods log but don't actually execute
TODOs indicate incomplete implementations
Mock/placeholder code exists in production
Related models aren't updated together
Services aren't following the templates
This RTO service bug is just one example of a systemic issue.
The Real Problem
Your codebase has two conflicting realities:
Reality 1: Excellent Templates
SERVICE_TEMPLATE.md - Perfect service structure
Integration_Template.md - Complete API integration guide
Feature_Spec_Template.md - Proper feature planning
Reality 2: Incomplete Implementation
Services don't follow the templates
Integrations are mocked/stubbed
Related models update inconsistently
Authorization checks missing
Documentation incomplete
Result: The shipping aggregator cannot work properly until this gap is closed.
What You Should Do: A Clear 3-Step Plan
Step 1: Stop and Audit First (Week 1)
Don't start fixing yet. First, we need to know the full scope of the problem.
Task 1.1: Automated Gap Detection (Day 1-2)
Create a script to find ALL gaps automatically:

# File: scripts/audit-gaps.sh

echo "🔍 CODEBASE GAP AUDIT"
echo "===================="

# 1. Find all TODO comments
echo "\n📝 TODO Comments:"
grep -r "TODO" server/src --include="*.ts" | wc -l

# 2. Find placeholder/mock code
echo "\n🎭 Mock/Placeholder Code:"
grep -ri "for now\|mock\|placeholder" server/src --include="*.ts" | wc -l

# 3. Find log-only methods (methods that only log, no DB/API calls)
echo "\n📋 Potential Log-Only Methods:"
grep -A 5 "logger\.info\|logger\.debug" server/src --include="*.ts" | grep -B 5 "^}" | wc -l

# 4. Find services without proper docs
echo "\n📚 Services Missing Documentation:"
find server/src -name "*.service.ts" -exec sh -c '
  if ! grep -q "Purpose:" "$1"; then
    echo "$1"
  fi
' sh {} \;

# 5. Find controllers missing authorization
echo "\n🔒 Missing Authorization Checks:"
grep -L "requireRole\|authorize" server/src/presentation/http/controllers/**/*.ts

# 6. Find transactions that should exist but don't
echo "\n💳 Missing Transactions (multi-model updates):"
grep -A 10 "await.*\.update\|await.*\.create" server/src --include="*.ts" | \
grep -B 10 -v "session\|withTransaction"
Run this script and get numbers:

chmod +x scripts/audit-gaps.sh
./scripts/audit-gaps.sh > gaps-audit-2026-01-07.txt
Task 1.2: Manual Service Review (Day 3-5)
Review critical services manually against templates: Priority Services to Review:
RTOService ✅ (already found gaps)
OrderService
ShipmentService
WalletService
CommissionService
WeightDisputeService
NDRService
All 5 marketplace webhook services
Review Checklist (per service):

## ServiceName Review

### Template Compliance
- [ ] Has Purpose section (SERVICE_TEMPLATE.md §12-15)
- [ ] All methods documented (SERVICE_TEMPLATE.md §18-64)
- [ ] Business rules documented (SERVICE_TEMPLATE.md §67-80)
- [ ] Error handling defined (SERVICE_TEMPLATE.md §92-106)
- [ ] Dependencies listed (SERVICE_TEMPLATE.md §134-148)
- [ ] Tests exist (SERVICE_TEMPLATE.md §109-131)

### Implementation Completeness
- [ ] No TODO comments without tickets
- [ ] No mock/placeholder code
- [ ] All methods have DB/API calls (not just logs)
- [ ] Related models updated in transactions
- [ ] External APIs actually called

### Gaps Found
1. Line X: Method only logs, doesn't update Order
2. Line Y: Mock courier API, not real integration
3. ...

### Estimated Fix Time
- Critical gaps: X hours
- Medium gaps: Y hours
- Total: Z hours
Output: Create a spreadsheet:
Service	Template Compliance	Critical Gaps	Medium Gaps	Fix Time
RTOService	60%	5	3	10h
OrderService	?	?	?	?h
...	...	...	...	...
TOTAL		XX	YY	ZZh
Step 2: Create Master Fix Plan (End of Week 1)
Based on audit results, create ONE comprehensive plan:

# Master Gap Fix Plan

## Audit Summary
- Total Services: 45
- Services with gaps: 28 (62%)
- Critical gaps: 47
- Medium gaps: 83
- Total estimated fix time: 320 hours (8 weeks)

## Fix Strategy

### Phase 1: Data Consistency (Week 1-2, 80h)
**Goal:** Fix all related-model update gaps

Services:
1. RTOService - 10h
2. OrderService - 15h
3. WeightDisputeService - 12h
...

### Phase 2: Real Integrations (Week 3-4, 100h)
**Goal:** Replace all mocks with real API calls

Integrations:
1. Courier APIs (Velocity, Delhivery, etc.) - 40h
2. Rate card integration - 20h
3. Payment gateway - 15h
...

### Phase 3: Security (Week 5, 40h)
**Goal:** Add authorization to all admin endpoints

Controllers:
1. weight-disputes.controller.ts - 8h
2. commission.controller.ts - 6h
...

### Phase 4: Documentation (Week 6-7, 60h)
**Goal:** Bring all services to template compliance

Services:
1. All 28 services missing docs - 60h

### Phase 5: Testing (Week 8, 40h)
**Goal:** >90% coverage for critical services

Tests:
1. Integration tests for all fixed services
2. End-to-end tests for critical flows
Step 3: Execute Systematically (Week 2-9)
Don't try to fix everything at once. Follow the phased plan.
Execution Pattern (per service):
Read the service code (30 min)
Compare to template (30 min)
List all gaps (30 min)
Fix gaps one by one (varies)
Write tests (1-2 hours)
Update documentation (30 min)
Code review (1 hour)
Deploy to staging (1 hour)
Test in staging (1 hour)
Total per service: 6-10 hours
Why This Approach Works
✅ Advantages:
Systematic - You know exactly what to fix and when
Measurable - Track progress (5/28 services fixed)
Low-risk - Fix one service at a time, test thoroughly
Documented - Every fix follows the template
Complete - Nothing gets missed
❌ What NOT to do:
Don't try to fix everything in the current plan (too big)
Don't start coding before auditing (might miss things)
Don't skip testing (will create new bugs)
Don't work without templates (will be inconsistent)
Immediate Action Plan (Next 7 Days)
Day 1 (Today):
 Run automated gap detection script
 Review results, get total numbers
 Prioritize top 5 critical services
Day 2-3:
 Manual review of top 5 services
 Document all gaps found
 Estimate fix time for each
Day 4-5:
 Create master fix plan (like above)
 Get team buy-in on timeline
 Set up tracking spreadsheet
Day 6-7:
 Start fixing - Begin with RTOService
 Follow execution pattern above
 Document as you go
About the Current Plans
Backend Auth Plan (27 issues):
Status: Good, but subset of total problems Action: Keep as reference, but integrate into master plan
Frontend Plan (11 issues):
Status: Separate concern, keep as-is Action: Execute in parallel (different codebase)
Quality Checklist:
Status: Excellent! This is your standard going forward Action: Use this for EVERY service you fix
Implementation Gap Plan:
Status: Good framework, but needs actual audit data Action: Replace estimates with real numbers from audit
My Recommendation
Do this in order:
Week 1: Audit (find all gaps) ← START HERE
Week 2-9: Fix systematically (one service at a time)
Week 10: Frontend fixes (parallel track)
Week 11: Integration testing
Week 12: Production deployment
Don't:
Try to fix everything now
Skip the audit phase
Work without knowing the full scope
Questions to Answer Before Starting
How many developers are available for this?
1 developer: 12-16 weeks
2 developers: 6-8 weeks
3+ developers: 4-6 weeks
Can we pause new features during this time?
Yes → Faster, cleaner
No → Slower, riskier
Do we have a staging environment?
Yes → Safe to test
No → Need to create one first
What's the business deadline?
Strict deadline → Prioritize differently
Flexible → Follow optimal plan
Bottom Line
You are RIGHT: There are systematic gaps that must be fixed for the shipping aggregator to work properly. The solution is NOT:
The current massive implementation plan (too ambitious)
Trying to fix everything at once (will fail)
Ignoring the problem (aggregator won't work)
The solution IS:
Audit first (find all gaps)
Plan based on reality (actual numbers, not estimates)
Fix systematically (one service at a time)
Follow templates (ensure quality)
Test thoroughly (prevent new bugs)
What should you do RIGHT NOW? Exit plan mode, and I'll help you:
Create the audit script
Run it on your codebase
Analyze the results
Build a realistic master plan