# Velocity Shipfast Integration - Production Ready + Future Proof Foundation

## Vision & Scope

**Immediate Goal:** Fix Velocity Shipfast integration (16 issues) for production deployment
**Foundation Goal:** Create flexible, extensible architecture that supports:
- ✅ Seamless multi-courier integration (Delhivery, Ekart, India Post, etc.)
- ✅ Advanced rate card management (static + dynamic with seller overrides)
- ✅ Robust red card (RMA) lifecycle with edge case handling
- ✅ Intelligent courier mapping abstraction

**Timeline:** 3 weeks total (1.5 weeks Velocity + 1.5 weeks Foundation)

---

## Part 1: Velocity Shipfast - Fix 16 Critical Issues (Week 1)

### Phase 1: Critical API Endpoint Corrections

**Files:** `velocity-shipfast.provider.ts` (2 changes)

1. **Forward Order Endpoint Fix**
   - Line 209: `/forward-order` → `/forward-order-orchestration`
   - Why: Official API requires `-orchestration` suffix

2. **Reverse Order Endpoint Fix**
   - Line 614: `/reverse-order` → `/reverse-order-orchestration`
   - Why: API spec requirement

**Validation:** Unit test endpoint strings against documented URLs

---

### Phase 2: Request Field Corrections

**Files:** `velocity-shipfast.provider.ts`, `velocity.types.ts`, `velocity.mapper.ts`

**Serviceability API (Lines 305-310 + types):**
```
pickup_pincode → from
delivery_pincode → to
cod: 0|1 → payment_mode: "cod"|"prepaid"
ADD: shipment_type: "forward"|"return"
```

**Cancel API (Lines 395-397 + types):**
```
awb: string → awbs: string[]
(Enables bulk cancellation - future-proof)
```

**Warehouse API (mapper + types):**
```
Flat structure → Nested address_attributes
phone → phone_number
pin_code → zip
ADD: contact_person field
REMOVE: return_* fields (not in API)
```

**Validation:** Integration tests verify request payloads match API docs exactly

---

### Phase 3: Response Structure Handling

**Files:** `velocity-shipfast.provider.ts`, `velocity.types.ts`

**Add Response Unwrapping:**
```typescript
private unwrapResponse<T>(response: any, type: 'orchestration'|'query'): T
// Handles both wrapper styles:
// - Orchestration: {status: 1, payload: {...}}
// - Query: {status: "SUCCESS", result: {...}}
```

**Add Detailed Payload Types:**
- VelocityShipmentPayload (include charges, applied_weight, status flags)
- VelocityServiceabilityResult (include zone)
- VelocityTrackingResult (include activities, URL)
- VelocityWarehousePayload

**Why:** Captures ALL response data for financial tracking (charges), weight verification, settlement

**Validation:** Integration test verifies all fields extracted correctly

---

### Phase 4: Webhook Reliability (Quick Wins)

**Files:** `velocity-webhook.service.ts`, `velocity.webhook.controller.ts`

1. Integrate WebhookRetryService (3 retries with exponential backoff)
2. Fix Promise.allSettled result handling (not just .catch())
3. Add transaction wrapping for atomic shipment updates
4. Unify RTO status mapping with forward shipment

**Validation:** Webhook test with 100 concurrent payloads

---

## Part 2: Foundation Architecture - Future Proof (Week 2-3)

### Critical: Courier Abstraction Layer

This is THE foundation for multi-courier. Everything else depends on this.

**New File Structure:**
```
server/src/
├── infrastructure/
│   └── external/couriers/
│       ├── base/
│       │   ├── courier.adapter.ts (updated interface)
│       │   ├── courier.types.ts (shared types)
│       │   └── courier-registry.ts (NEW - dynamic registration)
│       ├── velocity/
│       │   ├── velocity-shipfast.provider.ts
│       │   ├── velocity.types.ts
│       │   ├── velocity.mapper.ts
│       │   ├── velocity.auth.ts
│       │   └── index.ts
│       └── mappers/ (NEW)
│           ├── rate-card.mapper.ts (unified rate calculation)
│           └── webhook.mapper.ts (unified webhook parsing)
├── core/
│   └── application/
│       └── services/
│           ├── courier/ (NEW)
│           │   ├── courier-capability.service.ts
│           │   ├── rate-aggregator.service.ts
│           │   └── courier-selector.service.ts
│           ├── rate-cards/ (NEW - CORE COMPLEXITY)
│           │   ├── rate-card.service.ts
│           │   ├── rate-card-calculator.service.ts
│           │   └── rate-card-validator.service.ts
│           └── returns/ (NEW - CORE COMPLEXITY)
│               ├── return-management.service.ts
│               └── red-card.service.ts
```

