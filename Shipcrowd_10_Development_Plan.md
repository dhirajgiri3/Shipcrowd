# ShipCrowd 10-Day Parallel Development Plan

## Executive Summary

**Project:** ShipCrowd Logistics Platform - Final 20% Completion
**Duration:** 10 days (5 core + 5 buffer) = 320 developer-hours total
**Team:** 4 senior developers working in parallel
**Prerequisites:** API credentials ready for Delhivery & Ekart
**Goal:** Complete courier integrations, comprehensive testing, and landing page improvements

### Timeline Overview
- **Days 1-5:** Core implementation and primary testing
- **Days 6-10:** Buffer for edge cases, additional testing, documentation, and polish

---

## Current State Analysis

### Courier Integrations Status
| Courier | Status | What Exists | What's Needed |
|---------|--------|-------------|---------------|
| **Velocity Shipfast** | ✅ 100% Complete | Full implementation (14 methods) | Testing only |
| **Delhivery** | ❌ Stub Only | Rate comparison stub | Full API integration |
| **Ekart** | ❌ Stub Only | Rate comparison stub | Full API integration |

### E-commerce Integrations Status
| Platform | Status | Notes |
|----------|--------|-------|
| **Shopify** | ✅ Complete | OAuth, sync, fulfillment, webhooks |
| **WooCommerce** | ✅ Complete | OAuth, sync, fulfillment, webhooks |
| **Amazon** | ⚠️ Framework exists | Needs verification |
| **Flipkart** | ⚠️ Framework exists | Needs verification |

### Testing Status
- **571 test files** exist in `/server/tests/`
- Good coverage: Velocity courier, auth basics, some finance
- **Gaps:** E2E integration tests, landing page tests, comprehensive RBAC tests

---

## API Quick Reference

### Delhivery B2C API Summary
| Feature | Endpoint | Method | Rate Limit |
|---------|----------|--------|------------|
| **Pincode Serviceability** | `/c/api/pin-codes/json/` | GET | 4500/5min |
| **Expected TAT** | `/api/dc/expected_tat` | GET | 750/5min |
| **Fetch Waybill** | `/waybill/api/fetch/json/` | GET | 750/5min |
| **Bulk Waybill** | `/waybill/api/bulk/json/` | GET | 5/5min (max 10k waybills) |
| **Create Shipment** | `/api/cmu/create.json` | POST | N/A |
| **Track Shipment** | `/api/v1/packages/json/` | GET | 750/5min (50 AWBs max) |
| **Cancel Shipment** | `/api/p/edit` | POST | N/A |
| **Edit Shipment** | `/api/p/edit` | POST | N/A |
| **Shipping Label** | `/api/p/packing_slip` | GET | 3000/5min |
| **Shipping Cost** | `/api/kinko/v1/invoice/charges/.json` | GET | 50/5min |
| **Pickup Request** | `/fm/request/new/` | POST | 4000/5min |
| **Create Warehouse** | `/api/backend/clientwarehouse/create/` | POST | N/A |
| **Update Warehouse** | `/api/backend/clientwarehouse/edit/` | POST | N/A |
| **NDR Action** | `/api/p/update` | POST | N/A |
| **Download Documents** | `/api/rest/fetch/pkg/document/` | GET | N/A |

**Base URLs:**
- **Staging:** `https://staging-express.delhivery.com`
- **Production:** `https://track.delhivery.com`

**Authentication:** Static API Token (Header: `Authorization: Token <api_token>`)

### Ekart API Summary (v3.8.8)
| Feature | Endpoint | Method |
|---------|----------|--------|
| **Get Auth Token** | `/integrations/v2/auth/token/{client_id}` | POST |
| **Create Shipment** | `/api/v1/package/create` | PUT |
| **Cancel Shipment** | `/api/v1/package/cancel` | DELETE |
| **Track Shipment** | `/api/v1/track/{id}` | GET |
| **Raw Track Data** | `/data/v1/elite/track/{wbn}` | GET |
| **Download Label** | `/api/v1/package/label` | POST |
| **Get Rates** | `/data/pricing/estimate` | POST |
| **Download Manifest** | `/data/v2/generate/manifest` | POST |
| **Add Address** | `/api/v2/address` | POST |
| **Get Addresses** | `/api/v2/addresses` | GET |
| **NDR Action** | `/api/v2/package/ndr` | POST |
| **Serviceability** | `/api/v2/serviceability/{pincode}` | GET |
| **Advanced Serviceability** | `/data/v3/serviceability` | POST |
| **Bulk Serviceability** | `/data/serviceability/bulk/{type}` | GET |
| **Add Webhook** | `/api/v2/webhook` | POST |
| **Update Webhook** | `/api/v2/webhook/{webhook_id}` | PUT |
| **Get Webhooks** | `/api/v2/webhook` | GET |
| **Set Dispatch Date** | `/data/shipment/dispatch-date` | POST |

**Base URL:** `https://app.elite.ekartlogistics.in`

**Authentication:** Bearer Token (24-hour expiry, cached)
- Header: `Authorization: Bearer <access_token>`

---

## Developer Assignments

| Developer | Primary Responsibility | Days 1-4 | Day 5 |
|-----------|----------------------|----------|-------|
| **Dev1** | Delhivery Integration | Full courier implementation | Integration tests & docs |
| **Dev2** | Ekart Integration | Full courier implementation | Integration tests & docs |
| **Dev3** | Auth/RBAC + E-commerce Testing | Comprehensive test suites | Coverage report |
| **Dev4** | Landing Page + Order Management Tests | UI fixes + Order tests | Final polish |

---

## Day-by-Day Timeline

### DAY 1: Foundation & Setup

