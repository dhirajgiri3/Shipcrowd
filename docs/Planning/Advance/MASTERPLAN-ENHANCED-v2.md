# ShipCrowd Platform: Complete Advanced Implementation Plan v2.0

**Version:** 2.0 (Enhanced & Improved)
**Created:** 2026-01-07
**Status:** Ready for Implementation
**Scope:** Complete end-to-end shipping aggregator platform (38 critical scenarios)

---

## EXECUTIVE SUMMARY

### Current State Analysis
- **Overall Progress:** 70-75% complete (core features implemented)
- **Production Readiness:** 45% (missing infrastructure, fraud detection, remittance automation)
- **Feature Coverage:** 18% fully implemented, 29% partial, 53% missing
- **Technology:** Clean architecture, multi-tenant, multi-marketplace integration
- **Strengths:** Strong foundation, NDR/RTO automation, commission system, multi-channel orders
- **Critical Gaps:** Weight disputes, COD remittance, fraud detection, dispute resolution, production infrastructure

### Strategic Goals for Completion (Weeks 11-16+)
1. **Revenue Protection (Week 11-12):** Weight disputes, fraud detection, remittance automation
2. **Production Infrastructure (Week 13):** Dockerization, CI/CD, monitoring, security hardening
3. **Performance & Resilience (Week 14):** Caching, indexing, error recovery, API optimization
4. **Customer Experience (Week 15-16):** Reverse logistics, dispute resolution, tracking enhancements
5. **Advanced Features (Week 17+):** B2B freight, international shipping, dynamic routing, seller financing

---

## PART 1: COMPREHENSIVE GAP ANALYSIS

### 1.1 Revenue Protection Features (Critical Impact: ₹50,000-500,000/month)

| Feature | Business Impact | Current State | Gap | Priority |
|---------|-----------------|----------------|-----|----------|
| **Weight Discrepancy Automation** | 15-20% of shipments lose ₹500-2,000 each | Models exist, no automation | Detection, dispute flow, settlement | P0 - Week 11 |
| **COD Remittance Scheduling** | Manual payouts, cash flow delays | Manual only | Automated schedules, on-demand | P0 - Week 11 |
| **Fraud Detection System** | 5-10% fraudulent orders, ₹1L+ losses | KYC only | AI-powered analysis, auto-flagging | P0 - Week 12 |
| **Dispute Resolution** | Customer trust, legal liability | Completely missing | Complete workflow, SLA tracking | P0 - Week 12 |
| **Reverse Logistics** | 15-30% of e-commerce orders | Missing | Returns, QC, refund processing | P1 - Week 12 |

### 1.2 Infrastructure Gaps (Production Readiness: 45%)

| Component | Current | Target | Impact | Priority |
|-----------|---------|--------|--------|----------|
| **Containerization** | Manual deployment | Docker Compose (3+ services) | Deploy consistency, scalability | P1 - Week 13 |
| **CI/CD Pipeline** | None | GitHub Actions (dev/staging/prod) | Automation, reliability | P1 - Week 13 |
| **Monitoring Stack** | Basic Winston logs | Prometheus + Grafana + Sentry | Proactive issue detection | P1 - Week 13 |
| **Caching Layer** | No caching | Redis (session, API responses) | 40% latency reduction | P2 - Week 14 |
| **Database Optimization** | Basic indexes | Query analysis, index optimization | 30% query speed improvement | P2 - Week 14 |
| **API Security** | Basic rate limiting | Per-route limits, OWASP hardening | Reduce attack surface | P2 - Week 15 |

### 1.3 Feature Implementation Status (38 Critical Scenarios)

#### ✅ FULLY IMPLEMENTED (7/38 = 18%)
1. RTO Handling & Automation
2. Zone-Based Pricing
3. Multi-marketplace Integrations (Shopify, WooCommerce, Amazon, Flipkart)
4. Commission & Sales Team Management
5. Webhook Retry Mechanisms
6. API Rate Limiting
7. NDR Management (AI-powered classification)

#### ⏳ PARTIALLY IMPLEMENTED (11/38 = 29%)
8. Weight Discrepancy (models exist, no automation)
9. COD Remittance (manual only, no scheduling)
10. Serviceability Check (data exists, no API)
11. Bulk Upload (routes exist, incomplete validation)
12. Address Validation (no Google Maps integration)
13. Insurance (tracking only, no claims)
14. Peak Season Surcharges (dates exist, no auto-calculation)
15. Courier Performance Analytics (data exists, no dashboard)
16. Rate Card Tiers (overrides exist, no auto-upgrades)
17. Multi-Piece Shipments (count exists, no parent-child)
18. Seller Onboarding (KYC exists, no tiered limits)

#### ❌ MISSING (20/38 = 53%)
19-38. Pickup scheduling, dispute resolution, fraud detection (advanced), reverse logistics, branded tracking, B2B freight, hyperlocal delivery, international shipping, custom packaging, dangerous goods, dynamic routing, seller financing, remittance flexibility, quality assurance, sustainability, GDPR compliance, promo codes, inventory sync, analytics dashboard, corporate accounts

---

## PART 2: DETAILED IMPLEMENTATION ROADMAP

---

# WEEK 11: WEIGHT DISCREPANCY MANAGEMENT & COD REMITTANCE AUTOMATION

## Phase 11.1: Weight Discrepancy Detection & Management System

### Objective
Automatically detect, report, and resolve weight discrepancies to prevent revenue loss (15-20% of shipments affected, ₹500-2,000 loss per incident).

### Task 11.1.1: Enhanced Database Models

**File:** `server/src/infrastructure/database/mongoose/models/WeightDispute.ts` (NEW)

```typescript
interface IWeightDispute {
  // Identification
  disputeId: string  // WD-YYYYMMDD-XXXXX
  shipmentId: ObjectId
  orderId: ObjectId
  companyId: ObjectId

  // Weight Information
  declaredWeight: { value: number, unit: 'kg' | 'g' }
  actualWeight: { value: number, unit: 'kg' | 'g' }
  discrepancy: {
    value: number           // absolute difference in kg
    percentage: number      // percentage difference
    thresholdExceeded: boolean  // if > 5%
  }

  // Dispute Lifecycle
  status: 'pending' | 'under_review' | 'seller_response' | 'auto_resolved' | 'manual_resolved' | 'closed'
  detectedAt: Date
  detectedBy: 'carrier_webhook' | 'system_scan'

  // Seller Evidence
  evidence: {
    sellerPhotos?: string[]  // Photos of packet with scale
    sellerDocuments?: string[]  // Bills, invoices proving weight
    submittedAt?: Date
    notes?: string
  }

  // Carrier Evidence
  carrierEvidence: {
    scanPhoto?: string      // Photo from carrier scale
    scanTimestamp?: Date
    scanLocation?: string
    carrierNotes?: string
  }

  // Financial Impact
  financialImpact: {
    originalCharge: number      // What seller paid
    revisedCharge: number       // What they should pay
    difference: number          // Revenue adjustment
    chargeDirection: 'debit' | 'credit'  // Who needs to pay/refund
  }

  // Resolution
  resolution?: {
    outcome: 'seller_favor' | 'shipcrowd_favor' | 'split' | 'waived'
    adjustedWeight?: { value: number, unit: string }
    refundAmount?: number
    deductionAmount?: number
    reasonCode: string
    resolvedAt: Date
    resolvedBy: ObjectId  // admin who resolved
    notes: string
  }

  // Timeline
  timeline: Array<{
    status: string
    timestamp: Date
    actor: ObjectId | 'system'
    action: string
    notes?: string
  }>

  // Wallet Link
  walletTransactionId?: ObjectId  // Links to WalletTransaction

  createdAt: Date
  updatedAt: Date
}
```

**File:** `server/src/infrastructure/database/mongoose/models/Shipment.ts` (ENHANCE)

Add fields:
```typescript
weightDispute: {
  exists: boolean
  disputeId?: ObjectId
  status?: string
  detectedAt?: Date
}

weights: {
  declared: { value: number, unit: 'kg' }
  actual?: { value: number, unit: 'kg' }  // Updated when carrier scans
  verified: boolean
}
```

### Task 11.1.2: Weight Discrepancy Detection Service

