# Delhivery B2C Integration - Workflows and Testing Guide

**Owner:** Shipcrowd Backend  
**Scope:** Delhivery B2C courier integration (forward + reverse)  
**Last Updated:** 2026-02-05  
**Base URLs:**  
`https://staging-express.delhivery.com` (staging)  
`https://track.delhivery.com` (production)

---

## 1. What This Guide Covers

This document provides a feature-by-feature, workflow-by-workflow testing plan for the Delhivery B2C integration in Shipcrowd. It includes:

- End-to-end workflows across serviceability, rating, shipment creation, labels, tracking, manifests, pickups, NDR, webhooks, POD, and reverse shipments.
- Automated test coverage (unit + integration).
- Manual and advanced QA checklists with expected outcomes.

---

## 2. Environment and Credentials

### 2.1 Test Database (Important)

Shipcrowd automated tests clear MongoDB collections between test cases. Use a dedicated **test** database.

Recommended:
```bash
export MONGODB_URI=mongodb://localhost:27017/shipcrowd_test
```

If you intentionally want to run tests against a non-test DB (not recommended), you must set:
```bash
export ALLOW_TEST_DB_WIPE=true
```

**Required Environment Variables**

| Variable | Purpose | Required |
| --- | --- | --- |
| `DELHIVERY_API_TOKEN` | Static API token (staging or production) | Yes |
| `DELHIVERY_BASE_URL` | Delhivery API base URL | Yes |
| `DELHIVERY_CLIENT_NAME` | Registered client name at Delhivery | Yes |
| `DELHIVERY_WEBHOOK_TOKEN` | Shared secret for webhook auth | Recommended |
| `DELHIVERY_WEBHOOK_ALLOWED_IPS` | Comma-separated IPs for webhook allowlist | Optional |

**Test-Only Variables**

| Variable | Purpose |
| --- | --- |
| `RUN_DELHIVERY_LIVE=true` | Enables live integration tests |
| `DELHIVERY_TEST_ORIGIN_PIN` | Origin pincode for tests |
| `DELHIVERY_TEST_DEST_PIN` | Destination pincode for tests |
| `DELHIVERY_TEST_TRACKING_AWB` | AWB for tracking test |
| `DELHIVERY_TEST_POD_AWB` | AWB for POD test |
| `DELHIVERY_ALLOW_MUTATIONS=true` | Allows mutating live tests |
| `DELHIVERY_TEST_PICKUP_LOCATION` | Warehouse pickup name for createShipment |
| `DELHIVERY_TEST_PICKUP_DATE` | Pickup date (YYYY-MM-DD) |
| `DELHIVERY_TEST_PICKUP_TIME` | Pickup time (HH:MM, 24h) |
| `DELHIVERY_TEST_CANCEL_AWB` | AWB to cancel |
| `DELHIVERY_TEST_ADDRESS_AWB` | AWB for address update |

**Important Safety Rule**

When `DELHIVERY_BASE_URL` points to production, do not enable `DELHIVERY_ALLOW_MUTATIONS` unless you intend to create, update, or cancel real shipments.

---

## 3. Automated Test Coverage

**Unit Tests**

- `server/tests/unit/delhivery/DelhiveryMapper.test.ts`
- `server/tests/unit/delhivery/DelhiveryStatusMapping.test.ts`
- `server/tests/unit/delhivery/DelhiveryProvider.test.ts`

Run:
```bash
npm test -- tests/unit/delhivery
```

**Integration Tests (Live API)**

- `server/tests/integration/delhivery/delhivery.integration.test.ts`

Run:
```bash
export RUN_DELHIVERY_LIVE=true
export DELHIVERY_API_TOKEN=<token>
export DELHIVERY_BASE_URL=<https://track.delhivery.com OR https://staging-express.delhivery.com>
export DELHIVERY_TEST_ORIGIN_PIN=110001
export DELHIVERY_TEST_DEST_PIN=400001

# Optional read-only tests
export DELHIVERY_TEST_TRACKING_AWB=<awb>
export DELHIVERY_TEST_POD_AWB=<awb>

# Optional mutating tests
export DELHIVERY_ALLOW_MUTATIONS=true
export DELHIVERY_TEST_PICKUP_LOCATION=<warehouse_name>
export DELHIVERY_TEST_PICKUP_DATE=YYYY-MM-DD
export DELHIVERY_TEST_PICKUP_TIME=HH:MM
export DELHIVERY_TEST_CANCEL_AWB=<awb>
export DELHIVERY_TEST_ADDRESS_AWB=<awb>

npm test -- tests/integration/delhivery
```

**Test Runner Script**

```bash
./server/scripts/test-delhivery.sh
```

---

## 4. Workflow Tests (Feature by Feature)

Each workflow below includes a step-by-step checklist and validation targets. Use Postman collections as request references:

- `server/postman/collections/03-Orders-Shipments.postman_collection.json`
- `server/postman/collections/04-Warehouse-Ratecard.postman_collection.json`

### 4.1 Courier Activation and Health

**Goal:** Ensure Delhivery is active and discoverable by the system.

Steps:
1. Ensure a Delhivery Integration record exists with `provider=delhivery` and `settings.isActive=true`.
2. Verify `DELHIVERY_API_TOKEN` and `DELHIVERY_CLIENT_NAME` are present.
3. Call `GET /api/v1/courier` and confirm Delhivery appears in the list.

Expected:
- Delhivery is listed and selectable.
- No integration errors in logs.

---

### 4.2 Serviceability Check

**Endpoint:** `POST /api/v1/logistics/address/check-serviceability`

Steps:
1. Call `GET /api/v1/courier` to get Delhivery `courierId`.
2. Send request:
```json
{
  "fromPincode": "110001",
  "toPincode": "400001",
  "courierId": "<delhivery_courier_id>"
}
```
3. Validate response flags.

Expected:
- Serviceable pincodes return `true`.
- Embargo pincodes return `false`.
- Invalid pincodes return validation error.

---

### 4.3 Multi-Carrier Rate Comparison

**Endpoint:** `POST /api/v1/ratecards/compare`

Steps:
1. Use a valid origin, destination, and weight.
2. Verify Delhivery appears in results.
3. If Delhivery integration is active, confirm rate matches live API behavior.

Expected:
- Delhivery rate present.
- Currency is INR for Delhivery.

---

### 4.4 Order Creation

**Endpoint:** `POST /api/v1/orders`

Steps:
1. Create a warehouse and ensure it syncs to Delhivery.
2. Create order with courier preference:
```json
{
  "warehouseId": "<warehouse_id>",
  "customer": {
    "name": "Rahul Sharma",
    "phone": "+919876543210",
    "email": "rahul@example.com",
    "address": {
      "line1": "123 MG Road",
      "line2": "Near Metro Station",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    }
  },
  "items": [
    { "sku": "SKU-1", "name": "Product", "quantity": 1, "price": 1000, "weight": 0.5 }
  ],
  "payment": { "mode": "Prepaid" },
  "shipping": { "weight": 0.5, "dimensions": { "length": 10, "width": 10, "height": 5 }, "declaredValue": 1000 },
  "courier": { "preferredCourier": "Delhivery", "serviceType": "surface" }
}
```

