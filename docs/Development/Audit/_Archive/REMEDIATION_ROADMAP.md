# SHIPCROWD: COMPREHENSIVE REMEDIATION ROADMAP
**Date:** January 10, 2026
**Purpose:** Step-by-step action plan to achieve production readiness
**Status:** READY FOR EXECUTION
**Target Launch:** Week 9-10 (if Phase 1 starts immediately with 2-3 developers)

---

## EXECUTIVE SUMMARY

### What's Wrong
Your audit reveals a **critical gap between marketing claims and implementation reality**:

| Claim | Reality | Gap |
|-------|---------|-----|
| "Multi-courier shipping" | Only Velocity works (1/3 couriers) | 2 couriers missing |
| "Complete COD management" | Model only, no workflow | Zero remittance/dispute system |
| "Seamless returns" | Feature completely missing | 0% implemented |
| "Production ready" | 11 critical blockers | Cannot launch safely |
| "Intelligent features" | 1 partial, 6 not implemented | 85% incomplete |

### What Must Happen Before Launch
**BLOCKING items (will cause data breach, fraud, or revenue loss):**
1. 🔴 Encrypt credentials (prevents instant attacker access)
2. 🔴 Add authorization (prevents seller data breaches)
3. 🔴 Implement COD remittance (sellers can receive money)
4. 🔴 Implement COD disputes (resolve payment discrepancies)
5. 🔴 Implement returns (15-30% of orders)

### Timeline
- **Phase 1 (Security):** Week 1 (58-80 hours)
- **Phase 2 (Revenue Features):** Weeks 2-3 (120-150 hours)
- **Phase 3 (Feature Parity):** Weeks 4-6 (120-170 hours)
- **Total:** 9-10 weeks with 2-3 developers

---

## PHASE 1: SECURITY FIXES (WEEK 1)
**Status:** MUST COMPLETE BEFORE LAUNCH
**Effort:** 58-80 hours
**Risk if skipped:** Data breach = instant regulator fines + customer lawsuits

### 1.1 Encrypt Unencrypted Credentials
**Current State:** Credentials stored as PLAIN TEXT in database
**Risk:** If database is breached → attacker has access to all marketplace accounts

**What's Affected:**
```
❌ company.model.ts (Shopify accessToken)
❌ integration.model.ts (All API keys: Razorpay, Deepvue, Exotel)
❌ user.model.ts (Security questions, password reset tokens)
❌ recovery-token.model.ts (Password reset tokens)
```

**Solution - 8-10 hours:**

