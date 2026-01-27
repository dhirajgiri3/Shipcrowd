# 🔌 BACKEND API REQUIREMENTS SPECIFICATION
**Project**: Shipcrowd Backend API Development
**Version**: 1.0
**Last Updated**: January 27, 2026

---

## 📋 OVERVIEW

This document specifies all backend API endpoints required to complete the frontend-backend integration. Each endpoint includes request/response schemas, authentication requirements, validation rules, and error handling.

**Total Endpoints**: 67 endpoints across 15 modules
**Priority Distribution**: 28 High Priority | 21 Medium | 18 Low

---

## 🔴 HIGH PRIORITY ENDPOINTS (Phase 1)

---

## 1. ADMIN ORDERS MANAGEMENT

### 1.1 Get All Orders (Admin View)
```
GET /api/admin/orders
```

**Authentication**: Required (Admin only)

**Query Parameters**:
```typescript
{
  status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'rto';
  search?: string;           // AWB, Order ID, Customer name
  sellerId?: string;
  courierId?: string;
  dateFrom?: string;         // ISO date
  dateTo?: string;           // ISO date
  page?: number;             // Default: 1
  limit?: number;            // Default: 20, Max: 100
  sortBy?: 'createdAt' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}
```

**Response**: `200 OK`
```typescript
{
  orders: Array<{
    id: string;
    orderId: string;
    awb?: string;
    sellerId: string;
    sellerName: string;
    customerName: string;
    customerPhone: string;
    destination: {
      city: string;
      state: string;
      pincode: string;
    };
    weight: number;
    amount: number;
    paymentMode: 'prepaid' | 'cod';
    status: string;
    courier?: {
      id: string;
      name: string;
    };
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Errors**:
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not admin role
- `400 Bad Request` - Invalid query parameters

---

### 1.2 Ship Order (Admin)
```
POST /api/admin/orders/:orderId/ship
```

**Authentication**: Required (Admin only)

**Request Body**:
```typescript
{
  courierId: string;
  serviceType: string;       // 'surface' | 'air' | 'express'
  awbNumber?: string;        // Optional, generated if not provided
  pickupDate?: string;       // ISO date, defaults to tomorrow
}
```

**Response**: `201 Created`
```typescript
{
  shipment: {
    id: string;
    awb: string;
    orderId: string;
    courierId: string;
    courierName: string;
    serviceType: string;
    status: 'pending_pickup';
    pickupDate: string;
    estimatedDelivery: string;
    trackingUrl: string;
    createdAt: string;
  };
}
```

**Errors**:
- `404 Not Found` - Order not found
- `409 Conflict` - Order already shipped
- `400 Bad Request` - Invalid courier or service type

---

### 1.3 Get Courier Rates (Admin)
```
GET /api/admin/orders/courier-rates
```

**Authentication**: Required (Admin only)

**Query Parameters**:
```typescript
{
  weight: number;
  fromPincode: string;
  toPincode: string;
  paymentMode: 'prepaid' | 'cod';
  declaredValue?: number;
}
```

**Response**: `200 OK`
```typescript
{
  rates: Array<{
    courierId: string;
    courierName: string;
    serviceType: string;
    rate: number;
    estimatedDays: number;
    available: boolean;
    rtoCharges: number;
    codCharges?: number;
    fuelSurcharge: number;
    totalCharge: number;
  }>;
  calculatedAt: string;
}
```

---

## 2. ADMIN SELLERS MANAGEMENT

### 2.1 Get All Sellers
```
GET /api/admin/sellers
```

**Authentication**: Required (Admin only)

**Query Parameters**:
```typescript
{
  status?: 'active' | 'suspended' | 'pending';
  kycStatus?: 'pending' | 'verified' | 'rejected';
  search?: string;
  page?: number;
  limit?: number;
}
```

**Response**: `200 OK`
```typescript
{
  sellers: Array<{
    id: string;
    companyName: string;
    email: string;
    phone: string;
    status: string;
    kycStatus: string;
    stats: {
      totalOrders: number;
      totalRevenue: number;
      rtoRate: number;
      walletBalance: number;
      avgOrderValue: number;
    };
    createdAt: string;
    lastActive: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

### 2.2 Approve Seller
```
PUT /api/admin/sellers/:sellerId/approve
```

**Authentication**: Required (Admin only)

**Response**: `200 OK`
```typescript
{
  message: 'Seller approved successfully';
  seller: {
    id: string;
    status: 'active';
    approvedAt: string;
    approvedBy: string;
  };
}
```

---

### 2.3 Suspend Seller
```
PUT /api/admin/sellers/:sellerId/suspend
```

**Authentication**: Required (Admin only)

**Request Body**:
```typescript
{
  reason: string;           // Required, min 10 chars
  duration?: number;        // Days, null for indefinite
  notifyUser: boolean;      // Send notification email
}
```

**Response**: `200 OK`
```typescript
{
  message: 'Seller suspended successfully';
  seller: {
    id: string;
    status: 'suspended';
    suspensionReason: string;
    suspendedAt: string;
    suspendedBy: string;
    suspensionEnds?: string;
  };
}
```

---

### 2.4 Impersonate Seller
```
POST /api/admin/sellers/:sellerId/impersonate
```

**Authentication**: Required (Admin only)

**Response**: `200 OK`
```typescript
{
  token: string;            // JWT with seller context
  redirectUrl: string;      // /seller/dashboard
  expiresIn: number;        // Seconds
  impersonatedUser: {
    id: string;
    companyName: string;
    email: string;
  };
}
```

**Security Notes**:
- Audit log required
- Limited duration (30 minutes)
- Original admin ID stored in token
- Special permission flag in JWT

---

## 3. ADMIN BILLING & RECHARGES

### 3.1 Get Recharge History
```
GET /api/admin/billing/recharges
```

**Authentication**: Required (Admin only)

**Query Parameters**:
```typescript
{
  sellerId?: string;
  status?: 'pending' | 'success' | 'failed';
  gateway?: 'razorpay' | 'payu' | 'stripe';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
```

**Response**: `200 OK`
```typescript
{
  recharges: Array<{
    id: string;
    sellerId: string;
    sellerName: string;
    amount: number;
    gateway: string;
    gatewayOrderId: string;
    status: string;
    promoCode?: string;
    discount?: number;
    finalAmount: number;
    createdAt: string;
    completedAt?: string;
  }>;
  summary: {
    totalAmount: number;
    successfulCount: number;
    pendingCount: number;
    failedCount: number;
  };
  pagination: { /* ... */ };
}
```

---

### 3.2 Get Manual Billing Entries
```
GET /api/admin/billing/manual-entries
```

**Authentication**: Required (Admin only)

**Response**: `200 OK`
```typescript
{
  entries: Array<{
    id: string;
    sellerId: string;
    sellerName: string;
    type: 'credit' | 'debit';
    amount: number;
    reason: string;
    createdBy: string;
    createdByName: string;
    createdAt: string;
  }>;
}
```

---

### 3.3 Create Manual Billing Entry
```
POST /api/admin/billing/manual-entry
```

**Authentication**: Required (Admin only)

**Request Body**:
```typescript
{
  sellerId: string;
  type: 'credit' | 'debit';
  amount: number;           // Positive number
  reason: string;           // Min 10 chars
  sendNotification: boolean;
}
```

**Response**: `201 Created`
```typescript
{
  entry: {
    id: string;
    sellerId: string;
    type: string;
    amount: number;
    reason: string;
    newBalance: number;
    createdBy: string;
    createdAt: string;
  };
}
```

**Validation**:
- Amount must be > 0
- Reason minimum 10 characters
- Seller must exist and be active
- For debit: Check seller has sufficient balance

---

## 4. SELLER WEIGHT DISCREPANCIES

### 4.1 Get Weight Discrepancies
```
GET /api/weight-discrepancies
```

**Authentication**: Required (Seller)

**Query Parameters**:
```typescript
{
  status?: 'pending' | 'accepted' | 'disputed' | 'resolved';
  page?: number;
  limit?: number;
}
```

**Response**: `200 OK`
```typescript
{
  discrepancies: Array<{
    id: string;
    awb: string;
    orderId: string;
    chargedWeight: number;
    actualWeight: number;
    difference: number;
    differencePercentage: number;
    additionalCharge: number;
    courier: {
      id: string;
      name: string;
    };
    status: string;
    reportedAt: string;
    resolvedAt?: string;
    disputeReason?: string;
  }>;
  stats: {
    total: number;
    pending: number;
    additionalCharges: number;
    disputesWonRate: number;  // Percentage
  };
  pagination: { /* ... */ };
}
```

---

### 4.2 Accept Weight Discrepancy
```
POST /api/weight-discrepancies/:id/accept
```

**Authentication**: Required (Seller)

**Response**: `200 OK`
```typescript
{
  message: 'Discrepancy accepted';
  discrepancy: {
    id: string;
    status: 'accepted';
    acceptedAt: string;
    chargeApplied: boolean;
  };
  walletUpdate: {
    previousBalance: number;
    chargeAmount: number;
    newBalance: number;
  };
}
```

---

### 4.3 Dispute Weight Discrepancy
```
POST /api/weight-discrepancies/:id/dispute
```

**Authentication**: Required (Seller)

**Request Body**:
```typescript
{
  reason: string;               // Min 20 chars
  evidenceUrls: string[];       // Image URLs, max 5
  comments?: string;
}
```

**Response**: `201 Created`
```typescript
{
  dispute: {
    id: string;
    discrepancyId: string;
    status: 'under_review';
    reason: string;
    evidenceUrls: string[];
    submittedAt: string;
    expectedResolutionDate: string;
  };
}
```

---

### 4.4 Get Weight Discrepancy Stats
```
GET /api/weight-discrepancies/stats
```

**Authentication**: Required (Seller)

**Response**: `200 OK`
```typescript
{
  total: number;
  pending: number;
  accepted: number;
  disputed: number;
  resolved: number;
  additionalCharges: number;
  disputesWon: number;
  disputesLost: number;
  disputesWonRate: number;      // Percentage
  avgDiscrepancyPercentage: number;
}
```

---

## 5. SELLER LABEL GENERATION

### 5.1 Get Shipment Label Data
```
GET /api/shipments/:awb/label-data
```

**Authentication**: Required (Seller)

**Response**: `200 OK`
```typescript
{
  shipment: {
    awb: string;
    orderId: string;
    shipper: {
      name: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      phone: string;
    };
    consignee: {
      name: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      phone: string;
    };
    product: {
      description: string;
      quantity: number;
      weight: number;
      dimensions: { length: number; width: number; height: number; };
      value: number;
    };
    courier: {
      name: string;
      logo: string;
      serviceType: string;
    };
    barcode: string;            // Base64 or URL
    qrCode: string;             // Base64 or URL
    estimatedDelivery: string;
    specialInstructions?: string;
  };
}
```

**Errors**:
- `404 Not Found` - Shipment not found or not owned by seller
- `400 Bad Request` - Shipment not yet created (order pending)

---

### 5.2 Print Label
```
POST /api/labels/print
```

**Authentication**: Required (Seller)

**Request Body**:
```typescript
{
  awbNumbers: string[];         // Max 100
  printerName?: string;         // Optional
  copies: number;               // Default 1, Max 5
  paperSize: 'A4' | 'A6' | '4x6';
}
```

**Response**: `200 OK`
```typescript
{
  printJob: {
    id: string;
    status: 'queued' | 'printing' | 'completed';
    awbNumbers: string[];
    copies: number;
    createdAt: string;
  };
}
```

---

### 5.3 Download Label PDF
```
GET /api/labels/:awb/download
```

**Authentication**: Required (Seller)

**Query Parameters**:
```typescript
{
  paperSize?: 'A4' | 'A6' | '4x6';  // Default A4
}
```

**Response**: `200 OK`
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="label-{awb}.pdf"`
- Binary PDF data

---

## 6. SELLER KYC VERIFICATION

### 6.1 Verify PAN
```
POST /api/kyc/verify-pan
```

**Authentication**: Required (Seller)

**Request Body**:
```typescript
{
  panNumber: string;            // Format: ABCDE1234F
}
```

**Response**: `200 OK`
```typescript
{
  valid: boolean;
  name: string;
  category: 'Individual' | 'Company' | 'Firm';
  verifiedAt: string;
}
```

**Validation**:
- PAN format: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
- Call external PAN verification API

**Errors**:
- `400 Bad Request` - Invalid PAN format
- `422 Unprocessable Entity` - PAN verification failed

---

### 6.2 Verify GSTIN
```
POST /api/kyc/verify-gstin
```

**Authentication**: Required (Seller)

**Request Body**:
```typescript
{
  gstin: string;                // Format: 15 chars
}
```

**Response**: `200 OK`
```typescript
{
  valid: boolean;
  businessName: string;
  tradeName?: string;
  address: string;
  stateCode: string;
  registrationDate: string;
  constitutionOfBusiness: string;
  taxpayerType: string;
  gstStatus: 'Active' | 'Cancelled';
}
```

---

### 6.3 Lookup IFSC Code
```
GET /api/kyc/ifsc/:code
```

**Authentication**: Required (Seller)

**Response**: `200 OK`
```typescript
{
  ifsc: string;
  bank: string;
  branch: string;
  address: string;
  city: string;
  state: string;
  micr?: string;
  swift?: string;
}
```

**Errors**:
- `404 Not Found` - Invalid IFSC code

---

### 6.4 Verify Bank Account
```
POST /api/kyc/verify-bank
```

**Authentication**: Required (Seller)

**Request Body**:
```typescript
{
  accountNumber: string;
  ifsc: string;
  accountHolderName: string;
}
```

**Response**: `200 OK`
```typescript
{
  verified: boolean;
  nameMatch: boolean;           // True if name matches exactly
  actualName?: string;          // Bank's record
  accountType: 'Savings' | 'Current';
  accountStatus: 'Active' | 'Inactive';
}
```

**Implementation**:
- Use bank account verification API (Razorpay X, Cashfree, etc.)
- Fuzzy match on name (allow minor differences)

---

### 6.5 Submit KYC
```
POST /api/kyc/submit
```

**Authentication**: Required (Seller)

**Request Body**:
```typescript
{
  panDetails: {
    number: string;
    name: string;
    documentUrl: string;        // Uploaded PAN card image
  };
  gstDetails?: {
    gstin: string;
    businessName: string;
    documentUrl: string;
  };
  bankDetails: {
    accountNumber: string;
    ifsc: string;
    accountHolderName: string;
    accountType: 'Savings' | 'Current';
    documentUrl: string;        // Cancelled cheque / bank statement
  };
  addressProof: {
    type: 'AadharCard' | 'VoterID' | 'DrivingLicense' | 'Passport';
    number: string;
    documentUrl: string;
  };
}
```

**Response**: `201 Created`
```typescript
{
  kyc: {
    id: string;
    status: 'pending';
    submittedAt: string;
    expectedVerificationDate: string;
  };
}
```

**Validation**:
- All document URLs must be accessible
- PAN and GSTIN must be pre-verified
- Bank account must be pre-verified

---

### 6.6 Get KYC Status
```
GET /api/kyc/status
```

**Authentication**: Required (Seller)

**Response**: `200 OK`
```typescript
{
  status: 'not_started' | 'pending' | 'verified' | 'rejected';
  submittedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  fields: {
    pan: { verified: boolean; verifiedAt?: string; };
    gstin: { verified: boolean; verifiedAt?: string; };
    bank: { verified: boolean; verifiedAt?: string; };
    address: { verified: boolean; verifiedAt?: string; };
  };
}
```

---

## 7. SELLER WALLET RECHARGE

### 7.1 Validate Promo Code
```
POST /api/wallet/validate-promo
```

**Authentication**: Required (Seller)

**Request Body**:
```typescript
{
  promoCode: string;
  amount: number;
}
```

**Response**: `200 OK`
```typescript
{
  valid: boolean;
  discount: number;             // Absolute amount
  discountPercentage?: number;
  finalAmount: number;
  promoDetails: {
    code: string;
    description: string;
    minAmount: number;
    maxDiscount: number;
    expiresAt: string;
  };
}
```

**Errors**:
- `400 Bad Request` - Invalid or expired promo code
- `422 Unprocessable Entity` - Amount below minimum

---

### 7.2 Initiate Recharge
```
POST /api/wallet/recharge
```

**Authentication**: Required (Seller)

**Request Body**:
```typescript
{
  amount: number;               // Min: 500, Max: 500000
  promoCode?: string;
  gateway: 'razorpay' | 'payu' | 'stripe';
  returnUrl?: string;           // Redirect after payment
}
```

**Response**: `201 Created`
```typescript
{
  payment: {
    id: string;
    orderId: string;
    amount: number;
    gateway: string;
    gatewayOrderId: string;
    gatewayUrl: string;         // Redirect user here
    status: 'pending';
    expiresAt: string;
    createdAt: string;
  };
}
```

**Implementation**:
- Create payment order in gateway (Razorpay, etc.)
- Store payment record in DB
- Return gateway URL for redirect
- Set up webhook for payment confirmation

---

### 7.3 Get Payment Status
```
GET /api/payment/status/:paymentId
```

**Authentication**: Required (Seller)

**Response**: `200 OK`
```typescript
{
  id: string;
  orderId: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  amount: number;
  discount: number;
  finalAmount: number;
  gateway: string;
  gatewayTransactionId?: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  walletUpdate?: {
    previousBalance: number;
    creditedAmount: number;
    newBalance: number;
  };
}
```

**Polling**:
- Frontend should poll this endpoint every 2s for pending payments
- Stop polling after success/failed/5 minutes

---

### 7.4 Payment Webhook (Internal)
```
POST /webhooks/payment/razorpay
```

**Authentication**: Webhook signature verification

**Purpose**: Handle payment gateway callbacks
- Verify webhook signature
- Update payment status in DB
- Credit wallet on success
- Send notification to user

---

## 🟡 MEDIUM PRIORITY ENDPOINTS (Phase 2)

---

## 8. ADMIN PROFIT TRACKING

### 8.1 Get Profit Data
```
GET /api/admin/profit/data
```

**Query Parameters**:
```typescript
{
  sellerId?: string;
  dateFrom?: string;
  dateTo?: string;
  courierId?: string;
  groupBy?: 'day' | 'week' | 'month';
}
```

**Response**: `200 OK`
```typescript
{
  profitData: Array<{
    date: string;
    sellerId: string;
    sellerName: string;
    totalOrders: number;
    revenue: number;
    shippingCost: number;
    platformFee: number;
    profit: number;
    margin: number;             // Percentage
  }>;
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgMargin: number;
  };
}
```

---

### 8.2 Import Profit Data
```
POST /api/admin/profit/import
```

**Authentication**: Required (Admin only)

**Request**: `multipart/form-data`
```typescript
{
  file: File;                   // CSV or Excel
  overwrite: boolean;           // Overwrite existing data
}
```

**Response**: `200 OK`
```typescript
{
  import: {
    id: string;
    fileName: string;
    status: 'processing' | 'completed' | 'failed';
    recordsProcessed: number;
    recordsInserted: number;
    recordsUpdated: number;
    errors: Array<{ row: number; error: string; }>;
    startedAt: string;
    completedAt?: string;
  };
}
```

---

### 8.3 Get Import History
```
GET /api/admin/profit/import-history
```

**Response**: Array of import records (similar to 8.2 response)

---

### 8.4 Export Profit Data
```
GET /api/admin/profit/export
```

**Query Parameters**: Same as 8.1

**Response**: `200 OK`
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Binary Excel file with profit data

---

## 9. ADMIN FINANCIALS

### 9.1 Get Financials Overview
```
GET /api/admin/financials/overview
```

**Response**: `200 OK`
```typescript
{
  overview: {
    totalBalance: number;
    totalInflow: number;
    totalOutflow: number;
    pendingPayouts: number;
    escrowBalance: number;
    availableBalance: number;
  };
  recentActivity: {
    todayInflow: number;
    todayOutflow: number;
    weekInflow: number;
    weekOutflow: number;
  };
}
```

---

### 9.2 Get Admin Transactions
```
GET /api/admin/financials/transactions
```

**Query Parameters**:
```typescript
{
  type?: 'credit' | 'debit';
  category?: 'recharge' | 'shipping' | 'refund' | 'commission';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
```

**Response**: Transactions array with pagination

---

## 10. ADMIN NDR & RETURNS

### 10.1 Get Admin NDR List
```
GET /api/admin/ndr/list
```

**Query Parameters**:
```typescript
{
  status?: string;
  sellerId?: string;
  courierId?: string;
  page?: number;
  limit?: number;
}
```

**Response**: `200 OK`
```typescript
{
  ndrs: Array<{
    id: string;
    awb: string;
    sellerId: string;
    sellerName: string;
    customerName: string;
    reason: string;
    status: string;
    attempts: number;
    lastAttemptDate: string;
    nextAttemptDate: string;
    createdAt: string;
  }>;
  pagination: { /* ... */ };
}
```

---

### 10.2 Get NDR Funnel
```
GET /api/admin/ndr/funnel
```

**Response**: `200 OK`
```typescript
{
  funnel: {
    total: number;
    inProgress: number;
    resolved: number;
    failed: number;
    conversionRate: number;
  };
  breakdown: {
    byReason: Record<string, number>;
    byCourier: Record<string, number>;
  };
}
```

---

### 10.3 Get Admin Returns
```
GET /api/admin/returns
```

**Response**: Similar to NDR list

---

### 10.4 Resolve Return
```
PUT /api/admin/returns/:id/resolve
```

**Request Body**:
```typescript
{
  resolution: 'refund' | 'replace' | 'credit_note';
  amount?: number;
  notes: string;
}
```

**Response**: Updated return record

---

## 11. SELLER B2B RATES

### 11.1 Calculate B2B Rates
```
POST /api/rates/b2b/calculate
```

**Request Body**:
```typescript
{
  fromPincode: string;
  toPincode: string;
  weight: number;
  dimensions: { length: number; width: number; height: number; };
  quantity: number;
  paymentMode: 'prepaid' | 'cod';
}
```

**Response**: `200 OK`
```typescript
{
  rates: Array<{
    courierId: string;
    courierName: string;
    serviceType: string;
    perUnitRate: number;
    totalUnits: number;
    volumetricWeight: number;
    chargedWeight: number;
    baseRate: number;
    fuelSurcharge: number;
    codCharges?: number;
    totalRate: number;
    estimatedDays: number;
  }>;
  volumetricDivisor: number;
  calculatedAt: string;
}
```

---

## 12. SELLER TRACKING

### 12.1 Track Shipment
```
GET /api/tracking/:awb
```

**Authentication**: Optional (Public endpoint with rate limiting)

**Response**: `200 OK`
```typescript
{
  shipment: {
    awb: string;
    status: string;
    currentLocation: string;
    estimatedDelivery: string;
    courier: { id: string; name: string; };
    timeline: Array<{
      timestamp: string;
      location: string;
      status: string;
      description: string;
      scanType: string;
    }>;
    shipper: { name: string; city: string; };
    consignee: { name: string; city: string; pincode: string; };
  };
}
```

**Implementation**:
- Fetch from courier's tracking API
- Cache for 5 minutes
- Rate limit: 60 requests/minute per IP

---

### 12.2 Bulk Tracking
```
GET /api/tracking/bulk
```

**Query Parameters**:
```typescript
{
  awbs: string[];               // Max 50
}
```

**Response**: Array of tracking data (same as 12.1)

---

## 13. SELLER COD SETTINGS

### 13.1 Get COD Payout Schedule
```
GET /api/cod/payout-schedule
```

**Response**: `200 OK`
```typescript
{
  schedule: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    dayOfWeek?: number;         // 0-6 for weekly
    dayOfMonth?: number;        // 1-31 for monthly
    minimumAmount: number;
    bankAccount: {
      accountNumber: string;    // Masked
      ifsc: string;
      accountHolderName: string;
      verified: boolean;
    };
  };
  nextPayout: {
    date: string;
    estimatedAmount: number;
  };
}
```

---

### 13.2 Update COD Payout Schedule
```
PUT /api/cod/payout-schedule
```

**Request Body**:
```typescript
{
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  minimumAmount?: number;
}
```

**Response**: Updated schedule

---

### 13.3 Get Bank Account Details
```
GET /api/settings/bank-account
```

**Response**: `200 OK`
```typescript
{
  bankAccount: {
    accountNumber: string;      // Masked: XXXX1234
    ifsc: string;
    accountHolderName: string;
    accountType: 'Savings' | 'Current';
    bankName: string;
    branchName: string;
    verified: boolean;
    verifiedAt?: string;
  };
}
```

---

## 🟢 LOW PRIORITY ENDPOINTS (Phase 3)

---

## 14. ADMIN ANALYTICS & INTELLIGENCE

### 14.1 Get Delivery Performance Analytics
```
GET /api/admin/analytics/delivery-performance
```

**Query Parameters**:
```typescript
{
  from: string;                 // ISO date
  to: string;
}
```

**Response**: Time series data for delivery, RTO, NDR rates

---

### 14.2 Get Zone Distribution
```
GET /api/admin/analytics/zone-distribution
```

**Response**: Geographic distribution of orders

---

### 14.3 Get AI Predictions
```
GET /api/admin/intelligence/predictions
```

**Response**: `200 OK`
```typescript
{
  predictions: Array<{
    type: 'demand_forecast' | 'rto_risk' | 'peak_volume';
    confidence: number;
    prediction: any;
    horizon: string;
    generatedAt: string;
  }>;
}
```

---

### 14.4 Get Anomaly Detection
```
GET /api/admin/intelligence/anomalies
```

**Response**: Real-time anomalies (unusual patterns, spikes, etc.)

---

### 14.5 Get AI Insights
```
GET /api/admin/intelligence/insights
```

**Response**: AI-generated business insights

---

## 15. ADMIN RATE CARD MANAGEMENT

### 15.1 Get Rate Card Assignments
```
GET /api/admin/ratecards/assignments
```

**Response**: List of seller-ratecard assignments

---

### 15.2 Assign Rate Card
```
POST /api/admin/ratecards/assign
```

**Request Body**:
```typescript
{
  rateCardId: string;
  sellerId: string;
  priority: number;             // Higher = preferred
  effectiveFrom?: string;
}
```

**Response**: Created assignment

---

### 15.3 Unassign Rate Card
```
DELETE /api/admin/ratecards/unassign/:assignmentId
```

**Response**: `204 No Content`

---

### 15.4 Get Available Couriers
```
GET /api/admin/ratecards/couriers
```

**Response**: `200 OK`
```typescript
{
  couriers: Array<{
    id: string;
    name: string;
    logo: string;
    services: Array<{
      id: string;
      name: string;
      type: 'surface' | 'air' | 'express';
    }>;
    active: boolean;
  }>;
}
```

---

## 16. NOTIFICATIONS

### 16.1 Get Notifications
```
GET /api/notifications
```

**Query Parameters**:
```typescript
{
  read?: boolean;
  page?: number;
  limit?: number;
}
```

**Response**: `200 OK`
```typescript
{
  notifications: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    category: 'order' | 'wallet' | 'system' | 'kyc';
    title: string;
    message: string;
    read: boolean;
    actionUrl?: string;
    createdAt: string;
  }>;
  unreadCount: number;
  pagination: { /* ... */ };
}
```

---

### 16.2 Mark Notification Read
```
POST /api/notifications/:id/read
```

**Response**: `200 OK`

---

### 16.3 Mark All Read
```
POST /api/notifications/mark-all-read
```

**Response**: `200 OK`

---

### 16.4 WebSocket: Real-time Notifications
```
WebSocket: /notifications
```

**Authentication**: JWT in query param or header

**Events**:
```typescript
// Server → Client
{
  event: 'new-notification';
  data: Notification;
}