Expected:
- Order created.
- Shipping cost calculated.
- Order status is `created`.

---

### 4.5 Shipment Creation (Delhivery)

**Endpoint:** `POST /api/v1/shipments`

Steps:
1. Use the order from 4.4.
2. Force Delhivery selection:
```json
{
  "orderId": "<order_id>",
  "serviceType": "standard",
  "carrierOverride": "Delhivery"
}
```
3. Verify response includes tracking number and carrier details.

Expected:
- AWB assigned.
- `carrier` is `delhivery`.
- `carrierDetails.carrierTrackingNumber` present.

---

### 4.6 Label Generation

**Endpoints:**
- `POST /api/v1/shipments/:id/label`
- `GET /api/v1/shipments/:id/label/download`

Steps:
1. Generate label for a Delhivery shipment.
2. Confirm `pdf` returns label from Delhivery API.
3. Force a 5xx failure (network block or temp outage) to verify fallback to internal label.
4. Force a 4xx (bad AWB) and confirm failure is surfaced without fallback.

Expected:
- Successful PDF label for valid AWB.
- Fallback only on network or 5xx errors.

---

### 4.7 Tracking (Private and Public)

**Endpoints:**
- `GET /api/v1/shipments/tracking/:awb`
- `GET /api/v1/shipments/public/track/:awb`

Steps:
1. Track using internal endpoint.
2. Track using public endpoint.
3. Confirm status mapping based on `StatusType + Status + NSLCode`.

Expected:
- Correct internal status (`delivered`, `in_transit`, `out_for_delivery`, `ndr`, `rto`).
- Timeline entry created.

---

### 4.8 Webhooks (Status Updates)

**Endpoint:** `POST /api/v1/webhooks/delhivery`

Steps:
1. Send valid webhook with header `x-delhivery-token: <DELHIVERY_WEBHOOK_TOKEN>`.
2. Send same payload again to validate idempotency.
3. Send invalid token to verify 401.

Sample payload:
```json
{
  "Shipment": {
    "AWB": "1234567890",
    "ReferenceNo": "ORDER-123",
    "NSLCode": "EOD-74",
    "PickUpDate": "2026-02-05",
    "Status": {
      "Status": "DISPATCHED",
      "StatusType": "UD",
      "StatusDateTime": "2026-02-05T10:00:00+05:30",
      "StatusLocation": "Mumbai",
      "Instructions": "Out for delivery"
    }
  }
}
```

Expected:
- First webhook updates shipment status.
- Duplicate webhook returns `Duplicate webhook ignored`.

---

### 4.9 Manifest and Pickup Scheduling

**Endpoints:**
- `POST /api/v1/shipments/manifest`
- `POST /api/v1/shipments/manifests/:id/close`

Steps:
1. Create manifest with Delhivery shipments only.
2. Close manifest and confirm pickup scheduled once per warehouse and date.
3. Verify pickup scheduling logs for Delhivery.

Expected:
- Delhivery pickup scheduled once for the warehouse.
- No duplicate pickup requests per shipment.

---

### 4.10 NDR Lifecycle (Delhivery)

**Goal:** Validate NDR detection and reattempt workflow.

Steps:
1. Trigger NDR status via webhook with `StatusType=UD` and NSL code in allowed list.
2. Verify shipment status becomes `ndr` and NDR event created.
3. Use `POST /api/v1/ndr/events/:id/trigger-workflow` to execute actions.
4. Confirm Delhivery reattempt is requested and UPL ID stored.
5. Verify background polling job updates NDR status or stops after TTL.

Expected:
- NDR event created with `requiresAction=true`.
- Reattempt requests queue Delhivery polling job.
- Polling stops after max attempts or terminal status.

---

### 4.11 Address Update (Public)

**Endpoints:**
- `GET /public/update-address/:token`
- `POST /public/update-address/:token`

Note:
The public address update routes are defined in `server/src/presentation/http/routes/public/address-update.routes.ts` but are not mounted in `server/src/app.ts`. Mount them under `/public` before testing if needed.

Steps:
1. Generate address update token from NDR flow.
2. Update address with valid payload.
3. Verify shipment address changed.
4. Confirm courier address update and reattempt are triggered.

Expected:
- Shipment address updated.
- Delhivery updateDeliveryAddress invoked.
- Reattempt requested after update.

---

### 4.12 Cancellation

**Provider API:** `DelhiveryProvider.cancelShipment`

Steps:
1. Use a valid AWB in manifest or in-transit state.
2. Call cancelShipment via integration test or internal admin utility.

Expected:
- Delhivery returns success.
- Shipment status updated to cancelled in Shipcrowd if wired in future workflows.

---

### 4.13 Reverse Pickup (Returns)

**Endpoint:** `POST /api/v1/logistics/returns`

Steps:
1. Create a return request referencing an existing shipment.
2. Verify reverse pickup is scheduled using Delhivery (payment mode `Pickup`).
3. Confirm reverse AWB assigned.

Expected:
- Reverse shipment created.
- Return status updates reflect pickup lifecycle.

---

### 4.14 POD (Proof of Delivery)

**Endpoint:** `GET /api/v1/shipments/:id/pod`

Steps:
1. Use a delivered AWB.
2. Request POD document.

Expected:
- URL returned when POD exists.
- `not_supported` when not available.

---

## 5. Advanced Testing Scenarios

1. Rate limit behavior  
Ensure requests beyond Delhivery limits return retryable errors.

2. Retry behavior  
Simulate 5xx and verify `retryWithBackoff` attempts and logs.

