Litsen after 3 days is meeting with client and i have to show them progress of the shipcrowd product and as you can see we have only build frontend of both seller and admin dashboard but to show client things are working we have to intregrate backend/system architecture/business logic to them now and make them fully function as they should be here... so what are the important features are there in shipcrowd's seller and admin dashboard that we should make working for the meeting with client here, i want you to analyze complete shipcrowd and then reference product bluehsip and you can search on internet for related knowledge, data and studies and then create a plan for this that how can we make important things working in next 3 days here...

make sure it should be related only inhouse/own crud operations, it should not be depend on third party right now so plan accordingly.

in this process you have freedom fully to research about anything here to find something that needs to be refine, fix, imporve or update in our shipcrowd.

@Shipcrowd/docs/SHIPCROWD_COMPLETE_FEATURE_LIST.md

# Shipcrowd 3-Day MVP Implementation Plan for Client Demo

**Meeting Date:** 3 days from now
**Goal:** Transform Shipcrowd from UI mockup to functional demo platform with real data persistence
**Scope:** In-house CRUD operations only (NO third-party integrations), you can study @blueship for more details.

---

## Executive Summary

### Current Status
- ✅ **Frontend:** 44 pages (22 seller + 22 admin) with premium UI/UX - all using mock data
- ✅ **Backend:** Express + TypeScript + MongoDB with 14 models, auth 100% complete
- ✅ **Infrastructure:** API client framework exists, React Query ready
- ❌ **Integration:** Zero connection between frontend and backend
- ❌ **Missing APIs:** Order management, Shipment CRUD, Rate calculation, Analytics endpoints

### Success Criteria
- All critical seller dashboard pages connected to real APIs
- Live data flow: Frontend → Backend → Database → Frontend
- Demonstrable order-to-shipment workflow with 200+ seeded records
- Zero console errors, < 2s page load, production-ready feel

### Industry Benchmark (Based on Research)
Essential features for logistics SaaS demo:
- ✅ Single dashboard for multi-entity management
- ✅ Real-time order/shipment tracking
- ✅ Inventory (warehouse) management
- ✅ Analytics & reporting
- ✅ User management with RBAC

