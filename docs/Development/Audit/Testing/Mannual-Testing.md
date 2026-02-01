# Manual API Testing Plan for Shipcrowd Backend

## Overview
Comprehensive manual testing strategy for 385 API endpoints across 45 route files, organized by business domains, logical groupings, and aligned with the 38 critical shipping scenarios from the master plan.

**STATUS:** ✅ VERIFIED - All endpoint counts and feature implementations confirmed via codebase audit (2026-01-09)

## Testing Scope
- **Total Endpoints:** 385 (verified across all 45 route files)
- **Route Files:** 45
- **Testing Method:** Real database, server, and API interactions using Postman
- **Authentication:** JWT-based with role-based access control
- **Testing Tool:** Postman (with collections, environments, and test scripts)
- **Test Data:** Using existing seed scripts
- **Documentation Level:** Comprehensive (full test cases with examples, validations, edge cases)
- **Integration Testing:** All scenarios (webhook testing, OAuth flows, mock responses, and live integrations)

---

## ⚠️ CRITICAL: Implementation Status & Testing Availability

### Endpoints Available for Testing NOW (Phases 1-7)
✅ **385 verified endpoints** are fully implemented and can be tested:
- **Phase 1 (Days 1-3):** Auth, Company, KYC, Team, Warehouse, Ratecard, Zone (core foundation)
- **Phase 2 (Days 3-7):** Orders, Shipments, NDR, RTO, **Weight Disputes** ✅
- **Phase 3 (Days 8-9):** Basic wallet view, transaction history (read-only) ⚠️
- **Phase 4 (Days 10-12):** Picking, Packing, Inventory
- **Phase 5 (Days 13-16):** Marketplace integrations (Shopify, WooCommerce, Amazon, Flipkart)
- **Phase 6 (Day 17):** Analytics & Reporting
- **Phase 7 (Day 18):** Communications (Email, WhatsApp, SMS)
- **Phase 8 (Days 19-20):** Security & Error Handling

### Endpoints BLOCKED Until Week 11-12 Implementation
❌ **Critical gaps that will block some testing scenarios:**

1. **COD Remittance API Routes** (40-50 hours to implement)
   - Model exists in database, but HTTP routes/endpoints don't exist
   - Blocks: Phase 3, Day 8 (COD Remittance testing)
   - Required before manual testing can validate remittance workflows
   - Expected delivery: Week 11, Day 3 (after wallet implementation)

2. **Wallet API Routes** (20-30 hours to implement)
   - Backend services exist, but HTTP endpoints missing
   - Blocks: Phase 3, Days 8-9 (Wallet recharge, deduction, transaction creation)
   - Only read-only operations available now (view balance, transaction history)
   - Expected delivery: Week 11, Days 1-2
   - **Dependency:** Must implement before COD Remittance (remittance uses wallet)

3. **Returns Management Routes** (40-50 hours to implement)
   - Completely missing (no model, no service, no routes)
   - Blocks: Phase 2, Days 5-7 (Return order workflows)
   - Can test RTO workflows instead (similar but not identical)
   - Expected delivery: Week 12, Days 1-3

### Recommended Testing Sequence
1. **DO THIS NOW (Days 1-7):** Complete Phases 1-2 and Phase 5-8 (385 endpoints available)
2. **WAIT FOR IMPLEMENTATION (Week 11):** After wallet & COD routes implemented, test Phase 3
3. **WAIT FOR IMPLEMENTATION (Week 12):** After returns routes implemented, test Phase 2 returns scenarios

---

## Testing Environment Setup

### Prerequisites Checklist

#### 1. Local/Staging Server Setup
```bash
# Ensure all services are running
✓ MongoDB (port 27017)
✓ Redis (port 6379 - for BullMQ queues)
✓ Node.js server (port 5005)
✓ All environment variables configured (.env file)
```

#### 2. Test Data Preparation (Using Seed Scripts)
```bash
# Run seed scripts from /server directory
npm run seed:users          # Create test users with various roles
npm run seed:companies      # Create test companies (approved, pending, suspended)
npm run seed:warehouses     # Create warehouses with inventory
npm run seed:orders         # Create sample orders in various states
npm run seed:integrations   # Setup Shopify/WooCommerce/Amazon/Flipkart test stores
```

**Expected Test Data:**
- **Companies:** 5+ companies (3 approved, 1 pending KYC, 1 suspended)
- **Users:** 15+ users across all roles (admin, seller/owner, seller/admin, seller/manager, seller/member, seller/viewer, staff)
- **Warehouses:** 3+ warehouses with inventory across zones
- **Orders:** 50+ orders (pending, processing, shipped, delivered, returned, cancelled)
- **Integrations:** Test stores for each platform (Shopify, WooCommerce, Amazon, Flipkart)

