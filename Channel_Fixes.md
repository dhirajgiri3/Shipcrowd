# Fix E-Commerce Channel Store Details Pages - Implementation Plan

## Context

The store details pages across all 4 e-commerce integration channels (Shopify, WooCommerce, Amazon, Flipkart) have critical data display issues that the user wants fixed:

**Primary Issues:**
1. **Sync History Not Showing:** Pages show "No activity yet" despite sync logs existing in the database
2. **Incorrect Order Count:** Shows "1 Synced to Shipcrowd" when 2 Shopify orders actually exist
3. **Database Fix Pending:** Order #1002 needs status, payment, and currency updates

**Root Causes Identified:**
- `totalOrdersSynced` stat only increments for NEW orders in each sync, not total orders in system
- Backend calculates stats from sync increments instead of querying actual Order collection
- Sync history may have API/frontend data structure mismatches
- Stats object may not be properly populated or validated

**User Requirements:**
- "Go broad, wide, and deep" to find all issues
- Fix sync history display
- Fix order count accuracy
- Apply fixes to all 4 channels consistently

---

## Investigation Findings

### Issue #1: Sync History Not Displaying

**Frontend Flow:**
```
Page Component (e.g., shopify/[storeId]/page.tsx)
    ↓
useSyncLogs(storeId, 'SHOPIFY')
    ↓
GET /integrations/shopify/stores/{storeId}/sync/logs
    ↓
IntegrationSyncActivity.tsx renders logs
```

**Component Logic (IntegrationSyncActivity.tsx, Line 68):**
```typescript
{isLoading ? (
    <LoadingState />
) : logs && logs.length > 0 ? (
    <DisplayLogs />
) : (
    <NoActivityYet />  // Shows when logs is undefined or []
)}
```

**Potential Root Causes:**
1. API returns empty array despite sync logs existing
2. API returns logs in unexpected format (e.g., `{ data: { logs: [...] } }` vs `{ logs: [...] }`)
3. Hook doesn't properly transform response
4. Database query filters out logs (e.g., by status or date range)

**Backend Endpoint (shopify.controller.ts, Lines 205-237):**
```typescript
async getSyncLogs(req, res) {
    const syncLogs = await SyncLog.find({ storeId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    res.json({
        success: true,
        data: {
            logs: syncLogs,
            pagination: { ... }
        }
    });
}
```

**Response Shape:** `{ success: true, data: { logs: [...], pagination: {...} } }`

**Hook Transform (useEcommerceIntegrations.ts, Lines 215-235):**
```typescript
export const useSyncLogs = (integrationId, type) => {
    return useQuery({
        queryKey: ['integrationSyncLogs', integrationId, type],
        queryFn: async () => {
            const response = await ecommerceIntegrationsApi.getSyncLogs(integrationId, type);
            return response.data.logs;  // Returns logs array directly
        }
    });
};
```

**Verdict:** Hook properly extracts `logs` array. Issue likely in database query not returning results.

---

### Issue #2: Order Count Incorrect

**Stats Display (IntegrationStatsGrid.tsx, Line 31):**
```typescript
<StatsCard
    title="Total Orders"
    value={store.stats?.totalOrdersSynced ?? 0}
    description="Synced to Shipcrowd"
/>
```

**How `totalOrdersSynced` is Calculated:**

**1. Schema (shopify-store.model.ts, Lines 86-95):**
```typescript
stats: {
    totalOrdersSynced: { type: Number, default: 0 },
    totalProductsSynced: { type: Number, default: 0 },
    lastSyncAt: Date
}

// Method to increment stats
incrementSyncStats(type: 'order' | 'product', count: number) {
    if (type === 'order') {
        this.stats.totalOrdersSynced += count;
    }
    await this.save();
}
```

**2. Order Sync Service (shopify-order-sync.service.ts, Lines 176-212):**
```typescript
// During sync
for (const shopifyOrder of orders) {
    result.itemsProcessed++;

    const syncedOrder = await this.syncSingleOrder(shopifyOrder, store);

    if (syncedOrder) {
        result.itemsSynced++;  // Only counts NEW syncs
    } else {
        result.itemsSkipped++;  // Skips existing orders
    }
}

// After sync completes
await store.incrementSyncStats('order', result.itemsSynced);
```

**3. syncSingleOrder Logic:**
```typescript
async syncSingleOrder(shopifyOrder, store) {
    const existingOrder = await Order.findOne({
        orderNumber: shopifyOrder.order_number,
        companyId: store.companyId
    });

    if (existingOrder) {
        // Updates existing order
        await this.updateExistingOrder(existingOrder, shopifyOrder);
        return null;  // Doesn't count as "synced"
    }

    // Creates new order
    const newOrder = await Order.create(...);
    return newOrder;  // Counts as "synced"
}
```

