# ShipCrowd API Testing - Postman Collections

**Professional API testing infrastructure for ShipCrowd platform**

## 📋 Overview

This directory contains a comprehensive, production-grade Postman testing suite for the ShipCrowd backend API. The collections are organized by business domain, following industry best practices for API testing, documentation, and maintenance.

**Total Endpoints:** 108+ documented (385+ total across 51 route files)
**Collections:** 6 domain-specific collections (in progress)
**Environment:** 1 unified environment file
**Version:** 2.0.0

---

## 🏗️ Architecture

### Domain-Driven Organization

Our Postman collections follow a **domain-driven design** where each collection represents a distinct business domain:

```
postman/
├── README.md (this file)
├── environments/
│   └── shipcrowd.postman_environment.json (unified environment)
├── collections/
│   ├── 01-Authentication-Identity.postman_collection.json (34 endpoints)
│   ├── 02-Company-KYC.postman_collection.json (24 endpoints)
│   ├── 03-Orders-Shipments.postman_collection.json (13 endpoints)
│   ├── 04-Warehouse-Ratecard.postman_collection.json (52 endpoints)
│   ├── 05-NDR-RTO-Disputes.postman_collection.json (26 endpoints)
│   └── 06-Finance-Wallet.postman_collection.json (17 endpoints)
└── Docs/
    └── SETUP-GUIDE.md (detailed setup instructions)
```

---

## 🚀 Quick Start

### 1. Import Environment

1. Open Postman
2. Click **Environments** → **Import**
3. Select `environments/shipcrowd.postman_environment.json`
4. Set as active environment

### 2. Import Collections

Import all collections from the `collections/` folder:
- You can import all at once by selecting multiple files
- Or import individually based on your testing needs

### 3. Configure Environment Variables

Update these critical variables in your environment:

```javascript
BASE_URL: http://localhost:5005/api/v1  // Your API base URL
NODE_ENV: development                    // development | staging | production
```

### 4. Run Initial Setup

Execute requests in this order (from Collection 01):
1. **Get CSRF Token** - Required for authentication
2. **Register User** - Create test account
3. **Login** - Get access token
4. **Get Profile** - Verify authentication

---

## 📚 Collections Reference

### 01. Authentication & Identity ✅
**Purpose:** Complete user authentication, session management, and identity operations
**Endpoints:** 34
**Folders:**
- Auth Operations (9 endpoints): Register, login, logout, OAuth, magic link
- Session Management (6 endpoints): Refresh, revoke, validate tokens
- Password Operations (4 endpoints): Reset, change, forgot password
- User Management (6 endpoints): Profile, preferences, account settings
- KYC Operations (5 endpoints): Document submission, verification status
- Account Operations (4 endpoints): Consent management, account closure

**Key Features:**
- ✅ Automatic token refresh on 401 responses
- ✅ CSRF protection for state-changing operations
- ✅ Auto-stores ACCESS_TOKEN, REFRESH_TOKEN, CSRF_TOKEN
- ✅ Global test assertions (status, response time, JSON validation)
- ✅ Comprehensive API documentation in each endpoint description

---

### 02. Company & KYC ✅
**Purpose:** Company profile management and KYC verification workflow
**Endpoints:** 24
**Folders:**
- Company Profile (7 endpoints): CRUD operations, settings, billing
- KYC Management (12 endpoints): Document upload, verification, status tracking
- Admin Operations (5 endpoints): KYC approval, rejection, company verification

**Key Features:**
- ✅ Multi-tenancy testing (company isolation)
- ✅ Document upload simulation (PAN, Aadhaar, GST, Bank)
- ✅ KYC workflow state transitions
- ✅ Role-based access control (admin vs seller)
- ✅ Auto-stores COMPANY_ID, KYC_DOCUMENT_ID

**Business Logic:**
- Production tier requires KYC approval
- Cannot ship without verified KYC
- Admin-only approval workflow

---

### 03. Orders & Shipments ✅
**Purpose:** Core shipping operations - order and shipment lifecycle
**Endpoints:** 13
**Folders:**
- Order Management (6 endpoints): Create, bulk import, list, view, update, cancel
- Shipment Management (7 endpoints): Create, list, view, track (public/private), update status, cancel

**Key Features:**
- ✅ Single & bulk order creation (CSV import)
- ✅ Zone-based rate calculation
- ✅ Wallet balance validation before shipment
- ✅ Public & private tracking endpoints
- ✅ Order lifecycle states (created → processed → shipped → in_transit → delivered)
- ✅ Auto-stores TEST_ORDER_ID, TEST_SHIPMENT_ID, TEST_AWB_NUMBER

