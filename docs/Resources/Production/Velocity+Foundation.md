# SHIPCROWD PRODUCTION IMPLEMENTATION PLAN
**Version:** 3.0 (Verified Against Actual Codebase)
**Date:** January 28, 2026
**Focus:** Velocity API Alignment + Channel E2E Verification + Production Launch
**Timeline:** 14 Days (4 Phases)
**Courier Scope:** Velocity Shipfast only (Delhivery post-launch)

---

## PRE-IMPLEMENTATION STATUS (Verified)

Everything below has been verified against the actual Shipcrowd codebase.

| System | Status | Evidence |
|:---|:---|:---|
| Finance/Wallet/Ledger | 100% Complete | `wallet.service.ts` - 17 methods, ACID transactions, optimistic locking |
| Rate Card Management | 100% Complete | `dynamic-pricing.service.ts`, `smart-rate-calculator.service.ts`, 11 API endpoints |
| Zone Calculation | 100% Complete | `pincode-lookup.service.ts` - 154,799 pincodes, Metro/JK-NE logic |
| Shopify Integration | 100% Complete (untested E2E) | OAuth, order sync, fulfillment, 8 webhook topics |
| WooCommerce Integration | 100% Complete (untested E2E) | REST API auth, order sync, fulfillment, 8 webhook topics |
| Velocity Courier | 98% Complete | 12 methods implemented, needs API field corrections |
| Invoicing (GST) | 100% Complete | `invoice.service.ts`, `gst.service.ts` - CGST/SGST/IGST |
| COD Remittance | 100% Complete | `cod-remittance.service.ts` - Razorpay payout integration |

**What this plan does:** Fix the 2% Velocity gap, verify all integrations E2E, stress test, and deploy.

---

## PHASES OVERVIEW

| Phase | Days | Focus | Deliverable |
|:---|:---|:---|:---|
| **Phase 1** | Days 1-3 | Velocity API Corrections | 100% API-compliant Velocity provider |
| **Phase 2** | Days 4-7 | Channel E2E Verification | Validated Shopify + WooCommerce workflows |
| **Phase 3** | Days 8-11 | Integration & Stress Testing | System integrity report |
| **Phase 4** | Days 12-14 | Production Deployment | Live system |

---

## PHASE 1: VELOCITY API CORRECTIONS (Days 1-3)

**Objective:** Apply all verified corrections to align `velocity-shipfast.provider.ts`, `velocity.types.ts`, and `velocity.mapper.ts` with the official Velocity Shipfast API specification.

---

### ACTION 1: Fix Forward Order Endpoint

**File:** `server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts`
**Line:** 209
**Severity:** Critical - shipment creation will fail in production

**Current code (line 208-211):**
```typescript
return await this.httpClient.post<VelocityShipmentResponse>(
  '/custom/api/v1/forward-order',
  velocityRequest
);
```

**Change to:**
```typescript
return await this.httpClient.post<VelocityShipmentResponse>(
  '/custom/api/v1/forward-order-orchestration',
  velocityRequest
);
```

**Why:** The Velocity production API requires the `-orchestration` suffix. The non-orchestration endpoint is deprecated and returns 404 in production.

**Also update the class JSDoc comment (line 8):**
```
* 1. createShipment() - POST /forward-order
```
Change to:
```
* 1. createShipment() - POST /forward-order-orchestration
```

---

### ACTION 2: Fix Reverse Order Endpoint

**File:** `server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts`
**Line:** 615
**Severity:** Critical - RTO creation will fail

**Current code (line 614-616):**
```typescript
return await this.httpClient.post<VelocityReverseShipmentResponse>(
  '/custom/api/v1/reverse-order',
  reverseRequest
);
```

**Change to:**
```typescript
return await this.httpClient.post<VelocityReverseShipmentResponse>(
  '/custom/api/v1/reverse-order-orchestration',
  reverseRequest
);
```

**Why:** Same orchestration requirement as forward orders.

---

### ACTION 3: Fix Serviceability Request Fields

**File 1:** `server/src/infrastructure/external/couriers/velocity/velocity.types.ts`
**Lines:** 111-116
**Severity:** Critical - serviceability checks will fail

**Current code:**
```typescript
export interface VelocityServiceabilityRequest {
  pickup_pincode: string;
  delivery_pincode: string;
  cod: 0 | 1;
  weight: number;
}
```

**Change to:**
```typescript
export interface VelocityServiceabilityRequest {
  from: string;           // Origin pincode (was pickup_pincode)
  to: string;             // Destination pincode (was delivery_pincode)
  payment_mode: 'cod' | 'prepaid';  // Payment mode (was cod: 0|1)
  weight: number;
  shipment_type?: 'forward' | 'return';  // Optional: defaults to forward
}
```

**File 2:** `server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts`
**Lines:** 305-310 (getRates method)**
**Current code:**
```typescript
const serviceabilityRequest: VelocityServiceabilityRequest = {
  pickup_pincode: request.origin.pincode,
  delivery_pincode: request.destination.pincode,
  cod: request.paymentMode === 'cod' ? 1 : 0,
  weight: request.package.weight
};
```

**Change to:**
```typescript
const serviceabilityRequest: VelocityServiceabilityRequest = {
  from: request.origin.pincode,
  to: request.destination.pincode,
  payment_mode: request.paymentMode === 'cod' ? 'cod' : 'prepaid',
  weight: request.package.weight,
  shipment_type: 'forward'
};
```

**File 2 (continued):** Lines 435-439 (checkServiceability method)
**Current code:**
```typescript
const request: VelocityServiceabilityRequest = {
  pickup_pincode: defaultOrigin,
  delivery_pincode: pincode,
  cod: 1,
  weight: 0.5
};
```

**Change to:**
```typescript
const request: VelocityServiceabilityRequest = {
  from: defaultOrigin,
  to: pincode,
  payment_mode: 'cod',
  weight: 0.5,
  shipment_type: 'forward'
};
```

---

### ACTION 4: Fix Cancel Request Field

**File 1:** `server/src/infrastructure/external/couriers/velocity/velocity.types.ts`
**Lines:** 135-137
**Severity:** Critical - cancellation will fail

**Current code:**
```typescript
export interface VelocityCancelRequest {
  awb: string;
}
```

