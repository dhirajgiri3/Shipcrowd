How Rates Work in Shipcrowd - Complete Flow Explanation
Last Updated: 2026-02-05
Audience: Product understanding & business logic

The Big Picture: Seller's Journey
When a seller creates an order in Shipcrowd, here's what happens step-by-step:

1. Seller Creates Order
   ↓
2. System Calculates Shipping Rates
   ↓
3. Order is Saved with Calculated Costs
   ↓
4. Seller Ships the Order (Creates Shipment)
   ↓
5. Courier Picks Up & Delivers
Let me break down each step in detail.

Step 1: Seller Creates an Order
What Happens
Endpoint: POST /api/v1/orders

The seller provides:

Customer details (name, phone, address with pincode)
Product details (name, SKU, quantity, price, weight)
Payment mode (COD or Prepaid)
Warehouse (pickup location)
Example Request
json
{
  "customerInfo": {
    "name": "Rahul Sharma",
    "phone": "+919876543210",
    "email": "rahul@example.com",
    "address": {
      "line1": "123 MG Road",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postalCode": "400001",
      "country": "India"
    }
  },
  "products": [
    {
      "name": "T-Shirt",
      "sku": "TS-001",
      "quantity": 2,
      "price": 500,
      "weight": 0.3
    }
  ],
  "paymentMethod": "cod",
  "warehouseId": "warehouse_id_here"
}
Step 2: System Automatically Calculates Shipping Rates
This is the magic part! When the order is created, the system automatically calculates how much shipping will cost.

How Rate Calculation Works
File: 
order.service.ts
 → 
calculateTotals()
 method (Lines 40-93)

typescript
static async calculateTotals(
    products,
    shipmentDetails: {
        companyId,
        fromPincode,  // From warehouse
        toPincode,    // To customer
        paymentMode,
        weight
    }
)
The Calculation Process
Step 2.1: Get Warehouse Pincode (Origin)
The system looks up the warehouse to get the origin pincode (where the package will be picked up from).

Step 2.2: Get Customer Pincode (Destination)
From the customer address, we have the destination pincode (where the package will be delivered).

Step 2.3: Call Dynamic Pricing Service
File: 
dynamic-pricing.service.ts
 → 
calculatePricing()
 method

This is where the real calculation happens. The service:

