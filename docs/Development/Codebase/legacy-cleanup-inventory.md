# Legacy Cleanup Inventory

## Deleted
- `server/tests/integration/auth/debug_env.test.ts`
- `server/tests/integration/auth_legacy.test.ts`

## Deferred (Active Compat)
- `server/src/presentation/http/routes/v1/index.ts` compatibility aliases:
  - `/admin/carriers`
  - `/serviceability/address`
  - `/admin/ndr`
  - `/weight-discrepancies`
  - `/admin/profit`
  - `/admin/intelligence`

These remain because active frontend clients still call them.

## Next-Wave Candidates
- Client compatibility hook aliases that can be removed only after import graph reaches zero external callers:
  - `client/src/core/api/hooks/orders/useShipmentDetail.ts`
  - `client/src/core/api/hooks/analytics/useAnalyticsExport.ts`
- Additional legacy comments/compat shims should be removed only after endpoint/contract migration is complete.
