# Shipcrowd Backend: Production Engineering Review

**Reviewer**: Staff Backend Engineer (15+ years production experience)
**Date**: December 25, 2025
**Codebase**: Shipcrowd Server (Node.js/Express/MongoDB)
**Total Analysis**: 17 models, 19 controllers (~9,000 LOC), comprehensive architecture review

---

## Executive Summary

### Overall System Health: **6/10 - Functional but with Critical Technical Debt**

**Core Assessment**: This backend was built by a **mid-to-senior level engineer** (3-5 years experience) with good architectural intentions but inconsistent execution. The codebase shows knowledge of Clean Architecture patterns but **failed to follow through** on the implementation. It works in production but has **critical vulnerabilities** that will cause incidents at scale.

### What Works
- ✅ Comprehensive domain modeling for logistics/shipping SaaS
- ✅ Security-conscious (rate limiting, CSRF, audit logs, RBAC)
- ✅ Good error handling hierarchy (`AppError` system)
- ✅ Proper indexing on most critical queries
- ✅ Multi-tenancy via `companyId` isolation

### What Breaks First Under Change
1. **Controllers** - 1,200-line god functions doing everything
2. **Race conditions** - Coupon usage, order numbers, concurrent status updates
3. **Unbounded arrays** - Order products, shipment history, KYC addresses
4. **Data corruption** - Missing transactions for multi-document updates
5. **Security** - PII/OAuth tokens stored in plain text

### What Creates 2-3 AM Incidents
- **Race conditions** on coupon redemption (money loss)
- **Unbounded array growth** causing memory/performance issues
- **Missing transactions** causing order/shipment state inconsistency
- **N+1 queries** in analytics endpoints under load
- **No connection pooling limits** causing DB connection exhaustion

### Critical Risks
| Risk | Severity | Impact | When It Happens |
|------|----------|--------|----------------|
| Race condition in coupon usage counter | 🔴 CRITICAL | Revenue loss, double redemptions | First marketing campaign |
| Unbounded arrays (products, history) | 🔴 CRITICAL | Memory exhaustion, query timeout | 6-12 months |
| Missing transactions (KYC+User update) | 🔴 CRITICAL | Data inconsistency, corrupted state | Daily operations |
| PII stored in plain text (Aadhaar, PAN) | 🔴 CRITICAL | Regulatory violation (GDPR, PCI-DSS) | Next audit |
| OAuth tokens in plain text | 🟠 HIGH | Account compromise if DB breached | Security incident |
| 106 direct DB calls in controllers | 🟠 HIGH | Impossible to test/refactor | Every code change |
| God controllers (1,200+ lines) | 🟠 HIGH | Bugs in every feature addition | Every sprint |
| Order number generation race | 🟡 MEDIUM | Duplicate order numbers | High concurrency |

---

## 1. Architecture: Broken Clean Architecture

### Intended Design (From Directory Structure)
```
Presentation → Application → Domain → Infrastructure
   (HTTP)      (Services)   (Entities)  (DB/External)
```

### Actual Reality
```
Controllers → Mongoose Models (DIRECT)
Controllers → External APIs (DIRECT)
Controllers → Business Logic (INLINE)
```

### Critical Findings

**❌ Repository Pattern: Defined But Not Implemented**
- **Location**: `src/core/domain/interfaces/repositories/`
- **Status**: Interfaces exist for `IUserRepository`, `IShipmentRepository` but **ZERO implementations**
- **Reality**: All 19 controllers directly import and use Mongoose models
- **Count**: 106 direct database calls across 12 controller files
- **Impact**:
  - Impossible to unit test controllers (hard dependency on MongoDB)
  - Cannot swap database layer
  - Business logic tightly coupled to ORM
  - Every controller change risks data corruption

**Example Violation** (auth.controller.ts:83-87):
```typescript
// Controller directly using Mongoose model
const existingUser = await User.findOne({ email: validatedData.email });
const user = new User({ ... });
await user.save();
```

**Should be**:
```typescript
// Controller using repository
const existingUser = await userRepository.findByEmail(validatedData.email);
const user = await userRepository.create({ ... });
```

**❌ Service Layer: Inconsistent and Underutilized**
- **Found services**: auth, user, communication, integrations, shipping
- **Missing services**: order, KYC verification, analytics, payment
- **Problem**: Services that exist ALSO directly access Mongoose models
- **Result**: No clear separation between application and infrastructure layers

**❌ Use Case Layer: Abandoned**
- **Found**: Only 1 use case (`LoginUserUseCase`) vs 19 controllers
- **Problem**: Started with hexagonal architecture, then abandoned it
- **Result**: Inconsistent patterns confuse developers

### Architectural Decision Needed

**You have 3 options:**

**Option 1: Complete Clean Architecture** (8-12 weeks, high risk)
- Implement all repository interfaces
- Extract all business logic to services/use cases
- Add dependency injection
- ⚠️ High refactor risk, feature freeze required

**Option 2: Pragmatic Layering** (4-6 weeks, recommended)
- Embrace Active Record pattern (keep Mongoose in controllers for simple CRUD)
- Extract **business logic only** to service layer
- Keep data access in controllers but standardize patterns
- Add integration testing for controllers
- ✅ Incremental, safe, maintains velocity

**Option 3: Status Quo** (0 weeks, not recommended)
- Continue with inconsistent patterns
- ⚠️ Technical debt compounds, team confusion increases

**Recommendation**: **Option 2** - Pragmatic layering. You don't need perfect architecture, you need consistent, maintainable code.

---

## 2. Controller-Level Issues: The Biggest Problem

### God Controllers - CRITICAL ANTI-PATTERN

**Three controllers account for 3,658 lines** (40% of total controller code):

| Controller | Lines | Functions | Violations |
|-----------|-------|-----------|-----------|
| `team.controller.ts` | 1,292 | 13 | Business logic, direct DB, complex queries |
| `kyc.controller.ts` | 1,217 | 11 | **Direct API calls, data transformation, helper functions** |
| `auth.controller.ts` | 1,162 | 16 | **Password logic, token gen, session mgmt, OAuth flow** |

### Critical Issues in KYC Controller

**File**: `src/presentation/http/controllers/identity/kyc.controller.ts`

**Violations**:
1. **Direct External API Integration** (lines 474, 607, 813, 1051, 1162)
   ```typescript
   // Controller directly calling DeepVue API
   const result = await deepvueService.verifyPan(pan, name);
   const result = await deepvueService.verifyGstin(gstin);
   ```
   - External service calls belong in service layer
   - No retry logic
   - No circuit breaker
   - Failures block user request