---

## Part 3: Rate Card Management System (CORE COMPLEXITY)

### 3.1 Rate Card Model Architecture

**Database Model:**
```typescript
interface RateCard {
  _id: ObjectId;
  companyId: ObjectId;
  courierId: string; // 'velocity', 'delhivery', 'ekart', etc.
  name: string; // "Summer Promo Rates", "Standard Rates"

  // Base rates (from courier API or seller upload)
  baseRates: Array<{
    origin_pincode: string;
    destination_pincode: string;
    zone: string; // A, B, C, D, E (based on courier)
    baseWeight: number; // kg (breakpoint)
    baseCost: number; // ₹ (from courier)
    codCharge: number; // % or ₹
  }>;

  // Seller markup/negotiation
  markup: {
    type: 'percentage' | 'fixed' | 'slab'; // Different markup models
    value: number | Array<{min: number; max: number; markup: number}>;
    appliesTo: 'weight' | 'final_price' | 'cod';
  };

  // Edge case handling
  rules: Array<{
    condition: 'weight' | 'value' | 'distance' | 'pincode';
    operator: '>' | '<' | '=' | 'in';
    threshold: number | string[];
    action: 'apply_surcharge' | 'apply_discount' | 'block' | 'use_alternate_courier';
    value: number; // surcharge/discount amount or alternate courier ID
  }>;

  // Validity
  validFrom: Date;
  validTo: Date;
  isActive: boolean;

  // Metadata
  createdBy: ObjectId; // seller or admin
  lastModifiedBy: ObjectId;
  status: 'draft' | 'active' | 'archived' | 'rejected'; // admin approval flow
  approvalNotes?: string;

  // For tracking
  usage: {
    totalShipmentsUsed: number;
    totalRevenueGenerated: number;
    lastUsedAt: Date;
  };
}
```

### 3.2 Rate Calculation Engine (Future-Proof)

**Service: RateCardCalculatorService**

```typescript
async calculateRate(data: {
  courierId: string;
  origin: {pincode: string; state: string};
  destination: {pincode: string; state: string};
  weight: number;
  codAmount: number;
  paymentMode: 'COD' | 'PREPAID';
  rateCardId?: string; // seller's custom rate card
  productValue?: number; // for edge case rules
}): Promise<{
  baseRate: number; // from courier API
  markup: number;
  finalRate: number;
  codCharges: number;
  gst?: number;
  totalCost: number;
  breakdown: Array<{label: string; amount: number}>;
  rateCardUsed: ObjectId;
  warnings: string[]; // e.g., "Weight > 30kg, surcharge applied"
  appliedRules: string[]; // which edge case rules fired
}>
```

**Logic Flow:**

```
1. Fetch base rate from courier API (real-time)
   OR Use cached rate card data

2. Apply seller's rate card rules:
   - Check all edge case conditions
   - If any blocked: return error with alternative
   - If surcharge/discount applies: calculate

3. Apply markup model:
   - Percentage: finalRate = baseRate * (1 + markup%)
   - Fixed: finalRate = baseRate + markup₹
   - Slab: lookup markup based on weight/value ranges

4. Add COD charges if applicable

5. Calculate GST if applicable

6. Return full breakdown + applied rules for transparency

7. Log all calculations for audit trail
```

### 3.3 Edge Cases Handled (Velocity + Future Couriers)

**Weight-Based Edge Cases:**
- "If weight > 30kg, add ₹50 surcharge" (volumetric weight handling)
- "If weight > 100kg, block and suggest alternate courier"
- "If weight < 100g, round up to 100g minimum charge"

**Geographic Edge Cases:**
- "Northeastern states: add 15% surcharge"
- "Remote pincodes: add ₹200 handling fee"
- "Tier-1 cities: apply 5% discount"

