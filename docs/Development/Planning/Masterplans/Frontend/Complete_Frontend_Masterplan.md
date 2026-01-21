# Helix Frontend Implementation Plan
## Complete Roadmap to 100% Feature Completion

**Created**: 2026-01-13 | **Updated**: 2026-01-14
**Scope**: All features from Feature_List.md + Advanced.md (200+ features)
**Approach**: Hybrid Backend-First (90% Real API + 10% Mock Data)
**Timeline**: 10 Weeks (Organized by Phase → Priority → Domain)
**Backend**: Running on port 5005 | 28 seeders | 8K-15K records

---

## Executive Summary

### Current State Analysis
- **Total Pages**: 63 (11 auth, 1 tracking, 21 seller dashboard, 25 admin dashboard, 5 root)
- **Total Components**: 51 (5 UI primitives, 4 forms, 7 feedback, 2 data display, 2 layout, 4 shared, 27 domain-specific)
- **API Integration Layer**: Complete with React Query hooks (20+ hooks)
- **Type Definitions**: Full TypeScript coverage matching backend DTOs
- **Mock Data Patterns**: Established in `/lib/mockData.ts` and `/app/track/data/mockShipments.ts`
- **Design System**: Tailwind CSS v4 + Custom CSS Variables (Premium Software Aesthetic)

### Backend Status (Verified 2026-01-14)
- **Server**: Running on `http://localhost:5005/api/v1` ✅
- **Database**: MongoDB with 28 seeders, 8K-15K records ✅
- **API Endpoints**: 385+ routes ✅
- **Real API Ready**:
  - ✅ Wallet System: `/finance/wallet/*` (balance, transactions, recharge, stats)
  - ✅ COD Remittance: `/finance/cod/*` (remittances, analytics)
  - ✅ Weight Disputes: `/disputes/weight/*` (list, create, resolve)
  - ✅ NDR Management: `/ndr/*` (events, automation)
  - ✅ Orders & Shipments: Full CRUD operations
  - ✅ Analytics: Dashboard, revenue, shipments, courier performance
  - ✅ Integrations: Shopify, WooCommerce setup
- **Mock Data Only**:
  - ⚠️ Returns Management: Backend API 0% complete (use mock DTOs)

### Business Impact Features (80-20 Rule Priority)
1. **COD Remittance Dashboard** (₹85-180K/month revenue) - P0
2. **Wallet System UI** (₹120-250K/month revenue) - P0
3. **Weight Dispute Management** (10-15% shipments affected) - P0
4. **NDR Exception Handling** (15-20% shipments) - P0
5. **Returns Management Portal** (8-12% shipments) - P1
6. **Bulk Operations** (60% efficiency gain) - P1
7. **Advanced Analytics** (Decision-making critical) - P1
8. **E-Commerce Integrations UI** (Shopify, WooCommerce, Amazon, Flipkart) - P2

### Hybrid Implementation Strategy

**Data Source Approach: Backend-First with Fallback**

| Feature Domain | Data Source | Rationale |
|----------------|-------------|-----------|
| **Wallet System** | Real API ✅ | Backend complete, 8K-15K transactions seeded |
| **COD Remittance** | Real API ✅ | Backend complete, remittance batches seeded |
| **Weight Disputes** | Real API ✅ | Backend complete, disputes seeded |
| **NDR Management** | Real API ✅ | Backend complete, NDR events seeded |
| **Orders & Shipments** | Real API ✅ | Backend complete, full CRUD ready |
| **Analytics** | Real API ✅ | Backend complete, all dashboards ready |
| **Integrations** | Real API ✅ | Shopify, WooCommerce routes exist |
| **Returns Management** | Mock Data ⚠️ | Backend 0%, use mockData pattern |

**Implementation Pattern**:
```typescript
// Example: Wallet hooks using real API
const { data } = useWalletBalance(); // → GET /finance/wallet/balance

// Example: Returns using mock data (fallback)
const { data } = useReturns(); // → /lib/mockData/returns.ts
```

**Benefits**:
- ✅ **Faster shipping**: No duplicate work (build mocks → replace with API)
- ✅ **Real data testing**: Test with 8K-15K seeded records
- ✅ **Production-ready**: API integration done from day 1
- ✅ **3 weeks saved**: Compared to mock-first approach

---

## Gap Analysis Matrix

### ✅ IMPLEMENTED (Existing Features)

#### Authentication & Security
- ✅ Login Page (`/login`) - Email/Password, Magic Link, OAuth (Google, GitHub, Microsoft)
- ✅ Signup Page (`/signup`) - Multi-step with email verification
- ✅ Forgot Password Flow (`/forgot-password`, `/reset-password`)
- ✅ Email Verification (`/verify-email`)
- ✅ Magic Link Auth (`/auth/magic-link`)
- ✅ OAuth Callback Handler (`/auth/callback`)
- ✅ Onboarding Flow (`/onboarding`) - Company setup, KYC, integration
- ✅ Profile Settings - Password change, MFA setup (TOTP)

#### Public Tracking
- ✅ Advanced Tracking Page (`/track`) - 3D visualization, maps, confetti effects, easter eggs
- ✅ Real-time Status Updates (mock data)
- ✅ Delivery Timeline Visualization
- ✅ Exception Handling Display

#### Seller Dashboard (21 Pages)
- ✅ Dashboard Home (`/seller/dashboard`)
- ✅ Orders Management (`/seller/orders`) - List, create, bulk upload
- ✅ Single Order Creation (`/seller/orders/create`)
- ✅ Bulk Orders Upload (`/seller/orders/bulk-upload`)
- ✅ Shipments List (`/seller/shipments`)
- ✅ Create Shipment (`/seller/shipments/create`)
- ✅ Print Labels (`/seller/shipments/print-labels`)
- ✅ NDR Management (`/seller/ndr`)
- ✅ COD Orders (`/seller/cod`)
- ✅ Rate Calculator (`/seller/rates`)
- ✅ Warehouse Management (`/seller/warehouses`)
- ✅ Financial Overview (`/seller/financials`)
- ✅ Integrations Hub (`/seller/integrations`) - Shopify, WooCommerce, Custom API
- ✅ KYC Management (`/seller/kyc`)
- ✅ Settings (`/seller/settings`) - Profile, notifications, API keys, webhooks

#### Admin Dashboard (25 Pages)
- ✅ Admin Home (`/admin/dashboard`)
- ✅ Analytics Overview (`/admin/analytics`)
- ✅ Revenue Analytics (`/admin/analytics/revenue`)
- ✅ Shipment Analytics (`/admin/analytics/shipments`)
- ✅ Courier Performance (`/admin/analytics/courier-performance`)
- ✅ Orders Management (`/admin/orders`)
- ✅ Seller Management (`/admin/sellers`)
- ✅ Courier Partners (`/admin/couriers`)
- ✅ Rate Cards (`/admin/rate-cards`)
- ✅ Billing Overview (`/admin/billing`)
- ✅ Returns Management (`/admin/returns`)
- ✅ Coupons Management (`/admin/coupons`)
- ✅ Support Tickets (`/admin/support`)
- ✅ Business Intelligence (`/admin/intelligence`)

#### UI Components (51 Components)
- ✅ UI Primitives: Button, Card, Input, Badge, Textarea
- ✅ Form Components: FormInput, Select, DateRangePicker, PasswordStrengthIndicator
- ✅ Feedback: Modal, Alert, Loader (4 variants), Toast, Tooltip
- ✅ Data Display: DataTable, Skeleton variants
- ✅ Layout: Navigation, Footer
- ✅ Shared: ThemeProvider, ErrorBoundary, NotificationCenter, ProfileDropdown
- ✅ Domain-Specific: Headers, Sidebars, Metrics, Charts

#### Mock Data Infrastructure
- ✅ Mock Shipments (`/lib/mockData.ts`) - 8 complete records
- ✅ Mock Orders (`/lib/mockData.ts`) - 4 records
- ✅ Mock Analytics Data
- ✅ Mock Companies (3 records)
- ✅ Mock Notifications (`/components/shared/NotificationCenter.tsx`)
- ✅ Advanced Tracking Mock Data (`/app/track/data/mockShipments.ts`) - DEMO, DELIVERED, ROCKET easter eggs

### ⚠️ PARTIALLY IMPLEMENTED (Needs Enhancement)