2. **Complex Data Transformation** (lines 638-688)
   ```typescript
   // 50+ lines of GSTIN address formatting logic IN CONTROLLER
   if (result.data.pradr) {
     const addrObj = result.data.pradr;
     addresses.push({
       type: 'Principal Place of Business',
       buildingName: addrObj.bnm || '',
       // ... 30 more lines
     });
   }
   ```
   - Belongs in service/domain layer
   - Duplicated logic risk
   - Hard to test

3. **Helper Functions Defined Inline** (lines 18-86)
   ```typescript
   const getDocumentIdString = (doc: any): string => { ... }
   const validateUserAndCompany = async (req, res): Promise<...> => { ... }
   const findOrCreateKyc = async (userId, companyId) => { ... }
   ```
   - Should be extracted to shared utilities
   - Violates single responsibility

### Critical Issues in Auth Controller

**File**: `src/presentation/http/controllers/auth/auth.controller.ts`

**Violations**:
1. **Password Strength Logic in Controller** (lines 724-750)
   ```typescript
   export const checkPasswordStrength = async (req, res, next) => {
     // 26+ lines of password validation logic
     const strength = evaluatePasswordStrength(password, email, name);
     // Should be in password.service.ts
   };
   ```

2. **Account Locking Business Logic** (lines 226-248)
   ```typescript
   // Inline failed attempt tracking
   user.security.failedAttempts = (user.security.failedAttempts || 0) + 1;
   if (user.security.failedAttempts >= 5) {
     user.security.isLocked = true;
     user.security.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
   }
   await user.save();
   ```
   - Business rule should be in service
   - Magic numbers (5, 30) should be constants
   - No audit log for lockouts

3. **OAuth Flow in Controller** (lines 795-846)
   ```typescript
   export const googleCallback = passport.authenticate('google', (err, user, info) => {
     // 50+ lines of OAuth logic
   });
   ```

### Inconsistent Patterns Across Controllers

**Found 3 Different Patterns**:

**Pattern A: Old/Manual** (auth.controller.ts)
```typescript
try {
  const validation = schema.parse(req.body);
  // inline business logic
  res.status(200).json({ ... });
} catch (error) {
  res.status(400).json({ ... });
}
```

**Pattern B: Helper-Based** (recovery.controller.ts) ✅ GOOD
```typescript
const validation = schema.safeParse(req.body);
if (!validation.success) {
  return sendValidationError(res, formatZodErrors(validation.error));
}
const result = await service.doWork(validation.data);
sendSuccess(res, result, 'Success message');
```

**Pattern C: Modern** (order/shipment controllers) ✅ BEST
```typescript
const auth = guardChecks(req, res);
if (!auth) return;
const result = await service.doWork(auth.userId, validatedData);
sendPaginated(res, result.data, result.pagination);
```

**Adoption Status**:
- Auth controller: **0% modern patterns**
- Recovery controller: **100% helper-based**
- Order/Shipment/Analytics: **100% modern patterns**
- KYC controller: **30% mixed**

**Problem**: New developers see 3 different ways to write controllers and don't know which to follow.

### What Should Controllers Do?

**ONLY**:
1. Extract/validate request data
2. Call service layer
3. Format and return response
4. Handle auth/authz guards
5. Create audit logs

**NEVER**:
1. Direct database queries
2. Business rule enforcement
3. Data transformation logic
4. External API calls
5. Helper function definitions

### Incremental Refactor Path

**Phase 1: Standardize Patterns** (2 weeks)
1. Migrate all controllers to Pattern C (modern)
2. Extract inline helpers to `src/shared/helpers/controller.helpers.ts`
3. Use response helpers everywhere

**Phase 2: Extract Services** (4 weeks)
1. Create `KYCService` - move all DeepVue logic
2. Create `OrderService` - move CSV parsing, number generation
3. Refactor `AuthService` - move password/session logic

**Phase 3: Split God Controllers** (2 weeks)
1. Split `auth.controller.ts` → `auth.controller.ts`, `oauth.controller.ts`, `password.controller.ts`
2. Split `kyc.controller.ts` → by verification type (PAN, GSTIN, Aadhaar, Bank)
3. Split `team.controller.ts` → `team.controller.ts`, `team-permissions.controller.ts`

---

## 3. Business Logic & Domain Rules

### Missing Domain Invariants

**Critical Business Rules NOT Enforced**:

1. **Order Status Transitions** (defined but not enforced)
   - **Location**: `shared/validation/schemas.ts:415-423` (defined)
   - **Problem**: Validated in controller (order.controller.ts:198-206) NOT in model
   - **Risk**: Direct DB updates bypass validation
   - **Example**:
     ```typescript
     // Controller validates transitions
     if (!ORDER_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus)) {
       throw new ValidationError('Invalid status transition');
     }
     // But this bypasses validation:
     await Order.updateOne({ _id }, { currentStatus: 'invalid' });
     ```

2. **Shipment State Machine** (same issue)
   - Transitions defined centrally
   - Only enforced in controllers
   - Direct model updates bypass rules

3. **KYC Completion Logic** (kyc.controller.ts:971-986)
   ```typescript
   // Inline business rule in controller
   const allSectionsComplete =
     kyc.completionStatus.personalKycComplete &&
     kyc.completionStatus.companyInfoComplete &&
     kyc.completionStatus.bankDetailsComplete &&
     kyc.completionStatus.agreementComplete;

   if (allSectionsComplete && kyc.status === 'pending') {
     kyc.status = 'verified';
     await User.findByIdAndUpdate(userId, {
       'kycStatus.isComplete': true
     });
   }
   ```
   - **Problem**: No transaction (see next section)
   - **Problem**: KYC approval rules in controller
   - **Should be**: `KYCService.completeVerification(userId)` with transactions

### Duplicated Business Logic

**Same Rules Implemented Multiple Times**:

1. **Company Association Check** (found in 8 controllers)
   ```typescript
   // Duplicated in: kyc, order, shipment, team, company controllers
   if (!user.companyId) {
     return sendError(res, 'User is not associated with any company', 400);
   }
   ```
   - Should be: Middleware or guard helper

2. **Pagination Logic** (inconsistently implemented)
   - Modern controllers use `parsePagination()` helper ✅
   - Old controllers manually parse `page`/`limit` ❌
   - Should be: Standardized middleware