**Value-Based Edge Cases:**
- "If COD amount > ₹50,000, use only prepaid option"
- "If order value > ₹10,000, free shipping"
- "Premium seller: 10% discount on all rates"

**Pincode-Based Edge Cases:**
- "Serviceable pincodes list: use this courier"
- "Non-serviceable: automatically switch to backup courier"
- "Pincode in exception list: apply custom rate"

**Time-Based Edge Cases:**
- "Off-peak rates: Mon-Wed rates 10% lower"
- "Seasonal: Dec-Jan peak surcharge 20%"
- "Validity window: rate card expires on date X"

**Implementation:**
```typescript
// Edge case evaluation
async evaluateRules(rateCard: RateCard, shipmentData: any): Promise<{
  blockedReasons: string[];
  appliedSurcharges: Array<{rule: string; amount: number}>;
  appliedDiscounts: Array<{rule: string; amount: number}>;
  suggestedAlternates: string[]; // alternate courier IDs
}>
```

### 3.4 Rate Card Validation (Prevent Invalid Configs)

**Service: RateCardValidatorService**

```typescript
async validateRateCard(rateCard: RateCard): Promise<{
  isValid: boolean;
  errors: Array<{field: string; message: string}>;
  warnings: string[];
}> {
  // Validations:
  // 1. Base rates exist for at least 90% of serviceable pincodes
  // 2. Markup is reasonable (0-200%)
  // 3. Rules don't contradict each other
  // 4. No edge case rules that would block 100% of shipments
  // 5. Validity dates are in future
  // 6. Courier supports payment mode specified
  // 7. Surcharges don't exceed base rate (prevent negative final rate)
  // 8. All referenced alternate couriers are active
}
```

---

## Part 4: Red Card Management System (CORE COMPLEXITY)

### 4.1 Red Card (RMA) Lifecycle Model

**Database Model:**
```typescript
interface RedCard {
  _id: ObjectId;
  companyId: ObjectId;
  sellerId: ObjectId;

  // Original shipment reference
  originalShipmentId: ObjectId;
  originalAwb: string;
  originalCourierId: string; // 'velocity'

  // Red card generation
  rmaNumber: string; // Unique RMA identifier (alphanumeric)
  rmaGeneratedAt: Date;

  // Return journey
  returnCourierId: string; // May be different from forward courier
  returnAwb?: string; // Generated after courier API call
  returnLabel: {
    url: string;
    format: 'pdf' | 'png'; // Courier-specific format
    generatedAt: Date;
    downloadedAt?: Date; // Track seller's label download
  };

  // Return routing
  returnToWarehouse: {
    warehouseId: ObjectId;
    courierId: string; // courier's warehouse ID in their system
    address: string;
    pincode: string;
  };

  // Return reason
  reason: 'ndr' | 'damaged' | 'customer_return' | 'quality_issue' | 'wrong_item' | 'other';
  reasonDetails: string;

  // Return items
  items: Array<{
    originalOrderItemId: ObjectId;
    quantity: number;
    refundAmount: number; // seller decides
    qcStatus: 'pending' | 'accepted' | 'rejected' | 'partial';
  }>;

  // QC process
  qcTimeline: Array<{
    status: 'pending' | 'in_progress' | 'completed';
    checkpoints: Array<{
      checkpoint: 'weight' | 'photos' | 'condition' | 'authenticity';
      status: 'pass' | 'fail' | 'pending';
      notes: string;
      checkedAt: Date;
    }>;
  }>;

  // Financial
  financials: {
    originalShippingCost: number;
    returnShippingCost: number; // Borne by seller or customer?
    refundAmount: number;
    netAmount: number; // What seller receives back
    charges: {
      courierReturnCharge: number;
      qcCharge?: number;
      processingFee?: number;
    };
    settlementStatus: 'pending' | 'processed' | 'failed';
    settlementDate?: Date;
  };

  // Status tracking
  currentStatus: 'initiated' | 'label_generated' | 'pickup_scheduled' | 'in_transit' | 'delivered_to_warehouse' | 'qc_pending' | 'qc_passed' | 'qc_failed' | 'refund_initiated' | 'refund_processed' | 'completed' | 'cancelled';

  statusHistory: Array<{
    status: string;
    changedAt: Date;
    changedBy: ObjectId;
    notes: string;
  }>;

  // Webhook tracking
  webhooks: Array<{
    eventType: string;
    payload: any;
    receivedAt: Date;
    processed: boolean;
  }>;

  // Edge case handling
  exceptions: Array<{
    type: 'weight_mismatch' | 'pickup_failed' | 'delivery_failed' | 'qc_failed' | 'settlement_failed';
    description: string;
    createdAt: Date;
    resolvedAt?: Date;
    resolution: string;
  }>;
}
```

