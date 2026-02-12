# Client RateCard Inventory

**Generated At:** 2026-02-11 19:52:46 IST  
**Scan Command:**
```bash
find client -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs rg -l "ratecard|RateCard|rate-card"
```

## 1. Summary

1. Total matches (excluding generated `.next` files): **39 files**.
2. Legacy-heavy areas are still concentrated in:
   - `client/app/admin/ratecards/**`
   - admin hooks and API clients under `client/src/core/api/**`
   - company settings + sidebar navigation references

## 2. Stage C4 Cutover List (Exact Paths)

### 2.1 Admin Pages / Components
1. `client/app/admin/ratecards/[id]/analytics/components/RateCardAnalytics.tsx`
2. `client/app/admin/ratecards/[id]/analytics/page.tsx`
3. `client/app/admin/ratecards/[id]/components/RateCardDetailView.tsx`
4. `client/app/admin/ratecards/[id]/edit/components/EditRatecardClient.tsx`
5. `client/app/admin/ratecards/[id]/edit/page.tsx`
6. `client/app/admin/ratecards/[id]/page.tsx`
7. `client/app/admin/ratecards/assign/components/AssignRatecardClient.tsx`
8. `client/app/admin/ratecards/components/PriceCalculator.tsx`
9. `client/app/admin/ratecards/components/RateCardItem.tsx`
10. `client/app/admin/ratecards/components/RateCardWizard.tsx`
11. `client/app/admin/ratecards/components/RatecardsClient.tsx`
12. `client/app/admin/ratecards/components/UploadRateCardModal.tsx`
13. `client/app/admin/ratecards/components/ratecardWizard.utils.ts`
14. `client/app/admin/ratecards/create/components/CreateRatecardClient.tsx`
15. `client/app/admin/ratecards/create/steps/Step1BasicInfo.tsx`
16. `client/app/admin/ratecards/create/steps/Step2ZonePricing.tsx`
17. `client/app/admin/ratecards/create/steps/Step4Overhead.tsx`
18. `client/app/admin/ratecards/create/steps/Step5Review.tsx`

### 2.2 Admin Settings / Navigation
1. `client/app/admin/companies/[companyId]/settings/components/RateCardSettings.tsx`
2. `client/app/admin/companies/[companyId]/settings/page.tsx`
3. `client/src/components/admin/Sidebar.tsx`

### 2.3 API Clients / Hooks
1. `client/src/core/api/clients/general/companyApi.ts`
2. `client/src/core/api/clients/shipping/rateCardManagementApi.ts`
3. `client/src/core/api/clients/shipping/ratesApi.ts`
4. `client/src/core/api/config/query-keys.ts`
5. `client/src/core/api/hooks/admin/index.ts`
6. `client/src/core/api/hooks/admin/useAdminRateCardAnalytics.ts`
7. `client/src/core/api/hooks/admin/useAdminRateCards.ts`
8. `client/src/core/api/hooks/admin/useRateCardManagement.ts`
9. `client/src/core/api/hooks/logistics/index.ts`
10. `client/src/core/api/hooks/logistics/useRateCards.ts`
11. `client/src/hooks/shipping/use-bulk-rate-card-operations.ts`

### 2.4 Shared Types / UI Mentions
1. `client/src/core/api/types/api.ts`
2. `client/src/types/shared/index.ts`
3. `client/src/components/ui/data/StatusBadge.tsx`
4. `client/src/config/status.config.ts`

### 2.5 Service-Level Pages (retain, not delete)
1. `client/app/admin/pricing-studio/page.tsx`
2. `client/app/admin/couriers/services/components/ServicesClient.tsx`
3. `client/src/core/api/hooks/admin/couriers/useServiceRateCards.ts`

## 3. C4 Execution Rule

1. Delete only files in sections 2.1-2.4 after replacement paths are in place.
2. Preserve section 2.5 files; these belong to target service-level architecture.
