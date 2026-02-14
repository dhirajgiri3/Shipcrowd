# ShipCrowd Developer Instructions

## Seller Shipping UX Modernization (Order-Centric + Quote-Locked)

### Objective
Modernize seller shipping UX to be order-centric and easier to use, while preserving Shipcrowd's advanced shipping guarantees:
- quote-locked rates (`sessionId` + `optionId`)
- wallet balance enforcement
- `BookFromQuoteService` reliability and fallback behavior
- strict backend eligibility (`pending`, `ready_to_ship` only)

### Non-Negotiable Constraints
- Do not modify backend shipping contracts for quote booking.
- Do not bypass quote session flow in seller UI.
- Do not treat Blueship-only statuses (`new`, `ready`) as shippable in Shipcrowd.

### Shipping Entry Point
- Seller shipment creation is always order-centric.
- Orders page is the only shipment-creation entry point.
- Legacy "Create Shipment" on Shipments page remains removed.

### Phase Sequence (Required)
1. Utilities and status normalization
2. Order quote-ship modal
3. Mobile status mapping and ship action wiring
4. Orders page integration
5. ~~Shipments page gating~~ → Legacy Shipments create flow removed (Feb 2025)
6. Shipping analytics events
7. Documentation and QA sign-off

### Implemented Contract Details

#### Eligibility Utility
- File: `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/client/src/lib/utils/order-shipping-eligibility.ts`
- Shippable statuses: `pending`, `ready_to_ship`
- API:
  - `isSellerOrderShippable(order): boolean`
  - `getShipDisabledReason(order): string | null`

#### Quote Booking Modal
- File: `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/client/src/components/seller/shipping/OrderQuoteShipModal.tsx`
- Uses:
  - `useGetCourierRates`
  - `useShipOrder`
  - `useWalletBalance`
  - `useWarehouses`
  - `useOrder(orderId)` fallback (`data?.data?.order`)
- Required behaviors:
  - resolve origin pincode from populated `warehouseId.address.postalCode` or warehouse lookup
  - clear blocking state when warehouse origin missing ("Assign a warehouse first")
  - quote expiry timer + auto-refresh
  - preserve selected option after quote refresh when still present
  - duplicate submit protection (`isPending` disable + in-flight lock)
  - wallet insufficiency block + recharge CTA
  - explicit handling for expired quote / active shipment / invalid status race

#### Orders UI Integration
- Entry points:
  - Desktop order table "Ship" action for eligible rows
  - Mobile order card actions panel "Ship"
  - Order details panel "Ship Order"
- All entry points open `OrderQuoteShipModal` using order in parent closure context.

#### Shipments Page (Tracking Only)
- File: `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/client/app/seller/shipments/components/ShipmentsClient.tsx`
- Legacy "Create Shipment" modal and button **removed** (Feb 2025).
- Shipments page now only displays existing shipments (tracking, labels, manifests).
- To create shipments, sellers use the Orders page (Ship Now from order detail).

#### Analytics Events
- File: `/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/client/src/lib/analytics/events.ts`
- Added canonical events:
  - `SHIPPING_MODAL_OPENED`
  - `SHIPPING_QUOTE_FETCHED`
  - `SHIPPING_QUOTE_REFRESHED`
  - `SHIPPING_CONFIRMED`
  - `SHIPPING_SUCCESS`
  - `SHIPPING_FAILED`

### QA Checklist (Blocking)
- Eligible order (`pending` or `ready_to_ship`) can ship from Orders page.
- Ineligible order cannot ship and shows correct disabled reason.
- Missing warehouse origin blocks quotes with assign-warehouse guidance.
- Quote expiry auto-refreshes and preserves selected courier when available.
- Wallet-insufficient flow blocks booking and supports recharge CTA.
- Double-click on confirm does not submit twice.
- Successful booking refreshes order/shipment data in UI.
- Error states surface mapped messages:
  - insufficient balance
  - quote expired
  - active shipment exists
  - order no longer eligible

## DEVELOPER 1 - Delhivery Courier Integration Lead

Your responsibility is implementing the complete Delhivery B2C courier integration from scratch. You have API credentials ready and documentation available at `docs/Resources/API/Courier/Delhivery/B2C/`.

### API Overview

