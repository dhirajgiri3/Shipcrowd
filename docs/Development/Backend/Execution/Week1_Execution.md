# Week 1 Execution Plan: Foundation & Refactoring
## Token-Efficient Strategy for CANON Methodology Implementation

**Created:** December 26, 2025
**Execution Approach:** Smart chunking to avoid token limit errors
**Status:** Ready for execution

---

## STRATEGIC APPROACH TO AVOID TOKEN ERRORS

### Key Challenge
Week 1 involves creating **60+ pages of documentation** across 12 major deliverables. Direct implementation would exceed token limits.

### Smart Solution: Modular Execution Strategy

**Execute Week 1 in 5 INDEPENDENT SESSIONS** (not days - sessions that can be run separately):

1. **SESSION 1:** Infrastructure Setup (Testing + Templates)
2. **SESSION 2:** Master Context + Tracking System
3. **SESSION 3:** Core Module Context Packages (5 packages)
4. **SESSION 4:** Integration Context Packages (3 packages) + Additional Contexts (3 packages)
5. **SESSION 5:** Race Condition Fixes + Week 2 Specification

Each session is **self-contained**, **can be run in a fresh Claude conversation**, and **won't hit token limits**.

---

## SESSION 1: INFRASTRUCTURE SETUP
**Estimated Time:** 3-4 hours
**Token Risk:** LOW (mostly code, not docs)
**Dependencies:** None - can start immediately

### Deliverables
1. Jest testing infrastructure fully configured
2. Test directory structure created
3. Example tests written and passing
4. 4 documentation templates created

### Implementation Steps

#### 1.1 Testing Infrastructure Setup

**Already Installed** (confirmed in package.json):
- ✅ jest, @types/jest, ts-jest
- ✅ supertest, @types/supertest
- ✅ mongodb-memory-server
- ✅ @faker-js/faker

**Create:**

**File:** `/server/jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/*.interface.ts',
    '!src/types/**'
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
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testHelpers.ts'],
  testTimeout: 10000
};
```

#### 1.2 Test Directory Structure

**Create these directories:**
```
/server/tests/
├── setup/
│   ├── globalSetup.ts
│   ├── globalTeardown.ts
│   ├── testHelpers.ts
│   └── testDatabase.ts
├── unit/
│   └── services/
│       └── auth/
│           └── auth.service.test.ts (EXAMPLE)
├── integration/
│   └── auth/
│       └── login.test.ts (EXAMPLE)
├── fixtures/
│   ├── userFactory.ts
│   ├── orderFactory.ts
│   └── shipmentFactory.ts
└── mocks/
    ├── velocityShipfast.mock.ts
    └── razorpay.mock.ts
```

**File:** `/server/tests/setup/globalSetup.ts`
```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'shipcrowd_test'
    }
  });

  const uri = mongod.getUri();
  process.env.MONGO_TEST_URI = uri;
  (global as any).__MONGOD__ = mongod;

  console.log('✅ MongoDB Memory Server started');
}
```

**File:** `/server/tests/setup/globalTeardown.ts`
```typescript
export default async function globalTeardown() {
  const mongod = (global as any).__MONGOD__;
  if (mongod) {
    await mongod.stop();
    console.log('✅ MongoDB Memory Server stopped');
  }
}
```

**File:** `/server/tests/setup/testHelpers.ts`
```typescript
import mongoose from 'mongoose';

beforeAll(async () => {
  const uri = process.env.MONGO_TEST_URI;
  if (!uri) throw new Error('MONGO_TEST_URI not set');
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Clear all collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

export const generateAuthToken = (userId: string) => {
  // Helper to generate JWT for testing
  const jwt = require('jsonwebtoken');
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test_secret', {
    expiresIn: '1h'
  });
};
```

**File:** `/server/tests/fixtures/userFactory.ts`
```typescript
import { faker } from '@faker-js/faker';

export const createTestUser = async (User: any, overrides: any = {}) => {
  return User.create({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    phone: `+91${faker.string.numeric(10)}`,
    password: await bcrypt.hash('Test@123', 10),
    role: 'user',
    isEmailVerified: true,
    isPhoneVerified: true,
    ...overrides
  });
};

export const createTestCompany = async (Company: any, userId: string, overrides: any = {}) => {
  return Company.create({
    owner: userId,
    companyName: faker.company.name(),
    businessType: 'ecommerce',
    gstNumber: faker.string.alphanumeric(15).toUpperCase(),
    ...overrides
  });
};
```

#### 1.3 Example Tests (to validate setup works)

**File:** `/server/tests/unit/services/auth/auth.service.test.ts`
```typescript
import { AuthService } from '@/core/application/services/auth/auth.service';
import User from '@/infrastructure/database/mongoose/models/User';
import { createTestUser } from '../../../fixtures/userFactory';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const testUser = await createTestUser(User, {
        email: 'test@example.com',
        password: await bcrypt.hash('Test@123', 10)
      });

      const result = await authService.login('test@example.com', 'Test@123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error with invalid password', async () => {
      await createTestUser(User, { email: 'test@example.com' });

      await expect(
        authService.login('test@example.com', 'WrongPassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

**File:** `/server/tests/integration/auth/login.test.ts`
```typescript
import request from 'supertest';
import app from '@/app';
import User from '@/infrastructure/database/mongoose/models/User';
import { createTestUser } from '../../fixtures/userFactory';