#### Financial Features (Backend API Missing)
- ⚠️ COD Management Page (`/seller/cod`) - UI exists, needs mock COD remittance data
- ⚠️ Financial Overview (`/seller/financials`) - Basic UI, needs wallet integration
- ⚠️ Admin Billing (`/admin/billing`) - Exists but needs detailed invoice views

#### Weight Dispute (API Incomplete)
- ⚠️ Weight Dispute UI - No dedicated page, needs full workflow

#### Integrations (UI Exists, Needs Expansion)
- ⚠️ E-Commerce Integrations (`/seller/integrations`) - Basic UI, needs detailed setup flows

### ❌ MISSING (Critical Features to Implement)

#### P0 - Revenue Critical (Weeks 1-4)

**1. COD Remittance Dashboard** (₹85-180K/month impact)
- ❌ COD Remittance Overview Page (`/seller/cod/remittance`)
- ❌ Remittance History Table with filters (date range, status, courier)
- ❌ Pending Remittances Section
- ❌ UTR Tracking Integration
- ❌ Discrepancy Reporting UI
- ❌ Remittance Calendar View
- ❌ Export to Excel/PDF functionality
- ❌ Mock Data: 50+ remittance records matching `CODRemittanceDTO`

**2. Wallet System UI** (₹120-250K/month impact)
- ❌ Wallet Dashboard (`/seller/wallet`)
- ❌ Current Balance Display (main wallet + sub-wallets)
- ❌ Transaction History (infinite scroll, filters)
- ❌ Add Money Flow (Payment Gateway Integration UI mock)
- ❌ Withdraw Money Flow (Bank account verification)
- ❌ Wallet-to-Wallet Transfer
- ❌ Automatic Top-up Settings
- ❌ Low Balance Alerts
- ❌ Transaction Receipts (Download PDF)
- ❌ Mock Data: 200+ wallet transactions matching `WalletTransactionDTO`

**3. Weight Dispute Management** (10-15% shipments affected)
- ❌ Weight Disputes Dashboard (`/seller/disputes/weight`)
- ❌ Dispute List (status: PENDING, UNDER_REVIEW, RESOLVED, REJECTED)
- ❌ Create Dispute Form (upload proof images, weight evidence)
- ❌ Dispute Details View (timeline, courier response, resolution)
- ❌ Bulk Dispute Actions
- ❌ Admin Dispute Review Panel (`/admin/disputes/weight`)
- ❌ Mock Data: 30+ disputes matching `WeightDisputeDTO`

**4. NDR Enhancement** (15-20% shipments)
- ❌ NDR Action Dashboard (existing `/seller/ndr` needs expansion)
- ❌ Bulk NDR Actions (reschedule, RTO, address update)
- ❌ Automated NDR Rules Configuration
- ❌ Customer Communication Templates
- ❌ NDR Analytics (reasons breakdown, resolution rates)
- ❌ Mock Data: 40+ NDR cases with varied scenarios

#### P1 - High Impact (Weeks 5-8)

**5. Returns Management Portal** (8-12% shipments)
- ❌ Returns Dashboard (`/seller/returns`)
- ❌ Initiate Return Flow (QC standards, refund policy)
- ❌ Return Requests Table (status tracking)
- ❌ Return Label Generation
- ❌ QC Inspection Results
- ❌ Refund Processing Status
- ❌ Returns Analytics
- ❌ Admin Returns Hub (`/admin/returns` enhancement)
- ❌ Mock Data: 25+ return requests matching `ReturnDTO`

**6. Address Validation UI**
- ❌ Address Validation Component (reusable)
- ❌ Pincode Serviceability Checker
- ❌ Address Autocomplete (Indian addresses)
- ❌ Bulk Address Validation (CSV upload)
- ❌ Serviceability Map View
- ❌ Integration in Order Creation Flow
- ❌ Mock Data: 1000+ pincode database with courier coverage

**7. Bulk Operations Enhancement**
- ❌ Bulk Order Status Update (`/seller/orders/bulk-update`)
- ❌ Bulk Label Download (ZIP file)
- ❌ Bulk Manifest Generation
- ❌ Bulk Shipment Cancellation
- ❌ Bulk CSV Export (orders, shipments, COD)
- ❌ Progress Tracking for Bulk Operations
- ❌ Error Handling UI (partial success scenarios)

**8. Advanced Analytics**
- ❌ Custom Reports Builder (`/seller/analytics/custom`)
- ❌ SLA Performance Tracking
- ❌ Courier Comparison Tool
- ❌ Cost Analysis Dashboard
- ❌ Predictive Analytics (delivery time estimates)
- ❌ Export Scheduled Reports
- ❌ Admin Global Analytics (`/admin/analytics/global`)

#### P2 - Enhancement (Weeks 9-12)

**9. E-Commerce Integration Setup Wizards**
- ❌ Shopify Integration Wizard (`/seller/integrations/shopify/setup`)
- ❌ WooCommerce Setup Flow (`/seller/integrations/woocommerce/setup`)
- ❌ Amazon Seller Integration (`/seller/integrations/amazon/setup`)
- ❌ Flipkart Integration (`/seller/integrations/flipkart/setup`)
- ❌ Custom API Documentation Viewer
- ❌ Integration Health Monitoring
- ❌ Sync Status Dashboard

**10. Rate Card Management Enhancement**
- ❌ Rate Card Comparison Tool (`/seller/rates/compare`)
- ❌ Custom Rate Card Builder (for admins)
- ❌ Rate History Tracking
- ❌ Special Rate Requests UI
- ❌ Zone-wise Rate Visualization
- ❌ Peak Season Surcharge Calculator

**11. Manifest Management**
- ❌ Manifest Dashboard (`/seller/manifests`)
- ❌ Create Manifest Flow (select shipments)
- ❌ Manifest History
- ❌ Print Manifest (PDF)
- ❌ Manifest Reconciliation
- ❌ Admin Manifest Oversight (`/admin/manifests`)

**12. Customer Communication Center**
- ❌ SMS/Email Templates Manager (`/seller/communication/templates`)
- ❌ Automated Notification Rules
- ❌ Communication History
- ❌ WhatsApp Integration UI (mock)
- ❌ Bulk Communication Tool

**13. Fraud Detection Dashboard** (Admin Only)
- ❌ Fraud Alerts Dashboard (`/admin/security/fraud`)
- ❌ Suspicious Activity Monitoring
- ❌ Blocked Sellers/Addresses List
- ❌ Fraud Rules Configuration
- ❌ Investigation Tools

**14. Subscription & Billing Enhancement**
- ❌ Subscription Plans Page (`/seller/subscription`)
- ❌ Plan Comparison UI
- ❌ Upgrade/Downgrade Flow
- ❌ Billing History (detailed invoices)
- ❌ Payment Method Management
- ❌ Invoice Download (GST compliant)

**15. Advanced Settings**
- ❌ Webhook Configuration UI (`/seller/settings/webhooks`)
- ❌ API Key Management (rotate, revoke)
- ❌ White-label Settings (for enterprise)
- ❌ Notification Preferences (granular)
- ❌ Team Management (multi-user access)
- ❌ Audit Logs Viewer

---

## Implementation Roadmap

### Organization Strategy (Hybrid Approach)

Each sprint combines:
1. **Domain Focus**: Grouped by business domain (Financial, Operations, Analytics)
2. **User Journey**: Aligned with seller/admin workflows
3. **Sprint Cadence**: Weekly deliverables with clear milestones
4. **Priority Matrix**: P0 → P1 → P2 based on business impact

---

## WEEK 1-2: COD Remittance System (P0)
**Domain**: Financial Management
**User Journey**: Seller COD Settlement Flow
**Business Impact**: ₹85-180K/month revenue

### Sprint 1.1: COD Remittance Dashboard Foundation

#### Tasks
1. **Create Mock Data Structure**
   - File: `/src/lib/mockData/codRemittance.ts`
   - Generate 50+ remittance records matching `CODRemittanceDTO`:
     ```typescript
     interface CODRemittanceDTO {
       id: string;
       sellerId: string;
       courierPartner: 'DELHIVERY' | 'BLUEDART' | 'ECOM_EXPRESS';
       remittanceDate: Date;
       settlementDate: Date | null;
       totalCODAmount: number;
       courierCharges: number;
       netPayable: number;
       utrNumber: string | null;
       status: 'PENDING' | 'PROCESSING' | 'SETTLED' | 'DISCREPANCY';
       shipmentIds: string[];
       discrepancies: {
         type: 'MISSING_SHIPMENT' | 'AMOUNT_MISMATCH';
         details: string;
       }[];
     }
     ```
   - Include data patterns:
     - 60% SETTLED with UTR numbers
     - 25% PENDING (within 7 days)
     - 10% DISCREPANCY (amount mismatches)
     - 5% PROCESSING (recent)
   - Date range: Last 6 months
   - Amount range: ₹5,000 - ₹2,50,000 per remittance