**Base URLs:**
- Staging: `https://staging-express.delhivery.com`
- Production: `https://track.delhivery.com`

**Authentication:** Static API Token (never expires)
```
Header: Authorization: Token <your_api_token>
```

**Key Rate Limits (per 5 minutes):**
| API | Limit |
|-----|-------|
| Pincode Serviceability | 4500 |
| Tracking | 750 (50 AWBs per request) |
| Shipping Label | 3000 |
| Shipping Cost | 50 |
| Pickup Request | 4000 |

### Days 1-2: Core Implementation

Start by studying the Velocity implementation at `server/src/infrastructure/external/couriers/velocity/velocity-shipfast.provider.ts` - this is your reference architecture.

**Day 1 Morning - Types & Auth:**

Create `server/src/infrastructure/external/couriers/delhivery/delhivery.types.ts`:
```typescript
// Payment modes
type DelhiveryPaymentMode = 'Prepaid' | 'COD' | 'Pickup' | 'REPL';

// Status types: UD=Undelivered, DL=Delivered, RT=Return, CN=Cancelled, PP=Pickup Pending, PU=Pickup Complete
type DelhiveryStatusType = 'UD' | 'DL' | 'RT' | 'CN' | 'PP' | 'PU';

interface DelhiveryShipmentRequest {
  name: string;           // Consignee name (required)
  add: string;            // Address (required)
  pin: string;            // 6-digit pincode (required)
  city: string;
  state: string;
  country: string;
  phone: string;          // 10-digit, can have prefixes: 91, +91, +91-, 91-, 0
  order: string;          // Unique order ID, max 50 chars (required)
  payment_mode: DelhiveryPaymentMode;
  weight?: number;        // in grams
  shipping_mode?: 'Surface' | 'Express';
  cod_amount?: number;    // Required if payment_mode is COD
  waybill?: string;       // Optional - auto-generated if not provided
  return_name?: string;
  return_add?: string;
  return_pin?: string;
  // For MPS (Multi-Piece Shipment)
  shipment_type?: 'MPS';
  mps_amount?: number;
  mps_children?: number;
  master_id?: string;
}

interface DelhiveryTrackResponse {
  ShipmentData: Array<{
    Shipment: {
      Status: {
        Status: string;
        StatusDateTime: string;
        StatusType: DelhiveryStatusType;
        StatusLocation: string;
        Instructions: string;
      };
      PickUpDate: string;
      NSLCode: string;
      ReferenceNo: string;
      AWB: string;
    };
  }>;
}
```

Create `server/src/infrastructure/external/couriers/delhivery/delhivery.auth.ts`:
```typescript
// Delhivery B2C uses static tokens - no refresh needed
export class DelhiveryAuth {
  private readonly token: string;

  constructor() {
    this.token = process.env.DELHIVERY_API_TOKEN!;
    if (!this.token) {
      throw new Error('DELHIVERY_API_TOKEN environment variable is required');
    }
  }

  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Token ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
}
```

**Day 1 Afternoon - Provider Skeleton:**

Create `server/src/infrastructure/external/couriers/delhivery/delhivery.provider.ts` extending `BaseCourierAdapter` from `courier.adapter.ts`. The existing `delhivery-stub.adapter.ts` shows what needs replacing.

**Day 2 - Core Methods:**