3. Forbidden characters  
Ensure `& # % ; \` are sanitized before createShipment.

4. MPS (Multi-Piece Shipment)  
Validate `shipment_type=MPS`, child count, master ID mapping.

5. Idempotency  
Resend webhook payloads to confirm dedupe.

6. Warehouse sync idempotency  
Create warehouse twice and verify Delhivery pickup location is not duplicated.

---

## 6. Validation Checklist (Quick Pass/Fail)

- [ ] Delhivery integration is active and authenticated
- [ ] Serviceability check works for valid and embargo pins
- [ ] Rates return INR with correct service type
- [ ] Shipment creation returns AWB
- [ ] Label generation works with Delhivery API
- [ ] Tracking updates status correctly
- [ ] Webhooks update status and are idempotent
- [ ] Manifest close schedules pickup once per warehouse/date
- [ ] NDR detection and reattempt workflow works
- [ ] Address update syncs to Delhivery
- [ ] POD fetch works for delivered shipments
- [ ] Reverse pickup flow creates reverse shipment
- [ ] Cancellation works on eligible shipments

---

## 7. Known Constraints and Safety Notes

- Delhivery staging often returns zero rates for `/api/kinko/v1/invoice/charges/.json`.
- Production testing creates real shipments and may incur charges.
- Warehouse names are case-sensitive and cannot be renamed at Delhivery.
- Cancellation is only allowed in certain shipment states.

---

## 8. Files Referenced

- `server/src/infrastructure/external/couriers/delhivery/delhivery.provider.ts`
- `server/src/infrastructure/external/couriers/delhivery/delhivery.mapper.ts`
- `server/src/infrastructure/external/couriers/delhivery/delhivery-status.mapper.ts`
- `server/src/infrastructure/external/couriers/delhivery/delhivery-error-handler.ts`
- `server/src/presentation/http/controllers/webhooks/couriers/delhivery.webhook.controller.ts`
- `server/tests/unit/delhivery/DelhiveryMapper.test.ts`
- `server/tests/unit/delhivery/DelhiveryProvider.test.ts`
- `server/tests/integration/delhivery/delhivery.integration.test.ts`
- `server/scripts/test-delhivery.sh`

# Delhivery B2C Complete Testing Guide

**Version:** 2.0  
**Last Updated:** 2026-02-05  
**Environment:** Staging (Recommended) / Production  
**Integration Type:** B2C Courier Services

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Feature Coverage Matrix](#feature-coverage-matrix)
4. [Testing Philosophy](#testing-philosophy)
5. [Unit Testing](#unit-testing)
6. [Integration Testing (Staging API)](#integration-testing-staging-api)
7. [Feature-by-Feature Testing](#feature-by-feature-testing)
8. [Workflow Testing](#workflow-testing)
9. [Advanced Testing Scenarios](#advanced-testing-scenarios)
10. [Troubleshooting](#troubleshooting)
11. [Test Data Management](#test-data-management)

---

## Overview

This document provides **extremely detailed, step-by-step testing procedures** for the complete Delhivery B2C courier integration in Shipcrowd. It covers all features, workflows, and edge cases to ensure **100% functionality verification**.

### What's Tested

- ✅ Forward shipment creation (Prepaid & COD)
- ✅ Reverse shipment creation (RVP - Pickup mode)
- ✅ Multi-Piece Shipment (MPS) handling
- ✅ Replacement shipments (REPL mode)
- ✅ Serviceability checking
- ✅ Rate calculation
- ✅ Warehouse management (creation & updates)
- ✅ Pickup scheduling
- ✅ Shipment tracking
- ✅ Webhook processing & idempotency
- ✅ NDR detection & resolution workflows
- ✅ Address updates
- ✅ Reattempt management
- ✅ Shipment cancellation
- ✅ Label generation (with fallback)
- ✅ POD (Proof of Delivery) retrieval
- ✅ Status mapping accuracy
- ✅ Error handling & retry logic
- ✅ Rate limiting compliance

---

## Environment Setup

### Staging API (Recommended for Testing)

> **⚠️ IMPORTANT:** Always use **staging environment** for testing to avoid real shipments and charges.

#### Required Environment Variables

Create a `.env.test` file or set these in your shell:

```bash
# Authentication
DELHIVERY_API_TOKEN=your_staging_token_here
DELHIVERY_CLIENT_NAME=your_registered_client_name

# Base URL - STAGING
DELHIVERY_BASE_URL=https://staging-express.delhivery.com

# Webhook Configuration
DELHIVERY_WEBHOOK_TOKEN=your_shared_secret_token
DELHIVERY_WEBHOOK_ALLOWED_IPS=203.0.113.0,203.0.113.1

# Test Configuration
RUN_DELHIVERY_LIVE=true
DELHIVERY_TEST_ORIGIN_PIN=110001
DELHIVERY_TEST_DEST_PIN=400001

# Optional: For Tracking Tests
DELHIVERY_TEST_TRACKING_AWB=existing_staging_awb
DELHIVERY_TEST_POD_AWB=delivered_staging_awb

# Optional: For Mutation Tests (Safe in Staging)
DELHIVERY_ALLOW_MUTATIONS=true
DELHIVERY_TEST_PICKUP_LOCATION=Your_Warehouse_Name
DELHIVERY_TEST_PICKUP_DATE=2026-02-10
DELHIVERY_TEST_PICKUP_TIME=14:00
DELHIVERY_TEST_CANCEL_AWB=eligible_staging_awb
DELHIVERY_TEST_ADDRESS_AWB=eligible_staging_awb
```

### Production Environment (Use with Extreme Caution)

```bash
DELHIVERY_BASE_URL=https://track.delhivery.com
DELHIVERY_API_TOKEN=your_production_token
DELHIVERY_ALLOW_MUTATIONS=false  # NEVER enable for production tests
```

> **🚨 WARNING:** Production tests should be **read-only** (tracking, serviceability, rates). Never enable `DELHIVERY_ALLOW_MUTATIONS=true` in production.

### Getting Test Credentials

1. **Staging Token:** Contact Delhivery support or your account manager
2. **Warehouse Name:** Must match **exactly** (case-sensitive) the name registered in Delhivery staging
3. **Test Pincodes:** Use real Indian pincodes (110001 for Delhi, 400001 for Mumbai, etc.)
4. **Test AWBs:** Create shipments in staging first, use those AWBs for tracking/POD tests

---

## Feature Coverage Matrix

| Feature | Provider Method | Unit Test | Integration Test | Manual Test | Status |
|---------|----------------|-----------|------------------|-------------|--------|
| **Shipment Creation (Prepaid)** | `createShipment` | ✅ | ✅ | ✅ | Complete |
| **Shipment Creation (COD)** | `createShipment` | ✅ | ✅ | ✅ | Complete |
| **Multi-Piece Shipment (MPS)** | `createShipment` | ✅ | ⚠️ Manual | 📋 Required | Partial |
| **Reverse Shipment (RVP)** | `createReverseShipment` | ✅ | ⚠️ Manual | 📋 Required | Partial |
| **Replacement (REPL)** | `createShipment` | ⚠️ | ⚠️ Manual | 📋 Required | Needs Impl |
| **Serviceability Check** | `checkServiceability` | ✅ | ✅ | ✅ | Complete |
| **Rate Calculation** | `getRates` | ✅ | ✅ | ✅ | Complete |
| **Tracking** | `trackShipment` | ✅ | ✅ | ✅ | Complete |
| **Status Mapping** | `buildStatusKey` + Mapper | ✅ | ✅ | ✅ | Complete |
| **Warehouse Creation** | `createWarehouse` | ⚠️ | ⚠️ Manual | 📋 Required | Partial |
| **Warehouse Update** | `updateWarehouse` | ⚠️ | ⚠️ Manual | 📋 Required | Partial |
| **Pickup Scheduling** | `schedulePickup` | ⚠️ | ✅ | ✅ | Partial |
| **Shipment Cancellation** | `cancelShipment` | ⚠️ | ✅ | ✅ | Partial |
| **Address Update** | `updateDeliveryAddress` | ⚠️ | ✅ | ✅ | Partial |
| **Reattempt Request** | `requestReattempt` | ⚠️ | ⚠️ Manual | 📋 Required | Partial |
| **NDR Status Polling** | `getNdrStatus` | ⚠️ | ⚠️ Manual | 📋 Required | Partial |
| **POD Retrieval** | `getProofOfDelivery` | ⚠️ | ✅ | ✅ | Partial |
| **Label Generation** | `generateLabel` (adapter) | ⚠️ | 📋 Required | 📋 Required | Needs Test |
| **Webhook Processing** | `handleWebhook` | ⚠️ | 📋 Required | ✅ | Partial |
| **Webhook Idempotency** | Deduplication logic | ⚠️ | 📋 Required | ✅ | Partial |
| **Error Handling** | `handleDelhiveryError` | ⚠️ | ✅ | ✅ | Partial |
| **Retry Logic** | `retryWithBackoff` | ⚠️ | ✅ | ✅ | Partial |
| **Rate Limiting** | `RateLimiterService` | ⚠️ | ⚠️ Manual | 📋 Required | Needs Test |

**Legend:**
- ✅ Complete: Fully tested
- ⚠️ Partial: Some coverage, needs improvement
- 📋 Required: Needs to be created/added
- ⚠️ Manual: Requires manual execution with staging data

---

## Testing Philosophy

### Test Pyramid Approach

```
    ┌─────────────────────┐
    │  Manual/E2E Tests   │  <- Workflows, UI, Real scenarios
    │  (Selective)        │
    ├─────────────────────┤
    │  Integration Tests  │  <- Live API (Staging), Full flows
    │  (Moderate)         │
    ├─────────────────────┤
    │    Unit Tests       │  <- Mocked, Fast, Comprehensive
    │    (Extensive)      │
    └─────────────────────┘
