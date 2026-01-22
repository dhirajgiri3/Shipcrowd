# Test Credentials for Helix Shipping Platform

## 🚀 SUPER ADMIN (Recommended)

**✅ DUAL ACCESS: Admin + Seller Dashboards**

```
Email:    admin@helix.com
Password: Admin@123456
```

**Access:**
- Admin Dashboard: `/admin/dashboard`
- Seller Dashboard: `/seller/dashboard`

**Data:** Linked to seeded company with real orders & metrics.

---

## 👤 Standard Demo User

**Login Credentials**

**Email:** demo@Helix.test
**Password:** Demo@123456

---

## User Details

- **Name:** Demo Seller User
- **Role:** Seller
- **Company:** Demo Test Shop Pvt Ltd
- **Company Tier:** Sandbox (Full API Access)
- **Email Verified:** ✅ Yes
- **KYC Status:** ✅ Verified
- **Onboarding:** ✅ Completed

---

## Available Data

- **Orders:** 150 orders (spanning 6 months)
  - Delivered: 64
  - COD: 83
  - Prepaid: 67
- **Shipments:** 105 shipments
- **Wallet Balance:** ₹29,92,923
- **Wallet Transactions:** 140 transactions
- **Inventory SKUs:** 15 products
- **Warehouses:** 1 warehouse

---

## API Base URL

- **Development:** http://localhost:5005/api/v1
- **Backend Server:** Must be running on port 5005

---

## Quick Test

Login and verify these features work:

1. ✅ Dashboard Analytics - Shows real metrics
2. ✅ Wallet Balance - Shows ₹29,92,923
3. ✅ Order List - Shows 150 orders
4. ✅ Order Filters - Filter by status/payment method
5. ✅ Search - Search orders by keyword/phone

---

**Created:** January 21, 2026
**Purpose:** Frontend integration testing and client demo


Helix Platform: Implementation Roadmap
Overall Objective
Complete remaining platform features starting with COD Remittance (90% done - just needs UI polish!)

Current Status
✅ Completed Features
 Warehouses - 100% complete (SHIPPED)
 Wallet & Financials - 75-80% complete (needs final polish)
🟨 In Progress
COD Remittance - 90% complete (POLISHING NOW)
 Day 1: Fix types & remove mock data - NOT NEEDED!
✅ Types are perfect (
cod.types.ts
)
✅ Hooks use real APIs (
useCOD.ts
)
✅ Components have NO mock data (already integrated)
✅ 
CODRemittanceTable
 uses 
useCODRemittances()
✅ 
RequestPayoutModal
 uses 
useCODStats()
 + 
useRequestPayout()
 Day 1: Polish UI to warehouse quality ✅
 Redesign stat cards (hero metrics style) ✅
 Improve table aesthetic ✅
 Enhance modal UX ✅
 Add smooth animations ✅
 Day 2: Advanced features & mobile
 Download statement (PDF)
 Advanced filters
 Mobile optimization
 Day 3: Final testing
📋 Upcoming Work (After COD)
 Seller Dashboard - Priority 1 Fixes ✅
 Remove unused useAnalytics import ✅
 Integrate useOrdersList() for real order data ✅
 Add Error Boundaries for stability ✅
 Fix TypeScript 'any' types ✅
 Add empty state handling (with fallback patterns) ✅
 Seller Dashboard - API Integration ✅
 Phase 0-3: Core metrics, trends, COD, shipments ✅
 Week 2: Integrate 5 API-Ready Features (Pipeline, Search)
 Week 3-4: Complete Wallet (remaining 20%)
 Week 5-8: Returns Management (full-stack)
 Week 9-10: Weight Disputes
 Week 11-14: Advanced Analytics Suite
 Week 15-16: Mobile-First Optimization
 Week 17-18: Admin Dashboard
 Week 19-20: Final Polish & Launch