#### Dev1: Delhivery - Research & Architecture
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Study Delhivery B2C API documentation at `docs/Resources/API/Courier/Delhivery/B2C/`
2. Create type definitions:
   - File: `/server/src/infrastructure/external/couriers/delhivery/delhivery.types.ts`
   ```typescript
   // Key types to define:
   interface DelhiveryShipmentRequest {
     name: string;           // Consignee name
     add: string;            // Address
     pin: string;            // 6-digit pincode
     city: string;
     state: string;
     country: string;
     phone: string;          // 10-digit phone
     order: string;          // Unique order ID
     payment_mode: 'Prepaid' | 'COD' | 'Pickup' | 'REPL';
     weight?: number;        // in grams
     shipping_mode?: 'Surface' | 'Express';
     cod_amount?: number;
     // ... see full spec in API docs
   }

   // Status types: UD (Undelivered), DL (Delivered), RT (Return), CN (Cancelled), PP (Pickup), PU (Pickup Complete)
   type DelhiveryStatusType = 'UD' | 'DL' | 'RT' | 'CN' | 'PP' | 'PU';
   ```

3. Create auth handler:
   - File: `/server/src/infrastructure/external/couriers/delhivery/delhivery.auth.ts`
   - **Note:** Delhivery B2C uses static API token (no expiry)
   - Store token in environment variable `DELHIVERY_API_TOKEN`

4. Document rate limits table (see API Quick Reference above)

**Afternoon (4h):**
5. Create main provider skeleton:
   - File: `/server/src/infrastructure/external/couriers/delhivery/delhivery.provider.ts`
   - Extend `BaseCourierAdapter` from [courier.adapter.ts](server/src/infrastructure/external/couriers/base/courier.adapter.ts)
6. Implement HTTP client with axios:
   ```typescript
   // No token refresh needed - static token
   const client = axios.create({
     baseURL: process.env.DELHIVERY_BASE_URL,
     headers: {
       'Authorization': `Token ${process.env.DELHIVERY_API_TOKEN}`,
       'Content-Type': 'application/json',
       'Accept': 'application/json'
     }
   });
   ```
7. Set up environment variables in `.env.example`

**Reference:** Follow Velocity pattern at [velocity-shipfast.provider.ts](server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts)

---

#### Dev2: Ekart - Research & Architecture
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Study Ekart API documentation at `docs/Resources/API/Courier/Ekart/Ekart_API.md`
2. Create type definitions:
   - File: `/server/src/infrastructure/external/couriers/ekart/ekart.types.ts`
   ```typescript
   // Key types to define:
   interface EkartAuthRequest {
     username: string;
     password: string;
   }

   interface EkartAuthResponse {
     access_token: string;
     scope: string;
     expires_in: number;  // seconds (typically 24 hours)
     token_type: 'Bearer';
   }

   interface EkartShipmentRequest {
     seller_name: string;
     seller_address: string;
     seller_gst_tin: string;
     consignee_name: string;
     order_number: string;
     invoice_number: string;
     invoice_date: string;
     payment_mode: 'COD' | 'Prepaid' | 'Pickup';  // Pickup for reverse
     total_amount: number;
     tax_value: number;
     taxable_amount: number;
     cod_amount: number;  // 0-49999
     weight: number;      // grams
     length: number;      // cm
     height: number;      // cm
     width: number;       // cm
     drop_location: EkartLocation;
     pickup_location: EkartLocation;
     return_location?: EkartLocation;
     // Optional features:
     mps?: boolean;       // Multi-package shipment
     obd_shipment?: boolean;  // Open Box Delivery
     qc_details?: EkartQCDetails;  // Quality Check for reverse
   }
   ```

3. Create auth handler with token caching:
   - File: `/server/src/infrastructure/external/couriers/ekart/ekart.auth.ts`
   - **Important:** Token expires in 24 hours but API returns cached token
   - Implement token refresh before expiry

4. Create status mapping enum:
   ```typescript
   // Ekart statuses to internal status mapping
   const EKART_STATUS_MAP = {
     'Order Placed': 'pending',
     'Picked Up': 'picked_up',
     'In Transit': 'in_transit',
     'Out for Delivery': 'out_for_delivery',
     'Delivered': 'delivered',
     'Cancelled': 'cancelled',
     'RTO Initiated': 'rto_initiated',
     'RTO Delivered': 'rto_delivered',
     // NDR statuses have ndrStatus and ndrActions fields
   };
   ```

**Afternoon (4h):**
5. Create main provider skeleton:
   - File: `/server/src/infrastructure/external/couriers/ekart/ekart.provider.ts`
6. Create error handler:
   - File: `/server/src/infrastructure/external/couriers/ekart/ekart-error-handler.ts`
7. Set up environment variables

**Reference:** Follow [velocity-error-handler.ts](server/src/infrastructure/external/couriers/velocity/velocity-error-handler.ts)

---

#### Dev3: Auth/RBAC Testing - Infrastructure
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Review existing test patterns in `/server/tests/`
2. Extend user factory for all roles:
   - File: `/server/tests/fixtures/userFactory.ts`
   - Add: admin, seller, staff (manager/member), viewer factories
3. Create test database seeding scripts
4. Set up test environment configuration

**Afternoon (4h):**
5. Create registration flow tests:
   - File: `/server/tests/integration/auth/registration-flows.test.ts`
   - Test: with invitation, without company, duplicate email
6. Create password flow tests:
   - File: `/server/tests/integration/auth/password-flows.test.ts`
   - Test: reset flow, change flow, strength validation