```

### Staging vs Production Testing

| Test Type | Staging | Production |
|-----------|---------|------------|
| Serviceability | ✅ Safe | ✅ Safe |
| Rate Calculation | ✅ Safe | ✅ Safe |
| Tracking (existing AWB) | ✅ Safe | ✅ Safe (read-only) |
| Shipment Creation | ✅ **Recommended** | ⚠️ Creates real shipments |
| Cancellation | ✅ **Recommended** | ❌ Avoid (affects real shipments) |
| Address Update | ✅ **Recommended** | ❌ Avoid (affects real shipments) |
| Webhook Simulation | ✅ **Recommended** | ❌ Risk of data corruption |

---

## Unit Testing

Unit tests mock external API calls and focus on **logic validation**.

### Running Unit Tests

```bash
cd server
npm test -- tests/unit/delhivery
```

### Coverage Areas

#### 1. DelhiveryMapper Tests

```bash
npm test -- tests/unit/delhivery/DelhiveryMapper.test.ts
```

**Tests:**
- ✅ Phone normalization (removes country code, extracts last 10 digits)
- ✅ Text sanitization (removes forbidden characters: `& # % ; \`)
- ✅ Weight conversion (kg → grams)
- ✅ Forward shipment mapping
- ✅ Reverse shipment mapping
- ✅ MPS field building

#### 2. DelhiveryStatusMapping Tests

```bash
npm test -- tests/unit/delhivery/DelhiveryStatusMapping.test.ts
```

**Tests:**
- ✅ Delivered status (`DL|DELIVERED`)
- ✅ In-transit status (`UD|IN TRANSIT`)
- ✅ Out for delivery (`UD|DISPATCHED`)
- ✅ NDR statuses with NSL codes (`UD|DISPATCHED|EOD-74`)
- ✅ RTO statuses (`RT|IN TRANSIT`, `DL|RTO`)
- ✅ Unknown status fallback

#### 3. DelhiveryProvider Tests

```bash
npm test -- tests/unit/delhivery/DelhiveryProvider.test.ts
```

**Current Coverage:**
- ✅ Shipment creation with correct payload format (`format=json&data=...`)
- ✅ Tracking with status mapping
- ✅ Serviceability check
- ✅ Embargo pincode detection
- ✅ Rate calculation with INR currency
- ✅ Error handling for validation failures

**Gaps (to be added):**
- ⚠️ Reverse shipment creation
- ⚠️ MPS shipment creation
- ⚠️ Warehouse operations
- ⚠️ Pickup scheduling
- ⚠️ Cancellation
- ⚠️ Address update
- ⚠️ Reattempt request
- ⚠️ POD retrieval
- ⚠️ NDR status polling
- ⚠️ Retry logic verification
- ⚠️ Rate limiter integration

---

## Integration Testing (Staging API)

Integration tests hit **real Delhivery staging endpoints**.

### Running Integration Tests

```bash
cd server

# Load environment
export RUN_DELHIVERY_LIVE=true
export DELHIVERY_BASE_URL=https://staging-express.delhivery.com
export DELHIVERY_API_TOKEN=your_staging_token
export DELHIVERY_TEST_ORIGIN_PIN=110001
export DELHIVERY_TEST_DEST_PIN=400001

# Run tests
npm test -- tests/integration/delhivery
```

Or use the test runner script:

```bash
cd server
chmod +x scripts/test-delhivery.sh
./scripts/test-delhivery.sh
```

### Current Integration Tests

#### Read-Only Tests (Always Safe)

1. **Serviceability Check**
   ```typescript
   it('checks serviceability', async () => {
     const ok = await provider.checkServiceability('400001');
     expect(typeof ok).toBe('boolean');
   });
   ```

2. **Rate Calculation**
   ```typescript
   it('gets rates', async () => {
     const rates = await provider.getRates({
       origin: { pincode: '110001' },
       destination: { pincode: '400001' },
       package: { weight: 1, length: 10, width: 10, height: 10 },
       paymentMode: 'prepaid'
     });
     expect(rates[0].currency).toBe('INR');
   });
   ```

3. **Tracking (requires existing AWB)**
   ```typescript
   it('tracks shipment', async () => {
     if (!process.env.DELHIVERY_TEST_TRACKING_AWB) return;
     
     const res = await provider.trackShipment(process.env.DELHIVERY_TEST_TRACKING_AWB);
     expect(res.trackingNumber).toBeTruthy();
     expect(res.status).toBeTruthy();
   });
   ```

4. **POD Retrieval (requires delivered AWB)**
   ```typescript
   it('fetches POD', async () => {
     if (!process.env.DELHIVERY_TEST_POD_AWB) return;
     
     const res = await provider.getProofOfDelivery(process.env.DELHIVERY_TEST_POD_AWB);
     expect(res).toHaveProperty('source');
   });
   ```

#### Mutating Tests (Staging Only, with Flag)

These tests **create, modify, or cancel** shipments. Only run in **staging** with `DELHIVERY_ALLOW_MUTATIONS=true`.

