# Velocity Shipfast Testing Scripts

This directory contains comprehensive testing scripts for the Velocity Shipfast integration.

---

## 📋 Available Scripts

### 1. Live API Testing

**File**: `testVelocityLive.ts`

**Purpose**: Test all Velocity API endpoints with live credentials

**Usage**:
```bash
npm run test:velocity:live
```

**What it tests**:
- ✅ Authentication (token generation)
- ✅ Serviceability check (pincode availability)
- ✅ Rate calculation (multi-carrier pricing)
- ✅ Shipment creation (end-to-end)
- ✅ Tracking (AWB tracking)
- ✅ Cancellation (shipment cancellation)

**Sample Output**:
```
╔════════════════════════════════════════════╗
║  Velocity Shipfast Live API Testing       ║
╚════════════════════════════════════════════╝

✓ Connected to MongoDB
✓ Using existing integration

━━━ Test 1: Authentication ━━━
✓ Authentication successful
  Token: eyJhbGciOiJIUzI1NiIsInR5...
  Duration: 245ms

━━━ Test 2: Serviceability Check ━━━
✓ Serviceability check successful
  Available: true
  Estimated Days: 3
  Duration: 312ms

━━━ Test 3: Rate Calculation ━━━
✓ Rate calculation successful
  Available carriers: 3
  1. BlueDart: ₹50 (2 days)
  2. DTDC: ₹60 (3 days)
  3. Delhivery: ₹70 (4 days)
  Duration: 298ms

━━━ Test 4: Create Shipment (DRY RUN) ━━━
✓ Shipment created successfully
  AWB: VEL123456789
  Tracking Number: TEST-1735308625789
  Carrier: BlueDart
  Label URL: https://...
  Duration: 523ms

━━━ Test 5: Track Shipment ━━━
✓ Tracking successful
  Status: created
  Events: 1
  Duration: 287ms

━━━ Test 6: Cancel Shipment ━━━
✓ Cancellation successful
  Duration: 234ms

╔════════════════════════════════════════════╗
║  Test Summary                              ║
╚════════════════════════════════════════════╝

Total Tests: 6
Passed: 6
Failed: 0
Success Rate: 100.0%

✓ All tests passed! Velocity integration is working correctly.
```

**Requirements**:
- MongoDB running
- Velocity credentials in environment variables
- Internet connection

---

### 2. Webhook Testing

**File**: `testWebhookLocal.ts`

**Purpose**: Test webhook endpoints locally with signature verification

**Usage**:
```bash
# Local testing
npm run test:webhook:local

# With ngrok
export WEBHOOK_TEST_URL=https://your-ngrok-url.ngrok.io
npm run test:webhook:local
```

**What it tests**:
- ✅ Health check endpoint
- ✅ Status update webhooks (PKP, IT, OFD, DEL, NDR)
- ✅ HMAC-SHA256 signature verification
- ✅ Invalid signature rejection
- ✅ Replay attack prevention (old timestamps)

**Sample Output**:
```
╔════════════════════════════════════════════╗
║  Velocity Webhook Local Testing           ║
╚════════════════════════════════════════════╝

Webhook URL: http://localhost:5000/api/v1/webhooks/velocity
Webhook Secret: default-web...

━━━ Test 1: Health Check ━━━
✓ Health check passed

━━━ Test 2: Status Update (Picked Up) ━━━
✓ Status Update - Picked Up
  Status: 200
  Duration: 45ms

━━━ Test 3: Status Update (In Transit) ━━━
✓ Status Update - In Transit
  Status: 200
  Duration: 38ms

━━━ Test 4: Status Update (Delivered) ━━━
✓ Status Update - Delivered
  Status: 200
  Duration: 52ms

━━━ Test 5: Status Update (NDR) ━━━
✓ Status Update - NDR
  Status: 200
  Duration: 41ms

━━━ Test 6: Invalid Signature (Should Fail) ━━━
✓ Invalid signature correctly rejected (401)

━━━ Test 7: Old Timestamp (Should Fail) ━━━
✓ Old timestamp correctly rejected (401)

╔════════════════════════════════════════════╗
║  Test Summary                              ║
╚════════════════════════════════════════════╝

Total Tests: 7
Passed: 7
Failed: 0
Success Rate: 100.0%

✓ All webhook tests passed!
```