1. **createShipment()** - `POST /api/cmu/create.json`
   - CRITICAL: Payload format is `format=json&data={...}`
   - DO NOT use special characters: `&`, `#`, `%`, `;`, `\`
   - For RVP (reverse pickup): use `payment_mode: "Pickup"`, customer becomes pickup location
   - For REPL (replacement): use `payment_mode: "REPL"`
   ```typescript
   const payload = `format=json&data=${JSON.stringify({
     shipments: [{
       name: data.consigneeName,
       add: data.address,
       pin: data.pincode,
       city: data.city,
       state: data.state,
       country: 'India',
       phone: data.phone,
       order: data.orderId,
       payment_mode: data.paymentMode,
       cod_amount: data.codAmount,
       weight: data.weight,
       shipping_mode: data.shippingMode || 'Surface'
     }],
     pickup_location: { name: data.warehouseName }  // Case-sensitive!
   })}`;
   ```

2. **trackShipment()** - `GET /api/v1/packages/json/?waybill={waybill}`
   - Can track up to 50 AWBs comma-separated
   - Map StatusType to internal status

3. **getRates()** - `GET /api/kinko/v1/invoice/charges/.json`
   - Params: `md` (E=Express/S=Surface), `cgm` (weight grams), `o_pin`, `d_pin`, `ss` (Delivered/RTO/DTO), `pt` (Pre-paid/COD)
   - NOTE: Staging returns 0 - must test rates on production

4. **checkServiceability()** - `GET /c/api/pin-codes/json/?filter_codes={pincode}`
   - Empty remarks = serviceable
   - "Embargo" = temporary NSZ
   - Check `pre_paid`, `cod`, `pickup`, `repl` fields for service availability

### Days 3-4: Advanced Features

**Day 3 - Labels & Webhooks:**

1. **Label Generation** - `GET /api/p/packing_slip?wbns={waybill}&pdf=true&pdf_size=4R`
   - Sizes: `A4` (8x11), `4R` (4x6)
   - For custom labels: `pdf=false` returns JSON

2. **Warehouse Management:**
   - Create: `POST /api/backend/clientwarehouse/create/`
   - Update: `POST /api/backend/clientwarehouse/edit/`
   - Warehouse names are case-sensitive and cannot be renamed

3. **Webhook Service** - Create `server/src/core/application/services/webhooks/delhivery-webhook.service.ts`
   - IMPORTANT: Webhook setup requires emailing `lastmile-integration@delhivery.com`
   - Scan Push and POD Push are separate webhooks
   - Webhook payload structure:
   ```typescript
   interface DelhiveryWebhookPayload {
     Shipment: {
       Status: { Status: string; StatusDateTime: string; StatusType: string; StatusLocation: string; Instructions: string; };
       PickUpDate: string;
       NSLCode: string;        // Net Service Level code for granular tracking
       ReferenceNo: string;    // Your order ID
       AWB: string;
     };
   }
   ```

**Day 4 - Cancellation & NDR:**

1. **cancelShipment()** - `POST /api/p/edit`
   - Body: `{ "waybill": "xxx", "cancellation": "true" }`
   - Allowed only for: Manifested, In Transit, Pending
   - For RVP: only Scheduled status

2. **createReverseShipment()** - Use standard create with `payment_mode: "Pickup"`
   - Pickup requests auto-scheduled for reverse

3. **NDR Actions** - `POST /api/p/update`
   - Actions: `RE-ATTEMPT`, `PICKUP_RESCHEDULE`
   - Apply after 9 PM when dispatches are closed
   - RE-ATTEMPT allowed NSL codes: EOD-74, EOD-15, EOD-104, EOD-43, EOD-86, EOD-11, EOD-69, EOD-6
   - Max 2 attempts allowed

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Authentication credentials were not provided" | Missing/wrong token | Check Authorization header |
| "shipment list contains no data" | Wrong client name | Use exact registered client name (case-sensitive) |
| "Duplicate Order Id" | Same 6-field combo exists | Change order ID or another field |
| "non serviceable pincode" | Pincode not in network | Check serviceability first |
| "ClientWarehouse matching query does not exist" | Wrong warehouse name | Use exact warehouse name (case-sensitive) |
| "format key missing in the post" | Missing format=json&data= | Always prefix payload with format=json&data= |

### Environment Variables
```env
DELHIVERY_API_TOKEN=your_static_token
DELHIVERY_BASE_URL=https://staging-express.delhivery.com
DELHIVERY_CLIENT_NAME=your_registered_client_name
```

### Days 5-10
Days 5: Write comprehensive unit tests, then integration tests against sandbox API. Days 6-7 focus on edge cases (MPS shipments, rate limiting) and load testing. Day 8 is security audit - verify credential storage, HTTPS enforcement. Days 9-10 are documentation and code review. Sync with Dev2 daily since you're both doing courier integrations - share patterns and learnings.

---

## DEVELOPER 2 - Ekart Courier Integration Lead

Your responsibility mirrors Dev1 but for Ekart/Flipkart Logistics. You'll follow the same architectural patterns but adapt for Ekart's specific API requirements.

### API Overview

**Base URL:** `https://app.elite.ekartlogistics.in`
**API Version:** 3.8.8

