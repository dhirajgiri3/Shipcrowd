# Code Metrics Baseline Report
**Generated:** 12/26/2025, 11:43:39 PM
**Purpose:** Week 1 Session 2 baseline metrics

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Lines of Code** | 24,452 |
| **Total Files** | 131 |
| **Database Models** | 16 |
| **Services** | 17 |
| **Controllers** | 19 |
| **Routes** | 19 |
| **Tests** | 3 (1 unit, 2 integration) |

---

## Lines of Code by Directory

| Directory | Lines |
|-----------|-------|
| presentation | 11,249 |
| core | 5,598 |
| infrastructure | 3,326 |
| shared | 2,629 |
| scripts | 1,334 |
| root | 184 |
| config | 107 |
| types | 25 |

---

## Files by Extension

| Extension | Count |
|-----------|-------|
| .ts | 129 |
| .log | 2 |

---

## Database Models (16)

- AuditLog
- Company
- Coupon
- Integration
- KYC
- Order
- Permission
- RateCard
- Session
- Shipment
- TeamActivity
- TeamInvitation
- TeamPermission
- User
- Warehouse
- Zone

---

## Services (17)

- auth/oauth.service.ts
- auth/password.service.ts
- auth/session.service.ts
- communication/email.service.ts
- communication/notification.service.ts
- communication/sms.service.ts
- communication/whatsapp.service.ts
- integrations/deepvue.service.ts
- integrations/mocks/deepvue.mock.ts
- shipping/carrier.service.ts
- shipping/order.service.ts
- shipping/shipment.service.ts
- user/account.service.ts
- user/activity.service.ts
- user/emailChange.service.ts
- user/profile.service.ts
- user/recovery.service.ts

---

## Controllers (19)

- auth/auth.controller.ts
- auth/recovery.controller.ts
- auth/session.controller.ts
- communication/email.controller.ts
- communication/notification.controller.ts
- communication/whatsapp.controller.ts
- identity/account.controller.ts
- identity/kyc.controller.ts
- identity/profile.controller.ts
- identity/user.controller.ts
- organization/company.controller.ts
- organization/team.controller.ts
- shipping/order.controller.ts
- shipping/ratecard.controller.ts
- shipping/shipment.controller.ts
- shipping/warehouse.controller.ts
- shipping/zone.controller.ts
- system/analytics.controller.ts
- system/audit.controller.ts

---

## Routes (19)

- v1/auth/auth.routes.ts
- v1/auth/recovery.routes.ts
- v1/auth/session.routes.ts
- v1/communication/email.routes.ts
- v1/communication/notification.routes.ts
- v1/communication/whatsapp.routes.ts
- v1/identity/account.routes.ts
- v1/identity/kyc.routes.ts
- v1/identity/profile.routes.ts
- v1/identity/user.routes.ts
- v1/organization/company.routes.ts
- v1/organization/team.routes.ts
- v1/shipping/order.routes.ts
- v1/shipping/ratecard.routes.ts
- v1/shipping/shipment.routes.ts
- v1/shipping/warehouse.routes.ts
- v1/shipping/zone.routes.ts
- v1/system/analytics.routes.ts
- v1/system/audit.routes.ts

---

## Test Coverage

- **Unit Tests:** 1
- **Integration Tests:** 2
- **Total Tests:** 3

---

**Next Steps:**
- Compare metrics after each week
- Track growth in tests, models, services
- Monitor code quality trends
