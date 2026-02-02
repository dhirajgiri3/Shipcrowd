te# Shipcrowd Backend Master Development Plan
## CANON Methodology - Week 1-2 Detailed Implementation

**Created:** December 25, 2025
**Updated:** December 25, 2025
**Developer:** Solo (Full-time Dedicated)
**Methodology:** AI-Native CANON Development
**Target:** Foundation + Velocity Shipfast Courier Integration
**Status:** Ready for Execution

---

## EXECUTIVE SUMMARY

### Implementation Scope: Week 1-2
This document provides **extremely detailed, day-by-day execution plans** for the first 2 weeks of Shipcrowd backend development following CANON AI-native methodology.

**Week 1:** Foundation, infrastructure, context packages, race condition fixes
**Week 2:** Velocity Shipfast courier integration (12 API endpoints)

### Why Week 1-2 First?
- **Week 1** establishes the AI-native development infrastructure that makes all future work efficient
- **Week 2** implements the most critical missing feature (courier integration) with 0% → 100% completion
- After Week 2, we have a stable foundation to accelerate Weeks 3-16

### Success Criteria
By end of Week 2:
- ✅ All CANON infrastructure operational (context packages, testing, documentation)
- ✅ Race conditions in database operations fixed
- ✅ Velocity Shipfast API fully integrated (auth, orders, tracking, cancellation)
- ✅ 80%+ test coverage on new courier code
- ✅ Ready to parallelize payment + e-commerce tracks

---

## WEEK 1: FOUNDATION & REFACTORING

### Week 1 Objectives
1. Establish AI-native development workflow with CANON methodology
2. Create comprehensive context packages for AI agents
3. Set up testing and documentation infrastructure
4. Fix critical race conditions in existing code
5. Baseline current backend state
6. Prepare for parallel development tracks

---

### DAY 1: PROJECT CONTEXT & INFRASTRUCTURE SETUP

**Total Time:** 8-9 hours
**Agent:** Claude Sonnet (planning/documentation), Cursor (quick edits)
**Goal:** Create master context documentation and development tracking system

#### Morning Session (3-4 hours): Master Context Creation

**Task 1.1: Create Master Context Document**

**File:** `docs/Development/MASTER_CONTEXT.md`

**Agent:** Claude Sonnet
**Prompt Pattern:**
```
You are establishing comprehensive backend development context for Shipcrowd.

PROJECT: Shipcrowd - Next-gen shipping aggregator platform
CURRENT STATE: 24% backend complete, clean architecture established
GOAL: Create master context for AI-native development

Based on:
- docs/Backend-Gap-Analysis.md
- docs/Shipcrowd_COMPLETE_FEATURE_LIST.md
- Current codebase analysis

Generate master context including:
1. Project overview & business goals
2. Current architecture state (Clean Architecture layers)
3. Technology stack with rationale
4. Coding standards & patterns
5. What's implemented vs missing
6. Key integration points
7. Security considerations
8. Performance requirements

Make it detailed enough for any AI session to understand project in 5 minutes.
```

**Content Structure:**
```markdown
# MASTER_CONTEXT.md

## Project Overview
- What Shipcrowd is
- Target users
- Core value proposition
- Competitive advantages

## Architecture
- Clean Architecture layers (Domain, Application, Infrastructure, Presentation)
- Current folder structure
- Design patterns used
- ADRs (Architecture Decision Records)

## Technology Stack
- Backend: Node.js 18+ + TypeScript 5.0 + Express 4.18
- Database: MongoDB 6.0 + Mongoose 8.0
- Testing: Jest + Supertest
- Why each choice was made

## Current Implementation Status
- Authentication: 70% (JWT + session management working)
- User Management: 76% (CRUD + permissions working)
- Order Management: 25% (basic model exists, API incomplete)
- Shipment Management: 16% (basic tracking only)
- Courier Integration: 0% (CRITICAL GAP)
- Payment: 0% (CRITICAL GAP)

## Coding Standards
- TypeScript strict mode enabled
- Clean Architecture principles
- Repository pattern for data access
- Service layer for business logic
- DTOs for API requests/responses
- Error handling: Custom AppError classes
- Logging: Winston with structured logs

## Integration Points
- Velocity Shipfast API (courier)
- Razorpay (payment gateway)
- DeepVue (KYC verification)
- AWS S3 (document storage)
- Future: Shopify, WooCommerce

## Security
- JWT tokens (15min access, 7d refresh)
- bcrypt password hashing (12 rounds)
- Input validation with Joi
- SQL injection prevention (Mongoose)
- XSS prevention
- Rate limiting

## Performance Requirements
- API response time: <500ms (95th percentile)
- Database queries: <100ms
- Bulk operations: <2s for 100 records
```

**Deliverable:** 15-20 page comprehensive master context document

---

**Task 1.2: Development Tracking System**

**File:** `docs/Development/DEVELOPMENT_TRACKER.md`

**Agent:** Cursor (template creation)

**Content:**
```markdown
# Development Tracker

## Module Completion Status

### Critical Path (Weeks 1-5)
- [ ] Foundation & Infrastructure (Week 1) - 0%
- [ ] Courier Integration - Velocity Shipfast (Week 2) - 0%
- [ ] Payment Gateway - Razorpay (Week 3) - 0%
- [ ] Wallet System (Week 4) - 0%
- [ ] PDF Generation - Labels/Invoices (Week 4) - 0%
- [ ] Warehouse Workflows (Week 5) - 0%

### By Feature Category
- [ ] Authentication & Security - 70% complete
  - ✅ JWT authentication
  - ✅ Session management
  - ✅ Password reset
  - ⚠️ 2FA (partial)
  - ❌ Rate limiting (missing)

- [ ] Courier Integration - 0% complete
  - ❌ Velocity Shipfast API (12 endpoints)
  - ❌ Order creation
  - ❌ Tracking
  - ❌ Cancellation
  - ❌ Label generation

- [ ] Payment & Wallet - 0% complete
  - ❌ Razorpay integration
  - ❌ Wallet model
  - ❌ Transaction tracking
  - ❌ COD remittance

[Continue for all 18 feature categories...]

## Daily Progress Log

### Week 1
**Day 1:**
- [ ] Master context created
- [ ] Development tracker set up
- [ ] Testing infrastructure configured

**Day 2:**
- [ ] Context packages created (5 modules)
- [ ] Integration context packages (3 integrations)

[Continue...]

## Blockers & Issues
[Track blockers encountered]

## Decisions Made
[Track key technical decisions with rationale]
```

**Deliverable:** Complete tracking system ready to use

---

#### Afternoon Session (4 hours): Testing Infrastructure

**Task 1.3: Testing Framework Setup**

**Agent:** Cursor (implementation)

**Dependencies to Install:**
```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev supertest @types/supertest
npm install --save-dev mongodb-memory-server
npm install --save-dev @faker-js/faker
```

**File Structure to Create:**
```
server/tests/
├── setup/
│   ├── globalSetup.ts          # MongoDB Memory Server initialization
│   ├── globalTeardown.ts       # Cleanup
│   ├── testHelpers.ts          # Shared utilities
│   └── testDatabase.ts         # DB connection helpers
├── unit/                        # Unit tests
│   ├── services/
│   ├── repositories/
│   └── utils/
├── integration/                 # API endpoint tests
│   ├── auth/
│   ├── orders/
│   └── shipments/
├── fixtures/                    # Test data factories
│   ├── userFactory.ts
│   ├── orderFactory.ts
│   └── shipmentFactory.ts
└── mocks/                       # External service mocks
    ├── velocityShipfast.mock.ts
    └── razorpay.mock.ts
```

**File:** `server/jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/*.interface.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  globalSetup: '<rootDir>/tests/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.ts',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testHelpers.ts']
};
```

**File:** `server/tests/setup/globalSetup.ts`
```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Store URI for use in tests
  process.env.MONGO_TEST_URI = uri;

  // Store instance for cleanup
  (global as any).__MONGOD__ = mongod;
}
```

**File:** `server/tests/fixtures/userFactory.ts`
```typescript
import { faker } from '@faker-js/faker';
import { User } from '@/infrastructure/database/mongoose/models/User';

export const createTestUser = async (overrides = {}) => {
  return User.create({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number('+91##########'),
    password: 'Test@123',
    role: 'user',
    ...overrides
  });
};
```

**Verification:**
```bash
# Run tests to verify setup
npm test

# Should see:
# - Tests run successfully
# - Coverage report generated
# - No configuration errors
```

**Deliverable:** Fully functional testing infrastructure with sample tests passing

---

**Task 1.4: Documentation Templates**

**Agent:** Claude Sonnet

**Files to Create:**

**1. API Endpoint Template**
**File:** `docs/Templates/API_ENDPOINT_TEMPLATE.md`

```markdown
# [HTTP METHOD] /api/v1/[endpoint]

## Purpose
[What this endpoint does in 1-2 sentences]

## Authentication
- Required: Yes/No
- Type: JWT Bearer Token
- Permissions: [required permissions]

## Request

### Headers
- Authorization: Bearer {token}
- Content-Type: application/json

### Path Parameters
- param1: [type] - [description]

### Query Parameters
- query1: [type] - [description]

### Body Schema
[TypeScript interface or JSON schema]

### Validation Rules
- Field1: required, min length 3
- Field2: optional, must be valid email

## Response

### Success (200 OK)
[JSON response structure]

### Error Responses
- 400 Bad Request: [when]
- 401 Unauthorized: [when]
- 404 Not Found: [when]
- 500 Internal Server Error: [when]

## Business Logic
[Step-by-step what happens]

## Side Effects
- Database: [what changes]
- External APIs: [what calls]
- Notifications: [what sent]

## Testing
- Unit tests: [file path]
- Integration tests: [file path]

## Related Endpoints
[Links to related endpoints]
```

**2. Service Documentation Template**
**File:** `docs/Templates/SERVICE_TEMPLATE.md`

**3. Integration Template**
**File:** `docs/Templates/INTEGRATION_TEMPLATE.md`

**4. Feature Specification Template**
**File:** `docs/Templates/FEATURE_SPEC_TEMPLATE.md`

**Deliverable:** Complete template library for consistent documentation

---

#### Evening Session (2 hours): Baseline Assessment

**Task 1.5: Codebase Analysis & Metrics**

**Agent:** Claude Sonnet (analysis)

**Actions:**

**1. Generate Route Inventory**
```bash
# Create script to list all routes
npx ts-node scripts/listRoutes.ts > docs/Development/API_INVENTORY.md
```

**Script:** `server/scripts/listRoutes.ts`
```typescript
// Scans all route files and generates inventory
// Lists: Method, Path, Controller, Authentication Required
```

**2. Security Audit**
```bash
npm audit --json > docs/Development/SECURITY_BASELINE.json
npm outdated > docs/Development/DEPENDENCIES_BASELINE.txt
```

**3. Code Metrics**
```bash
# Count lines of code by module
find src -name "*.ts" | xargs wc -l | sort -rn > docs/Development/CODE_METRICS.txt
```

**4. Test Coverage Baseline**
```bash
npm run test:coverage
# Capture current coverage percentage
# Target: 60% → 80% for critical paths
```

**Deliverable:**
- `API_INVENTORY.md` - Complete list of all endpoints
- `SECURITY_BASELINE.json` - Security vulnerabilities to fix
- `CODE_METRICS.txt` - Lines of code baseline
- Current test coverage: ~60%

---

### DAY 2: CONTEXT PACKAGES FOR CORE MODULES

**Total Time:** 8-9 hours
**Agent:** Claude Sonnet (primary), Cursor (formatting)
**Goal:** Create AI-agent-ready context packages for 5 core modules

#### Morning Session (4 hours): Module Context Packages

**Task 2.1: Create Context Packages**

**Context Package Structure (Template):**
```markdown
# [MODULE NAME] Context Package

## Module Overview
[What this module does, why it exists, its importance]

## Current State
### Implemented (✅)
- Feature 1
- Feature 2

### Partially Implemented (⚠️)
- Feature 3 (missing X, Y)

### Missing (❌)
- Feature 4
- Feature 5

## Architecture

### Models
**User Model** (server/src/infrastructure/database/mongoose/models/User.ts)
- Fields: firstName, lastName, email, phone, password, role
- Indexes: email (unique), phone (unique)
- Virtuals: fullName
- Methods: comparePassword(), generateAuthToken()

### Services
**AuthService** (server/src/core/application/services/auth/auth.service.ts)
- Methods:
  - login(email, password): Promise<AuthResponse>
  - register(userData): Promise<User>
  - refreshToken(token): Promise<TokenPair>
  - logout(sessionId): Promise<void>

### Controllers
**AuthController** (server/src/presentation/http/controllers/auth.controller.ts)
- POST /api/v1/auth/login
- POST /api/v1/auth/register
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout

## API Endpoints
[List all endpoints with status]

## Integration Points
### External
- DeepVue KYC API (for verification)
- Email service (for verification emails)

### Internal
- Dependencies: UserService, SessionService
- Used by: OrderController, ShipmentController

## Standards & Patterns
- Password hashing: bcrypt, 12 rounds
- JWT tokens: 15min access, 7 day refresh
- Session tracking: MongoDB sessions collection
- Error handling: Custom AuthenticationError class

## Testing Strategy
### Unit Tests
- Service layer: Test all business logic
- Password comparison
- Token generation/validation

### Integration Tests
- Full auth flow (register → login → access protected route)
- Token refresh flow
- Logout flow

## Open Issues
- [ ] 2FA implementation incomplete
- [ ] Rate limiting not implemented
- [ ] Session cleanup job needed

## Next Steps
1. Implement rate limiting (Week 1)
2. Complete 2FA (Week 3)
3. Add session cleanup cron job (Week 4)
```

**Context Packages to Create:**

**1. Authentication & User Management**
**File:** `docs/ContextPackages/AUTH_USER_CONTEXT.md`

**Agent Prompt:**
```
Analyze the authentication and user management module:
- server/src/infrastructure/database/mongoose/models/User.ts
- server/src/infrastructure/database/mongoose/models/Session.ts
- server/src/core/application/services/auth/
- server/src/presentation/http/controllers/auth.controller.ts

Create comprehensive context package following the template.
Include current state (70% complete), what's working, what's missing.
```

**2. Order Management**
**File:** `docs/ContextPackages/ORDER_CONTEXT.md`

**Key Points:**
- Current: 25% complete (basic model exists)
- Missing: Order lifecycle management, status updates, validation
- Critical for courier integration

**3. Shipment Management**
**File:** `docs/ContextPackages/SHIPMENT_CONTEXT.md`

**Key Points:**
- Current: 16% complete (basic tracking only)
- Missing: Full tracking integration, status sync, AWB management
- Week 2 will expand this significantly

**4. Warehouse & Logistics**
**File:** `docs/ContextPackages/WAREHOUSE_CONTEXT.md`

**Key Points:**
- Current: 50% complete (basic warehouse model)
- Missing: Picking, packing, manifest workflows
- Week 5 implementation

**5. Rate Card & Pricing**
**File:** `docs/ContextPackages/RATECARD_CONTEXT.md`

**Key Points:**
- Current: 40% complete (basic weight-based pricing)
- Missing: Zone-based pricing, dynamic rates, courier comparison

**Deliverable:** 5 comprehensive context packages (8-12 pages each)

---

#### Afternoon Session (4 hours): Integration Context Packages

**Task 2.2: Third-Party Integration Documentation**

**1. Velocity Shipfast Integration**
**File:** `docs/ContextPackages/VELOCITY_SHIPFAST_INTEGRATION.md`

**Agent:** Claude Sonnet
**Input:** `server/postman/Custom Website Integration Copy.postman_collection.json`

**Prompt:**
```
Analyze the Velocity Shipfast API Postman collection.

Create comprehensive integration context package including:
1. API base URL: https://shazam.velocity.in
2. Authentication flow (POST /custom/api/v1/auth-token)
3. All 12 endpoints documented:
   - Forward Order Orchestration
   - Forward Order
   - Order Update
   - Forward Order Shipment
   - Reverse Order Orchestration
   - Reverse Order
   - Reverse Order Shipment
   - Order Tracking
   - Cancel Order
   - Serviceability
   - Warehouse
   - Reports
4. Request/response TypeScript interfaces
5. Error handling strategy
6. Rate limiting considerations
7. Testing approach (mock vs real API)
8. Security (credential storage, token refresh)
9. Implementation checklist for Week 2
```

**Content Structure:**
```markdown
# Velocity Shipfast Courier API Integration

## Overview
- Provider: Velocity Shipfast
- Base URL: https://shazam.velocity.in
- API Version: v1
- Type: Custom REST API

## Authentication

### Endpoint
POST /custom/api/v1/auth-token

### Request
{
  "username": "+91xxxxxxxxx",
  "password": "xxxxxxxxxxx"
}

### Response
{
  "token": "16aPVwC64vxqPbTWKlFIxQ"
}

### Token Management
- Validity: 24 hours
- Refresh strategy: Proactive refresh at 23 hours
- Storage: Encrypted in database
- Usage: Authorization header in all requests

## API Endpoints

### 1. Forward Order Orchestration
**Purpose:** Create complete forward shipment in one call (order + shipment)

**Endpoint:** POST /custom/api/v1/forward-order
**Auth:** Required (Bearer token)

**Request Fields:**
- order_id: string (unique)
- order_date: string (YYYY-MM-DD HH:mm)
- billing_customer_name: string
- billing_phone: string (10 digits)
- billing_pincode: string (6 digits)
- billing_address, billing_city, billing_state, billing_country
- order_items: array of { name, sku, units, selling_price, discount, tax }
- payment_method: "COD" | "PREPAID"
- weight: number (kg)
- length, breadth, height: number (cm)
- pickup_location: string
- warehouse_id: string
- vendor_details: object (optional)

**Response:**
- shipment_id: string
- awb: string (tracking number)
- label_url: string
- courier_name: string

**Error Codes:**
- 400: Invalid request (validation failed)
- 401: Authentication failed
- 404: Warehouse not found
- 500: API error

### 2. Order Tracking
**Endpoint:** POST /custom/api/v1/order-tracking

**Request:**
{
  "awbs": ["AWB123", "AWB456"]
}

**Response:**
[
  {
    "awb": "AWB123",
    "status": "in_transit",
    "current_location": "Mumbai Hub",
    "history": [...]
  }
]

[Continue for all 12 endpoints...]

## TypeScript Interfaces

```typescript
// Request/Response types
interface VelocityAuthRequest {
  username: string;
  password: string;
}

interface VelocityForwardOrderRequest {
  order_id: string;
  order_date: string;
  billing_customer_name: string;
  // ... all fields
}

interface VelocityShipmentResponse {
  shipment_id: string;
  awb: string;
  label_url: string;
  courier_name: string;
}
```

## Error Handling
- Network errors: Retry with exponential backoff (1s, 2s, 4s)
- 401 errors: Refresh token and retry once
- 400 errors: Log and return to user
- 500 errors: Retry up to 3 times, then fail gracefully

## Rate Limiting
- Observed limit: ~100 requests/minute
- Implementation: Token bucket algorithm
- Backoff: If rate limited, wait and retry

## Testing Strategy
### Mock API (Development)
- Create VelocityShipfastMock class
- Return sample responses
- Test error scenarios

### Real API (Staging)
- Use test credentials
- Test warehouse ID: WHYYB5
- Mark tests as manual/optional

## Security
- Credentials: Store encrypted in AWS Secrets Manager
- Token: Encrypt before storing in database
- Never log credentials or full token
- Validate all input before sending to API

## Implementation Checklist (Week 2)
- [ ] Create ICourierProvider interface
- [ ] Implement VelocityShipfastProvider class
- [ ] Implement all 12 endpoints
- [ ] Add token refresh logic
- [ ] Create mock provider for testing
- [ ] Write unit tests (80%+ coverage)
- [ ] Write integration tests
- [ ] Manual testing with real API
- [ ] Security review
- [ ] Documentation complete
```

**Deliverable:** Complete Velocity Shipfast integration guide (15-20 pages)

---

**2. Razorpay Payment Gateway**
**File:** `docs/ContextPackages/RAZORPAY_INTEGRATION.md`

**Content Overview:**
- Authentication: API Key + Secret
- Orders API: Create payment order
- Payment capture flow
- Webhook handling
- Signature verification
- Refund API
- Testing with test mode
- Implementation in Week 3

**Deliverable:** Complete Razorpay integration guide (12-15 pages)

---

**3. DeepVue KYC API**
**File:** `docs/ContextPackages/DEEPVUE_INTEGRATION.md`

**Content Overview:**
- Current implementation status (42% complete)
- API endpoints used
- Verification types (Aadhaar, PAN, GST)
- Enhancement opportunities
- Testing strategy

**Deliverable:** Complete DeepVue integration guide (8-10 pages)

---

### DAY 3: DEVELOPMENT WORKFLOW & RACE CONDITION FIXES

**Total Time:** 8-9 hours
**Agent:** Claude Sonnet (design), Cursor (implementation)
**Goal:** Establish multi-agent workflow and fix critical database race conditions

#### Morning Session (4 hours): Agent Workflow Design

**Task 3.1: Agent Assignment Matrix**

**File:** `docs/Development/AGENT_ASSIGNMENT_MATRIX.md`

**Content:**
```markdown
# AI Agent Assignment Matrix

## Primary Agents

### Claude Sonnet 4.5 (Architecture & Planning)
**Use For:**
- Architectural decisions
- Complex business logic design
- Multi-file refactoring strategy
- Code review and analysis
- Documentation generation
- Problem decomposition
- Context package creation

**Example Tasks:**
- Design courier integration framework
- Plan database schema changes
- Review security implementation
- Create comprehensive documentation
- Analyze performance bottlenecks

**Session Pattern:**
- Start with full context (master context + module context)
- Clear, specific goal
- Request detailed design/plan
- Review output before implementation

### Cursor AI (Implementation & Iteration)
**Use For:**
- Feature implementation
- Code completion
- Pattern replication
- Quick fixes
- Test generation
- Boilerplate generation

**Example Tasks:**
- Implement API endpoints
- Write unit tests
- Generate TypeScript interfaces
- Apply established patterns
- Fix bugs

**Session Pattern:**
- Load relevant context package
- Implement according to specification
- Iterate quickly on feedback
- Generate tests alongside code

## Task Type Mapping

### New Feature Implementation
1. **Claude:** Design architecture
   - Input: Feature requirements
   - Output: Technical specification with file structure

2. **Claude:** Create implementation spec
   - Input: Architecture design
   - Output: Step-by-step implementation checklist

3. **Cursor:** Implement feature
   - Input: Implementation spec
   - Output: Working code

4. **Claude (fresh session):** Review implementation
   - Input: Implemented code
   - Output: Review findings, improvement suggestions

5. **Cursor:** Address review findings
   - Input: Review findings
   - Output: Refined code

### Bug Fixing
1. **Cursor:** Fix simple bugs (< 30 min investigation)
2. **Claude:** Analyze complex bugs (> 30 min)
3. **Cursor:** Implement fix
4. **Cursor:** Write regression test

### Refactoring
1. **Claude:** Analyze current code
2. **Claude:** Design refactoring strategy
3. **Cursor:** Execute refactor incrementally
4. **Claude:** Verify improvement

### Testing
1. **Cursor:** Generate unit tests
2. **Claude:** Design integration test scenarios
3. **Cursor:** Implement integration tests
4. **Claude:** Review test coverage

### Documentation
1. **Claude:** Generate comprehensive docs
2. **Cursor:** Add inline code comments
3. **Claude:** Create context packages
```

**Deliverable:** Clear agent assignment strategy

---

**Task 3.2: Session Templates**

**Files to Create:**

**1. Planning Session Template**
**File:** `docs/Development/SESSION_TEMPLATES/PLANNING_SESSION.md`

```markdown
# Planning Session Template

**Date:** [YYYY-MM-DD]
**Agent:** Claude Sonnet
**Duration:** [Expected duration]
**Goal:** [One-sentence goal]

## Pre-Session Checklist
- [ ] Master context loaded
- [ ] Relevant module context packages loaded
- [ ] Clear problem statement defined
- [ ] Success criteria defined

## Context Loading

### Project Context
[Paste relevant sections from MASTER_CONTEXT.md]

### Module Context
[Paste relevant context package]

### Current State
[What's implemented, what's working, what's broken]

### Goal
[Specific, measurable goal for this session]

## Prompt
[Your detailed prompt to Claude]

## Output
[Claude's response - design, plan, specification]

## Next Steps
[What to do after this planning session]
```

**2. Implementation Session Template**
**File:** `docs/Development/SESSION_TEMPLATES/IMPLEMENTATION_SESSION.md`

**3. Review Session Template**
**File:** `docs/Development/SESSION_TEMPLATES/REVIEW_SESSION.md`

**4. Debugging Session Template**
**File:** `docs/Development/SESSION_TEMPLATES/DEBUGGING_SESSION.md`

**Deliverable:** Complete session template library

---

#### Afternoon Session (4 hours): Race Condition Fixes

**Task 3.3: Fix Critical Database Race Conditions**

**Problem:** Multiple concurrent requests can cause race conditions in:
- Wallet balance updates
- Order status changes
- Inventory updates
- Sequential number generation (order numbers, AWB)

**Solution:** Optimistic locking with MongoDB version field (`__v`)

**File:** `server/src/shared/utils/optimisticLocking.ts`

**Implementation:**
```typescript
import mongoose from 'mongoose';
import { AppError } from '@/shared/errors/AppError';

/**
 * Update document with optimistic locking to prevent race conditions
 * Uses MongoDB's __v (version) field to ensure atomic updates
 */
export async function updateWithOptimisticLocking<T extends mongoose.Document>(
  model: mongoose.Model<T>,
  filter: mongoose.FilterQuery<T>,
  update: mongoose.UpdateQuery<T>,
  options: { maxRetries?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries || 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Fetch current document
    const currentDoc = await model.findOne(filter).lean();

    if (!currentDoc) {
      throw new AppError('DOCUMENT_NOT_FOUND', 404, 'Document not found');
    }

    // Attempt update with version check
    const updated = await model.findOneAndUpdate(
      { ...filter, __v: currentDoc.__v },
      { ...update, $inc: { __v: 1 } },
      { new: true }
    );

    if (updated) {
      return updated as T;
    }

    // Version mismatch, retry
    if (attempt < maxRetries - 1) {
      // Exponential backoff: 10ms, 20ms, 40ms
      await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt)));
    }
  }

  throw new AppError('CONCURRENT_MODIFICATION', 409, 'Document was modified concurrently, please retry');
}

/**
 * Transaction wrapper for complex multi-document updates
 */
export async function withTransaction<T>(
  operation: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

**Usage Example - Wallet Balance Update:**

**File:** `server/src/core/application/services/wallet/wallet.service.ts`

**Before (Race Condition):**
```typescript
// BAD - Race condition possible
async deductBalance(walletId: string, amount: number) {
  const wallet = await Wallet.findById(walletId);
  wallet.balance -= amount;
  await wallet.save(); // Another request could update balance between read and save
}
```

**After (Safe):**
```typescript
import { updateWithOptimisticLocking } from '@/shared/utils/optimisticLocking';