**Root Cause:**
- `totalOrdersSynced` only counts orders created during syncs, not updated orders
- If 2 orders exist but both were created in previous syncs, current sync returns `itemsSynced = 0`
- If 1 order was updated and 1 order was created, only the created one increments the counter
- **The stat should show TOTAL orders in system, not incremental syncs**

**Correct Approach:**
Query actual Order collection to count orders from this integration:
```typescript
const totalOrders = await Order.countDocuments({
    source: 'SHOPIFY',
    'integrationMetadata.shopifyStoreId': storeId,
    companyId: store.companyId
});
```

---

## Implementation Plan

### Step 1: Fix Database - Update Order #1002
**File:** MongoDB database (via Node.js script)

**Task:** Update order #1002 with correct status, payment, and currency:
- `currentStatus`: 'cancelled'
- `paymentStatus`: 'refunded'
- `currency`: 'USD'

**Script:**
```javascript
const mongoose = require('mongoose');
await mongoose.connect(process.env.MONGODB_URI);
const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
await Order.updateOne(
    { orderNumber: '1002' },
    { $set: { currentStatus: 'cancelled', paymentStatus: 'refunded', currency: 'USD' } }
);
```

---

### Step 2: Fix Backend - Calculate Total Orders from Order Collection

**Files to Modify:**

**2A. Shopify Controller (shopify.controller.ts)**
- Location: Lines 162-194 (`getStore` method)
- Current: Returns `store.stats.totalOrdersSynced`
- Fix: Query Order collection for actual count

**Changes:**
```typescript
async getStore(req, res) {
    const store = await ShopifyStore.findById(id);

    // Calculate actual order count from Order collection
    const totalOrdersSynced = await Order.countDocuments({
        source: 'SHOPIFY',
        'integrationMetadata.shopifyStoreId': id,
        companyId: req.user.companyId
    });

    // Update store stats with actual count
    const storeData = store.toObject();
    storeData.stats = {
        ...storeData.stats,
        totalOrdersSynced
    };

    return res.json({
        success: true,
        data: { store: toEcommerceStoreDTO(storeData), recentLogs }
    });
}
```

**2B. Apply Same Fix to WooCommerce Controller**
- File: `server/src/presentation/http/controllers/integrations/woocommerce.controller.ts`
- Query: `{ source: 'WOOCOMMERCE', 'integrationMetadata.woocommerceStoreId': id }`

**2C. Apply Same Fix to Amazon Controller**
- File: `server/src/presentation/http/controllers/integrations/amazon.controller.ts`
- Query: `{ source: 'AMAZON', 'integrationMetadata.amazonStoreId': id }`

**2D. Apply Same Fix to Flipkart Controller**
- File: `server/src/presentation/http/controllers/integrations/flipkart.controller.ts`
- Query: `{ source: 'FLIPKART', 'integrationMetadata.flipkartStoreId': id }`

---

### Step 3: Fix Backend - Verify Sync Logs Query

**All 4 Controllers - getSyncLogs Method**

**Current Query:**
```typescript
const syncLogs = await SyncLog.find({ storeId: id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
```

**Verify:**
1. `storeId` field matches the ID passed in request
2. No additional filters that might exclude logs
3. Response format matches frontend expectations

**If logs exist but aren't returned, add debug logging:**
```typescript
const allLogs = await SyncLog.find({ storeId: id });
console.log(`Found ${allLogs.length} sync logs for store ${id}`);
```

---

### Step 4: Frontend - Add Error Handling to Sync Activity Component

**File:** `client/app/seller/integrations/components/IntegrationSyncActivity.tsx`

**Current Issue:** No distinction between "never synced" vs "API error"

**Fix (Lines 68-160):**
```typescript
{isLoading ? (
    <LoadingState />
) : error ? (
    <ErrorState error={error} />
) : logs && logs.length > 0 ? (
    <DisplayLogs />
) : (
    <NoActivityYet />
)}
```

**Add Error State Component:**
```typescript
const ErrorState = ({ error }) => (
    <div className="text-center py-16 px-6">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-3" />
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
            Failed to load sync history
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
            {error?.message || 'An error occurred'}
        </p>
    </div>
);
```

---

### Step 5: Frontend - Add Debug Logging to Hook

**File:** `client/src/core/api/hooks/integrations/useEcommerceIntegrations.ts`

