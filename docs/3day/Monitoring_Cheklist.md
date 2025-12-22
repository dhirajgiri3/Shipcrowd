# Monitoring & Testing Checklist: 3-Day Execution

## Daily Monitoring (All Days)

### Morning Standup (9:00 AM IST)
- [ ] Check all agent statuses: `node agent-status.js --all`
- [ ] Verify backend server running: `curl http://localhost:5005/api/v1/health`
- [ ] Verify frontend server running: `curl http://localhost:3000`
- [ ] Check MongoDB connection: `mongosh --eval "db.adminCommand('ping')"`
- [ ] Review Redis queue depth: `redis-cli llen agent:backend:tasks`
- [ ] Check Git branch cleanliness: `git status` on all repos

### Hourly Health Checks (Every Hour)
- [ ] Backend API response time: `npm run test:perf --endpoint /orders` (< 500ms)
- [ ] Frontend page load time: `lighthouse http://localhost:3000/seller` (< 2s)
- [ ] Database size growth: `db.stats().dataSize` (monitor for unexpected spikes)
- [ ] Error rate: Check logs for error count (< 5% threshold)
- [ ] Agent progress: Verify at least 1 task completed per hour

### End-of-Day (6:00 PM IST)
- [ ] Run phase verification: `node verify-phase.js --agent <agent-id> --phase <phase>`
- [ ] Commit all work: `git commit -m "feat: day <X> complete"`
- [ ] Merge to main: `git merge feature/<branch> --no-ff`
- [ ] Create database snapshot: `mongodump --out ./backups/day<X>-backup`
- [ ] Document blockers or risks for next day
- [ ] Update project dashboard: Task completion percentage

---

## Day 1 Testing Checklist

### Backend Agent Tests (6:00 PM Day 1)