1. **Shipment Creation**
   ```typescript
   it('creates shipment', async () => {
     if (!allowMutations || !pickupLocation) return;
     
     const res = await provider.createShipment({
       origin: { /* warehouse details */ },
       destination: { /* customer details */ },
       package: { weight: 1, length: 10, width: 10, height: 10 },
       orderNumber: `TEST-${Date.now()}`,
       paymentMode: 'prepaid',
       carrierOptions: { delhivery: { pickupLocationName: pickupLocation } }
     });
     
     expect(res.trackingNumber).toBeTruthy();
   });
   ```

2. **Pickup Scheduling**
3. **Cancellation**
4. **Address Update**

---

## Feature-by-Feature Testing

### 1. Serviceability Check

**Purpose:** Verify if a pincode is serviceable for Prepaid, COD, or Pickup.

**Provider Method:** `checkServiceability(pincode: string, type: 'delivery' | 'pickup')`

**API Endpoint:** `/c/api/pin-codes/json/`

#### Test Scenarios

| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Serviceable pincode (Prepaid) | `110001`, `delivery` | `true` |
| Serviceable pincode (COD) | `400001`, `delivery` | `true` |
| Serviceable for Pickup | `110001`, `pickup` | `true` or `false` based on staging data |
| Embargo pincode | Embargo pin from staging | `false` |
| Non-serviceable (NSZ) | Invalid or remote pin | `false` |
| Empty response | Non-existent pincode | `false` |

#### Manual Test Steps

1. Open Postman/Thunder Client
2. Request:
   ```
   GET https://staging-express.delhivery.com/c/api/pin-codes/json/?filter_codes=110001
   Authorization: Token YOUR_STAGING_TOKEN
   ```
3. Verify response:
   ```json
   {
     "delivery_codes": [{
       "postal_code": {
         "pre_paid": "Y",
         "cod": "Y",
         "pickup": "Y",
         "remarks": "" // Empty = serviceable
       }
     }]
   }
   ```
4. Test embargo:
   ```
   GET .../json/?filter_codes=EMBARGO_PIN
   ```
   Response should have `"remarks": "Embargo"`

#### Automated Test Code (Integration)

```typescript
describe('Serviceability', () => {
  it('returns true for serviceable pincodes', async () => {
    const isServiceable = await provider.checkServiceability('110001');
    expect(isServiceable).toBe(true);
  });

  it(' returns false for embargo pincodes', async () => {
    // Use a known embargo pin from staging
    const isServiceable = await provider.checkServiceability('EMBARGO_PIN');
    expect(isServiceable).toBe(false);
  });

  it('checks pickup serviceability', async () => {
    const isPickupServiceable = await provider.checkServiceability('110001', 'pickup');
    expect(typeof isPickupServiceable).toBe('boolean');
  });
});
```

---

### 2. Rate Calculation

**Purpose:** Get estimated shipping charges.

**Provider Method:** `getRates(request: CourierRateRequest)`

**API Endpoint:** `/api/kinko/v1/invoice/charges/.json`

#### Test Scenarios

| Scenario | Inputs | Expected |
|----------|--------|----------|
| Prepaid Surface | origin: 110001, dest: 400001, weight: 1kg, mode: prepaid, service: surface | `{ currency: 'INR', total: >0 }` |
| COD Surface | Same as above, mode: cod | COD charge included |
| Express (if available) | service: express | Higher rate than surface |
| Zero rate (staging behavior) | Any valid inputs | May return `0` in staging |

> **Note:** Staging often returns **zero rates**. This is expected behavior and should be handled gracefully.

#### Manual Test Steps

1. Request:
   ```
   GET https://staging-express.delhivery.com/api/kinko/v1/invoice/charges/.json?md=S&ss=Delivered&d_pin=400001&o_pin=110001&cgm=1000&pt=Pre-paid
   Authorization: Token YOUR_TOKEN
   ```
2. Expected response:
   ```json
   {
     "total_charge": 50.00, // or 0 in staging
     "base_charge": 45.00,
     "taxes": 5.00
   }
   ```

#### Automated Test

```typescript
describe('Rate Calculation', () => {
  it('returns rates with INR currency', async () => {
    const rates = await provider.getRates({
      origin: { pincode: '110001' },
      destination: { pincode: '400001' },
      package: { weight: 1, length: 10, width: 10, height: 10 },
      paymentMode: 'prepaid'
    });

    expect(rates[0].currency).toBe('INR');
    expect(rates[0].total).toBeGreaterThanOrEqual(0);
  });

  it('handles COD payment mode', async () => {
    const rates = await provider.getRates({
      origin: { pincode: '110001' },
      destination: { pincode: '400001' },
      package: { weight: 1, length: 10, width: 10, height: 10 },
      paymentMode: 'cod'
    });

    expect(rates).toBeDefined();
  });
});
```

---

### 3. Shipment Creation (Forward - Prepaid)

**Purpose:** Create a forward B2C shipment.

**Provider Method:** `createShipment(data: CourierShipmentData)`

**API Endpoint:** `POST /api/cmu/create.json`

#### Test Scenarios

| Scenario | Payment Mode | Warehouse | Expected |
|----------|--------------|-----------|----------|
| Standard prepaid | `prepaid` | Valid warehouse name | AWB returned |
| COD shipment | `cod` | Valid warehouse name | AWB + COD amount |
| Missing warehouse | Any | `null` or invalid | Error thrown |
| Invalid address | Any | Valid | Delhivery validation error |
| Special characters in address | Any | Valid | Characters sanitized |
| MPS shipment | prepaid | Valid | Master + child AWBs |

#### Manual Test Steps

1. Ensure warehouse exists in Delhivery staging
2. Create a test shipment via Postman:
   ```bash
   POST https://staging-express.delhivery.com/api/cmu/create.json
   Authorization: Token YOUR_STAGING_TOKEN
   Content-Type: application/x-www-form-urlencoded
   
   Body:
   format=json&data={"shipments":[{"name":"Test Customer","add":"123 Test Street","pin":"400001","city":"Mumbai","state":"Maharashtra","country":"India","phone":"9999999999","order":"TEST-001","payment_mode":"Prepaid","weight":"1000","shipping_mode":"Surface"}],"pickup_location":{"name":"Your_Warehouse_Name"}}
   ```
3. Verify response contains `waybill` field
4. Store AWB for tracking tests

#### Automated Test