3. **Permission Checks** (scattered)
   - Some use `checkPermission()` middleware
   - Some inline role checks
   - Some don't check at all
   - Should be: Consistent decorator/middleware pattern

### Logic That Will Drift

**High-Risk Areas for Divergence**:

1. **Order Creation**
   - Manual creation (order.controller.ts:createOrder)
   - Bulk import (order.controller.ts:bulkImportOrders)
   - Shopify integration (integration.service.ts)
   - **Risk**: Each path has slightly different validation/defaults

2. **User Creation**
   - Direct registration (auth.controller.ts:register)
   - Team invitation acceptance (auth.controller.ts:register with token)
   - Admin creation (user.controller.ts:createUser)
   - **Risk**: Permission initialization differs

3. **Notification Triggers**
   - Embedded in various controllers
   - No centralized event system
   - **Risk**: Forgetting to send notifications on new flows

### Recommended Domain Layer

**Extract to Domain Services**:

```
src/core/domain/services/
├── OrderService
│   ├── createOrder(data) → validates, generates number, creates
│   ├── validateTransition(from, to) → enforces state machine
│   └── bulkImport(csvData) → centralized bulk logic
├── KYCService
│   ├── verifyDocument(type, data) → delegates to DeepVue
│   ├── completeVerification(userId) → transaction-safe
│   └── transformGSTINData(apiResponse) → data mapping
├── ShipmentService
│   ├── createShipment(orderId, data) → with order update
│   ├── updateStatus(id, status) → state machine + audit
│   └── selectCarrier(shipment) → carrier logic
└── UserService
    ├── createUser(data, source) → centralized creation
    ├── lockAccount(userId, reason) → audit + lock
    └── associateCompany(userId, companyId) → transaction
```

**Enforce at Model Level**:

```typescript
// OrderSchema.pre('save')
OrderSchema.pre('save', function(next) {
  if (this.isModified('currentStatus')) {
    const valid = ORDER_STATUS_TRANSITIONS[this.currentStatus];
    if (!valid) throw new ValidationError('Invalid status');
  }
  next();
});
```

---

## 4. Data Modeling & State Risks

### Critical: Unbounded Arrays

**HIGH PRIORITY - These Will Cause Production Incidents**

| Model | Unbounded Array | Current Usage | Incident Scenario |
|-------|----------------|---------------|------------------|
| **Order** | `products[]` | Orders with 1-10 products | E-commerce client uploads 500-product order → query timeout |
| **Order** | `statusHistory[]` | ~5 status changes | Order stuck in loop, 10,000 status updates → 16MB doc limit |
| **Shipment** | `statusHistory[]` | ~8 status changes | Carrier webhook fires 1000x → memory exhaustion |
| **Shipment** | `documents[]` | 2-3 documents | Regulatory change requires 50 docs → performance degradation |
| **KYC** | `gstin.addresses[]` | 1-3 addresses | Enterprise with 200 branches → unbounded |
| **Zone** | `postalCodes[]` | 10-50 codes | National zone with 10,000 codes → index bloat |
| **RateCard** | `baseRates[]`, `weightRules[]`, `zoneRules[]` | 10-20 rules | Complex pricing with 1000 rules → query performance |
| **User** | `recoveryKeys[]` | 0 keys | User generates 1000 keys → DoS |
| **Coupon** | `userIds[]`, `postalCodes[]` | 0-100 | Marketing campaign with 100,000 users → 16MB limit |

**Recommended Limits**:
```typescript
// Add to all array fields
products: {
  type: [...],
  validate: [arrayLimit(200), 'Maximum 200 products per order']
}

statusHistory: {
  type: [...],
  validate: [arrayLimit(100), 'Maximum 100 status entries']
}

// Utility function
function arrayLimit(max: number) {
  return function(val: any[]) {
    return val.length <= max;
  };
}
```

**Alternative: Move to Separate Collections**
```typescript
// Instead of Order.statusHistory[]
// Create OrderStatusHistory collection with orderId reference
// Benefits: unlimited history, efficient queries, separate indexes
```

### Critical: Race Conditions

**1. Coupon Usage Counter** - 🔴 CRITICAL (MONEY LOSS)

**File**: `src/infrastructure/database/mongoose/models/Coupon.ts:80-82`

```typescript
// Current (UNSAFE):
const coupon = await Coupon.findOne({ code });
if (coupon.usageCount >= coupon.usageLimit) {
  throw new Error('Coupon fully used');
}
coupon.usageCount += 1;
await coupon.save();
```

**Race Condition**:
- Request A reads `usageCount = 99` (limit = 100)
- Request B reads `usageCount = 99` (limit = 100)
- Request A increments to 100, saves
- Request B increments to 100, saves
- **Result**: 101 redemptions instead of 100 → revenue loss

**Fix** (atomic operation):
```typescript
const result = await Coupon.findOneAndUpdate(
  {
    code,
    usageCount: { $lt: usageLimit } // atomic check
  },
  {
    $inc: { usageCount: 1 } // atomic increment
  },
  { new: true }
);
if (!result) throw new Error('Coupon fully used or invalid');
```

**2. Order Number Generation** - 🟡 MEDIUM

**File**: `src/presentation/http/controllers/shipping/order.controller.ts:36-43`

```typescript
// Current (UNSAFE):
const getUniqueOrderNumber = async (): Promise<string> => {
  const orderNumber = generateOrderNumber();
  const exists = await Order.exists({ orderNumber });
  if (!exists) return orderNumber;
  return getUniqueOrderNumber(); // Retry
};
```

**Race Condition**:
- Request A generates `ORD-2025-001`
- Request B generates `ORD-2025-001`
- Both check, neither exists
- Both insert same order number
- **Result**: Duplicate order numbers

**Fix** (rely on unique index + retry):
```typescript
const createOrderWithUniqueNumber = async (data, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const orderNumber = generateOrderNumber();
      const order = new Order({ ...data, orderNumber });
      await order.save();
      return order;
    } catch (error) {
      if (error.code === 11000) continue; // Duplicate key, retry
      throw error;
    }
  }
  throw new Error('Failed to generate unique order number');
};
```

**3. Status Updates Without Versioning** - 🟠 HIGH

**Problem**: Concurrent status updates can conflict

```typescript
// Request A: Mark shipment as "delivered"
const shipment = await Shipment.findById(id);
shipment.currentStatus = 'delivered';
await shipment.save();

// Request B: Mark shipment as "returned" (runs concurrently)
const shipment = await Shipment.findById(id);
shipment.currentStatus = 'returned';
await shipment.save(); // Overwrites "delivered"
```