**Change to:**
```typescript
export interface VelocityCancelRequest {
  awbs: string[];  // Array of AWBs (API requires array, not single string)
}
```

**File 2:** `server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts`
**Lines:** 395-397 (cancelShipment method)

**Current code:**
```typescript
const request: VelocityCancelRequest = {
  awb: trackingNumber
};
```

**Change to:**
```typescript
const request: VelocityCancelRequest = {
  awbs: [trackingNumber]  // Wrap single AWB in array
};
```

---

### ACTION 5: Fix Warehouse Request Structure

**File 1:** `server/src/infrastructure/external/couriers/velocity/velocity.types.ts`
**Lines:** 147-162
**Severity:** High - warehouse creation may fail

**Current code:**
```typescript
export interface VelocityWarehouseRequest {
  name: string;
  phone: string;
  email: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  return_address: string;
  return_city: string;
  return_state: string;
  return_country: string;
  return_pin_code: string;
}
```

**Change to:**
```typescript
export interface VelocityWarehouseRequest {
  name: string;
  contact_person: string;      // Required by API
  phone_number: string;        // Was "phone"
  email: string;
  address_attributes: {        // Nested object (was flat)
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    zip: string;               // Was "pin_code"
  };
}
```

**File 2:** `server/src/infrastructure/external/couriers/velocity/velocity.mapper.ts`
**Lines:** 192-224 (mapToWarehouseRequest method)

**Current code:**
```typescript
static mapToWarehouseRequest(warehouse: { ... }): VelocityWarehouseRequest {
  return {
    name: warehouse.name,
    phone: this.normalizePhone(warehouse.contactInfo.phone),
    email: warehouse.contactInfo.email || 'noreply@Shipcrowd.com',
    address: warehouse.address.line1,
    address_2: warehouse.address.line2 || '',
    city: warehouse.address.city,
    state: warehouse.address.state,
    country: warehouse.address.country,
    pin_code: warehouse.address.postalCode,
    return_address: warehouse.address.line1,
    return_city: warehouse.address.city,
    return_state: warehouse.address.state,
    return_country: warehouse.address.country,
    return_pin_code: warehouse.address.postalCode
  };
}
```

**Change to:**
```typescript
static mapToWarehouseRequest(warehouse: { ... }): VelocityWarehouseRequest {
  return {
    name: warehouse.name,
    contact_person: warehouse.contactInfo.name,
    phone_number: this.normalizePhone(warehouse.contactInfo.phone),
    email: warehouse.contactInfo.email || 'noreply@Shipcrowd.com',
    address_attributes: {
      line1: warehouse.address.line1,
      line2: warehouse.address.line2 || '',
      city: warehouse.address.city,
      state: warehouse.address.state,
      country: warehouse.address.country,
      zip: warehouse.address.postalCode
    }
  };
}
```

---

### ACTION 6: Add Response Unwrapping Utility

**File:** `server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts`
**Location:** Add as a private method inside the `VelocityShipfastProvider` class (after the constructor, before `createShipment`)
**Severity:** High - responses may be silently misread

**Problem:** Velocity API wraps responses in two different formats:
- Orchestration endpoints: `{ status: 1, payload: { ... } }`
- Query endpoints: `{ status: "SUCCESS", result: { ... } }`

The current code reads `response.data` directly (line 218, 264, 333, 417, 458, 496), which captures the wrapper instead of the actual data.

**Add this method after line 113 (end of constructor):**
```typescript
/**
 * Unwrap Velocity API response from wrapper format
 * Handles both orchestration ({payload:...}) and query ({result:...}) formats
 */
private unwrapResponse<T>(responseData: any): T {
  // Case 1: Orchestration format { status: 1, payload: {...} }
  if (responseData && typeof responseData === 'object' && 'payload' in responseData) {
    return responseData.payload as T;
  }
  // Case 2: Query format { status: "SUCCESS", result: {...} }
  if (responseData && typeof responseData === 'object' && 'result' in responseData) {
    return responseData.result as T;
  }
  // Case 3: Direct data (no wrapper)
  return responseData as T;
}
```

**Then update every method that reads `response.data` directly:**

**createShipment (line 218):**
```typescript
// BEFORE:
const shipment = response.data;
// AFTER:
const shipment = this.unwrapResponse<VelocityShipmentResponse>(response.data);
```

**trackShipment (line 264):**
```typescript
// BEFORE:
const tracking = response.data[0];
// AFTER:
const trackingData = this.unwrapResponse<VelocityTrackingResponse[]>(response.data);
const tracking = trackingData[0];
```

**getRates (line 333):**
```typescript
// BEFORE:
const serviceability = response.data;
// AFTER:
const serviceability = this.unwrapResponse<VelocityServiceabilityResponse>(response.data);
```

**cancelShipment (line 417):**
```typescript
// BEFORE:
const cancellation = response.data;
// AFTER:
const cancellation = this.unwrapResponse<VelocityCancelResponse>(response.data);
```

**checkServiceability (line 458):**
```typescript
// BEFORE:
return response.data.is_serviceable;
// AFTER:
const serviceability = this.unwrapResponse<VelocityServiceabilityResponse>(response.data);
return serviceability.is_serviceable;
```

**createWarehouse (line 496):**
```typescript
// BEFORE:
const velocityWarehouse = response.data;
// AFTER:
const velocityWarehouse = this.unwrapResponse<VelocityWarehouseResponse>(response.data);
```

**createReverseShipment (line 624):**
```typescript
// BEFORE:
const reverseShipment = response.data;
// AFTER:
const reverseShipment = this.unwrapResponse<VelocityReverseShipmentResponse>(response.data);
```

---

### ACTION 7: Add Detailed Payload Types for Financial Tracking

**File:** `server/src/infrastructure/external/couriers/velocity/velocity.types.ts`
**Location:** After `VelocityShipmentResponse` (line 83)
**Severity:** Medium - charges data is lost without these fields

The current `VelocityShipmentResponse` (lines 74-83) is missing critical fields that the API actually returns. These are needed for financial reconciliation.

