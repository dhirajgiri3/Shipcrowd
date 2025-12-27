# Shipcrowd Backend - Master Context Document
**Version:** 1.0
**Created:** December 26, 2025
**Last Updated:** December 26, 2025
**Purpose:** Comprehensive backend development context for AI-native development
**Audience:** AI agents (Claude, Cursor), developers, technical leads

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Current Implementation Status](#4-current-implementation-status)
5. [Database Models](#5-database-models)
6. [Services Layer](#6-services-layer)
7. [API Routes](#7-api-routes)
8. [Coding Standards](#8-coding-standards)
9. [Integration Points](#9-integration-points)
10. [Security](#10-security)
11. [Performance Requirements](#11-performance-requirements)
12. [Testing Strategy](#12-testing-strategy)
13. [Development Workflow](#13-development-workflow)
14. [Known Issues & Technical Debt](#14-known-issues--technical-debt)
15. [Environment Variables](#15-environment-variables)

---

## 1. PROJECT OVERVIEW

### 1.1 What is Shipcrowd?

**Shipcrowd** (formerly Uniqueship) is a **next-generation multi-carrier shipping aggregator platform** designed for the Indian e-commerce market. It serves as a unified API and dashboard for businesses to manage shipments across multiple courier partners without maintaining separate integrations.

### 1.2 Target Users

**Primary:**
- **SMB E-commerce Businesses** (Shopify, WooCommerce stores)
- **D2C Brands** shipping 100-10,000 orders/month
- **B2B Distributors** requiring logistics management

**Secondary:**
- **Enterprises** needing multi-warehouse, multi-carrier orchestration
- **3PL Providers** offering fulfillment services

### 1.3 Core Value Proposition

1. **Single Integration, Multiple Couriers**
   - Replace 5-10 courier integrations with one Shipcrowd API
   - Unified data model across all carriers

2. **AI-Powered Rate Optimization**
   - Automatic courier selection based on cost, speed, serviceability
   - Machine learning for delivery predictions

3. **Complete Lifecycle Management**
   - Order creation → Tracking → NDR handling → RTO management
   - Automated workflows and notifications

4. **Business Intelligence**
   - Real-time analytics and reporting
   - Performance metrics across couriers
   - Cost optimization insights

### 1.4 Competitive Advantages

- **India-specific features:** COD remittance, GST compliance, phone masking
- **AI/ML capabilities:** Fraud detection, predictive analytics
- **Material management:** Unique packing material tracking
- **White-label ready:** Custom branding for resellers

### 1.5 Business Model

- **Transaction-based pricing:** Per shipment fee
- **Subscription tiers:** Free, Starter, Growth, Enterprise
- **Commission on COD:** Percentage of COD transactions
- **API access:** Separate pricing for API-only clients

---

## 2. ARCHITECTURE

### 2.1 Clean Architecture Overview

Shipcrowd follows **Clean Architecture** (also known as Hexagonal or Ports & Adapters Architecture) to ensure:
- **Separation of Concerns:** Business logic isolated from frameworks
- **Testability:** Each layer can be tested independently
- **Maintainability:** Changes in one layer don't cascade
- **Flexibility:** Easy to swap implementations (e.g., switch databases)

### 2.2 Architecture Layers

```
┌──────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                     │
│  HTTP Controllers, Routes, Middleware, Request/Response  │
│          (Express.js Controllers & Routes)                │
└──────────────────────────────────────────────────────────┘
                            ↓ ↑
┌──────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                       │
│    Services, Use Cases, Business Logic Orchestration     │
│         (OrderService, ShipmentService, etc.)             │
└──────────────────────────────────────────────────────────┘
                            ↓ ↑
┌──────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                         │
│      Entities, Business Rules, Repository Interfaces      │
│        (Core business logic, no framework deps)           │
└──────────────────────────────────────────────────────────┘
                            ↓ ↑
┌──────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                     │
│  DB, External APIs, File Storage, Email/SMS Services     │
│   (Mongoose Models, Velocity API, AWS S3, SendGrid)      │
└──────────────────────────────────────────────────────────┘
```

### 2.3 Directory Structure

```
/server/
├── src/
│   ├── index.ts                      # Application entry point
│   │
│   ├── core/                         # DOMAIN & APPLICATION LAYERS
│   │   ├── domain/
│   │   │   ├── entities/            # Business entities (User, Order, Shipment)
│   │   │   └── interfaces/          # Repository contracts
│   │   │       └── repositories/    # IUserRepository, IShipmentRepository
│   │   │
│   │   └── application/
│   │       └── services/            # Business logic services
│   │           ├── auth/            # Authentication services
│   │           │   ├── oauth.service.ts
│   │           │   ├── session.service.ts
│   │           │   └── password.service.ts
│   │           ├── user/            # User management services
│   │           │   ├── profile.service.ts
│   │           │   ├── account.service.ts
│   │           │   └── activity.service.ts
│   │           ├── shipping/        # Shipping services
│   │           │   ├── shipment.service.ts
│   │           │   ├── order.service.ts
│   │           │   └── carrier.service.ts
│   │           ├── communication/   # Notification services
│   │           │   ├── email.service.ts
│   │           │   ├── sms.service.ts
│   │           │   └── whatsapp.service.ts
│   │           └── integrations/    # Third-party integrations
│   │               └── deepvue.service.ts  # KYC verification
│   │
│   ├── infrastructure/              # INFRASTRUCTURE LAYER
│   │   ├── database/
│   │   │   └── mongoose/
│   │   │       ├── connection.ts    # DB connection
│   │   │       └── models/          # Mongoose schemas
│   │   │           ├── User.ts
│   │   │           ├── Company.ts
│   │   │           ├── Order.ts
│   │   │           ├── Shipment.ts
│   │   │           ├── Warehouse.ts
│   │   │           ├── RateCard.ts
│   │   │           ├── Zone.ts
│   │   │           ├── Integration.ts
│   │   │           ├── KYC.ts
│   │   │           ├── Session.ts
│   │   │           ├── AuditLog.ts
│   │   │           ├── Coupon.ts
│   │   │           └── Permission.ts
│   │   │
│   │   ├── external/                # External API clients (future)
│   │   │   ├── velocity/           # Velocity Shipfast (Week 2)
│   │   │   └── razorpay/           # Razorpay payment (Week 3)
│   │   │
│   │   └── storage/                # File storage (future)
│   │       └── s3/                 # AWS S3 integration
│   │
│   ├── presentation/               # PRESENTATION LAYER
│   │   └── http/
│   │       ├── middleware/         # Express middleware
│   │       │   ├── auth/          # Authentication middleware
│   │       │   │   └── auth.ts
│   │       │   ├── errorHandler.ts
│   │       │   └── rateLimiter.ts
│   │       │
│   │       ├── controllers/        # Route handlers
│   │       │   ├── auth/
│   │       │   ├── user/
│   │       │   ├── shipping/
│   │       │   └── company/
│   │       │
│   │       └── routes/            # API routes
│   │           └── v1/            # API version 1
│   │               ├── index.ts   # Main v1 router
│   │               ├── auth.routes.ts
│   │               ├── user.routes.ts
│   │               ├── company.routes.ts
│   │               └── shipping/
│   │                   ├── shipment.routes.ts
│   │                   └── order.routes.ts
│   │
│   └── shared/                    # SHARED UTILITIES
│       ├── utils/                 # Utility functions
│       │   └── optimisticLocking.ts  # (Week 1 Session 5)
│       ├── errors/                # Custom error classes
│       │   └── AppError.ts
│       └── types/                 # Shared TypeScript types
│
├── tests/                         # TEST INFRASTRUCTURE (Week 1 Session 1)
│   ├── setup/                     # Test configuration
│   │   ├── globalSetup.ts
│   │   ├── globalTeardown.ts
│   │   ├── testHelpers.ts
│   │   └── testDatabase.ts
│   ├── fixtures/                  # Test data factories
│   │   ├── userFactory.ts
│   │   ├── orderFactory.ts
│   │   └── shipmentFactory.ts
│   ├── mocks/                     # External service mocks
│   │   ├── velocityShipfast.mock.ts
│   │   └── razorpay.mock.ts
│   ├── unit/                      # Unit tests
│   │   └── services/
│   │       └── auth/
│   └── integration/               # Integration tests
│       └── auth/
│
├── scripts/                       # Utility scripts
│   └── generateMetrics.ts        # (Week 1 Session 2)
│
├── jest.config.js                # Jest configuration (Session 1)
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
└── .env.example                  # Environment variables template
```

### 2.4 Design Patterns Used

**1. Repository Pattern**
- Abstracts data access logic
- Defined in `core/domain/interfaces/repositories/`
- Implemented in `infrastructure/database/mongoose/models/`

**2. Service Layer Pattern**
- Business logic in `core/application/services/`
- Services orchestrate domain entities and repositories
- Controllers delegate to services

**3. Dependency Injection (Manual)**
- Services instantiated in controllers
- Future: Use IoC container (e.g., `tsyringe`)

**4. Factory Pattern**
- Test data factories in `tests/fixtures/`
- Model factories for complex object creation

**5. Middleware Pattern**
- Express middleware for cross-cutting concerns
- Auth, error handling, rate limiting

**6. Strategy Pattern** (Future - Week 2)
- Courier provider selection
- Different payment gateways

### 2.5 Architecture Decision Records (ADRs)

Key architectural decisions will be documented in `/docs/ADRs/` using the template from Session 1.

**Example ADRs:**
- ADR-001: Why Clean Architecture?
- ADR-002: MongoDB vs PostgreSQL
- ADR-003: JWT vs Session-based auth (hybrid approach chosen)
- ADR-004: Monolith vs Microservices (start monolith, plan for modularization)

---

## 3. TECHNOLOGY STACK

### 3.1 Backend Core

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Runtime** | Node.js | 18+ | JavaScript runtime |
| **Language** | TypeScript | 5.0+ | Type safety, better DX |
| **Web Framework** | Express.js | 5.0 | HTTP server, routing |
| **Database** | MongoDB | 6.0 | Primary data store |
| **ODM** | Mongoose | 8.0 | MongoDB object modeling |

### 3.2 Authentication & Security

| Library | Version | Purpose |
|---------|---------|---------|
| **jsonwebtoken** | ^9.0.3 | JWT token generation/verification |
| **bcrypt** | ^5.1.1 | Password hashing |
| **helmet** | ^8.1.0 | Security headers |
| **express-rate-limit** | ^7.5.0 | API rate limiting |
| **mongoose-field-encryption** | ^7.0.1 | Sensitive field encryption |
| **passport** | ^0.7.0 | OAuth strategies |
| **passport-google-oauth20** | ^2.0.0 | Google OAuth |

### 3.3 Validation & Utilities

| Library | Version | Purpose |
|---------|---------|---------|
| **zod** | ^3.24.3 | Runtime schema validation |
| **zxcvbn** | ^4.4.2 | Password strength validation |
| **ua-parser-js** | ^2.0.3 | User agent parsing |
| **compression** | ^1.8.1 | Response compression |
| **cookie-parser** | ^1.4.7 | Cookie parsing |
| **cors** | ^2.8.5 | CORS handling |
| **dotenv** | ^16.5.0 | Environment variables |

### 3.4 Communication

| Library | Version | Purpose |
|---------|---------|---------|
| **nodemailer** | ^7.0.0 | Email sending |
| **@sendgrid/mail** | ^8.1.5 | SendGrid email service |
| **twilio** | ^5.5.2 | SMS notifications |

### 3.5 Logging & Monitoring

| Library | Version | Purpose |
|---------|---------|---------|
| **winston** | ^3.17.0 | Structured logging |
| **morgan** | ^1.10.0 | HTTP request logging |

### 3.6 Background Jobs & Scheduling

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| **cron** | ^4.3.0 | Scheduled tasks | ✅ Installed |
| **bull** | - | Queue management | ❌ Future (Week 14) |
| **redis** | - | Job queue backend | ❌ Future |

### 3.7 File Processing

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| **csv-parser** | ^3.2.0 | CSV file parsing | ✅ Installed |
| **pdfkit** | - | PDF generation | ❌ Future (Week 4) |
| **sharp** | - | Image processing | ❌ Future |

### 3.8 Testing

| Library | Version | Purpose |
|---------|---------|---------|
| **jest** | ^29.7.0 | Test framework |
| **ts-jest** | ^29.3.2 | TypeScript Jest integration |
| **supertest** | ^7.1.0 | HTTP assertion testing |
| **mongodb-memory-server** | ^10.1.4 | In-memory MongoDB for tests |
| **@faker-js/faker** | ^10.1.0 | Test data generation (ESM - not used) |

### 3.9 Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **typescript** | ^5.8.3 | TypeScript compiler |
| **ts-node** | ^10.9.2 | Run TypeScript directly |
| **ts-node-dev** | ^2.0.0 | Dev server with hot reload |
| **tsx** | ^4.21.0 | Fast TypeScript runner |

### 3.10 Future Integrations (Week 2+)

| Service | Purpose | Week |
|---------|---------|------|
| **Velocity Shipfast API** | Courier integration | Week 2 |
| **Razorpay** | Payment gateway | Week 3 |
| **AWS S3** | Document storage | Week 4 |
| **Shopify API** | E-commerce sync | Week 6-7 |
| **WooCommerce API** | E-commerce sync | Week 8 |
| **Exotel/Knowlarity** | Phone masking | Week 14 |
| **TensorFlow.js** | AI/ML features | Week 12-13 |

---

## 4. CURRENT IMPLEMENTATION STATUS

### 4.1 Overall Completion: ~24%

Based on the Backend-Gap-Analysis.md and current codebase:

| Module | Completion % | Status | Notes |
|--------|--------------|--------|-------|
| **Authentication & Security** | 70% | ⚠️ Partial | JWT working, 2FA partial |
| **User Management** | 76% | ⚠️ Partial | CRUD complete, team mgmt partial |
| **Company/Business Profiles** | 65% | ⚠️ Partial | Basic CRUD exists |
| **Order Management** | 25% | ❌ Incomplete | Model exists, API incomplete |
| **Shipment Tracking** | 16% | ❌ Incomplete | Basic tracking only |
| **Courier Integration** | 0% | ❌ Not Started | **CRITICAL PRIORITY (Week 2)** |
| **Payment Gateway** | 0% | ❌ Not Started | **CRITICAL PRIORITY (Week 3)** |
| **Wallet System** | 0% | ❌ Not Started | Needed for Week 4 |
| **Warehouse Management** | 50% | ⚠️ Partial | Model exists, workflows missing |
| **Rate Card & Pricing** | 40% | ⚠️ Partial | Basic structure, zone calc missing |
| **KYC Verification** | 42% | ⚠️ Partial | DeepVue integration partial |
| **Notifications** | 33% | ❌ Incomplete | Services exist, templates missing |
| **Analytics & Reporting** | 0% | ❌ Not Started | Planned for Week 9-11 |
| **AI/ML Features** | 0% | ❌ Not Started | Planned for Week 12-13 |
| **E-commerce Integration** | 0% | ❌ Not Started | Planned for Week 6-8 |

### 4.2 Detailed Status by Category

#### ✅ IMPLEMENTED (70%+)

**Authentication (70%)**
- ✅ JWT access + refresh token system
- ✅ Token generation and verification
- ✅ Session management (Session model)
- ✅ Password hashing (bcrypt, 12 rounds)
- ✅ Password reset flow
- ✅ OAuth Google integration (passport)
- ⚠️ 2FA (partial - service exists, not fully integrated)
- ❌ Rate limiting on sensitive endpoints (missing)

**User Management (76%)**
- ✅ User CRUD operations
- ✅ User model with all fields
- ✅ Role-based access control (admin, seller, staff)
- ✅ Profile management service
- ✅ Account management service
- ✅ Email change workflow
- ✅ Activity tracking service
- ✅ Team permissions model
- ✅ Team invitations model
- ⚠️ Team member management (partial)

**Company/Business (65%)**
- ✅ Company model (owner, business type, GSTIN, addresses)
- ✅ Company CRUD APIs
- ✅ Business profile management
- ❌ Multi-company user support (missing)
- ❌ Company-level settings (missing)

**Warehouse (50%)**
- ✅ Warehouse model (name, address, contact, serviceability)
- ✅ Warehouse CRUD
- ❌ Picking/packing workflows (completely missing)
- ❌ Manifest generation (missing)
- ❌ Warehouse assignment logic (missing)

**Rate Card & Zones (40%)**
- ✅ RateCard model
- ✅ Zone model (pincode serviceability)
- ❌ Zone-based pricing calculation (missing)
- ❌ Dynamic rate calculation (missing)
- ❌ Courier-specific rates (missing)

**KYC Verification (42%)**
- ✅ KYC model (Aadhaar, PAN, GST, Bank)
- ✅ DeepVue service integration (basic)
- ⚠️ Verification workflow (partial)
- ❌ Complete verification types (Aadhaar/PAN/GST) (missing)
- ❌ Auto-verification triggers (missing)

#### ⚠️ PARTIALLY IMPLEMENTED (20-60%)

**Order Management (25%)**
- ✅ Order model (comprehensive schema)
  - Fields: orderNumber, customer info, products, totals, status
  - Payment status, method
  - Shipping details
- ⚠️ Order service (basic structure)
- ❌ Order lifecycle management (missing)
- ❌ Order status transitions (missing)
- ❌ Order validation logic (missing)
- ❌ Order-to-shipment conversion (missing)

**Shipment Tracking (16%)**
- ✅ Shipment model (AWB, status, tracking events)
- ✅ Basic shipment service
- ❌ Real-time tracking updates (missing)
- ❌ Webhook handling for courier updates (missing)
- ❌ NDR (Non-Delivery Report) management (missing)
- ❌ RTO (Return to Origin) workflow (missing)

**Notifications (33%)**
- ✅ Email service (SendGrid configured)
- ✅ SMS service (Twilio integrated)
- ✅ WhatsApp service (structure exists)
- ❌ Email templates (completely missing)
- ❌ SMS templates (missing)
- ❌ Notification triggers (missing)
- ❌ Notification preferences (missing)

**Audit & Compliance (36%)**
- ✅ AuditLog model (user actions, system events)
- ✅ Permission model (role-based permissions)
- ❌ Complete audit trail implementation (missing)
- ❌ Compliance reporting (missing)
- ❌ 7-year retention policy (missing)

#### ❌ NOT STARTED (0%)

**Courier Integration (0%) - WEEK 2 PRIORITY**
- ❌ Velocity Shipfast API client
- ❌ Order creation API
- ❌ Tracking integration
- ❌ Label generation
- ❌ Cancellation workflow
- ❌ Serviceability check
- ❌ Rate calculation
- ❌ Manifest creation
- ❌ Pickup scheduling

**Payment Gateway (0%) - WEEK 3 PRIORITY**
- ❌ Razorpay integration
- ❌ Payment orders API
- ❌ Payment capture
- ❌ Webhook handling
- ❌ Refunds

**Wallet System (0%) - WEEK 4**
- ❌ Wallet model
- ❌ Balance management
- ❌ Transaction history
- ❌ COD remittance
- ❌ Auto-deduction

**PDF Generation (0%) - WEEK 4**
- ❌ Shipping labels
- ❌ Invoices
- ❌ Manifests
- ❌ Reports

**E-commerce Integration (0%) - WEEK 6-8**
- ❌ Shopify OAuth
- ❌ Shopify webhooks
- ❌ WooCommerce REST API
- ❌ Order sync
- ❌ Inventory sync

**Analytics & Reporting (0%) - WEEK 9-11**
- ❌ Dashboard analytics
- ❌ Performance metrics
- ❌ Custom report builder
- ❌ Data export

**AI/ML Features (0%) - WEEK 12-13**
- ❌ Fraud detection
- ❌ Delivery ETA prediction
- ❌ Demand forecasting
- ❌ Material planning AI

**Advanced Features (0%) - WEEK 14+**
- ❌ Phone number masking
- ❌ Material movement pipeline
- ❌ Pickup auto-tracker
- ❌ Client self-service portal
- ❌ COD dispute resolution

---

## 5. DATABASE MODELS

### 5.1 Existing Mongoose Models

**Total Models:** 14 (as of Session 1 completion)

| Model | File | Key Fields | Purpose | Status |
|-------|------|------------|---------|--------|
| **User** | `User.ts` | email, password, role, phone, company | User authentication & profile | ✅ Complete |
| **Company** | `Company.ts` | owner, companyName, gstin, addresses | Business profiles | ✅ Complete |
| **Order** | `Order.ts` | orderNumber, customer, products, totals, status | Order management | ⚠️ Schema ready, APIs partial |
| **Shipment** | `Shipment.ts` | awbNumber, orderId, status, trackingEvents | Shipment tracking | ⚠️ Basic structure |
| **Warehouse** | `Warehouse.ts` | name, address, contact, serviceability | Warehouse management | ✅ Complete |
| **RateCard** | `RateCard.ts` | carrier, zones, rates | Pricing configuration | ⚠️ Partial |
| **Zone** | `Zone.ts` | name, pincodes, serviceability | Serviceability zones | ✅ Complete |
| **Integration** | `Integration.ts` | provider, credentials, status | Third-party API config | ✅ Structure ready |
| **KYC** | `KYC.ts` | userId, type, status, documents | KYC verification | ✅ Complete |
| **Session** | `Session.ts` | userId, token, device, expiresAt | Session management | ✅ Complete |
| **AuditLog** | `AuditLog.ts` | userId, action, resource, timestamp | Activity tracking | ✅ Complete |
| **Coupon** | `Coupon.ts` | code, discount, validity, conditions | Promotional coupons | ✅ Structure ready |
| **Permission** | `Permission.ts` | role, resource, actions | RBAC permissions | ✅ Complete |
| **TeamInvitation** | `TeamInvitation.ts` | email, role, status, token | Team member invites | ✅ Complete |

### 5.2 Model Details

#### User Model
```typescript
// /server/src/infrastructure/database/mongoose/models/User.ts
interface IUser {
  email: string;              // Unique, lowercase, indexed
  password: string;           // Bcrypt hashed
  name: string;
  phone?: string;
  role: 'admin' | 'seller' | 'staff';
  companyId?: ObjectId;       // Reference to Company
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  isDeleted: boolean;         // Soft delete
  profileCompletion: {
    status: number;           // Percentage
    requiredFieldsCompleted: boolean;
  };
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Methods
user.comparePassword(candidatePassword): Promise<boolean>
user.generateAuthToken(): string
user.softDelete(): Promise<void>

// Indexes
{ email: 1 } unique
{ phone: 1 } unique sparse
{ companyId: 1, role: 1 }
```

#### Company Model
```typescript
interface ICompany {
  owner: ObjectId;            // Reference to User
  companyName: string;
  gstin?: string;             // GST Identification Number
  businessType: string;
  registeredAddress: Address;
  billingAddress?: Address;
  contactInfo: {
    email: string;
    phone: string;
  };
  status: 'pending' | 'verified' | 'rejected';
  kycStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
{ owner: 1 }
{ gstin: 1 } sparse
```

#### Order Model
```typescript
interface IOrder {
  orderNumber: string;        // Unique order ID
  companyId: ObjectId;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: Address;
  };
  products: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
    weight: number;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
  };
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'cod' | 'prepaid';
  currentStatus: string;      // Order lifecycle status
  shippingDetails: {
    provider?: string;
    method?: string;
    shippingCost: number;
  };
  source: 'manual' | 'shopify' | 'woocommerce' | 'api';
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
{ orderNumber: 1 } unique
{ companyId: 1, createdAt: -1 }
{ currentStatus: 1 }
```

#### Shipment Model
```typescript
interface IShipment {
  awbNumber: string;          // Air Waybill Number
  orderId: ObjectId;
  companyId: ObjectId;
  courierId: ObjectId;
  status: string;             // Shipment lifecycle status
  currentLocation?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  trackingEvents: Array<{
    status: string;
    timestamp: Date;
    location: string;
    description: string;
  }>;
  ndrDetails?: {
    reason: string;
    attempts: number;
    resolutionStatus: string;
  };
  rtoDetails?: {
    initiated: boolean;
    reason: string;
    returnedOn?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
{ awbNumber: 1 } unique
{ orderId: 1 }
{ companyId: 1, status: 1 }
```

### 5.3 Future Models (Week 2+)

| Model | Week | Purpose |
|-------|------|---------|
| **Wallet** | 4 | Balance management, transactions |
| **Transaction** | 4 | Payment history |
| **Courier** | 2 | Courier partner details |
| **CourierOrder** | 2 | Courier-specific order data |
| **Manifest** | 5 | Pickup manifests |
| **PickingList** | 5 | Warehouse picking |
| **PackingRecord** | 5 | Packing workflow |
| **Material** | 14 | Packing materials inventory |
| **MaterialConsumption** | 14 | Material usage tracking |
| **Dispute** | 14 | COD dispute management |
| **Salesperson** | 10 | Sales team management |
| **Commission** | 10 | Commission tracking |
| **Lead** | 10 | Lead management |

---

## 6. SERVICES LAYER

### 6.1 Existing Services

**Total Services:** 15+ (as of current implementation)

**Authentication Services** (`src/core/application/services/auth/`)
- ✅ `oauth.service.ts` - Google OAuth integration
- ✅ `session.service.ts` - Session lifecycle management
- ✅ `password.service.ts` - Password operations (hash, verify, reset)

**User Services** (`src/core/application/services/user/`)
- ✅ `profile.service.ts` - User profile CRUD
- ✅ `account.service.ts` - Account settings
- ✅ `activity.service.ts` - User activity logging
- ✅ `emailChange.service.ts` - Email change workflow
- ✅ `recovery.service.ts` - Account recovery

**Shipping Services** (`src/core/application/services/shipping/`)
- ⚠️ `shipment.service.ts` - Shipment operations (partial)
- ⚠️ `order.service.ts` - Order management (basic)
- ⚠️ `carrier.service.ts` - Carrier integration (stub)

**Communication Services** (`src/core/application/services/communication/`)
- ✅ `email.service.ts` - Email sending (SendGrid)
- ✅ `sms.service.ts` - SMS sending (Twilio)
- ✅ `whatsapp.service.ts` - WhatsApp notifications (structure)
- ✅ `notification.service.ts` - Notification orchestration

**Integration Services** (`src/core/application/services/integrations/`)
- ⚠️ `deepvue.service.ts` - KYC verification (partial)

### 6.2 Service Architecture Pattern

All services follow this pattern:

```typescript
// Example: ShipmentService

export class ShipmentService {
  // Dependencies (manual DI for now)
  private shipmentModel = Shipment;
  private orderModel = Order;

  /**
   * Create a new shipment
   * @param orderId - Order ID to create shipment for
   * @param carrierData - Carrier-specific data
   * @returns Created shipment
   */
  async createShipment(
    orderId: string,
    carrierData: CreateShipmentDTO
  ): Promise<IShipment> {
    try {
      // 1. Validate input
      if (!orderId) {
        throw new AppError('Order ID is required', 400);
      }

      // 2. Check order exists
      const order = await this.orderModel.findById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // 3. Business logic
      const shipment = await this.shipmentModel.create({
        orderId,
        companyId: order.companyId,
        ...carrierData,
        status: 'created',
        trackingEvents: [{
          status: 'created',
          timestamp: new Date(),
          location: 'Origin',
          description: 'Shipment created'
        }]
      });

      // 4. Side effects (notifications, etc.)
      await this.notificationService.sendShipmentCreated(shipment);

      // 5. Logging
      logger.info('Shipment created', { shipmentId: shipment._id });

      return shipment;
    } catch (error) {
      // 6. Error handling
      if (error instanceof AppError) throw error;
      throw new AppError('Shipment creation failed', 500, error);
    }
  }

  // ... other methods
}
```

### 6.3 Service Responsibilities

**DO:**
- ✅ Contain business logic
- ✅ Orchestrate multiple domain entities
- ✅ Call repositories (models)
- ✅ Handle errors with custom AppError
- ✅ Log important operations
- ✅ Validate inputs
- ✅ Trigger side effects (notifications, events)

**DON'T:**
- ❌ Directly access HTTP request/response
- ❌ Contain presentation logic
- ❌ Hard-code infrastructure details (DB connection strings)
- ❌ Make HTTP calls directly (use separate client classes)
- ❌ Contain SQL/MongoDB queries (use repositories/models)

### 6.4 Future Services (Week 2+)

**Week 2: Courier Integration**
- `VelocityShipfastService` - Velocity API integration
- `CourierOrchestratorService` - Multi-courier orchestration

**Week 3: Payment**
- `RazorpayService` - Payment gateway integration
- `PaymentService` - Payment orchestration

**Week 4: Wallet & Documents**
- `WalletService` - Balance management
- `TransactionService` - Transaction history
- `PDFGeneratorService` - Label/invoice generation

**Week 5: Warehouse**
- `PickingService` - Picking workflow
- `PackingService` - Packing workflow
- `ManifestService` - Manifest generation

**Week 6-8: E-commerce**
- `ShopifyService` - Shopify integration
- `WooCommerceService` - WooCommerce integration

**Week 9-11: Analytics**
- `AnalyticsService` - Data aggregation
- `ReportingService` - Report generation

**Week 12-13: AI/ML**
- `FraudDetectionService` - ML-based fraud detection
- `PredictiveAnalyticsService` - Delivery ETA prediction
- `MaterialPlanningService` - AI material prediction

---

## 7. API ROUTES

### 7.1 Existing Routes

**Base URL:** `/api/v1`

**Authentication Routes** (`/api/v1/auth`)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/forgot-password` - Forgot password
- `POST /auth/reset-password` - Reset password
- `POST /auth/verify-email` - Verify email
- `POST /auth/resend-verification` - Resend verification email
- `POST /auth/google` - Google OAuth login

**User Routes** (`/api/v1/users`)
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update current user
- `DELETE /users/me` - Delete account (soft delete)
- `GET /users/:id` - Get user by ID (admin only)
- `PATCH /users/:id` - Update user (admin only)
- `POST /users/change-email` - Change email
- `POST /users/change-password` - Change password

**Company Routes** (`/api/v1/companies`)
- `POST /companies` - Create company
- `GET /companies/:id` - Get company by ID
- `PATCH /companies/:id` - Update company
- `DELETE /companies/:id` - Delete company

**Shipping Routes** (`/api/v1/shipping`)
- ⚠️ `POST /shipping/shipments` - Create shipment (partial)
- ⚠️ `GET /shipping/shipments/:id` - Get shipment (partial)
- ⚠️ `GET /shipping/shipments/:awb/track` - Track shipment (basic)

### 7.2 Route Structure Pattern

```typescript
// Example: shipping/shipment.routes.ts

import { Router } from 'express';
import { ShipmentController } from '@/controllers/shipping/shipment.controller';
import { authenticate } from '@/middleware/auth/auth';
import { authorize } from '@/middleware/auth/authorize';

const router = Router();
const shipmentController = new ShipmentController();

// All routes require authentication
router.use(authenticate);

// Create shipment (seller/admin only)
router.post(
  '/shipments',
  authorize(['seller', 'admin']),
  shipmentController.createShipment.bind(shipmentController)
);

// Get shipment (own company only)
router.get(
  '/shipments/:id',
  shipmentController.getShipment.bind(shipmentController)
);

// Track shipment (public)
router.get(
  '/shipments/:awb/track',
  shipmentController.trackShipment.bind(shipmentController)
);

export default router;
```

### 7.3 Future API Routes (Week 2+)

**Week 2: Courier Integration**
```
POST   /api/v1/courier/velocity/forward-order
POST   /api/v1/courier/velocity/reverse-order
GET    /api/v1/courier/velocity/track/:awb
POST   /api/v1/courier/velocity/cancel/:awb
GET    /api/v1/courier/velocity/serviceability
POST   /api/v1/courier/velocity/rate-calculation
POST   /api/v1/courier/velocity/generate-label
```

**Week 3: Payment & Wallet**
```
POST   /api/v1/payments/create-order
POST   /api/v1/payments/capture
POST   /api/v1/payments/refund
GET    /api/v1/wallet/balance
GET    /api/v1/wallet/transactions
POST   /api/v1/wallet/recharge
```

**Week 4-5: Warehouse & Documents**
```
POST   /api/v1/warehouse/picking-list
POST   /api/v1/warehouse/pick-item
POST   /api/v1/warehouse/pack-order
POST   /api/v1/warehouse/manifest
GET    /api/v1/documents/label/:shipmentId
GET    /api/v1/documents/invoice/:orderId
```

**Week 6-8: E-commerce**
```
POST   /api/v1/integrations/shopify/connect
POST   /api/v1/integrations/shopify/webhook
GET    /api/v1/integrations/shopify/orders
POST   /api/v1/integrations/woocommerce/connect
POST   /api/v1/integrations/woocommerce/sync
```

---

## 8. CODING STANDARDS

### 8.1 TypeScript Standards

**1. Type Safety**
```typescript
// ✅ GOOD: Strict typing
interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'seller' | 'staff';
}

function createUser(data: CreateUserDTO): Promise<IUser> {
  // ...
}

// ❌ BAD: Any types
function createUser(data: any): any {
  // ...
}
```

**2. No Implicit Any**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

**3. Interfaces over Types (for extensibility)**
```typescript
// ✅ GOOD
interface IUser {
  email: string;
  name: string;
}

// ⚠️ ACCEPTABLE for unions
type UserRole = 'admin' | 'seller' | 'staff';
```

### 8.2 Error Handling

**1. Custom Error Classes**
```typescript
// shared/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Usage
throw new AppError('User not found', 404);
throw new AppError('Validation failed', 400, { field: 'email' });
```

**2. Service Error Handling**
```typescript
// ✅ GOOD: Specific error handling
async getUser(id: string): Promise<IUser> {
  try {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch user', 500, error);
  }
}
```

**3. Controller Error Handling**
```typescript
// ✅ GOOD: Delegate to error middleware
async getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await this.userService.getUser(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);  // Pass to error handler middleware
  }
}
```

### 8.3 Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Files** | camelCase for services, PascalCase for models | `userService.ts`, `User.ts` |
| **Classes** | PascalCase | `UserService`, `ShipmentController` |
| **Functions** | camelCase | `createUser`, `getShipmentById` |
| **Variables** | camelCase | `userName`, `orderId` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRIES`, `JWT_SECRET` |
| **Interfaces** | PascalCase with 'I' prefix | `IUser`, `IOrder` |
| **Types** | PascalCase | `UserRole`, `OrderStatus` |

### 8.4 Code Organization

**1. Import Order**
```typescript
// ✅ GOOD: Organized imports
// 1. Node.js built-ins
import { readFile } from 'fs/promises';

// 2. External libraries
import express from 'express';
import mongoose from 'mongoose';

// 3. Internal modules
import { UserService } from '@/services/user/user.service';
import { AppError } from '@/shared/errors/AppError';
import { logger } from '@/shared/utils/logger';

// 4. Types
import type { IUser } from '@/infrastructure/database/mongoose/models/User';
```

**2. Function Size**
- ✅ Functions should be ≤ 50 lines
- ✅ Extract complex logic to separate functions
- ✅ Single Responsibility Principle

**3. Comments**
```typescript
// ✅ GOOD: JSDoc for public methods
/**
 * Create a new shipment
 * @param orderId - Order ID to create shipment for
 * @param carrierData - Carrier-specific data
 * @returns Created shipment
 * @throws {AppError} If order not found or creation fails
 */
async createShipment(orderId: string, carrierData: CreateShipmentDTO): Promise<IShipment>

// ✅ GOOD: Inline comments for complex logic
// Calculate dimensional weight using courier's formula
const dimWeight = (length * width * height) / 5000;
const chargeableWeight = Math.max(actualWeight, dimWeight);

// ❌ BAD: Obvious comments
const user = new User();  // Create user ← unnecessary
```

### 8.5 Async/Await Best Practices

```typescript
// ✅ GOOD: Proper async/await
async function processOrder(orderId: string): Promise<void> {
  try {
    const order = await Order.findById(orderId);
    const shipment = await createShipment(order);
    await sendNotification(shipment);
  } catch (error) {
    logger.error('Order processing failed', { orderId, error });
    throw error;
  }
}

// ❌ BAD: Mixing promises and callbacks
function processOrder(orderId, callback) {
  Order.findById(orderId).then(order => {
    createShipment(order, (err, shipment) => {
      // ...
    });
  });
}
```

### 8.6 Logging Standards

```typescript
// ✅ GOOD: Structured logging with Winston
logger.info('User logged in', {
  userId: user._id,
  email: user.email,
  ip: req.ip
});

logger.error('Payment failed', {
  orderId: order._id,
  amount: order.total,
  error: error.message,
  stack: error.stack
});

// ❌ BAD: console.log
console.log('User logged in:', user.email);
```

### 8.7 Security Standards

**1. No Secrets in Code**
```typescript
// ✅ GOOD
const apiKey = process.env.VELOCITY_API_KEY;

// ❌ BAD
const apiKey = 'abc123xyz789';  // Hardcoded secret
```

**2. Input Validation**
```typescript
// ✅ GOOD: Validate all inputs
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100)
});

const validatedData = createUserSchema.parse(req.body);
```

**3. SQL Injection Prevention**
```typescript
// ✅ GOOD: Use Mongoose (parameterized)
const user = await User.findOne({ email });

// ❌ BAD: Raw queries (if using SQL)
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

**4. XSS Prevention**
```typescript
// ✅ GOOD: Sanitize user input
import xss from 'xss';
const cleanContent = xss(userInput);
```

---

## 9. INTEGRATION POINTS

### 9.1 Current Integrations

**1. DeepVue KYC (42% Complete)**
- **Purpose:** Aadhaar, PAN, GST, Bank verification
- **Service:** `src/core/application/services/integrations/deepvue.service.ts`
- **Status:** Basic structure, verification flow partial
- **API Endpoints:** Aadhaar verification, PAN verification

**2. SendGrid Email (100% Configured)**
- **Purpose:** Transactional emails
- **Service:** `src/core/application/services/communication/email.service.ts`
- **Status:** Service configured, templates missing
- **Future:** Email templates in Week 1 Session 4

**3. Twilio SMS (100% Configured)**
- **Purpose:** SMS notifications
- **Service:** `src/core/application/services/communication/sms.service.ts`
- **Status:** Service configured, templates missing

**4. Google OAuth (100% Complete)**
- **Purpose:** Social login
- **Service:** `src/core/application/services/auth/oauth.service.ts`
- **Status:** Fully functional with Passport.js

**5. AWS S3 (Infrastructure Ready)**
- **Purpose:** Document storage (labels, invoices, KYC docs)
- **Status:** Dependencies installed, integration pending Week 4
- **Bucket:** shipcrowd-documents (configured in env)

### 9.2 Future Integrations (Week 2+)

**Week 2: Velocity Shipfast Courier API**
- **Priority:** CRITICAL (0% → 100%)
- **Endpoints:** 12 API endpoints
  1. Authentication & Token Refresh
  2. Forward Order Creation
  3. Reverse Order Creation
  4. Tracking (AWB-based)
  5. Order Cancellation
  6. Pincode Serviceability Check
  7. Rate Calculation
  8. Label Generation
  9. Manifest Creation
  10. Pickup Scheduling
  11. Webhook Status Updates
  12. Weight Discrepancy Reporting
- **Implementation:** `src/infrastructure/external/velocity/`
  - `VelocityClient.ts` - HTTP client with auth
  - `VelocityProvider.ts` - Business logic adapter
  - `interfaces/` - TypeScript interfaces for all endpoints
- **Security:** API Key + Secret in headers, request signing
- **Error Handling:** Retry logic, circuit breaker pattern
- **Testing:** Mocks in `tests/mocks/velocityShipfast.mock.ts` ✅

**Week 3: Razorpay Payment Gateway**
- **Priority:** CRITICAL
- **Endpoints:**
  1. Create Payment Order
  2. Capture Payment
  3. Refund Payment
  4. Webhook Signature Verification
- **Implementation:** `src/infrastructure/external/razorpay/`
- **Testing:** Mocks in `tests/mocks/razorpay.mock.ts` ✅

**Week 6-7: Shopify E-commerce Platform**
- **Priority:** HIGH
- **Features:**
  - OAuth 2.0 app installation
  - Webhook management (orders, fulfillments, inventory)
  - Order synchronization (bi-directional)
  - Fulfillment creation with tracking
  - Inventory sync (optional)
- **Implementation:** `src/infrastructure/external/shopify/`

**Week 8: WooCommerce E-commerce Platform**
- **Priority:** HIGH
- **Features:**
  - REST API authentication (Consumer Key/Secret)
  - Order import automation
  - Status synchronization
  - Product catalog sync
- **Implementation:** `src/infrastructure/external/woocommerce/`

**Week 14: Exotel/Knowlarity (Phone Masking)**
- **Priority:** MEDIUM
- **Features:**
  - Virtual number generation
  - Call routing
  - Call logging & analytics
  - Number pooling
- **Implementation:** `src/infrastructure/external/exotel/`

**Week 12-13: TensorFlow.js / Brain.js (AI/ML)**
- **Priority:** MEDIUM
- **Features:**
  - Fraud detection model
  - Delivery ETA prediction
  - Material planning AI
  - Model training pipeline
- **Implementation:** `src/ml/`

### 9.3 Integration Security Standards

**1. Credential Management**
- ✅ Store in environment variables
- ✅ Use encrypted fields for DB storage (mongoose-field-encryption)
- ✅ Never commit secrets to Git
- ✅ Rotate credentials quarterly

**2. Request Signing**
```typescript
// Example: Webhook signature verification (Razorpay)
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expectedSignature;
}
```

**3. Rate Limiting**
- External API calls: Respect partner rate limits
- Implement exponential backoff retry logic
- Use circuit breaker pattern for failing services

**4. Webhook Security**
- Validate signatures
- Use HTTPS only
- Implement idempotency (duplicate event handling)
- Log all webhook events for audit

---

## 10. SECURITY

### 10.1 Authentication

**JWT Token Strategy (Hybrid)**
- **Access Token:** 15 minutes expiry, stored in httpOnly cookie
- **Refresh Token:** 7 days expiry, stored in httpOnly cookie
- **Token Payload:**
  ```json
  {
    "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "role": "seller",
    "companyId": "64a1b2c3d4e5f6g7h8i9j0k2",
    "iat": 1672531200,
    "exp": 1672532100
  }
  ```

**Password Security**
- **Hashing:** bcrypt with 12 rounds (cost factor)
- **Minimum Requirements:**
  - At least 8 characters
  - Uppercase + lowercase + number + special char
  - Validated with `zxcvbn` library (password strength)
- **Password History:** Last 3 passwords blocked
- **Reset Tokens:** One-time use, 1-hour expiry

**Session Management**
- **Session Model:** Tracks userId, device, IP, expiresAt
- **Multiple Sessions:** Allowed across different devices
- **Session Revocation:** On password change, logout
- **Suspicious Activity:** Flag unusual login locations

### 10.2 Authorization

**Role-Based Access Control (RBAC)**

| Role | Permissions | Use Case |
|------|-------------|----------|
| **admin** | Full system access | System administrators |
| **seller** | Own company data, create orders/shipments | Business owners |
| **staff** | Limited company access (assigned permissions) | Warehouse staff, CS team |

**Permission Model:**
```typescript
{
  role: 'staff',
  resource: 'orders',
  actions: ['read', 'create'],  // Cannot update or delete
  companyId: '...'              // Scoped to specific company
}
```

**Middleware:**
```typescript
// authenticate: Verify JWT
// authorize: Check role/permission
router.post('/orders',
  authenticate,
  authorize(['seller', 'admin']),
  orderController.createOrder
);
```

### 10.3 Input Validation

**1. Request Validation (Zod)**
```typescript
const createOrderSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().regex(/^\+91[0-9]{10}$/),
  products: z.array(z.object({
    name: z.string(),
    quantity: z.number().int().positive(),
    price: z.number().positive()
  })).min(1),
  paymentMethod: z.enum(['cod', 'prepaid'])
});
```

**2. Sanitization**
- XSS protection: Sanitize HTML input
- NoSQL injection: Use Mongoose (parameterized)
- Path traversal: Validate file paths

### 10.4 Data Protection

**1. Encryption at Rest**
- **Sensitive Fields:** Encrypted with mongoose-field-encryption
  - API keys (Integration model)
  - Bank account numbers (KYC model)
- **Encryption Key:** 32-character AES-256 key in environment variable

**2. Encryption in Transit**
- **HTTPS Only:** Force SSL in production
- **TLS 1.2+:** Minimum TLS version

**3. PII Protection**
- **Masking in Logs:** Never log passwords, tokens, full credit cards
- **GDPR Compliance:** Data deletion on request (Week 15)
- **Phone Masking:** Exotel integration for privacy (Week 14)

### 10.5 Rate Limiting

**Current Implementation (express-rate-limit):**
```typescript
// Login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                    // 5 attempts
  message: 'Too many login attempts, please try again later'
});

// General API
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  max: 100,                  // 100 requests per user
  standardHeaders: true,
  legacyHeaders: false
});
```

**Future (Redis-based - Week 4):**
- Per-user rate limiting
- Per-IP rate limiting
- Dynamic rate limits based on plan tier

### 10.6 Security Headers (Helmet)

```typescript
app.use(helmet());

// Configured headers:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Strict-Transport-Security: max-age=31536000
// - Content-Security-Policy: (configured)
```

### 10.7 Audit Trail

**AuditLog Model:**
```typescript
{
  userId: ObjectId,
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
  resource: 'Order' | 'Shipment' | 'User',
  resourceId: ObjectId,
  timestamp: Date,
  ip: string,
  userAgent: string,
  details: { ... }  // Action-specific details
}
```

**Logged Actions:**
- User login/logout
- Password changes
- Order creation/cancellation
- Shipment creation
- Payment transactions
- API key access
- Permission changes

**Retention:** 7 years (compliance requirement - Week 15)

---

## 11. PERFORMANCE REQUIREMENTS

### 11.1 Target Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **API Response Time (p95)** | <500ms | ~300ms | ✅ Exceeding |
| **API Response Time (p99)** | <1s | Not measured | ⚠️ To monitor |
| **Database Query Time** | <100ms | Not measured | ⚠️ To monitor |
| **Bulk Operations (100 records)** | <2s | Not tested | ⚠️ Week 5 |
| **Concurrent Users** | 1000+ | Not tested | ⚠️ Week 16 |
| **Throughput** | 100 orders/minute | Not tested | ⚠️ Week 16 |

### 11.2 Database Optimization

**1. Indexes**
- ✅ Unique indexes on: `User.email`, `User.phone`, `Order.orderNumber`, `Shipment.awbNumber`
- ✅ Compound indexes on: `{ companyId: 1, createdAt: -1 }`, `{ companyId: 1, status: 1 }`
- ❌ Missing: Full-text search indexes (future)

**2. Query Optimization**
- Use `.lean()` for read-only queries (faster, plain JS objects)
- Use `.select()` to fetch only required fields
- Avoid N+1 queries with `.populate()`

```typescript
// ✅ GOOD: Optimized query
const orders = await Order.find({ companyId })
  .select('orderNumber status totals.total')
  .lean()
  .limit(20);

// ❌ BAD: Fetches all fields
const orders = await Order.find({ companyId });
```

**3. Pagination**
```typescript
// ✅ GOOD: Cursor-based pagination
const orders = await Order.find({ companyId, _id: { $gt: lastId } })
  .sort({ _id: 1 })
  .limit(20);

// ⚠️ ACCEPTABLE: Offset-based (small datasets)
const orders = await Order.find({ companyId })
  .skip(page * limit)
  .limit(limit);
```

### 11.3 Caching Strategy (Week 4 - Redis)

**Future Implementation:**
```typescript
// Cache rate cards (rarely change)
const rateCard = await cache.get(`ratecard:${carrierId}:${zone}`);
if (!rateCard) {
  rateCard = await RateCard.findOne({ carrierId, zone });
  await cache.set(`ratecard:${carrierId}:${zone}`, rateCard, 3600);
}

// Cache user sessions
const session = await cache.get(`session:${sessionId}`);
```

**Cache Strategy:**
- Rate cards: 1 hour TTL
- User sessions: Until expiry
- Serviceability zones: 24 hours TTL
- Courier rates: 1 hour TTL

### 11.4 Background Jobs (Week 4 - Bull Queue)

**Future Implementation:**
- Email sending (asynchronous)
- PDF generation (offload from request cycle)
- Bulk tracking updates (scheduled job)
- Analytics aggregation (nightly cron)
- Material alert checks (daily 6:30 PM cron)

**Queue Priority:**
- Critical: Payment webhooks, order notifications
- High: Email/SMS sending
- Medium: PDF generation
- Low: Analytics, reports

---

## 12. TESTING STRATEGY

### 12.1 Testing Pyramid

```
        /\
       /  \    E2E Tests (Future)
      /    \   - Critical user flows
     /------\  - Selenium/Playwright
    /        \
   / Integration Tests
  /  - API endpoints
 /   - Database interactions
/     - External API mocks
/---------------------------\
         Unit Tests
  - Services (business logic)
  - Utilities
  - Models (methods)
```

### 12.2 Current Test Infrastructure (Week 1 Session 1) ✅

**Framework:** Jest + Supertest + MongoDB Memory Server

**Test Structure:**
```
tests/
├── setup/
│   ├── globalSetup.ts        # Start MongoDB Memory Server
│   ├── globalTeardown.ts     # Stop MongoDB
│   ├── testHelpers.ts        # generateAuthToken, mock req/res
│   └── testDatabase.ts       # DB utilities
├── fixtures/
│   ├── userFactory.ts        # createTestUser, createTestCompany
│   ├── orderFactory.ts       # createTestOrder, COD/Prepaid variants
│   └── shipmentFactory.ts    # (Future)
├── mocks/
│   ├── velocityShipfast.mock.ts  # Complete courier API mock
│   └── razorpay.mock.ts          # Payment gateway mock
├── unit/
│   └── services/
│       └── auth/
│           └── auth.service.test.ts  # 11 tests passing ✅
└── integration/
    └── auth/
        └── login.test.ts     # 9 tests (ESM issue - fixable)
```

**Coverage Goals:**
- **Unit Tests:** 70% minimum
- **Integration Tests:** All critical paths
- **E2E Tests:** (Future) Major user flows

**Current Coverage:** ~60% (baseline before Week 1)
**Target by Week 16:** 80% overall

### 12.3 Test Patterns

**Unit Test Example:**
```typescript
describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(() => {
    orderService = new OrderService();
  });

  describe('createOrder', () => {
    it('should create order with valid data', async () => {
      const company = await createTestCompany();
      const orderData = {
        customerName: 'John Doe',
        products: [{ name: 'T-Shirt', quantity: 2, price: 500 }],
        paymentMethod: 'prepaid'
      };

      const order = await orderService.createOrder(company._id, orderData);

      expect(order).toBeDefined();
      expect(order.orderNumber).toMatch(/^ORD-/);
      expect(order.totals.total).toBe(1000);
    });

    it('should throw error for invalid company', async () => {
      await expect(
        orderService.createOrder('invalid-id', {})
      ).rejects.toThrow('Company not found');
    });
  });
});
```

**Integration Test Example:**
```typescript
describe('POST /api/v1/orders', () => {
  let authToken: string;
  let companyId: string;

  beforeAll(async () => {
    const { user, company } = await createTestUserWithCompany();
    authToken = generateAuthToken(user._id, 'seller');
    companyId = company._id;
  });

  it('should create order successfully', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        products: [{ name: 'T-Shirt', quantity: 2, price: 500 }],
        paymentMethod: 'prepaid'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.orderNumber).toBeDefined();
  });

  it('should return 401 without auth token', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .send({});

    expect(response.status).toBe(401);
  });
});
```

### 12.4 Test Coverage by Week

| Week | Module | Unit Tests | Integration Tests | Coverage Target |
|------|--------|-----------|------------------|-----------------|
| 1 | Foundation | ✅ Setup complete | ⚠️ ESM issue | 60% baseline |
| 2 | Courier Integration | Required | Required | 80% |
| 3 | Payment Gateway | Required | Required | 80% |
| 4 | Wallet & PDF | Required | Required | 75% |
| 5 | Warehouse Workflows | Required | Required | 75% |
| 6-8 | E-commerce | Required | Required | 70% |
| 9-11 | Analytics | Required | Optional | 70% |
| 12-13 | AI/ML | Required | Mock-based | 65% |
| 14-16 | Advanced Features | Required | Required | 75% |

### 12.5 Testing Best Practices

**DO:**
- ✅ Test business logic thoroughly (services)
- ✅ Use factories for test data (`createTestUser`, etc.)
- ✅ Mock external APIs (Velocity, Razorpay)
- ✅ Clean database between tests (`beforeEach`)
- ✅ Test both success and failure paths
- ✅ Use descriptive test names: `should create order with valid data`

**DON'T:**
- ❌ Test implementation details
- ❌ Share state between tests
- ❌ Hit real external APIs in tests
- ❌ Test third-party library code
- ❌ Write tests just for coverage (focus on business logic)

---

## 13. DEVELOPMENT WORKFLOW

### 13.1 Git Workflow

**Branching Strategy:**
```
main
├── develop
    ├── feature/week-1-session-1-infrastructure
    ├── feature/week-2-velocity-integration
    ├── feature/week-3-payment-gateway
    └── bugfix/login-rate-limit