2. **Create Remittance Overview Page**
   - File: `/app/seller/cod/remittance/page.tsx`
   - Components to create:
     - `RemittanceOverviewClient.tsx` (main client component)
     - `RemittanceStatsCards.tsx` (4 cards: Total Pending, This Month, Average Time, Discrepancies)
     - `RemittanceTable.tsx` (sortable, filterable table)
     - `RemittanceFilters.tsx` (date range, courier, status)

3. **Build Remittance Stats Cards**
   - File: `/components/seller/cod/RemittanceStatsCards.tsx`
   - 4 Cards:
     - **Total Pending**: Sum of PENDING + PROCESSING amounts
     - **This Month Settled**: Sum of SETTLED in current month
     - **Avg Settlement Time**: Calculate average days (remittanceDate → settlementDate)
     - **Active Discrepancies**: Count of DISCREPANCY status
   - Use existing Card component from `/components/ui/Card.tsx`
   - CSS: Follow `globals.css` variables (`--primary-blue`, `--bg-primary`, `--text-primary`)

4. **Build Remittance Table Component**
   - File: `/components/seller/cod/RemittanceTable.tsx`
   - Extend existing `DataTable` component
   - Columns:
     - Remittance ID (clickable)
     - Courier Partner (badge with logo)
     - Remittance Date
     - COD Amount (formatted: ₹1,23,456.00)
     - Courier Charges
     - Net Payable
     - UTR Number (copyable)
     - Status (colored badge)
     - Actions (View Details, Download Receipt)
   - Features:
     - Sort by date, amount, status
     - Pagination (20 per page)
     - Bulk selection for export
   - Use `react-table` or custom implementation matching existing pattern

5. **Build Filters Component**
   - File: `/components/seller/cod/RemittanceFilters.tsx`
   - Filters:
     - Date Range Picker (use existing `DateRangePicker`)
     - Courier Partner Multi-Select
     - Status Multi-Select
     - Amount Range Slider
     - Search by UTR/ID
   - Reset Filters button
   - Apply button with loading state

6. **Create React Query Hook**
   - File: `/src/hooks/api/useCODRemittance.ts`
   - Hooks:
     ```typescript
     useRemittanceList(filters: RemittanceFilters)
     useRemittanceById(id: string)
     useRemittanceStats()
     ```
   - Mock implementation using `/lib/mockData/codRemittance.ts`
   - Simulate 300ms API delay

### Sprint 1.2: Remittance Details & Discrepancy Handling

#### Tasks
7. **Create Remittance Details Page**
   - File: `/app/seller/cod/remittance/[id]/page.tsx`
   - Sections:
     - Remittance Header (ID, Date, Status, UTR)
     - Summary Cards (COD Amount, Charges, Net Payable)
     - Shipment List (all shipments in this remittance)
     - Timeline (Remittance Created → Processing → Settled)
     - Discrepancy Section (if status = DISCREPANCY)
     - Download Receipt Button

8. **Build Shipment List in Remittance**
   - File: `/components/seller/cod/RemittanceShipmentList.tsx`
   - Table with columns:
     - Shipment ID
     - Order ID
     - Customer Name
     - COD Amount
     - Status
     - Delivered Date
   - Link to shipment details page
   - Total COD calculation at bottom

9. **Create Discrepancy Reporting Form**
   - File: `/components/seller/cod/DiscrepancyReportForm.tsx`
   - Form fields:
     - Discrepancy Type (dropdown: Missing Shipment, Amount Mismatch, Other)
     - Affected Shipment IDs (multi-select)
     - Expected Amount
     - Actual Amount
     - Description (textarea)
     - Proof Upload (image/PDF)
   - Validation using existing validators
   - Success toast on submission

10. **Build Remittance Calendar View**
    - File: `/app/seller/cod/remittance/calendar/page.tsx`
    - Component: `RemittanceCalendar.tsx`
    - Use `react-big-calendar` or custom calendar
    - Show remittances on calendar by remittanceDate
    - Color coding by status
    - Click to view details
    - Month/Week/Day views

11. **Create Export Functionality**
    - File: `/utils/exports/remittanceExport.ts`
    - Functions:
      ```typescript
      exportRemittanceToExcel(data: CODRemittanceDTO[])
      exportRemittanceToPDF(remittance: CODRemittanceDTO)
      ```
    - Use `xlsx` for Excel, `jspdf` for PDF
    - PDF template matching invoice design
    - Trigger download on button click

12. **Testing & Polish**
    - Test all filters combinations
    - Verify calculations (totals, averages)
    - Check responsive design (mobile, tablet)
    - Ensure theme consistency (light/dark mode)
    - Add loading skeletons
    - Error states for empty data

---

## WEEK 3-4: Wallet System UI (P0)
**Domain**: Financial Management
**User Journey**: Seller Wallet Operations
**Business Impact**: ₹120-250K/month revenue

### Sprint 2.1: Wallet Dashboard Core

#### Tasks
1. **Create Mock Wallet Data**
   - File: `/src/lib/mockData/wallet.ts`
   - Generate 200+ wallet transactions matching `WalletTransactionDTO`:
     ```typescript
     interface WalletTransactionDTO {
       id: string;
       walletId: string;
       type: 'CREDIT' | 'DEBIT';
       amount: number;
       balanceAfter: number;
       category: 'RECHARGE' | 'SHIPMENT_CHARGE' | 'REFUND' | 'WITHDRAWAL' | 'TRANSFER';
       description: string;
       referenceId: string; // Order/Shipment ID
       status: 'PENDING' | 'COMPLETED' | 'FAILED';
       createdAt: Date;
       metadata: {
         paymentMethod?: 'UPI' | 'NETBANKING' | 'CARD';
         utrNumber?: string;
         bankAccount?: string;
       };
     }

     interface WalletDTO {
       id: string;
       sellerId: string;
       currentBalance: number;
       subWallets: {
         prepaid: number;
         cod: number;
         refund: number;
       };
       lowBalanceThreshold: number;
       autoTopup: {
         enabled: boolean;
         triggerAmount: number;
         rechargeAmount: number;
       };
     }
     ```
   - Transaction patterns:
     - 40% SHIPMENT_CHARGE (debits)
     - 30% RECHARGE (credits)
     - 20% REFUND (credits)
     - 10% WITHDRAWAL (debits)
   - Date range: Last 12 months
   - Balance simulation: Start ₹50,000, fluctuate based on transactions

2. **Create Wallet Dashboard Page**
   - File: `/app/seller/wallet/page.tsx`
   - Layout:
     - Balance Cards (top)
     - Quick Actions (center)
     - Recent Transactions (bottom)
   - Components:
     - `WalletOverviewClient.tsx`
     - `WalletBalanceCards.tsx`
     - `WalletQuickActions.tsx`
     - `WalletTransactionHistory.tsx`

3. **Build Balance Cards**
   - File: `/components/seller/wallet/WalletBalanceCards.tsx`
   - 4 Cards:
     - **Main Wallet**: Large card with total balance, trend chart (last 30 days)
     - **Prepaid Sub-Wallet**: Balance, usage percentage
     - **COD Sub-Wallet**: Balance, auto-settlement info
     - **Refund Sub-Wallet**: Balance, pending refunds count
   - Each card:
     - Balance in large text (₹ format)
     - Change indicator (+/- with percentage)
     - Mini chart using `recharts`
   - Use `--primary-blue` for positive, `--error` for negative

4. **Build Quick Actions Section**
   - File: `/components/seller/wallet/WalletQuickActions.tsx`
   - 4 Action Cards (clickable):
     - **Add Money**: Opens modal
     - **Withdraw**: Opens modal
     - **Transfer**: Opens modal
     - **View All Transactions**: Link to `/seller/wallet/transactions`
   - Each card:
     - Icon (use `lucide-react`)
     - Title
     - Description
     - Hover effect (scale + shadow)

5. **Build Transaction History Component**
   - File: `/components/seller/wallet/WalletTransactionHistory.tsx`
   - Show last 10 transactions
   - Table columns:
     - Date & Time
     - Description
     - Category (badge)
     - Type (CREDIT/DEBIT with icon)
     - Amount (colored: green for credit, red for debit)
     - Balance After
     - Status
     - Reference ID (clickable)
   - "View All" button at bottom

