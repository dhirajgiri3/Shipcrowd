# COMPREHENSIVE ERROR HANDLING, API RESPONSE & MISSING FEATURES IMPLEMENTATION PLAN

## Executive Summary

**Critical Issues Identified:**
1. **Response Inconsistency Crisis**: Integration controllers (8 files, 64 violations) use direct `res.json()` instead of response helpers - 0% compliance
2. **Missing Financial Features**: COD Remittance Dashboard & Wallet System have models but NO API/Service layer implementation
3. **Missing Address Validation**: No address validation service exists despite courier integrations requiring validated addresses
4. **16 Broken Controllers**: Previous fixes completed, but response standardization remains incomplete
5. **KYC Enforcement Gaps**: Integration routes (Amazon, WooCommerce, Flipkart) missing KYC checks
6. **Service Layer Errors**: 15+ services return null instead of throwing exceptions

**Timeline**: 2-3 weeks full implementation
**Priority**: CRITICAL - affects frontend integration, financial operations, and courier API reliability

---

## PHASE 1: FOUNDATION - ADD MISSING ERROR CODES & VALIDATION SCHEMAS

### Duration: 1 day
### Status: ✅ COMPLETED (error codes added in previous work)

**Already Added Error Codes:**
```typescript
// /server/src/shared/errors/errorCodes.ts
VALIDATION_ERROR = 'VALIDATION_ERROR',
BIZ_SHIPMENT_EXISTS = 'BIZ_SHIPMENT_EXISTS',
BIZ_TRACKING_NUMBER_GENERATION_FAILED = 'BIZ_TRACKING_NUMBER_GENERATION_FAILED',
BIZ_ORDER_NUMBER_GENERATION_FAILED = 'BIZ_ORDER_NUMBER_GENERATION_FAILED',
BIZ_CONCURRENT_MODIFICATION = 'BIZ_CONCURRENT_MODIFICATION',
AUTH_INVALID_PASSWORD = 'AUTH_INVALID_PASSWORD',
AUTH_VERIFICATION_FAILED = 'AUTH_VERIFICATION_FAILED',
BIZ_SETUP_FAILED = 'BIZ_SETUP_FAILED',
RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
```

**Additional Error Codes Needed for Financial Features:**
```typescript
// Financial-specific errors
BIZ_INSUFFICIENT_BALANCE = 'BIZ_INSUFFICIENT_BALANCE',
BIZ_WALLET_TRANSACTION_FAILED = 'BIZ_WALLET_TRANSACTION_FAILED',
BIZ_COD_REMITTANCE_FAILED = 'BIZ_COD_REMITTANCE_FAILED',
BIZ_PAYOUT_FAILED = 'BIZ_PAYOUT_FAILED',

// Address validation errors
VAL_ADDRESS_INVALID = 'VAL_ADDRESS_INVALID',
VAL_PINCODE_INVALID = 'VAL_PINCODE_INVALID',
VAL_PINCODE_NOT_SERVICEABLE = 'VAL_PINCODE_NOT_SERVICEABLE',
```

**New Validation Schemas Needed:**
- **File**: `/server/src/shared/validation/schemas/address.schemas.ts` (NEW FILE)
- **File**: `/server/src/shared/validation/schemas/financial.schemas.ts` (NEW FILE)

**Address Schema Structure:**
```typescript
// Indian address validation with pincode lookup
export const pincodeSchema = z
    .string()
    .regex(/^[1-9][0-9]{5}$/, 'Invalid Indian pincode')
    .length(6, 'Pincode must be 6 digits');

export const addressSchema = z.object({
    line1: safeStringSchema(3, 200, 'Address Line 1'),
    line2: safeStringSchema(0, 200, 'Address Line 2').optional(),
    landmark: safeStringSchema(0, 100, 'Landmark').optional(),
    city: safeStringSchema(2, 100, 'City'),
    state: safeStringSchema(2, 100, 'State'),
    pincode: pincodeSchema,
    country: z.literal('India').default('India'),
});
```

**Financial Schema Structure:**
```typescript
// Wallet & COD validation
export const walletAmountSchema = z
    .number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount cannot exceed ₹10,00,000');

export const codRemittanceSchema = z.object({
    companyId: objectIdSchema('Company'),
    cutoffDate: dateSchema,
    scheduleType: z.enum(['scheduled', 'on_demand', 'manual']),
});
```

---

## PHASE 2: ADDRESS VALIDATION SERVICE IMPLEMENTATION

### Duration: 3 days
### Priority: HIGH (Required for courier integrations)

### 2.1 Create Address Validation Service

**File**: `/server/src/core/application/services/logistics/address-validation.service.ts` (NEW FILE)

**Capabilities:**
1. **Pincode Validation**: Check if pincode exists in Indian postal system
2. **Serviceability Check**: Verify if courier partners service the area
3. **Address Standardization**: Format addresses per courier requirements
4. **Distance Calculation**: Calculate distances between pincodes for rate cards

**Service Structure:**
```typescript
export default class AddressValidationService {
    /**
     * Validate Indian pincode and return location details
     */
    static async validatePincode(pincode: string): Promise<{
        valid: boolean;
        city?: string;
        state?: string;
        district?: string;
        serviceability: {
            delhivery: boolean;
            bluedart: boolean;
            ecom: boolean;
            dtdc: boolean;
        };
    }>;

    /**
     * Standardize address for courier API submission
     */
    static async standardizeAddress(
        address: AddressInput
    ): Promise<StandardizedAddress>;

    /**
     * Check if both pincodes are serviceable by specific courier
     */
    static async checkServiceability(
        fromPincode: string,
        toPincode: string,
        courierId: string
    ): Promise<{
        serviceable: boolean;
        estimatedDays?: number;
        restrictions?: string[];
    }>;

    /**
     * Calculate distance between two pincodes (for rate calculation)
     */
    static async calculateDistance(
        fromPincode: string,
        toPincode: string
    ): Promise<{
        distanceKm: number;
        zone: 'local' | 'regional' | 'national';
    }>;
}
```

**Dependencies:**
- **External API**: Use India Post API or Pincode.in API for validation
- **Database**: Create `Pincode` model with serviceability matrix
- **Cache**: Redis cache for frequently accessed pincodes (reduce API calls)

**Model Required**: `/server/src/infrastructure/database/mongoose/models/logistics/pincode.model.ts` (NEW FILE)

```typescript
export interface IPincode extends Document {
    pincode: string; // 6-digit code
    postOffice: string;
    district: string;
    state: string;
    city: string;
    region: 'North' | 'South' | 'East' | 'West' | 'Northeast' | 'Central';

    // Serviceability matrix (updated via courier APIs)
    serviceability: {
        delhivery: { available: boolean; lastChecked: Date };
        bluedart: { available: boolean; lastChecked: Date };
        ecom: { available: boolean; lastChecked: Date };
        dtdc: { available: boolean; lastChecked: Date };
    };

    // Coordinates for distance calculation
    coordinates?: {
        latitude: number;
        longitude: number;
    };

    createdAt: Date;
    updatedAt: Date;
}
```

**Seeder Required**: `/server/src/infrastructure/database/seeders/seeders/XX-pincodes.seeder.ts` (NEW FILE)
- Import ~19,000 Indian pincodes from CSV (India Post dataset)
- Populate serviceability matrix with default values

### 2.2 Integrate Address Validation into Order/Shipment Flow

**Files to Update:**
1. `/server/src/presentation/http/controllers/shipping/order.controller.ts` (lines 50-100)
   - Add address validation in `createOrder()` before accepting order

2. `/server/src/presentation/http/controllers/shipping/shipment.controller.ts` (lines 70-120)
   - Validate both pickup and delivery addresses before shipment creation

3. `/server/src/core/application/services/shipping/order.service.ts` (lines 89-150)
   - Call `AddressValidationService.validatePincode()` before order confirmation

**Validation Pattern:**
```typescript
// In order.controller.ts - createOrder()
const pickupValidation = await AddressValidationService.validatePincode(
    pickupAddress.pincode
);
if (!pickupValidation.valid) {
    throw new ValidationError(
        'Invalid pickup pincode',
        ErrorCode.VAL_PINCODE_INVALID
    );
}

const deliveryValidation = await AddressValidationService.validatePincode(
    deliveryAddress.pincode
);
if (!deliveryValidation.valid) {
    throw new ValidationError(
        'Invalid delivery pincode',
        ErrorCode.VAL_PINCODE_INVALID
    );
}

const serviceability = await AddressValidationService.checkServiceability(
    pickupAddress.pincode,
    deliveryAddress.pincode,
    selectedCourierId
);
if (!serviceability.serviceable) {
    throw new ValidationError(
        'Selected courier does not service this route',
        ErrorCode.VAL_PINCODE_NOT_SERVICEABLE
    );
}
```

### 2.3 Create Address Validation API Endpoints