**File:** `server/src/core/application/services/disputes/weight-dispute-detection.service.ts` (NEW)

```typescript
export class WeightDisputeDetectionService {
  constructor(
    private shipmentRepo: ShipmentRepository,
    private weightDisputeRepo: WeightDisputeRepository,
    private rateCardService: RateCardService,
    private walletService: WalletService,
    private notificationService: NotificationService,
    private logger: LoggerService
  ) {}

  /**
   * Called by Velocity webhook when package is weighed at carrier hub
   * Detects discrepancy > 5% threshold or ₹50 difference
   */
  async detectOnCarrierScan(
    shipmentId: string,
    actualWeight: { value: number, unit: string },
    carrierScanData: any
  ): Promise<WeightDispute | null> {
    const shipment = await this.shipmentRepo.findById(shipmentId);
    if (!shipment) throw new Error('Shipment not found');

    const actualKg = this.convertToKg(actualWeight);
    const declaredKg = shipment.weights.declared.value;

    const discrepancy = {
      value: Math.abs(actualKg - declaredKg),
      percentage: ((Math.abs(actualKg - declaredKg) / declaredKg) * 100),
    };

    // Threshold: >5% difference OR >₹50 impact
    const financialImpact = await this.calculateFinancialImpact(
      shipment,
      discrepancy
    );

    if (discrepancy.percentage > 5 || financialImpact.difference > 50) {
      const dispute = await this.createDispute(
        shipment,
        declaredKg,
        actualKg,
        discrepancy,
        financialImpact,
        carrierScanData
      );

      this.logger.info(`Weight dispute created: ${dispute.disputeId}`);

      // Notify seller immediately
      await this.notificationService.sendWeightDisputeAlert(
        shipment.companyId,
        dispute
      );

      return dispute;
    }

    // Update shipment with actual weight
    await this.shipmentRepo.update(shipmentId, {
      'weights.actual': actualWeight,
      'weights.verified': true
    });

    return null;
  }

  /**
   * Calculate financial impact of weight discrepancy
   */
  async calculateFinancialImpact(
    shipment: Shipment,
    discrepancy: any
  ): Promise<FinancialImpact> {
    const rateCard = await this.rateCardService.getRateCard(
      shipment.rateCardId
    );

    const originalCharge = shipment.shippingCost;
    const actualWeight = discrepancy.value;
    const revisedCharge = this.calculateChargeForWeight(
      actualWeight,
      rateCard
    );

    return {
      originalCharge,
      revisedCharge,
      difference: revisedCharge - originalCharge,
      chargeDirection: revisedCharge > originalCharge ? 'debit' : 'credit'
    };
  }

  /**
   * Auto-creates dispute when threshold exceeded
   */
  private async createDispute(
    shipment: Shipment,
    declaredKg: number,
    actualKg: number,
    discrepancy: any,
    financialImpact: any,
    carrierData: any
  ): Promise<WeightDispute> {
    const dispute = new WeightDispute({
      disputeId: this.generateDisputeId(),
      shipmentId: shipment._id,
      orderId: shipment.orderId,
      companyId: shipment.companyId,

      declaredWeight: { value: declaredKg, unit: 'kg' },
      actualWeight: { value: actualKg, unit: 'kg' },
      discrepancy,

      status: 'pending',
      detectedAt: new Date(),
      detectedBy: 'carrier_webhook',

      carrierEvidence: {
        scanPhoto: carrierData.photoUrl,
        scanTimestamp: carrierData.scannedAt,
        scanLocation: carrierData.location,
        carrierNotes: carrierData.notes
      },

      financialImpact,

      timeline: [{
        status: 'pending',
        timestamp: new Date(),
        actor: 'system',
        action: 'Weight discrepancy detected at carrier hub'
      }]
    });

    return this.weightDisputeRepo.create(dispute);
  }

  /**
   * Background job: Scan recent shipments for missing weight data
   */
  async scanForPendingWeightUpdates(): Promise<void> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const shipmentsWithoutActualWeight = await this.shipmentRepo.find({
      'weights.verified': false,
      'weights.actual': { $exists: false },
      pickedUpAt: { $lt: thirtyMinutesAgo },
      carrierStatus: { $ne: 'cancelled' }
    });

    this.logger.warn(
      `Found ${shipmentsWithoutActualWeight.length} shipments missing weight verification`
    );

    // Alert shipcrowd to follow up with carrier
    // Could trigger automatic escalation to carrier support
  }

  private convertToKg(weight: any): number {
    if (weight.unit === 'kg') return weight.value;
    if (weight.unit === 'g') return weight.value / 1000;
    throw new Error(`Unknown weight unit: ${weight.unit}`);
  }

  private calculateChargeForWeight(weight: number, rateCard: RateCard): number {
    // Implement based on rate card logic (per kg, slabs, etc)
    return weight * rateCard.pricePerKg;
  }

  private generateDisputeId(): string {
    const date = new Date();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `WD-${date.toISOString().split('T')[0].replace(/-/g, '')}-${random}`;
  }
}
```

### Task 11.1.3: Weight Dispute Resolution Service

**File:** `server/src/core/application/services/disputes/weight-dispute-resolution.service.ts` (NEW)