**Business Logic:**
- Orders require sufficient wallet balance
- KYC verification required for production shipments
- Shipment creation deducts wallet balance
- Tracking supports both authenticated and public access

---

### 04. Warehouse & Ratecard ✅
**Purpose:** Complete warehouse operations, inventory, picking, packing, and pricing
**Endpoints:** 52
**Folders:**
- Warehouse Management (6 endpoints): CRUD, CSV import
- Inventory Management (14 endpoints): Stock operations, movements, alerts, QC
- Picking Management (13 endpoints): Pick lists, workflows, assignments, stats
- Packing Management (14 endpoints): Stations, sessions, packages, labels
- Ratecard Management (5 endpoints): CRUD, rate calculation

**Key Features:**
- ✅ Multi-warehouse support with capacity tracking
- ✅ Complete inventory lifecycle (receive, adjust, reserve, release, transfer, damage, cycle count)
- ✅ Optimized picking workflows (batch, wave, zone picking)
- ✅ Packing station management with real-time sessions
- ✅ Zone-based pricing (A, B, C, D zones)
- ✅ Weight slab calculations (base + additional)
- ✅ Auto-stores WAREHOUSE_ID, INVENTORY_ID, PICK_LIST_ID, STATION_ID, RATECARD_ID

**Business Logic:**
- Stock reservations prevent overselling
- Pick lists optimize warehouse floor navigation
- Packing includes weight verification to prevent disputes
- Rate calculation: basePrice + (additionalSlabs × additionalPrice)
- Zone determination: A (same city), B (same state), C (metro-metro), D (rest of India)

---

### 05. NDR, RTO & Disputes ✅
**Purpose:** Exception handling - Non-Delivery Reports, Returns, and Weight Disputes
**Endpoints:** 26
**Folders:**
- NDR Management (14 endpoints): Events, resolution, escalation, analytics, workflows, dashboard
- RTO Management (7 endpoints): Tracking, QC, status updates, analytics
- Weight Disputes (5 endpoints): List, details, evidence submission, resolution, metrics

**Key Features:**
- ✅ NDR resolution workflows (reattempt, address correction, RTO initiation)
- ✅ RTO lifecycle tracking (initiated → in_transit → delivered → QC → restocked/damaged)
- ✅ Weight dispute evidence submission with photo/document support
- ✅ Comprehensive analytics (resolution rates, trends, top reasons)
- ✅ Admin approval workflows
- ✅ Auto-stores NDR_EVENT_ID, RTO_EVENT_ID, DISPUTE_ID

**Business Logic:**
- NDR types: customer_unavailable, wrong_address, refused, premises_closed, damaged
- RTO triggers after exhausted NDR attempts
- RTO QC determines if product can be restocked
- Weight disputes compare declared vs carrier-measured weight
- Cooling period (2-7 days) before COD remittance eligibility

---

### 06. Finance & Wallet ✅
**Purpose:** Wallet management and COD remittance system
**Endpoints:** 17
**Folders:**
- Wallet Management (6 endpoints): Balance, transactions, recharge, stats, threshold, refunds
- COD Remittance (11 endpoints): Eligible shipments, batch creation, approvals, payouts, dashboard, webhooks

**Key Features:**
- ✅ Prepaid wallet model for shipping charges
- ✅ Auto-deduction on shipment creation
- ✅ COD collection and periodic settlement
- ✅ Remittance batch creation with automatic deductions (shipping + COD fees + disputes)
- ✅ Admin approval workflow for payouts
- ✅ On-demand and scheduled payout options
- ✅ Velocity/Razorpay integration for settlements
- ✅ Auto-stores TRANSACTION_ID, REMITTANCE_ID

**Business Logic:**
- Wallet recharge via payment gateway (Razorpay)
- Low balance threshold triggers alerts
- COD remittance deductions: shipping charges (2%) + COD collection charges (2%) + RTO + disputes
- Settlement cycle: 2-7 day cooling period
- Payout methods: bank_transfer, UPI
- Refunds for cancelled shipments, weight disputes in seller favor

---

## 🚧 Upcoming Collections (In Development)

### 07. Integrations (Planned)
**Scope:** E-commerce platform integrations (Shopify, Amazon, Flipkart, WooCommerce)
**Estimated Endpoints:** ~60

### 08. Commission System (Planned)
**Scope:** Sales representatives, commission rules, transactions, payouts
**Estimated Endpoints:** ~25

### 09. Communication (Planned)
**Scope:** Email, WhatsApp, notifications, preferences
**Estimated Endpoints:** ~15

### 10. System & Admin (Planned)
**Scope:** Audit logs, analytics, onboarding, webhooks
**Estimated Endpoints:** ~30+

---

## 🔧 Environment Variables

