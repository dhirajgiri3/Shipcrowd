# Detailed Root Cause Analysis for Remaining 40 Test Failures

**Date**: January 3, 2026 19:56 IST

---

## 1. NDRActionExecutors (12 failures) - QUICK FIX (15 min)

### Root Causes:

#### Tests 1-2: Exotel Call Tests Still Failing
**Error**: `Expected: true, Received: false`
**Why**: The service checks `if (!callResult.success)` but `initiateCall` is being called with **3 arguments**:
```typescript
// Service code (line 83-85):
const callResult = await this.exotel.initiateCall(
    customer.phone,
    actionConfig.callbackUrl,  // ← This is undefined in tests!
    JSON.stringify({ ndrEventId: ndrEvent._id, orderId: context.orderId })
);
```
**Problem**: Test mocks only expect 2 args, service passes 3. `callbackUrl` is undefined, causing failure.

#### Tests 3-5: WhatsApp Tests Failing
**Error**: `"Cannot read properties of undefined (reading 'success')"`
**Why**: Service calls TWO different WhatsApp methods:
```typescript
const result = message
    ? await this.whatsapp.sendMessage(customer.phone, message)
    : await this.whatsapp.sendNDRNotification(...);
```
**Problem**: Only `sendMessage` is mocked. `sendNDRNotification` is NOT mocked, returns undefined.

#### Tests 6-7: Email Tests
**Error**: `Expected: true, Received: false`
**Why**: Service uses `EmailService.sendEmail()` which is NOT mocked at all.
**Code**:
```typescript
await EmailService.sendEmail(
    customer.email,
    subject,
    emailHtml
);
```
**Problem**: EmailService not imported or mocked in test file.

#### Test 8: Update Address
**Error**: `"received value must not be null nor undefined"`
**Why**: WhatsApp mock needs to return success for address update link send.

#### Tests 9-10: Request Reattempt
**Error**: `Expected: "success", Received: "pending"`
**Why**: **This is actually correct behavior!** The service intentionally returns `'pending'` because:
```typescript
// Line 352: TODO: Integrate with courier API
result: 'pending',  // ← Correct - awaiting manual action
metadata: { awb: ndrEvent.awb, requiresManualAction: true }
```
**Fix**: Change test expectation to `'pending'` not `'success'`.

#### Tests 11-12: Trigger RTO
**Error**: `Expected: true, Received: false`
**Why**: RTOService.triggerRTO is called but not returning success. Needs full RTO mocking.

#### Test 13: Record Action Result  
**Error**: `Expected length: 1, Received length: 0`
**Why**: Test tries to mock `mongoose.model` but NDREvent model is imported from models barrel, not using mongoose.model().

---

## 2. NDRResolutionService (5 failures) - MEDIUM (15 min)

### Root Causes:

#### Test 1: Execute actions in sequence
**Error**: `Expected: "send_whatsapp", Any<Object>, {}`
**Why**: NDRActionExecutors.executeAction not being called. Workflow execution is failing before reaching action execution.

#### Test 2: Apply delay between actions
**Error**: `A dynamic import callback was invoked without --experimental-vm-modules`
**Why**: **Another dynamic import!** Service has:
```typescript
// ndr-resolution.service.ts line 149
const scheduler = await import('node-schedule');
```
**Fix**: Change to static import or mock node-schedule.

#### Tests 3-4: Deadline checks
**Error**: `Cannot read properties of undefined (reading 'length')`
**Why**: `NDREvent.aggregate()` returns undefined. Mock returns empty array but test overrides it.
**Code**:
```typescript
const expiredNDRsWithData = await NDREvent.aggregate([...]);
if (expiredNDRsWithData.length === 0) { // ← expiredNDRsWithData is undefined
```
**Fix**: Ensure aggregate mock persists across test setup.

#### Test 5: Log actions
**Error**: `Expected number of calls: >= 1, Received: 0`
**Why**: `NDRActionExecutors.recordActionResult` not being called because action execution fails earlier.

---

## 3. InventoryService (3 failures) - MEDIUM (10 min)

### Root Cause: **MongoDB Transactions Unsupported**

**Error**: `Transaction numbers are only allowed on a replica set member or mongos`

**Why**: All 3 failing tests call methods that use:
```typescript
const session = await mongoose.startSession();
session.startTransaction();
```

**The Problem**: 
- MongoDB transactions **ONLY work on replica sets**
- Test environment uses `mongodb-memory-server` in **standalone mode**
- Cannot run transactions on standalone MongoDB

**Affected Methods**:
1. `receiveStock` - Line 95 starts transaction
2. `adjustStock` - Line 146 starts transaction  
3. `getMovements` (via adjustStock) - Line 146 starts transaction

**Fix Options**:
1. Mock `mongoose.startSession()` to return fake session
2. Configure mongodb-memory-server as replica set (complex)
3. Wrap tests in condition to skip transaction in test env