```

**Branch Naming:**
- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Production hotfixes
- `refactor/` - Code refactoring

**Commit Message Convention:**
```
feat: Add Velocity Shipfast courier integration
fix: Resolve race condition in wallet updates
docs: Update API documentation for orders
test: Add integration tests for auth endpoints
refactor: Extract email service from notification service
chore: Update dependencies (Mongoose 8.0)
```

### 13.2 AI-Native Development (CANON Methodology)

**Agent Roles:**
- **Claude Sonnet:** Architecture, planning, complex problem-solving, code review
- **Cursor AI:** Implementation, iteration, refactoring, testing

**Session Types:**
1. **Planning Session** (Claude)
   - Analyze requirements
   - Design architecture
   - Create implementation plan

2. **Implementation Session** (Cursor)
   - Write code based on plan
   - Run tests
   - Iterate quickly

3. **Review Session** (Claude)
   - Code review
   - Identify improvements
   - Security check

4. **Debugging Session** (Claude)
   - Analyze bugs
   - Root cause analysis
   - Fix strategy

**Context Packages (Week 1):**
- Master Context (this document)
- Module-specific contexts (Auth, Order, Shipment, etc.)
- Integration contexts (Velocity, Razorpay, etc.)

### 13.3 Code Review Checklist

**Before Creating PR:**
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Linter passing (`npm run lint`)
- [ ] Code coverage ≥70% for new code
- [ ] Documentation updated (JSDoc, README)
- [ ] Environment variables in `.env.example`
- [ ] No secrets committed
- [ ] Migration scripts (if DB changes)

**During Review:**
- [ ] Business logic correct
- [ ] Error handling comprehensive
- [ ] Security considerations addressed
- [ ] Performance optimizations applied
- [ ] Tests cover edge cases
- [ ] Code follows standards (Section 8)

### 13.4 Deployment Process (Future - Week 16)

**Environments:**
1. **Development** - Local machine
2. **Staging** - `api-staging.shipcrowd.com`
3. **Production** - `api.shipcrowd.com`

**CI/CD Pipeline (Future):**
```
Git Push → GitHub Actions
  ↓