**Sources:**
- [Top Shipping Aggregators in India 2025](https://www.clickpost.ai/blog/shipping-or-courier-aggregators)
- [Logistics SaaS Solutions Guide](https://acropolium.com/blog/saas-for-logistics-a-guide-on-increasing-efficiency-with-cloud-based-automation-solutions/)
- [Best SaaS Logistics Software 2024](https://www.kosmo.delivery/en/saas-logistics-software)

---

## DAY 1: Backend API Development (8-10 hours)

### Morning Session (4 hours)

#### Task 1.1: Order Controller & Routes (90 mins) - P0 CRITICAL
**File:** `server/src/presentation/http/controllers/order.controller.ts` (new)

**Endpoints to implement:**
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - List with pagination & filters
- `GET /api/v1/orders/:orderId` - Single order details
- `PATCH /api/v1/orders/:orderId` - Update order
- `DELETE /api/v1/orders/:orderId` - Soft delete
- `POST /api/v1/orders/bulk` - CSV import

**Key features:**
- Auto-generate orderNumber: `ORD-YYYYMMDD-XXXX`
- Status tracking: pending → ready_to_ship → shipped → delivered
- Payment modes: COD, Prepaid
- Filters: status, date range, customer phone, warehouse
- Pagination: default 20 items/page

**Model:** Already exists at `server/src/infrastructure/database/mongoose/models/Order.ts`

---

#### Task 1.2: Shipment Controller & Routes (90 mins) - P0 CRITICAL
**File:** `server/src/presentation/http/controllers/shipment.controller.ts` (new)

**Endpoints:**
- `POST /api/v1/shipments` - Create from order
- `GET /api/v1/shipments` - List with filters
- `GET /api/v1/shipments/:shipmentId` - Details
- `GET /api/v1/shipments/tracking/:trackingNumber` - Track by AWB
- `PATCH /api/v1/shipments/:shipmentId/status` - Update status
- `DELETE /api/v1/shipments/:shipmentId` - Soft delete

**Key features:**
- Auto-generate trackingNumber: `SHP-YYYYMMDD-XXXX`
- Link to Order via orderId (populate customer/address)
- Status transitions with timestamps
- NDR (Non-Delivery Report) support
- Filters: status, carrier, destination pincode
- **Intelligent Carrier Selection Engine:**
  - Auto-select cheapest carrier based on weight + zone + delivery time
  - Rules: Delhivery (express, metro), DTDC (standard, pan-India), Xpressbees (budget, regional)
  - Display selected carrier with rate breakdown
  - Allow manual override option

**Model:** Already exists at `server/src/infrastructure/database/mongoose/models/Shipment.ts`

---

#### Task 1.3: Register Routes (30 mins) - P0 CRITICAL
**Files to create:**
- `server/src/presentation/http/routes/v1/order.routes.ts`
- `server/src/presentation/http/routes/v1/shipment.routes.ts`

**File to modify:**
- `server/src/presentation/http/routes/v1/index.ts`

**Actions:**
- Import and register order/shipment routes
- Apply authentication middleware (already exists)
- Apply company-scoped authorization

---

### Afternoon Session (4 hours)

#### Task 1.4: RateCard Controller (90 mins) - P1 IMPORTANT
**File:** `server/src/presentation/http/controllers/ratecard.controller.ts` (new)

**Endpoints:**
- `POST /api/v1/ratecards` - Create rate card
- `GET /api/v1/ratecards` - List all
- `GET /api/v1/ratecards/:id` - Single card
- `PATCH /api/v1/ratecards/:id` - Update
- `POST /api/v1/ratecards/calculate` - Calculate rate (weight + zone)

**Features:**
- Weight-based pricing rules
- Zone-based pricing (5 zones: A-E)
- Carrier/service type selection
- Status: draft, active, inactive

**Model:** `server/src/infrastructure/database/mongoose/models/RateCard.ts`

---

#### Task 1.5: Analytics Endpoints (90 mins) - P0 CRITICAL
**File:** `server/src/presentation/http/controllers/analytics.controller.ts` (new)

**Endpoints:**
- `GET /api/v1/analytics/dashboard/seller` - Seller stats
- `GET /api/v1/analytics/dashboard/admin` - Admin stats
- `GET /api/v1/analytics/orders` - Order trends
- `GET /api/v1/analytics/shipments` - Delivery performance

**Data to aggregate:**
- Order counts by status (MongoDB aggregation)
- Success rates (delivered / total)
- Average delivery time
- COD collection amounts
- Weekly/monthly trends

---

#### Task 1.6: Zone Management (60 mins) - P1 IMPORTANT
**File:** `server/src/presentation/http/controllers/zone.controller.ts` (new)

**Endpoints:**
- `GET /api/v1/zones` - List zones
- `POST /api/v1/zones` - Create zone
- `GET /api/v1/zones/:id` - Details
- `PATCH /api/v1/zones/:id` - Update

**Model:** `server/src/infrastructure/database/mongoose/models/Zone.ts`

---

### Day 1 Deliverables
- ✅ 6 new controllers
- ✅ 35+ API endpoints
- ✅ All tested with Postman
- ✅ Authentication working
- ✅ Audit logging enabled

---

## DAY 2: Frontend-Backend Integration (8-10 hours)

### Morning Session (4 hours)

#### Task 2.1: API Client Infrastructure (90 mins) - P0 CRITICAL
**File:** `client/src/lib/api/client.ts` (new)

**Implementation:**
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // JWT cookies
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor (handle 401, refresh token)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token logic
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**Features:**
- Typed request/response with TypeScript
- Automatic token refresh
- Error handling with toast notifications

---

#### Task 2.2: React Query Hooks (60 mins) - P0 CRITICAL
**Files to create:**
- `client/src/hooks/api/useOrders.ts`
- `client/src/hooks/api/useShipments.ts`
- `client/src/hooks/api/useAnalytics.ts`
- `client/src/hooks/api/useWarehouses.ts`

**Example (useOrders):**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

export const useOrders = (filters) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => apiClient.get('/orders', { params: filters }),
    staleTime: 30000, // 30s cache
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      toast.success('Order created!');
    },
  });
};
```

---

#### Task 2.3: Connect Seller Dashboard (90 mins) - P0 CRITICAL
**File:** `client/app/seller/page.tsx` (modify)

**Current:** Lines 34-90 use mock data
**Changes:**
- Replace `sellerData` with `useAnalytics()` hook
- Replace `pendingActions` with real counts
- Replace `recentShipments` with `useShipments({ limit: 3 })`
- Add loading skeletons
- Keep all existing UI/UX

---

#### Task 2.4: Connect Orders Page (90 mins) - P0 CRITICAL
**File:** `client/app/seller/orders/page.tsx` (modify)

**Features:**
- Fetch with `useOrders()` hook
- Server-side pagination
- Filters: status, date range, search
- Bulk actions: ship selected, cancel selected
- Create order modal (form submission to API)
- Real-time updates on mutation

---

### Afternoon Session (4 hours)

#### Task 2.5: Connect Shipments Page (90 mins) - P0 CRITICAL
**File:** `client/app/seller/shipments/page.tsx` (modify)

**Features:**
- Fetch with `useShipments()` hook
- Quick track by AWB
- Status update actions
- Filters: status, carrier, date range
- Print label (Simple PDF with order details using jsPDF)
  - Include: AWB, order number, customer details, shipping address
  - Barcode for AWB (simple format)
  - Company branding (logo if available)

---

#### Task 2.6: Connect Warehouse Page (90 mins) - P1 IMPORTANT
**File:** `client/app/seller/warehouses/page.tsx` (modify)

**Note:** Warehouse APIs already exist (verified in backend)

**Features:**
- List warehouses with `useWarehouses()`
- Create warehouse form
- Set default warehouse toggle
- Update/delete operations

---

#### Task 2.7: Connect Rate Cards Page (60 mins) - P1 IMPORTANT
**File:** `client/app/seller/rates/page.tsx` (modify)

**Features:**
- List active rate cards
- View details (base rates, zones)
- Calculate shipping cost preview
- Compare 3-4 mock carriers

---

#### Task 2.8: Connect Admin Dashboard (60 mins) - P1 IMPORTANT
**File:** `client/app/admin/page.tsx` (modify)

**Features:**
- Admin-level analytics (all companies)
- Company list with stats
- Recent orders/shipments (aggregated)
- Financial overview

---

### Day 2 Deliverables
- ✅ API client fully functional
- ✅ 8+ React Query hooks
- ✅ Seller dashboard live with real data
- ✅ Orders, Shipments, Warehouses connected
- ✅ Admin dashboard connected
- ✅ Loading/error states implemented

---

## DAY 3: Polish & Demo Preparation (8-10 hours)

### Morning Session (4 hours)

#### Task 3.1: Database Seed Script (120 mins) - P0 CRITICAL
**File:** `server/src/scripts/seed-demo-data.ts` (new)

**Data to seed:**
- **Users:** 3-5 demo sellers (different companies)
- **Companies:** 3-5 companies (Starter, Growth, Enterprise tiers)
  - Company 1: "StyleHub Fashion" (Bangalore)
  - Company 2: "TrendWear Co" (Mumbai)
  - Company 3: "ChicCraft Apparel" (Delhi)
- **Warehouses:** 2-3 per company (Delhi, Mumbai, Bangalore)
- **Products (Fashion/Apparel):**
  - T-Shirts (₹299-799, 0.3-0.5kg)
  - Jeans/Trousers (₹999-2499, 0.6-0.8kg)
  - Dresses/Kurtas (₹799-2999, 0.4-0.7kg)
  - Shoes/Sneakers (₹1499-4999, 0.8-1.2kg)
  - Accessories (Bags, Belts, Watches) (₹499-1999, 0.2-0.5kg)
- **Orders:** 150-200 total with fashion products:
  - 30 pending (ready to ship)
  - 40 shipped (various stages)
  - 60 delivered (past 7-30 days)
  - 10 cancelled (size issues, customer request)
  - 15 RTO (incorrect address, customer unavailable)
- **Shipments:** 120 linked to shipped/delivered orders
  - Realistic tracking: created → picked → in-transit → delivered
  - 5-8 NDR cases (customer unavailable, wrong address)
  - Indian cities: Delhi, Mumbai, Bangalore, Pune, Hyderabad, Chennai
  - Pincodes: Mix of metro (110001, 400001) and tier-2 cities
  - **Intelligent carrier assignment:**
    - Delhivery: 40% (metro, express)
    - DTDC: 35% (pan-India, standard)
    - Xpressbees: 25% (budget, regional)
- **Rate Cards:** 2-3 active with fashion-specific pricing
  - Light category: 0-0.5kg (T-shirts, accessories)
  - Medium: 0.5-1kg (Jeans, dresses)
  - Heavy: 1-2kg (Shoes, multi-item orders)
- **Zones:** 4 zones (Local, Zonal, Metro, ROI)

**Script features:**
- Idempotent (run multiple times safely)
- Realistic Indian data (Faker.js)
- Date distribution (last 30 days)
- Weighted status distribution

---

#### Task 3.2: Test Critical User Flows (60 mins) - P0 CRITICAL

**Flow 1: Order to Shipment (20 mins)**
1. Login as seller
2. View pending orders
3. Create shipment from order
4. Track by AWB
5. Update status
6. Verify order status updates

**Flow 2: Bulk Processing (20 mins)**
1. Import orders from CSV
2. Select multiple orders
3. Bulk create shipments
4. Generate manifest
5. Verify creation

**Flow 3: Analytics (20 mins)**
1. View seller dashboard
2. Check stats accuracy
3. Filter by date range
4. Export CSV
5. Verify calculations

---

#### Task 3.3: Error Handling (60 mins) - P1 IMPORTANT

**Test scenarios:**
- Invalid order creation
- Duplicate shipment attempt
- Unauthorized access (cross-company)
- Network failures
- Empty states
- Pagination edge cases

---

### Afternoon Session (4 hours)

#### Task 3.4: UI/UX Polish (90 mins) - P1 IMPORTANT

**Loading States:**
- Skeleton loaders for tables
- Shimmer effects for cards
- Progress indicators for bulk ops

**Empty States:**
- Illustrations for no data
- Clear CTAs ("Create first order")

**Toast Notifications:**
- Success: "Order created!"
- Error: "Failed to save"
- Info: "CSV import started"

**Form Validations:**
- Real-time validation
- Clear error messages
- Disable submit while processing

---

#### Task 3.5: Performance Optimization (60 mins) - P1 IMPORTANT

**Frontend:**
- Lazy load heavy components
- Debounce search (300ms)
- Virtual scrolling for 100+ items
- Image optimization (next/image)

**Backend:**
- Verify MongoDB indexes
- Query optimization (projections)
- Enable caching for analytics (5 min TTL)
- Compression middleware

---

#### Task 3.6: Demo Script (90 mins) - P0 CRITICAL

**Demo Credentials:**
- Seller: `demo@shipcrowd.com` / `Demo@2024`
- Admin: `admin@shipcrowd.com` / `Admin@2024`

**Demo Flow (15 mins total - 70% Seller, 30% Admin):**

**SELLER DASHBOARD (10 mins):**

1. **Login & Dashboard** (2 mins)
   - Login as StyleHub Fashion seller
   - Show wallet balance, pending actions
   - Highlight stats (96.4% delivery success rate)
   - Recent shipments widget
   - COD pending settlements

2. **Order Management** (3 mins)
   - Navigate to Orders page
   - Show 30 pending orders (T-shirts, jeans, dresses)
   - Filter by status: "Pending"
   - Create new order: Customer ordering 2 T-shirts + 1 jeans
   - Auto-fill customer details, product selection
   - Show confirmation toast

3. **Intelligent Shipment Creation** (3 mins) ⭐ KEY FEATURE
   - Select pending order (₹2,997 order, 1.4kg total)
   - Click "Create Shipment"
   - **Intelligent Carrier Selection displays:**
     - Delhivery: ₹68 (Express, 2-3 days) ← AUTO-SELECTED
     - DTDC: ₹72 (Standard, 3-4 days)
     - Xpressbees: ₹65 (Regional, 4-5 days)
   - System chooses Delhivery (best balance of cost + speed)
   - Generate AWB: SHP-20250122-0847
   - Download shipping label PDF (simple format with barcode)

4. **Real-time Tracking** (2 mins)
   - Use Quick Track widget
   - Enter AWB: SHP-20250120-0234
   - Show tracking timeline:
     - ✅ Order Created (Jan 20, 10:00 AM)
     - ✅ Picked Up (Jan 20, 3:00 PM)
     - ✅ In Transit (Jan 21, 8:00 AM)
     - 🔄 Out for Delivery (Jan 22, 9:00 AM)
   - Manually update to "Delivered" (simulate real-time)
   - Show status change animation

**ADMIN DASHBOARD (5 mins):**

5. **Admin Overview** (3 mins)
   - Logout seller, login as admin
   - Multi-company dashboard
   - Show 3 companies:
     - StyleHub Fashion: 87 orders, ₹1.2L GMV
     - TrendWear Co: 64 orders, ₹89K GMV
     - ChicCraft Apparel: 49 orders, ₹67K GMV
   - Aggregated analytics:
     - Total shipments: 200
     - Success rate: 96.4%
     - NDR cases: 8 (4%)
   - Revenue graph (last 7 days)

6. **Company Management** (2 mins)
   - View company details: StyleHub Fashion
   - KYC status: ✅ Verified
   - Active rate card: Fashion Standard
   - Wallet balance: ₹15,470
   - Recent activity log

---

#### Task 3.7: Final QA (60 mins) - P0 CRITICAL

**Cross-browser testing:**
- Chrome, Safari, Firefox
- Desktop 1920x1080, Laptop 1440x900

**Bug fixes:**
- Console errors/warnings
- API timeouts
- Broken navigation
- Data formatting

**Data integrity:**
- No orphaned records
- Referential integrity
- Validate calculations

---

### Day 3 Deliverables
- ✅ 200+ seeded records
- ✅ All flows tested
- ✅ Polished UI
- ✅ < 2s page load
- ✅ Demo script documented
- ✅ Zero console errors

---

## Priority Breakdown

### P0 - Must Have (Critical for Demo)
**Backend:**
- Order CRUD APIs
- Shipment CRUD APIs
- Analytics endpoint
- Warehouse verification

**Frontend:**
- Seller Dashboard
- Orders page
- Shipments page
- API client + React Query

**Data:**
- 150+ orders
- 100+ shipments
- 3 demo companies

### P1 - Important for Impact
**Backend:**
- Rate card APIs
- Bulk operations

**Frontend:**
- Rate cards page
- Admin dashboard
- Export CSV

**Polish:**
- Loading states
- Error handling
- Toast notifications

### P2 - Nice to Have (Skip if Behind)
- NDR management
- COD reconciliation
- KYC workflow
- Team management
- Email/SMS

---

## Intelligent Carrier Selection Algorithm

### Implementation Details (Task 1.2 - Shipment Controller)

**File:** `server/src/presentation/http/controllers/shipment.controller.ts`

**Algorithm Logic:**
```typescript
function selectBestCarrier(weight: number, origin: string, destination: string, serviceType: 'express' | 'standard') {
  // Static rate rules (no third-party API calls)
  const carriers = [
    {
      name: 'Delhivery',
      baseRate: 40,
      perKgRate: 20,
      expressMultiplier: 1.3,
      metroDiscount: 0.9,
      deliveryTime: serviceType === 'express' ? 2 : 3,
      strongZones: ['metro', 'tier1'],
    },
    {
      name: 'DTDC',
      baseRate: 45,
      perKgRate: 18,
      expressMultiplier: 1.2,
      metroDiscount: 1.0,
      deliveryTime: serviceType === 'express' ? 3 : 4,
      strongZones: ['tier1', 'tier2', 'tier3'],
    },
    {
      name: 'Xpressbees',
      baseRate: 35,
      perKgRate: 22,
      expressMultiplier: 1.4,
      metroDiscount: 1.1,
      deliveryTime: serviceType === 'express' ? 3 : 5,
      strongZones: ['tier2', 'tier3'],
    },
  ];

  // Determine zone type
  const isMetro = ['110001', '400001', '560001', '600001'].includes(destination.slice(0, 6));
  const zoneType = isMetro ? 'metro' : 'tier2';

  // Calculate rates for each carrier
  const ratesWithScores = carriers.map(carrier => {
    let rate = carrier.baseRate + (weight * carrier.perKgRate);

    // Apply express surcharge
    if (serviceType === 'express') {
      rate *= carrier.expressMultiplier;
    }

    // Apply zone-specific discounts
    if (isMetro) {
      rate *= carrier.metroDiscount;
    }

    // Calculate score (lower is better)
    // Score = (rate * 0.7) + (deliveryTime * 5)
    // Prioritizes cost (70%) and speed (30%)
    const score = (rate * 0.7) + (carrier.deliveryTime * 5);

    return {
      carrier: carrier.name,
      rate: Math.round(rate),
      deliveryTime: carrier.deliveryTime,
      score: score,
    };
  });

  // Sort by score (best first)
  ratesWithScores.sort((a, b) => a.score - b.score);

  return {
    selectedCarrier: ratesWithScores[0].carrier,
    selectedRate: ratesWithScores[0].rate,
    selectedDeliveryTime: ratesWithScores[0].deliveryTime,
    alternativeOptions: ratesWithScores,
  };
}
```

**Why This Approach:**
1. ✅ No third-party API dependencies (fast, reliable)
2. ✅ Realistic pricing based on weight + zone
3. ✅ Demonstrates "intelligence" with scoring algorithm
4. ✅ Allows manual override in frontend
5. ✅ Easy to adjust rules for different scenarios

**Frontend Integration:**
In shipment creation modal, display:
- **Recommended:** Delhivery - ₹68 (2-3 days) [AUTO-SELECTED]
- Alternative: DTDC - ₹72 (3-4 days)
- Alternative: Xpressbees - ₹65 (4-5 days)

User can override by clicking on alternative option.

---

## Critical Files Reference

### Backend (New)
1. `server/src/presentation/http/controllers/order.controller.ts`
2. `server/src/presentation/http/controllers/shipment.controller.ts` ⭐ includes intelligent carrier selection
3. `server/src/presentation/http/controllers/analytics.controller.ts`
4. `server/src/presentation/http/routes/v1/order.routes.ts`
5. `server/src/presentation/http/routes/v1/shipment.routes.ts`
6. `server/src/scripts/seed-demo-data.ts`
7. `server/src/lib/carrier-selection.ts` (new - carrier algorithm helper)

### Frontend (Modify)
1. `client/src/lib/api/client.ts` (new)
2. `client/src/hooks/api/useOrders.ts` (new)
3. `client/src/hooks/api/useShipments.ts` (new)
4. `client/app/seller/page.tsx` (replace mock data)
5. `client/app/seller/orders/page.tsx` (connect API)
6. `client/app/seller/shipments/page.tsx` (connect API)
7. `client/src/lib/pdf/shipping-label.ts` (new - jsPDF label generator)

### Environment
**Backend (.env):**
```
PORT=5005
MONGODB_URI=mongodb://localhost:27017/shipcrowd_demo
JWT_SECRET=your_secret
CLIENT_URL=http://localhost:3000
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:5005/api/v1
```

---

## Risk Mitigation

### Risk 1: API Integration Delays
**Mitigation:** Complete Order + Shipment APIs first (Day 1 morning), test immediately

### Risk 2: State Management Complexity
**Mitigation:** Use React Query incrementally, document data flow

### Risk 3: Performance Issues
**Mitigation:** Monitor response times (< 500ms), add pagination early

### Risk 4: Last-Minute Bugs
**Mitigation:** Allocate Day 3 afternoon for fixes, keep rollback plan

---

## Success Metrics

**Technical:**
- API response < 500ms
- Zero console errors
- Mobile responsive

**Demo:**
- Complete in < 15 mins
- Show 5+ features
- Zero crashes

**Client Perception:**
- Production-ready feel
- Matches competitors
- Clear data flow

---

## Backup Plan (If Behind Schedule)

**6 hours behind:**
- Skip: Admin dashboard, Rate cards, CSV
- Focus: Orders + Shipments + Dashboard only

**12 hours behind:**
- Focus: Dashboard + Orders ONLY
- Strategy: Show mockups for rest
- Message: "Features in development, Q1 2025 launch"

**Critical bugs day before:**
- Revert to mock data for broken feature
- Remove from demo script
- Explain: "Known issue, fix in progress"

---

## Daily Checklist

### End of Day 1
- [ ] 35+ API endpoints tested
- [ ] Postman collection ready
- [ ] Auth working end-to-end
- [ ] Git commit: "feat: backend APIs complete"

### End of Day 2
- [ ] API client functional
- [ ] 8+ hooks created
- [ ] Seller dashboard live
- [ ] Orders/Shipments connected
- [ ] Git commit: "feat: frontend-backend integration"

### End of Day 3
- [ ] 200+ demo records
- [ ] All flows tested
- [ ] Demo script documented
- [ ] Zero errors
- [ ] Git commit: "chore: demo ready"

---

**Key Success Factor:** Quality over quantity - make 5-6 features work perfectly rather than 20 features work poorly.

Claude’s Plan
Shipcrowd 3-Day MVP Implementation Plan for Client Demo
Meeting Date: 3 days from now Goal: Transform Shipcrowd from UI mockup to functional demo platform with real data persistence Scope: In-house CRUD operations only (NO third-party integrations)
Executive Summary
Current Status
✅ Frontend: 44 pages (22 seller + 22 admin) with premium UI/UX - all using mock data
✅ Backend: Express + TypeScript + MongoDB with 14 models, auth 100% complete
✅ Infrastructure: API client framework exists, React Query ready
❌ Integration: Zero connection between frontend and backend
❌ Missing APIs: Order management, Shipment CRUD, Rate calculation, Analytics endpoints
Success Criteria
All critical seller dashboard pages connected to real APIs
Live data flow: Frontend → Backend → Database → Frontend
Demonstrable order-to-shipment workflow with 200+ seeded records
Zero console errors, < 2s page load, production-ready feel
Industry Benchmark (Based on Research)
Essential features for logistics SaaS demo:
✅ Single dashboard for multi-entity management
✅ Real-time order/shipment tracking
✅ Inventory (warehouse) management
✅ Analytics & reporting
✅ User management with RBAC
Sources:
Top Shipping Aggregators in India 2025
Logistics SaaS Solutions Guide
Best SaaS Logistics Software 2024
DAY 1: Backend API Development (8-10 hours)
Morning Session (4 hours)
Task 1.1: Order Controller & Routes (90 mins) - P0 CRITICAL
File: server/src/presentation/http/controllers/order.controller.ts (new) Endpoints to implement:
POST /api/v1/orders - Create order
GET /api/v1/orders - List with pagination & filters
GET /api/v1/orders/:orderId - Single order details
PATCH /api/v1/orders/:orderId - Update order
DELETE /api/v1/orders/:orderId - Soft delete
POST /api/v1/orders/bulk - CSV import
Key features:
Auto-generate orderNumber: ORD-YYYYMMDD-XXXX
Status tracking: pending → ready_to_ship → shipped → delivered
Payment modes: COD, Prepaid
Filters: status, date range, customer phone, warehouse
Pagination: default 20 items/page
Model: Already exists at server/src/infrastructure/database/mongoose/models/Order.ts
Task 1.2: Shipment Controller & Routes (90 mins) - P0 CRITICAL
File: server/src/presentation/http/controllers/shipment.controller.ts (new) Endpoints:
POST /api/v1/shipments - Create from order
GET /api/v1/shipments - List with filters
GET /api/v1/shipments/:shipmentId - Details
GET /api/v1/shipments/tracking/:trackingNumber - Track by AWB
PATCH /api/v1/shipments/:shipmentId/status - Update status
DELETE /api/v1/shipments/:shipmentId - Soft delete
Key features:
Auto-generate trackingNumber: SHP-YYYYMMDD-XXXX
Link to Order via orderId (populate customer/address)
Status transitions with timestamps
NDR (Non-Delivery Report) support
Filters: status, carrier, destination pincode
Intelligent Carrier Selection Engine:
Auto-select cheapest carrier based on weight + zone + delivery time
Rules: Delhivery (express, metro), DTDC (standard, pan-India), Xpressbees (budget, regional)
Display selected carrier with rate breakdown
Allow manual override option
Model: Already exists at server/src/infrastructure/database/mongoose/models/Shipment.ts
Task 1.3: Register Routes (30 mins) - P0 CRITICAL
Files to create:
server/src/presentation/http/routes/v1/order.routes.ts
server/src/presentation/http/routes/v1/shipment.routes.ts
File to modify:
server/src/presentation/http/routes/v1/index.ts
Actions:
Import and register order/shipment routes
Apply authentication middleware (already exists)
Apply company-scoped authorization
Afternoon Session (4 hours)
Task 1.4: RateCard Controller (90 mins) - P1 IMPORTANT
File: server/src/presentation/http/controllers/ratecard.controller.ts (new) Endpoints:
POST /api/v1/ratecards - Create rate card
GET /api/v1/ratecards - List all
GET /api/v1/ratecards/:id - Single card
PATCH /api/v1/ratecards/:id - Update
POST /api/v1/ratecards/calculate - Calculate rate (weight + zone)
Features:
Weight-based pricing rules
Zone-based pricing (5 zones: A-E)
Carrier/service type selection
Status: draft, active, inactive
Model: server/src/infrastructure/database/mongoose/models/RateCard.ts
Task 1.5: Analytics Endpoints (90 mins) - P0 CRITICAL
File: server/src/presentation/http/controllers/analytics.controller.ts (new) Endpoints:
GET /api/v1/analytics/dashboard/seller - Seller stats
GET /api/v1/analytics/dashboard/admin - Admin stats
GET /api/v1/analytics/orders - Order trends
GET /api/v1/analytics/shipments - Delivery performance
Data to aggregate:
Order counts by status (MongoDB aggregation)
Success rates (delivered / total)
Average delivery time
COD collection amounts
Weekly/monthly trends
Task 1.6: Zone Management (60 mins) - P1 IMPORTANT
File: server/src/presentation/http/controllers/zone.controller.ts (new) Endpoints:
GET /api/v1/zones - List zones
POST /api/v1/zones - Create zone
GET /api/v1/zones/:id - Details
PATCH /api/v1/zones/:id - Update
Model: server/src/infrastructure/database/mongoose/models/Zone.ts
Day 1 Deliverables
✅ 6 new controllers
✅ 35+ API endpoints
✅ All tested with Postman
✅ Authentication working
✅ Audit logging enabled
DAY 2: Frontend-Backend Integration (8-10 hours)
Morning Session (4 hours)
Task 2.1: API Client Infrastructure (90 mins) - P0 CRITICAL
File: client/src/lib/api/client.ts (new) Implementation:

import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // JWT cookies
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor (handle 401, refresh token)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token logic
    }
    return Promise.reject(error);
  }
);

export default apiClient;
Features:
Typed request/response with TypeScript
Automatic token refresh
Error handling with toast notifications
Task 2.2: React Query Hooks (60 mins) - P0 CRITICAL
Files to create:
client/src/hooks/api/useOrders.ts
client/src/hooks/api/useShipments.ts
client/src/hooks/api/useAnalytics.ts
client/src/hooks/api/useWarehouses.ts
Example (useOrders):

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

export const useOrders = (filters) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => apiClient.get('/orders', { params: filters }),
    staleTime: 30000, // 30s cache
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      toast.success('Order created!');
    },
  });
};
Task 2.3: Connect Seller Dashboard (90 mins) - P0 CRITICAL
File: client/app/seller/page.tsx (modify) Current: Lines 34-90 use mock data Changes:
Replace sellerData with useAnalytics() hook
Replace pendingActions with real counts
Replace recentShipments with useShipments({ limit: 3 })
Add loading skeletons
Keep all existing UI/UX
Task 2.4: Connect Orders Page (90 mins) - P0 CRITICAL
File: client/app/seller/orders/page.tsx (modify) Features:
Fetch with useOrders() hook
Server-side pagination
Filters: status, date range, search
Bulk actions: ship selected, cancel selected
Create order modal (form submission to API)
Real-time updates on mutation
Afternoon Session (4 hours)
Task 2.5: Connect Shipments Page (90 mins) - P0 CRITICAL
File: client/app/seller/shipments/page.tsx (modify) Features:
Fetch with useShipments() hook
Quick track by AWB
Status update actions
Filters: status, carrier, date range
Print label (Simple PDF with order details using jsPDF)
Include: AWB, order number, customer details, shipping address
Barcode for AWB (simple format)
Company branding (logo if available)
Task 2.6: Connect Warehouse Page (90 mins) - P1 IMPORTANT
File: client/app/seller/warehouses/page.tsx (modify) Note: Warehouse APIs already exist (verified in backend) Features:
List warehouses with useWarehouses()
Create warehouse form
Set default warehouse toggle
Update/delete operations
Task 2.7: Connect Rate Cards Page (60 mins) - P1 IMPORTANT
File: client/app/seller/rates/page.tsx (modify) Features:
List active rate cards
View details (base rates, zones)
Calculate shipping cost preview
Compare 3-4 mock carriers
Task 2.8: Connect Admin Dashboard (60 mins) - P1 IMPORTANT
File: client/app/admin/page.tsx (modify) Features:
Admin-level analytics (all companies)
Company list with stats
Recent orders/shipments (aggregated)
Financial overview
Day 2 Deliverables
✅ API client fully functional
✅ 8+ React Query hooks
✅ Seller dashboard live with real data
✅ Orders, Shipments, Warehouses connected
✅ Admin dashboard connected
✅ Loading/error states implemented
DAY 3: Polish & Demo Preparation (8-10 hours)
Morning Session (4 hours)
Task 3.1: Database Seed Script (120 mins) - P0 CRITICAL
File: server/src/scripts/seed-demo-data.ts (new) Data to seed:
Users: 3-5 demo sellers (different companies)
Companies: 3-5 companies (Starter, Growth, Enterprise tiers)
Company 1: "StyleHub Fashion" (Bangalore)
Company 2: "TrendWear Co" (Mumbai)
Company 3: "ChicCraft Apparel" (Delhi)
Warehouses: 2-3 per company (Delhi, Mumbai, Bangalore)
Products (Fashion/Apparel):
T-Shirts (₹299-799, 0.3-0.5kg)
Jeans/Trousers (₹999-2499, 0.6-0.8kg)
Dresses/Kurtas (₹799-2999, 0.4-0.7kg)
Shoes/Sneakers (₹1499-4999, 0.8-1.2kg)
Accessories (Bags, Belts, Watches) (₹499-1999, 0.2-0.5kg)
Orders: 150-200 total with fashion products:
30 pending (ready to ship)
40 shipped (various stages)
60 delivered (past 7-30 days)
10 cancelled (size issues, customer request)
15 RTO (incorrect address, customer unavailable)
Shipments: 120 linked to shipped/delivered orders
Realistic tracking: created → picked → in-transit → delivered
5-8 NDR cases (customer unavailable, wrong address)
Indian cities: Delhi, Mumbai, Bangalore, Pune, Hyderabad, Chennai
Pincodes: Mix of metro (110001, 400001) and tier-2 cities
Intelligent carrier assignment:
Delhivery: 40% (metro, express)
DTDC: 35% (pan-India, standard)
Xpressbees: 25% (budget, regional)
Rate Cards: 2-3 active with fashion-specific pricing
Light category: 0-0.5kg (T-shirts, accessories)
Medium: 0.5-1kg (Jeans, dresses)
Heavy: 1-2kg (Shoes, multi-item orders)
Zones: 4 zones (Local, Zonal, Metro, ROI)
Script features:
Idempotent (run multiple times safely)
Realistic Indian data (Faker.js)
Date distribution (last 30 days)
Weighted status distribution
Task 3.2: Test Critical User Flows (60 mins) - P0 CRITICAL
Flow 1: Order to Shipment (20 mins)
Login as seller
View pending orders
Create shipment from order
Track by AWB
Update status
Verify order status updates
Flow 2: Bulk Processing (20 mins)
Import orders from CSV
Select multiple orders
Bulk create shipments
Generate manifest
Verify creation
Flow 3: Analytics (20 mins)
View seller dashboard
Check stats accuracy
Filter by date range
Export CSV
Verify calculations
Task 3.3: Error Handling (60 mins) - P1 IMPORTANT
Test scenarios:
Invalid order creation
Duplicate shipment attempt
Unauthorized access (cross-company)
Network failures
Empty states
Pagination edge cases
Afternoon Session (4 hours)
Task 3.4: UI/UX Polish (90 mins) - P1 IMPORTANT
Loading States:
Skeleton loaders for tables
Shimmer effects for cards
Progress indicators for bulk ops
Empty States:
Illustrations for no data
Clear CTAs ("Create first order")
Toast Notifications:
Success: "Order created!"
Error: "Failed to save"
Info: "CSV import started"
Form Validations:
Real-time validation
Clear error messages
Disable submit while processing
Task 3.5: Performance Optimization (60 mins) - P1 IMPORTANT
Frontend:
Lazy load heavy components
Debounce search (300ms)
Virtual scrolling for 100+ items
Image optimization (next/image)
Backend:
Verify MongoDB indexes
Query optimization (projections)
Enable caching for analytics (5 min TTL)
Compression middleware
Task 3.6: Demo Script (90 mins) - P0 CRITICAL
Demo Credentials:
Seller: demo@shipcrowd.com / Demo@2024
Admin: admin@shipcrowd.com / Admin@2024
Demo Flow (15 mins total - 70% Seller, 30% Admin): SELLER DASHBOARD (10 mins):
Login & Dashboard (2 mins)
Login as StyleHub Fashion seller
Show wallet balance, pending actions
Highlight stats (96.4% delivery success rate)
Recent shipments widget
COD pending settlements
Order Management (3 mins)
Navigate to Orders page
Show 30 pending orders (T-shirts, jeans, dresses)
Filter by status: "Pending"
Create new order: Customer ordering 2 T-shirts + 1 jeans
Auto-fill customer details, product selection
Show confirmation toast
Intelligent Shipment Creation (3 mins) ⭐ KEY FEATURE
Select pending order (₹2,997 order, 1.4kg total)
Click "Create Shipment"
Intelligent Carrier Selection displays:
Delhivery: ₹68 (Express, 2-3 days) ← AUTO-SELECTED
DTDC: ₹72 (Standard, 3-4 days)
Xpressbees: ₹65 (Regional, 4-5 days)
System chooses Delhivery (best balance of cost + speed)
Generate AWB: SHP-20250122-0847
Download shipping label PDF (simple format with barcode)
Real-time Tracking (2 mins)
Use Quick Track widget
Enter AWB: SHP-20250120-0234
Show tracking timeline:
✅ Order Created (Jan 20, 10:00 AM)
✅ Picked Up (Jan 20, 3:00 PM)
✅ In Transit (Jan 21, 8:00 AM)
🔄 Out for Delivery (Jan 22, 9:00 AM)
Manually update to "Delivered" (simulate real-time)
Show status change animation
ADMIN DASHBOARD (5 mins):
Admin Overview (3 mins)
Logout seller, login as admin
Multi-company dashboard
Show 3 companies:
StyleHub Fashion: 87 orders, ₹1.2L GMV
TrendWear Co: 64 orders, ₹89K GMV
ChicCraft Apparel: 49 orders, ₹67K GMV
Aggregated analytics:
Total shipments: 200
Success rate: 96.4%
NDR cases: 8 (4%)
Revenue graph (last 7 days)
Company Management (2 mins)
View company details: StyleHub Fashion
KYC status: ✅ Verified
Active rate card: Fashion Standard
Wallet balance: ₹15,470
Recent activity log
Task 3.7: Final QA (60 mins) - P0 CRITICAL
Cross-browser testing:
Chrome, Safari, Firefox
Desktop 1920x1080, Laptop 1440x900
Bug fixes:
Console errors/warnings
API timeouts
Broken navigation
Data formatting
Data integrity:
No orphaned records
Referential integrity
Validate calculations
Day 3 Deliverables
✅ 200+ seeded records
✅ All flows tested
✅ Polished UI
✅ < 2s page load
✅ Demo script documented
✅ Zero console errors
Priority Breakdown
P0 - Must Have (Critical for Demo)
Backend:
Order CRUD APIs
Shipment CRUD APIs
Analytics endpoint
Warehouse verification
Frontend:
Seller Dashboard
Orders page
Shipments page
API client + React Query
Data:
150+ orders
100+ shipments
3 demo companies
P1 - Important for Impact
Backend:
Rate card APIs
Bulk operations
Frontend:
Rate cards page
Admin dashboard
Export CSV
Polish:
Loading states
Error handling
Toast notifications
P2 - Nice to Have (Skip if Behind)
NDR management
COD reconciliation
KYC workflow
Team management
Email/SMS
Intelligent Carrier Selection Algorithm
Implementation Details (Task 1.2 - Shipment Controller)
File: server/src/presentation/http/controllers/shipment.controller.ts Algorithm Logic:

function selectBestCarrier(weight: number, origin: string, destination: string, serviceType: 'express' | 'standard') {
  // Static rate rules (no third-party API calls)
  const carriers = [
    {
      name: 'Delhivery',
      baseRate: 40,
      perKgRate: 20,
      expressMultiplier: 1.3,
      metroDiscount: 0.9,
      deliveryTime: serviceType === 'express' ? 2 : 3,
      strongZones: ['metro', 'tier1'],
    },
    {
      name: 'DTDC',
      baseRate: 45,
      perKgRate: 18,
      expressMultiplier: 1.2,
      metroDiscount: 1.0,
      deliveryTime: serviceType === 'express' ? 3 : 4,
      strongZones: ['tier1', 'tier2', 'tier3'],
    },
    {
      name: 'Xpressbees',
      baseRate: 35,
      perKgRate: 22,
      expressMultiplier: 1.4,
      metroDiscount: 1.1,
      deliveryTime: serviceType === 'express' ? 3 : 5,
      strongZones: ['tier2', 'tier3'],
    },
  ];

  // Determine zone type
  const isMetro = ['110001', '400001', '560001', '600001'].includes(destination.slice(0, 6));
  const zoneType = isMetro ? 'metro' : 'tier2';

  // Calculate rates for each carrier
  const ratesWithScores = carriers.map(carrier => {
    let rate = carrier.baseRate + (weight * carrier.perKgRate);

    // Apply express surcharge
    if (serviceType === 'express') {
      rate *= carrier.expressMultiplier;
    }

    // Apply zone-specific discounts
    if (isMetro) {
      rate *= carrier.metroDiscount;
    }

    // Calculate score (lower is better)
    // Score = (rate * 0.7) + (deliveryTime * 5)
    // Prioritizes cost (70%) and speed (30%)
    const score = (rate * 0.7) + (carrier.deliveryTime * 5);

    return {
      carrier: carrier.name,
      rate: Math.round(rate),
      deliveryTime: carrier.deliveryTime,
      score: score,
    };
  });

  // Sort by score (best first)
  ratesWithScores.sort((a, b) => a.score - b.score);

  return {
    selectedCarrier: ratesWithScores[0].carrier,
    selectedRate: ratesWithScores[0].rate,
    selectedDeliveryTime: ratesWithScores[0].deliveryTime,
    alternativeOptions: ratesWithScores,
  };
}
Why This Approach:
✅ No third-party API dependencies (fast, reliable)
✅ Realistic pricing based on weight + zone
✅ Demonstrates "intelligence" with scoring algorithm
✅ Allows manual override in frontend
✅ Easy to adjust rules for different scenarios
Frontend Integration: In shipment creation modal, display:
Recommended: Delhivery - ₹68 (2-3 days) [AUTO-SELECTED]
Alternative: DTDC - ₹72 (3-4 days)
Alternative: Xpressbees - ₹65 (4-5 days)
User can override by clicking on alternative option.
Critical Files Reference
Backend (New)
server/src/presentation/http/controllers/order.controller.ts
server/src/presentation/http/controllers/shipment.controller.ts ⭐ includes intelligent carrier selection
server/src/presentation/http/controllers/analytics.controller.ts
server/src/presentation/http/routes/v1/order.routes.ts
server/src/presentation/http/routes/v1/shipment.routes.ts
server/src/scripts/seed-demo-data.ts
server/src/lib/carrier-selection.ts (new - carrier algorithm helper)
Frontend (Modify)
client/src/lib/api/client.ts (new)
client/src/hooks/api/useOrders.ts (new)
client/src/hooks/api/useShipments.ts (new)
client/app/seller/page.tsx (replace mock data)
client/app/seller/orders/page.tsx (connect API)
client/app/seller/shipments/page.tsx (connect API)
client/src/lib/pdf/shipping-label.ts (new - jsPDF label generator)
Environment
Backend (.env):

PORT=5005
MONGODB_URI=mongodb://localhost:27017/shipcrowd_demo
JWT_SECRET=your_secret
CLIENT_URL=http://localhost:3000
Frontend (.env.local):

NEXT_PUBLIC_API_URL=http://localhost:5005/api/v1
Risk Mitigation
Risk 1: API Integration Delays
Mitigation: Complete Order + Shipment APIs first (Day 1 morning), test immediately
Risk 2: State Management Complexity
Mitigation: Use React Query incrementally, document data flow
Risk 3: Performance Issues
Mitigation: Monitor response times (< 500ms), add pagination early
Risk 4: Last-Minute Bugs
Mitigation: Allocate Day 3 afternoon for fixes, keep rollback plan
Success Metrics
Technical:
API response < 500ms
Zero console errors
Mobile responsive
Demo:
Complete in < 15 mins
Show 5+ features
Zero crashes
Client Perception:
Production-ready feel
Matches competitors
Clear data flow
Backup Plan (If Behind Schedule)
6 hours behind:
Skip: Admin dashboard, Rate cards, CSV
Focus: Orders + Shipments + Dashboard only
12 hours behind:
Focus: Dashboard + Orders ONLY
Strategy: Show mockups for rest
Message: "Features in development, Q1 2025 launch"
Critical bugs day before:
Revert to mock data for broken feature
Remove from demo script
Explain: "Known issue, fix in progress"
Daily Checklist
End of Day 1
 35+ API endpoints tested
 Postman collection ready
 Auth working end-to-end
 Git commit: "feat: backend APIs complete"
End of Day 2
 API client functional
 8+ hooks created
 Seller dashboard live
 Orders/Shipments connected
 Git commit: "feat: frontend-backend integration"
End of Day 3
 200+ demo records
 All flows tested
 Demo script documented
 Zero errors
 Git commit: "chore: demo ready"
Key Success Factor: Quality over quantity - make 5-6 features work perfectly rather than 20 features work poorly.
Stayed in plan mode
Perfect! Take your time to review the plan. I've created a comprehensive 3-day implementation strategy that includes:
Plan Highlights:
✅ Customized Based on Your Preferences:
PDF Labels: Simple format with order details using jsPDF (quick to implement, professional look)
Carrier Selection: Intelligent auto-selection algorithm with static rates (shows "smart" feature without API dependency)
Demo Data: Fashion/Apparel industry (StyleHub Fashion, TrendWear, ChicCraft) with realistic products and weights
Demo Focus: 70% Seller Dashboard (10 mins), 30% Admin Dashboard (5 mins)
📋 What's Included: Day 1 (Backend APIs):
Order CRUD with bulk operations
Shipment management with intelligent carrier selection
Analytics endpoints for dashboards
Rate card & zone management
~35+ API endpoints total
Day 2 (Frontend Integration):
API client infrastructure with React Query
Connect all critical pages (Dashboard, Orders, Shipments, Warehouses)
Replace ALL mock data with real API calls
Loading states, error handling, toast notifications
Day 3 (Polish & Demo Prep):
Seed 200+ realistic fashion orders/shipments
Test all user flows (order → shipment → tracking)
UI/UX polish (skeletons, empty states)
Detailed 15-minute demo script with specific examples
Final QA and performance optimization
🎯 Key Differentiators:
Intelligent Carrier Selection - Demonstrates AI-like decision making with a scoring algorithm (cost 70% + speed 30%)
Fashion Industry Focus - Relatable demo data (T-shirts ₹299, Jeans ₹999, Shoes ₹1499)
Realistic Scale - 3 companies, 200 shipments, 96.4% success rate
Production Feel - Professional UI, real-time updates, audit logging

The plan is in /shipcrowd/.claude/plans/3day.md. Let me know if you'd like me to adjust anything - priorities, timelines, features, or technical approaches!