{
  event: 'notification-read';
  data: { id: string; };
}
```

---

## 17. SELLER HEALTH (ADMIN)

### 17.1 Get Seller Health Metrics
```
GET /api/admin/seller-health
```

**Query Parameters**:
```typescript
{
  status?: 'healthy' | 'warning' | 'critical';
  metric?: 'rto_rate' | 'revenue' | 'order_volume';
  sortBy?: 'rtoRate' | 'revenue' | 'orderTrend';
}
```

**Response**: `200 OK`
```typescript
{
  sellers: Array<{
    sellerId: string;
    companyName: string;
    healthScore: number;        // 0-100
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      revenue: {
        current: number;
        previous: number;
        change: number;         // Percentage
      };
      rtoRate: {
        current: number;
        previous: number;
        change: number;
      };
      orderTrend: {
        current: number;
        previous: number;
        change: number;
      };
      walletBalance: number;
      avgShippingCost: number;
    };
    alerts: Array<{
      type: 'warning' | 'critical';
      message: string;
    }>;
  }>;
}
```

---

## 18. COURIER RECOMMENDATIONS

### 18.1 Get Courier Recommendations
```
POST /api/courier-recommendations
```

**Request Body**:
```typescript
{
  orderData: {
    fromPincode: string;
    toPincode: string;
    weight: number;
    dimensions: { length: number; width: number; height: number; };
    paymentMode: 'prepaid' | 'cod';
    declaredValue: number;
  };
  preferences?: {
    prioritize: 'cost' | 'speed' | 'reliability';
  };
}
```

**Response**: `200 OK`
```typescript
{
  recommendations: Array<{
    courierId: string;
    courierName: string;
    score: number;              // 0-100
    reasoning: string[];
    rate: number;
    estimatedDays: number;
    reliability: number;        // Historical success rate
    recommended: boolean;       // Top recommendation
  }>;
  generatedAt: string;
}
```

---

## 🔒 AUTHENTICATION & AUTHORIZATION

### Common Headers
All authenticated endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

### JWT Token Structure
```typescript
{
  sub: string;                  // User ID
  role: 'admin' | 'seller';
  email: string;
  companyId?: string;
  iat: number;
  exp: number;
}
```

### Role-Based Access Control

**Admin Endpoints**: `/api/admin/*`
- Require `role: 'admin'`
- Return 403 Forbidden for sellers

**Seller Endpoints**: `/api/*` (except admin)
- Require `role: 'seller'`
- Data filtered by `companyId`

---

## 📝 COMMON RESPONSE FORMATS

### Success Response
```typescript
{
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
```

### Error Response
```typescript
{
  error: {
    code: string;               // ERROR_CODE
    message: string;
    details?: any;
    field?: string;             // For validation errors
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
```

### Pagination Format
```typescript
{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
```

---

## 🔧 VALIDATION RULES

### Common Validations

**Pincode**:
- Format: 6 digits
- Pattern: `/^[1-9][0-9]{5}$/`

**Phone**:
- Format: 10 digits
- Pattern: `/^[6-9][0-9]{9}$/`

**Email**:
- RFC 5322 compliant

**Weight**:
- Min: 0.01 kg
- Max: 500 kg
- Decimals: 2

**Amount**:
- Min: 0.01
- Max: 10000000
- Decimals: 2

---

## 🚨 ERROR CODES

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success, no response body
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate or state conflict
- `422 Unprocessable Entity` - Business logic error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Maintenance mode

### Custom Error Codes

```typescript
enum ErrorCode {
  // Authentication
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED_TOKEN = 'AUTH_EXPIRED_TOKEN',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_PINCODE = 'INVALID_PINCODE',
  INVALID_PHONE = 'INVALID_PHONE',

  // Business Logic
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  ORDER_ALREADY_SHIPPED = 'ORDER_ALREADY_SHIPPED',
  KYC_NOT_VERIFIED = 'KYC_NOT_VERIFIED',
  SELLER_SUSPENDED = 'SELLER_SUSPENDED',

  // External Services
  COURIER_API_ERROR = 'COURIER_API_ERROR',
  PAYMENT_GATEWAY_ERROR = 'PAYMENT_GATEWAY_ERROR',
}
```

---

## 🔄 RATE LIMITING

### Default Limits

- **Authenticated users**: 1000 requests/hour
- **Public endpoints**: 100 requests/hour per IP
- **Tracking endpoint**: 60 requests/minute per IP
- **Payment endpoints**: 10 requests/minute per user

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1643723400
```

---

## 📊 SUMMARY

### Endpoint Count by Module

| Module | Endpoints | Priority |
|--------|-----------|----------|
| Admin Orders | 3 | High |
| Admin Sellers | 4 | High |
| Admin Billing | 3 | High |
| Weight Discrepancies | 4 | High |
| Label Generation | 3 | High |
| KYC Verification | 6 | High |
| Wallet Recharge | 4 | High |
| Admin Profit | 4 | Medium |
| Admin Financials | 2 | Medium |
| Admin NDR/Returns | 4 | Medium |
| B2B Rates | 1 | Medium |
| Tracking | 2 | Medium |
| COD Settings | 3 | Medium |
| Analytics | 5 | Low |
| Rate Cards | 4 | Low |
| Notifications | 4 | Low |
| Seller Health | 1 | Low |
| Recommendations | 1 | Low |

**Total**: 67 endpoints

---

## 🎯 NEXT STEPS

1. **Backend Team**: Implement endpoints in priority order
2. **Frontend Team**: Create API clients and hooks as endpoints become available
3. **QA Team**: Test each endpoint with Postman/automated tests
4. **DevOps**: Set up monitoring for all endpoints

---

**End of API Requirements Document**

*This specification is comprehensive and ready for backend implementation. All endpoints include request/response schemas, validation rules, error handling, and security requirements.*
