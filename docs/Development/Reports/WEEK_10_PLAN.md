# Week 10 Implementation Plan: Sales Commission System

## Overview
Complete implementation of the Sales Commission System with automated calculation, tracking, payout processing, and analytics - approximately **7,300 lines of code** across **35+ files**.

**Current Status**: 0% implemented (greenfield development)

**Quality Target**: Match Week 9 analytics implementation quality (75%+ test coverage, production-ready security, comprehensive error handling)

---

## Architecture Overview

### Core Components
1. **Commission Rules Engine**: 5 rule types (percentage, flat, tiered, product-based, revenue-share)
2. **Calculation Engine**: Event-driven commission calculation on order lifecycle
3. **Approval Workflow**: PENDING → APPROVED → PAID with audit trail
4. **Payout Integration**: Razorpay Payouts API with TDS handling
5. **Analytics & Reporting**: Dashboard, trends, and multi-format exports

### Integration Points
- **Order System**: Event listeners on order.created, order.cancelled, order.updated, rto.completed
- **Wallet Service**: Payout tracking and fund management
- **Razorpay Gateway**: Fund account creation and payout processing
- **Analytics Infrastructure**: Reuse Week 9 base services and export patterns
- **Event System**: Subscribe to order lifecycle events

### Database Design
- **6 New Models**: CommissionRule, SalesRepresentative, CommissionTransaction, Payout, Lead, CommissionAdjustment
- **12+ Indexes**: Compound indexes for performance (following Week 9 patterns)
- **Audit Trail**: Full history tracking for compliance

---

## Day 1: Commission Rules & Configuration (~1,400 LOC)

### Objective
Implement commission rule management system with 5 rule types and hierarchical sales team structure.

### Files to Create

#### 1. Models (2 files)

**`/server/src/infrastructure/database/mongoose/models/CommissionRule.ts`** (~250 LOC)
```typescript
Schema Design:
- name: string (indexed)
- company: ObjectId (indexed, compound with isActive)
- ruleType: 'percentage' | 'flat' | 'tiered' | 'product-based' | 'revenue-share'
- isActive: boolean (default: true)
- priority: number (for stacking rules)
- applicableProducts: ObjectId[] (optional, for product-based)
- applicableCategories: string[] (optional)
- conditions: {
    minOrderValue?: number
    maxOrderValue?: number
    specificCustomers?: ObjectId[]
    orderStatuses?: string[]
  }
- percentageRate?: number (0-100, for percentage/revenue-share)
- flatAmount?: number (for flat)
- tiers?: Array<{ minValue: number, maxValue: number, rate: number }>
- effectiveFrom: Date
- effectiveTo: Date (optional)
- createdBy: ObjectId
- metadata: Object
- timestamps

Indexes:
- { company: 1, isActive: 1, priority: -1 }
- { company: 1, ruleType: 1 }
- { effectiveFrom: 1, effectiveTo: 1 }

Methods:
- isApplicable(order): boolean - Check if rule applies to order
- calculateCommission(orderValue): number - Calculate commission amount
- static findActiveRules(companyId, filters): Promise<CommissionRule[]>
```

**`/server/src/infrastructure/database/mongoose/models/SalesRepresentative.ts`** (~200 LOC)
```typescript
Schema Design:
- user: ObjectId (ref: User, indexed)
- company: ObjectId (indexed)
- employeeId: string (unique within company)
- role: 'rep' | 'team-lead' | 'manager' | 'director'
- territory: string[]
- reportingTo: ObjectId (self-reference)
- teamMembers: ObjectId[] (for managers)
- commissionRules: ObjectId[] (ref: CommissionRule)
- status: 'active' | 'inactive' | 'suspended'
- onboardingDate: Date
- kpiTargets: {
    monthlyRevenue?: number
    monthlyOrders?: number
    conversionRate?: number
  }
- performanceMetrics: {
    totalRevenue: number
    totalOrders: number
    totalCommission: number
    lastUpdated: Date
  }
- bankDetails: {
    accountNumber: string (encrypted)
    ifscCode: string
    accountHolderName: string
    bankName: string
  }
- razorpayFundAccountId: string
- metadata: Object
- timestamps

Indexes:
- { company: 1, status: 1 }
- { user: 1, company: 1 } (unique)
- { employeeId: 1, company: 1 } (unique)
- { reportingTo: 1 }

Methods:
- encryptBankDetails(): void
- decryptBankDetails(): BankDetails
- updatePerformanceMetrics(): Promise<void>
- static findByTerritory(companyId, territory): Promise<SalesRep[]>
```

#### 2. Services (2 files)

**`/server/src/core/application/services/commission/CommissionRuleService.ts`** (~350 LOC)
```typescript
Methods:
1. createRule(ruleData, userId, companyId): Promise<CommissionRule>
   - Validate rule configuration
   - Check for overlapping rules (warn if priority conflicts)
   - Create audit log entry
   - Return created rule

2. updateRule(ruleId, updates, userId, companyId): Promise<CommissionRule>
   - Verify ownership (company isolation)
   - Validate updates
   - Create audit log
   - Return updated rule

3. deleteRule(ruleId, userId, companyId): Promise<void>
   - Soft delete (set isActive: false)
   - Check for pending transactions using this rule
   - Create audit log

4. getRule(ruleId, companyId): Promise<CommissionRule>
   - Verify ownership
   - Return rule with populated relationships

5. listRules(companyId, filters, pagination): Promise<PaginatedResult>
   - Support filters: ruleType, isActive, effectiveFrom/To
   - Sort by priority DESC
   - Return paginated results

6. findApplicableRules(orderId, companyId): Promise<CommissionRule[]>
   - Fetch order details
   - Filter rules by conditions
   - Sort by priority
   - Return applicable rules

7. testRule(ruleId, testOrderData, companyId): Promise<TestResult>
   - Simulate commission calculation
   - Return breakdown without persisting
   - Useful for rule validation

Dependencies:
- CommissionRule model
- Order model
- AuditLogService
- Logger
```

