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
| **ratecard.controller** | All handlers (createRateCard, getRateCards, getRateCardById, updateRateCard, calculateRate, compareCarrierRates, getRateCardAnalytics, getRateCardRevenueSeries, exportRateCards, bulkUpdateRateCards, importRateCards, calculateSmartRates, previewPrice, cloneRateCard, deleteRateCard, previewRateCardSelection, simulateRateCardChange, getApplicableRateCards) |
| **warehouse.controller** | createWarehouse, getWarehouses, getWarehouseById, updateWarehouse, deleteWarehouse, importWarehouses *(admin may pass params.companyId; requireCompanyContext only when no param)* |
| **support.controller** | createTicket, getTickets, getTicketById, updateTicket, addNote, getMetrics |
| **invoice.controller** | createInvoice, listInvoices, createCreditNote, getGSTSummary, exportGSTR |
| **session.controller** | getSessions, terminateSession, terminateAllSessions |
| **kyc.controller** | validateUserAndCompany helper (used by all KYC handlers) |
| **audit.controller** | getCompanyAuditLogs *(getMyAuditLogs is per-user only)* |
| **bank-account.controller** | getBankAccounts, addBankAccount, deleteBankAccount |
| **label-template.controller** | listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, setAsDefault, generateLabel, createDefaultTemplate |
| **scheduled-report.controller** | listScheduledReports, getScheduledReport, createScheduledReport, updateScheduledReport, deleteScheduledReport, executeReportNow, pauseReport, resumeReport |
| **manifest.controller** | createManifest, listEligibleShipments, getManifestStats, listManifests, getManifestById, updateManifest, deleteManifest, addShipments, removeShipments |
| **bulk-shipment.controller** | createBulkManifest, generateBulkLabels |
| **ndr.controller** | listNDREvents, getNDREvent, resolveNDR, escalateNDR, getStats, getByType, getTrends, getResolutionRates, getTopReasons, getDashboard, getWorkflows |
| **ndr-analytics.controller** | getSelfServiceMetrics, getPreventionMetrics, getROIMetrics, getWeeklyTrends |
| **rto.controller** | listRTOEvents, getRTOEvent, triggerRTO, updateStatus, recordQCResult, getStats, getPendingRTOs, executeDisposition |
| **integrations.controller** | getHealth |
| **ekart.controller** | saveConfig, getConfig |

### Controllers not requiring company (by design)

- **sku-weight-profile.controller**: Admin can pass `?companyId=`; when missing, uses `auth.companyId` (optional for platform admin). No requireCompanyContext so admin without company can still use with query param.
- **user-management.controller**, **feature-flag.controller**, **impersonation.controller**: Platform-level; use `guardChecks(req, { requireCompany: false })`.
- **weight-disputes**: resolveDispute, getDisputeAnalytics, batchOperation are admin-only and may operate across companies; no requireCompanyContext.
- **audit-log.middleware**: Logs with `req.user.companyId` when present; does not throw when missing (audit can be null company).

### Controllers still using req.user.companyId (same pattern to apply)

Apply `guardChecks(req)` + `requireCompanyContext(auth)` at handler start and use `auth.companyId` / `auth.userId`:

- **woocommerce.controller**, **flipkart.controller**, **amazon.controller**, **shopify.controller**
- **flipkart-product-mapping.controller**, **product-mapping.controller**, **amazon-product-mapping.controller**
- **commission**: sales-representative.controller, payout.controller, commission-transaction.controller, commission-rule.controller, commission-analytics.controller

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

Last audit: 2026-02-06. Full coverage: ratecard, warehouse, support, invoice, session, kyc, audit, bank-account, label-template, scheduled-report, manifest, bulk-shipment, ndr, ndr-analytics, rto, integrations.controller, ekart.controller. Remaining: woocommerce, flipkart, amazon, shopify, *-product-mapping, commission/* (same pattern).