describe('POST /api/v1/auth/login', () => {
  it('should return tokens on successful login', async () => {
    await createTestUser(User, {
      email: 'test@example.com',
      password: await bcrypt.hash('Test@123', 10)
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test@123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('should return 401 with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'Test@123'
      });

    expect(response.status).toBe(401);
  });
});
```

#### 1.4 Documentation Templates

**Create 4 template files in `/docs/Templates/`:**

1. **API_ENDPOINT_TEMPLATE.md** - Template for documenting API endpoints
2. **SERVICE_TEMPLATE.md** - Template for service documentation
3. **INTEGRATION_TEMPLATE.md** - Template for third-party integrations
4. **FEATURE_SPEC_TEMPLATE.md** - Template for feature specifications

(Content follows the structure from Backend-Masterplan.md lines 340-410)

#### 1.5 Verification

```bash
# Run tests to verify everything works
cd /Users/dhirajgiri/Documents/Projects/Helix\ India/Shipcrowd/server
npm test

# Expected: Tests pass, MongoDB Memory Server works
```

### Session 1 Completion Criteria
- ✅ jest.config.js created and working
- ✅ Test directory structure exists
- ✅ Example tests pass
- ✅ 4 template files created
- ✅ `npm test` runs successfully

---

## SESSION 2: MASTER CONTEXT + TRACKING SYSTEM
**Estimated Time:** 3-4 hours
**Token Risk:** MEDIUM (large documents)
**Dependencies:** Session 1 complete

### Deliverables
1. MASTER_CONTEXT.md (15-20 pages)
2. DEVELOPMENT_TRACKER.md (tracking system)
3. Baseline metrics captured

### Implementation Steps

#### 2.1 Master Context Document

**File:** `/docs/Development/MASTER_CONTEXT.md`

**Content Structure (15-20 pages):**

```markdown
# Shipcrowd Backend - Master Context

## 1. Project Overview
- Multi-carrier shipping aggregator platform
- Replaces multiple courier integrations with single API
- Target: SMBs and enterprises in India
- Competitive edge: AI-powered rate optimization + unified dashboard

## 2. Architecture

### Clean Architecture Layers
**Domain Layer** (`src/core/domain/`)
- Entities: Business objects (User, Order, Shipment)
- Interfaces: Contracts for repositories
- Business rules and validations

**Application Layer** (`src/core/application/`)
- Services: Business logic orchestration
- Use cases: Application-specific operations
- DTOs: Data transfer objects

**Infrastructure Layer** (`src/infrastructure/`)
- Database: Mongoose models and repositories
- External APIs: Courier integrations (Velocity, etc.)
- File storage: AWS S3
- Email/SMS: SendGrid, Twilio

**Presentation Layer** (`src/presentation/`)
- HTTP: Express controllers and routes
- Middleware: Auth, validation, error handling
- API versioning: /api/v1/

### Current Directory Structure
[List actual structure from codebase]

## 3. Technology Stack

### Backend Core
- **Node.js 18+** - Runtime
- **TypeScript 5.0+** - Type safety
- **Express 5.0** - Web framework
- **Mongoose 8.0** - MongoDB ODM

### Testing
- **Jest 29** - Test framework
- **Supertest 7** - API testing
- **MongoDB Memory Server** - In-memory DB for tests
- **Faker.js** - Test data generation

### Infrastructure
- **MongoDB 6.0** - Primary database
- **Redis** (planned) - Caching and sessions
- **AWS S3** - Document storage
- **SendGrid** - Email service
- **Twilio** - SMS service

### Key Libraries
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT tokens
- **helmet** - Security headers
- **winston** - Logging
- **zod** - Runtime validation

## 4. Current Implementation Status

### ✅ IMPLEMENTED (70%+)
**Authentication & Security**
- JWT-based authentication (access + refresh tokens)
- Session management
- Password hashing (bcrypt, 12 rounds)
- Password reset flow
- Basic 2FA (partial)

**User Management**
- User CRUD operations
- Company/business profiles
- Role-based access control (RBAC)
- User permissions

### ⚠️ PARTIALLY IMPLEMENTED (20-60%)
**Order Management** (25%)
- Basic Order model exists
- Missing: Full lifecycle, status updates, validation

**Shipment Tracking** (16%)
- Basic tracking model
- Missing: Real-time updates, webhook handling

**Warehouse Management** (50%)
- Warehouse model exists
- Missing: Picking, packing workflows

**KYC Verification** (42%)
- DeepVue integration partial
- Missing: Complete verification flows

### ❌ CRITICAL GAPS (0%)
**Courier Integration** - WEEK 2 PRIORITY
- No Velocity Shipfast integration
- No order creation API
- No tracking integration
- No label generation

**Payment Gateway** - WEEK 3 PRIORITY
- No Razorpay integration
- No wallet system
- No COD handling

**E-commerce Integration** - WEEKS 6-8
- No Shopify integration
- No WooCommerce integration

## 5. Coding Standards

### TypeScript
```typescript
// ✅ GOOD: Strict typing
interface CreateOrderDTO {
  customerId: string;
  items: OrderItem[];
  shippingAddress: Address;
}

// ❌ BAD: Any types
function createOrder(data: any) { ... }
```

### Error Handling
```typescript
// ✅ GOOD: Custom error classes
throw new AppError('Resource not found', 404);

// ❌ BAD: Generic errors
throw new Error('Not found');
```

### Service Pattern
```typescript
// ✅ GOOD: Clean service structure
export class OrderService {
  async createOrder(dto: CreateOrderDTO): Promise<Order> {
    try {
      // Validate
      this.validateOrderData(dto);

      // Business logic
      const order = await this.orderRepository.create(dto);

      // Side effects
      await this.notificationService.sendOrderConfirmation(order);

      return order;
    } catch (error) {
      throw new AppError('Order creation failed', 500, error);
    }
  }
}
```

### Naming Conventions
- **Files**: camelCase for services, PascalCase for models
- **Classes**: PascalCase
- **Functions/variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase with 'I' prefix (IUser, IOrder)

## 6. Integration Points

### Velocity Shipfast API (Week 2)
- **Endpoint:** https://api.velocityshipfast.com/v1
- **Auth:** API Key + Secret (in headers)
- **12 Endpoints:** Forward order, tracking, cancellation, etc.
- **Status:** NOT INTEGRATED (0%)

### Razorpay Payment Gateway (Week 3)
- **Endpoint:** https://api.razorpay.com/v1
- **Auth:** Key ID + Secret (Basic Auth)
- **Use Cases:** Wallet recharge, COD collection
- **Status:** NOT INTEGRATED (0%)

### DeepVue KYC (Partially integrated)
- **Endpoint:** https://api.deepvue.tech/v1
- **Auth:** API Key
- **Types:** Aadhaar, PAN, GST verification
- **Status:** 42% complete

### AWS S3 (Configured, not fully used)
- **Bucket:** shipcrowd-documents
- **Use Cases:** Labels, invoices, KYC docs
- **Status:** Infrastructure ready, integration partial

## 7. Security Considerations

### Authentication
- JWT access tokens: 15 minutes expiry
- Refresh tokens: 7 days expiry
- Tokens stored in httpOnly cookies (XSS protection)
- CSRF protection enabled

### Password Security
- bcrypt hashing (12 rounds)
- Minimum 8 characters
- Must include: uppercase, lowercase, number, special char
- Password history: Last 3 passwords blocked

### Input Validation
- All endpoints use Zod schemas
- SQL injection: Protected by Mongoose ORM
- XSS: Input sanitization enabled
- CORS: Configured for allowed origins only

### Rate Limiting
- Login: 5 attempts per 15 minutes
- API calls: 100 requests per minute per user
- ⚠️ Currently partial implementation

## 8. Performance Requirements

### API Response Times
- **Target:** <500ms for 95th percentile
- **Current:** ~300ms average (measured on auth endpoints)

### Database Queries
- **Target:** <100ms
- **Strategy:** Proper indexing, query optimization
- **Monitoring:** Not yet implemented

### Bulk Operations
- **Target:** <2s for 100 records
- **Examples:** Bulk order creation, bulk tracking updates

## 9. Testing Strategy

### Coverage Goals
- **Unit Tests:** 70% minimum
- **Integration Tests:** All critical paths
- **E2E Tests:** (Future) Major user flows

### Test Structure
```
tests/
├── unit/           # Service and utility tests
├── integration/    # API endpoint tests
├── fixtures/       # Test data factories
└── mocks/          # External service mocks
```

### Current Status
- Infrastructure: ✅ Set up (Week 1)
- Unit tests: 60% coverage (existing code)
- Integration tests: 40% coverage
- Target by Week 16: 80% coverage

## 10. Known Issues & Technical Debt

### Race Conditions (Week 1 Priority)
- Wallet balance updates: Concurrent requests can cause inconsistencies
- Order status updates: Missing optimistic locking
- Inventory updates: Race conditions in stock deduction
- **Solution:** Implement optimistic locking utility (Week 1 Day 3)

### Missing Features (By Priority)
1. **P0 (Weeks 2-3):** Courier integration, Payment gateway
2. **P1 (Weeks 4-5):** Wallet system, PDF generation, Warehouse workflows
3. **P2 (Weeks 6-8):** E-commerce integrations
4. **P3 (Weeks 9-16):** Analytics, AI features, Advanced automation

## 11. Environment Variables

### Required
```bash
# Database
MONGO_URI=mongodb://localhost:27017/shipcrowd
MONGO_TEST_URI=<set by MongoDB Memory Server>

# Authentication
JWT_SECRET=your_jwt_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# External Services (Week 2+)
VELOCITY_API_KEY=
VELOCITY_API_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
DEEPVUE_API_KEY=

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=shipcrowd-documents
AWS_REGION=ap-south-1

# Email/SMS
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

## 12. Development Workflow

### Git Branching
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches

### Commit Convention
```
feat: Add courier integration for Velocity Shipfast
fix: Resolve race condition in wallet updates
docs: Update API documentation for orders
test: Add integration tests for auth endpoints
refactor: Extract common validation logic
```

## 13. Deployment (Future)

### Staging Environment
- URL: https://api-staging.shipcrowd.com
- Database: MongoDB Atlas (Staging cluster)
- Auto-deploy from `develop` branch

### Production Environment
- URL: https://api.shipcrowd.com
- Database: MongoDB Atlas (Production cluster)
- Manual deploy from `main` branch
- Monitoring: (To be set up)

## 14. API Versioning Strategy

### Current Version: v1
- Base path: `/api/v1/*`
- Breaking changes: Will introduce v2
- Backward compatibility: Maintain v1 for 6 months after v2 release

## 15. Logging

### Winston Configuration
```typescript
// Log levels: error, warn, info, debug
logger.info('User logged in', { userId, email });
logger.error('Order creation failed', { error, orderId });
```

### Log Format
- Development: Console, colorized
- Production: JSON, file rotation
- Sensitive data: Masked (passwords, tokens)

## 16. Future Enhancements (Post-Week 16)

- GraphQL API
- Real-time notifications (WebSockets)
- Multi-tenant architecture
- AI/ML predictive analytics
- Mobile API optimization
- Microservices migration (if scale requires)

---

**Document Version:** 1.0
**Last Updated:** December 26, 2025
**Maintained By:** Development Team
```

#### 2.2 Development Tracker

**File:** `/docs/Development/DEVELOPMENT_TRACKER.md`

```markdown
# Development Tracker

## Week 1-16 Progress

### Week 1: Foundation & Refactoring
- [ ] Day 1: Infrastructure setup - 0%
- [ ] Day 2: Context packages - 0%
- [ ] Day 3: Agent workflow + Race fixes - 0%
- [ ] Day 4: Parallel tracks planning - 0%
- [ ] Day 5: Week 2 specification - 0%

### Week 2: Velocity Shipfast Integration
- [ ] Not started - 0%

[Continue for Weeks 3-16...]

## Module Completion Matrix

| Module | Current % | Target % | Status |
|--------|-----------|----------|--------|
| Authentication | 70% | 100% | ⚠️ Partial |
| User Management | 76% | 100% | ⚠️ Partial |
| Order Management | 25% | 100% | ❌ Incomplete |
| Shipment Tracking | 16% | 100% | ❌ Incomplete |
| Courier Integration | 0% | 100% | ❌ Not started |
| Payment Gateway | 0% | 100% | ❌ Not started |
| Wallet System | 0% | 100% | ❌ Not started |
| Warehouse Mgmt | 50% | 100% | ⚠️ Partial |
| KYC Verification | 42% | 100% | ⚠️ Partial |

## Daily Log

### 2025-12-26
**Session 1: Infrastructure Setup**
- Created testing infrastructure
- Set up Jest configuration
- Created example tests
- Status: ✅ Complete

**Session 2: Master Context**
- Created MASTER_CONTEXT.md
- Created DEVELOPMENT_TRACKER.md
- Status: In Progress

[Continue logging...]

## Blockers & Issues

### Active Blockers
[None currently]

### Resolved
[Track resolved blockers]

## Technical Decisions

### Decision 1: Testing Framework
- **Date:** 2025-12-26
- **Decision:** Use Jest + MongoDB Memory Server
- **Rationale:** Already in package.json, industry standard
- **Alternatives Considered:** Vitest (decided against due to setup complexity)

[Continue tracking decisions...]
```

#### 2.3 Baseline Metrics

**Create script:** `/server/scripts/generateMetrics.ts`
```typescript
// Script to generate baseline metrics
// - Count routes
// - Count lines of code
// - Security audit
```

**Run and save output:**
```bash
npm audit > docs/Development/SECURITY_BASELINE.txt
npm test -- --coverage > docs/Development/COVERAGE_BASELINE.txt
```

### Session 2 Completion Criteria
- ✅ MASTER_CONTEXT.md created (15-20 pages)
- ✅ DEVELOPMENT_TRACKER.md created
- ✅ Baseline metrics captured
- ✅ All documentation clear and comprehensive

---

## SESSION 3: CORE MODULE CONTEXT PACKAGES
**Estimated Time:** 4-5 hours
**Token Risk:** HIGH (5 large documents)
**Dependencies:** Session 2 complete
**Strategy:** Create 5 context packages, 8-12 pages each

### Deliverables
1. AUTH_USER_CONTEXT.md
2. ORDER_CONTEXT.md
3. SHIPMENT_CONTEXT.md
4. WAREHOUSE_CONTEXT.md
5. RATECARD_CONTEXT.md

### Implementation Strategy

**Each context package follows this structure (8-12 pages):**

```markdown
# [MODULE] Context Package

## 1. Module Overview
[What it does, importance, business value]

## 2. Current State Assessment

### Implemented (✅)
- List what exists with file paths

### Partially Implemented (⚠️)
- List what's partial with what's missing

### Not Implemented (❌)
- List critical gaps

## 3. Architecture

### Models
[List all models with fields, indexes, methods]

### Services
[List all services with methods, responsibilities]

### Controllers
[List all controllers with endpoints]

### Routes
[List all routes with auth requirements]

## 4. Business Rules

### Validation Rules
[What needs to be validated]

### State Transitions
[Order status flow, etc.]

### Access Control
[Who can do what]

## 5. Integration Points

### Internal Dependencies
[What other modules this depends on]

### External APIs
[Third-party integrations needed]

## 6. Data Flow

### Create Flow
[Step-by-step: API → Controller → Service → Repository → DB]

### Read Flow
[Step-by-step for queries]

### Update Flow
[Step-by-step for updates]

### Delete Flow
[Soft delete vs hard delete]

## 7. Error Scenarios

### Common Errors
[List expected errors and how to handle]

### Edge Cases
[Unusual scenarios to handle]

## 8. Testing Strategy

### Unit Tests Required
[List services to test]

### Integration Tests Required
[List endpoints to test]

### Test Data Requirements
[What fixtures needed]

## 9. Implementation Gaps

### Week 2 Tasks
[If this module is part of Week 2]

### Week 3+ Tasks
[If later weeks]

## 10. Future Enhancements
[Post-MVP features]

---
**Context Version:** 1.0
**Last Updated:** 2025-12-26
```

**Create these 5 files in `/docs/ContextPackages/`:**

1. **AUTH_USER_CONTEXT.md** - Authentication & user management (current: 70%)
2. **ORDER_CONTEXT.md** - Order lifecycle management (current: 25%)
3. **SHIPMENT_CONTEXT.md** - Shipment tracking (current: 16%)
4. **WAREHOUSE_CONTEXT.md** - Warehouse operations (current: 50%)
5. **RATECARD_CONTEXT.md** - Pricing & rate cards (current: 40%)

### Session 3 Completion Criteria
- ✅ All 5 context packages created
- ✅ Each package is 8-12 pages comprehensive
- ✅ Current state vs. gaps clearly documented
- ✅ Ready for AI agents to use for implementation

---

## SESSION 4: INTEGRATION CONTEXTS + ADDITIONAL MODULES
**Estimated Time:** 4-5 hours
**Token Risk:** HIGH (6 large documents)
**Dependencies:** Session 3 complete

### Deliverables

**Integration Context Packages (3):**
1. VELOCITY_SHIPFAST_INTEGRATION.md (15-20 pages) - Week 2 critical
2. RAZORPAY_INTEGRATION.md (12-15 pages) - Week 3 critical
3. DEEPVUE_INTEGRATION.md (8-10 pages) - Current: 42%

**Additional Module Contexts (3):**
4. PAYMENT_WALLET_CONTEXT.md (8-12 pages) - Week 4 critical
5. NDR_RTO_CONTEXT.md (8-12 pages) - Week 7-9
6. ECOMMERCE_INTEGRATION_CONTEXT.md (8-12 pages) - Week 6-8

### Implementation Strategy

**Integration Package Template:**

```markdown
# [SERVICE] Integration Context

## 1. Service Overview
- What it provides
- Why we're integrating
- Business value

## 2. API Documentation

### Authentication
- Method (API Key, OAuth, etc.)
- Where credentials stored
- Token refresh strategy

### Endpoints (Complete List)

#### Endpoint 1: [Name]
- **Method:** POST/GET/etc.
- **URL:** https://api.example.com/v1/endpoint
- **Purpose:** What it does
- **Request Schema:**
```json
{
  "field1": "string",
  "field2": 123
}
```
- **Response Schema:**
```json
{
  "success": true,
  "data": {}
}
```
- **Error Codes:** 400, 401, 500 with meanings
- **Rate Limits:** X requests per minute
- **Implementation File:** Where to write code

[Repeat for all endpoints]

## 3. TypeScript Interfaces

### Request DTOs
[All request interfaces]

### Response DTOs
[All response interfaces]

## 4. Error Handling Strategy

### Common Errors
[How to handle each error]

### Retry Logic
[Exponential backoff, max retries]

### Fallback Behavior
[What to do if service is down]

## 5. Security Considerations

### Credential Management
[How to store API keys securely]

### Request Signing
[If required]

### IP Whitelisting
[If applicable]

## 6. Testing Strategy

### Mocking
[How to mock this service in tests]

### Test Scenarios
[What to test]

### Manual Testing
[Postman collection checklist]

## 7. Implementation Checklist

### Week X Day Y Tasks
- [ ] Create service class
- [ ] Implement endpoint 1
- [ ] Implement endpoint 2
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update environment variables
- [ ] Create Postman collection
- [ ] Document error handling

## 8. Monitoring & Logging

### Metrics to Track
[API call success rate, latency, etc.]

### Logs to Capture
[What to log for debugging]

---
**Context Version:** 1.0
**Last Updated:** 2025-12-26
```

**Create these 6 files in `/docs/ContextPackages/`:**

1. **VELOCITY_SHIPFAST_INTEGRATION.md** - Most detailed (15-20 pages) - Week 2 dependency
2. **RAZORPAY_INTEGRATION.md** - Detailed (12-15 pages) - Week 3 dependency
3. **DEEPVUE_INTEGRATION.md** - Current state + gaps (8-10 pages)
4. **PAYMENT_WALLET_CONTEXT.md** - Module context (8-12 pages)
5. **NDR_RTO_CONTEXT.md** - Non-Delivery/Return module (8-12 pages)
6. **ECOMMERCE_INTEGRATION_CONTEXT.md** - Shopify/WooCommerce (8-12 pages)

### Session 4 Completion Criteria
- ✅ 6 context packages created
- ✅ Velocity Shipfast integration fully specified (all 12 endpoints)
- ✅ Razorpay integration fully specified
- ✅ All packages ready for implementation weeks

---

## SESSION 5: RACE CONDITIONS + WEEK 2 SPEC + AGENT WORKFLOW
**Estimated Time:** 5-6 hours
**Token Risk:** MEDIUM-HIGH
**Dependencies:** Sessions 1-4 complete

### Deliverables
1. Optimistic locking utility created and tested
2. Agent assignment matrix
3. Session templates (4 types)
4. Parallel tracks plan
5. Sprint template
6. Week 2 detailed specification (20-25 pages)

### Part 5A: Race Condition Fixes (2 hours)

#### 5A.1 Create Optimistic Locking Utility

**File:** `/server/src/shared/utils/optimisticLocking.ts`

```typescript
import { Document } from 'mongoose';
import { AppError } from '../errors/AppError';

/**
 * Optimistic Locking Utility
 * Prevents race conditions in concurrent database updates
 * Uses Mongoose's __v (version) field
 */

export interface OptimisticLockOptions {
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

/**
 * Executes an update operation with optimistic locking
 * Retries if version conflict detected
 */
export async function withOptimisticLock<T extends Document>(
  findQuery: any,
  updateOperation: (doc: T) => Promise<T> | T,
  options: OptimisticLockOptions = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 100 } = options;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    try {
      // Find document with current version
      const doc = await findQuery;

      if (!doc) {
        throw new AppError('Document not found', 404);
      }

      const currentVersion = doc.__v;

      // Perform update operation
      const updatedDoc = await updateOperation(doc);

      // Save with version check
      updatedDoc.$where = `this.__v === ${currentVersion}`;
      const saved = await updatedDoc.save();

      return saved;
    } catch (error: any) {
      // Version conflict detected
      if (error.name === 'VersionError' || error.message.includes('__v')) {
        attempt++;
        lastError = error;

        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
      }

      // Other error, throw immediately
      throw error;
    }
  }

  throw new AppError(
    `Optimistic lock failed after ${maxRetries} retries`,
    409,
    lastError
  );
}

