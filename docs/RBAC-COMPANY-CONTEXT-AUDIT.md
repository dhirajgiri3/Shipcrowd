# RBAC & Company Context – Coverage Audit

This document records the systematic audit for **requireCompanyContext** (backend) and **redirect + company-gated hooks** (frontend) so that admin-without-company never causes 500s and redirects are role-based.

## Backend: requireCompanyContext

**Rule:** Any handler that uses `auth.companyId` or `req.user.companyId` for **company-scoped** data must call `requireCompanyContext(auth)` after `guardChecks(req)` (or equivalent). Exceptions: admin-only endpoints that operate across companies (e.g. resolve dispute for any company); optional company (e.g. sku-weight-profile where admin can pass `?companyId=`).

### Controllers covered (requireCompanyContext added)

| Controller | Handlers |
|------------|----------|
| **wallet.controller** | getBalance, getTransactionHistory, rechargeWallet, refundTransaction, getWalletStats, updateLowBalanceThreshold, getSpendingInsights, getWalletTrends, getAvailableBalance, getCashFlowForecast, updateAutoRechargeSettings, getAutoRechargeSettings |
| **cod-remittance.controller** | getEligibleShipments, createRemittanceBatch, getRemittanceDetails, listRemittances, getTimeline, getDashboard, requestPayout, schedulePayout, uploadMIS |
| **analytics.controller** | getRevenueStats, getWalletStats (revenue), getCustomerStats, getTopCustomers, getInventoryStats, getTopProducts, buildCustomReport, saveReportConfig, listReportConfigs, deleteReportConfig, getRTOAnalytics, getProfitabilityAnalytics, getSmartInsights, getGeographicInsights |
| **export.controller** | exportToCSV, exportToExcel, exportToPDF |
| **order.controller** | createOrder, getOrders, getOrderById, updateOrder, deleteOrder, bulkImportOrders, cloneOrder, splitOrder, mergeOrders |
| **reconciliation.controller** | listReconciliationReports, getReconciliationReportDetails |
| **inventory.controller** | createInventory, getInventoryList, receiveStock, adjustStock, transferStock, markDamaged, cycleCount, getLowStockAlerts, getMovements, importInventory |
| **weight-disputes.controller** | listDisputes, getDisputeDetails, submitSellerEvidence, getMetrics |
| **cod-discrepancy.controller** | getDiscrepancies (guardChecks + requireCompanyContext + auth.companyId) |
| **cod-analytics.controller** | getForecast, getHealthMetrics, getCarrierPerformance |
| **early-cod.controller** | checkEligibility, enroll, createEarlyBatch, getEnrollment |
| **shipment.controller** | createShipment, getShipmentById, trackShipment, updateShipmentStatus, deleteShipment, recommendCourier *(getShipments uses requireCompany: false and returns empty when no company)* |

### Controllers not requiring company (by design)

- **sku-weight-profile.controller**: Admin can pass `?companyId=`; when missing, uses `auth.companyId` (optional for platform admin). No requireCompanyContext so admin without company can still use with query param.
- **user-management.controller**, **feature-flag.controller**, **impersonation.controller**: Platform-level; use `guardChecks(req, { requireCompany: false })`.
- **weight-disputes**: resolveDispute, getDisputeAnalytics, batchOperation are admin-only and may operate across companies; no requireCompanyContext.
- **audit-log.middleware**: Logs with `req.user.companyId` when present; does not throw when missing (audit can be null company).

### Controllers still using req.user.companyId without requireCompanyContext

These use `req.user` directly (no guardChecks in the same form). Consider adding guardChecks + requireCompanyContext when the handler is company-scoped:

- **ratecard.controller**: Many handlers use `req.user.companyId`; some have `if (!req.user || !req.user.companyId)`. Could standardize with guardChecks + requireCompanyContext.
- **warehouse.controller**: Uses `req.user.companyId` and explicit `if (!req.user.companyId)` checks. Could standardize.
- **support.controller**, **invoice.controller**, **session.controller**, **kyc.controller**, **audit.controller**, **bank-account.controller**, **label-template.controller**, **scheduled-report.controller**: Same pattern; add when touching those areas.

## Frontend: Redirect utility

**Rule:** All post-login and role-based redirects use `getDefaultRedirectForUser(user)` or `getLoginRedirect(user, searchParams)` from `@/src/config/redirect`.

### Usage verified

- **useLogin**: getLoginRedirect(result.user, searchParams)
- **useOAuthCallback**: getLoginRedirect(userData, searchParams)
- **Magic link verify**: getDefaultRedirectForUser(userData)
- **SignupClient** (already authenticated): getDefaultRedirectForUser(user)
- **OnboardingGuard** (user has company): getDefaultRedirectForUser(user)
- **AuthGuard** (wrong role): getDefaultRedirectForUser(user)
- **useOnboarding**: getDefaultRedirectForUser(user) when user?.companyId
- **CompanySetupPage** (after create company): getDefaultRedirectForUser({ ...user, companyId })

### Redirect logic (redirect.ts)

- super_admin / admin → `/admin`
- seller / staff with companyId → `/seller`
- seller / staff without companyId → `/onboarding`
- Safe `callbackUrl` / `redirect` query: only `/admin`, `/seller`, `/onboarding` (and subpaths) allowed.

## Frontend: Company-gated hooks

**Rule:** Any hook that calls an API that requires `companyId` (wallet, COD, analytics, orders, etc.) must set `enabled: hasCompanyContext && (options?.enabled !== false)` so it never runs when user has no company (e.g. admin on seller dashboard).

### Hooks verified

- useCODTimeline, useWalletBalance, useCODRemittances, useCODStats
- useRTOAnalytics, useProfitabilityAnalytics, useGeographicInsights
- useFinanceAdvanced: useAvailableBalance, useCashFlowForecast, useFinancialInsights
- useUrgentActions: all queries enabled with hasCompanyContext

## Race conditions / ordering

- Login: redirect uses `result.user` from same `login()` call → no race.
- OAuth/Magic link: `refreshUser()` then `getMe()` then redirect → correct order.
- Hooks: `enabled: hasCompanyContext` with `isInitialized && !!user?.companyId` → no request before auth ready or without company.
- CompanySetupPage: redirect uses `user` + `result.company?._id` so destination is correct even if context not yet refreshed.

## How to re-verify

1. **Backend:** `rg "auth\.companyId|req\.user\.companyId" server/src --type ts` then for each file ensure either requireCompanyContext(auth) is called or the handler is intentionally platform-wide / optional-company.
2. **Frontend redirects:** `rg "router\.(push|replace)\s*\(\s*['\"]\/" client` and ensure no hardcoded `/seller` or `/admin` for post-login flows; use redirect utility.
3. **Frontend hooks:** For any hook calling `/finance/`, `/analytics/` (company-scoped), or orders/shipments, ensure `enabled` includes `hasCompanyContext`.

Last audit: 2026-02-06 (after adding shipment.controller: createShipment, getShipmentById, trackShipment, updateShipmentStatus, deleteShipment, recommendCourier).