**File**: `/server/src/presentation/http/controllers/logistics/address.controller.ts` (NEW FILE)

**Endpoints:**
```typescript
// GET /api/v1/logistics/address/validate-pincode/:pincode
export const validatePincode = async (req, res, next) => {
    // Returns: { valid, city, state, serviceability }
};

// POST /api/v1/logistics/address/check-serviceability
export const checkServiceability = async (req, res, next) => {
    // Body: { fromPincode, toPincode, courierId }
    // Returns: { serviceable, estimatedDays, restrictions }
};

// POST /api/v1/logistics/address/calculate-distance
export const calculateDistance = async (req, res, next) => {
    // Body: { fromPincode, toPincode }
    // Returns: { distanceKm, zone }
};
```

**Route File**: `/server/src/presentation/http/routes/v1/logistics/address.routes.ts` (NEW FILE)

**Update Index Router**: Add to `/server/src/presentation/http/routes/v1/index.ts` (line 89):
```typescript
import addressRoutes from './logistics/address.routes';
router.use('/logistics/address', addressRoutes);
```

---

## PHASE 3: COD REMITTANCE DASHBOARD - SERVICE & API IMPLEMENTATION

### Duration: 4 days
### Priority: CRITICAL (Financial feature - revenue blocking)

### 3.1 Existing Model Analysis

**Existing Model**: `/server/src/infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model.ts`
- ✅ Complete model with 448 lines
- ✅ Comprehensive schema covering batch processing, approvals, Razorpay integration
- ✅ Proper indexes for performance
- ❌ NO SERVICE LAYER EXISTS
- ❌ NO CONTROLLER EXISTS
- ❌ NO API ROUTES EXIST

**What Needs to Be Built:**

### 3.2 Create COD Remittance Service

**File**: `/server/src/core/application/services/finance/cod-remittance.service.ts` (NEW FILE)

**Service Methods:**
```typescript
export default class CODRemittanceService {
    /**
     * Create new COD remittance batch
     * Aggregates eligible shipments and calculates deductions
     */
    static async createRemittanceBatch(
        companyId: string,
        scheduleType: 'scheduled' | 'on_demand' | 'manual',
        cutoffDate: Date,
        requestedBy?: string
    ): Promise<{
        remittanceId: string;
        financial: {
            totalCODCollected: number;
            netPayable: number;
            deductionsSummary: object;
        };
        shipmentCount: number;
    }>;

    /**
     * Get eligible shipments for remittance
     * Only includes delivered COD shipments not already in a batch
     */
    static async getEligibleShipments(
        companyId: string,
        cutoffDate: Date
    ): Promise<{
        shipments: Array<{
            shipmentId: string;
            awb: string;
            codAmount: number;
            deliveredAt: Date;
            deductions: object;
            netAmount: number;
        }>;
        summary: {
            totalShipments: number;
            totalCOD: number;
            totalDeductions: number;
            netPayable: number;
        };
    }>;

    /**
     * Approve remittance batch (admin action)
     */
    static async approveRemittance(
        remittanceId: string,
        approvedBy: string,
        approvalNotes?: string
    ): Promise<{
        success: boolean;
        remittanceId: string;
        status: 'approved';
    }>;

    /**
     * Initiate payout via Razorpay
     */
    static async initiatePayou(
        remittanceId: string
    ): Promise<{
        success: boolean;
        razorpayPayoutId?: string;
        status: 'processing' | 'failed';
        failureReason?: string;
    }>;

    /**
     * Handle Razorpay payout webhook
     * Updates remittance status when payout completes/fails
     */
    static async handlePayoutWebhook(
        razorpayPayoutId: string,
        status: 'completed' | 'failed',
        failureReason?: string
    ): Promise<void>;

    /**
     * Get remittance details by ID
     */
    static async getRemittanceDetails(
        remittanceId: string,
        companyId?: string
    ): Promise<ICODRemittance>;

    /**
     * List remittances for a company (paginated)
     */
    static async listRemittances(
        companyId: string,
        options: {
            status?: string;
            startDate?: Date;
            endDate?: Date;
            page: number;
            limit: number;
        }
    ): Promise<{
        remittances: ICODRemittance[];
        pagination: PaginationMetadata;
    }>;

    /**
     * Cancel remittance batch (before payout)
     */
    static async cancelRemittance(
        remittanceId: string,
        cancelledBy: string,
        reason: string
    ): Promise<void>;

    /**
     * Generate PDF report for remittance batch
     */
    static async generateRemittanceReport(
        remittanceId: string
    ): Promise<{
        reportUrl: string;
        expiresAt: Date;
    }>;

    /**
     * Get COD remittance statistics for a company
     */
    static async getRemittanceStats(
        companyId: string,
        dateRange: { start: Date; end: Date }
    ): Promise<{
        totalRemittances: number;
        totalCODProcessed: number;
        totalDeductions: number;
        totalPaidOut: number;
        averageProcessingTime: number;
        pendingRemittances: number;
        failedPayouts: number;
    }>;
}
```

**Key Business Logic:**

1. **Eligibility Calculation** (Critical Logic):
```typescript
// Get all delivered COD shipments not already in a remittance
const eligibleShipments = await Shipment.find({
    company: companyId,
    paymentMode: 'COD',
    status: 'DELIVERED',
    deliveredAt: { $lte: cutoffDate },
    'remittance.included': { $ne: true }, // Not already remitted
}).lean();

// Calculate deductions per shipment
for (const shipment of eligibleShipments) {
    const deductions = {
        shippingCharge: shipment.billing.totalAmount, // From rate card
        weightDispute: shipment.disputes?.resolvedAmount || 0,
        rtoCharge: 0, // If RTO then returned
        insuranceCharge: shipment.insurance?.premium || 0,
        platformFee: shipment.codAmount * 0.005, // 0.5% of COD
        otherFees: 0,
        total: 0,
    };
    deductions.total = Object.values(deductions).reduce((a, b) => a + b, 0);

    const netAmount = shipment.codAmount - deductions.total;
    // Add to batch...
}
```

2. **Batch Creation with Version Control**:
```typescript
// Get latest batch number for company
const lastBatch = await CODRemittance.findOne({ companyId })
    .sort({ 'batch.batchNumber': -1 })
    .select('batch.batchNumber');

const batchNumber = (lastBatch?.batch.batchNumber || 0) + 1;
const remittanceId = `REM-${format(new Date(), 'yyyyMMdd')}-${generateShortId()}`;
```

3. **Razorpay Payout Integration**:
```typescript
// Use existing Razorpay setup (check if exists)
const razorpayContactId = company.financial?.razorpayContactId;
const razorpayFundAccountId = company.financial?.razorpayFundAccountId;

if (!razorpayContactId || !razorpayFundAccountId) {
    throw new AppError(
        'Razorpay payout not configured. Please add bank details.',
        ErrorCode.BIZ_SETUP_FAILED,
        400
    );
}

const payout = await razorpay.payouts.create({
    account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
    fund_account_id: razorpayFundAccountId,
    amount: netPayable * 100, // paise
    currency: 'INR',
    mode: 'IMPS', // Instant transfer
    purpose: 'payout',
    queue_if_low_balance: false,
    reference_id: remittanceId,
    narration: `COD Remittance #${batchNumber}`,
});
```

### 3.3 Create COD Remittance Controller

**File**: `/server/src/presentation/http/controllers/finance/cod-remittance.controller.ts` (NEW FILE)

**Endpoints:**
```typescript
// POST /api/v1/finance/cod-remittance/create
// Body: { scheduleType, cutoffDate }
// Auth: Seller only
// Creates new remittance batch
export const createRemittanceBatch = async (req, res, next) => {
    try {
        const companyId = req.user!.company;
        const { scheduleType, cutoffDate } = req.body;

        const result = await CODRemittanceService.createRemittanceBatch(
            companyId,
            scheduleType,
            new Date(cutoffDate),
            req.user!._id.toString()
        );

        sendCreated(res, result, 'COD remittance batch created successfully');
    } catch (error) {
        next(error);
    }
};

// GET /api/v1/finance/cod-remittance/eligible-shipments
// Query: ?cutoffDate=YYYY-MM-DD
// Auth: Seller only
// Preview eligible shipments before creating batch
export const getEligibleShipments = async (req, res, next) => {
    // Implementation...
};

// GET /api/v1/finance/cod-remittance/:id
// Auth: Seller or Admin
// Get remittance details
export const getRemittanceDetails = async (req, res, next) => {
    // Implementation...
};

// GET /api/v1/finance/cod-remittance
// Query: ?status=pending&page=1&limit=10
// Auth: Seller only
// List all remittances for company
export const listRemittances = async (req, res, next) => {
    // Implementation...
};

// POST /api/v1/finance/cod-remittance/:id/approve
// Body: { approvalNotes }
// Auth: Admin only
// Approve remittance batch
export const approveRemittance = async (req, res, next) => {
    // Implementation...
};