### 4.2 Red Card Creation Workflow

**Service: RedCardService**

```typescript
async initiateReturn(data: {
  originalShipmentId: ObjectId;
  reason: 'ndr' | 'damaged' | 'customer_return' | 'quality_issue' | 'wrong_item' | 'other';
  reasonDetails: string;
  itemsToReturn: Array<{itemId: ObjectId; quantity: number}>;
}): Promise<{
  redCardId: ObjectId;
  rmaNumber: string;
  returnAwb: string;
  labelUrl: string;
  returnCourierId: string;
  nextSteps: string[];
}>
```

**Logic:**

1. **Validate Return Eligibility:**
   - Original shipment exists and belongs to seller
   - Shipment status allows returns (not pre-existing cancelled)
   - Within return window (e.g., 30 days)
   - Items match original order

2. **Select Return Courier:**
   ```typescript
   // Future-proof logic:
   const returnCourier = await courierSelectorService.selectForReturn({
     originalCourierId: 'velocity',
     origin: originalShipment.destination, // return FROM customer
     destination: originalShipment.origin, // return TO warehouse
     weight: calculateReturnWeight(items),
     reason: 'ndr' // some couriers don't handle NDR returns
   });
   // Can be same or different from forward courier
   ```

3. **Generate Return Label:**
   ```typescript
   // Courier-specific implementation
   const returnLabel = await returnCourier.createReturnLabel({
     originalAwb: shipment.awb,
     reason: reason,
     returnToAddress: warehouse.address,
     weight: calculateWeight(items)
   });
   // Returns: {awb, label_url, tracking_url}
   ```

4. **Create Red Card Record** in database with all details

5. **Notify Seller:**
   - Email with RMA number
   - Return label PDF
   - Courier tracking URL
   - Expected delivery date

### 4.3 Red Card Edge Cases (Failure Prevention)

**Weight Mismatch Detection:**
```typescript
// When return label generated
if (estimatedReturnWeight > originalWeight + TOLERANCE) {
  // Flag exception: "Return weight exceeds original by 2kg"
  // Action: require seller confirmation or photo evidence
  redCard.exceptions.push({
    type: 'weight_mismatch',
    description: 'Return weight ${returnWeight}kg > original ${originalWeight}kg'
  });
}
```

**Pickup Failure Handling:**
```typescript
// If courier couldn't pickup return (via webhook)
async handlePickupFailure(redCardId: ObjectId, reason: string) {
  redCard.exceptions.push({
    type: 'pickup_failed',
    description: reason
  });

  // Auto-trigger remediation:
  // 1. Notify seller
  // 2. Suggest reschedule
  // 3. Or escalate to admin if retry limit reached
}
```

**Delivery to Warehouse Failure:**
```typescript
// Return in transit but courier reports delivery failure
async handleReturnDeliveryFailure(redCardId: ObjectId) {
  redCard.currentStatus = 'in_transit'; // stuck

  redCard.exceptions.push({
    type: 'delivery_failed',
    description: 'Return package could not be delivered to warehouse'
  });

  // Escalate to admin
  await notificationService.escalateToAdmin(redCard._id);
}
```

**QC Failure & Partial Refunds:**
```typescript
async completeQC(redCardId: ObjectId, results: {
  checkpoint: 'weight' | 'photos' | 'condition' | 'authenticity';
  status: 'pass' | 'fail';
}) {
  if (results.status === 'fail') {
    // Handle partial refund
    // Example: Damaged goods on return = only 50% refund
    redCard.items.forEach(item => {
      if (item.condition === 'damaged') {
        item.refundAmount = item.originalPrice * 0.5;
      }
    });

    redCard.financials.refundAmount = calculatePartialRefund(items);
    redCard.currentStatus = 'qc_failed';
  }
}
```