**Update the interface:**
```typescript
export interface VelocityShipmentResponse {
  shipment_id: string;
  order_id: string;
  awb: string;
  courier_name: string;
  courier_company_id: string;
  label_url: string;
  manifest_url?: string;
  status: string;
  // Add these fields for financial tracking:
  charges?: {
    freight_charge?: number;
    cod_charge?: number;
    weight_charge?: number;
    handling_charge?: number;
    total_charge?: number;
  };
  applied_weight?: number;       // Weight courier used for billing
  zone?: string;                 // Zone classification (A-E)
  estimated_delivery_date?: string;
}
```

**Then update the return value in createShipment (lines 228-234):**
```typescript
// BEFORE:
return {
  trackingNumber: shipment.awb,
  labelUrl: shipment.label_url,
  estimatedDelivery: undefined,
  cost: undefined,
  providerShipmentId: shipment.shipment_id
};

// AFTER:
return {
  trackingNumber: shipment.awb,
  labelUrl: shipment.label_url,
  estimatedDelivery: shipment.estimated_delivery_date
    ? new Date(shipment.estimated_delivery_date)
    : undefined,
  cost: shipment.charges?.total_charge,
  providerShipmentId: shipment.shipment_id
};
```

---

### ACTION 8: Fix Webhook Promise.allSettled Handling

**File:** `server/src/core/application/services/webhooks/velocity-webhook.service.ts`
**Lines:** 138-161
**Severity:** Medium - errors from e-commerce sync are silently swallowed

**Current code (lines 138-161):**
```typescript
Promise.allSettled([
  ShopifyFulfillmentService.handleShipmentStatusChange(...),
  WooCommerceFulfillmentService.handleShipmentStatusChange(...),
  AmazonFulfillmentService.handleShipmentStatusChange(...),
  FlipkartFulfillmentService.handleShipmentStatusChange(...),
]).catch((error) => {
  logger.warn('E-commerce fulfillment auto-sync encountered errors', { ... });
});
```

**Problem:** `Promise.allSettled` never rejects, so the `.catch()` never fires. Rejected results are in the settled array and are currently ignored.

**Change to:**
```typescript
Promise.allSettled([
  ShopifyFulfillmentService.handleShipmentStatusChange(
    String(shipment._id),
    internalStatus
  ),
  WooCommerceFulfillmentService.handleShipmentStatusChange(
    String(shipment._id),
    internalStatus
  ),
  AmazonFulfillmentService.handleShipmentStatusChange(
    String(shipment._id),
    internalStatus
  ),
  FlipkartFulfillmentService.handleShipmentStatusChange(
    String(shipment._id),
    internalStatus
  ),
]).then((results) => {
  const platforms = ['Shopify', 'WooCommerce', 'Amazon', 'Flipkart'];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn(`${platforms[index]} fulfillment sync failed`, {
        shipmentId: String(shipment._id),
        status: internalStatus,
        error: result.reason?.message || result.reason
      });
    }
  });
});
```

---

### ACTION 9: Fix Default Base URL

**File:** `server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts`
**Line:** 67
**Severity:** Critical for production

**Current code:**
```typescript
baseUrl: string = process.env.VELOCITY_BASE_URL || 'https://shazam.velocity.in'
```

**Verify:** `shazam.velocity.in` is the staging/sandbox URL. Production should use a different URL. Confirm the production URL from Velocity documentation before deployment.

**Update the JSDoc comment (line 5):**
```
* Base URL: https://shazam.velocity.in
```
Change to match whatever the production base URL is.

**Note:** This is not a code change now. Just ensure `VELOCITY_BASE_URL` is set correctly in `.env.production`.

---

### ACTION 10: Add `payment_mode` Field to Forward Order

**File:** `server/src/infrastructure/external/couriers/velocity/velocity.types.ts`
**Line:** 62
**Severity:** Medium - API may reject `payment_method` in favor of `payment_mode`

**Current code:**
```typescript
payment_method: 'COD' | 'PREPAID';
```

**Verify against Velocity API docs whether the field is `payment_method` or `payment_mode`.** If the API expects `payment_mode`:

**Change in types:**
```typescript
payment_mode: 'cod' | 'prepaid';  // lowercase per API spec
```

**Change in mapper (line 148):**
```typescript
// BEFORE:
payment_method: data.paymentMode === 'cod' ? 'COD' : 'PREPAID',
// AFTER:
payment_mode: data.paymentMode === 'cod' ? 'cod' : 'prepaid',
```

---

### ACTION 11: Add Shipment Status Update Transaction Wrapping

**File:** `server/src/core/application/services/webhooks/velocity-webhook.service.ts`
**Lines:** 89-119 (within handleStatusUpdate)
**Severity:** Medium - concurrent webhooks for same AWB could cause data corruption

**Current code** saves the shipment without a MongoDB session:
```typescript
shipment.statusHistory.push({ ... });
shipment.currentStatus = internalStatus;
await shipment.save();
```

**Wrap in a transaction:**
```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  shipment.statusHistory.push({
    status: internalStatus,
    timestamp: new Date(payload.timestamp || Date.now()),
    location: current_location || payload.tracking_event?.location,
    description: description || payload.tracking_event?.description,
    updatedBy: undefined
  });

  shipment.currentStatus = internalStatus;

  if (internalStatus === 'delivered') {
    shipment.actualDelivery = new Date();
  }

  if (internalStatus === 'ndr') {
    if (!shipment.ndrDetails) {
      shipment.ndrDetails = { ndrAttempts: 0, ndrStatus: 'pending' };
    }
    shipment.ndrDetails.ndrReason = description;
    shipment.ndrDetails.ndrDate = new Date();
    shipment.ndrDetails.ndrAttempts = (shipment.ndrDetails.ndrAttempts || 0) + 1;
    shipment.ndrDetails.ndrStatus = 'pending';
  }

  await shipment.save({ session });
  await session.commitTransaction();
} catch (txError) {
  await session.abortTransaction();
  throw txError;
} finally {
  session.endSession();
}
```

---

### ACTION 12: Add Webhook Idempotency Check

**File:** `server/src/core/application/services/webhooks/velocity-webhook.service.ts`
**Location:** At the top of `handleStatusUpdate` method, before the shipment lookup
**Severity:** Medium - duplicate webhooks may cause duplicate status entries