// POST /api/v1/finance/cod-remittance/:id/initiate-payout
// Auth: Admin only
// Trigger Razorpay payout
export const initiatePayou = async (req, res, next) => {
    // Implementation...
};

// POST /api/v1/finance/cod-remittance/:id/cancel
// Body: { reason }
// Auth: Seller or Admin
// Cancel remittance batch (before payout)
export const cancelRemittance = async (req, res, next) => {
    // Implementation...
};

// GET /api/v1/finance/cod-remittance/:id/report
// Auth: Seller or Admin
// Download PDF report
export const downloadReport = async (req, res, next) => {
    // Implementation...
};

// GET /api/v1/finance/cod-remittance/stats
// Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Auth: Seller only
// Get remittance statistics
export const getRemittanceStats = async (req, res, next) => {
    // Implementation...
};
```

**Validation Schemas:**
```typescript
const createRemittanceSchema = z.object({
    scheduleType: z.enum(['scheduled', 'on_demand', 'manual']),
    cutoffDate: z.string().datetime(),
});

const approveRemittanceSchema = z.object({
    approvalNotes: z.string().max(500).optional(),
});

const cancelRemittanceSchema = z.object({
    reason: z.string().min(10).max(500),
});
```

### 3.4 Create Razorpay Payout Webhook Handler

**File**: `/server/src/presentation/http/controllers/webhooks/razorpay-payout.webhook.controller.ts` (NEW FILE)

**Webhook Endpoint:**
```typescript
// POST /api/v1/webhooks/razorpay/payout
// Handles Razorpay payout status updates
export const handlePayoutWebhook = async (req, res, next) => {
    try {
        // Verify webhook signature
        const signature = req.headers['x-razorpay-signature'];
        const isValid = verifyRazorpaySignature(
            req.body,
            signature,
            process.env.RAZORPAY_WEBHOOK_SECRET!
        );

        if (!isValid) {
            throw new AuthenticationError(
                'Invalid webhook signature',
                ErrorCode.AUTH_VERIFICATION_FAILED
            );
        }

        const event = req.body;

        if (event.event === 'payout.processed') {
            await CODRemittanceService.handlePayoutWebhook(
                event.payload.payout.entity.id,
                'completed'
            );
        } else if (event.event === 'payout.failed') {
            await CODRemittanceService.handlePayoutWebhook(
                event.payload.payout.entity.id,
                'failed',
                event.payload.payout.entity.failure_reason
            );
        }

        res.status(200).json({ received: true });
    } catch (error) {
        next(error);
    }
};
```

### 3.5 Create Routes

**File**: `/server/src/presentation/http/routes/v1/finance/cod-remittance.routes.ts` (NEW FILE)

```typescript
import express from 'express';
import { authenticate, requireRole, checkKYC } from '../../../middleware/auth';
import * as codRemittanceController from '../../../controllers/finance/cod-remittance.controller';

const router = express.Router();

// All routes require authentication and KYC
router.use(authenticate);
router.use(checkKYC);

// Seller routes
router.post(
    '/create',
    requireRole(['seller']),
    codRemittanceController.createRemittanceBatch
);
router.get(
    '/eligible-shipments',
    requireRole(['seller']),
    codRemittanceController.getEligibleShipments
);
router.get(
    '/',
    requireRole(['seller', 'admin']),
    codRemittanceController.listRemittances
);
router.get(
    '/stats',
    requireRole(['seller', 'admin']),
    codRemittanceController.getRemittanceStats
);
router.get(
    '/:id',
    requireRole(['seller', 'admin']),
    codRemittanceController.getRemittanceDetails
);
router.get(
    '/:id/report',
    requireRole(['seller', 'admin']),
    codRemittanceController.downloadReport
);
router.post(
    '/:id/cancel',
    requireRole(['seller', 'admin']),
    codRemittanceController.cancelRemittance
);

// Admin only routes
router.post(
    '/:id/approve',
    requireRole(['admin']),
    codRemittanceController.approveRemittance
);
router.post(
    '/:id/initiate-payout',
    requireRole(['admin']),
    codRemittanceController.initiatePayou
);

export default router;
```

**Webhook Route**: `/server/src/presentation/http/routes/v1/webhooks/razorpay.webhook.routes.ts` (NEW FILE)

**Update Index Router**: Add to `/server/src/presentation/http/routes/v1/index.ts` (line 90):
```typescript
import codRemittanceRoutes from './finance/cod-remittance.routes';
router.use('/finance/cod-remittance', codRemittanceRoutes);