Run Tests
  ↓
Build Docker Image
  ↓
Deploy to Staging (auto)
  ↓
Run Smoke Tests
  ↓
Deploy to Production (manual approval)
```

---

## 14. KNOWN ISSUES & TECHNICAL DEBT

### 14.1 Critical Issues (Fix in Week 1)

**1. Race Conditions in Database Updates**
- **Problem:** Concurrent requests causing data inconsistencies
- **Affected:** Wallet balance, order status, inventory
- **Solution:** Implement optimistic locking utility (Week 1 Day 3)
- **File:** `/server/src/shared/utils/optimisticLocking.ts` ✅ (Session 5)

**2. Missing Rate Limiting on Sensitive Endpoints**
- **Problem:** No rate limiting on password reset, email verification
- **Risk:** Brute force attacks, abuse
- **Solution:** Add rate limiters (Week 1)

**3. Integration Test ESM Import Issue**
- **Problem:** Dynamic imports fail in Jest without experimental VM modules
- **Impact:** 9 integration tests failing
- **Solution:** Use `require()` instead of `await import()`
- **Fix Time:** 5 minutes ✅

### 14.2 Technical Debt

**1. Dependency Injection**
- **Current:** Manual service instantiation in controllers
- **Future:** Use IoC container (`tsyringe` or `inversify`)
- **Priority:** Low (Week 10+)

**2. API Versioning**
- **Current:** `/api/v1` hardcoded
- **Future:** Middleware-based version routing
- **Priority:** Low (needed when releasing v2)

**3. Logging Centralization**
- **Current:** Winston to console/file
- **Future:** Centralized logging (ELK stack, CloudWatch)
- **Priority:** Medium (Week 16)

**4. Monitoring & Alerting**
- **Current:** No APM, no error tracking
- **Future:** New Relic/DataDog + Sentry
- **Priority:** Medium (Week 16)

**5. Database Connection Pooling**
- **Current:** Default Mongoose connection pool
- **Future:** Optimized pool size based on load testing
- **Priority:** Low (Week 16)

### 14.3 Missing Features (Planned in Weeks 2-16)

See Section 4.2 for comprehensive list.

**Top Priority Missing Features:**
1. Courier Integration (Week 2) - CRITICAL
2. Payment Gateway (Week 3) - CRITICAL
3. Wallet System (Week 4) - CRITICAL
4. Warehouse Workflows (Week 5) - HIGH
5. E-commerce Integration (Week 6-8) - HIGH

---

## 15. ENVIRONMENT VARIABLES

### 15.1 Required Variables

**File:** `.env.example` (template)

```bash
# Application
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb://localhost:27017/shipcrowd
MONGO_TEST_URI=<set by MongoDB Memory Server>