**Settlement Failure Recovery:**
```typescript
async processRefund(redCardId: ObjectId) {
  try {
    await paymentService.initiateRefund({
      sellerId: redCard.sellerId,
      amount: redCard.financials.netAmount
    });
  } catch (error) {
    redCard.exceptions.push({
      type: 'settlement_failed',
      description: error.message
    });

    // Retry with exponential backoff
    await refundRetryService.scheduleRetry(redCardId);
  }
}
```

**Stale Red Cards:**
```typescript
// Scheduled job to detect stuck RMAs
async detectStaledRedCards() {
  // If in_transit for > 30 days → escalate
  // If qc_pending for > 14 days → escalate
  // If settlement_pending for > 7 days → escalate

  redCard.exceptions.push({
    type: 'stale_rma',
    description: 'RMA stuck in ${status} for ${days} days'
  });
}
```

### 4.4 Red Card Webhook Integration

**Velocity Webhook Events:**

```typescript
interface VelocityReturnWebhook {
  awb: string; // return AWB
  status_code: 'NEW' | 'PKP' | 'IT' | 'OFD' | 'DEL';
  timestamp: string;
  description: string;
  weight_scanned?: number; // Critical for weight dispute
  location: string;
  photo_url?: string;
}

// Webhook handler
async handleReturnStatusUpdate(webhook: VelocityReturnWebhook) {
  const redCard = await RedCard.findOne({returnAwb: webhook.awb});

  // Map Velocity status to RMA status
  const statusMap = {
    'NEW': 'label_generated',
    'PKP': 'pickup_scheduled',
    'IT': 'in_transit',
    'OFD': 'in_transit',
    'DEL': 'delivered_to_warehouse'
  };

  redCard.currentStatus = statusMap[webhook.status_code];

  // Handle weight scanned (critical for disputes)
  if (webhook.weight_scanned) {
    const discrepancy = Math.abs(webhook.weight_scanned - redCard.estimatedWeight);
    if (discrepancy > WEIGHT_TOLERANCE) {
      redCard.exceptions.push({
        type: 'weight_mismatch',
        description: `Return weight ${webhook.weight_scanned}kg differs from estimate`,
        photoUrl: webhook.photo_url
      });
    }
  }

  await redCard.save();
}
```

---

## Part 5: Courier Mapping Abstraction (Future-Proof)

### 5.1 Unified Courier Adapter Interface

**Updated File: `base/courier.adapter.ts`**

```typescript
interface ICourierAdapter {
  // === CORE METHODS (EXISTING) ===

  createShipment(data: CourierShipmentData): Promise<CourierShipmentResponse>;
  trackShipment(awb: string): Promise<CourierTrackingResponse>;
  cancelShipment(awb: string): Promise<boolean>;
  getRates(request: CourierRateRequest): Promise<CourierRateResponse[]>;

  // === CAPABILITY DECLARATION (NEW) ===

  getCapabilities(): CourierCapabilities {
    return {
      features: {
        cod: true,
        ndr: true,
        returns: true,
        addressUpdate: true,
        deliveryReattempt: true,
        weightVerification: true,
        settlementTracking: true,
        bulkOperations: true
      },
      regions: ['IN'],
      maxWeightKg: 100,
      supportedPaymentModes: ['COD', 'PREPAID'],
      rateCardSupport: 'dynamic', // 'static' | 'dynamic' | 'hybrid'
      webhookSupport: true,
      maxRetries: 3,
      settlementCycle: 2 // days
    };
  }

  // === RETURN/RMA METHODS (NEW) ===

  createReturnLabel(data: {
    originalAwb: string;
    reason: string;
    returnToAddress: Address;
    weight: number;
    items?: ReturnItem[];
  }): Promise<{
    returnAwb: string;
    labelUrl: string;
    trackingUrl: string;
  }>;

  cancelReturn(returnAwb: string): Promise<boolean>;

  // === RATE CARD METHODS (NEW) ===

  fetchBaseRates(params: {
    originPincode: string;
    destPincode: string;
    weight: number;
  }): Promise<{
    baseRate: number;
    zone: string;
    codCharge: number;
    estimatedDays: number;
  }>;

  validateRateCard(rateCard: RateCard): Promise<ValidationResult>;

  // === WEBHOOK METHODS (NEW) ===

  verifyWebhookSignature(payload: any, signature: string): boolean;
  parseWebhookEvent(payload: any): WebhookEvent;

  // === SETTLEMENT METHODS (NEW) ===

  getSettlementStatus(awb: string): Promise<SettlementInfo>;
  getRemittanceSchedule(): RemittanceSchedule;

  // === HEALTH CHECK (NEW) ===

  healthCheck(): Promise<{status: 'healthy'|'degraded'|'down'; details: any}>;
}
```