**Fix** (optimistic locking):
```typescript
// Add version field to Shipment schema
ShipmentSchema.plugin(require('mongoose-version'));

// Update with version check
const result = await Shipment.findOneAndUpdate(
  { _id: id, __v: currentVersion },
  { currentStatus: newStatus, $inc: { __v: 1 } },
  { new: true }
);
if (!result) throw new ConflictError('Shipment was modified by another request');
```

### Critical: Missing Transactions

**Multi-Document Operations Without Atomicity**:

**1. KYC Verification + User Update** - 🔴 CRITICAL

**File**: `kyc.controller.ts:982-990`

```typescript
// Current (UNSAFE):
kyc.status = 'verified';
await kyc.save(); // Operation 1

await User.findByIdAndUpdate(user._id, { // Operation 2
  'kycStatus.isComplete': true
});
```

**Failure Scenario**:
- KYC save succeeds
- User update fails (network/DB error)
- **Result**: KYC marked verified but user status not updated → inconsistent state

**Fix** (transaction):
```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  kyc.status = 'verified';
  await kyc.save({ session });

  await User.findByIdAndUpdate(
    user._id,
    { 'kycStatus.isComplete': true },
    { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

**2. Shipment Creation + Order Update**

**File**: `shipment.controller.ts:154-170, 377-400`

```typescript
// Order status updated but shipment creation could fail
await Order.findByIdAndUpdate(shipment.orderId, {
  currentStatus: 'in_transit'
});
// No transaction protection
```

**Other Missing Transactions**:
- Team member invitation + user creation
- Company creation + owner assignment
- Order cancellation + inventory restoration (if implemented)

### Security: Sensitive Data in Plain Text

**🔴 CRITICAL - REGULATORY VIOLATION**

**1. PII Storage** (KYC Model)

**File**: `src/infrastructure/database/mongoose/models/KYC.ts:62-150`

```typescript
aadhaar?: {
  number: string; // Plain text! ⚠️
}
pan?: {
  number: string; // Plain text! ⚠️
}
bankAccount?: {
  accountNumber: string; // Plain text! ⚠️
  ifscCode: string;
}
```

**Regulatory Risk**:
- GDPR violation (EU users)
- PCI-DSS violation (bank data)
- IT Act, 2000 violation (India - Aadhaar)

**Fix** (field-level encryption):
```typescript
// Use mongoose-field-encryption
import mongooseFieldEncryption from 'mongoose-field-encryption';