Determines the Zone (how far the delivery is)
Fetches the Rate Card (company's pricing rules)
Calculates Base Shipping Cost
Adds Surcharges (COD, Fuel, Remote Area)
Calculates GST
Returns Total Cost
Let me explain each sub-step:

Sub-Step A: Zone Determination
What is a Zone?

Zones represent delivery distance/complexity:

Zone A - Same city (fastest, cheapest)
Zone B - Same state
Zone C - Metro to metro
Zone D - Rest of India
Zone E - Remote areas (J&K, Northeast)
How it's calculated:

typescript
// File: pincode-lookup.service.ts
getZoneFromPincodes(fromPincode, toPincode) {
    // Compares pincodes to determine zone
    // Example: 110001 (Delhi) → 400001 (Mumbai) = Zone C
}
Example:

Delhi (110001) → Mumbai (400001) = Zone C (Metro to Metro)
Mumbai (400001) → Mumbai (400002) = Zone A (Same City)
Delhi (110001) → Srinagar (190001) = Zone E (Remote)
Sub-Step B: Fetch Rate Card
What is a Rate Card?

A Rate Card is a pricing configuration that defines how much to charge for shipping based on:

Weight
Zone
Carrier (Velocity, Delhivery, etc.)
Service Type (Standard, Express)
Database Model: 
RateCard
 collection

Each company has their own Rate Card with:

javascript
{
  companyId: "company_123",
  baseRates: [
    {
      carrier: "velocity",
      serviceType: "standard",
      minWeight: 0,
      maxWeight: 0.5,
      basePrice: 40  // ₹40 for 0-0.5kg
    },
    {
      carrier: "velocity",
      serviceType: "standard",
      minWeight: 0.5,
      maxWeight: 1.0,
      basePrice: 50  // ₹50 for 0.5-1kg
    }
  ],
  zoneMultipliers: {
    zoneA: 1.0,   // No extra charge for same city
    zoneB: 1.2,   // 20% extra for same state
    zoneC: 1.5,   // 50% extra for metro-to-metro
    zoneD: 1.8,   // 80% extra for rest of India
    zoneE: 2.5    // 150% extra for remote areas
  },
  fuelSurcharge: 10,  // 10% fuel surcharge
  codSurcharges: [
    { min: 0, max: 1000, type: "percentage", value: 2 },     // 2% for orders ₹0-1000
    { min: 1001, max: 5000, type: "percentage", value: 1.5 } // 1.5% for orders ₹1001-5000
  ]
}
Sub-Step C: Calculate Base Shipping Cost
File: 
dynamic-pricing.service.ts
 → 
calculateShippingCost()
 method (Lines 379-551)

This method:

Finds matching base rate for the weight
Applies zone multiplier
Returns breakdown
Example Calculation:

Package: 0.8 kg
Zone: C (Metro to Metro)
Carrier: Velocity
Step 1: Find base rate for 0.8kg
→ Matches slab: 0.5-1kg = ₹50
Step 2: Apply zone multiplier for Zone C
→ Zone C multiplier = 1.5
→ Base shipping = ₹50 × 1.5 = ₹75
Sub-Step D: Add Surcharges
D.1: COD Charge (if payment mode is COD)
typescript
if (paymentMode === 'cod' && orderValue) {
    // Find matching COD slab
    // Order value: ₹1000
    // Slab: 0-1000 = 2%
    codCharge = 1000 × 0.02 = ₹20
}
D.2: Fuel Surcharge
typescript
// Fuel surcharge is typically 10% of (base shipping + COD)
fuelCharge = (75 + 20) × 0.10 = ₹9.5
D.3: Remote Area Surcharge (if applicable)
typescript
if (isRemoteLocation) {
    remoteAreaCharge = ₹50  // Fixed charge
}
Sub-Step E: Calculate GST
File: gst.service.ts

GST calculation depends on whether shipping is intra-state or inter-state:

Intra-State (Same State):

CGST: 9%
SGST: 9%
Total: 18%
Inter-State (Different States):

IGST: 18%
Example:

Taxable Amount = ₹75 (shipping) + ₹20 (COD) + ₹9.5 (fuel) = ₹104.5
If Delhi → Mumbai (inter-state):
IGST = ₹104.5 × 0.18 = ₹18.81
If Mumbai → Mumbai (intra-state):
CGST = ₹104.5 × 0.09 = ₹9.40
SGST = ₹104.5 × 0.09 = ₹9.40
Total = ₹18.81
Sub-Step F: Final Total
Base Shipping:     ₹75.00
COD Charge:        ₹20.00
Fuel Surcharge:    ₹9.50
Remote Area:       ₹0.00
─────────────────────────
Subtotal:          ₹104.50
GST (18%):         ₹18.81
─────────────────────────
TOTAL:             ₹123.31
Step 3: Order is Saved with Calculated Costs
After calculating the shipping cost, the order is saved in the database with:

javascript
{
  orderNumber: "ORD-2026-001234",
  customerInfo: { ... },
  products: [ ... ],
  totals: {
    subtotal: 1000,      // Product total
    shipping: 75,        // Base shipping
    codCharge: 20,       // COD fee
    tax: 18.81,          // GST
    total: 1113.81       // Grand total
  },
  currentStatus: "pending",
  breakdown: {
    zone: "zoneC",
    baseCharge: 50,
    weightCharge: 0,
    zoneCharge: 25,
    fuelCharge: 9.5,
    cgst: 0,
    sgst: 0,
    igst: 18.81
  }
}
Important: At this point, the order is just created. No shipment has been booked with the courier yet.

Step 4: Seller Ships the Order (Creates Shipment)
What Happens
Endpoint: POST /api/v1/shipments

The seller (or system) creates an actual shipment with a courier partner.

Example Request
json
{
  "orderId": "order_id_here",
  "serviceType": "standard",
  "carrierOverride": "velocity"  // Optional: force specific courier
}
Shipment Creation Process
File: shipment.service.ts (not shown, but similar pattern)

Fetch the Order (with all details)
Select Courier (Velocity, Delhivery, etc.)
Call Courier API to create shipment
Get Tracking Number (AWB)
Save Shipment in database
Link Shipment to Order
Courier Selection Logic
File: 
carrier.service.ts
 → 
selectBestCarrier()
 method

The system can:

Use specific courier if seller chooses (e.g., "Use Delhivery")
Auto-select cheapest courier
Prefer Velocity (default, as it's the main integration)
Example:

typescript
// Get rates from all active couriers
const allRates = await getAllRates({
    fromPincode: "110001",
    toPincode: "400001",
    weight: 0.8,
    paymentMode: "cod"
});
// Returns:
[
    { carrier: "velocity", rate: 123.31, deliveryTime: 3 },
    { carrier: "delhivery", rate: 135.00, deliveryTime: 4 }  // If active
]
// System selects Velocity (cheapest + preferred)
Step 5: Courier Picks Up & Delivers
Once the shipment is created:

Courier assigns AWB (tracking number)
Pickup is scheduled (manifest creation)
Package is picked up from warehouse
In-transit tracking updates via webhooks
Delivery to customer
POD (Proof of Delivery) captured
How Rates are Calculated: Summary Flow
Order Created
Get Warehouse Pincode
Get Customer Pincode
Determine Zone A-E
Fetch Company Rate Card
Find Base Rate for Weight
Apply Zone Multiplier
Add COD Charge if COD
Add Fuel Surcharge
Add Remote Area Charge if applicable
Calculate GST
Return Total Cost
Save Order with Totals
Key Concepts Explained
1. Why Calculate Rates During Order Creation?
Answer: So the seller knows upfront how much shipping will cost before creating the shipment. This allows:

Transparent pricing to customers
Accurate order totals
Better margin calculations
2. What if the Seller Changes the Courier Later?
Answer: The rate is recalculated when the shipment is created. The order's saved rate is just an estimate. The actual charge comes from the courier's API.

3. How Do Different Couriers Have Different Rates?
Answer: Each courier (Velocity, Delhivery) has their own pricing. The Rate Card can have carrier-specific rates:

javascript
baseRates: [
    { carrier: "velocity", minWeight: 0, maxWeight: 0.5, basePrice: 40 },
    { carrier: "delhivery", minWeight: 0, maxWeight: 0.5, basePrice: 45 }
]
When calculating, the system matches the carrier:

If using Velocity → uses Velocity's rate (₹40)
If using Delhivery → uses Delhivery's rate (₹45)
4. What if No Rate Card Exists?
Answer: The system throws an error: "RateCard not found for company". Every company must have a Rate Card configured.

5. Can Rates Change After Order Creation?
Answer: Yes! Rates can change if:

Rate Card is updated
Courier changes pricing
Zone classification changes
The order's saved rate is a snapshot. The actual shipment cost is calculated when the shipment is created.

Rate Calculation Examples
Example 1: Simple Prepaid Order
From: Delhi (110001)
To: Mumbai (400001)
Weight: 0.5 kg
Payment: Prepaid
Carrier: Velocity
Zone: C (Metro to Metro)
Base Rate (0-0.5kg): ₹40
Zone Multiplier (C): 1.5
Base Shipping: ₹40 × 1.5 = ₹60
COD Charge: ₹0 (prepaid)
Fuel Surcharge (10%): ₹60 × 0.10 = ₹6
Subtotal: ₹66
GST (18% IGST): ₹66 × 0.18 = ₹11.88
TOTAL: ₹77.88
Example 2: COD Order with Heavy Package
From: Mumbai (400001)
To: Bangalore (560001)
Weight: 2.5 kg
Payment: COD
Order Value: ₹3000
Carrier: Velocity
Zone: C (Metro to Metro)
Base Rate (2-3kg): ₹80
Zone Multiplier (C): 1.5
Base Shipping: ₹80 × 1.5 = ₹120
COD Charge (1.5% for ₹1001-5000): ₹3000 × 0.015 = ₹45
Fuel Surcharge (10%): (₹120 + ₹45) × 0.10 = ₹16.50
Subtotal: ₹181.50
GST (18% IGST): ₹181.50 × 0.18 = ₹32.67
TOTAL: ₹214.17
Example 3: Remote Area Delivery
From: Delhi (110001)
To: Srinagar (190001)
Weight: 1 kg
Payment: Prepaid
Carrier: Velocity
Zone: E (Remote)
Base Rate (0.5-1kg): ₹50
Zone Multiplier (E): 2.5
Base Shipping: ₹50 × 2.5 = ₹125
COD Charge: ₹0
Fuel Surcharge (10%): ₹125 × 0.10 = ₹12.50
Remote Area Charge: ₹50
Subtotal: ₹187.50
GST (18% IGST): ₹187.50 × 0.18 = ₹33.75
TOTAL: ₹221.25
Where Rates Come From
1. Internal Rate Cards (Primary Source)
Database: 
RateCard
 collection

Each company configures their own pricing rules. This is the primary source for Velocity and other couriers when using internal pricing.

2. Live Courier APIs (Secondary Source)
For some couriers (like Delhivery when active), the system can call the courier's live rate API:

File: 
delhivery.provider.ts
 → 
getRates()
 method

typescript
async getRates(request) {
    // Calls Delhivery API: /api/kinko/v1/invoice/charges/.json
    // Returns real-time rates from Delhivery
}
When is this used?

When Delhivery integration is active
When seller specifically selects Delhivery
For rate comparison (showing multiple courier options)
3. Hybrid Approach
Shipcrowd uses a hybrid model:

typescript
// For Velocity: Use internal Rate Card
const velocityRate = await DynamicPricingService.calculatePricing({
    carrier: 'velocity',
    // ... other params
});
// For Delhivery (if active): Use live API
const delhiveryRate = await DelhiveryProvider.getRates({
    // ... params
});
// Show both to seller for comparison
Configuration: How to Set Up Rates
Admin Creates Rate Card
UI: Admin Panel → Rate Cards → Create New

Fields:

Base Rates (weight slabs)
Zone Multipliers (A-E)
COD Surcharges (percentage or flat)
Fuel Surcharge (percentage)
Remote Area Charge (flat amount)
Minimum Call (minimum charge per shipment)
Example Rate Card Setup
javascript
{
  name: "Standard Velocity Rates",
  carrier: "velocity",
  baseRates: [
    { minWeight: 0, maxWeight: 0.5, basePrice: 40 },
    { minWeight: 0.5, maxWeight: 1, basePrice: 50 },
    { minWeight: 1, maxWeight: 2, basePrice: 70 },
    { minWeight: 2, maxWeight: 5, basePrice: 100 }
  ],
  zoneMultipliers: {
    zoneA: 1.0,
    zoneB: 1.2,
    zoneC: 1.5,
    zoneD: 1.8,
    zoneE: 2.5
  },
  fuelSurcharge: 10,  // 10%
  codSurcharges: [
    { min: 0, max: 1000, type: "percentage", value: 2 },
    { min: 1001, max: 5000, type: "percentage", value: 1.5 },
    { min: 5001, max: 999999, type: "percentage", value: 1 }
  ],
  minimumCall: 30  // Minimum ₹30 per shipment
}
Caching & Performance
Why Caching?
Rate calculation involves:

Database queries (Rate Card, Zones)
Pincode lookups
Complex calculations
To avoid repeating this for every order, Shipcrowd uses Redis caching.

What is Cached?
Zone lookups (pincode → zone mapping)
Rate Cards (company's pricing rules)
Pincode details (city, state, serviceable)
File: pricing-cache.service.ts

typescript
// Cache zone for 24 hours
await cacheZone(fromPincode, toPincode, zone);
// Cache rate card for 1 hour
await cacheRateCardById(rateCardId, rateCard);
Cache Invalidation
When a Rate Card is updated:

typescript
// Admin updates rate card
await RateCard.updateOne({ _id }, updates);
// Invalidate cache
await pricingCache.invalidateRateCard(rateCardId);
Common Questions
Q1: Why do I see different rates for the same route?
Answer: Rates can vary based on:

Weight (heavier = more expensive)
Payment mode (COD adds extra charge)
Courier (Velocity vs Delhivery have different pricing)
Service type (Express vs Standard)
Time (Rate Card might have been updated)
Q2: Can I offer free shipping to customers?
Answer: Yes! You can:

Absorb the shipping cost in product price
Set up a customer discount in the Rate Card
Use promotional codes (if implemented)
Q3: How accurate are the rates?
Answer:

Internal Rate Card rates: 100% accurate (you control them)
Live API rates: Depends on courier's API (usually accurate)
Estimates: Order creation rates are estimates; final charge is at shipment creation
Q4: What happens if the courier charges more than estimated?
Answer: The actual charge from the courier is recorded in the shipment. Any difference is tracked for reconciliation.

Technical Files Reference
File	Purpose
order.service.ts
Order creation & rate calculation trigger
dynamic-pricing.service.ts
Main rate calculation engine
carrier.service.ts
Multi-courier rate comparison
pincode-lookup.service.ts	Zone determination
gst.service.ts	GST calculation
cod-charge.service.ts	COD fee calculation
pricing-cache.service.ts	Redis caching for performance
delhivery.provider.ts
Delhivery live rate API
velocity-shipfast.provider.ts
Velocity integration
Conclusion
In Simple Terms:

Seller creates order with customer address
System calculates shipping using:
Distance (zone)
Weight
Payment mode
Company's rate card
Order is saved with estimated cost
Seller ships by creating shipment
Courier delivers package
The rate calculation is automatic, transparent, and configurable through Rate Cards. This ensures sellers always know shipping costs upfront, and the system can support multiple couriers with different pricing models.