```typescript
export class WeightDisputeResolutionService {
  constructor(
    private weightDisputeRepo: WeightDisputeRepository,
    private walletService: WalletService,
    private walletTransactionRepo: WalletTransactionRepository,
    private shipmentRepo: ShipmentRepository,
    private notificationService: NotificationService,
    private auditLogService: AuditLogService,
    private logger: LoggerService
  ) {}

  /**
   * Seller submits response/evidence to dispute
   */
  async submitSellerResponse(
    disputeId: string,
    companyId: string,
    evidence: SellerEvidenceDTO
  ): Promise<WeightDispute> {
    const dispute = await this.weightDisputeRepo.findById(disputeId);

    if (!dispute || dispute.companyId.toString() !== companyId) {
      throw new UnauthorizedError('Not authorized to respond to this dispute');
    }

    if (dispute.status !== 'pending') {
      throw new ConflictError('Dispute is no longer pending');
    }

    // Update dispute with evidence
    dispute.evidence = {
      sellerPhotos: evidence.photos,
      sellerDocuments: evidence.documents,
      submittedAt: new Date(),
      notes: evidence.notes
    };

    dispute.status = 'under_review';
    dispute.timeline.push({
      status: 'under_review',
      timestamp: new Date(),
      actor: companyId,
      action: 'Seller submitted evidence'
    });

    await this.weightDisputeRepo.update(disputeId, dispute);

    // Notify shipcrowd team to review
    await this.notificationService.sendInternalAlertForReview(
      'weight_dispute_needs_review',
      dispute
    );

    return dispute;
  }

  /**
   * Admin reviews and resolves dispute
   */
  async resolveDispute(
    disputeId: string,
    adminId: string,
    resolution: DisputeResolutionDTO
  ): Promise<WeightDispute> {
    const dispute = await this.weightDisputeRepo.findById(disputeId);
    if (!dispute) throw new NotFoundError('Dispute not found');

    // Validate resolution
    if (!['seller_favor', 'shipcrowd_favor', 'split', 'waived'].includes(resolution.outcome)) {
      throw new ValidationError('Invalid resolution outcome');
    }

    dispute.resolution = {
      outcome: resolution.outcome,
      adjustedWeight: resolution.adjustedWeight,
      refundAmount: resolution.refundAmount,
      deductionAmount: resolution.deductionAmount,
      reasonCode: resolution.reasonCode,
      resolvedAt: new Date(),
      resolvedBy: adminId,
      notes: resolution.notes
    };

    dispute.status = 'manual_resolved';

    // Process financial settlement
    await this.processFinancialSettlement(dispute);

    // Update timeline
    dispute.timeline.push({
      status: 'manual_resolved',
      timestamp: new Date(),
      actor: adminId,
      action: `Dispute resolved: ${resolution.outcome}`
    });

    await this.weightDisputeRepo.update(disputeId, dispute);

    // Notify seller of resolution
    await this.notificationService.sendDisputeResolution(
      dispute.companyId,
      dispute
    );

    // Log for audit
    await this.auditLogService.log({
      action: 'WEIGHT_DISPUTE_RESOLVED',
      actor: adminId,
      resource: { disputeId, shipmentId: dispute.shipmentId },
      changes: resolution
    });

    return dispute;
  }

  /**
   * Auto-resolve disputes after 7 days of inactivity (favor shipcrowd)
   */
  async autoResolveExpiredDisputes(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const expiredDisputes = await this.weightDisputeRepo.find({
      status: { $in: ['pending', 'under_review'] },
      createdAt: { $lt: sevenDaysAgo }
    });

    let resolved = 0;

    for (const dispute of expiredDisputes) {
      try {
        await this.resolveDispute(dispute._id, 'system', {
          outcome: 'shipcrowd_favor',
          deductionAmount: dispute.financialImpact.difference,
          reasonCode: 'AUTO_RESOLVED_NO_RESPONSE',
          notes: 'Automatically resolved after 7 days of no seller response'
        });
        resolved++;
      } catch (error) {
        this.logger.error(
          `Failed to auto-resolve dispute ${dispute._id}`,
          error
        );
      }
    }

    return resolved;
  }

  /**
   * Process financial settlement based on resolution
   */
  private async processFinancialSettlement(dispute: WeightDispute): Promise<void> {
    const { outcome, deductionAmount, refundAmount } = dispute.resolution!;

    if (outcome === 'seller_favor' && refundAmount) {
      // Refund to seller's wallet
      await this.walletService.credit(
        dispute.companyId,
        refundAmount,
        {
          type: 'WEIGHT_DISPUTE_REFUND',
          reference: dispute.disputeId,
          description: `Weight dispute refund for shipment ${dispute.shipmentId}`
        }
      );

      dispute.walletTransactionId = await this.createWalletTransaction(
        dispute.companyId,
        'credit',
        refundAmount,
        'WEIGHT_DISPUTE_REFUND',
        dispute.disputeId
      );
    }

    if ((outcome === 'shipcrowd_favor' || outcome === 'split') && deductionAmount) {
      // Deduct from seller's wallet or hold shipment
      const balance = await this.walletService.getBalance(dispute.companyId);

      if (balance >= deductionAmount) {
        await this.walletService.debit(
          dispute.companyId,
          deductionAmount,
          {
            type: 'WEIGHT_DISPUTE_DEDUCTION',
            reference: dispute.disputeId,
            description: `Weight dispute deduction for shipment ${dispute.shipmentId}`
          }
        );

        dispute.walletTransactionId = await this.createWalletTransaction(
          dispute.companyId,
          'debit',
          deductionAmount,
          'WEIGHT_DISPUTE_DEDUCTION',
          dispute.disputeId
        );
      } else {
        // Insufficient balance - mark shipment as payment pending
        await this.shipmentRepo.update(dispute.shipmentId as any, {
          status: 'payment_pending',
          paymentPending: {
            amount: deductionAmount,
            reason: 'weight_dispute',
            disputeId: dispute.disputeId
          }
        });
      }
    }
  }

  private async createWalletTransaction(
    companyId: ObjectId,
    type: 'credit' | 'debit',
    amount: number,
    transactionType: string,
    reference: string
  ): Promise<ObjectId> {
    const transaction = new WalletTransaction({
      company: companyId,
      type: transactionType,
      amount,
      transactionType: type,
      reference,
      status: 'completed',
      createdAt: new Date()
    });

    return (await this.walletTransactionRepo.create(transaction))._id;
  }
}
```

### Task 11.1.4: Weight Dispute API Endpoints

**File:** `server/src/presentation/http/controllers/disputes/weight-disputes.controller.ts` (NEW)

```typescript
export class WeightDisputesController {
  constructor(
    private weightDisputeDetectionService: WeightDisputeDetectionService,
    private weightDisputeResolutionService: WeightDisputeResolutionService,
    private weightDisputeAnalyticsService: WeightDisputeAnalyticsService
  ) {}

  async listDisputes(req: Request, res: Response) {
    // GET /api/v1/disputes/weight
    // Filters: status, dateRange, shipmentId
    // Response: Paginated list of weight disputes
  }

  async getDisputeDetails(req: Request, res: Response) {
    // GET /api/v1/disputes/weight/:disputeId
    // Response: Full dispute details with timeline
  }

  async submitSellerResponse(req: Request, res: Response) {
    // POST /api/v1/disputes/weight/:disputeId/submit
    // Body: { photos: [], documents: [], notes: string }
    // Response: Updated dispute status
  }

  async resolveDispute(req: Request, res: Response) {
    // POST /api/v1/disputes/weight/:disputeId/resolve (ADMIN)
    // Body: { outcome, refundAmount, deductionAmount, reasonCode, notes }
    // Response: Resolution confirmation
  }

  async getAnalytics(req: Request, res: Response) {
    // GET /api/v1/disputes/weight/analytics
    // Response: Dispute metrics, trends, high-risk sellers
  }
}
```

**File:** `server/src/presentation/http/routes/v1/disputes/weight-disputes.routes.ts` (NEW)

```typescript
export const weightDisputesRoutes = Router();

weightDisputesRoutes.get('/disputes/weight', authenticate, listDisputes);
weightDisputesRoutes.get('/disputes/weight/:id', authenticate, getDisputeDetails);
weightDisputesRoutes.post('/disputes/weight/:id/submit', authenticate, submitSellerResponse);
weightDisputesRoutes.post('/disputes/weight/:id/resolve', authenticate, authorize('ADMIN'), resolveDispute);
weightDisputesRoutes.get('/disputes/weight/analytics', authenticate, authorize('ADMIN'), getAnalytics);
```

### Task 11.1.5: Background Job for Auto-Resolution

**File:** `server/src/infrastructure/jobs/weight-dispute-auto-resolve.job.ts` (NEW)

```typescript
export class WeightDisputeAutoResolveJob {
  constructor(
    private weightDisputeResolutionService: WeightDisputeResolutionService,
    private logger: LoggerService
  ) {}

  // Runs daily at 00:00 IST
  @Cron('0 0 * * *', { timezone: 'Asia/Kolkata' })
  async execute() {
    this.logger.info('Starting weight dispute auto-resolution job');

    try {
      const resolved = await this.weightDisputeResolutionService
        .autoResolveExpiredDisputes();

      this.logger.info(`Auto-resolved ${resolved} weight disputes`);
    } catch (error) {
      this.logger.error('Weight dispute auto-resolve job failed', error);
    }
  }
}
```

### Task 11.1.6: Integration with Carrier Webhook

**File:** `server/src/presentation/http/webhooks/velocity.webhook.ts` (UPDATE)

```typescript
// Add to existing Velocity webhook handler
async handleCarrierWeightUpdate(payload: VelocityWebhookPayload) {
  if (payload.event === 'shipment.weight_scanned') {
    const shipmentId = payload.shipment_id;
    const actualWeight = {
      value: payload.actual_weight,
      unit: payload.weight_unit
    };

    await this.weightDisputeDetectionService.detectOnCarrierScan(
      shipmentId,
      actualWeight,
      {
        photoUrl: payload.photo_url,
        scannedAt: payload.scanned_at,
        location: payload.scan_location,
        notes: payload.notes
      }
    );
  }
}
```

### Task 11.1.7: Notifications

**File:** `server/src/infrastructure/communication/notifications/weight-dispute.notifications.ts` (NEW)

Multi-channel notifications:
- **Email:** HTML template with dispute details, evidence, action items
- **SMS:** Quick alert: "Weight discrepancy detected on order #{orderid}. Difference: {amount}. Respond by {date}"
- **WhatsApp:** Rich message with action buttons

### Task 11.1.8: Testing

**File:** `server/tests/integration/disputes/weight-disputes.test.ts` (NEW)

Test scenarios:
1. Weight discrepancy detection (5% threshold)
2. Seller evidence submission
3. Admin resolution (seller favor/shipcrowd favor/split)
4. Wallet debit/credit
5. Auto-resolution after 7 days
6. Concurrent disputes
7. Notification delivery

**Success Criteria:**
- ✅ Detect 100% of discrepancies > 5%
- ✅ Dispute creation within 5 minutes of carrier webhook
- ✅ Financial settlement within 24 hours of resolution
- ✅ Seller response rate > 60%