import razorpayWebhookRoutes from './webhooks/razorpay.webhook.routes';
router.use('/webhooks/razorpay', razorpayWebhookRoutes);
```

### 3.6 Update Shipment Model to Track Remittance Status

**File**: `/server/src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model.ts` (UPDATE)

**Add to schema** (around line 250):
```typescript
remittance: {
    included: {
        type: Boolean,
        default: false,
    },
    remittanceId: {
        type: String,
    },
    remittedAt: Date,
    remittedAmount: Number,
},
```

**Add index** (around line 550):
```typescript
ShipmentSchema.index({ 'remittance.included': 1, paymentMode: 1, status: 1 });
```

---

## PHASE 4: WALLET SYSTEM - SERVICE & API IMPLEMENTATION

### Duration: 3 days
### Priority: CRITICAL (Financial feature - payment blocking)

### 4.1 Existing Infrastructure Analysis

**Existing Files:**
- ✅ Model: `/server/src/infrastructure/database/mongoose/models/finance/wallets/wallet-transaction.model.ts` (209 lines)
- ✅ Service: `/server/src/core/application/services/wallet/wallet.service.ts` (815 lines)
- ❌ NO CONTROLLER EXISTS
- ❌ NO API ROUTES EXIST

**Service Capabilities (Already Implemented):**
- `getBalance()` - Get current wallet balance
- `hasMinimumBalance()` - Check if balance >= required amount
- `credit()` - Add funds to wallet
- `debit()` - Deduct funds from wallet
- `handleRTOCharge()` - Deduct RTO charges
- `handleShippingCost()` - Deduct shipping costs
- `handleRecharge()` - Process wallet recharge
- `handleCODRemittance()` - Credit COD remittance
- `getTransactionHistory()` - Get transaction history (paginated)
- `refund()` - Refund a previous transaction
- `getWalletStats()` - Get wallet statistics
- `updateLowBalanceThreshold()` - Update threshold with alerts

### 4.2 Create Wallet Controller

**File**: `/server/src/presentation/http/controllers/finance/wallet.controller.ts` (NEW FILE)

**Endpoints:**
```typescript
// GET /api/v1/finance/wallet/balance
// Auth: Seller only
// Get current wallet balance and details
export const getBalance = async (req, res, next) => {
    try {
        const companyId = req.user!.company;
        const balance = await WalletService.getBalance(companyId);

        sendSuccess(res, balance, 'Wallet balance retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// GET /api/v1/finance/wallet/transactions
// Query: ?page=1&limit=10&type=credit&reason=recharge&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Auth: Seller only
// Get transaction history with pagination
export const getTransactionHistory = async (req, res, next) => {
    try {
        const companyId = req.user!.company;
        const options = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10,
            type: req.query.type as TransactionType,
            reason: req.query.reason as TransactionReason,
            startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
            endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        };

        const result = await WalletService.getTransactionHistory(companyId, options);

        sendPaginated(
            res,
            result.transactions,
            {
                total: result.total,
                page: options.page,
                limit: options.limit,
                pages: Math.ceil(result.total / options.limit),
                hasNext: options.page * options.limit < result.total,
                hasPrev: options.page > 1,
            },
            'Transaction history retrieved successfully'
        );
    } catch (error) {
        next(error);
    }
};

// POST /api/v1/finance/wallet/recharge
// Body: { amount, paymentMethod, paymentId }
// Auth: Seller only
// Recharge wallet (after payment gateway success)
export const rechargeWallet = async (req, res, next) => {
    try {
        const companyId = req.user!.company;
        const { amount, paymentId } = req.body;

        const result = await WalletService.handleRecharge(
            companyId,
            amount,
            paymentId,
            req.user!._id.toString()
        );

        if (!result.success) {
            throw new AppError(
                result.error || 'Wallet recharge failed',
                ErrorCode.BIZ_WALLET_TRANSACTION_FAILED,
                500
            );
        }

        sendCreated(
            res,
            {
                transactionId: result.transactionId,
                newBalance: result.newBalance,
            },
            'Wallet recharged successfully'
        );
    } catch (error) {
        next(error);
    }
};

// POST /api/v1/finance/wallet/refund
// Body: { transactionId, reason }
// Auth: Admin only
// Refund a wallet transaction
export const refundTransaction = async (req, res, next) => {
    try {
        const { transactionId, reason } = req.body;

        // Need to get companyId from transaction
        const transaction = await WalletTransaction.findById(transactionId);
        if (!transaction) {
            throw new NotFoundError('Transaction', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        const result = await WalletService.refund(
            transaction.company.toString(),
            transactionId,
            reason,
            req.user!._id.toString()
        );

        if (!result.success) {
            throw new AppError(
                result.error || 'Refund failed',
                ErrorCode.BIZ_WALLET_TRANSACTION_FAILED,
                500
            );
        }

        sendSuccess(
            res,
            {
                transactionId: result.transactionId,
                newBalance: result.newBalance,
            },
            'Transaction refunded successfully'
        );
    } catch (error) {
        next(error);
    }
};

// GET /api/v1/finance/wallet/stats
// Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Auth: Seller only
// Get wallet statistics
export const getWalletStats = async (req, res, next) => {
    try {
        const companyId = req.user!.company;
        const dateRange = req.query.startDate && req.query.endDate
            ? {
                start: new Date(req.query.startDate as string),
                end: new Date(req.query.endDate as string),
            }
            : undefined;

        const stats = await WalletService.getWalletStats(companyId, dateRange);

        sendSuccess(res, stats, 'Wallet statistics retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/v1/finance/wallet/low-balance-threshold
// Body: { threshold }
// Auth: Seller only
// Update low balance alert threshold
export const updateLowBalanceThreshold = async (req, res, next) => {
    try {
        const companyId = req.user!.company;
        const { threshold } = req.body;

        const result = await WalletService.updateLowBalanceThreshold(
            companyId,
            threshold,
            req.user!._id.toString()
        );

        sendSuccess(res, result, 'Low balance threshold updated successfully');
    } catch (error) {
        next(error);
    }
};

// POST /api/v1/finance/wallet/check-balance
// Body: { requiredAmount }
// Auth: Seller only
// Check if wallet has sufficient balance for operation
export const checkSufficientBalance = async (req, res, next) => {
    try {
        const companyId = req.user!.company;
        const { requiredAmount } = req.body;

        const hasSufficient = await WalletService.hasMinimumBalance(
            companyId,
            requiredAmount
        );

        sendSuccess(
            res,
            { hasSufficientBalance: hasSufficient },
            hasSufficient
                ? 'Sufficient balance available'
                : 'Insufficient balance'
        );
    } catch (error) {
        next(error);
    }
};
```

**Validation Schemas:**
```typescript
const rechargeWalletSchema = z.object({
    amount: z.number().positive().max(1000000, 'Maximum recharge amount is ₹10,00,000'),
    paymentMethod: z.enum(['razorpay', 'bank_transfer', 'upi']),
    paymentId: z.string().min(1, 'Payment ID is required'),
});

const refundTransactionSchema = z.object({
    transactionId: objectIdSchema('Transaction'),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

const updateThresholdSchema = z.object({
    threshold: z.number().min(0, 'Threshold must be non-negative'),
});

const checkBalanceSchema = z.object({
    requiredAmount: z.number().positive('Amount must be positive'),
});
```

### 4.3 Create Wallet Routes

**File**: `/server/src/presentation/http/routes/v1/finance/wallet.routes.ts` (NEW FILE)

```typescript
import express from 'express';
import { authenticate, requireRole, checkKYC } from '../../../middleware/auth';
import * as walletController from '../../../controllers/finance/wallet.controller';

const router = express.Router();

// All routes require authentication and KYC
router.use(authenticate);
router.use(checkKYC);

// Seller routes
router.get(
    '/balance',
    requireRole(['seller', 'admin']),
    walletController.getBalance
);
router.get(
    '/transactions',
    requireRole(['seller', 'admin']),
    walletController.getTransactionHistory
);
router.post(
    '/recharge',
    requireRole(['seller']),
    walletController.rechargeWallet
);
router.get(
    '/stats',
    requireRole(['seller', 'admin']),
    walletController.getWalletStats
);
router.put(
    '/low-balance-threshold',
    requireRole(['seller']),
    walletController.updateLowBalanceThreshold
);
router.post(
    '/check-balance',
    requireRole(['seller', 'admin']),
    walletController.checkSufficientBalance
);

// Admin only routes
router.post(
    '/refund',
    requireRole(['admin']),
    walletController.refundTransaction
);

export default router;
```

**Update Index Router**: Add to `/server/src/presentation/http/routes/v1/index.ts` (line 91):
```typescript
import walletRoutes from './finance/wallet.routes';
router.use('/finance/wallet', walletRoutes);
```

### 4.4 Integrate Wallet Balance Check into Shipment Flow

**File**: `/server/src/core/application/services/shipping/shipment.service.ts` (UPDATE)

**Add before shipment creation** (around line 120):
```typescript
// Check wallet balance for prepaid orders
if (order.paymentMode === 'PREPAID') {
    const estimatedCost = billingDetails.totalAmount; // From rate card
    const hasSufficientBalance = await WalletService.hasMinimumBalance(
        order.company.toString(),
        estimatedCost
    );

    if (!hasSufficientBalance) {
        throw new AppError(
            'Insufficient wallet balance. Please recharge your wallet.',
            ErrorCode.BIZ_INSUFFICIENT_BALANCE,
            400
        );
    }

    // Deduct shipping cost from wallet
    const walletResult = await WalletService.handleShippingCost(
        order.company.toString(),
        shipment._id.toString(),
        estimatedCost,
        awb
    );

    if (!walletResult.success) {
        throw new AppError(
            walletResult.error || 'Failed to deduct shipping cost from wallet',
            ErrorCode.BIZ_WALLET_TRANSACTION_FAILED,
            500
        );
    }
}
```

---

## PHASE 5: API RESPONSE CONSISTENCY - INTEGRATION CONTROLLERS FIX

### Duration: 2 days
### Priority: HIGH (Affects frontend integration)

### 5.1 Problem Analysis

**Current State:**
- **8 integration controller files** with **64 direct `res.json()` violations**
- **0% compliance** with response helper standards
- **Frontend receives inconsistent response structures**

**Files Affected:**
1. `/server/src/presentation/http/controllers/integrations/shopify.controller.ts` - 11 violations
2. `/server/src/presentation/http/controllers/integrations/woocommerce.controller.ts` - 14 violations
3. `/server/src/presentation/http/controllers/integrations/amazon.controller.ts` - 9 violations
4. `/server/src/presentation/http/controllers/integrations/flipkart.controller.ts` - 7 violations
5. `/server/src/presentation/http/controllers/integrations/product-mapping.controller.ts` - 8 violations
6. `/server/src/presentation/http/controllers/integrations/amazon-product-mapping.controller.ts` - 6 violations
7. `/server/src/presentation/http/controllers/integrations/flipkart-product-mapping.controller.ts` - 8 violations
8. `/server/src/presentation/http/controllers/integrations/integrations.controller.ts` - 1 violation

### 5.2 Standard Response Pattern Migration

**Pattern to Apply:**

**BEFORE (Non-compliant):**
```typescript
res.status(200).json({
    success: true,
    data: result,
    message: 'Operation successful',
});
```

**AFTER (Compliant):**
```typescript
sendSuccess(res, result, 'Operation successful');
```

**BEFORE (Non-compliant):**
```typescript
res.status(201).json({
    success: true,
    data: { integration },
    message: 'Integration created',
});
```

**AFTER (Compliant):**
```typescript
sendCreated(res, { integration }, 'Integration created');
```

**BEFORE (Non-compliant):**
```typescript
res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Integration not found' },
});
```

**AFTER (Compliant):**
```typescript
throw new NotFoundError('Integration', ErrorCode.RES_INTEGRATION_NOT_FOUND);
```

### 5.3 File-by-File Fix Plan

#### Fix 1: shopify.controller.ts (11 violations)

**Lines to Fix:**
- Line 68: `res.json({ success: true, installUrl, message: ... })` → `sendSuccess(res, { installUrl }, message)`
- Line 125: `res.json({ success: true, data: { shop } })` → `sendSuccess(res, { shop })`
- Line 168: `res.status(201).json({ success: true, message, data: { order } })` → `sendCreated(res, { order }, message)`
- Line 215: `res.status(201).json({ success: true, message, data: { fulfillment } })` → `sendCreated(res, { fulfillment }, message)`
- Line 252: `res.json({ success: true, data: { settings } })` → `sendSuccess(res, { settings })`
- Line 289: `res.json({ success: true, message })` → `sendSuccess(res, {}, message)`
- Line 326: `res.json({ success: true, data: { inventory } })` → `sendSuccess(res, { inventory })`
- Line 370: `res.status(400).json({ success: false, error: ... })` → `throw new ValidationError()`
- Line 408: `res.json({ success: true, data: { webhook } })` → `sendSuccess(res, { webhook })`
- Line 442: `res.json({ success: true, data: { webhooks } })` → `sendSuccess(res, { webhooks })`
- Line 475: `res.status(204).send()` → `sendNoContent(res)`

**Add imports:**
```typescript
import { sendSuccess, sendCreated, sendNoContent } from '../../../../shared/utils/responseHelper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
```

#### Fix 2: woocommerce.controller.ts (14 violations)

**Similar pattern - replace all direct JSON responses**

#### Fix 3-8: amazon.controller.ts, flipkart.controller.ts, product-mapping.controller.ts, etc.

**Apply same standardization pattern**

### 5.4 Add Missing Error Code

**File**: `/server/src/shared/errors/errorCodes.ts` (UPDATE)

**Add** (around line 61):
```typescript
RES_INTEGRATION_NOT_FOUND = 'RES_INTEGRATION_NOT_FOUND',
```

**Add to errorStatusMap** (around line 141):
```typescript
[ErrorCode.RES_INTEGRATION_NOT_FOUND]: 404,
```

### 5.5 Update Try-Catch Blocks

**Pattern:**
```typescript
// BEFORE
try {
    // ... logic
} catch (error) {
    logger.error('Error:', error);
    res.status(500).json({ success: false, error: 'Internal error' });
}

// AFTER
try {
    // ... logic
} catch (error) {
    logger.error('Error:', error);
    next(error); // Let global error handler process it
}
```

### 5.6 Verification Checklist

After fixes, verify:
- ✅ All responses use sendSuccess/sendCreated/sendPaginated/sendNoContent
- ✅ All errors throw typed exceptions (ValidationError, NotFoundError, etc.)
- ✅ No direct `res.json()` or `res.status().json()` calls
- ✅ Try-catch blocks call `next(error)` instead of manual error responses
- ✅ TypeScript compilation succeeds
- ✅ All responses include `success`, `timestamp` fields
- ✅ Error responses include `error.code` from ErrorCode enum

---

## PHASE 6: KYC ENFORCEMENT ON INTEGRATION ROUTES

### Duration: 1 day
### Priority: CRITICAL (Security - financial integrations)

### 6.1 Problem Statement

**Current State:**
- Integration routes (Amazon, WooCommerce, Flipkart, product-mapping) are **missing KYC checks**
- Users can connect financial integrations **without KYC verification**
- **Security vulnerability** - allows unverified sellers to process orders

### 6.2 Files to Update

#### Update 1: Amazon Routes
**File**: `/server/src/presentation/http/routes/v1/integrations/amazon.routes.ts`

**BEFORE:**
```typescript
router.post('/connect', authenticate, amazonController.connectAmazon);
```

**AFTER:**
```typescript
router.post('/connect', authenticate, checkKYC, amazonController.connectAmazon);
```

**Apply to all routes:**
- `/connect` - Connect Amazon account
- `/sync-orders` - Sync orders from Amazon
- `/webhooks` - Handle Amazon webhooks
- `/disconnect` - Disconnect Amazon

#### Update 2: WooCommerce Routes
**File**: `/server/src/presentation/http/routes/v1/integrations/woocommerce.routes.ts`

**Add `checkKYC` middleware to:**
- `/connect`
- `/sync-orders`
- `/sync-products`
- `/webhooks`
- `/disconnect`

#### Update 3: Flipkart Routes
**File**: `/server/src/presentation/http/routes/v1/integrations/flipkart.routes.ts`

**Add `checkKYC` middleware to all routes**

#### Update 4: Product Mapping Routes
**File**: `/server/src/presentation/http/routes/v1/integrations/product-mapping.routes.ts`

**Add `checkKYC` middleware to:**
- `/map-product`
- `/sync-inventory`
- `/update-mapping`

### 6.3 Pattern to Apply

**Standard Route Security:**
```typescript
router.post(
    '/endpoint',
    authenticate,      // Step 1: Verify JWT token
    checkKYC,          // Step 2: Verify KYC status
    requireRole(['seller']), // Step 3: Check role (if needed)
    controller.method
);
```

**Middleware Stack Order (CRITICAL):**
1. `authenticate` - Attach user to request
2. `checkKYC` - Verify KYC is completed
3. `requireRole` - Check role permissions (optional)
4. Controller method

### 6.4 Verify Middleware Exists

**File**: `/server/src/presentation/http/middleware/auth/kyc.ts`

**Ensure middleware:**
- Checks `req.user.company.kycStatus === 'VERIFIED'`
- Throws `AuthorizationError` if KYC not verified
- Allows admin/viewer roles to bypass (for internal operations)

**Expected Implementation:**
```typescript
export const checkKYC: RequestHandler = async (req, res, next) => {
    try {
        const user = req.user;

        if (!user) {
            throw new AuthenticationError(
                'Authentication required',
                ErrorCode.AUTH_REQUIRED
            );
        }

        // Admin and viewer bypass KYC check
        if (user.role === 'admin' || user.role === 'viewer') {
            return next();
        }

        // Get company KYC status
        const company = await Company.findById(user.company).select('kycStatus');

        if (!company) {
            throw new NotFoundError('Company', ErrorCode.RES_COMPANY_NOT_FOUND);
        }

        if (company.kycStatus !== 'VERIFIED') {
            throw new AuthorizationError(
                'KYC verification required to access this feature',
                ErrorCode.AUTH_KYC_NOT_VERIFIED
            );
        }

        next();
    } catch (error) {
        next(error);
    }
};
```

### 6.5 Add Missing Error Code (if needed)

**File**: `/server/src/shared/errors/errorCodes.ts`

**Check if exists:**
```typescript
AUTH_KYC_NOT_VERIFIED = 'AUTH_KYC_NOT_VERIFIED',
```

**If missing, add:**
```typescript
// Around line 20
AUTH_KYC_NOT_VERIFIED = 'AUTH_KYC_NOT_VERIFIED',
```

**Add to errorStatusMap:**
```typescript
[ErrorCode.AUTH_KYC_NOT_VERIFIED]: 403,
```

---

## PHASE 7: SERVICE LAYER ERROR HANDLING FIX

### Duration: 2 days
### Priority: HIGH (Code quality & reliability)

### 7.1 Problem Statement

**Current State:**
- **15+ services return null or `{ success: false, error: '...' }` objects instead of throwing exceptions**
- Silent failures propagate to controllers
- Inconsistent error handling patterns

**Impact:**
- Controllers must check every service call for null/error objects
- Global error handler not utilized
- Inconsistent error responses to frontend

### 7.2 Pattern Migration

**BEFORE (Anti-pattern):**
```typescript
// In service
static async createOrder(data) {
    const order = await Order.findOne({ orderNumber: data.orderNumber });
    if (order) {
        return { success: false, error: 'Order already exists' }; // ❌ BAD
    }
    // ... create order
    return { success: true, data: newOrder };
}

// In controller
const result = await OrderService.createOrder(data);
if (!result.success) {
    return sendError(res, result.error, 400); // Manual error handling
}
sendSuccess(res, result.data);
```

**AFTER (Correct pattern):**
```typescript
// In service
static async createOrder(data) {
    const order = await Order.findOne({ orderNumber: data.orderNumber });
    if (order) {
        throw new ConflictError( // ✅ GOOD - throw exception
            'Order already exists',
            ErrorCode.BIZ_ALREADY_EXISTS
        );
    }
    // ... create order
    return newOrder; // Return data only
}

// In controller
try {
    const order = await OrderService.createOrder(data);
    sendSuccess(res, order); // No need to check result.success
} catch (error) {
    next(error); // Global handler processes it
}
```

### 7.3 Services to Fix

**List of Services Returning Null/Error Objects:**

1. **shipment.service.ts** (lines 56-59)
   - Returns `{ success: false, error: '...' }` when shipment exists
   - **Fix**: Throw `ConflictError`

2. **order.service.ts** (estimated 5+ occurrences)
   - Returns null when order not found
   - **Fix**: Throw `NotFoundError`

3. **courier.factory.ts** (estimated 3+ occurrences)
   - Returns null on courier API failures
   - **Fix**: Throw `ExternalServiceError`

4. **excel-export.service.ts** (estimated 2+ occurrences)
   - Returns null when no data
   - **Fix**: Throw `NotFoundError` or return empty array

5. **base-export.service.ts** (estimated 2+ occurrences)
   - Returns null on export failures
   - **Fix**: Throw `AppError`

6. **deepvue.service.ts** (estimated 3+ occurrences)
   - Returns null on API failures
   - **Fix**: Throw `ExternalServiceError`

7. **ndr-resolution.service.ts** (estimated 2+ occurrences)
   - Returns null on resolution failures
   - **Fix**: Throw `DatabaseError` or `AppError`

8. **commission-ai-insights.service.ts** (estimated 2+ occurrences)
   - Returns null when no insights
   - **Fix**: Return empty array or throw `NotFoundError`

9. **weight-dispute-detection.service.ts** (estimated 2+ occurrences)
   - Returns null on detection failures
   - **Fix**: Throw `AppError`

10. **product-tour.service.ts** (estimated 1+ occurrence)
    - Returns null when tour not found
    - **Fix**: Throw `NotFoundError`

11. **progress.service.ts** (estimated 1+ occurrence)
    - Returns null on progress calculation failure
    - **Fix**: Throw `AppError`

12. **woocommerce-webhook.service.ts** (estimated 2+ occurrences)
    - Returns null on webhook processing failure
    - **Fix**: Throw `AppError`

### 7.4 Fix Pattern for Each Service

**Example Fix for shipment.service.ts:**

**BEFORE (line 56-59):**
```typescript
if (existingShipment) {
    return {
        success: false,
        error: 'Shipment with this tracking number already exists'
    };
}
```

**AFTER:**
```typescript
if (existingShipment) {
    throw new ConflictError(
        'Shipment with this tracking number already exists',
        ErrorCode.BIZ_SHIPMENT_EXISTS
    );
}
```

**Example Fix for courier.factory.ts:**

**BEFORE:**
```typescript
try {
    const response = await courierAPI.call();
    return response;
} catch (err) {
    logger.error('Courier API failed:', err);
    return null; // ❌ Silent failure
}
```

**AFTER:**
```typescript
try {
    const response = await courierAPI.call();
    return response;
} catch (err) {
    logger.error('Courier API failed:', err);
    throw new ExternalServiceError(
        'CourierAPI',
        'Failed to communicate with courier service',
        ErrorCode.EXT_COURIER_FAILURE
    );
}
```

### 7.5 Controller Updates After Service Fixes

**Pattern:**

**BEFORE (checking result object):**
```typescript
export const createOrder = async (req, res, next) => {
    const result = await OrderService.createOrder(req.body);
    if (!result.success) {
        return sendError(res, result.error, 400);
    }
    sendSuccess(res, result.data);
};
```

**AFTER (exception-based):**
```typescript
export const createOrder = async (req, res, next) => {
    try {
        const order = await OrderService.createOrder(req.body);
        sendSuccess(res, order);
    } catch (error) {
        next(error);
    }
};
```

---

## PHASE 8: MULTI-TENANCY BUG FIXES

### Duration: 1 day
### Priority: CRITICAL (Security vulnerability)

### 8.1 Problem: Missing Return Statements After sendError

**File**: `/server/src/presentation/http/controllers/organization/company.controller.ts`

**Vulnerability:** Execution continues after `sendError()`, allowing unauthorized access.

**Lines to Fix:**

**Line 62-68:**
```typescript
// BEFORE
if (req.user!.role !== 'admin' && req.user!.company !== companyId) {
    sendError(res, 'Access denied', 403, 'FORBIDDEN');
    // ❌ Execution continues - security bypass!
}
const company = await Company.findById(companyId); // Still executes!

// AFTER
if (req.user!.role !== 'admin' && req.user!.company !== companyId) {
    throw new AuthorizationError(
        'Access denied',
        ErrorCode.AUTHZ_FORBIDDEN
    );
}
const company = await Company.findById(companyId);
```

**Line 170-176:**
```typescript
// BEFORE
if (req.user!.role !== 'admin' && req.user!.company !== companyId) {
    sendError(res, 'Access denied', 403, 'FORBIDDEN');
    // ❌ Execution continues
}
// Update still executes!

// AFTER
if (req.user!.role !== 'admin' && req.user!.company !== companyId) {
    throw new AuthorizationError(
        'Access denied',
        ErrorCode.AUTHZ_FORBIDDEN
    );
}
```

**Additional Lines to Audit:**
- Search entire file for `sendError()` calls
- Ensure ALL are replaced with exception throws OR have explicit `return;` statements

### 8.2 Pattern to Apply Globally

**Search Pattern:**
```bash
grep -n "sendError.*res" -A 2 **/*.controller.ts
```

**For each match:**
- If next line is NOT `return;`, add it OR migrate to exception throw
- Prefer exception throw for new code (aligns with Phase 2 fixes)

---

## PHASE 9: VALIDATION ERROR HANDLING CONSISTENCY

### Duration: 1 day
### Priority: MEDIUM (Code quality)

### 9.1 Problem Statement

**Current State:**
- Multiple patterns for validation error handling
- Some lose field-level details
- Inconsistent error response structure

**Files Affected:**
- `/server/src/presentation/http/controllers/analytics/export.controller.ts` (lines 49, 107, 167)
- `/server/src/presentation/http/controllers/warehouse/inventory.controller.ts` (lines 42-46)
- `/server/src/presentation/http/controllers/organization/team.controller.ts` (various)

### 9.2 Recommended Pattern (Use Everywhere)

```typescript
// At top of controller file
import { z } from 'zod';
import { ValidationError } from '../../../../shared/errors/app.error';

const createResourceSchema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
});

// In handler function
export const createResource = async (req, res, next) => {
    try {
        // Validate
        const validation = createResourceSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const validatedData = validation.data;

        // Business logic...

        sendSuccess(res, { resource }, 'Resource created');
    } catch (error) {
        next(error);
    }
};
```

### 9.3 Files to Standardize

#### Fix 1: export.controller.ts

**Lines 49, 107, 167:**
```typescript
// BEFORE
throw new ValidationError(error[0].message); // ❌ Loses field info

// AFTER
const errors = error.errors.map(err => ({
    code: 'VALIDATION_ERROR',
    message: err.message,
    field: err.path.join('.'),
}));
throw new ValidationError('Validation failed', errors);
```

#### Fix 2: inventory.controller.ts

**Lines 42-46:**
```typescript
// BEFORE
throw new ValidationError(/* incorrect constructor usage */);

// AFTER
// Follow standard pattern above
```

#### Fix 3: team.controller.ts

**Multiple locations:**
```typescript
// BEFORE
res.status(400).json({ message, errors });

// AFTER
throw new ValidationError('Validation failed', errors);
```

---

## PHASE 10: TESTING & VERIFICATION

### Duration: 3 days
### Priority: CRITICAL (Quality assurance)

### 10.1 Unit Tests Required

**New Test Files to Create:**

1. `/server/tests/unit/services/finance/cod-remittance.service.test.ts` (NEW)
   - Test batch creation
   - Test eligible shipments calculation
   - Test deduction calculations
   - Test approval workflow
   - Test payout initiation
   - Test webhook handling

2. `/server/tests/unit/services/finance/wallet.service.test.ts` (EXISTING - UPDATE)
   - Add tests for new recharge flow
   - Add tests for refund with duplicate prevention
   - Add tests for low balance threshold updates

3. `/server/tests/unit/services/logistics/address-validation.service.test.ts` (NEW)
   - Test pincode validation
   - Test serviceability checks
   - Test address standardization
   - Test distance calculation

4. `/server/tests/unit/controllers/finance/cod-remittance.controller.test.ts` (NEW)
   - Test all endpoints
   - Test authorization checks
   - Test validation errors

5. `/server/tests/unit/controllers/finance/wallet.controller.test.ts` (NEW)
   - Test balance retrieval
   - Test transaction history pagination
   - Test recharge flow
   - Test refund flow

### 10.2 Integration Tests Required

**Test Files:**

1. `/server/tests/integration/api/finance/cod-remittance.api.test.ts` (NEW)
   - End-to-end batch creation to payout flow
   - Test Razorpay webhook simulation
   - Test multi-user scenarios (seller + admin)

2. `/server/tests/integration/api/finance/wallet.api.test.ts` (NEW)
   - End-to-end recharge flow
   - Test concurrent transactions (version conflicts)
   - Test refund workflow

3. `/server/tests/integration/api/logistics/address-validation.api.test.ts` (NEW)
   - Test external API integration (India Post/Pincode.in)
   - Test caching behavior
   - Test rate limiting

### 10.3 Manual Testing Checklist

#### COD Remittance Flow:
- [ ] Create remittance batch (seller)
- [ ] Preview eligible shipments
- [ ] Approve batch (admin)
- [ ] Initiate payout (admin)
- [ ] Simulate Razorpay webhook success
- [ ] Verify shipment remittance status updated
- [ ] Download PDF report
- [ ] Cancel batch (before payout)
- [ ] View remittance statistics

#### Wallet Flow:
- [ ] Check wallet balance
- [ ] Recharge wallet via Razorpay
- [ ] View transaction history (with filters)
- [ ] Create shipment (auto-deduct from wallet)
- [ ] Verify insufficient balance error
- [ ] Update low balance threshold
- [ ] Verify low balance email alert
- [ ] Refund transaction (admin)

#### Address Validation Flow:
- [ ] Validate valid Indian pincode
- [ ] Validate invalid pincode
- [ ] Check serviceability for courier
- [ ] Create order with invalid pincode (should fail)
- [ ] Create order with valid pincode (should succeed)
- [ ] Calculate distance between pincodes

#### Response Consistency:
- [ ] Test all integration endpoints (8 controllers)
- [ ] Verify all responses have `success` flag
- [ ] Verify all responses have `timestamp` field
- [ ] Verify error responses have `error.code` from ErrorCode enum
- [ ] Verify validation errors include `errors` array with field details

### 10.4 Verification Commands

**TypeScript Compilation:**
```bash
cd server
npm run build
```
**Expected:** No compilation errors

**Run All Tests:**
```bash
npm test
```
**Expected:** All tests pass

**Start Server:**
```bash
npm run dev
```
**Expected:** Server starts without errors, all routes registered

**Test Critical Flows (using curl or Postman):**

**1. Wallet Balance:**
```bash
curl -X GET http://localhost:3000/api/v1/finance/wallet/balance \
  -H "Authorization: Bearer <token>"
```
**Expected:** `{ success: true, data: { balance, currency, ... }, timestamp }`

**2. COD Remittance Creation:**
```bash
curl -X POST http://localhost:3000/api/v1/finance/cod-remittance/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"scheduleType":"on_demand","cutoffDate":"2026-01-10T00:00:00Z"}'
```
**Expected:** `{ success: true, data: { remittanceId, ... }, timestamp }`

**3. Address Validation:**
```bash
curl -X GET http://localhost:3000/api/v1/logistics/address/validate-pincode/110001 \
  -H "Authorization: Bearer <token>"
```
**Expected:** `{ success: true, data: { valid: true, city, state, ... }, timestamp }`

**4. Integration Endpoint (test response consistency):**
```bash
curl -X GET http://localhost:3000/api/v1/integrations/shopify/settings \
  -H "Authorization: Bearer <token>"
```
**Expected:** `{ success: true, data: { settings }, timestamp }` (NOT direct JSON)

---

## PHASE 11: DOCUMENTATION & DEPLOYMENT

### Duration: 2 days
### Priority: MEDIUM

### 11.1 API Documentation Updates

**File**: `/server/openapi.json` (UPDATE)

**Add Paths:**
- `/api/v1/finance/wallet/*` (all wallet endpoints)
- `/api/v1/finance/cod-remittance/*` (all COD remittance endpoints)
- `/api/v1/logistics/address/*` (all address validation endpoints)
- `/api/v1/webhooks/razorpay/payout` (Razorpay webhook)

**Document:**
- Request/response schemas
- Authentication requirements
- Error codes
- Rate limits

### 11.2 Update Frontend TypeScript Types

**File**: `/client/src/types/api/finance.types.ts` (NEW FILE)

```typescript
export interface WalletBalance {
    balance: number;
    currency: string;
    lastUpdated?: string;
    lowBalanceThreshold: number;
    isLowBalance: boolean;
}

export interface WalletTransaction {
    _id: string;
    type: 'credit' | 'debit' | 'refund' | 'adjustment';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reason: string;
    description: string;
    createdAt: string;
    status: 'pending' | 'completed' | 'failed' | 'reversed';
}

export interface CODRemittance {
    remittanceId: string;
    companyId: string;
    batch: {
        batchNumber: number;
        createdDate: string;
        cutoffDate: string;
    };
    financial: {
        totalCODCollected: number;
        totalShipments: number;
        netPayable: number;
        deductionsSummary: {
            totalShippingCharges: number;
            totalWeightDisputes: number;
            totalRTOCharges: number;
            totalPlatformFees: number;
            grandTotal: number;
        };
    };
    status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'cancelled' | 'failed';
    payout: {
        status: 'pending' | 'processing' | 'completed' | 'failed';
        method: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface AddressValidation {
    valid: boolean;
    city?: string;
    state?: string;
    district?: string;
    serviceability: {
        delhivery: boolean;
        bluedart: boolean;
        ecom: boolean;
        dtdc: boolean;
    };
}
```

### 11.3 Create Developer Guides

**File**: `/docs/Development/Guides/COD_Remittance_Guide.md` (NEW FILE)

**Content:**
- Overview of COD remittance system
- Batch creation workflow
- Approval process
- Payout integration with Razorpay
- Webhook handling
- Testing guide
- Troubleshooting

**File**: `/docs/Development/Guides/Wallet_System_Guide.md` (NEW FILE)

**Content:**
- Wallet architecture
- Transaction types and reasons
- Recharge flow
- Auto-deduction for shipments
- Refund process
- Low balance alerts
- Concurrency handling

**File**: `/docs/Development/Guides/Address_Validation_Guide.md` (NEW FILE)

**Content:**
- Pincode validation
- Serviceability checks
- Integration with courier APIs
- Caching strategy
- External API setup

### 11.4 Update CHANGELOG.md

**Add:**
```markdown
## [Version X.X.X] - 2026-01-XX

### Added
- **COD Remittance Dashboard**: Complete service, API, and controller implementation
  - Create remittance batches with eligible shipments
  - Approval workflow for admin
  - Razorpay payout integration
  - PDF report generation
  - Real-time remittance statistics

- **Wallet System API**: Full API layer for existing wallet service
  - Balance inquiry and transaction history
  - Wallet recharge via payment gateway
  - Auto-deduction for shipments
  - Admin refund capability
  - Low balance threshold management

- **Address Validation Service**: New service for Indian address validation
  - Pincode validation with India Post API
  - Serviceability checks across courier partners
  - Address standardization for courier APIs
  - Distance calculation for rate cards

- **Response Consistency**: Standardized all integration controllers
  - Fixed 64 direct res.json() violations across 8 files
  - All responses now use response helpers (sendSuccess, sendCreated, etc.)
  - Consistent error response structure

- **KYC Enforcement**: Added KYC checks to integration routes
  - Amazon, WooCommerce, Flipkart integrations now require verified KYC
  - Product mapping routes secured

### Fixed
- **Multi-tenancy Security Bug**: Fixed missing return statements after sendError in company.controller.ts
- **Service Layer Error Handling**: 15+ services now throw exceptions instead of returning null
- **Validation Error Handling**: Standardized validation error patterns across all controllers

### Changed
- All API responses now include `success` flag and `timestamp` field
- Error responses now use ErrorCode enum consistently
```

### 11.5 Database Migration/Seeder Updates

**Create Seeder:**
`/server/src/infrastructure/database/seeders/seeders/XX-pincodes.seeder.ts`

**Purpose:** Import ~19,000 Indian pincodes with initial serviceability matrix

**Update Seeder Index:**
`/server/src/infrastructure/database/seeders/index.ts`

**Add:**
```typescript
import { seedPincodes } from './seeders/XX-pincodes.seeder';

// In main seeding function
await seedPincodes();
```

### 11.6 Environment Variables Documentation

**File**: `/server/.env.example` (UPDATE)

**Add:**
```bash
# Razorpay Payout Configuration
RAZORPAY_ACCOUNT_NUMBER=
RAZORPAY_WEBHOOK_SECRET=

# Address Validation API
INDIA_POST_API_KEY=
PINCODE_IN_API_KEY=

# Redis for caching
REDIS_URL=redis://localhost:6379
```

**File**: `/docs/Development/Setup/Environment_Variables.md` (UPDATE)

**Document each new variable with:**
- Purpose
- Where to obtain the value
- Required vs optional
- Default behavior if not set

---

## SUCCESS CRITERIA CHECKLIST

### Phase 1: Foundation ✅ COMPLETED
- [x] All required error codes added to ErrorCode enum
- [x] Error codes mapped to HTTP status codes
- [x] Address validation schemas created
- [x] Financial validation schemas created

### Phase 2: Address Validation
- [ ] AddressValidationService implemented with all methods
- [ ] Pincode model created with indexes
- [ ] Pincode seeder created and executed
- [ ] Address validation integrated into order/shipment flow
- [ ] Address API controller created
- [ ] Address routes created and registered
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed

### Phase 3: COD Remittance
- [ ] CODRemittanceService implemented with all methods
- [ ] Eligible shipments calculation working correctly
- [ ] Deductions calculated accurately
- [ ] Razorpay payout integration working
- [ ] Webhook handler processing events
- [ ] COD remittance controller created
- [ ] COD remittance routes created and registered
- [ ] Shipment model updated with remittance tracking
- [ ] PDF report generation working
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed

### Phase 4: Wallet System API
- [ ] Wallet controller implemented with all endpoints
- [ ] Wallet routes created and registered
- [ ] Wallet balance check integrated into shipment flow
- [ ] Recharge flow working end-to-end
- [ ] Transaction history pagination working
- [ ] Refund flow working
- [ ] Low balance alerts sending
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed

### Phase 5: Response Consistency
- [ ] All 8 integration controllers fixed
- [ ] 0 direct res.json() calls remaining
- [ ] All responses use response helpers
- [ ] All errors throw typed exceptions
- [ ] Try-catch blocks call next(error)
- [ ] TypeScript compilation succeeds
- [ ] All responses include success and timestamp fields
- [ ] Error responses include error.code from ErrorCode enum

### Phase 6: KYC Enforcement
- [ ] checkKYC middleware added to Amazon routes
- [ ] checkKYC middleware added to WooCommerce routes
- [ ] checkKYC middleware added to Flipkart routes
- [ ] checkKYC middleware added to product-mapping routes
- [ ] Middleware implementation verified
- [ ] Error code AUTH_KYC_NOT_VERIFIED exists
- [ ] Manual testing completed

### Phase 7: Service Layer Fixes
- [ ] All 15+ services throw exceptions instead of returning null
- [ ] Controllers updated to handle exceptions
- [ ] No manual result.success checks in controllers
- [ ] All service methods return data only (no wrapper objects)
- [ ] Unit tests updated
- [ ] TypeScript compilation succeeds

### Phase 8: Multi-tenancy Fixes
- [ ] company.controller.ts line 62-68 fixed
- [ ] company.controller.ts line 170-176 fixed
- [ ] All other sendError() calls audited
- [ ] All authorization checks throw exceptions
- [ ] Manual security testing completed

### Phase 9: Validation Consistency
- [ ] export.controller.ts validation errors fixed
- [ ] inventory.controller.ts validation errors fixed
- [ ] team.controller.ts validation errors fixed
- [ ] All controllers use standard validation pattern
- [ ] Field-level error details preserved

### Phase 10: Testing
- [ ] All new unit tests created and passing
- [ ] All new integration tests created and passing
- [ ] Manual testing checklist completed
- [ ] Verification commands executed successfully
- [ ] Frontend integration verified

### Phase 11: Documentation
- [ ] OpenAPI spec updated
- [ ] Frontend TypeScript types created
- [ ] Developer guides created
- [ ] CHANGELOG.md updated
- [ ] Environment variables documented
- [ ] Seeder documentation complete

### Overall Quality Gates
- [ ] TypeScript compilation: 0 errors
- [ ] All tests passing: 100%
- [ ] Code coverage: >80% for new code
- [ ] No console.log statements in production code
- [ ] All routes require authentication
- [ ] All financial routes require KYC
- [ ] No direct res.json() in controllers
- [ ] All services throw exceptions (no null returns)
- [ ] All API responses follow standard format

---

## TIMELINE ESTIMATE

### Week 1 (Days 1-5):
- **Day 1**: Phase 1 (Foundation) - ✅ COMPLETED
- **Day 2**: Phase 2.1-2.2 (Address Validation Service)
- **Day 3**: Phase 2.3 + Phase 6 (Address API + KYC Enforcement)
- **Day 4**: Phase 3.1-3.3 (COD Remittance Service & Controller)
- **Day 5**: Phase 3.4-3.6 (COD Webhooks, Routes, Shipment Updates)

### Week 2 (Days 6-10):
- **Day 6**: Phase 4.1-4.3 (Wallet Controller & Routes)
- **Day 7**: Phase 4.4 + Phase 5.1-5.3 (Wallet Integration + Response Consistency Start)
- **Day 8**: Phase 5.4-5.6 (Response Consistency Completion)
- **Day 9**: Phase 7 + Phase 8 (Service Layer Fixes + Multi-tenancy Fixes)
- **Day 10**: Phase 9 (Validation Consistency)

### Week 3 (Days 11-15):
- **Day 11**: Phase 10.1-10.2 (Unit & Integration Tests)
- **Day 12**: Phase 10.3-10.4 (Manual Testing & Verification)
- **Day 13**: Phase 11.1-11.3 (API Docs & Developer Guides)
- **Day 14**: Phase 11.4-11.6 (CHANGELOG, Migration, Env Vars)
- **Day 15**: Final QA, Bug Fixes, Deployment Preparation

**Total: 15 working days (3 weeks)**

---

## RISK MITIGATION

### Rollback Plan:
- All changes on `fix/fullstack-optimization-security` branch
- Backup branch `fix/fullstack-optimization-security-backup` already exists
- No database migrations (only new models and seeders)
- Can revert entire branch if critical issues found
- Incremental deployment: Phase by phase testing before proceeding

### Incremental Deployment Strategy:
1. **Phase 1-2**: Address validation (low risk, doesn't affect existing flows)
2. **Phase 3**: COD remittance (new feature, no existing code affected)
3. **Phase 4**: Wallet API (exposes existing service, low risk)
4. **Phase 5-9**: Response & error handling fixes (HIGHEST RISK - requires extensive testing)
5. **Phase 10-11**: Testing & documentation (validation phase)

### Testing Strategy:
- Test each phase independently before proceeding
- Run full regression test suite after Phases 5-9
- Conduct load testing for financial endpoints (wallet, COD)
- Perform security audit after KYC enforcement additions
- Monitor production logs closely after deployment

### Critical Dependencies:
- **Razorpay API**: COD remittance requires Razorpay payout setup
- **India Post/Pincode API**: Address validation requires external API access
- **Redis**: Optional but recommended for pincode caching
- **Email Service**: Low balance alerts require email configuration

### Fallback Strategies:
- Address Validation: If external API fails, fallback to basic regex validation
- COD Remittance: Manual payout option if Razorpay fails
- Wallet Alerts: Log-based alerts if email service unavailable

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment:
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security audit completed
- [ ] Performance testing completed
- [ ] Database seeders ready (pincodes)
- [ ] Environment variables configured
- [ ] External API keys obtained (Razorpay, India Post)
- [ ] Redis configured (optional)
- [ ] Backup taken

### Deployment:
- [ ] Merge to main branch
- [ ] Run database seeders (pincodes)
- [ ] Deploy to staging
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Verify health check endpoint
- [ ] Test critical flows (wallet, COD remittance, address validation)
- [ ] Monitor error logs for 24 hours

### Post-Deployment:
- [ ] Update API documentation (live)
- [ ] Notify frontend team of new endpoints
- [ ] Monitor performance metrics
- [ ] Monitor error rates
- [ ] Gather user feedback
- [ ] Plan follow-up improvements

---

## NOTES FOR EXECUTION

**Priority Order (if time-constrained):**
1. **CRITICAL**: Phase 5 (Response Consistency) - affects ALL frontend integration
2. **CRITICAL**: Phase 6 (KYC Enforcement) - security vulnerability
3. **CRITICAL**: Phase 8 (Multi-tenancy Bugs) - security vulnerability
4. **HIGH**: Phase 3 (COD Remittance) - revenue-blocking feature
5. **HIGH**: Phase 4 (Wallet API) - payment-blocking feature
6. **HIGH**: Phase 2 (Address Validation) - required for courier integrations
7. **MEDIUM**: Phase 7 (Service Layer) - code quality, not user-facing
8. **MEDIUM**: Phase 9 (Validation Consistency) - code quality
9. **LOW**: Phase 10-11 (Testing & Docs) - important but not blocking

**Parallel Work Opportunities:**
- Phases 2, 3, 4 can be developed in parallel (separate features)
- Phase 6 (KYC Enforcement) is quick and can be done alongside other phases
- Phase 11 (Documentation) can be done incrementally throughout

**Team Collaboration:**
- **Backend Dev 1**: Phases 3 (COD Remittance) + 4 (Wallet)
- **Backend Dev 2**: Phases 2 (Address Validation) + 7 (Service Fixes)
- **Backend Dev 3**: Phases 5 (Response Consistency) + 6 (KYC) + 8 (Multi-tenancy) + 9 (Validation)
- **QA**: Phase 10 (Testing)
- **DevOps/Docs**: Phase 11 (Documentation)

**Communication Checkpoints:**
- Daily standup: Share progress, blockers
- End of Week 1: Demo address validation + COD remittance
- End of Week 2: Demo wallet API + response consistency fixes
- End of Week 3: Final QA review and deployment decision

---

## CONCLUSION

This plan provides a comprehensive, step-by-step approach to:
1. ✅ Fix all error handling inconsistencies
2. ✅ Standardize API response patterns
3. ✅ Implement missing financial features (COD Remittance + Wallet API)
4. ✅ Implement address validation service
5. ✅ Fix security vulnerabilities (KYC enforcement, multi-tenancy bugs)
6. ✅ Improve service layer error handling
7. ✅ Ensure frontend integration compatibility

**Estimated Timeline**: 3 weeks (15 working days)
**Risk Level**: Medium (extensive changes, but well-planned with rollback strategy)
**Business Impact**: HIGH (unblocks revenue-generating features, improves security, enables frontend integration)

**Ready for Execution**: YES - All technical details provided, file-by-file changes documented, success criteria defined.

---

**Plan Status**: READY FOR APPROVAL AND EXECUTION
**Next Step**: User approval to begin implementation
**Created**: 2026-01-12
**Last Updated**: 2026-01-12