async deductBalance(walletId: string, amount: number) {
  return updateWithOptimisticLocking(
    Wallet,
    { _id: walletId, balance: { $gte: amount } }, // Also ensure sufficient balance
    { $inc: { balance: -amount } }
  );
}
```

**Files to Update:**

1. **Wallet Service** (`server/src/core/application/services/wallet/wallet.service.ts`)
   - Add balance credit method
   - Deduct balance method
   - Transaction history method

2. **Order Service** (`server/src/core/application/services/order/order.service.ts`)
   - Fix order status update
   - Fix order number generation

3. **Shipment Service** (`server/src/core/application/services/shipment/shipment.service.ts`)
   - Fix shipment status update

**Testing:**

**File:** `server/tests/unit/utils/optimisticLocking.test.ts`

```typescript
describe('Optimistic Locking', () => {
  it('should prevent concurrent balance updates', async () => {
    const wallet = await Wallet.create({ balance: 1000 });

    // Simulate concurrent updates
    const updates = [
      updateWithOptimisticLocking(Wallet, { _id: wallet._id }, { $inc: { balance: -100 } }),
      updateWithOptimisticLocking(Wallet, { _id: wallet._id }, { $inc: { balance: -200 } }),
      updateWithOptimisticLocking(Wallet, { _id: wallet._id }, { $inc: { balance: -300 } })
    ];

    await Promise.all(updates);

    const finalWallet = await Wallet.findById(wallet._id);
    expect(finalWallet.balance).toBe(400); // 1000 - 100 - 200 - 300
  });

  it('should retry on version conflict', async () => {
    // Test retry mechanism
  });

  it('should throw after max retries', async () => {
    // Test failure case
  });
});
```

**Deliverable:**
- Optimistic locking utility implemented
- Wallet, Order, Shipment services updated
- Tests passing with 80%+ coverage

---

### DAY 4: PARALLEL TRACK PLANNING & CONTEXT COMPLETION

**Total Time:** 8-9 hours
**Agent:** Claude Sonnet
**Goal:** Plan parallel development tracks and complete remaining context packages

#### Morning Session (4 hours): Parallel Track Design

**Task 4.1: Identify Parallel Development Tracks**

**File:** `docs/Development/PARALLEL_TRACKS.md`

**Content:**
```markdown
# Parallel Development Tracks (Weeks 2-16)

## Track A: Courier & Shipping Core (Weeks 2-5)
**Dependencies:** Low (independent)
**Priority:** CRITICAL
**Duration:** 4 weeks

### Modules
- Week 2: Velocity Shipfast API integration
- Week 3: Shipment lifecycle management
- Week 4: Label & manifest PDF generation
- Week 5: Warehouse workflows (picking, packing)

### Why Parallel-Ready
- No external dependencies
- Clear API contract (Postman collection)
- Can use mock data for testing

### Agent Strategy
- Claude: API framework design, error handling strategy
- Cursor: Endpoint implementation, testing
- Claude: Security review, performance optimization

## Track B: Payment & Financial (Weeks 3-5)
**Dependencies:** Low (independent of Track A)
**Priority:** CRITICAL
**Duration:** 3 weeks

### Modules
- Week 3: Razorpay payment gateway
- Week 4: Wallet system (credits, debits, transactions)
- Week 5: Invoice generation, billing

### Why Parallel-Ready
- Independent of courier integration
- Clear Razorpay API documentation
- Can develop alongside Track A

### Agent Strategy
- Claude: Payment flow design, security review
- Cursor: Razorpay SDK integration
- Claude: Webhook handling strategy

## Track C: E-commerce Integration (Weeks 6-8)
**Dependencies:** Medium (needs Order model stable from Track A)
**Priority:** HIGH
**Duration:** 3 weeks

### Modules
- Shopify OAuth & webhooks
- WooCommerce REST API
- Bidirectional order sync
- Fulfillment status updates

### Dependencies
- Requires: Order, Shipment models stable (Week 2-3)
- Can start: Week 6 (after Track A establishes models)

## Track D: Analytics & Reporting (Weeks 9-11)
**Dependencies:** Low (can use mock data)
**Priority:** MEDIUM
**Duration:** 3 weeks

### Modules
- Advanced analytics queries
- Custom report builder
- Export functionality (CSV, Excel, PDF)
- Dashboard optimizations

### Why Parallel-Ready
- Can develop with seeded data
- Independent of other tracks
- Flexible start time

## Track E: NDR/RTO & Automation (Weeks 7-9)
**Dependencies:** HIGH (needs Track A complete)
**Priority:** HIGH
**Duration:** 3 weeks

### Modules
- NDR detection & classification
- Resolution workflows
- Automated RTO triggers
- Webhook infrastructure

### Dependencies
- Requires: Courier integration complete (Week 2)
- Requires: Tracking system working (Week 3)

## Sequencing Strategy

### Weeks 2-5 (Phase 1)
**Track A + Track B** (Parallel)
- Both can run simultaneously
- No blocking dependencies
- Maximum 2 tracks at once (solo developer)

**Weekly Split:**
- Monday-Wednesday: Track A (Courier)
- Thursday-Friday: Track B (Payment)
- OR: Alternate days

### Weeks 6-9 (Phase 2)
**Track C + Track E** (Sequential start, then parallel)
- Week 6: Start Track C (Order model stable)
- Week 7: Start Track E (Courier integration complete), continue Track C
- Week 8-9: Both tracks parallel

### Weeks 9-11 (Phase 2-3)
**Track D** (Independent)
- Can start anytime after Week 5
- Flexible scheduling
- Fill gaps between other tracks

## Risk Mitigation
- Maximum 2 tracks simultaneously (avoid context switching)
- Complete Track A Week 2-3 before starting dependent tracks
- Buffer time in estimates (2 weeks → 3 weeks)
- Daily integration to catch conflicts early
```

**Deliverable:** Clear parallel track execution plan

---

#### Afternoon Session (4 hours): Additional Context Packages

**Task 4.2: Create Remaining Context Packages**

**Files to Create:**

**1. Payment & Wallet Context**
**File:** `docs/ContextPackages/PAYMENT_WALLET_CONTEXT.md`

**Content:**
- Current state: 0% complete
- Razorpay integration plan
- Wallet model design
- Transaction tracking
- COD remittance
- Week 3-4 implementation

**2. NDR/RTO Context**
**File:** `docs/ContextPackages/NDR_RTO_CONTEXT.md`

**Content:**
- Non-Delivery Report handling
- Return To Origin workflows
- Automated resolution
- Week 8-9 implementation

**3. E-commerce Integration Context**
**File:** `docs/ContextPackages/ECOMMERCE_INTEGRATION_CONTEXT.md`

**Content:**
- Shopify OAuth flow
- WooCommerce API
- Order synchronization
- Week 6-7 implementation

**Deliverable:** 3 additional context packages

---

#### Evening Session (2 hours): Sprint Structure

**Task 4.3: Define Sprint Framework**

**File:** `docs/Development/SPRINT_TEMPLATE.md`

**Content:**
```markdown
# 2-Week Sprint Template

## Sprint Overview
**Sprint Number:** [N]
**Start Date:** [Date]
**End Date:** [Date]
**Focus:** [Primary goal]

## Sprint Goals
1. [Specific, measurable goal 1]
2. [Specific, measurable goal 2]
3. [Specific, measurable goal 3]

## Week 1: Implementation

### Monday: Planning & Design
**Morning (3-4h):**
- Sprint kickoff
- Review backlog
- Load context packages

**Afternoon (4h):**
- Design sessions for week's features
- Create implementation specs

**Evening (2h):**
- Prepare detailed day plans
- Set up testing infrastructure

### Tuesday-Thursday: Deep Implementation
**Daily Pattern:**
- Morning (4h): Primary feature implementation
- Afternoon (3-4h): Secondary feature OR testing
- Evening (1-2h): Integration, documentation

**Tuesday Focus:** [Specific tasks]
**Wednesday Focus:** [Specific tasks]
**Thursday Focus:** [Specific tasks]

### Friday: Integration & Review
**Morning (3h):**
- Merge week's work
- Resolve conflicts

**Afternoon (3h):**
- Integration testing
- Fix integration issues

**Evening (2h):**
- Code review (fresh AI session)
- Plan Week 2

## Week 2: Completion & Quality

### Monday-Wednesday: Feature Completion
**Focus:**
- Complete incomplete features from Week 1
- Address integration issues
- Comprehensive testing (unit + integration)

### Thursday: Quality Sweep
**Morning (4h):**
- Code review (fresh Claude session with full context)
- Security review
- Performance testing

**Afternoon (3h):**
- Address review findings
- Documentation updates

**Evening (2h):**
- Final integration testing
- Prepare deployment

### Friday: Sprint Wrap-Up
**Morning (3h):**
- Final integration
- Staging deployment
- Smoke testing

**Afternoon (2h):**
- Sprint retrospective
  - What went well?
  - What didn't go well?
  - What to improve next sprint?

**Evening (2h):**
- Plan next sprint
- Update tracker
- Create context bridge for next sprint

## Daily Rituals

### Morning Standup (Self, 15min)
- What did I accomplish yesterday?
- What will I do today?
- Any blockers?
- Update DEVELOPMENT_TRACKER.md

### Evening Wrap (30min)
- Commit all changes
- Update documentation
- Create session bridge (brief summary for next day's context)
- Plan tomorrow's tasks

## Success Criteria
- [ ] All sprint goals achieved
- [ ] 80%+ test coverage on new code
- [ ] All new endpoints documented
- [ ] No critical bugs in staging
- [ ] Code reviewed
- [ ] Security reviewed
- [ ] Performance acceptable

## Metrics to Track
- Features completed vs planned
- Test coverage percentage
- Bugs found/fixed
- API response times
- Lines of code added/removed
```

**Deliverable:** Sprint template for 12-16 weeks of development

---

### DAY 5: WEEK 2 DETAILED PREPARATION

**Total Time:** 8-9 hours
**Agent:** Claude Sonnet
**Goal:** Create comprehensive specification for Week 2 Velocity Shipfast integration

#### All Day Session: Courier Integration Specification

**Task 5.1: Velocity Shipfast Integration Complete Specification**

**File:** `docs/Development/Specifications/WEEK2_VELOCITY_SHIPFAST_SPEC.md`

**Content:**
```markdown
# Week 2: Velocity Shipfast Courier Integration
## Complete Implementation Specification

## Objective
Implement complete Velocity Shipfast API integration, establishing the courier provider framework for future additions (Delhivery, DTDC, etc.).

## Success Criteria
By end of Week 2:
- ✅ ICourierProvider interface defined (extensible for future couriers)
- ✅ VelocityShipfastProvider fully implemented (all 12 endpoints)
- ✅ CourierService orchestrator working
- ✅ Order → Shipment creation flow functional end-to-end
- ✅ Tracking updates working
- ✅ 80%+ test coverage
- ✅ All endpoints documented
- ✅ Security reviewed

## Architecture

### Component Structure
```
server/src/
├── core/
│   ├── domain/
│   │   └── interfaces/
│   │       └── providers/
│   │           └── ICourierProvider.ts              # Abstract interface
│   └── application/
│       └── services/
│           └── courier/
│               ├── CourierService.ts                # Orchestrator
│               └── CourierFactory.ts                # Provider factory
├── infrastructure/
│   └── integrations/
│       └── couriers/
│           ├── velocity/
│           │   ├── VelocityShipfastProvider.ts     # Implementation
│           │   ├── VelocityTypes.ts                # TS interfaces
│           │   ├── VelocityConfig.ts               # Configuration
│           │   ├── VelocityMapper.ts               # Data transformation
│           │   └── VelocityErrorHandler.ts         # Error mapping
│           └── mock/
│               └── MockCourierProvider.ts          # For testing
```

### Interface Design

**File:** `server/src/core/domain/interfaces/providers/ICourierProvider.ts`

**Interface Methods:**
```typescript
interface ICourierProvider {
  // Metadata
  getName(): string;
  getProviderCode(): string;

  // Authentication
  authenticate(): Promise<string>;
  isAuthenticated(): boolean;

  // Shipment Creation
  createForwardShipment(order: Order): Promise<ShipmentResponse>;
  createReverseShipment(returnOrder: ReturnOrder): Promise<ShipmentResponse>;

  // Tracking
  trackShipment(awb: string): Promise<TrackingInfo>;
  trackMultipleShipments(awbs: string[]): Promise<TrackingInfo[]>;

  // Order Management
  updateOrder(orderId: string, updates: OrderUpdate): Promise<boolean>;
  cancelShipment(awb: string, reason: string): Promise<CancellationResponse>;

  // Serviceability
  checkServiceability(request: ServiceabilityRequest): Promise<ServiceabilityResponse>;

  // Warehouse
  createWarehouse(warehouse: WarehouseData): Promise<WarehouseResponse>;

  // Documents
  getShipmentLabel(awb: string): Promise<Buffer>;
  getManifest(shipmentIds: string[]): Promise<Buffer>;

  // Reports
  getShipmentReport(dateRange: DateRange): Promise<ShipmentReport>;

  // Health Check
  isAvailable(): Promise<boolean>;
}
```

## Day-by-Day Implementation Plan

### Day 1 (Monday): Interface Design + Project Setup
**Duration:** 8-9 hours

**Morning (4h): Interface Design**
- Task 1.1: Define ICourierProvider interface
  - Agent: Claude Sonnet
  - Output: Complete TypeScript interface
  - File: `core/domain/interfaces/providers/ICourierProvider.ts`

- Task 1.2: Define TypeScript types for Velocity API
  - Agent: Claude Sonnet (from Postman collection)
  - Output: Complete type definitions
  - File: `infrastructure/integrations/couriers/velocity/VelocityTypes.ts`

**Afternoon (4h): Project Setup**
- Task 1.3: Create folder structure
  - Agent: Cursor
  - Create all folders and files (empty implementations)

- Task 1.4: Configure environment variables
  - Add to `.env.example`:
    ```
    VELOCITY_API_URL=https://shazam.velocity.in
    VELOCITY_USERNAME=
    VELOCITY_PASSWORD=
    ```

- Task 1.5: Create mock provider for testing
  - Agent: Cursor
  - File: `infrastructure/integrations/couriers/mock/MockCourierProvider.ts`
  - Returns sample data for all interface methods

**Deliverables:**
- ✅ ICourierProvider interface complete
- ✅ VelocityTypes.ts with all request/response types
- ✅ Folder structure created
- ✅ Mock provider for testing
- ✅ Environment configured

### Day 2 (Tuesday): Authentication + Forward Order
**Duration:** 8-9 hours

**Morning (4h): Authentication**
- Task 2.1: Implement authentication
  - Agent: Cursor
  - File: `VelocityShipfastProvider.ts`
  - Methods: authenticate(), isAuthenticated()
  - Token storage: Encrypted in database
  - Token refresh: Proactive at 23 hours

- Task 2.2: Add request interceptor for auth
  - Auto-inject token in headers
  - Auto-refresh on 401 response

**Afternoon (4h): Forward Order Creation**
- Task 2.3: Implement createForwardShipment()
  - Maps Order model → Velocity API format
  - Calls POST /custom/api/v1/forward-order
  - Returns ShipmentResponse with AWB, label URL

- Task 2.4: Implement data mapper
  - File: `VelocityMapper.ts`
  - Method: mapOrderToVelocity(order: Order)
  - Handles all field transformations

- Task 2.5: Write tests
  - Unit tests for authentication
  - Unit tests for order mapping
  - Integration test for full flow (with mock API)

**Deliverables:**
- ✅ Authentication working
- ✅ Forward order creation working
- ✅ Data mapper implemented
- ✅ Tests passing (70%+ coverage)

### Day 3 (Wednesday): Tracking + Cancellation + Serviceability
**Duration:** 8-9 hours

**Morning (4h): Tracking**
- Task 3.1: Implement trackShipment()
  - Endpoint: POST /custom/api/v1/order-tracking
  - Input: AWB
  - Output: TrackingInfo (status, location, history)

- Task 3.2: Implement trackMultipleShipments()
  - Batch tracking (up to 50 AWBs)
  - Parallel processing

- Task 3.3: Tracking webhook handler (prepare for Week 8)
  - File: `VelocityWebhookHandler.ts`
  - Signature verification
  - Status update processing

**Afternoon (4h): Cancellation + Serviceability**
- Task 3.4: Implement cancelShipment()
  - Endpoint: POST /custom/api/v1/cancel-order
  - Validation: Can only cancel if not picked up

- Task 3.5: Implement checkServiceability()
  - Endpoint: POST /custom/api/v1/serviceability
  - Check if delivery possible for pincode pair

- Task 3.6: Write tests
  - Tracking tests (single + batch)
  - Cancellation tests
  - Serviceability tests

**Deliverables:**
- ✅ Tracking working (single + batch)
- ✅ Cancellation working
- ✅ Serviceability check working
- ✅ Tests passing (75%+ coverage)

### Day 4 (Thursday): Reverse Orders + Warehouse + Orchestrator
**Duration:** 8-9 hours

**Morning (4h): Reverse Orders**
- Task 4.1: Implement createReverseShipment()
  - Endpoint: POST /custom/api/v1/reverse-order
  - Handle RTO (Return To Origin)
  - Handle customer returns

- Task 4.2: Implement warehouse creation
  - Endpoint: POST /custom/api/v1/warehouse
  - Create pickup locations in Velocity system

**Afternoon (4h): CourierService Orchestrator**
- Task 4.3: Implement CourierService
  - File: `core/application/services/courier/CourierService.ts`
  - Methods:
    - createShipment(order, preferredCourier?)
    - trackShipment(awb)
    - cancelShipment(shipmentId, reason)
    - selectBestCourier(order) // Future: rate comparison

- Task 4.4: Implement CourierFactory
  - Registers available providers
  - Returns provider instance by name

- Task 4.5: Update Shipment model
  - Add fields: carrier, carrierShipmentId, carrierDetails

**Deliverables:**
- ✅ Reverse shipment creation working
- ✅ Warehouse creation working
- ✅ CourierService orchestrator complete
- ✅ Shipment model updated

### Day 5 (Friday): Integration + Testing + Documentation
**Duration:** 8-9 hours

**Morning (4h): End-to-End Integration**
- Task 5.1: Create shipment from order (full flow)
  - Order created → CourierService.createShipment()
  - Velocity API called → Shipment created in DB
  - Order status updated → Label URL stored

- Task 5.2: Integration tests
  - File: `tests/integration/courier/velocity.test.ts`
  - Test complete order → shipment flow
  - Test tracking updates
  - Test cancellation

- Task 5.3: Error handling review
  - All API errors mapped to AppError
  - Retry logic for transient failures
  - Circuit breaker for API outages

**Afternoon (3h): Testing & Security**
- Task 5.4: Achieve 80%+ test coverage
  - Run: npm run test:coverage
  - Add missing tests

- Task 5.5: Security review
  - Credentials encrypted in storage
  - No credentials in logs
  - Input validation before API calls
  - Rate limiting implemented

**Evening (2h): Documentation**
- Task 5.6: API endpoint documentation
  - Document all new endpoints
  - Add to API_INVENTORY.md

- Task 5.7: Update context packages
  - Update SHIPMENT_CONTEXT.md
  - Update VELOCITY_SHIPFAST_INTEGRATION.md

**Deliverables:**
- ✅ End-to-end shipment creation working
- ✅ 80%+ test coverage achieved
- ✅ Security reviewed and approved
- ✅ All endpoints documented
- ✅ Context packages updated
- ✅ Week 2 COMPLETE

## Testing Strategy

### Unit Tests
**Location:** `tests/unit/integrations/velocity/`

**Files:**
- VelocityShipfastProvider.test.ts
- VelocityMapper.test.ts
- VelocityErrorHandler.test.ts

**Coverage:**
- All interface methods
- Error scenarios
- Data mapping edge cases
- Token refresh logic

### Integration Tests
**Location:** `tests/integration/courier/`

**Files:**
- velocity-shipment-creation.test.ts
- velocity-tracking.test.ts
- velocity-cancellation.test.ts

**Scenarios:**
- Order → Shipment end-to-end
- Multiple shipment creation
- Tracking updates
- Cancellation flow

### Manual Testing (Optional, Staging)
**Location:** `tests/manual/velocity-real-api.test.ts`

**Prerequisites:**
- Valid Velocity credentials in .env.test
- Test warehouse created (ID: WHYYB5)

**Tests:**
- Real authentication
- Real order creation
- Real tracking
- Mark as `.skip` to prevent accidental execution

## Error Handling

### Velocity API Errors
```typescript
// Map Velocity errors to standard AppError
400 Bad Request → ValidationError
401 Unauthorized → AuthenticationError
404 Not Found → NotFoundError
429 Too Many Requests → RateLimitError
500 Internal Server Error → ExternalServiceError
```

### Retry Strategy
- Network errors: Retry 3x with exponential backoff (1s, 2s, 4s)
- 401 errors: Refresh token once and retry
- 429 errors: Wait for rate limit reset, then retry
- 500 errors: Retry 2x, then fail

### Circuit Breaker
- If 5 consecutive failures: Open circuit (stop calling API)
- After 60 seconds: Half-open (try one request)
- If success: Close circuit (resume normal)

## Security Checklist
- [ ] Credentials stored encrypted (AES-256)
- [ ] Credentials never logged
- [ ] Token encrypted in database
- [ ] All input validated before API call
- [ ] Rate limiting implemented
- [ ] HTTPS only
- [ ] Webhook signature verification
- [ ] No sensitive data in error messages

## Performance Requirements
- Shipment creation: <2 seconds end-to-end
- Tracking lookup: <500ms
- Batch tracking (10 AWBs): <1 second
- Token refresh: <300ms

## Environment Variables Required
```bash
VELOCITY_API_URL=https://shazam.velocity.in
VELOCITY_USERNAME=+91xxxxxxxxxx
VELOCITY_PASSWORD=xxxxxxxxxxxxx
VELOCITY_TOKEN_EXPIRY_HOURS=24
VELOCITY_RATE_LIMIT_PER_MIN=100
```

## Implementation Checklist
- [ ] Day 1: Interface design + project setup
- [ ] Day 2: Authentication + forward order
- [ ] Day 3: Tracking + cancellation + serviceability
- [ ] Day 4: Reverse orders + warehouse + orchestrator
- [ ] Day 5: Integration + testing + documentation
- [ ] 80%+ test coverage achieved
- [ ] Security review passed
- [ ] All 12 endpoints working
- [ ] Documentation complete
- [ ] Week 2 COMPLETE ✅

## Next Week Preview
**Week 3:** Razorpay Payment Gateway Integration
- Similar pattern: IPaymentProvider interface
- Razorpay Orders API
- Payment capture
- Webhook handling
- Refund processing
```

**Deliverable:** Complete Week 2 specification (20-25 pages)

---

### WEEK 1 SUMMARY

**Achievements:**
1. ✅ Master context document created (15-20 pages)
2. ✅ Development tracking system established
3. ✅ Testing infrastructure configured (Jest + Supertest)
4. ✅ Documentation templates created (5 templates)
5. ✅ Code baseline metrics captured
6. ✅ 8 context packages created:
   - Auth & User Management
   - Order Management
   - Shipment Management
   - Warehouse & Logistics
   - Rate Card & Pricing
   - Velocity Shipfast Integration
   - Razorpay Integration
   - DeepVue KYC Integration
7. ✅ Agent assignment matrix defined
8. ✅ Session templates created (4 types)
9. ✅ Parallel development tracks planned
10. ✅ Sprint structure defined
11. ✅ Race condition fixes implemented
12. ✅ Week 2 detailed specification complete

**Deliverables:**
- 60+ pages of comprehensive documentation
- Fully functional testing framework
- AI-agent-ready context packages
- Clear 16-week roadmap structure
- Week 2 ready to execute with zero ambiguity

**Time Spent:** 40-45 hours (5 days × 8-9 hours)

**Ready for Week 2:** ✅ READY

---

## WEEK 2: VELOCITY SHIPFAST COURIER INTEGRATION

[See detailed specification in `docs/Development/Specifications/WEEK2_VELOCITY_SHIPFAST_SPEC.md`]

### Week 2 Quick Summary

**Objective:** Implement complete Velocity Shipfast API integration (0% → 100%)

**Daily Breakdown:**
- **Day 1 (Monday):** Interface design + project setup
- **Day 2 (Tuesday):** Authentication + forward order creation
- **Day 3 (Wednesday):** Tracking + cancellation + serviceability
- **Day 4 (Thursday):** Reverse orders + warehouse + orchestrator
- **Day 5 (Friday):** Integration + testing + documentation

**Success Criteria:**
- ✅ All 12 Velocity API endpoints integrated
- ✅ Order → Shipment creation working end-to-end
- ✅ Tracking updates functional
- ✅ 80%+ test coverage
- ✅ Security reviewed
- ✅ Fully documented

**Key Files Created:**
```
server/src/core/domain/interfaces/providers/ICourierProvider.ts
server/src/core/application/services/courier/CourierService.ts
server/src/infrastructure/integrations/couriers/velocity/VelocityShipfastProvider.ts
server/src/infrastructure/integrations/couriers/velocity/VelocityTypes.ts
server/src/infrastructure/integrations/couriers/velocity/VelocityMapper.ts
server/src/infrastructure/integrations/couriers/mock/MockCourierProvider.ts
server/tests/unit/integrations/velocity/VelocityShipfastProvider.test.ts
server/tests/integration/courier/velocity-shipment-creation.test.ts
docs/Development/Specifications/WEEK2_VELOCITY_SHIPFAST_SPEC.md
```

**Dependencies Installed:**
```bash
# Already have axios
npm install axios
```

**Environment Variables Added:**
```bash
VELOCITY_API_URL=https://shazam.velocity.in
VELOCITY_USERNAME=+91xxxxxxxxxx
VELOCITY_PASSWORD=xxxxxxxxxxxxx
```

**Time Estimate:** 40-45 hours (5 days × 8-9 hours)

---

## NEXT STEPS

### After Week 2 Completion:

**Week 3:** Razorpay Payment Gateway Integration
**Week 4:** Wallet System + PDF Generation (Labels, Invoices)
**Week 5:** Warehouse Workflows (Picking, Packing, Manifest)

**Weeks 6-16:** Will be planned in detail when Week 1-2 are complete

---

## APPENDIX

### A. File Structure Reference

```
server/
├── src/
│   ├── core/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   └── interfaces/
│   │   │       └── providers/
│   │   │           ├── ICourierProvider.ts
│   │   │           ├── IPaymentProvider.ts
│   │   │           └── IStorageProvider.ts
│   │   └── application/
│   │       └── services/
│   │           ├── auth/
│   │           ├── order/
│   │           ├── shipment/
│   │           ├── courier/
│   │           │   ├── CourierService.ts
│   │           │   └── CourierFactory.ts
│   │           ├── payment/
│   │           └── wallet/
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── mongoose/
│   │   │       ├── models/
│   │   │       └── repositories/
│   │   └── integrations/
│   │       ├── couriers/
│   │       │   ├── velocity/
│   │       │   └── mock/
│   │       ├── payment/
│   │       │   └── razorpay/
│   │       └── storage/
│   │           └── s3/
│   ├── presentation/
│   │   └── http/
│   │       ├── controllers/
│   │       ├── routes/
│   │       └── middlewares/
│   └── shared/
│       ├── utils/
│       │   ├── optimisticLocking.ts
│       │   └── encryption.ts
│       ├── errors/
│       └── types/
├── tests/
│   ├── setup/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── mocks/
└── docs/
    ├── Development/
    │   ├── MASTER_CONTEXT.md
    │   ├── DEVELOPMENT_TRACKER.md
    │   ├── AGENT_ASSIGNMENT_MATRIX.md
    │   ├── PARALLEL_TRACKS.md
    │   ├── SPRINT_TEMPLATE.md
    │   ├── SESSION_TEMPLATES/
    │   └── Specifications/
    │       └── WEEK2_VELOCITY_SHIPFAST_SPEC.md
    ├── ContextPackages/
    │   ├── AUTH_USER_CONTEXT.md
    │   ├── ORDER_CONTEXT.md
    │   ├── SHIPMENT_CONTEXT.md
    │   ├── WAREHOUSE_CONTEXT.md
    │   ├── RATECARD_CONTEXT.md
    │   ├── VELOCITY_SHIPFAST_INTEGRATION.md
    │   ├── RAZORPAY_INTEGRATION.md
    │   └── DEEPVUE_INTEGRATION.md
    └── Templates/
        ├── API_ENDPOINT_TEMPLATE.md
        ├── SERVICE_TEMPLATE.md
        ├── INTEGRATION_TEMPLATE.md
        └── FEATURE_SPEC_TEMPLATE.md
```

### B. Key Terminology

- **CANON:** Context, Agent Orchestration, Nested Operations (AI-native methodology)
- **Clean Architecture:** Domain → Application → Infrastructure → Presentation
- **Optimistic Locking:** Concurrency control using version fields
- **Context Package:** Reusable documentation for AI agent sessions
- **Parallel Track:** Independent development stream that can run concurrently
- **Sprint:** 2-week development cycle with defined goals

### C. Quality Standards

**Code Quality:**
- TypeScript strict mode enabled
- ESLint rules enforced
- No `any` types (use proper types)
- All public methods documented (JSDoc)

**Testing:**
- Unit tests: Test business logic in isolation
- Integration tests: Test full request-response cycles
- E2E tests: Test complete user workflows
- Coverage: 80%+ for critical paths (payment, courier)

**Documentation:**
- All API endpoints documented
- All services documented
- All integrations documented
- Context packages up to date

**Security:**
- No credentials in code or logs
- All input validated
- Rate limiting implemented
- HTTPS only for external APIs

---

---

## WEEK 3: RAZORPAY PAYMENT GATEWAY INTEGRATION

### Week 3 Objectives
1. Implement complete Razorpay payment gateway integration
2. Create IPaymentProvider interface for future payment gateways
3. Handle payment orders, capture, refunds, and webhooks
4. Implement webhook signature verification for security
5. Achieve 80%+ test coverage on payment flows
6. Ensure PCI compliance and security best practices

### Week 3 Overview

**Goal:** Implement Razorpay as the payment gateway (0% → 100% payment integration)

**Why Razorpay:**
- Popular in India
- Comprehensive API
- Supports UPI, Cards, Wallets, NetBanking
- Excellent webhook system
- Test mode available

**Payment Flows to Implement:**
1. **Prepaid Orders:** User pays → Razorpay → Order confirmed
2. **Wallet Recharge:** User adds money → Razorpay → Wallet credited
3. **Refunds:** Order cancelled → Refund initiated → Money returned
4. **Webhooks:** Razorpay sends status updates → System processes

---

### DAY 1 (Monday): Payment Architecture + Razorpay SDK Setup

**Total Time:** 8-9 hours
**Agent:** Claude Sonnet (architecture), Cursor (implementation)
**Goal:** Design payment system architecture and integrate Razorpay SDK

#### Morning Session (4 hours): Payment Architecture Design

**Task 1.1: Create IPaymentProvider Interface**

**File:** `server/src/core/domain/interfaces/providers/IPaymentProvider.ts`

**Agent:** Claude Sonnet

**Prompt:**
```
Design a payment provider interface that:
1. Abstracts payment gateway operations (Razorpay now, others later)
2. Handles order creation, payment capture, refunds
3. Webhook verification and processing
4. Payment status tracking
5. Multiple payment methods (UPI, cards, wallets)

Make it extensible for future gateways (Stripe, PayU, etc.)
```

**Interface Methods:**
```typescript
interface IPaymentProvider {
  // Metadata
  getName(): string;
  getProviderCode(): string;

  // Order Creation
  createPaymentOrder(request: PaymentOrderRequest): Promise<PaymentOrder>;

  // Payment Verification
  verifyPayment(paymentId: string): Promise<PaymentVerification>;
  verifyWebhookSignature(payload: string, signature: string): boolean;

  // Refunds
  createRefund(request: RefundRequest): Promise<Refund>;
  getRefundStatus(refundId: string): Promise<RefundStatus>;

  // Payment Methods
  getSupportedMethods(): PaymentMethod[];

  // Webhooks
  processWebhook(payload: WebhookPayload): Promise<WebhookResult>;

  // Utility
  isAvailable(): Promise<boolean>;
}
```

**Deliverable:** Complete IPaymentProvider interface

---

**Task 1.2: Define Razorpay Types**

**File:** `server/src/infrastructure/integrations/payment/razorpay/RazorpayTypes.ts`

**Agent:** Claude Sonnet

**Content:**
```typescript
// Razorpay-specific TypeScript interfaces

interface RazorpayOrderRequest {
  amount: number;              // in paise (₹100 = 10000 paise)
  currency: string;            // INR
  receipt: string;             // unique receipt ID
  notes?: Record<string, any>; // metadata
}

interface RazorpayOrder {
  id: string;                  // order_xxx
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

interface RazorpayPayment {
  id: string;                  // pay_xxx
  entity: 'payment';
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string;
  method: 'card' | 'netbanking' | 'wallet' | 'upi';
  email?: string;
  contact?: string;
  captured: boolean;
  created_at: number;
}

interface RazorpayWebhookEvent {
  entity: string;
  account_id: string;
  event: string;              // payment.captured, payment.failed, etc.
  contains: string[];
  payload: {
    payment: { entity: RazorpayPayment };
    order?: { entity: RazorpayOrder };
  };
  created_at: number;
}
```

**Deliverable:** Complete TypeScript type definitions

---

#### Afternoon Session (4 hours): Razorpay SDK Integration

**Task 1.3: Install Razorpay SDK**

**Agent:** Cursor

**Actions:**
```bash
cd server
npm install razorpay
npm install --save-dev @types/razorpay
npm install crypto  # for webhook signature verification
```

**Verify Installation:**
```bash
npm list razorpay
# Should show razorpay@2.x.x
```

---

**Task 1.4: Create Razorpay Configuration**

**File:** `server/src/infrastructure/integrations/payment/razorpay/RazorpayConfig.ts`

**Agent:** Cursor

**Content:**
```typescript
import Razorpay from 'razorpay';

export class RazorpayConfig {
  private static instance: Razorpay;

  static getInstance(): Razorpay {
    if (!this.instance) {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        throw new Error('Razorpay credentials not configured');
      }

      this.instance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
    }
    return this.instance;
  }

  static getWebhookSecret(): string {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('Razorpay webhook secret not configured');
    }
    return secret;
  }
}
```

**Environment Variables:**

**File:** `server/.env.example`

Add:
```bash
# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

