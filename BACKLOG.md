# Technical Backlog & Tech Debt

## 🔴 High Priority (Functional Gaps)
- **Manifest Pickup Scheduling**: `server/src/core/application/services/shipping/manifest.service.ts`
  - *Context*: Closing a manifest currently only updates local status. Needs to call Carrier API to actually schedule the pickup.
- **Carrier Sync Retry**: `server/src/core/application/services/shipping/shipment.service.ts`
  - *Context*: If Velocity API fails during shipment creation, the shipment is saved locally but verified. Need a background job to retry the sync.

## 🟡 Medium Priority (Enhancements)
- **Email Templates**: `server/src/infrastructure/jobs/processors/email.processor.ts`
  - *Context*: Currently using string replacement. Should migrate to Handlebars/EJS for robust templating.
- **Analytics Events**: `client/src/lib/analytics/events.ts`
  - *Context*: Extensive TODOs for improving event tracking granularity.

## 🔵 Low Priority (Cleanup/Refactor)
- **Logger Improvements**: `client/src/lib/utils/logger.ts`
  - *Context*: Add log rotation or external service integration.
- **Error Boundary UI**: `client/src/components/shared/ErrorBoundary.tsx`
  - *Context*: Improve UI/UX of error states.

## 📂 Unsorted TODOs (From Codebase Scan)
- `client/src/core/api/hooks/finance/useInvoices.ts`: Pagination/Filtering improvements.
- `client/src/core/api/hooks/support/useSupport.ts`: Real-time updates.
- `server/src/presentation/http/controllers/*`: various controller-specific refactors (check individual files).
