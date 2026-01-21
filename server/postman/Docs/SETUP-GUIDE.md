# Helix Postman Setup Guide

Complete guide for setting up and using the Helix API testing infrastructure.

---

## 📦 Prerequisites

1. **Postman Desktop App** (Recommended)
   - Download: https://www.postman.com/downloads/
   - Version: 10.x or later
   
2. **Helix Backend Server**
   - Running locally on `http://localhost:5005`
   - Or access to staging/production environment

3. **Test Database**
   - MongoDB with seeded test data
   - Run: `npm run seed:clean` from `/server` directory

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Import Environment

1. Open Postman Desktop
2. Click **Environments** (left sidebar)
3. Click **Import** button
4. Navigate to: `server/postman/environments/`
5. Select `Helix.postman_environment.json`
6. Click **Import**
7. **Activate** the environment (checkmark icon)

### Step 2: Import Collections

**Option A: Import All Collections**
1. Click **Import** (top left)
2. Navigate to: `server/postman/collections/`
3. Select **all** `.postman_collection.json` files (Cmd+A / Ctrl+A)
4. Click **Open**
5. All 10 collections will be imported

**Option B: Import Individual Collections**
- Import only the collections you need for your current testing focus

### Step 3: Verify Setup

1. Select `01-Authentication-Identity` collection
2. Open **1. Setup & Health** folder
3. Run **Health Check** request
4. Should return `200 OK` with server info

✅ **Setup Complete!** You're ready to start testing.

---

## 🔧 Detailed Configuration

### Environment Variables Explained

#### Server Configuration
```javascript
BASE_URL: http://localhost:5005/api/v1
// Change to staging/production URL as needed
// Staging: https://api-staging.Helix.com/api/v1
// Production: https://api.Helix.com/api/v1

NODE_ENV: development
// Options: development | staging | production
```

#### Authentication (Auto-Managed)
```javascript
ACCESS_TOKEN: <auto-populated on login>
// JWT access token, expires in 15 minutes
// Auto-refreshed by pre-request script

REFRESH_TOKEN: <auto-populated on login>
// Refresh token, expires in 7-30 days
// Used to generate new access tokens

ACCESS_TOKEN_EXPIRY: <auto-populated>
// Timestamp when access token expires
// Used by auto-refresh logic

CSRF_TOKEN: <auto-populated>
// CSRF protection token
// Required for POST/PUT/PATCH/DELETE on auth routes
```

#### User Context (Set After Login)
```javascript
USER_ID: <your user ID>
COMPANY_ID: <your company ID>
WAREHOUSE_ID: <your default warehouse ID>

USER_ROLE: seller
// Options: admin | seller | staff

TEAM_ROLE: owner
// Options: owner | admin | manager | member | viewer
```

#### Test Data IDs
```javascript
TEST_ORDER_ID: <sample order ID>
TEST_SHIPMENT_ID: <sample shipment ID>
TEST_AWB_NUMBER: <sample tracking number>
TEST_PRODUCT_SKU: <sample product SKU>
```

#### Test Locations
```javascript
TEST_PINCODE_ORIGIN: 560001
// Bangalore - for rate calculation tests

TEST_PINCODE_DEST: 400001
// Mumbai - for rate calculation tests

TEST_PINCODE_REMOTE: 791001
// Arunachal Pradesh - for Zone D testing
```

#### Integration Credentials (Optional)
```javascript
SHOPIFY_STORE_URL: <your-store.myshopify.com>
SHOPIFY_ACCESS_TOKEN: <your shopify token>

AMAZON_SELLER_ID: <your seller ID>
AMAZON_MARKETPLACE_ID: A21TJRUUN4KGV
// India marketplace

FLIPKART_TOKEN: <your flipkart token>
```

---

## 🔐 Authentication Flow

### Initial Setup (First Time)

**Run these requests in order:**

1. **Get CSRF Token** (Collection 01, folder "Setup & Health")
   ```
   GET /auth/csrf-token
   ```
   - Stores CSRF token in environment
   - Required for registration and login

2. **Register New User** (Collection 01, folder "Registration")
   ```
   POST /auth/register
   ```
   - Creates new test account
   - Update email/password in request body
   - Email verification link sent (check console logs in dev mode)

3. **Login** (Collection 01, folder "Login & Sessions")
   ```
   POST /auth/login
   ```
   - Returns access and refresh tokens
   - Tokens automatically stored in environment
   - User and company IDs auto-populated

4. **Get Current User** (Collection 01, folder "Profile")
   ```
   GET /auth/me
   ```
   - Verifies authentication works
   - Returns user profile with role info

### Automatic Token Refresh

**Every collection includes a pre-request script that:**
1. Checks if access token is expired
2. Automatically calls `/auth/refresh` if needed
3. Updates `ACCESS_TOKEN` with new token
4. Updates `ACCESS_TOKEN_EXPIRY` timestamp