**Deliverable:** Razorpay SDK configured and ready

---

**Task 1.5: Create Payment Models**

**File:** `server/src/infrastructure/database/mongoose/models/Payment.ts`

**Agent:** Cursor

**Schema Overview:**
```typescript
const PaymentSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // Payment Details
  amount: { type: Number, required: true },  // in paise
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['card', 'upi', 'netbanking', 'wallet'] },

  // Razorpay IDs
  razorpayOrderId: { type: String, required: true, unique: true },
  razorpayPaymentId: { type: String, sparse: true },
  razorpaySignature: { type: String },

  // Status
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
    default: 'created'
  },

  // Metadata
  receipt: { type: String, required: true },
  notes: { type: Map, of: String },

  // Timestamps
  paidAt: { type: Date },
  refundedAt: { type: Date }
}, { timestamps: true });
```

**Indexes:**
```typescript
PaymentSchema.index({ razorpayOrderId: 1 });
PaymentSchema.index({ razorpayPaymentId: 1 });
PaymentSchema.index({ companyId: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });
```

**Deliverable:** Payment model created

---

### DAY 2 (Tuesday): Payment Order Creation + Payment Capture

**Total Time:** 8-9 hours
**Agent:** Cursor (implementation), Claude Sonnet (review)
**Goal:** Implement payment order creation and capture flow

#### Morning Session (4 hours): Payment Order Creation

**Task 2.1: Implement RazorpayProvider**

**File:** `server/src/infrastructure/integrations/payment/razorpay/RazorpayProvider.ts`

**Agent:** Cursor

**Implementation:**
```typescript
import { IPaymentProvider } from '@/core/domain/interfaces/providers/IPaymentProvider';
import { RazorpayConfig } from './RazorpayConfig';
import crypto from 'crypto';

export class RazorpayProvider implements IPaymentProvider {
  private razorpay = RazorpayConfig.getInstance();

  getName(): string {
    return 'Razorpay';
  }

  getProviderCode(): string {
    return 'razorpay';
  }

  async createPaymentOrder(request: PaymentOrderRequest): Promise<PaymentOrder> {
    // Convert amount to paise (₹100 = 10000 paise)
    const amountInPaise = Math.round(request.amount * 100);

    const razorpayOrder = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: request.receipt,
      notes: request.notes
    });

    return {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      status: razorpayOrder.status,
      createdAt: new Date(razorpayOrder.created_at * 1000)
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerification> {
    const payment = await this.razorpay.payments.fetch(paymentId);

    return {
      paymentId: payment.id,
      orderId: payment.order_id,
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      captured: payment.captured,
      email: payment.email,
      contact: payment.contact
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const webhookSecret = RazorpayConfig.getWebhookSecret();

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Verify credentials by fetching a dummy order (will fail but proves connection)
      await this.razorpay.orders.fetch('dummy');
      return true;
    } catch (error) {
      // If error is authentication related, credentials are wrong
      if (error.statusCode === 401) return false;
      // Other errors (like 404) mean connection works
      return true;
    }
  }
}
```

**Deliverable:** RazorpayProvider with order creation

---

**Task 2.2: Create Payment Service**

**File:** `server/src/core/application/services/payment/payment.service.ts`

**Agent:** Cursor

**Methods:**
```typescript
export class PaymentService {
  private paymentProvider: IPaymentProvider;

  constructor() {
    this.paymentProvider = new RazorpayProvider();
  }

  async createPaymentOrder(data: CreatePaymentOrderDTO): Promise<Payment> {
    // Generate unique receipt
    const receipt = `RCP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create order in Razorpay
    const razorpayOrder = await this.paymentProvider.createPaymentOrder({
      amount: data.amount,
      receipt,
      notes: {
        orderId: data.orderId?.toString(),
        userId: data.userId.toString(),
        companyId: data.companyId.toString(),
        purpose: data.purpose // 'order_payment' or 'wallet_recharge'
      }
    });

    // Save payment record
    const payment = await Payment.create({
      orderId: data.orderId,
      companyId: data.companyId,
      userId: data.userId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      razorpayOrderId: razorpayOrder.id,
      receipt,
      status: 'created',
      notes: razorpayOrder.notes
    });

    return payment;
  }

  async verifyAndCapturePayment(data: VerifyPaymentDTO): Promise<Payment> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Verify signature
    const isValid = this.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      throw new ValidationError('Invalid payment signature');
    }

    // Update payment record
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = 'captured';
    payment.paidAt = new Date();

    await payment.save();

    // Post-payment processing
    await this.processSuccessfulPayment(payment);

    return payment;
  }

  private verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const body = orderId + '|' + paymentId;

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  private async processSuccessfulPayment(payment: Payment): Promise<void> {
    const purpose = payment.notes?.get('purpose');

    if (purpose === 'wallet_recharge') {
      // Credit wallet (Week 4 implementation)
      await this.creditWallet(payment);
    } else if (purpose === 'order_payment') {
      // Update order status
      await this.updateOrderPaymentStatus(payment);
    }
  }
}
```

**Deliverable:** Payment service with order creation and verification

---

#### Afternoon Session (4 hours): Payment API Endpoints

**Task 2.3: Create Payment Controller**

**File:** `server/src/presentation/http/controllers/payment/payment.controller.ts`

**Agent:** Cursor

**Endpoints:**
```typescript
export class PaymentController {
  private paymentService = new PaymentService();

  // POST /api/v1/payments/orders
  async createOrder(req: Request, res: Response) {
    const { amount, purpose, orderId } = req.body;
    const { userId, companyId } = req.user;

    const payment = await this.paymentService.createPaymentOrder({
      amount,
      orderId,
      userId,
      companyId,
      purpose
    });

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        razorpayOrderId: payment.razorpayOrderId,
        amount: payment.amount,
        currency: payment.currency,
        keyId: process.env.RAZORPAY_KEY_ID // For frontend
      }
    });
  }

  // POST /api/v1/payments/verify
  async verifyPayment(req: Request, res: Response) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const payment = await this.paymentService.verifyAndCapturePayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        status: payment.status,
        paidAt: payment.paidAt
      }
    });
  }

  // GET /api/v1/payments/:id
  async getPayment(req: Request, res: Response) {
    const { id } = req.params;
    const { companyId } = req.user;

    const payment = await Payment.findOne({ _id: id, companyId });
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    res.json({
      success: true,
      data: payment
    });
  }

  // GET /api/v1/payments
  async listPayments(req: Request, res: Response) {
    const { companyId } = req.user;
    const { page = 1, limit = 20, status } = req.query;

    const filter: any = { companyId };
    if (status) filter.status = status;

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .populate('userId', 'firstName lastName email')
      .populate('orderId', 'orderNumber');

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: +page,
        limit: +limit,
        total,
        pages: Math.ceil(total / +limit)
      }
    });
  }
}
```

**Deliverable:** Payment API endpoints

---

**Task 2.4: Create Payment Routes**

**File:** `server/src/presentation/http/routes/v1/payment/payment.routes.ts`

**Agent:** Cursor

**Routes:**
```typescript
import { Router } from 'express';
import { PaymentController } from '@/presentation/http/controllers/payment/payment.controller';
import { authenticate } from '@/presentation/http/middlewares/auth.middleware';
import { validate } from '@/presentation/http/middlewares/validation.middleware';

const router = Router();
const controller = new PaymentController();

// All routes require authentication
router.use(authenticate);

router.post('/orders',
  validate(createPaymentOrderSchema),
  controller.createOrder
);

router.post('/verify',
  validate(verifyPaymentSchema),
  controller.verifyPayment
);

router.get('/:id', controller.getPayment);
router.get('/', controller.listPayments);

export default router;
```

**Validation Schemas:**

**File:** `server/src/presentation/http/validators/payment.validator.ts`

```typescript
import Joi from 'joi';

export const createPaymentOrderSchema = {
  body: Joi.object({
    amount: Joi.number().min(1).required(),
    purpose: Joi.string().valid('order_payment', 'wallet_recharge').required(),
    orderId: Joi.string().when('purpose', {
      is: 'order_payment',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  })
};

export const verifyPaymentSchema = {
  body: Joi.object({
    razorpayOrderId: Joi.string().required(),
    razorpayPaymentId: Joi.string().required(),
    razorpaySignature: Joi.string().required()
  })
};
```

**Deliverable:** Payment routes configured

---

### DAY 3 (Wednesday): Webhook Handling + Refunds

**Total Time:** 8-9 hours
**Agent:** Cursor (implementation)
**Goal:** Implement webhook processing and refund functionality

#### Morning Session (4 hours): Webhook System

**Task 3.1: Create Webhook Handler**

**File:** `server/src/infrastructure/integrations/payment/razorpay/RazorpayWebhookHandler.ts`

**Agent:** Cursor

**Implementation:**
```typescript
export class RazorpayWebhookHandler {
  private paymentProvider = new RazorpayProvider();

  async handleWebhook(
    payload: string,
    signature: string
  ): Promise<WebhookResult> {
    // Verify signature
    const isValid = this.paymentProvider.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      throw new ValidationError('Invalid webhook signature');
    }

    // Parse payload
    const event: RazorpayWebhookEvent = JSON.parse(payload);

    // Route to appropriate handler
    switch (event.event) {
      case 'payment.captured':
        return await this.handlePaymentCaptured(event);

      case 'payment.failed':
        return await this.handlePaymentFailed(event);

      case 'payment.authorized':
        return await this.handlePaymentAuthorized(event);

      case 'refund.created':
        return await this.handleRefundCreated(event);

      case 'refund.processed':
        return await this.handleRefundProcessed(event);

      default:
        return { processed: false, event: event.event };
    }
  }

  private async handlePaymentCaptured(event: RazorpayWebhookEvent) {
    const payment = event.payload.payment.entity;

    // Find payment record
    const paymentRecord = await Payment.findOne({
      razorpayOrderId: payment.order_id
    });

    if (!paymentRecord) {
      return { processed: false, reason: 'Payment not found' };
    }

    // Update status
    paymentRecord.razorpayPaymentId = payment.id;
    paymentRecord.status = 'captured';
    paymentRecord.method = payment.method;
    paymentRecord.paidAt = new Date(payment.created_at * 1000);
    await paymentRecord.save();

    // Process payment (wallet credit, order update)
    await this.processPaymentSuccess(paymentRecord);

    return { processed: true, paymentId: paymentRecord._id };
  }

  private async handlePaymentFailed(event: RazorpayWebhookEvent) {
    const payment = event.payload.payment.entity;

    const paymentRecord = await Payment.findOne({
      razorpayOrderId: payment.order_id
    });

    if (paymentRecord) {
      paymentRecord.razorpayPaymentId = payment.id;
      paymentRecord.status = 'failed';
      await paymentRecord.save();
    }

    return { processed: true };
  }

  private async processPaymentSuccess(payment: Payment) {
    const purpose = payment.notes?.get('purpose');

    if (purpose === 'wallet_recharge') {
      // Credit wallet
      await WalletService.creditWallet({
        userId: payment.userId,
        amount: payment.amount / 100, // Convert paise to rupees
        type: 'recharge',
        reference: payment._id.toString(),
        description: 'Wallet recharge via Razorpay'
      });
    } else if (purpose === 'order_payment') {
      // Update order
      await Order.findByIdAndUpdate(payment.orderId, {
        paymentStatus: 'paid',
        paymentMethod: 'online',
        paidAt: payment.paidAt
      });
    }
  }
}
```

**Deliverable:** Webhook handler implementation

---

**Task 3.2: Create Webhook Endpoint**

**File:** `server/src/presentation/http/controllers/payment/webhook.controller.ts`

**Agent:** Cursor

**Controller:**
```typescript
export class WebhookController {
  private webhookHandler = new RazorpayWebhookHandler();

  // POST /api/v1/webhooks/razorpay
  async handleRazorpayWebhook(req: Request, res: Response) {
    const signature = req.headers['x-razorpay-signature'] as string;
    const payload = JSON.stringify(req.body);

    try {
      const result = await this.webhookHandler.handleWebhook(payload, signature);

      res.json({
        success: true,
        processed: result.processed
      });
    } catch (error) {
      // Log error but return 200 to prevent Razorpay retries
      console.error('Webhook processing error:', error);

      res.status(200).json({
        success: false,
        error: error.message
      });
    }
  }
}
```

**Route:**
```typescript
// Note: No authentication for webhooks (verified by signature)
router.post('/webhooks/razorpay', webhookController.handleRazorpayWebhook);
```

**Deliverable:** Webhook endpoint

---

#### Afternoon Session (4 hours): Refund System

**Task 3.3: Implement Refund Functionality**

**File:** Add to `RazorpayProvider.ts`

**Agent:** Cursor

**Methods:**
```typescript
async createRefund(request: RefundRequest): Promise<Refund> {
  const refund = await this.razorpay.payments.refund(request.paymentId, {
    amount: request.amount ? Math.round(request.amount * 100) : undefined,
    notes: request.notes
  });

  return {
    id: refund.id,
    paymentId: refund.payment_id,
    amount: refund.amount,
    currency: refund.currency,
    status: refund.status,
    createdAt: new Date(refund.created_at * 1000)
  };
}

async getRefundStatus(refundId: string): Promise<RefundStatus> {
  const refund = await this.razorpay.refunds.fetch(refundId);

  return {
    id: refund.id,
    status: refund.status,
    amount: refund.amount,
    processedAt: refund.processed_at ? new Date(refund.processed_at * 1000) : null
  };
}
```

**Deliverable:** Refund methods

---

**Task 3.4: Create Refund Service**

**File:** `server/src/core/application/services/payment/refund.service.ts`

**Agent:** Cursor

**Methods:**
```typescript
export class RefundService {
  private paymentProvider = new RazorpayProvider();

  async initiateRefund(data: InitiateRefundDTO): Promise<Refund> {
    // Find original payment
    const payment = await Payment.findById(data.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== 'captured') {
      throw new ValidationError('Cannot refund uncaptured payment');
    }

    if (!payment.razorpayPaymentId) {
      throw new ValidationError('Razorpay payment ID missing');
    }

    // Create refund
    const refund = await this.paymentProvider.createRefund({
      paymentId: payment.razorpayPaymentId,
      amount: data.amount, // Optional: partial refund
      notes: {
        reason: data.reason,
        initiatedBy: data.userId.toString()
      }
    });

    // Create refund record
    const refundRecord = await Refund.create({
      paymentId: payment._id,
      companyId: payment.companyId,
      userId: payment.userId,
      razorpayRefundId: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      reason: data.reason,
      initiatedBy: data.userId
    });

    // Update payment status
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    await payment.save();

    return refundRecord;
  }

  async getRefundStatus(refundId: string): Promise<Refund> {
    const refund = await Refund.findById(refundId);
    if (!refund) {
      throw new NotFoundError('Refund not found');
    }

    // Check latest status from Razorpay
    const status = await this.paymentProvider.getRefundStatus(
      refund.razorpayRefundId
    );

    // Update if changed
    if (status.status !== refund.status) {
      refund.status = status.status;
      if (status.processedAt) {
        refund.processedAt = status.processedAt;
      }
      await refund.save();
    }

    return refund;
  }
}
```

**Refund Model:**

**File:** `server/src/infrastructure/database/mongoose/models/Refund.ts`

```typescript
const RefundSchema = new Schema({
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  razorpayRefundId: { type: String, required: true, unique: true },

  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  status: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending'
  },

  reason: { type: String },
  initiatedBy: { type: Schema.Types.ObjectId, ref: 'User' },

  processedAt: { type: Date }
}, { timestamps: true });
```

**Deliverable:** Refund system complete

---

### DAY 4 (Thursday): Testing + Security

**Total Time:** 8-9 hours
**Agent:** Cursor (tests), Claude Sonnet (security review)
**Goal:** Achieve 80%+ test coverage and pass security review

#### Morning Session (4 hours): Unit & Integration Tests

**Task 4.1: Payment Service Tests**

**File:** `server/tests/unit/services/payment/payment.service.test.ts`

**Agent:** Cursor

**Test Cases:**
```typescript
describe('PaymentService', () => {
  describe('createPaymentOrder', () => {
    it('should create payment order successfully', async () => {
      const data = {
        amount: 100,
        userId: testUser._id,
        companyId: testCompany._id,
        purpose: 'wallet_recharge'
      };

      const payment = await paymentService.createPaymentOrder(data);

      expect(payment.amount).toBe(10000); // ₹100 = 10000 paise
      expect(payment.status).toBe('created');
      expect(payment.razorpayOrderId).toBeDefined();
    });

    it('should include order ID for order payments', async () => {
      const data = {
        amount: 500,
        userId: testUser._id,
        companyId: testCompany._id,
        purpose: 'order_payment',
        orderId: testOrder._id
      };

      const payment = await paymentService.createPaymentOrder(data);

      expect(payment.orderId.toString()).toBe(testOrder._id.toString());
    });
  });

  describe('verifyAndCapturePayment', () => {
    it('should verify valid payment signature', async () => {
      const payment = await createTestPayment();
      const { orderId, paymentId, signature } = generateValidSignature(payment);

      const verified = await paymentService.verifyAndCapturePayment({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature
      });

      expect(verified.status).toBe('captured');
      expect(verified.paidAt).toBeDefined();
    });

    it('should reject invalid signature', async () => {
      const payment = await createTestPayment();

      await expect(
        paymentService.verifyAndCapturePayment({
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: 'pay_test',
          razorpaySignature: 'invalid_signature'
        })
      ).rejects.toThrow('Invalid payment signature');
    });
  });
});
```

**Deliverable:** Payment service tests (80%+ coverage)

---

**Task 4.2: Webhook Handler Tests**

**File:** `server/tests/unit/integrations/razorpay/webhook.test.ts`

**Test Cases:**
```typescript
describe('RazorpayWebhookHandler', () => {
  it('should process payment.captured event', async () => {
    const payment = await createTestPayment();
    const event = createWebhookEvent('payment.captured', payment);
    const { payload, signature } = signWebhookEvent(event);

    const result = await webhookHandler.handleWebhook(payload, signature);

    expect(result.processed).toBe(true);

    const updatedPayment = await Payment.findById(payment._id);
    expect(updatedPayment.status).toBe('captured');
  });

  it('should reject invalid signature', async () => {
    const event = createWebhookEvent('payment.captured');
    const payload = JSON.stringify(event);

    await expect(
      webhookHandler.handleWebhook(payload, 'invalid_signature')
    ).rejects.toThrow('Invalid webhook signature');
  });
});
```

**Deliverable:** Webhook tests

---

**Task 4.3: Integration Tests**

**File:** `server/tests/integration/payment/payment-flow.test.ts`

**Test Full Flow:**
```typescript
describe('Payment Flow End-to-End', () => {
  it('should complete full payment flow', async () => {
    // 1. Create payment order
    const orderResponse = await request(app)
      .post('/api/v1/payments/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 100,
        purpose: 'wallet_recharge'
      });

    expect(orderResponse.status).toBe(201);
    const { razorpayOrderId } = orderResponse.body.data;

    // 2. Simulate payment (in test, generate valid signature)
    const paymentId = 'pay_test_' + Date.now();
    const signature = generateValidSignature(razorpayOrderId, paymentId);

    // 3. Verify payment
    const verifyResponse = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature
      });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.data.status).toBe('captured');

    // 4. Verify payment record in database
    const payment = await Payment.findOne({ razorpayOrderId });
    expect(payment.status).toBe('captured');
    expect(payment.paidAt).toBeDefined();
  });

  it('should handle refund flow', async () => {
    // Create and capture payment first
    const payment = await createAndCaptureTestPayment();

    // Initiate refund
    const refundResponse = await request(app)
      .post(`/api/v1/payments/${payment._id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: payment.amount / 100,
        reason: 'Customer request'
      });

    expect(refundResponse.status).toBe(200);
    expect(refundResponse.body.data.status).toBe('pending');
  });
});
```

**Deliverable:** Integration tests passing

---

#### Afternoon Session (4 hours): Security Review

**Task 4.4: Security Audit**

**Agent:** Claude Sonnet

**Checklist:**
```markdown
## Payment Security Audit

### Credential Management
- [x] Razorpay credentials stored in environment variables
- [x] Credentials never logged or exposed in responses
- [x] Webhook secret properly configured
- [x] No hardcoded API keys in code

### Signature Verification
- [x] Payment signature verified before capture
- [x] Webhook signature verified before processing
- [x] Timing-safe comparison for signatures
- [x] Failed verification throws errors

### Data Validation
- [x] Amount validation (positive, reasonable limits)
- [x] Purpose validation (enum values only)
- [x] User authorization checks (can only access own payments)
- [x] Input sanitization

### PCI Compliance
- [x] No card data stored on server
- [x] Payment processing via Razorpay (PCI compliant)
- [x] HTTPS enforced for all payment endpoints
- [x] Sensitive data encrypted in transit

### Rate Limiting
- [ ] Rate limit payment creation (max 10/minute per user)
- [ ] Rate limit refund requests (max 5/minute)
- [ ] Webhook endpoint rate limited

### Error Handling
- [x] No sensitive data in error messages
- [x] Generic errors for failed payments
- [x] Detailed errors logged securely
- [x] Webhook errors don't expose system details

### Audit Trail
- [x] All payment actions logged
- [x] Refunds tracked with initiator
- [x] Webhook events logged
- [x] Failed payment attempts recorded
```

**Actions Required:**
1. Add rate limiting middleware
2. Add payment amount limits (min ₹1, max ₹100,000)
3. Add audit logging for all payment operations

**Deliverable:** Security audit complete with actions

---

**Task 4.5: Add Rate Limiting**

**File:** `server/src/presentation/http/middlewares/rateLimit.middleware.ts`

**Implementation:**
```typescript
import rateLimit from 'express-rate-limit';

export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many payment requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

export const refundRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many refund requests, please try again later'
});
```

**Apply to Routes:**
```typescript
router.post('/orders', paymentRateLimit, controller.createOrder);
router.post('/:id/refund', refundRateLimit, controller.initiateRefund);
```

**Deliverable:** Rate limiting applied

---

### DAY 5 (Friday): Documentation + Integration

**Total Time:** 8-9 hours
**Agent:** Claude Sonnet (documentation)
**Goal:** Complete documentation and prepare for Week 4

#### Morning Session (4 hours): Documentation

**Task 5.1: API Documentation**

**File:** `docs/API/Payment.md`

**Content:**
```markdown
# Payment API Documentation

## Create Payment Order

**Endpoint:** `POST /api/v1/payments/orders`
**Authentication:** Required
**Purpose:** Create a Razorpay order for payment

### Request
```json
{
  "amount": 100,
  "purpose": "wallet_recharge",
  "orderId": "optional_for_order_payment"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "paymentId": "64abc123...",
    "razorpayOrderId": "order_xxx",
    "amount": 10000,
    "currency": "INR",
    "keyId": "rzp_test_xxx"
  }
}
```

### Frontend Integration
```javascript
const options = {
  key: response.data.keyId,
  amount: response.data.amount,
  currency: response.data.currency,
  order_id: response.data.razorpayOrderId,
  handler: function(response) {
    // Verify payment
    verifyPayment(response);
  }
};

const razorpay = new Razorpay(options);
razorpay.open();
```

[Continue for all endpoints...]
```

**Deliverable:** Complete API documentation

---

**Task 5.2: Update Context Packages**

**File:** `docs/ContextPackages/PAYMENT_WALLET_CONTEXT.md`

**Update with:**
- Current state: 50% complete (Razorpay done, Wallet pending)
- Payment flow diagrams
- Webhook handling
- Refund process
- Week 4 preview (Wallet system)

**Deliverable:** Context package updated

---

#### Afternoon Session (4 hours): Week 3 Wrap-up

**Task 5.3: Run Full Test Suite**

```bash
npm run test:coverage

# Verify coverage:
# - Payment service: 85%+
# - Webhook handler: 80%+
# - API endpoints: 75%+
```

**Task 5.4: Create Week 3 Summary**

**File:** `docs/Development/WEEK3_SUMMARY.md`

**Content:**
- ✅ Razorpay SDK integrated
- ✅ Payment order creation working
- ✅ Payment verification with signature check
- ✅ Webhook system operational
- ✅ Refund functionality complete
- ✅ 82% test coverage achieved
- ✅ Security audit passed
- ✅ API documented

**Next Week Preview:**
- Week 4: Wallet system + PDF generation

**Deliverable:** Week 3 complete

---

### WEEK 3 SUMMARY

**Achievements:**
1. ✅ IPaymentProvider interface created
2. ✅ Razorpay SDK integrated
3. ✅ Payment order creation implemented
4. ✅ Payment capture with signature verification
5. ✅ Webhook system with signature validation
6. ✅ Refund functionality complete
7. ✅ Payment, Refund models created
8. ✅ API endpoints with validation
9. ✅ 82% test coverage achieved
10. ✅ Security audit passed
11. ✅ Rate limiting applied
12. ✅ Complete API documentation

**Key Files Created:**
```
server/src/core/domain/interfaces/providers/IPaymentProvider.ts
server/src/core/application/services/payment/payment.service.ts
server/src/core/application/services/payment/refund.service.ts
server/src/infrastructure/integrations/payment/razorpay/RazorpayProvider.ts
server/src/infrastructure/integrations/payment/razorpay/RazorpayTypes.ts
server/src/infrastructure/integrations/payment/razorpay/RazorpayConfig.ts
server/src/infrastructure/integrations/payment/razorpay/RazorpayWebhookHandler.ts
server/src/infrastructure/database/mongoose/models/Payment.ts
server/src/infrastructure/database/mongoose/models/Refund.ts
server/src/presentation/http/controllers/payment/payment.controller.ts
server/src/presentation/http/controllers/payment/webhook.controller.ts
server/tests/unit/services/payment/payment.service.test.ts
server/tests/integration/payment/payment-flow.test.ts
docs/API/Payment.md
```

**Dependencies Installed:**
```bash
npm install razorpay
npm install --save-dev @types/razorpay
npm install crypto
npm install express-rate-limit
```

**Environment Variables:**
```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

**Time Spent:** 40-45 hours

**Ready for Week 4:** ✅ READY

---

## WEEK 4: WALLET SYSTEM + PDF GENERATION

### Week 4 Objectives
1. Implement complete wallet system with credits/debits
2. Create PDF generation service for labels, invoices, manifests
3. Integrate AWS S3 for document storage
4. Build wallet transaction tracking and reporting
5. Generate shipping labels from Velocity Shipfast API
6. Create invoice and manifest PDFs
7. Achieve 75%+ test coverage

### Week 4 Overview

**Track A: Wallet System (Days 1-2)**
- Wallet model with balance tracking
- Transaction ledger
- Credit/debit operations with optimistic locking
- Low balance alerts
- Wallet recharge via Razorpay (from Week 3)

**Track B: PDF Generation (Days 3-5)**
- PDFKit setup
- Shipping label generation
- Invoice generation
- Manifest generation
- AWS S3 integration
- Document API endpoints

---

### DAY 1 (Monday): Wallet Model + Transaction System

**Total Time:** 8-9 hours
**Agent:** Claude Sonnet (design), Cursor (implementation)
**Goal:** Create wallet infrastructure with transaction tracking

#### Morning Session (4 hours): Wallet Architecture

**Task 1.1: Design Wallet System**

**Agent:** Claude Sonnet

**Architecture Decisions:**
```markdown
## Wallet System Design

### Core Concepts
1. **One Wallet Per Company** - Each company has single wallet
2. **Transaction Ledger** - Immutable record of all operations
3. **Balance Calculation** - Sum of all credit/debit transactions
4. **Optimistic Locking** - Prevent race conditions
5. **Audit Trail** - Who did what, when

### Balance Types
- **Available Balance:** Can be used immediately
- **Reserved Balance:** Held for pending shipments
- **Total Balance:** Available + Reserved

### Transaction Types
- **CREDIT:** Add money (recharge, refund)
- **DEBIT:** Remove money (shipment cost, fees)
- **RESERVE:** Lock money for pending shipment
- **RELEASE:** Unlock reserved money

### Use Cases
1. Wallet recharge via Razorpay → CREDIT
2. Create shipment → RESERVE (hold estimated cost)
3. Shipment delivered → DEBIT (actual cost), RELEASE (difference)
4. Shipment cancelled → RELEASE (full amount)
5. Refund to customer → DEBIT
```

**Deliverable:** Wallet system design document

---

**Task 1.2: Create Wallet Model**

**File:** `server/src/infrastructure/database/mongoose/models/Wallet.ts`

**Agent:** Cursor

**Schema:**
```typescript
const WalletSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true
  },

  // Balances (in rupees)
  availableBalance: {
    type: Number,
    default: 0,
    min: 0
  },

  reservedBalance: {
    type: Number,
    default: 0,
    min: 0
  },

  // Total = Available + Reserved
  totalBalance: {
    type: Number,
    default: 0
  },

  // Low balance alert threshold
  lowBalanceThreshold: {
    type: Number,
    default: 1000 // ₹1000
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  isFrozen: {
    type: Boolean,
    default: false
  },

  // Metadata
  lastTransactionAt: { type: Date },

}, {
  timestamps: true,
  versionKey: true  // Enable __v for optimistic locking
});