```typescript
describe('Shipment Creation', () => {
  it('creates prepaid shipment and returns AWB', async () => {
    const shipmentData: CourierShipmentData = {
      origin: {
        name: 'Test Warehouse',
        phone: '9999999999',
        address: 'Test Origin Address',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        country: 'India'
      },
      destination: {
        name: 'Test Customer',
        phone: '9876543210',
        address: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country': 'India'
      },
      package: { weight: 1, length: 10, width: 10, height: 10 },
      orderNumber: `TEST-${Date.now()}`,
      paymentMode: 'prepaid',
      carrierOptions: {
        delhivery: {
          pickupLocationName: process.env.DELHIVERY_TEST_PICKUP_LOCATION
        }
      }
    };

    const result = await provider.createShipment(shipmentData);
    
    expect(result.trackingNumber).toBeTruthy();
    expect(result.trackingNumber).toMatch(/^\d+$/);
  });

  it('sanitizes special characters in address', async () => {
    const shipmentData = {
      /* ...same as above... */
      destination: {
        name: 'Test & Customer',
        address: 'House #123; Street % Area',
        /* ...rest... */
      }
    };

    // Should not throw error
    const result = await provider.createShipment(shipmentData);
    expect(result.trackingNumber).toBeTruthy();
  });
});
```

---

### 4. Shipment Tracking

**Purpose:** Track shipment status and timeline.

**Provider Method:** `trackShipment(trackingNumber: string)`

**API Endpoint:** `GET /api/v1/packages/json/`

#### Test Scenarios

| AWB Status | Expected Internal Status | Timeline Entries |
|------------|--------------------------|------------------|
| Manifested | `pending` or `created` | 1+ |
| In Transit | `in_transit` | Multiple |
| Out for Delivery | `out_for_delivery` | Multiple |
| Delivered | `delivered` | Complete journey |
| NDR (various codes) | `ndr` | Includes NDR reason |
| RTO In Transit | `rto` | Return journey |
| Delivered (RTO) | `returned` | RTO complete |

#### Manual Test

```bash
GET https://staging-express.delhivery.com/api/v1/packages/json/?waybill=YOUR_STAGING_AWB
Authorization: Token YOUR_TOKEN
```

#### Automated Test

```typescript
describe('Shipment Tracking', () => {
  it('tracks shipment and maps status correctly', async () => {
    if (!process.env.DELHIVERY_TEST_TRACKING_AWB) {
      console.warn('Skipping: DELHIVERY_TEST_TRACKING_AWB not set');
      return;
    }

    const result = await provider.trackShipment(
      process.env.DELHIVERY_TEST_TRACKING_AWB
    );

    expect(result.trackingNumber).toBe(process.env.DELHIVERY_TEST_TRACKING_AWB);
    expect(result.status).toBeDefined();
    expect(result.timeline).toBeInstanceOf(Array);
    expect(result.timeline.length).toBeGreaterThan(0);
  });
});
```

---

### 5. Webhook Processing

**Purpose:** Process Delhivery status update webhooks with idempotency.

**Controller:** `DelhiveryWebhookController.handleWebhook`

**Endpoint:** `POST /api/v1/webhooks/delhivery`

#### Test Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Valid webhook (first time) | Shipment status updated, `success` returned |
| Duplicate webhook (same payload) | Ignored, `Duplicate webhook ignored` returned |
| Invalid AWB | `Invalid payload: Missing AWB` error |
| Missing authentication token | 401 Unauthorized |
| Wrong IP (if IP whitelist enabled) | 403 Forbidden |
| NDR webhook | NDR event created, workflows triggered |

#### Manual Test (Local)

```bash
# 1. Start server
npm run dev

# 2. Send webhook via curl
curl -X POST http://localhost:5005/api/v1/webhooks/delhivery \
  -H "Content-Type: application/json" \
  -H "x-delhivery-token: your_webhook_token" \
  -d '{
    "Shipment": {
      "AWB": "1234567890",
      "ReferenceNo": "TEST-001",
      "PickUpDate": "2026-02-05",
      "NSLCode": "",
      "Status": {
        "Status": "IN TRANSIT",
        "StatusType": "UD",
        "StatusDateTime": "2026-02-05T10:30:00+05:30",
        "StatusLocation": "Delhi Hub",
        "Instructions": "Shipment in transit"
      }
    }
  }'

# 3. Verify response
# Expected: {"status":"success","message":"Webhook processed"}

# 4. Send same webhook again
# Expected: {"status":"skipped","message":"Duplicate webhook ignored"}
```

#### Automated Test (Needs to be Added)

```typescript
describe('Webhook Processing', () => {
  it('processes valid webhook and updates shipment', async () => {
    // Mock shipment existence
    // Send webhook request
    // Verify shipment status updated
  });

  it('ignores duplicate webhooks', async () => {
    // Send same webhook twice
    // Verify second request returns "skipped"
  });

  it('rejects invalid authentication', async () => {
    // Send webhook without token
    // Expect 401
  });

  it('creates NDR event for NDR webhooks', async () => {
    // Send NDR webhook (NSL code: EOD-74)
    // Verify NDR event created
  });
});
```

---

### 6. NDR Detection & Resolution

**Purpose:** Detect NDR events from webhook and execute resolution workflows.

**Service:** `NDRService.processNDREvent`

**Job:** `DelhiveryNdrStatusJob`

#### NDR Workflow Flow

```
Webhook with NDR status
    ↓
NDRWebhookHandler parses payload
    ↓
StatusMapper identifies NDR (UD|DISPATCHED|EOD-74)
    ↓
NDRService.processNDREvent triggered
    ↓
NDR Event created in DB
    ↓
NDRWorkflow executed (WhatsApp, address update link, etc.)
    ↓
Resolution action taken (reattempt/RTO)
    ↓
DelhiveryNdrStatusJob polls for UPL status
    ↓
NDR resolved or escalated
```

#### Test Scenarios

| NDR Type | NSL Code | Expected Workflow |
|----------|----------|-------------------|
| Address Issue | EOD-74 | Send address-update link, auto-reattempt after update |
| Customer Unavailable | EOD-15 | Send WhatsApp, schedule reattempt |
| Refused Delivery | EOD-104 | Notify merchant, trigger RTO |
| Payment Issue | EOD-43 | Contact customer, retry |

#### Manual Test Steps

1. **Trigger NDR Webhook**:
   ```bash
   curl -X POST http://localhost:5005/api/v1/webhooks/delhivery \
     -H "Content-Type: application/json" \
     -H "x-delhivery-token: token" \
     -d '{
       "Shipment": {
         "AWB": "TEST123",
         "ReferenceNo": "ORD-001",
         "NSLCode": "EOD-74",
         "Status": {
           "Status": "DISPATCHED",
           "StatusType": "UD",
           "StatusDateTime": "2026-02-05T14:00:00+05:30",
           "StatusLocation": "Mumbai",
           "Instructions": "Incomplete address"
         }
       }
     }'
   ```

2. **Verify NDR Event Created**:
   - Check database: `db.ndrevents.find({ awb: "TEST123" })`
   - Status should be `detected`
   - `ndrType` should be `address_issue`

3. **Verify Workflow Execution**:
   - Check `resolutionActions` array
   - Confirm WhatsApp sent (if configured)
   - Verify address update link generated

4. **Test Address Update**:
   ```bash
   GET http://localhost:5005/public/update-address/TOKEN
   ```
   > **Note:** Public address update routes are defined but NOT mounted in `app.ts`. Mount them first.