### 5.2 Courier Registry (Dynamic, Extensible)

**New File: `base/courier-registry.ts`**

```typescript
class CourierRegistry {
  private static providers = new Map<string, {
    Class: CourierProviderClass;
    config: CourierConfig;
    capabilities: CourierCapabilities;
  }>();

  static register(
    name: string,
    ProviderClass: CourierProviderClass,
    config: CourierConfig
  ) {
    // Validate provider implements ICourierAdapter
    this.providers.set(name, {
      Class: ProviderClass,
      config,
      capabilities: new ProviderClass(null).getCapabilities()
    });
  }

  static async create(name: string, companyId: ObjectId): Promise<ICourierAdapter> {
    const registered = this.providers.get(name);
    if (!registered) throw new Error(`Courier ${name} not registered`);

    // Validate integration is active
    const integration = await Integration.findOne({
      companyId,
      provider: name,
      'settings.isActive': true
    });

    return new registered.Class(companyId);
  }

  static getCapabilities(name: string): CourierCapabilities {
    return this.providers.get(name)?.capabilities;
  }

  static getAll(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Startup registration
CourierRegistry.register('velocity', VelocityShipfastProvider, {...});
// Later: CourierRegistry.register('delhivery', DelhiveryProvider, {...});
```

### 5.3 Intelligent Courier Selector Service

**New File: `courier-selector.service.ts`**

```typescript
class CourierSelectorService {
  async selectForShipment(params: {
    origin: {pincode: string};
    destination: {pincode: string};
    weight: number;
    codAmount: number;
    paymentMode: 'COD' | 'PREPAID';
    sellerId: ObjectId;
  }): Promise<{
    courierId: string;
    rateBreakdown: any;
    estimatedDays: number;
    reason: string; // why this courier was selected
  }> {
    // Selection logic:
    // 1. Get seller's preferred couriers
    // 2. Check serviceability via getRates() for each
    // 3. Filter by payment mode support
    // 4. Sort by: cost → speed → reliability
    // 5. Return best option

    // Future: Can easily add more couriers to comparison
  }

  async selectForReturn(params: {
    originalCourierId: string;
    origin: {pincode: string};
    destination: {pincode: string};
    weight: number;
    reason: 'ndr' | 'damaged' | 'customer_return';
  }): Promise<string> {
    // Return courier might be different!
    // Example: Velocity may not handle customer returns → use Delhivery

    const capabilities = CourierRegistry.getCapabilities('velocity');
    if (!capabilities.features.returns) {
      // Switch to alternate
      return 'delhivery'; // future
    }

    return 'velocity';
  }
}
```

---

## Part 6: Complete Workflow Examples

### 6.1 Forward Shipment End-to-End

```
Seller creates order
  ↓
System fetches rate card (seller's custom)
  ↓
RateCardCalculatorService.calculateRate()
  - Applies base rate from Velocity API
  - Applies seller's markup rules
  - Detects edge cases (weight > 30kg → +₹50)
  - Returns: ₹250 (all-in)
  ↓
Seller confirms shipment
  ↓
CourierSelectorService.selectForShipment()
  - Checks Velocity serviceability
  - Confirms payment mode supported
  - Returns: Velocity (only active courier for now)
  ↓
VelocityProvider.createShipment()
  - Calls /forward-order-orchestration
  - Returns: awb_code, label_url, charges breakdown
  ↓
Shipment stored with all charges data
  ↓
Webhook received: status = "PKP"
  - RedCard not involved yet
  - Just tracking forward shipment
  ↓
Webhook received: status = "DEL"
  - Mark shipment as delivered
  - Prepare for settlement
  ↓
Daily settlement processing
  - CoD amount collected
  - Deduct: courier charges + COD fee
  - Remit balance to seller
```

### 6.2 NDR → Red Card → Refund End-to-End