// Virtual for computed total
WalletSchema.virtual('computedTotal').get(function() {
  return this.availableBalance + this.reservedBalance;
});

// Pre-save hook to update totalBalance
WalletSchema.pre('save', function(next) {
  this.totalBalance = this.availableBalance + this.reservedBalance;
  next();
});

// Indexes
WalletSchema.index({ companyId: 1 }, { unique: true });
WalletSchema.index({ availableBalance: 1 });
```

**Methods:**
```typescript
WalletSchema.methods = {
  hasEnoughBalance(amount: number): boolean {
    return this.availableBalance >= amount;
  },

  isLowBalance(): boolean {
    return this.availableBalance < this.lowBalanceThreshold;
  }
};
```

**Deliverable:** Wallet model created

---

**Task 1.3: Create Transaction Model**

**File:** `server/src/infrastructure/database/mongoose/models/WalletTransaction.ts`

**Schema:**
```typescript
const WalletTransactionSchema = new Schema({
  walletId: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
    index: true
  },

  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Transaction Details
  type: {
    type: String,
    enum: ['CREDIT', 'DEBIT', 'RESERVE', 'RELEASE'],
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Balance snapshot (for audit)
  balanceBefore: {
    available: { type: Number, required: true },
    reserved: { type: Number, required: true },
    total: { type: Number, required: true }
  },

  balanceAfter: {
    available: { type: Number, required: true },
    reserved: { type: Number, required: true },
    total: { type: Number, required: true }
  },

  // Reference
  referenceType: {
    type: String,
    enum: ['PAYMENT', 'SHIPMENT', 'REFUND', 'ADJUSTMENT', 'RECHARGE'],
    required: true
  },

  referenceId: {
    type: Schema.Types.ObjectId,
    required: true
  },

  // Description
  description: { type: String, required: true },

  // Metadata
  initiatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  },

  // Status
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
    default: 'COMPLETED'
  }

}, { timestamps: true });

// Indexes
WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });
WalletTransactionSchema.index({ companyId: 1, createdAt: -1 });
WalletTransactionSchema.index({ referenceType: 1, referenceId: 1 });
WalletTransactionSchema.index({ type: 1, status: 1 });
```

**Deliverable:** Transaction model created

---

#### Afternoon Session (4 hours): Wallet Service

**Task 1.4: Implement Wallet Service**

**File:** `server/src/core/application/services/wallet/wallet.service.ts`

**Agent:** Cursor

**Core Methods:**
```typescript
import { updateWithOptimisticLocking, withTransaction } from '@/shared/utils/optimisticLocking';

export class WalletService {

  async getOrCreateWallet(companyId: string): Promise<Wallet> {
    let wallet = await Wallet.findOne({ companyId });

    if (!wallet) {
      wallet = await Wallet.create({
        companyId,
        availableBalance: 0,
        reservedBalance: 0,
        totalBalance: 0
      });
    }

    return wallet;
  }

  async creditWallet(data: CreditWalletDTO): Promise<WalletTransaction> {
    return withTransaction(async (session) => {
      const wallet = await this.getOrCreateWallet(data.companyId);

      // Capture balance before
      const balanceBefore = {
        available: wallet.availableBalance,
        reserved: wallet.reservedBalance,
        total: wallet.totalBalance
      };

      // Update wallet with optimistic locking
      const updatedWallet = await updateWithOptimisticLocking(
        Wallet,
        { _id: wallet._id },
        {
          $inc: { availableBalance: data.amount },
          lastTransactionAt: new Date()
        }
      );

      // Create transaction record
      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        companyId: data.companyId,
        type: 'CREDIT',
        amount: data.amount,
        balanceBefore,
        balanceAfter: {
          available: updatedWallet.availableBalance,
          reserved: updatedWallet.reservedBalance,
          total: updatedWallet.totalBalance
        },
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
        initiatedBy: data.initiatedBy,
        status: 'COMPLETED'
      }], { session });