**Authentication:** Bearer Token (24-hour expiry, cached)
```
Header: Authorization: Bearer <access_token>
```

### Days 1-2: Core Implementation

**Day 1 Morning - Types & Auth:**

Create `server/src/infrastructure/external/couriers/ekart/ekart.types.ts`:
```typescript
interface EkartAuthResponse {
  access_token: string;
  scope: string;
  expires_in: number;  // seconds, typically 86400 (24 hours)
  token_type: 'Bearer';
}

interface EkartShipmentRequest {
  seller_name: string;
  seller_address: string;
  seller_gst_tin: string;
  consignee_name: string;
  consignee_alternate_phone: string;  // >= 10 chars
  order_number: string;
  invoice_number: string;
  invoice_date: string;
  products_desc: string;
  category_of_goods: string;
  payment_mode: 'COD' | 'Prepaid' | 'Pickup';  // Pickup = reverse
  total_amount: number;         // >= 1
  tax_value: number;            // >= 0
  taxable_amount: number;       // >= 1
  commodity_value: string;      // Same as taxable_amount as string
  cod_amount: number;           // 0-49999
  quantity: number;             // >= 1
  weight: number;               // grams, >= 1
  length: number;               // cm, >= 1
  height: number;               // cm, >= 1
  width: number;                // cm, >= 1
  drop_location: EkartLocation;
  pickup_location: EkartLocation;
  return_location?: EkartLocation;  // Defaults to pickup_location
  return_reason?: string;       // Required if payment_mode is Pickup
  // Optional features
  mps?: boolean;                // Multi-package shipment
  obd_shipment?: boolean;       // Open Box Delivery
  qc_details?: EkartQCDetails;  // Quality Check for reverse
  preferred_dispatch_date?: string;  // YYYY-MM-DD
  delayed_dispatch?: boolean;
}

interface EkartLocation {
  location_type: 'Office' | 'Home';
  address: string;
  city: string;
  state: string;
  country: string;
  name: string;
  phone: number;  // 10 digits
  pin: number;
}

interface EkartShipmentResponse {
  status: boolean;
  remark: string;
  tracking_id: string;  // Ekart tracking ID
  vendor: string;       // Courier partner
  barcodes: {
    wbn: string;        // Vendor waybill
    order: string;
    cod?: string;
  };
}

interface EkartTrackResponse {
  _id: string;
  track: {
    status: string;
    ctime: number;
    pickupTime: number;
    desc: string;
    location: string;
    ndrStatus?: string;
    attempts?: number;
    ndrActions?: string[];
    details: Array<{ status: string; time: number; location: string; }>;
  };
  edd: number;
  order_number: string;
}
```

Create `server/src/infrastructure/external/couriers/ekart/ekart.auth.ts`:
```typescript
export class EkartAuth {
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private readonly clientId: string;
  private readonly username: string;
  private readonly password: string;

  constructor() {
    this.clientId = process.env.EKART_CLIENT_ID!;
    this.username = process.env.EKART_USERNAME!;
    this.password = process.env.EKART_PASSWORD!;
  }

  async getToken(): Promise<string> {
    // Token is cached for 24h by Ekart's API
    if (this.token && Date.now() < this.tokenExpiry - 60000) {
      return this.token;
    }

    const response = await axios.post(
      `${process.env.EKART_BASE_URL}/integrations/v2/auth/token/${this.clientId}`,
      { username: this.username, password: this.password }
    );

    this.token = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
    return this.token;
  }

  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
}
```

**Day 2 - Core Methods:**

