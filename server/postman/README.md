# ShipCrowd API Testing - Postman Collections

**Professional API testing infrastructure for ShipCrowd platform**

## 📋 Overview

This directory contains a comprehensive, production-grade Postman testing suite for the ShipCrowd backend API. The collections are organized by business domain, following industry best practices for API testing, documentation, and maintenance.

**Total Endpoints:** 385+ across 45 route files  
**Collections:** 10 domain-specific collections  
**Environment:** 1 unified environment file  
**Version:** 1.0.0

---

## 🏗️ Architecture

### Domain-Driven Organization

Our Postman collections follow a **domain-driven design** where each collection represents a distinct business domain:

```
postman/
├── README.md (this file)
├── SETUP-GUIDE.md (detailed setup instructions)
├── TESTING-GUIDE.md (testing methodology)
├── environments/
│   └── shipcrowd.postman_environment.json (unified environment)
├── collections/
│   ├── 01-Authentication-Identity.postman_collection.json
│   ├── 02-Organization-Management.postman_collection.json
│   ├── 03-Order-Shipment.postman_collection.json
│   ├── 04-Operations-NDR-RTO.postman_collection.json
│   ├── 05-Warehouse-Management.postman_collection.json
│   ├── 06-Marketplace-Integrations.postman_collection.json
│   ├── 07-Financial-Operations.postman_collection.json
│   ├── 08-Communications.postman_collection.json
│   ├── 09-Analytics-Reporting.postman_collection.json
│   └── 10-Webhooks.postman_collection.json
└── scripts/
    ├── pre-request-scripts.js (reusable pre-request scripts)
    └── test-scripts.js (reusable test assertions)
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

### 01. Authentication & Identity
**Purpose:** User authentication, session management, OAuth, profile operations  
**Endpoints:** 21  
**Use Cases:**
- User registration & email verification
- Login (email/password, OAuth, magic link)
- Token management (refresh, revoke)
- Password operations (reset, change)
- Session management
- Profile updates

**Key Features:**
- Automatic token refresh
- CSRF protection
- Rate limiting tests

---

### 02. Organization Management
**Purpose:** Company setup, KYC verification, team management  
**Endpoints:** 38  
**Use Cases:**
- Company profile management
- KYC document submission & verification
- Team member invitations
- Role & permission management
- Multi-tenancy testing

**Key Features:**
- Company isolation testing
- Role-based access control
- KYC workflow simulation

---

### 03. Order & Shipment
**Purpose:** Core shipping operations, order lifecycle  
**Endpoints:** 13  
**Use Cases:**
- Order creation (single & bulk)
- Rate calculation
- Shipment creation
- Manifest generation
- Tracking updates
- Label generation

**Key Features:**
- Zone-based pricing tests
- Wallet balance validation
- Courier selection

---

### 04. Operations - NDR, RTO, Disputes
**Purpose:** Exception handling, NDR/RTO management, weight disputes  
**Endpoints:** 26  
**Use Cases:**
- NDR detection & resolution
- RTO initiation & QC
- Weight discrepancy handling
- Automated escalation

**Key Features:**
- Webhook simulation
- Financial impact tracking
- Analytics validation

---

### 05. Warehouse Management
**Purpose:** Warehouse operations, picking, packing, inventory  
**Endpoints:** 46  
**Use Cases:**
- Pick list generation (batch, wave, zone)
- Packing workflows
- Inventory tracking
- Stock movements
- Location management

**Key Features:**
- Multi-strategy picking tests
- Inventory audit trail
- Replenishment automation

---

### 06. Marketplace Integrations
**Purpose:** E-commerce platform integrations  
**Endpoints:** 50  
**Use Cases:**
- Shopify OAuth & webhooks
- WooCommerce API integration
- Amazon SP-API
- Flipkart integration
- Product mapping
- Inventory sync

**Key Features:**
- Webhook signature validation
- OAuth flow testing
- Duplicate prevention
- Order sync validation

---

### 07. Financial Operations
**Purpose:** Commission, payouts, sales management  
**Endpoints:** 33  
**Use Cases:**
- Sales representative management
- Commission calculation
- Payout processing
- Transaction tracking

**Key Features:**
- Commission rule testing
- Automated payout validation
- Referral tracking

---

### 08. Communications
**Purpose:** Email, WhatsApp, SMS, notifications  
**Endpoints:** 13  
**Use Cases:**
- Email templates
- WhatsApp messages
- In-app notifications
- Preference management

**Key Features:**
- Delivery tracking
- Template rendering
- Multi-channel testing

---

### 09. Analytics & Reporting
**Purpose:** Business intelligence, dashboards, reports  
**Endpoints:** 20  
**Use Cases:**
- System-wide analytics
- Seller performance metrics
- Custom reports
- Data exports

**Key Features:**
- Date range filtering
- Export format testing
- Metric accuracy validation

---

### 10. Webhooks
**Purpose:** External webhook handling  
**Endpoints:** 24  
**Use Cases:**
- Velocity status updates
- Shopify order sync
- Flipkart lifecycle events
- WooCommerce webhooks

**Key Features:**
- Signature verification
- Retry mechanism testing
- Duplicate prevention
- Queue management

---

## 🔧 Environment Variables

### Authentication Variables
```javascript
ACCESS_TOKEN          // JWT access token (auto-managed)
REFRESH_TOKEN         // JWT refresh token (auto-managed)
ACCESS_TOKEN_EXPIRY   // Token expiry timestamp (auto-managed)
CSRF_TOKEN           // CSRF token (auto-refreshed)
```

### User & Company Variables
```javascript
USER_ID              // Current user ID
COMPANY_ID           // Current company ID
WAREHOUSE_ID         // Default warehouse ID
TEAM_MEMBER_ID       // Team member ID for testing
```

### Test Data Variables
```javascript
TEST_ORDER_ID        // Sample order ID
TEST_SHIPMENT_ID     // Sample shipment ID
TEST_AWB_NUMBER      // Sample AWB tracking number
TEST_PINCODE_ORIGIN  // Test origin pincode (560001)
TEST_PINCODE_DEST    // Test destination pincode (400001)
```

### Integration Variables
```javascript
SHOPIFY_STORE_URL    // Test Shopify store
SHOPIFY_ACCESS_TOKEN // Shopify API token
AMAZON_SELLER_ID     // Amazon seller ID
FLIPKART_TOKEN       // Flipkart access token
```

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

**Last Updated:** 2026-01-10  
**Maintained By:** Development Team  
**Version:** 1.0.0