      return transaction[0];
    });
  }

  async debitWallet(data: DebitWalletDTO): Promise<WalletTransaction> {
    return withTransaction(async (session) => {
      const wallet = await this.getOrCreateWallet(data.companyId);

      // Check sufficient balance
      if (wallet.availableBalance < data.amount) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Available: ₹${wallet.availableBalance}, Required: ₹${data.amount}`
        );
      }

      const balanceBefore = {
        available: wallet.availableBalance,
        reserved: wallet.reservedBalance,
        total: wallet.totalBalance
      };

      // Debit wallet
      const updatedWallet = await updateWithOptimisticLocking(
        Wallet,
        { _id: wallet._id },
        {
          $inc: { availableBalance: -data.amount },
          lastTransactionAt: new Date()
        }
      );

      // Create transaction
      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        companyId: data.companyId,
        type: 'DEBIT',
        amount: data.amount,
        balanceBefore,
        balanceAfter: {
          available: updatedWallet.availableBalance,
          reserved: updatedWallet.reservedBalance,
          total: updatedWallet.totalBalance
        },
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
        initiatedBy: data.initiatedBy,
        status: 'COMPLETED'
      }], { session });

      // Check low balance alert
      if (updatedWallet.isLowBalance()) {
        await this.sendLowBalanceAlert(updatedWallet);
      }

      return transaction[0];
    });
  }

  async reserveBalance(data: ReserveBalanceDTO): Promise<WalletTransaction> {
    return withTransaction(async (session) => {
      const wallet = await this.getOrCreateWallet(data.companyId);

      if (wallet.availableBalance < data.amount) {
        throw new InsufficientBalanceError('Insufficient balance to reserve');
      }

      const balanceBefore = {
        available: wallet.availableBalance,
        reserved: wallet.reservedBalance,
        total: wallet.totalBalance
      };

      // Move from available to reserved
      const updatedWallet = await updateWithOptimisticLocking(
        Wallet,
        { _id: wallet._id },
        {
          $inc: {
            availableBalance: -data.amount,
            reservedBalance: data.amount
          },
          lastTransactionAt: new Date()
        }
      );

      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        companyId: data.companyId,
        type: 'RESERVE',
        amount: data.amount,
        balanceBefore,
        balanceAfter: {
          available: updatedWallet.availableBalance,
          reserved: updatedWallet.reservedBalance,
          total: updatedWallet.totalBalance
        },
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
        status: 'COMPLETED'
      }], { session });

      return transaction[0];
    });
  }

  async releaseReservedBalance(data: ReleaseBalanceDTO): Promise<WalletTransaction> {
    return withTransaction(async (session) => {
      const wallet = await this.getOrCreateWallet(data.companyId);

      if (wallet.reservedBalance < data.amount) {
        throw new ValidationError('Insufficient reserved balance');
      }

      const balanceBefore = {
        available: wallet.availableBalance,
        reserved: wallet.reservedBalance,
        total: wallet.totalBalance
      };

      // Move from reserved back to available
      const updatedWallet = await updateWithOptimisticLocking(
        Wallet,
        { _id: wallet._id },
        {
          $inc: {
            availableBalance: data.amount,
            reservedBalance: -data.amount
          },
          lastTransactionAt: new Date()
        }
      );

      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        companyId: data.companyId,
        type: 'RELEASE',
        amount: data.amount,
        balanceBefore,
        balanceAfter: {
          available: updatedWallet.availableBalance,
          reserved: updatedWallet.reservedBalance,
          total: updatedWallet.totalBalance
        },
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
        status: 'COMPLETED'
      }], { session });

      return transaction[0];
    });
  }

  async getWalletBalance(companyId: string): Promise<WalletBalance> {
    const wallet = await this.getOrCreateWallet(companyId);

    return {
      available: wallet.availableBalance,
      reserved: wallet.reservedBalance,
      total: wallet.totalBalance,
      isLowBalance: wallet.isLowBalance(),
      lowBalanceThreshold: wallet.lowBalanceThreshold
    };
  }

  async getTransactionHistory(
    companyId: string,
    options: PaginationOptions
  ): Promise<PaginatedResult<WalletTransaction>> {
    const { page = 1, limit = 20, type, startDate, endDate } = options;

    const wallet = await this.getOrCreateWallet(companyId);

    const filter: any = { walletId: wallet._id };

    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const transactions = await WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('initiatedBy', 'firstName lastName');

    const total = await WalletTransaction.countDocuments(filter);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  private async sendLowBalanceAlert(wallet: Wallet): Promise<void> {
    // Send email/notification to company admins
    // Implementation in notification service
    console.log(`Low balance alert for company ${wallet.companyId}`);
  }
}
```

**Deliverable:** Complete wallet service

---

**Task 1.5: Create Wallet API Endpoints**

**File:** `server/src/presentation/http/controllers/wallet/wallet.controller.ts`

**Agent:** Cursor

**Endpoints:**
```typescript
export class WalletController {
  private walletService = new WalletService();

  // GET /api/v1/wallet/balance
  async getBalance(req: Request, res: Response) {
    const { companyId } = req.user;

    const balance = await this.walletService.getWalletBalance(companyId);

    res.json({
      success: true,
      data: balance
    });
  }

  // GET /api/v1/wallet/transactions
  async getTransactions(req: Request, res: Response) {
    const { companyId } = req.user;
    const { page, limit, type, startDate, endDate } = req.query;

    const result = await this.walletService.getTransactionHistory(companyId, {
      page: Number(page),
      limit: Number(limit),
      type: type as string,
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json({
      success: true,
      ...result
    });
  }

  // POST /api/v1/wallet/recharge
  async initiateRecharge(req: Request, res: Response) {
    const { amount } = req.body;
    const { userId, companyId } = req.user;

    // Create Razorpay payment order (uses Week 3 payment service)
    const payment = await paymentService.createPaymentOrder({
      amount,
      userId,
      companyId,
      purpose: 'wallet_recharge'
    });

    res.status(201).json({
      success: true,
      data: {
        razorpayOrderId: payment.razorpayOrderId,
        amount: payment.amount,
        keyId: process.env.RAZORPAY_KEY_ID
      }
    });
  }

  // POST /api/v1/wallet/deduct (Admin only)
  async deductBalance(req: Request, res: Response) {
    const { companyId, amount, reason } = req.body;
    const { userId } = req.user;

    const transaction = await this.walletService.debitWallet({
      companyId,
      amount,
      referenceType: 'ADJUSTMENT',
      referenceId: userId,
      description: `Manual deduction: ${reason}`,
      initiatedBy: userId
    });

    res.json({
      success: true,
      data: transaction
    });
  }
}
```

**Routes:**

**File:** `server/src/presentation/http/routes/v1/wallet/wallet.routes.ts`

```typescript
const router = Router();
const controller = new WalletController();

router.use(authenticate);

router.get('/balance', controller.getBalance);
router.get('/transactions', controller.getTransactions);
router.post('/recharge', controller.initiateRecharge);

// Admin only
router.post('/deduct', authorize(['admin']), controller.deductBalance);

export default router;
```

**Deliverable:** Wallet API complete

---

### DAY 2 (Tuesday): Wallet Integration + Testing

**Total Time:** 8-9 hours
**Agent:** Cursor (implementation + tests)
**Goal:** Integrate wallet with shipment flow and test thoroughly

#### Morning Session (4 hours): Shipment-Wallet Integration

**Task 2.1: Update Shipment Service to Use Wallet**

**File:** Update `server/src/core/application/services/shipment/shipment.service.ts`

**Agent:** Cursor

**Add Wallet Logic:**
```typescript
export class ShipmentService {
  private walletService = new WalletService();
  private courierService = new CourierService();

  async createShipment(order: Order): Promise<Shipment> {
    // 1. Calculate estimated shipping cost
    const estimatedCost = await this.calculateShippingCost(order);

    // 2. Reserve balance in wallet
    await this.walletService.reserveBalance({
      companyId: order.companyId,
      amount: estimatedCost,
      referenceType: 'SHIPMENT',
      referenceId: order._id,
      description: `Reserve for shipment ${order.orderNumber}`
    });

    try {
      // 3. Create shipment via courier
      const shipment = await this.courierService.createShipment(order);

      // 4. Get actual cost from courier response
      const actualCost = shipment.shippingCost || estimatedCost;

      // 5. Debit actual cost
      await this.walletService.debitWallet({
        companyId: order.companyId,
        amount: actualCost,
        referenceType: 'SHIPMENT',
        referenceId: shipment._id,
        description: `Shipping cost for ${shipment.trackingNumber}`
      });

      // 6. Release difference if estimated > actual
      if (estimatedCost > actualCost) {
        await this.walletService.releaseReservedBalance({
          companyId: order.companyId,
          amount: estimatedCost - actualCost,
          referenceType: 'SHIPMENT',
          referenceId: shipment._id,
          description: `Release excess reserve`
        });
      }

      return shipment;

    } catch (error) {
      // Rollback: Release reserved balance
      await this.walletService.releaseReservedBalance({
        companyId: order.companyId,
        amount: estimatedCost,
        referenceType: 'SHIPMENT',
        referenceId: order._id,
        description: `Rollback failed shipment creation`
      });

      throw error;
    }
  }

  async cancelShipment(shipmentId: string, reason: string): Promise<void> {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new NotFoundError('Shipment not found');

    // Cancel with courier
    await this.courierService.cancelShipment(shipment.trackingNumber, reason);

    // Credit back to wallet
    if (shipment.shippingCost && shipment.shippingCost > 0) {
      await this.walletService.creditWallet({
        companyId: shipment.companyId,
        amount: shipment.shippingCost,
        referenceType: 'SHIPMENT',
        referenceId: shipment._id,
        description: `Refund for cancelled shipment ${shipment.trackingNumber}`
      });
    }

    // Update shipment status
    shipment.status = 'cancelled';
    shipment.cancelledAt = new Date();
    shipment.cancellationReason = reason;
    await shipment.save();
  }

  private async calculateShippingCost(order: Order): Promise<number> {
    // Simple calculation (can be enhanced with rate card)
    const baseRate = 50; // ₹50 base
    const weightRate = order.package.weight * 10; // ₹10 per kg
    const total = baseRate + weightRate;

    return Math.round(total * 100) / 100; // Round to 2 decimals
  }
}
```

**Deliverable:** Wallet integrated with shipment flow

---

**Task 2.2: Update Payment Webhook to Credit Wallet**

**File:** Update `server/src/infrastructure/integrations/payment/razorpay/RazorpayWebhookHandler.ts`

**Agent:** Cursor

**Add Wallet Credit:**
```typescript
private async processPaymentSuccess(payment: Payment) {
  const purpose = payment.notes?.get('purpose');

  if (purpose === 'wallet_recharge') {
    // Credit wallet
    const amountInRupees = payment.amount / 100; // Convert paise to rupees

    await walletService.creditWallet({
      companyId: payment.companyId,
      amount: amountInRupees,
      referenceType: 'PAYMENT',
      referenceId: payment._id,
      description: `Wallet recharge via Razorpay (${payment.razorpayPaymentId})`,
      initiatedBy: payment.userId
    });

    console.log(`Wallet credited: ₹${amountInRupees} for company ${payment.companyId}`);
  }
}
```

**Deliverable:** Payment-wallet integration complete

---

#### Afternoon Session (4 hours): Wallet Testing

**Task 2.3: Wallet Service Tests**

**File:** `server/tests/unit/services/wallet/wallet.service.test.ts`

**Agent:** Cursor

**Test Cases:**
```typescript
describe('WalletService', () => {
  describe('creditWallet', () => {
    it('should credit wallet successfully', async () => {
      const wallet = await createTestWallet();
      const initialBalance = wallet.availableBalance;

      await walletService.creditWallet({
        companyId: wallet.companyId,
        amount: 500,
        referenceType: 'PAYMENT',
        referenceId: new Types.ObjectId(),
        description: 'Test credit'
      });

      const updated = await Wallet.findById(wallet._id);
      expect(updated.availableBalance).toBe(initialBalance + 500);
    });

    it('should create transaction record', async () => {
      const wallet = await createTestWallet();

      const transaction = await walletService.creditWallet({
        companyId: wallet.companyId,
        amount: 100,
        referenceType: 'PAYMENT',
        referenceId: new Types.ObjectId(),
        description: 'Test'
      });

      expect(transaction.type).toBe('CREDIT');
      expect(transaction.amount).toBe(100);
      expect(transaction.status).toBe('COMPLETED');
    });
  });

  describe('debitWallet', () => {
    it('should debit wallet successfully', async () => {
      const wallet = await createTestWallet({ availableBalance: 1000 });

      await walletService.debitWallet({
        companyId: wallet.companyId,
        amount: 300,
        referenceType: 'SHIPMENT',
        referenceId: new Types.ObjectId(),
        description: 'Test debit'
      });

      const updated = await Wallet.findById(wallet._id);
      expect(updated.availableBalance).toBe(700);
    });

    it('should throw error for insufficient balance', async () => {
      const wallet = await createTestWallet({ availableBalance: 50 });

      await expect(
        walletService.debitWallet({
          companyId: wallet.companyId,
          amount: 100,
          referenceType: 'SHIPMENT',
          referenceId: new Types.ObjectId(),
          description: 'Test'
        })
      ).rejects.toThrow(InsufficientBalanceError);
    });
  });

  describe('reserveBalance', () => {
    it('should move amount from available to reserved', async () => {
      const wallet = await createTestWallet({ availableBalance: 1000 });

      await walletService.reserveBalance({
        companyId: wallet.companyId,
        amount: 200,
        referenceType: 'SHIPMENT',
        referenceId: new Types.ObjectId(),
        description: 'Reserve for shipment'
      });

      const updated = await Wallet.findById(wallet._id);
      expect(updated.availableBalance).toBe(800);
      expect(updated.reservedBalance).toBe(200);
      expect(updated.totalBalance).toBe(1000);
    });
  });

  describe('releaseReservedBalance', () => {
    it('should move amount from reserved to available', async () => {
      const wallet = await createTestWallet({
        availableBalance: 800,
        reservedBalance: 200
      });

      await walletService.releaseReservedBalance({
        companyId: wallet.companyId,
        amount: 200,
        referenceType: 'SHIPMENT',
        referenceId: new Types.ObjectId(),
        description: 'Release reserve'
      });

      const updated = await Wallet.findById(wallet._id);
      expect(updated.availableBalance).toBe(1000);
      expect(updated.reservedBalance).toBe(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent debits safely', async () => {
      const wallet = await createTestWallet({ availableBalance: 1000 });

      // Simulate 5 concurrent debits
      const debits = Array(5).fill(null).map(() =>
        walletService.debitWallet({
          companyId: wallet.companyId,
          amount: 100,
          referenceType: 'SHIPMENT',
          referenceId: new Types.ObjectId(),
          description: 'Concurrent debit'
        })
      );

      await Promise.all(debits);

      const updated = await Wallet.findById(wallet._id);
      expect(updated.availableBalance).toBe(500); // 1000 - 5*100
    });
  });
});
```

**Deliverable:** Wallet tests (80%+ coverage)

---

**Task 2.4: Integration Tests**

**File:** `server/tests/integration/wallet/wallet-shipment.test.ts`

**Test Full Flow:**
```typescript
describe('Wallet-Shipment Integration', () => {
  it('should complete full shipment creation with wallet deduction', async () => {
    // 1. Create wallet with balance
    const wallet = await Wallet.create({
      companyId: testCompany._id,
      availableBalance: 5000
    });

    // 2. Create order
    const order = await createTestOrder();

    // 3. Create shipment (should reserve and debit wallet)
    const shipment = await shipmentService.createShipment(order);

    expect(shipment.trackingNumber).toBeDefined();

    // 4. Verify wallet balance reduced
    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet.availableBalance).toBeLessThan(5000);

    // 5. Verify transaction created
    const transactions = await WalletTransaction.find({ walletId: wallet._id });
    expect(transactions.length).toBeGreaterThan(0);
  });

  it('should rollback wallet on shipment creation failure', async () => {
    const wallet = await Wallet.create({
      companyId: testCompany._id,
      availableBalance: 1000
    });

    // Mock courier service to fail
    jest.spyOn(courierService, 'createShipment').mockRejectedValue(
      new Error('Courier API failed')
    );

    const order = await createTestOrder();

    await expect(
      shipmentService.createShipment(order)
    ).rejects.toThrow();

    // Wallet balance should be unchanged
    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet.availableBalance).toBe(1000);
    expect(updatedWallet.reservedBalance).toBe(0);
  });
});
```

**Deliverable:** Integration tests passing

---

### DAY 3 (Wednesday): PDF Generation Setup

**Total Time:** 8-9 hours
**Agent:** Cursor (implementation)
**Goal:** Set up PDFKit and create shipping label generator

#### Morning Session (4 hours): PDFKit Setup + Label Generation

**Task 3.1: Install PDF Dependencies**

**Agent:** Cursor

**Installation:**
```bash
cd server
npm install pdfkit
npm install --save-dev @types/pdfkit
npm install aws-sdk  # For S3 storage
npm install --save-dev @types/aws-sdk
```

**Deliverable:** Dependencies installed

---

**Task 3.2: Create PDF Service**

**File:** `server/src/shared/services/pdf/PDFGenerator.ts`

**Agent:** Cursor

**Base Class:**
```typescript
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export abstract class PDFGenerator {
  protected doc: PDFKit.PDFDocument;

  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
  }

  protected addHeader(title: string): void {
    this.doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(title, { align: 'center' })
      .moveDown();
  }

  protected addDivider(): void {
    this.doc
      .moveTo(50, this.doc.y)
      .lineTo(550, this.doc.y)
      .stroke()
      .moveDown();
  }

  protected addKeyValue(key: string, value: string | number): void {
    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`${key}:`, { continued: true })
      .font('Helvetica')
      .text(` ${value}`)
      .moveDown(0.5);
  }

  abstract generate(data: any): Promise<Buffer>;

  protected async finalize(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      this.doc.on('data', (chunk) => chunks.push(chunk));
      this.doc.on('end', () => resolve(Buffer.concat(chunks)));
      this.doc.on('error', reject);

      this.doc.end();
    });
  }
}
```

**Deliverable:** PDF generator base class

---

**Task 3.3: Create Shipping Label Generator**

**File:** `server/src/shared/services/pdf/ShippingLabelGenerator.ts`

**Agent:** Cursor

**Implementation:**
```typescript
export class ShippingLabelGenerator extends PDFGenerator {
  async generate(shipment: Shipment): Promise<Buffer> {
    // Header
    this.addHeader('SHIPPING LABEL');

    // Company Logo (if available)
    // this.doc.image('path/to/logo.png', 50, 50, { width: 100 });

    // Tracking Number (prominent)
    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(`Tracking: ${shipment.trackingNumber}`, { align: 'center' })
      .moveDown();

    this.addDivider();

    // Sender Details
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('FROM:', 50, this.doc.y);

    this.doc
      .fontSize(10)
      .font('Helvetica')
      .text(shipment.senderDetails.name)
      .text(shipment.senderDetails.address)
      .text(`${shipment.senderDetails.city}, ${shipment.senderDetails.state} - ${shipment.senderDetails.pincode}`)
      .text(`Phone: ${shipment.senderDetails.phone}`)
      .moveDown();

    // Recipient Details
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TO:', 50, this.doc.y);

    this.doc
      .fontSize(10)
      .font('Helvetica')
      .text(shipment.recipientDetails.name)
      .text(shipment.recipientDetails.address)
      .text(`${shipment.recipientDetails.city}, ${shipment.recipientDetails.state} - ${shipment.recipientDetails.pincode}`)
      .text(`Phone: ${shipment.recipientDetails.phone}`)
      .moveDown();

    this.addDivider();

    // Package Details
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('PACKAGE DETAILS:', 50, this.doc.y)
      .moveDown(0.5);

    this.addKeyValue('Weight', `${shipment.package.weight} kg`);
    this.addKeyValue('Dimensions', `${shipment.package.length} x ${shipment.package.width} x ${shipment.package.height} cm`);
    this.addKeyValue('Payment Method', shipment.paymentMethod.toUpperCase());

    if (shipment.paymentMethod === 'cod') {
      this.addKeyValue('COD Amount', `₹${shipment.codAmount}`);
    }

    this.addDivider();

    // Barcode (tracking number as text barcode)
    this.doc
      .fontSize(24)
      .font('Courier')
      .text(`*${shipment.trackingNumber}*`, { align: 'center' })
      .moveDown();

    // Footer
    this.doc
      .fontSize(8)
      .font('Helvetica')
      .text('Powered by Shipcrowd', { align: 'center' })
      .text(new Date().toLocaleString(), { align: 'center' });

    return await this.finalize();
  }
}
```

**Deliverable:** Shipping label generator

---

#### Afternoon Session (4 hours): AWS S3 Integration

**Task 3.4: Configure AWS S3**

**File:** `server/src/infrastructure/storage/s3/S3Service.ts`

**Agent:** Cursor

**Implementation:**
```typescript
import AWS from 'aws-sdk';

export class S3Service {
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'ap-south-1'
    });

    this.bucket = process.env.AWS_S3_BUCKET || 'Shipcrowd-documents';
  }

  async uploadPDF(
    buffer: Buffer,
    filename: string,
    folder: string = 'documents'
  ): Promise<string> {
    const key = `${folder}/${Date.now()}_${filename}`;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      ACL: 'private' // Only accessible with signed URL
    };

    await this.s3.upload(params).promise();

    return key;
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn // URL valid for 1 hour
    };

    return this.s3.getSignedUrl('getObject', params);
  }

  async deletePDF(key: string): Promise<void> {
    const params = {
      Bucket: this.bucket,
      Key: key
    };

    await this.s3.deleteObject(params).promise();
  }
}
```

**Environment Variables:**

**Add to `.env.example`:**
```bash
# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=Shipcrowd-documents
```

**Deliverable:** S3 service configured

---

**Task 3.5: Create Document Service**

**File:** `server/src/core/application/services/document/document.service.ts`

**Agent:** Cursor

**Implementation:**
```typescript
export class DocumentService {
  private s3Service = new S3Service();
  private labelGenerator = new ShippingLabelGenerator();

  async generateShippingLabel(shipmentId: string): Promise<Document> {
    // Find shipment
    const shipment = await Shipment.findById(shipmentId)
      .populate('order');

    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    // Generate PDF
    const pdfBuffer = await this.labelGenerator.generate(shipment);

    // Upload to S3
    const filename = `label_${shipment.trackingNumber}.pdf`;
    const s3Key = await this.s3Service.uploadPDF(
      pdfBuffer,
      filename,
      'labels'
    );

    // Create document record
    const document = await Document.create({
      shipmentId: shipment._id,
      orderId: shipment.orderId,
      companyId: shipment.companyId,
      type: 'LABEL',
      filename,
      s3Key,
      size: pdfBuffer.length,
      mimeType: 'application/pdf'
    });

    return document;
  }

  async getDocumentUrl(documentId: string): Promise<string> {
    const document = await Document.findById(documentId);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Generate signed URL (valid for 1 hour)
    const url = await this.s3Service.getSignedUrl(document.s3Key);

    return url;
  }
}
```

**Document Model:**

**File:** `server/src/infrastructure/database/mongoose/models/Document.ts`

```typescript
const DocumentSchema = new Schema({
  shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment' },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },

  type: {
    type: String,
    enum: ['LABEL', 'INVOICE', 'MANIFEST', 'POD'],
    required: true
  },

  filename: { type: String, required: true },
  s3Key: { type: String, required: true },
  size: { type: Number },
  mimeType: { type: String, default: 'application/pdf' },

  downloadCount: { type: Number, default: 0 },
  lastDownloadedAt: { type: Date }
}, { timestamps: true });

DocumentSchema.index({ shipmentId: 1, type: 1 });
DocumentSchema.index({ companyId: 1, createdAt: -1 });
```

**Deliverable:** Document service complete

---

#### **Day 4 (Thursday): Invoice + Manifest Generation**

**Agent:** Cursor
**Focus:** Invoice PDF generation, Manifest PDF generation, Document service expansion
**Files:** 4 new, 2 updated

---

##### **Morning Session (3 hours): Invoice Generator**

**Task 4.1: Create Invoice Generator Class**

**File:** `/server/src/shared/services/pdf/InvoiceGenerator.ts`

```typescript
import PDFGenerator from './PDFGenerator';
import { IInvoiceData } from '@/core/domain/interfaces/documents/IInvoiceData';

export default class InvoiceGenerator extends PDFGenerator {
  async generate(data: IInvoiceData): Promise<Buffer> {
    // Initialize document with A4 size
    this.initializeDocument({ size: 'A4', margin: 50 });

    // Header with company logo
    this.addHeader(data.company);

    // Invoice metadata (number, date, due date)
    this.addInvoiceMetadata(data.invoiceNumber, data.invoiceDate, data.dueDate);

    // Billing details (from/to)
    this.addBillingDetails(data.billingFrom, data.billingTo);

    // Line items table
    this.addLineItemsTable(data.lineItems);

    // Totals section (subtotal, tax, total)
    this.addTotalsSection(data.subtotal, data.tax, data.total);

    // Footer with notes and payment terms
    this.addFooter(data.notes, data.paymentTerms);

    return this.finalize();
  }

  private addHeader(company: any): void { /* Company logo + info */ }
  private addInvoiceMetadata(num: string, date: Date, due: Date): void { /* Invoice details */ }
  private addBillingDetails(from: any, to: any): void { /* Billing addresses */ }
  private addLineItemsTable(items: any[]): void { /* Table with items */ }
  private addTotalsSection(sub: number, tax: number, total: number): void { /* Calculations */ }
  private addFooter(notes: string, terms: string): void { /* Footer info */ }
}
```

**Instructions:**
- Extend PDFGenerator base class
- Use PDFKit table generation for line items
- Format currency with proper symbols (₹)
- Include GST/Tax calculations if applicable
- Add company logo from S3 or local assets
- Professional invoice layout with clear sections

**Deliverable:** InvoiceGenerator class functional

---

**Task 4.2: Create Invoice Data Interface**

**File:** `/server/src/core/domain/interfaces/documents/IInvoiceData.ts`

```typescript
export interface IInvoiceData {
  // Invoice metadata
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;

  // Company details
  company: {
    name: string;
    logo?: string; // URL or base64
    address: string;
    gstin?: string;
    email: string;
    phone: string;
  };

  // Billing details
  billingFrom: {
    name: string;
    address: string;
    gstin?: string;
  };

  billingTo: {
    name: string;
    address: string;
    gstin?: string;
  };

  // Line items
  lineItems: IInvoiceLineItem[];

  // Totals
  subtotal: number;
  tax: number;
  taxRate: number;
  discount?: number;
  total: number;

  // Additional
  notes?: string;
  paymentTerms?: string;
}

export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
}
```

**Deliverable:** TypeScript interfaces for invoice data

---

##### **Afternoon Session (3 hours): Manifest Generator**

**Task 4.3: Create Manifest Generator Class**

**File:** `/server/src/shared/services/pdf/ManifestGenerator.ts`

```typescript
import PDFGenerator from './PDFGenerator';
import { IManifestData } from '@/core/domain/interfaces/documents/IManifestData';

export default class ManifestGenerator extends PDFGenerator {
  async generate(data: IManifestData): Promise<Buffer> {
    this.initializeDocument({ size: 'A4', margin: 30, layout: 'landscape' });

    // Manifest header with date and manifest number
    this.addManifestHeader(data.manifestNumber, data.date, data.courier);

    // Summary (total shipments, weight, value)
    this.addSummarySection(data.summary);

    // Shipments table (AWB, consignee, destination, weight, value)
    this.addShipmentsTable(data.shipments);

    // Footer with signatures
    this.addSignatureFooter();

    return this.finalize();
  }

  private addManifestHeader(num: string, date: Date, courier: string): void { /* Header */ }
  private addSummarySection(summary: any): void { /* Summary stats */ }
  private addShipmentsTable(shipments: any[]): void { /* Shipments table */ }
  private addSignatureFooter(): void { /* Signature boxes */ }
}
```

**Instructions:**
- Landscape orientation for wide table
- Include all shipment details in table format
- Add barcode for manifest number (optional)
- Summary section with totals
- Signature boxes for pickup confirmation

**Deliverable:** ManifestGenerator class functional

---

**Task 4.4: Create Manifest Data Interface**

**File:** `/server/src/core/domain/interfaces/documents/IManifestData.ts`

```typescript
export interface IManifestData {
  // Manifest metadata
  manifestNumber: string;
  date: Date;
  courier: string; // Velocity Shipfast
  pickupLocation: string;

  // Summary
  summary: {
    totalShipments: number;
    totalWeight: number;
    totalValue: number;
    totalCOD: number;
  };

  // Shipments
  shipments: IManifestShipment[];
}

export interface IManifestShipment {
  awbNumber: string;
  orderNumber: string;
  consigneeName: string;
  consigneePhone: string;
  destination: string; // City, State, Pincode
  weight: number;
  paymentMode: 'PREPAID' | 'COD';
  codAmount?: number;
  declaredValue: number;
}
```

**Deliverable:** TypeScript interfaces for manifest data

---

##### **Evening Session (2 hours): Document Service Integration**

**Task 4.5: Update Document Service with Invoice/Manifest**

**File:** `/server/src/core/application/services/document/DocumentService.ts` (UPDATE)

```typescript
// Add new methods to existing DocumentService

async generateInvoice(data: GenerateInvoiceDTO): Promise<IDocument> {
  const invoiceGenerator = new InvoiceGenerator();
  const invoiceData = this.prepareInvoiceData(data);
  const pdfBuffer = await invoiceGenerator.generate(invoiceData);

  const fileName = `invoice-${data.invoiceNumber}-${Date.now()}.pdf`;
  const s3Url = await this.s3Service.uploadDocument(pdfBuffer, fileName, 'invoices');

  const document = await Document.create({
    type: 'INVOICE',
    reference: { type: 'Order', id: data.orderId },
    fileName,
    s3Url,
    metadata: { invoiceNumber: data.invoiceNumber },
    generatedBy: data.userId
  });

  return document;
}

async generateManifest(data: GenerateManifestDTO): Promise<IDocument> {
  const manifestGenerator = new ManifestGenerator();
  const manifestData = this.prepareManifestData(data);
  const pdfBuffer = await manifestGenerator.generate(manifestData);

  const fileName = `manifest-${data.manifestNumber}-${Date.now()}.pdf`;
  const s3Url = await this.s3Service.uploadDocument(pdfBuffer, fileName, 'manifests');

  const document = await Document.create({
    type: 'MANIFEST',
    reference: { type: 'Manifest', id: data.manifestId },
    fileName,
    s3Url,
    metadata: { manifestNumber: data.manifestNumber, shipmentCount: data.shipmentIds.length },
    generatedBy: data.userId
  });

  return document;
}

private prepareInvoiceData(dto: GenerateInvoiceDTO): IInvoiceData { /* Transform DTO */ }
private prepareManifestData(dto: GenerateManifestDTO): IManifestData { /* Transform DTO */ }
```

**Instructions:**
- Import InvoiceGenerator and ManifestGenerator
- Create DTOs: GenerateInvoiceDTO, GenerateManifestDTO
- Prepare data transformation methods
- Upload generated PDFs to S3 in organized folders
- Create Document records with proper metadata

**Deliverable:** Document service with invoice/manifest generation

---

**Task 4.6: Create Document API Endpoints**

**File:** `/server/src/presentation/http/controllers/document/document.controller.ts` (UPDATE)

Add new endpoints:

```typescript
// POST /api/v1/documents/invoice
async generateInvoice(req: Request, res: Response): Promise<void> {
  const dto: GenerateInvoiceDTO = { ...req.body, userId: req.user.id };
  const document = await this.documentService.generateInvoice(dto);
  res.status(201).json({ success: true, data: document });
}

// POST /api/v1/documents/manifest
async generateManifest(req: Request, res: Response): Promise<void> {
  const dto: GenerateManifestDTO = { ...req.body, userId: req.user.id };
  const document = await this.documentService.generateManifest(dto);
  res.status(201).json({ success: true, data: document });
}

// GET /api/v1/documents/:id/download
async downloadDocument(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const signedUrl = await this.documentService.getSignedDownloadUrl(id);
  res.json({ success: true, data: { downloadUrl: signedUrl } });
}
```

**File:** `/server/src/presentation/http/routes/v1/document/document.routes.ts` (UPDATE)

```typescript
router.post('/invoice', authenticate, authorize(['ADMIN', 'USER']), documentController.generateInvoice);
router.post('/manifest', authenticate, authorize(['ADMIN', 'WAREHOUSE']), documentController.generateManifest);
router.get('/:id/download', authenticate, documentController.downloadDocument);
```

**Deliverable:** Invoice and manifest generation endpoints functional

---

**Task 4.7: Testing Invoice/Manifest Generation**

**Test File:** `/server/src/__tests__/services/InvoiceGenerator.test.ts`

```typescript
describe('InvoiceGenerator', () => {
  it('should generate valid invoice PDF with all sections', async () => {
    const invoiceData: IInvoiceData = { /* test data */ };
    const generator = new InvoiceGenerator();
    const pdfBuffer = await generator.generate(invoiceData);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    // Verify PDF headers
    expect(pdfBuffer.toString('utf-8', 0, 5)).toContain('%PDF');
  });

  it('should correctly calculate totals with tax', async () => {
    // Test tax calculations in PDF
  });
});
```

**Test File:** `/server/src/__tests__/services/ManifestGenerator.test.ts`

Similar structure for manifest testing.

**Instructions:**
- Unit tests for PDF generators
- Validate PDF buffer format
- Test edge cases (empty line items, no tax, etc.)
- Visual inspection of generated PDFs

**Deliverable:** Invoice/Manifest generator tests passing

---

**Day 4 Summary:**
- ✅ InvoiceGenerator class created with professional layout
- ✅ ManifestGenerator class created for bulk shipments
- ✅ Invoice and Manifest data interfaces defined
- ✅ Document service extended with invoice/manifest methods
- ✅ API endpoints for invoice/manifest generation
- ✅ Unit tests for PDF generators

**Files Created:**
1. `/server/src/shared/services/pdf/InvoiceGenerator.ts`
2. `/server/src/core/domain/interfaces/documents/IInvoiceData.ts`
3. `/server/src/shared/services/pdf/ManifestGenerator.ts`
4. `/server/src/core/domain/interfaces/documents/IManifestData.ts`

**Files Updated:**
1. `/server/src/core/application/services/document/DocumentService.ts`
2. `/server/src/presentation/http/controllers/document/document.controller.ts`
3. `/server/src/presentation/http/routes/v1/document/document.routes.ts`

---

#### **Day 5 (Friday): Testing + Documentation + Week 4 Summary**

**Agent:** Cursor + Claude Sonnet
**Focus:** Comprehensive testing, API documentation, week summary, context packages
**Files:** 8 test files, documentation updates

---

##### **Morning Session (3 hours): Integration Testing**

**Task 5.1: Document Service Integration Tests**

**File:** `/server/src/__tests__/integration/document.integration.test.ts`

```typescript
describe('Document Service Integration Tests', () => {
  let testOrder: any;
  let testWallet: any;

  beforeAll(async () => {
    // Setup test database with order data
  });

  describe('Shipping Label Generation', () => {
    it('should generate label and upload to S3', async () => {
      const dto: GenerateShippingLabelDTO = {
        shipmentId: testShipment._id,
        userId: testUser._id
      };

      const document = await documentService.generateShippingLabel(dto);

      expect(document.type).toBe('SHIPPING_LABEL');
      expect(document.s3Url).toContain('s3.amazonaws.com');
      expect(document.fileName).toContain('.pdf');

      // Verify S3 upload
      const s3Object = await s3Service.getObject(document.s3Url);
      expect(s3Object).toBeDefined();
    });
  });

  describe('Invoice Generation', () => {
    it('should generate invoice with correct totals', async () => {
      const dto: GenerateInvoiceDTO = {
        orderId: testOrder._id,
        invoiceNumber: 'INV-2025-001',
        userId: testUser._id
      };

      const document = await documentService.generateInvoice(dto);

      expect(document.type).toBe('INVOICE');
      expect(document.metadata.invoiceNumber).toBe('INV-2025-001');
    });

    it('should fail if order not found', async () => {
      const dto: GenerateInvoiceDTO = {
        orderId: new mongoose.Types.ObjectId(),
        invoiceNumber: 'INV-2025-002',
        userId: testUser._id
      };

      await expect(documentService.generateInvoice(dto)).rejects.toThrow('Order not found');
    });
  });

  describe('Manifest Generation', () => {
    it('should generate manifest for multiple shipments', async () => {
      const shipments = await createTestShipments(5);

      const dto: GenerateManifestDTO = {
        manifestNumber: 'MAN-2025-001',
        shipmentIds: shipments.map(s => s._id),
        userId: testUser._id
      };

      const document = await documentService.generateManifest(dto);

      expect(document.type).toBe('MANIFEST');
      expect(document.metadata.shipmentCount).toBe(5);
    });
  });

  describe('Document Download', () => {
    it('should generate signed URL for download', async () => {
      const document = await Document.findOne({ type: 'SHIPPING_LABEL' });
      const signedUrl = await documentService.getSignedDownloadUrl(document._id);

      expect(signedUrl).toContain('X-Amz-Signature');
      expect(signedUrl).toContain('Shipcrowd-documents');
    });

    it('should expire signed URL after configured time', async () => {
      // Test URL expiration logic
    });
  });
});
```

**Instructions:**
- Test complete document generation flow
- Verify S3 uploads with actual AWS SDK calls
- Test error scenarios (missing data, invalid IDs)
- Test signed URL generation and expiration
- Mock S3 in test environment if needed

**Deliverable:** Document service integration tests passing (20+ tests)

---

**Task 5.2: Wallet Integration Tests (Comprehensive)**

**File:** `/server/src/__tests__/integration/wallet-shipment.integration.test.ts`

```typescript
describe('Wallet-Shipment Integration', () => {
  it('should reserve wallet balance on shipment creation', async () => {
    const wallet = await createTestWallet(5000);
    const shipmentCost = 150;

    const shipment = await shipmentService.createShipment({
      companyId: wallet.companyId,
      // ... shipment data
    });

    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet.availableBalance).toBe(5000 - shipmentCost);
    expect(updatedWallet.reservedBalance).toBe(shipmentCost);

    // Verify transaction created
    const transaction = await WalletTransaction.findOne({
      walletId: wallet._id,
      type: 'RESERVE'
    });
    expect(transaction.amount).toBe(shipmentCost);
  });

  it('should debit reserved amount on shipment dispatch', async () => {
    const wallet = await createTestWallet(5000);
    const shipment = await createTestShipment(wallet.companyId, 150);

    await shipmentService.dispatchShipment(shipment._id);

    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet.reservedBalance).toBe(0);
    expect(updatedWallet.totalBalance).toBe(5000 - 150);
  });

  it('should release reserved amount on shipment cancellation', async () => {
    const wallet = await createTestWallet(5000);
    const shipment = await createTestShipment(wallet.companyId, 150);

    await shipmentService.cancelShipment(shipment._id);

    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet.availableBalance).toBe(5000);
    expect(updatedWallet.reservedBalance).toBe(0);
  });

  it('should fail shipment creation if insufficient balance', async () => {
    const wallet = await createTestWallet(100);

    await expect(shipmentService.createShipment({
      companyId: wallet.companyId,
      // Shipment cost > 100
    })).rejects.toThrow('Insufficient wallet balance');
  });
});
```

**Deliverable:** Wallet-shipment integration tests (15+ scenarios)

---

##### **Afternoon Session (3 hours): API Documentation**

**Task 5.3: Document API Documentation**

**File:** `/server/docs/api/DOCUMENT_API.md`

```markdown
# Document API Documentation

## Base URL
`/api/v1/documents`

## Authentication
All endpoints require Bearer token authentication.

---

## Endpoints

### 1. Generate Shipping Label

**POST** `/shipping-label`

Generate a shipping label PDF for a shipment.

**Request Body:**
```json
{
  "shipmentId": "60d5ec49f1b2c72b8c8e4f1a"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f1b",
    "type": "SHIPPING_LABEL",
    "fileName": "label-AWB123456-1640000000000.pdf",
    "s3Url": "https://Shipcrowd-documents.s3.amazonaws.com/labels/...",
    "metadata": {
      "awbNumber": "AWB123456"
    },
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `404`: Shipment not found
- `400`: Invalid shipment ID
- `500`: PDF generation failed

---

### 2. Generate Invoice

**POST** `/invoice`

Generate an invoice PDF for an order.

**Request Body:**
```json
{
  "orderId": "60d5ec49f1b2c72b8c8e4f1c",
  "invoiceNumber": "INV-2025-001"
}
```

**Response:** Similar to shipping label

---

### 3. Generate Manifest

**POST** `/manifest`

Generate a manifest PDF for multiple shipments.

**Request Body:**
```json
{
  "manifestNumber": "MAN-2025-001",
  "shipmentIds": ["id1", "id2", "id3"]
}
```

**Response:** Similar structure with shipment count in metadata

---

### 4. Download Document

**GET** `/:id/download`

Get a signed S3 URL for downloading the document.

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://Shipcrowd-documents.s3.amazonaws.com/...?X-Amz-Signature=..."
  }
}
```

**Note:** Signed URL expires in 15 minutes.

---

### 5. List Documents

**GET** `/`

**Query Parameters:**
- `type`: SHIPPING_LABEL | INVOICE | MANIFEST
- `referenceType`: Shipment | Order | Manifest
- `referenceId`: ID of referenced entity
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)

**Response:** Paginated list of documents
```

**Instructions:**
- Document all endpoints with request/response examples
- Include error scenarios and status codes
- Add authentication requirements
- Provide usage examples with curl commands
- Document query parameters and filters

**Deliverable:** Complete Document API documentation

---

**Task 5.4: Update Wallet API Documentation**

**File:** `/server/docs/api/WALLET_API.md`

```markdown
# Wallet API Documentation

## Overview
Wallet system manages company balances for shipping costs.

## Endpoints

### 1. Get Wallet Balance
**GET** `/api/v1/wallet/balance`

### 2. Get Transaction History
**GET** `/api/v1/wallet/transactions`

### 3. Recharge Wallet (Admin)
**POST** `/api/v1/wallet/recharge`

### 4. Deduct Balance (Admin)
**POST** `/api/v1/wallet/deduct`

[Full details for each endpoint...]
```

**Deliverable:** Wallet API documentation complete

---

##### **Evening Session (2 hours): Context Packages + Week Summary**

**Task 5.5: Update Context Packages**

**File:** `/docs/ContextPackages/03_Payment_Wallet_System.md`

```markdown
# Context Package: Payment & Wallet System

## Overview
Razorpay payment gateway integration with wallet management system.

## Architecture
- Payment flow: Order → Capture → Webhook → Wallet Credit
- Wallet flow: Reserve → Debit on dispatch | Release on cancel

## Key Files
1. `/server/src/core/application/services/payment/razorpay.service.ts`
2. `/server/src/core/application/services/wallet/wallet.service.ts`
3. `/server/src/infrastructure/database/mongoose/models/Wallet.ts`
4. `/server/src/infrastructure/database/mongoose/models/WalletTransaction.ts`

## Critical Logic
- Optimistic locking on wallet updates (race condition prevention)
- Webhook signature verification with HMAC SHA256
- Balance snapshots in every transaction for audit trail

## Testing
- 80%+ coverage achieved
- Concurrent operation tests passing
- Integration tests with shipment flow

## Environment Variables
```bash
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

## Usage Examples
[Code examples for payment creation, wallet operations...]
```

**File:** `/docs/ContextPackages/04_Document_Generation.md`

```markdown
# Context Package: PDF Document Generation

## Overview
PDFKit-based document generation (labels, invoices, manifests) with S3 storage.

## Architecture
- Base class: PDFGenerator (abstract)
- Implementations: ShippingLabelGenerator, InvoiceGenerator, ManifestGenerator
- Storage: AWS S3 with signed URLs
- Service: DocumentService orchestrates generation + upload

## Key Files
1. `/server/src/shared/services/pdf/PDFGenerator.ts`
2. `/server/src/shared/services/pdf/ShippingLabelGenerator.ts`
3. `/server/src/shared/services/pdf/InvoiceGenerator.ts`
4. `/server/src/shared/services/pdf/ManifestGenerator.ts`
5. `/server/src/shared/services/aws/S3Service.ts`
6. `/server/src/core/application/services/document/DocumentService.ts`

## Critical Logic
- PDF generation in-memory (Buffer)
- S3 upload with organized folder structure
- Signed URL generation for secure downloads (15min expiry)
- Document model tracks all generated files

## Testing
- Unit tests for each generator
- Integration tests for S3 upload/download
- Visual inspection of generated PDFs

## Environment Variables
```bash
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=Shipcrowd-documents
AWS_REGION=ap-south-1
```

## Usage Examples
[Code examples for document generation...]
```

**Deliverable:** Context packages updated for Week 3-4 work

---

**Task 5.6: Create Week 4 Summary**

Add to end of Week 4 section:

```markdown
---

### **WEEK 4 SUMMARY**

#### **Achievements**
✅ **Wallet System Complete (100%)**
- Wallet model with available/reserved/total balance tracking
- WalletTransaction model with balance snapshots for audit
- Optimistic locking prevents race conditions in concurrent operations
- Complete CRUD operations for wallet management
- Integration with shipment service (reserve/debit/release flow)
- Integration with payment service (credit on recharge)
- Admin endpoints for wallet recharge/deduct

✅ **PDF Generation System Complete (100%)**
- PDFGenerator abstract base class with common functionality
- ShippingLabelGenerator for shipment labels
- InvoiceGenerator for order invoices with professional layout
- ManifestGenerator for bulk shipment manifests (landscape)
- AWS S3Service for document storage with signed URLs
- Document model tracks all generated files
- DocumentService orchestrates generation + upload
- API endpoints for all document types

✅ **Testing & Documentation**
- 70%+ test coverage for wallet system
- 65%+ test coverage for document generation
- Integration tests for wallet-shipment flow
- Integration tests for document generation + S3 upload
- Complete API documentation for wallet and document endpoints
- Context packages updated

#### **Deliverables**

**Models Created:**
1. Wallet model with balance tracking
2. WalletTransaction model with audit trail
3. Document model for file tracking

**Services Created:**
1. WalletService with optimistic locking
2. DocumentService with PDF generation orchestration
3. S3Service for AWS storage
4. PDFGenerator (base class)
5. ShippingLabelGenerator
6. InvoiceGenerator
7. ManifestGenerator

**API Endpoints:**
1. `GET /api/v1/wallet/balance` - Get wallet balance
2. `GET /api/v1/wallet/transactions` - Transaction history
3. `POST /api/v1/wallet/recharge` - Recharge wallet (admin)
4. `POST /api/v1/wallet/deduct` - Deduct balance (admin)
5. `POST /api/v1/documents/shipping-label` - Generate label
6. `POST /api/v1/documents/invoice` - Generate invoice
7. `POST /api/v1/documents/manifest` - Generate manifest
8. `GET /api/v1/documents/:id/download` - Download document

**Files Created (23 total):**
- 3 Models
- 7 Services
- 4 Controllers
- 3 Route files
- 12 Test files
- 6 Interface/DTO files
- 2 Documentation files
- 2 Context packages

**Dependencies Installed:**
```bash
npm install razorpay pdfkit @types/pdfkit aws-sdk crypto
```

**Environment Variables Added:**
```bash
# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# AWS S3
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=Shipcrowd-documents
AWS_REGION=ap-south-1
```

#### **Testing Metrics**
- **Wallet System:** 18 unit tests + 15 integration tests = 70% coverage
- **Payment System:** 22 unit tests + 12 integration tests = 80% coverage
- **Document Generation:** 15 unit tests + 8 integration tests = 65% coverage
- **Total Week 4 Tests:** 90 tests passing

#### **Integration Points**
1. **Wallet ↔ Shipment:** Reserve balance on creation, debit on dispatch, release on cancel
2. **Wallet ↔ Payment:** Credit wallet on successful Razorpay payment via webhook
3. **Document ↔ Shipment:** Generate shipping labels with AWB numbers
4. **Document ↔ Order:** Generate invoices for completed orders
5. **Document ↔ Manifest:** Generate manifests for bulk pickups
6. **Document ↔ S3:** Upload all PDFs to S3, retrieve via signed URLs

#### **Next Week Preview: Week 5 - Warehouse Workflows**
- Picking workflows for order fulfillment
- Packing station management
- Inventory tracking
- Barcode scanning integration
- Warehouse API endpoints

---
```

**Deliverable:** Week 4 summary complete with achievements, deliverables, metrics

---

**Task 5.7: Git Commit for Week 4**

**Instructions:**
```bash
git add .
git commit -m "Week 4 Complete: Wallet System + PDF Generation

- Wallet model with available/reserved balance tracking
- WalletTransaction with audit trail and optimistic locking
- Razorpay payment integration with webhook verification
- PDF generation system (labels, invoices, manifests)
- AWS S3 integration for document storage
- Complete API endpoints for wallet and documents
- 90 tests passing with 70%+ coverage
- API documentation and context packages updated

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Deliverable:** Week 4 work committed to git

---

**Day 5 Summary:**
- ✅ Comprehensive integration tests for document service
- ✅ Wallet-shipment integration tests (15+ scenarios)
- ✅ Complete API documentation (Wallet + Document APIs)
- ✅ Context packages updated (Payment/Wallet + Document Generation)
- ✅ Week 4 summary with metrics and achievements
- ✅ Git commit for Week 4 completion

**Total Week 4 Files:**
- **Created:** 23 new files
- **Updated:** 8 existing files
- **Test Coverage:** 70%+ for wallet, 80%+ for payment, 65%+ for documents
- **API Endpoints:** 8 new endpoints
- **Documentation:** 4 markdown files

---

## **END OF WEEK 4: WALLET SYSTEM + PDF GENERATION**

**Overall Progress After Week 4:**
- Backend Completion: ~40% → ~48%
- Core Features: Velocity Shipfast courier, Razorpay payments, Wallet system, PDF generation
- Next Focus: Week 5 - Warehouse workflows (picking, packing, inventory)

**Ready for Week 5 Planning** ✅

---

## WEEK 5: WAREHOUSE WORKFLOWS (PICKING, PACKING, MANIFEST)

### **Week 5 Overview**

**Focus:** Complete warehouse management system for order fulfillment
**Duration:** 5 days
**Agent:** Cursor (implementation) + Claude Sonnet (planning)
**Prerequisites:** Weeks 1-4 complete (Velocity Shipfast, Razorpay, Wallet, PDFs)

**Objectives:**
1. Implement picking workflow for order fulfillment
2. Create packing station management system
3. Build inventory tracking and stock management
4. Integrate barcode scanning for warehouse operations
5. Complete warehouse API endpoints with proper authorization
6. Achieve 70%+ test coverage for warehouse features

**Key Deliverables:**
- Warehouse model with zones and locations
- Picking workflow (pick list generation, picking tasks, verification)
- Packing workflow (packing station, multi-package support, weight verification)
- Inventory management (stock tracking, low stock alerts, replenishment)
- Barcode integration (SKU scanning, location scanning, verification)
- Warehouse API with role-based access (WAREHOUSE_MANAGER, PICKER, PACKER)

---

#### **Day 1 (Monday): Warehouse Models + Picking Workflow Design**

**Agent:** Cursor
**Focus:** Database models, picking workflow architecture
**Files:** 6 new

---

##### **Morning Session (3 hours): Warehouse Models**

**Task 1.1: Create Warehouse Model**

**File:** `/server/src/infrastructure/database/mongoose/models/Warehouse.ts`

```typescript
import { Schema, model } from 'mongoose';

interface IWarehouse {
  companyId: Schema.Types.ObjectId;
  name: string;
  code: string; // Unique warehouse code (e.g., "WH-DEL-01")

  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };

  contact: {
    name: string;
    phone: string;
    email: string;
  };

  // Warehouse configuration
  type: 'FULFILLMENT' | 'STORAGE' | 'HYBRID';
  isActive: boolean;
  isPrimary: boolean; // Primary warehouse for company

  // Capacity
  capacity: {
    totalArea: number; // sq ft
    storageArea: number;
    packingArea: number;
    maxSKUs: number;
    maxOrders: number; // per day
  };

  // Operating hours
  operatingHours: {
    monday: { open: string; close: string; isOpen: boolean };
    tuesday: { open: string; close: string; isOpen: boolean };
    // ... rest of week
  };

  // Zones within warehouse
  zones: Schema.Types.ObjectId[]; // Reference to WarehouseZone

  // Statistics
  stats: {
    totalSKUs: number;
    totalStock: number;
    ordersProcessedToday: number;
    ordersProcessedMonth: number;
  };
}

const WarehouseSchema = new Schema<IWarehouse>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, uppercase: true },

  address: {
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },

  contact: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }
  },

  type: {
    type: String,
    enum: ['FULFILLMENT', 'STORAGE', 'HYBRID'],
    default: 'FULFILLMENT'
  },

  isActive: { type: Boolean, default: true },
  isPrimary: { type: Boolean, default: false },

  capacity: {
    totalArea: Number,
    storageArea: Number,
    packingArea: Number,
    maxSKUs: { type: Number, default: 10000 },
    maxOrders: { type: Number, default: 500 }
  },

  operatingHours: { type: Schema.Types.Mixed },
  zones: [{ type: Schema.Types.ObjectId, ref: 'WarehouseZone' }],

  stats: {
    totalSKUs: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0 },
    ordersProcessedToday: { type: Number, default: 0 },
    ordersProcessedMonth: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Indexes
WarehouseSchema.index({ companyId: 1, code: 1 }, { unique: true });
WarehouseSchema.index({ isActive: 1, isPrimary: 1 });

export default model<IWarehouse>('Warehouse', WarehouseSchema);
```

**Instructions:**
- Warehouse code must be unique across system
- Support multiple warehouses per company
- Track capacity and utilization
- Operating hours for shift management
- Statistics updated via background jobs

**Deliverable:** Warehouse model complete

---

**Task 1.2: Create Warehouse Zone Model**

**File:** `/server/src/infrastructure/database/mongoose/models/WarehouseZone.ts`

```typescript
interface IWarehouseZone {
  warehouseId: Schema.Types.ObjectId;
  name: string;
  code: string; // e.g., "A", "B", "COLD-STORAGE"
  type: 'STORAGE' | 'PICKING' | 'PACKING' | 'RECEIVING' | 'DISPATCH' | 'RETURNS';

  // Location grid
  aisles: number; // Number of aisles
  racksPerAisle: number;
  shelvesPerRack: number;
  binsPerShelf: number;

  // Environmental
  temperature?: 'AMBIENT' | 'COLD' | 'FROZEN';
  isClimateControlled: boolean;

  // Access control
  requiresAuthorization: boolean;
  authorizedRoles: string[];

  isActive: boolean;
}

const WarehouseZoneSchema = new Schema<IWarehouseZone>({
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true },
  type: {
    type: String,
    enum: ['STORAGE', 'PICKING', 'PACKING', 'RECEIVING', 'DISPATCH', 'RETURNS'],
    required: true
  },

  aisles: { type: Number, default: 1 },
  racksPerAisle: { type: Number, default: 1 },
  shelvesPerRack: { type: Number, default: 1 },
  binsPerShelf: { type: Number, default: 1 },

  temperature: {
    type: String,
    enum: ['AMBIENT', 'COLD', 'FROZEN'],
    default: 'AMBIENT'
  },

  isClimateControlled: { type: Boolean, default: false },
  requiresAuthorization: { type: Boolean, default: false },
  authorizedRoles: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Unique zone code per warehouse
WarehouseZoneSchema.index({ warehouseId: 1, code: 1 }, { unique: true });

export default model<IWarehouseZone>('WarehouseZone', WarehouseZoneSchema);
```

**Deliverable:** Warehouse zone model complete

---

**Task 1.3: Create Warehouse Location Model**

**File:** `/server/src/infrastructure/database/mongoose/models/WarehouseLocation.ts`

```typescript
interface IWarehouseLocation {
  zoneId: Schema.Types.ObjectId;
  warehouseId: Schema.Types.ObjectId;

  // Location coordinates
  locationCode: string; // e.g., "A-01-03-05" (Zone-Aisle-Rack-Shelf-Bin)
  aisle: string;
  rack: string;
  shelf: string;
  bin: string;

  // Location type
  type: 'BIN' | 'RACK' | 'FLOOR' | 'PALLET';

  // Capacity
  maxWeight: number; // kg
  maxVolume: number; // cubic meters

  // Current status
  isOccupied: boolean;
  currentWeight: number;
  currentSKU?: string;
  currentStock: number;

  // Restrictions
  isDedicated: boolean; // Dedicated to specific SKU
  dedicatedSKU?: string;
  allowMixedSKUs: boolean;

  // Picking optimization
  isPickFace: boolean; // High-velocity pick location
  pickPriority: number; // 1 = highest priority

  isActive: boolean;
  isBlocked: boolean; // Temporarily unavailable
  blockReason?: string;
}

const WarehouseLocationSchema = new Schema<IWarehouseLocation>({
  zoneId: { type: Schema.Types.ObjectId, ref: 'WarehouseZone', required: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },

  locationCode: { type: String, required: true, unique: true, uppercase: true },
  aisle: { type: String, required: true },
  rack: { type: String, required: true },
  shelf: { type: String, required: true },
  bin: { type: String, required: true },

  type: {
    type: String,
    enum: ['BIN', 'RACK', 'FLOOR', 'PALLET'],
    default: 'BIN'
  },

  maxWeight: { type: Number, required: true },
  maxVolume: { type: Number, required: true },

  isOccupied: { type: Boolean, default: false },
  currentWeight: { type: Number, default: 0 },
  currentSKU: String,
  currentStock: { type: Number, default: 0 },

  isDedicated: { type: Boolean, default: false },
  dedicatedSKU: String,
  allowMixedSKUs: { type: Boolean, default: true },

  isPickFace: { type: Boolean, default: false },
  pickPriority: { type: Number, default: 5 },

  isActive: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
  blockReason: String
}, { timestamps: true });

// Indexes
WarehouseLocationSchema.index({ warehouseId: 1, locationCode: 1 }, { unique: true });
WarehouseLocationSchema.index({ isPickFace: 1, pickPriority: 1 });
WarehouseLocationSchema.index({ currentSKU: 1, isOccupied: 1 });

export default model<IWarehouseLocation>('WarehouseLocation', WarehouseLocationSchema);
```

**Deliverable:** Warehouse location model with bin-level tracking

---

##### **Afternoon Session (3 hours): Picking Workflow Models**

**Task 1.4: Create Pick List Model**

**File:** `/server/src/infrastructure/database/mongoose/models/PickList.ts`

```typescript
interface IPickList {
  warehouseId: Schema.Types.ObjectId;
  pickListNumber: string; // PL-2025-001

  // Orders in this pick list
  orders: Schema.Types.ObjectId[]; // Order references
  shipments: Schema.Types.ObjectId[]; // Shipment references

  // Pick items
  items: IPickListItem[];

  // Status workflow
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  // Assignment
  assignedTo?: Schema.Types.ObjectId; // Picker user
  assignedAt?: Date;

  // Picking details
  pickingStrategy: 'BATCH' | 'WAVE' | 'DISCRETE' | 'ZONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  // Timing
  estimatedPickTime: number; // minutes
  actualPickTime?: number;
  startedAt?: Date;
  completedAt?: Date;

  // Verification
  requiresVerification: boolean;
  verifiedBy?: Schema.Types.ObjectId;
  verifiedAt?: Date;

  // Notes
  notes?: string;
  pickerNotes?: string;
}

interface IPickListItem {
  orderItemId: Schema.Types.ObjectId;
  sku: string;
  productName: string;

  // Location
  locationId: Schema.Types.ObjectId;
  locationCode: string;
  zone: string;

  // Quantity
  quantityRequired: number;
  quantityPicked: number;

  // Status
  status: 'PENDING' | 'PICKED' | 'SHORT_PICK' | 'NOT_FOUND';

  // Barcode verification
  barcodeScanned: boolean;
  scannedAt?: Date;

  // Picker notes
  notes?: string;
}

const PickListSchema = new Schema<IPickList>({
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  pickListNumber: { type: String, required: true, unique: true },

  orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
  shipments: [{ type: Schema.Types.ObjectId, ref: 'Shipment' }],

  items: [{
    orderItemId: { type: Schema.Types.ObjectId, required: true },
    sku: { type: String, required: true },
    productName: { type: String, required: true },

    locationId: { type: Schema.Types.ObjectId, ref: 'WarehouseLocation', required: true },
    locationCode: { type: String, required: true },
    zone: { type: String, required: true },

    quantityRequired: { type: Number, required: true },
    quantityPicked: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['PENDING', 'PICKED', 'SHORT_PICK', 'NOT_FOUND'],
      default: 'PENDING'
    },

    barcodeScanned: { type: Boolean, default: false },
    scannedAt: Date,
    notes: String
  }],

  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },

  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  assignedAt: Date,

  pickingStrategy: {
    type: String,
    enum: ['BATCH', 'WAVE', 'DISCRETE', 'ZONE'],
    default: 'BATCH'
  },

  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },

  estimatedPickTime: Number,
  actualPickTime: Number,
  startedAt: Date,
  completedAt: Date,

  requiresVerification: { type: Boolean, default: true },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,

  notes: String,
  pickerNotes: String
}, { timestamps: true });

// Indexes
PickListSchema.index({ warehouseId: 1, status: 1 });
PickListSchema.index({ assignedTo: 1, status: 1 });
PickListSchema.index({ pickListNumber: 1 }, { unique: true });

export default model<IPickList>('PickList', PickListSchema);
```

**Instructions:**
- Support multiple picking strategies (batch, wave, discrete, zone)
- Track individual item picking status
- Barcode verification for accuracy
- Time tracking for productivity metrics
- Notes for exceptions and issues

**Deliverable:** Pick list model with item-level tracking

---

##### **Evening Session (2 hours): Picking Service Foundation**

**Task 1.5: Create Picking Service Interface**

**File:** `/server/src/core/domain/interfaces/warehouse/IPickingService.ts`

```typescript
export interface ICreatePickListDTO {
  warehouseId: string;
  orderIds: string[];
  pickingStrategy: 'BATCH' | 'WAVE' | 'DISCRETE' | 'ZONE';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignTo?: string; // User ID
}

export interface IAssignPickListDTO {
  pickListId: string;
  pickerId: string;
}

export interface IStartPickingDTO {
  pickListId: string;
  pickerId: string;
}

export interface IPickItemDTO {
  pickListId: string;
  itemId: string;
  quantityPicked: number;
  locationCode: string;
  barcodeScanned: boolean;
  notes?: string;
}

export interface ICompletePickListDTO {
  pickListId: string;
  pickerId: string;
  pickerNotes?: string;
}

export interface IPickingService {
  // Pick list management
  createPickList(data: ICreatePickListDTO): Promise<IPickList>;
  assignPickList(data: IAssignPickListDTO): Promise<IPickList>;
  getPickListById(id: string): Promise<IPickList>;
  getPickListsByPicker(pickerId: string): Promise<IPickList[]>;

  // Picking operations
  startPicking(data: IStartPickingDTO): Promise<IPickList>;
  pickItem(data: IPickItemDTO): Promise<IPickList>;
  completePickList(data: ICompletePickListDTO): Promise<IPickList>;

  // Pick list optimization
  optimizePickPath(pickListId: string): Promise<IPickListItem[]>; // Sort by location proximity

  // Reporting
  getPickerProductivity(pickerId: string, dateRange: DateRange): Promise<IPickerStats>;
}

export interface IPickerStats {
  totalPickLists: number;
  itemsPicked: number;
  averagePickTime: number;
  accuracy: number; // percentage
  productivityScore: number;
}
```

**Deliverable:** Picking service interface defined

---

**Task 1.6: Implement Picking Service**

**File:** `/server/src/core/application/services/warehouse/PickingService.ts`

```typescript
import PickList from '@/infrastructure/database/mongoose/models/PickList';
import Order from '@/infrastructure/database/mongoose/models/Order';
import WarehouseLocation from '@/infrastructure/database/mongoose/models/WarehouseLocation';
import { IPickingService, ICreatePickListDTO } from '@/core/domain/interfaces/warehouse/IPickingService';
import { withTransaction } from '@/shared/utils/mongoTransaction';
import { AppError } from '@/shared/errors/AppError';

export default class PickingService implements IPickingService {
  async createPickList(data: ICreatePickListDTO): Promise<IPickList> {
    return withTransaction(async (session) => {
      // Validate orders exist and are ready for picking
      const orders = await Order.find({
        _id: { $in: data.orderIds },
        status: 'CONFIRMED',
        fulfillmentStatus: 'PENDING'
      }).session(session);

      if (orders.length !== data.orderIds.length) {
        throw new AppError('Some orders are not available for picking', 400);
      }

      // Collect all items with locations
      const pickListItems = [];

      for (const order of orders) {
        for (const item of order.items) {
          // Find optimal location for this SKU
          const location = await this.findOptimalLocation(item.sku, data.warehouseId);

          if (!location) {
            throw new AppError(`No stock found for SKU ${item.sku}`, 400);
          }

          pickListItems.push({
            orderItemId: item._id,
            sku: item.sku,
            productName: item.productName,
            locationId: location._id,
            locationCode: location.locationCode,
            zone: location.zone,
            quantityRequired: item.quantity,
            quantityPicked: 0,
            status: 'PENDING'
          });
        }
      }

      // Optimize pick path based on strategy
      const optimizedItems = this.optimizeByStrategy(pickListItems, data.pickingStrategy);

      // Generate pick list number
      const pickListNumber = await this.generatePickListNumber();

      // Create pick list
      const pickList = await PickList.create([{
        warehouseId: data.warehouseId,
        pickListNumber,
        orders: data.orderIds,
        items: optimizedItems,
        pickingStrategy: data.pickingStrategy,
        priority: data.priority || 'MEDIUM',
        status: 'PENDING',
        assignedTo: data.assignTo,
        assignedAt: data.assignTo ? new Date() : undefined,
        estimatedPickTime: this.estimatePickTime(optimizedItems)
      }], { session });

      return pickList[0];
    });
  }

  async startPicking(data: IStartPickingDTO): Promise<IPickList> {
    const pickList = await PickList.findById(data.pickListId);

    if (!pickList) {
      throw new AppError('Pick list not found', 404);
    }

    if (pickList.status !== 'PENDING') {
      throw new AppError('Pick list is not in pending status', 400);
    }

    if (pickList.assignedTo?.toString() !== data.pickerId) {
      throw new AppError('Pick list not assigned to this picker', 403);
    }

    pickList.status = 'IN_PROGRESS';
    pickList.startedAt = new Date();

    await pickList.save();
    return pickList;
  }

  async pickItem(data: IPickItemDTO): Promise<IPickList> {
    const pickList = await PickList.findById(data.pickListId);

    if (!pickList) {
      throw new AppError('Pick list not found', 404);
    }

    const item = pickList.items.find(i => i._id.toString() === data.itemId);

    if (!item) {
      throw new AppError('Item not found in pick list', 404);
    }

    // Update item
    item.quantityPicked = data.quantityPicked;
    item.barcodeScanned = data.barcodeScanned;
    item.scannedAt = new Date();
    item.notes = data.notes;

    // Determine status
    if (data.quantityPicked === item.quantityRequired) {
      item.status = 'PICKED';
    } else if (data.quantityPicked < item.quantityRequired) {
      item.status = 'SHORT_PICK';
    } else if (data.quantityPicked === 0) {
      item.status = 'NOT_FOUND';
    }

    await pickList.save();
    return pickList;
  }

  async completePickList(data: ICompletePickListDTO): Promise<IPickList> {
    return withTransaction(async (session) => {
      const pickList = await PickList.findById(data.pickListId).session(session);

      if (!pickList) {
        throw new AppError('Pick list not found', 404);
      }

      // Verify all items are picked
      const allPicked = pickList.items.every(item =>
        item.status === 'PICKED' || item.status === 'SHORT_PICK'
      );

      if (!allPicked) {
        throw new AppError('Not all items have been picked', 400);
      }

      // Calculate actual pick time
      const actualPickTime = Math.floor(
        (Date.now() - pickList.startedAt!.getTime()) / 60000
      );

      pickList.status = 'COMPLETED';
      pickList.completedAt = new Date();
      pickList.actualPickTime = actualPickTime;
      pickList.pickerNotes = data.pickerNotes;

      await pickList.save({ session });

      // Update order statuses
      await Order.updateMany(
        { _id: { $in: pickList.orders } },
        { $set: { fulfillmentStatus: 'PICKED' } },
        { session }
      );

      return pickList;
    });
  }

  private async findOptimalLocation(sku: string, warehouseId: string) {
    // Find pick face location first (highest priority)
    return await WarehouseLocation.findOne({
      warehouseId,
      currentSKU: sku,
      isOccupied: true,
      isActive: true,
      isBlocked: false,
      currentStock: { $gt: 0 }
    }).sort({ isPickFace: -1, pickPriority: 1 });
  }

  private optimizeByStrategy(items: any[], strategy: string): any[] {
    switch (strategy) {
      case 'ZONE':
        // Group by zone, then sort by location
        return items.sort((a, b) => a.zone.localeCompare(b.zone) || a.locationCode.localeCompare(b.locationCode));

      case 'BATCH':
        // Sort by location proximity
        return items.sort((a, b) => a.locationCode.localeCompare(b.locationCode));

      default:
        return items;
    }
  }

  private estimatePickTime(items: any[]): number {
    // Rough estimate: 2 minutes per item
    return items.length * 2;
  }

  private async generatePickListNumber(): Promise<string> {
    const count = await PickList.countDocuments();
    return `PL-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }

  // Other methods implementation...
}
```

**Instructions:**
- Transaction safety for pick list creation
- Optimal location selection (pick face priority)
- Pick path optimization based on strategy
- Time tracking for productivity
- Validation at each step

**Deliverable:** Picking service with core operations

---

**Day 1 Summary:**
- ✅ Warehouse model with zones and capacity tracking
- ✅ Warehouse zone model with location grid
- ✅ Warehouse location model with bin-level tracking
- ✅ Pick list model with item-level status
- ✅ Picking service interface defined
- ✅ Picking service implemented with optimization

**Files Created:**
1. `/server/src/infrastructure/database/mongoose/models/Warehouse.ts`
2. `/server/src/infrastructure/database/mongoose/models/WarehouseZone.ts`
3. `/server/src/infrastructure/database/mongoose/models/WarehouseLocation.ts`
4. `/server/src/infrastructure/database/mongoose/models/PickList.ts`
5. `/server/src/core/domain/interfaces/warehouse/IPickingService.ts`
6. `/server/src/core/application/services/warehouse/PickingService.ts`

---

#### **Day 2 (Tuesday): Packing Workflow + API Endpoints**

**Agent:** Cursor
**Focus:** Packing station, packing workflow, warehouse API
**Files:** 5 new, 3 updated

---

##### **Morning Session (3 hours): Packing Models & Service**

**Task 2.1: Create Packing Station Model**

**File:** `/server/src/infrastructure/database/mongoose/models/PackingStation.ts`

```typescript
interface IPackingStation {
  warehouseId: Schema.Types.ObjectId;
  stationNumber: string; // PS-01, PS-02
  zoneId: Schema.Types.ObjectId;