6. **Create React Query Hooks**
   - File: `/src/hooks/api/useWallet.ts`
   - Hooks:
     ```typescript
     useWallet() // Get wallet details
     useWalletTransactions(filters: TransactionFilters)
     useWalletStats()
     useMutationAddMoney()
     useMutationWithdraw()
     useMutationTransfer()
     ```
   - Mock implementation with optimistic updates

### Sprint 2.2: Wallet Operations & Transaction Management

#### Tasks
7. **Create Add Money Modal**
   - File: `/components/seller/wallet/AddMoneyModal.tsx`
   - Multi-step flow:
     - **Step 1**: Enter amount (validation: min ₹100, max ₹1,00,000)
     - **Step 2**: Select payment method (UPI, NetBanking, Card - radio buttons)
     - **Step 3**: Payment gateway UI (mock)
     - **Step 4**: Success confirmation with transaction ID
   - Form validation using existing patterns
   - Loading states for each step
   - Close/Cancel handling

8. **Create Withdraw Money Modal**
   - File: `/components/seller/wallet/WithdrawMoneyModal.tsx`
   - Multi-step flow:
     - **Step 1**: Enter amount (validation: min ₹500, max = current balance)
     - **Step 2**: Select bank account (dropdown with saved accounts)
     - **Step 3**: Confirm withdrawal (show charges if any)
     - **Step 4**: Success with UTR number (mock)
   - Show withdrawal limits/guidelines
   - Add new bank account option

9. **Create Transfer Modal**
   - File: `/components/seller/wallet/TransferModal.tsx`
   - Fields:
     - From Sub-Wallet (dropdown)
     - To Sub-Wallet (dropdown)
     - Amount
     - Remarks
   - Validation: Cannot transfer to same wallet
   - Success toast

10. **Create All Transactions Page**
    - File: `/app/seller/wallet/transactions/page.tsx`
    - Full transaction history with:
      - Advanced filters (date range, category, type, status)
      - Search by reference ID
      - Infinite scroll or pagination
      - Export to Excel
    - Components:
      - `TransactionFilters.tsx`
      - `TransactionTable.tsx`
      - `TransactionDetailsModal.tsx`

11. **Build Transaction Details Modal**
    - File: `/components/seller/wallet/TransactionDetailsModal.tsx`
    - Show full transaction details:
      - Transaction ID
      - Date & Time
      - Type & Category
      - Amount
      - Balance Before/After
      - Status
      - Reference ID (link to order/shipment)
      - Payment Method (if applicable)
      - UTR Number (if applicable)
      - Download Receipt button

12. **Create Automatic Top-up Settings**
    - File: `/app/seller/wallet/settings/page.tsx`
    - Settings:
      - Enable/Disable Auto Top-up (toggle)
      - Low Balance Threshold (₹)
      - Recharge Amount (₹)
      - Payment Method (saved cards/bank)
      - Low Balance Alert (email/SMS)
    - Save with validation
    - Success toast

13. **Build Wallet Analytics**
    - File: `/app/seller/wallet/analytics/page.tsx`
    - Charts:
      - Balance trend (line chart - last 6 months)
      - Category-wise spending (pie chart)
      - Monthly income vs expenses (bar chart)
      - Average daily balance
    - Use `recharts` library
    - Export chart as image

14. **Testing & Polish**
    - Test all modals (open/close, validation)
    - Verify balance calculations
    - Check transaction filtering
    - Responsive design
    - Loading states
    - Error handling

---

## WEEK 5-6: Weight Dispute Management (P0)
**Domain**: Operations Management
**User Journey**: Seller Dispute Resolution
**Business Impact**: 10-15% shipments affected

### Sprint 3.1: Dispute Dashboard & Creation

#### Tasks
1. **Create Mock Dispute Data**
   - File: `/src/lib/mockData/weightDisputes.ts`
   - Generate 30+ disputes matching `WeightDisputeDTO`:
     ```typescript
     interface WeightDisputeDTO {
       id: string;
       shipmentId: string;
       sellerId: string;
       courierPartner: string;
       disputeReason: string;
       sellerClaimedWeight: number;
       courierChargedWeight: number;
       sellerProof: {
         type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
         url: string;
       }[];
       courierResponse: string | null;
       status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED_FAVOR_SELLER' | 'RESOLVED_FAVOR_COURIER' | 'REJECTED';
       resolution: {
         finalWeight: number;
         refundAmount: number;
         resolvedBy: string;
         resolvedAt: Date;
         notes: string;
       } | null;
       createdAt: Date;
       updatedAt: Date;
     }
     ```
   - Status distribution:
     - 40% PENDING
     - 30% UNDER_REVIEW
     - 20% RESOLVED_FAVOR_SELLER
     - 10% RESOLVED_FAVOR_COURIER/REJECTED

2. **Create Disputes Dashboard Page**
   - File: `/app/seller/disputes/weight/page.tsx`
   - Layout:
     - Stats cards
     - Create Dispute button
     - Disputes table with filters
   - Components:
     - `WeightDisputesClient.tsx`
     - `DisputeStatsCards.tsx`
     - `DisputesTable.tsx`
     - `DisputeFilters.tsx`

3. **Build Dispute Stats Cards**
   - File: `/components/seller/disputes/DisputeStatsCards.tsx`
   - 4 Cards:
     - **Active Disputes**: Count of PENDING + UNDER_REVIEW
     - **Resolution Rate**: (RESOLVED / Total) × 100
     - **Avg Resolution Time**: Days from creation to resolution
     - **Potential Refund**: Sum of disputed amounts
   - Use existing Card component

4. **Build Disputes Table**
   - File: `/components/seller/disputes/DisputesTable.tsx`
   - Columns:
     - Dispute ID
     - Shipment ID (link)
     - Courier Partner
     - Your Weight vs Charged Weight
     - Disputed Amount
     - Status (badge)
     - Created Date
     - Actions (View Details)
   - Sortable by date, amount, status
   - Color coding for status

5. **Create Dispute Form**
   - File: `/components/seller/disputes/CreateDisputeForm.tsx`
   - Fields:
     - Shipment ID (autocomplete from shipments)
     - Reason (textarea)
     - Your Claimed Weight (kg)
     - Courier Charged Weight (auto-filled)
     - Upload Proof (images/PDFs - max 5 files)
   - Validation:
     - Shipment must exist
     - Weight must be reasonable (0.01 - 100 kg)
     - At least 1 proof required
   - Submit with loading state

6. **Build File Upload Component**
   - File: `/components/seller/disputes/ProofUpload.tsx`
   - Features:
     - Drag & drop zone
     - Multiple file selection
     - Preview (images show thumbnail, PDFs show icon)
     - Remove file button
     - File size validation (max 5MB per file)
     - Supported formats: JPG, PNG, PDF
   - Use existing patterns from bulk upload

### Sprint 3.2: Dispute Details & Resolution

#### Tasks
7. **Create Dispute Details Page**
   - File: `/app/seller/disputes/weight/[id]/page.tsx`
   - Sections:
     - Dispute Header (ID, Status, Date)
     - Shipment Info Card
     - Weight Comparison Card
     - Your Proof Section (image gallery)
     - Courier Response Section
     - Resolution Section (if resolved)
     - Timeline (created → reviewed → resolved)
   - Components:
     - `DisputeDetailsClient.tsx`
     - `WeightComparisonCard.tsx`
     - `ProofGallery.tsx`
     - `DisputeTimeline.tsx`

8. **Build Weight Comparison Card**
   - File: `/components/seller/disputes/WeightComparisonCard.tsx`
   - Visual comparison:
     - Two columns: Your Weight | Courier Weight
     - Large numbers with kg unit
     - Difference highlighted
     - Disputed amount calculation
   - Use bar chart to visualize difference

9. **Build Proof Gallery**
   - File: `/components/seller/disputes/ProofGallery.tsx`
   - Features:
     - Grid layout (3 columns)
     - Image lightbox on click
     - PDF viewer modal
     - Download button for each file
   - Use `react-image-lightbox` or similar

10. **Build Dispute Timeline**
    - File: `/components/seller/disputes/DisputeTimeline.tsx`
    - Timeline steps:
      - Dispute Created (date, time, user)
      - Under Review (date, reviewer assigned)
      - Courier Response Received (date, response)
      - Resolved (date, resolution details)
    - Vertical timeline with icons
    - Active step highlighted