**You don't need to manually refresh tokens!**

### Manual Token Refresh

If you need to manually refresh:
1. Run **Refresh Token** request (Collection 01)
2. New access token stored automatically

### Logout

To invalidate your current session:
1. Run **Logout** request (Collection 01)
2. Token is blacklisted on server
3. You'll need to login again

---

## 📋 Testing Workflows

### Workflow 1: Complete Order Lifecycle

**Collections needed:** 01, 02, 03, 04

1. **Setup** (Collection 01 & 02)
   - Login as seller
   - Verify company KYC approved
   - Create/select warehouse

2. **Create Order** (Collection 03)
   - Calculate shipping rate
   - Create single order
   - Generate shipping label

3. **Process Shipment** (Collection 03)
   - Create manifest
   - Request pickup
   - Track shipment status

4. **Handle Exceptions** (Collection 04)
   - Simulate NDR (if delivery fails)
   - Resolve NDR or trigger RTO
   - Handle weight disputes

### Workflow 2: Marketplace Integration Testing

**Collections needed:** 01, 02, 06

1. **Setup OAuth** (Collection 06)
   - Initiate OAuth flow (Shopify/Flipkart)
   - Handle callback
   - Store integration credentials

2. **Register Webhooks** (Collection 06)
   - Register required webhooks
   - Verify webhook signatures

3. **Test Order Sync** (Collections 06 & 10)
   - Simulate webhook: order created
   - Verify order created in Helix
   - Update fulfillment status

### Workflow 3: Team Management

**Collections needed:** 01, 02

1. **Invite Team Member** (Collection 02)
   - Send invitation
   - Accept invitation (use different environment)
   - Verify role assigned

2. **Test Permissions** (Collection 02)
   - Login as team member
   - Test role-based access
   - Verify permission enforcement

---

## 🧪 Test Scripts Explained

### Standard Test Pattern

Every request includes these tests:

```javascript
// 1. Status Code Check
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

// 2. Response Structure
pm.test('Response has correct structure', function () {
    const json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data).to.exist;
});

// 3. Response Time
pm.test('Response time acceptable', function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});

// 4. Business Logic (varies per endpoint)
pm.test('Business rule validated', function () {
    const json = pm.response.json();
    // Specific validation here
});
```

### Auto-Storing Variables

Many requests automatically store response data:

```javascript
pm.test('Store order ID', function () {
    const json = pm.response.json();
    pm.environment.set('TEST_ORDER_ID', json.data.order.id);
    console.log('Order ID stored:', json.data.order.id);
});
```

### Error Handling

Error tests validate proper error responses:

```javascript
pm.test('Returns 400 for invalid data', function () {
    pm.response.to.have.status(400);
    const json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error.message).to.exist;
});
```

---

## 🎯 Testing by Role

### Admin Role Testing

**Capabilities:**
- Access all companies
- System-wide analytics
- Manage all resources

**Test Collections:**
- All collections (full access)

### Seller Role Testing

**Capabilities:**
- Access own company only
- Create orders and shipments
- Manage team (if owner/admin)

**Test Collections:**
- 01, 02, 03, 04, 05, 06, 07, 08, 09