```
Webhook received: status = "NDR"
  - Shipment marked as "ndr"
  - Seller notified
  ↓
Seller initiates return (via app)
  - Click "Create Return"
  - Select reason: "NDR"
  ↓
RedCardService.initiateReturn()
  - Validate return eligibility (within 30 days, not cancelled, etc.)
  ↓
CourierSelectorService.selectForReturn()
  - Returns: Velocity (for NDR returns)
  ↓
VelocityProvider.createReturnLabel()
  - Calls /reverse-order-orchestration
  - Returns: return_awb, label_url
  ↓
RedCard created with:
  - rmaNumber: "RMA-2025-001234"
  - returnAwb: from Velocity
  - returnLabel: {url, format: pdf}
  - returnToWarehouse: original warehouse
  ↓
Seller downloads label & arranges pickup
  ↓
Webhook: return status = "PKP"
  - RedCard.currentStatus = "pickup_scheduled"
  ↓
Webhook: return status = "IT"
  - RedCard.currentStatus = "in_transit"
  ↓
Webhook: return status = "DEL" + weight_scanned
  - RedCard.currentStatus = "delivered_to_warehouse"
  - Weight check: return_weight ≠ original_weight
  - Flag exception if discrepancy > 10%
  ↓
QC Process:
  - Admin inspects returned item
  - Photos taken
  - Condition verified
  - Mark: "accepted" or "rejected" or "partial"
  ↓
If accepted:
  - Refund amount = original price
  - Deduct return courier cost from refund
  - netAmount = original price - return courier cost
  ↓
If partial (damaged on return):
  - Refund amount = original price * 50%
  - netAmount = (original price * 50%) - return courier cost
  ↓
Settlement:
  - Payment gateway initiates refund to seller
  - On failure: retry 3x with exponential backoff
  ↓
RedCard.currentStatus = "refund_processed"
  - Complete workflow
  - Seller sees refund in wallet
```

---

## Part 7: Edge Case Mastery (Prevent All Failures)

### 7.1 Rate Card Edge Cases (ALL HANDLED)

| Edge Case | Detection | Remediation |
|-----------|-----------|------------|
| Weight > 30kg | calculateRate() checks threshold | Add ₹50 surcharge, warn seller |
| Pincode not serviceable | getRates() returns empty | RedCard blocks, suggests alternate |
| Weight mismatch on return | webhook weight_scanned vs estimate | Flag exception, require proof |
| Rate card expires during shipment | validateRateCard() pre-checks | Reject at creation time |
| Markup creates negative price | RateCardValidator checks | Reject rate card, show error |
| Markup rule contradicts | Rule evaluation logic | Last rule wins, log warning |
| Seasonal surcharge + seller discount conflict | Rule evaluation order | Enforce rule precedence |
| High COD amount (₹50k+) blocks COD | Edge case rule trigger | Auto-switch to PREPAID only |
| Off-peak time triggers discount | Time-based rule | Apply dynamically at calc time |

### 7.2 Red Card Edge Cases (ALL HANDLED)

| Edge Case | Detection | Remediation |
|-----------|-----------|------------|
| Return weight > original | webhook weight_scanned check | Flag exception, require photo proof |
| Pickup failed 3x | webhook retry count exceeded | Escalate to admin, offer refund |
| Return stuck in transit 30+ days | Scheduled job | Escalate, initiate refund |
| QC fails but weight matches | QC logic | Partial refund (50%), keep return costs |
| Settlement payment fails | Payment gateway error | Retry 3x, then manual review |
| Seller disputes refund amount | Manual flag | Admin review queue |
| Return label never downloaded | 7+ days no download | Auto-escalate, suggest cancel |
| Seller requests cancel after label generated | Cancel button check | Only allow if not yet picked up |
| Multi-item return with different statuses | Per-item QC tracking | Calculate refund per item |
| Return for digital/non-returnable item | Validation at initiation | Block red card creation |

### 7.3 Webhook Edge Cases (ALL HANDLED)