11. **Create Admin Dispute Review Panel**
    - File: `/app/admin/disputes/weight/page.tsx`
    - Admin features:
      - View all disputes (all sellers)
      - Assign disputes to reviewers
      - Review dispute details
      - Mark as Under Review
      - Resolve dispute (favor seller/courier)
      - Add internal notes
    - Components:
      - `AdminDisputeTable.tsx`
      - `DisputeReviewModal.tsx`
      - `ResolutionForm.tsx`

12. **Build Resolution Form (Admin)**
    - File: `/components/admin/disputes/ResolutionForm.tsx`
    - Fields:
      - Final Weight (kg)
      - Resolution (dropdown: Favor Seller, Favor Courier, Partial)
      - Refund Amount (auto-calculated)
      - Resolution Notes (textarea)
    - Submit with confirmation modal

13. **Create Bulk Dispute Actions**
    - File: `/components/seller/disputes/BulkDisputeActions.tsx`
    - Actions:
      - Export selected disputes to Excel
      - Withdraw selected disputes
      - Add note to multiple disputes
    - Bulk selection checkboxes in table

14. **Testing & Polish**
    - Test file uploads (size, format validation)
    - Verify weight calculations
    - Check timeline accuracy
    - Responsive design
    - Loading states

---

## WEEK 7-8: Returns Management Portal (P1)
**Domain**: Operations Management
**User Journey**: Seller Returns Handling
**Business Impact**: 8-12% shipments

### Sprint 4.1: Returns Dashboard

#### Tasks
1. **Create Mock Returns Data**
   - File: `/src/lib/mockData/returns.ts`
   - Generate 25+ return requests matching `ReturnDTO`:
     ```typescript
     interface ReturnDTO {
       id: string;
       orderId: string;
       shipmentId: string;
       sellerId: string;
       customerId: string;
       returnReason: 'DAMAGED' | 'WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'SIZE_ISSUE' | 'CUSTOMER_CHANGED_MIND' | 'OTHER';
       returnType: 'REFUND' | 'REPLACEMENT';
       status: 'INITIATED' | 'PICKUP_SCHEDULED' | 'IN_TRANSIT' | 'QC_PENDING' | 'QC_PASSED' | 'QC_FAILED' | 'REFUND_PROCESSED' | 'COMPLETED';
       qcDetails: {
         qcDate: Date;
         qcResult: 'PASS' | 'FAIL';
         qcNotes: string;
         images: string[];
       } | null;
       refundDetails: {
         refundAmount: number;
         refundMethod: 'ORIGINAL_PAYMENT' | 'WALLET' | 'BANK_TRANSFER';
         refundDate: Date;
         refundStatus: 'PENDING' | 'PROCESSED';
       } | null;
       pickupDetails: {
         scheduledDate: Date;
         pickupAddress: string;
         awbNumber: string;
       } | null;
       createdAt: Date;
       updatedAt: Date;
     }
     ```

2. **Create Returns Dashboard Page**
   - File: `/app/seller/returns/page.tsx`
   - Layout:
     - Stats cards
     - Initiate Return button
     - Returns table with filters
   - Components:
     - `ReturnsOverviewClient.tsx`
     - `ReturnStatsCards.tsx`
     - `ReturnsTable.tsx`
     - `ReturnFilters.tsx`

3. **Build Return Stats Cards**
   - File: `/components/seller/returns/ReturnStatsCards.tsx`
   - 4 Cards:
     - **Active Returns**: Count of non-completed
     - **QC Pending**: Count of QC_PENDING status
     - **Refund Amount**: Sum of pending refunds
     - **Return Rate**: (Returns / Total Orders) × 100
   - Trend indicators

4. **Build Returns Table**
   - File: `/components/seller/returns/ReturnsTable.tsx`
   - Columns:
     - Return ID
     - Order ID (link)
     - Customer Name
     - Return Reason (badge)
     - Return Type
     - Status (progress indicator)
     - Created Date
     - Actions (View Details)
   - Multi-status progress bar

5. **Create Initiate Return Flow**
   - File: `/components/seller/returns/InitiateReturnForm.tsx`
   - Steps:
     - **Step 1**: Select Order (from delivered orders)
     - **Step 2**: Return Reason & Type
     - **Step 3**: QC Standards to check
     - **Step 4**: Pickup Address
     - **Step 5**: Confirmation
   - Multi-step wizard UI

6. **Build Return Filters**
   - File: `/components/seller/returns/ReturnFilters.tsx`
   - Filters:
     - Date range
     - Return reason
     - Return type
     - Status
     - QC result
   - Reset & Apply buttons

### Sprint 4.2: Return Details & QC Management

#### Tasks
7. **Create Return Details Page**
   - File: `/app/seller/returns/[id]/page.tsx`
   - Sections:
     - Return Header
     - Order & Shipment Info
     - Return Timeline
     - QC Results (if available)
     - Refund Details (if applicable)
     - Pickup Tracking
   - Components:
     - `ReturnDetailsClient.tsx`
     - `ReturnTimeline.tsx`
     - `QCResultsCard.tsx`
     - `RefundDetailsCard.tsx`

8. **Build Return Timeline**
   - File: `/components/seller/returns/ReturnTimeline.tsx`
   - Timeline steps:
     - Return Initiated
     - Pickup Scheduled
     - In Transit
     - QC Inspection
     - Refund Processed
     - Completed
   - Visual progress indicator

9. **Build QC Results Card**
   - File: `/components/seller/returns/QCResultsCard.tsx`
   - Display:
     - QC Date
     - QC Result (PASS/FAIL badge)
     - QC Notes
     - QC Images (gallery)
     - QC Checklist (item condition, packaging, accessories)
   - If FAIL, show rejection reason

10. **Build Refund Details Card**
    - File: `/components/seller/returns/RefundDetailsCard.tsx`
    - Display:
      - Refund Amount
      - Refund Method
      - Refund Status
      - Refund Date
      - Transaction ID
    - Download refund receipt button

11. **Create Return Label Generation**
    - File: `/components/seller/returns/GenerateReturnLabel.tsx`
    - Generate return label for customer
    - Mock label PDF (similar to shipping label)
    - Download/Print/Email options

12. **Build Returns Analytics**
    - File: `/app/seller/returns/analytics/page.tsx`
    - Charts:
      - Return reasons breakdown (pie chart)
      - Return rate trend (line chart)
      - QC pass vs fail (bar chart)
      - Refund processing time (average)
    - Use `recharts`

13. **Create Admin Returns Hub**
    - File: `/app/admin/returns/page.tsx` (enhancement)
    - Admin features:
      - View all returns (all sellers)
      - QC approval/rejection
      - Refund processing
      - Bulk operations
    - Components:
      - `AdminReturnsTable.tsx`
      - `QCApprovalModal.tsx`
      - `RefundProcessingForm.tsx`

14. **Testing & Polish**
    - Test return flow end-to-end
    - Verify status transitions
    - Check refund calculations
    - Responsive design

---

## WEEK 9: Address Validation & Bulk Operations (P1)
**Domain**: Operations Enhancement
**User Journey**: Order Creation & Bulk Management

### Sprint 5.1: Address Validation System

#### Tasks
1. **Create Mock Pincode Database**
   - File: `/src/lib/mockData/pincodes.ts`
   - Generate 1000+ pincode records:
     ```typescript
     interface PincodeData {
       pincode: string;
       city: string;
       state: string;
       district: string;
       courierCoverage: {
         courier: string;
         serviceable: boolean;
         codAvailable: boolean;
         prepaidAvailable: boolean;
         estimatedDays: number;
       }[];
     }
     ```
   - Cover all Indian states
   - Realistic courier coverage patterns

2. **Create Address Validation Component**
   - File: `/components/shared/AddressValidation.tsx`
   - Features:
     - Pincode input with auto-validation
     - City/State auto-fill on valid pincode
     - Serviceability check (all couriers)
     - COD availability indicator
     - Estimated delivery days
   - Reusable across forms

3. **Build Pincode Serviceability Checker**
   - File: `/app/seller/tools/pincode-checker/page.tsx`
   - Features:
     - Enter pincode
     - View all courier coverage
     - Compare delivery times
     - Export coverage report
   - Table showing courier-wise serviceability

