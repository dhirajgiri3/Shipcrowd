# Test Failure Root Cause Analysis

**Date**: January 3, 2026  
**Total Failing**: 40 tests across 10 suites

---

## Root Cause Categories

### 1. **Service Method Returns `success: false` (12 tests)**

**Suite**: `NDRActionExecutors.test.ts` (12 failures)

**Root Cause**: Mock services not properly configured
- `executeCallCustomer` - Exotel service mock not set up
- `executeSendWhatsApp` - WhatsApp service mock missing
- `executeSendEmail` - Email service mock not configured
- `executeUpdateAddress` - Magic link generation not mocked

**Why**: The test mocks external service calls (Exotel, WhatsApp, SendGrid), but the service methods are checking for actual responses. The mocks need to return proper success responses.

**Example Error**:
```
Expected: true
Received: false
```

**Fix**: Mock ExotelService, WhatsAppService, and EmailService to return `{ success: true }` responses.

---

### 2. **Dynamic Import Not Supported in Jest (5 tests)**

**Suite**: `RTOService.test.ts` (5 failures)

**Root Cause**: Service uses `await import('mongoose')` which requires `--experimental-vm-modules`

**Why**: The RTOService has this code:
```typescript
const mongoose = await import('mongoose');
```

Jest doesn't support dynamic imports by default - it needs special configuration.

**Error**:
```
TypeError: A dynamic import callback was invoked without --experimental-vm-modules
```

**Fix Options**:
1. Change service to use static import: `import mongoose from 'mongoose'`
2. Add `--experimental-vm-modules` to Jest config (not recommended)
3. Mock the dynamic import in tests

**Recommended**: Remove dynamic import from service code - it's unnecessary since mongoose is already imported elsewhere.

---

### 3. **MongoDB Transactions Not Supported in Test Environment (3 tests)**

**Suite**: `InventoryService.test.ts` (3 failures)

**Root Cause**: Mongoose transactions require replica set, but tests run on standalone MongoDB Memory Server

**Why**: The service uses:
```typescript
const session = await mongoose.startSession();
session.startTransaction();
```

MongoDB transactions **only work on replica sets**, not standalone instances.

**Error**:
```
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
```

**Fix Options**:
1. Mock mongoose.startSession() in tests
2. Configure MongoDB Memory Server as a replica set
3. Skip transaction in test environment

**Recommended**: Mock `mongoose.startSession()` to return a fake session object.

---

### 4. **Aggregate Mock Returns Undefined (2 tests)**

**Suite**: `NDRResolutionService.test.ts` (2 failures)  
**Suite**: `RTOService.test.ts` (1 failure)

**Root Cause**: `NDREvent.aggregate()` mock returns `undefined` instead of array

**Why**: Service code expects:
```typescript
const expiredNDRsWithData = await NDREvent.aggregate([...]);
if (expiredNDRsWithData.length === 0) { // Error: cannot read .length of undefined
```

**Error**:
```
TypeError: Cannot read properties of undefined (reading 'length')
```

**Fix**: Ensure aggregate mock returns empty array `[]` by default:
```typescript
aggregate: jest.fn().mockResolvedValue([])
```

---

### 5. **Missing Populate Chain (3 tests)**

**Suite**: `NDRResolutionService.test.ts` (3 remaining failures)

**Root Cause**: `findById()` mock doesn't return chainable `populate()` method in all test cases

**Why**: Some test cases override the mock incorrectly.

**Error**:
```
TypeError: models_1.NDREvent.findById(...).populate is not a function
```

**Fix**: Ensure all test mocks use:
```typescript
(NDREvent.findById as jest.Mock).mockReturnValue({
    populate: jest.fn().mockResolvedValue(mockData)
});
```

---

### 6. **Case Sensitivity Mismatch (1 test)**

**Suite**: `InventoryService.test.ts` (1 failure)

**Root Cause**: SKU converted to uppercase by service but test expects original case

**Why**: Service has:
```typescript
sku: sku.toUpperCase() // Converts to uppercase
```

**Error**:
```
Expected: "TEST-oeb14"
Received: "TEST-OEB14"
```

**Fix**: Update test expectation to match uppercase SKU.

---

### 7. **Report Builder Missing Model Mocks (7 tests)**

**Suite**: `ReportBuilderService.test.ts` (7 failures)

**Root Cause**: Model aggregation pipelines not mocked

**Why**: Service builds reports using `Order.aggregate()`, `Shipment.aggregate()`, etc. but these aren't mocked in tests.

**Fix**: Mock Order, Shipment, Revenue, Customer, and Inventory model aggregations to return sample data.

---

### 8. **Other Issues (4 tests)**

**Suites**: Various (auth, packing, warehouse notifications)

**Root Causes**:
- Missing mock data setup
- WhatsApp notification service not mocked
- Database records not created before queries

---

## Summary by Impact

| Category | Tests | Complexity | Fix Time |
|----------|-------|------------|----------|
| Missing Service Mocks | 12 | Medium | 20 min |
| Dynamic Import Issue | 5 | Low | 5 min |
| Transaction Mock | 3 | Medium | 10 min |
| Aggregate Returns | 3 | Low | 5 min |
| Populate Chain | 3 | Low | 5 min |
| Report Mocks | 7 | High | 30 min |
| Other | 7 | Low-Medium | 15 min |

**Total Estimated Fix Time**: ~90 minutes for all 40 tests

---

## Recommended Fix Order (Quick Wins First)

1. ✅ **Dynamic Import** (5 tests, 5 mins) - Change to static import
2. ✅ **Aggregate/Case Issues** (4 tests, 10 mins) - Simple mock fixes
3. ✅ **Populate Chain** (3 tests, 5 mins) - Mock chain updates
4. ✅ **Transaction Mocks** (3 tests, 10 mins) - Mock startSession
5. ⏳ **Service Mocks** (12 tests, 20 mins) - Mock WhatsApp/Email/Exotel
6. ⏳ **Report Builder** (7 tests, 30 mins) - Complex aggregation mocks
7. ⏳ **Other Issues** (6 tests, 15 mins) - Various fixes

Total: ~95 minutes to achieve **287/287 tests passing (100%)**