| Edge Case | Detection | Remediation |
|-----------|-----------|------------|
| Duplicate webhook (same event 2x) | Event ID deduplication | Process once, ignore duplicate |
| Out-of-order webhooks | Status transition validation | Queue out-of-order, retry |
| Missing webhook (jump from IT to DEL) | State machine check | Infer missing state, log warning |
| Webhook with corrupted payload | JSON validation | Dead letter queue + retry |
| Webhook signature mismatch | HMAC verification | Reject, alert security |
| Webhook for non-existent shipment | Database lookup | Log error, don't crash |
| Webhook processing takes > 30s | Timeout trigger | Async processing via queue |
| Race condition: webhook + manual update | Transaction lock | Last write wins, log both |

---

## Part 8: Testing Strategy (Comprehensive)

### 8.1 Unit Tests (Phase 1-3)

**Test Files:**
- `VelocityProvider.test.ts` - Endpoint URLs, request/response unwrapping
- `RateCardCalculator.test.ts` - Rate calculation with all edge cases
- `RateCardValidator.test.ts` - Validation logic
- `RedCardService.test.ts` - RMA lifecycle
- `CourierSelector.test.ts` - Selection logic

**Coverage Target:** 85%+

### 8.2 Integration Tests (Phase 3-4)

**Test Flows:**
- Forward shipment creation → tracking → delivery → settlement
- NDR return → red card creation → warehouse delivery → QC → refund
- Rate card with 5+ edge case rules applied correctly
- Webhook processing: 100 concurrent webhooks (no race conditions)
- Refund retry: payment fails 2x, succeeds on 3rd retry

**Staging Environment Required**

### 8.3 Production Validation (Week 1 of Deployment)

- [ ] 100 real forward shipments created
- [ ] All AWBs, labels, charges captured correctly
- [ ] 10 test returns initiated → red cards generated → labels printed
- [ ] Webhooks received for all shipments (100% delivery rate)
- [ ] Settlement processed correctly (CoD deduction, markup applied)
- [ ] Zero financial discrepancies in first 1000 shipments
- [ ] Dead letter queue stays empty (no webhook failures)

---

## Part 9: Future Courier Integration (Roadmap)

**When you add Delhivery (Week 4-5):**

1. Create `DelhiveryProvider` extending ICourierAdapter
2. Implement all 15 methods (90% same logic as Velocity)
3. Register: `CourierRegistry.register('delhivery', DelhiveryProvider, {...})`
4. Add Delhivery's webhook handler
5. Add Delhivery's rate card mapper

**Effort Reduction:** 70% code reuse via base class + utilities

**When you add Ekart (Week 6-7):**

**Same process, even faster**

---

## Implementation Timeline (Revised)

### Week 1: Velocity Fix + Foundation Setup
- **Days 1-2:** Fix 16 Velocity issues (endpoints, fields, response handling)
- **Days 3-4:** Build Courier Registry + Abstraction Layer
- **Day 5:** Testing + staging validation

### Week 2: Rate Card System
- **Days 1-2:** Rate Card Model + Calculator + Validator
- **Days 3-4:** 20+ edge case implementations
- **Day 5:** Integration tests + validation

### Week 3: Red Card System + Deployment
- **Days 1-2:** Red Card Model + Lifecycle Service
- **Days 3-4:** 15+ edge case implementations + webhook integration
- **Day 5:** E2E testing + production readiness

**Deploy to Production: End of Week 3**
**First sellers onboard: Week 4**
**Delhivery integration ready: Week 5-6 (when needed)**

---

## Success Criteria

**Post-Deployment (Week 4):**
- ✅ 99%+ shipment creation success rate
- ✅ 100% webhook processing success (zero lost events)
- ✅ All charges correctly calculated and applied
- ✅ Settlement processing accurate within ₹1 (no discrepancies)
- ✅ Zero red card failures
- ✅ Sellers report smooth experience

**Architecture Quality:**
- ✅ Adding new courier takes < 2 weeks
- ✅ All edge cases documented + handled
- ✅ 85%+ test coverage
- ✅ Zero critical bugs in first month

---

## Summary

**This plan delivers:**

1. **Week 1:** Velocity production-ready (16 fixes + foundation)
2. **Week 2-3:** Advanced rate cards + red cards (all edge cases)
3. **Future:** Any courier integration in 2-3 weeks (vs 5-6 without foundation)

**Cost of this approach:** 3 extra weeks upfront
**Benefit:** 3-4 weeks saved PER FUTURE COURIER

**You're building not just Velocity integration, but a PLATFORM.**

---

**Ready to approve this plan and start implementation?**