# Bulk Order Import Testing Guide

## Overview
This guide covers testing for both **synchronous** (≤1000 rows) and **asynchronous** (>1000 rows) bulk order import features.

---

## Test Files Created

| File | Rows | Purpose |
|------|------|---------|
| `test_bulk_orders_small.csv` | 5 | Test sync import happy path |
| `test_bulk_orders_errors.csv` | 4 | Test validation error handling |
| `test_bulk_orders_large_2000.csv` | 2000 | Test async import with batching |

---

## Prerequisites

### 1. Start Server
```bash
cd /Users/dhirajgiri/Documents/Projects/Helix\ India/Shipcrowd/server
npm run dev
```

### 2. Ensure Database is Running
```bash
# MongoDB should be running
mongosh # Test connection
```

### 3. Ensure Redis is Running
```bash
# Redis needed for BullMQ
redis-cli ping # Should return PONG
```

### 4. Get Auth Token
Login as a seller with:
- Production tier access
- KYC verified
- Complete company profile

Save the JWT token for API requests.

---

## Test Scenarios

### Test 1: Synchronous Import - Happy Path

**File:** `test_bulk_orders_small.csv` (5 rows)

**Expected Result:**
- All 5 orders created successfully
- Response immediate (< 5 seconds)
- Returns created orders with order numbers

**cURL Command:**
```bash
curl -X POST http://localhost:5005/api/v1/orders/bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_bulk_orders_small.csv"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "created": [
      { "orderNumber": "ORD-001", "id": "..." },
      { "orderNumber": "ORD-002", "id": "..." },
      ...
    ],
    "imported": 5,
    "failed": 0
  },
  "message": "Imported 5 orders"
}
```

---

### Test 2: Synchronous Import - With Errors

**File:** `test_bulk_orders_errors.csv` (4 rows, 3 invalid)

**Expected Result:**
- 1 order created successfully
- 3 errors captured with row numbers and reasons
- Response immediate

**cURL Command:**
```bash
curl -X POST http://localhost:5005/api/v1/orders/bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_bulk_orders_errors.csv"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "created": [
      { "orderNumber": "ORD-...", "id": "..." }
    ],
    "errors": [
      { "row": 2, "error": "Invalid phone number" },
      { "row": 3, "error": "Missing fields: [city, state]" },
      { "row": 4, "error": "Invalid postal code" }
    ],
    "imported": 1,
    "failed": 3
  },
  "message": "Imported 1 orders"
}
```

---

### Test 3: Asynchronous Import - Large File

**File:** `test_bulk_orders_large_2000.csv` (2000 rows)

**Expected Result:**
- Job queued immediately (< 2 seconds response)
- Returns jobId for polling
- Processing happens in background (2-3 minutes total)
- 2 batches of 1000 rows each

#### Step 1: Queue Job

**cURL Command:**
```bash
curl -X POST http://localhost:5005/api/v1/orders/bulk/async \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_bulk_orders_large_2000.csv"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "65f1234567890abcdef12345",
    "status": "pending",
    "totalRows": 2000,
    "message": "Bulk import job queued successfully..."
  },
  "message": "Bulk import job queued"
}
```

#### Step 2: Poll Job Status

**cURL Command:**
```bash
curl -X GET "http://localhost:5005/api/v1/orders/bulk/jobs/JOB_ID_FROM_STEP_1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Poll every 3-5 seconds until status is 'completed'**

**Expected Response (Processing):**
```json
{
  "success": true,
  "data": {
    "jobId": "65f1234567890abcdef12345",
    "status": "processing",
    "progress": 45,
    "totalRows": 2000,
    "processedRows": 900,
    "successCount": 895,
    "errorCount": 5,
    "fileName": "test_bulk_orders_large_2000.csv",
    "fileSize": 276480,
    "created": [
      { "orderNumber": "ORD-001", "id": "..." },
      ...
    ],
    "errors": [
      { "row": 42, "error": "Invalid phone number", "data": {...} }
    ],
    "startedAt": "2026-02-14T10:30:00.000Z",
    "metadata": {
      "batchSize": 1000,
      "batchesProcessed": 1,
      "totalBatches": 2
    },
    "createdAt": "2026-02-14T10:29:55.000Z",
    "updatedAt": "2026-02-14T10:30:15.000Z"
  }
}
```

**Expected Response (Completed):**
```json
{
  "success": true,
  "data": {
    "jobId": "65f1234567890abcdef12345",
    "status": "completed",
    "progress": 100,
    "totalRows": 2000,
    "processedRows": 2000,
    "successCount": 2000,
    "errorCount": 0,
    "fileName": "test_bulk_orders_large_2000.csv",
    "completedAt": "2026-02-14T10:32:30.000Z",
    "metadata": {
      "batchSize": 1000,
      "batchesProcessed": 2,
      "totalBatches": 2
    }
  }
}
```

---

### Test 4: Row Limit Validation

**Test:** Try to upload a file with > 1000 rows to sync endpoint

**Expected Result:**
- 400 error with clear message
- No orders created

**cURL Command:**
```bash
curl -X POST http://localhost:5005/api/v1/orders/bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_bulk_orders_large_2000.csv"
```

**Expected Response:**
```json
{
  "success": false,
  "error": {
    "message": "File contains 2000 rows, which exceeds the maximum of 1000. Please split your file into smaller batches.",
    "code": "VAL_INVALID_INPUT"
  }
}
```

---

### Test 5: Excel File Upload

**Create test Excel file:**
```bash
# Convert CSV to Excel
python3 << EOF
import pandas as pd
df = pd.read_csv('test_bulk_orders_small.csv')
df.to_excel('test_bulk_orders_small.xlsx', index=False)
EOF
```

**cURL Command:**
```bash
curl -X POST http://localhost:5005/api/v1/orders/bulk \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_bulk_orders_small.xlsx"
```

**Expected Result:**
- Same as CSV import (5 orders created)
- Excel parsed correctly

---

### Test 6: Stream Error Handling

**Test:** Upload corrupted/malformed CSV

**Create malformed file:**
```bash
echo "invalid,data,without,proper,format" > test_malformed.csv
echo "garbage\x00binary\x01data" >> test_malformed.csv
```

**Expected Result:**
- 400 error: "Failed to parse CSV file"
- No hung requests or unhandled rejections

---

### Test 7: Empty File

**Create empty file:**
```bash
echo "customer_name,customer_phone,city,state,postal_code,product_name,quantity,price" > test_empty.csv
# Header only, no data rows
```

**Expected Result:**
- 400 error: "File contains no data rows"

---

## Monitoring Background Jobs

### Check BullMQ Queue Status

```javascript
// In Node.js REPL or script
const QueueManager = require('./src/infrastructure/utilities/queue-manager').default;