4. **Create Address Autocomplete**
   - File: `/components/shared/AddressAutocomplete.tsx`
   - Features:
     - Google Maps-style autocomplete
     - Mock address suggestions
     - Select to auto-fill form
   - Use in order creation

5. **Build Bulk Address Validation**
   - File: `/app/seller/tools/bulk-address-validation/page.tsx`
   - Features:
     - Upload CSV with pincodes
     - Validate all at once
     - Show results table (valid/invalid/unserviceable)
     - Export results
   - CSV template download

6. **Create Serviceability Map View**
   - File: `/app/seller/tools/serviceability-map/page.tsx`
   - Features:
     - India map with pincode coverage
     - Color-coded by coverage level
     - Filter by courier
     - Zoom to state/district
   - Use `react-simple-maps` or similar

7. **Integrate in Order Creation**
   - File: `/app/seller/orders/create/page.tsx` (enhancement)
   - Add address validation to delivery address section
   - Show courier recommendations based on pincode
   - Warn if pincode unserviceable

### Sprint 5.2: Bulk Operations Enhancement

#### Tasks
8. **Create Bulk Order Status Update**
   - File: `/app/seller/orders/bulk-update/page.tsx`
   - Features:
     - Select multiple orders (checkboxes)
     - Change status (dropdown)
     - Add note (optional)
     - Confirm with preview
   - Progress bar during update

9. **Build Bulk Label Download**
   - File: `/components/seller/shipments/BulkLabelDownload.tsx`
   - Features:
     - Select shipments
     - Download all labels as ZIP
     - Mock ZIP file generation
     - Progress indicator
   - Use `jszip` library

10. **Create Bulk Manifest Generation**
    - File: `/components/seller/shipments/BulkManifestGeneration.tsx`
    - Features:
      - Select shipments
      - Generate manifest PDF
      - Include all shipments in one document
      - Print/Download options

11. **Build Bulk Shipment Cancellation**
    - File: `/components/seller/shipments/BulkCancellation.tsx`
    - Features:
      - Select shipments (only eligible statuses)
      - Cancellation reason (dropdown)
      - Confirmation with count
      - Undo option (toast)

12. **Create Bulk CSV Export**
    - File: `/utils/exports/bulkExport.ts`
    - Export functions:
      ```typescript
      exportOrdersToCSV(orders: Order[])
      exportShipmentsToCSV(shipments: Shipment[])
      exportCODToCSV(codData: CODRemittance[])
      ```
    - Trigger from respective list pages
    - Include all columns

13. **Build Progress Tracking UI**
    - File: `/components/shared/BulkOperationProgress.tsx`
    - Features:
      - Progress bar (percentage)
      - Current item indicator
      - Success/Error count
      - Estimated time remaining
      - Cancel operation button

14. **Testing & Polish**
    - Test bulk operations with 100+ items
    - Verify CSV formats
    - Check ZIP generation
    - Error handling

---

## WEEK 10: Advanced Analytics & Reporting (P1)
**Domain**: Analytics & Insights
**User Journey**: Data-Driven Decision Making

### Sprint 6.1: Custom Reports & SLA Tracking

#### Tasks
1. **Create Custom Report Builder**
   - File: `/app/seller/analytics/custom/page.tsx`
   - Features:
     - Select metrics (checkboxes)
     - Choose dimensions (date, courier, zone)
     - Apply filters
     - Chart type selection
     - Generate report button
   - Components:
     - `ReportBuilderClient.tsx`
     - `MetricSelector.tsx`
     - `DimensionSelector.tsx`
     - `ChartTypeSelector.tsx`

2. **Build Metric Selector**
   - File: `/components/analytics/MetricSelector.tsx`
   - Metrics categories:
     - **Volume**: Orders, Shipments, Deliveries
     - **Performance**: Delivery Rate, RTO Rate, NDR Rate
     - **Financial**: Revenue, COD Collection, Wallet Balance
     - **Time**: Avg Delivery Time, Pickup Time, Transit Time
   - Multi-select with search

3. **Create SLA Performance Dashboard**
   - File: `/app/seller/analytics/sla/page.tsx`
   - Metrics:
     - Pickup SLA (within 24 hours)
     - Delivery SLA (expected vs actual)
     - NDR Response Time
     - COD Settlement Time
   - Charts:
     - SLA compliance trend
     - Courier-wise SLA comparison
     - SLA breach reasons
   - Use red/yellow/green indicators

4. **Build Courier Comparison Tool**
   - File: `/app/seller/analytics/courier-comparison/page.tsx`
   - Compare metrics:
     - Delivery success rate
     - Average delivery time
     - Cost per shipment
     - RTO percentage
     - NDR frequency
   - Side-by-side comparison table
   - Recommendation engine (best courier for route)

5. **Create Cost Analysis Dashboard**
   - File: `/app/seller/analytics/cost/page.tsx`
   - Analysis:
     - Shipping cost trend
     - Cost per zone
     - COD vs Prepaid cost
     - Weight discrepancy cost impact
     - Refund/Return costs
   - Charts:
     - Cost breakdown (pie chart)
     - Monthly cost trend (line chart)
     - Zone-wise cost heatmap

6. **Build Predictive Analytics**
   - File: `/app/seller/analytics/predictive/page.tsx`
   - Mock predictions:
     - Delivery time estimate (based on route history)
     - RTO likelihood score
     - Peak demand forecast (next 30 days)
     - Optimal courier recommendation
   - Use mock ML models
   - Confidence indicators

7. **Create Scheduled Reports**
   - File: `/app/seller/analytics/scheduled/page.tsx`
   - Features:
     - Create scheduled report (daily/weekly/monthly)
     - Select metrics & recipients (email)
     - Preview report
     - Report history (past generated reports)
   - Mock email delivery

### Sprint 6.2: Admin Global Analytics

#### Tasks
8. **Create Admin Global Analytics**
   - File: `/app/admin/analytics/global/page.tsx`
   - Platform-wide metrics:
     - Total sellers
     - Total orders/shipments
     - Platform revenue
     - Courier partner performance
     - Geographic distribution
   - Charts:
     - GMV trend
     - Seller acquisition
     - Top performing sellers
     - State-wise volume

9. **Build Revenue Analytics (Admin)**
   - File: `/app/admin/analytics/revenue/page.tsx` (enhancement)
   - Detailed revenue breakdown:
     - Subscription revenue
     - Commission revenue
     - Courier margin
     - Revenue by seller tier
   - Forecast next quarter

10. **Create Seller Performance Leaderboard**
    - File: `/app/admin/analytics/leaderboard/page.tsx`
    - Rank sellers by:
      - Volume
      - Revenue
      - Delivery success rate
      - Customer satisfaction (mock)
    - Top 10/50/100 filters
    - Export leaderboard

11. **Build Anomaly Detection Dashboard**
    - File: `/app/admin/analytics/anomalies/page.tsx`
    - Detect:
      - Sudden RTO spike
      - Unusual order volume
      - Delivery delays
      - Cost anomalies
    - Alerts with severity
    - Investigation tools

12. **Create Export Report Functionality**
    - File: `/utils/exports/analyticsExport.ts`
    - Export formats:
      - Excel (with charts)
      - PDF (formatted report)
      - CSV (raw data)
    - Include metadata (date range, filters)

13. **Build Report Sharing**
    - File: `/components/analytics/ShareReport.tsx`
    - Share options:
      - Copy shareable link
      - Email to team
      - Download locally
    - Access permissions (view only)

14. **Testing & Polish**
    - Verify chart accuracy
    - Test data filtering
    - Check export formats
    - Responsive design

---

## WEEK 11: E-Commerce Integrations UI (P2)
**Domain**: Integrations
**User Journey**: Platform Connectivity

### Sprint 7.1: Integration Setup Wizards

#### Tasks
1. **Create Shopify Integration Wizard**
   - File: `/app/seller/integrations/shopify/setup/page.tsx`
   - Steps:
     - **Step 1**: Connect to Shopify (enter store URL)
     - **Step 2**: OAuth authorization (mock)
     - **Step 3**: Settings (auto-fulfill, sync frequency)
     - **Step 4**: Field mapping (Shopify fields → Helix)
     - **Step 5**: Test connection & Complete
   - Components:
     - `ShopifyWizardClient.tsx`
     - `ShopifyAuthStep.tsx`
     - `FieldMappingStep.tsx`

2. **Build Field Mapping Component**
   - File: `/components/integrations/FieldMapping.tsx`
   - Features:
     - Drag & drop field matching
     - Default mappings
     - Custom field support
     - Validation rules
   - Reusable for all integrations