#### 3. Postman Setup
1. **Install Postman Desktop** (https://www.postman.com/downloads/)
2. **Import Collection** (to be created during testing)
3. **Setup Environments:**
   - Local (http://localhost:5005)
   - Staging (https://staging.Shipcrowd.com)
4. **Configure Environment Variables:**
   ```
   BASE_URL: http://localhost:5005/api/v1
   ACCESS_TOKEN: {{accessToken}}
   REFRESH_TOKEN: {{refreshToken}}
   CSRF_TOKEN: {{csrfToken}}
   COMPANY_ID: {{companyId}}
   USER_ID: {{userId}}
   ```

#### 4. Authentication Flow Setup
**Create Postman Pre-request Script** (collection level):
```javascript
// Auto-refresh token if expired
if (pm.environment.get("ACCESS_TOKEN_EXPIRY") < Date.now()) {
    pm.sendRequest({
        url: pm.environment.get("BASE_URL") + "/auth/refresh",
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        body: {
            mode: 'raw',
            raw: JSON.stringify({
                refreshToken: pm.environment.get("REFRESH_TOKEN")
            })
        }
    }, function (err, res) {
        if (!err) {
            pm.environment.set("ACCESS_TOKEN", res.json().data.accessToken);
            pm.environment.set("ACCESS_TOKEN_EXPIRY", Date.now() + 15*60*1000);
        }
    });
}
```

---

## Authentication System Summary

### Token Management
- **Access Token:** 15 minutes expiry, contains `userId`, `role`, `companyId`, `jti`
- **Refresh Token:** 7 days expiry (30 days with "remember me")
- **Storage:** HTTP-only cookies or `Authorization: Bearer <token>` header

### User Roles & Permissions
| Role | Type | Scope | Permissions |
|------|------|-------|-------------|
| **admin** | Platform | Global | Full system access, manage all companies |
| **seller** | Company | Company-scoped | Access to own company data |
| **staff** | Warehouse | Limited | Warehouse operations only |

### Team Roles (within company)
| Team Role | Permissions | Use Case |
|-----------|-------------|----------|
| **owner** | Full company access | Company founder |
| **admin** | Almost full access (cannot delete company) | CTO, COO |
| **manager** | Operational permissions | Operations manager |
| **member** | Basic CRUD operations | Customer support |
| **viewer** | Read-only access | Accountant, auditor |

### Security Middleware
1. **CSRF Protection:** Required for POST/PUT/PATCH/DELETE auth routes
2. **Rate Limiting:** Various limits per endpoint type (login: 5/15min, general: 100/15min)
3. **KYC Check:** Required for shipping operations
4. **Company Suspension Check:** Blocks access if company suspended
5. **Permission Checks:** Module-action based permissions (orders:create, team:invite, etc.)

---

## Testing Strategy & Phases

### Phase 1: Foundation Testing (Days 1-3)
**Goal:** Establish authentication, create base entities, verify critical path

#### 1.1 Authentication & Session Management (Day 1 Morning)
**Endpoint Group:** [auth.routes.ts](server/src/presentation/http/routes/v1/auth/auth.routes.ts) (21 APIs)

**Test Scenarios:**
1. **User Registration & Email Verification**
   - Register new user → Verify email → Login successfully
   - Test with invalid email, weak password, duplicate email

2. **Login Flow (Multiple Methods)**
   - Email/password login → Receive tokens → Access protected route
   - Google OAuth login → Callback → Tokens issued
   - Magic link login → Verify link → Auto-login

3. **Token Management**
   - Access token expires after 15min → Refresh token → New access token
   - Logout → Token blacklisted → Cannot use revoked token
   - "Remember me" checkbox → 30-day refresh token

4. **Password Operations**
   - Request password reset → Receive email → Confirm reset with token
   - Change password (authenticated) → Old password + new password + CSRF
   - Set password (OAuth users who don't have password)

5. **Session Management**
   - View all active sessions → Revoke specific session → Revoke all except current
   - Max 5 concurrent sessions → 6th login revokes oldest session

**Critical Validations:**
- ✓ Tokens contain correct claims (userId, role, companyId)
- ✓ CSRF token required for state-changing operations
- ✓ Rate limiting enforced (5 login attempts per 15min)
- ✓ Account locked after 5 failed attempts
- ✓ Email verification required before full access

**Postman Tests:**
```javascript
// Example: Login test
pm.test("Login successful", function () {
    pm.response.to.have.status(200);
    const json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data.accessToken).to.exist;
    pm.expect(json.data.user.email).to.eql(pm.environment.get("TEST_EMAIL"));

    // Store tokens for future requests
    pm.environment.set("ACCESS_TOKEN", json.data.accessToken);
    pm.environment.set("REFRESH_TOKEN", json.data.refreshToken);
    pm.environment.set("USER_ID", json.data.user.id);
    pm.environment.set("COMPANY_ID", json.data.user.companyId);
});
```

---

#### 1.2 Company & KYC Setup (Day 1 Afternoon)
**Endpoint Group:** [company.routes.ts](server/src/presentation/http/routes/v1/companies/company.routes.ts) (12 APIs), [kyc.routes.ts](server/src/presentation/http/routes/v1/companies/kyc.routes.ts) (12 APIs)

**Test Scenarios:**
1. **Company Profile Management**
   - Get company profile → Update company info → Upload logo
   - Test with admin (see all companies) vs seller (see own company only)

2. **KYC Verification Flow (Critical for Shipping)**
   - Upload PAN card → Upload Aadhaar → Submit for verification
   - DeepVue webhook: KYC approved → Company status: `approved`
   - DeepVue webhook: KYC rejected → Company status: `rejected`
   - Manual review for edge cases

3. **Company Status Transitions**
   - `pending_verification` → `kyc_submitted` → `approved` → Can ship orders
   - `approved` → `suspended` → Cannot create orders

4. **Multi-Tenancy Validation**
   - User from Company A cannot access Company B's data
   - Admin can access all companies

**Critical Validations:**
- ✓ KYC required before creating orders
- ✓ Company isolation enforced (no cross-company access)
- ✓ DeepVue integration works (or mock in dev mode)
- ✓ Company suspension blocks all operations

---

#### 1.3 User & Team Management (Day 2 Morning)
**Endpoint Group:** [team.routes.ts](server/src/presentation/http/routes/v1/teams/team.routes.ts) (14 APIs), [profile.routes.ts](server/src/presentation/http/routes/v1/auth/profile.routes.ts) (8 APIs)

**Test Scenarios:**
1. **Team Member Invitation**
   - Owner invites admin → Email sent → Admin accepts invitation
   - Invited user already has account → Add to team
   - Invited user doesn't have account → Create account + add to team

2. **Role-Based Access Control**
   - Owner: Can do everything
   - Admin: Cannot delete company
   - Manager: Cannot manage team roles
   - Member: Cannot delete resources
   - Viewer: Read-only access

3. **Permission Management**
   - Assign module-action permissions (`orders:create`, `team:invite`)
   - Test permission enforcement on protected routes

4. **Team Member Management**
   - Update team member role → Permissions updated
   - Suspend team member → Member cannot login
   - Remove team member → Member loses access

**Critical Validations:**
- ✓ Only owner/admin can invite members
- ✓ Permission checks enforced on all protected routes
- ✓ Suspended users cannot perform any action
- ✓ Team role hierarchy respected

---

#### 1.4 Warehouse & Ratecard Setup (Day 2 Afternoon)
**Endpoint Group:** [warehouse.routes.ts](server/src/presentation/http/routes/v1/warehouses/warehouse.routes.ts) (6 APIs), [ratecard.routes.ts](server/src/presentation/http/routes/v1/ratecards/ratecard.routes.ts) (5 APIs), [zone.routes.ts](server/src/presentation/http/routes/v1/zones/zone.routes.ts) (4 APIs)

**Test Scenarios:**
1. **Warehouse Creation & Configuration**
   - Create warehouse → Set pickup address → Configure operational hours
   - Assign warehouse zones (A, B, C, D)
   - Set warehouse as default pickup location

2. **Zone-Based Pricing Setup (Critical for Rate Calculation)**
   - Upload pincode-zone mapping (19,000+ Indian pincodes)
   - Configure ratecard: Zone A (₹30/kg), Zone B (₹40/kg), Zone C (₹60/kg), Zone D (₹120/kg)
   - Test rate calculation: Bangalore (560001) → Mumbai (400001) = Zone B = ₹40/kg

3. **Warehouse Locations & Inventory Setup**
   - Create warehouse locations (A1, A2, B1) → Assign inventory to locations
   - Test inventory tracking (onHand, available, reserved, inTransfer)

**Critical Validations:**
- ✓ Rate calculation correct for all zone combinations
- ✓ Warehouse required before creating orders
- ✓ Pincode-zone mapping accurate
- ✓ Inventory tracking prevents overselling

---

### Phase 2: Core Order Lifecycle Testing (Days 3-7)
**Goal:** Test end-to-end order flow from creation to delivery/RTO

**Note:** Returns Management routes are not yet implemented. Use RTO workflows as substitutes for testing return scenarios (similar but not identical). Full Returns Management testing will be available in Week 12.

#### 2.1 Order Creation & Rate Calculation (Day 3)
**Endpoint Group:** [order.routes.ts](server/src/presentation/http/routes/v1/orders/order.routes.ts) (6 APIs)

**Test Scenarios (Aligned with Scenario #2: The Shipping Lifecycle):**
1. **Single Order Creation**
   - Enter pickup/delivery address → Select weight/dimensions → Choose payment mode (COD/Prepaid)
   - System calls Velocity API → Fetch available couriers → Display rates
   - Select courier → Wallet deducted → Label generated (PDF with AWB number)

2. **Bulk Order Upload (CSV)**
   - Download CSV template → Fill 500 orders → Upload
   - Validation: Invalid pincodes, phone numbers, weights
   - Error report: Row 234 has invalid pincode
   - Bulk creation: All 500 orders created → 500 labels generated (ZIP file)

3. **Rate Calculation Edge Cases**
   - Oversized package (>30kg) → Freight rates
   - Remote pincode (Arunachal Pradesh) → Zone D rates
   - Peak season (Diwali) → Surcharge applied
   - Insurance (high-value item) → 0.5% of invoice value

4. **Serviceability Check**
   - Enter pincode not serviced by any courier → Show error
   - Enter pincode serviced by 2 couriers → Show both options

**Critical Validations:**
- ✓ Rate calculation matches zone-based pricing
- ✓ Wallet balance sufficient before order creation
- ✓ Label contains correct AWB number and barcode
- ✓ Bulk upload validates all rows before creation

---

#### 2.2 Shipment Creation & Manifest (Day 4)
**Endpoint Group:** [shipment.routes.ts](server/src/presentation/http/routes/v1/shipments/shipment.routes.ts) (7 APIs)

**Test Scenarios:**
1. **Manifest & Pickup Request**
   - Create 50 orders throughout the day → At 5 PM, click "Request Pickup"
   - System creates manifest → Sends to Velocity → Velocity notifies courier
   - Courier picks up → Scans AWB → Order status: "Picked Up"

2. **Pickup Scheduling (Scenario #8)**
   - Schedule pickup: Jan 15, 2 PM - 4 PM → Driver arrives → Partial pickup (40/50 orders)
   - Failed pickup scenarios: Driver doesn't show → Auto-reschedule

3. **Tracking & Status Updates**
   - Order status: Created → Picked Up → In Transit → Out for Delivery → Delivered
   - Track shipment by AWB number → See real-time location
   - Webhook from Velocity updates status automatically

**Critical Validations:**
- ✓ Manifest contains all orders for the day
- ✓ Pickup request sent to correct courier
- ✓ Status updates reflected in dashboard immediately
- ✓ Tracking URL accessible to customer

---

#### 2.3 NDR (Non-Delivery Report) Management (Day 5)
**Endpoint Group:** [ndr.routes.ts](server/src/presentation/http/routes/v1/ndrs/ndr.routes.ts) (13 APIs)

**Test Scenarios (Scenario #3: Delivery Failure/NDR, Scenario #27: NDR Management):**
1. **NDR Detection & Notification**
   - Delivery attempt fails (customer not home) → Velocity webhook → NDR created
   - Notification sent to seller (SMS + Email + WhatsApp) within 5 minutes
   - Notification sent to customer: "Please confirm redelivery date"

2. **NDR Resolution Actions**
   - Seller action: "Call customer" → Update status → Reschedule delivery
   - Seller action: "Update address" → Send to courier → Re-attempt delivery
   - Automated action: Customer responds to SMS → Auto-reschedule

3. **NDR-to-RTO Escalation**
   - NDR unresolved after 3 attempts → Auto-trigger RTO
   - Seller manually triggers RTO → RTO initiated

4. **NDR Analytics**
   - NDR rate by reason (not home 60%, refused 20%, payment issue 10%)
   - NDR rate by geography (Mumbai 5%, Delhi 12%)
   - Predictive analytics: "Customer usually available 2-4 PM"

**Critical Validations:**
- ✓ NDR detected within 5 minutes of failed delivery
- ✓ Notifications sent to both seller and customer
- ✓ RTO triggered after deadline (default: 3 days)
- ✓ NDR analytics accurate

---

#### 2.4 RTO (Return to Origin) Processing (Day 6)
**Endpoint Group:** [rto.routes.ts](server/src/presentation/http/routes/v1/rtos/rto.routes.ts) (7 APIs)

**Test Scenarios (Scenario #2: RTO - The Nightmare):**
1. **RTO Initiation & Charges**
   - Order delivery failed after 3 attempts → RTO auto-triggered
   - System deducts RTO charge (₹50) from seller's wallet
   - RTO shipment created → Tracking reverse journey

2. **RTO QC (Quality Check) Workflow**
   - Package arrives at warehouse → QC pending → Inspector checks condition
   - QC pass → Product restocked → Inventory updated
   - QC fail (damaged) → Product disposed → Inventory not updated

3. **RTO Financial Impact**
   - Forward charge: ₹50 → RTO charge: ₹50 → Total: ₹100 loss for seller
   - COD order: ₹1,000 COD not collected → Seller loses product + ₹100 shipping
   - Dashboard shows: RTO % (if >30%, flag seller)

**Critical Validations:**
- ✓ RTO charge deducted immediately
- ✓ Inventory restocked only after QC approval
- ✓ RTO analytics show true cost to seller
- ✓ High RTO rate triggers seller alert

---

#### 2.5 Weight Discrepancy Management (Day 7)
**Endpoint Group:** [weight-disputes.routes.ts](server/src/presentation/http/routes/v1/weight-disputes/weight-disputes.routes.ts) (6 APIs) ✅ **VERIFIED - FULLY IMPLEMENTED**

**Test Scenarios (Scenario #1: Weight Discrepancy - The "Gotcha"):**
1. **Weight Discrepancy Detection**
   - Seller declares: 0.5 kg → Charged: ₹40
   - Courier weighing machine: Actual 1.2 kg → Revised charge: ₹95
   - Velocity webhook → Shipcrowd creates weight dispute automatically

2. **Dispute Notification & Resolution**
   - Seller notified: "Weight discrepancy detected. Declared: 0.5kg, Actual: 1.2kg. Additional charge: ₹55"
   - Dispute includes proof: Photo of package on weighing scale
   - Seller actions:
     - Accept dispute → Auto-deduct ₹55 from wallet
     - Reject dispute → Escalate to manual review

3. **Automated Resolution**
   - If wallet balance sufficient → Auto-deduct additional charge
   - If wallet balance insufficient → Mark shipment as "Payment Pending" → Block future orders

4. **Fraud Pattern Detection**
   - Seller consistently declares 0.5kg but actual is 2kg → Flag account
   - System suggests: "Use our automated weighing scale at pickup"

**Critical Validations:**
- ✓ Weight dispute auto-created on discrepancy >10%
- ✓ Photo proof attached to dispute
- ✓ Additional charges deducted correctly
- ✓ Fraud patterns detected and flagged

---

### Phase 3: Financial Operations Testing (Days 8-9)
**Goal:** Test wallet, COD remittance, payouts, and transactions

#### 3.1 Wallet Management (Day 8 Morning)
**Endpoint Group:** (Wallet APIs - part of company management) ⚠️ **BLOCKED - ROUTES NOT IMPLEMENTED**

**Status:** Backend services exist but HTTP endpoints missing (20-30 hours to implement in Week 11)
- ✅ Read-only operations available NOW: View balance, view transaction history
- ❌ Cannot test: Wallet recharge, deductions, low balance alerts (endpoints missing)
- ⏰ Expected implementation: Week 11, Days 1-2
- **Dependency:** Must implement before COD Remittance testing

**Currently Available Test Scenarios:**
1. **Wallet Recharge (Scenario #1: Step 3 - Wallet Recharge)**
   - Seller clicks "Recharge Wallet" → Pays ₹500 via Razorpay → Wallet balance: ₹500
   - Payment methods: UPI, Card, Net Banking
   - Razorpay webhook confirms payment → Wallet updated

2. **Wallet Deductions**
   - Create order → Shipping cost ₹40 deducted → Balance: ₹460
   - Weight dispute → Additional ₹55 deducted → Balance: ₹405
   - RTO charge → ₹50 deducted → Balance: ₹355

3. **Low Balance Alerts**
   - Wallet balance < ₹100 → Email alert sent
   - Wallet balance = ₹0 → Cannot create orders

4. **Transaction History**
   - View all transactions → Filter by type (credit, debit, refund)
   - Download transaction report (CSV/PDF)

**Critical Validations:**
- ✓ Razorpay integration works correctly
- ✓ Deductions happen atomically (no race conditions)
- ✓ Low balance alerts sent correctly
- ✓ Transaction history accurate

---

#### 3.2 COD Remittance (Day 8 Afternoon)
**Endpoint Group:** (COD remittance APIs) ⚠️ **BLOCKED - ROUTES NOT IMPLEMENTED**

**Status:** Database model exists but HTTP routes missing (40-50 hours to implement in Week 11)
- ❌ Cannot test: Remittance scheduling, payouts, remittance dashboard
- ⏰ Expected implementation: Week 11, Day 3 (after wallet routes implemented)
- **Dependency:** Wallet routes must be implemented first (remittance uses wallet)
- **Recommended:** Skip this section until Week 11. For now, test webhook payload structures and database records manually.

**Planned Test Scenarios (for Week 11+):**
1. **COD Collection Timeline**
   - Day 0: 100 orders delivered → ₹1,00,000 COD collected by drivers
   - Day 2: Delhivery deposits to Velocity → ₹98,000 (₹2,000 COD handling fee)
   - Day 5: Velocity deposits to Shipcrowd → Shipcrowd's bank account
   - Day 7: Shipcrowd transfers to seller → ₹97,500 (minus ₹500 platform fee)

2. **Remittance Scheduling**
   - Default: Weekly remittance (every Monday)
   - On-demand payout: Immediate, but charged 2% fee
   - Scheduled payout: Bi-weekly or monthly (0.5% fee)

3. **Remittance Dashboard**
   - COD Pending: ₹1,00,000 (in transit, not yet remitted)
   - COD Available: ₹0 (available for payout)
   - Next Remittance Date: Jan 15, 2026
   - Historical remittances: View past payouts

4. **Failed Payout Handling**
   - Bank rejects transfer (invalid account number) → Retry mechanism
   - 3 failed attempts → Alert seller → Manual verification

**Critical Validations:**
- ✓ Remittance timeline accurate (Day 7 after delivery)
- ✓ Deductions (COD handling + platform fee) calculated correctly
- ✓ Payout scheduled and executed automatically
- ✓ Failed payouts retried with exponential backoff

---

#### 3.3 Sales Commission & Payouts (Day 9)
**Endpoint Group:** [sales-representatives.routes.ts](server/src/presentation/http/routes/v1/sales/sales-representatives.routes.ts) (9 APIs), [commission-rules.routes.ts](server/src/presentation/http/routes/v1/sales/commission-rules.routes.ts) (8 APIs), [commission-transactions.routes.ts](server/src/presentation/http/routes/v1/sales/commission-transactions.routes.ts) (9 APIs), [payouts.routes.ts](server/src/presentation/http/routes/v1/payouts/payouts.routes.ts) (7 APIs)

**Test Scenarios (Scenario #14: Commission & Sales Team):**
1. **Sales Rep Onboarding**
   - Create sales rep account → Assign commission rules (20% of profit)
   - Generate referral code (AMIT123)

2. **Seller Attribution**
   - Seller signs up with referral code AMIT123 → Tagged with salesRepId
   - All seller's orders tracked for commission calculation

3. **Commission Calculation (Month-End)**
   - Seller ships 1,000 orders → Total profit: ₹10,000
   - Sales rep commission: 20% of ₹10,000 = ₹2,000
   - Payout via RazorpayX to sales rep's bank account

4. **Commission Dashboard**
   - Total customers: 25
   - Active customers (shipped this month): 18
   - Total orders this month: 5,000
   - Estimated commission: ₹45,000

**Critical Validations:**
- ✓ Referral code tracking works correctly
- ✓ Commission calculated accurately
- ✓ Payouts processed automatically
- ✓ Sales rep dashboard shows real-time data

---

### Phase 4: Warehouse Operations Testing (Days 10-12)
**Goal:** Test picking, packing, inventory management, and stock movements

#### 4.1 Picking Workflows (Day 10)
**Endpoint Group:** [picking.routes.ts](server/src/presentation/http/routes/v1/warehouses/picking/picking.routes.ts) (14 APIs)

**Test Scenarios:**
1. **Pick List Generation (Strategies)**
   - Batch picking: 50 orders grouped together → Picker collects all items in one trip
   - Wave picking: Orders grouped by time window (2-4 PM wave)
   - Zone picking: Orders grouped by warehouse zone (Zone A, Zone B)
   - Discrete picking: One order at a time (high-priority orders)

2. **Picking Execution**
   - Assign pick list to picker → Picker scans items → Item status: "Picked"
   - Short pick: Item not found → Status: "Short Pick" → Alert inventory team
   - Damaged item: Status: "Damaged" → Exclude from shipment

3. **Pick List Completion**
   - All items picked → Pick list status: "Completed" → Move to packing
   - Partial completion → Status: "Partial" → Remaining items moved to next pick list

**Critical Validations:**
- ✓ Pick list optimizes picker route (shortest path)
- ✓ Inventory reserved when pick list created
- ✓ Short picks trigger replenishment alerts
- ✓ Damaged items removed from inventory

---

#### 4.2 Packing Workflows (Day 11)
**Endpoint Group:** [packing.routes.ts](server/src/presentation/http/routes/v1/warehouses/packing/packing.routes.ts) (16 APIs)

**Test Scenarios:**
1. **Packing Station Assignment**
   - 5 packing stations: 2 standard, 1 fragile, 1 oversized, 1 express
   - Order routed to correct station based on type
   - Station capacity management (max 10 orders per station)

2. **Packing Process**
   - Scan order → Scan items → Pack items → Weigh package → Print label → Stick label
   - Weight verification: If actual weight > declared weight → Create weight dispute
   - Fragile items: Extra padding + "FRAGILE" label

3. **Label Printing**
   - Label contains: AWB number, barcode, sender/receiver address, courier name
   - Multi-piece shipments: "Part 1 of 2", "Part 2 of 2"
   - QR code for tracking

**Critical Validations:**
- ✓ Correct station assignment based on order type
- ✓ Weight verification at packing stage
- ✓ Label generated correctly with all details
- ✓ Packing station capacity respected

---

#### 4.3 Inventory Management (Day 12)
**Endpoint Group:** [inventory.routes.ts](server/src/presentation/http/routes/v1/inventory/inventory.routes.ts) (16 APIs)

**Test Scenarios (Scenario #34: Inventory Synchronization):**
1. **Inventory Tracking**
   - onHand: 100 units (total physical stock)
   - reserved: 20 units (allocated to orders)
   - available: 80 units (onHand - reserved - damaged)
   - inTransfer: 10 units (moving between warehouses)
   - damaged: 5 units (awaiting disposition)
   - onOrder: 50 units (incoming from supplier)

2. **Stock Movements (Audit Trail)**
   - Movement types: RECEIVE, PICK, TRANSFER, ADJUSTMENT, RETURN, DAMAGE, DISPOSAL
   - Every inventory change creates a stock movement record
   - Track who made the change, when, and why

3. **Replenishment Automation**
   - Low stock alert: available < 10 units → Status: LOW_STOCK
   - Replenishment suggested: "Order 50 units to maintain buffer"
   - Auto-purchase order created → Status: ORDERED → IN_TRANSIT → RECEIVED

4. **Multi-Channel Inventory Sync**
   - Shipcrowd order created → Inventory reserved → Sync to Shopify (reduce available qty)
   - Shopify order created → Webhook → Shipcrowd inventory reserved
   - Overselling prevention: If only 1 unit left, block other channels

**Critical Validations:**
- ✓ Inventory calculations accurate (available = onHand - reserved - damaged)
- ✓ Stock movements create audit trail
- ✓ Low stock alerts sent timely
- ✓ Multi-channel sync works without overselling

---

### Phase 5: Marketplace Integrations Testing (Days 13-16)
**Goal:** Test Shopify, WooCommerce, Amazon, Flipkart integrations and webhooks

#### 5.1 Shopify Integration (Day 13)
**Endpoint Group:** [shopify.routes.ts (integrations)](server/src/presentation/http/routes/v1/integrations/shopify.routes.ts) (12 APIs), [shopify.routes.ts (webhooks)](server/src/presentation/http/routes/v1/webhooks/shopify.routes.ts) (8 APIs)

**Test Scenarios (Scenario #11: E-commerce Integration):**
1. **OAuth Connection**
   - Seller clicks "Connect Shopify" → Redirected to Shopify login
   - Seller approves access → OAuth callback → Access token stored (encrypted)
   - Webhook registration: orders/create, orders/updated, products/update, inventory_levels/update

2. **Order Auto-Sync (Webhook Flow)**
   - Customer places order on Shopify → Shopify webhook: "orders/create"
   - Shipcrowd receives webhook → Validates HMAC signature → Queues job
   - Background job processes webhook → Order created in Shipcrowd
   - Seller sees order in dashboard → Clicks "Ship" → Label generated

3. **Fulfillment Status Sync**
   - Order shipped in Shipcrowd → Update Shopify: "Order fulfilled"
   - Tracking number synced to Shopify → Customer sees tracking link

4. **Inventory Sync (Two-Way)**
   - Inventory updated in Shipcrowd → Sync to Shopify (update available qty)
   - Inventory updated in Shopify → Webhook → Update Shipcrowd inventory

5. **Webhook Security Testing**
   - Valid HMAC signature → Webhook processed
   - Invalid/missing HMAC → Webhook rejected (401 Unauthorized)
   - Duplicate webhook (same X-Shopify-Webhook-Id) → Ignored
   - Webhook replay attack (old timestamp) → Rejected

**Critical Validations:**
- ✓ OAuth flow completes successfully
- ✓ Webhooks received and processed within 1 minute
- ✓ HMAC signature validation works correctly
- ✓ Duplicate webhooks prevented
- ✓ Order sync accurate (all fields mapped correctly)

---

#### 5.2 WooCommerce Integration (Day 14)
**Endpoint Group:** [woocommerce.routes.ts](server/src/presentation/http/routes/v1/integrations/woocommerce.routes.ts) (14 APIs), [woocommerce.webhook.routes.ts](server/src/presentation/http/routes/v1/webhooks/woocommerce.webhook.routes.ts) (8 APIs)

**Test Scenarios:**
1. **API Key Authentication**
   - Seller enters WooCommerce store URL + Consumer Key + Consumer Secret
   - Test connection → Validate credentials → Store encrypted credentials

2. **Order Sync (Polling + Webhook)**
   - Background job polls WooCommerce API every 5 minutes → Fetch new orders
   - Webhook (if configured): order.created → Real-time sync

3. **Product & Inventory Sync**
   - Two-way inventory sync: WooCommerce ↔ Shipcrowd
   - Product mapping: Link WooCommerce product to Shipcrowd SKU

4. **Webhook Security (WooCommerce uses different signature method)**
   - Signature: base64(hmac_sha256(raw_body, webhook_secret))
   - Validate X-WC-Webhook-Signature header

**Critical Validations:**
- ✓ API key authentication works
- ✓ Polling and webhook both work correctly
- ✓ Inventory sync prevents overselling
- ✓ Webhook signature validation correct

---

#### 5.3 Amazon & Flipkart Integration (Day 15)
**Endpoint Group:** [amazon.routes.ts](server/src/presentation/http/routes/v1/integrations/amazon.routes.ts) (9 APIs), [flipkart.routes.ts](server/src/presentation/http/routes/v1/integrations/flipkart.routes.ts) (7 APIs), [flipkart.webhook.routes.ts](server/src/presentation/http/routes/v1/webhooks/flipkart.webhook.routes.ts) (8 APIs)

**Test Scenarios:**
1. **Amazon SP-API Integration**
   - Setup: Seller ID, Marketplace ID, Refresh Token, LWA credentials
   - Order sync: Fetch orders via SP-API (no webhooks, polling-based)
   - Fulfillment types: FBA (Fulfilled by Amazon) vs MFN (Merchant Fulfilled Network)
   - Inventory sync: Update Amazon inventory levels

2. **Flipkart Integration**
   - OAuth flow → Access token → Store encrypted
   - Webhook: order/create, order/approve, order/ready-to-dispatch, order/dispatch, order/deliver, order/cancel
   - Lifecycle management: Approve order → Ready to dispatch → Generate label → Dispatch → Update tracking

3. **Product Mapping (Critical for Multi-Marketplace)**
   - Map Amazon ASIN → Shipcrowd SKU
   - Map Flipkart listing ID → Shipcrowd SKU
   - Central inventory: One SKU serves all marketplaces

**Critical Validations:**
- ✓ Amazon SP-API authentication works
- ✓ Flipkart OAuth flow completes
- ✓ Order sync for both platforms accurate
- ✓ Product mapping prevents inventory duplication

---

#### 5.4 Webhook Stress Testing (Day 16)
**Goal:** Test webhook reliability, retry mechanisms, and failure handling

**Test Scenarios (Scenario #19: Webhook Retry Mechanisms):**
1. **Webhook Delivery Success**
   - Webhook received → Processed → HTTP 200 OK → Marked as processed

2. **Webhook Retry (Server Down)**
   - Webhook received → Server returns HTTP 500 → Retry mechanism triggered
   - Exponential backoff: 1s, 5s, 30s, 5min, 1hr, 24hr
   - Max 6 attempts over 24 hours → If all fail, mark as "Failed Permanently"

3. **Webhook Duplicate Prevention**
   - Same webhook ID received twice → Second webhook ignored
   - Idempotency check: Webhook event stored in database with unique constraint

4. **Webhook Queue Management**
   - High volume: 10,000 webhooks/hour → BullMQ queue handles load
   - Priority processing: Order creation (priority 2) > Inventory update (priority 4)
   - Failed webhooks: Dead letter queue → Manual retry available

5. **Webhook Security Testing**
   - Test with ngrok (for local development webhook testing)
   - Test signature validation for all platforms (Shopify, WooCommerce, Flipkart, Velocity)

**Critical Validations:**
- ✓ Webhook retry mechanism works correctly
- ✓ Duplicate webhooks prevented
- ✓ Queue handles high volume without crashing
- ✓ Signature validation secure against replay attacks

---

### Phase 6: Analytics & Reporting Testing (Day 17)
**Goal:** Test analytics dashboards, reports, and business intelligence

#### 6.1 System Analytics (Admin Dashboard)
**Endpoint Group:** [analytics.routes.ts (v1/system)](server/src/presentation/http/routes/v1/analytics/analytics.routes.ts) (14 APIs), [analytics.routes.ts (analytics)](server/src/presentation/http/routes/v1/analytics/analytics.routes.ts) (6 APIs)

**Test Scenarios (Scenario #31: Integrated Analytics):**
1. **Admin Dashboard Metrics**
   - Total orders: 10,000 (MTD), 50,000 (YTD)
   - Revenue: ₹5,00,000 (MTD), ₹30,00,000 (YTD)
   - Active sellers: 150
   - Average order value: ₹500
   - Growth metrics: +25% MoM, +150% YoY

2. **Seller Analytics**
   - Performance by courier: Delhivery (92% on-time), BlueDart (88%), XpressBees (85%)
   - Performance by geography: Mumbai (2% RTO), Delhi (8% RTO), Bangalore (4% RTO)
   - Performance by weight: 0-1kg (1% RTO), 5-10kg (3% RTO)
   - Seasonal trends: Peak season (Oct-Nov) = 5x volume

3. **Predictive Analytics**
   - Forecast next month's volume based on trends
   - Predict which sellers are at risk of churning
   - Suggest optimal courier for each route

4. **Custom Reports**
   - Date range selector (Jan 1 - Jan 31)
   - Export reports (CSV, PDF, Excel)
   - Scheduled reports (daily/weekly/monthly email)

**Critical Validations:**
- ✓ All metrics calculated correctly
- ✓ Charts render correctly
- ✓ Custom date ranges work
- ✓ Report exports work without errors

---

### Phase 7: Communication Services Testing (Day 18)
**Goal:** Test email, WhatsApp, SMS, and notification systems

#### 7.1 Email Service (SendGrid/SMTP)
**Endpoint Group:** [email.routes.ts](server/src/presentation/http/routes/v1/communications/email.routes.ts) (4 APIs)

**Test Scenarios:**
1. **Transactional Emails**
   - Email verification → Received in 1 minute
   - Password reset → Link works correctly
   - Order confirmation → Includes tracking link
   - NDR alert → Sent to seller within 5 minutes
   - Team invitation → Invitation link works

2. **Email Templates (SendGrid)**
   - Templates use dynamic content ({{userName}}, {{orderNumber}})
   - Fallback: If SendGrid fails, use SMTP
   - Batch emails: Send to 1,000 sellers (weekly newsletter)

3. **Email Delivery Monitoring**
   - Track open rates, click rates
   - Bounce handling: Remove invalid emails from list
   - Unsubscribe link in all marketing emails

**Critical Validations:**
- ✓ Emails delivered within 1 minute
- ✓ Templates render correctly
- ✓ Fallback to SMTP works
- ✓ Tracking metrics accurate

---

#### 7.2 WhatsApp Business API
**Endpoint Group:** [whatsapp.routes.ts](server/src/presentation/http/routes/v1/communications/whatsapp.routes.ts) (4 APIs)

**Test Scenarios:**
1. **NDR Notifications (Critical for RTO Reduction)**
   - Delivery failed → WhatsApp sent to customer within 5 minutes
   - Message: "Your order is pending. Please confirm redelivery date. Reply 1 for Yes, 2 for No"
   - Customer replies "1" → Auto-reschedule delivery

2. **Order Status Updates**
   - Order shipped → WhatsApp to customer with tracking link
   - Order delivered → WhatsApp confirmation

3. **Interactive Messages**
   - Button-based messages: "Track Order", "Contact Support"
   - List-based messages: "Select delivery time slot"

**Critical Validations:**
- ✓ WhatsApp messages delivered within 1 minute
- ✓ Interactive buttons work correctly
- ✓ Customer replies processed automatically
- ✓ Fallback to SMS if WhatsApp unavailable

---

#### 7.3 Notification System
**Endpoint Group:** [notification.routes.ts](server/src/presentation/http/routes/v1/notifications/notification.routes.ts) (5 APIs)

**Test Scenarios:**
1. **In-App Notifications**
   - Bell icon shows unread count
   - Click notification → Navigate to relevant page
   - Mark as read/unread
   - Delete notification

2. **Push Notifications (Web)**
   - Browser permission requested → User accepts
   - Push notification sent → Appears on desktop
   - Click notification → Opens Shipcrowd dashboard

3. **Notification Preferences**
   - User selects: Email, WhatsApp, SMS, Push, In-App
   - User can disable specific notification types
   - Critical notifications (KYC rejected) cannot be disabled

**Critical Validations:**
- ✓ Unread count accurate
- ✓ Notifications navigate to correct page
- ✓ Preferences saved correctly
- ✓ Critical notifications always sent

---

### Phase 8: Edge Cases & Security Testing (Days 19-20)
**Goal:** Test authorization, permissions, rate limiting, CSRF, and error scenarios

#### 8.1 Security Testing (Day 19)

**Test Scenarios:**
1. **Authentication Edge Cases**
   - Expired token → 401 Unauthorized → Refresh token
   - Revoked token → 401 Unauthorized → Cannot use blacklisted token
   - Invalid token → 401 Unauthorized
   - Missing token → 401 Unauthorized

2. **Authorization Edge Cases**
   - User from Company A tries to access Company B's data → 403 Forbidden
   - Viewer role tries to create order → 403 Forbidden
   - Staff tries to access admin routes → 403 Forbidden
   - Suspended company tries to create order → 403 Forbidden

3. **CSRF Protection**
   - POST /auth/login without CSRF token → 403 Forbidden
   - GET /auth/csrf-token → Receive CSRF token
   - POST /auth/login with CSRF token → 200 OK

4. **Rate Limiting**
   - Login: 6 attempts in 15 minutes → 429 Too Many Requests
   - General API: 101 requests in 15 minutes → 429 Too Many Requests
   - Password reset: 4 requests in 1 hour → 429 Too Many Requests

5. **SQL Injection / NoSQL Injection**
   - Test with malicious input: `{"email": {"$ne": ""}}`
   - All inputs sanitized → Attacks prevented

6. **XSS (Cross-Site Scripting)**
   - Test with: `<script>alert('XSS')</script>`
   - Input sanitized → Script not executed

**Critical Validations:**
- ✓ All security middleware enforced
- ✓ Authorization checks on every protected route
- ✓ CSRF protection works correctly
- ✓ Rate limiting enforced
- ✓ Injection attacks prevented

---

#### 8.2 Error Handling & Edge Cases (Day 20)

**Test Scenarios:**
1. **Insufficient Wallet Balance**
   - Wallet balance: ₹30 → Try to create order costing ₹40
   - Error: "Insufficient wallet balance. Please recharge."
   - Order not created

2. **Suspended Company**
   - Company status: `suspended` → Try to create order
   - Error: "Your account is suspended. Contact support."

3. **Invalid Pincode**
   - Enter non-existent pincode (999999) → Error: "Pincode not serviceable"

4. **Concurrent Order Creation**
   - Two users create order simultaneously with last ₹40 in wallet
   - Only one succeeds → Other gets insufficient balance error
   - Test race condition handling

5. **Database Connection Failure**
   - Simulate MongoDB down → Error: "Service temporarily unavailable"
   - Graceful degradation: Show cached data if available

6. **External API Failure**
   - Velocity API down → Error: "Cannot fetch courier rates. Try again later."
   - Fallback: Use cached rates if available

**Critical Validations:**
- ✓ All error responses follow standard format
- ✓ No sensitive data leaked in error messages
- ✓ Graceful degradation for external service failures
- ✓ Race conditions handled correctly

---

## Test Execution Guidelines

### Daily Workflow
1. **Morning (9 AM):** Team standup (15 minutes)
   - Share progress from previous day
   - Discuss blockers
   - Assign tasks for the day

2. **Testing (9:15 AM - 6 PM):**
   - Follow test scenarios sequentially
   - Document results in Postman collection
   - Log issues in GitHub

3. **End of Day (6 PM):** Update test report
   - Tests executed: 50
   - Passed: 45
   - Failed: 5 (logged as issues)

### Test Documentation Format (Postman)
Each request should include:
1. **Pre-request Script:** Setup (e.g., generate CSRF token)
2. **Request Body:** Sample data
3. **Tests (JavaScript):**
   ```javascript
   pm.test("Status code is 200", function () {
       pm.response.to.have.status(200);
   });

   pm.test("Response has correct structure", function () {
       const json = pm.response.json();
       pm.expect(json.success).to.be.true;
       pm.expect(json.data).to.exist;
   });

   pm.test("Business logic validated", function () {
       const json = pm.response.json();
       pm.expect(json.data.walletBalance).to.be.below(500);
   });
   ```
4. **Documentation:** Description of what the endpoint does

### Issue Logging Format (GitHub)
```markdown
## Bug: Weight Dispute Not Auto-Created

**Severity:** High
**Component:** Weight Dispute Management
**Endpoint:** POST /api/v1/shipments/:id/webhook

### Steps to Reproduce:
1. Create order with declared weight 0.5kg
2. Simulate courier webhook with actual weight 1.2kg
3. Check if weight dispute created

### Expected Behavior:
Weight dispute should be auto-created

### Actual Behavior:
Weight dispute not created, no error thrown

### Screenshots:
[Attach Postman response screenshot]

### Environment:
- Environment: Local (localhost:5005)
- User: seller@test.com (Company: Test Company)
- Order ID: ORD-123456
```

---

## Critical Files Reference

### Authentication & Authorization
- [server/src/presentation/http/middleware/auth/auth.ts](server/src/presentation/http/middleware/auth/auth.ts) - JWT authentication middleware
- [server/src/presentation/http/middleware/auth/authorization.middleware.ts](server/src/presentation/http/middleware/auth/authorization.middleware.ts) - RBAC middleware
- [server/src/presentation/http/middleware/auth/permissions.ts](server/src/presentation/http/middleware/auth/permissions.ts) - Permission-based authorization
- [server/src/shared/helpers/jwt.ts](server/src/shared/helpers/jwt.ts) - JWT utilities

### Database Models (Key Entities)
- [server/src/infrastructure/database/mongoose/models/companies/company.model.ts](server/src/infrastructure/database/mongoose/models/companies/company.model.ts)
- [server/src/infrastructure/database/mongoose/models/iam/users/user.model.ts](server/src/infrastructure/database/mongoose/models/iam/users/user.model.ts)
- [server/src/infrastructure/database/mongoose/models/orders/order.model.ts](server/src/infrastructure/database/mongoose/models/orders/order.model.ts)
- [server/src/infrastructure/database/mongoose/models/shipping/shipment.model.ts](server/src/infrastructure/database/mongoose/models/shipping/shipment.model.ts)
- [server/src/infrastructure/database/mongoose/models/shipping/ndr/ndr-event.model.ts](server/src/infrastructure/database/mongoose/models/shipping/ndr/ndr-event.model.ts)
- [server/src/infrastructure/database/mongoose/models/shipping/rto/rto-event.model.ts](server/src/infrastructure/database/mongoose/models/shipping/rto/rto-event.model.ts)

### Route Files (Organized by Domain)
All route files are in: [server/src/presentation/http/routes/v1/](server/src/presentation/http/routes/v1/)

---

## Verification & Success Criteria

### Phase 1 Success Criteria (Day 3)
- ✓ All 21 auth endpoints tested
- ✓ All roles (admin, seller, staff) tested with correct permissions
- ✓ Company created and KYC approved (or mocked)
- ✓ Team members invited and role hierarchy works
- ✓ Warehouse created with ratecard configured
- **Deliverable:** Postman collection with 80+ requests

### Phase 2 Success Criteria (Day 7)
- ✓ End-to-end order flow tested (create → ship → deliver → NDR → RTO)
- ✓ Weight disputes auto-created and resolved ✅ (fully testable)
- ✓ Core order lifecycle scenarios (18/38 scenarios) ✅ (fully testable)
- ⚠️ Returns Management scenarios (skip until Week 12 - routes not implemented)
- ✓ All state transitions validated
- **Deliverable:** 150+ test cases documented

### Phase 3 Success Criteria (Day 9) ⚠️ PARTIAL
**⏳ DEFER UNTIL WEEK 11:**
- ❌ Wallet operations - **BLOCKED** (routes not implemented, estimate 20-30 hours)
- ❌ COD remittance workflow - **BLOCKED** (routes not implemented, estimate 40-50 hours)
- ✅ Transaction history view (read-only)
- ✅ Sales commission calculation (already implemented)
- **Recommended Action:** Skip Phase 3 (Days 8-9) for now. Proceed to Phase 4-8. Return to Phase 3 after Week 11 implementation.
- **Deliverable:** Deferred until Week 11 implementation complete

### Phase 4 Success Criteria (Day 12)
- ✓ Picking workflows tested (batch, wave, zone, discrete)
- ✓ Packing workflows tested (all station types)
- ✓ Inventory tracking accurate (onHand, available, reserved)
- ✓ Stock movements audit trail validated
- **Deliverable:** Warehouse operations manual

### Phase 5 Success Criteria (Day 16)
- ✓ All 4 marketplace integrations tested
- ✓ OAuth flows completed successfully
- ✓ Webhooks received and processed correctly
- ✓ Webhook security validated (HMAC signatures)
- ✓ Order sync accurate across all platforms
- **Deliverable:** Integration testing report

### Phase 6 Success Criteria (Day 17)
- ✓ All analytics dashboards load correctly
- ✓ Metrics calculated accurately
- ✓ Reports exported successfully
- **Deliverable:** Analytics validation report

### Phase 7 Success Criteria (Day 18)
- ✓ All communication channels tested (Email, WhatsApp, SMS)
- ✓ Notifications delivered within SLA (5 minutes)
- ✓ Preferences saved correctly
- **Deliverable:** Communication flow diagram

### Phase 8 Success Criteria (Day 20)
- ✓ All security tests passed
- ✓ Authorization enforced on all protected routes
- ✓ Rate limiting works correctly
- ✓ Error handling graceful
- **Deliverable:** Security audit report

### Final Deliverable
- **Postman Collection:** 365+ API requests organized into folders
- **Test Report:** 500+ test cases executed
- **Issue Log:** All bugs documented in GitHub
- **Documentation:** Updated API documentation with examples
- **Video Demo:** Screen recording of critical flows

---

## Risk Mitigation & Troubleshooting

### Common Issues & Solutions

**Issue: Seed scripts not working**
- Solution: Check MongoDB connection, ensure .env file configured correctly
- Fallback: Create test data manually via API

**Issue: Webhooks not received locally**
- Solution: Use ngrok for local webhook testing (`ngrok http 5005`)
- Alternative: Use webhook.site to inspect webhook payloads

**Issue: DeepVue KYC integration not working in dev**
- Solution: Set `DEEPVUE_DEV_MODE=true` in .env to use mock responses

**Issue: Razorpay payments failing in test mode**
- Solution: Use test card: 4111 1111 1111 1111, Any future expiry, Any CVV

**Issue: Rate limiting blocking tests**
- Solution: Set `NODE_ENV=test` to disable rate limiting during testing

**Issue: CSRF token errors**
- Solution: First call `GET /auth/csrf-token`, then use token in subsequent requests

---

## RECOMMENDED TESTING SCHEDULE

### Immediate Testing (NOW - Days 1-7)
**385 endpoints available** | **Phases 1-2, 4-8**
```
Days 1-3:   Phase 1 - Foundation (Auth, Company, KYC, Team, Warehouse)
Days 3-7:   Phase 2 - Order Lifecycle (Orders, Shipments, NDR, RTO, Weight Disputes)
            ↓ Skip Phase 3 (Days 8-9) - Wallet & COD routes not implemented
Days 10-12: Phase 4 - Warehouse Operations (Picking, Packing, Inventory)
Days 13-16: Phase 5 - Marketplace Integrations (Shopify, WooCommerce, Amazon, Flipkart)
Day 17:     Phase 6 - Analytics & Reporting
Day 18:     Phase 7 - Communications (Email, WhatsApp, SMS)
Days 19-20: Phase 8 - Security & Error Handling
```

### Deferred Testing (Week 11+ - After Implementation)
**Phases 3** | **40-80 hours to implement**
```
Week 11, Days 1-2:   Wallet Routes Implementation → Then test Phase 3.1
Week 11, Day 3:      COD Remittance Routes → Then test Phase 3.2
Week 12, Days 1-3:   Returns Management Routes → Then test Phase 2 returns scenarios
```

### Critical Path
1. **Complete Phases 1-2, 4-8** (Days 1-20) - 385 endpoints testable
2. **Report findings** on existing implementations
3. **Developers implement** Wallet + COD Remittance (Week 11)
4. **QA tests** Phase 3 (Week 11)
5. **Developers implement** Returns Management (Week 12)
6. **QA tests** Returns scenarios (Week 12)

---

## Next Steps After Testing

1. **Prioritize Issues:** High → Medium → Low
2. **Fix Critical Bugs:** Block shipping operations (High priority)
3. **Regression Testing:** Re-test after fixes
4. **Performance Testing:** Load test with 10,000 concurrent users
5. **User Acceptance Testing:** Invite 5 beta sellers to test
6. **Production Deployment:** After all critical bugs fixed
7. **Week 11 Parallel:** QA testing Phase 3 (Wallet & COD) as developers implement

---

## Summary of Updates (2026-01-09)

**Verification Completed:**
- ✅ Endpoint count verified: **385 (not 365)**
- ✅ Route files verified: **45 (not 47)**
- ✅ Weight disputes verified: **Fully implemented with 6 endpoints** ✅
- ✅ COD remittance verified: **Model exists, routes missing** ❌
- ✅ Wallet routes verified: **Services exist, HTTP endpoints missing** ❌
- ✅ Returns management verified: **Completely missing** ❌

**Plan Updated:**
- ✅ Marked Wallet routes as BLOCKED (Phase 3.1)
- ✅ Marked COD remittance as BLOCKED (Phase 3.2)
- ✅ Added note about Returns Management (not testable until Week 12)
- ✅ Removed weight disputes from blocked list
- ✅ Added recommended testing sequence (NOW vs DEFERRED)
- ✅ Added critical path showing parallel implementation/testing

---

**Created:** 2026-01-09
**Updated:** 2026-01-09 (Verified & Revised)
**Status:** ✅ READY FOR EXECUTION (Phases 1-2, 4-8 available NOW)
**Estimated Duration:** 20 days (4 weeks) for Phases 1-8
**Team:** 2-3 QA engineers + 1 test lead
**Note:** Phase 3 deferred until Week 11 implementation complete
