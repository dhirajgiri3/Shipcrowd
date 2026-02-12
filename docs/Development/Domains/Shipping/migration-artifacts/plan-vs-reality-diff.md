# Plan vs Reality Diff

**Generated At:** 2026-02-11 19:52:46 IST

| Topic | Plan Assumption (Old) | Reality in Codebase | Locked Correction |
|---|---|---|---|
| Pricing card linkage | `sellCardId` and `costCardId` required | `QuoteOptionOutput` and shipment snapshot use `serviceId` + sell/cost amounts | Use existing `serviceId + quotedAmount + costAmount` model only |
| Policy ownership | Company-level runtime default policy object | Runtime policy model is `SellerCourierPolicy` (per seller) | Bootstrap/update per-seller policies; do not add runtime company default policy |
| C3 service rewrites | Limited set only (onboarding, rto, analytics) | Additional legacy touchpoints exist: `rate-card-import`, `pricing-cache`, `cod-charge`, `weight-dispute-detection` | Include all in Stage C3 rewrite list |
| Client cutover list | Incomplete / inferred list | Real inventory includes `client/app/admin/ratecards/**`, hooks, api clients, sidebar/settings refs | Use audited file inventory from `client-ratecard-inventory.md` |
| Migration branching | “terminal” and “in-flight” status sets unspecified | Status values vary across services/jobs/webhooks | Lock explicit status sets before D1 script execution |
| Seller policy bootstrap | Endpoint behavior unspecified | Existing routes do not include company-level bootstrap orchestration | Add explicit bootstrap endpoint contract and implementation constraints |