**`/server/src/core/application/services/commission/SalesRepresentativeService.ts`** (~350 LOC)
```typescript
Methods:
1. createSalesRep(repData, companyId): Promise<SalesRepresentative>
   - Create User if not exists
   - Assign 'salesperson' role
   - Encrypt bank details
   - Create Razorpay fund account (async)
   - Return sales rep

2. updateSalesRep(repId, updates, companyId): Promise<SalesRepresentative>
   - Verify ownership
   - Update bank details if changed (re-encrypt)
   - Update Razorpay fund account if needed
   - Return updated rep

3. deleteSalesRep(repId, companyId): Promise<void>
   - Check for pending commissions
   - Set status: 'inactive'
   - Create audit log

4. getSalesRep(repId, companyId): Promise<SalesRepresentative>
   - Populate user, reportingTo, teamMembers
   - Decrypt bank details if requested
   - Return rep

5. listSalesReps(companyId, filters, pagination): Promise<PaginatedResult>
   - Filter by status, role, territory
   - Sort by onboardingDate DESC
   - Return paginated results

6. updatePerformanceMetrics(repId, companyId): Promise<void>
   - Aggregate commission transactions
   - Update totalRevenue, totalOrders, totalCommission
   - Cache results in rep document

7. assignTerritory(repId, territories, companyId): Promise<void>
   - Validate territory format
   - Update rep territories
   - Log assignment change

Dependencies:
- SalesRepresentative model
- User model
- RazorpayPayoutProvider
- CryptoService
- Logger
```

#### 3. Controllers (2 files)

**`/server/src/presentation/http/controllers/commission/commission-rule.controller.ts`** (~250 LOC)
```typescript
Endpoints (7):
1. POST /commission/rules - Create rule
   - Auth: admin, manager
   - Body validation: createCommissionRuleSchema
   - Return: 201 with rule

2. GET /commission/rules - List rules
   - Auth: authenticated
   - Query validation: listRulesQuerySchema
   - Return: 200 with paginated rules

3. GET /commission/rules/:id - Get rule by ID
   - Auth: authenticated
   - Return: 200 with rule

4. PUT /commission/rules/:id - Update rule
   - Auth: admin, manager
   - Body validation: updateCommissionRuleSchema
   - Return: 200 with updated rule

5. DELETE /commission/rules/:id - Delete rule
   - Auth: admin
   - Return: 200 with success message

6. POST /commission/rules/:id/test - Test rule on sample order
   - Auth: admin, manager
   - Body validation: testRuleSchema
   - Return: 200 with calculation breakdown

7. GET /commission/rules/applicable/:orderId - Find applicable rules for order
   - Auth: authenticated
   - Return: 200 with applicable rules array

Pattern: Follow Week 9 analytics controller pattern with guardChecks
```

**`/server/src/presentation/http/controllers/commission/sales-representative.controller.ts`** (~300 LOC)
```typescript
Endpoints (8):
1. POST /commission/sales-reps - Create sales rep
   - Auth: admin, manager
   - Body validation: createSalesRepSchema
   - Return: 201 with sales rep

2. GET /commission/sales-reps - List sales reps
   - Auth: authenticated
   - Query validation: listSalesRepsQuerySchema
   - Return: 200 with paginated reps

3. GET /commission/sales-reps/:id - Get sales rep
   - Auth: authenticated (or self)
   - Return: 200 with sales rep

4. PUT /commission/sales-reps/:id - Update sales rep
   - Auth: admin, manager (or self for limited fields)
   - Body validation: updateSalesRepSchema
   - Return: 200 with updated rep

5. DELETE /commission/sales-reps/:id - Deactivate sales rep
   - Auth: admin
   - Return: 200 with success message

6. GET /commission/sales-reps/:id/performance - Get performance metrics
   - Auth: authenticated (or self)
   - Query: dateRange
   - Return: 200 with metrics

7. PUT /commission/sales-reps/:id/territory - Assign territory
   - Auth: admin, manager
   - Body validation: assignTerritorySchema
   - Return: 200 with success

8. POST /commission/sales-reps/:id/refresh-metrics - Refresh cached metrics
   - Auth: admin, manager
   - Return: 200 with updated metrics

Pattern: Company isolation, role-based access, Zod validation
```

#### 4. Validation Schemas (1 file)

**`/server/src/shared/validation/commission-schemas.ts`** (~200 LOC)
```typescript
Schemas:
- createCommissionRuleSchema
- updateCommissionRuleSchema
- listRulesQuerySchema
- testRuleSchema
- createSalesRepSchema
- updateSalesRepSchema
- listSalesRepsQuerySchema
- assignTerritorySchema

Use Zod with custom error messages, following Week 9 patterns
```

#### 5. Routes (2 files)

**`/server/src/presentation/http/routes/v1/commission/commission-rules.routes.ts`** (~50 LOC)
**`/server/src/presentation/http/routes/v1/commission/sales-representatives.routes.ts`** (~50 LOC)

Standard Express router setup with authentication middleware

### Testing (Day 1)

**Test Files** (~250 LOC total):
- `/server/tests/unit/services/commission/CommissionRuleService.test.ts`
- `/server/tests/unit/services/commission/SalesRepresentativeService.test.ts`
- `/server/tests/integration/commission/commission-rules.test.ts`

Coverage target: 75%+

---

## Day 2: Commission Calculation Engine (~1,600 LOC)

### Objective
Implement event-driven commission calculation with optimistic locking, audit trail, and approval workflow.

### Files to Create

#### 1. Model (1 file)