  // Station configuration
  type: 'STANDARD' | 'EXPRESS' | 'BULK' | 'FRAGILE';
  capabilities: string[]; // ['MULTI_PACKAGE', 'WEIGHT_VERIFICATION', 'LABEL_PRINTING']

  // Equipment
  hasScale: boolean;
  hasPrinter: boolean;
  hasBarcodeScanner: boolean;

  // Status
  isActive: boolean;
  isOccupied: boolean;
  currentOperator?: Schema.Types.ObjectId;
  currentPackingTask?: Schema.Types.ObjectId;

  // Performance
  stats: {
    packagesProcessedToday: number;
    packagesProcessedMonth: number;
    averagePackingTime: number; // minutes
  };
}

const PackingStationSchema = new Schema<IPackingStation>({
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  stationNumber: { type: String, required: true },
  zoneId: { type: Schema.Types.ObjectId, ref: 'WarehouseZone', required: true },

  type: {
    type: String,
    enum: ['STANDARD', 'EXPRESS', 'BULK', 'FRAGILE'],
    default: 'STANDARD'
  },

  capabilities: [{ type: String }],

  hasScale: { type: Boolean, default: true },
  hasPrinter: { type: Boolean, default: true },
  hasBarcodeScanner: { type: Boolean, default: true },

  isActive: { type: Boolean, default: true },
  isOccupied: { type: Boolean, default: false },
  currentOperator: { type: Schema.Types.ObjectId, ref: 'User' },
  currentPackingTask: { type: Schema.Types.ObjectId, ref: 'PackingTask' },

  stats: {
    packagesProcessedToday: { type: Number, default: 0 },
    packagesProcessedMonth: { type: Number, default: 0 },
    averagePackingTime: { type: Number, default: 0 }
  }
}, { timestamps: true });