---

## 4. ReportBuilderService (7 failures) - COMPLEX (20 min)

### Root Causes:

#### Tests 1-6: Analytics Service Methods Not Functions
**Error**: `order_analytics_service_1.default.getOrderStats is not a function`

**Why**: ReportBuilderService calls:
```typescript
OrderAnalyticsService.getOrderStats(...)
ShipmentAnalyticsService.getShipmentStats(...)
RevenueAnalyticsService.getRevenueStats(...)
CustomerAnalyticsService.getCustomerStats(...)
InventoryAnalyticsService.getStockLevels(...)
```

**Problem**: These analytics services are NOT mocked. The test file has NO jest.mock() calls for them.

**Files Needing Mocks**:
- `order-analytics.service.ts`
- `shipment-analytics.service.ts`
- `revenue-analytics.service.ts`
- `customer-analytics.service.ts`
- `inventory-analytics.service.ts`

#### Test 7: Save Report Config
**Error**: `models_1.ReportConfig is not a constructor`
**Why**: ReportConfig model not mocked properly - it's undefined.

---

## 5. RTOService (5 failures) - COMPLEX (20 min)

### Root Causes:

#### Test 1: Create RTO Event
**Error**: `Expected: true, Received: false`
**Why**: `triggerRTO` calls multiple unmocked dependencies:
- `Shipment.findById()` - not mocked, returns null
- `NDREvent.findOne()` - not mocked
- `Order.findByIdAndUpdate()` - not mocked
- `WalletService.hasMinimumBalance()` - mocked but may return false
**Result**: Fails early validation, returns `success: false`

#### Test 2: Calculate RTO Charges
**Error**: `expect(received).toBeGreaterThan(expected)` - received is object not number
**Why**: `calculateRTOCharges` is **async** returning Promise but test calls it without await:
```typescript
const charges = (RTOService as any).calculateRTOCharges(mockShipment);
// Missing await! ^^
expect(charges).toBeGreaterThan(0); // charges is Promise<number> not number
```
**Fix**: `const charges = await RTOService.calculateRTOCharges(...)`

#### Test 3: Update Order Status
**Error**: `toHaveBeenCalledWith(...expected)` - not called
**Why**: Test reaches end of triggerRTO but `updateOrderStatus` is a private method called **outside** transaction (line 276). Test completes before this async call.

#### Test 4: Notify Warehouse
**Error**: `toHaveBeenCalled()` - not called
**Why**: `WarehouseNotificationService.notifyRTOIncoming` is mocked but never called because test fails earlier.

#### Test 5: Prevent RTO on Delivered
**Error**: `Cannot call abortTransaction twice`
**Why**: Test spy on `getShipmentInfo` causes validation to fail, calls `session.abortTransaction()`. Then cleanup in finally block calls it again.
**Fix**: Mock session methods to track calls, don't actually execute.

---

## 6. Other Scattered Failures (8 tests) - MINOR (15 min)

### Breakdown:

1. **auth.service.test.ts** (1 failure) - "should find users by role"
   - Likely: User.find() not mocked with role filter

2. **PackingService.test.ts** (1 failure) - "should assign packer to empty station"
   - Likely: Missing test data or station not created

3. **WarehouseNotificationService.test.ts** (2 failures) - WhatsApp notifications
   - Confirmed: WhatsApp service not returning expected response

4. **NDRClassificationService.test.ts** (1 failure) - "keyword matching fallback"
   - OpenAI mock needs to simulate failure to trigger fallback

5. **PickingService.test.ts** (1 failure) - "mark item as short pick"
   - Test data issue: pick list item not found

6. **OrderAnalyticsService.test.ts** (1 failure) - "return daily trends"
   - Order.aggregate() not mocked

7. **NDRResolutionService** additional (1 failure from different test)
   - Covered above in category 2

---

## Summary Table

| Category | Tests | Root Cause | Complexity | Fix |
|----------|-------|------------|------------|-----|
| **NDRActionExecutors** | 12 | Missing service mocks (Email, WhatsApp methods), wrong test expectations | Easy | Add EmailService mock, mock sendNDRNotification, fix test expectations |
| **NDRResolutionService** | 5 | Dynamic import, aggregate returns undefined, action execution chain broken | Medium | Remove dynamic import, fix aggregate mock, mock action executors |
| **InventoryService** | 3 | MongoDB transactions on standalone instance | Medium | Mock mongoose.startSession() |
| **ReportBuilderService** | 7 | 5 analytics services not mocked, ReportConfig not mocked | Hard | Mock 5 analytics services + ReportConfig model |
| **RTOService** | 5 | Multiple unmocked models, async/await issue, transaction double-abort | Hard | Mock Shipment/NDREvent/Order, add await, fix session mock |
| **Others** | 8 | Various: missing data, unmocked services | Easy | Case-by-case fixes |

**Total**: 40 tests, ~80 minutes to fix all systematically.