#### T1.1 - Order Controller Tests
- [ ] **POST /api/v1/orders** - Create order
  - [ ] Valid request returns 201 Created
  - [ ] Auto-generates orderNumber: ORD-YYYYMMDD-XXXX
  - [ ] Validates required fields (customer, items, address)
  - [ ] Rejects unauthorized requests (401)
  - [ ] Applies company-scoped filtering (user can't create orders for other companies)

- [ ] **GET /api/v1/orders** - List orders with pagination
  - [ ] Returns 200 OK with array of orders
  - [ ] Default pagination: 20 items per page
  - [ ] Supports filters: status, date range, customer phone, warehouse
  - [ ] Company-scoped results (user sees only their company's orders)

- [ ] **GET /api/v1/orders/:orderId** - Single order details
  - [ ] Returns 200 OK with order details
  - [ ] Populates customer and items
  - [ ] Returns 404 for non-existent orderId
  - [ ] Returns 403 for cross-company access attempt

- [ ] **PATCH /api/v1/orders/:orderId** - Update order
  - [ ] Updates allowed fields (status, notes)
  - [ ] Returns 200 OK with updated order
  - [ ] Prevents updating orderId or companyId
  - [ ] Validates status transitions (pending → ready_to_ship → shipped)

- [ ] **DELETE /api/v1/orders/:orderId** - Soft delete
  - [ ] Sets deletedAt timestamp
  - [ ] Returns 200 OK
  - [ ] Order no longer appears in GET list
  - [ ] Can be restored (if restore endpoint exists)

- [ ] **POST /api/v1/orders/bulk** - CSV import
  - [ ] Accepts CSV with 10+ orders
  - [ ] Validates all rows before importing
  - [ ] Returns 201 Created with created order IDs
  - [ ] Handles errors gracefully (partial success handling)

#### T1.2 - Shipment Controller Tests
- [ ] **POST /api/v1/shipments** - Create shipment from order
  - [ ] Auto-generates trackingNumber: SHP-YYYYMMDD-XXXX
  - [ ] Links to orderId (populates customer/address)
  - [ ] Runs intelligent carrier selection algorithm
  - [ ] Returns 201 Created with selected carrier and rate
  - [ ] Updates order status to "shipped"

- [ ] **GET /api/v1/shipments** - List shipments with filters
  - [ ] Returns 200 OK with array of shipments
  - [ ] Supports filters: status, carrier, destination pincode
  - [ ] Company-scoped results
  - [ ] Pagination working

- [ ] **GET /api/v1/shipments/tracking/:trackingNumber** - Track by AWB
  - [ ] Returns 200 OK with tracking timeline
  - [ ] Shows status history with timestamps
  - [ ] Returns 404 for invalid AWB

- [ ] **PATCH /api/v1/shipments/:shipmentId/status** - Update status
  - [ ] Updates status (picked → in_transit → delivered)
  - [ ] Adds timestamp to status history
  - [ ] Returns 200 OK with updated shipment

#### T1.4 - Analytics Endpoint Tests
- [ ] **GET /api/v1/analytics/dashboard/seller** - Seller stats
  - [ ] Returns 200 OK with order counts by status
  - [ ] Calculates success rate (delivered / total)
  - [ ] Shows COD collection amounts
  - [ ] Company-scoped analytics

- [ ] **GET /api/v1/analytics/dashboard/admin** - Admin stats
  - [ ] Returns 200 OK with multi-company aggregation
  - [ ] Shows total shipments across all companies
  - [ ] Calculates global success rate
  - [ ] Only accessible by admin role (403 for sellers)

#### T1.5 - RateCard Controller Tests
- [ ] **POST /api/v1/ratecards** - Create rate card
  - [ ] Validates weight-based pricing rules
  - [ ] Validates zone-based pricing (5 zones)
  - [ ] Returns 201 Created

- [ ] **POST /api/v1/ratecards/calculate** - Calculate rate
  - [ ] Returns rate for given weight + zone
  - [ ] Handles edge cases (0kg, 100kg, invalid zone)

#### Performance Benchmarks (Day 1 End)
- [ ] All endpoints respond < 500ms (empty database)
- [ ] Postman collection: 100% pass rate (35/35 tests)
- [ ] No console errors or warnings
- [ ] No memory leaks (monitor for 10 minutes)

---

## Day 2 Testing Checklist

### Frontend Agent Tests (6:00 PM Day 2)

#### T2.5 - Seller Dashboard Tests
- [ ] **Page Load**
  - [ ] Loads without errors (< 2s)
  - [ ] Displays loading skeleton initially
  - [ ] Fetches analytics data from API
  - [ ] Shows correct stats: total orders, pending, delivered
  - [ ] Shows recent shipments widget (last 3)

- [ ] **Real-Time Updates**
  - [ ] Refreshes data on mount
  - [ ] Auto-refreshes every 30 seconds (if implemented)
  - [ ] Shows toast notification on data update

#### T2.6 - Orders Page Tests
- [ ] **List View**
  - [ ] Fetches orders from API
  - [ ] Displays pagination controls
  - [ ] Default: 20 orders per page
  - [ ] Shows loading state while fetching

- [ ] **Filters**
  - [ ] Filter by status dropdown works
  - [ ] Filter by date range works
  - [ ] Search by customer phone works
  - [ ] Filters update URL query params

- [ ] **Create Order**
  - [ ] Opens modal on "Create Order" button
  - [ ] Form validation works (required fields highlighted)
  - [ ] Submits to POST /api/v1/orders
  - [ ] Shows success toast on creation
  - [ ] Automatically refreshes order list
  - [ ] Closes modal on success

- [ ] **Bulk Actions**
  - [ ] Checkboxes select multiple orders
  - [ ] "Bulk Ship" button enabled when > 0 selected
  - [ ] Bulk action confirmation dialog appears
  - [ ] Shows progress indicator during bulk operation

#### T2.7 - Shipments Page Tests
- [ ] **List View**
  - [ ] Fetches shipments from API
  - [ ] Displays AWB, status, carrier, destination
  - [ ] Empty state message when no shipments

- [ ] **Quick Track**
  - [ ] AWB input field accepts SHP-YYYYMMDD-XXXX format
  - [ ] Submits to GET /api/v1/shipments/tracking/:trackingNumber
  - [ ] Displays tracking timeline
  - [ ] Shows error for invalid AWB

- [ ] **Status Update**
  - [ ] Status dropdown per shipment
  - [ ] Updates to PATCH /api/v1/shipments/:id/status
  - [ ] Shows loading indicator
  - [ ] Success toast on update
  - [ ] Timeline updates immediately

- [ ] **Print Label**
  - [ ] "Print Label" button per shipment
  - [ ] Generates PDF with jsPDF
  - [ ] Includes: AWB, order number, customer details, address
  - [ ] Barcode visible (simple format)
  - [ ] Downloads automatically

#### T2.8 - Warehouse Page Tests
- [ ] Fetches warehouses from API
- [ ] "Create Warehouse" form works
- [ ] "Set Default" toggle works
- [ ] Update/delete operations work

#### T2.9 - Rate Cards Page Tests
- [ ] Lists active rate cards
- [ ] Shows base rates per zone
- [ ] "Calculate Rate" preview works (weight + zone input)

#### T2.10 - Admin Dashboard Tests
- [ ] Admin-only access (seller gets 403)
- [ ] Shows multi-company list
- [ ] Aggregated analytics visible
- [ ] Company details clickable

#### Integration Tests (Day 2 End)
- [ ] **Smoke Test Flow**
  - [ ] Login → Dashboard → Orders → Shipments (no errors)
  - [ ] Create order → Create shipment → Track (full flow works)
  - [ ] All pages load < 2s
  - [ ] Zero console errors in production build

---

## Day 3 Testing Checklist

### Seed Agent Tests (12:30 PM Day 3)

#### T3.1 - Core Entities Seed Verification
- [ ] **Companies**
  - [ ] 5 companies created
  - [ ] Company names: StyleHub Fashion, TrendWear Co, ChicCraft Apparel, etc.
  - [ ] Each company has tier (Starter, Growth, Enterprise)
  - [ ] Each company has KYC status: verified

- [ ] **Users**
  - [ ] 5 demo users created
  - [ ] Email: demo@shipcrowd.com (password: Demo@2024)
  - [ ] Email: admin@shipcrowd.com (password: Admin@2024)
  - [ ] Users linked to correct companies

- [ ] **Warehouses**
  - [ ] 10 warehouses created (2-3 per company)
  - [ ] Cities: Delhi, Mumbai, Bangalore
  - [ ] Each warehouse has address, pincode

#### T3.2 - Orders Seed Verification
- [ ] **Total Count**
  - [ ] 200 orders created
  - [ ] Distribution: 30 pending, 60 delivered, 40 shipped, 10 cancelled, 15 RTO

- [ ] **Fashion Products**
  - [ ] Orders contain T-shirts (₹299-799, 0.3-0.5kg)
  - [ ] Orders contain Jeans (₹999-2499, 0.6-0.8kg)
  - [ ] Orders contain Dresses (₹799-2999, 0.4-0.7kg)
  - [ ] Orders contain Shoes (₹1499-4999, 0.8-1.2kg)
  - [ ] Orders contain Accessories (₹499-1999, 0.2-0.5kg)

- [ ] **Data Quality**
  - [ ] All orders have valid customer phone numbers
  - [ ] All orders have delivery addresses with pincodes
  - [ ] Order dates distributed over last 30 days
  - [ ] Order totals calculated correctly (sum of items + shipping)

#### T3.3 - Shipments Seed Verification
- [ ] **Total Count**
  - [ ] 120 shipments created (linked to shipped/delivered orders)

- [ ] **Carrier Distribution**
  - [ ] Delhivery: ~48 shipments (40%)
  - [ ] DTDC: ~42 shipments (35%)
  - [ ] Xpressbees: ~30 shipments (25%)

- [ ] **Tracking Timelines**
  - [ ] Each shipment has status history
  - [ ] Timestamps realistic (created → picked → in_transit → delivered)
  - [ ] 5-8 NDR cases exist

- [ ] **Data Integrity**
  - [ ] No orphaned shipments (all have orderId)
  - [ ] No duplicate AWB numbers
  - [ ] Shipment weights match order weights

#### T3.4 - Zones & Rate Cards Verification
- [ ] 4 zones created (Local, Zonal, Metro, ROI)
- [ ] 3 rate cards created (Light, Medium, Heavy categories)
- [ ] Rate cards have pricing per zone

### QA Agent Tests (4:30 PM Day 3)

#### T3.5 - Integration Testing (Critical Flows)

**Flow 1: Order to Shipment (20 mins)**
- [ ] **Login**
  - [ ] Login as demo@shipcrowd.com succeeds
  - [ ] Redirects to /seller dashboard

- [ ] **View Pending Orders**
  - [ ] Navigate to /seller/orders
  - [ ] Filter by status: "Pending"
  - [ ] 30 pending orders visible

- [ ] **Create Shipment from Order**
  - [ ] Select order ID: ORD-20250122-0001
  - [ ] Click "Create Shipment"
  - [ ] Intelligent carrier selection displays 3 options
  - [ ] Delhivery auto-selected (lowest score)
  - [ ] Click "Generate Shipment"
  - [ ] AWB generated: SHP-20250122-XXXX format

- [ ] **Track by AWB**
  - [ ] Navigate to /seller/shipments
  - [ ] Enter AWB in Quick Track widget
  - [ ] Tracking timeline displays 4 stages
  - [ ] Current status: "Out for Delivery"

- [ ] **Update Status**
  - [ ] Change status dropdown to "Delivered"
  - [ ] Click "Update"
  - [ ] Success toast appears
  - [ ] Timeline updates with new status + timestamp

- [ ] **Verify Order Status Updated**
  - [ ] Navigate back to /seller/orders
  - [ ] Find order ORD-20250122-0001
  - [ ] Status now shows "Delivered"

**Flow 2: Bulk Processing (20 mins)**
- [ ] **Import Orders from CSV**
  - [ ] Navigate to /seller/orders
  - [ ] Click "Import CSV"
  - [ ] Upload CSV with 10 orders
  - [ ] Shows progress bar (10 orders processing)
  - [ ] Success toast: "10 orders imported"

- [ ] **Select Multiple Orders**
  - [ ] Check "Select All" checkbox
  - [ ] Bulk actions toolbar appears
  - [ ] Shows count: "10 orders selected"

- [ ] **Bulk Create Shipments**
  - [ ] Click "Bulk Ship Selected"
  - [ ] Confirmation dialog appears
  - [ ] Click "Confirm"
  - [ ] Progress modal shows: "Creating shipments... 3/10"
  - [ ] Success toast: "10 shipments created"

- [ ] **Generate Manifest**
  - [ ] Click "Generate Manifest"
  - [ ] PDF downloads automatically
  - [ ] PDF contains 10 shipments with AWBs

- [ ] **Verify Creation**
  - [ ] Navigate to /seller/shipments
  - [ ] 10 new shipments visible (created today)
  - [ ] All AWBs unique

**Flow 3: Analytics (20 mins)**
- [ ] **View Seller Dashboard**
  - [ ] Navigate to /seller
  - [ ] Stats widget displays:
    - [ ] Total Orders: 200
    - [ ] Pending Orders: 30
    - [ ] Delivered Orders: 60

- [ ] **Check Stats Accuracy**
  - [ ] Calculate success rate: 60 delivered / (60+40 shipped+15 RTO) = 96.4%
  - [ ] Dashboard shows: 96.4% ✓
  - [ ] COD pending: calculated correctly

- [ ] **Filter by Date Range**
  - [ ] Click "Last 7 Days" filter
  - [ ] Dashboard updates to show only last 7 days data
  - [ ] Order count decreases (20-30 orders)

- [ ] **Export CSV**
  - [ ] Click "Export CSV"
  - [ ] CSV downloads with filtered data
  - [ ] Open CSV: record count matches dashboard count

- [ ] **Verify Calculations**
  - [ ] Sum order totals in CSV
  - [ ] Compare to dashboard "Total Revenue"
  - [ ] Values match ✓

#### T3.8 - Final QA (Cross-Browser, Performance, Data Integrity)

**Cross-Browser Testing**
- [ ] **Chrome 120**
  - [ ] All pages load correctly
  - [ ] Forms submit without errors
  - [ ] CSS/layout correct
  - [ ] Console: 0 errors

- [ ] **Safari 17**
  - [ ] All pages load correctly
  - [ ] Date pickers work (Safari-specific)
  - [ ] Console: 0 errors

- [ ] **Firefox 121**
  - [ ] All pages load correctly
  - [ ] Animations smooth
  - [ ] Console: 0 errors

**Performance Validation**
- [ ] **API Response Times**
  - [ ] GET /api/v1/orders (200 records): < 500ms
  - [ ] GET /api/v1/shipments (120 records): < 500ms
  - [ ] GET /api/v1/analytics/dashboard/seller: < 500ms
  - [ ] POST /api/v1/orders (create): < 300ms

- [ ] **Frontend Page Load Times**
  - [ ] /seller (dashboard): < 2s Time to Interactive
  - [ ] /seller/orders: < 2s
  - [ ] /seller/shipments: < 2s
  - [ ] Lighthouse Performance Score: > 90

**Data Integrity Checks**
- [ ] **No Orphaned Records**
  - [ ] Query: `db.shipments.find({ orderId: { $exists: false } }).count()` = 0
  - [ ] All shipments have valid orderId

- [ ] **No Duplicate AWBs**
  - [ ] Query: `db.shipments.aggregate([{$group: {_id: "$trackingNumber", count: {$sum: 1}}}, {$match: {count: {$gt: 1}}}])` = []
  - [ ] All AWBs unique

- [ ] **Order Totals Match**
  - [ ] Query: Sample 10 orders, calculate sum of items + shipping
  - [ ] Compare to orderTotal field
  - [ ] All match ✓

- [ ] **Analytics Calculations**
  - [ ] Query: `db.orders.countDocuments({ status: "delivered" })` = 60
  - [ ] Dashboard shows: 60 delivered orders ✓
  - [ ] Success rate: 60 / (60+40+15) = 52.17% (wait, should be 96.4%?)
  - [ ] *Note: Verify calculation logic - may be 60 delivered / 62 attempted (excluding pending/cancelled)*

**Console Error Check**
- [ ] Frontend (production build): 0 errors, 0 warnings
- [ ] Backend logs: 0 critical errors, < 5 warnings

**Security Checks**
- [ ] Unauthorized API access returns 401
- [ ] Cross-company data access returns 403
- [ ] SQL injection test: Order search with `'; DROP TABLE orders--` (should sanitize)
- [ ] XSS test: Create order with `<script>alert('xss')</script>` in customer name (should escape)

---

## Monitoring Metrics (Continuous - All Days)

### Agent Performance Metrics
**Measure hourly, alert if threshold exceeded:**

- [ ] **Task Completion Rate**
  - Formula: `(tasks_completed / total_tasks_in_phase) * 100`
  - Target: > 10% per hour (for 8-hour day = 80% by end of day)
  - Alert: If < 5% for 2 consecutive hours

- [ ] **API Response Time (Backend Agent)**
  - P50: < 250ms
  - P95: < 500ms
  - P99: < 1000ms
  - Alert: If P95 > 1000ms for 10 minutes

- [ ] **Frontend Page Load Time**
  - Time to Interactive: < 2s
  - First Contentful Paint: < 1s
  - Alert: If TTI > 3s for 5 minutes

- [ ] **Queue Depth per Agent**
  - Monitor: `redis-cli llen agent:<agent-id>:tasks`
  - Target: Decreasing over time
  - Alert: If queue depth increases (agent stalled)

- [ ] **Database Write Throughput (Seed Agent)**
  - Day 3 only: During seed execution
  - Target: > 50 inserts/sec
  - Alert: If < 10 inserts/sec (slow performance)

- [ ] **Error Rate per Agent**
  - Formula: `(errors / total_operations) * 100`
  - Target: < 1%
  - Alert: If > 5% for 10 minutes

### Infrastructure Metrics
**Monitor continuously, alert on threshold:**

- [ ] **MongoDB CPU Usage**
  - Target: < 70%
  - Alert: If > 85% for 5 minutes

- [ ] **MongoDB Memory Usage**
  - Target: < 4GB
  - Alert: If > 6GB

- [ ] **Node.js Memory (Backend/Frontend)**
  - Target: < 2GB per process
  - Alert: If > 3GB (memory leak suspected)

- [ ] **Disk Space**
  - Target: > 20GB free
  - Alert: If < 10GB free

- [ ] **Network Latency (localhost)**
  - Target: < 5ms
  - Alert: If > 50ms (localhost should be fast)

### Log Correlation
**All logs must include:**
- [ ] Request ID (UUID per API request)
- [ ] Agent ID (backend, frontend, seed, qa)
- [ ] Task ID (T1.1, T2.5, etc.)
- [ ] Timestamp (ISO 8601 format with timezone)

**Example Log Entry:**
```json
{
  "timestamp": "2025-01-22T14:35:12+05:30",
  "level": "INFO",
  "agentId": "backend",
  "taskId": "T1.2",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Shipment created successfully",
  "data": {
    "shipmentId": "SHP-20250122-0847",
    "orderId": "ORD-20250122-0001",
    "carrier": "Delhivery",
    "rate": 68
  }
}
```

---

## Alerting Rules (Automated)

### Critical Alerts (Escalate Immediately)
1. **Agent Blocked > 2 Hours**
   - Condition: Agent status = BLOCKED for > 120 minutes
   - Action: Notify project lead, trigger rollback evaluation

2. **API Response Time > 2s**
   - Condition: P95 response time > 2000ms for 10 minutes
   - Action: Trigger performance optimization task, notify backend lead

3. **Error Rate > 10%**
   - Condition: (errors / operations) > 0.1 for 5 minutes
   - Action: Pause agent, rollback to last known good state

4. **Database Connection Lost**
   - Condition: MongoDB ping fails for 3 consecutive attempts
   - Action: Restart MongoDB, notify DevOps

5. **Zero Tasks Completed in 2 Hours**
   - Condition: Task progress = 0% for 2 hours during work hours
   - Action: Check agent logs, verify dependencies

### Warning Alerts (Monitor, No Immediate Action)
1. **Queue Depth Increasing**
   - Condition: Queue depth grows for 30 minutes
   - Action: Log warning, check if agent is slow

2. **Memory Usage High**
   - Condition: Node.js memory > 2.5GB
   - Action: Monitor for memory leak, restart if exceeds 3GB

3. **Slow Page Load**
   - Condition: TTI > 2.5s for 10 minutes
   - Action: Investigate frontend performance, consider lazy loading

---

## Demo Rehearsal Checklist (Day 3, 4:00 PM IST)

### Pre-Demo Setup
- [ ] Clear browser cache
- [ ] Login as demo@shipcrowd.com (verify credentials work)
- [ ] Open incognito window for admin account (admin@shipcrowd.com)
- [ ] Bookmark key pages: /seller, /seller/orders, /seller/shipments, /admin
- [ ] Prepare demo script (print or second monitor)

### Demo Flow Rehearsal (15 minutes)
- [ ] **Part 1: Seller Dashboard (10 mins)**
  - [ ] Time each section (Login: 2 min, Orders: 3 min, Shipments: 3 min, Tracking: 2 min)
  - [ ] Verify no lags or stutters
  - [ ] Ensure all animations smooth

- [ ] **Part 2: Admin Dashboard (5 mins)**
  - [ ] Switch to admin account
  - [ ] Verify multi-company view
  - [ ] Confirm all stats accurate

### Post-Rehearsal Verification
- [ ] Demo completed in < 15 minutes ✓
- [ ] Zero crashes or errors ✓
- [ ] All features demonstrated ✓
- [ ] Client questions anticipated (prepare answers)

---

## Post-Demo Checklist (After Client Meeting)

### Immediate Actions
- [ ] Gather client feedback (notes)
- [ ] Identify requested changes (priority: P0, P1, P2)
- [ ] Create follow-up tasks in backlog
- [ ] Send thank-you email with demo recording (if recorded)

### Technical Cleanup
- [ ] Archive demo database: `mongodump --archive=demo-archive.gz`
- [ ] Tag Git commit: `git tag v1.0-demo`
- [ ] Document known issues (create GitHub issues)
- [ ] Update README with setup instructions

### Success Metrics Review
- [ ] All acceptance criteria met? (26/26 tasks complete)
- [ ] Zero deadlocks occurred? ✓
- [ ] Parallel execution successful? ✓
- [ ] Client satisfied? (subjective)

---

## Emergency Rollback Checklist (Use If Critical Failure)

### Trigger Conditions
- [ ] Critical bug blocks demo (unable to login, data corruption)
- [ ] Multiple agents failed (> 2 agents status = ERROR)
- [ ] Database corrupted (MongoDB errors on every query)

### Rollback Steps
1. [ ] **Stop All Agents**
   - `node stop-agents.js --all --graceful-timeout 30s`

2. [ ] **Rollback Git to Last Checkpoint**
   - `git checkout main`
   - `git reset --hard day<X>-checkpoint` (X = 1 or 2)

3. [ ] **Restore Database**
   - `mongorestore --drop --db shipcrowd_demo ./backups/day<X>-backup`

4. [ ] **Verify Rollback**
   - `curl http://localhost:5005/api/v1/health` (should return 200)
   - `curl http://localhost:3000` (should load)
   - Login as demo user (should work)

5. [ ] **Communicate Status**
   - Notify team: "Rolled back to Day <X> state, investigating issue"
   - Estimate recovery time

---

**End of Monitoring & Testing Checklist**

🎉 **Use this checklist throughout the 3-day execution to ensure quality and catch issues early!**