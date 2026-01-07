# RTO API Endpoints Documentation

## Overview

The RTO (Return To Origin) API manages return shipments triggered by unresolved NDRs, customer cancellations, or quality issues. All endpoints require authentication.

**Base URL:** `/api/v1/rto`

---

## Authentication

All endpoints require a valid JWT token:

```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. List RTO Events

**GET** `/api/v1/rto/events`

Retrieve paginated list of RTO events.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20) |
| returnStatus | string | No | Filter by status: `initiated`, `in_transit`, `delivered_to_warehouse`, `qc_completed`, `restocked` |
| rtoReason | string | No | Filter by reason: `ndr_unresolved`, `customer_cancellation`, `qc_failure`, `other` |

**Example Request:**

```bash
curl -X GET "https://api.shipcrowd.com/api/v1/rto/events?page=1&returnStatus=in_transit" \
  -H "Authorization: Bearer your_token_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "rto123",
        "shipment": "ship123",
        "order": "order123",
        "reverseShipment": "reverse_ship123",
        "rtoReason": "ndr_unresolved",
        "ndrEvent": "ndr123",
        "triggeredBy": "auto",
        "triggeredAt": "2026-01-03T10:30:00.000Z",
        "rtoCharges": 75.50,
        "chargesDeducted": true,
        "warehouse": "warehouse123",
        "expectedReturnDate": "2026-01-10T00:00:00.000Z",
        "returnStatus": "in_transit",
        "company": "company123"
      }
    ],
    "pagination": {
      "total": 23,
      "page": 1,
      "limit": 20,
      "pages": 2
    }
  }
}
```

---

### 2. Get Pending RTOs

**GET** `/api/v1/rto/pending`

Get all RTOs pending warehouse receipt.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "pendingRTOs": [
      {
        "_id": "rto124",
        "reverseAwb": "RAWB123456",
        "expectedReturnDate": "2026-01-08T00:00:00.000Z",
        "daysUntilReturn": 7,
        "rtoReason": "customer_cancellation"
      }
    ],
    "count": 5
  }
}
```

---

### 3. Get RTO Event Details

**GET** `/api/v1/rto/events/:id`

Retrieve detailed information about a specific RTO event.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | RTO event ID |

**Example Request:**

```bash
curl -X GET "https://api.shipcrowd.com/api/v1/rto/events/rto123" \
  -H "Authorization: Bearer your_token_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "rto123",
    "shipment": {
      "_id": "ship123",
      "trackingNumber": "TRK123456",
      "deliveryDetails": {
        "recipientName": "John Doe"
      }
    },
    "order": "order123",
    "reverseAwb": "RAWB654321",
    "rtoReason": "ndr_unresolved",
    "triggeredBy": "auto",
    "rtoCharges": 75.50,
    "returnStatus": "in_transit",
    "qcResult": null
  }
}
```

---

### 4. Trigger Manual RTO

**POST** `/api/v1/rto/trigger`

Manually initiate RTO for a shipment.

**Request Body:**

```json
{
  "shipmentId": "ship123",
  "reason": "customer_cancellation",
  "notes": "Customer requested cancellation and refund"
}
```

**Example Request:**

```bash
curl -X POST "https://api.shipcrowd.com/api/v1/rto/trigger" \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "ship123",
    "reason": "customer_cancellation",
    "notes": "Customer requested cancellation"
  }'
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "RTO triggered successfully",
  "data": {
    "rtoEventId": "rto125",
    "reverseAwb": "RAWB789012",
    "expectedReturnDate": "2026-01-12T00:00:00.000Z",
    "rtoCharges": 75.50
  }
}
```

---

### 5. Update RTO Status

**PATCH** `/api/v1/rto/events/:id/status`

Update the return status of an RTO event.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | RTO event ID |

**Request Body:**

```json
{
  "returnStatus": "delivered_to_warehouse",
  "notes": "Package received at warehouse dock 3"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "RTO status updated successfully",
  "data": {
    "_id": "rto123",
    "returnStatus": "delivered_to_warehouse",
    "actualReturnDate": "2026-01-09T14:30:00.000Z"
  }
}
```

---

### 6. Record QC Result

**POST** `/api/v1/rto/events/:id/qc`

Record quality check result for returned item.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | RTO event ID |

**Request Body:**

```json
{
  "passed": true,
  "remarks": "Item in good condition, repackaged",
  "images": [
    "https://storage.shipcrowd.com/qc/item123_1.jpg",
    "https://storage.shipcrowd.com/qc/item123_2.jpg"
  ]
}
```

**Example Request:**

```bash
curl -X POST "https://api.shipcrowd.com/api/v1/rto/events/rto123/qc" \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "passed": true,
    "remarks": "Item in good condition",
    "images": ["https://storage.shipcrowd.com/qc/item123.jpg"]
  }'
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "QC result recorded successfully",
  "data": {
    "_id": "rto123",
    "returnStatus": "qc_completed",
    "qcResult": {
      "passed": true,
      "remarks": "Item in good condition, repackaged",
      "images": ["https://storage.shipcrowd.com/qc/item123.jpg"],
      "qcDate": "2026-01-09T16:00:00.000Z"
    }
  }
}
```

---

### 7. RTO Analytics/Stats  

**GET** `/api/v1/rto/analytics/stats`

Get RTO statistics for the company.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Start date (ISO 8601) |
| endDate | string | No | End date (ISO 8601) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totalRTOs": 89,
    "rtoRate": 1.9,
    "totalRTOCharges": 6712.50,
    "avgRTOCharges": 75.42,
    "byReason": {
      "ndr_unresolved": 52,
      "customer_cancellation": 28,
      "qc_failure": 7,
      "other": 2
    },
    "byStatus": {
      "initiated": 12,
      "in_transit": 25,
      "delivered_to_warehouse": 18,
      "qc_completed": 20,
      "restocked": 14
    },
    "qcPassRate": 87.5,
    "avgReturnDays": 6.2
  }
}
```

---

## Error Responses

**400 Bad Request:**

```json
{
  "success": false,
  "error": "INVALID_REQUEST",
  "message": "Shipment cannot be RTO'd - already delivered"
}
```

**404 Not Found:**

```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "RTO event not found"
}
```

**500 Internal Server Error:**

```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "An error occurred while processing your request"
}
```

---

## Webhooks

RTO events can trigger webhooks to notify your system:

**Event Types:**
- `rto.initiated` - RTO process started
- `rto.in_transit` - Return shipment picked up
- `rto.delivered` - Package delivered to warehouse
- `rto.qc_completed` - Quality check completed
- `rto.restocked` - Item restocked to inventory

**Webhook Payload Example:**

```json
{
  "event": "rto.delivered",
  "timestamp": "2026-01-09T14:30:00.000Z",
  "data": {
    "rtoEventId": "rto123",
    "shipmentId": "ship123",
    "orderId": "order123",
    "reverseAwb": "RAWB654321",
    "warehouseId": "warehouse123"
  }
}
```

---

## Best Practices

1. **Monitor Pending RTOs:** Regularly check `/rto/pending` to prepare for incoming returns
2. **Update Status Promptly:** Update RTO status as soon as shipments are received
3. **Perform QC Quickly:** Complete quality checks within 24 hours of receipt
4. **Track Charges:** Monitor RTO charges to optimize logistics costs
5. **Analyze Reasons:** Use analytics to identify and address root causes of RTOs
