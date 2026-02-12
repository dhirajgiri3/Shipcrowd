# 📦 Shipcrowd Admin Guide - Complete Beginner's Edition

**For**: First-time admins who are new to shipping aggregator software
**Last Updated**: February 2026
**Difficulty**: Beginner-friendly with detailed explanations

---

## 🎯 Table of Contents

1. [What is Shipcrowd? (Basics)](#what-is-shipcrowd)
2. [How Shipping Aggregators Work](#how-shipping-aggregators-work)
3. [Your Role as Admin](#your-role-as-admin)
4. [Core Concepts Explained Simply](#core-concepts)
5. [Step-by-Step Admin Workflows](#step-by-step-workflows)
   - [Integrating a New Courier](#integrating-courier)
   - [Creating Courier Services](#creating-services)
   - [Setting Up Rate Cards](#setting-up-rate-cards)
   - [Managing Seller Policies](#managing-policies)
6. [How Orders Work (Real World)](#how-orders-work)
7. [Pricing System Explained](#pricing-system)
8. [External Courier APIs](#external-apis)
9. [Troubleshooting Common Issues](#troubleshooting)
10. [Quick Reference](#quick-reference)

---

## 🌟 What is Shipcrowd? {#what-is-shipcrowd}

### The Simple Explanation

Imagine you're running an e-commerce business. You need to ship products to customers all over India. But working with just one courier company has problems:

- **Problem 1**: Some couriers don't deliver to all pincodes
- **Problem 2**: Different couriers have different prices
- **Problem 3**: Some are fast but expensive, others are cheap but slow
- **Problem 4**: Managing 5 different courier accounts is messy

**Shipcrowd solves this by being a "one-stop shop":**

```
Your E-commerce Store (Seller)
            ↓
     Shipcrowd Platform (Aggregator)
            ↓
    ┌───────┼───────┬────────┐
    ↓       ↓       ↓        ↓
Velocity  Delhivery  Ekart  Shift
(Fast)    (Reliable) (Cheap) (Volume)
```

### What Does "Aggregator" Mean?

An **aggregator** collects services from multiple courier companies and offers them through one platform. Instead of your sellers juggling 5 different courier websites, they use Shipcrowd and we handle all the courier connections behind the scenes.

### Real-World Example

**Before Shipcrowd:**
- Seller logs into Delhivery website → Creates shipment
- Logs into Ekart website → Creates another shipment
- Logs into Velocity website → Creates third shipment
- Manually compares prices every time
- Tracks shipments on 5 different websites

**After Shipcrowd:**
- Seller logs into Shipcrowd once
- System shows all courier options with prices
- Creates shipment with one click
- Tracks all shipments in one place
- We handle all the complexity!

---

## 🚚 How Shipping Aggregators Work {#how-shipping-aggregators-work}

### The Players

1. **Seller** = E-commerce business (your customer)
   - Example: A shoe store selling on Shopify

2. **Shipcrowd (You)** = The middle platform
   - You connect sellers to couriers
   - You negotiate prices with couriers
   - You add a small margin for profit

3. **Couriers** = Delivery companies (Velocity, Delhivery, Ekart, Shift)
   - They physically pick up and deliver packages
   - They provide APIs (automated connections) to create shipments

### The Flow of a Shipment

```
1. Customer Orders Shoes
   ↓
2. Seller Creates Order in Shipcrowd
   ↓
3. Shipcrowd Asks All Couriers: "How much to deliver?"
   ↓
   Velocity: Rs 85 (2 days)
   Delhivery: Rs 75 (3 days)
   Ekart: Rs 65 (4 days)
   ↓
4. Shipcrowd Shows Options to Seller
   ↓
5. Seller Picks Delhivery (balanced)
   ↓
6. Shipcrowd Tells Delhivery: "Create shipment!"
   ↓
7. Delhivery Gives Tracking Number
   ↓
8. Shipcrowd Sends Tracking to Seller & Customer
   ↓
9. Package Gets Delivered
   ↓
10. Everyone Happy! 🎉
```

---

## 👨‍💼 Your Role as Admin {#your-role-as-admin}

As the **first admin**, you're responsible for setting up and managing the entire courier system. Think of yourself as the **system architect**.

### Your Main Responsibilities

| Task | What It Means | Example |
|------|---------------|---------|
| **Courier Integration** | Connect Shipcrowd to courier APIs | Adding Ekart credentials |
| **Service Configuration** | Define what services are available | "Ekart Standard" vs "Ekart Express" |
| **Rate Card Management** | Set pricing rules for each service | Zone A: 0-1kg = Rs 50 |
| **Policy Management** | Control which sellers can use which couriers | Block Ekart for Seller X |
| **Monitor Health** | Ensure all systems are working | Check if Velocity API is down |

### What You Need to Know

1. **Basic courier terminology** (we'll teach you!)
2. **How to read API documentation** (we'll guide you!)
3. **Understanding pricing structures** (we'll explain!)
4. **Basic troubleshooting** (we'll show you!)

---

## 📚 Core Concepts Explained Simply {#core-concepts}

### 1. Courier / Provider

**What it is**: A delivery company like Velocity, Delhivery, Ekart.

**Example**:
```
Courier Name: Ekart
Status: Active
Capabilities:
  - COD Support: Yes
  - Max Weight: 30 kg
  - Serviceable Pincodes: 18,000+
```

**In Real Life**: Like choosing between FedEx, UPS, or DHL for international shipping.

---

### 2. Integration

**What it is**: The connection between Shipcrowd and a courier's computer system (API).

**Think of it like**: Plugging in a USB cable to connect two devices.

**What You Store**:
```
Integration for Ekart:
  - Client ID: "ekart_client_12345"
  - Username: "shipcrowd_api_user"
  - Password: "SecurePassword123!" (encrypted)
  - Status: Active
```

**Why Needed**: Without this, Shipcrowd can't talk to Ekart's system automatically.

---

### 3. Service

**What it is**: A specific shipping option offered by a courier.

**Example**:
```
Service: Ekart Standard
  - Courier: Ekart
  - Type: Surface (road transport)
  - Speed: 3-5 days
  - Max Weight: 30 kg
  - COD Limit: Rs 1,00,000
```

**Real-World Analogy**:
- **Ekart Standard** = Economy shipping (slow, cheap)
- **Ekart Express** = Priority shipping (fast, expensive)

**Why Multiple Services?**
Different customers have different needs:
- Budget seller → Chooses Standard (cheap)
- Premium brand → Chooses Express (fast)

---

### 4. Zone

**What it is**: A geographic grouping of pincodes based on distance or location.

**How Couriers Use Zones**:
```
Zone A: Within same city (500 km)
  - Mumbai → Mumbai
  - Delhi → Gurgaon
  - Pincodes: 110001-110096, 400001-400104

Zone B: Within same region (500-1000 km)
  - Mumbai → Pune
  - Delhi → Jaipur

Zone C: Cross-region (1000-1500 km)
  - Mumbai → Hyderabad
  - Delhi → Kolkata

Zone D: Very far (1500-2000 km)
  - Mumbai → Bangalore

Zone E: Farthest / Remote (2000+ km)
  - Mumbai → Northeast states
  - Remote areas
```

**Why Zones Matter**: Pricing changes based on distance!

```
Ekart Standard Pricing:
  - Zone A: Rs 50 (nearby)
  - Zone C: Rs 100 (far)
  - Zone E: Rs 150 (very far)
```

---

### 5. Weight

**Two Types of Weight**:

#### a) Actual Weight
The physical weight when you put the package on a scale.
```
Example: 1.5 kg shoes
```

#### b) Volumetric Weight
Weight calculated from package size (length × width × height).

**Why?** Couriers hate delivering huge boxes that weigh nothing (wastes space).

**Formula**:
```
Volumetric Weight = (Length × Width × Height) / 5000

Example:
Box: 40 cm × 30 cm × 20 cm
Volumetric = (40 × 30 × 20) / 5000 = 4.8 kg

Even if shoes inside weigh only 1.5 kg!
```

**Chargeable Weight** = MAX(Actual Weight, Volumetric Weight)
```
Chargeable = MAX(1.5 kg, 4.8 kg) = 4.8 kg
You pay for 4.8 kg because box is bulky!
```

---

### 6. Rate Card

**What it is**: A pricing table that defines how much to charge for shipping.

**Two Types**:

#### Cost Card
How much the **courier charges us** (Shipcrowd).

```
Ekart Cost Card (Zone A):
  0.0 - 0.5 kg:  Rs 40
  0.5 - 1.0 kg:  Rs 50
  1.0 - 2.0 kg:  Rs 65
  2.0 - 5.0 kg:  Rs 80
  5.0+ kg:       Rs 90 + Rs 10 per extra kg
```

#### Sell Card
How much **we charge the seller** (with our margin).

```
Ekart Sell Card (Zone A):
  0.0 - 0.5 kg:  Rs 50   (+25% margin)
  0.5 - 1.0 kg:  Rs 60   (+20% margin)
  1.0 - 2.0 kg:  Rs 75   (+15% margin)
  2.0 - 5.0 kg:  Rs 95   (+19% margin)
  5.0+ kg:       Rs 105 + Rs 12 per extra kg
```

**How We Make Money**:
```
Seller pays us:     Rs 75
We pay Ekart:      -Rs 65
Our profit:        Rs 10 (margin)
```

---

### 7. COD (Cash on Delivery)

**What it is**: Customer pays cash when package is delivered (instead of paying online).

**COD Charges**:
Couriers charge extra for COD because:
- Risk of customer refusing package
- Driver carries cash (security risk)
- Extra accounting work

**Example**:
```
Ekart COD Charges:
  - 2% of order value
  - Minimum: Rs 30
  - Maximum: Rs 500

Order Value: Rs 5,000
COD Charge: 2% × 5000 = Rs 100 ✓ (within limits)

Order Value: Rs 500
COD Charge: 2% × 500 = Rs 10 → Rs 30 (minimum applied)
```

---

### 8. NDR (Non-Delivery Report)

**What it is**: When courier tries to deliver but fails.

**Common Reasons**:
```
❌ Customer not at home
❌ Wrong address given
❌ Customer refused package
❌ Phone switched off
❌ Incomplete address
```

**What Happens**:
```
1. Courier marks "Undelivered"
2. Shipcrowd gets webhook notification
3. System detects NDR pattern
4. Admin/Seller can:
   - Retry delivery (reattempt)
   - Update address
   - Cancel and RTO (Return to Origin)
```

---

### 9. RTO (Return to Origin)

**What it is**: Package is sent back to the seller.

**When it Happens**:
```
Scenario 1: Multiple failed delivery attempts
  Day 1: Customer not home → NDR
  Day 2: Wrong address → NDR
  Day 3: Customer refuses → RTO initiated

Scenario 2: Customer explicitly refuses package

Scenario 3: Address unserviceable (courier can't reach)
```

**RTO Charges**:
Seller pays twice!
```
Forward Shipping:  Rs 75 (Mumbai → Pune)
RTO Shipping:     +Rs 75 (Pune → Mumbai)
Total Loss:        Rs 150 (no delivery happened!)
```

---

## 🛠️ Step-by-Step Admin Workflows {#step-by-step-workflows}

### Workflow 1: Integrating a New Courier {#integrating-courier}

Let's walk through integrating **Ekart** step by step.

#### Step 1: Get API Credentials from Ekart

You need to contact Ekart's business team and request API access.

**What They'll Give You**:
```
Client ID: "ekart_client_shipcrowd"
Username:  "api_user_shipcrowd"
Password:  "SecurePass123!"
Base URL:  "https://api.ekartlogistics.com"
```

**Documents You'll Receive**:
- API documentation (PDF)
- Authentication guide
- Rate card (Excel sheet)
- List of serviceable pincodes

---

#### Step 2: Test Credentials Manually

Before adding to Shipcrowd, test if credentials work:

```bash
# Using Postman or cURL:
POST https://api.ekartlogistics.com/integrations/v2/auth/token/ekart_client_shipcrowd
Headers:
  Content-Type: application/json
Body:
{
  "username": "api_user_shipcrowd",
  "password": "SecurePass123!"
}

# Expected Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

✅ **If you get a token** → Credentials are correct!
❌ **If error 401** → Username/password wrong
❌ **If error 403** → Account not activated yet

---

#### Step 3: Add Integration in Shipcrowd Admin Panel

Navigate to: **Admin Panel → Couriers → Add Integration**

**Form Fields**:
```
Provider:      [Select: Ekart]
Client ID:     ekart_client_shipcrowd
Username:      api_user_shipcrowd
Password:      ••••••••••••••••••
Status:        [✓] Active
```

**What Happens Behind the Scenes**:
```javascript
// Shipcrowd stores encrypted credentials
Integration.create({
  companyId: "your_company_123",
  provider: "ekart",
  credentials: {
    clientId: "ekart_client_shipcrowd",
    username: encrypt("api_user_shipcrowd"),
    password: encrypt("SecurePass123!")  // Never stored plain!
  },
  settings: {
    isActive: true,
    baseUrl: "https://api.ekartlogistics.com"
  }
});
```

---

#### Step 4: Test Connection

Click **"Test Connection"** button.

**What the System Does**:
```
1. Fetches stored credentials
2. Calls Ekart authentication API
3. Tries to get a token
4. If successful, shows ✓ green checkmark
5. If fails, shows ❌ with error message
```

**Possible Errors**:
```
❌ "Authentication failed"
   → Re-check username/password

❌ "Network timeout"
   → Check if Ekart API is down

❌ "Invalid client ID"
   → Contact Ekart to verify client ID
```

---

### Workflow 2: Creating Courier Services {#creating-services}

Now that Ekart is integrated, you need to define **what services** Ekart offers.

#### Understanding Ekart's Services

From Ekart's documentation, they offer:

```
Service 1: Ekart Standard (Surface)
  - Transport: Road
  - Speed: 4-6 days
  - Cost: Economical
  - Max Weight: 30 kg

Service 2: Ekart Express (Air)
  - Transport: Air
  - Speed: 1-2 days
  - Cost: Premium
  - Max Weight: 15 kg
```

---

#### Step 1: Create "Ekart Standard" Service

Navigate to: **Admin → Couriers → Ekart → Services → Add Service**

**Form**:
```
Basic Info:
  Service Code:     EKART_STANDARD    (unique identifier)
  Display Name:     Ekart Standard    (shown to sellers)
  Service Type:     Surface           (road transport)
  Status:           Active

Constraints:
  Min Weight:       0.1 kg
  Max Weight:       30 kg
  Max COD Value:    Rs 1,00,000
  Max Prepaid Val:  Rs 50,000
  Payment Modes:    [✓] COD  [✓] Prepaid

SLA (Service Level Agreement):
  Min EDD (Days):   4    (earliest delivery)
  Max EDD (Days):   6    (latest delivery)

Zone Support:
  [✓] Zone A  [✓] Zone B  [✓] Zone C
  [✓] Zone D  [✓] Zone E
```

**What Each Field Means**:

- **Service Code**: Internal code (used in code)
  Example: When creating shipment, system checks `service.serviceCode === 'EKART_STANDARD'`

- **Display Name**: What sellers see in dropdown
  Example: "Ekart Standard (4-6 days)"

- **Service Type**: Transport method
  - `surface` = Road (slow, cheap)
  - `express` = Mix (medium)
  - `air` = Flight (fast, expensive)

- **Constraints**: Validation rules
  Example: If order is 35 kg → System rejects because > 30 kg max

- **SLA**: Delivery promise
  Example: If created on Monday → Delivery by Thursday-Saturday

- **Zone Support**: Where this service delivers
  Example: Ekart Standard delivers everywhere (all zones)

---

#### Step 2: Create "Ekart Express" Service

Same process, different values:

```
Service Code:     EKART_EXPRESS
Display Name:     Ekart Express
Service Type:     Air
Max Weight:       15 kg   (lighter for air transport)
Min EDD:          1 day
Max EDD:          2 days
```

---

#### Step 3: Verify Services are Active

Navigate to: **Admin → Couriers → Ekart**

You should see:
```
┌─────────────────────────────────────────────────┐
│ Ekart Services                                  │
├─────────────────────────────────────────────────┤
│ ✓ Ekart Standard   Surface   4-6 days   Active │
│ ✓ Ekart Express    Air       1-2 days   Active │
└─────────────────────────────────────────────────┘
```

---

### Workflow 3: Setting Up Rate Cards {#setting-up-rate-cards}

Rate cards define **how much to charge** for each service.

#### Understanding Rate Card Structure

```
Rate Card Components:
1. Zone Rules     → Different prices for different zones
2. Weight Slabs   → Different prices for weight ranges
3. COD Rules      → Extra charge if Cash on Delivery
4. Fuel Surcharge → Extra percentage for fuel costs
5. GST            → 5% tax (auto-calculated)
```

---

#### Step 1: Get Ekart's Cost Rate Card

Ekart sends you their pricing (what they charge you):

**Ekart Cost Rate Card - Zone A** (example):
```
Weight Range     |  Charge
─────────────────┼─────────
0.0 - 0.5 kg     |  Rs 40
0.5 - 1.0 kg     |  Rs 50
1.0 - 2.0 kg     |  Rs 65
2.0 - 5.0 kg     |  Rs 80
5.0+ kg          |  Rs 90 + Rs 10/kg

COD: 2% (min Rs 30, max Rs 500)
Fuel Surcharge: 2.5%
```

---

#### Step 2: Create Cost Card in Shipcrowd

Navigate to: **Admin → Rate Cards → Create Rate Card**

**Basic Info**:
```
Service:          [Select: Ekart Standard]
Card Type:        Cost      (what Ekart charges us)
Source Mode:      TABLE     (static pricing, not live API)
Currency:         INR
Status:           Active

Effective Dates:
  Start Date:     2026-01-01
  End Date:       2026-12-31  (1 year validity)
```

**Calculation Settings**:
```
Weight Basis:     Max (Actual vs Volumetric)
Rounding Unit:    0.5 kg
Rounding Mode:    Ceil (always round up)
DIM Divisor:      5000

Example:
  Weight: 1.2 kg → Rounded to 1.5 kg (ceil to 0.5)
  Volumetric: (30×20×15)/5000 = 1.8 kg
  Chargeable: MAX(1.5, 1.8) = 1.8 kg
```

---

#### Step 3: Add Zone A Rules

**Weight Slabs**:
```
Zone: Zone A

Slab 1:
  Min Weight:     0.0 kg
  Max Weight:     0.5 kg
  Charge:         Rs 40

Slab 2:
  Min Weight:     0.5 kg
  Max Weight:     1.0 kg
  Charge:         Rs 50

Slab 3:
  Min Weight:     1.0 kg
  Max Weight:     2.0 kg
  Charge:         Rs 65

Slab 4:
  Min Weight:     2.0 kg
  Max Weight:     5.0 kg
  Charge:         Rs 80

Additional Per Kg (beyond 5 kg):  Rs 10
```

**COD Rule**:
```
Type:             Percentage
Percentage:       2%
Min Charge:       Rs 30
Max Charge:       Rs 500
```

**Fuel Surcharge**:
```
Percentage:       2.5%
Applied On:       Freight + COD
```

---

#### Step 4: Repeat for All Zones

You need to add rules for Zone B, C, D, E (each has different pricing).

**Typical Pattern** (example):
```
Zone    | 0-0.5kg | 0.5-1kg | 1-2kg | 2-5kg
────────┼─────────┼─────────┼───────┼──────
Zone A  | Rs 40   | Rs 50   | Rs 65 | Rs 80
Zone B  | Rs 50   | Rs 60   | Rs 75 | Rs 95
Zone C  | Rs 65   | Rs 80   | Rs 100| Rs 125
Zone D  | Rs 80   | Rs 100  | Rs 125| Rs 160
Zone E  | Rs 100  | Rs 125  | Rs 160| Rs 200
```

---

#### Step 5: Create Sell Card (With Markup)

Now create a **second rate card** for what you charge sellers.

**Same process**, but with **higher prices** (your margin):

```
Service:          [Select: Ekart Standard]
Card Type:        Sell     (what we charge sellers)
Source Mode:      TABLE
```

**Zone A Slabs (with 15-25% markup)**:
```
Slab 1:  0.0-0.5kg  →  Rs 50   (was Rs 40, +25%)
Slab 2:  0.5-1.0kg  →  Rs 60   (was Rs 50, +20%)
Slab 3:  1.0-2.0kg  →  Rs 75   (was Rs 65, +15%)
Slab 4:  2.0-5.0kg  →  Rs 95   (was Rs 80, +19%)
Additional:         →  Rs 12/kg (was Rs 10, +20%)
```

**Your Profit**:
```
Example: 1.5 kg shipment in Zone A

Seller pays (Sell Card):    Rs 75
Ekart charges (Cost Card): -Rs 65
Your margin:                Rs 10 (13% profit)
```

---

#### Step 6: Test Rate Card

Click **"Simulate Pricing"** button:

**Test Input**:
```
From Pincode:   110001  (Delhi - Zone A origin)
To Pincode:     400001  (Mumbai - Zone C)
Weight:         1.5 kg
Dimensions:     30 × 20 × 15 cm
Payment Mode:   COD
Order Value:    Rs 5,000
```

**Expected Output**:
```
Chargeable Weight:  1.8 kg (volumetric higher)
Zone:               C
Weight Slab:        1.0-2.0 kg
Base Charge:        Rs 100
COD Charge:         Rs 100 (2% of Rs 5,000)
Subtotal:           Rs 200
Fuel Surcharge:     Rs 5 (2.5% of Rs 200)
Taxable:            Rs 205
GST (5%):           Rs 10.25
─────────────────────────────────
TOTAL:              Rs 215.25 → Rs 215
```

✅ If calculation matches your Excel → Rate card is correct!

---

### Workflow 4: Managing Seller Policies {#managing-policies}

Policies control **which couriers** a seller can use.

#### Why Policies?

**Scenario 1**: Seller had bad experience with Ekart
```
Solution: Block Ekart for this seller
→ They only see Velocity & Delhivery options
```

**Scenario 2**: Seller wants cheapest always
```
Solution: Auto-select cheapest courier
→ No manual selection needed
```

**Scenario 3**: Seller needs fast delivery
```
Solution: Prioritize speed over price
→ Show Express services first
```

---

#### Step 1: Create Policy for Seller

Navigate to: **Admin → Sellers → [Select Seller] → Courier Policy**

**Allowlist (Whitelist)**:
```
Allowed Providers:
  [✓] Velocity
  [✓] Delhivery
  [✓] Ekart
  [✗] Shift  (not allowed for this seller)

Allowed Services:
  [✓] Velocity Express
  [✓] Delhivery Surface
  [✓] Ekart Standard
  [✗] Ekart Express  (blocked - too expensive for this seller)
```

**Blocklist (Blacklist)**:
```
Blocked Providers:
  [✓] Shift  (seller complained about service)

Blocked Services:
  [✓] Ekart Express  (seller's margin too low)
```

**Selection Mode**:
```
Options:
  ○ Manual Only           → Seller must choose
  ○ Manual with Recommend → Show recommendation, seller decides
  ● Auto                  → System picks automatically

Auto Priority (if Auto selected):
  Options:
    ● Price     → Always cheapest
    ○ Speed     → Always fastest
    ○ Balanced  → Fast within budget

Balanced Delta: 5%  (if Balanced selected)
  → Pick fastest option within 5% of cheapest price
```

---

#### Step 2: Understand Selection Modes

**Example Scenario**: 1.5 kg shipment, Mumbai → Pune

**Available Options**:
```
1. Velocity Express   Rs 90   (1 day)
2. Delhivery Surface  Rs 75   (3 days)
3. Ekart Standard     Rs 65   (4 days)
```

**Selection Mode Outcomes**:

**Mode 1: Manual Only**
```
→ Show all 3 options
→ No recommendation
→ Seller picks based on their preference
```

**Mode 2: Manual with Recommendation**
```
→ Show all 3 options
→ Recommend: Ekart Standard (cheapest) ⭐
→ Seller can override and pick Velocity if urgent
```

**Mode 3: Auto (Price Priority)**
```
→ System automatically picks Ekart Standard (cheapest)
→ Seller doesn't even see the options
→ Shipment created immediately with Ekart
```

**Mode 4: Auto (Speed Priority)**
```
→ System automatically picks Velocity Express (fastest)
→ Seller pays more for speed
```

**Mode 5: Auto (Balanced 5%)**
```
Cheapest: Rs 65
Budget: Rs 65 × 1.05 = Rs 68.25

→ Filter: Ekart (Rs 65) ✓  Delhivery (Rs 75) ✗  Velocity (Rs 90) ✗
→ Only Ekart within budget
→ Pick Ekart (fastest among budget options)

If both Ekart and Delhivery were within 5%:
→ Pick Delhivery (faster: 3 days vs 4 days)
```

---

## 📦 How Orders Work (Real World) {#how-orders-work}

Let's follow a **real order** from creation to delivery.

### Example: Shoe Store Order

**Customer**: Priya in Mumbai
**Seller**: ShoeKart (online shoe store)
**Product**: Running shoes (1.2 kg, Rs 3,500)
**Payment**: Cash on Delivery (COD)

---

### Step 1: Order Created

**ShoeKart receives order** on their Shopify store:

```
Order Details:
  Customer: Priya Sharma
  Phone: +91 98765 43210
  Address:
    Flat 301, Sunshine Apartments
    Andheri West
    Mumbai, Maharashtra
    Pincode: 400053

  Product: Nike Air Zoom (Running Shoes)
  SKU: NIKE-AIR-001
  Quantity: 1
  Weight: 1.2 kg
  Dimensions: 30 × 20 × 15 cm
  Price: Rs 3,500

  Payment: Cash on Delivery (COD)
  Total: Rs 3,500
```

**Shopify Integration**:
```
Shopify Order Created
       ↓
Webhook sent to Shipcrowd
       ↓
Shipcrowd creates Order automatically
       ↓
Order Number: ORD-20260212-0001
Status: Pending
```

---

### Step 2: Risk Assessment

**Shipcrowd automatically checks** for fraud signals:

```
Risk Factors Analyzed:
  ✓ Phone number valid? Yes (+91 98765 43210)
  ✓ Address complete? Yes (has flat, area, pincode)
  ✓ Pincode serviceable? Yes (Mumbai 400053)
  ✓ COD value reasonable? Yes (Rs 3,500 < Rs 10,000 limit)
  ✓ Customer history? New (first order)
  ✗ High-risk pincode? No (Mumbai is safe)

Risk Score: 35/100
Risk Level: Low ✓
COD Eligible: Yes ✓
```

**What Happens**:
```
Low Risk → Order approved automatically
High Risk → Requires manual review before shipping
```

---

### Step 3: ShoeKart Creates Shipment

**ShoeKart logs into Shipcrowd** and creates shipment.

**System asks**:
```
Pickup Warehouse?
  → Select: Mumbai Warehouse (Pincode: 400001)

Delivery Address?
  → Auto-filled from order (Pincode: 400053)

Weight?
  → Auto-filled: 1.2 kg (from product)

Dimensions?
  → Auto-filled: 30 × 20 × 15 cm

Payment Mode?
  → COD (Rs 3,500)
```

---

### Step 4: Quote Generation

**Shipcrowd calls all courier APIs** (parallel):

**Request to Velocity**:
```http
POST https://velocity-api.com/serviceability
{
  "from": "400001",
  "to": "400053",
  "weight": 1.2,
  "payment_mode": "COD"
}
```

**Response from Velocity**:
```json
{
  "serviceable": true,
  "zone": "A",
  "carriers": [
    {
      "name": "Velocity Express",
      "rate": 85,
      "edd": "1 day"
    }
  ]
}
```

**Request to Delhivery**:
```http
POST https://delhivery-api.com/rates
{
  "origin_pincode": "400001",
  "destination_pincode": "400053",
  "weight": 1.2,
  "cod_amount": 3500
}
```

**Response from Delhivery**:
```json
{
  "zone": "A",
  "freight_charge": 65,
  "cod_charge": 70,
  "total": 135,
  "edd_days": 2
}
```

**Request to Ekart**:
```http
POST https://ekart-api.com/price-estimate
{
  "pickupPincode": 400001,
  "dropPincode": 400053,
  "weight": 1200,
  "codAmount": 3500
}
```

**Response from Ekart**:
```json
{
  "shippingCharge": 55,
  "codCharge": 70,
  "total": 125,
  "zone": "A"
}
```

---

### Step 5: Shipcrowd Calculates Prices

**Using Rate Cards** (our pricing):

**Velocity Express** (our sell card):
```
Weight: 1.2 kg → Chargeable: 1.5 kg (rounded to 0.5)
Zone: A
Slab: 1.0-2.0 kg = Rs 90 (base)
COD: 2% × 3500 = Rs 70
Fuel: 2.5% × (90+70) = Rs 4
Subtotal: Rs 164
GST (5%): Rs 8.2
─────────────────
Total: Rs 172

Cost to us (from Velocity): Rs 85
Our margin: Rs 172 - Rs 85 = Rs 87 (high margin!)
```

**Delhivery Surface** (our sell card):
```
Weight: 1.5 kg (chargeable)
Zone: A
Base: Rs 75
COD: Rs 70
Fuel: Rs 3.6
Subtotal: Rs 148.6
GST: Rs 7.4
─────────────────
Total: Rs 156

Cost to us: Rs 135
Margin: Rs 21
```

**Ekart Standard** (our sell card):
```
Weight: 1.5 kg
Zone: A
Base: Rs 65
COD: Rs 70
Fuel: Rs 3.4
Subtotal: Rs 138.4
GST: Rs 6.9
─────────────────
Total: Rs 145

Cost to us: Rs 125
Margin: Rs 20
```

---

### Step 6: ShoeKart Sees Options

**Shipcrowd shows**:

```
┌────────────────────────────────────────────────┐
│ Courier Options for Order ORD-20260212-0001   │
├────────────────────────────────────────────────┤
│                                                │
│ ⭐ RECOMMENDED                                 │
│ Ekart Standard                                 │
│ Rs 145 | 3-4 days | Zone A                    │
│ [Select This]                                  │
│                                                │
│ ────────────────────────────────────────────── │
│                                                │
│ Delhivery Surface                              │
│ Rs 156 | 2-3 days | Zone A                    │
│ [Select This]                                  │
│                                                │
│ ────────────────────────────────────────────── │
│                                                │
│ Velocity Express                               │
│ Rs 172 | 1 day | Zone A                       │
│ [Select This]                                  │
│                                                │
└────────────────────────────────────────────────┘
```

**ShoeKart picks**: Ekart Standard (balanced price & speed)

---

### Step 7: Shipment Created

**Shipcrowd calls Ekart API**:

```http
POST https://ekart-api.com/package/creation
Headers:
  Authorization: Bearer eyJhbGc...
Body:
[
  {
    "seller_name": "ShoeKart",
    "seller_address": "Warehouse 5, Andheri",
    "seller_phone": "+91 98765 00001",
    "seller_pincode": 400001,

    "recipient_name": "Priya Sharma",
    "recipient_address": "Flat 301, Sunshine Apartments, Andheri West",
    "recipient_phone": "+91 98765 43210",
    "recipient_pincode": 400053,

    "weight_gms": 1200,
    "length": 30,
    "width": 20,
    "height": 15,

    "payment_type": "COD",
    "cod_amount": 3500,
    "invoice_amount": 3500
  }
]
```

**Ekart Response**:
```json
{
  "tracking_id": "EK123456789IN",
  "status": "success",
  "awb": "EK123456789IN",
  "estimated_delivery": "2026-02-15"
}
```

---

### Step 8: System Updates

**Shipcrowd creates Shipment record**:

```javascript
Shipment.create({
  trackingNumber: "TRK-20260212-00001",
  orderId: order._id,
  companyId: "shoekart_123",
  carrier: "ekart",

  packageDetails: {
    weight: 1.2,
    dimensions: { length: 30, width: 20, height: 15 }
  },

  deliveryDetails: {
    recipientName: "Priya Sharma",
    recipientPhone: "+91 98765 43210",
    address: { ...Mumbai address... }
  },

  paymentDetails: {
    type: "cod",
    codAmount: 3500,
    shippingCost: 145,
    collectionStatus: "pending"
  },

  pricingDetails: {
    selectedQuote: {
      provider: "ekart",
      quotedSellAmount: 145,
      expectedCostAmount: 125,
      expectedMarginAmount: 20,
      zone: "A"
    }
  },

  currentStatus: "created"
});
```

**Order updated**:
```javascript
Order.findByIdAndUpdate(order._id, {
  currentStatus: "shipped",
  $push: {
    statusHistory: {
      status: "shipped",
      timestamp: new Date(),
      comment: "Shipped via Ekart Standard"
    }
  }
});
```

---

### Step 9: Tracking Updates (Webhooks)

**Day 1** - Ekart sends webhook:
```http
POST https://shipcrowd.com/webhooks/couriers/ekart
{
  "tracking_id": "EK123456789IN",
  "status": "MANIFEST_SCANNED",
  "location": "Mumbai Hub",
  "timestamp": "2026-02-12T14:30:00Z",
  "activity": "Package picked up from warehouse"
}
```

**Shipcrowd processes**:
```javascript
// Map external status to internal
externalStatus: "MANIFEST_SCANNED"
internalStatus: "manifest_confirmed"

// Update shipment
Shipment.findOneAndUpdate(
  { trackingNumber: "TRK-20260212-00001" },
  {
    $set: {
      currentStatus: "manifest_confirmed",
      "trackingInfo.lastUpdate": new Date()
    },
    $push: {
      "trackingInfo.timeline": {
        status: "manifest_confirmed",
        externalStatus: "MANIFEST_SCANNED",
        location: "Mumbai Hub",
        description: "Package picked up from warehouse",
        timestamp: new Date()
      }
    }
  }
);

// Update order
Order.findByIdAndUpdate(order._id, {
  currentStatus: "in_transit"
});
```

---

**Day 2** - In Transit:
```
Webhook: "IN_TRANSIT" → Status: "in_transit"
Location: Mumbai → Andheri Sorting Facility
```

**Day 3** - Out for Delivery:
```
Webhook: "OUT_FOR_DELIVERY" → Status: "out_for_delivery"
Location: Andheri Delivery Hub
Assigned to: Driver Ramesh (+91 98765 11111)
```

**Day 3** - Delivered:
```
Webhook: "DELIVERED" → Status: "delivered"
Location: Customer Address
Delivered By: Driver Ramesh
POD (Proof of Delivery):
  - Photo: [image of package at doorstep]
  - Signature: [Priya's signature]
  - COD Collected: Rs 3,500 ✓
  - GPS: 19.1234, 72.8567
  - Time: 2026-02-14 15:45:00
```

**Shipcrowd updates**:
```javascript
Shipment.findOneAndUpdate(
  { trackingNumber: "TRK-20260212-00001" },
  {
    $set: {
      currentStatus: "delivered",
      "paymentDetails.collectionStatus": "collected",
      "paymentDetails.actualCollection": 3500,
      "paymentDetails.collectedAt": new Date(),
      "paymentDetails.collectedBy": "Driver Ramesh",
      "paymentDetails.pod": {
        photo: "https://cdn.ekart.com/pod/123.jpg",
        signature: "https://cdn.ekart.com/sign/456.jpg",
        customerName: "Priya Sharma",
        timestamp: new Date(),
        gpsLocation: { latitude: 19.1234, longitude: 72.8567 }
      }
    }
  }
);

Order.findByIdAndUpdate(order._id, {
  currentStatus: "delivered"
});
```

---

### Step 10: COD Reconciliation

**After 7 days**, Ekart sends COD remittance:

```
Ekart deposits to Shipcrowd bank account:
  COD Amount Collected: Rs 3,500
  Shipping Charges:     -Rs 125 (cost)
  Net Remitted:         Rs 3,375
```

**Shipcrowd reconciles**:
```javascript
Shipment.findOneAndUpdate(
  { trackingNumber: "TRK-20260212-00001" },
  {
    $set: {
      "paymentDetails.reconciled": true,
      "paymentDetails.reconciledAt": new Date(),
      "paymentDetails.remittance": {
        included: true,
        remittanceId: "EKART-REM-20260221-001",
        status: "remitted",
        remittedAt: new Date(),
        remittedAmount: 3375
      }
    }
  }
);
```

**Financial Summary**:
```
Revenue from ShoeKart:   Rs 145 (shipping charge)
Cost to Ekart:          -Rs 125
Gross Margin:            Rs 20

COD Collected by Ekart:  Rs 3,500
Remitted to Shipcrowd:   Rs 3,375 (after deducting Rs 125)
Transferred to ShoeKart: Rs 3,230 (after deducting our Rs 145)

Total Profit: Rs 20 (from shipping margin)
```

---

## 💰 Pricing System Explained {#pricing-system}

### How Does Pricing Actually Work?

Let's break down a **real calculation** step by step.

#### Example Order

```
Order:
  From: Delhi (110001)
  To: Bangalore (560001)
  Weight: 2.3 kg (actual)
  Dimensions: 40 cm × 30 cm × 25 cm
  Payment: COD
  Order Value: Rs 8,000
```

---

### Calculation Step 1: Chargeable Weight

**Actual Weight**: 2.3 kg

**Volumetric Weight**:
```
Formula: (Length × Width × Height) / DIM_DIVISOR
DIM_DIVISOR: 5000 (industry standard)

Calculation:
= (40 × 30 × 25) / 5000
= 30,000 / 5000
= 6 kg
```

**Chargeable Weight**:
```
Weight Basis: Max (Actual vs Volumetric)
= MAX(2.3 kg, 6 kg)
= 6 kg

Rounding: Ceil to 0.5 kg
= 6 kg (already multiple of 0.5)

Final Chargeable Weight: 6 kg
```

**Why?** The package is bulky (takes space in delivery van) even though it's light.

---

### Calculation Step 2: Zone Lookup

**From**: Delhi (110001)
**To**: Bangalore (560001)

**System looks up**:
```sql
SELECT zone FROM zones
WHERE '560001' = ANY(postalCodes)
AND companyId = 'shoekart_123'
```

**Result**: Zone D (Delhi → Bangalore = 1,700 km = Far)

---

### Calculation Step 3: Base Charge (Weight Slab)

**Rate Card** for Ekart Standard - Zone D:

```
Slabs:
  0.0 - 0.5 kg:  Rs 80
  0.5 - 1.0 kg:  Rs 100
  1.0 - 2.0 kg:  Rs 125
  2.0 - 5.0 kg:  Rs 160
  5.0+ kg:       Rs 200 + Rs 20/kg

Additional Per Kg: Rs 20
```

**Chargeable Weight**: 6 kg

**Calculation**:
```
6 kg > 5 kg → Use "5.0+" slab

Base Charge: Rs 200 (for first 5 kg)
Additional: (6 - 5) × Rs 20 = 1 × Rs 20 = Rs 20

Base Charge Total: Rs 200 + Rs 20 = Rs 220
```

---

### Calculation Step 4: COD Charge

**Rate Card COD Rule**:
```
Type: Percentage
Percentage: 2%
Min Charge: Rs 30
Max Charge: Rs 500
```

**Order Value**: Rs 8,000

**Calculation**:
```
COD = 2% × 8,000 = Rs 160

Check limits:
  Min: Rs 30  ✓ (160 > 30)
  Max: Rs 500 ✓ (160 < 500)

COD Charge: Rs 160
```

---

### Calculation Step 5: Subtotal

```
Base Charge:  Rs 220
COD Charge:  +Rs 160
─────────────────────
Subtotal:     Rs 380
```

---

### Calculation Step 6: Fuel Surcharge

**Rate Card Fuel Rule**:
```
Percentage: 2.5%
Applied On: Freight + COD
```

**Calculation**:
```
Fuel Surcharge = 2.5% × (Base + COD)
               = 2.5% × (220 + 160)
               = 2.5% × 380
               = 0.025 × 380
               = Rs 9.50
```

---

### Calculation Step 7: Taxable Amount

```
Subtotal:         Rs 380.00
Fuel Surcharge:  +Rs   9.50
─────────────────────────────
Taxable Amount:   Rs 389.50
```

---

### Calculation Step 8: GST (Tax)

**GST Rate**: 5% (for logistics services in India)

**State Check**:
```
From State: Delhi (DL)
To State:   Karnataka (KA)
→ Inter-state shipment → IGST applies
```

**Calculation**:
```
IGST = 5% × Taxable Amount
     = 5% × 389.50
     = 0.05 × 389.50
     = Rs 19.475
     = Rs 19.48 (rounded to 2 decimals)
```

**If Intra-state** (same state):
```
SGST = 2.5% × 389.50 = Rs 9.74
CGST = 2.5% × 389.50 = Rs 9.74
Total GST = Rs 19.48 (same total, split differently)
```

---

### Calculation Step 9: TOTAL

```
Taxable Amount:  Rs 389.50
GST (5%):       +Rs  19.48
─────────────────────────────
TOTAL:           Rs 408.98
                ≈ Rs 409 (rounded)
```

---

### Complete Breakdown Table

| Component | Calculation | Amount |
|-----------|-------------|--------|
| **Chargeable Weight** | MAX(2.3 kg actual, 6 kg volumetric) | 6 kg |
| **Zone** | Delhi → Bangalore | Zone D |
| **Base Charge** | 5.0+ kg: Rs 200 + (1 × Rs 20) | Rs 220 |
| **COD Charge** | 2% × Rs 8,000 | Rs 160 |
| **Subtotal** | Base + COD | Rs 380 |
| **Fuel Surcharge** | 2.5% × Rs 380 | Rs 9.50 |
| **Taxable Amount** | Subtotal + Fuel | Rs 389.50 |
| **GST (5%)** | IGST on Rs 389.50 | Rs 19.48 |
| **FINAL TOTAL** | | **Rs 409** |

---

### Margin Calculation

**Cost Card** (what Ekart charges us):

```
Same calculation with lower slabs:
Base Charge:  Rs 180 (vs Rs 220)
COD Charge:   Rs 160 (same)
Fuel:         Rs 8.50 (vs Rs 9.50)
Taxable:      Rs 348.50
GST:          Rs 17.43
Total Cost:   Rs 366

Our Cost to Ekart: Rs 366
```

**Sell Price** (what we charge seller):

```
Our Sell Price: Rs 409
```

**Margin**:

```
Revenue:   Rs 409
Cost:     -Rs 366
─────────────────
Margin:    Rs 43  (10.5% margin)
```

---

## 🔌 External Courier APIs {#external-apis}

### How Courier APIs Work

Couriers provide **REST APIs** (web services) that allow automated communication.

#### Authentication Flow

**Step 1: Get Credentials** (one-time setup)
```
Contact courier business team
→ They create API account for you
→ You receive: Username, Password, Client ID
```

**Step 2: Get Access Token** (every hour)
```http
POST https://ekart-api.com/auth/token
Headers:
  Content-Type: application/json
Body:
{
  "username": "api_user_shipcrowd",
  "password": "SecurePass123!"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Token Lifecycle**:
```
Hour 1: Get new token
  ↓
Hour 1-2: Use token for all API calls
  ↓
Hour 2: Token expires
  ↓
Hour 2: Get new token (auto-refresh)
```

**Shipcrowd handles this automatically** (you don't need to worry!)

---

### API Endpoint Examples

#### 1. Get Rates (Pricing)

**Ekart Example**:
```http
POST https://ekart-api.com/api/v1/price-estimate
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "pickupPincode": 110001,
  "dropPincode": 560001,
  "weight": 2300,  // grams
  "length": 40,
  "width": 30,
  "height": 25,
  "serviceType": "SURFACE",
  "codAmount": 8000,
  "invoiceAmount": 8000
}

Response:
{
  "status": "success",
  "shippingCharge": 180,
  "codCharge": 160,
  "fuelSurcharge": 8.5,
  "taxes": 17.43,
  "total": 366,
  "zone": "D",
  "estimatedDeliveryDays": 5
}
```

---

#### 2. Create Shipment

**Velocity Example**:
```http
POST https://velocity-api.com/custom/api/v1/forward-order
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "order_id": "ORD-20260212-0001",

  "shipper_name": "ShoeKart Warehouse",
  "shipper_phone": "+91 98765 00001",
  "shipper_address": "Warehouse 5, Andheri",
  "shipper_city": "Mumbai",
  "shipper_state": "Maharashtra",
  "shipper_pincode": "400001",

  "recipient_name": "Priya Sharma",
  "recipient_phone": "+91 98765 43210",
  "recipient_address": "Flat 301, Sunshine Apartments, Andheri West",
  "recipient_city": "Mumbai",
  "recipient_state": "Maharashtra",
  "recipient_pincode": "400053",

  "weight": 1.2,
  "length": 30,
  "width": 20,
  "height": 15,

  "payment_mode": "COD",
  "cod_amount": 3500,
  "invoice_value": 3500
}

Response:
{
  "status": "success",
  "shipment_id": "VEL987654321IN",
  "awb": "VEL987654321IN",
  "label_url": "https://velocity-cdn.com/labels/VEL987654321IN.pdf",
  "estimated_delivery": "2026-02-13",
  "pickup_date": "2026-02-12"
}
```

---

#### 3. Track Shipment

**Delhivery Example**:
```http
GET https://delhivery-api.com/api/v1/track?waybill=DEL123456789
Headers:
  Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "awb": "DEL123456789",
    "current_status": "IN_TRANSIT",
    "current_location": "Bangalore Hub",
    "estimated_delivery": "2026-02-15",
    "tracking_history": [
      {
        "status": "MANIFEST_SCANNED",
        "location": "Delhi Hub",
        "timestamp": "2026-02-12T10:00:00Z",
        "activity": "Package picked up"
      },
      {
        "status": "IN_TRANSIT",
        "location": "Bangalore Hub",
        "timestamp": "2026-02-13T14:30:00Z",
        "activity": "Package arrived at hub"
      }
    ]
  }
}
```

---

#### 4. Cancel Shipment

**Ekart Example**:
```http
POST https://ekart-api.com/api/v1/package/cancel
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "tracking_ids": ["EK123456789IN"]
}

Response:
{
  "EK123456789IN": {
    "status": "Cancelled",
    "message": "Shipment cancelled successfully",
    "cancelled_at": "2026-02-12T16:45:00Z"
  }
}
```

---

### Webhook Payloads

Couriers send **automatic updates** (webhooks) when status changes.

**Velocity Webhook Example**:
```http
POST https://shipcrowd.com/webhooks/couriers/velocity
Headers:
  X-API-Key: <secret_webhook_key>
  Content-Type: application/json
Body:
{
  "event_type": "status_update",
  "awb_code": "VEL987654321IN",
  "shipment_status": "DELIVERED",
  "current_location": "Customer Address",
  "timestamp": "2026-02-14T15:45:00Z",
  "activity": "Delivered to customer",
  "pod_available": true,
  "cod_amount": 3500,
  "cod_collected": true,
  "delivery_person": {
    "name": "Ramesh Kumar",
    "phone": "+91 98765 11111"
  }
}
```

**Shipcrowd Response** (must be fast, < 5 seconds):
```http
HTTP 200 OK
{
  "status": "acknowledged",
  "tracking_number": "TRK-20260212-00001"
}
```

---

### API Rate Limits

Couriers limit how many requests you can make:

```
Velocity:
  - 100 requests per minute
  - 10,000 requests per hour

Delhivery:
  - 50 requests per minute
  - 5,000 requests per hour

Ekart:
  - 60 requests per minute
  - 7,200 requests per hour
```

**If you exceed**:
```http
HTTP 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "retry_after": 60  // seconds
}
```

**Shipcrowd handles this** with:
- Automatic retry with backoff
- Request queuing
- Circuit breaker (if API down)

---

## 🔧 Troubleshooting Common Issues {#troubleshooting}

### Issue 1: Integration Test Failed

**Error**:
```
❌ "Authentication failed: Invalid credentials"
```

**Causes & Solutions**:

**A) Wrong Username/Password**
```
Check: Are credentials typed correctly?
       (No extra spaces, correct case)

Test: Copy credentials from email
      Paste into Postman first
      If Postman works → Shipcrowd config wrong
      If Postman fails → Credentials wrong
```

**B) Account Not Activated**
```
Check: Did courier activate your API account?

Solution: Email courier support team:
  "Hi, we signed up for API access on [date].
   Our Client ID is [xyz]. Is our account active?"
```

**C) IP Whitelist**
```
Some couriers require IP whitelisting.

Check: Ask courier if they have IP restrictions
Solution: Provide Shipcrowd server IP to courier
```

---

### Issue 2: Rate Card Not Working

**Error**:
```
❌ "No rate card found for service"
```

**Debug Steps**:

**A) Check Effective Dates**
```
Navigate to: Admin → Rate Cards → [Your Card]

Check:
  Start Date: Should be in the past
  End Date: Should be in the future (or blank)

Example:
  Today: 2026-02-12

  ✗ Start Date: 2026-03-01  → Not started yet!
  ✓ Start Date: 2026-01-01

  ✗ End Date: 2026-02-01    → Already expired!
  ✓ End Date: 2026-12-31
```

**B) Check Status**
```
Status should be: Active (not Draft or Inactive)
```

**C) Check Zone Rules**
```
Test Input:
  From: Delhi (110001)
  To: Mumbai (400001)

Zone Lookup:
  Mumbai 400001 → Should map to Zone X

Rate Card:
  Should have rules for Zone X

If no zone match → No pricing found!
```

**D) Test with Simulator**
```
Use "Simulate Pricing" button:
  Input actual order details
  See breakdown step-by-step
  Identify where calculation fails
```

---

### Issue 3: Shipment Creation Failed

**Error**:
```
❌ "Failed to create shipment with Ekart: Invalid pincode"
```

**Debug Steps**:

**A) Check Pincode Serviceability**
```
Question: Does Ekart deliver to this pincode?

Test:
  1. Go to Ekart website
  2. Check their pincode lookup
  3. Enter destination pincode

  If not serviceable → Use different courier
```

**B) Check Weight Limits**
```
Service: Ekart Standard
Max Weight: 30 kg

Your Shipment: 35 kg

Solution: Split into 2 shipments
  Shipment 1: 20 kg
  Shipment 2: 15 kg
```

**C) Check COD Limits**
```
Service: Ekart Standard
Max COD: Rs 1,00,000

Your Order: Rs 1,50,000 COD

Solution: Use Prepaid or different courier
```

**D) API Timeout**
```
Error: "Request timeout after 30 seconds"

Causes:
  - Ekart API is slow/down
  - Network issues

Solution:
  - Wait 5 minutes
  - Retry
  - If persists: Contact Ekart support
```

---

### Issue 4: Tracking Not Updating

**Problem**:
```
Shipment stuck on "Created" for 2 days
No tracking updates
```

**Debug Steps**:

**A) Check Webhook Delivery**
```
Navigate to: Admin → Webhooks → Logs

Look for:
  Courier: Ekart
  Tracking: EK123456789IN

If no webhooks received:
  → Ekart not sending updates
  → Contact Ekart to check webhook config
```

**B) Manually Fetch Status**
```
Use: Admin → Shipments → [Your Shipment] → "Sync Status"

This calls tracking API directly:
  GET https://ekart-api.com/track?awb=EK123456789IN

If API returns updated status:
  → Webhook issue (not pushing)
  → Use manual sync as workaround

If API also shows old status:
  → Ekart system delay
  → Wait 24 hours
```

**C) Check Manifest Status**
```
Common issue: Shipment created but not picked up

Check:
  Current Status: "created"
  Pickup Date: Yesterday

Solution:
  → Call courier customer support
  → Ask: "Why wasn't package picked up?"
```

---

### Issue 5: COD Not Collected

**Problem**:
```
Shipment delivered 10 days ago
COD status still "Pending"
Rs 5,000 not received
```

**Debug Steps**:

**A) Check POD (Proof of Delivery)**
```
Navigate to: Shipment Details → POD Tab

Check:
  ✓ POD Photo: Shows package at customer
  ✓ Signature: Customer signed
  ✓ COD Collected: Rs 5,000 ✓

If POD shows collected:
  → Money with courier
  → Wait for remittance cycle
```

**B) Check Remittance Cycle**
```
Couriers remit COD on schedule:

Ekart: Every 7 days
  If delivered on: Monday (Feb 12)
  Remittance on: Monday (Feb 19)

Delhivery: Twice per week (Tue/Fri)

Check:
  Today: Feb 16
  Next Remittance: Feb 19

  → Still within cycle, wait
```

**C) Reconciliation Report**
```
Request from courier:
  "COD Remittance Report for Feb 12-19"

Compare:
  Courier Report: EK123456789IN → Rs 5,000
  Your DB: TRK-20260212-00001 → Rs 5,000

If mismatch:
  → Reconciliation error
  → Raise ticket with courier
```

---

## 📋 Quick Reference {#quick-reference}

### Admin URLs

```
Login:              https://shipcrowd.com/admin/login
Dashboard:          https://shipcrowd.com/admin
Couriers:           https://shipcrowd.com/admin/couriers
Services:           https://shipcrowd.com/admin/couriers/services
Rate Cards:         https://shipcrowd.com/admin/rate-cards
Policies:           https://shipcrowd.com/admin/courier-policies
Orders:             https://shipcrowd.com/admin/orders
Shipments:          https://shipcrowd.com/admin/shipments
Webhooks Logs:      https://shipcrowd.com/admin/webhooks
```

---

### Status Codes Reference

**Order Statuses**:
```
pending          → Order created, awaiting shipment
ready_to_ship    → Order packed, ready for pickup
shipped          → Shipment created with courier
in_transit       → Package moving in courier network
out_for_delivery → Package with delivery driver
delivered        → Successfully delivered
rto              → Returned to seller
cancelled        → Order cancelled by seller
```

**Shipment Statuses**:
```
created                → Shipment created in Shipcrowd
manifest_pending       → Awaiting courier pickup
manifest_confirmed     → Courier picked up package
in_transit             → Package moving
out_for_delivery       → With delivery driver
delivered              → Successfully delivered
undelivered            → Delivery attempt failed (NDR)
rto_initiated          → Return to origin started
rto_delivered          → Returned to seller
cancelled              → Shipment cancelled
```

---

### Pincode Zone Examples

**Zone A** (Within City - 0-500 km):
```
Mumbai → Mumbai          (400001 → 400053)
Delhi → Noida            (110001 → 201301)
Bangalore → Whitefield   (560001 → 560066)
```

**Zone B** (Within Region - 500-1000 km):
```
Mumbai → Pune            (400001 → 411001)
Delhi → Jaipur           (110001 → 302001)
Bangalore → Chennai      (560001 → 600001)
```

**Zone C** (Cross Region - 1000-1500 km):
```
Mumbai → Hyderabad       (400001 → 500001)
Delhi → Kolkata          (110001 → 700001)
```

**Zone D** (Far - 1500-2000 km):
```
Mumbai → Bangalore       (400001 → 560001)
Delhi → Chennai          (110001 → 600001)
```

**Zone E** (Farthest - 2000+ km):
```
Mumbai → Guwahati        (400001 → 781001)
Delhi → Trivandrum       (110001 → 695001)
Northeast states
Remote areas
```

---

### Weight Calculation Cheat Sheet

**Actual Weight**: Physical weight on scale

**Volumetric Weight**:
```
Formula: (L × W × H) / 5000

Examples:
  Box: 30 × 20 × 15 cm
  = (30 × 20 × 15) / 5000
  = 9,000 / 5000
  = 1.8 kg

  Box: 50 × 40 × 30 cm
  = (50 × 40 × 30) / 5000
  = 60,000 / 5000
  = 12 kg
```

**Chargeable Weight**: MAX(Actual, Volumetric)

**Rounding**:
```
Rounding Unit: 0.5 kg
Rounding Mode: Ceil (always up)

Examples:
  1.2 kg → 1.5 kg
  1.5 kg → 1.5 kg (no change)
  1.6 kg → 2.0 kg
  2.0 kg → 2.0 kg
  2.1 kg → 2.5 kg
```

---

### COD Charge Examples

**Rule**: 2% with min Rs 30, max Rs 500

```
Order Rs 500:
  2% × 500 = Rs 10 → Rs 30 (min applied) ✓

Order Rs 2,000:
  2% × 2,000 = Rs 40 ✓

Order Rs 10,000:
  2% × 10,000 = Rs 200 ✓

Order Rs 30,000:
  2% × 30,000 = Rs 600 → Rs 500 (max applied) ✓
```

---

### Contact Information

**Velocity Support**:
```
Email: apisupport@velocityexpress.in
Phone: +91 80 1234 5678
Hours: Mon-Sat 9 AM - 6 PM
```

**Delhivery Support**:
```
Email: api@delhivery.com
Phone: +91 124 456 7890
Hours: 24/7
```

**Ekart Support**:
```
Email: integration@ekartlogistics.com
Phone: +91 80 9876 5432
Hours: Mon-Fri 10 AM - 6 PM
```

**Shipcrowd Internal Support**:
```
Tech Team: tech@shipcrowd.com
Operations: ops@shipcrowd.com
Emergency: +91 98765 00000 (24/7)
```

---

## 🎓 Next Steps

### Week 1: Get Familiar
- [ ] Read this guide completely (2-3 hours)
- [ ] Watch courier integration video tutorials
- [ ] Explore admin panel (test environment)
- [ ] Practice creating test shipments

### Week 2: Hands-On Setup
- [ ] Integrate one courier (start with easiest: Delhivery)
- [ ] Create 2-3 services
- [ ] Set up basic rate cards
- [ ] Test end-to-end flow

### Week 3: Advanced Features
- [ ] Configure seller policies
- [ ] Set up webhook monitoring
- [ ] Learn reconciliation process
- [ ] Handle your first NDR case

### Month 2: Optimization
- [ ] Analyze courier performance
- [ ] Optimize rate cards for margin
- [ ] Improve delivery success rate
- [ ] Automate common workflows

---

## 📖 Additional Resources

**Internal Documentation**:
- [Architecture Overview](./Resources/Prompts/Frontend_Refactor.md)
- [API Documentation](../api-docs/)
- [Database Schema](../db-schema/)

**External Resources**:
- [Velocity API Docs](https://docs.velocityexpress.in)
- [Delhivery API Docs](https://docs.delhivery.com)
- [Ekart API Docs](https://ekartlogistics.com/api-docs)

**Video Tutorials** (To be created):
- Introduction to Shipcrowd (15 min)
- Courier Integration Step-by-Step (30 min)
- Rate Card Management (20 min)
- Handling Orders & Shipments (25 min)

---

## ✅ Congratulations!

You now understand:
- ✅ What a shipping aggregator is
- ✅ How couriers, services, and rate cards work
- ✅ Complete order lifecycle from creation to delivery
- ✅ Pricing calculations (zones, weight, COD)
- ✅ External courier API integrations
- ✅ Admin workflows for setup and management
- ✅ Troubleshooting common issues

You're ready to start managing Shipcrowd as an admin!

**Remember**:
- Start with one courier (Delhivery is easiest)
- Test everything in test environment first
- Ask questions when stuck (tech@shipcrowd.com)
- Document your learnings for future admins

**Good luck! 🚀**

---

*Last Updated: February 12, 2026*
*Document Version: 1.0*
*For: Shipcrowd Admins (Beginner Level)*