**Role Variations:**
- Owner: Full company access
- Admin: Almost full (can't delete company)
- Manager: Operational permissions
- Member: Basic CRUD
- Viewer: Read-only

### Staff Role Testing

**Capabilities:**
- Warehouse operations only
- Limited to assigned warehouse

**Test Collections:**
- 05 (Warehouse Management)

---

## 🐛 Troubleshooting

### Issue: "401 Unauthorized"

**Causes:**
- Access token expired
- Token not stored
- User not authenticated

**Solutions:**
1. Check `ACCESS_TOKEN` environment variable exists
2. Run **Login** request again
3. Verify token expiry: `{{ACCESS_TOKEN_EXPIRY}}`

---

### Issue: "403 Forbidden"

**Causes:**
- Insufficient permissions
- Company suspended
- KYC not approved
- Wrong role for operation

**Solutions:**
1. Check user role: `{{USER_ROLE}}`
2. Verify company status (Collection 02)
3. Check KYC status (Collection 02)
4. Review permission requirements in request description

---

### Issue: "CSRF Token Missing"

**Causes:**
- CSRF token not fetched
- Token expired
- Working with auth routes

**Solutions:**
1. Run **Get CSRF Token** request
2. Verify `CSRF_TOKEN` environment variable
3. Check `X-CSRF-Token` header included in request

---

### Issue: "Rate Limit Exceeded"

**Causes:**
- Too many requests in short time
- Testing login endpoint repeatedly

**Solutions:**
1. Wait 15 minutes for rate limit reset
2. Set `NODE_ENV=test` in server to disable rate limits
3. Use different test account

---

### Issue: "Environment Variable Not Found"

**Causes:**
- Variable not set
- Wrong environment selected
- Variable name typo

**Solutions:**
1. Verify correct environment is active (checkmark)
2. Check variable name spelling: `{{EXACT_NAME}}`
3. Run prerequisite requests to populate variable

---

### Issue: "Webhook Signature Validation Failed"

**Causes:**
- Wrong webhook secret
- Signature calculation incorrect
- Using ngrok URL locally

**Solutions:**
1. Check webhook secret in environment
2. For local testing: Use ngrok for public URL
3. Disable signature verification in dev: `BYPASS_WEBHOOK_VERIFICATION=true`

---

### Issue: "Cannot Create Order - Insufficient Balance"

**Causes:**
- Wallet balance too low
- No test wallet created

**Solutions:**
1. Check wallet balance (Collection 02)
2. Use admin account to add balance
3. Run seed script: `npm run seed:wallets`

---

## 📊 Running Tests in Collection Runner

### Run Entire Collection

1. Right-click collection name
2. Select **Run collection**
3. Configure:
   - Iterations: 1
   - Delay: 100ms (between requests)
   - Data file: None (unless bulk testing)
4. Click **Run**

### Run Specific Folder

1. Right-click folder name
2. Select **Run folder**
3. Same configuration as above

### Bulk Testing with CSV

1. Prepare CSV file with test data
2. Collection Runner → Select collection
3. **Data** → Select CSV file
4. Requests will run once per CSV row

**Example CSV for order creation:**
```csv
originPin,destPin,weight,codAmount
560001,400001,1.5,1000
560002,110001,2.0,1500
560003,700001,0.5,500
```

---

## 🔄 Continuous Integration

### Newman (CLI Runner)

Run collections from command line:

```bash
# Install Newman
npm install -g newman

# Run single collection
newman run postman/collections/01-Authentication-Identity.postman_collection.json \
  --environment postman/environments/Helix.postman_environment.json

# Run with reporters
newman run postman/collections/01-Authentication-Identity.postman_collection.json \
  --environment postman/environments/Helix.postman_environment.json \
  --reporters cli,json,html \
  --reporter-html-export newman-report.html

# Run all collections
for file in postman/collections/*.json; do
  newman run "$file" \
    --environment postman/environments/Helix.postman_environment.json
done
```

### GitHub Actions

Create `.github/workflows/api-tests.yml`:

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install Newman
        run: npm install -g newman
      - name: Run API Tests
        run: |
          newman run server/postman/collections/01-Authentication-Identity.postman_collection.json \
            --environment server/postman/environments/Helix.postman_environment.json
```

---

## 📝 Best Practices

### ✅ DO:
- Always select correct environment before testing
- Run prerequisite requests (login, CSRF) first
- Review request documentation before running
- Check environment variables after each request
- Use Collection Runner for regression testing
- Clear sensitive data from environment before committing

### ❌ DON'T:
- Hardcode credentials in requests
- Skip authentication flows
- Test production with fake data
- Commit environment files with real tokens
- Run destructive operations without backup
- Disable security features in production

---

## 🎓 Advanced Topics

### Custom Pre-Request Scripts

Add custom logic before requests:

```javascript
// Generate random email for testing
const randomEmail = `test.${Date.now()}@Helix.com`;
pm.environment.set('RANDOM_EMAIL', randomEmail);

// Calculate dynamic dates
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
pm.environment.set('TOMORROW', tomorrow.toISOString());
```

### Custom Test Scripts

Add advanced assertions:

```javascript
// Validate array length
pm.test('Returns multiple items', function () {
    const json = pm.response.json();
    pm.expect(json.data.items).to.have.lengthOf.at.least(1);
});

// Validate nested objects
pm.test('Has valid address', function () {
    const json = pm.response.json();
    pm.expect(json.data.address.pincode).to.match(/^\d{6}$/);
});

// Chain requests
pm.test('Store and use order ID', function () {
    const orderId = pm.response.json().data.order.id;
    pm.environment.set('LAST_ORDER_ID', orderId);
    
    // Next request can use {{LAST_ORDER_ID}}
});
```

### Mock Servers

Create mock server for frontend development:

1. Select collection
2. Click **"..."** menu → **Mock Collection**
3. Configure mock server
4. Share mock URL with frontend team

---

## 📚 Additional Resources

- **API Documentation:** `/server/openapi.json` (OpenAPI 3.0 spec)
- **Postman Learning:** https://learning.postman.com/
- **Testing Guide:** See `TESTING-GUIDE.md`
- **Newman Docs:** https://learning.postman.com/docs/running-collections/using-newman-cli/

---

**Need Help?** Check the troubleshooting section or contact the development team.

**Last Updated:** 2026-01-10  
**Version:** 1.0.0