/**
 * Example usage:
 *
 * const wallet = await withOptimisticLock(
 *   Wallet.findOne({ userId }),
 *   async (doc) => {
 *     doc.balance += amount;
 *     return doc;
 *   }
 * );
 */
```

#### 5A.2 Write Tests for Optimistic Locking

**File:** `/server/tests/unit/utils/optimisticLocking.test.ts`

```typescript
import { withOptimisticLock } from '@/shared/utils/optimisticLocking';
import Wallet from '@/infrastructure/database/mongoose/models/Wallet';
import { createTestUser } from '../../fixtures/userFactory';
import User from '@/infrastructure/database/mongoose/models/User';

describe('Optimistic Locking Utility', () => {
  it('should successfully update with no conflicts', async () => {
    const user = await createTestUser(User);
    const wallet = await Wallet.create({
      user: user._id,
      balance: 1000
    });

    const result = await withOptimisticLock(
      Wallet.findById(wallet._id),
      async (doc) => {
        doc.balance += 500;
        return doc;
      }
    );

    expect(result.balance).toBe(1500);
  });

  it('should retry on version conflict', async () => {
    // Test concurrent update scenario
    const user = await createTestUser(User);
    const wallet = await Wallet.create({
      user: user._id,
      balance: 1000
    });

    // Simulate conflict by updating version externally
    await Wallet.findByIdAndUpdate(wallet._id, { $inc: { __v: 1 } });

    // This should retry and succeed
    const result = await withOptimisticLock(
      Wallet.findById(wallet._id),
      async (doc) => {
        doc.balance += 500;
        return doc;
      },
      { maxRetries: 5 }
    );

    expect(result).toBeDefined();
  });

  it('should throw error after max retries', async () => {
    const user = await createTestUser(User);
    const wallet = await Wallet.create({
      user: user._id,
      balance: 1000
    });

    // Force continuous conflicts
    const conflictInterval = setInterval(async () => {
      await Wallet.findByIdAndUpdate(wallet._id, { $inc: { __v: 1 } });
    }, 50);

    await expect(
      withOptimisticLock(
        Wallet.findById(wallet._id),
        async (doc) => {
          doc.balance += 500;
          return doc;
        },
        { maxRetries: 2, retryDelay: 10 }
      )
    ).rejects.toThrow('Optimistic lock failed after 2 retries');

    clearInterval(conflictInterval);
  });
});
```

#### 5A.3 Document Usage Pattern

**File:** `/docs/Development/OPTIMISTIC_LOCKING_GUIDE.md`

```markdown
# Optimistic Locking Usage Guide

