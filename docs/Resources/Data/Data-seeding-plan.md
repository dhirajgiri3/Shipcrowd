# ShipCrowd Database Seeding Script - Comprehensive Implementation Plan

## Executive Summary

This document provides a detailed implementation plan for creating a realistic, production-grade database seeding script for ShipCrowd shipping aggregator software. The script will generate 1,000-5,000+ records per entity with authentic real-world Indian logistics patterns to replace all mock/hardcoded frontend data.

**Scope**: 20+ database models
**Data Volume**: Medium scale (1,000-5,000 records per entity)
**Realism Level**: Real-world logistics patterns including:
- 85-90% delivery success rate
- 10-15% failed deliveries (NDR/RTO)
- Seasonal variations (Diwali, Christmas, wedding season)
- COD vs Prepaid payment distributions (60%/40%)
- Geographic coverage: Metro + Tier-2 cities
**Business Types**: E-commerce/Fashion, Electronics, B2B/Wholesale

---

## Table of Contents

1. [Database Schema Analysis](#1-database-schema-analysis)
2. [Data Generation Strategy](#2-data-generation-strategy)
3. [Seed Script Structure](#3-seed-script-structure)
4. [Entity-by-Entity Seeding Plan](#4-entity-by-entity-seeding-plan)
5. [Real-World Logic Implementation](#5-real-world-logic-implementation)
6. [Indian Geography Data](#6-indian-geography-data)
7. [Relationship Management](#7-relationship-management)
8. [Execution Plan](#8-execution-plan)
9. [File Structure](#9-file-structure)
10. [Testing & Verification](#10-testing--verification)

---

## 1. Database Schema Analysis

### 1.1 Core Models Identified

Based on exploration of `/server/src/infrastructure/database/mongoose/models/`, the following models need seeding:

#### **IAM (Identity & Access Management)**
1. **User** (`iam/users/user.model.ts`)
   - Fields: email, password, name, role (admin/seller/staff), companyId, teamRole, teamStatus
   - OAuth: googleId, oauthProvider, isEmailVerified
   - Profile: phone, address, city, state, country, postalCode, gender, bio
   - Security: tokenVersion, verificationToken, resetToken, lastLogin, failedLoginAttempts
   - KYC: kycStatus.isComplete
   - Relationships: Many-to-One with Company

2. **Session** (`iam/users/session.model.ts`)
   - Fields: userId, userAgent, ip, deviceInfo (type, browser, OS), location (country, city)
   - Relationships: Many-to-One with User

#### **Organization**
3. **Company** (`organization/core/company.model.ts`)
   - Fields: name, address (line1, line2, city, state, country, postalCode)
   - Billing: gstin, pan, bankName, accountNumber, ifscCode, upiId
   - Integrations: shopify, woocommerce
   - Wallet: balance, currency, lowBalanceThreshold
   - Status: pending_verification | kyc_submitted | approved | suspended | rejected
   - Relationships: One-to-Many with User, Order, Shipment, Warehouse

4. **KYC** (`organization/core/kyc.model.ts`)
   - Fields: userId, companyId, status (pending/verified/rejected)
   - Documents: pan, aadhaar, gstin, bankAccount
   - Encryption: pan.number, aadhaar.number, bankAccount.accountNumber (field-level encryption)
   - Relationships: One-to-One with User, Many-to-One with Company

#### **Orders**
5. **Order** (`orders/core/order.model.ts`)
   - Fields: orderNumber, companyId, customerInfo (name, email, phone, address)
   - Products: Array of {name, sku, quantity, price, weight, dimensions}
   - Shipping: provider, method, trackingNumber, estimatedDelivery, shippingCost
   - Payment: paymentStatus (pending/paid/failed/refunded), paymentMethod (cod/prepaid)
   - Source: manual | shopify | woocommerce | flipkart | amazon | api
   - StatusHistory: Array of {status, timestamp, comment, updatedBy}
   - Totals: subtotal, tax, shipping, discount, total
   - Relationships: Many-to-One with Company, One-to-One with Shipment

#### **Logistics - Shipping**
6. **Shipment** (`logistics/shipping/core/shipment.model.ts`)
   - Fields: trackingNumber, orderId, companyId, carrier, serviceType
   - Package: weight, dimensions (L×W×H), packageCount, packageType, declaredValue
   - Pickup: warehouseId, pickupDate, pickupReference, contactPerson, contactPhone
   - Delivery: recipientName, recipientPhone, recipientEmail, address, instructions
   - Payment: type (prepaid/cod), codAmount, shippingCost, currency
   - StatusHistory: Array of {status, timestamp, location, description, updatedBy}
   - NDR: ndrReason, ndrDate, ndrStatus, ndrAttempts, ndrResolutionDate
   - RTO: rtoInitiatedDate, rtoReason, rtoExpectedDate, rtoActualDate, rtoStatus, rtoTrackingNumber
   - Documents: Array of {type (label/invoice/manifest), url, createdAt}
   - Relationships: Many-to-One with Order, Company, Warehouse

7. **NDREvent** (`logistics/shipping/exceptions/ndr-event.model.ts`)
   - Fields: shipment, awb, ndrReason, ndrReasonClassified
   - NDR Type: address_issue | customer_unavailable | refused | payment_issue | other
   - Status: detected | in_resolution | resolved | escalated | rto_triggered
   - ResolutionActions: Array of {action, actionType, takenAt, takenBy, result, metadata}
   - Resolution: resolutionDeadline (48 hours default), resolvedAt, resolvedBy
   - Relationships: Many-to-One with Shipment, Order, Company

8. **RTOEvent** (`logistics/shipping/exceptions/rto-event.model.ts`)
   - Fields: shipment, order, reverseShipment, reverseAwb
   - RTO Reason: ndr_unresolved | customer_cancellation | qc_failure | refused | damaged_in_transit | incorrect_product | other
   - Triggered By: auto | manual
   - Return Status: initiated | in_transit | delivered_to_warehouse | qc_pending | qc_completed | restocked | disposed
   - QC Result: {passed, remarks, images, inspectedBy, inspectedAt}
   - Charges: rtoCharges, chargesDeducted, chargesDeductedAt
   - Relationships: Many-to-One with Shipment, Order, Warehouse, Company

9. **RateCard** (`logistics/shipping/configuration/rate-card.model.ts`)
   - Fields: name, companyId, baseRates, weightRules, zoneRules, customerOverrides
   - Effective Dates: startDate, endDate
   - Status: draft | active | inactive | expired
   - Relationships: Many-to-One with Company

10. **Zone** (`logistics/shipping/configuration/zone.model.ts`)
    - Fields: name, pincodes (array), statesMapped, description
    - Relationships: Referenced by RateCard

#### **Logistics - Warehouse**
11. **Warehouse** (`logistics/warehouse/structure/warehouse.model.ts`)
    - Fields: name, companyId, address (line1, line2, city, state, country, postalCode, coordinates)
    - Contact: name, phone, email, alternatePhone
    - Operating Hours: monday-sunday {open, close}
    - Carrier Details: velocityWarehouseId, delhiveryWarehouseId, dtdcWarehouseId, xpressbeesWarehouseId
    - Flags: isActive, isDefault, isDeleted
    - Relationships: Many-to-One with Company, One-to-Many with Shipment

12. **Inventory** (`logistics/inventory/store/inventory.model.ts`)
    - Fields: sku, warehouseId, companyId, productName, available, reserved, damaged, incoming
    - Relationships: Many-to-One with Warehouse, Company

13. **PickList** (`logistics/warehouse/activities/pick-list.model.ts`)
    - Fields: pickListNumber (e.g., PL-2025-0001), warehouseId, companyId
    - Items: Array of {orderId, orderItemId, orderNumber, sku, productName, barcode, locationId, locationCode, zone, aisle, quantityRequired, quantityPicked, status, barcodeScanned, sequence}
    - Status: PENDING | ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED | PARTIAL
    - Assignment: assignedTo, assignedAt, assignedBy
    - Picking Strategy: BATCH | WAVE | DISCRETE | ZONE
    - Priority: LOW | MEDIUM | HIGH | URGENT
    - Timing: estimatedPickTime, actualPickTime, scheduledAt, startedAt, completedAt
    - Metrics: accuracy, efficiency
    - Relationships: Many-to-One with Warehouse, Company

#### **Finance**
14. **WalletTransaction** (`finance/wallets/wallet-transaction.model.ts`)
    - Fields: company, type (credit/debit/refund/adjustment), amount
    - Balance: balanceBefore, balanceAfter
    - Reason: rto_charge | shipping_cost | recharge | refund | cod_remittance | adjustment | promotional_credit | weight_discrepancy | other
    - Reference: {type (rto_event/shipment/payment/order/manual), id, externalId}
    - Status: pending | completed | failed | reversed
    - CreatedBy: 'system' or userId
    - Relationships: Many-to-One with Company

15. **CommissionTransaction** (`finance/commission/commission-transaction.model.ts`)
    - Fields: companyId, shipmentId, amount, rate, status
    - Relationships: Many-to-One with Company, Shipment

#### **Marketplaces**
16. **ShopifyStore** (`marketplaces/shopify/shopify-store.model.ts`)
    - Fields: companyId, shopDomain, accessToken, scope, lastSyncAt
    - Relationships: Many-to-One with Company

17. **WooCommerceStore** (`marketplaces/woocommerce/woocommerce-store.model.ts`)
    - Fields: companyId, siteUrl, consumerKey, consumerSecret, lastSyncAt
    - Relationships: Many-to-One with Company

---

## 2. Data Generation Strategy

### 2.1 Realistic Data Principles

1. **Geographic Distribution** (Indian Focus):
   - **Metro Cities (50%)**: Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata
   - **Tier-2 Cities (35%)**: Pune, Jaipur, Lucknow, Ahmedabad, Surat, Indore
   - **Tier-3 Cities (15%)**: Coimbatore, Kanpur, Nagpur, Visakhapatnam

2. **Business Type Distribution**:
   - **E-commerce/Fashion (40%)**: High volume, small packages, 15-20% returns
   - **Electronics (35%)**: Medium volume, valuable items, 8-12% returns
   - **B2B/Wholesale (25%)**: Bulk shipments, low returns (2-5%)

3. **Delivery Success Patterns**:
   - **Successful Delivery (85-90%)**
   - **NDR (5-8%)**: address_issue (30%), customer_unavailable (40%), payment_issue (20%), refused (10%)
   - **RTO (5-7%)**: ndr_unresolved (60%), customer_cancellation (25%), damaged_in_transit (10%), refused (5%)

4. **Payment Method Distribution**:
   - **COD (60%)**: Higher in Tier-2/3 cities
   - **Prepaid (40%)**: Higher in metro cities and electronics category

5. **Seasonal Variations**:
   - **Diwali (Oct-Nov)**: 150% volume spike, lower RTO rates (festive mood)
   - **Christmas/New Year (Dec)**: 130% volume, higher electronics orders
   - **Wedding Season (Jan-Feb, Nov-Dec)**: 120% volume, higher saree/jewelry orders
   - **Monsoon (Jun-Aug)**: 90% volume, higher delivery delays
   - **Summer (Mar-May)**: 95% normal volume

6. **Courier Partner Distribution**:
   - **Delhivery (30%)**: Pan-India, reliable
   - **Bluedart (20%)**: Premium, faster
   - **Ecom Express (20%)**: E-commerce focused
   - **DTDC (15%)**: Tier-2/3 strong
   - **Xpressbees (15%)**: Cost-effective

### 2.2 Data Volume Targets

| Entity | Target Records | Notes |
|--------|---------------|-------|
| Users | 150-200 | Admin (5), Sellers (100-120), Staff (45-75) |
| Companies | 100-120 | Match seller users |
| KYC Records | 100-120 | One per company |
| Warehouses | 200-300 | 2-3 per company |
| Orders | 3,000-5,000 | Distributed over 12 months |
| Shipments | 3,000-5,000 | One per order |
| NDR Events | 150-250 | 5-8% of shipments |
| RTO Events | 150-210 | 5-7% of shipments |
| Wallet Transactions | 8,000-15,000 | Multiple per shipment (debit for shipping, RTO charges, COD remittance) |
| Inventory Records | 3,000-4,000 | 10-15 SKUs per warehouse |
| Pick Lists | 500-800 | Batch picking lists |
| Rate Cards | 50-80 | Custom pricing per company |
| Sessions | 300-500 | Multiple per user over time |

---

## 3. Seed Script Structure

### 3.1 File Organization

```
server/
├── src/
│   └── infrastructure/
│       └── database/
│           └── seeders/
│               ├── index.ts                    # Main entry point
│               ├── config.ts                   # Seeding configuration
│               ├── generators/                 # Data generation utilities
│               │   ├── company.generator.ts
│               │   ├── user.generator.ts
│               │   ├── order.generator.ts
│               │   ├── shipment.generator.ts
│               │   ├── ndr.generator.ts
│               │   ├── rto.generator.ts
│               │   ├── warehouse.generator.ts
│               │   └── wallet.generator.ts
│               ├── data/                       # Static reference data
│               │   ├── indian-cities.ts        # City, state, pincode mapping
│               │   ├── business-names.ts       # Realistic company names
│               │   ├── product-catalog.ts      # SKUs, product names by category
│               │   ├── customer-names.ts       # Indian names database
│               │   └── carrier-data.ts         # Courier partners, service types
│               ├── seeders/                    # Individual model seeders
│               │   ├── 01-users.seeder.ts
│               │   ├── 02-companies.seeder.ts
│               │   ├── 03-kyc.seeder.ts
│               │   ├── 04-warehouses.seeder.ts
│               │   ├── 05-rate-cards.seeder.ts
│               │   ├── 06-inventory.seeder.ts
│               │   ├── 07-orders.seeder.ts
│               │   ├── 08-shipments.seeder.ts
│               │   ├── 09-ndr-events.seeder.ts
│               │   ├── 10-rto-events.seeder.ts
│               │   ├── 11-wallet-transactions.seeder.ts
│               │   ├── 12-pick-lists.seeder.ts
│               │   └── 13-sessions.seeder.ts
│               └── utils/                      # Helper utilities
│                   ├── random.utils.ts         # Random data generators
│                   ├── date.utils.ts           # Date manipulation
│                   ├── address.utils.ts        # Address generation
│                   └── logger.utils.ts         # Progress logging
├── package.json                                # Add seed script
└── tsconfig.json
```

### 3.2 Seeding Order (Dependency Management)

**Order matters!** Follow this sequence to maintain referential integrity:

1. **Users** → Generate admin, seller, staff users
2. **Companies** → Link to seller users
3. **KYC** → Link to users and companies
4. **Warehouses** → Link to companies
5. **Rate Cards** → Link to companies
6. **Inventory** → Link to warehouses and companies
7. **Orders** → Link to companies (with realistic customer data)
8. **Shipments** → Link to orders, companies, warehouses
9. **NDR Events** → Link to failed shipments
10. **RTO Events** → Link to NDR events or shipments
11. **Wallet Transactions** → Link to shipments, RTO events, companies
12. **Pick Lists** → Link to orders, warehouses, companies
13. **Sessions** → Link to users

---

## 4. Entity-by-Entity Seeding Plan

### 4.1 Users (`01-users.seeder.ts`)

**Goal**: Generate 150-200 users (5 admin, 100-120 sellers, 45-75 staff)

**Logic**:
```typescript
export async function seedUsers() {
  const users = [];

  // 1. Admin Users (5)
  for (let i = 0; i < 5; i++) {
    users.push({
      email: `admin${i + 1}@shipcrowd.com`,
      password: await bcrypt.hash('Admin@123456', 12),
      name: generateIndianName(),
      role: 'admin',
      isEmailVerified: true,
      oauthProvider: 'email',
      profile: {
        phone: generateIndianPhone(),
        city: selectRandom(METRO_CITIES),
        state: getStateForCity(city),
        country: 'India',
        gender: selectRandom(['male', 'female']),
        timezone: 'Asia/Kolkata',
        preferredCurrency: 'INR',
      },
      kycStatus: { isComplete: true, lastUpdated: new Date() },
      isActive: true,
      isDeleted: false,
      anonymized: false,
    });
  }

  // 2. Seller Users (100-120)
  const sellerCount = randomInt(100, 120);
  for (let i = 0; i < sellerCount; i++) {
    const city = selectWeightedCity(); // Metro 50%, Tier-2 35%, Tier-3 15%
    users.push({
      email: `seller${i + 1}@${generateBusinessDomain()}.com`,
      password: await bcrypt.hash('Seller@123456', 12),
      name: generateIndianName(),
      role: 'seller',
      teamRole: 'owner',
      teamStatus: 'active',
      isEmailVerified: true,
      oauthProvider: selectRandom(['email', 'google']),
      googleId: oauthProvider === 'google' ? generateGoogleId() : undefined,
      profile: {
        phone: generateIndianPhone(),
        city,
        state: getStateForCity(city),
        country: 'India',
        postalCode: generatePincodeForCity(city),
        gender: selectRandom(['male', 'female']),
        timezone: 'Asia/Kolkata',
        preferredCurrency: 'INR',
      },
      profileCompletion: {
        status: randomInt(60, 100),
        requiredFieldsCompleted: true,
        lastUpdated: new Date(),
      },
      kycStatus: { isComplete: true, lastUpdated: faker.date.past({ years: 1 }) },
      isActive: true,
      isDeleted: false,
      anonymized: false,
    });
  }

  // 3. Staff Users (45-75) - Team members of sellers
  const staffCount = randomInt(45, 75);
  for (let i = 0; i < staffCount; i++) {
    users.push({
      email: `staff${i + 1}@${generateBusinessDomain()}.com`,
      password: await bcrypt.hash('Staff@123456', 12),
      name: generateIndianName(),
      role: 'staff',
      teamRole: selectRandom(['admin', 'manager', 'member', 'viewer']),
      teamStatus: selectRandom(['active', 'invited'], [90, 10]), // 90% active, 10% invited
      isEmailVerified: true,
      oauthProvider: 'email',
      profile: {
        phone: generateIndianPhone(),
        city: selectWeightedCity(),
        state: getStateForCity(city),
        country: 'India',
        gender: selectRandom(['male', 'female']),
      },
      kycStatus: { isComplete: false },
      isActive: true,
      isDeleted: false,
      anonymized: false,
    });
  }

  await User.insertMany(users);
  console.log(`✅ Seeded ${users.length} users`);
}
```

**Real-World Patterns**:
- Admin emails use @shipcrowd.com domain
- Seller emails use business domains (e.g., @fashionhub.com, @techstore.in)
- Staff inherit company domain from seller
- OAuth integration: 30% Google, 70% email/password
- Profile completion: Sellers 80-100%, Staff 60-90%
- KYC completion: All sellers, no staff

---

### 4.2 Companies (`02-companies.seeder.ts`)

**Goal**: Generate 100-120 companies (one per seller user)

**Logic**:
```typescript
export async function seedCompanies() {
  const sellerUsers = await User.find({ role: 'seller', teamRole: 'owner' });
  const companies = [];

  for (const seller of sellerUsers) {
    const businessType = selectBusinessType(); // Fashion 40%, Electronics 35%, B2B 25%
    const city = seller.profile.city;
    const state = seller.profile.state;

    companies.push({
      name: generateBusinessName(businessType, city),
      address: {
        line1: generateStreetAddress(city),
        line2: generateLandmark(),
        city,
        state,
        country: 'India',
        postalCode: generatePincodeForCity(city),
      },
      billingInfo: {
        gstin: generateGSTIN(state),
        pan: generatePAN(),
        bankName: selectRandom(INDIAN_BANKS),
        accountNumber: generateAccountNumber(),
        ifscCode: generateIFSC(),
        upiId: `${seller.email.split('@')[0]}@paytm`,
      },
      branding: {
        primaryColor: generateHexColor(),
        secondaryColor: generateHexColor(),
      },
      integrations: generateIntegrations(businessType), // E-commerce has Shopify/WooCommerce
      settings: {
        notificationEmail: seller.email,
        notificationPhone: seller.profile.phone,
        autoGenerateInvoice: true,
      },
      wallet: {
        balance: randomFloat(5000, 50000, 2), // Starting balance
        currency: 'INR',
        lastUpdated: new Date(),
        lowBalanceThreshold: 500,
      },
      status: selectWeighted(['approved', 'kyc_submitted', 'suspended'], [85, 10, 5]),
      isActive: true,
      isDeleted: false,
    });
  }

  await Company.insertMany(companies);

  // Link companies to seller users
  for (let i = 0; i < companies.length; i++) {
    await User.updateOne(
      { _id: sellerUsers[i]._id },
      { companyId: companies[i]._id }
    );
  }

  console.log(`✅ Seeded ${companies.length} companies`);
}
```

**Real-World Patterns**:
- Company names match business type (e.g., "Mumbai Fashion Hub", "Tech Galaxy Electronics Bangalore")
- GSTIN format: `27XXXXX1234X1Z5` (state code + PAN + entity code + checksum)
- PAN format: `ABCDE1234F`
- IFSC format: `HDFC0001234` (bank code + branch code)
- Wallet balance: ₹5,000-₹50,000 initial balance
- Status: 85% approved, 10% kyc_submitted, 5% suspended
- E-commerce companies have Shopify/WooCommerce integrations

---

### 4.3 KYC Records (`03-kyc.seeder.ts`)

**Goal**: Generate 100-120 KYC records (one per company)

**Logic**:
```typescript
export async function seedKYC() {
  const companies = await Company.find({ status: { $in: ['approved', 'kyc_submitted'] } }).populate('owner');
  const kycRecords = [];

  for (const company of companies) {
    const owner = await User.findOne({ companyId: company._id, teamRole: 'owner' });
    const status = company.status === 'approved' ? 'verified' : selectWeighted(['pending', 'verified'], [30, 70]);

    kycRecords.push({
      userId: owner._id,
      companyId: company._id,
      status,
      documents: {
        pan: {
          number: company.billingInfo.pan, // Will be encrypted
          image: `https://storage.shipcrowd.com/kyc/pan/${generateUUID()}.pdf`,
          verified: status === 'verified',
          verifiedAt: status === 'verified' ? faker.date.past({ years: 1 }) : undefined,
          name: owner.name,
        },
        aadhaar: {
          number: generateAadhaar(), // Will be encrypted
          frontImage: `https://storage.shipcrowd.com/kyc/aadhaar/${generateUUID()}_front.jpg`,
          backImage: `https://storage.shipcrowd.com/kyc/aadhaar/${generateUUID()}_back.jpg`,
          verified: status === 'verified',
          verifiedAt: status === 'verified' ? faker.date.past({ years: 1 }) : undefined,
        },
        gstin: {
          number: company.billingInfo.gstin,
          verified: status === 'verified',
          verifiedAt: status === 'verified' ? faker.date.past({ years: 1 }) : undefined,
          businessName: company.name,
          legalName: company.name,
          status: 'Active',
          registrationType: 'Regular',
          businessType: ['Retail Business'],
          addresses: [{
            type: 'Principal',
            address: `${company.address.line1}, ${company.address.city}, ${company.address.state} - ${company.address.postalCode}`,
            businessNature: 'Warehouse / Depot',
          }],
          registrationDate: faker.date.past({ years: 3 }).toISOString().split('T')[0],
        },
        bankAccount: {
          accountNumber: company.billingInfo.accountNumber, // Will be encrypted
          ifscCode: company.billingInfo.ifscCode,
          accountHolderName: owner.name,
          bankName: company.billingInfo.bankName,
          verified: status === 'verified',
          verifiedAt: status === 'verified' ? faker.date.past({ years: 1 }) : undefined,
          proofImage: `https://storage.shipcrowd.com/kyc/bank/${generateUUID()}.pdf`,
        },
      },
      completionStatus: {
        personalKycComplete: true,
        companyInfoComplete: true,
        bankDetailsComplete: true,
        agreementComplete: status === 'verified',
      },
      verificationNotes: status === 'verified' ? 'All documents verified successfully' : 'Pending review',
    });
  }

  await KYC.insertMany(kycRecords);
  console.log(`✅ Seeded ${kycRecords.length} KYC records`);
}
```

**Real-World Patterns**:
- PAN, Aadhaar, Bank Account numbers are encrypted at rest (mongoose-field-encryption)
- Aadhaar format: `1234 5678 9012` (12 digits)
- GSTIN verified via DeepVue API (mocked as verified in seed)
- Document URLs point to cloud storage (S3/CDN)
- 70% verified, 30% pending (realistic approval rate)

---

### 4.4 Warehouses (`04-warehouses.seeder.ts`)

**Goal**: Generate 200-300 warehouses (2-3 per company)

**Logic**:
```typescript
export async function seedWarehouses() {
  const companies = await Company.find({ status: 'approved' });
  const warehouses = [];

  for (const company of companies) {
    const warehouseCount = selectBusinessType(company.name) === 'B2B' ? randomInt(2, 4) : randomInt(2, 3);

    for (let i = 0; i < warehouseCount; i++) {
      const city = i === 0 ? company.address.city : selectNearbyCity(company.address.city);
      const pincode = generatePincodeForCity(city);

      warehouses.push({
        name: `${company.name.split(' ')[0]} ${city} WH-${i + 1}`,
        companyId: company._id,
        address: {
          line1: generateIndustrialAddress(city),
          line2: `Warehouse Complex, Unit ${randomInt(1, 50)}`,
          city,
          state: getStateForCity(city),
          country: 'India',
          postalCode: pincode,
          coordinates: {
            latitude: getCityCoordinates(city).lat + randomFloat(-0.1, 0.1, 6),
            longitude: getCityCoordinates(city).lng + randomFloat(-0.1, 0.1, 6),
          },
        },
        contactInfo: {
          name: generateIndianName(),
          phone: generateIndianPhone(),
          email: `warehouse${i + 1}@${company.billingInfo.gstin.slice(2, 12)}.com`,
          alternatePhone: generateIndianPhone(),
        },
        operatingHours: {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '18:00' },
          saturday: { open: '10:00', close: '16:00' },
          sunday: { open: null, close: null }, // Closed
        },
        isActive: true,
        isDefault: i === 0, // First warehouse is default
        isDeleted: false,
        carrierDetails: {
          velocityWarehouseId: `VEL${randomInt(100000, 999999)}`,
          delhiveryWarehouseId: `DHL${randomInt(100000, 999999)}`,
          dtdcWarehouseId: `DTDC${randomInt(10000, 99999)}`,
          xpressbeesWarehouseId: `XB${randomInt(100000, 999999)}`,
          lastSyncedAt: faker.date.recent({ days: 7 }),
        },
      });
    }
  }

  await Warehouse.insertMany(warehouses);

  // Update Company.settings.defaultWarehouseId
  for (const company of companies) {
    const defaultWarehouse = warehouses.find(w => w.companyId.equals(company._id) && w.isDefault);
    await Company.updateOne(
      { _id: company._id },
      { 'settings.defaultWarehouseId': defaultWarehouse._id }
    );
  }

  console.log(`✅ Seeded ${warehouses.length} warehouses`);
}
```

**Real-World Patterns**:
- B2B companies have 2-4 warehouses, E-commerce/Electronics have 2-3
- First warehouse is in company's home city, others in nearby metros/tier-2 cities
- Industrial area addresses (e.g., "Plot 45, MIDC Industrial Area, Pune")
- Operating hours: Mon-Fri 9 AM-6 PM, Sat 10 AM-4 PM, Sun closed
- Carrier-specific warehouse IDs for integration
- GPS coordinates ±0.1° from city center

---

### 4.5 Orders (`07-orders.seeder.ts`)

**Goal**: Generate 3,000-5,000 orders distributed over 12 months

**Logic**:
```typescript
export async function seedOrders() {
  const companies = await Company.find({ status: 'approved' });
  const warehouses = await Warehouse.find({ isActive: true });
  const orders = [];

  const startDate = subMonths(new Date(), 12);
  const endDate = new Date();

  for (const company of companies) {
    const businessType = getBusinessType(company.name);
    const monthlyOrders = getMonthlyOrderVolume(businessType); // Fashion: 40-60, Electronics: 30-50, B2B: 20-40

    for (let month = 0; month < 12; month++) {
      const monthStart = addMonths(startDate, month);
      const seasonalMultiplier = getSeasonalMultiplier(monthStart); // Diwali 1.5x, Christmas 1.3x, etc.
      const orderCount = Math.round(monthlyOrders * seasonalMultiplier);

      for (let i = 0; i < orderCount; i++) {
        const orderDate = faker.date.between({ from: monthStart, to: addMonths(monthStart, 1) });
        const customerCity = selectCustomerCity(company.address.city); // 60% same state, 40% other states
        const paymentMethod = selectPaymentMethod(customerCity, businessType); // COD 60%, Prepaid 40%

        const products = generateOrderProducts(businessType); // 1-5 products
        const subtotal = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const tax = subtotal * 0.18; // 18% GST
        const shippingCost = calculateShippingCost(products, customerCity);
        const discount = selectWeighted([0, subtotal * 0.1, subtotal * 0.15], [70, 20, 10]); // 70% no discount, 20% 10% off, 10% 15% off
        const total = subtotal + tax + shippingCost - discount;

        const orderNumber = generateOrderNumber(company._id, orderDate);

        orders.push({
          orderNumber,
          companyId: company._id,
          customerInfo: {
            name: generateIndianName(),
            email: faker.internet.email().toLowerCase(),
            phone: generateIndianPhone(),
            address: {
              line1: generateStreetAddress(customerCity),
              line2: generateLandmark(),
              city: customerCity,
              state: getStateForCity(customerCity),
              country: 'India',
              postalCode: generatePincodeForCity(customerCity),
            },
          },
          products,
          shippingDetails: {
            shippingCost,
          },
          paymentStatus: selectWeighted(['paid', 'pending', 'failed'], [85, 10, 5]),
          paymentMethod,
          source: selectSource(company.integrations),
          warehouseId: selectWarehouse(warehouses, company._id)._id,
          statusHistory: [{
            status: 'pending',
            timestamp: orderDate,
            comment: 'Order placed',
          }],
          currentStatus: 'pending',
          totals: {
            subtotal,
            tax,
            shipping: shippingCost,
            discount,
            total,
          },
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
          tags: selectOrderTags(businessType),
          isDeleted: false,
          createdAt: orderDate,
          updatedAt: orderDate,
        });
      }
    }
  }

  await Order.insertMany(orders);
  console.log(`✅ Seeded ${orders.length} orders`);
}
```

**Real-World Patterns**:
- Order volume varies by business type and season
- Seasonal spikes: Diwali (Oct-Nov) 1.5x, Christmas (Dec) 1.3x, Wedding Season (Jan-Feb) 1.2x
- Customer location: 60% same state, 40% cross-state
- Payment method: COD higher in Tier-2/3 cities (70%), Prepaid higher in metros (50%)
- Order value: Fashion ₹500-₹3,000, Electronics ₹5,000-₹50,000, B2B ₹10,000-₹100,000
- Product count: Fashion 1-5 items, Electronics 1-2 items, B2B 10-50 items
- Payment status: 85% paid, 10% pending, 5% failed
- Source distribution: Manual 40%, Shopify 30%, WooCommerce 20%, API 10%

---

### 4.6 Shipments (`08-shipments.seeder.ts`)

**Goal**: Generate 3,000-5,000 shipments (one per order)

**Logic**:
```typescript
export async function seedShipments() {
  const orders = await Order.find({ isDeleted: false }).populate('companyId warehouseId');
  const shipments = [];

  for (const order of orders) {
    const carrier = selectCarrier(order.customerInfo.address.city); // Delhivery 30%, Bluedart 20%, etc.
    const serviceType = selectServiceType(order.paymentMethod, carrier); // Express/Standard/Economy
    const trackingNumber = generateTrackingNumber(carrier, order.createdAt);

    const pickupDate = addDays(order.createdAt, randomInt(1, 3));
    const estimatedDelivery = calculateEstimatedDelivery(pickupDate, order.customerInfo.address.city, serviceType);

    const deliveryStatus = selectDeliveryStatus(); // 85% delivered, 5-8% NDR, 5-7% RTO
    const actualDelivery = deliveryStatus === 'delivered'
      ? addDays(pickupDate, randomInt(2, 7))
      : undefined;

    const statusHistory = generateStatusHistory(pickupDate, actualDelivery, deliveryStatus);

    // Calculate package details
    const totalWeight = order.products.reduce((sum, p) => sum + (p.weight || 0.5) * p.quantity, 0);
    const dimensions = calculatePackageDimensions(order.products);

    const shipment = {
      trackingNumber,
      orderId: order._id,
      companyId: order.companyId._id,
      carrier,
      serviceType,
      packageDetails: {
        weight: totalWeight,
        dimensions,
        packageCount: 1,
        packageType: selectPackageType(totalWeight),
        declaredValue: order.totals.subtotal,
      },
      pickupDetails: {
        warehouseId: order.warehouseId._id,
        pickupDate,
        pickupReference: `PU${randomInt(100000, 999999)}`,
        contactPerson: order.warehouseId.contactInfo.name,
        contactPhone: order.warehouseId.contactInfo.phone,
      },
      deliveryDetails: {
        recipientName: order.customerInfo.name,
        recipientPhone: order.customerInfo.phone,
        recipientEmail: order.customerInfo.email,
        address: order.customerInfo.address,
        instructions: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
      },
      paymentDetails: {
        type: order.paymentMethod,
        codAmount: order.paymentMethod === 'cod' ? order.totals.total : undefined,
        shippingCost: order.shippingDetails.shippingCost,
        currency: 'INR',
      },
      statusHistory,
      currentStatus: statusHistory[statusHistory.length - 1].status,
      estimatedDelivery,
      actualDelivery,
      documents: [
        {
          type: 'label',
          url: `https://storage.shipcrowd.com/labels/${trackingNumber}.pdf`,
          createdAt: pickupDate,
        },
        {
          type: 'invoice',
          url: `https://storage.shipcrowd.com/invoices/${order.orderNumber}.pdf`,
          createdAt: pickupDate,
        },
      ],
      carrierDetails: {
        carrierTrackingNumber: `${carrier.slice(0, 3).toUpperCase()}${randomInt(10000000, 99999999)}`,
        carrierServiceType: serviceType,
        carrierAccount: `${order.companyId._id.toString().slice(-6)}`,
      },
      // NDR details will be added in NDR seeder
      // RTO details will be added in RTO seeder
      isDeleted: false,
      createdAt: order.createdAt,
      updatedAt: actualDelivery || new Date(),
    };

    shipments.push(shipment);
  }

  await Shipment.insertMany(shipments);
  console.log(`✅ Seeded ${shipments.length} shipments`);
}

function generateStatusHistory(pickupDate, actualDelivery, deliveryStatus) {
  const history = [
    { status: 'created', timestamp: pickupDate, description: 'Shipment created' },
    { status: 'picked_up', timestamp: addHours(pickupDate, randomInt(2, 8)), location: 'Origin Warehouse', description: 'Package picked up by courier' },
  ];

  if (deliveryStatus === 'delivered') {
    history.push(
      { status: 'in_transit', timestamp: addDays(pickupDate, 1), location: 'Sorting Hub', description: 'In transit to destination' },
      { status: 'out_for_delivery', timestamp: addHours(actualDelivery, -randomInt(2, 6)), location: 'Destination Hub', description: 'Out for delivery' },
      { status: 'delivered', timestamp: actualDelivery, location: 'Destination Address', description: 'Delivered successfully' }
    );
  } else if (deliveryStatus === 'ndr') {
    history.push(
      { status: 'in_transit', timestamp: addDays(pickupDate, 1), location: 'Sorting Hub', description: 'In transit to destination' },
      { status: 'out_for_delivery', timestamp: addDays(pickupDate, 2), location: 'Destination Hub', description: 'Out for delivery' },
      { status: 'ndr', timestamp: addDays(pickupDate, 3), location: 'Destination Address', description: 'Non-delivery report - Customer unavailable' }
    );
  } else if (deliveryStatus === 'rto') {
    history.push(
      { status: 'in_transit', timestamp: addDays(pickupDate, 1), location: 'Sorting Hub', description: 'In transit to destination' },
      { status: 'ndr', timestamp: addDays(pickupDate, 3), location: 'Destination Address', description: 'Non-delivery report - Address issue' },
      { status: 'rto_initiated', timestamp: addDays(pickupDate, 5), location: 'Destination Hub', description: 'Return to origin initiated' }
    );
  }

  return history;
}
```

**Real-World Patterns**:
- Tracking number format: Carrier-specific (Delhivery: `DHL1234567890`, Bluedart: `BLU123456789012`)
- Pickup: 1-3 days after order placement
- Delivery time: Metro-to-metro 2-3 days, Metro-to-tier-2 3-5 days, Cross-region 4-7 days
- Package weight: Fashion 0.5-2 kg, Electronics 1-5 kg, B2B 10-50 kg
- Status progression: created → picked_up → in_transit → out_for_delivery → delivered/ndr/rto
- Delivery success: 85% delivered, 5-8% NDR, 5-7% RTO
- Documents: Label, Invoice, Manifest (generated for each shipment)

---

### 4.7 NDR Events (`09-ndr-events.seeder.ts`)

**Goal**: Generate 150-250 NDR events (5-8% of shipments)

**Logic**:
```typescript
export async function seedNDREvents() {
  const failedShipments = await Shipment.find({
    currentStatus: { $in: ['ndr', 'ndr_reattempt'] }
  }).populate('orderId companyId');

  const ndrEvents = [];

  for (const shipment of failedShipments) {
    const ndrType = selectNDRType(); // address_issue 30%, customer_unavailable 40%, payment_issue 20%, refused 10%
    const ndrReason = generateNDRReason(ndrType);
    const detectedAt = shipment.statusHistory.find(s => s.status === 'ndr')?.timestamp || new Date();
    const resolutionDeadline = addHours(detectedAt, 48); // 48-hour SLA

    const status = selectNDRStatus(); // detected 40%, in_resolution 30%, resolved 20%, rto_triggered 10%
    const resolutionActions = generateResolutionActions(ndrType, status);

    ndrEvents.push({
      shipment: shipment._id,
      awb: shipment.trackingNumber,
      ndrReason,
      ndrReasonClassified: classifyNDRReason(ndrReason),
      ndrType,
      detectedAt,
      courierRemarks: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.6 }),
      attemptNumber: randomInt(1, 3),
      status,
      resolutionActions,
      customerContacted: status !== 'detected',
      customerResponse: status === 'resolved' ? 'Customer confirmed reattempt' : undefined,
      resolutionDeadline,
      resolvedAt: status === 'resolved' ? faker.date.between({ from: detectedAt, to: resolutionDeadline }) : undefined,
      resolvedBy: status === 'resolved' ? 'system' : undefined,
      resolutionMethod: status === 'resolved' ? selectResolutionMethod() : undefined,
      autoRtoTriggered: status === 'rto_triggered',
      company: shipment.companyId._id,
      order: shipment.orderId._id,
      classificationConfidence: randomInt(70, 99),
      classificationSource: selectRandom(['openai', 'keyword', 'manual'], [30, 60, 10]),
      idempotencyKey: status === 'rto_triggered' ? `${shipment.trackingNumber}-rto-${Date.now()}` : undefined,
      createdAt: detectedAt,
      updatedAt: new Date(),
    });

    // Update shipment with NDR details
    await Shipment.updateOne(
      { _id: shipment._id },
      {
        'ndrDetails.ndrReason': ndrReason,
        'ndrDetails.ndrDate': detectedAt,
        'ndrDetails.ndrStatus': status === 'rto_triggered' ? 'return_initiated' : status === 'resolved' ? 'resolved' : 'pending',
        'ndrDetails.ndrAttempts': randomInt(1, 3),
        'ndrDetails.ndrResolutionDate': status === 'resolved' ? faker.date.between({ from: detectedAt, to: resolutionDeadline }) : undefined,
      }
    );
  }

  await NDREvent.insertMany(ndrEvents);
  console.log(`✅ Seeded ${ndrEvents.length} NDR events`);
}

function generateResolutionActions(ndrType, status) {
  if (status === 'detected') return [];

  const actions = [
    {
      action: 'Automated WhatsApp notification sent to customer',
      actionType: 'send_whatsapp',
      takenAt: new Date(),
      takenBy: 'system',
      result: 'success',
    },
  ];

  if (status === 'in_resolution' || status === 'resolved') {
    actions.push({
      action: 'Called customer to confirm address',
      actionType: 'call_customer',
      takenAt: addHours(new Date(), -2),
      takenBy: 'customer_support',
      result: status === 'resolved' ? 'success' : 'failed',
    });
  }

  if (status === 'resolved') {
    actions.push({
      action: 'Requested reattempt with updated address',
      actionType: 'request_reattempt',
      takenAt: addHours(new Date(), -1),
      takenBy: 'system',
      result: 'success',
    });
  }

  if (status === 'rto_triggered') {
    actions.push({
      action: 'Resolution deadline exceeded - Auto RTO triggered',
      actionType: 'trigger_rto',
      takenAt: new Date(),
      takenBy: 'system',
      result: 'success',
    });
  }

  return actions;
}
```

**Real-World Patterns**:
- NDR distribution: address_issue 30%, customer_unavailable 40%, payment_issue 20%, refused 10%
- Resolution SLA: 48 hours
- Resolution actions: WhatsApp → Call → Address update → Reattempt/RTO
- Status progression: detected (40%) → in_resolution (30%) → resolved (20%) / rto_triggered (10%)
- AI classification: OpenAI 30%, keyword matching 60%, manual 10%
- Attempt number: 1-3 delivery attempts before NDR

---

### 4.8 RTO Events (`10-rto-events.seeder.ts`)

**Goal**: Generate 150-210 RTO events (5-7% of shipments)

**Logic**:
```typescript
export async function seedRTOEvents() {
  const rtoShipments = await Shipment.find({
    currentStatus: { $in: ['rto_initiated', 'rto_in_transit', 'rto_delivered'] }
  }).populate('orderId companyId warehouseId');

  const rtoEvents = [];

  for (const shipment of rtoShipments) {
    const rtoReason = selectRTOReason(); // ndr_unresolved 60%, customer_cancellation 25%, damaged_in_transit 10%, refused 5%
    const triggeredBy = rtoReason === 'ndr_unresolved' ? 'auto' : 'manual';
    const triggeredAt = shipment.statusHistory.find(s => s.status === 'rto_initiated')?.timestamp || new Date();

    const ndrEvent = rtoReason === 'ndr_unresolved'
      ? await NDREvent.findOne({ shipment: shipment._id, status: 'rto_triggered' })
      : undefined;

    const expectedReturnDate = addDays(triggeredAt, randomInt(5, 10));
    const actualReturnDate = selectWeighted([expectedReturnDate, addDays(expectedReturnDate, randomInt(1, 3)), null], [60, 30, 10]); // 60% on-time, 30% delayed, 10% still in transit

    const returnStatus = actualReturnDate
      ? selectRTOStatus(actualReturnDate) // delivered_to_warehouse → qc_pending → qc_completed → restocked/disposed
      : selectWeighted(['initiated', 'in_transit'], [30, 70]);

    const qcResult = returnStatus === 'qc_completed' || returnStatus === 'restocked' || returnStatus === 'disposed'
      ? generateQCResult()
      : undefined;

    const rtoCharges = calculateRTOCharges(shipment.paymentDetails.shippingCost);

    rtoEvents.push({
      shipment: shipment._id,
      order: shipment.orderId._id,
      reverseAwb: generateReverseTrackingNumber(shipment.trackingNumber),
      rtoReason,
      ndrEvent: ndrEvent?._id,
      triggeredBy,
      triggeredByUser: triggeredBy === 'manual' ? 'customer_support' : undefined,
      triggeredAt,
      rtoCharges,
      chargesDeducted: true,
      chargesDeductedAt: addHours(triggeredAt, randomInt(1, 24)),
      warehouse: shipment.pickupDetails.warehouseId,
      expectedReturnDate,
      actualReturnDate,
      returnStatus,
      qcResult,
      company: shipment.companyId._id,
      customerNotified: true,
      warehouseNotified: actualReturnDate ? true : false,
      metadata: {
        originalShippingCost: shipment.paymentDetails.shippingCost,
        totalLoss: rtoCharges + shipment.paymentDetails.shippingCost,
      },
      createdAt: triggeredAt,
      updatedAt: actualReturnDate || new Date(),
    });

    // Update shipment with RTO details
    await Shipment.updateOne(
      { _id: shipment._id },
      {
        'rtoDetails.rtoInitiatedDate': triggeredAt,
        'rtoDetails.rtoReason': rtoReason,
        'rtoDetails.rtoExpectedDate': expectedReturnDate,
        'rtoDetails.rtoActualDate': actualReturnDate,
        'rtoDetails.rtoStatus': returnStatus,
        'rtoDetails.rtoTrackingNumber': `RTO-${shipment.trackingNumber}`,
        'rtoDetails.rtoShippingCost': rtoCharges,
        'rtoDetails.qcPassed': qcResult?.passed,
      }
    );
  }

  await RTOEvent.insertMany(rtoEvents);
  console.log(`✅ Seeded ${rtoEvents.length} RTO events`);
}

function generateQCResult() {
  const passed = selectWeighted([true, false], [70, 30]); // 70% pass, 30% fail

  return {
    passed,
    remarks: passed ? 'Product in good condition' : selectRandom([
      'Packaging damaged',
      'Product damaged',
      'Wrong item',
      'Missing accessories',
    ]),
    images: passed ? [] : [`https://storage.shipcrowd.com/qc/${generateUUID()}.jpg`],
    inspectedBy: generateIndianName(),
    inspectedAt: new Date(),
  };
}

function calculateRTOCharges(forwardShippingCost) {
  // RTO charges are typically 1.2x-1.5x forward shipping cost
  return Math.round(forwardShippingCost * randomFloat(1.2, 1.5, 2));
}
```

**Real-World Patterns**:
- RTO reasons: ndr_unresolved 60%, customer_cancellation 25%, damaged_in_transit 10%, refused 5%
- 60% RTO triggered automatically after NDR deadline, 40% manual
- Return transit time: 5-10 days
- Delivery timeline: 60% on-time, 30% delayed, 10% still in transit
- QC pass rate: 70% pass (restocked), 30% fail (disposed)
- RTO charges: 1.2x-1.5x forward shipping cost
- Total loss: Forward + Reverse shipping cost + COD amount (if applicable)
- Status progression: initiated → in_transit → delivered_to_warehouse → qc_pending → qc_completed → restocked/disposed

---

### 4.9 Wallet Transactions (`11-wallet-transactions.seeder.ts`)

**Goal**: Generate 8,000-15,000 wallet transactions (multiple per shipment)

**Logic**:
```typescript
export async function seedWalletTransactions() {
  const companies = await Company.find({ status: 'approved' });
  const transactions = [];

  for (const company of companies) {
    let currentBalance = company.wallet.balance;

    // 1. Initial recharge (starting capital)
    transactions.push({
      company: company._id,
      type: 'credit',
      amount: company.wallet.balance,
      balanceBefore: 0,
      balanceAfter: currentBalance,
      reason: 'recharge',
      description: 'Initial wallet recharge',
      reference: {
        type: 'manual',
        externalId: `RECH-${Date.now()}`,
      },
      createdBy: 'system',
      status: 'completed',
      createdAt: subMonths(new Date(), 12),
    });

    // 2. Transactions for each shipment
    const shipments = await Shipment.find({ companyId: company._id }).populate('orderId');

    for (const shipment of shipments) {
      // Debit: Shipping cost
      currentBalance -= shipment.paymentDetails.shippingCost;
      transactions.push({
        company: company._id,
        type: 'debit',
        amount: shipment.paymentDetails.shippingCost,
        balanceBefore: currentBalance + shipment.paymentDetails.shippingCost,
        balanceAfter: currentBalance,
        reason: 'shipping_cost',
        description: `Shipping cost for ${shipment.trackingNumber}`,
        reference: {
          type: 'shipment',
          id: shipment._id,
        },
        createdBy: 'system',
        status: 'completed',
        createdAt: shipment.createdAt,
      });

      // Debit: RTO charges (if applicable)
      const rtoEvent = await RTOEvent.findOne({ shipment: shipment._id });
      if (rtoEvent) {
        currentBalance -= rtoEvent.rtoCharges;
        transactions.push({
          company: company._id,
          type: 'debit',
          amount: rtoEvent.rtoCharges,
          balanceBefore: currentBalance + rtoEvent.rtoCharges,
          balanceAfter: currentBalance,
          reason: 'rto_charge',
          description: `RTO charges for ${shipment.trackingNumber}`,
          reference: {
            type: 'rto_event',
            id: rtoEvent._id,
          },
          createdBy: 'system',
          status: 'completed',
          createdAt: rtoEvent.triggeredAt,
        });
      }

      // Credit: COD remittance (if COD payment)
      if (shipment.paymentDetails.type === 'cod' && shipment.currentStatus === 'delivered') {
        const remittanceDate = addDays(shipment.actualDelivery, randomInt(3, 7)); // 3-7 days after delivery
        currentBalance += shipment.paymentDetails.codAmount;
        transactions.push({
          company: company._id,
          type: 'credit',
          amount: shipment.paymentDetails.codAmount,
          balanceBefore: currentBalance - shipment.paymentDetails.codAmount,
          balanceAfter: currentBalance,
          reason: 'cod_remittance',
          description: `COD remittance for ${shipment.trackingNumber}`,
          reference: {
            type: 'shipment',
            id: shipment._id,
          },
          createdBy: 'system',
          status: 'completed',
          createdAt: remittanceDate,
        });
      }

      // Low balance recharge (if balance < threshold)
      if (currentBalance < company.wallet.lowBalanceThreshold) {
        const rechargeAmount = randomInt(10000, 30000);
        currentBalance += rechargeAmount;
        transactions.push({
          company: company._id,
          type: 'credit',
          amount: rechargeAmount,
          balanceBefore: currentBalance - rechargeAmount,
          balanceAfter: currentBalance,
          reason: 'recharge',
          description: 'Wallet recharge',
          reference: {
            type: 'payment',
            externalId: `RECH-${Date.now()}`,
          },
          createdBy: 'system',
          status: 'completed',
          createdAt: addDays(shipment.createdAt, randomInt(1, 5)),
        });
      }
    }

    // Update company wallet balance
    await Company.updateOne(
      { _id: company._id },
      { 'wallet.balance': currentBalance, 'wallet.lastUpdated': new Date() }
    );
  }

  await WalletTransaction.insertMany(transactions);
  console.log(`✅ Seeded ${transactions.length} wallet transactions`);
}
```

**Real-World Patterns**:
- Transaction types: Debit (shipping cost, RTO charges), Credit (recharge, COD remittance, refund)
- Shipping cost deducted immediately on shipment creation
- RTO charges deducted 1-24 hours after RTO initiation
- COD remittance credited 3-7 days after delivery
- Auto-recharge when balance < threshold (₹500)
- Balance tracking: balanceBefore + amount (credit) or - amount (debit) = balanceAfter
- Transaction reasons: shipping_cost (60%), cod_remittance (25%), rto_charge (8%), recharge (5%), adjustment (2%)

---

### 4.10 Pick Lists (`12-pick-lists.seeder.ts`)

**Goal**: Generate 500-800 pick lists (batch order picking)

**Logic**:
```typescript
export async function seedPickLists() {
  const warehouses = await Warehouse.find({ isActive: true });
  const pickLists = [];

  for (const warehouse of warehouses) {
    const orders = await Order.find({
      warehouseId: warehouse._id,
      currentStatus: { $in: ['pending', 'processing'] }
    }).limit(50);

    if (orders.length === 0) continue;

    // Group orders into batches (5-15 orders per pick list)
    const batches = chunkArray(orders, randomInt(5, 15));

    for (const batch of batches) {
      const pickListNumber = await PickList.generatePickListNumber();
      const items = [];
      let sequence = 1;

      for (const order of batch) {
        for (const product of order.products) {
          const locationCode = generateLocationCode(); // e.g., "A-12-03" (Zone-Aisle-Rack)
          items.push({
            orderId: order._id,
            orderItemId: new mongoose.Types.ObjectId(),
            orderNumber: order.orderNumber,
            sku: product.sku,
            productName: product.name,
            barcode: generateBarcode(product.sku),
            locationId: new mongoose.Types.ObjectId(),
            locationCode,
            zone: locationCode.split('-')[0],
            aisle: locationCode.split('-')[1],
            quantityRequired: product.quantity,
            quantityPicked: 0,
            quantityShort: 0,
            status: 'PENDING',
            barcodeScanned: false,
            sequence: sequence++,
          });
        }
      }

      // Sort items by location (zone → aisle → rack) for efficient picking
      items.sort((a, b) => a.locationCode.localeCompare(b.locationCode));

      const status = selectPickListStatus(); // PENDING 40%, ASSIGNED 20%, IN_PROGRESS 15%, COMPLETED 20%, PARTIAL 5%
      const priority = selectPriority(); // MEDIUM 60%, HIGH 25%, URGENT 10%, LOW 5%

      const scheduledAt = faker.date.recent({ days: 7 });
      const startedAt = ['IN_PROGRESS', 'COMPLETED', 'PARTIAL'].includes(status)
        ? addMinutes(scheduledAt, randomInt(5, 30))
        : undefined;
      const completedAt = status === 'COMPLETED'
        ? addMinutes(startedAt, randomInt(20, 60))
        : undefined;

      pickLists.push({
        warehouseId: warehouse._id,
        companyId: warehouse.companyId,
        pickListNumber,
        orders: batch.map(o => o._id),
        shipments: [],
        orderCount: batch.length,
        items,
        totalItems: items.length,
        pickedItems: status === 'COMPLETED' ? items.length : Math.floor(items.length * randomFloat(0, 0.8)),
        status,
        assignedTo: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL'].includes(status)
          ? new mongoose.Types.ObjectId()
          : undefined,
        assignedAt: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL'].includes(status)
          ? addMinutes(scheduledAt, randomInt(-60, 0))
          : undefined,
        pickingStrategy: 'BATCH',
        priority,
        estimatedPickTime: Math.ceil(items.length * 1.5), // 1.5 minutes per item
        actualPickTime: completedAt ? Math.round((completedAt - startedAt) / 60000) : undefined,
        scheduledAt,
        startedAt,
        completedAt,
        requiresVerification: true,
        verifiedBy: status === 'COMPLETED' ? new mongoose.Types.ObjectId() : undefined,
        verifiedAt: completedAt ? addMinutes(completedAt, randomInt(5, 15)) : undefined,
        verificationStatus: status === 'COMPLETED' ? 'PASSED' : undefined,
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
        exceptions: status === 'PARTIAL' ? ['Some items out of stock', 'Short pick on SKU-12345'] : [],
        accuracy: status === 'COMPLETED' ? randomInt(85, 100) : undefined,
        efficiency: completedAt ? Math.round(items.length / (actualPickTime / 60)) : undefined, // Items per hour
        createdAt: scheduledAt,
        updatedAt: completedAt || startedAt || scheduledAt,
      });
    }
  }

  await PickList.insertMany(pickLists);
  console.log(`✅ Seeded ${pickLists.length} pick lists`);
}

function generateLocationCode() {
  const zone = selectRandom(['A', 'B', 'C', 'D', 'E']);
  const aisle = randomInt(1, 30).toString().padStart(2, '0');
  const rack = randomInt(1, 50).toString().padStart(2, '0');
  return `${zone}-${aisle}-${rack}`;
}
```

**Real-World Patterns**:
- Batch picking: 5-15 orders per pick list
- Location format: Zone-Aisle-Rack (e.g., "A-12-03")
- Picking sequence: Sorted by location for efficiency
- Status distribution: PENDING 40%, ASSIGNED 20%, IN_PROGRESS 15%, COMPLETED 20%, PARTIAL 5%
- Priority: MEDIUM 60%, HIGH 25%, URGENT 10%, LOW 5%
- Pick time: 1.5 minutes per item on average
- Accuracy: 85-100% for completed pick lists
- Efficiency: 20-40 items per hour

---

## 5. Real-World Logic Implementation

### 5.1 Geographic Data Generation

**Indian Cities Database** (`data/indian-cities.ts`):

```typescript
export const INDIAN_CITIES = {
  metro: [
    { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, pincodes: ['400001', '400020', '400053', '400070', '400092'] },
    { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025, pincodes: ['110001', '110016', '110065', '110092'] },
    { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946, pincodes: ['560001', '560037', '560068', '560103'] },
    { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, pincodes: ['500001', '500034', '500072', '500095'] },
    { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, pincodes: ['600001', '600028', '600095', '600116'] },
    { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, pincodes: ['700001', '700019', '700053', '700091'] },
  ],
  tier2: [
    { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, pincodes: ['411001', '411028', '411057'] },
    { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, pincodes: ['302001', '302021', '302039'] },
    { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, pincodes: ['226001', '226016', '226028'] },
    { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, pincodes: ['380001', '380015', '380054'] },
    { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311, pincodes: ['395001', '395007', '395017'] },
    { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577, pincodes: ['452001', '452010', '452018'] },
  ],
  tier3: [
    { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, pincodes: ['641001', '641012', '641035'] },
    { name: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319, pincodes: ['208001', '208012', '208027'] },
    { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, pincodes: ['440001', '440010', '440025'] },
    { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6869, lng: 83.2185, pincodes: ['530001', '530016', '530045'] },
  ],
};

export function selectWeightedCity() {
  const tier = selectWeighted(['metro', 'tier2', 'tier3'], [50, 35, 15]);
  return selectRandom(INDIAN_CITIES[tier]);
}

export function getStateForCity(cityName: string) {
  for (const tier of ['metro', 'tier2', 'tier3']) {
    const city = INDIAN_CITIES[tier].find(c => c.name === cityName);
    if (city) return city.state;
  }
  return 'Maharashtra'; // Fallback
}

export function generatePincodeForCity(cityName: string) {
  for (const tier of ['metro', 'tier2', 'tier3']) {
    const city = INDIAN_CITIES[tier].find(c => c.name === cityName);
    if (city) return selectRandom(city.pincodes);
  }
  return '400001'; // Fallback
}
```

### 5.2 Business Name Generation

**Business Names Database** (`data/business-names.ts`):

```typescript
export const BUSINESS_NAME_TEMPLATES = {
  fashion: [
    '{City} Fashion Hub',
    '{Adjective} Styles',
    '{Indian Word} Garments',
    'Trendy {City} Boutique',
    '{Founder} Fashion House',
    'Saree {City}',
    'Ethnic {Indian Word}',
  ],
  electronics: [
    '{City} Electronics',
    'Tech {Adjective} Store',
    '{Indian Word} Gadgets',
    'Digital {City} Hub',
    '{Founder} Tech Solutions',
    'Mobile {City}',
    'Smart Electronics {City}',
  ],
  b2b: [
    '{City} Wholesale Traders',
    '{Founder} Distributors',
    'Industrial {City} Supplies',
    '{Indian Word} B2B Solutions',
    'Bulk Bazaar {City}',
    '{Adjective} Trading Company',
  ],
};

const ADJECTIVES = ['Modern', 'Elite', 'Premium', 'Royal', 'Classic', 'Trendy', 'Urban', 'Supreme'];
const INDIAN_WORDS = ['Bharat', 'Desi', 'Swadeshi', 'Bharatiya', 'Hindustani', 'Videsi'];
const FOUNDER_NAMES = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Agarwal', 'Reddy', 'Jain'];

export function generateBusinessName(businessType: string, city: string) {
  const template = selectRandom(BUSINESS_NAME_TEMPLATES[businessType]);
  return template
    .replace('{City}', city)
    .replace('{Adjective}', selectRandom(ADJECTIVES))
    .replace('{Indian Word}', selectRandom(INDIAN_WORDS))
    .replace('{Founder}', selectRandom(FOUNDER_NAMES));
}
```

### 5.3 Product Catalog

**Product Database** (`data/product-catalog.ts`):

```typescript
export const PRODUCT_CATALOG = {
  fashion: [
    { name: 'Cotton Kurti', sku: 'FASH-KUR-001', price: 599, weight: 0.3, category: 'Ethnic Wear' },
    { name: 'Silk Saree', sku: 'FASH-SAR-001', price: 2499, weight: 0.6, category: 'Ethnic Wear' },
    { name: 'Denim Jeans', sku: 'FASH-JNS-001', price: 1299, weight: 0.5, category: 'Western Wear' },
    { name: 'Formal Shirt', sku: 'FASH-SHT-001', price: 899, weight: 0.3, category: 'Formal Wear' },
    { name: 'Party Dress', sku: 'FASH-DRS-001', price: 1899, weight: 0.4, category: 'Western Wear' },
    { name: 'Ethnic Lehenga', sku: 'FASH-LEH-001', price: 4999, weight: 1.2, category: 'Ethnic Wear' },
  ],
  electronics: [
    { name: 'Bluetooth Headphones', sku: 'ELEC-HDP-001', price: 1999, weight: 0.3, category: 'Audio' },
    { name: 'Smartphone', sku: 'ELEC-PHN-001', price: 15999, weight: 0.2, category: 'Mobile' },
    { name: 'Laptop', sku: 'ELEC-LAP-001', price: 45999, weight: 2.5, category: 'Computer' },
    { name: 'Smart Watch', sku: 'ELEC-WCH-001', price: 3999, weight: 0.1, category: 'Wearables' },
    { name: 'Wireless Mouse', sku: 'ELEC-MSE-001', price: 599, weight: 0.1, category: 'Accessories' },
    { name: 'Power Bank', sku: 'ELEC-PWR-001', price: 1499, weight: 0.3, category: 'Accessories' },
  ],
  b2b: [
    { name: 'Office Stationery Bundle', sku: 'B2B-STA-001', price: 2500, weight: 5.0, category: 'Office Supplies' },
    { name: 'Industrial Tools Set', sku: 'B2B-TLS-001', price: 15000, weight: 15.0, category: 'Tools' },
    { name: 'Packaging Material Box', sku: 'B2B-PKG-001', price: 3500, weight: 10.0, category: 'Packaging' },
    { name: 'Safety Equipment Kit', sku: 'B2B-SFT-001', price: 8500, weight: 8.0, category: 'Safety' },
  ],
};

export function generateOrderProducts(businessType: string) {
  const catalog = PRODUCT_CATALOG[businessType];
  const productCount = businessType === 'b2b' ? randomInt(5, 20) : randomInt(1, 5);
  const products = [];

  for (let i = 0; i < productCount; i++) {
    const product = selectRandom(catalog);
    products.push({
      name: product.name,
      sku: product.sku,
      quantity: businessType === 'b2b' ? randomInt(5, 50) : randomInt(1, 3),
      price: product.price,
      weight: product.weight,
      dimensions: {
        length: randomInt(10, 50),
        width: randomInt(10, 40),
        height: randomInt(5, 30),
      },
    });
  }

  return products;
}
```

### 5.4 Seasonal Variations

**Seasonal Multipliers** (`utils/date.utils.ts`):

```typescript
export function getSeasonalMultiplier(date: Date): number {
  const month = date.getMonth() + 1; // 1-12

  // Diwali (October-November)
  if (month === 10 || month === 11) return 1.5;

  // Christmas/New Year (December)
  if (month === 12) return 1.3;

  // Wedding Season (January-February)
  if (month === 1 || month === 2) return 1.2;

  // Monsoon (June-August) - Lower orders
  if (month >= 6 && month <= 8) return 0.9;

  // Summer (March-May) - Slightly lower
  if (month >= 3 && month <= 5) return 0.95;

  // Normal months
  return 1.0;
}
```

### 5.5 Payment Method Distribution

**Payment Selection Logic** (`generators/order.generator.ts`):

```typescript
export function selectPaymentMethod(customerCity: string, businessType: string): 'cod' | 'prepaid' {
  const cityTier = getCityTier(customerCity);

  // Metro cities: 50% COD, 50% Prepaid
  if (cityTier === 'metro') {
    return selectWeighted(['cod', 'prepaid'], [50, 50]);
  }

  // Tier-2 cities: 65% COD, 35% Prepaid
  if (cityTier === 'tier2') {
    return selectWeighted(['cod', 'prepaid'], [65, 35]);
  }

  // Tier-3 cities: 75% COD, 25% Prepaid
  if (cityTier === 'tier3') {
    return selectWeighted(['cod', 'prepaid'], [75, 25]);
  }

  // Electronics has higher prepaid (trust factor)
  if (businessType === 'electronics') {
    return selectWeighted(['cod', 'prepaid'], [40, 60]);
  }

  return 'cod';
}
```

---

## 6. Indian Geography Data

### 6.1 Pincode Database

Generate realistic pincode ranges for each city:

```typescript
export const PINCODE_RANGES = {
  Mumbai: ['400001', '400092'], // 400xxx series
  Delhi: ['110001', '110096'], // 110xxx series
  Bangalore: ['560001', '560103'], // 560xxx series
  Hyderabad: ['500001', '500095'], // 500xxx series
  Chennai: ['600001', '600119'], // 600xxx series
  Kolkata: ['700001', '700156'], // 700xxx series
  Pune: ['411001', '411062'], // 411xxx series
  Jaipur: ['302001', '302039'], // 302xxx series
  Lucknow: ['226001', '226031'], // 226xxx series
};

export function generatePincodeForCity(city: string): string {
  const range = PINCODE_RANGES[city];
  if (!range) return '400001'; // Fallback

  const start = parseInt(range[0]);
  const end = parseInt(range[1]);
  return randomInt(start, end).toString();
}
```

### 6.2 Indian Names Database

**Names Generator** (`data/customer-names.ts`):

```typescript
export const INDIAN_NAMES = {
  male: {
    first: ['Raj', 'Amit', 'Vikram', 'Arjun', 'Rahul', 'Karan', 'Rohan', 'Aditya', 'Sanjay', 'Suresh'],
    last: ['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Agarwal', 'Jain', 'Verma', 'Rao'],
  },
  female: {
    first: ['Priya', 'Ananya', 'Sneha', 'Kavya', 'Anjali', 'Neha', 'Riya', 'Pooja', 'Shalini', 'Deepika'],
    last: ['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Agarwal', 'Jain', 'Verma', 'Rao'],
  },
};

export function generateIndianName(gender?: 'male' | 'female'): string {
  const g = gender || selectRandom(['male', 'female']);
  const first = selectRandom(INDIAN_NAMES[g].first);
  const last = selectRandom(INDIAN_NAMES[g].last);
  return `${first} ${last}`;
}

export function generateIndianPhone(): string {
  // Indian mobile: +91-XXXXX-XXXXX (10 digits starting with 6-9)
  const prefix = selectRandom(['6', '7', '8', '9']);
  const number = prefix + randomInt(100000000, 999999999).toString();
  return `+91-${number.slice(0, 5)}-${number.slice(5)}`;
}
```

### 6.3 Address Generation

**Address Utils** (`utils/address.utils.ts`):

```typescript
export function generateStreetAddress(city: string): string {
  const templates = [
    `${randomInt(1, 999)} ${selectRandom(['MG Road', 'Main Street', 'Park Avenue', 'Gandhi Road', 'Station Road'])}`,
    `Flat ${randomInt(1, 20)}, ${selectRandom(['Shanti Apartments', 'Green Heights', 'Royal Palace', 'Krishna Residency'])}`,
    `Plot ${randomInt(1, 100)}, Sector ${randomInt(1, 50)}`,
  ];
  return selectRandom(templates);
}

export function generateLandmark(): string | undefined {
  return faker.helpers.maybe(() => selectRandom([
    'Near City Hospital',
    'Opposite Metro Station',
    'Behind Central Mall',
    'Near HDFC Bank',
    'Next to Coffee Day',
  ]), { probability: 0.6 });
}

export function generateIndustrialAddress(city: string): string {
  return `Plot ${randomInt(1, 200)}, ${selectRandom(['MIDC Industrial Area', 'SEZ Zone', 'Industrial Estate', 'Export Promotion Zone'])}`;
}
```

---

## 7. Relationship Management

### 7.1 Dependency Graph

```
Users (Admin, Sellers, Staff)
  ↓
Companies ← KYC
  ↓
Warehouses → Inventory
  ↓
Orders → Products
  ↓
Shipments → Documents
  ↓
NDREvents ← ResolutionActions
  ↓
RTOEvents ← QCResults
  ↓
WalletTransactions
  ↓
PickLists → PickListItems
```

### 7.2 Foreign Key Linking

**Example: Link Company to User**:
```typescript
// Create users first
const users = await User.insertMany(usersData);

// Create companies with userId reference
const companies = usersData.map((userData, index) => ({
  ...companyData,
  // No userId field in Company model, but link via User.companyId
}));
await Company.insertMany(companies);

// Update users with companyId
for (let i = 0; i < users.length; i++) {
  await User.updateOne(
    { _id: users[i]._id },
    { companyId: companies[i]._id }
  );
}
```

### 7.3 Orphan Prevention

**Pre-Seeding Checks**:
```typescript
async function validateDependencies() {
  // Ensure users exist before creating companies
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    throw new Error('❌ Users must be seeded before companies');
  }

  // Ensure companies exist before creating orders
  const companyCount = await Company.countDocuments({ status: 'approved' });
  if (companyCount === 0) {
    throw new Error('❌ Approved companies must exist before creating orders');
  }
}
```

---

## 8. Execution Plan

### 8.1 Seeding Command

**Add to `package.json`**:
```json
{
  "scripts": {
    "seed": "ts-node src/infrastructure/database/seeders/index.ts",
    "seed:users": "ts-node src/infrastructure/database/seeders/seeders/01-users.seeder.ts",
    "seed:clean": "ts-node src/infrastructure/database/seeders/index.ts --clean",
    "seed:dev": "NODE_ENV=development ts-node src/infrastructure/database/seeders/index.ts",
    "seed:prod": "NODE_ENV=production ts-node src/infrastructure/database/seeders/index.ts"
  }
}
```

### 8.2 Main Seeder Entry Point

**`seeders/index.ts`**:
```typescript
import mongoose from 'mongoose';
import { seedUsers } from './seeders/01-users.seeder';
import { seedCompanies } from './seeders/02-companies.seeder';
import { seedKYC } from './seeders/03-kyc.seeder';
import { seedWarehouses } from './seeders/04-warehouses.seeder';
import { seedRateCards } from './seeders/05-rate-cards.seeder';
import { seedInventory } from './seeders/06-inventory.seeder';
import { seedOrders } from './seeders/07-orders.seeder';
import { seedShipments } from './seeders/08-shipments.seeder';
import { seedNDREvents } from './seeders/09-ndr-events.seeder';
import { seedRTOEvents } from './seeders/10-rto-events.seeder';
import { seedWalletTransactions } from './seeders/11-wallet-transactions.seeder';
import { seedPickLists } from './seeders/12-pick-lists.seeder';
import { seedSessions } from './seeders/13-sessions.seeder';
import { logger } from './utils/logger.utils';

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd');
    logger.info('✅ Connected to MongoDB');

    // Clean database if --clean flag is passed
    if (process.argv.includes('--clean')) {
      logger.warn('⚠️  Cleaning database...');
      await cleanDatabase();
      logger.info('✅ Database cleaned');
    }

    // Seed in order (dependency management)
    logger.info('🌱 Starting database seeding...\n');

    const startTime = Date.now();

    await seedUsers();
    await seedCompanies();
    await seedKYC();
    await seedWarehouses();
    await seedRateCards();
    await seedInventory();
    await seedOrders();
    await seedShipments();
    await seedNDREvents();
    await seedRTOEvents();
    await seedWalletTransactions();
    await seedPickLists();
    await seedSessions();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logger.success(`\n✅ Database seeding completed in ${duration}s`);

    // Print summary
    await printSummary();

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