**`/server/src/infrastructure/database/mongoose/models/CommissionTransaction.ts`** (~300 LOC)
```typescript
Schema Design:
- transactionId: string (unique, auto-generated)
- company: ObjectId (indexed)
- salesRepresentative: ObjectId (ref, indexed)
- order: ObjectId (ref, indexed)
- commissionRule: ObjectId (ref)
- calculatedAmount: number (2 decimal precision)
- finalAmount: number (after adjustments)
- status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled'
- calculationDetails: {
    ruleType: string
    baseValue: number
    rateOrAmount: number
    breakdown: Object
  }
- adjustments: Array<{
    reason: string
    amount: number
    adjustedBy: ObjectId
    adjustedAt: Date
  }>
- approvalHistory: Array<{
    action: 'approved' | 'rejected'
    approvedBy: ObjectId
    approvedAt: Date
    notes: string
  }>
- payoutId: ObjectId (ref: Payout, optional)
- metadata: {
    orderDate: Date
    orderValue: number
    productIds: ObjectId[]
    customerId: ObjectId
  }
- version: number (for optimistic locking)
- timestamps

Indexes:
- { company: 1, status: 1 }
- { salesRepresentative: 1, status: 1 }
- { order: 1 } (unique)
- { transactionId: 1 } (unique)
- { createdAt: -1 }
- { company: 1, createdAt: -1 }

Methods:
- approve(userId, notes): Promise<void>
- reject(userId, notes): Promise<void>
- addAdjustment(amount, reason, userId): Promise<void>
- calculateFinalAmount(): number
- static findPendingTransactions(companyId, filters): Promise<Transaction[]>
- static aggregateByRep(companyId, dateRange): Promise<Aggregation[]>
```

#### 2. Services (1 major file)

**`/server/src/core/application/services/commission/CommissionCalculationService.ts`** (~500 LOC)
```typescript
Methods:
1. calculateCommission(orderId, companyId): Promise<CommissionTransaction>
   - Fetch order details with products
   - Find sales rep associated with order
   - Find applicable commission rules
   - Calculate commission using highest priority rule
   - Handle stacking rules if enabled
   - Create CommissionTransaction with PENDING status
   - Return transaction

2. recalculateCommission(transactionId, companyId): Promise<CommissionTransaction>
   - Verify transaction not yet paid
   - Re-run calculation logic
   - Update transaction with new amount
   - Increment version (optimistic locking)
   - Create audit log
   - Return updated transaction

3. applyRuleToOrder(rule, order): number
   - Switch by ruleType:
     - percentage: order.totalAmount * (rule.percentageRate / 100)
     - flat: rule.flatAmount
     - tiered: find tier by order.totalAmount, apply rate
     - product-based: sum(product.price * rule.productRates[productId])
     - revenue-share: (order.totalAmount - order.costs) * (rule.percentageRate / 100)
   - Return calculated amount

4. handleOrderEvent(eventType, orderData): Promise<void>
   - Event listeners:
     - order.created: calculateCommission()
     - order.cancelled: cancelCommission()
     - order.updated: recalculateIfNeeded()
     - rto.completed: handleRTOCommission()
   - Async processing with error handling

5. cancelCommission(orderId, reason, companyId): Promise<void>
   - Find transaction by orderId
   - Verify status is PENDING or APPROVED (not PAID)
   - Set status: 'cancelled'
   - Create audit log
   - Notify sales rep

6. bulkCalculate(orderIds, companyId): Promise<BulkResult>
   - Process orders in batches (100 at a time)
   - Use Promise.allSettled for error isolation
   - Return success/failure report
   - Log errors for manual review

7. getCommissionBreakdown(transactionId, companyId): Promise<Breakdown>
   - Fetch transaction with populated refs
   - Return detailed breakdown:
     - Base amount
     - Rule applied
     - Adjustments
     - Final amount
     - Status history

8. validateCalculation(transactionId, companyId): Promise<ValidationResult>
   - Re-run calculation
   - Compare with stored amount
   - Flag discrepancies
   - Return validation report

Dependencies:
- CommissionTransaction model
- CommissionRule model
- SalesRepresentative model
- Order model
- EventEmitter
- Logger
- AuditLogService
```

#### 3. Service (Approval Workflow)

**`/server/src/core/application/services/commission/CommissionApprovalService.ts`** (~350 LOC)
```typescript
Methods:
1. approveTransaction(transactionId, userId, companyId, notes?): Promise<void>
   - Verify transaction status is PENDING
   - Verify user has approval permission
   - Update status to APPROVED
   - Add approval history entry
   - Emit 'commission.approved' event
   - Notify sales rep

2. rejectTransaction(transactionId, userId, companyId, notes): Promise<void>
   - Verify transaction status is PENDING
   - Update status to REJECTED
   - Add approval history entry
   - Emit 'commission.rejected' event
   - Notify sales rep with reason

3. bulkApprove(transactionIds, userId, companyId): Promise<BulkResult>
   - Validate all transactions belong to company
   - Process in parallel
   - Return success/failure report

4. bulkReject(transactionIds, userId, companyId, reason): Promise<BulkResult>
   - Validate all transactions
   - Process in parallel
   - Return report

5. addAdjustment(transactionId, adjustmentData, userId, companyId): Promise<void>
   - Verify transaction not yet paid
   - Add adjustment to array
   - Recalculate finalAmount
   - Increment version
   - Create audit log

6. getPendingApprovals(companyId, filters, pagination): Promise<PaginatedResult>
   - Filter by status: PENDING
   - Support date range, sales rep filters
   - Sort by createdAt ASC (oldest first)
   - Return paginated results

Dependencies:
- CommissionTransaction model
- NotificationService
- EventEmitter
- AuditLogService
```

#### 4. Event Listeners (1 file)