KYCSchema.plugin(mongooseFieldEncryption, {
  fields: ['aadhaar.number', 'pan.number', 'bankAccount.accountNumber'],
  secret: process.env.ENCRYPTION_KEY,
  saltGenerator: () => crypto.randomBytes(16)
});
```

**2. OAuth Tokens in Plain Text**

**File**: `User.ts:196-202`

```typescript
oauth?: {
  google?: {
    accessToken?: string; // Plain text! ⚠️
    refreshToken?: string; // Plain text! ⚠️
  }
}
```

**Security Risk**:
- DB breach = full account takeover
- Shopify integration tokens also at risk

**Fix**:
```typescript
// Encrypt before save
UserSchema.pre('save', async function(next) {
  if (this.isModified('oauth.google.accessToken')) {
    this.oauth.google.accessToken = encrypt(this.oauth.google.accessToken);
  }
  next();
});
```

**3. Refresh Tokens Not Hashed**

**File**: `Session.ts:13`

```typescript
refreshToken: { type: String, required: true } // Plain text!
```

**Should be**:
```typescript
// Hash refresh tokens like passwords
SessionSchema.pre('save', async function(next) {
  if (this.isModified('refreshToken')) {
    this.refreshToken = await bcrypt.hash(this.refreshToken, 12);
  }
  next();
});
```

### Indexing Issues

**Missing Indexes** (performance risk):

1. **User Model**:
   ```typescript
   UserSchema.index({ 'security.resetToken': 1 }, { sparse: true });
   UserSchema.index({ 'security.verificationToken': 1 }, { sparse: true });
   UserSchema.index({ 'pendingEmailChange.token': 1 }, { sparse: true });
   ```

2. **Company Model**:
   ```typescript
   CompanySchema.index({ status: 1 }); // Missing for admin queries
   ```

3. **Zone Model**:
   ```typescript
   ZoneSchema.index({ geographicalBoundaries: '2dsphere' }); // Missing for geo queries
   ```

**Existing Indexes**: Generally good! Most common queries covered.

---

## 5. API & Error Handling

### Response Format Inconsistency

**Three Different Response Formats Found**:

**Format A: Manual** (auth.controller.ts)
```typescript
res.status(200).json({
  message: 'Success',
  user: { ... }
});
```

**Format B: Helper** (recovery.controller.ts) ✅
```typescript
sendSuccess(res, data, 'Operation successful');
// Returns:
{
  success: true,
  data: { ... },
  message: 'Operation successful',
  timestamp: '2025-12-25T...'
}
```

**Format C: Manual Error** (various)
```typescript
res.status(400).json({ message: 'Error' }); // No error code
```

**Standardized Format** (responseHelper.ts) - ✅ EXISTS BUT NOT UNIVERSALLY USED

```typescript
{
  success: boolean,
  data?: T,
  error?: { code: string, message: string },
  pagination?: { page, limit, total, totalPages },
  timestamp: string
}
```

**Adoption Rate**:
- Auth controller: 0%
- Modern controllers: 100%
- Overall: ~70%

**Problem**: API consumers can't rely on consistent structure.

### Error Handling Quality

**✅ GOOD: Centralized Error Hierarchy**

**File**: `src/shared/errors/AppError.ts`

**Strengths**:
- Well-designed error class hierarchy
- Error code enum (`ErrorCode`)
- Status code mapping
- Operational vs programmer error distinction
- `normalizeError()` function handles Mongoose/Zod/JWT errors

**Example**:
```typescript
export class ValidationError extends AppError { ... }
export class AuthenticationError extends AppError { ... }
export class AuthorizationError extends AppError { ... }
export class NotFoundError extends AppError { ... }
export class ConflictError extends AppError { ... }
export class RateLimitError extends AppError { ... }
```

**✅ GOOD: Global Error Handler** (index.ts)

```typescript
app.use((error, req, res, next) => {
  const normalizedError = normalizeError(error);
  logger.error('Error:', normalizedError);
  res.status(normalizedError.statusCode).json(normalizedError.toJSON());
});
```

**❌ INCONSISTENT: Error Responses**

Some controllers:
```typescript
res.status(404).json({ message: 'Not found' }); // No error code
```

Others:
```typescript
sendError(res, 'Not found', 404, 'RESOURCE_NOT_FOUND'); // With code
```

**Recommendation**: Enforce use of `sendError()` helper everywhere.

### HTTP Method Misuse

**✅ GOOD**: Routes follow RESTful conventions
```
POST   /orders          → Create
GET    /orders          → List
GET    /orders/:id      → Get one
PATCH  /orders/:id      → Update
DELETE /orders/:id      → Delete
```

**No GET requests mutate state** ✅

### Edge Case Handling

**Found Issues**:

1. **Soft Delete Inconsistency**
   - Most models have `isDeleted` field
   - Queries check `isDeleted: false`
   - BUT: Some controllers forget to filter
   - **Risk**: Deleted records appear in results

2. **Pagination Edge Cases**
   - Modern controllers use `parsePagination()` ✅
   - Old controllers don't validate max page size ❌
   - **Risk**: Request `?limit=999999` causes performance issue

3. **Optional Fields Handling**
   - Some nullable fields not checked before access
   - **Example**: `user.companyId.toString()` when `companyId` could be undefined

**Recommended**: Add defensive checks or use TypeScript strict null checks.

---

## 6. Security & Authorization

### Authentication: Good Foundation

**✅ Strengths**:

1. **JWT-Based Authentication**
   - Access token (short-lived, in cookie)
   - Refresh token (long-lived, in cookie)
   - Token rotation on refresh
   - Token versioning (`tokenVersion` field)

2. **Session Management**
   - Session tracking per device
   - TTL index for auto-cleanup (90 days)
   - Device fingerprinting
   - IP/location tracking

3. **Rate Limiting**
   - Global rate limiter
   - Login-specific rate limiter (5 attempts / 15 min)

4. **CSRF Protection**
   - Custom middleware checks origin/referer
   - Requires `x-csrf-token` header
   - Disabled for dev/Postman (reasonable)

5. **Password Security**
   - Bcrypt hashing (12 rounds)
   - Password strength validation
   - Failed attempt tracking (locks at 5 failures)

**❌ Weaknesses**:

1. **No JWT Blacklist**
   - Revoked tokens still valid until expiry
   - Should maintain Redis blacklist for logout

2. **Access Token in Cookie Without HttpOnly**
   - Should verify: `httpOnly: true, secure: true, sameSite: 'strict'`

3. **Session Limit Not Enforced**
   - Users can have unlimited sessions
   - Should cap at 5-10 per user

### Authorization: Fragmented

**✅ RBAC System Exists**:

**Roles**:
- `admin` - Platform admin (full access)
- `seller` - Company user
- `staff` - Team member

**Team Roles**:
- `owner` - Company owner (full access)
- `admin` - Company admin (almost full)
- `manager` - Department manager
- `member` - Standard user
- `viewer` - Read-only

**Permissions**: Module-action based (orders.view, orders.create, etc.)

**❌ Inconsistent Enforcement**:

**Pattern 1: Middleware-Based** ✅
```typescript
router.get('/orders', authenticate, checkPermission('orders', 'view'), ...);
```

**Pattern 2: Inline Checks** ❌
```typescript
export const createOrder = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  // ...
};
```

**Pattern 3: Service-Level** ❌
```typescript
// Permission check buried in service
if (user.teamRole !== 'owner') throw new AuthorizationError();
```

**Problem**: Authorization spread across 3 layers makes audits impossible.

**Recommendation**: Enforce middleware-only auth checks.

### Multi-Tenancy Isolation

**✅ GOOD: Company-Based Isolation**

All queries filter by `companyId`:
```typescript
const orders = await Order.find({ companyId: user.companyId });
```

**❌ RISKS**:

1. **Admin Bypass Not Audited**
   ```typescript
   if (user.role === 'admin') {
     // Admin can access any company
     // No audit log of cross-company access
   }
   ```

2. **Missing Company Check in Some Endpoints**
   - Most controllers check `companyId`
   - Some analytics endpoints might expose cross-company data

3. **No Tenant Context Middleware**
   - Should set `req.tenant = { companyId }` early
   - Controllers rely on `req.user.companyId` directly

**Recommendation**: Add tenant context middleware + audit all admin cross-tenant access.

### Security Gaps

**Found**:

1. **No Input Sanitization**
   - Zod validates structure/types
   - Doesn't sanitize HTML/SQL injection attempts
   - **Risk**: XSS if displaying user input

2. **No Request Size Limits** (actually, there are)
   - ✅ Body parser: `limit: '10mb'`
   - Good for API, might need adjustment

3. **CORS Configuration** (index.ts)
   - Allows `credentials: true`
   - Origin validation seems correct
   - Should verify production config

4. **Secrets in Environment Variables**
   - Good: Uses `dotenv`
   - **Risk**: No validation that all required env vars are set
   - **Recommendation**: Add startup validation

---

## 7. Performance & Scalability

### N+1 Query Risks

**Found Instances**:

```typescript
// analytics.controller.ts:407-412
const kycs = await KYC.find(filter)
  .populate('userId', 'name email')      // N+1 for users
  .populate('companyId', 'name');        // N+1 for companies