async function cleanDatabase() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const collection of collections) {
    await mongoose.connection.db.dropCollection(collection.name);
  }
}

async function printSummary() {
  const User = mongoose.model('User');
  const Company = mongoose.model('Company');
  const Order = mongoose.model('Order');
  const Shipment = mongoose.model('Shipment');
  const NDREvent = mongoose.model('NDREvent');
  const RTOEvent = mongoose.model('RTOEvent');
  const WalletTransaction = mongoose.model('WalletTransaction');

  const counts = {
    users: await User.countDocuments(),
    companies: await Company.countDocuments(),
    orders: await Order.countDocuments(),
    shipments: await Shipment.countDocuments(),
    ndrEvents: await NDREvent.countDocuments(),
    rtoEvents: await RTOEvent.countDocuments(),
    walletTransactions: await WalletTransaction.countDocuments(),
  };

  logger.info('\n📊 Seeding Summary:');
  logger.info(`   Users: ${counts.users}`);
  logger.info(`   Companies: ${counts.companies}`);
  logger.info(`   Orders: ${counts.orders}`);
  logger.info(`   Shipments: ${counts.shipments}`);
  logger.info(`   NDR Events: ${counts.ndrEvents} (${((counts.ndrEvents / counts.shipments) * 100).toFixed(1)}%)`);
  logger.info(`   RTO Events: ${counts.rtoEvents} (${((counts.rtoEvents / counts.shipments) * 100).toFixed(1)}%)`);
  logger.info(`   Wallet Transactions: ${counts.walletTransactions}`);
}