**Add at the beginning of handleStatusUpdate (after line 37):**
```typescript
// Idempotency: Check if we already processed this exact webhook
const webhookId = payload.webhook_id || `${payload.shipment_data.awb}-${payload.shipment_data.status_code}-${payload.timestamp}`;
const cacheKey = `webhook:velocity:${webhookId}`;

// Try Redis first (if available), fall back to in-memory Set
try {
  const { CacheService } = await import('../../../../infrastructure/cache/cache.service');
  const alreadyProcessed = await CacheService.get(cacheKey);
  if (alreadyProcessed) {
    logger.info('Duplicate webhook detected, skipping', { webhookId, awb: payload.shipment_data.awb });
    return {
      success: true,
      awb: payload.shipment_data.awb,
      orderId: payload.shipment_data.order_id,
      statusUpdated: false,
      timestamp: new Date()
    };
  }
  // Mark as processed (TTL: 24 hours)
  await CacheService.set(cacheKey, '1', 86400);
} catch (cacheError) {
  // Cache unavailable - proceed without dedup (log warning)
  logger.warn('Webhook dedup cache unavailable, proceeding', { webhookId });
}
```

---

### ACTION 13: Verify Tracking Response Structure

**File:** `server/src/infrastructure/external/couriers/velocity/velocity.types.ts`
**Lines:** 98-107

**Current `VelocityTrackingResponse`:**
```typescript
export interface VelocityTrackingResponse {
  awb: string;
  order_id: string;
  status: string;
  status_code: string;
  courier_name: string;
  current_location: string;
  estimated_delivery: string;
  tracking_history: VelocityTrackingEvent[];
}
```

**Add optional fields that the API may return:**
```typescript
export interface VelocityTrackingResponse {
  awb: string;
  order_id: string;
  status: string;
  status_code: string;
  courier_name: string;
  current_location: string;
  estimated_delivery: string;
  tracking_history: VelocityTrackingEvent[];
  tracking_url?: string;           // Public tracking URL
  delivered_date?: string;         // Actual delivery timestamp
  applied_weight?: number;         // Billed weight
  charges_breakdown?: {            // For settlement reconciliation
    freight_charge?: number;
    cod_charge?: number;
    total_charge?: number;
  };
}
```

---

### DAY 3: Velocity Verification

After applying all 13 actions above, run the following verification:

**Step 1: Run existing unit tests:**
```bash
cd server && npx jest tests/unit/velocity/ --verbose
```

**Step 2: Run existing integration tests:**
```bash
cd server && npx jest tests/integration/velocity/ --verbose
```

**Step 3: Manual API verification (requires staging credentials):**

Test each corrected endpoint against Velocity staging:

1. **Serviceability** - POST `/custom/api/v1/serviceability` with `{ from: "110001", to: "400001", payment_mode: "prepaid", weight: 0.5 }`
2. **Forward Order** - POST `/custom/api/v1/forward-order-orchestration` with a test order
3. **Tracking** - POST `/custom/api/v1/order-tracking` with `{ awbs: ["TEST_AWB"] }`
4. **Cancel** - POST `/custom/api/v1/cancel-order` with `{ awbs: ["TEST_AWB"] }`
5. **Warehouse** - POST `/custom/api/v1/warehouse` with nested `address_attributes`

**Step 4: Verify response unwrapping:**

For each API response, log the raw response and verify `unwrapResponse()` extracts the correct data. Check both `payload` and `result` wrapper formats.

**Pass criteria:**
- All 5 endpoints return 200 or expected error codes
- No field-level validation errors from the API
- `unwrapResponse()` correctly handles both wrapper formats
- Existing unit and integration tests still pass

---

## PHASE 2: CHANNEL E2E VERIFICATION (Days 4-7)

**Objective:** Verify Shopify and WooCommerce integrations work end-to-end without writing new backend code (since the audit confirmed backend is 100% complete). Fix any issues found during testing.

---

### Day 4-5: Shopify Integration Testing

**Prerequisites:**
1. A Shopify Partner account with a development store
2. Ngrok running to expose local server: `ngrok http 5005`
3. Set environment variables:
   - `SHOPIFY_API_KEY` = your app API key
   - `SHOPIFY_API_SECRET` = your app secret
   - `CLIENT_URL` = your frontend URL
   - `SERVER_URL` = your ngrok URL (e.g., `https://abc123.ngrok.io`)

**Test Case 1: OAuth Installation Flow**

Route: `GET /api/v1/integrations/shopify/install`
Controller: `server/src/presentation/http/controllers/integrations/shopify.controller.ts`

Steps:
1. Start the server: `cd server && npm run dev`
2. Navigate to: `{SERVER_URL}/api/v1/integrations/shopify/install?shop=your-dev-store.myshopify.com`
3. You should be redirected to Shopify OAuth consent screen
4. Click "Install App"
5. You should be redirected back to `{CLIENT_URL}/integrations/shopify/callback`

Verify:
- [ ] `shopify_stores` collection has a new document
- [ ] `accessToken` field is encrypted (not plain text)
- [ ] `webhookSecret` is generated
- [ ] `scope` contains all required permissions
- [ ] `syncConfig.orderSync.enabled` is `true`

If redirect fails, check:
- CORS settings in `app.ts` allow your ngrok domain
- `SHOPIFY_REDIRECT_URI` env var matches the callback URL registered in Shopify Partners

---

**Test Case 2: Webhook Registration Verification**

After OAuth completes, verify webhooks were registered:

Steps:
1. Open Shopify Admin > Settings > Notifications > Webhooks
2. OR use Shopify CLI: `shopify app webhook list`

Verify these 8 topics exist:
- [ ] `orders/create` -> `{SERVER_URL}/api/v1/webhooks/shopify/orders/create`
- [ ] `orders/updated` -> `{SERVER_URL}/api/v1/webhooks/shopify/orders/updated`
- [ ] `orders/cancelled` -> `{SERVER_URL}/api/v1/webhooks/shopify/orders/cancelled`
- [ ] `orders/fulfilled` -> `{SERVER_URL}/api/v1/webhooks/shopify/orders/fulfilled`
- [ ] `products/update` -> `{SERVER_URL}/api/v1/webhooks/shopify/products/update`
- [ ] `inventory_levels/update` -> `{SERVER_URL}/api/v1/webhooks/shopify/inventory_levels/update`
- [ ] `app/uninstalled` -> `{SERVER_URL}/api/v1/webhooks/shopify/app/uninstalled`
- [ ] `shop/update` -> `{SERVER_URL}/api/v1/webhooks/shopify/shop/update`