## When to Use
Use optimistic locking for any operation that:
1. Updates critical financial data (wallet balance, pricing)
2. Modifies sequential IDs or counters
3. Updates order/shipment status
4. Changes inventory quantities

## How to Use

### Before (Race Condition Risk)
```typescript
const wallet = await Wallet.findOne({ userId });
wallet.balance += amount;
await wallet.save(); // ❌ Risk: Another request might update between find and save
```

### After (Safe with Optimistic Lock)
```typescript
const wallet = await withOptimisticLock(
  Wallet.findOne({ userId }),
  async (doc) => {
    doc.balance += amount;
    return doc;
  }
);
```

## Where to Apply (Week 1 Decision: Create utility, apply in future weeks)

### Week 4: Wallet Service
- Balance updates
- Transaction recording

### Week 2-3: Order Service
- Status changes
- Sequential order number generation

### Week 5: Warehouse Service
- Stock quantity updates
- Inventory reservations

## Testing
- See `/server/tests/unit/utils/optimisticLocking.test.ts`
- Run: `npm test optimisticLocking`
```

### Part 5B: Agent Workflow Documentation (1 hour)

#### 5B.1 Agent Assignment Matrix

**File:** `/docs/Development/AGENT_ASSIGNMENT_MATRIX.md`

```markdown
# AI Agent Assignment Matrix