---

## Phase 11.2: COD Remittance Automation System

### Objective
Automate COD (Cash on Delivery) remittance with scheduled payouts, on-demand requests, and real-time reconciliation to ensure seller cash flow and platform profitability.

### Task 11.2.1: Enhanced Database Models

**File:** `server/src/infrastructure/database/mongoose/models/CODRemittance.ts` (NEW)

```typescript
interface ICODRemittance {
  // Identification
  remittanceId: string  // REM-YYYYMMDD-XXXXX
  companyId: ObjectId
  scheduleId?: string   // Links to schedule config

  // Batch Details
  batch: {
    batchNumber: number
    createdDate: Date
    cutoffDate: Date   // Latest delivery date included
    shippingPeriod: { start: Date, end: Date }
  }

  // Eligible Shipments
  shipments: Array<{
    shipmentId: ObjectId
    awb: string
    codAmount: number
    deliveredAt: Date
    status: 'delivered' | 'rto' | 'disputed'

    // Deductions breakdown
    deductions: {
      shippingCharge: number
      weightDispute?: number
      rtoCharge?: number
      insuranceCharge?: number
      otherFees?: number
      total: number
    }

    netAmount: number  // codAmount - deductions
  }>

  // Financial Summary
  financial: {
    totalCODCollected: number
    totalShipments: number
    successfulDeliveries: number
    rtoCount: number
    disputedCount: number

    // Deductions breakdown
    deductions: {
      shippingCharges: number       // Velocity/Carrier charges
      weightDiscrepancies: number   // From disputes
      rtoCharges: number            // Return charges
      insuranceClaims: number
      platformFee: number           // ShipCrowd commission (%)
      other: number
      total: number
    }

    netPayable: number  // Total due to seller
    holdAmount?: number // If payment pending
  }

  // Schedule & Payout
  schedule: {
    type: 'scheduled' | 'on_demand' | 'manual'
    scheduledDate: Date
    requestedAt?: Date
    requestedBy?: ObjectId
  }

  payout: {
    status: 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed'
    method: 'razorpay' | 'bank_transfer' | 'wallet'

    // Razorpay payout details
    razorpayPayoutId?: string
    razorpayResponse?: any

    // Bank transfer details
    accountDetails?: {
      accountNumber: string
      ifsc: string
      accountHolderName: string
      bankName?: string
    }

    processedAt?: Date
    completedAt?: Date
    failureReason?: string
    failureCode?: string
  }

  // Approval Chain
  approvals: Array<{
    role: 'auto' | 'admin' | 'finance'
    status: 'pending' | 'approved' | 'rejected'
    approvedBy?: ObjectId
    approvedAt?: Date
    notes?: string
  }>

  // Reconciliation
  reconciliation: {
    reconciledAt?: Date
    reconciledBy?: ObjectId
    discrepancies?: string[]
    notes?: string
  }

  // Status & Timeline
  status: 'draft' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled'

  timeline: Array<{
    status: string
    timestamp: Date
    actor: ObjectId | 'system'
    action: string
    notes?: string
  }>

  // Seller Config
  sellerConfig: {
    schedule: 'daily' | 'weekly' | 'biweekly' | 'monthly'
    dayOfWeek?: number    // For weekly (0-6)
    dayOfMonth?: number   // For monthly (1-31)
    autoApprove?: boolean // Auto-approve remittances
    minThreshold: number  // Minimum ₹ before processing
    holdPeriod: number    // Days to hold COD after delivery
  }

  // References
  relatedRemittances?: ObjectId[]  // If split or merged

  createdAt: Date
  updatedAt: Date
}
```

**File:** `server/src/infrastructure/database/mongoose/models/Company.ts` (ENHANCE)

Add fields:
```typescript
codRemittanceConfig: {
  schedule: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  dayOfWeek?: number
  dayOfMonth?: number
  autoApprove: boolean
  minThreshold: number
  holdPeriod: number    // Default: 7 days
  lastRemittanceDate?: Date
  nextRemittanceDate?: Date
}

codMetrics: {
  totalCODCollected: number
  totalRemitted: number
  pendingRemittance: number
  averageRemittanceCycle: number
  failureRate?: number
}
```

### Task 11.2.2: COD Remittance Calculation Service

**File:** `server/src/core/application/services/remittance/cod-remittance-calculation.service.ts` (NEW)

```typescript
export class CODRemittanceCalculationService {
  constructor(
    private shipmentRepo: ShipmentRepository,
    private weightDisputeRepo: WeightDisputeRepository,
    private rtoEventRepo: RTOEventRepository,
    private walletService: WalletService,
    private rateCardService: RateCardService,
    private logger: LoggerService
  ) {}

  /**
   * Calculate eligible COD shipments for remittance
   */
  async calculateEligibleShipments(
    companyId: ObjectId,
    holdPeriodDays: number = 7
  ): Promise<EligibleShipment[]> {
    const holdCutoffDate = new Date();
    holdCutoffDate.setDate(holdCutoffDate.getDate() - holdPeriodDays);

    // Find eligible shipments
    const shipments = await this.shipmentRepo.find({
      companyId,
      paymentMode: 'COD',
      status: 'delivered',
      'delivery.deliveredAt': { $lte: holdCutoffDate },
      'remittance.remittedAt': { $exists: false },
      'remittance.status': { $ne: 'remitted' }
    });

    const eligibleShipments: EligibleShipment[] = [];

    for (const shipment of shipments) {
      // Check if shipment has disputes
      const dispute = await this.weightDisputeRepo.findOne({
        shipmentId: shipment._id,
        status: { $in: ['pending', 'under_review'] }
      });

      if (dispute) {
        this.logger.info(
          `Skipping shipment ${shipment._id} - pending dispute`
        );
        continue;
      }

      // Calculate deductions
      const deductions = await this.calculateDeductions(shipment);

      eligibleShipments.push({
        shipmentId: shipment._id,
        awb: shipment.awb,
        codAmount: shipment.codAmount,
        deliveredAt: shipment.delivery.deliveredAt,
        deductions,
        netAmount: shipment.codAmount - deductions.total
      });
    }

    return eligibleShipments;
  }

  /**
   * Calculate all deductions for a shipment
   */
  async calculateDeductions(shipment: Shipment): Promise<DeductionsBreakdown> {
    const deductions: DeductionsBreakdown = {
      shippingCharge: shipment.shippingCost,
      weightDispute: 0,
      rtoCharge: 0,
      insuranceCharge: 0,
      otherFees: 0,
      total: shipment.shippingCost
    };

    // Check for weight disputes
    const resolvedDispute = await this.weightDisputeRepo.findOne({
      shipmentId: shipment._id,
      status: 'resolved'
    });

    if (resolvedDispute?.resolution?.outcome === 'shipcrowd_favor') {
      deductions.weightDispute = resolvedDispute.resolution.deductionAmount || 0;
    }

    // Check for RTO charges
    const rtoEvent = await this.rtoEventRepo.findOne({
      shipmentId: shipment._id
    });

    if (rtoEvent?.status === 'completed') {
      deductions.rtoCharge = rtoEvent.charges || 0;
    }

    // Insurance claims (if applicable)
    if (shipment.insurance?.claimed) {
      deductions.insuranceCharge = shipment.insurance.claimedAmount || 0;
    }

    // Platform fee (0.5% of COD amount)
    deductions.otherFees = Math.ceil((shipment.codAmount * 0.5) / 100);

    deductions.total = Object.values(deductions)
      .filter((_, i) => i < deductions.total)
      .reduce((sum, val) => sum + val, 0);

    return deductions;
  }

  /**
   * Generate complete remittance summary
   */
  async generateRemittanceSummary(
    companyId: ObjectId,
    eligibleShipments: EligibleShipment[]
  ): Promise<RemittanceSummary> {
    const totalCODCollected = eligibleShipments.reduce(
      (sum, s) => sum + s.codAmount,
      0
    );

    const totalDeductions = eligibleShipments.reduce(
      (sum, s) => sum + s.deductions.total,
      0
    );

    const netPayable = totalCODCollected - totalDeductions;

    return {
      totalShipments: eligibleShipments.length,
      totalCODCollected,
      deductions: {
        shippingCharges: eligibleShipments.reduce(
          (sum, s) => sum + s.deductions.shippingCharge,
          0
        ),
        weightDiscrepancies: eligibleShipments.reduce(
          (sum, s) => sum + s.deductions.weightDispute,
          0
        ),
        rtoCharges: eligibleShipments.reduce(
          (sum, s) => sum + s.deductions.rtoCharge,
          0
        ),
        platformFee: eligibleShipments.reduce(
          (sum, s) => sum + s.deductions.otherFees,
          0
        ),
        total: totalDeductions
      },
      netPayable,
      shipments: eligibleShipments
    };
  }

  /**
   * Calculate when next remittance is due
   */
  async getNextRemittanceDate(
    companyId: ObjectId,
    lastRemittanceDate: Date
  ): Promise<Date> {
    const company = await this.companyRepo.findById(companyId);
    const config = company.codRemittanceConfig;

    const nextDate = new Date(lastRemittanceDate);

    switch (config.schedule) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        if (config.dayOfWeek) {
          while (nextDate.getDay() !== config.dayOfWeek) {
            nextDate.setDate(nextDate.getDate() + 1);
          }
        }
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        if (config.dayOfMonth) {
          nextDate.setDate(config.dayOfMonth);
        }
        break;
    }

    return nextDate;
  }
}
```

