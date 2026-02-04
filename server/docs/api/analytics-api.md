# Analytics API Documentation

## Overview

The Analytics API provides endpoints for retrieving insights about orders, shipments, revenue, customers, and inventory. It also includes a custom report builder for creating and saving report configurations.

## Base URL

```
/api/v1/analytics
```

## Authentication

All endpoints require authentication via Bearer token.

---

## Dashboard Endpoints

### Get Seller Dashboard
```
GET /dashboard/seller
```

Returns dashboard metrics for the authenticated company.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | ISO date string |
| endDate | string | ISO date string |

**Response:**
```json
{
  "totalOrders": 150,
  "totalRevenue": 75000,
  "pendingOrders": 20,
  "deliveredOrders": 100,
  "successRate": 85.5,
  "weeklyTrend": [...]
}
```

---

## Order Analytics

### Get Order Trends
```
GET /orders
```

**Query Parameters:**
| Parameter | Type | Default |
|-----------|------|---------|
| days | number | 30 |

### Get Top Products
```
GET /orders/top-products
```

**Query Parameters:**
| Parameter | Type | Default |
|-----------|------|---------|
| limit | number | 10 |
| startDate | string | - |
| endDate | string | - |

**Response:**
```json
[
  { "sku": "SKU001", "name": "Product A", "quantity": 100, "revenue": 10000 }
]
```

---

## Revenue Analytics

### Get Revenue Stats
```
GET /revenue/stats
```

**Response:**
```json
{
  "totalRevenue": 150000,
  "codRevenue": 90000,
  "prepaidRevenue": 60000,
  "averageOrderValue": 750,
  "orderCount": 200
}
```

### Get Wallet Stats
```
GET /revenue/wallet
```

**Response:**
```json
{
  "currentBalance": 25000,
  "totalCredits": 100000,
  "totalDebits": 75000,
  "transactionCount": 150
}
```

---

## Customer Analytics

### Get Customer Stats
```
GET /customers/stats
```

**Response:**
```json
{
  "totalCustomers": 500,
  "newCustomers": 50,
  "repeatCustomers": 150,
  "repeatRate": 30.0
}
```

### Get Top Customers
```
GET /customers/top
```

**Query Parameters:**
| Parameter | Type | Default |
|-----------|------|---------|
| limit | number | 10 |

**Response:**
```json
[
  { "phone": "91xxxx", "name": "John", "orderCount": 10, "totalSpent": 25000 }
]
```

---

## Inventory Analytics

### Get Inventory Stats
```
GET /inventory/stats
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| warehouseId | string | Optional warehouse filter |

**Response:**
```json
{
  "totalSKUs": 100,
  "totalOnHand": 5000,
  "totalStockValue": 250000,
  "lowStockCount": 15,
  "outOfStockCount": 5
}
```

---

## Report Builder

### Build Custom Report
```
POST /reports/build
```

**Request Body:**
```json
{
  "reportType": "order",
  "filters": {
    "dateRange": { "start": "2024-01-01", "end": "2024-01-31" }
  },
  "metrics": ["stats", "topProducts"],
  "groupBy": "day"
}
```

### Save Report Configuration
```
POST /reports/save
```

**Request Body:**
```json
{
  "name": "Monthly Orders Report",
  "reportType": "order",
  "filters": {},
  "metrics": ["stats", "trends"],
  "schedule": {
    "enabled": true,
    "frequency": "monthly",
    "recipients": ["user@example.com"],
    "format": "excel"
  }
}
```

### List Saved Reports
```
GET /reports
```

### Delete Report Configuration
```
DELETE /reports/:id
```

---

## Export Endpoints

Base URL: `/api/v1/export`

### Export to CSV
```
POST /csv
```

### Export to Excel
```
POST /excel
```

### Export to PDF
```
POST /pdf
```

**Request Body (all formats):**
```json
{
  "dataType": "orders",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "status": ["delivered", "shipped"]
  }
}
```

**Response:**
```json
{
  "downloadUrl": "https://shipcrowd.ams3.digitaloceanspaces.com/...",
  "filename": "orders_export_123456.xlsx",
  "format": "xlsx",
  "recordCount": 150
}
```
