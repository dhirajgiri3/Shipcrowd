## Shipcrowd Weight Dispute System – Operational Guide

**Scope:** How to operate, monitor, and safely roll out the weight discrepancy & dispute system implemented in Weeks 1–3.

---

## 1. Core Flows (High Level)

- **Webhook → Shipment Weight Update → Dispute Detection**
  - Courier (Velocity/Ekart/Delhivery) sends webhook with scanned weight and dimensions.
  - Webhook routes call the generic `WebhookProcessorService` or courier‑specific services.
  - Shipment’s `weights.actual` is updated and `WeightDisputeDetectionService.detectOnCarrierScan()` is invoked.
  - If discrepancy \(>\) 5% **or** financial impact \(>\) ₹50 → auto‑create `WeightDispute`.
  - Else → mark shipment weight as verified (no dispute).

- **Seller Evidence & Resolution**
  - Seller submits evidence via:
    - `POST /api/v1/disputes/weight/:disputeId/submit`
  - Admin reviews & resolves via:
    - `POST /api/v1/disputes/weight/:disputeId/resolve`
  - Resolution triggers wallet adjustments and notifications.

- **Packing Station Evidence (Pre‑Shipment)**
  - Warehouse staff captures weight & photos before courier pickup:
    - `POST /api/v1/packing-station/evidence` (multipart with `photos[]`).
  - Evidence is stored in `shipment.packingEvidence` and `weights.declared`.

- **SKU Weight Learning & Suggestions**
  - When weight is **verified** (no dispute) and the order has a single SKU:
    - `SKUWeightProfileService.learnFromShipment()` learns that weight.
  - Future shipments for the same SKU:
    - `ShipmentService.calculateTotalWeightWithSuggestions()` uses SKU weight profile suggestions instead of 0.5kg default when product weight is missing.

---

## 2. Key Endpoints (Backend)

### 2.1 Webhook & Weight Detection

- **Velocity / Ekart / Delhivery webhooks**
  - Mounted under:
    - `POST /api/v1/webhooks/velocity`
    - `POST /api/v1/webhooks/ekart`
    - `POST /api/v1/webhooks/delhivery`
  - All use `verifyWebhookSignature('<carrier>')` for HMAC verification.
  - On valid payload, update `Shipment` and trigger dispute detection via:
    - `WebhookProcessorService.processWebhook()` (or courier‑specific services).

- **Generic weight webhook (internal / partners)**
  - `POST /api/v1/disputes/weight/webhook`
  - Body:
    - `awb`: string – tracking number
    - `actualWeight`: number
    - `unit`: `'kg' | 'g'`
    - `scannedAt?`: ISO timestamp
    - `location?`: string
    - `photoUrl?`: string
    - `carrier?`: string
  - Behavior:
    - Finds `Shipment` by tracking number.
    - Calls `WeightDisputeDetectionService.detectOnCarrierScan()`.
    - Response:
      - `{ action: 'dispute_created', disputeId }` **or**
      - `{ action: 'weight_verified', disputeId: null }`.

### 2.2 Packing Station Evidence

- `POST /api/v1/packing-station/evidence`
  - Authenticated (warehouse staff).
  - Multipart:
    - `shipmentId`, `actualWeight`, `weightUnit`, `packedBy`, `location?`, `dimensions?` (JSON), `notes?`
    - `photos[]`: image files.
  - Effect:
    - Uploads photos via `StorageService`.
    - Sets `shipment.weights.declared` (source: `packing_station`).
    - Writes `shipment.packingEvidence`.

- `POST /api/v1/packing-station/upload-urls`
  - For direct S3 uploads (if `STORAGE_DRIVER=s3`).

- `GET /api/v1/packing-station/evidence/:shipmentId`
  - Fetches `packingEvidence` and related weight fields.

### 2.3 Disputes: Seller & Admin

- **List disputes**
  - `GET /api/v1/disputes/weight`

- **Get one dispute**
  - `GET /api/v1/disputes/weight/:disputeId`

- **Seller submits evidence**
  - `POST /api/v1/disputes/weight/:disputeId/submit`
  - Body: `{ photos?: string[], documents?: string[], notes?: string }`

- **Admin resolves dispute**
  - `POST /api/v1/disputes/weight/:disputeId/resolve`
  - Outcome: `'seller_favor' | 'Shipcrowd_favor' | 'split' | 'waived'`

- **Admin batch operations**
  - `POST /api/v1/disputes/weight/batch`
  - Body:
    - `disputeIds: string[]`
    - `action: 'approve_seller' | 'approve_carrier' | 'request_evidence' | 'escalate' | 'waive'`
    - `notes?: string`