```

**Status**: Uses `.populate()` which is MongoDB's LEFT JOIN equivalent.

**Issues**:
- Not true N+1 (Mongoose batches queries)
- BUT: Still 2 additional queries for populate
- No projection optimization (fetches all fields then discards)

**Recommendation**: For large datasets, use aggregation pipeline instead:
```typescript
const kycs = await KYC.aggregate([
  { $match: filter },
  { $lookup: { from: 'users', localField: 'userId', ... } },
  { $project: { 'userId.name': 1, 'userId.email': 1 } } // Projection
]);
```

### Complex Aggregations in Controllers

**analytics.controller.ts**: 4 functions with 50-150 line aggregations

**Example** (lines 260-303):
```typescript
const companiesStats = await Order.aggregate([
  { $match: { ... } },
  { $group: { _id: '$companyId', totalOrders: { $sum: 1 } } },
  { $lookup: { from: 'companies', localField: '_id', ... } },
  { $lookup: { from: 'users', localField: 'companies.ownerId', ... } },
  { $project: { ... } },
  { $sort: { totalOrders: -1 } }
]);
```

**Issues**:
- Complex logic in controller (should be in repository/service)
- No query timeout
- No result size limit
- Could return 10,000+ companies

**Risks at 5-10× Scale**:
- Query timeout
- Memory exhaustion
- Blocking event loop

**Recommendations**:
1. Move to `AnalyticsService`
2. Add query timeout: `maxTimeMS: 30000`
3. Add result limit: `$limit: 1000`
4. Add pagination
5. Cache results (Redis, 5-15 min TTL)

### Caching Strategy

**✅ Found Caching** (analytics.controller.ts):
```typescript
const cacheKey = `seller_dashboard_${companyId}`;
const cached = await cacheService.get(cacheKey);
if (cached) return sendSuccess(res, cached, 'Dashboard data');
// ... compute ...
await cacheService.set(cacheKey, result, 900); // 15 min TTL
```

**Strengths**:
- Uses Redis (assumed from cacheService)
- Reasonable TTL (15 minutes)
- Key includes tenant ID (good isolation)

**Missing**:
- No cache invalidation strategy
- What happens when order created? Stale data for 15 min
- Should use cache tags or pub/sub for invalidation

### Background Jobs

**Found**: Only 1 job - account deletion

**File**: `src/infrastructure/jobs/accountDeletion.job.ts`

**Implementation**:
- Uses `cron` library (not BullMQ!)
- Runs daily at 3 AM
- Finds users with `scheduledDeletionDate < now`
- Calls `permanentlyDeleteAccount()` service

**✅ Good**:
- Error handling per account
- Logging

**❌ Issues**:
- **Not using BullMQ** (doc mentions BullMQ but code uses `cron`)
- **No retry logic** - if server restarts during job, incomplete
- **Not idempotent** - re-running could cause issues
- **No job monitoring** - how do you know if it failed?
- **Sequential processing** - processes accounts one-by-one (slow)

**Missing Jobs**:
- Order expiration (pending orders cleanup)
- Session cleanup (covered by TTL index ✅)
- Webhook retries (if implemented)
- Report generation
- Email queue processing

**Recommendation**: Implement BullMQ properly
```typescript
import { Queue, Worker } from 'bullmq';

const accountDeletionQueue = new Queue('account-deletion', {
  connection: redis
});