5. **Test Reattempt**:
   ```bash
   POST /api/v1/ndr/events/:ndrEventId/execute-action
   {
     "action": "request_reattempt",
     "metadata": { "preferredDate": "2026-02-07" }
   }
   ```

6. **Verify Delhivery Reattempt API Called**:
   - Check logs for `Delhivery requestReattempt`
   - Verify UPL ID stored in NDR event

7. **Test NDR Status Polling**:
   - Background job should poll `/api/cmu/get_bulk_upl/{uplId}`
   - Continue until terminal status or TTL (48h)

#### Automated Tests (To Be Added)

```typescript
describe('NDR Lifecycle', () => {
  it('detects NDR from webhook', async () => {
    // Send NDR webhook
    // Verify NDR event created with correct type
  });

  it('executes workflow actions', async () => {
    // Trigger workflow
    // Verify actions executed (mocked)
  });

  it('requests reattempt and stores UPL ID', async () => {
    // Call requestReattempt
    // Verify UPL ID returned and stored
  });

  it('polls NDR status until terminal', async () => {
    // Trigger polling job
    // Mock getNdrStatus responses
    // Verify polling stops at terminal status
  });

  it('respects TTL and stops polling', async () => {
    // Create old NDR event
    // Trigger polling
    // Verify job exits with "TTL exceeded"
  });
});
```

---

### 7. Address Update

**Purpose:** Update delivery address for an in-transit shipment.

**Provider Method:** `updateDeliveryAddress(awb, newAddress, orderId, phone?)`

**API Endpoint:** `POST /api/p/edit`

#### Test Scenarios

| Scenario | Shipment Status | Expected |
|----------|----------------|----------|
| Valid update | In Transit | Success |
| Valid update | Pending | Success |
| Invalid AWB | N/A | Error |
| Dispatched shipment | Out for Delivery | Error (not editable) |
| Delivered shipment | Delivered | Error |

#### Manual Test

```bash
POST https://staging-express.delhivery.com/api/p/edit
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "waybill": "YOUR_STAGING_AWB",
  "add": "Updated Address Line 1",
  "city": "Mumbai",
  "state": "MH",
  "pin": "400002",
  "phone": "9999999999"
}
```

#### Automated Test

```typescript
describe('Address Update', () => {
  it('updates address for eligible shipment', async () => {
    if (!process.env.DELHIVERY_ALLOW_MUTATIONS || !process.env.DELHIVERY_TEST_ADDRESS_AWB) {
      return;
    }

    const result = await provider.updateDeliveryAddress(
      process.env.DELHIVERY_TEST_ADDRESS_AWB,
      {
        line1: 'New Address Line 1',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      'TEST-ORDER-001',
      '9999999999'
    );

    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });

  it('sanitizes special characters in address', async () => {
    // Address with &, #, %, ;, \
    // Should be sanitized before API call
  });
});
```

---

### 8. Shipment Cancellation

**Purpose:** Cancel a shipment before dispatch.

**Provider Method:** `cancelShipment(trackingNumber: string)`

**API Endpoint:** `POST /api/p/edit`

#### Eligible Statuses

- ✅ Manifested
- ✅ In Transit
- ✅ Pending
- ❌ Dispatched (too late)
- ❌ Delivered (terminal)

#### Manual Test

```bash
POST https://staging-express.delhivery.com/api/p/edit
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "waybill": "YOUR_STAGING_AWB",
  "cancellation": "true"
}
```

#### Automated Test

```typescript
describe('Shipment Cancellation', () => {
  it('cancels eligible shipment', async () => {
    if (!process.env.DELHIVERY_ALLOW_MUTATIONS || !process.env.DELHIVERY_TEST_CANCEL_AWB) {
      return;
    }

    const result = await provider.cancelShipment(
      process.env.DELHIVERY_TEST_CANCEL_AWB
    );

    expect(result).toBe(true);
  });
});
```

---

### 9. Warehouse Management

**Purpose:** Create and update warehouse/pickup locations in Delhivery.

**Provider Methods:** 
- `createWarehouse(warehouse)`
- `updateWarehouse(data)`

**API Endpoints:**
- `POST /api/backend/clientwarehouse/create/`
- `POST /api/backend/clientwarehouse/edit/`

#### Test Scenarios

| Scenario | Expected |
|----------|----------|
| Create new warehouse | Success, warehouse ID returned |
| Create duplicate | Idempotent (no duplicate created) |
| Update warehouse address | Success |
| Update non-existent warehouse | Error |

> **Important:** Warehouse names are **case-sensitive** and **cannot be renamed**. Once created, the name is permanent.

#### Manual Test

```bash
# Create
POST https://staging-express.delhivery.com/api/backend/clientwarehouse/create/
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "name": "Test_Warehouse_001",
  "registered_name": "YOUR_CLIENT_NAME",
  "phone": "9999999999",
  "email": "warehouse@example.com",
  "address": "Warehouse Address Line 1",
  "city": "Delhi",
  "pin": "110001",
  "country": "India",
  "return_address": "Warehouse Address Line 1",
  "return_pin": "110001",
  "return_city": "Delhi",
  "return_state": "Delhi",
  "return_country": "India"
}
```

---

### 10. Label Generation

**Purpose:** Generate shipping label PDF from Delhivery API with fallback.

**Adapter:** `DelhiveryLabelAdapter`

**API Endpoint:** Label generation endpoint (TBD from docs)

#### Fallback Logic

```
Try Delhivery Label API
    ↓
If 5xx or Network Error
    ↓
Generate Internal Fallback Label
    ↓
Return PDF
```

> **Note:** 4xx errors (e.g., invalid AWB) should NOT trigger fallback.

#### Test Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Valid AWB | Delhivery PDF returned |
| Invalid AWB (4xx) | Error thrown, no fallback |
| Network timeout (5xx) | Fallback label generated |
| Delhivery server error (5xx) | Fallback label generated |

---

### 11. Pickup Scheduling

**Purpose:** Schedule pickup request with Delhivery.

**Provider Method:** `schedulePickup(data)`

**API Endpoint:** `POST /fm/request/new/`

#### Test Scenarios

```typescript
describe('Pickup Scheduling', () => {
  it('schedules pickup for warehouse', async () => {
    if (!process.env.DELHIVERY_ALLOW_MUTATIONS) return;

    const result = await provider.schedulePickup({
      pickupDate: '2026-02-10',
      pickupTime: '14:00',
      pickupLocation: process.env.DELHIVERY_TEST_PICKUP_LOCATION!,
      expectedCount: 5
    });

    expect(result).toBeDefined();
  });
});
```

---

## Advanced Testing Scenarios

### 1. Rate Limiting Compliance

**Test:** Ensure requests respect Delhivery's rate limits.

| Endpoint | Limit (per 5 min/IP) |
|----------|----------------------|
| Serviceability | 4500 |
| Tracking | No published limit |
| Rates | 750 |
| Waybill Bulk | 5 requests |
| Shipment Creation | TBD |