3. **Create WooCommerce Setup**
   - File: `/app/seller/integrations/woocommerce/setup/page.tsx`
   - Similar wizard:
     - Enter WordPress site URL
     - Install Helix plugin (instructions)
     - API key generation
     - Settings & mapping
     - Test & complete

4. **Build Amazon Seller Integration**
   - File: `/app/seller/integrations/amazon/setup/page.tsx`
   - Steps:
     - MWS credentials input
     - Seller ID verification
     - Marketplace selection (Amazon.in)
     - FBA vs FBM settings
     - Complete

5. **Create Flipkart Integration**
   - File: `/app/seller/integrations/flipkart/setup/page.tsx`
   - Steps:
     - Flipkart seller credentials
     - API token generation
     - Settings (auto-ship, tracking sync)
     - Complete

6. **Build Integration Health Monitor**
   - File: `/app/seller/integrations/health/page.tsx`
   - Monitor:
     - Connection status (connected/error)
     - Last sync time
     - Sync errors (if any)
     - Success/failure rate
   - Reconnect button if error

7. **Create Sync Status Dashboard**
   - File: `/app/seller/integrations/sync/page.tsx`
   - Show:
     - Orders synced (today/week/month)
     - Failed syncs (with error details)
     - Pending syncs
     - Manual sync button
   - Sync history table

### Sprint 7.2: Custom API & Webhooks

#### Tasks
8. **Create Custom API Documentation Viewer**
   - File: `/app/seller/integrations/api/docs/page.tsx`
   - Features:
     - Interactive API docs (Swagger-like)
     - Endpoint list with descriptions
     - Request/response examples
     - Authentication guide
     - Code snippets (cURL, JavaScript, Python)
   - Mock API endpoints

9. **Build API Key Management**
   - File: `/app/seller/settings/api-keys/page.tsx` (enhancement)
   - Features:
     - Generate new API key
     - View existing keys
     - Rotate/Revoke keys
     - Usage statistics per key
     - Expiry settings

10. **Create Webhook Configuration UI**
    - File: `/app/seller/settings/webhooks/page.tsx` (enhancement)
    - Features:
      - Add webhook URL
      - Select events (order.created, shipment.delivered, etc.)
      - Secret key for verification
      - Test webhook button
      - Webhook logs (recent events)

11. **Build Webhook Logs Viewer**
    - File: `/components/settings/WebhookLogs.tsx`
    - Display:
      - Event type
      - Timestamp
      - Payload (JSON viewer)
      - Response status
      - Retry count (if failed)
    - Filter by event type

12. **Create Integration Templates**
    - File: `/app/seller/integrations/templates/page.tsx`
    - Templates:
      - Shopify app code
      - WooCommerce plugin
      - WordPress shortcode
      - React component
    - Copy code button

13. **Build Integration Marketplace**
    - File: `/app/seller/integrations/marketplace/page.tsx`
    - List of available integrations:
      - E-commerce (Shopify, WooCommerce, Magento)
      - Marketplaces (Amazon, Flipkart, Meesho)
      - Accounting (Tally, Zoho Books)
      - CRM (Salesforce, HubSpot)
    - Install/Configure buttons

14. **Testing & Polish**
    - Test all wizards
    - Verify field mappings
    - Check webhook logs
    - Responsive design

---

## WEEK 12: Final Enhancements & Polish (P2)
**Domain**: System-Wide Improvements
**User Journey**: Overall UX Enhancement

### Sprint 8.1: Advanced Settings & Team Management

#### Tasks
1. **Create Team Management Page**
   - File: `/app/seller/settings/team/page.tsx`
   - Features:
     - Invite team members (email)
     - Role assignment (Admin, Manager, Viewer)
     - Permission matrix (granular)
     - Active sessions management
     - Revoke access
   - Components:
     - `TeamMemberList.tsx`
     - `InviteMemberForm.tsx`
     - `PermissionsMatrix.tsx`

2. **Build Permission Matrix**
   - File: `/components/settings/PermissionsMatrix.tsx`
   - Permissions:
     - Orders (create, view, edit, delete)
     - Shipments (create, view, cancel)
     - Financial (view, withdraw)
     - Settings (view, edit)
   - Role-based presets

3. **Create Audit Logs Viewer**
   - File: `/app/seller/settings/audit-logs/page.tsx`
   - Log all actions:
     - User actions (login, order created, settings changed)
     - Timestamp
     - IP address
     - User agent
   - Filters & export

4. **Build Notification Preferences**
   - File: `/app/seller/settings/notifications/page.tsx` (enhancement)
   - Granular settings:
     - Email notifications (checkboxes for each event)
     - SMS notifications
     - Push notifications
     - Frequency (real-time, daily digest)
   - Save preferences

5. **Create White-label Settings (Enterprise)**
   - File: `/app/seller/settings/white-label/page.tsx`
   - Settings:
     - Custom logo upload
     - Brand colors (primary, secondary)
     - Custom domain
     - Email templates customization
   - Preview changes

6. **Build Subscription Management**
   - File: `/app/seller/subscription/page.tsx`
   - Show:
     - Current plan
     - Plan features list
     - Usage (vs limits)
     - Billing cycle
     - Upgrade/Downgrade options
   - Components:
     - `PlanComparisonTable.tsx`
     - `UpgradeFlow.tsx`

7. **Create Plan Comparison Table**
   - File: `/components/subscription/PlanComparisonTable.tsx`
   - 6 tiers (from Feature_List.md):
     - Starter
     - Growth
     - Professional
     - Enterprise
     - Custom
   - Feature comparison (checkmarks)
   - Pricing display

### Sprint 8.2: Manifest Management & Final Polish

#### Tasks
8. **Create Manifest Dashboard**
   - File: `/app/seller/manifests/page.tsx`
   - Features:
     - Manifest list (recent)
     - Create manifest button
     - Manifest stats (total, pending pickup)
   - Components:
     - `ManifestListClient.tsx`
     - `ManifestTable.tsx`

9. **Build Create Manifest Flow**
   - File: `/app/seller/manifests/create/page.tsx`
   - Steps:
     - **Step 1**: Select courier partner
     - **Step 2**: Select shipments (checkboxes, filters)
     - **Step 3**: Review manifest
     - **Step 4**: Generate manifest
   - Multi-step wizard

10. **Create Manifest PDF Generator**
    - File: `/utils/pdf/manifestPDF.ts`
    - Generate manifest PDF:
      - Manifest ID, Date
      - Courier partner
      - Pickup address
      - Shipment list (AWB, destination, weight)
      - Total shipments, total weight
    - Print/Download

11. **Build Manifest Reconciliation**
    - File: `/app/seller/manifests/reconciliation/page.tsx`
    - Compare:
      - Manifested shipments vs Picked up
      - Missing shipments
      - Discrepancies
    - Actions: Mark picked up, report issue

12. **Create Admin Manifest Oversight**
    - File: `/app/admin/manifests/page.tsx`
    - View all manifests (all sellers)
    - Manifest analytics (on-time pickups, issues)
    - Courier-wise manifest volume

13. **Build Communication Templates Manager**
    - File: `/app/seller/communication/templates/page.tsx`
    - Template types:
      - Order confirmation
      - Shipment dispatched
      - Out for delivery
      - Delivered
      - NDR notification
      - Return initiated
    - Edit templates (variables: {customerName}, {trackingNumber})
    - Preview template

14. **Create Automated Notification Rules**
    - File: `/app/seller/communication/rules/page.tsx`
    - Rules:
      - Trigger (event type)
      - Condition (if status = X)
      - Action (send email/SMS)
      - Template selection
    - Enable/Disable rules

15. **Final UX Polish**
    - Add missing loading skeletons
    - Ensure consistent spacing (Tailwind)
    - Verify dark mode across all pages
    - Add empty states (illustrations)
    - Improve error messages
    - Add tooltips for complex features
    - Check mobile responsiveness
    - Add keyboard shortcuts (Cmd+K search)

16. **Global Search Implementation**
    - File: `/components/shared/GlobalSearch.tsx`
    - Search across:
      - Orders
      - Shipments
      - Customers
      - Settings
    - Keyboard shortcut (Cmd+K)
    - Recent searches

17. **Performance Optimization**
    - Lazy load heavy components
    - Optimize images (Next.js Image)
    - Reduce bundle size (code splitting)
    - Add React.memo where needed
    - Virtual scrolling for long lists