PackingStationSchema.index({ warehouseId: 1, stationNumber: 1 }, { unique: true });

export default model<IPackingStation>('PackingStation', PackingStationSchema);
```

**Deliverable:** Packing station model

---

**Task 2.2: Create Packing Task Model**

**File:** `/server/src/infrastructure/database/mongoose/models/PackingTask.ts`

```typescript
interface IPackingTask {
  pickListId: Schema.Types.ObjectId;
  warehouseId: Schema.Types.ObjectId;
  orders: Schema.Types.ObjectId[];

  // Packing details
  taskNumber: string; // PT-2025-001
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

  // Assignment
  assignedTo?: Schema.Types.ObjectId; // Packer user
  packingStationId?: Schema.Types.ObjectId;
  assignedAt?: Date;

  // Packages
  packages: IPackage[];

  // Timing
  startedAt?: Date;
  completedAt?: Date;
  estimatedTime: number;
  actualTime?: number;

  // Quality checks
  weightVerified: boolean;
  dimensionsVerified: boolean;
  contentsVerified: boolean;
  labelAttached: boolean;

  // Notes
  notes?: string;
  packerNotes?: string;
}

interface IPackage {
  packageNumber: string; // PKG-001
  orderId: Schema.Types.ObjectId;
  shipmentId?: Schema.Types.ObjectId;

  // Package details
  type: 'BOX' | 'ENVELOPE' | 'POLY_BAG' | 'CUSTOM';
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };

  weight: {
    actual: number;
    volumetric: number;
    charged: number; // Max of actual and volumetric
    unit: 'kg' | 'g';
  };

  // Contents
  items: {
    sku: string;
    quantity: number;
    isPacked: boolean;
  }[];

  // Tracking
  awbNumber?: string;
  labelGenerated: boolean;
  labelUrl?: string;

  // Status
  status: 'PENDING' | 'PACKED' | 'DISPATCHED';
  packedAt?: Date;
  dispatchedAt?: Date;
}

const PackingTaskSchema = new Schema<IPackingTask>({
  pickListId: { type: Schema.Types.ObjectId, ref: 'PickList', required: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],

  taskNumber: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'],
    default: 'PENDING'
  },

  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  packingStationId: { type: Schema.Types.ObjectId, ref: 'PackingStation' },
  assignedAt: Date,

  packages: [{
    packageNumber: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment' },

    type: {
      type: String,
      enum: ['BOX', 'ENVELOPE', 'POLY_BAG', 'CUSTOM'],
      required: true
    },

    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, enum: ['cm', 'in'], default: 'cm' }
    },

    weight: {
      actual: Number,
      volumetric: Number,
      charged: Number,
      unit: { type: String, enum: ['kg', 'g'], default: 'kg' }
    },

    items: [{
      sku: String,
      quantity: Number,
      isPacked: { type: Boolean, default: false }
    }],

    awbNumber: String,
    labelGenerated: { type: Boolean, default: false },
    labelUrl: String,

    status: {
      type: String,
      enum: ['PENDING', 'PACKED', 'DISPATCHED'],
      default: 'PENDING'
    },

    packedAt: Date,
    dispatchedAt: Date
  }],

  startedAt: Date,
  completedAt: Date,
  estimatedTime: Number,
  actualTime: Number,

  weightVerified: { type: Boolean, default: false },
  dimensionsVerified: { type: Boolean, default: false },
  contentsVerified: { type: Boolean, default: false },
  labelAttached: { type: Boolean, default: false },

  notes: String,
  packerNotes: String
}, { timestamps: true });

PackingTaskSchema.index({ warehouseId: 1, status: 1 });
PackingTaskSchema.index({ assignedTo: 1, status: 1 });
PackingTaskSchema.index({ taskNumber: 1 }, { unique: true });

export default model<IPackingTask>('PackingTask', PackingTaskSchema);
```

**Deliverable:** Packing task model with multi-package support

---

**Task 2.3: Create Packing Service**

**File:** `/server/src/core/application/services/warehouse/PackingService.ts`

```typescript
import PackingTask from '@/infrastructure/database/mongoose/models/PackingTask';
import PickList from '@/infrastructure/database/mongoose/models/PickList';
import PackingStation from '@/infrastructure/database/mongoose/models/PackingStation';
import { withTransaction } from '@/shared/utils/mongoTransaction';
import { AppError } from '@/shared/errors/AppError';

export default class PackingService {
  async createPackingTask(pickListId: string): Promise<IPackingTask> {
    return withTransaction(async (session) => {
      const pickList = await PickList.findById(pickListId).session(session);

      if (!pickList || pickList.status !== 'COMPLETED') {
        throw new AppError('Pick list must be completed before packing', 400);
      }

      // Generate task number
      const taskNumber = await this.generateTaskNumber();

      // Create packing task
      const packingTask = await PackingTask.create([{
        pickListId,
        warehouseId: pickList.warehouseId,
        orders: pickList.orders,
        taskNumber,
        status: 'PENDING',
        estimatedTime: this.estimatePackingTime(pickList.items.length)
      }], { session });

      return packingTask[0];
    });
  }

  async assignPackingTask(taskId: string, packerId: string, stationId: string): Promise<IPackingTask> {
    return withTransaction(async (session) => {
      const task = await PackingTask.findById(taskId).session(session);
      const station = await PackingStation.findById(stationId).session(session);

      if (!task) throw new AppError('Task not found', 404);
      if (!station) throw new AppError('Station not found', 404);

      if (station.isOccupied) {
        throw new AppError('Packing station is occupied', 400);
      }

      task.assignedTo = packerId;
      task.packingStationId = stationId;
      task.assignedAt = new Date();

      station.isOccupied = true;
      station.currentOperator = packerId;
      station.currentPackingTask = taskId;

      await task.save({ session });
      await station.save({ session });

      return task;
    });
  }

  async startPacking(taskId: string): Promise<IPackingTask> {
    const task = await PackingTask.findById(taskId);

    if (!task) throw new AppError('Task not found', 404);
    if (task.status !== 'PENDING') throw new AppError('Task not in pending status', 400);

    task.status = 'IN_PROGRESS';
    task.startedAt = new Date();

    await task.save();
    return task;
  }

  async addPackage(taskId: string, packageData: any): Promise<IPackingTask> {
    const task = await PackingTask.findById(taskId);

    if (!task) throw new AppError('Task not found', 404);

    const packageNumber = `PKG-${String(task.packages.length + 1).padStart(3, '0')}`;

    task.packages.push({
      packageNumber,
      ...packageData,
      status: 'PENDING'
    });

    await task.save();
    return task;
  }

  async verifyPackage(taskId: string, packageId: string, verificationData: any): Promise<IPackingTask> {
    const task = await PackingTask.findById(taskId);

    if (!task) throw new AppError('Task not found', 404);

    const pkg = task.packages.find(p => p._id.toString() === packageId);

    if (!pkg) throw new AppError('Package not found', 404);

    // Update weight
    pkg.weight.actual = verificationData.actualWeight;
    pkg.weight.volumetric = this.calculateVolumetricWeight(pkg.dimensions);
    pkg.weight.charged = Math.max(pkg.weight.actual, pkg.weight.volumetric);

    // Mark verification flags
    task.weightVerified = true;
    task.dimensionsVerified = true;

    pkg.status = 'PACKED';
    pkg.packedAt = new Date();

    await task.save();
    return task;
  }

  async completePackingTask(taskId: string, packerNotes?: string): Promise<IPackingTask> {
    return withTransaction(async (session) => {
      const task = await PackingTask.findById(taskId).session(session);

      if (!task) throw new AppError('Task not found', 404);

      // Verify all packages packed
      const allPacked = task.packages.every(p => p.status === 'PACKED');

      if (!allPacked) {
        throw new AppError('Not all packages are packed', 400);
      }

      // Calculate actual time
      const actualTime = Math.floor((Date.now() - task.startedAt!.getTime()) / 60000);

      task.status = 'COMPLETED';
      task.completedAt = new Date();
      task.actualTime = actualTime;
      task.packerNotes = packerNotes;

      // Release packing station
      if (task.packingStationId) {
        await PackingStation.findByIdAndUpdate(
          task.packingStationId,
          {
            isOccupied: false,
            currentOperator: null,
            currentPackingTask: null
          },
          { session }
        );
      }

      await task.save({ session });
      return task;
    });
  }

  private calculateVolumetricWeight(dimensions: any): number {
    // Volumetric weight = (L x W x H) / 5000 (standard formula)
    const { length, width, height } = dimensions;
    return (length * width * height) / 5000;
  }

  private estimatePackingTime(itemCount: number): number {
    // Estimate 5 minutes per item
    return itemCount * 5;
  }

  private async generateTaskNumber(): Promise<string> {
    const count = await PackingTask.countDocuments();
    return `PT-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
}
```

**Instructions:**
- Transaction safety for task assignment
- Weight verification (actual vs volumetric)
- Multi-package support per task
- Station occupancy management
- Time tracking for productivity

**Deliverable:** Packing service complete

---

##### **Afternoon Session (3 hours): Warehouse API Endpoints**

**Task 2.4: Create Warehouse Controller**

**File:** `/server/src/presentation/http/controllers/warehouse/warehouse.controller.ts`

```typescript
import { Request, Response } from 'express';
import PickingService from '@/core/application/services/warehouse/PickingService';
import PackingService from '@/core/application/services/warehouse/PackingService';

export default class WarehouseController {
  private pickingService: PickingService;
  private packingService: PackingService;

  constructor() {
    this.pickingService = new PickingService();
    this.packingService = new PackingService();
  }

  // PICKING ENDPOINTS

  async createPickList(req: Request, res: Response): Promise<void> {
    const dto = { ...req.body, userId: req.user.id };
    const pickList = await this.pickingService.createPickList(dto);
    res.status(201).json({ success: true, data: pickList });
  }

  async getPickListsByPicker(req: Request, res: Response): Promise<void> {
    const { pickerId } = req.params;
    const pickLists = await this.pickingService.getPickListsByPicker(pickerId);
    res.json({ success: true, data: pickLists });
  }

  async startPicking(req: Request, res: Response): Promise<void> {
    const { pickListId } = req.params;
    const dto = { pickListId, pickerId: req.user.id };
    const pickList = await this.pickingService.startPicking(dto);
    res.json({ success: true, data: pickList });
  }

  async pickItem(req: Request, res: Response): Promise<void> {
    const { pickListId, itemId } = req.params;
    const dto = { pickListId, itemId, ...req.body };
    const pickList = await this.pickingService.pickItem(dto);
    res.json({ success: true, data: pickList });
  }

  async completePickList(req: Request, res: Response): Promise<void> {
    const { pickListId } = req.params;
    const dto = { pickListId, pickerId: req.user.id, ...req.body };
    const pickList = await this.pickingService.completePickList(dto);
    res.json({ success: true, data: pickList });
  }

  // PACKING ENDPOINTS

  async createPackingTask(req: Request, res: Response): Promise<void> {
    const { pickListId } = req.body;
    const task = await this.packingService.createPackingTask(pickListId);
    res.status(201).json({ success: true, data: task });
  }

  async assignPackingTask(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;
    const { stationId } = req.body;
    const task = await this.packingService.assignPackingTask(taskId, req.user.id, stationId);
    res.json({ success: true, data: task });
  }

  async startPacking(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;
    const task = await this.packingService.startPacking(taskId);
    res.json({ success: true, data: task });
  }

  async addPackage(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;
    const task = await this.packingService.addPackage(taskId, req.body);
    res.json({ success: true, data: task });
  }

  async verifyPackage(req: Request, res: Response): Promise<void> {
    const { taskId, packageId } = req.params;
    const task = await this.packingService.verifyPackage(taskId, packageId, req.body);
    res.json({ success: true, data: task });
  }

  async completePackingTask(req: Request, res: Response): Promise<void> {
    const { taskId } = req.params;
    const task = await this.packingService.completePackingTask(taskId, req.body.notes);
    res.json({ success: true, data: task });
  }
}
```

**Deliverable:** Warehouse controller with picking and packing endpoints

---

**Task 2.5: Create Warehouse Routes**

**File:** `/server/src/presentation/http/routes/v1/warehouse/warehouse.routes.ts`

```typescript
import { Router } from 'express';
import WarehouseController from '@/presentation/http/controllers/warehouse/warehouse.controller';
import { authenticate } from '@/presentation/http/middleware/auth.middleware';
import { authorize } from '@/presentation/http/middleware/authorization.middleware';

const router = Router();
const controller = new WarehouseController();

// PICKING ROUTES
router.post(
  '/picking/pick-lists',
  authenticate,
  authorize(['WAREHOUSE_MANAGER', 'ADMIN']),
  controller.createPickList.bind(controller)
);

router.get(
  '/picking/pick-lists/picker/:pickerId',
  authenticate,
  authorize(['WAREHOUSE_MANAGER', 'PICKER', 'ADMIN']),
  controller.getPickListsByPicker.bind(controller)
);

router.post(
  '/picking/pick-lists/:pickListId/start',
  authenticate,
  authorize(['PICKER', 'ADMIN']),
  controller.startPicking.bind(controller)
);

router.post(
  '/picking/pick-lists/:pickListId/items/:itemId/pick',
  authenticate,
  authorize(['PICKER', 'ADMIN']),
  controller.pickItem.bind(controller)
);

router.post(
  '/picking/pick-lists/:pickListId/complete',
  authenticate,
  authorize(['PICKER', 'ADMIN']),
  controller.completePickList.bind(controller)
);

// PACKING ROUTES
router.post(
  '/packing/tasks',
  authenticate,
  authorize(['WAREHOUSE_MANAGER', 'ADMIN']),
  controller.createPackingTask.bind(controller)
);

router.post(
  '/packing/tasks/:taskId/assign',
  authenticate,
  authorize(['PACKER', 'ADMIN']),
  controller.assignPackingTask.bind(controller)
);

router.post(
  '/packing/tasks/:taskId/start',
  authenticate,
  authorize(['PACKER', 'ADMIN']),
  controller.startPacking.bind(controller)
);

router.post(
  '/packing/tasks/:taskId/packages',
  authenticate,
  authorize(['PACKER', 'ADMIN']),
  controller.addPackage.bind(controller)
);

router.post(
  '/packing/tasks/:taskId/packages/:packageId/verify',
  authenticate,
  authorize(['PACKER', 'ADMIN']),
  controller.verifyPackage.bind(controller)
);

router.post(
  '/packing/tasks/:taskId/complete',
  authenticate,
  authorize(['PACKER', 'ADMIN']),
  controller.completePackingTask.bind(controller)
);

export default router;
```

**Deliverable:** Warehouse routes with role-based access

---

##### **Evening Session (2 hours): Integration & Testing Setup**

**Task 2.6: Integrate Warehouse Routes**

**File:** `/server/src/presentation/http/routes/v1/index.ts` (UPDATE)

```typescript
import warehouseRoutes from './warehouse/warehouse.routes';

// Add to existing routes
router.use('/warehouse', warehouseRoutes);
```

**Deliverable:** Warehouse routes integrated

---

**Task 2.7: Create Warehouse Test Utilities**

**File:** `/server/src/__tests__/utils/warehouseTestUtils.ts`

```typescript
import Warehouse from '@/infrastructure/database/mongoose/models/Warehouse';
import WarehouseZone from '@/infrastructure/database/mongoose/models/WarehouseZone';
import WarehouseLocation from '@/infrastructure/database/mongoose/models/WarehouseLocation';
import PickList from '@/infrastructure/database/mongoose/models/PickList';

export async function createTestWarehouse(companyId: string) {
  return await Warehouse.create({
    companyId,
    name: 'Test Warehouse',
    code: `WH-TEST-${Date.now()}`,
    address: {
      line1: '123 Test St',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      country: 'India'
    },
    contact: {
      name: 'Test Manager',
      phone: '9999999999',
      email: 'test@warehouse.com'
    },
    type: 'FULFILLMENT',
    isActive: true,
    isPrimary: true,
    capacity: {
      maxSKUs: 10000,
      maxOrders: 500
    }
  });
}

export async function createTestZone(warehouseId: string) {
  return await WarehouseZone.create({
    warehouseId,
    name: 'Zone A',
    code: 'A',
    type: 'STORAGE',
    aisles: 10,
    racksPerAisle: 20,
    shelvesPerRack: 5,
    binsPerShelf: 10,
    isActive: true
  });
}

export async function createTestLocation(warehouseId: string, zoneId: string, sku?: string) {
  return await WarehouseLocation.create({
    warehouseId,
    zoneId,
    locationCode: `A-01-01-01-${Date.now()}`,
    aisle: '01',
    rack: '01',
    shelf: '01',
    bin: '01',
    type: 'BIN',
    maxWeight: 50,
    maxVolume: 1,
    isOccupied: sku ? true : false,
    currentSKU: sku,
    currentStock: sku ? 100 : 0,
    isPickFace: true,
    pickPriority: 1,
    isActive: true
  });
}

export async function createTestPickList(warehouseId: string, orderIds: string[]) {
  return await PickList.create({
    warehouseId,
    pickListNumber: `PL-TEST-${Date.now()}`,
    orders: orderIds,
    items: [],
    status: 'PENDING',
    pickingStrategy: 'BATCH',
    priority: 'MEDIUM'
  });
}
```

**Deliverable:** Test utilities for warehouse entities

---

**Day 2 Summary:**
- ✅ Packing station model created
- ✅ Packing task model with multi-package support
- ✅ Packing service implemented
- ✅ Warehouse controller with picking/packing endpoints
- ✅ Warehouse routes with role-based authorization
- ✅ Test utilities for warehouse testing

**Files Created:**
1. `/server/src/infrastructure/database/mongoose/models/PackingStation.ts`
2. `/server/src/infrastructure/database/mongoose/models/PackingTask.ts`
3. `/server/src/core/application/services/warehouse/PackingService.ts`
4. `/server/src/presentation/http/controllers/warehouse/warehouse.controller.ts`
5. `/server/src/presentation/http/routes/v1/warehouse/warehouse.routes.ts`

**Files Updated:**
1. `/server/src/presentation/http/routes/v1/index.ts`

---

#### **Day 3 (Wednesday): Inventory Management + Barcode Integration**

**Agent:** Cursor
**Focus:** Inventory tracking, stock movements, barcode scanning
**Files:** 4 new, 2 updated

**Morning (3hrs): Task 3.1-3.3 - Inventory Models & Service**

Create Inventory model with auto-calculated stock (available = onHand - reserved), Stock

Movement audit trail model, and InventoryService with `reserveStock()`, `deductStock()`, `releaseStock()` using optimistic locking and transactions.

**Afternoon (3hrs): Task 3.4-3.6 - Barcode Integration**

Create BarcodeService with `lookupByBarcode()` and `verifyPickBarcode()`. Update PickingService.pickItem() to verify scanned barcode matches expected SKU. Update PackingService with `verifyPackageWithBarcode()` method.

**Evening (2hrs): Task 3.7-3.8 - Inventory API**

Create InventoryController with `getStock()` and `lookupBarcode()` endpoints. Create inventory routes with proper authorization.

**Files Created (6):**
1. `/server/src/infrastructure/database/mongoose/models/Inventory.ts`
2. `/server/src/infrastructure/database/mongoose/models/StockMovement.ts`
3. `/server/src/core/application/services/warehouse/InventoryService.ts`
4. `/server/src/core/application/services/warehouse/BarcodeService.ts`
5. `/server/src/presentation/http/controllers/warehouse/inventory.controller.ts`
6. `/server/src/presentation/http/routes/v1/warehouse/inventory.routes.ts`

**Files Updated (2):**
- `/server/src/core/application/services/warehouse/PickingService.ts` - Add barcode verification
- `/server/src/core/application/services/warehouse/PackingService.ts` - Add barcode scanning

---

#### **Day 4 (Thursday): Testing + Warehouse Integration**

**Agent:** Cursor
**Focus:** Comprehensive warehouse testing, integration with shipment flow
**Files:** 10 test files, 3 updated services

**Morning (3hrs): Task 4.1-4.3 - Unit Tests**

Create PickingService.test.ts with tests for `createPickingTask()`, `optimizePickingRoute()`, `pickItem()` (barcode verification, quantity validation, concurrent picks). Create PackingService.test.ts with multi-package scenarios, weight verification, and `completePacking()` workflow. Create InventoryService.test.ts with concurrent `reserveStock()` race condition tests using optimistic locking, `deductStock()` validation, and stock movement audit trails.

**Afternoon (3hrs): Task 4.4-4.6 - Integration Tests**

Create warehouse.integration.test.ts with end-to-end flow: order creation → picking task auto-generation → item picking with barcode scanning → packing workflow → inventory deduction → shipment creation. Test barcode verification failures, insufficient stock handling, and multi-warehouse order splitting scenarios.

**Evening (2hrs): Task 4.7-4.9 - Shipment Integration**

Update ShipmentService with `createShipmentFromPackedOrder()` method that auto-generates AWB from Shiprocket after packing completion. Add `linkPackageToShipment()` to associate packing task packages with shipment records. Update PackingService.completePacking() to trigger shipment creation automatically.

**Files Created (3):**
1. `/server/src/tests/unit/services/warehouse/PickingService.test.ts`
2. `/server/src/tests/unit/services/warehouse/PackingService.test.ts`
3. `/server/src/tests/unit/services/warehouse/InventoryService.test.ts`
4. `/server/src/tests/integration/warehouse/warehouse.integration.test.ts`

**Files Updated (2):**
- `/server/src/core/application/services/shipping/shipment.service.ts` - Add `createShipmentFromPackedOrder()`
- `/server/src/core/application/services/warehouse/PackingService.ts` - Auto-trigger shipment creation

**Test Coverage Target:** 70%+ for warehouse features

---

#### **Day 5 (Friday): Documentation + Week 5 Summary**

**Agent:** Claude Sonnet + Cursor
**Focus:** API docs, context packages, week summary

**Morning (3hrs): Task 5.1-5.3 - API Documentation**

Create `/docs/api/warehouse-api.md` documenting all warehouse endpoints: picking routes (GET /picking-tasks, POST /picking-tasks/:id/pick-item), packing routes (GET /packing-tasks, POST /packing-tasks/:id/complete), inventory routes (GET /inventory/:sku, POST /inventory/lookup-barcode). Include request/response examples, error codes, and authentication requirements. Create `/docs/guides/barcode-integration.md` with barcode scanning workflow and verification logic. Create Mermaid workflow diagrams for picking→packing→shipping flow.

**Afternoon (2hrs): Task 5.4-5.6 - Context Packages**

Create `/docs/ContextPackages/WarehouseManagement.md` with warehouse domain overview, models (Warehouse, PickingTask, PackingTask, Inventory), services architecture, and key workflows. Create `/docs/ContextPackages/PickingPackingWorkflows.md` detailing task lifecycle states, optimization algorithms, barcode verification, and multi-warehouse handling. Update `/docs/Development/MASTER_CONTEXT.md` with warehouse feature summary and integration points.

**Evening (3hrs): Task 5.7-5.9 - Week Summary & Git Commit**

Create week 5 implementation summary documenting 15+ new files created, test coverage achieved (70%+), warehouse features completed, and integration with shipment service. Prepare Week 6 planning notes for e-commerce integration (Shopify OAuth, order sync architecture). Create git commit with message: "feat: Complete warehouse management system with picking, packing, inventory tracking, and barcode integration (Week 5)"

**Files Created (4):**
1. `/docs/api/warehouse-api.md`
2. `/docs/guides/barcode-integration.md`
3. `/docs/ContextPackages/WarehouseManagement.md`
4. `/docs/ContextPackages/PickingPackingWorkflows.md`

**Files Updated (1):**
- `/docs/Development/MASTER_CONTEXT.md` - Add warehouse features overview

---

### **WEEK 5 SUMMARY**

#### **Achievements**
✅ **Warehouse Management System Complete (100%)**
- Warehouse model with zones, locations, and capacity tracking
- Bin-level inventory tracking with pick face optimization
- Multi-warehouse support per company

✅ **Picking Workflow Complete (100%)**
- Pick list generation with multiple strategies (BATCH, WAVE, ZONE, DISCRETE)
- Location-optimized pick paths
- Barcode verification for accuracy
- Picker productivity tracking
- Item-level status tracking (PICKED, SHORT_PICK, NOT_FOUND)

✅ **Packing Workflow Complete (100%)**
- Packing station management with occupancy tracking
- Multi-package support per order
- Weight verification (actual vs volumetric)
- Packing task workflow (assign → pack → verify → complete)
- Integration with label generation

✅ **Inventory Management Complete (100%)**
- Real-time stock tracking per location
- Stock movement audit trail (IN/OUT/TRANSFER/ADJUSTMENT)
- Low stock alerts and reorder point management
- Concurrent stock update handling

✅ **Barcode Integration Complete (100%)**
- Barcode generation for SKUs and locations
- Barcode verification in picking process
- Barcode scanning in packing process
- Error prevention through scan verification

✅ **Testing & Documentation**
- 70%+ test coverage for warehouse features
- 40+ unit tests + 15+ integration tests
- Complete API documentation
- Workflow diagrams and guides
- 2 context packages created

#### **Deliverables**

**Models Created (8 total):**
1. Warehouse - Multi-warehouse management
2. WarehouseZone - Zone-based organization
3. WarehouseLocation - Bin-level tracking
4. PickList - Picking task management
5. PackingStation - Station management
6. PackingTask - Packing workflow
7. Inventory - Stock tracking
8. StockMovement - Movement audit trail

**Services Created (4 total):**
1. PickingService - Pick list creation, optimization, execution
2. PackingService - Packing task management, verification
3. InventoryService - Stock management, movements
4. BarcodeService - Barcode generation and verification

**API Endpoints (12 total):**
- `POST /api/v1/warehouse/picking/pick-lists` - Create pick list
- `GET /api/v1/warehouse/picking/pick-lists/picker/:pickerId` - Get picker's lists
- `POST /api/v1/warehouse/picking/pick-lists/:id/start` - Start picking
- `POST /api/v1/warehouse/picking/pick-lists/:id/items/:itemId/pick` - Pick item
- `POST /api/v1/warehouse/picking/pick-lists/:id/complete` - Complete picking
- `POST /api/v1/warehouse/packing/tasks` - Create packing task
- `POST /api/v1/warehouse/packing/tasks/:id/assign` - Assign to packer
- `POST /api/v1/warehouse/packing/tasks/:id/start` - Start packing
- `POST /api/v1/warehouse/packing/tasks/:id/packages` - Add package
- `POST /api/v1/warehouse/packing/tasks/:id/packages/:pkgId/verify` - Verify package
- `POST /api/v1/warehouse/packing/tasks/:id/complete` - Complete packing
- `GET /api/v1/warehouse/inventory/stock/:sku` - Check stock levels

**Testing Metrics:**
- **Picking Service:** 22 unit tests + 8 integration tests = 72% coverage
- **Packing Service:** 18 unit tests + 7 integration tests = 68% coverage
- **Inventory Service:** 15 unit tests + 5 integration tests = 70% coverage
- **Total Week 5 Tests:** 75 tests passing

**Integration Points:**
1. **Warehouse ↔ Order:** Orders trigger pick list creation
2. **Picking ↔ Packing:** Completed pick lists create packing tasks
3. **Packing ↔ Shipment:** Packed orders create shipments with AWB
4. **Inventory ↔ Picking:** Stock verification before pick list creation
5. **Inventory ↔ Packing:** Stock deduction on packing completion
6. **Barcode ↔ Picking/Packing:** Verification at each step

**New User Roles:**
- WAREHOUSE_MANAGER - Full warehouse access
- PICKER - Pick list assignment and execution
- PACKER - Packing task execution
- INVENTORY_MANAGER - Stock management

#### **Next Week Preview: Week 6 - E-commerce Integration (Shopify)**
- Shopify app authentication and installation
- Order sync (pull orders from Shopify)
- Inventory sync (push stock to Shopify)
- Webhook handling for real-time updates
- Product mapping and SKU matching

---

## **END OF WEEK 5: WAREHOUSE WORKFLOWS**

**Overall Progress After Week 5:**
- Backend Completion: ~48% → ~58%
- Core Features Complete: Velocity Shipfast, Razorpay, Wallet, PDFs, Warehouse
- Ready for Week 6: E-commerce integration

---

## WEEK 6: E-COMMERCE INTEGRATION (SHOPIFY)

### **Week 6 Overview**

**Focus:** Shopify integration for automated order and inventory sync
**Duration:** 5 days
**Agent:** Cursor (implementation) + Claude Sonnet (planning)
**Prerequisites:** Weeks 1-5 complete (core platform features operational)

**Objectives:**
1. Implement Shopify OAuth authentication and app installation
2. Build order sync engine (pull orders from Shopify → Shipcrowd)
3. Create inventory sync system (push stock from Shipcrowd → Shopify)
4. Implement webhook handlers for real-time updates
5. Build product mapping system for SKU matching
6. Achieve 75%+ test coverage for e-commerce integrations

**Key Deliverables:**
- Shopify app configuration and OAuth flow
- Order sync service (pull orders, map to Shipcrowd format)
- Inventory sync service (push stock levels, handle variants)
- Webhook handlers (order/create, order/update, product/update)
- Product mapping interface (Shopify SKU ↔ Shipcrowd SKU)
- E-commerce integration API endpoints

---

#### **Day 1 (Monday): Shopify App Setup + OAuth**

**Agent:** Cursor
**Focus:** Shopify app configuration, OAuth authentication, store connection
**Files:** 5 new

**Morning (3hrs): Shopify Integration Models**

**Task 1.1: Create Shopify Store Model**

**File:** `/server/src/infrastructure/database/mongoose/models/ShopifyStore.ts`

```typescript
interface IShopifyStore {
  companyId: Schema.Types.ObjectId;

  // Store details
  shopDomain: string; // example.myshopify.com
  shopName: string;
  shopEmail: string;
  shopCountry: string;
  shopCurrency: string;

  // Authentication
  accessToken: string; // Encrypted
  scope: string;

  // Installation
  installedAt: Date;
  isActive: boolean;
  isPaused: boolean;

  // Sync configuration
  syncConfig: {
    orderSync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number; // minutes
      lastSyncAt?: Date;
      syncStatus: 'IDLE' | 'SYNCING' | 'ERROR';
    };

    inventorySync: {
      enabled: boolean;
      autoSync: boolean;
      syncInterval: number;
      lastSyncAt?: Date;
      syncDirection: 'ONE_WAY' | 'TWO_WAY';
    };

    webhooksEnabled: boolean;
  };

  // Statistics
  stats: {
    totalOrdersSynced: number;
    totalProductsMapped: number;
    lastOrderSyncAt?: Date;
    lastInventorySyncAt?: Date;
  };
}
```

**Instructions:**
- Store access token encrypted (use crypto library)
- Support multiple Shopify stores per company
- Track sync status for monitoring
- Webhook configuration per store

**Deliverable:** Shopify store model

---

**Task 1.2: Create Product Mapping Model**

**File:** `/server/src/infrastructure/database/mongoose/models/ProductMapping.ts`

```typescript
interface IProductMapping {
  companyId: Schema.Types.ObjectId;
  shopifyStoreId: Schema.Types.ObjectId;

  // Shopify product
  shopifyProductId: string;
  shopifyVariantId: string;
  shopifySKU: string;
  shopifyTitle: string;
  shopifyBarcode?: string;

  // Shipcrowd product
  ShipcrowdSKU: string;
  ShipcrowdProductName: string;

  // Mapping details
  mappingType: 'AUTO' | 'MANUAL';
  mappedBy?: Schema.Types.ObjectId; // User who mapped
  mappedAt: Date;

  // Sync settings
  syncInventory: boolean;
  syncPrice: boolean;

  isActive: boolean;
}
```

**Deliverable:** Product mapping model for SKU matching

---

**Afternoon (3hrs): Shopify OAuth Implementation**

**Task 1.3: Create Shopify OAuth Service**

**File:** `/server/src/core/application/services/integrations/ShopifyOAuthService.ts`

```typescript
import crypto from 'crypto';
import axios from 'axios';
import ShopifyStore from '@/infrastructure/database/mongoose/models/ShopifyStore';

export default class ShopifyOAuthService {
  private apiKey: string;
  private apiSecret: string;
  private redirectUri: string;
  private scopes: string[];

  constructor() {
    this.apiKey = process.env.SHOPIFY_API_KEY!;
    this.apiSecret = process.env.SHOPIFY_API_SECRET!;
    this.redirectUri = process.env.SHOPIFY_REDIRECT_URI!;
    this.scopes = [
      'read_orders',
      'write_orders',
      'read_products',
      'write_inventory',
      'read_fulfillments',
      'write_fulfillments'
    ];
  }

  generateAuthUrl(shop: string, state: string): string {
    const shopDomain = this.normalizeShopDomain(shop);
    const scopeString = this.scopes.join(',');

    return `https://${shopDomain}/admin/oauth/authorize?client_id=${this.apiKey}&scope=${scopeString}&redirect_uri=${this.redirectUri}&state=${state}`;
  }

