# CORRECTION NOTE (Verified Jan 14, 2026)
> **⚠️ CRITICAL UPDATE:** Actual codebase verification has revealed that **Zone, RateCard, and GST services ALREADY EXIST** but are disconnected. Velocity is **95% complete**.
> **Corrected Effort:** 368-461 hours (vs 890h originally estimated).
> **Key Action:** Focus on **wiring existing services** rather than building from scratch.
> See [AUDIT_VERIFICATION_2026-01-14.md](file:///Users/dhirajgiri/.gemini/antigravity/brain/c2b7a7af-c0f5-41aa-85a0-6bf3e70e89f5/AUDIT_VERIFICATION_2026-01-14.md) for full details.

# Helix Backend: Complete Implementation Roadmap (2026)

**Version:** 3.0 (Audit-Driven)
**Created:** January 14, 2026
**Status:** Ready for Immediate Implementation
**Total Effort:** 890 hours (~12-16 weeks with 4-6 person team)

---

## EXECUTIVE SUMMARY

### Audit Findings (January 14, 2026)
After comprehensive codebase analysis, web research on shipping aggregator standards, and BlueShip implementation pattern analysis, we've discovered a critical gap between perceived and actual completion:

**Infrastructure Layer:** 71% complete ✅
- Clean DDD architecture
- MongoDB models
- API endpoints
- Webhook system

**Business Logic Layer:** 28% complete ❌
- Pricing calculation missing
- Tax calculation missing
- COD charges not implemented
- RateCard disconnected (hardcoded rates)
- Serviceability static only
- 3 of 4 courier integrations are stubs

### Strategic Decision
**Pause new feature development** → **Fix critical business logic gaps first** → **Then continue advanced features**

---

## IMPLEMENTATION PHASES

```
PHASE 0: Critical Fixes (Weeks 11-12)     200 hours  P0 Blockers
PHASE 1: Courier Integration (Week 13-14) 150 hours  P0 Functionality
PHASE 2: Zone & Pricing (Week 15)         80 hours   P1 Optimization
PHASE 3: Infrastructure (Week 16-17)      120 hours  P1 Production
PHASE 4: Advanced Features (Week 18-20)   200 hours  P2 Enhancement
PHASE 5: Code Quality (Week 21-22)        140 hours  P2 Maintenance
═══════════════════════════════════════════════════════════════
TOTAL                                      890 hours  12-16 weeks
```

---

## PHASE 0: CRITICAL BUSINESS LOGIC FIXES (Weeks 11-12)

**Objective:** Fix 6 production-blocking issues preventing revenue generation

### Week 11: Pricing & Tax Foundation (100 hours)

#### Task 11.1: Pricing Calculation Service (40h)

**Current Broken Code:**
```typescript
// server/src/core/application/services/shipping/order.service.ts:105-108
static calculateTotals(products: Array<{ price: number; quantity: number }>) {
    const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    return { subtotal, tax: 0, shipping: 0, discount: 0, total: subtotal };
}
// ❌ Tax always 0, Shipping always 0, Total = Subtotal (WRONG!)
```

**Required Implementation:**

**File:** `server/src/core/application/services/pricing/pricing-calculation.service.ts` (NEW)

```typescript
export class PricingCalculationService {
  constructor(
    private rateCardRepo: RateCardRepository,
    private zoneService: ZoneService,
    private gstService: GSTCalculationService,
    private codService: CODSurchargeService
  ) {}

  async calculateShippingCost(shipment: CreateShipmentDTO): Promise<ShippingCostBreakdown> {
    // Step 1: Determine zone
    const zone = await this.zoneService.determineZone(
      shipment.origin.pincode,
      shipment.destination.pincode
    );

    // Step 2: Fetch rate card
    const rateCard = await this.rateCardRepo.findOne({
      carrier: shipment.carrier,
      serviceType: shipment.serviceType,
      zoneId: zone._id,
      active: true
    });

    if (!rateCard) {
      throw new RateCardNotFoundException();
    }

    // Step 3: Calculate base shipping charge
    const chargeableWeight = this.calculateChargeableWeight(shipment);
    const baseCharge = this.calculateBaseCharge(rateCard, chargeableWeight);

    // Step 4: Add COD charges if applicable
    const codCharge = shipment.paymentMode === 'COD'
      ? await this.codService.calculateCODCharge(shipment.invoiceValue, rateCard)
      : 0;

    // Step 5: Calculate GST
    const taxableAmount = baseCharge + codCharge;
    const gst = await this.gstService.calculateGST(
      taxableAmount,
      shipment.seller.gstin,
      shipment.buyer.gstin
    );

    // Step 6: Return detailed breakdown
    return {
      baseCharge,
      codCharge,
      subtotal: baseCharge + codCharge,
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: gst.igst,
      totalTax: gst.total,
      grandTotal: taxableAmount + gst.total,
      breakdown: {
        zone: zone.name,
        chargeableWeight,
        rateCardId: rateCard._id
      }
    };
  }

  private calculateChargeableWeight(shipment: CreateShipmentDTO): number {
    const actualWeight = shipment.weight.value;
    const volumetricWeight = shipment.dimensions
      ? (shipment.dimensions.length * shipment.dimensions.width * shipment.dimensions.height) / 5000
      : 0;

    return Math.max(actualWeight, volumetricWeight);
  }

  private calculateBaseCharge(rateCard: RateCard, weight: number): number {
    const basicWeight = rateCard.basicWeightSlab || 0.5;  // First 500g
    const additionalWeightSlab = rateCard.additionalWeightSlab || 0.5;

    if (weight <= basicWeight) {
      return rateCard.weightPriceBasic;
    }

    const additionalWeight = weight - basicWeight;
    const additionalSlabs = Math.ceil(additionalWeight / additionalWeightSlab);
    const additionalCharge = additionalSlabs * rateCard.weightPriceAdditional;

    return rateCard.weightPriceBasic + additionalCharge + (rateCard.overheadCharges || 0);
  }
}
```

**Files to Create:**
- `server/src/core/application/services/pricing/pricing-calculation.service.ts`
- `server/src/core/application/services/pricing/types.ts`
- `server/tests/unit/services/pricing/pricing-calculation.service.test.ts`

**Files to Modify:**
- `server/src/core/application/services/shipping/order.service.ts` (replace calculateTotals)

**Database Changes:**
- Add missing fields to RateCard model:
  ```typescript
  weightPriceBasic: Number,           // Price for first 500g
  weightPriceAdditional: Number,      // Price per additional 500g
  basicWeightSlab: { type: Number, default: 0.5 },
  additionalWeightSlab: { type: Number, default: 0.5 },
  overheadCharges: Number,
  codPercentage: Number,
  codMinimum: Number
  ```

**Testing:**
- Unit tests: 15 test cases
- Integration tests: 8 scenarios
- Edge cases: Volumetric weight > actual weight, zero weight, negative values

---

#### Task 11.2: GST Calculation Service (30h)

**File:** `server/src/core/application/services/pricing/gst-calculation.service.ts` (NEW)

```typescript
export class GSTCalculationService {
  private readonly GST_RATE = 0.18;  // 18% for logistics (HSN 9965)

  async calculateGST(
    taxableAmount: number,
    sellerGSTIN: string,
    buyerGSTIN: string
  ): Promise<GSTBreakdown> {
    const sellerState = this.getStateFromGSTIN(sellerGSTIN);
    const buyerState = this.getStateFromGSTIN(buyerGSTIN);

    const isInterState = sellerState !== buyerState;
    const totalGST = taxableAmount * this.GST_RATE;

    if (isInterState) {
      // Inter-state: IGST only
      return {
        cgst: 0,
        sgst: 0,
        igst: totalGST,
        total: totalGST,
        placeOfSupply: buyerState,
        isInterState: true
      };
    } else {
      // Intra-state: CGST + SGST
      return {
        cgst: totalGST / 2,
        sgst: totalGST / 2,
        igst: 0,
        total: totalGST,
        placeOfSupply: sellerState,
        isInterState: false
      };
    }
  }

  private getStateFromGSTIN(gstin: string): string {
    // First 2 digits of GSTIN = state code
    const stateCode = gstin.substring(0, 2);
    return this.STATE_CODE_MAP[stateCode] || 'Unknown';
  }

  private readonly STATE_CODE_MAP: Record<string, string> = {
    '01': 'Jammu & Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli and Daman & Diu',
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman & Nicobar',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh'
  };
}
```

**Integration Points:**
- Invoice generation
- Order total calculation
- GSTR-1 filing reports

---

#### Task 11.3: COD Surcharge Service (20h)

**File:** `server/src/core/application/services/pricing/cod-surcharge.service.ts` (NEW)

```typescript
export class CODSurchargeService {
  async calculateCODCharge(
    invoiceValue: number,
    rateCard: RateCard
  ): Promise<number> {
    const codPercentage = rateCard.codPercentage || 0.02;  // Default 2%
    const codMinimum = rateCard.codMinimum || 30;          // Default ₹30

    const percentageCharge = invoiceValue * codPercentage;

    // Return whichever is higher
    return Math.max(percentageCharge, codMinimum);
  }

  async getCODLimit(companyId: ObjectId): Promise<number> {
    const company = await this.companyRepo.findById(companyId);
    return company.codSettings?.maxCODAmount || 50000;  // Default ₹50,000
  }
}
```

---

#### Task 11.4: Refactor CarrierService to Use Database (35h)

**Current Hardcoded Implementation (WRONG):**
```typescript
// server/src/core/application/services/shipping/carrier.service.ts:44-72
const baseRates: Record<string, number> = {
  delhivery: 40,
  dtdc: 45,
  xpressbees: 35,
};
```

**New Implementation:**
```typescript
export class CarrierService {
  async calculateRate(shipment: CreateShipmentDTO): Promise<number> {
    // Delegate to PricingCalculationService
    const pricing = await this.pricingService.calculateShippingCost(shipment);
    return pricing.grandTotal;
  }

  async getAvailableCarriers(
    originPincode: string,
    destinationPincode: string,
    weight: number,
    codValue?: number
  ): Promise<CarrierOption[]> {
    // Get all serviceable carriers
    const serviceableCarriers = await this.pincodeRepo.findServiceableCarriers(
      originPincode,
      destinationPincode
    );

    const options: CarrierOption[] = [];

    for (const carrier of serviceableCarriers) {
      try {
        const pricing = await this.pricingService.calculateShippingCost({
          carrier: carrier.name,
          origin: { pincode: originPincode },
          destination: { pincode: destinationPincode },
          weight: { value: weight, unit: 'kg' },
          paymentMode: codValue ? 'COD' : 'PREPAID',
          invoiceValue: codValue || 0
        });

        options.push({
          carrier: carrier.name,
          serviceType: carrier.serviceType,
          rate: pricing.grandTotal,
          estimatedDelivery: carrier.estimatedDays,
          breakdown: pricing
        });
      } catch (error) {
        this.logger.warn(`Failed to get rate for ${carrier.name}`, error);
      }
    }

    // Sort by price
    return options.sort((a, b) => a.rate - b.rate);
  }
}
```

**Effort Breakdown:**
- Remove hardcoded rates: 8h
- Integrate PricingCalculationService: 12h
- Update getAllRates endpoint: 6h
- Testing: 9h

---

### Week 12: Courier Integration & RTO (100 hours)

#### Task 12.1: Complete Courier Adapters (120h total, split across team)

**Delhivery Adapter (40h):**

**File:** `server/src/infrastructure/external/couriers/delhivery/delhivery.adapter.ts` (NEW)

```typescript
export class DelhiveryAdapter implements CourierAdapter {
  private readonly BASE_URL = 'https://track.delhivery.com/api';
  private readonly API_KEY = process.env.DELHIVERY_API_KEY;

  async createShipment(shipmentData: CreateShipmentDTO): Promise<CreateShipmentResponse> {
    const response = await axios.post(
      `${this.BASE_URL}/cmu/create.json`,
      this.transformShipmentData(shipmentData),
      {
        headers: {
          'Authorization': `Token ${this.API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      awb: response.data.packages[0].waybill,
      trackingNumber: response.data.packages[0].waybill,
      labelUrl: response.data.packages[0].label_url,
      success: true
    };
  }

  async trackShipment(awb: string): Promise<TrackingResponse> {
    const response = await axios.get(
      `${this.BASE_URL}/v2/fetch/${awb}`
    );

    return this.transformTrackingData(response.data);
  }

  async checkServiceability(pincode: string): Promise<ServiceabilityResponse> {
    const response = await axios.get(
      `${this.BASE_URL}/c/api/pin-codes/json/?filter_codes=${pincode}`,
      {
        headers: {
          'Authorization': `Token ${this.API_KEY}`
        }
      }
    );

    const data = response.data.delivery_codes[0];

    return {
      serviceable: data.pin !== null,
      deliveryDays: data.pre_paid ? parseInt(data.pre_paid) : null,
      codAvailable: data.cod === 'Y',
      serviceTypes: ['STANDARD', 'EXPRESS']
    };
  }

  async schedulePickup(pickupData: PickupDTO): Promise<PickupResponse> {
    const response = await axios.post(
      `${this.BASE_URL}/fm/request/new/`,
      {
        pickup_location: pickupData.address,
        pickup_time: pickupData.scheduledTime,
        shipments: pickupData.awbs
      },
      {
        headers: {
          'Authorization': `Token ${this.API_KEY}`
        }
      }
    );

    return {
      pickupId: response.data.pickup_id,
      scheduledDate: response.data.pickup_date,
      success: true
    };
  }

  private transformShipmentData(shipment: CreateShipmentDTO): any {
    return {
      shipments: [{
        name: shipment.consignee.name,
        add: shipment.consignee.address,
        pin: shipment.consignee.pincode,
        city: shipment.consignee.city,
        state: shipment.consignee.state,
        country: 'India',
        phone: shipment.consignee.phone,
        order: shipment.orderId,
        payment_mode: shipment.paymentMode === 'COD' ? 'COD' : 'Prepaid',
        cod_amount: shipment.codAmount || 0,
        weight: shipment.weight.value,
        seller_name: shipment.shipper.name,
        seller_add: shipment.shipper.address,
        seller_pin: shipment.shipper.pincode,
        seller_inv: shipment.invoiceNumber,
        quantity: shipment.quantity,
        return_pin: shipment.shipper.pincode,
        return_city: shipment.shipper.city,
        return_phone: shipment.shipper.phone,
        return_add: shipment.shipper.address
      }],
      pickup_location: {
        name: shipment.shipper.name,
        add: shipment.shipper.address,
        pin: shipment.shipper.pincode
      }
    };
  }

  private transformTrackingData(data: any): TrackingResponse {
    // Transform Delhivery tracking response to standard format
    return {
      awb: data.ShipmentData[0].Shipment.AWB,
      status: this.mapStatus(data.ShipmentData[0].Shipment.Status.Status),
      currentLocation: data.ShipmentData[0].Shipment.Status.StatusLocation,
      estimatedDelivery: data.ShipmentData[0].Shipment.Status.ExpectedDeliveryDate,
      scans: data.ShipmentData[0].Shipment.Scans.map(scan => ({
        location: scan.ScanDetail.ScannedLocation,
        status: scan.ScanDetail.Scan,
        timestamp: new Date(scan.ScanDetail.ScanDateTime)
      }))
    };
  }

  private mapStatus(delhiveryStatus: string): ShipmentStatus {
    const statusMap: Record<string, ShipmentStatus> = {
      'Pending': 'pending',
      'In Transit': 'in_transit',
      'Out for Delivery': 'out_for_delivery',
      'Delivered': 'delivered',
      'RTO': 'rto',
      'Cancelled': 'cancelled'
    };

    return statusMap[delhiveryStatus] || 'pending';
  }
}
```

**Similarly implement:**
- **Ekart Adapter** (40h) - Flipkart Ekart APIs
- **India Post Adapter** (40h) - Speed Post APIs

---

#### Task 12.2: Real-Time Serviceability (35h)

**File:** `server/src/core/application/services/shipping/serviceability.service.ts` (NEW)

```typescript
export class ServiceabilityService {
  constructor(
    private pincodeRepo: PincodeRepository,
    private carrierAdapterFactory: CarrierAdapterFactory,
    private cacheService: CacheService
  ) {}