18. **Accessibility Audit**
    - Add ARIA labels
    - Keyboard navigation
    - Focus indicators
    - Screen reader testing
    - Color contrast check

---

## Mock Data Specifications

### Guidelines for Creating Mock Data

1. **Consistency with Backend DTOs**
   - All mock data MUST match backend types in `/server/src/types/`
   - Use exact field names, types, enums from DTOs
   - Include all required fields, omit optional fields where realistic

2. **Data Patterns**
   - **Dates**: Use realistic date ranges (last 6-12 months)
   - **Amounts**: Realistic Indian currency ranges (₹100 - ₹5,00,000)
   - **Status Distribution**: Follow real-world patterns (60% completed, 25% in-progress, 15% issues)
   - **Names**: Indian names for customers/sellers
   - **Addresses**: Real Indian cities, states, pincodes
   - **Phone**: Valid Indian mobile format (+91 XXXXX XXXXX)

3. **Data Volume**
   - **Orders**: 50-100 records
   - **Shipments**: 100-200 records
   - **Transactions**: 200-500 records
   - **Users**: 10-20 sellers, 5 admins
   - **Analytics**: 12 months of aggregated data

4. **Relationships**
   - Maintain referential integrity (orderId → shipmentId → trackingNumber)
   - Use consistent IDs across related entities

5. **Mock Data Files Structure**
   ```
   /src/lib/mockData/
   ├── index.ts (re-exports)
   ├── orders.ts
   ├── shipments.ts
   ├── codRemittance.ts
   ├── wallet.ts
   ├── weightDisputes.ts
   ├── returns.ts
   ├── pincodes.ts
   ├── users.ts
   ├── analytics.ts
   └── notifications.ts
   ```

6. **Mock API Hooks Pattern**
   ```typescript
   // /src/hooks/api/useOrders.ts
   export const useOrders = (filters?: OrderFilters) => {
     return useQuery({
       queryKey: ['orders', filters],
       queryFn: async () => {
         // Simulate API delay
         await new Promise(resolve => setTimeout(resolve, 300));

         // Filter mock data
         let data = MOCK_ORDERS;
         if (filters?.status) {
           data = data.filter(o => o.status === filters.status);
         }

         return data;
       }
     });
   };
   ```

---

## Design System Preservation

### CSS Variables (from globals.css)

**Light Mode**
- Primary: `--primary-blue: hsl(240, 100%, 57%)` (#2525FF)
- Background: `--bg-primary: hsl(0, 0%, 100%)` (Pure White)
- Background Secondary: `--bg-secondary: hsl(215, 25%, 97%)` (Ice White)
- Text: `--text-primary: hsl(222, 30%, 15%)` (Deep Obsidian)
- Text Secondary: `--text-secondary: hsl(220, 15%, 45%)`

**Dark Mode**
- Primary: `--primary-blue: #7B61FF` (Soft Purple-Blue)
- Background: `--bg-primary: hsl(230, 12%, 8%)` (Deep Obsidian)
- Background Secondary: `--bg-secondary: hsl(230, 10%, 12%)`
- Text: `--text-primary: hsl(210, 20%, 92%)`
- Borders: `--border: hsl(230, 10%, 18%)`

**Design Philosophy**
- Light: Crisp, clean, ice-white backgrounds
- Dark: Deep, cool-toned, NO shadows (flat design with borders)
- Consistent spacing (Tailwind utilities)
- Z-index hierarchy (header: 50, sidebar: 70, modal: 1050, toast: 1100)

### Component Patterns

1. **Cards**
   ```tsx
   <Card className="bg-bg-primary border border-border p-6">
     <h3 className="text-text-primary text-lg font-semibold">Title</h3>
     <p className="text-text-secondary">Description</p>
   </Card>
   ```

2. **Buttons**
   ```tsx
   <Button variant="primary" className="bg-primary-blue hover:bg-primary-blue/90">
     Action
   </Button>
   ```

3. **Badges**
   ```tsx
   <Badge variant="success" className="bg-success/10 text-success">
     Delivered
   </Badge>
   ```

4. **Tables**
   - Use existing `DataTable` component
   - Zebra striping for rows
   - Hover effect on rows
   - Sticky header

5. **Forms**
   - Use `FormInput` for consistency
   - Validation error states
   - Loading states on submit
   - Success toasts

---

## Testing & Verification

### Per-Feature Checklist

For each implemented feature, verify:

1. **Functional Requirements**
   - [ ] All user actions work (create, read, update, delete)
   - [ ] Filters apply correctly
   - [ ] Sorting works
   - [ ] Search returns relevant results
   - [ ] Pagination/infinite scroll works

2. **Data Integrity**
   - [ ] Mock data matches backend DTOs
   - [ ] Relationships are correct (order → shipment)
   - [ ] Calculations are accurate (totals, averages)
   - [ ] Date ranges are realistic

3. **UI/UX**
   - [ ] Follows design system (CSS variables)
   - [ ] Responsive (mobile, tablet, desktop)
   - [ ] Dark mode works
   - [ ] Loading states present
   - [ ] Empty states show helpful messages
   - [ ] Error states are clear

4. **Performance**
   - [ ] No unnecessary re-renders
   - [ ] Large lists are virtualized
   - [ ] Images are optimized
   - [ ] No console errors/warnings

5. **Accessibility**
   - [ ] Keyboard navigation works
   - [ ] Focus indicators visible
   - [ ] ARIA labels present
   - [ ] Color contrast sufficient

### Testing Method

Continue with existing testing approach:
- Manual testing in browser
- Test in both light and dark modes
- Test on different screen sizes
- Verify with existing mock data patterns

---

## Priority Matrix Summary

### P0 - Revenue Critical (Weeks 1-4) - MUST HAVE
- COD Remittance Dashboard (₹85-180K/month)
- Wallet System UI (₹120-250K/month)
- Weight Dispute Management (10-15% shipments)
- NDR Enhancement (15-20% shipments)

### P1 - High Impact (Weeks 5-9) - SHOULD HAVE
- Returns Management (8-12% shipments)
- Address Validation
- Bulk Operations
- Advanced Analytics

### P2 - Enhancement (Weeks 10-12) - NICE TO HAVE
- E-Commerce Integrations UI
- Rate Card Enhancements
- Manifest Management
- Communication Center
- Fraud Detection
- Advanced Settings

---

## Success Criteria

### Definition of Done (Per Feature)

A feature is considered 100% complete when:

1. **Implementation**
   - All pages/components created
   - Mock data generated and integrated
   - React Query hooks implemented
   - Navigation/routing working

2. **Design**
   - Follows design system (CSS variables)
   - Responsive across all breakpoints
   - Dark mode fully functional
   - Consistent with existing pages

3. **Data**
   - Mock data matches backend DTOs 100%
   - Realistic data patterns
   - Sufficient data volume for testing
   - Relationships maintained

4. **UX**
   - Loading states implemented
   - Error handling graceful
   - Empty states informative
   - Success feedback (toasts)

5. **Quality**
   - No console errors
   - No TypeScript errors
   - Tested in Chrome, Firefox, Safari
   - Tested on mobile

### Overall 100% Completion Criteria

The frontend is 100% complete when:

- All 200+ features from Feature_List.md have corresponding UI
- All P0, P1 features fully implemented
- All P2 features implemented or documented as future work
- Mock data infrastructure complete
- Design system consistently applied
- No critical bugs or UX issues
- Ready for backend integration (API endpoints match)

---

## Next Steps After Plan Approval

1. **Week 1 Day 1**: Start with COD Remittance mock data creation
2. **Daily Standups**: Review completed tasks, plan next tasks
3. **Weekly Reviews**: Demo completed features, gather feedback
4. **Documentation**: Update this plan as features are completed
5. **Backend Coordination**: Flag any DTO mismatches to backend team

---

## Notes

- **No Backend Integration**: All features use mock data only
- **API Readiness**: When backend APIs are ready, replace mock hooks with real API calls
- **Design Consistency**: Always refer to `globals.css` for colors, spacing, z-index
- **Component Reuse**: Maximize reuse of existing components from `/components/ui/`
- **Type Safety**: Maintain 100% TypeScript coverage, no `any` types
- **Performance**: Keep bundle size minimal, lazy load when possible

---

**Plan Created By**: Claude Sonnet 4.5
**Plan Status**: Ready for Approval
**Estimated Effort**: 12 weeks (480 hours)
**Last Updated**: 2026-01-13