main();
```

### 8.3 Progress Logging

**Logger Utility** (`utils/logger.utils.ts`):
```typescript
import chalk from 'chalk';

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(chalk.blue('ℹ'), message, ...args);
  },

  success: (message: string, ...args: any[]) => {
    console.log(chalk.green('✓'), message, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    console.log(chalk.yellow('⚠'), message, ...args);
  },

  error: (message: string, ...args: any[]) => {
    console.log(chalk.red('✖'), message, ...args);
  },

  progress: (current: number, total: number, entity: string) => {
    const percentage = ((current / total) * 100).toFixed(1);
    process.stdout.write(`\r${chalk.cyan('⏳')} Seeding ${entity}: ${current}/${total} (${percentage}%)`);
    if (current === total) console.log(); // New line when done
  },
};
```

### 8.4 Estimated Execution Time

| Phase | Entity | Records | Est. Time |
|-------|--------|---------|-----------|
| 1 | Users | 150-200 | 5-10s |
| 2 | Companies | 100-120 | 8-12s |
| 3 | KYC | 100-120 | 5-8s |
| 4 | Warehouses | 200-300 | 10-15s |
| 5 | Rate Cards | 50-80 | 3-5s |
| 6 | Inventory | 3,000-4,000 | 30-45s |
| 7 | Orders | 3,000-5,000 | 60-90s |
| 8 | Shipments | 3,000-5,000 | 60-90s |
| 9 | NDR Events | 150-250 | 8-12s |
| 10 | RTO Events | 150-210 | 8-12s |
| 11 | Wallet Transactions | 8,000-15,000 | 90-120s |
| 12 | Pick Lists | 500-800 | 20-30s |
| 13 | Sessions | 300-500 | 5-8s |
| **Total** | **~17,700-28,580** | **~5-8 minutes** |

---

## 9. File Structure

### 9.1 Complete Directory Tree

```
server/
├── src/
│   └── infrastructure/
│       └── database/
│           └── seeders/
│               ├── index.ts (Main entry)
│               ├── config.ts (Seeding configuration)
│               │
│               ├── data/ (Static reference data)
│               │   ├── indian-cities.ts
│               │   ├── business-names.ts
│               │   ├── product-catalog.ts
│               │   ├── customer-names.ts
│               │   ├── carrier-data.ts
│               │   └── indian-banks.ts
│               │
│               ├── generators/ (Data generation logic)
│               │   ├── company.generator.ts
│               │   ├── user.generator.ts
│               │   ├── order.generator.ts
│               │   ├── shipment.generator.ts
│               │   ├── ndr.generator.ts
│               │   ├── rto.generator.ts
│               │   ├── warehouse.generator.ts
│               │   ├── wallet.generator.ts
│               │   ├── kyc.generator.ts
│               │   └── inventory.generator.ts
│               │
│               ├── seeders/ (Individual entity seeders)
│               │   ├── 01-users.seeder.ts
│               │   ├── 02-companies.seeder.ts
│               │   ├── 03-kyc.seeder.ts
│               │   ├── 04-warehouses.seeder.ts
│               │   ├── 05-rate-cards.seeder.ts
│               │   ├── 06-inventory.seeder.ts
│               │   ├── 07-orders.seeder.ts
│               │   ├── 08-shipments.seeder.ts
│               │   ├── 09-ndr-events.seeder.ts
│               │   ├── 10-rto-events.seeder.ts
│               │   ├── 11-wallet-transactions.seeder.ts
│               │   ├── 12-pick-lists.seeder.ts
│               │   └── 13-sessions.seeder.ts
│               │
│               └── utils/ (Helper utilities)
│                   ├── random.utils.ts (Random data generators)
│                   ├── date.utils.ts (Date manipulation, seasonal)
│                   ├── address.utils.ts (Address generation)
│                   ├── logger.utils.ts (Progress logging)
│                   └── validation.utils.ts (Data validation)
│
├── package.json (Add seed scripts)
└── tsconfig.json
```

---

## 10. Testing & Verification

### 10.1 Verification Queries

**After seeding, run these MongoDB queries to verify data integrity**:

```javascript
// 1. Verify user distribution
db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } }
]);
// Expected: admin ~5, seller ~100-120, staff ~45-75