**Endpoints to Test:**
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/reset-password`
- `POST /auth/reset-password/confirm`
- `POST /auth/verify-email`

---

#### Dev4: Landing Page - Audit & Initial Fixes
**Priority:** P1-High | **Hours:** 8

**Morning (4h):**
1. Audit Hero component for issues:
   - File: [Hero.tsx](client/src/features/landing/components/Hero/Hero.tsx)
2. Document all issues found:
   - Image loading failures (lines 289-319)
   - Hardcoded Cloudinary URL (line 231)
   - Accessibility gaps
   - Performance concerns
3. Create issue checklist in markdown

**Afternoon (4h):**
4. Fix image loading issues:
   - Implement proper error fallbacks
   - Add lazy loading for carrier logos
   - Move hardcoded URLs to environment config
5. Create component test file:
   - File: `/client/src/features/landing/components/Hero/Hero.test.tsx`

**Issues to Fix:**
- Line 231: Hardcoded Cloudinary logo URL
- Lines 289-298: Hardcoded carrier logo paths
- Lines 310-318: Error handler with non-null assertions

---

### DAY 2: Core Implementation

#### Dev1: Delhivery - Core Methods
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Implement `createShipment()`:
   - API: `POST /api/cmu/create.json`
   - **Important:** Payload format: `format=json&data={shipments: [...], pickup_location: {name: "warehouse_name"}}`
   - Handle both SPS (Single Piece) and MPS (Multi-Piece) shipments
   - Payment modes: Prepaid, COD, Pickup (reverse), REPL (replacement)
   ```typescript
   async createShipment(data: CourierShipmentData): Promise<CourierShipmentResponse> {
     const payload = `format=json&data=${JSON.stringify({
       shipments: [this.mapper.toShipmentRequest(data)],
       pickup_location: { name: data.warehouseName }
     })}`;

     const response = await this.client.post('/api/cmu/create.json', payload, {
       headers: { 'Content-Type': 'application/json' }
     });

     return this.mapper.toShipmentResponse(response.data);
   }
   ```

2. Implement `trackShipment()`:
   - API: `GET /api/v1/packages/json/?waybill={waybill}`
   - Can track up to 50 waybills comma-separated
   - Map status types: UD, DL, RT, CN to internal statuses

3. Create data mapper:
   - File: `/server/src/infrastructure/external/couriers/delhivery/delhivery.mapper.ts`
   - Map Delhivery statuses to internal statuses:
     ```typescript
     const STATUS_MAP = {
       'Manifested': { status: 'manifested', statusType: 'UD' },
       'In Transit': { status: 'in_transit', statusType: 'UD' },
       'Pending': { status: 'pending', statusType: 'UD' },
       'Dispatched': { status: 'out_for_delivery', statusType: 'UD' },
       'Delivered': { status: 'delivered', statusType: 'DL' },
       'RTO': { status: 'rto_delivered', statusType: 'DL' },
       'Not Picked': { status: 'not_picked', statusType: 'UD' },
     };
     ```

**Afternoon (4h):**
4. Implement `getRates()`:
   - API: `GET /api/kinko/v1/invoice/charges/.json`
   - Required params: `md` (E/S), `cgm` (weight grams), `o_pin`, `d_pin`, `ss` (Delivered/RTO/DTO), `pt` (Pre-paid/COD)
   - **Note:** Staging returns 0 charges - use production for testing

5. Implement `checkServiceability()`:
   - API: `GET /c/api/pin-codes/json/?filter_codes={pincode}`
   - Check `remarks` field: empty = serviceable, "Embargo" = temporary NSZ
   - Check payment type availability: `pre_paid`, `cod`, `pickup`, `repl`

6. Create unit tests:
   - File: `/server/tests/unit/couriers/delhivery/delhivery.provider.test.ts`

**Methods to Implement (from ICourierAdapter):**
```typescript
createShipment(data: CourierShipmentData): Promise<CourierShipmentResponse>
trackShipment(trackingNumber: string): Promise<CourierTrackingResponse>
getRates(request: CourierRateRequest): Promise<CourierRateResponse[]>
checkServiceability(pincode: string, type?: 'delivery' | 'pickup'): Promise<boolean>
```

---

#### Dev2: Ekart - Core Methods
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Implement `createShipment()`:
   - API: `PUT /api/v1/package/create`
   - **Note:** Uses PUT method, not POST
   - Handle forward (COD/Prepaid) and reverse (Pickup) shipments
   - Response contains `tracking_id` and `barcodes.wbn` (vendor waybill)
   ```typescript
   async createShipment(data: CourierShipmentData): Promise<CourierShipmentResponse> {
     await this.ensureValidToken();

     const response = await this.client.put('/api/v1/package/create',
       this.mapper.toShipmentRequest(data)
     );

     return {
       trackingId: response.data.tracking_id,
       awb: response.data.barcodes?.wbn,
       vendor: response.data.vendor,
       status: response.data.status
     };
   }
   ```

2. Implement `trackShipment()`:
   - API: `GET /api/v1/track/{id}`
   - Track response includes `track.status`, `track.ndrStatus`, `track.ndrActions`
   - For raw data: `GET /data/v1/elite/track/{wbn}`

3. Create data mapper:
   - File: `/server/src/infrastructure/external/couriers/ekart/ekart.mapper.ts`

**Afternoon (4h):**
4. Implement `getRates()`:
   - API: `POST /data/pricing/estimate`
   - Required fields: `pickupPincode`, `dropPincode`, `weight`, `length`, `height`, `width`, `serviceType` (SURFACE/EXPRESS)
   - Response includes: `shippingCharge`, `rtoCharge`, `fuelSurcharge`, `codCharge`, `total`

5. Implement `checkServiceability()`:
   - API: `GET /api/v2/serviceability/{pincode}`
   - Response includes: `details.cod`, `details.forward_pickup`, `details.forward_drop`, `details.reverse_pickup`
   - Also check `details.max_cod_amount` (typically 25000)

6. Create unit tests:
   - File: `/server/tests/unit/couriers/ekart/ekart.provider.test.ts`

---

#### Dev3: RBAC Testing - Deep Dive
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Create permission service tests:
   - File: `/server/tests/unit/services/auth/permission.service.test.ts`
2. Test scenarios:
   - Permission resolution for all roles
   - Company-context permissions
   - Cache invalidation on role changes

**Afternoon (4h):**
3. Create RBAC integration tests:
   - File: `/server/tests/integration/auth/rbac.test.ts`
4. Test scenarios:
   - Admin-only endpoint access
   - Seller-only endpoint access
   - Staff/viewer restrictions
   - Cross-company access prevention

**Services to Test:**
- [permission.service.ts](server/src/core/application/services/auth/permission.service.ts)
- [auth.ts middleware](server/src/presentation/http/middleware/auth/auth.ts)

---

#### Dev4: Landing Page - Accessibility & Performance
**Priority:** P1-High | **Hours:** 8

**Morning (4h):**
1. Add ARIA labels to all interactive elements
2. Fix keyboard navigation for carrier logo grid
3. Add skip links for screen readers
4. Ensure color contrast meets WCAG AA

**Afternoon (4h):**
5. Performance optimization:
   - Reduce Framer Motion bundle size
   - Add `will-change` CSS for animations
   - Support `prefers-reduced-motion`
6. Verify lazy loading of chart components

**Accessibility Pattern:**
```jsx
<motion.div
  role="button"
  tabIndex={0}
  aria-label={`View ${carrier.name} details`}
  onKeyDown={(e) => e.key === 'Enter' && handleSelect(carrier)}