// Get queue stats
const stats = await QueueManager.getQueueStats('bulk-order-import');
console.log(stats);
// Output: { waiting: 0, active: 1, completed: 5, failed: 0, delayed: 0 }
```

### Check MongoDB Job Tracking

```javascript
// In mongosh or Node.js
db.bulk_order_import_jobs.find().sort({ createdAt: -1 }).limit(10);

// Check specific job
db.bulk_order_import_jobs.findOne({ jobId: "JOB_ID" });
```

### Check BullMQ Job Details

```bash
# Using Redis CLI
redis-cli

# List all keys for bulk-order-import queue
KEYS "bull:bulk-order-import:*"

# Get job data
HGETALL "bull:bulk-order-import:JOB_ID"
```

---

## Performance Benchmarks

| Rows | File Size | Sync/Async | Expected Time | Memory Peak |
|------|-----------|------------|---------------|-------------|
| 5 | < 1 KB | Sync | 1-3s | < 50 MB |
| 100 | ~15 KB | Sync | 5-10s | < 100 MB |
| 1000 | ~150 KB | Sync | 15-30s | ~150 MB |
| 2000 | ~270 KB | Async | 1-2 min | ~200 MB |
| 5000 | ~700 KB | Async | 2-4 min | ~300 MB |
| 10000 | ~1.4 MB | Async | 4-8 min | ~400 MB |

---

## Troubleshooting

### Issue: Job Stuck in "pending"

**Check:**
1. Is Redis running? `redis-cli ping`
2. Is worker initialized? Check server logs for "Bulk order import job initialized"
3. Are there errors in BullMQ? `redis-cli KEYS "bull:bulk-order-import:failed"`

**Solution:**
```bash
# Restart server to re-initialize workers
npm run dev
```

### Issue: Job Failed

**Check job failure logs:**
```javascript
db.job_failure_logs.find({ queueName: "bulk-order-import" }).sort({ failedAt: -1 });
```

### Issue: High Memory Usage

**Expected Behavior:**
- Each batch loads ~1000 rows in memory
- Memory released after each batch
- Peak memory: ~1.5x file size

**If memory grows indefinitely:**
- Check for memory leaks in OrderService
- Reduce BATCH_SIZE in BulkOrderImportJobProcessor (currently 1000)

---

## Success Criteria

✅ **Sync Import (≤1000 rows):**
- Response time < 30 seconds
- All valid rows imported
- All invalid rows reported with specific errors
- Transaction atomicity maintained

✅ **Async Import (>1000 rows):**
- Job queued in < 2 seconds
- Progress updates every batch
- All rows processed in batches
- Final status accurately reflects results
- Database correctly updated

✅ **Error Handling:**
- No unhandled promise rejections
- No request timeouts
- Clear error messages for all failure modes
- Graceful handling of malformed files

✅ **Monitoring:**
- Job status queryable at any time
- BullMQ metrics accurate
- MongoDB job tracking in sync with BullMQ

---

## Next Steps

1. **Run all 7 test scenarios** documented above
2. **Monitor server logs** for errors/warnings
3. **Check database** after each test for correct data
4. **Verify BullMQ queues** are processing correctly
5. **Test concurrent imports** (upload multiple files simultaneously)
6. **Load test** with 20,000+ row file

---

## Additional Test Scenarios (Optional)

### Test 8: Concurrent Imports
Upload 3 files simultaneously to test worker concurrency (limit: 2)

### Test 9: Job Cancellation
Implement and test job cancellation endpoint

### Test 10: Retry on Failure
Simulate MongoDB connection failure during processing, verify automatic retry

### Test 11: Progress Accuracy
Monitor progress updates, verify they match actual processing

### Test 12: Memory Leak Test
Run 10 consecutive large imports, monitor memory usage

---

## Contacts

For issues or questions:
- Check server logs: `tail -f logs/combined.log`
- Check worker logs: `tail -f logs/workers.log`
- MongoDB logs: `tail -f /usr/local/var/log/mongodb/mongo.log`