If webhooks are missing, manually trigger: `POST /api/v1/integrations/shopify/stores/{storeId}/test`

---

**Test Case 3: Order Sync**

Service: `server/src/core/application/services/shopify/shopify-order-sync.service.ts`

Steps:
1. Create 5 test orders in Shopify Dev Store (mix of COD and Prepaid)
   - Order 1: Prepaid, single item, Delhi pincode
   - Order 2: COD, single item, Mumbai pincode
   - Order 3: Prepaid, 3 items, Bangalore pincode
   - Order 4: COD, 1 item, Northeast state pincode (for Zone E testing)
   - Order 5: Prepaid, 1 item, same city as warehouse (for Zone A testing)
2. Wait 30 seconds for webhook delivery
3. OR trigger manual sync: `POST /api/v1/integrations/shopify/stores/{storeId}/sync/orders`

Verify in MongoDB `orders` collection:
- [ ] All 5 orders appear
- [ ] `paymentStatus` correctly maps (`paid` for prepaid, `pending` for COD)
- [ ] `customer.email` populated
- [ ] `lineItems` array matches Shopify items
- [ ] `source` is `shopify`
- [ ] `externalId` matches Shopify order ID
- [ ] Running sync again does NOT create duplicates (idempotency check)

---

**Test Case 4: Fulfillment Push to Shopify**

Service: `server/src/core/application/services/shopify/shopify-fulfillment.service.ts`

Steps:
1. Pick one synced order from Test Case 3
2. Create a shipment for it in Shipcrowd (via API or UI)
3. This should trigger fulfillment push to Shopify

Verify in Shopify Admin:
- [ ] Order shows as "Fulfilled"
- [ ] Tracking number appears
- [ ] Tracking URL is correct
- [ ] Customer received shipping notification email

If fulfillment doesn't push automatically, manually trigger:
`POST /api/v1/integrations/shopify/stores/{storeId}/orders/{orderId}/fulfill`

---

**Test Case 5: Webhook HMAC Verification**

Middleware: `server/src/presentation/http/middleware/webhooks/shopify-webhook-auth.middleware.ts`

Steps:
1. Send a POST request to `{SERVER_URL}/api/v1/webhooks/shopify/orders/create` with:
   - Valid HMAC header (computed from webhook secret + body)
   - Valid JSON body
2. Verify: Returns 200 OK
3. Modify 1 character in the body but keep the same HMAC
4. Verify: Returns 401 Unauthorized

---

### Day 6-7: WooCommerce Integration Testing

**Prerequisites:**
1. A WooCommerce store (local with Docker OR staging)
2. WooCommerce REST API Consumer Key and Consumer Secret
3. Ngrok running

**Test Case 6: Store Connection**

Route: `POST /api/v1/integrations/woocommerce/install`
Controller: `server/src/presentation/http/controllers/integrations/woocommerce.controller.ts`

Steps:
1. Send POST request:
   ```json
   {
     "storeUrl": "https://your-woo-store.com",
     "consumerKey": "ck_xxxx",
     "consumerSecret": "cs_xxxx"
   }
   ```
2. Service calls WooCommerce system status API to validate credentials

Verify in MongoDB `woocommerce_stores` collection:
- [ ] New document created
- [ ] `consumerKey` is encrypted (not plain text)
- [ ] `consumerSecret` is encrypted (not plain text)
- [ ] `webhookSecret` is generated
- [ ] `status` is `active`

---

**Test Case 7: WooCommerce Order Sync**

Service: `server/src/core/application/services/woocommerce/woocommerce-order-sync.service.ts`

Steps:
1. Create 3 test orders in WooCommerce
   - Order 1: COD payment
   - Order 2: Card/UPI payment (prepaid)
   - Order 3: Multiple items
2. Wait for webhook delivery OR trigger manual sync:
   `POST /api/v1/integrations/woocommerce/stores/{storeId}/sync/orders`

Verify:
- [ ] All 3 orders appear in `orders` collection
- [ ] `paymentStatus` correct (`cod` detected for COD)
- [ ] `source` is `woocommerce`
- [ ] Shipping address mapped correctly
- [ ] Billing address mapped correctly
- [ ] No duplicates on re-sync

---

**Test Case 8: WooCommerce Webhook HMAC Verification**

Middleware: `server/src/presentation/http/middleware/webhooks/woocommerce-webhook-auth.middleware.ts`

Steps (using Postman):
1. Generate HMAC-SHA256 of the JSON body using the webhook secret
2. Send POST to `{SERVER_URL}/api/v1/webhooks/woocommerce/order/created`
   - Header: `x-wc-webhook-signature: {computed_hmac}`
   - Body: valid WooCommerce order JSON
3. Verify: Returns 200 OK
4. Tamper with body, resend with same signature
5. Verify: Returns 401 Unauthorized

---

**Test Case 9: WooCommerce Fulfillment Update**

Service: `server/src/core/application/services/woocommerce/woocommerce-fulfillment.service.ts`

Steps:
1. Create a shipment for a WooCommerce order
2. Check that tracking info is pushed to WooCommerce

Verify in WooCommerce Admin:
- [ ] Order note added with tracking number
- [ ] Order status updated (processing -> completed, depending on config)

---

### Day 7: Channel Bug Fix Buffer

Reserve this day for fixing any issues discovered during Days 4-6. Common issues:

- HMAC verification failures (check raw body parsing in `app.ts`)
- Webhook URL mismatches (check ngrok URL vs registered webhook URLs)
- Encrypted token decryption failures (check `ENCRYPTION_KEY` env var)
- Order field mapping issues (check WooCommerce vs Shopify field names)

If no bugs found, use this day to start Phase 3 early.

---

## PHASE 3: INTEGRATION & STRESS TESTING (Days 8-11)

**Objective:** Verify all systems work together correctly under load.

---

### Day 8: End-to-End Pipeline Tests

**Test Case 10: Complete Shopify -> Velocity -> Wallet Pipeline**

This tests the entire flow from order creation to financial settlement.