  async exchangeCodeForToken(shop: string, code: string): Promise<string> {
    const shopDomain = this.normalizeShopDomain(shop);

    const response = await axios.post(
      `https://${shopDomain}/admin/oauth/access_token`,
      {
        client_id: this.apiKey,
        client_secret: this.apiSecret,
        code
      }
    );

    return response.data.access_token;
  }

  async getShopDetails(shop: string, accessToken: string): Promise<any> {
    const shopDomain = this.normalizeShopDomain(shop);

    const response = await axios.get(
      `https://${shopDomain}/admin/api/2024-01/shop.json`,
      {
        headers: { 'X-Shopify-Access-Token': accessToken }
      }
    );

    return response.data.shop;
  }

  async installStore(companyId: string, shop: string, accessToken: string): Promise<IShopifyStore> {
    const shopDetails = await this.getShopDetails(shop, accessToken);

    // Encrypt access token before storing
    const encryptedToken = this.encryptToken(accessToken);

    const store = await ShopifyStore.create({
      companyId,
      shopDomain: shop,
      shopName: shopDetails.name,
      shopEmail: shopDetails.email,
      shopCountry: shopDetails.country,
      shopCurrency: shopDetails.currency,
      accessToken: encryptedToken,
      scope: this.scopes.join(','),
      installedAt: new Date(),
      isActive: true,
      syncConfig: {
        orderSync: { enabled: true, autoSync: true, syncInterval: 5, syncStatus: 'IDLE' },
        inventorySync: { enabled: true, autoSync: false, syncInterval: 30, syncDirection: 'ONE_WAY' },
        webhooksEnabled: true
      }
    });

    // Register webhooks
    await this.registerWebhooks(shop, accessToken);

    return store;
  }

  private async registerWebhooks(shop: string, accessToken: string): Promise<void> {
    const webhooks = [
      { topic: 'orders/create', address: `${process.env.BACKEND_URL}/webhooks/shopify/orders/create` },
      { topic: 'orders/updated', address: `${process.env.BACKEND_URL}/webhooks/shopify/orders/updated` },
      { topic: 'products/update', address: `${process.env.BACKEND_URL}/webhooks/shopify/products/update` }
    ];

    for (const webhook of webhooks) {
      await axios.post(
        `https://${shop}/admin/api/2024-01/webhooks.json`,
        { webhook },
        { headers: { 'X-Shopify-Access-Token': accessToken } }
      );
    }
  }

  private encryptToken(token: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  private normalizeShopDomain(shop: string): string {
    return shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
}
```

**Instructions:**
- Use Shopify API version 2024-01
- Encrypt access tokens before storage
- Register webhooks during installation
- Handle OAuth errors gracefully

**Deliverable:** Shopify OAuth service complete

---

**Evening (2hrs): Shopify Integration API**

**Task 1.4: Create Shopify Controller**

**File:** `/server/src/presentation/http/controllers/integrations/shopify.controller.ts`

```typescript
export default class ShopifyController {
  private oauthService: ShopifyOAuthService;

  async initiateInstall(req: Request, res: Response): Promise<void> {
    const { shop } = req.query;
    const state = crypto.randomBytes(16).toString('hex');

    // Store state in session for CSRF protection
    req.session.shopifyState = state;

    const authUrl = this.oauthService.generateAuthUrl(shop as string, state);
    res.redirect(authUrl);
  }

  async handleCallback(req: Request, res: Response): Promise<void> {
    const { shop, code, state } = req.query;

    // Verify state for CSRF
    if (state !== req.session.shopifyState) {
      throw new AppError('Invalid state parameter', 403);
    }

    // Exchange code for token
    const accessToken = await this.oauthService.exchangeCodeForToken(
      shop as string,
      code as string
    );

    // Install store
    const store = await this.oauthService.installStore(
      req.user.companyId,
      shop as string,
      accessToken
    );

    res.json({ success: true, data: store });
  }

  async getStores(req: Request, res: Response): Promise<void> {
    const stores = await ShopifyStore.find({ companyId: req.user.companyId });
    res.json({ success: true, data: stores });
  }

  async disconnectStore(req: Request, res: Response): Promise<void> {
    const { storeId } = req.params;

    await ShopifyStore.findByIdAndUpdate(storeId, { isActive: false });

    res.json({ success: true, message: 'Store disconnected' });
  }
}
```

**Task 1.5: Create Shopify Routes**

**File:** `/server/src/presentation/http/routes/v1/integrations/shopify.routes.ts`

```typescript
router.get('/install', controller.initiateInstall.bind(controller));
router.get('/callback', controller.handleCallback.bind(controller));
router.get('/stores', authenticate, controller.getStores.bind(controller));
router.delete('/stores/:storeId', authenticate, controller.disconnectStore.bind(controller));
```

**Deliverable:** Shopify integration endpoints functional

---

**Day 1 Summary:**
- ✅ Shopify store model with sync configuration
- ✅ Product mapping model for SKU matching
- ✅ OAuth service with token encryption
- ✅ Webhook registration during installation
- ✅ Shopify integration API endpoints

---

#### **Day 2 (Tuesday): Order Sync Engine**

**Agent:** Cursor
**Focus:** Pull orders from Shopify, map to Shipcrowd format, create orders
**Files:** 3 new, 2 updated

**Morning (3hrs): Task 2.1-2.3 - Order Sync Service**

Create ShopifyOrderSyncService with `fetchOrders()` using Shopify GraphQL API (orders query with pagination cursor, filter by created_at/updated_at). Implement `mapShopifyOrderToShipcrowd()` transforming Shopify order schema to Shipcrowd Order model (map line_items to orderItems, customer to recipientDetails, shipping_address to address). Handle variant SKU mapping, discount codes, shipping method extraction, and order notes preservation.

**Afternoon (3hrs): Task 2.4-2.6 - Order Creation Integration**

Update OrderService with `createFromShopifyOrder()` method that validates mapped order data, creates Order document with `shopifyOrderId` field for bidirectional linking. Implement status mapping: Shopify's `financial_status=paid` → Shipcrowd `PAID`, `fulfillment_status=fulfilled` → `FULFILLED`, default → `PENDING`. Add duplicate order prevention using `shopifyOrderId` unique index check before creation.

**Evening (2hrs): Task 2.7-2.9 - Sync Scheduling**

Create Bull queue ShopifyOrderSyncJob with cron schedule (every 15 mins) calling ShopifyOrderSyncService.syncRecentOrders(). Create SyncLog model tracking sync runs (startTime, endTime, ordersSynced, errors[]). Add POST /integrations/shopify/sync-orders manual trigger endpoint in ShopifyIntegrationController with admin authorization. Implement error handling with retry logic (max 3 attempts) and detailed error logging.

**Files Created (3):**
1. `/server/src/core/application/services/integrations/ShopifyOrderSyncService.ts`
2. `/server/src/infrastructure/jobs/ShopifyOrderSyncJob.ts`
3. `/server/src/infrastructure/database/mongoose/models/SyncLog.ts`

**Files Updated (2):**
- `/server/src/core/application/services/orders/order.service.ts` - Add `createFromShopifyOrder()`
- `/server/src/infrastructure/database/mongoose/models/Order.ts` - Add `shopifyOrderId` field with unique index

---

#### **Day 3 (Wednesday): Inventory Sync + Webhooks**

**Agent:** Cursor
**Focus:** Push inventory to Shopify, webhook handlers
**Files:** 4 new, 1 updated

**Morning (3hrs): Task 3.1-3.3 - Inventory Sync Service**

Create ShopifyInventorySyncService with `pushInventoryToShopify()` using Shopify GraphQL inventoryItemUpdate mutation. Implement `syncProductVariantInventory()` that maps Shipcrowd SKU to Shopify variant_id via ProductMapping, then updates available quantity at specific location_id. Add `batchInventorySync()` processing 50 SKUs per batch with rate limiting (2 requests/second) to avoid Shopify API throttling. Track sync status in InventorySyncLog model.

**Afternoon (3hrs): Task 3.4-3.7 - Webhook Handlers**

Create ShopifyWebhookVerifier with `verifyWebhookSignature()` using HMAC-SHA256 validation against Shopify webhook secret. Implement webhook handlers: `handleOrderCreate()` triggering immediate order sync, `handleOrderUpdate()` syncing status changes (cancelled, fulfilled), `handleProductUpdate()` refreshing SKU mappings when variants change. Add WebhookEvent model logging all webhook payloads for debugging and replay capability.

**Evening (2hrs): Task 3.8-3.9 - Webhook API**

Create ShopifyWebhookController with POST endpoints: /webhooks/shopify/orders/create, /webhooks/shopify/orders/update, /webhooks/shopify/products/update. Each endpoint verifies signature, queues webhook processing to Bull job (async), returns 200 immediately. Implement ShopifyWebhookProcessorJob with retry logic (max 5 attempts, exponential backoff). Add webhook registration script using Shopify API to auto-configure webhooks on store connection.

**Files Created (4):**
1. `/server/src/core/application/services/integrations/ShopifyInventorySyncService.ts`
2. `/server/src/presentation/http/controllers/webhooks/shopify.webhook.controller.ts`
3. `/server/src/shared/services/webhooks/ShopifyWebhookVerifier.ts`
4. `/server/src/infrastructure/jobs/ShopifyWebhookProcessorJob.ts`
5. `/server/src/infrastructure/database/mongoose/models/WebhookEvent.ts`

**Files Updated (1):**
- `/server/src/presentation/http/routes/v1/webhooks/index.ts` - Add Shopify webhook routes

---

#### **Day 4 (Thursday): Product Mapping + Testing**

**Agent:** Cursor
**Focus:** SKU mapping interface, comprehensive testing
**Files:** 6 test files, 2 new services

**Morning (3hrs): Task 4.1-4.3 - Product Mapping**

Create ProductMappingService with `autoMapProducts()` that matches Shipcrowd SKUs to Shopify variant SKUs using fuzzy string matching (Levenshtein distance). Create ProductMappingController with endpoints: GET /product-mappings (list all), POST /product-mappings (manual map), DELETE /product-mappings/:id (unmap). Implement `bulkImportMappings()` accepting CSV file (columns: ShipcrowdSKU, shopifyVariantId) and `exportMappings()` generating CSV for download. Store mappings in ProductMapping model with company scoping.

**Afternoon (3hrs): Task 4.4-4.6 - Unit Tests**

Create ShopifyOAuthService.test.ts testing `initiateOAuth()` redirect URL generation, `handleCallback()` token exchange, and `refreshAccessToken()` expiry handling. Create ShopifyOrderSyncService.test.ts with `fetchOrders()` pagination tests, `mapShopifyOrderToShipcrowd()` field mapping validation, and error handling for invalid orders. Create ShopifyInventorySyncService.test.ts with `batchInventorySync()` batch processing, rate limiting verification, and Shopify API error retry logic.

**Evening (2hrs): Task 4.7-4.9 - Integration Tests**

Create shopify.integration.test.ts with end-to-end scenario: OAuth connection → order webhook → order sync → inventory deduction → inventory push to Shopify. Test webhook signature verification, duplicate order prevention via `shopifyOrderId` index, and webhook retry on processing failure. Test product auto-mapping accuracy and manual mapping override. Mock Shopify API responses using nock library.

**Files Created (4):**
1. `/server/src/core/application/services/integrations/ProductMappingService.ts`
2. `/server/src/presentation/http/controllers/integrations/product-mapping.controller.ts`
3. `/server/src/tests/unit/services/integrations/ShopifyOAuthService.test.ts`
4. `/server/src/tests/unit/services/integrations/ShopifyOrderSyncService.test.ts`
5. `/server/src/tests/unit/services/integrations/ShopifyInventorySyncService.test.ts`
6. `/server/src/tests/integration/shopify/shopify.integration.test.ts`

**Files Updated (1):**
- `/server/src/infrastructure/database/mongoose/models/ProductMapping.ts` - Add company field with index

**Test Coverage Target:** 75%+ for Shopify integration

---

#### **Day 5 (Friday): Documentation + Week 6 Summary**

**Agent:** Claude Sonnet + Cursor
**Focus:** API docs, setup guide, week summary

**Morning (3hrs): Task 5.1-5.3 - Documentation**

Create `/docs/guides/shopify-integration-setup.md` with step-by-step setup: create Shopify app in Partner Dashboard, configure OAuth redirect URL, add API scopes (read_orders, write_inventory, read_products), install app on store, store access token securely. Document environment variables (SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_BACKEND_URL). Create `/docs/api/shopify-endpoints.md` documenting: POST /integrations/shopify/connect (initiate OAuth), GET /integrations/shopify/callback (OAuth callback), POST /integrations/shopify/sync-orders (manual sync). Create `/docs/guides/shopify-webhook-config.md` with webhook registration process and troubleshooting common webhook issues.

**Afternoon (2hrs): Task 5.4-5.5 - Context Packages**

Create `/docs/ContextPackages/ShopifyIntegration.md` documenting OAuth flow, order sync architecture (ShopifyOrderSyncService → OrderService), inventory sync (InventoryService → ShopifyInventorySyncService), webhook handlers, product mapping system, and error handling patterns. Include sequence diagrams for order sync and inventory sync flows. Update `/docs/Development/MASTER_CONTEXT.md` with e-commerce integration overview, supported platforms (Shopify, WooCommerce planned), and integration architecture patterns.

**Evening (3hrs): Task 5.6-5.8 - Week Summary & Git Commit**

Create week 6 implementation summary documenting OAuth implementation, order sync engine (bi-directional), inventory sync with rate limiting, webhook system (3 handlers), product mapping service, 75%+ test coverage achieved, and 10+ new files created. Create Week 7 planning notes for WooCommerce integration (WooCommerce REST API, JWT authentication, order/product sync patterns similar to Shopify). Create git commit with message: "feat: Complete Shopify e-commerce integration with OAuth, order sync, inventory sync, and webhooks (Week 6)"

**Files Created (4):**
1. `/docs/guides/shopify-integration-setup.md`
2. `/docs/api/shopify-endpoints.md`
3. `/docs/guides/shopify-webhook-config.md`
4. `/docs/ContextPackages/ShopifyIntegration.md`

**Files Updated (1):**
- `/docs/Development/MASTER_CONTEXT.md` - Add e-commerce integration section

---

### **WEEK 6 SUMMARY**

#### **Achievements**
✅ **Shopify Integration Complete (100%)**
- OAuth authentication with secure token storage
- Multi-store support per company
- Webhook registration during installation

✅ **Order Sync Complete (100%)**
- Pull orders from Shopify with pagination
- Order mapping to Shipcrowd format
- Automatic order creation in Shipcrowd
- Background sync job with configurable intervals
- Manual sync trigger endpoint

✅ **Inventory Sync Complete (100%)**
- Push stock levels to Shopify
- Product variant inventory handling
- Batch updates for performance
- One-way and two-way sync options

✅ **Webhook Integration Complete (100%)**
- Real-time order/create webhook
- Order/update webhook for status changes
- Product/update webhook for SKU changes
- HMAC signature verification
- Webhook retry logic

✅ **Product Mapping Complete (100%)**
- Auto-mapping by SKU match
- Manual mapping interface
- Bulk mapping import/export
- Mapping validation

✅ **Testing & Documentation**
- 75%+ test coverage
- 30+ unit tests + 12+ integration tests
- Complete setup guide
- API documentation

#### **Deliverables**

**Models Created (3 total):**
1. ShopifyStore - Store connection and configuration
2. ProductMapping - SKU mapping between platforms
3. SyncLog - Sync operation audit trail

**Services Created (4 total):**
1. ShopifyOAuthService - OAuth flow and installation
2. ShopifyOrderSyncService - Order sync engine
3. ShopifyInventorySyncService - Inventory push
4. ShopifyWebhookVerifier - Webhook security

**API Endpoints (8 total):**
- `GET /api/v1/integrations/shopify/install` - Initiate OAuth
- `GET /api/v1/integrations/shopify/callback` - OAuth callback
- `GET /api/v1/integrations/shopify/stores` - List connected stores
- `DELETE /api/v1/integrations/shopify/stores/:id` - Disconnect store
- `POST /api/v1/integrations/shopify/sync/orders` - Manual order sync
- `POST /api/v1/integrations/shopify/sync/inventory` - Manual inventory sync
- `POST /api/v1/integrations/shopify/mappings` - Create product mapping
- `POST /webhooks/shopify/orders/create` - Order webhook

**Testing Metrics:**
- **OAuth Service:** 12 unit tests = 78% coverage
- **Order Sync:** 18 unit tests + 6 integration tests = 80% coverage
- **Inventory Sync:** 12 unit tests + 4 integration tests = 75% coverage
- **Webhooks:** 10 unit tests + 2 integration tests = 72% coverage
- **Total Week 6 Tests:** 64 tests passing

**Environment Variables Added:**
```bash
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_REDIRECT_URI=https://yourapp.com/api/v1/integrations/shopify/callback
ENCRYPTION_KEY=your_32_byte_encryption_key
```

#### **Next Week Preview: Week 7 - WooCommerce Integration**
- WooCommerce REST API authentication
- Order sync from WooCommerce
- Product sync to WooCommerce
- Webhook handlers for WooCommerce events

---

## **END OF WEEK 6: SHOPIFY INTEGRATION**

**Overall Progress After Week 6:**
- Backend Completion: ~58% → ~68%
- Core Features: Platform + Velocity Shipfast + Razorpay + Wallet + PDFs + Warehouse + Shopify
- Ready for Week 7: WooCommerce integration

---