1. **createShipment()** - `PUT /api/v1/package/create`
   - NOTE: Uses PUT method, not POST
   - For reverse: use `payment_mode: "Pickup"` and include `return_reason`
   - Response contains `tracking_id` (Ekart ID) and `barcodes.wbn` (vendor waybill)
   ```typescript
   async createShipment(data: CourierShipmentData): Promise<CourierShipmentResponse> {
     const headers = await this.auth.getHeaders();
     const response = await this.client.put('/api/v1/package/create', {
       seller_name: data.sellerName,
       seller_address: data.sellerAddress,
       seller_gst_tin: data.sellerGstTin,
       consignee_name: data.consigneeName,
       consignee_alternate_phone: data.phone,
       order_number: data.orderId,
       invoice_number: data.invoiceNumber,
       invoice_date: data.invoiceDate,
       payment_mode: data.paymentMode,
       total_amount: data.totalAmount,
       tax_value: data.taxValue,
       taxable_amount: data.taxableAmount,
       commodity_value: String(data.taxableAmount),
       cod_amount: data.codAmount || 0,
       weight: data.weight,
       length: data.length,
       height: data.height,
       width: data.width,
       drop_location: this.mapLocation(data.dropLocation),
       pickup_location: this.mapLocation(data.pickupLocation),
       products_desc: data.productsDesc,
       category_of_goods: data.category
     }, { headers });

     return {
       trackingId: response.data.tracking_id,
       awb: response.data.barcodes?.wbn,
       vendor: response.data.vendor
     };
   }
   ```

2. **trackShipment()** - `GET /api/v1/track/{id}`
   - Public API, no auth needed
   - Returns `track.ndrStatus` and `track.ndrActions` for NDR shipments
   - For raw Ekart data: `GET /data/v1/elite/track/{wbn}` (requires auth)

3. **getRates()** - `POST /data/pricing/estimate`
   - Required: pickupPincode, dropPincode, weight, length, height, width, serviceType (SURFACE/EXPRESS)
   - Response includes: shippingCharge, rtoCharge, fuelSurcharge, codCharge, total

4. **checkServiceability()** - `GET /api/v2/serviceability/{pincode}`
   - Returns `details.cod`, `details.forward_pickup`, `details.forward_drop`, `details.reverse_pickup`
   - Check `details.max_cod_amount` (typically 25000)

### Days 3-4: Advanced Features

**Day 3 - Labels & Webhooks:**

1. **Label Generation** - `POST /api/v1/package/label`
   - Body: `{ "ids": ["tracking_id1", ...] }` (max 100)
   - Query param: `json_only=false` for PDF, `true` for JSON

2. **Manifest** - `POST /data/v2/generate/manifest`
   - Returns `manifestDownloadUrl`

3. **Webhook Registration** - `POST /api/v2/webhook`
   ```typescript
   interface EkartWebhookConfig {
     url: string;           // Your endpoint
     secret: string;        // 6-30 chars for HMAC signature
     topics: Array<'track_updated' | 'shipment_created' | 'shipment_recreated'>;
     active: boolean;
   }
   ```

4. **Webhook Signature Verification:**
   ```typescript
   function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
     const hmac = crypto.createHmac('sha256', secret);
     const calculated = hmac.update(body).digest('hex');
     return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculated));
   }
   ```

5. **Webhook Payloads:**
   ```typescript
   // track_updated
   interface TrackUpdatedWebhook {
     ctime: number;          // Timestamp
     status: string;         // e.g., "Delivered"
     location: string;
     desc: string;           // e.g., "Delivered Successfully"
     attempts: string;
     pickupTime: number;
     wbn: string;            // Vendor waybill
     id: string;             // Ekart tracking ID
     orderNumber: string;
     edd: number;            // Expected delivery date timestamp
   }
   ```

**Day 4 - Cancellation & NDR:**

1. **cancelShipment()** - `DELETE /api/v1/package/cancel?tracking_id={id}`

2. **createReverseShipment()** - Use standard create with:
   - `payment_mode: "Pickup"`
   - `return_reason: "Your reason"`
   - Optional QC: `qc_details: { qc_shipment: true, product_name: "...", ... }`

3. **NDR Actions** - `POST /api/v2/package/ndr`
   ```typescript
   interface NdrActionRequest {
     action: 'Re-Attempt' | 'RTO';
     wbn: string;
     date?: number;           // Required for Re-Attempt (ms since epoch, within 7 days)
     phone?: string;          // Updated phone
     address?: string;        // Updated address
     instructions?: string;
   }
   ```

### Status Mapping

```typescript
const EKART_STATUS_MAP: Record<string, string> = {
  'Order Placed': 'manifested',
  'Picked Up': 'picked_up',
  'In Transit': 'in_transit',
  'Out for Delivery': 'out_for_delivery',
  'Delivered': 'delivered',
  'Cancelled': 'cancelled',
  'RTO Initiated': 'rto_initiated',
  'RTO Delivered': 'rto_delivered',
  'Delivery Failed': 'ndr'
};
```