/>
```

---

### DAY 3: Advanced Features

#### Dev1: Delhivery - Labels & Webhooks
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Implement label generation:
   - API: `GET /api/p/packing_slip?wbns={waybill}&pdf=true&pdf_size=4R`
   - Update: [delhivery-label.adapter.ts](server/src/infrastructure/external/couriers/delhivery/delhivery-label.adapter.ts)
   - Sizes: `A4` (8x11), `4R` (4x6)
   - For custom labels: set `pdf=false` to get JSON response

2. Implement warehouse management:
   - Create: `POST /api/backend/clientwarehouse/create/`
   - Update: `POST /api/backend/clientwarehouse/edit/`
   - **Note:** Warehouse name is case-sensitive and cannot be updated

**Afternoon (4h):**
3. Create webhook service:
   - File: `/server/src/core/application/services/webhooks/delhivery-webhook.service.ts`
   - Webhook statuses to handle:
     - Forward: Manifested, Not Picked, In Transit, Pending, Dispatched, Delivered
     - Return: In Transit (RT), Pending (RT), Dispatched (RT), RTO
     - Reverse: Open, Scheduled, Dispatched, In Transit (PU), Pending (PU), DTO, Canceled, Closed

4. Create webhook payload handler:
   ```typescript
   interface DelhiveryWebhookPayload {
     Shipment: {
       Status: {
         Status: string;
         StatusDateTime: string;
         StatusType: 'UD' | 'DL' | 'RT' | 'PP' | 'PU' | 'CN';
         StatusLocation: string;
         Instructions: string;
       };
       PickUpDate: string;
       NSLCode: string;
       ReferenceNo: string;
       AWB: string;
     };
   }
   ```

5. Create webhook routes:
   - File: `/server/src/presentation/http/routes/v1/webhooks/delhivery.webhook.routes.ts`

6. **Note:** Webhook setup requires contacting `lastmile-integration@delhivery.com`

**Reference:** Follow [velocity-webhook.service.ts](server/src/core/application/services/webhooks/velocity-webhook.service.ts)

---

#### Dev2: Ekart - Labels & Webhooks
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Implement label generation:
   - API: `POST /api/v1/package/label`
   - Body: `{ "ids": ["tracking_id1", "tracking_id2"] }` (max 100)
   - Set `json_only=false` for PDF, `json_only=true` for JSON data
   - Update: [ekart-label.adapter.ts](server/src/infrastructure/external/couriers/ekart/ekart-label.adapter.ts)

2. Implement manifest generation:
   - API: `POST /data/v2/generate/manifest`
   - Response includes `manifestDownloadUrl`

**Afternoon (4h):**
3. Create webhook service:
   - File: `/server/src/core/application/services/webhooks/ekart-webhook.service.ts`
   - Register webhook: `POST /api/v2/webhook`
   - Topics: `track_updated`, `shipment_created`, `shipment_recreated`

4. Implement HMAC signature verification:
   ```typescript
   // Ekart uses secret to hash webhook body
   interface EkartWebhookConfig {
     url: string;
     secret: string;  // 6-30 characters, used for HMAC
     topics: ('track_updated' | 'shipment_created' | 'shipment_recreated')[];
     active: boolean;
   }

   // Verify webhook signature
   function verifyWebhook(body: string, signature: string, secret: string): boolean {
     const hmac = crypto.createHmac('sha256', secret);
     const calculatedSignature = hmac.update(body).digest('hex');
     return crypto.timingSafeEqual(
       Buffer.from(signature),
       Buffer.from(calculatedSignature)
     );
   }
   ```

5. Handle webhook payloads:
   ```typescript
   // track_updated payload
   interface EkartTrackWebhook {
     ctime: number;
     status: string;
     location: string;
     desc: string;
     attempts: string;
     pickupTime: number;
     wbn: string;
     id: string;  // Ekart tracking ID
     orderNumber: string;
     edd: number;
   }
   ```

6. Add Ekart to courier.factory.ts

---

#### Dev3: E-commerce Testing - Shopify & WooCommerce
**Priority:** P1-High | **Hours:** 8

**Morning (4h):**
1. Shopify OAuth tests:
   - File: `/server/tests/integration/shopify/oauth.test.ts`
2. Shopify order sync tests:
   - File: `/server/tests/integration/shopify/order-sync.test.ts`
3. Mock Shopify API responses

**Afternoon (4h):**
4. WooCommerce OAuth tests:
   - File: `/server/tests/integration/woocommerce/oauth.test.ts`
5. WooCommerce order sync tests:
   - File: `/server/tests/integration/woocommerce/order-sync.test.ts`
6. Shopify fulfillment tests:
   - File: `/server/tests/integration/shopify/fulfillment.test.ts`

**Services to Test:**
- [shopify-oauth.service.ts](server/src/core/application/services/shopify/shopify-oauth.service.ts)
- [shopify-order-sync.service.ts](server/src/core/application/services/shopify/shopify-order-sync.service.ts)
- [woocommerce-oauth.service.ts](server/src/core/application/services/woocommerce/woocommerce-oauth.service.ts)

---

#### Dev4: Order Management Testing
**Priority:** P1-High | **Hours:** 8

**Morning (4h):**
1. Order lifecycle tests:
   - File: `/server/tests/integration/order/order-lifecycle.test.ts`
2. Test scenarios:
   - Order creation with dynamic pricing
   - Status transitions
   - Cancellation flows

**Afternoon (4h):**
3. Shipment integration tests:
   - File: `/server/tests/integration/shipping/shipment.test.ts`
4. Test scenarios:
   - Shipment creation from order
   - Carrier assignment
   - AWB generation

**Services to Test:**
- [order.service.ts](server/src/core/application/services/shipping/order.service.ts)
- [shipment.service.ts](server/src/core/application/services/shipping/shipment.service.ts)

---

### DAY 4: Integration & Edge Cases

#### Dev1: Delhivery - Cancellation, Reverse & NDR
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Implement `cancelShipment()`:
   - API: `POST /api/p/edit`
   - Body: `{ "waybill": "xxx", "cancellation": "true" }`
   - Allowed statuses: Manifested, In Transit, Pending (for forward)
   - **Note:** Status remains Manifested (UD) if cancelled before pickup

2. Implement error handling:
   - Retry logic with exponential backoff
   - Rate limiting (respect 5-minute windows)
   - Common errors:
     - "Authentication credentials were not provided"
     - "shipment list contains no data" (wrong client name)
     - "Duplicate Order Id"
     - "non serviceable pincode"

**Afternoon (4h):**
3. Implement `createReverseShipment()`:
   - Use `payment_mode: "Pickup"` in shipment creation
   - Customer address becomes pickup, return_add becomes delivery
   - No pickup request needed - scheduled automatically

4. Implement NDR actions:
   - API: `POST /api/p/update`
   - Actions: `RE-ATTEMPT`, `PICKUP_RESCHEDULE`
   - Allowed NSL codes for RE-ATTEMPT: EOD-74, EOD-15, EOD-104, EOD-43, EOD-86, EOD-11, EOD-69, EOD-6
   - **Best practice:** Apply after 9 PM when dispatches are closed
   ```typescript
   async requestNdrAction(waybill: string, action: 'RE-ATTEMPT' | 'PICKUP_RESCHEDULE'): Promise<string> {
     const response = await this.client.post('/api/p/update', {
       data: [{ waybill, act: action }]
     });
     return response.data.request_id;  // UPL ID for status check
   }
   ```

5. Update CourierFactory:
   - File: [courier.factory.ts](server/src/core/application/services/courier/courier.factory.ts)
   - Add Delhivery case

---

#### Dev2: Ekart - Cancellation, Reverse & NDR
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Implement `cancelShipment()`:
   - API: `DELETE /api/v1/package/cancel?tracking_id={id}`

2. Add Ekart-specific error handling:
   ```typescript
   interface EkartErrorResponse {
     statusCode: number;
     code: string;
     message: string;
     description: string;
     severity: string;
   }
   ```

3. Implement rate limiting (if needed based on testing)

**Afternoon (4h):**
4. Implement `createReverseShipment()`:
   - Use `payment_mode: "Pickup"` and `return_reason` field
   - Optional QC: set `qc_details.qc_shipment: true`

5. Implement NDR actions:
   - API: `POST /api/v2/package/ndr`
   - Actions: `Re-Attempt`, `RTO`
   - For Re-Attempt: must provide `date` (ms since epoch, within 7 days)
   ```typescript
   async requestNdrAction(wbn: string, action: 'Re-Attempt' | 'RTO', options?: NdrOptions): Promise<void> {
     await this.ensureValidToken();
     await this.client.post('/api/v2/package/ndr', {
       action,
       wbn,
       date: options?.reattemptDate?.getTime(),
       phone: options?.newPhone,
       address: options?.newAddress,
       instructions: options?.instructions
     });
   }
   ```

6. Update CourierFactory to include Ekart
7. Integration test with order system

---

#### Dev3: Velocity Courier Tests
**Priority:** P1-High | **Hours:** 8

**Morning (4h):**
1. Create comprehensive Velocity tests:
   - File: `/server/tests/unit/velocity/velocity-provider.test.ts`
2. Test all 14 methods

**Afternoon (4h):**
3. Test error handling scenarios
4. Test rate limiting behavior
5. Test webhook processing

**Velocity Methods to Test:**
1. `createShipment()` - Order creation
2. `trackShipment()` - Status tracking
3. `getRates()` - Rate calculation
4. `cancelShipment()` - Cancellation
5. `checkServiceability()` - Pincode check
6. `createWarehouse()` - Warehouse registration
7. `createForwardOrderOnly()` - Split flow step 1
8. `assignCourier()` - Split flow step 2
9. `createReverseShipment()` - RTO creation
10. `cancelReverseShipment()` - RTO cancellation
11. `schedulePickup()` - Pickup scheduling
12. `updateDeliveryAddress()` - Address update
13. `requestReattempt()` - NDR reattempt
14. `getSettlementStatus()` - COD tracking

---

#### Dev4: NDR/RTO & COD Testing
**Priority:** P1-High | **Hours:** 8

**Morning (4h):**
1. NDR lifecycle tests:
   - File: `/server/tests/integration/ndr/ndr-lifecycle.test.ts`
2. Test scenarios:
   - NDR detection from webhook
   - Resolution actions
   - Customer communication triggers

**Afternoon (4h):**
3. RTO lifecycle tests:
   - File: `/server/tests/integration/rto/rto-lifecycle.test.ts`
4. COD remittance tests:
   - File: `/server/tests/integration/finance/cod-remittance.test.ts`
5. Test COD reconciliation flow

**Services to Test:**
- [ndr-detection.service.ts](server/src/core/application/services/ndr/ndr-detection.service.ts)
- [rto.service.ts](server/src/core/application/services/rto/rto.service.ts)
- [cod-remittance.service.ts](server/src/core/application/services/finance/cod-remittance.service.ts)

---

### DAY 5: Polish & Documentation

#### Dev1: Delhivery - Final Integration
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Integration tests:
   - File: `/server/tests/integration/couriers/delhivery.integration.test.ts`
2. Test full order-to-delivery flow
3. Test with sandbox API credentials
4. Fix edge cases

**Afternoon (4h):**
5. Documentation:
   - Create: `/docs/integrations/DELHIVERY.md`
6. Update `.env.example` with required variables
7. Code review and cleanup
8. Verify CourierFactory integration

**Environment Variables Needed:**
```env
# Delhivery B2C Configuration
DELHIVERY_API_TOKEN=your_static_api_token
DELHIVERY_BASE_URL=https://staging-express.delhivery.com  # staging
# DELHIVERY_BASE_URL=https://track.delhivery.com          # production
DELHIVERY_CLIENT_NAME=your_registered_client_name
DELHIVERY_WEBHOOK_ENDPOINT=https://your-domain.com/webhooks/delhivery
```

---

#### Dev2: Ekart - Final Integration
**Priority:** P0-Critical | **Hours:** 8

**Morning (4h):**
1. Integration tests:
   - File: `/server/tests/integration/couriers/ekart.integration.test.ts`
2. Test full order-to-delivery flow
3. Test with sandbox credentials

**Afternoon (4h):**
4. Documentation:
   - Create: `/docs/integrations/EKART.md`
5. Update environment configuration
6. Final code review
7. Verify factory integration

**Environment Variables Needed:**
```env
# Ekart Configuration (v3.8.8)
EKART_CLIENT_ID=your_client_id
EKART_USERNAME=your_username
EKART_PASSWORD=your_password
EKART_BASE_URL=https://app.elite.ekartlogistics.in
EKART_WEBHOOK_SECRET=your_webhook_secret_6_to_30_chars
```

---

#### Dev3: Test Coverage & Report
**Priority:** P1-High | **Hours:** 8

**Morning (4h):**
1. Run full test suite with coverage
2. Identify coverage gaps
3. Add missing edge case tests
4. Fix any flaky tests

**Afternoon (4h):**
5. Create test documentation:
   - File: `/docs/testing/TEST_GUIDE.md`
6. Document test structure
7. Document mocking patterns
8. Update CI/CD test configuration

---

#### Dev4: Landing Page Final Polish
**Priority:** P1-High | **Hours:** 8

**Morning (4h):**
1. Responsive design verification:
   - Mobile: 320px, 375px, 414px
   - Tablet: 768px, 1024px
   - Desktop: 1280px, 1440px, 1920px
2. Fix responsive issues
3. Cross-browser testing

**Afternoon (4h):**
4. SEO improvements:
   - Add meta descriptions
   - Add Open Graph tags
   - Add Twitter card tags
   - Add structured data (JSON-LD)
5. Final accessibility audit
6. Lighthouse performance verification (target: 90+)

---

## Dependencies Map

```
DAY 1: All work is INDEPENDENT - no blockers