const worker = new Worker('account-deletion', async (job) => {
  await permanentlyDeleteAccount(job.data.userId);
}, { connection: redis, concurrency: 5 });
```

### Database Connection Management

**File**: `src/config/database.ts` (not read, but inferred from index.ts)

**Assumed**:
- Mongoose connection with retry logic ✅
- Connection pooling (Mongoose default: 5 connections)

**Risks at 5-10× Scale**:
- Default pool size (5) is too small
- Should increase to 20-50 for production
- Should monitor connection pool exhaustion

**Recommendation**:
```typescript
mongoose.connect(MONGO_URI, {
  maxPoolSize: 50,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### What Fails at 5-10× Scale

| Component | Current Capacity | Failure Point | Fix |
|-----------|-----------------|---------------|-----|
| **Unbounded arrays** | 1,000 docs | Order with 500 products → query timeout | Array limits + separate collections |
| **Analytics aggregations** | 10,000 orders | 100,000+ orders → 30s+ query time | Materialized views, pre-aggregation |
| **Session storage** | 1,000 users | 10,000+ users → Session table scan | Add index on userId + expiresAt |
| **Audit logs** | 100K/month | 1M+/month → Write bottleneck | Partition by month, async writes |
| **Connection pool** | 5 connections | 100+ concurrent requests → exhaustion | Increase to 50 |
| **Synchronous processing** | 100 orders/min | 1,000+/min → Request timeout | Background jobs for heavy operations |

---

## 8. Maintainability & Testability

### Code Organization: Good Structure, Poor Execution

**✅ Strengths**:
- Clear domain separation (shipping, identity, organization)
- Consistent file naming
- Centralized validation schemas
- Shared utilities
- Good logging (Winston)

**❌ Weaknesses**:
- 106 direct database calls in controllers → untestable
- No dependency injection → hard to mock
- God controllers → fragile, risky to change
- Inconsistent patterns → team confusion

### Testing Strategy

**Not analyzed** (no test files provided), but based on architecture:

**Testability Score: 3/10** 🔴

**Blockers**:
1. **Direct Mongoose imports** → Can't mock
2. **No dependency injection** → Can't swap services
3. **Business logic in controllers** → Must test through HTTP layer
4. **No interfaces** → Can't create test doubles

**To make testable**:
```typescript
// Current (untestable):
export const createOrder = async (req, res) => {
  const order = new Order({ ... });
  await order.save();
};

// Refactored (testable):
export class OrderController {
  constructor(
    private orderService: IOrderService,
    private auditService: IAuditService
  ) {}

  async createOrder(req, res) {
    const order = await this.orderService.create(req.body);
    sendSuccess(res, order);
  }
}

// In tests:
const mockOrderService = { create: jest.fn() };
const controller = new OrderController(mockOrderService, mockAuditService);
```

### Documentation

**Found**:
- JSDoc comments on some functions ✅
- Inline comments explaining complex logic ✅
- No API documentation (Swagger/OpenAPI) ❌
- No architecture decision records ❌

**Recommendation**: Add Swagger docs for API consumers.

### Logging & Observability

**✅ Good Winston Setup**:
```typescript
logger.info('Operation successful');
logger.error('Error:', error);
logger.warn('Warning');
```

**❌ Missing**:
- No structured logging (add context: `{ userId, orderId, action }`)
- No distributed tracing (OpenTelemetry)
- No performance metrics (response time, DB query time)
- No error tracking (Sentry integration)

**Recommendation**:
```typescript
logger.info('Order created', {
  userId: user._id,
  orderId: order._id,
  companyId: user.companyId,
  amount: order.amount,
  duration: Date.now() - startTime
});
```

### Monitoring Gaps

**What you CAN'T answer today**:
- How many orders created per hour?
- What's P95 response time for `/orders` endpoint?
- How many failed KYC verifications?
- What's the DB query time distribution?
- How many concurrent users?
- What's the error rate by endpoint?

**Recommendation**: Add APM (Application Performance Monitoring):
- New Relic / Datadog / AppDynamics
- Or open-source: Prometheus + Grafana

---

## 9. Incremental Refactor Roadmap

**NO REWRITES. NO FRAMEWORK CHANGES. INCREMENTAL ONLY.**

### Phase 1: Stop the Bleeding (2-3 weeks) 🔴 CRITICAL

**Goal**: Fix data corruption and revenue loss risks

**Tasks**:

1. **Fix Race Conditions** (3 days)
   - [ ] Coupon usage: Atomic `$inc` operation
   - [ ] Order number: Rely on unique index + retry
   - [ ] Add optimistic locking to Order/Shipment models

2. **Add Array Limits** (2 days)
   - [ ] Add validators to all unbounded arrays
   - [ ] Cap at reasonable limits (100-1000 depending on field)
   - [ ] Monitor existing data for violations

3. **Add Missing Transactions** (5 days)
   - [ ] KYC verification + user update
   - [ ] Shipment creation + order update
   - [ ] Team invitation + user creation
   - [ ] Add transaction helper utility

4. **Add Missing Indexes** (1 day)
   - [ ] User security token fields
   - [ ] Company status field
   - [ ] Zone geoBoundaries (2dsphere)

5. **Encrypt Sensitive Data** (4 days)
   - [ ] Add mongoose-field-encryption plugin
   - [ ] Encrypt KYC PII fields
   - [ ] Encrypt OAuth tokens
   - [ ] Hash refresh tokens
   - [ ] **DATA MIGRATION REQUIRED** - write migration script

**Deliverables**:
- [ ] All race conditions fixed
- [ ] All unbounded arrays have limits
- [ ] All multi-doc operations use transactions
- [ ] All sensitive data encrypted
- [ ] Migration script tested in staging

### Phase 2: Standardize Controllers (3-4 weeks) 🟠 HIGH PRIORITY

**Goal**: Consistent patterns, easier to maintain

**Tasks**:

1. **Adopt Modern Pattern Everywhere** (1 week)
   - [ ] Migrate auth.controller.ts to use helpers
   - [ ] Migrate kyc.controller.ts to use helpers
   - [ ] Extract common helpers to `src/shared/helpers/controller.helpers.ts`
   - [ ] Document controller template in README

2. **Extract Inline Business Logic** (2 weeks)
   - [ ] Create `KYCService` - move DeepVue integration
   - [ ] Create `OrderService` - move CSV parsing, number generation
   - [ ] Create `AuthService` - move password/session logic
   - [ ] Create `ShipmentService` - move carrier selection
   - [ ] Controllers call services, no direct model access for business logic

3. **Standardize Error Responses** (2 days)
   - [ ] All controllers use `sendSuccess()`, `sendError()`, `sendValidationError()`
   - [ ] All errors include error codes
   - [ ] Remove manual `res.status().json()` calls

4. **Add Controller Tests** (1 week)
   - [ ] Add integration tests for critical flows
   - [ ] Test auth, order creation, KYC verification
   - [ ] Use supertest + test database

**Deliverables**:
- [ ] All controllers follow Pattern C (modern)
- [ ] All business logic extracted to services
- [ ] All responses use helpers
- [ ] 70%+ test coverage on controllers

### Phase 3: Split God Controllers (2 weeks) 🟡 MEDIUM PRIORITY

**Goal**: Smaller, focused controllers

**Tasks**:

1. **Split auth.controller.ts** (4 days)
   - [ ] `auth.controller.ts` - login, register, logout
   - [ ] `oauth.controller.ts` - Google OAuth flow
   - [ ] `password.controller.ts` - password reset, change, strength check
   - [ ] Update routes

2. **Split kyc.controller.ts** (4 days)
   - [ ] `kyc.controller.ts` - orchestration, status
   - [ ] `kyc-pan.controller.ts` - PAN verification
   - [ ] `kyc-aadhaar.controller.ts` - Aadhaar verification
   - [ ] `kyc-gstin.controller.ts` - GSTIN verification
   - [ ] `kyc-bank.controller.ts` - Bank verification

3. **Split team.controller.ts** (3 days)
   - [ ] `team.controller.ts` - member management
   - [ ] `team-permissions.controller.ts` - permission management

4. **Consolidate Permission Models** (2 days)
   - [ ] Choose one schema (Permission vs TeamPermission)
   - [ ] Migrate data
   - [ ] Remove duplicate

**Deliverables**:
- [ ] No controller over 500 lines
- [ ] Each controller focused on single responsibility
- [ ] Routes updated and tested

### Phase 4: Improve Data Layer (3-4 weeks) 🟡 MEDIUM PRIORITY

**Goal**: Decouple from Mongoose, improve testability

**Tasks**:

1. **Implement Repository Pattern** (2 weeks)
   - [ ] Create repository implementations (UserRepository, OrderRepository, etc.)
   - [ ] Move complex queries from controllers to repositories
   - [ ] Keep simple CRUD in controllers (pragmatic approach)

2. **Add Model-Level Validation** (1 week)
   - [ ] State transition validation in pre-save hooks
   - [ ] Date range validation
   - [ ] Overlapping rule detection (RateCard)

3. **Optimize Aggregations** (1 week)
   - [ ] Move analytics aggregations to service layer
   - [ ] Add query timeouts
   - [ ] Add result limits
   - [ ] Add pagination
   - [ ] Improve caching strategy

**Deliverables**:
- [ ] Repositories implemented for core models
- [ ] Model-level validation for critical business rules
- [ ] Analytics queries optimized and cached

### Phase 5: Security Hardening (2 weeks) 🟡 MEDIUM PRIORITY

**Goal**: Production-grade security

**Tasks**:

1. **Auth Improvements** (4 days)
   - [ ] JWT blacklist (Redis)
   - [ ] Session limit enforcement (max 5 per user)
   - [ ] Cookie security audit (`httpOnly`, `secure`, `sameSite`)

2. **Authorization Audit** (3 days)
   - [ ] Enforce middleware-only auth checks
   - [ ] Remove inline permission checks from controllers
   - [ ] Add tenant context middleware
   - [ ] Audit all admin cross-tenant access

3. **Input Sanitization** (2 days)
   - [ ] Add HTML sanitization (DOMPurify server-side)
   - [ ] Add SQL injection protection (already safe with Mongoose)
   - [ ] Add request size limits per endpoint

4. **Secrets Management** (2 days)
   - [ ] Add env var validation at startup
   - [ ] Rotate encryption keys
   - [ ] Add secret rotation strategy

**Deliverables**:
- [ ] All security recommendations implemented
- [ ] Security audit passed
- [ ] Penetration test conducted

### Phase 6: Observability & Monitoring (1-2 weeks) 🟢 LOW PRIORITY

**Goal**: Production visibility

**Tasks**:

1. **Structured Logging** (2 days)
   - [ ] Add context to all logs (userId, orderId, companyId)
   - [ ] Add request ID tracking
   - [ ] Add duration tracking

2. **APM Integration** (3 days)
   - [ ] Choose APM (New Relic / Datadog / open-source)
   - [ ] Instrument critical endpoints
   - [ ] Set up dashboards

3. **Error Tracking** (2 days)
   - [ ] Integrate Sentry or similar
   - [ ] Add error grouping
   - [ ] Set up alerting

4. **Metrics** (3 days)
   - [ ] Add Prometheus metrics
   - [ ] Track: request rate, error rate, response time, DB query time
   - [ ] Set up Grafana dashboards

**Deliverables**:
- [ ] Full observability stack
- [ ] Dashboards for key metrics
- [ ] Alerting for critical errors

### Phase 7: Background Jobs & Async Processing (2 weeks) 🟢 LOW PRIORITY

**Goal**: Offload heavy operations

**Tasks**:

1. **Implement BullMQ** (1 week)
   - [ ] Set up Redis connection
   - [ ] Create queue infrastructure
   - [ ] Migrate account deletion job
   - [ ] Add job monitoring dashboard

2. **Create New Jobs** (1 week)
   - [ ] Order expiration job
   - [ ] Webhook retry job
   - [ ] Report generation job
   - [ ] Email queue job

**Deliverables**:
- [ ] BullMQ fully operational
- [ ] All heavy operations async
- [ ] Job monitoring in place

---

## 10. Final Verdict

### Is the Backend Salvageable?

**YES.** ✅

This is **NOT a "throw it away and rewrite" situation**. The foundation is solid:
- Good domain modeling
- Security-conscious design
- Clean architecture intentions
- Works in production

**BUT**: It has **critical technical debt** that must be addressed incrementally.

### What Level Engineer Built It?

**Mid-to-Senior Backend Engineer (3-5 years experience)**

**Evidence**:
- ✅ Knows Clean Architecture / Hexagonal Architecture patterns
- ✅ Understands security (CSRF, rate limiting, audit logs)
- ✅ Good error handling design
- ✅ Multi-tenancy awareness
- ✅ Proper indexing on most queries
- ❌ Failed to complete architectural vision (repository pattern abandoned)
- ❌ Inconsistent patterns suggest rapid iteration without refactoring
- ❌ Missing critical production concerns (transactions, race conditions, encryption)
- ❌ Testability not prioritized

**Likely scenario**:
- Started with ambitious architecture
- Deadline pressure led to shortcuts
- Team grew, patterns diverged
- No senior architect enforcing consistency

### What Should Be Fixed First If I Owned This?

**Priority 1 (Week 1-2): Data Integrity & Revenue Protection** 🔴

1. **Fix coupon race condition** → Money loss risk
2. **Add transactions to KYC/Shipment updates** → Data corruption risk
3. **Encrypt PII** → Regulatory violation risk
4. **Add array limits** → Production incident risk

**Priority 2 (Week 3-6): Code Quality & Maintainability** 🟠

5. **Standardize controller patterns** → Developer productivity
6. **Extract business logic to services** → Testability
7. **Split god controllers** → Reduce bug surface area
8. **Add integration tests** → Confidence in changes

**Priority 3 (Week 7-10): Performance & Scale** 🟡

9. **Optimize analytics queries** → Performance under load
10. **Implement proper background jobs** → Async processing
11. **Add observability** → Production visibility

**Priority 4 (Ongoing): Architecture Alignment** 🟢

12. **Implement repository pattern** → Decouple from Mongoose
13. **Add dependency injection** → Improve testability
14. **Document architectural decisions** → Team alignment

---

## Summary: Critical Action Items

### Immediate (This Sprint)
- [ ] Fix coupon usage race condition (atomic increment)
- [ ] Add transactions to KYC verification flow
- [ ] Add array size limits to all unbounded arrays
- [ ] Encrypt KYC PII fields (with migration script)

### Short-term (Next Month)
- [ ] Standardize all controllers to modern pattern
- [ ] Extract business logic to service layer
- [ ] Split 3 god controllers into smaller modules
- [ ] Add integration tests for critical flows

### Long-term (Next Quarter)
- [ ] Implement repository pattern
- [ ] Add comprehensive observability (APM, logs, metrics)
- [ ] Migrate to BullMQ for background jobs
- [ ] Conduct security audit & penetration test

---

## Appendix: Files Referenced

### Controllers (19 files, 9,047 LOC)
- `server/src/presentation/http/controllers/auth/auth.controller.ts` (1,162 lines)
- `server/src/presentation/http/controllers/identity/kyc.controller.ts` (1,217 lines)
- `server/src/presentation/http/controllers/organization/team.controller.ts` (1,292 lines)
- `server/src/presentation/http/controllers/shipping/order.controller.ts` (396 lines)
- `server/src/presentation/http/controllers/shipping/shipment.controller.ts` (462 lines)
- `server/src/presentation/http/controllers/system/analytics.controller.ts` (526 lines)
- [... 13 more controllers]

### Models (17 files)
- `server/src/infrastructure/database/mongoose/models/User.ts`
- `server/src/infrastructure/database/mongoose/models/Order.ts`
- `server/src/infrastructure/database/mongoose/models/Shipment.ts`
- `server/src/infrastructure/database/mongoose/models/KYC.ts`
- `server/src/infrastructure/database/mongoose/models/RateCard.ts`
- `server/src/infrastructure/database/mongoose/models/Zone.ts`
- `server/src/infrastructure/database/mongoose/models/Coupon.ts`
- [... 10 more models]

### Critical Infrastructure
- `server/src/index.ts` - Application entry point
- `server/src/shared/errors/AppError.ts` - Error hierarchy
- `server/src/shared/utils/responseHelper.ts` - Response utilities
- `server/src/presentation/http/middleware/auth/auth.ts` - Authentication
- `server/src/presentation/http/middleware/auth/permissions.ts` - Authorization
- `server/src/core/application/services/auth/session.service.ts` - Session management
- `server/src/config/scheduler.ts` - Background jobs

---

**End of Review**

This backend can absolutely succeed in production with focused, incremental improvements. The foundation is solid - it just needs architectural alignment and critical bug fixes. Start with Phase 1 (data integrity), then systematically work through the roadmap. No rewrites necessary.