### Core Configuration
```javascript
BASE_URL             // API base URL (default: http://localhost:5005/api/v1)
NODE_ENV             // Environment (development | staging | production)
```

### Authentication Variables (Auto-Managed)
```javascript
ACCESS_TOKEN         // JWT access token (auto-refreshed on 401)
REFRESH_TOKEN        // JWT refresh token (stored on login)
TOKEN_EXPIRY         // Token expiry timestamp (auto-calculated)
CSRF_TOKEN           // CSRF token for state-changing operations (auto-fetched)
```

### User & Company Context (Auto-Stored)
```javascript
USER_ID              // Current authenticated user ID
COMPANY_ID           // Current company ID (multi-tenancy)
USER_ROLE            // User role (seller | admin | staff)
TEAM_ROLE            // Team role (owner | admin | member)
```

### Collection 01: Authentication Variables
```javascript
TEST_EMAIL           // Test account email (test.seller@shipcrowd.com)
TEST_PASSWORD        // Test account password
TEST_PHONE           // Test phone number (+919876543210)
```

### Collection 02: Company & KYC Variables
```javascript
TEAM_MEMBER_ID       // Team member ID for invite testing
INVITATION_ID        // Team invitation ID
```

### Collection 03: Orders & Shipments Variables
```javascript
TEST_ORDER_ID        // Order ID (auto-stored on creation)
TEST_SHIPMENT_ID     // Shipment ID (auto-stored on creation)
TEST_AWB_NUMBER      // AWB tracking number (auto-stored)
TEST_PINCODE_ORIGIN  // Origin pincode (560001 - Bangalore)
TEST_PINCODE_DEST    // Destination pincode (400001 - Mumbai)
TEST_PINCODE_REMOTE  // Remote area pincode (791001 - Arunachal)
TEST_SKU             // Product SKU (PROD-12345)
TEST_CUSTOMER_NAME   // Test customer name (John Doe)
TEST_CUSTOMER_PHONE  // Test customer phone
TEST_CUSTOMER_EMAIL  // Test customer email
TEST_ADDRESS_LINE1   // Test address line 1
TEST_ADDRESS_CITY    // Test city (Mumbai)
TEST_ADDRESS_STATE   // Test state (Maharashtra)
TEST_CARRIER         // Test carrier (Delhivery)
TEST_SERVICE_TYPE    // Service type (standard | express | surface)
```

### Collection 04: Warehouse & Ratecard Variables
```javascript
WAREHOUSE_ID         // Warehouse ID (auto-stored on creation)
INVENTORY_ID         // Inventory item ID (auto-stored)
PICK_LIST_ID         // Pick list ID (auto-stored)
STATION_ID           // Packing station ID (auto-stored)
RATECARD_ID          // Ratecard ID (auto-stored)
PACKAGE_NUMBER       // Package number (default: 1)
PACKING_SESSION_ID   // Active packing session ID
INVENTORY_ITEM_ID    // Legacy inventory item ID
PACK_TASK_ID         // Legacy packing task ID
```

### Collection 05: NDR, RTO & Disputes Variables
```javascript
NDR_EVENT_ID         // NDR event ID (auto-stored)
RTO_EVENT_ID         // RTO event ID (auto-stored)
DISPUTE_ID           // Weight dispute ID (auto-stored)
WEIGHT_DISPUTE_ID    // Legacy dispute ID (same as DISPUTE_ID)
```

### Collection 06: Finance & Wallet Variables
```javascript
TRANSACTION_ID       // Wallet transaction ID (auto-stored)
REMITTANCE_ID        // COD remittance batch ID (auto-stored)
WALLET_BALANCE       // Current wallet balance (auto-updated)
LOW_BALANCE_THRESHOLD // Balance alert threshold (default: 5000)
COD_SHIPMENT_ID      // COD shipment for remittance testing
PAYOUT_ID            // Payout ID for commission/remittance
```

### Integration Variables (For Future Collections)
```javascript
// Shopify
SHOPIFY_STORE_URL         // Shopify store URL
SHOPIFY_ACCESS_TOKEN      // Shopify API access token (secret)
SHOPIFY_INTEGRATION_ID    // Integration record ID

// WooCommerce
WOOCOMMERCE_STORE_URL     // WooCommerce store URL
WOOCOMMERCE_CONSUMER_KEY  // WooCommerce API key (secret)
WOOCOMMERCE_CONSUMER_SECRET // WooCommerce API secret (secret)

// Amazon
AMAZON_SELLER_ID          // Amazon seller ID
AMAZON_MARKETPLACE_ID     // Amazon marketplace (A21TJRUUN4KGV for India)
AMAZON_ACCESS_TOKEN       // Amazon SP-API token (secret)

// Flipkart
FLIPKART_TOKEN            // Flipkart API token (secret)
FLIPKART_INTEGRATION_ID   // Integration record ID
```