**Add Debug Logging (Lines 215-235):**
```typescript
export const useSyncLogs = (integrationId, type) => {
    return useQuery({
        queryKey: ['integrationSyncLogs', integrationId, type],
        queryFn: async () => {
            const response = await ecommerceIntegrationsApi.getSyncLogs(integrationId, type);
            console.log(`[useSyncLogs] Fetched ${response.data.logs?.length || 0} logs for ${type} store ${integrationId}`);
            return response.data.logs;
        },
        enabled: !!integrationId
    });
};
```

---

## Files to Modify

### Backend Files:
1. `server/src/presentation/http/controllers/integrations/shopify.controller.ts` - Fix order count calculation in `getStore()`
2. `server/src/presentation/http/controllers/integrations/woocommerce.controller.ts` - Same fix
3. `server/src/presentation/http/controllers/integrations/amazon.controller.ts` - Same fix
4. `server/src/presentation/http/controllers/integrations/flipkart.controller.ts` - Same fix

### Frontend Files:
5. `client/app/seller/integrations/components/IntegrationSyncActivity.tsx` - Add error state handling
6. `client/src/core/api/hooks/integrations/useEcommerceIntegrations.ts` - Add debug logging (optional)

### Database:
7. MongoDB - Update order #1002 via Node.js script

---

## Critical Code Locations

**Order Model Import:**
- All controllers need: `import { Order } from '@/infrastructure/database/mongoose/models/orders/core/order.model';`

**Integration Metadata Field Names:**
- Shopify: `integrationMetadata.shopifyStoreId`
- WooCommerce: `integrationMetadata.woocommerceStoreId`
- Amazon: `integrationMetadata.amazonStoreId`
- Flipkart: `integrationMetadata.flipkartStoreId`

**Source Enum Values:**
- `'SHOPIFY'`, `'WOOCOMMERCE'`, `'AMAZON'`, `'FLIPKART'`

---

## Verification Steps

### 1. Database Fix Verification
```bash
cd server
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const order = await Order.findOne({ orderNumber: '1002' });
    console.log({
        orderNumber: order.orderNumber,
        status: order.currentStatus,
        payment: order.paymentStatus,
        currency: order.currency,
        total: order.totals?.total
    });
    process.exit(0);
});
"
```

**Expected Output:**
```json
{
  "orderNumber": "1002",
  "status": "cancelled",
  "payment": "refunded",
  "currency": "USD",
  "total": 2629.95
}
```

### 2. Backend API Verification

**Test Shopify Store Endpoint:**
```bash
curl http://localhost:5005/api/v1/integrations/shopify/stores/{storeId} \
  -H "Authorization: Bearer {token}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "store": {
      "stats": {
        "totalOrdersSynced": 2  // Should match actual order count
      }
    }
  }
}
```

**Test Sync Logs Endpoint:**
```bash
curl http://localhost:5005/api/v1/integrations/shopify/stores/{storeId}/sync/logs \
  -H "Authorization: Bearer {token}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "...",
        "status": "SUCCESS",
        "ordersProcessed": 2
      }
    ]
  }
}
```

### 3. Frontend Manual Testing

1. Navigate to `/seller/integrations/shopify/{storeId}`
2. Verify "Total Orders: 2 Synced to Shipcrowd" (not 1)
3. Verify "Recent Sync Activity" shows sync history (not "No activity yet")
4. Verify "Last Sync" shows correct timestamp
5. Repeat for WooCommerce, Amazon, Flipkart stores

### 4. TypeScript Compilation
```bash
cd server && npx tsc --noEmit
cd ../client && npx tsc --noEmit
```

### 5. Console Log Verification

Open browser DevTools → Console when on store details page:
```
[useSyncLogs] Fetched 1 logs for SHOPIFY store 67b...
```

Should show number of logs fetched.

---

## Edge Cases to Handle

1. **Store with 0 orders:** Should show "0 Synced to Shipcrowd"
2. **Store never synced:** Should show "No activity yet" (correct behavior)
3. **Store with failed syncs:** Should show failed status in sync activity
4. **Multiple companies:** Order count query must filter by `companyId` to prevent cross-tenant data leakage

---

## Performance Considerations

**Order Count Query Optimization:**
- Query uses indexed fields: `source`, `companyId`
- `countDocuments()` is optimized for counting without loading full documents
- Should execute in <50ms for typical order volumes

**Potential Improvement:**
- Cache order count with 30-second TTL to reduce DB queries
- Update cache on order creation/deletion webhooks

---

## Security Notes

**Critical:** Order count query MUST include `companyId` filter:
```typescript
await Order.countDocuments({
    source: 'SHOPIFY',
    'integrationMetadata.shopifyStoreId': id,
    companyId: req.user.companyId  // REQUIRED - prevents data leakage
});
```

Without `companyId` filter, users could see order counts from other companies' stores.