Steps:
1. Create a Shopify order (Prepaid, weight 1kg, Delhi -> Mumbai)
2. Wait for order sync to Shipcrowd
3. Create shipment via Shipcrowd API (uses Velocity)
4. Verify:
   - [ ] Shipment created with AWB from Velocity
   - [ ] Wallet debited for shipping cost (check `wallet_transactions` collection)
   - [ ] `balanceBefore` and `balanceAfter` are correct
   - [ ] Fulfillment pushed to Shopify (tracking number visible)
5. Simulate delivery webhook: POST to `/api/v1/webhooks/velocity` with `{ event_type: "SHIPMENT_STATUS_UPDATE", shipment_data: { awb: "TEST_AWB", status_code: "DEL" } }`
6. Verify:
   - [ ] Shipment status updated to `delivered`
   - [ ] Shopify order status updated via auto-sync
   - [ ] `actualDelivery` timestamp set

**Test Case 11: Complete WooCommerce -> Velocity -> Wallet Pipeline**

Same as Test Case 10 but with WooCommerce order source.

**Test Case 12: COD Order Pipeline**

Steps:
1. Create COD order (any source)
2. Create shipment
3. Verify wallet debited for shipping cost (NOT for COD amount)
4. Simulate delivery
5. Verify COD remittance eligibility (check `cod-remittance.service.ts` `getEligibleShipments()`)

---

### Day 9: Wallet & Finance Integrity

**Test Case 13: Double-Spend Prevention**

Script location: `server/scripts/verify-shipment-wallet.ts`

Steps:
1. Set a company wallet balance to exactly Rs 500
2. Create a test that attempts to debit Rs 200 five times concurrently:
   ```typescript
   const promises = Array(5).fill(null).map(() =>
     walletService.debit(companyId, 200, 'shipping_cost', { type: 'shipment', id: new ObjectId() })
   );
   const results = await Promise.allSettled(promises);
   ```
3. Verify:
   - [ ] Exactly 2 succeed (500 / 200 = 2 full debits)
   - [ ] Exactly 3 fail with `INSUFFICIENT_BALANCE` or `VERSION_CONFLICT`
   - [ ] Final balance is exactly Rs 100
   - [ ] `wallet_transactions` has exactly 2 debit entries

**Test Case 14: Invoice Generation**

Script location: `server/scripts/trigger-invoice-generation.ts`

Steps:
1. Ensure at least 5 delivered shipments exist for a company
2. Run the invoice generation script
3. Verify in `invoices` collection:
   - [ ] Invoice created with correct `billingPeriod`
   - [ ] `lineItems` match delivered shipments
   - [ ] GST calculation correct (18% total)
   - [ ] If same state: CGST 9% + SGST 9%
   - [ ] If different state: IGST 18%
   - [ ] `invoiceNumber` follows pattern `INV-YYYYMM-XXXX`

---

### Day 10: Rate Card Accuracy

**Test Case 15: Rate Calculation Accuracy (1000 Routes)**

Steps:
1. Write a script that calculates rates for 1000 random pincode pairs:
   ```typescript
   const testRoutes = generateRandomPincodePairs(1000); // from pincodes.csv
   for (const route of testRoutes) {
     const result = await dynamicPricingService.calculatePricing({
       fromPincode: route.from,
       toPincode: route.to,
       weight: randomWeight(0.5, 20),
       paymentMode: Math.random() > 0.5 ? 'cod' : 'prepaid',
       orderValue: randomValue(100, 10000)
     });
     // Verify: result.total > 0, result.zone is valid (A-E), GST breakdown correct
   }
   ```
2. Verify:
   - [ ] Zero calculation errors
   - [ ] All zones assigned correctly
   - [ ] Zone A = same city pairs
   - [ ] Zone E = JK/NE state pairs
   - [ ] Zone C = both metro city pairs (Delhi-Mumbai, etc.)
   - [ ] COD charges = max(codMinimumCharge, orderValue * codPercentage / 100)
   - [ ] Redis cache hit rate > 70% on second run

**Test Case 16: Smart Rate Calculator**

Steps:
1. Call `POST /api/v1/ratecards/smart-calculate` with:
   ```json
   {
     "fromPincode": "110001",
     "toPincode": "400001",
     "weight": 1.5,
     "paymentMode": "prepaid",
     "scoringWeights": { "price": 40, "speed": 30, "reliability": 15, "performance": 15 }
   }
   ```
2. Verify:
   - [ ] Response contains ranked courier options
   - [ ] Tags assigned correctly (CHEAPEST, FASTEST, RECOMMENDED)
   - [ ] Scores sum and normalization are correct

---

### Day 11: Webhook Storm Test

**Test Case 17: Concurrent Webhook Processing**

Steps:
1. Write a script that sends 500 webhooks to `/api/v1/webhooks/velocity` concurrently:
   ```typescript
   const webhooks = Array(500).fill(null).map((_, i) => ({
     event_type: 'SHIPMENT_STATUS_UPDATE',
     webhook_id: `test-${i}`,
     timestamp: new Date().toISOString(),
     shipment_data: {
       awb: `AWB-${i % 100}`,  // 100 unique AWBs, some duplicates
       order_id: `ORD-${i % 100}`,
       status: 'IT',
       status_code: 'IT',
       current_location: 'Mumbai Hub',
       description: 'In transit'
     }
   }));
   await Promise.allSettled(webhooks.map(w => fetch(webhookUrl, { method: 'POST', body: JSON.stringify(w) })));
   ```
2. Verify:
   - [ ] Server doesn't crash
   - [ ] Response times < 500ms (p95)
   - [ ] No duplicate status entries for same AWB
   - [ ] Idempotency check prevents reprocessing

---

## PHASE 4: PRODUCTION DEPLOYMENT (Days 12-14)

---

### Day 12: Environment Configuration

**Required Environment Variables** (`.env.production`):

```bash
# Server
NODE_ENV=production
PORT=5005
SERVER_URL=https://api.shipcrowd.com

# Client
CLIENT_URL=https://app.shipcrowd.com

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/shipcrowd?retryWrites=true&w=majority

# Redis
REDIS_URL=redis://default:password@host:6379

# Velocity
VELOCITY_BASE_URL=https://shazam.velocity.in   # VERIFY: Is this production URL?
VELOCITY_CHANNEL_ID=27202                        # VERIFY: Is this your channel ID?

# Shopify
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret

# Razorpay (for wallet recharge + COD payouts)
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=xxxx

# Security
ENCRYPTION_KEY=32_char_random_string            # For AES-256-CBC
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_USER=notifications@shipcrowd.com
SMTP_PASS=app_password
```