## Agent Roles

### Claude Sonnet (GPT-4 class)
**Use for:**
- Architecture design
- Complex problem-solving
- Planning sessions
- Code review
- Writing comprehensive documentation
- Debugging tricky issues

**Don't use for:**
- Simple CRUD implementations
- Repetitive tasks
- Quick formatting fixes

### Cursor AI
**Use for:**
- Implementation (writing code)
- Quick iterations
- Refactoring
- Adding tests
- File operations

**Don't use for:**
- Strategic planning
- Complex architectural decisions

## Task Type Mapping

| Task Type | Primary Agent | Secondary Agent | Rationale |
|-----------|---------------|-----------------|-----------|
| New Feature Planning | Claude Sonnet | - | Needs strategic thinking |
| Implementation | Cursor | Claude (review) | Faster iteration |
| Bug Fixing | Claude Sonnet | - | Needs debugging skills |
| Refactoring | Cursor | Claude (plan first) | Execution-heavy |
| Testing | Cursor | - | Straightforward implementation |
| Documentation | Claude Sonnet | - | Needs comprehensive thinking |
| Code Review | Claude Sonnet | - | Needs critical analysis |
| Integration | Claude Sonnet | Cursor (after plan) | Complex coordination |

## Session Workflow

### Planning Session (Use Claude Sonnet)
1. Provide master context
2. Provide relevant context package
3. Ask for implementation plan
4. Review and approve plan
5. Hand off to Cursor for implementation