### Task 11.2.3: COD Remittance Scheduling Service

**File:** `server/src/core/application/services/remittance/cod-remittance-scheduling.service.ts` (NEW)

```typescript
export class CODRemittanceSchedulingService {
  constructor(
    private codRemittanceRepo: CODRemittanceRepository,
    private codCalculationService: CODRemittanceCalculationService,
    private companyRepo: CompanyRepository,
    private notificationService: NotificationService,
    private auditLogService: AuditLogService,
    private logger: LoggerService
  ) {}

  /**
   * Create scheduled remittance batches for all companies
   * Runs daily
   */
  async scheduleAllRemittances(): Promise<CODRemittance[]> {
    const companies = await this.companyRepo.find({
      'codRemittanceConfig.autoRemittance': true
    });

    const created: CODRemittance[] = [];

    for (const company of companies) {
      try {
        const today = new Date();
        const nextRemittanceDate = await this.codCalculationService
          .getNextRemittanceDate(company._id, company.codRemittanceConfig.lastRemittanceDate || today);

        // Check if today is remittance day
        if (this.isRemittanceDay(today, nextRemittanceDate, company.codRemittanceConfig)) {
          const remittance = await this.createRemittanceBatch(company);
          created.push(remittance);

          this.logger.info(`Scheduled remittance for company ${company._id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to schedule remittance for company ${company._id}`, error);
      }
    }

    return created;
  }

  /**
   * Create a new remittance batch
   */
  async createRemittanceBatch(company: Company): Promise<CODRemittance> {
    const eligibleShipments = await this.codCalculationService
      .calculateEligibleShipments(company._id, company.codRemittanceConfig.holdPeriod);

    if (eligibleShipments.length === 0) {
      this.logger.info(`No eligible shipments for company ${company._id}`);
      return null;
    }

    const summary = await this.codCalculationService
      .generateRemittanceSummary(company._id, eligibleShipments);

    // Check minimum threshold
    if (summary.netPayable < company.codRemittanceConfig.minThreshold) {
      this.logger.info(
        `Skipping remittance for company ${company._id} - below minimum threshold`
      );
      return null;
    }

    const remittance = new CODRemittance({
      remittanceId: this.generateRemittanceId(),
      companyId: company._id,

      batch: {
        batchNumber: await this.getNextBatchNumber(company._id),
        createdDate: new Date(),
        cutoffDate: new Date(),
        shippingPeriod: {
          start: this.getPeriodStart(company.codRemittanceConfig),
          end: new Date()
        }
      },

      shipments: eligibleShipments,

      financial: {
        totalCODCollected: summary.totalCODCollected,
        totalShipments: summary.totalShipments,
        successfulDeliveries: summary.totalShipments,
        deductions: summary.deductions,
        netPayable: summary.netPayable
      },

      schedule: {
        type: 'scheduled',
        scheduledDate: new Date()
      },

      payout: {
        status: 'pending_approval'
      },

      sellerConfig: company.codRemittanceConfig,
      status: 'pending_approval',

      timeline: [{
        status: 'pending_approval',
        timestamp: new Date(),
        actor: 'system',
        action: 'Scheduled remittance created'
      }]
    });

    await this.codRemittanceRepo.create(remittance);

    // Auto-approve if configured
    if (company.codRemittanceConfig.autoApprove) {
      await this.approveRemittance(remittance._id, 'system', 'Auto-approved');
    }

    // Notify seller
    await this.notificationService.sendRemittanceScheduled(company._id, remittance);

    return remittance;
  }

  /**
   * Handle on-demand remittance request
   */
  async requestOnDemandRemittance(
    companyId: ObjectId,
    requestedBy: ObjectId
  ): Promise<ValidationResult> {
    const company = await this.companyRepo.findById(companyId);

    // Validation rules
    const validations = {
      minimumBalance: company.wallet.balance >= 1000,
      lastRemittanceNotTooRecent: !company.codRemittanceConfig.lastRemittanceDate ||
        new Date().getTime() - company.codRemittanceConfig.lastRemittanceDate.getTime() > 24 * 60 * 60 * 1000,
      noActiveDisputes: true  // Check for active disputes
    };

    if (!Object.values(validations).every(v => v)) {
      return {
        allowed: false,
        reason: 'One or more validation checks failed',
        checks: validations
      };
    }

    // Create on-demand remittance
    const eligible = await this.codCalculationService
      .calculateEligibleShipments(companyId);

    if (eligible.length === 0) {
      return {
        allowed: false,
        reason: 'No eligible shipments for remittance'
      };
    }

    const summary = await this.codCalculationService
      .generateRemittanceSummary(companyId, eligible);

    const remittance = new CODRemittance({
      remittanceId: this.generateRemittanceId(),
      companyId,
      shipments: eligible,
      financial: {
        ...summary,
        totalShipments: eligible.length
      },
      schedule: {
        type: 'on_demand',
        requestedAt: new Date(),
        requestedBy,
        scheduledDate: new Date()
      },
      payout: {
        status: 'pending_approval'
      },
      status: 'pending_approval',
      timeline: [{
        status: 'pending_approval',
        timestamp: new Date(),
        actor: requestedBy,
        action: 'On-demand remittance requested'
      }]
    });

    await this.codRemittanceRepo.create(remittance);

    await this.notificationService.sendRemittanceRequested(companyId, remittance);

    return {
      allowed: true,
      remittanceId: remittance.remittanceId
    };
  }

  private isRemittanceDay(
    today: Date,
    nextRemittanceDate: Date,
    config: any
  ): boolean {
    return today.toDateString() === nextRemittanceDate.toDateString();
  }

  private generateRemittanceId(): string {
    const date = new Date();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `REM-${date.toISOString().split('T')[0].replace(/-/g, '')}-${random}`;
  }

  private async getNextBatchNumber(companyId: ObjectId): Promise<number> {
    const lastBatch = await this.codRemittanceRepo.findOne(
      { companyId },
      { 'batch.batchNumber': -1 }
    );
    return (lastBatch?.batch.batchNumber || 0) + 1;
  }

  private getPeriodStart(config: any): Date {
    const today = new Date();
    const start = new Date();

    switch (config.schedule) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'biweekly':
        start.setDate(start.getDate() - 14);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
    }

    return start;
  }

  private async approveRemittance(
    remittanceId: ObjectId,
    approvedBy: string,
    notes: string
  ): Promise<void> {
    const remittance = await this.codRemittanceRepo.findById(remittanceId);
    remittance.status = 'approved';
    remittance.payout.status = 'approved';
    remittance.approvals.push({
      role: approvedBy === 'system' ? 'auto' : 'admin',
      status: 'approved',
      approvedAt: new Date(),
      notes
    });

    await this.codRemittanceRepo.update(remittanceId, remittance);
  }
}
```

### Task 11.2.4: COD Remittance Processing Service

**File:** `server/src/core/application/services/remittance/cod-remittance-processing.service.ts` (NEW)

```typescript
export class CODRemittanceProcessingService {
  constructor(
    private codRemittanceRepo: CODRemittanceRepository,
    private razorpayPayoutService: RazorpayPayoutService,
    private walletService: WalletService,
    private companyRepo: CompanyRepository,
    private notificationService: NotificationService,
    private auditLogService: AuditLogService,
    private logger: LoggerService
  ) {}

  /**
   * Process approved remittance: Initiate Razorpay payout
   */
  async processRemittancePayout(remittanceId: string): Promise<Payout> {
    const remittance = await this.codRemittanceRepo.findById(remittanceId);

    if (remittance.payout.status !== 'approved') {
      throw new ConflictError('Remittance is not approved for processing');
    }

    const company = await this.companyRepo.findById(remittance.companyId);

    try {
      // Create Razorpay payout
      const payout = await this.razorpayPayoutService.createPayout({
        accountNumber: company.bankAccount.accountNumber,
        ifsc: company.bankAccount.ifsc,
        amount: remittance.financial.netPayable * 100,  // Convert to paise
        narration: `ShipCrowd COD Remittance ${remittance.remittanceId}`,
        reference: remittance.remittanceId,
        contactName: company.businessName
      });

      remittance.payout.status = 'processing';
      remittance.payout.razorpayPayoutId = payout.id;
      remittance.payout.razorpayResponse = payout;
      remittance.payout.processedAt = new Date();

      remittance.timeline.push({
        status: 'processing',
        timestamp: new Date(),
        actor: 'system',
        action: `Razorpay payout initiated: ${payout.id}`
      });

      await this.codRemittanceRepo.update(remittanceId, remittance);

      // Notify seller
      await this.notificationService.sendRemittanceProcessing(
        company._id,
        remittance,
        payout.id
      );

      this.logger.info(
        `Payout created for remittance ${remittanceId}: ${payout.id}`
      );

      return payout;
    } catch (error) {
      remittance.payout.status = 'failed';
      remittance.payout.failureReason = error.message;
      remittance.payout.failureCode = error.code;

      remittance.timeline.push({
        status: 'failed',
        timestamp: new Date(),
        actor: 'system',
        action: `Payout failed: ${error.message}`
      });

      await this.codRemittanceRepo.update(remittanceId, remittance);

      // Notify admin for manual intervention
      await this.notificationService.sendPayoutFailureAlert(remittance);

      this.logger.error(
        `Payout creation failed for remittance ${remittanceId}`,
        error
      );

      throw error;
    }
  }

  /**
   * Finalize remittance after successful payout
   */
  async finalizeRemittance(
    remittanceId: string,
    payoutId: string
  ): Promise<void> {
    const remittance = await this.codRemittanceRepo.findById(remittanceId);

    // Verify payout status with Razorpay
    const payout = await this.razorpayPayoutService.getPayoutStatus(payoutId);

    if (payout.status !== 'completed' && payout.status !== 'processed') {
      throw new ConflictError(`Payout status is ${payout.status}`);
    }

    // Update remittance status
    remittance.status = 'completed';
    remittance.payout.status = 'completed';
    remittance.payout.completedAt = new Date();

    // Mark shipments as remitted
    for (const shipment of remittance.shipments) {
      await this.shipmentRepo.update(shipment.shipmentId as any, {
        'remittance.status': 'remitted',
        'remittance.remittedAt': new Date(),
        'remittance.remittanceId': remittanceId
      });
    }

    // Update company metrics
    await this.companyRepo.update(remittance.companyId, {
      'codMetrics.totalRemitted': { $inc: remittance.financial.netPayable },
      'codMetrics.lastRemittanceDate': new Date(),
      'codRemittanceConfig.lastRemittanceDate': new Date()
    });

    remittance.timeline.push({
      status: 'completed',
      timestamp: new Date(),
      actor: 'system',
      action: 'Remittance completed and paid'
    });

    await this.codRemittanceRepo.update(remittanceId, remittance);

    // Send completion notification
    await this.notificationService.sendRemittanceCompleted(
      remittance.companyId,
      remittance
    );

    // Log for audit
    await this.auditLogService.log({
      action: 'COD_REMITTANCE_COMPLETED',
      resource: { remittanceId, payoutId },
      details: {
        amount: remittance.financial.netPayable,
        shipmentCount: remittance.shipments.length
      }
    });

    this.logger.info(`Remittance ${remittanceId} finalized successfully`);
  }

  /**
   * Handle failed payouts and retry logic
   */
  async handlePayoutFailure(
    remittanceId: string,
    failureReason: string,
    retryable: boolean = true
  ): Promise<void> {
    const remittance = await this.codRemittanceRepo.findById(remittanceId);

    remittance.payout.failureReason = failureReason;
    remittance.payout.status = 'failed';
    remittance.status = 'failed';

    remittance.timeline.push({
      status: 'failed',
      timestamp: new Date(),
      actor: 'system',
      action: `Payout failed: ${failureReason}`
    });

    await this.codRemittanceRepo.update(remittanceId, remittance);

    if (retryable) {
      // Schedule retry for 24 hours later
      this.logger.info(`Scheduling retry for remittance ${remittanceId}`);
      // Use job scheduler to retry
    }

    // Notify admin
    await this.notificationService.sendPayoutFailureAlert(remittance);
  }

  /**
   * Generate remittance report (PDF)
   */
  async generateRemittanceReport(remittanceId: string): Promise<Buffer> {
    const remittance = await this.codRemittanceRepo.findById(remittanceId);

    // Generate PDF with:
    // - Remittance summary
    // - Shipment details
    // - Deductions breakdown
    // - Payment details
    // - Timeline

    const pdfContent = this.buildRemittancePDF(remittance);
    return pdfContent;
  }

  private buildRemittancePDF(remittance: CODRemittance): Buffer {
    // Implementation using pdf-lib or similar
    // Returns PDF buffer
    return Buffer.from('');
  }
}
```

### Task 11.2.5: Background Jobs

**File:** `server/src/infrastructure/jobs/cod-remittance-scheduler.job.ts` (NEW)

```typescript
@Injectable()
export class CODRemittanceSchedulerJob {
  constructor(
    private codRemittanceSchedulingService: CODRemittanceSchedulingService,
    private logger: LoggerService
  ) {}

  @Cron('0 0 * * *', { timezone: 'Asia/Kolkata' })  // Daily at midnight
  async execute() {
    this.logger.info('Starting COD remittance scheduler job');

    try {
      const created = await this.codRemittanceSchedulingService
        .scheduleAllRemittances();

      this.logger.info(`Scheduled ${created.length} remittances`);
    } catch (error) {
      this.logger.error('COD remittance scheduler job failed', error);
    }
  }
}
```

**File:** `server/src/infrastructure/jobs/cod-remittance-processor.job.ts` (NEW)

```typescript
@Injectable()
export class CODRemittanceProcessorJob {
  constructor(
    private codRemittanceProcessingService: CODRemittanceProcessingService,
    private codRemittanceRepo: CODRemittanceRepository,
    private logger: LoggerService
  ) {}

  @Cron('*/30 * * * *', { timezone: 'Asia/Kolkata' })  // Every 30 minutes
  async execute() {
    this.logger.info('Starting COD remittance processor job');

    try {
      const approvedRemittances = await this.codRemittanceRepo.find({
        'payout.status': 'approved'
      });

      for (const remittance of approvedRemittances) {
        try {
          await this.codRemittanceProcessingService.processRemittancePayout(
            remittance._id.toString()
          );
        } catch (error) {
          this.logger.error(
            `Failed to process remittance ${remittance._id}`,
            error
          );
        }
      }

      this.logger.info(`Processed ${approvedRemittances.length} remittances`);
    } catch (error) {
      this.logger.error('COD remittance processor job failed', error);
    }
  }
}
```

### Task 11.2.6: COD Remittance API Endpoints

**File:** `server/src/presentation/http/controllers/remittance/cod-remittance.controller.ts` (NEW)

```typescript
export class CODRemittanceController {
  constructor(
    private codRemittanceSchedulingService: CODRemittanceSchedulingService,
    private codRemittanceProcessingService: CODRemittanceProcessingService
  ) {}

  async listRemittances(req: Request, res: Response) {
    // GET /api/v1/remittance/cod
  }

  async getRemittanceDetails(req: Request, res: Response) {
    // GET /api/v1/remittance/cod/:id
  }

  async calculateNextRemittance(req: Request, res: Response) {
    // POST /api/v1/remittance/cod/calculate
  }

  async requestOnDemandRemittance(req: Request, res: Response) {
    // POST /api/v1/remittance/cod/request-on-demand
  }

  async approveRemittance(req: Request, res: Response) {
    // POST /api/v1/remittance/cod/:id/approve (ADMIN)
  }

  async processRemittance(req: Request, res: Response) {
    // POST /api/v1/remittance/cod/:id/process (ADMIN)
  }

  async downloadReport(req: Request, res: Response) {
    // GET /api/v1/remittance/cod/:id/report
  }

  async updateConfig(req: Request, res: Response) {
    // PUT /api/v1/remittance/cod/config
  }

  async getAnalytics(req: Request, res: Response) {
    // GET /api/v1/remittance/cod/analytics
  }
}
```

**File:** `server/src/presentation/http/routes/v1/remittance/cod-remittance.routes.ts` (NEW)

```typescript
export const codRemittanceRoutes = Router();

codRemittanceRoutes.get('/remittance/cod', authenticate, listRemittances);
codRemittanceRoutes.get('/remittance/cod/:id', authenticate, getRemittanceDetails);
codRemittanceRoutes.post('/remittance/cod/calculate', authenticate, calculateNextRemittance);
codRemittanceRoutes.post('/remittance/cod/request-on-demand', authenticate, requestOnDemandRemittance);
codRemittanceRoutes.post('/remittance/cod/:id/approve', authenticate, authorize('ADMIN'), approveRemittance);
codRemittanceRoutes.post('/remittance/cod/:id/process', authenticate, authorize('ADMIN'), processRemittance);
codRemittanceRoutes.get('/remittance/cod/:id/report', authenticate, downloadReport);
codRemittanceRoutes.put('/remittance/cod/config', authenticate, updateConfig);
codRemittanceRoutes.get('/remittance/cod/analytics', authenticate, getAnalytics);
```

### Task 11.2.7: Notifications

**File:** `server/src/infrastructure/communication/notifications/cod-remittance.notifications.ts` (NEW)

Multi-channel notifications:
- **Remittance Scheduled:** Email with details, shipment count
- **Remittance Processing:** SMS: "Your COD remittance of ₹{amount} is being processed"
- **Remittance Completed:** Email with PDF report, breakdown of deductions
- **Payout Failure Alert:** SMS + Email to admin with failure reason

### Task 11.2.8: Testing

**File:** `server/tests/integration/remittance/cod-remittance.test.ts` (NEW)

Test scenarios:
1. Scheduled remittance creation
2. On-demand remittance validation
3. Eligible shipment calculation with deductions
4. Auto-approval when configured
5. Razorpay payout initiation
6. Payout failure handling
7. Remittance completion with shipment updates
8. Concurrent remittance processing

**Success Criteria:**
- ✅ 95% of scheduled remittances created on time
- ✅ On-demand remittance processed within 4 hours
- ✅ Zero discrepancies in calculations
- ✅ Razorpay payout success rate > 98%

---

## Phase 11.3: Testing & Documentation

### Unit Tests
- `server/tests/unit/services/disputes/weight-dispute-detection.service.test.ts`
- `server/tests/unit/services/disputes/weight-dispute-resolution.service.test.ts`
- `server/tests/unit/services/remittance/cod-remittance-calculation.service.test.ts`
- `server/tests/unit/services/remittance/cod-remittance-scheduling.service.test.ts`
- `server/tests/unit/services/remittance/cod-remittance-processing.service.test.ts`

### Integration Tests
- `server/tests/integration/routes/disputes/weight-disputes.routes.test.ts`
- `server/tests/integration/routes/remittance/cod-remittance.routes.test.ts`
- `server/tests/integration/jobs/weight-dispute-auto-resolve.job.test.ts`
- `server/tests/integration/jobs/cod-remittance-scheduler.job.test.ts`

### Documentation
- `docs/features/WeightDisputeManagement.md`
- `docs/features/CODRemittanceAutomation.md`
- `docs/api/disputes/weight-disputes.api.md`
- `docs/api/remittance/cod-remittance.api.md`

### Test Coverage Goals
- Weight Dispute Services: 90%+
- COD Remittance Services: 95%+
- API Endpoints: 85%+

---

## Week 11 Summary

### Deliverables
✅ Weight Discrepancy Detection & Management System
✅ COD Remittance Scheduling & Processing
✅ Financial Settlement & Wallet Integration
✅ API Endpoints (16 endpoints)
✅ Background Jobs (4 jobs)
✅ Notifications (Multi-channel)
✅ Integration Tests

### Files Created/Updated
- 8 new service files (~3,500 lines)
- 2 new model files
- 2 controller/routes files
- 4 job files
- 5 test files
- 2 documentation files

### Business Impact
- 🔒 **Revenue Protection:** Prevents ₹15,000-40,000/month in weight dispute losses
- 💰 **Cash Flow:** Automated remittance improves seller cash flow
- ⏱️ **Efficiency:** Eliminates manual remittance processing
- 📊 **Transparency:** Sellers see detailed remittance breakdowns

**Estimated Effort:** 80 hours
**Estimated Impact:** +15% seller retention, -30% support tickets

---

# WEEK 12: FRAUD DETECTION, DISPUTES & REVERSE LOGISTICS

[Due to space constraints, I'll provide the structure but you can expand similar to Week 11]

## Phase 12.1: Advanced Fraud Detection System (P0)

### Implementation Areas
1. **Machine Learning Risk Scoring**
   - OpenAI integration for order analysis
   - Multi-signal fraud detection
   - Real-time risk classification

2. **Fraud Detection Service**
   - `fraud-detection.service.ts`
   - `fraud-detection.controller.ts`
   - Webhook integration
   - Auto-flagging for high-risk orders

3. **Fraud Review Workflow**
   - Manual review queue
   - Admin dashboard
   - Decision tracking
   - False positive feedback

4. **Blacklist Management**
   - Phone/email/address/IP blacklists
   - Expired entries cleanup
   - Velocity monitoring

5. **Database Models**
   - `FraudDetection.ts` (risk scores, signals, actions)
   - `FraudAlert.ts` (alert tracking)
   - `Blacklist.ts` (blacklist entries)
   - Indexes for fast lookup

6. **API Endpoints** (12 endpoints)
   - `/api/v1/fraud/alerts` - List/filter fraud alerts
   - `/api/v1/fraud/alerts/:id/review` - Review decision
   - `/api/v1/fraud/blacklist` - Blacklist management
   - `/api/v1/fraud/analytics` - Fraud statistics
   - `/api/v1/fraud/config` - Risk configuration

7. **Background Jobs**
   - Fraud pattern scanning
   - Blacklist cleanup
   - Risk model updates

**Success Metrics:**
- Detect 80%+ of actual fraud
- False positive rate < 5%
- High-risk orders auto-blocked (>90 score)

---

## Phase 12.2: Dispute Resolution System (P0)

### Implementation Areas
1. **Dispute Management Service**
   - Create disputes (customer/seller)
   - Status tracking
   - SLA monitoring
   - Escalation workflow

2. **Dispute Types**
   - Damaged product
   - Missing items
   - Wrong product
   - Delivery delay
   - Non-delivery

3. **Resolution Logic**
   - Evidence collection
   - Courier investigation
   - Refund processing
   - Compensation

4. **SLA Management**
   - Urgent: 24h
   - High: 48h
   - Medium: 72h
   - Low: 7 days
   - Auto-escalation

5. **Database Models**
   - `Dispute.ts` (complete dispute lifecycle)
   - Evidence storage
   - Timeline tracking
   - Resolution details

6. **API Endpoints** (10 endpoints)
   - POST `/api/v1/disputes` - Create dispute
   - GET `/api/v1/disputes` - List disputes
   - PUT `/api/v1/disputes/:id/resolve` - Resolve
   - POST `/api/v1/disputes/:id/escalate` - Escalate
   - GET `/api/v1/disputes/analytics` - Stats

7. **Notifications**
   - Dispute filed alert
   - SLA approaching alert
   - Resolution notification

**Success Metrics:**
- 95% disputes resolved within SLA
- Average resolution time < 48 hours
- Customer satisfaction > 80%

---

## Phase 12.3: Reverse Logistics & Returns (P1)

### Implementation Areas
1. **Return Order Management**
   - Return initiation
   - Pickup scheduling
   - Transit tracking
   - QC inspection
   - Refund processing

2. **Return Lifecycle**
   - Initiate return
   - Pick up from customer
   - In-transit
   - Receive at warehouse
   - QC inspection
   - Refund/Restock
   - Complete

3. **Database Models**
   - `ReturnOrder.ts` (return lifecycle)
   - `ReturnQC.ts` (quality check results)
   - Items + reasons

4. **Services**
   - Return order creation
   - Pickup scheduling
   - QC processing
   - Refund settlement
   - Inventory restock

5. **API Endpoints** (10 endpoints)
   - POST `/api/v1/returns` - Initiate return
   - POST `/api/v1/returns/:id/schedule-pickup` - Schedule
   - POST `/api/v1/returns/:id/qc/start` - Start inspection
   - POST `/api/v1/returns/:id/qc/complete` - Complete inspection
   - POST `/api/v1/returns/:id/refund` - Process refund

6. **Notifications**
   - Return initiated
   - Pickup scheduled
   - Received at warehouse
   - QC result
   - Refund processed

**Success Metrics:**
- Return process < 15 days
- QC completed within 48 hours
- Refund processed within 72 hours

---

# WEEK 13: PRODUCTION INFRASTRUCTURE & DEPLOYMENT READINESS

## Phase 13.1: Docker & Containerization

### Structure
```
/docker
  /Dockerfile (Node.js, multi-stage)
  /docker-compose.dev.yml (dev environment)
  /docker-compose.prod.yml (production)
  /nginx.conf (reverse proxy)
  /.dockerignore
```

### Services
- **API Server** (Node.js/Express)
- **MongoDB** (Database)
- **Redis** (Caching/Sessions)
- **Nginx** (Reverse Proxy)
- **Scheduler** (Separate cron worker)

### Configuration
- Environment-specific config
- Health checks
- Volume mounts for persistence
- Network isolation

---

## Phase 13.2: CI/CD Pipeline (GitHub Actions)

### Workflows
1. **Pull Request Checks**
   - Lint & format check
   - Unit tests
   - Build validation
   - Security scan

2. **Staging Deployment**
   - Deploy to staging on PR merge
   - Run integration tests
   - Database migrations
   - Health checks

3. **Production Deployment**
   - Manual approval
   - Deploy to production
   - Zero-downtime deployment
   - Rollback capability
   - Health monitoring

### Implementation Files
- `.github/workflows/pr-checks.yml`
- `.github/workflows/staging-deploy.yml`
- `.github/workflows/prod-deploy.yml`
- `.github/workflows/tests.yml`

---

## Phase 13.3: Monitoring & Observability

### Stack
- **Prometheus** (Metrics collection)
- **Grafana** (Visualization)
- **Sentry** (Error tracking)
- **ELK Stack** (Log aggregation)

### Metrics
- API response times
- Error rates
- Database query performance
- Memory/CPU usage
- Active connections
- Job execution times

### Dashboards
- System health
- Application performance
- Business metrics (orders, revenue)
- User activity
- Error trends

---

## Phase 13.4: Database Optimization

### Query Optimization
- Index analysis
- Slow query logs
- Query execution plans
- Aggregation pipeline optimization

### Caching Strategy
- **Redis Caching**
  - Rate cards (TTL: 1 hour)
  - Zones & serviceability (TTL: 24 hours)
  - API responses (TTL: 5-30 minutes)
  - Session storage

### Connection Management
- Connection pooling
- Timeout configuration
- Retry logic
- Circuit breakers

---

# WEEK 14: PERFORMANCE & RESILIENCE

## Phase 14.1: API Optimization

### Rate Limiting Enhancement
- Per-endpoint limits
- User-based limits
- IP-based limits
- Token bucket algorithm

### Caching Strategy
- HTTP caching headers
- Redis caching
- CDN for static assets

### Compression
- Gzip for responses
- Image optimization
- Minification

---

## Phase 14.2: Error Recovery

### Resilience Patterns
- Circuit breakers
- Retry logic with exponential backoff
- Fallback mechanisms
- Graceful degradation

### Specific Implementations
1. **API Failures**
   - Retry with backoff
   - Fallback to cache
   - Return partial data

2. **Database Failures**
   - Connection retry
   - Read replicas
   - Eventual consistency

3. **External Service Failures**
   - Webhook retry
   - Queue-based processing
   - Async operations

---

# WEEK 15-16: ADVANCED FEATURES

## Week 15: Customer Experience Enhancements

### Branded Tracking Page (White-Label)
- Custom domain
- Logo/colors
- Real-time tracking
- Delivery estimates

### Pickup Scheduling & Failed Pickups
- Pickup time slots
- Automatic rescheduling
- Pickup failure alerts
- Partial pickup handling

### Address Validation
- Google Maps integration
- Pincode validation
- Address suggestions
- Delivery success prediction

---

## Week 16: Advanced Logistics Features

### Multi-Piece Shipments
- Parent-child relationships
- Individual tracking
- Partial delivery handling

### B2B Freight
- Bulk shipments
- E-way bill generation
- Freight rate calculation
- Warehouse-to-warehouse

### Hyperlocal/Same-Day Delivery
- Partner integration (Dunzo, Swiggy)
- Real-time tracking
- Premium pricing

---

# WEEK 17+: LONG-TERM ENHANCEMENTS

## Advanced Features (Nice-to-Have)
- International shipping with customs
- Dynamic routing & smart courier selection
- Seller financing & credit management
- Environmental sustainability tracking
- GDPR compliance tools
- Promo codes & incentives
- Inventory synchronization
- Integrated analytics & BI
- Corporate accounts with SSO
- Remittance flexibility (on-demand, scheduled)
- Quality assurance monitoring
- Dangerous goods compliance

---

## PART 3: DETAILED IMPLEMENTATION CHECKLIST

### Critical Path (Revenue & Protection)
- [ ] Week 11: Weight disputes + COD remittance
- [ ] Week 12: Fraud detection + Disputes + Returns
- [ ] Week 13: Docker + CI/CD + Monitoring
- [ ] Week 14: Performance optimization
- [ ] Week 15: Tracking & address validation

### Non-Critical Path (Nice-to-Have)
- [ ] Week 16+: B2B, international, advanced features

---

## PART 4: RISK MITIGATION & CONTINGENCY

### Identified Risks
1. **Webhook failures** → Implement retry logic + dead-letter queues
2. **Payment failures** → Manual intervention queue + alerts
3. **Data consistency** → Audit logs + reconciliation jobs
4. **Scalability bottlenecks** → Redis caching + query optimization
5. **Security vulnerabilities** → Security audit + OWASP hardening

### Mitigation Strategies
- Regular database backups
- Read replicas for failover
- Distributed tracing
- Incident response playbooks
- Load testing

---

## CONCLUSION

This enhanced master plan provides a complete, production-ready roadmap for building a world-class shipping aggregator platform. The phased approach ensures critical revenue-protection features are implemented first, followed by production infrastructure, performance optimization, and finally advanced differentiating features.

**Total Estimated Effort:** 400-480 hours (10-12 weeks of development)
**Expected Impact:**
- ✅ Production-ready platform
- ✅ 60%+ fraud reduction
- ✅ 40% support ticket reduction
- ✅ 50% seller churn reduction
- ✅ 25%+ revenue increase through advanced features

---

**Version History:**
- v1.0 (Original): Week 11-16 basic roadmap
- v2.0 (Enhanced): Complete 38 scenarios, detailed implementation, test plans

**Next Steps:**
1. Review and approve plan
2. Break into sprints
3. Assign team members
4. Begin Week 11 implementation