DAY 2:
├── Dev1 Delhivery core → Depends on Day 1 skeleton
├── Dev2 Ekart core → Depends on Day 1 skeleton
├── Dev3 RBAC tests → Independent
└── Dev4 Landing accessibility → Independent

DAY 3:
├── Dev1 Delhivery webhooks → Depends on Day 2 core
├── Dev2 Ekart webhooks → Depends on Day 2 core (follows Dev1 pattern)
├── Dev3 E-commerce tests → Independent
└── Dev4 Order tests → Independent

DAY 4:
├── Dev1 Delhivery reverse → Depends on Day 2 core
├── Dev2 Ekart reverse → Depends on Day 2 core
├── Dev3 Velocity tests → Independent
└── Dev4 NDR/RTO tests → Independent

DAY 5:
├── Dev1 Integration tests → Depends on ALL Delhivery work
├── Dev2 Integration tests → Depends on ALL Ekart work
├── Dev3 Coverage report → Depends on ALL tests
└── Dev4 Final polish → Independent
```

---

## Daily Sync Schedule

| Time | Meeting | Duration | Purpose |
|------|---------|----------|---------|
| 09:00 | Morning Standup | 15 min | Blockers, priorities, dependencies |
| 12:30 | Lunch Sync | 10 min | Progress check, quick questions |
| 16:00 | Afternoon Sync | 15 min | Cross-dependencies, help needed |
| 17:30 | EOD Handoff | 15 min | Completed work, tomorrow prep |

---

## Risk Mitigation

### Risk 1: Courier API Documentation Unavailable
**Impact:** High | **Probability:** Low (docs available)
**Mitigation:**
- API documentation is available at `docs/Resources/API/Courier/`
- Use Velocity as reference implementation
- Contact courier partners for sandbox access
- Build extensible architecture for future changes

### Risk 2: Test Environment Setup Issues
**Impact:** Medium | **Probability:** Low
**Mitigation:**
- Dev3 sets up test infrastructure on Day 1 morning
- Use in-memory MongoDB for unit tests
- Mock external APIs with nock/msw
- Document setup steps for team

### Risk 3: Landing Page Performance Regression
**Impact:** Medium | **Probability:** Low
**Mitigation:**
- Establish Lighthouse baseline on Day 1
- Run Lighthouse after each change
- Use React DevTools Profiler
- Set performance budget

### Risk 4: Webhook Integration Complexity
**Impact:** Medium | **Probability:** Medium
**Mitigation:**
- Follow Velocity webhook pattern exactly
- Use ngrok for local webhook testing
- Implement idempotency from start
- Test signature verification thoroughly
- Delhivery: Contact lastmile-integration@delhivery.com
- Ekart: Use API to register webhooks

### Risk 5: Scope Creep
**Impact:** High | **Probability:** Medium
**Mitigation:**
- Strict adherence to task list
- No new features without approval
- Defer "nice to have" to post-5-day
- Daily scope review in standup

---

## Definition of Done

### Courier Integration (Delhivery/Ekart)
- [ ] All 7 required `ICourierAdapter` methods implemented
- [ ] Unit tests with 80%+ coverage
- [ ] Integration test with sandbox API passing
- [ ] Webhook handler with signature verification
- [ ] Error handling with retry logic
- [ ] Rate limiting implemented
- [ ] Added to CourierFactory
- [ ] Environment variables documented
- [ ] API documentation created

### Testing Deliverables
- [ ] All tests pass in CI
- [ ] Coverage meets 80% threshold for tested areas
- [ ] No flaky tests
- [ ] Fixtures documented
- [ ] Test commands documented

### Landing Page
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 95
- [ ] All images have alt text
- [ ] Responsive on all breakpoints (320px - 1920px)
- [ ] Works with `prefers-reduced-motion`
- [ ] SEO meta tags complete
- [ ] No console errors

---

## Success Metrics

### End of Day 5 Criteria
1. **Delhivery:** Full integration working with sandbox API
2. **Ekart:** Full integration working with sandbox API
3. **Testing:** 80%+ coverage on critical paths
4. **Landing Page:** Lighthouse scores > 90/95
5. **Documentation:** All new integrations documented

### Quality Benchmarks
- Zero P0/P1 bugs in new code
- All tests passing in CI
- No security vulnerabilities (npm audit)
- TypeScript strict mode compliance

### 10-Day Timeline Advantages
With the extended timeline:
- **Days 1-5:** Complete core implementation without rushing
- **Days 6-7:** Thorough integration and load testing
- **Days 8:** Security hardening and edge case handling
- **Days 9-10:** Documentation and deployment preparation
- **Result:** Production-ready code with comprehensive documentation

---

## Days 6-10: Buffer Period Tasks

### DAY 6: Extended Integration Testing

#### Dev1: Delhivery Edge Cases
**Hours:** 8
- Test rate limiting behavior under load (respect 5-min windows)
- Test timeout and retry scenarios
- Test partial response handling
- Test network failure recovery
- Document all NSL codes encountered
- Test MPS (Multi-Piece Shipment) creation

#### Dev2: Ekart Edge Cases
**Hours:** 8
- Test rate limiting behavior
- Test token refresh edge cases
- Test webhook replay handling
- Test idempotency edge cases
- Test MPS and OBD shipment types
- Document error handling

#### Dev3: E2E Test Suite
**Hours:** 8
- Create end-to-end test suite covering:
  - Order creation → Shipment → Tracking → Delivery
  - Order creation → NDR → RTO flow
  - COD order → Remittance flow
- Run against staging environment

#### Dev4: Cross-browser Landing Page Testing
**Hours:** 8
- Test on Chrome, Firefox, Safari, Edge
- Test on iOS Safari, Android Chrome
- Fix any browser-specific issues
- Document browser support matrix

---

### DAY 7: Performance & Load Testing

#### Dev1: Courier API Performance
**Hours:** 8
- Load test Delhivery integration (within rate limits)
- Load test Ekart integration (100 concurrent requests)
- Identify and fix bottlenecks
- Document performance benchmarks

#### Dev2: Webhook Performance
**Hours:** 8
- Load test webhook endpoints
- Test webhook queue processing under load
- Verify idempotency under concurrent webhooks
- Optimize database queries if needed

#### Dev3: Auth & Order Performance
**Hours:** 8
- Load test authentication endpoints
- Load test order creation endpoints
- Test permission caching effectiveness
- Document performance baselines

#### Dev4: Client Performance
**Hours:** 8
- Run Lighthouse on all major pages
- Optimize bundle sizes
- Implement code splitting where needed
- Verify lazy loading effectiveness

---

### DAY 8: Security & Error Handling

#### Dev1: Delhivery Security Audit
**Hours:** 8
- Review credential storage (API token should be in env)
- Verify HTTPS enforcement
- Webhook doesn't have signature verification (document this)
- Review rate limiting implementation
- Check for injection vulnerabilities in payload construction

#### Dev2: Ekart Security Audit
**Hours:** 8
- Review token storage and refresh
- Verify HMAC webhook signature verification
- Test with invalid signatures
- Document security measures
- Verify HTTPS enforcement

#### Dev3: Auth Security Hardening
**Hours:** 8
- Review JWT implementation
- Test token refresh edge cases
- Verify password hashing strength
- Test CSRF protection
- Review session management

#### Dev4: Client Security
**Hours:** 8
- Review XSS prevention
- Check for sensitive data exposure
- Verify CORS configuration
- Test CSP headers
- Audit third-party dependencies

---

### DAY 9: Documentation & Knowledge Transfer

#### Dev1: Delhivery Documentation
**Hours:** 8
- Complete API integration guide
- Document troubleshooting steps (common errors table)
- Create runbook for common issues
- Document status mapping table
- Record demo video of integration

#### Dev2: Ekart Documentation
**Hours:** 8
- Complete API integration guide
- Document troubleshooting steps
- Create runbook for common issues
- Document webhook event types
- Document token refresh flow

#### Dev3: Testing Documentation
**Hours:** 8
- Create comprehensive test guide
- Document test data setup
- Create CI/CD test pipeline guide
- Document mock/stub patterns

#### Dev4: Deployment Documentation
**Hours:** 8
- Create deployment checklist
- Document environment variables
- Create rollback procedures
- Document monitoring setup

---

### DAY 10: Final Polish & Deployment Prep

#### All Developers: Code Review & Fixes
**Hours:** 8 each (32 total)

**Morning (4h each):**
- Cross-review each other's code
- Fix any issues found in review
- Address TODO comments
- Clean up debug logs

**Afternoon (4h each):**
- Final integration testing on staging
- Verify all features work together
- Performance sanity check
- Prepare deployment package

---

## Deployment Strategy

### Pre-Deployment Checklist
- [ ] All tests passing in CI
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Environment variables configured
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

### Deployment Sequence
1. **Day 10 EOD:** Deploy to staging
2. **Day 11 morning:** Smoke tests on staging
3. **Day 11 afternoon:** Deploy to production (with monitoring)
4. **Day 11-12:** Monitor for issues, quick fixes if needed

### Rollback Plan
1. Keep previous deployment tagged in git
2. Database migrations should be reversible
3. Feature flags for new courier integrations
4. Immediate rollback trigger: >5% error rate

---

## Critical Files Reference

### Courier Integration
- Base interface: [courier.adapter.ts](server/src/infrastructure/external/couriers/base/courier.adapter.ts)
- Velocity reference: [velocity-shipfast.provider.ts](server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts)
- Webhook pattern: [velocity-webhook.service.ts](server/src/core/application/services/webhooks/velocity-webhook.service.ts)
- Factory: [courier.factory.ts](server/src/core/application/services/courier/courier.factory.ts)

### Authentication
- Auth controller: [auth.controller.ts](server/src/presentation/http/controllers/auth/auth.controller.ts)
- Permission service: [permission.service.ts](server/src/core/application/services/auth/permission.service.ts)
- Auth middleware: [auth.ts](server/src/presentation/http/middleware/auth/auth.ts)

### Order Management
- Order service: [order.service.ts](server/src/core/application/services/shipping/order.service.ts)
- Shipment service: [shipment.service.ts](server/src/core/application/services/shipping/shipment.service.ts)
- NDR service: [ndr-detection.service.ts](server/src/core/application/services/ndr/ndr-detection.service.ts)
- RTO service: [rto.service.ts](server/src/core/application/services/rto/rto.service.ts)

### E-commerce
- Shopify OAuth: [shopify-oauth.service.ts](server/src/core/application/services/shopify/shopify-oauth.service.ts)
- WooCommerce OAuth: [woocommerce-oauth.service.ts](server/src/core/application/services/woocommerce/woocommerce-oauth.service.ts)

### Landing Page
- Hero component: [Hero.tsx](client/src/features/landing/components/Hero/Hero.tsx)

---

## Verification Plan

### How to Test Changes

**Courier Integrations:**
```bash
# Run Delhivery unit tests
npm test -- --grep "Delhivery"