**`/server/src/core/application/events/commission/commission.events.ts`** (~200 LOC)
```typescript
Event Handlers:
- order.created → calculateCommission()
- order.cancelled → cancelCommission()
- order.updated → recalculateIfNeeded()
- rto.completed → handleRTOCommission()

Setup:
- Subscribe to EventEmitter
- Async processing with retries
- Error logging and alerting
- Idempotency checks (prevent duplicate calculations)
```

#### 5. Controller (1 file)

**`/server/src/presentation/http/controllers/commission/commission-calculation.controller.ts`** (~350 LOC)
```typescript
Endpoints (13):
1. POST /commission/calculate/:orderId - Manual calculation trigger
   - Auth: admin, manager
   - Return: 201 with transaction

2. GET /commission/transactions - List transactions
   - Auth: authenticated (sales reps see only theirs)
   - Query: status, dateRange, salesRepId, pagination
   - Return: 200 with paginated transactions

3. GET /commission/transactions/:id - Get transaction
   - Auth: authenticated (ownership check)
   - Return: 200 with transaction

4. POST /commission/transactions/:id/recalculate - Recalculate
   - Auth: admin, manager
   - Return: 200 with updated transaction

5. POST /commission/transactions/:id/approve - Approve
   - Auth: admin, manager
   - Body: { notes?: string }
   - Return: 200 with success

6. POST /commission/transactions/:id/reject - Reject
   - Auth: admin, manager
   - Body: { reason: string }
   - Return: 200 with success

7. POST /commission/transactions/bulk-approve - Bulk approve
   - Auth: admin, manager
   - Body: { transactionIds: string[] }
   - Return: 200 with bulk result

8. POST /commission/transactions/bulk-reject - Bulk reject
   - Auth: admin, manager
   - Body: { transactionIds: string[], reason: string }
   - Return: 200 with bulk result

9. POST /commission/transactions/:id/adjust - Add adjustment
   - Auth: admin
   - Body: { amount: number, reason: string }
   - Return: 200 with updated transaction

10. GET /commission/transactions/:id/breakdown - Detailed breakdown
    - Auth: authenticated (ownership check)
    - Return: 200 with breakdown

11. POST /commission/transactions/:id/validate - Validate calculation
    - Auth: admin, manager
    - Return: 200 with validation result

12. GET /commission/pending-approvals - Get pending approvals
    - Auth: admin, manager
    - Query: pagination, filters
    - Return: 200 with pending transactions

13. POST /commission/bulk-calculate - Bulk calculate for orders
    - Auth: admin
    - Body: { orderIds: string[] }
    - Return: 200 with bulk result

Pattern: Company isolation, role-based access, optimistic locking
```

#### 6. Validation Schemas (update file)

**`/server/src/shared/validation/commission-schemas.ts`** (add ~100 LOC)
```typescript
New schemas:
- approveTransactionSchema
- rejectTransactionSchema
- bulkApproveSchema
- bulkRejectSchema
- addAdjustmentSchema
- listTransactionsQuerySchema
```

#### 7. Routes (1 file)

**`/server/src/presentation/http/routes/v1/commission/commission-transactions.routes.ts`** (~100 LOC)

### Testing (Day 2)

**Test Files** (~400 LOC total):
- `/server/tests/unit/services/commission/CommissionCalculationService.test.ts`
- `/server/tests/unit/services/commission/CommissionApprovalService.test.ts`
- `/server/tests/integration/commission/commission-calculation.test.ts`
- `/server/tests/integration/commission/commission-approval.test.ts`

Coverage target: 75%+

---

## Day 3: Payout Processing (~1,500 LOC)

### Objective
Integrate Razorpay Payouts API for automated commission payouts with TDS handling and reconciliation.

### Files to Create

#### 1. Model (1 file)

**`/server/src/infrastructure/database/mongoose/models/Payout.ts`** (~250 LOC)
```typescript
Schema Design:
- payoutId: string (unique, auto-generated)
- company: ObjectId (indexed)
- salesRepresentative: ObjectId (ref, indexed)
- commissionTransactions: ObjectId[] (ref: CommissionTransaction)
- totalAmount: number (sum of transactions)
- tdsDeducted: number (10% default)
- netAmount: number (totalAmount - tdsDeducted)
- status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
- razorpay: {
    payoutId: string (Razorpay payout ID)
    fundAccountId: string
    status: string
    utr: string (unique transaction reference)
    failureReason?: string
  }
- payoutDate: Date
- processedAt: Date
- failedAt: Date
- metadata: Object
- timestamps

Indexes:
- { company: 1, status: 1 }
- { salesRepresentative: 1, status: 1 }
- { payoutId: 1 } (unique)
- { razorpay.payoutId: 1 } (unique, sparse)
- { payoutDate: -1 }

Methods:
- markCompleted(razorpayData): Promise<void>
- markFailed(reason): Promise<void>
- retry(): Promise<void>
- static findPendingPayouts(companyId): Promise<Payout[]>
- static aggregateByRep(companyId, dateRange): Promise<Aggregation[]>
```

#### 2. Razorpay Integration (1 file)