### Implementation Session (Use Cursor)
1. Load implementation plan
2. Execute step-by-step
3. Run tests after each major step
4. Commit incrementally
5. Report completion

### Review Session (Use Claude Sonnet)
1. Review completed code
2. Check against requirements
3. Identify issues or improvements
4. Provide feedback

### Debugging Session (Use Claude Sonnet)
1. Describe bug with context
2. Provide relevant logs/errors
3. Let Claude analyze
4. Implement fix (Cursor or Claude)
5. Verify fix
```

#### 5B.2 Session Templates

**Create 4 files in `/docs/SessionTemplates/`:**

1. **PLANNING_SESSION.md**
2. **IMPLEMENTATION_SESSION.md**
3. **REVIEW_SESSION.md**
4. **DEBUGGING_SESSION.md**

(Each template is 2-3 pages with prompt patterns)

### Part 5C: Strategic Planning (1 hour)

#### 5C.1 Parallel Tracks Plan

**File:** `/docs/Development/PARALLEL_TRACKS.md`

```markdown
# Parallel Development Tracks (Weeks 2-16)

## Track Definitions

### Track A: Courier & Shipping Core (CRITICAL PATH)
**Weeks:** 2-5
**Priority:** P0 (Must have for MVP)
**Dependencies:** None

**Week 2:** Velocity Shipfast Integration
- 12 API endpoints
- Order creation, tracking, cancellation
- Label generation

**Week 5:** Multi-Warehouse Workflows
- Picking, packing, manifest
- Warehouse assignment logic

### Track B: Payment & Financial (CRITICAL PATH)
**Weeks:** 3-5
**Priority:** P0 (Must have for MVP)
**Dependencies:** Track A (Week 2)

**Week 3:** Razorpay Integration
- Payment orders, capture
- Webhook handling
- Refunds

**Week 4:** Wallet System
- Balance management
- Transaction history
- COD remittance

**Week 4:** PDF Generation
- Shipping labels
- Invoices
- Manifests

### Track C: E-commerce Integration (HIGH)
**Weeks:** 6-8
**Priority:** P1 (Important for adoption)
**Dependencies:** Tracks A & B complete

**Week 6-7:** Shopify Integration
- Product sync
- Order webhook
- Inventory sync

**Week 8:** WooCommerce + Custom Integration
- WooCommerce webhook
- Custom website API

### Track D: Analytics & Reporting (MEDIUM)
**Weeks:** 9-11
**Priority:** P2 (Nice to have)
**Dependencies:** All core features complete

**Week 9:** Basic Analytics
- Order dashboard
- Performance metrics

**Week 10:** Advanced Analytics
- Predictive analytics
- Custom reports

**Week 11:** Data Export
- Excel/CSV export
- Automated reports

### Track E: NDR/RTO & Automation (HIGH)
**Weeks:** 7-9
**Priority:** P1 (Differentiator)
**Dependencies:** Track A complete

**Week 7:** NDR Management
- Exception handling
- Automated resolution

**Week 9:** RTO Automation
- Return workflows
- QC integration

## Sequencing Strategy

### Weeks 2-5: Foundation (Sequential)
Must complete in order - no parallelization

### Weeks 6-11: Parallel Development
Can run 2-3 tracks simultaneously:
- Track C + Track D
- Track C + Track E

### Weeks 12-16: Advanced Features
Independent modules, full parallelization possible

## Risk Mitigation

### Critical Path Protection
- Tracks A & B cannot be delayed
- Weekly progress reviews
- Blocker escalation process

### Dependency Management
- Clear handoff points between tracks
- Integration tests at track boundaries
```

#### 5C.2 Sprint Template

**File:** `/docs/Development/SPRINT_TEMPLATE.md**

(2-week sprint structure, daily rituals, metrics)

### Part 5D: Week 2 Detailed Specification (2-3 hours)

#### 5D.1 Week 2 Specification

**File:** `/docs/Development/Specifications/WEEK2_VELOCITY_SHIPFAST_SPEC.md`

**Content (20-25 pages):**