### Environment Variables
```env
EKART_CLIENT_ID=your_client_id
EKART_USERNAME=your_username
EKART_PASSWORD=your_password
EKART_BASE_URL=https://app.elite.ekartlogistics.in
EKART_WEBHOOK_SECRET=your_secret_6_to_30_chars
```

### Days 5-10
Days 5: Integration testing against Ekart sandbox, then edge case testing (token refresh, MPS, OBD shipments). Days 6-7 load testing and webhook performance. Day 8 security audit - verify HMAC signature verification, token storage. Days 9-10 documentation. Your deliverable on Day 10 is a fully functional Ekart integration with the same feature parity as Delhivery. Keep your implementation patterns aligned with Dev1's Delhivery work so future maintainers see consistency across courier integrations.

---

## DEVELOPER 3 - Testing & Quality Assurance Lead

Your responsibility is comprehensive test coverage across authentication, RBAC, e-commerce integrations, and the existing Velocity courier. You own the testing infrastructure and final coverage report.

### Days 1-2: Auth & RBAC Testing

Start by extending `server/tests/fixtures/userFactory.ts` to create factories for all user roles: admin, seller, staff (manager/member/viewer). Set up test database seeding.

Create registration flow tests at `server/tests/integration/auth/registration-flows.test.ts` covering invitation tokens, company creation, and duplicate handling. Create password flow tests. Then build RBAC tests at `server/tests/integration/auth/rbac.test.ts` - test `permission.service.ts` resolution for every role, verify cross-company access prevention, and test the auth middleware at `server/src/presentation/http/middleware/auth/auth.ts`.