**`/server/src/infrastructure/payment/razorpay/RazorpayPayoutProvider.ts`** (~400 LOC)
```typescript
Methods:
1. createFundAccount(bankDetails, salesRepId): Promise<FundAccount>
   - Call Razorpay Fund Accounts API
   - POST /fund_accounts
   - Body: { contact_id, account_type: 'bank_account', bank_account: {...} }
   - Store fund_account_id in SalesRepresentative model
   - Return fund account

2. createPayout(payoutData): Promise<RazorpayPayout>
   - Call Razorpay Payouts API
   - POST /payouts
   - Body: {
       account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
       fund_account_id: payoutData.fundAccountId,
       amount: payoutData.netAmount * 100, // paise
       currency: 'INR',
       mode: 'IMPS', // or NEFT/RTGS
       purpose: 'commission',
       queue_if_low_balance: true,
       reference_id: payoutData.payoutId,
       narration: `Commission payout ${payoutData.payoutId}`
     }
   - Return payout object

3. getPayoutStatus(razorpayPayoutId): Promise<PayoutStatus>
   - GET /payouts/:id
   - Return status: queued, pending, processing, processed, reversed, cancelled, failed

4. cancelPayout(razorpayPayoutId): Promise<void>
   - POST /payouts/:id/cancel
   - Only works if status is queued/pending

5. handleWebhook(event): Promise<void>
   - Verify webhook signature
   - Handle events:
     - payout.processed → markCompleted()
     - payout.failed → markFailed()
     - payout.reversed → handleReversal()
   - Update Payout model
   - Emit internal events

6. validateBankAccount(bankDetails): Promise<ValidationResult>
   - Optional: Use Razorpay Fund Account Validation API
   - Return validation status

Configuration:
- Key ID: process.env.RAZORPAY_KEY_ID
- Key Secret: process.env.RAZORPAY_KEY_SECRET
- Account Number: process.env.RAZORPAY_ACCOUNT_NUMBER
- Webhook Secret: process.env.RAZORPAY_WEBHOOK_SECRET

Dependencies:
- Razorpay SDK
- CryptoService (for webhook signature verification)
- Logger
```

#### 3. Service (Payout Processing)

**`/server/src/core/application/services/commission/PayoutProcessingService.ts`** (~400 LOC)
```typescript
Methods:
1. initiatePayout(salesRepId, transactionIds, companyId): Promise<Payout>
   - Verify all transactions are APPROVED and not yet paid
   - Calculate total, TDS, net amount
   - Verify sales rep has bank details and fund account
   - Create Payout document with status: PENDING
   - Call RazorpayPayoutProvider.createPayout()
   - Update Payout with Razorpay payout ID
   - Update CommissionTransactions to link payout
   - Return payout

2. processBatchPayouts(companyId, filters?): Promise<BatchResult>
   - Find all APPROVED transactions without payoutId
   - Group by salesRepresentative
   - For each rep:
     - Initiate payout if sum >= minimum threshold
   - Return batch processing result

3. retryFailedPayout(payoutId, companyId): Promise<Payout>
   - Verify payout status is FAILED
   - Reset status to PENDING
   - Call RazorpayPayoutProvider.createPayout() again
   - Return updated payout

4. cancelPayout(payoutId, companyId): Promise<void>
   - Verify payout not yet processed
   - Call RazorpayPayoutProvider.cancelPayout()
   - Update status to CANCELLED
   - Unlink transactions (clear payoutId)

5. reconcilePayouts(companyId, dateRange): Promise<ReconciliationReport>
   - Fetch all payouts in date range
   - For each payout:
     - Call RazorpayPayoutProvider.getPayoutStatus()
     - Compare with local status
     - Flag discrepancies
   - Return reconciliation report

Dependencies:
- Payout model
- CommissionTransaction model
- SalesRepresentative model
- RazorpayPayoutProvider
- WalletService (for fund tracking)
- NotificationService
- Logger
```

#### 4. Controller (1 file)

**`/server/src/presentation/http/controllers/commission/payout.controller.ts`** (~300 LOC)
```typescript
Endpoints (10):
1. POST /commission/payouts - Initiate payout
   - Auth: admin
   - Body: { salesRepId: string, transactionIds: string[] }
   - Return: 201 with payout

2. GET /commission/payouts - List payouts
   - Auth: authenticated (sales reps see only theirs)
   - Query: status, dateRange, salesRepId, pagination
   - Return: 200 with paginated payouts

3. GET /commission/payouts/:id - Get payout
   - Auth: authenticated (ownership check)
   - Return: 200 with payout (populated transactions)

4. POST /commission/payouts/batch - Process batch payouts
   - Auth: admin
   - Body: { filters?: {...}, minThreshold?: number }
   - Return: 200 with batch result

5. POST /commission/payouts/:id/retry - Retry failed payout
   - Auth: admin
   - Return: 200 with updated payout

6. POST /commission/payouts/:id/cancel - Cancel payout
   - Auth: admin
   - Return: 200 with success

7. GET /commission/payouts/:id/status - Get Razorpay status
   - Auth: admin
   - Return: 200 with live status from Razorpay

8. POST /commission/payouts/reconcile - Reconcile payouts
   - Auth: admin
   - Body: { startDate: string, endDate: string }
   - Return: 200 with reconciliation report

9. POST /commission/payouts/webhook - Razorpay webhook
   - Auth: webhook signature verification
   - Body: Razorpay event payload
   - Return: 200 (acknowledge receipt)

10. GET /commission/payouts/pending/summary - Pending payout summary
    - Auth: admin
    - Return: 200 with summary by sales rep

Pattern: Idempotency, webhook security, error handling
```

#### 5. Validation Schemas (update file)

**`/server/src/shared/validation/commission-schemas.ts`** (add ~80 LOC)
```typescript
New schemas:
- initiatePayoutSchema
- processBatchPayoutsSchema
- reconcilePayoutsSchema
```

#### 6. Routes (1 file)

**`/server/src/presentation/http/routes/v1/commission/payouts.routes.ts`** (~80 LOC)

#### 7. Middleware (Webhook Verification)

**`/server/src/presentation/http/middleware/razorpay/webhook-verification.ts`** (~90 LOC)
```typescript
Verify Razorpay webhook signature:
- Extract X-Razorpay-Signature header
- Compute HMAC-SHA256(webhook_secret, request.body)
- Compare signatures
- Reject if mismatch
```

### Testing (Day 3)