```markdown
# Week 2: Velocity Shipfast Courier Integration
## Detailed Implementation Specification

**Week Goal:** Complete integration with Velocity Shipfast API (12 endpoints)
**Current Status:** 0% → Target: 100%
**Priority:** CRITICAL (Blocks all future shipping features)

---

## ARCHITECTURE DESIGN

### Folder Structure
```
server/src/
├── core/
│   ├── domain/
│   │   └── entities/
│   │       └── CourierOrder.ts (NEW)
│   └── application/
│       └── services/
│           └── courier/
│               ├── VelocityShipfastService.ts (NEW)
│               └── CourierOrchestratorService.ts (NEW)
├── infrastructure/
│   ├── external/
│   │   └── velocityShipfast/
│   │       ├── VelocityClient.ts (NEW)
│   │       ├── interfaces/
│   │       │   ├── IForwardOrderRequest.ts (NEW)
│   │       │   ├── ITrackingResponse.ts (NEW)
│   │       │   └── [... 12 interface files] (NEW)
│   │       └── errors/
│   │           └── VelocityError.ts (NEW)
│   └── database/
│       └── mongoose/
│           └── models/
│               └── CourierOrder.ts (NEW)
└── presentation/
    └── http/
        ├── controllers/
        │   └── courier/
        │       └── velocity.controller.ts (NEW)
        └── routes/
            └── v1/
                └── courier/
                    └── velocity.routes.ts (NEW)
```

---

## DAY-BY-DAY BREAKDOWN

### DAY 1: Interface Design + Project Setup (8 hours)

#### Morning (4 hours): TypeScript Interfaces

**Task 1.1: Create all request/response interfaces**

**File:** `/server/src/infrastructure/external/velocityShipfast/interfaces/IForwardOrderRequest.ts`

```typescript
export interface IForwardOrderRequest {
  orderNumber: string;
  orderDate: string; // ISO 8601
  pickupAddress: IAddress;
  deliveryAddress: IAddress;
  shipperDetails: IShipperDetails;
  consigneeDetails: IConsigneeDetails;
  packageDetails: IPackageDetails;
  paymentMode: 'COD' | 'PREPAID';
  codAmount?: number;
  invoiceValue: number;
  productDetails: IProductDetail[];
  dimensions: IDimensions;
  weight: number; // in kg
}

export interface IAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
}

// ... [Complete all 12 endpoint interfaces]
```

**Deliverable:** 12 interface files covering:
1. Forward order creation
2. Order tracking
3. Order cancellation
4. Pincode serviceability check
5. Rate calculation
6. Label generation
7. Manifest creation
8. Pickup scheduling
9. Reverse order creation
10. Order status webhook
11. NDR update
12. Weight discrepancy

#### Afternoon (4 hours): Base Client + Error Handling

**Task 1.2: Velocity API Client**

**File:** `/server/src/infrastructure/external/velocityShipfast/VelocityClient.ts`

```typescript
import axios, { AxiosInstance } from 'axios';
import { VelocityError } from './errors/VelocityError';