1. Create encryption service:
```typescript
// /server/src/core/application/services/security/encryption.service.ts
import crypto from 'crypto';

export class EncryptionService {
  private readonly encryptionKey = process.env.ENCRYPTION_KEY; // 32-byte key

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(this.encryptionKey),
      iv
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    const [iv, encrypted, tag] = ciphertext.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.encryptionKey),
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

2. Update models to auto-encrypt/decrypt:
```typescript
// In company.model.ts
integrations: {
  shopify: {
    accessToken: {
      type: String,
      set: (value) => value ? encrypt(value) : null,
      get: (value) => value ? decrypt(value) : null
    }
  }
}
```

3. Create migration to encrypt existing data:
```typescript
// /server/src/migrations/20260110-encrypt-credentials.ts
export async function up() {
  const companies = await Company.find({});
  for (const company of companies) {
    if (company.integrations?.shopify?.accessToken) {
      company.integrations.shopify.accessToken =
        encrypt(company.integrations.shopify.accessToken);
    }
    await company.save();
  }
}
```

4. Test with marketplace sync to verify decryption works

**Verification:**
- [ ] All credentials encrypted in database (audit database)
- [ ] Encryption/decryption working for all integrations
- [ ] Marketplace sync still works with encrypted tokens
- [ ] New credentials auto-encrypt on creation

---

### 1.2 Add Authorization to 36 Controllers
**Current State:** No authorization checks - any authenticated user can access any seller's data
**Risk:** Seller A can view Seller B's orders, shipments, payments

**Solution - 30-40 hours:**

1. Create authorization middleware:
```typescript
// /server/src/core/presentation/middlewares/auth.middleware.ts

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains userId, companyId, role
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireCompanyAccess(req: Request, res: Response, next: NextFunction) {
  const companyId = req.params.companyId;

  if (req.user.companyId !== companyId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}
```

2. Update all 36 controllers - Example for orders:
```typescript
// BEFORE (BROKEN):
router.get('/api/v1/orders/:companyId/orders', async (req, res) => {
  const orders = await Order.find({ companyId: req.params.companyId });
  res.json(orders); // ❌ Anyone can see anyone's orders
});

// AFTER (FIXED):
router.get(
  '/api/v1/orders/:companyId/orders',
  requireAuth,           // ✅ Verify JWT
  requireCompanyAccess,  // ✅ Verify user owns this company
  async (req, res) => {
    const orders = await Order.find({ companyId: req.user.companyId });
    res.json(orders);
  }
);
```

3. Add webhook signature verification (CRITICAL):
```typescript
// For Shopify webhooks
router.post('/api/v1/webhooks/shopify', (req, res) => {
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const body = req.rawBody; // Must have raw body middleware

  const hmac = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(body)
    .digest('base64');

  if (hmac !== hmacHeader) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // ✅ Webhook verified, safe to process
  // ... process webhook
});
```

**Apply to these controllers:**
```
Priority 1 (Revenue-critical) - 8 controllers:
- Orders, Shipments, Wallet, Webhooks

Priority 2 (Data-sensitive) - 8 controllers:
- Users, KYC, Auth, Consent

Priority 3 (Integration-critical) - 8 controllers:
- Integrations, Analytics, Rates

Priority 4 (Everything else) - 12 controllers:
- Zones, Disputes, NDR, RTO, etc.
```

**Verification:**
- [ ] All controllers require authentication
- [ ] Cross-company access returns 403 Forbidden
- [ ] Webhook signatures verified (test with wrong signature)
- [ ] Test: Seller A cannot access Seller B's orders
- [ ] Test: Unauthenticated request returns 401

---

### 1.3 Add Transactional Integrity to 20+ Services
**Current State:** Multi-step operations can partially fail, leaving orphaned data
**Risk:** Orders created but shipments fail, leaving order in pending state forever

**Example Problem:**
```
1. Order.create() ✅ succeeds
2. Shipment.create() ❌ fails
3. Result: Order exists but no shipment
   - Order stuck in "pending" forever
   - No way to track shipment
   - Customer confused
```

**Solution - 20-30 hours:**

1. Create transaction wrapper:
```typescript
// /server/src/core/application/services/database/transaction.service.ts

export class TransactionService {
  async withTransaction<T>(
    callback: (session: ClientSession) => Promise<T>
  ): Promise<T> {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        return await callback(session);
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
```

2. Update critical services (example):
```typescript
// BEFORE (DATA CORRUPTION RISK):
async createOrderWithShipment(orderData, shipmentData) {
  await Order.create(orderData);        // ✅ Succeeds
  await Shipment.create(shipmentData);  // ❌ Fails
  // Order orphaned!
}

// AFTER (TRANSACTIONAL):
async createOrderWithShipment(orderData, shipmentData) {
  return this.transactionService.withTransaction(async (session) => {
    const order = await Order.create([orderData], { session });
    const shipment = await Shipment.create([shipmentData], { session });
    // If Shipment fails, Order also rolls back automatically
    return { order, shipment };
  });
}
```

3. Apply to 20+ services:
```
CRITICAL (must have transactions):
- order-creation.service.ts
- woocommerce-order-sync.service.ts
- amazon-order-sync.service.ts
- commission-approval.service.ts
- weight-dispute-detection.service.ts
- ... and 15+ more

Each service should wrap multi-step operations in transactions.
```

**Verification:**
- [ ] Multi-step operation fails → all steps roll back
- [ ] No orphaned orders/shipments in test database
- [ ] Concurrent operations don't cause conflicts

---

## PHASE 2: CRITICAL FEATURES (WEEKS 2-3)
**Status:** MUST COMPLETE BEFORE LAUNCH
**Effort:** 120-150 hours
**Impact:** Sellers cannot receive money or process returns without these

### 2.1 Implement COD Remittance Workflow
**Business Impact:** ₹85-180K/month revenue at risk per mid-sized seller
**Effort:** 40-50 hours

**What Should Happen:**
```
1. Orders delivered → COD collected by courier (e.g., ₹10,000)
2. Courier deposits to Velocity (₹9,800 after fee)
3. Velocity deposits to Shipcrowd (₹9,750 after fee)
4. Shipcrowd calculates seller payout:
   - COD: ₹10,000
   - Shipping deduction: -₹500
   - Dispute deduction: -₹200
   - Platform fee (1%): -₹98
   - Net to seller: ₹9,202
5. Finance approves payout
6. Razorpay sends to seller bank
7. Seller sees ₹9,202 in wallet

CURRENT: Steps 1-3 work, Steps 4-7 don't exist ❌
```

**Implementation:**

1. Create remittance service:
```typescript
// /server/src/core/application/services/financial/cod-remittance.service.ts

export class CodRemittanceService {
  constructor(
    private walletService: WalletService,
    private notificationService: NotificationService
  ) {}

  /**
   * Calculate remittance for a delivery partner
   * Formula: COD Collected - Shipping Fee - Dispute Deductions - Platform Fee = Net
   */
  async calculateRemittance(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CodRemittanceCalculation> {
    // 1. Find all delivered orders with COD in date range
    const deliveredOrders = await Order.find({
      companyId,
      paymentMethod: 'COD',
      status: 'delivered',
      deliveredAt: { $gte: startDate, $lte: endDate }
    });

    // 2. Sum COD collected amount
    const codCollected = deliveredOrders.reduce((sum, order) => {
      return sum + (order.codAmount || 0);
    }, 0);

    // 3. Calculate deductions
    const shippingFees = await this.calculateShippingFees(deliveredOrders);
    const disputeDeductions = await this.calculateDisputeDeductions(
      companyId,
      startDate,
      endDate
    );
    const platformFee = codCollected * 0.01; // 1% platform fee

    // 4. Calculate net amount
    const netAmount = codCollected - shippingFees - disputeDeductions - platformFee;

    // 5. Create remittance record
    const remittance = await CodRemittance.create({
      companyId,
      period: { startDate, endDate },
      codCollected,
      shippingFees,
      disputeDeductions,
      platformFee,
      netAmount,
      status: 'pending', // Awaits finance approval
      orderIds: deliveredOrders.map(o => o._id),
      createdAt: new Date()
    });

    return remittance;
  }

  /**
   * Finance team approves remittance
   */
  async approveRemittance(remittanceId: string, approvedBy: UserId) {
    const remittance = await CodRemittance.findById(remittanceId);

    remittance.status = 'approved';
    remittance.approvedAt = new Date();
    remittance.approvedBy = approvedBy;
    await remittance.save();

    // Schedule payment via Razorpay
    await this.schedulePayout(remittance);

    // Notify seller
    await this.notificationService.notifySeller(
      remittance.companyId,
      'Remittance Approved',
      `Remittance of ₹${remittance.netAmount} approved. Payment in progress.`
    );
  }

  /**
   * Seller can dispute a remittance if calculation seems wrong
   */
  async disputeRemittance(
    remittanceId: string,
    companyId: string,
    reason: string
  ) {
    const remittance = await CodRemittance.findById(remittanceId);

    if (remittance.companyId !== companyId) {
      throw new Error('Unauthorized');
    }

    remittance.status = 'disputed';
    remittance.disputeReason = reason;
    remittance.disputedAt = new Date();
    await remittance.save();

    // Notify finance for manual review
    await this.notificationService.notifyAdmin(
      'COD Remittance Disputed',
      `Seller ${companyId} disputed remittance ${remittanceId}: ${reason}`
    );
  }

  private async calculateShippingFees(orders: Order[]): Promise<number> {
    // Sum shipping costs from all orders
    return orders.reduce((sum, order) => {
      return sum + (order.shippingCost || 0);
    }, 0);
  }

  private async calculateDisputeDeductions(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Sum all deductions from resolved disputes
    const disputes = await CodDispute.find({
      companyId,
      status: 'resolved',
      resolvedAt: { $gte: startDate, $lte: endDate }
    });

    return disputes.reduce((sum, dispute) => {
      return sum + (dispute.deduction || 0);
    }, 0);
  }

  private async schedulePayout(remittance: CodRemittance) {
    // Call Razorpay API to transfer money to seller
    // Implementation depends on Razorpay account setup
    // For now, mark as "payment_scheduled"
    remittance.status = 'payment_scheduled';
    await remittance.save();
  }
}
```

2. Create seller API endpoints:
```typescript
// /server/src/core/presentation/controllers/cod-remittance.controller.ts

router.get(
  '/api/v1/seller/remittances',
  requireAuth,
  requireCompanyAccess,
  async (req, res) => {
    const remittances = await CodRemittance.find({
      companyId: req.user.companyId
    }).sort({ createdAt: -1 });

    res.json(remittances);
  }
);

router.get(
  '/api/v1/seller/remittances/:id',
  requireAuth,
  requireCompanyAccess,
  async (req, res) => {
    const remittance = await CodRemittance.findById(req.params.id);

    if (remittance.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(remittance);
  }
);

router.post(
  '/api/v1/seller/remittances/:id/dispute',
  requireAuth,
  requireCompanyAccess,
  async (req, res) => {
    const { reason } = req.body;

    await codRemittanceService.disputeRemittance(
      req.params.id,
      req.user.companyId,
      reason
    );

    res.json({ message: 'Dispute submitted for review' });
  }
);
```

3. Create admin approval endpoints:
```typescript
// /server/src/core/presentation/controllers/admin-cod-remittance.controller.ts

router.get(
  '/api/v1/admin/remittances/pending',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    const pending = await CodRemittance.find({ status: 'pending' });
    res.json(pending);
  }
);

router.post(
  '/api/v1/admin/remittances/:id/approve',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    await codRemittanceService.approveRemittance(
      req.params.id,
      req.user.id
    );

    res.json({ message: 'Remittance approved' });
  }
);
```

4. Set up scheduled job to auto-calculate daily:
```typescript
// Calculate remittances daily for all sellers
schedule.scheduleJob('0 0 * * *', async () => {
  const allCompanies = await Company.find({});

  for (const company of allCompanies) {
    const yesterday = new Date(Date.now() - 24*60*60*1000);
    const today = new Date();

    await codRemittanceService.calculateRemittance(
      company._id,
      yesterday,
      today
    );
  }
});
```

**Verification:**
- [ ] Calculate remittance with test orders
- [ ] Fees deducted correctly (shipping, platform, disputes)
- [ ] Seller can see remittance history
- [ ] Seller can dispute a remittance
- [ ] Admin can approve remittances
- [ ] Razorpay payout scheduled correctly
- [ ] Wallet credited when payment completes
- [ ] Test: ₹10,000 COD - ₹500 shipping - ₹200 dispute - ₹100 fee = ₹9,200 net

---

### 2.2 Implement COD Dispute Resolution
**Business Impact:** Unresolved disputes = seller dissatisfaction + chargebacks
**Effort:** 40-50 hours

**What's Missing:**
```
Weight disputes are DETECTED but NOT RESOLVED:
- Seller never notified (TODO comment)
- Admin never notified (TODO comment)
- Dispute sits in database forever
- No resolution workflow exists
- Seller gets surprise charge without warning
```

**Solution:**

1. Create dispute resolution service:
```typescript
// /server/src/core/application/services/disputes/cod-dispute-resolution.service.ts

export class CodDisputeResolutionService {
  /**
   * Detect weight discrepancies and create disputes
   */
  async detectWeightDispute(shipment: Shipment) {
    if (Math.abs(shipment.declaredWeight - shipment.actualWeight) > 0.1) {
      const order = await Order.findById(shipment.orderId);
      const costDifference = this.calculateCostDifference(
        shipment.declaredWeight,
        shipment.actualWeight
      );

      const dispute = await CodDispute.create({
        orderId: shipment.orderId,
        companyId: order.companyId,
        type: 'WEIGHT_DISCREPANCY',
        details: {
          declaredWeight: shipment.declaredWeight,
          actualWeight: shipment.actualWeight,
          costDifference,
          amountAtRisk: costDifference
        },
        status: 'open',
        createdAt: new Date()
      });

      // ✅ NOW NOTIFY (instead of TODO)
      await this.notificationService.notifySeller(
        order.companyId,
        'Weight Dispute Detected',
        `Order ${shipment.orderId}: Declared ${shipment.declaredWeight}kg, Actual ${shipment.actualWeight}kg. Amount at risk: ₹${costDifference}`
      );

      await this.notificationService.notifyAdmin(
        'Weight Dispute',
        `${type} detected on order ${shipment.orderId}`
      );

      return dispute;
    }
  }

  /**
   * Resolve a dispute (admin action)
   */
  async resolveDispute(
    disputeId: string,
    resolution: {
      type: 'accept_charge' | 'refund' | 'partial_credit';
      amount: number;
      reason: string;
    }
  ) {
    const dispute = await CodDispute.findById(disputeId);

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolvedAt = new Date();

    // Apply financial action
    if (resolution.type === 'accept_charge') {
      // Charge seller the difference
      await this.walletService.debit(
        dispute.companyId,
        resolution.amount,
        `Weight dispute resolved: ${resolution.reason}`
      );
    } else if (resolution.type === 'refund') {
      // Credit seller back
      await this.walletService.credit(
        dispute.companyId,
        resolution.amount,
        `Weight dispute refunded: ${resolution.reason}`
      );
    }

    // ✅ NOW NOTIFY (instead of TODO)
    await this.notificationService.notifySeller(
      dispute.companyId,
      'Dispute Resolved',
      `Dispute ${disputeId}: ${resolution.reason}. Amount: ₹${resolution.amount}`
    );

    await dispute.save();
  }

  /**
   * Seller can appeal dispute decision
   */
  async appealDispute(
    disputeId: string,
    companyId: string,
    appeal: {
      reason: string;
      evidence: string[];
    }
  ) {
    const dispute = await CodDispute.findById(disputeId);

    if (dispute.companyId !== companyId) {
      throw new Error('Unauthorized');
    }

    dispute.appeal = appeal;
    dispute.status = 'appealed';

    // Route to senior admin for review
    await this.notificationService.notifyAdmin(
      'Dispute Appeal',
      `Seller ${companyId} appealed dispute ${disputeId}`
    );

    await dispute.save();
  }
}
```

2. Create API endpoints:
```typescript
// /server/src/core/presentation/controllers/dispute.controller.ts

// Seller view their disputes
router.get(
  '/api/v1/seller/disputes',
  requireAuth,
  requireCompanyAccess,
  async (req, res) => {
    const disputes = await CodDispute.find({
      companyId: req.user.companyId
    }).sort({ createdAt: -1 });

    res.json(disputes);
  }
);

// Seller appeal a dispute
router.post(
  '/api/v1/seller/disputes/:id/appeal',
  requireAuth,
  requireCompanyAccess,
  async (req, res) => {
    const { reason, evidence } = req.body;

    await disputeResolutionService.appealDispute(
      req.params.id,
      req.user.companyId,
      { reason, evidence }
    );

    res.json({ message: 'Appeal submitted' });
  }
);

// Admin list open disputes
router.get(
  '/api/v1/admin/disputes/open',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    const open = await CodDispute.find({ status: 'open' });
    res.json(open);
  }
);

// Admin resolve a dispute
router.post(
  '/api/v1/admin/disputes/:id/resolve',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    const { type, amount, reason } = req.body;

    await disputeResolutionService.resolveDispute(
      req.params.id,
      { type, amount, reason }
    );

    res.json({ message: 'Dispute resolved' });
  }
);
```

**Verification:**
- [ ] Weight disputes auto-detected and seller notified
- [ ] Admin can resolve disputes with credits/deductions
- [ ] Wallet updated when dispute resolved
- [ ] Seller gets notifications at each step
- [ ] Seller can appeal dispute resolution
- [ ] Dispute audit trail complete (creation → resolution → appeal)

---

### 2.3 Implement Returns Management
**Business Impact:** 15-30% of orders involve returns
**Effort:** 40-50 hours

**What's Missing:**
```
✅ Models exist (return.model.ts)
❌ Services: MISSING (no returns.service.ts)
❌ Controllers: MISSING (no returns.controller.ts)
❌ Workflows: MISSING (no reverse shipping, inspection, credit)
❌ APIs: MISSING (no endpoints)
```

**Solution:**

1. Create returns service:
```typescript
// /server/src/core/application/services/returns/returns.service.ts

export class ReturnsService {
  constructor(
    private courierService: CourierService,
    private walletService: WalletService,
    private notificationService: NotificationService
  ) {}

  /**
   * Initiate a return request
   */
  async initiateReturn(
    orderId: string,
    companyId: string,
    returnRequest: {
      reason: string;
      notes?: string;
    }
  ): Promise<ReturnOrder> {
    const order = await Order.findById(orderId);

    if (order.companyId !== companyId) {
      throw new Error('Unauthorized');
    }

    if (!order.shipmentId) {
      throw new Error('Cannot return order without shipment');
    }

    // Create return order record
    const returnOrder = await ReturnOrder.create({
      orderId,
      companyId,
      originalShipmentId: order.shipmentId,
      reason: returnRequest.reason,
      notes: returnRequest.notes,
      status: 'initiated',
      initiatedAt: new Date()
    });

    // Create reverse shipment with courier
    await this.createReverseShipment(returnOrder);

    // Notify seller with reverse label
    await this.notificationService.notifySeller(
      companyId,
      'Return Initiated',
      `Return ${returnOrder._id} created. Print reverse label and ship back.`
    );

    return returnOrder;
  }

  /**
   * Create reverse shipment with courier
   */
  private async createReverseShipment(returnOrder: ReturnOrder) {
    const order = await Order.findById(returnOrder.orderId);
    const shipment = await Shipment.findById(returnOrder.originalShipmentId);
    const warehouse = await Warehouse.findById(order.warehouseId);

    // Request reverse AWB from courier
    const reverseShipment = await this.courierService.createReverseShipment({
      originalAwb: shipment.awb,
      returnTo: warehouse.address,
      weight: shipment.weight,
      reason: returnOrder.reason
    });

    // Store reverse tracking details
    returnOrder.reverseShipment = {
      awb: reverseShipment.awb,
      courier: shipment.courier,
      trackingUrl: reverseShipment.trackingUrl,
      printLabel: reverseShipment.labelPdf
    };

    returnOrder.status = 'label_ready';
    await returnOrder.save();
  }

  /**
   * Track return shipment status
   */
  async trackReturn(returnId: string): Promise<ReturnTracking> {
    const returnOrder = await ReturnOrder.findById(returnId);

    const tracking = await this.courierService.getTracking(
      returnOrder.reverseShipment.awb
    );

    return {
      status: tracking.status,
      lastUpdate: tracking.lastUpdate,
      location: tracking.currentLocation,
      events: tracking.events
    };
  }

  /**
   * When return reaches warehouse, inspect and calculate refund
   */
  async inspectReturn(
    returnId: string,
    inspection: {
      condition: 'good' | 'damaged' | 'missing_parts';
      notes: string;
      inspectedBy: string;
    }
  ) {
    const returnOrder = await ReturnOrder.findById(returnId);

    returnOrder.inspection = {
      condition: inspection.condition,
      notes: inspection.notes,
      inspectedAt: new Date(),
      inspectedBy: inspection.inspectedBy
    };

    // Calculate refund based on condition
    const refund = this.calculateRefund(returnOrder);

    // Credit seller's wallet
    await this.walletService.credit(
      returnOrder.companyId,
      refund.amount,
      `Return credit: ${returnOrder.orderId}`
    );

    // Generate credit note
    returnOrder.creditNote = {
      amount: refund.amount,
      reason: `Return in ${inspection.condition} condition`,
      generatedAt: new Date()
    };

    returnOrder.status = 'credited';

    // Notify seller of credit
    await this.notificationService.notifySeller(
      returnOrder.companyId,
      'Return Credited',
      `Return ${returnId} inspected. ₹${refund.amount} credited to wallet.`
    );

    await returnOrder.save();
  }

  /**
   * Calculate refund based on return condition
   */
  private calculateRefund(returnOrder: ReturnOrder): {
    amount: number;
    refundPercent: number;
    restockingFee: number;
  } {
    const originalAmount = returnOrder.orderId.totalAmount;

    let refundPercent = 100;

    switch (returnOrder.inspection.condition) {
      case 'good':
        refundPercent = 100; // Full refund
        break;
      case 'damaged':
        refundPercent = 70; // 30% restocking fee
        break;
      case 'missing_parts':
        refundPercent = 50; // 50% restocking fee
        break;
    }

    const refundAmount = (originalAmount * refundPercent) / 100;

    return {
      amount: refundAmount,
      refundPercent,
      restockingFee: originalAmount - refundAmount
    };
  }
}
```

2. Create seller API endpoints:
```typescript
// /server/src/core/presentation/controllers/returns.controller.ts

// Initiate return
router.post(
  '/api/v1/seller/orders/:orderId/return',
  requireAuth,
  requireCompanyAccess,
  async (req, res) => {
    const { reason, notes } = req.body;

    const returnOrder = await returnsService.initiateReturn(
      req.params.orderId,
      req.user.companyId,
      { reason, notes }
    );

    res.json({
      returnId: returnOrder._id,
      reverseLabel: returnOrder.reverseShipment.printLabel,
      trackingNumber: returnOrder.reverseShipment.awb,
      status: 'label_ready'
    });
  }
);

// Track return
router.get(
  '/api/v1/seller/returns/:returnId/track',
  requireAuth,
  requireCompanyAccess,
  async (req, res) => {
    const tracking = await returnsService.trackReturn(req.params.returnId);
    res.json(tracking);
  }
);

// View return details
router.get(
  '/api/v1/seller/returns/:returnId',
  requireAuth,
  requireCompanyAccess,
  async (req, res) => {
    const returnOrder = await ReturnOrder.findById(req.params.returnId);

    if (returnOrder.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(returnOrder);
  }
);
```

**Verification:**
- [ ] Initiate return from order
- [ ] Reverse shipment AWB generated
- [ ] Seller can print return label
- [ ] Seller can track reverse shipment
- [ ] Return status updates (initiated → in_transit → received → inspected → credited)
- [ ] Inspection form records condition
- [ ] Refund calculated based on condition
- [ ] Wallet credited with refund amount
- [ ] Credit note generated

---

## PHASE 3: FEATURE COMPLETION (WEEKS 4-6)
**Status:** HIGH priority but not blocking launch (can add after MVP)
**Effort:** 120-170 hours

### 3.1 Implement Delhivery Integration
**Effort:** 50-70 hours
**Impact:** Second courier option

Follow Velocity Express pattern (1,651 LOC reference):
- API client
- Authentication
- Request/response mapping
- Error handling
- Service layer
- Status mapping

### 3.2 Implement Xpressbees Integration
**Effort:** 50-70 hours
**Impact:** Third courier option

Same pattern as Delhivery.

### 3.3 Fix Marketplace Integration Gaps
**Effort:** 40-60 hours

- WooCommerce: Actual inventory fetch (currently placeholder)
- Amazon: Auto-detect marketplace region
- Flipkart: Complete product mapping logic

---

## TESTING STRATEGY

### Phase 1 Testing (Security)
```
1. Credential Encryption
   - Encrypt credential → Verify encrypted in DB
   - Use encrypted credential → Verify works in API call
   - Decrypt credential → Verify matches original

2. Authorization
   - Seller A tries to access Seller B's orders → 403 Forbidden
   - Unauthenticated request → 401 Unauthorized
   - Invalid JWT → 401 Unauthorized
   - Webhook without signature → 401 Unauthorized

3. Transactions
   - Multi-step operation fails → All steps roll back
   - Verify no orphaned orders/shipments
   - Test concurrent operations
```

### Phase 2 Testing (Features)
```
1. COD Remittance
   - Calculate with test orders
   - Verify fee deductions
   - Seller dispute functionality
   - Admin approval and payout
   - Wallet update verification

2. COD Disputes
   - Auto-detect weight discrepancy
   - Create dispute record
   - Seller notification
   - Admin resolution
   - Wallet debit/credit
   - Seller appeal

3. Returns
   - Initiate return from order
   - Generate reverse label
   - Track return shipment
   - Inspect on arrival
   - Calculate and apply refund
   - Wallet credit
   - Credit note generation
```

---

## LAUNCH READINESS CHECKLIST

**Phase 1 (Security):**
- [ ] All credentials encrypted (database audit)
- [ ] 36 controllers have authorization
- [ ] 20+ services use transactions
- [ ] All webhook signatures verified
- [ ] Security testing passed
- [ ] Penetration testing clean

**Phase 2 (Features):**
- [ ] COD remittance calculate/approve working
- [ ] COD disputes detection/resolution working
- [ ] Returns initiated/tracked/credited working
- [ ] Seller APIs tested with real data
- [ ] Admin APIs tested
- [ ] E2E testing passed
- [ ] User acceptance testing passed

**Phase 3 (Completion):**
- [ ] Delhivery integration complete
- [ ] Xpressbees integration complete
- [ ] Marketplace integrations fixed
- [ ] Multi-courier rate comparison working

**Infrastructure:**
- [ ] Docker setup complete
- [ ] CI/CD pipeline working
- [ ] Monitoring and alerting configured
- [ ] Backup strategy tested
- [ ] Disaster recovery plan tested

**Documentation:**
- [ ] API documentation updated
- [ ] Seller guide updated
- [ ] Admin guide updated
- [ ] Setup instructions updated

**Launch Date:** Week 9-10 (if Phase 1 starts immediately with 2-3 developers)

---

## EFFORT SUMMARY

| Phase | Tasks | Hours | Weeks | Team | Start |
|-------|-------|-------|-------|------|-------|
| **Phase 1** | Security | 58-80 | 1 | 2-3 devs | Week 1 |
| **Phase 2** | Features | 120-150 | 2-3 | 2-3 devs | Week 2 |
| **Phase 3** | Completion | 120-170 | 3-4 | 2-3 devs | Week 4 |
| **TOTAL** | **Production Ready** | **298-400** | **6-8** | **2-3 devs** | **Now** |

**Key Success Factors:**
1. Start Phase 1 immediately (security is non-negotiable)
2. Dedicate 2-3 developers full-time
3. Allocate 1-2 hours daily for code review + testing
4. Set up CI/CD early (prevents regressions)
5. Do NOT ship Phase 1 + 2 without completion
6. Phase 3 can be added incrementally after launch

---

## RISK MITIGATION

**If you launch WITHOUT Phase 1:**
- 🔴 Data breach = regulatory fines + lawsuits
- 🔴 Seller data exposure = competitor access
- 🔴 Chargebacks = revenue loss

**If you launch WITHOUT Phase 2:**
- 🔴 Sellers cannot receive money = business blocked
- 🔴 Disputes unresolved = customer dissatisfaction + chargebacks
- 🔴 No returns process = 15-30% order fulfillment failure

**If you launch WITHOUT Phase 3:**
- 🟡 Only 1 courier option = limited market reach
- 🟡 Incomplete integrations = manual workarounds needed
- 🟡 Single point of failure if Velocity has issues

---

## NEXT STEPS

1. **Today:** Review this roadmap with team
2. **Tomorrow:** Assign developers to Phase 1
3. **This Week:** Complete Task 1.1 (encryption) + begin Task 1.2
4. **Next Week:** Complete Phase 1 + start Phase 2
5. **Week 3:** Complete Phase 2 + begin Phase 3
6. **Week 9-10:** Launch with Phase 1 + 2 complete

**Do NOT launch before Phase 1 and Phase 2 are complete.**