### Commission System Variables (For Future Collection)
```javascript
SALES_REP_ID         // Sales representative ID
COMMISSION_RULE_ID   // Commission rule ID
```

### Communication Variables (For Future Collection)
```javascript
NOTIFICATION_ID      // In-app notification ID
```

### System Variables (For Future Collection)
```javascript
WEBHOOK_EVENT_ID     // Webhook event ID
ZONE_ID              // Zone ID for rate calculations
SHIPMENT_MANIFEST_ID // Manifest ID for bulk operations
```

### Variable Naming Convention
- **Auto-Stored:** Variables automatically populated by test scripts (e.g., ORDER_ID, SHIPMENT_ID)
- **Auto-Managed:** Variables managed by pre-request/test scripts (e.g., ACCESS_TOKEN, CSRF_TOKEN)
- **User-Configured:** Variables you need to set manually (e.g., BASE_URL, TEST_EMAIL)
- **Secret Type:** Sensitive data (passwords, API keys) - marked as "secret" type in Postman

---

## 🧪 Testing Methodology

### 1. Pre-Request Scripts
All collections use shared pre-request scripts for:
- **Auto Token Refresh:** Automatically refresh expired tokens
- **CSRF Token Management:** Fetch CSRF token when needed
- **Environment Setup:** Set dynamic variables

### 2. Test Assertions
Every request includes comprehensive tests:
- **Status Code Validation:** `pm.test('Status code is 200')`
- **Response Structure:** Validate JSON schema
- **Business Logic:** Verify data integrity
- **Performance:** Check response time < 5s
- **Security:** Validate authorization

### 3. Test Scripts Example
```javascript
// Standard test pattern used across collections
pm.test('Successful response', function () {
    pm.response.to.have.status(200);
    const json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data).to.exist;
});

pm.test('Response time acceptable', function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});
```

---

## 📖 Best Practices

### Collection Organization
✅ **DO:**
- Keep collections domain-focused
- Use descriptive folder names
- Include comprehensive descriptions
- Add examples for all requests

❌ **DON'T:**
- Mix unrelated endpoints
- Create overly nested folders
- Skip documentation
- Use hardcoded values

### Variable Management
✅ **DO:**
- Use environment variables for dynamic data
- Auto-update tokens in post-response scripts
- Document all variables
- Use meaningful variable names

❌ **DON'T:**
- Hardcode sensitive data
- Use global variables for test-specific data
- Leave expired tokens

### Testing
✅ **DO:**
- Test happy path and edge cases
- Validate both success and error responses
- Check authorization for protected endpoints
- Test rate limiting

❌ **DON'T:**
- Skip negative test cases
- Ignore error responses
- Test only with admin roles

---

## 🔐 Security

### Sensitive Data
- **Never commit** `.postman_environment.json` with real credentials
- Use **environment-specific** files (local, staging, production)
- **Rotate tokens** regularly
- **Use separate** test accounts

### Token Management
- Access tokens auto-refresh before expiry
- Refresh tokens stored securely in environment
- CSRF tokens fetched on-demand
- All tokens cleared on logout

---

## 🛠️ Troubleshooting

### Issue: Token Expired
**Solution:** 
1. Run "Get CSRF Token" request
2. Run "Login" request
3. Retry your request

### Issue: CSRF Token Missing
**Solution:**
1. Ensure pre-request script is enabled
2. Manually run "Get CSRF Token"
3. Check `CSRF_TOKEN` environment variable

### Issue: 401 Unauthorized
**Solution:**
1. Verify `ACCESS_TOKEN` is set
2. Check token hasn't expired
3. Ensure user has proper permissions

### Issue: 403 Forbidden
**Solution:**
1. Check user role (admin, seller, staff)
2. Verify company status (not suspended)
3. Confirm KYC approval for shipping operations

---

## 📝 Contributing

When adding new endpoints:
1. **Choose correct collection** based on domain
2. **Follow naming convention:** `[HTTP Method] [Endpoint Name]`
3. **Add comprehensive description**
4. **Include test scripts**
5. **Update this README** if adding new collection
6. **Document new variables** in environment file

---

## 📞 Support

- **Documentation:** See `SETUP-GUIDE.md` and `TESTING-GUIDE.md`
- **API Reference:** Check OpenAPI spec at `server/openapi.json`
- **Issues:** Report bugs in GitHub issues

---

## 📄 License

Internal use only - ShipCrowd Platform

---

**Last Updated:** 2026-01-13
**Maintained By:** Development Team
**Version:** 2.0.0
**Status:** Active Development (6/10 collections complete)
