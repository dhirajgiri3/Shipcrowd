# RTO Management – API Summary

Base path (authenticated): **`/api/v1/rto`**  
Public base path: **`/api/v1/public/rto`**

---

## Authenticated Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/rto/events` | List RTO events (paginated, filterable) |
| GET | `/rto/events/:id` | Get single RTO event details |
| GET | `/rto/pending` | Get pending RTOs (for dashboard) |
| GET | `/rto/analytics/stats` | Get RTO stats (counts, charges, restock rate, disposition, QC turnaround) |
| POST | `/rto/trigger` | Trigger RTO manually for a shipment |
| PATCH | `/rto/events/:id/status` | Update RTO status |
| POST | `/rto/events/:id/qc/upload` | Upload QC photos (multipart `photos[]`) |
| POST | `/rto/events/:id/qc` | Record QC result |
| GET | `/rto/events/:id/disposition/suggest` | Get suggested disposition (restock/refurb/dispose/claim) |
| POST | `/rto/events/:id/disposition/execute` | Execute disposition |

---

## List RTO events

**GET** `/rto/events`

**Query (optional):**  
`page`, `limit`, `returnStatus`, `rtoReason`, `warehouseId`, `startDate`, `endDate`, `sortBy`, `sortOrder`

**Response:**  
`{ success, data: { data: RTOEvent[], pagination: { page, limit, total, pages } } }`

---

## Get RTO stats (dashboard / analytics)

**GET** `/rto/analytics/stats`

**Query (optional):**  
`startDate`, `endDate`, `warehouseId`, `rtoReason`

**Response:**  
`{ success, data: { total, byReason, byStatus, totalCharges, avgCharges, restockRate?, dispositionBreakdown?, avgQcTurnaroundHours? } }`

- **restockRate**: % of completed RTOs that were restocked.  
- **dispositionBreakdown**: `{ restock, refurb, dispose, claim }` counts.  
- **avgQcTurnaroundHours**: Average hours from RTO initiation to QC completion.

---

## Upload QC photos

**POST** `/rto/events/:id/qc/upload`

**Content-Type:** `multipart/form-data`  
**Body:** Field `photos` (array of image files, max 10, 5MB each).

**Response:**  
`{ success, data: { urls: string[] } }`

---

## Record QC result

**POST** `/rto/events/:id/qc`

**Body:**  
`{ qcResult: { passed, remarks, images?, condition?, damageTypes?, photos?: [{ url, label? }], inspectedBy? }, nextAction? }`

**Response:**  
`{ success, message }`

---

## Disposition suggest / execute

**GET** `/rto/events/:id/disposition/suggest`  
Returns suggested action and reason (e.g. restock, refurb, dispose, claim) based on QC and order value.

**POST** `/rto/events/:id/disposition/execute`  
**Body:**  
`{ action: 'restock' | 'refurb' | 'dispose' | 'claim', notes? }`

**Response:**  
`{ success, data?: updatedRTOEvent, message }`

---

## Public (unauthenticated)

**GET** `/public/rto/track?awb=...`  
**GET** `/public/rto/track?orderNumber=...&phone=...`  

Returns sanitized RTO tracking info (status, reverse AWB, timeline) for customer-facing tracking.

---

## Status and disposition values

**returnStatus:**  
`initiated` | `in_transit` | `delivered_to_warehouse` | `qc_pending` | `qc_completed` | `restocked` | `disposed` | `refurbishing` | `claim_filed`

**disposition.action:**  
`restock` | `refurb` | `dispose` | `claim`

**rtoReason:**  
`ndr_unresolved` | `customer_cancellation` | `qc_failure` | `refused` | `damaged_in_transit` | `incorrect_product` | `other`