# Authentication
JWT_SECRET=your_jwt_secret_min_32_characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ENCRYPTION_KEY=your_encryption_key_exactly_32chars

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

# Email (SendGrid)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
FROM_EMAIL=noreply@shipcrowd.com
FROM_NAME=Shipcrowd

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=shipcrowd-documents
AWS_REGION=ap-south-1

# DeepVue KYC
DEEPVUE_API_KEY=your_deepvue_api_key
DEEPVUE_BASE_URL=https://api.deepvue.tech/v1

# Future Integrations (Week 2+)
VELOCITY_API_KEY=
VELOCITY_API_SECRET=
VELOCITY_BASE_URL=https://api.velocityshipfast.com/v1

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

EXOTEL_API_KEY=
EXOTEL_API_TOKEN=
```

### 15.2 Variable Naming Convention

- **ALL_CAPS_SNAKE_CASE**
- Group by service (prefix)
- End with `_KEY`, `_SECRET`, `_TOKEN`, `_URL` where applicable

### 15.3 Security Notes

- ❌ **NEVER** commit `.env` to Git (in `.gitignore`)
- ✅ **ALWAYS** use `.env.example` as template
- ✅ Rotate production secrets quarterly
- ✅ Use different secrets for staging vs production
- ✅ Store production secrets in secure vault (AWS Secrets Manager, HashiCorp Vault)

---

## APPENDIX A: QUICK REFERENCE

### File Locations

| What | Where |
|------|-------|
| **Models** | `/server/src/infrastructure/database/mongoose/models/` |
| **Services** | `/server/src/core/application/services/` |
| **Controllers** | `/server/src/presentation/http/controllers/` |
| **Routes** | `/server/src/presentation/http/routes/v1/` |
| **Middleware** | `/server/src/presentation/http/middleware/` |
| **Utilities** | `/server/src/shared/utils/` |
| **Tests** | `/server/tests/` |
| **Documentation** | `/docs/` |
| **Context Packages** | `/docs/ContextPackages/` (Week 1 Session 3-4) |

### Key Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Testing
npm test                 # Run all tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # With coverage report
npm test auth            # Run specific test file

# Building
npm run build            # Compile TypeScript

# Linting
npm run lint             # Run ESLint

# Database
npm run seed             # Seed demo data
npm run verify-seed      # Verify seed data
```

### Important Links

- **Backend Gap Analysis:** `/docs/Backend-Gap-Analysis.md`
- **Week 1 Execution Plan:** `/docs/Development/Backend/Week1_Execution_Plan.md`
- **Session 1 Evaluation:** `/docs/Development/SESSION1_EVALUATION_REPORT.md`
- **Testing Templates:** `/docs/Templates/`

---

## REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-26 | Claude Sonnet 4.5 | Initial comprehensive master context document |

---

**Document Status:** ✅ COMPLETE (Session 2 - Week 1)
**Next Update:** After Week 2 implementation (Velocity Integration)
**Maintainer:** Development Team
**Review Frequency:** After each week's completion