**Checklist:**
- [ ] Every `process.env.VARIABLE` used in code has a corresponding value
- [ ] No staging/test values in production config
- [ ] `ENCRYPTION_KEY` is NOT the same as development
- [ ] MongoDB URI points to Atlas cluster with replica set enabled
- [ ] Redis is persistent (not ephemeral)

---

### Day 13: Database Setup & Seeding

**Step 1: Run migrations/seeders**
```bash
cd server && npm run seed
```

This should run all seeders including:
- `23-rate-card-and-zones.seeder.ts` (Zones A-D, default rate cards)
- `28-pincodes.seeder.ts` (pincode data)
- Other seeders for default data

**Step 2: Verify indexes exist**

The following indexes should already be defined in Mongoose schemas. Verify they exist in Atlas:

```
# Critical indexes (verify in MongoDB Atlas > Collections > Indexes)
shipments: { 'carrierDetails.carrierTrackingNumber': 1 }
shipments: { trackingNumber: 1 }
orders: { 'external.id': 1, 'external.source': 1 }
wallet_transactions: { companyId: 1, createdAt: -1 }
wallet_transactions: { 'reference.type': 1, 'reference.id': 1 }
invoices: { companyId: 1, createdAt: -1 }
invoices: { irn: 1 } (sparse)
cod_remittances: { remittanceId: 1 } (unique)
cod_remittances: { companyId: 1, status: 1, createdAt: -1 }
shopify_stores: { companyId: 1 }
woocommerce_stores: { companyId: 1 }
```

**Step 3: Verify pincode loading**

Check server logs on startup for:
```
Loaded 154,799 pincodes from CSV into memory
```

If this number is significantly lower, check `server/src/assets/pincodes.csv`.

---

### Day 14: Deploy & Smoke Test

**Step 1: Build**
```bash
# Backend
cd server && npm run build

# Frontend
cd client && npm run build
```

**Step 2: Deploy**

Deploy to your infrastructure (AWS/Vercel/Render/Railway).

**Step 3: Smoke Tests (run immediately after deploy)**

```bash
# 1. Health check
curl https://api.shipcrowd.com/health
# Expected: 200 OK

# 2. Velocity serviceability
curl -X POST https://api.shipcrowd.com/api/v1/ratecards/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"fromPincode":"110001","toPincode":"400001","weight":1,"paymentMode":"prepaid"}'
# Expected: 200 with rate calculation

# 3. Shopify webhook endpoint reachable
curl -X POST https://api.shipcrowd.com/api/v1/webhooks/shopify/orders/create \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 401 (HMAC verification failed - means endpoint exists)

# 4. WooCommerce webhook endpoint reachable
curl -X POST https://api.shipcrowd.com/api/v1/webhooks/woocommerce/order/created \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 401 (signature verification failed - means endpoint exists)
```

**Step 4: First Live Shipment**

1. Connect a real Shopify store
2. Create a real test order (ship to yourself)
3. Create shipment via Shipcrowd
4. Verify AWB generated, label downloadable
5. Verify wallet debited
6. Track shipment until delivery
7. Verify COD remittance (if COD order)
8. Verify invoice generation

---

## SUCCESS CRITERIA

| ID | Criteria | Target | Measurement |
|:---|:---|:---|:---|
| SC-1 | Velocity API success rate | > 99.5% | Count 200 responses / total requests |
| SC-2 | Webhook processing time | < 500ms (p95) | Log timestamp analysis |
| SC-3 | Order sync latency | < 60s | Time from Shopify order creation to Shipcrowd `orders` entry |
| SC-4 | Wallet accuracy | 0 discrepancies | `balanceBefore + amount = balanceAfter` for every transaction |
| SC-5 | Rate calculation accuracy | 100% | Zone assignment matches pincode logic for all test cases |
| SC-6 | Zero data loss | 0 | Every order, shipment, and webhook is persisted |
| SC-7 | No duplicate processing | 0 | Webhook idempotency prevents double status entries |

---

## POST-LAUNCH (Week 3-4)

### Monitoring Checklist (Daily)
- [ ] Shipment creation success rate
- [ ] Webhook delivery rate (check dead letter queue)
- [ ] Wallet balance consistency
- [ ] API response times (p50, p95, p99)
- [ ] Error rate in server logs

### First 100 Shipments Milestone
- [ ] 100 shipments created successfully
- [ ] All AWBs trackable
- [ ] Financial reconciliation matches (charges vs wallet debits)
- [ ] At least 1 COD remittance processed
- [ ] At least 1 invoice generated
- [ ] Shopify/WooCommerce sync working for all connected stores

### Future Courier Integration (Post-Launch)
- Delhivery: Implement `ICourierAdapter` using `CourierRegistry.register()`
- XpressBees: Same pattern
- Ecom Express: Same pattern

Each new courier follows the abstraction pattern and takes significantly less time than Velocity due to the shared base adapter and mapper utilities.

Ok, so now Velocity API is properly implemented, and everything is working. So, now let's start our new task. 

Shipcrowd Ecosystem Audit Report: The Gap Analysis
Date: Jan 29, 2026 Accuracy: 100% Code-Level Verification Status: ⚠️ SIGNIFICANT GAPS IDENTIFIED

This report compares your Ideal State (The Compendium) vs. Actual Codebase.

🚨 Executive Summary
"The Dream is bigger than the Reality." While your data models (Schemas) are excellent and cover 90% of the ecosystem, the Service Logic (The "Brain") is missing for key operations like Risk, Advanced Routing, and Automated Dispute Resolution.

Feature Area	Model Status	Service Logic Status	Verdict
Shopify Ingestion	✅ Excellent	✅ Full Sync Implemented	PRODUCTION READY
Smart Routing	⚠️ Partial	❌ Missing "Gold Tier/Smart Logic"	BASIC ONLY
NDR Workflow	✅ 
NDREvent
 exists	⚠️ Mocked/Manual Only	PARTIAL
Weight Dispute	✅ 
WeightDispute
 exists	❌ No Service Logic Found	MISSING