**Test Files** (~350 LOC total):
- `/server/tests/unit/services/commission/PayoutProcessingService.test.ts`
- `/server/tests/unit/infrastructure/payment/RazorpayPayoutProvider.test.ts`
- `/server/tests/integration/commission/payouts.test.ts`

Mock Razorpay API calls using nock or similar

Coverage target: 75%+

---

## Day 4: Analytics & Reporting (~1,000 LOC)

### Objective
Implement commission analytics dashboard, trends, and multi-format exports (CSV, Excel, PDF).

### Files to Create

#### 1. Service (Analytics)

**`/server/src/core/application/services/commission/CommissionAnalyticsService.ts`** (~400 LOC)
```typescript
Methods (8):
1. getDashboardSummary(companyId): Promise<DashboardData>
   - Total commission paid (all time)
   - Total commission pending approval
   - Total commission approved (awaiting payout)
   - Top performers (top 5 sales reps by commission)
   - Recent transactions (last 10)
   - Payout status distribution
   - Month-over-month growth

2. getCommissionTrends(companyId, dateRange, groupBy): Promise<TrendData[]>
   - Aggregate transactions by day/week/month
   - Group by createdAt
   - Return time series data:
     - date, totalCommission, transactionCount, avgCommission

3. getTopPerformers(companyId, dateRange, limit): Promise<PerformerData[]>
   - Aggregate by salesRepresentative
   - Sum finalAmount
   - Sort by total DESC
   - Return top N reps with:
     - rep info, totalCommission, transactionCount, avgCommission

4. getCommissionByStatus(companyId): Promise<StatusBreakdown>
   - Group by status
   - Sum finalAmount
   - Return counts and totals for each status

5. getCommissionByRuleType(companyId, dateRange): Promise<RuleTypeBreakdown>
   - Group by calculationDetails.ruleType
   - Sum finalAmount
   - Return breakdown

6. getPayoutSummary(companyId, dateRange): Promise<PayoutSummary>
   - Aggregate Payout model
   - Group by status
   - Sum netAmount, tdsDeducted
   - Return totals

7. getSalesRepCommissionReport(salesRepId, companyId, dateRange): Promise<RepReport>
   - Filter transactions by salesRepresentative
   - Calculate totals, breakdown by status
   - Include payout history
   - Return detailed report

8. getCommissionProjections(companyId, daysAhead): Promise<ProjectionData>
   - Fetch approved transactions not yet paid
   - Estimate payout amounts and dates
   - Return projection by week

Dependencies:
- CommissionTransaction model
- Payout model
- SalesRepresentative model
- MongoDB aggregation pipelines
- Cache results in Redis (1 hour TTL)
```

#### 2. Service (Reports)

**`/server/src/core/application/services/commission/CommissionReportService.ts`** (~250 LOC)
```typescript
Methods (4):
1. generateCommissionReport(companyId, dateRange, format): Promise<Report>
   - Fetch all transactions in date range
   - Group by sales rep
   - Calculate totals and averages
   - Format data for export
   - Return report data

2. generatePayoutReport(companyId, dateRange, format): Promise<Report>
   - Fetch all payouts in date range
   - Include transaction breakdown
   - Calculate TDS totals
   - Format for export

3. generatePerformanceReport(salesRepId, companyId, dateRange): Promise<Report>
   - Fetch rep's transactions
   - Calculate KPIs vs targets
   - Include trend analysis
   - Format for export

4. scheduledReports(companyId, frequency, recipients): Promise<void>
   - Setup cron job for periodic reports
   - Generate and email reports
   - Store in file system or cloud storage

Dependencies:
- CommissionAnalyticsService
- ExportService (reuse from Week 9)
- EmailService
- CloudinaryStorageService
```

#### 3. Controller (Analytics)

**`/server/src/presentation/http/controllers/commission/commission-analytics.controller.ts`** (~350 LOC)
```typescript
Endpoints (12):
1. GET /commission/analytics/dashboard - Dashboard summary
   - Auth: authenticated
   - Return: 200 with dashboard data

2. GET /commission/analytics/trends - Commission trends
   - Auth: authenticated
   - Query: startDate, endDate, groupBy (day/week/month)
   - Return: 200 with trend data

3. GET /commission/analytics/top-performers - Top performers
   - Auth: admin, manager
   - Query: startDate, endDate, limit (default: 10)
   - Return: 200 with top performers

4. GET /commission/analytics/by-status - Breakdown by status
   - Auth: authenticated
   - Return: 200 with status breakdown

5. GET /commission/analytics/by-rule-type - Breakdown by rule type
   - Auth: admin, manager
   - Query: startDate, endDate
   - Return: 200 with rule type breakdown

6. GET /commission/analytics/payout-summary - Payout summary
   - Auth: admin
   - Query: startDate, endDate
   - Return: 200 with payout summary

7. GET /commission/analytics/sales-rep/:id - Sales rep report
   - Auth: authenticated (ownership check)
   - Query: startDate, endDate
   - Return: 200 with detailed rep report

8. GET /commission/analytics/projections - Commission projections
   - Auth: admin
   - Query: daysAhead (default: 30)
   - Return: 200 with projection data

9. POST /commission/reports/commission - Generate commission report
   - Auth: admin, manager
   - Body: { startDate, endDate, format: 'csv' | 'excel' | 'pdf' }
   - Return: 200 with download URL

10. POST /commission/reports/payout - Generate payout report
    - Auth: admin
    - Body: { startDate, endDate, format: 'csv' | 'excel' | 'pdf' }
    - Return: 200 with download URL

11. POST /commission/reports/performance/:salesRepId - Generate performance report
    - Auth: admin, manager (or self)
    - Body: { startDate, endDate, format: 'csv' | 'excel' | 'pdf' }
    - Return: 200 with download URL

12. GET /commission/reports/scheduled - List scheduled reports
    - Auth: admin
    - Return: 200 with scheduled reports

Pattern: Reuse Week 9 export patterns (CloudinaryStorageService)
```