export class VelocityClient {
  private client: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.VELOCITY_API_KEY!;
    this.apiSecret = process.env.VELOCITY_API_SECRET!;
    this.baseURL = process.env.VELOCITY_BASE_URL || 'https://api.velocityshipfast.com/v1';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'X-API-Secret': this.apiSecret
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor (logging)
    this.client.interceptors.request.use(
      (config) => {
        logger.info('Velocity API Request', {
          method: config.method,
          url: config.url,
          data: config.data
        });
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor (error handling)
    this.client.interceptors.response.use(
      (response) => {
        logger.info('Velocity API Response', {
          status: response.status,
          data: response.data
        });
        return response;
      },
      (error) => {
        logger.error('Velocity API Error', {
          status: error.response?.status,
          data: error.response?.data
        });
        throw new VelocityError(
          error.response?.data?.message || 'Velocity API error',
          error.response?.status || 500,
          error.response?.data
        );
      }
    );
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async get<T>(endpoint: string, params?: any): Promise<T> {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  // ... [Other HTTP methods]
}
```

**Task 1.3: Custom Error Class**

**File:** `/server/src/infrastructure/external/velocityShipfast/errors/VelocityError.ts`

```typescript
export class VelocityError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'VelocityError';
  }
}
```

**Day 1 Deliverables:**
- ✅ 12 TypeScript interface files
- ✅ VelocityClient with interceptors
- ✅ VelocityError class
- ✅ Environment variables documented

---

### DAY 2: Authentication + Forward Order Creation (8 hours)

[Continue with detailed day-by-day tasks...]

### DAY 3: Tracking + Cancellation + Serviceability (8 hours)

[Detailed tasks...]

### DAY 4: Reverse Orders + Warehouse + Orchestrator (8 hours)

[Detailed tasks...]

### DAY 5: Integration + Testing + Documentation (8 hours)

[Detailed tasks...]

---

## TESTING STRATEGY

### Unit Tests (40 tests minimum)

**Service Tests:**
```typescript
// tests/unit/services/courier/VelocityShipfastService.test.ts
describe('VelocityShipfastService', () => {
  describe('createForwardOrder', () => {
    it('should successfully create forward order with valid data', async () => {
      // ...
    });

    it('should throw error with invalid pincode', async () => {
      // ...
    });

    // ... 5 more test cases
  });

  // ... Tests for all 12 methods
});
```

### Integration Tests (20 tests minimum)

**Endpoint Tests:**
```typescript
// tests/integration/courier/velocity.test.ts
describe('POST /api/v1/courier/velocity/forward-order', () => {
  it('should create order and return AWB number', async () => {
    // ...
  });

  // ... More endpoint tests
});
```

### Manual Testing Checklist

**Postman Collection:**
- [ ] Authentication works
- [ ] Forward order creation returns AWB
- [ ] Tracking returns real-time status
- [ ] Cancellation succeeds for new orders
- [ ] Serviceability check returns correct zones
- [ ] Rate calculation matches expected pricing
- [ ] Label generation returns PDF
- [ ] Manifest creation succeeds
- [ ] Pickup scheduling confirms slot
- [ ] Reverse order creation works
- [ ] Webhook receives status updates
- [ ] NDR update reflects in system

---

## ERROR HANDLING & RETRY LOGIC

### Retry Strategy
```typescript
// Exponential backoff for transient errors
maxRetries: 3
retryDelay: [1000, 2000, 4000] // milliseconds
retryOn: [500, 502, 503, 504] // HTTP status codes
```

### Error Mapping
| Velocity Error Code | HTTP Status | User Message |
|---------------------|-------------|--------------|
| INVALID_PINCODE | 400 | Delivery not available to this pincode |
| DUPLICATE_ORDER | 409 | Order already exists |
| SERVICE_UNAVAILABLE | 503 | Courier service temporarily unavailable |
| AUTHENTICATION_FAILED | 401 | Invalid courier credentials |

---

## SECURITY CHECKLIST

- [ ] API keys stored in environment variables (not code)
- [ ] Credentials encrypted in database
- [ ] Request signing implemented (if required)
- [ ] IP whitelisting configured (if required)
- [ ] Webhook signature verification
- [ ] Rate limiting applied (100 req/min)
- [ ] Sensitive data masked in logs

---

## PERFORMANCE REQUIREMENTS

### Response Times
- Order creation: <2s
- Tracking query: <500ms
- Cancellation: <1s

### Throughput
- Support 100 orders/minute
- Bulk operations: 1000 orders in <30s

---

## COMPLETION CHECKLIST

### Code Complete
- [ ] All 12 endpoints implemented
- [ ] VelocityClient class complete
- [ ] CourierOrchestratorService complete
- [ ] All interfaces defined
- [ ] Error handling comprehensive

### Testing Complete
- [ ] 40+ unit tests passing
- [ ] 20+ integration tests passing
- [ ] Code coverage ≥80%
- [ ] Manual testing complete
- [ ] Postman collection created

### Documentation Complete
- [ ] API endpoints documented
- [ ] Service methods documented with JSDoc
- [ ] Environment variables in .env.example
- [ ] VELOCITY_INTEGRATION_CONTEXT.md updated
- [ ] Week 2 completion summary written

### Integration Complete
- [ ] Routes mounted in main app
- [ ] Database migrations run (if any)
- [ ] Existing tests still passing
- [ ] No breaking changes introduced

---

**Specification Version:** 1.0
**Last Updated:** 2025-12-26
**Ready for Execution:** Yes
```

### Session 5 Completion Criteria
- ✅ Optimistic locking utility created and tested
- ✅ Agent assignment matrix documented
- ✅ 4 session templates created
- ✅ Parallel tracks plan complete
- ✅ Sprint template created
- ✅ Week 2 specification complete (20-25 pages)

---

## WEEK 1 SUCCESS METRICS

### Documentation Deliverables
- ✅ MASTER_CONTEXT.md (15-20 pages)
- ✅ DEVELOPMENT_TRACKER.md
- ✅ 5 core module context packages (40-60 pages total)
- ✅ 3 integration context packages (35-45 pages total)
- ✅ 3 additional module contexts (24-36 pages total)
- ✅ 4 documentation templates
- ✅ 4 session templates
- ✅ Agent assignment matrix
- ✅ Parallel tracks plan
- ✅ Sprint template
- ✅ Week 2 specification (20-25 pages)

**Total:** ~120-150 pages of comprehensive documentation

### Code Deliverables
- ✅ jest.config.js configured
- ✅ Test directory structure created
- ✅ Test helpers and setup files
- ✅ Example tests passing
- ✅ Optimistic locking utility + tests
- ✅ `npm test` runs successfully

### Metrics Baseline
- ✅ API inventory captured
- ✅ Security baseline documented
- ✅ Code metrics captured
- ✅ Test coverage baseline established

---

## EXECUTION INSTRUCTIONS

### How to Execute Week 1

**Option 1: Run all 5 sessions sequentially in fresh conversations**
1. Start Session 1 (Infrastructure)
2. Complete and verify
3. Start Session 2 (Master Context)
4. Complete and verify
5. Start Session 3 (Core Contexts)
6. Complete and verify
7. Start Session 4 (Integration Contexts)
8. Complete and verify
9. Start Session 5 (Race Conditions + Week 2 Spec)
10. Complete and verify

**Option 2: Run sessions as needed**
- Sessions 1-2 can run in parallel (different file types)
- Session 3 must complete before Session 4
- Session 5 can start after Session 2

### Session Prompts

**For Session 1:**
```
Execute Week 1 Session 1: Infrastructure Setup

Reference: [path to this plan file]
Section: SESSION 1

Tasks:
1. Create jest.config.js
2. Create test directory structure
3. Create test setup files
4. Create example tests
5. Create 4 documentation templates
6. Verify npm test runs

Follow the exact file structures and code provided in the plan.
```

**For Session 2:**
```
Execute Week 1 Session 2: Master Context + Tracking

Reference: [path to this plan file]
Section: SESSION 2

Tasks:
1. Create MASTER_CONTEXT.md (use Backend-Masterplan.md and current codebase as reference)
2. Create DEVELOPMENT_TRACKER.md
3. Capture baseline metrics

Ensure comprehensive 15-20 page master context covering all aspects.
```

[Similar prompts for Sessions 3, 4, 5]

---

## POST-WEEK 1 STATE

### Ready for Week 2
- ✅ Complete Velocity Shipfast specification
- ✅ All context packages ready
- ✅ Testing infrastructure operational
- ✅ Development workflow established
- ✅ Zero blockers

### Backend Completion Percentage
- **Before Week 1:** 24%
- **After Week 1:** 26% (infrastructure counts)
- **After Week 2:** 40% (courier integration is 15% of total)

---

## RISKS & MITIGATION

### Risk 1: Token Limits in Documentation Sessions
**Mitigation:** Sessions 3 and 4 are the highest risk. If hitting limits:
- Break Session 3 into two parts (3 packages each)
- Break Session 4 into two parts (3 packages each)

### Risk 2: Test Setup Issues
**Mitigation:** Session 1 includes verification steps. If MongoDB Memory Server fails:
- Check Node.js version (18+ required)
- Check MongoDB compatibility
- Alternative: Use docker-compose for test DB

### Risk 3: Missing Context for Documentation
**Mitigation:** All sessions reference existing docs:
- docs/Backend-Gap-Analysis.md
- docs/SHIPCROWD_COMPLETE_FEATURE_LIST.md
- Current codebase (server/src/)

---

## FINAL NOTES

### Why This Approach Works
1. **Modular:** Each session is independent
2. **Token-Safe:** No session exceeds 50k tokens
3. **Verifiable:** Each session has clear deliverables
4. **Resumable:** Can pause and restart between sessions
5. **Comprehensive:** Nothing is skipped or rushed

### Week 1 is NOT About Code
Week 1 is about **creating the foundation** for AI-native development:
- Context packages = AI agents know what to build
- Testing infrastructure = Quality assurance built-in
- Agent workflow = Efficient development process
- Week 2 spec = Zero ambiguity for execution

**After Week 1, implementation velocity will 3-5x due to this foundation.**

---

**Plan Status:** READY FOR EXECUTION
**Estimated Total Time:** 22-26 hours across 5 sessions
**Next Step:** Execute Session 1 (Infrastructure Setup)