COD Remittance	✅ Excellent Schema	❌ Missing "Excel Import" Logic	PARTIAL
Risk Engine	❌ No Model	❌ No Logic	NON-EXISTENT
🔍 Detailed Gap Analysis
1. The Order Journey (Ingestion -> Manifest)
✅ What Exists:
ShopifyOrderSyncService: Fully verified. Webhooks for orders/create are wired up.
Velocity.createShipment(): Works perfectly.
❌ What is Missing:
Quarantine Logic: The "Invalid Pincode -> Quarantine" flow does not exist in code. Invalid orders currently just fail or throw errors.
Smart Routing: The ServiceabilityService (or equivalent) that queries Velocity/Delhivery/Smartr and applies "Cheapest + Gold Tier" logic is MISSING. We only have simple RateCard logic.
2. The NDR Workflow (Failure Management)
✅ What Exists:
NDREvent
 Model: Tracks status detected, resolved, rto_triggered.
NDRResolutionJob: Exists to clean up expired NDRs.
❌ What is Missing:
The "Human" Layer: No CommunicationService found to send the "Hey Rahul, we missed you" WhatsApp.
Ghost Delivery Detection: No logic exists to flag "Fake Attempts" by riders.
3. The Dispute Level (Weight Fraud)
✅ What Exists:
WeightDispute
 Model: Comprehensive fields for evidence, carrierEvidence.
❌ What is Missing:
The Service Layer: No WeightDisputeService was found. The logic to "Auto-Debit Wallet" or "Auto-Win if < 5%" is NOT IMPLEMENTED. It is currently just a database schema waiting for code.
4. The Money Circle (COD Remittance)
✅ What Exists:
CODRemittanceService
: Can aggregate internal DB shipments and initiate Razorpay Payouts.
Razorpay Integration: 
initiatePayout
 method is fully coded and functional.
❌ CRITICAL GAP:
Excel Parsing: You asked: "Where, how i will get this excel file?" -> The code DOES NOT have the logic to parse Velocity's MIS Excel file.
Reconciliation: The current code assumes Shipcrowd's DB is always right. It does not reconcile against the "Cash actually collected" by Velocity. This is dangerous financial territory.
5. Edge Cases (Risk & Loss)
❌ MISSING:
LostShipmentJob: Does not exist. Packages stuck in IN_TRANSIT for 30 days are ignored by the system.
Risk Engine: No code exists to block "RTO Fraud" customers or specific Pincodes.
🛠️ The Fix List (Prioritized)
To make the "Compendium" a reality, we must build these 4 blocks:

Build RemittanceReconciliationService:

Input: velocity_mis.xlsx
Process: Compare Excel.cod_amount vs DB.cod_amount.
Output: 
RemittanceBatch
 (Only pay for what Courier confirms).
Build WeightDisputeService:

Implement the "Auto-Debit" and "Logic Checks" (e.g. 5% threshold).
Build SmartRouter:

A simple service that calls Velocity.getRates() and selects the winner.
Build CommunicationService:

Simple Twilio/WhatsApp API hook for NDRs.
Final Word
Shipcrowd is currently a "Ferrari Chassis with a Corolla Engine". The data models are enterprise-grade, but the operational engines (Risk, Dispute, Reconciliations) are missing.

Shipcrowd: The "Missing Features" Report
Objective: Identify what is missing to make Shipcrowd a true competitor to Shiprocket/NimbusPost. Basis: Deep Codebase Audit vs. Industry Standard Features.

🛑 Critical Functional Gaps (Must-Haves)
1. The Developer Experience (Outbound Webhooks)
The Gap: Currently, Shipcrowd can receive webhooks (from Shopify/Velocity), but it cannot send them to custom sellers.
Why it matters: If a sophisticated seller (using a custom Python/PHP site) wants real-time tracking updates, they currently have to poll your API every 15 minutes. This crushes your server load and is bad practice.
Missing Code: WebhookSubscription Model, WebhookDispatcher Service.
2. Bulk Operations Layer
The Gap: You have Bulk Order Import (CSV), but you lack:
Bulk Label Generation: "Select 50 orders -> Print 1 PDF".
Bulk Manifest: "Select 100 orders -> Generate Daily Pickup Sheet".
Why it matters: A seller with 500 orders/day cannot print labels one by one. This renders the platform unusable for high-volume merchants.
Missing Code: BulkShipmentController, LabelMergerService (PDF merging).
3. The "Risk Engine" (RTO Protection)
The Gap: No logic to detect "Bad Buyers".
Why it matters: The #1 reason sellers switch aggregators is "RTO Reduction". Competitors have a shared database of "Fraud Customers".
Missing Code: FraudDatabase Model, RiskScore Service (Customer Phone -> Risk Level).
4. Rate Card Management UI
The Gap: I see RateCard logic, but no "Rate Card Uploader" for the Admin.
Why it matters: If Velocity changes rates tomorrow, the Super Admin currently has to (likely) update a JSON file or run a DB script. There should be a "Upload CSV" feature for Rate Cards.
Missing Code: RateCardController.upload(), RateCardValidator.
🎨 Experience Gaps (Nice-to-Haves)
5. Branded Tracking & Marketing
The Gap: Tracking links currently (presumably) go to a generic page.
Missing Feature: "Post-Purchase Experience".
Sellers should be able to upload their Logo, Instagram Feed, and Promotional Banners on the Tracking Page to drive repeat sales.
Missing Code: TrackingPageConfig Model.
6. NDR "Action Center" (The Human Element)
The Gap: 
NDREvent
 exists, but the "Seller Action Dashboard" logic is thin.
Missing Feature: A unified view where the Seller sees "10 Pending NDRs" and can click "Reattempt" or "RTO" in bulk.
📉 Summary Checklist for "Version 4.0"
Feature	Priority	Effort	Status
Bulk Label Printing	🔴 HIGH	Medium	MISSING
Developer Webhooks	🔴 HIGH	High	MISSING
Risk Engine	🟠 MED	High	MISSING
Rate Card Uploader	🟠 MED	Low	MISSING
Branded Tracking	🟢 LOW	Medium	MISSING
Recommendation: Start with Bulk Label Printing. Without it, you cannot onboard any seller doing >10 orders/day.