#### 4. Routes (1 file)

**`/server/src/presentation/http/routes/v1/commission/commission-analytics.routes.ts`** (~100 LOC)

Standard routing with rate limiting on export endpoints (10/15min like Week 9)

### Testing (Day 4)

**Test Files** (~200 LOC total):
- `/server/tests/unit/services/commission/CommissionAnalyticsService.test.ts`
- `/server/tests/integration/commission/commission-analytics.test.ts`

Coverage target: 75%+

---

## Day 5: Integration & Testing (~1,000 LOC)

### Objective
Wire up all components, comprehensive integration testing, performance optimization, and documentation.

### Tasks

#### 1. Integration Work

**Update Order Service** (~50 LOC)
- `/server/src/core/application/services/order/OrderService.ts`
- Add commission event emissions:
  - emit('order.created', orderData) after order creation
  - emit('order.cancelled', orderData) on cancellation
  - emit('order.updated', orderData) on status change

**Update RTO Service** (~30 LOC)
- `/server/src/core/application/services/ndr/RTOService.ts`
- Add event emission:
  - emit('rto.completed', rtoData) on RTO completion

**Update User Model** (~20 LOC)
- `/server/src/infrastructure/database/mongoose/models/User.ts`
- Add 'salesperson' role to enum

**Update Permission System** (~40 LOC)
- `/server/src/infrastructure/rbac/permissions.ts`
- Add commission permissions:
  - commission:read, commission:write, commission:approve, commission:payout

**Main Routes Integration** (~30 LOC)
- `/server/src/presentation/http/routes/v1/index.ts`
- Register commission routes:
  - /commission/rules
  - /commission/sales-reps
  - /commission/transactions
  - /commission/payouts
  - /commission/analytics

**Environment Variables** (~20 LOC)
- `.env.example`
- Add Razorpay config:
  - RAZORPAY_KEY_ID
  - RAZORPAY_KEY_SECRET
  - RAZORPAY_ACCOUNT_NUMBER
  - RAZORPAY_WEBHOOK_SECRET

#### 2. Comprehensive Testing

**Integration Test Suite** (~400 LOC)
- `/server/tests/integration/commission/end-to-end.test.ts`
  - Full workflow test:
    1. Create sales rep
    2. Create commission rule
    3. Create order (triggers commission calculation)
    4. Approve commission
    5. Initiate payout
    6. Handle webhook (mock)
    7. Verify payout completed
  - Edge cases:
    - Multiple rules (priority)
    - Order cancellation
    - Payout failure and retry
    - Adjustment scenarios

**Performance Tests** (~200 LOC)
- `/server/tests/performance/commission.perf.test.ts`
  - Bulk calculation (1000 orders)
  - Batch payout processing
  - Analytics aggregation performance
  - Concurrent approval requests

**Load Test Scenarios** (~150 LOC)
- Use k6 or Artillery
- Test endpoints under load:
  - 100 req/s on /commission/transactions
  - 50 req/s on /commission/analytics/dashboard

#### 3. Database Optimization

**Create Indexes** (~50 LOC)
- Run index creation scripts
- Verify compound indexes:
  - CommissionRule: { company: 1, isActive: 1, priority: -1 }
  - CommissionTransaction: { company: 1, status: 1 }, { salesRepresentative: 1, createdAt: -1 }
  - Payout: { company: 1, status: 1 }, { salesRepresentative: 1, payoutDate: -1 }

**Query Optimization**
- Add `.lean()` for read-only queries
- Use projection to limit fields
- Implement pagination on all list endpoints

#### 4. Caching Strategy

**Redis Caching** (~100 LOC)
- Cache analytics results (1 hour TTL):
  - Dashboard summary
  - Top performers
  - Trends data
- Cache commission rules (invalidate on update)
- Cache sales rep details

**Cache Invalidation**
- On commission approval: invalidate analytics cache
- On payout completion: invalidate payout summary
- On rule update: invalidate rule cache

#### 5. Documentation

**API Documentation** (~200 LOC)
- `/docs/api/commission-api.md`
- Document all 43 endpoints:
  - Request/response examples
  - Authentication requirements
  - Rate limits
  - Error codes

**Developer Guide** (~150 LOC)
- `/docs/development/commission-system-guide.md`
- Architecture overview
- Commission calculation logic
- Payout processing flow
- Event system integration
- Testing guide
- Troubleshooting

**Razorpay Integration Guide** (~100 LOC)
- `/docs/integrations/razorpay-payouts.md`
- Setup instructions
- Webhook configuration
- Testing with Razorpay test mode
- Production checklist

**Database Schema Documentation** (~80 LOC)
- `/docs/database/commission-schema.md`
- Entity relationship diagram
- Index strategy
- Migration guide

#### 6. Security Audit

**Security Checklist** (~50 LOC)
- Verify company isolation on all queries
- Test RBAC permissions
- Validate webhook signature verification
- Check for SQL/NoSQL injection vulnerabilities
- Audit sensitive data encryption (bank details)
- Test rate limiting on all endpoints
- Verify input validation with Zod

#### 7. Error Handling & Logging

**Standardize Error Responses** (~40 LOC)
- Use AppError consistently
- Return appropriate HTTP status codes
- Include error codes for client handling

**Enhanced Logging** (~60 LOC)
- Add structured logging for:
  - Commission calculations (with context)
  - Payout processing (Razorpay calls)
  - Webhook events
  - Failed operations (with retry info)

### Testing Summary (Day 5)

**Test Coverage Goal**: 75%+

**Test Files Created**: ~1,150 LOC across all tests