// 2. Verify company status distribution
db.companies.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
]);
// Expected: approved ~85%, kyc_submitted ~10%, suspended ~5%

// 3. Verify order volume by month
db.orders.aggregate([
  { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
  { $sort: { "_id": 1 } }
]);
// Expected: Higher in Oct-Nov (Diwali), Dec (Christmas)

// 4. Verify shipment status distribution
db.shipments.aggregate([
  { $group: { _id: "$currentStatus", count: { $sum: 1 } } }
]);
// Expected: delivered ~85%, ndr ~5-8%, rto ~5-7%

// 5. Verify NDR type distribution
db.ndr_events.aggregate([
  { $group: { _id: "$ndrType", count: { $sum: 1 } } }
]);
// Expected: customer_unavailable 40%, address_issue 30%, payment_issue 20%, refused 10%

// 6. Verify RTO reason distribution
db.rto_events.aggregate([
  { $group: { _id: "$rtoReason", count: { $sum: 1 } } }
]);
// Expected: ndr_unresolved 60%, customer_cancellation 25%, damaged 10%, refused 5%

// 7. Verify wallet transaction balance integrity
db.companies.aggregate([
  {
    $lookup: {
      from: 'wallet_transactions',
      localField: '_id',
      foreignField: 'company',
      as: 'transactions'
    }
  },
  {
    $project: {
      name: 1,
      currentBalance: '$wallet.balance',
      calculatedBalance: {
        $sum: {
          $map: {
            input: '$transactions',
            as: 'txn',
            in: {
              $cond: [
                { $eq: ['$$txn.type', 'credit'] },
                '$$txn.amount',
                { $multiply: ['$$txn.amount', -1] }
              ]
            }
          }
        }
      }
    }
  },
  {
    $match: {
      $expr: { $ne: ['$currentBalance', '$calculatedBalance'] }
    }
  }
]);
// Expected: 0 results (all balances should match)

// 8. Verify referential integrity (orphan detection)
db.orders.aggregate([
  {
    $lookup: {
      from: 'companies',
      localField: 'companyId',
      foreignField: '_id',
      as: 'company'
    }
  },
  { $match: { company: { $size: 0 } } }
]);
// Expected: 0 results (no orphan orders)

// 9. Verify geographic distribution
db.orders.aggregate([
  { $group: { _id: "$customerInfo.address.state", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
// Expected: Maharashtra, Delhi, Karnataka at top

// 10. Verify payment method distribution
db.orders.aggregate([
  { $group: { _id: "$paymentMethod", count: { $sum: 1 } } }
]);
// Expected: COD ~60%, Prepaid ~40%
```

### 10.2 Data Quality Checks

**Run these validation checks** (`utils/validation.utils.ts`):

```typescript
export async function validateSeededData() {
  const errors = [];

  // 1. Check for duplicate order numbers
  const duplicateOrders = await Order.aggregate([
    { $group: { _id: "$orderNumber", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  if (duplicateOrders.length > 0) {
    errors.push(`❌ Found ${duplicateOrders.length} duplicate order numbers`);
  }

  // 2. Check for invalid email formats
  const invalidEmails = await User.find({ email: { $not: /^\S+@\S+\.\S+$/ } });
  if (invalidEmails.length > 0) {
    errors.push(`❌ Found ${invalidEmails.length} invalid email formats`);
  }

  // 3. Check for shipments without orders
  const orphanShipments = await Shipment.countDocuments({
    orderId: { $exists: true },
    $expr: { $eq: [{ $type: "$orderId" }, "objectId"] }
  });
  const validOrders = await Order.countDocuments();
  if (orphanShipments > validOrders) {
    errors.push(`❌ Found shipments without valid orders`);
  }

  // 4. Check for negative wallet balances
  const negativeBalances = await Company.countDocuments({ 'wallet.balance': { $lt: 0 } });
  if (negativeBalances > 0) {
    errors.push(`❌ Found ${negativeBalances} companies with negative wallet balance`);
  }

  // 5. Check for future dates
  const futureOrders = await Order.countDocuments({ createdAt: { $gt: new Date() } });
  if (futureOrders > 0) {
    errors.push(`❌ Found ${futureOrders} orders with future dates`);
  }

  if (errors.length === 0) {
    logger.success('✅ All data quality checks passed');
  } else {
    logger.error('❌ Data quality issues found:');
    errors.forEach(err => logger.error(`   ${err}`));
  }

  return errors.length === 0;
}
```

### 10.3 Performance Benchmarks

**Expected Performance Metrics**:

| Metric | Target | Acceptable Range |
|--------|--------|------------------|
| Total Seeding Time | 5-8 minutes | 4-10 minutes |
| Records per Second | 50-100 | 30-150 |
| Memory Usage | < 1 GB | < 2 GB |
| Database Size | 200-300 MB | 150-500 MB |
| NDR Rate | 5-8% | 4-10% |
| RTO Rate | 5-7% | 4-10% |
| Delivery Success Rate | 85-90% | 80-92% |

---

## Conclusion

This plan provides a comprehensive blueprint for creating a realistic, production-grade database seeding script for ShipCrowd. The script will:

✅ **Generate 17,000-28,000+ records** across 20+ models
✅ **Implement real-world logistics patterns** (NDR, RTO, seasonal variations)
✅ **Maintain referential integrity** with proper dependency management
✅ **Include authentic Indian data** (cities, names, pincodes, businesses)
✅ **Replicate actual business scenarios** (85-90% success rate, COD/Prepaid distribution)
✅ **Enable complete frontend testing** with realistic data replacing all mocks

**Next Steps for Implementation**:
1. Create file structure as outlined in Section 9
2. Implement data generators with weighted random selection
3. Implement individual seeders following dependency order
4. Add progress logging and error handling
5. Run validation checks after seeding
6. Test frontend with real database data

**Estimated Implementation Time**: 8-12 hours for complete script development
**Estimated Execution Time**: 5-8 minutes per seeding run

---

**Plan Status**: ✅ Ready for Implementation
**Last Updated**: 2026-01-06
**Version**: 1.0