**Requirements**:
- Application server running (port 5000)
- Webhook secret configured
- ngrok (optional, for external testing)

---

### 3. Integration Seeding

**File**: `seedVelocityIntegration.ts`

**Purpose**: Seed Velocity integration with credentials

**Usage**:
```bash
npm run seed:velocity
```

**What it does**:
- Creates Velocity Shipfast integration in database
- Configures credentials from environment variables
- Sets up test mode or production mode

**Requirements**:
- MongoDB running
- Velocity credentials in environment variables

---

## 🔧 Environment Variables

All scripts require these environment variables:

```bash
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/shipcrowd-test

# Velocity API Credentials
VELOCITY_USERNAME=+918860606061
VELOCITY_PASSWORD=Velocity@123

# Webhook Security (for webhook testing)
VELOCITY_WEBHOOK_SECRET=your-webhook-secret-here

# Webhook URL (optional, for external testing)
WEBHOOK_TEST_URL=https://your-ngrok-url.ngrok.io
```

---

## 📊 Test Results Interpretation

### Success Indicators

**Live API Tests**:
- ✅ All 6 tests passing
- ✅ Average latency < 500ms
- ✅ Success rate 100%

**Webhook Tests**:
- ✅ All 7 tests passing
- ✅ Security tests rejecting invalid requests
- ✅ Valid webhooks processing successfully

### Common Issues

**Live API Tests Failing**:
1. Check internet connection
2. Verify Velocity credentials
3. Check MongoDB connection
4. Review Velocity API status

**Webhook Tests Failing**:
1. Ensure application server is running
2. Verify webhook secret matches
3. Check port 5000 is available
4. Review application logs

---

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Velocity Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:latest
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run live API tests
        env:
          MONGO_URI: mongodb://localhost:27017/shipcrowd-test
          VELOCITY_USERNAME: ${{ secrets.VELOCITY_USERNAME }}
          VELOCITY_PASSWORD: ${{ secrets.VELOCITY_PASSWORD }}
        run: npm run test:velocity:live

      - name: Start server
        run: npm run dev &

      - name: Wait for server
        run: npx wait-on http://localhost:5000/health

      - name: Run webhook tests
        env:
          VELOCITY_WEBHOOK_SECRET: ${{ secrets.VELOCITY_WEBHOOK_SECRET }}
        run: npm run test:webhook:local
```

---

## 📖 Additional Resources

- [Live API Testing Documentation](../../../docs/Development/Backend/Report/WEEK_4_COMPLETION_REPORT.md)
- [Webhook Testing Guide](../../../docs/Development/Backend/WEBHOOK_MONITORING_SETUP.md)
- [Production Deployment Checklist](../../../docs/Development/Backend/Parallel/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Integration Documentation](../../../docs/Development/Backend/Integrations/VELOCITY_SHIPFAST_INTEGRATION.md)

---

## 🆘 Troubleshooting

### Script won't run

```bash
# Make sure TypeScript is compiled
npm run build

# Or use tsx directly
npx tsx src/scripts/testVelocityLive.ts
```

### MongoDB connection errors

```bash
# Check if MongoDB is running
mongosh

# Or use Docker
docker run -d -p 27017:27017 mongo:latest
```

### Webhook tests timing out

```bash
# Check if server is running
curl http://localhost:5000/health

# Start server in development mode
npm run dev
```

---

**Last Updated**: December 27, 2025
**Maintainer**: Shipcrowd Backend Team