# Run Ekart unit tests
npm test -- --grep "Ekart"

# Run integration tests (requires sandbox credentials)
npm run test:integration -- --grep "courier"
```

**Authentication:**
```bash
# Run auth tests
npm test -- --grep "auth"

# Run RBAC tests
npm test -- --grep "rbac|permission"
```

**Landing Page:**
```bash
# Run Lighthouse
npx lighthouse http://localhost:3000 --view

# Run accessibility audit
npx axe http://localhost:3000
```

**Full Test Suite:**
```bash
# Server tests with coverage
cd server && npm run test:coverage

# Client tests
cd client && npm test
```

---

## Quick Reference: 10-Day Summary

| Day | Dev1 | Dev2 | Dev3 | Dev4 |
|-----|------|------|------|------|
| **1** | Delhivery skeleton | Ekart skeleton | Test infrastructure | Landing audit |
| **2** | Delhivery core methods | Ekart core methods | RBAC tests | Accessibility fixes |
| **3** | Delhivery webhooks | Ekart webhooks | E-commerce tests | Order tests |
| **4** | Delhivery reverse/cancel | Ekart reverse/cancel | Velocity tests | NDR/RTO/COD tests |
| **5** | Delhivery integration tests | Ekart integration tests | Coverage report | SEO & responsive |
| **6** | Delhivery edge cases | Ekart edge cases | E2E test suite | Cross-browser testing |
| **7** | API load testing | Webhook load testing | Auth perf testing | Client perf |
| **8** | Delhivery security | Ekart security | Auth security | Client security |
| **9** | Delhivery docs | Ekart docs | Testing docs | Deployment docs |
| **10** | Code review & fixes | Code review & fixes | Final testing | Deployment prep |

### Key Milestones
- **Day 2 EOD:** Core courier methods working
- **Day 3 EOD:** Webhooks integrated
- **Day 5 EOD:** All features complete, tests passing
- **Day 7 EOD:** Load testing complete
- **Day 8 EOD:** Security audit complete
- **Day 10 EOD:** Ready for production deployment