---

## 3. SKU Weight Profiles (Admin)

- **List profiles**
  - `GET /api/v1/admin/sku-weight-profiles?companyId=&minConfidence=&onlyFrozen=&search=`

- **Get one profile**
  - `GET /api/v1/admin/sku-weight-profiles/:sku?companyId=`

- **Freeze / unfreeze SKU weight**
  - `POST /api/v1/admin/sku-weight-profiles/:sku/freeze`
    - Body: `{ frozenWeight: number, reason: string, companyId?: string }`
  - `POST /api/v1/admin/sku-weight-profiles/:sku/unfreeze`

- **Bulk learning from verified shipments**
  - `POST /api/v1/admin/sku-weight-profiles/bulk-learn`
    - Body: `{ companyId?: string, limit?: number }`

**Usage recommendations:**
- Start with **bulk-learn** on a subset of verified shipments for high‑volume sellers.
- Use freeze for **very stable SKUs** (e.g. pre‑boxed products).

---

## 4. Analytics & Fraud Signals

- **Main analytics endpoint**
  - `GET /api/v1/disputes/weight/analytics`
  - Query:
    - `startDate`, `endDate`, `companyId?`, `groupBy=day|week|month`
  - Response (high‑level shape):
    - `stats.overview` – totals, average discrepancy, status counts.
    - `stats.byOutcome` – counts & impact by resolution outcome.
    - `stats.byCarrier` – dispute count, avg discrepancy, and impact per carrier.
    - `stats.resolutionTimeStats` – average, min, max, and banded resolution times.
    - `trends` – time‑series counts and impact.
    - `highRiskSellers` – risk‑scored companies.
    - `carrierPerformance` – per‑carrier metrics.
    - `fraudSignals`:
      - `highRiskSellers`
      - `underDeclarationPattern` (declared vs actual weight)
      - `recentSpike` (week‑over‑week dispute spikes).

---

## 5. Background Jobs & Auto‑Resolution

- **Scheduler** (`src/config/scheduler.ts`):
  - Auto‑resolve disputes older than **7 days** (but newer than 30 days) every day at **02:00**:
    - Calls `WeightDisputeJob.queueAutoResolve()` → `WeightDisputeResolutionService.autoResolveExpiredDisputes()`.
  - Send auto‑resolve reminders 3 days before expiry at **10:00**:
    - `WeightDisputeJob.queueSendReminders()` → `WeightDisputeNotificationService.sendAutoResolveReminder()`.

**Auto‑resolve behavior:**
- Targets disputes with:
  - `status in ['pending', 'under_review']`
  - `7 < age <= 30` days
  - `isDeleted = false`
- Resolves in favor of **Shipcrowd** using `Shipcrowd_favor` outcome and deducts the financial difference from the wallet (with safe error handling).

---

## 6. Rollout & Safety Checklist

Before enabling for all sellers:

- **Config & Secrets**
  - Ensure all webhook secrets (`VELOCITY_WEBHOOK_SECRET`, `EKART_WEBHOOK_SECRET`, `DELHIVERY_WEBHOOK_SECRET`) are set in prod.
  - Set `STORAGE_DRIVER` (`local` or `s3`) and S3 credentials if using direct evidence upload.

- **Feature Flags (recommended)**
  - Auto‑resolve job enabled.
  - SKU learning in shipment creation.
  - Admin batch operations for disputes.

- **Monitoring (logs / dashboards)**
  - Track:
    - # of disputes created per day.
    - % auto‑resolved vs manual.
    - Seller win rate vs Shipcrowd win rate.
    - Carrier‑wise dispute rates and avg discrepancy.
    - Under‑declaration patterns from analytics service.

- **Runbook for Incidents**
  - In case of mis‑configured thresholds or spikes:
    - Temporarily disable auto‑resolve cron (scheduler flag).
    - Use batch operations to **waive** or **approve_seller** for impacted disputes.
    - Inspect `fraudSignals` to differentiate genuine calibration issues vs abuse.

---

## 7. Testing Strategy Summary

- **Unit Tests**
  - `WeightDisputeDetectionService` and `WeightDisputeResolutionService` for core logic.

- **Integration Tests**
  - Courier webhooks (Velocity/Ekart/Delhivery) → shipment updates.
  - `POST /api/v1/disputes/weight/webhook`:
    - Path 1: Creates dispute when above threshold.
    - Path 2: Verifies weight when within threshold (no dispute).

Use these as a reference when adding new couriers or modifying thresholds to ensure all paths are still covered.