**Automated Test:**

```typescript
describe('Rate Limiting', () => {
  it('respects rate limits with RateLimiterService', async () => {
    // Rapid-fire requests
    const promises = Array(10).fill(null).map(() => 
      provider.checkServiceability('110001')
    );

    // Should not throw rate limit error
    await expect(Promise.all(promises)).resolves.toBeDefined();
  });
});
```

### 2. Retry Logic

**Test:** Verify `retryWithBackoff` handles transient failures.

```typescript
describe('Retry Logic', () => {
  it('retries on 5xx errors', async () => {
    // Mock 5xx response on first call, success on second
    // Verify 2 attempts made
  });

  it('does not retry on 4xx errors', async () => {
    // Mock 400 response
    // Verify only 1 attempt
  });

  it('respects max retry count', async () => {
    // Mock persistent failure
    // Verify exactly 3 attempts (default)
  });
});
```

### 3. Multi-Piece Shipment (MPS)

**Test:** Create MPS order with master + child waybills.

```typescript
describe('MPS Shipment', () => {
  it('creates MPS with master and child waybills', async () => {
    const mpsData = {
      /* standard shipment data */
      carrierOptions: {
        delhivery: {
          pickupLocationName: 'Test_WH',
          mps: {
            mps_amount: 1000,
            mps_children: 2,
            master_id: 'MASTER_WB_001',
            waybill: 'CHILD_WB_001'
          }
        }
      }
    };

    const result = await provider.createShipment(mpsData);
    expect(result.trackingNumber).toBe('CHILD_WB_001');
  });
});
```

### 4. Reverse Shipment (RVP)

**Test:** Create return pickup.

```typescript
describe('Reverse Shipment', () => {
  it('creates RVP with payment mode Pickup', async () => {
    const rvpData: CourierReverseShipmentData = {
      orderId: 'ORD-001',
      returnWarehouseId: new mongoose.Types.ObjectId(),
      pickupAddress: {
        name: 'Customer Name',
        phone: '9999999999',
        address: 'Pickup Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      package: { weight: 1, length: 10, width: 10, height: 10 },
      reason: 'Damaged product'
    };

    const result = await provider.createReverseShipment(rvpData);
    expect(result.trackingNumber).toBeTruthy();
  });
});
```

### 5. Error Handling Scenarios

| Error Type | Input | Expected Behavior |
|------------|-------|-------------------|
| Network timeout | Slow/no response | Retry with backoff |
| 400 Bad Request | Invalid payload | Throw validation error, no retry |
| 401 Unauthorized | Wrong token | Throw auth error immediately |
| 429 Rate Limit | Too many requests | Wait and retry |
| 500 Server Error | Delhivery downtime | Retry with exponential backoff |
| Missing AWB in response | Malformed response | Throw "No waybill returned" error |

```typescript
describe('Error Handling', () => {
  it('throws meaningful error for validation failures', async () => {
    // Invalid shipment data
    await expect(provider.createShipment(invalidData))
      .rejects.toThrow('Delhivery validation error');
  });

  it('handles network timeouts gracefully', async () => {
    // Mock timeout
    // Verify retry attempted
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. "No waybill returned" Error

**Cause:** Delhivery API didn't return AWB in response.

**Solutions:**
- Check warehouse name is **exactly** as registered (case-sensitive)
- Verify pickup location exists in Delhivery staging
- Check if staging token is valid
- Review request payload for missing fields

#### 2. "Warehouse not found" Error

**Cause:** Warehouse not synced with Delhivery.

**Solutions:**
- Call `createWarehouse` first
- Wait for warehouse creation to complete
- Verify warehouse name matches exactly

#### 3. Zero Rates in Staging

**Cause:** Staging environment behavior.

**Solution:** This is normal. Production will return actual rates.

#### 4. Webhook Not Processing

**Causes:**
- Missing `x-delhivery-token` header
- IP not whitelisted
- Malformed JSON

**Solutions:**
- Check webhook token in `.env`
- Add Delhivery staging IPs to whitelist
- Validate JSON structure

#### 5. Integration Tests Skipped

**Cause:** `RUN_DELHIVERY_LIVE` not set or missing credentials.

**Solution:**
```bash
export RUN_DELHIVERY_LIVE=true
export DELHIVERY_API_TOKEN=your_token
export DELHIVERY_BASE_URL=https://staging-express.delhivery.com
```

---

## Test Data Management

### Staging Test Data

| Data Type | Sample Values |
|-----------|---------------|
| **Origin Pincodes** | 110001 (Delhi), 560001 (Bangalore), 122001 (Gurgaon) |
| **Destination Pincodes** | 400001 (Mumbai), 700001 (Kolkata), 600001 (Chennai) |
| **Phone Numbers** | 9999999999, 9876543210 |
| **Warehouse Name** | `Test_Warehouse_Staging` |
| **Order IDs** | `TEST-${Date.now()}` for uniqueness |
| **Test Customer** | Name: "Test Customer", Address: "123 Test Street" |

### AWB Lifecycle for Testing

1. **Create Shipment** in staging → Get AWB
2. **Store AWB** for tracking/POD tests
3. **Track Shipment** → Verify status updates
4. **Test Cancellation** (before dispatch)
5. **Test Address Update** (if in transit)

### Cleanup

- Staging data typically auto-purges after 30-90 days
- No manual cleanup required for staging tests

---

## Summary Checklist

Before considering Delhivery integration fully tested:

- [ ] All unit tests pass (`npm test -- tests/unit/delhivery`)
- [ ] All integration tests pass in staging (`RUN_DELHIVERY_LIVE=true npm test -- tests/integration/delhivery`)
- [ ] Serviceability check works for valid/embargo pincodes
- [ ] Rate calculation returns INR currency
- [ ] Forward shipment creation returns AWB
- [ ] Reverse shipment creation works
- [ ] Tracking returns correct status mapping
- [ ] Webhook idempotency verified
- [ ] NDR detection and workflow trigger confirmed
- [ ] Address update succeeds for eligible shipments
- [ ] Cancellation works for eligible statuses
- [ ] Pickup scheduling confirmed
- [ ] Label generation tested (including fallback)
- [ ] POD retrieval works for delivered shipments
- [ ] Error handling and retry logic validated
- [ ] Rate limiting compliance verified
- [ ] MPS workflow tested (manual)
- [ ] All test documentation updated

---

## References

- [Delhivery B2C API Documentation](./Delhivery_API_1.md)
- [Delhivery Status Codes](./Delhivery_API_2.md)
- [Delhivery Provider Implementation](file:///Users/dhirajgiri/Documents/Projects/Helix%20India/Shipcrowd/server/src/infrastructure/external/couriers/delhivery/delhivery.provider.ts)
- [Test Runner Script](file:///Users/dhirajgiri/Documents/Projects/Helix%20India/Shipcrowd/server/scripts/test-delhivery.sh)
