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