**Key Test Scenarios:**
- Registration with/without invitation token
- Email verification flow
- Password reset flow
- Permission resolution for each role (admin, seller, staff/manager, staff/member, viewer)
- Cross-company access prevention (user A cannot access company B's data)
- Token refresh and expiry

### Days 3-4: E-commerce & Courier Testing

Shift to e-commerce testing. Create Shopify tests covering OAuth flow, order sync, inventory sync, and fulfillment push. The services are in `server/src/core/application/services/shopify/`. Do the same for WooCommerce.

Then create comprehensive Velocity courier tests - all 14 methods need coverage including edge cases like rate limiting, timeout handling, and webhook processing.

**Velocity Methods to Test:**
1. createShipment()
2. trackShipment()
3. getRates()
4. cancelShipment()
5. checkServiceability()
6. createWarehouse()
7. createForwardOrderOnly()
8. assignCourier()
9. createReverseShipment()
10. cancelReverseShipment()
11. schedulePickup()
12. updateDeliveryAddress()
13. requestReattempt()
14. getSettlementStatus()

### Days 5-10

Day 5: Generate coverage report and identify gaps. Day 6: Create E2E test suite covering full order lifecycle (creation → delivery, NDR → RTO flow, COD → remittance). Day 7: Auth and order performance testing under load. Day 8: Security hardening - review JWT, test CSRF, verify session management. Days 9-10: Create test documentation including setup guides, mocking patterns, and CI/CD configuration.

**Final Deliverable:** 80%+ coverage on critical paths with documented testing infrastructure.

---

## DEVELOPER 4 - Frontend & Order Management Testing Lead

Your responsibility spans the landing page improvements and comprehensive order management system testing including NDR, RTO, and COD flows.

### Days 1-2: Landing Page Fixes

Start with a thorough audit of `client/src/features/landing/components/Hero/Hero.tsx`. Document issues: hardcoded Cloudinary URL at line 231, hardcoded carrier logo paths at lines 289-298, error handler with unsafe non-null assertions at lines 310-318.

**Issues to Fix:**
- Line 231: Move Cloudinary URL to environment config
- Lines 289-298: Add fallback images and lazy loading
- Lines 310-318: Add proper null checks and error boundaries

**Accessibility Requirements:**
- Add ARIA labels to all interactive elements
- Fix keyboard navigation for carrier logo grid
- Ensure WCAG AA color contrast compliance
- Add `prefers-reduced-motion` support for animations

Create `Hero.test.tsx` for component testing.

### Days 3-4: Order Management Testing

Shift to order management testing. Create `server/tests/integration/order/order-lifecycle.test.ts` covering creation with dynamic pricing, status transitions, and cancellation.

Create shipment tests covering carrier assignment and AWB generation. Then build NDR lifecycle tests at `server/tests/integration/ndr/ndr-lifecycle.test.ts` - test detection from webhooks, resolution actions, and customer communication triggers.

Create RTO tests and COD remittance tests. The services are at:
- `server/src/core/application/services/ndr/`
- `server/src/core/application/services/rto/rto.service.ts`
- `server/src/core/application/services/finance/cod-remittance.service.ts`

### Days 5-10

Day 5: Finalize SEO improvements - add meta tags, Open Graph tags, Twitter cards, and JSON-LD structured data. Verify responsive design across all breakpoints (320px to 1920px).

Day 6: Cross-browser testing on Chrome, Firefox, Safari, Edge plus mobile browsers.

Day 7: Client performance optimization - run Lighthouse on all pages, optimize bundles, verify lazy loading.

Day 8: Client security audit - XSS prevention, sensitive data exposure, CORS, CSP headers.

Days 9-10: Deployment documentation including environment variables, monitoring setup, and rollback procedures.

**Final Deliverable:** Lighthouse 90+ performance, 95+ accessibility, and comprehensive order flow test coverage.

---

## SHARED COORDINATION NOTES FOR ALL DEVELOPERS

### Daily Schedule
- **9:00 AM:** Morning standup - report blockers immediately, don't wait
- **12:30 PM:** Lunch sync - quick progress check
- **4:00 PM:** Afternoon sync - coordinate cross-dependencies
- **5:30 PM:** EOD handoff - completed work, tomorrow prep

### Git Workflow
Create feature branches from main:
- `feature/delhivery-integration`
- `feature/ekart-integration`
- `feature/auth-testing`
- `feature/landing-improvements`

PR reviews required before merge. No direct commits to main.

### Communication Protocol
- Dev1 and Dev2 must sync on courier patterns daily
- Dev3 needs to know when Dev1/Dev2 complete methods so tests can be written
- Dev4's order tests depend on courier integrations working for E2E scenarios

### Key Dependencies
```
Day 1: All work is INDEPENDENT

Day 2:
├── Dev1 Delhivery core → Depends on Day 1 skeleton
├── Dev2 Ekart core → Depends on Day 1 skeleton
├── Dev3 RBAC tests → Independent
└── Dev4 Landing → Independent

Day 3:
├── Dev1 Webhooks → Depends on Day 2 core
├── Dev2 Webhooks → Depends on Day 2 core (follows Dev1 pattern)
├── Dev3 E-commerce tests → Independent
└── Dev4 Order tests → Independent

Day 4:
├── Dev1 Reverse/Cancel → Depends on Day 2 core
├── Dev2 Reverse/Cancel → Depends on Day 2 core
├── Dev3 Velocity tests → Independent
└── Dev4 NDR/RTO tests → Independent

Day 5+:
├── Integration tests → Depends on ALL courier work
└── Coverage report → Depends on ALL tests
```

### Definition of Done

**For Courier Integrations (Dev1, Dev2):**
- [ ] All 7 ICourierAdapter methods implemented
- [ ] Unit tests with 80%+ coverage
- [ ] Integration test with sandbox API passing
- [ ] Webhook handler with signature verification
- [ ] Error handling with retry logic
- [ ] Rate limiting implemented
- [ ] Added to CourierFactory
- [ ] Environment variables documented

**For Testing (Dev3):**
- [ ] All tests pass in CI
- [ ] Coverage meets 80% threshold
- [ ] No flaky tests
- [ ] Fixtures documented

**For Landing Page (Dev4):**
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 95
- [ ] All images have alt text
- [ ] Responsive on all breakpoints
- [ ] No console errors

Must: Branch / PR / Commit rules

Branch names: feature/delhivery-integration, feature/ekart-integration, feature/testing-and-rbac, feature/landing-and-order-tests.

Commits: atomic, follow Conventional Commits (e.g., feat(delhivery): implement createShipment), include tests.