**Test Categories**:
1. Unit tests: Services and utilities
2. Integration tests: API endpoints
3. End-to-end tests: Full workflows
4. Performance tests: Load and stress testing

---

## Implementation Summary

### Total Deliverables

**Files Created**: 35+
- 6 Models
- 8 Services
- 5 Controllers
- 6 Route files
- 2 Validation schema files
- 1 Event handler file
- 1 Middleware file
- 1 Razorpay provider
- ~15 Test files
- 4 Documentation files

**Total Lines of Code**: ~7,300 LOC
- Day 1: ~1,400 LOC
- Day 2: ~1,600 LOC
- Day 3: ~1,500 LOC
- Day 4: ~1,000 LOC
- Day 5: ~1,800 LOC (including tests and docs)

**API Endpoints**: 43 total
- Commission rules: 7
- Sales representatives: 8
- Commission transactions: 13
- Payouts: 10
- Analytics: 12
- Webhooks: 1

**Database Indexes**: 12+ compound indexes for performance

**External Integrations**: Razorpay Payouts API

**Test Coverage**: 75%+ target

---

## Quality Standards (from Week 9)

### Code Quality
✅ TypeScript strict mode
✅ Zod validation on all inputs
✅ Comprehensive error handling
✅ Async/await with proper error propagation
✅ Clean Architecture (separation of concerns)
✅ DRY principles (reusable utilities)

### Security
✅ Company isolation on all queries
✅ Role-based access control (RBAC)
✅ Bank details encryption (AES-256)
✅ Webhook signature verification
✅ Rate limiting on expensive endpoints
✅ Input sanitization and validation
✅ Audit logging for sensitive operations

### Performance
✅ MongoDB compound indexes
✅ Redis caching for analytics
✅ Query optimization with `.lean()` and projection
✅ Pagination on all list endpoints
✅ Batch processing for bulk operations
✅ Async event processing (non-blocking)

### Testing
✅ Unit tests for services
✅ Integration tests for controllers
✅ End-to-end workflow tests
✅ Performance/load tests
✅ 75%+ code coverage
✅ Mock external APIs (Razorpay)

### Documentation
✅ API documentation with examples
✅ Architecture overview
✅ Integration guides (Razorpay)
✅ Database schema documentation
✅ Troubleshooting guide

---

## Risk Mitigation

### Potential Challenges

1. **Race Conditions in Commission Calculation**
   - **Risk**: Multiple events trigger calculation for same order
   - **Mitigation**: Optimistic locking (version field), idempotency checks

2. **Payout Failures**
   - **Risk**: Razorpay API failures, insufficient balance
   - **Mitigation**: Retry mechanism, queue_if_low_balance flag, detailed logging

3. **Webhook Reliability**
   - **Risk**: Missed webhooks, duplicate events
   - **Mitigation**: Signature verification, idempotency, manual reconciliation endpoint

4. **Performance at Scale**
   - **Risk**: Slow analytics queries with large datasets
   - **Mitigation**: Compound indexes, Redis caching, aggregation pipeline optimization

5. **Data Integrity**
   - **Risk**: Mismatched commission amounts, duplicate payouts
   - **Mitigation**: Validation endpoint, audit trail, reconciliation process

### Rollback Plan

If critical issues arise:
1. Disable event listeners (prevent auto-calculation)
2. Use manual calculation endpoints only
3. Review and approve all transactions before payout
4. Reconcile with Razorpay daily

---

## Success Criteria

✅ All 43 API endpoints functional and tested
✅ Commission calculation accuracy: 100%
✅ Payout success rate: >95%
✅ Analytics query response time: <500ms
✅ Test coverage: >75%
✅ Zero security vulnerabilities
✅ Full documentation coverage
✅ Successful integration with Order and RTO systems
✅ Razorpay integration working in test mode
✅ Ready for production deployment

---

## Post-Implementation Tasks

1. **Production Readiness**
   - Switch Razorpay to live mode
   - Configure production environment variables
   - Set up monitoring and alerting
   - Create runbook for operations team

2. **Training**
   - Train admin users on commission management
   - Train sales team on commission tracking
   - Document common workflows

3. **Monitoring**
   - Set up Sentry/Datadog for error tracking
   - Monitor payout success rate
   - Track API performance metrics
   - Set up alerts for failed payouts

4. **Future Enhancements** (not in Week 10 scope)
   - Lead management system integration
   - Advanced commission splitting (team commissions)
   - Gamification (leaderboards, achievements)
   - Mobile app for sales reps
   - Custom commission rule builder UI

---

## Appendix: Key Technical Decisions

### Why Razorpay Payouts?
- Automated bank transfers
- Support for IMPS/NEFT/RTGS
- Webhook notifications for status updates
- Fund account validation
- Existing integration with payment gateway

### Why Optimistic Locking?
- Prevent race conditions in commission updates
- Lightweight compared to distributed locks
- Works well with MongoDB

### Why Event-Driven Architecture?
- Decouple commission logic from order processing
- Async processing (non-blocking)
- Easy to add new event listeners (e.g., refunds)
- Scalable with message queues in future

### Why Redis Caching?
- Fast analytics dashboard loading
- Reduce database load
- TTL-based expiration (auto-cleanup)
- Consistent with Week 9 patterns

### Why Approval Workflow?
- Compliance and audit requirements
- Prevent fraudulent commissions
- Allow manual adjustments
- Control cash flow

---

## Ready to Implement?

This plan provides:
- ✅ Complete file-by-file specifications
- ✅ Day-by-day breakdown
- ✅ Integration points identified
- ✅ Testing strategy defined
- ✅ Security and performance considerations
- ✅ Documentation requirements
- ✅ Quality standards from Week 9

**Next Step**: Exit plan mode for your review and approval, then proceed with Day 1 implementation.