  async checkServiceability(
    pincode: string,
    carrier?: string
  ): Promise<ServiceabilityResult> {
    const cacheKey = `serviceability:${pincode}:${carrier || 'all'}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    if (carrier) {
      const result = await this.checkSingleCarrier(pincode, carrier);
      await this.cacheService.set(cacheKey, result, 24 * 60 * 60);  // 24h TTL
      return result;
    }

    // Check all carriers
    const carriers = ['velocity', 'delhivery', 'ekart', 'india_post'];
    const results: Record<string, ServiceabilityResponse> = {};

    await Promise.allSettled(
      carriers.map(async (c) => {
        try {
          results[c] = await this.checkSingleCarrier(pincode, c);
        } catch (error) {
          this.logger.warn(`Serviceability check failed for ${c}:${pincode}`, error);
          results[c] = { serviceable: false };
        }
      })
    );

    const aggregatedResult = {
      pincode,
      carriers: results,
      anyServiceable: Object.values(results).some(r => r.serviceable),
      fastestDelivery: Math.min(...Object.values(results).map(r => r.deliveryDays || 999))
    };

    await this.cacheService.set(cacheKey, aggregatedResult, 24 * 60 * 60);
    return aggregatedResult;
  }

  private async checkSingleCarrier(
    pincode: string,
    carrier: string
  ): Promise<ServiceabilityResponse> {
    const adapter = this.carrierAdapterFactory.getAdapter(carrier);
    const realTimeData = await adapter.checkServiceability(pincode);

    // Update database
    await this.pincodeRepo.updateServiceability(pincode, carrier, realTimeData);

    return realTimeData;
  }

  async refreshServiceabilityCache(): Promise<void> {
    // Background job to refresh all pincodes
    const outdatedPincodes = await this.pincodeRepo.find({
      lastChecked: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }  // > 7 days old
    });

    for (const pincode of outdatedPincodes) {
      await this.checkServiceability(pincode.pincode);
    }
  }
}
```

---

#### Task 12.3: RTO Reverse Pickup Integration (50h)

**File:** `server/src/core/application/services/logistics/rto/rto.service.ts` (UPDATE)

**Replace TODO at line 395 with:**
```typescript
async scheduleReversePickup(rtoEvent: RTOEvent): Promise<ReversePickupResult> {
  const shipment = await this.shipmentRepo.findById(rtoEvent.shipmentId);

  // Get carrier adapter
  const adapter = this.carrierAdapterFactory.getAdapter(shipment.carrier);

  // Schedule reverse pickup
  const pickupResponse = await adapter.scheduleReversePickup({
    awb: shipment.awb,
    pickupAddress: shipment.consignee.address,
    returnAddress: shipment.shipper.address,
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),  // Next day
    contactPerson: shipment.consignee.name,
    contactPhone: shipment.consignee.phone
  });

  // Calculate RTO charges
  const rtoCharges = await this.calculateRTOCharges(shipment);

  // Update RTO event
  rtoEvent.reversePickup = {
    scheduled: true,
    pickupId: pickupResponse.pickupId,
    scheduledDate: pickupResponse.scheduledDate,
    charges: rtoCharges
  };

  await this.rtoRepo.update(rtoEvent._id, rtoEvent);

  // Deduct from wallet or hold shipment
  await this.processRTOCharges(shipment.companyId, rtoCharges, rtoEvent._id);

  return {
    success: true,
    pickupId: pickupResponse.pickupId,
    scheduledDate: pickupResponse.scheduledDate,
    charges: rtoCharges
  };
}

async calculateRTOCharges(shipment: Shipment): Promise<number> {
  // Get rate card for reverse logistics
  const rateCard = await this.rateCardRepo.findOne({
    carrier: shipment.carrier,
    serviceType: 'REVERSE'
  });

  if (!rateCard) {
    // Fallback: Use same rate as forward
    return shipment.shippingCost;
  }

  // Calculate based on weight and zone
  return this.pricingService.calculateShippingCost({
    carrier: shipment.carrier,
    origin: shipment.consignee.address,
    destination: shipment.shipper.address,
    weight: shipment.weight,
    serviceType: 'REVERSE'
  }).then(r => r.grandTotal);
}

private async processRTOCharges(
  companyId: ObjectId,
  charges: number,
  rtoEventId: ObjectId
): Promise<void> {
  try {
    await this.walletService.debit(companyId, charges, {
      type: 'RTO_CHARGE',
      reference: rtoEventId.toString(),
      description: `RTO reverse pickup charges`
    });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      // Mark shipment as payment pending
      await this.shipmentRepo.update(shipment._id, {
        status: 'payment_pending',
        paymentPending: {
          amount: charges,
          reason: 'rto_charges',
          rtoEventId
        }
      });
    } else {
      throw error;
    }
  }
}
```

---

## PHASE 1: COMPLETE COURIER INTEGRATIONS (Week 13-14)

**Already covered in Phase 0, Week 12**

---

## PHASE 2: ZONE SYSTEM & ADVANCED PRICING (Week 15)

### Task 15.1: Zone Assignment Service (40h)

**File:** `server/src/core/application/services/zone/zone.service.ts` (NEW)

```typescript
export class ZoneService {
  async determineZone(
    originPincode: string,
    destinationPincode: string
  ): Promise<Zone> {
    // Step 1: Get pincode details
    const origin = await this.pincodeRepo.findOne({ pincode: originPincode });
    const destination = await this.pincodeRepo.findOne({ pincode: destinationPincode });

    // Step 2: Check same city (Zone A)
    if (origin.city === destination.city) {
      return this.getZone('A');
    }

    // Step 3: Check same state (Zone B)
    if (origin.state === destination.state) {
      return this.getZone('B');
    }

    // Step 4: Check metro-to-metro (Zone C)
    if (this.isMetroCity(origin.city) && this.isMetroCity(destination.city)) {
      return this.getZone('C');
    }

    // Step 5: Check special zones (Northeast, J&K)
    if (this.isNortheastOrJK(destination.state)) {
      return this.getZone('E');
    }

    // Step 6: Default to Zone D (Rest of India)
    return this.getZone('D');
  }

  private isMetroCity(city: string): boolean {
    const metroCities = [
      'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
      'Kolkata', 'Pune', 'Ahmedabad'
    ];
    return metroCities.includes(city);
  }

  private isNortheastOrJK(state: string): boolean {
    const specialStates = [
      'Jammu & Kashmir', 'Ladakh',
      'Arunachal Pradesh', 'Assam', 'Manipur', 'Meghalaya',
      'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'
    ];
    return specialStates.includes(state);
  }

  private async getZone(zoneLetter: string): Promise<Zone> {
    return this.zoneRepo.findOne({ name: `Zone ${zoneLetter}` });
  }
}
```

---

## PHASE 3: INFRASTRUCTURE (Week 16-17)

### Docker & CI/CD (60h)
**Reference:** Implementation_Guide.md (already documented)

### Monitoring Stack (30h)
**Reference:** Enhanced_v2.md (already documented)

### Caching Strategy (20h)
**Reference:** Advanced.md (already documented)

---

## PHASE 4: ADVANCED FEATURES (Week 18-20)

**Reference:** Enhanced_v2.md for:
- Weight Disputes
- COD Remittance
- Fraud Detection
- Dispute Resolution
- Reverse Logistics

---

## PHASE 5: CODE QUALITY (Week 21-22)

### Fix 72 TODO Comments (80h)
### Add Type Safety (40h)
### Remove Hardcoded Values (20h)

---

## IMPLEMENTATION PRIORITY MATRIX

```
┌────────────────┬──────────────────────┬──────────┬──────────┐
│ Priority       │ Feature              │ Effort   │ Week     │
├────────────────┼──────────────────────┼──────────┼──────────┤
│ P0 (CRITICAL)  │ Pricing Calculation  │ 40h      │ Week 11  │
│ P0 (CRITICAL)  │ GST Calculation      │ 30h      │ Week 11  │
│ P0 (CRITICAL)  │ COD Charges          │ 20h      │ Week 11  │
│ P0 (CRITICAL)  │ Fix Hardcoded Rates  │ 35h      │ Week 11  │
│ P0 (CRITICAL)  │ Delhivery Adapter    │ 40h      │ Week 12  │
│ P0 (CRITICAL)  │ Ekart Adapter        │ 40h      │ Week 12  │
│ P0 (CRITICAL)  │ India Post Adapter   │ 40h      │ Week 12  │
│ P0 (CRITICAL)  │ RTO Reverse Pickup   │ 50h      │ Week 12  │
│ P1 (HIGH)      │ Serviceability       │ 35h      │ Week 13  │
│ P1 (HIGH)      │ Zone Service         │ 40h      │ Week 15  │
│ P1 (HIGH)      │ Docker/CI/CD         │ 60h      │ Week 16  │
│ P2 (MEDIUM)    │ Weight Disputes      │ 80h      │ Week 18  │
│ P2 (MEDIUM)    │ Fraud Detection      │ 60h      │ Week 19  │
│ P2 (LOW)       │ Code Quality         │ 140h     │ Week 21  │
└────────────────┴──────────────────────┴──────────┴──────────┘
```

---

## SUCCESS METRICS

### After Phase 0 (Week 12)
✅ `OrderService.calculateTotals()` returns correct tax and shipping
✅ All shipments have accurate pricing
✅ GST breakdown correct for all invoices
✅ COD charges applied automatically
✅ No hardcoded rates in code
✅ RTO reverse pickup automated

### After Phase 1 (Week 14)
✅ All 4 carriers fully integrated
✅ Real-time serviceability checks working
✅ Rate shopping across carriers possible

### After Phase 2 (Week 15)
✅ 5-zone system implemented
✅ Volumetric weight calculated
✅ Zone-specific pricing accurate

### After Phase 3 (Week 17)
✅ Docker deployment working
✅ CI/CD pipeline automated
✅ Monitoring dashboards live
✅ 99.9% uptime achieved

---

## TEAM ALLOCATION

**Backend Team (4 developers):**
- Dev 1: Pricing Calculation + GST Service
- Dev 2: Delhivery + Ekart Adapters
- Dev 3: India Post Adapter + RTO
- Dev 4: Zone Service + Serviceability

**Frontend Team (2 developers):**
- Dev 1: Pricing UI updates
- Dev 2: Carrier selection UI

**DevOps (1 developer):**
- Infrastructure setup
- CI/CD pipelines
- Monitoring

---

## IMMEDIATE NEXT STEPS

### This Week (Days 1-5):
- [ ] Day 1: Team review of this roadmap
- [ ] Day 2: Environment setup + RateCard seed data
- [ ] Day 3-5: Start PricingCalculationService implementation

### Next Week (Days 6-10):
- [ ] Complete PricingCalculationService
- [ ] Complete GSTCalculationService
- [ ] Begin CODSurchargeService

---

**End of Roadmap**

**Questions/Updates:** Modify this document as implementation progresses
**Version Control:** Track changes in git
**Review Cycle:** Weekly team sync to adjust priorities
