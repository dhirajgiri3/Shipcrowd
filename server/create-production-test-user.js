/**
 * Create Production-Grade Test User
 *
 * This script creates a complete test user that satisfies ALL middleware requirements:
 * - Proper authentication (email/password)
 * - Email verification
 * - KYC completion (user level)
 * - Company association with sandbox tier
 * - KYC record for company
 * - Rich realistic data (orders, shipments, transactions)
 *
 * NO BYPASSES - This user passes all validations naturally.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017/Helix';

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function selectRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  date.setHours(randomInt(9, 20), randomInt(0, 59), randomInt(0, 59));
  return date;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function createProductionTestUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // ========================================
    // CLEANUP: Remove existing test user
    // ========================================
    console.log('🗑️  Cleaning up existing test data...');
    const existingUser = await db.collection('users').findOne({ email: 'demo@Helix.test' });
    if (existingUser && existingUser.companyId) {
      await db.collection('orders').deleteMany({ companyId: existingUser.companyId });
      await db.collection('shipments').deleteMany({ companyId: existingUser.companyId });
      await db.collection('wallet_transactions').deleteMany({ company: existingUser.companyId });
      await db.collection('inventories').deleteMany({ companyId: existingUser.companyId });
      await db.collection('warehouses').deleteMany({ companyId: existingUser.companyId });
      await db.collection('kycs').deleteMany({ userId: existingUser._id });
      await db.collection('companies').deleteOne({ _id: existingUser.companyId });
      console.log('  ✓ Deleted old test data');
    }
    await db.collection('users').deleteOne({ email: 'demo@Helix.test' });
    console.log('');

    // ========================================
    // 1. CREATE USER with ALL required fields
    // ========================================
    console.log('👤 Creating production-grade test user...');
    const hashedPassword = await bcrypt.hash('Demo@123456', 10);

    const userId = new ObjectId();
    const companyId = new ObjectId();

    const testUser = {
      _id: userId,
      email: 'demo@Helix.test',
      password: hashedPassword,
      name: 'Demo Seller User',
      role: 'seller',
      teamRole: 'owner',
      teamStatus: 'active',

      // ✅ EMAIL VERIFICATION (Required for Sandbox tier)
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,

      // ✅ ONBOARDING (Complete)
      onboardingStep: 'completed',

      // ✅ VERIFICATION LEVEL (Production level = 3)
      verificationLevel: 3,

      // ✅ KYC STATUS (Complete)
      kycStatus: {
        isComplete: true,
        state: 'verified',
        lastUpdated: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },

      // ✅ COMPANY ASSOCIATION
      companyId: companyId,

      oauthProvider: 'email',
      profile: {
        phone: '+91-98765-00001',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400001',
        gender: 'male',
        timezone: 'Asia/Kolkata',
        preferredCurrency: 'INR',
        website: 'https://demoshop.test.com',
        bio: 'Production Test Seller Account',
      },
      profileCompletion: {
        status: 100,
        requiredFieldsCompleted: true,
        lastUpdated: new Date(),
      },
      isActive: true,
      isDeleted: false,
      anonymized: false,
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year old account
      updatedAt: new Date(),
    };

    await db.collection('users').insertOne(testUser);
    console.log(`  ✓ User: ${testUser.email}`);
    console.log(`  ✓ Email Verified: ${testUser.isEmailVerified}`);
    console.log(`  ✓ KYC Complete: ${testUser.kycStatus.isComplete}`);
    console.log(`  ✓ Verification Level: ${testUser.verificationLevel}`);
    console.log('');

    // ========================================
    // 2. CREATE COMPANY (Sandbox Tier)
    // ========================================
    console.log('🏢 Creating company...');
    const testCompany = {
      _id: companyId,
      name: 'Demo Test Shop Pvt Ltd',
      displayName: 'Demo Test Shop',
      businessType: 'ecommerce',

      // ✅ COMPANY STATUS (Approved)
      status: 'approved',

      // ✅ ACCESS TIER (Sandbox for full API access)
      tier: 'sandbox',

      address: {
        line1: 'Demo Building, Test Area',
        line2: 'Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400069',
      },
      contact: {
        email: 'demo@Helix.test',
        phone: '+91-98765-00001',
        website: 'https://demoshop.test.com',
        supportEmail: 'support@demoshop.test.com',
      },
      gst: {
        number: '27DEMOT1234E1Z5',
        verified: true,
        verifiedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },

      // ✅ WALLET (With balance)
      wallet: {
        balance: 150000, // ₹1,50,000
        currency: 'INR',
        lowBalanceThreshold: 10000,
        lastUpdated: new Date(),
      },

      settings: {
        autoRecharge: {
          enabled: true,
          threshold: 10000,
          amount: 50000,
        },
        notifications: {
          email: true,
          sms: true,
          whatsapp: true,
        },
      },
      subscription: {
        plan: 'sandbox',
        status: 'active',
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      },
      isActive: true,
      isSuspended: false,
      isDeleted: false,
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };

    await db.collection('companies').insertOne(testCompany);
    console.log(`  ✓ Company: ${testCompany.name}`);
    console.log(`  ✓ Status: ${testCompany.status}`);
    console.log(`  ✓ Tier: ${testCompany.tier}`);
    console.log(`  ✓ Wallet: ₹${testCompany.wallet.balance.toLocaleString('en-IN')}`);
    console.log('');

    // ========================================
    // 3. CREATE KYC RECORD (Company-specific)
    // ========================================
    console.log('📋 Creating KYC record...');
    const kycRecord = {
      _id: new ObjectId(),
      userId: userId,
      companyId: companyId,

      // ✅ KYC STATE (Verified)
      state: 'verified',
      status: 'verified',

      kycType: 'business',
      documents: {
        pan: {
          number: 'DEMOP1234T',
          verified: true,
          verifiedAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
        },
        gstin: {
          number: '27DEMOT1234E1Z5',
          verified: true,
          verifiedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
        },
        aadhaar: {
          masked: 'XXXX-XXXX-1234',
          verified: true,
          verifiedAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
        },
      },
      businessDetails: {
        businessName: 'Demo Test Shop',
        businessType: 'ecommerce',
        established: '2023',
      },
      verifiedAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
      verifiedBy: 'system',
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };

    await db.collection('kycs').insertOne(kycRecord);
    console.log(`  ✓ KYC State: ${kycRecord.state}`);
    console.log(`  ✓ Documents: PAN, GSTIN, Aadhaar (all verified)`);
    console.log('');

    // ========================================
    // 4. CREATE WAREHOUSE
    // ========================================
    console.log('🏭 Creating warehouse...');
    const warehouseId = new ObjectId();
    const warehouse = {
      _id: warehouseId,
      companyId: companyId,
      name: 'Demo Main Warehouse',
      code: 'DEMO-WH-001',
      type: 'owned',
      address: {
        line1: 'Warehouse Complex, MIDC',
        line2: 'Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        postalCode: '400093',
      },
      contact: {
        name: 'Warehouse Manager',
        phone: '+91-98765-11111',
        email: 'warehouse@demoshop.test.com',
      },
      capacity: {
        totalArea: 5000,
        usedArea: 3200,
        unit: 'sqft',
      },
      operatingHours: {
        weekdays: { open: '09:00', close: '19:00' },
        saturday: { open: '09:00', close: '14:00' },
        sunday: { open: null, close: null },
      },
      isActive: true,
      isDefault: true,
      isDeleted: false,
      createdAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };

    await db.collection('warehouses').insertOne(warehouse);
    console.log(`  ✓ Warehouse: ${warehouse.name}`);
    console.log('');

    // ========================================
    // 5. CREATE INVENTORY (15 SKUs)
    // ========================================
    console.log('📦 Creating inventory...');
    const products = [
      { name: 'iPhone 15 Pro', sku: 'IP15P-128-BLK', price: 129900, weight: 0.5, category: 'electronics' },
      { name: 'Samsung Galaxy S24', sku: 'SGS24-256-WHT', price: 89900, weight: 0.45, category: 'electronics' },
      { name: 'Sony Headphones', sku: 'SONY-WH1000XM5', price: 29990, weight: 0.3, category: 'electronics' },
      { name: 'MacBook Air M2', sku: 'MBA-M2-256', price: 114900, weight: 1.5, category: 'electronics' },
      { name: 'iPad Air', sku: 'IPAD-AIR5-64', price: 59900, weight: 0.8, category: 'electronics' },
      { name: 'Mens Shirt', sku: 'MS-BLU-L', price: 1299, weight: 0.25, category: 'fashion' },
      { name: 'Womens Kurti', sku: 'WK-RED-M', price: 899, weight: 0.2, category: 'fashion' },
      { name: 'Running Shoes', sku: 'NIKE-RUN-10', price: 5999, weight: 0.6, category: 'fashion' },
      { name: 'Formal Trousers', sku: 'FT-BLK-32', price: 1599, weight: 0.35, category: 'fashion' },
      { name: 'Leather Wallet', sku: 'LW-BRN-001', price: 799, weight: 0.1, category: 'fashion' },
      { name: 'Smart Watch', sku: 'SW-FITBIT', price: 18990, weight: 0.2, category: 'electronics' },
      { name: 'Wireless Earbuds', sku: 'WEB-TWS-001', price: 2499, weight: 0.15, category: 'electronics' },
      { name: 'Power Bank', sku: 'PB-20K-BLK', price: 1999, weight: 0.4, category: 'electronics' },
      { name: 'Phone Cover', sku: 'PC-IP15-BLU', price: 299, weight: 0.05, category: 'electronics' },
      { name: 'USB Cable', sku: 'USBC-2M-WHT', price: 499, weight: 0.08, category: 'electronics' },
    ];

    const inventoryItems = products.map(p => ({
      _id: new ObjectId(),
      companyId: companyId,
      warehouseId: warehouseId,
      sku: p.sku,
      name: p.name,
      onHand: randomInt(50, 500),
      available: randomInt(40, 450),
      reserved: randomInt(0, 20),
      reorderPoint: 20,
      reorderQuantity: 100,
      unitCost: p.price * 0.6,
      weight: p.weight,
      dimensions: {
        length: randomFloat(10, 30),
        width: randomFloat(10, 20),
        height: randomFloat(5, 15),
        unit: 'cm',
      },
      status: 'ACTIVE',
      isActive: true,
      isDeleted: false,
      createdAt: randomDate(200),
      updatedAt: new Date(),
    }));

    await db.collection('inventories').insertMany(inventoryItems);
    console.log(`  ✓ Created ${inventoryItems.length} SKUs`);
    console.log('');

    // ========================================
    // 6. CREATE ORDERS & SHIPMENTS (150)
    // ========================================
    console.log('📋 Creating orders and shipments...');
    const orders = [];
    const shipments = [];
    const walletTransactions = [];

    const orderStatuses = ['pending', 'ready_to_ship', 'shipped', 'delivered', 'delivered', 'delivered', 'rto'];
    const paymentMethods = ['cod', 'cod', 'prepaid', 'prepaid'];

    for (let i = 1; i <= 150; i++) {
      const orderId = new ObjectId();
      const orderDate = randomDate(180);
      const paymentMethod = selectRandom(paymentMethods);
      const status = selectRandom(orderStatuses);

      const itemCount = randomInt(1, 3);
      const selectedProducts = [];
      for (let j = 0; j < itemCount; j++) {
        selectedProducts.push(selectRandom(products));
      }

      const subtotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
      const tax = Math.round(subtotal * 0.18);
      const shippingCost = randomInt(50, 150);
      const discount = subtotal > 50000 ? Math.round(subtotal * 0.1) : 0;
      const total = subtotal + tax + shippingCost - discount;

      const order = {
        _id: orderId,
        orderNumber: `DEMO-2025${String(i).padStart(4, '0')}`,
        companyId: companyId,
        customerInfo: {
          name: selectRandom(['Amit Patel', 'Priya Sharma', 'Rahul Verma', 'Sneha Gupta', 'Vikram Singh']),
          email: `customer${i}@example.com`,
          phone: `+91-${randomInt(7000000000, 9999999999)}`,
          address: {
            line1: `${randomInt(1, 999)} ${selectRandom(['MG Road', 'Park Street', 'Main Road'])}`,
            city: selectRandom(['Delhi', 'Bangalore', 'Mumbai', 'Chennai', 'Kolkata', 'Pune']),
            state: selectRandom(['Delhi', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'West Bengal']),
            country: 'India',
            postalCode: String(randomInt(100000, 999999)),
          },
        },
        products: selectedProducts.map(p => ({
          name: p.name,
          sku: p.sku,
          quantity: 1,
          price: p.price,
          weight: p.weight,
        })),
        shippingDetails: {
          shippingCost: shippingCost,
        },
        paymentStatus: paymentMethod === 'prepaid' ? 'paid' : (status === 'delivered' ? 'paid' : 'pending'),
        paymentMethod: paymentMethod,
        source: selectRandom(['manual', 'shopify', 'api']),
        warehouseId: warehouseId,
        statusHistory: [{
          status: 'pending',
          timestamp: orderDate,
          comment: 'Order placed',
        }],
        currentStatus: status,
        totals: {
          subtotal: subtotal,
          tax: tax,
          shipping: shippingCost,
          discount: discount,
          total: total,
        },
        isDeleted: false,
        createdAt: orderDate,
        updatedAt: new Date(),
      };

      orders.push(order);

      // Create shipment if applicable
      if (['shipped', 'delivered', 'rto'].includes(status)) {
        const shipmentDate = addDays(orderDate, randomInt(1, 3));
        const deliveryDate = status === 'delivered' ? addDays(shipmentDate, randomInt(2, 5)) : null;

        const shipment = {
          _id: new ObjectId(),
          trackingNumber: `DEMO${Date.now()}${randomInt(10000, 99999)}${i}`,
          orderId: orderId,
          companyId: companyId,
          carrier: selectRandom(['Delhivery', 'Bluedart', 'DTDC', 'Xpressbees']),
          serviceType: selectRandom(['Surface', 'Express', 'Air']),
          packageDetails: {
            weight: selectedProducts.reduce((sum, p) => sum + p.weight, 0),
            dimensions: { length: 30, width: 20, height: 15 },
            packageCount: 1,
            packageType: 'box',
            declaredValue: subtotal,
          },
          deliveryDetails: {
            recipientName: order.customerInfo.name,
            recipientPhone: order.customerInfo.phone,
            address: order.customerInfo.address,
          },
          paymentDetails: {
            type: paymentMethod,
            codAmount: paymentMethod === 'cod' ? total : undefined,
            shippingCost: shippingCost,
            currency: 'INR',
          },
          statusHistory: [{
            status: 'created',
            timestamp: shipmentDate,
          }],
          currentStatus: status === 'delivered' ? 'delivered' : (status === 'rto' ? 'rto' : 'in_transit'),
          actualDelivery: deliveryDate,
          weights: {
            declared: { value: selectedProducts.reduce((sum, p) => sum + p.weight, 0), unit: 'kg' },
            verified: true,
          },
          isDeleted: false,
          createdAt: shipmentDate,
          updatedAt: new Date(),
        };

        shipments.push(shipment);

        // Wallet transaction for shipping cost
        walletTransactions.push({
          _id: new ObjectId(),
          company: companyId,
          type: 'debit',
          amount: shippingCost,
          balanceBefore: 150000,
          balanceAfter: 150000 - shippingCost,
          reason: 'shipping_cost',
          description: `Shipping charge for AWB: ${shipment.trackingNumber}`,
          reference: {
            type: 'shipment',
            id: shipment._id,
            externalId: shipment.trackingNumber,
          },
          createdBy: 'system',
          status: 'completed',
          createdAt: shipmentDate,
          updatedAt: shipmentDate,
        });

        // COD remittance if delivered
        if (paymentMethod === 'cod' && status === 'delivered') {
          const remittanceDate = addDays(deliveryDate, randomInt(3, 7));
          walletTransactions.push({
            _id: new ObjectId(),
            company: companyId,
            type: 'credit',
            amount: total,
            balanceBefore: 150000,
            balanceAfter: 150000 + total,
            reason: 'cod_remittance',
            description: `COD remittance for order ${order.orderNumber}`,
            reference: {
              type: 'shipment',
              id: shipment._id,
              externalId: shipment.trackingNumber,
            },
            createdBy: 'system',
            status: 'completed',
            createdAt: remittanceDate,
            updatedAt: remittanceDate,
          });
        }
      }
    }

    // Add recharge transactions
    for (let i = 0; i < 5; i++) {
      const rechargeDate = randomDate(180);
      const amount = randomInt(25000, 75000);
      walletTransactions.push({
        _id: new ObjectId(),
        company: companyId,
        type: 'credit',
        amount: amount,
        balanceBefore: 150000,
        balanceAfter: 150000 + amount,
        reason: 'recharge',
        description: `Wallet recharge via Razorpay`,
        reference: {
          type: 'payment',
          externalId: `PAY${randomInt(100000, 999999)}`,
        },
        createdBy: 'system',
        status: 'completed',
        createdAt: rechargeDate,
        updatedAt: rechargeDate,
      });
    }

    await db.collection('orders').insertMany(orders);
    await db.collection('shipments').insertMany(shipments);
    await db.collection('wallet_transactions').insertMany(walletTransactions);

    console.log(`  ✓ Created ${orders.length} orders`);
    console.log(`  ✓ Created ${shipments.length} shipments`);
    console.log(`  ✓ Created ${walletTransactions.length} wallet transactions`);
    console.log('');

    // ========================================
    // SUMMARY
    // ========================================
    const delivered = orders.filter(o => o.currentStatus === 'delivered').length;
    const codOrders = orders.filter(o => o.paymentMethod === 'cod').length;
    const prepaidOrders = orders.filter(o => o.paymentMethod === 'prepaid').length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.totals.total, 0);

    console.log('================================================');
    console.log('✅ PRODUCTION-GRADE TEST USER CREATED!');
    console.log('================================================\n');

    console.log('🔐 Login Credentials:');
    console.log('   Email:    demo@Helix.test');
    console.log('   Password: Demo@123456\n');

    console.log('✅ Middleware Requirements Satisfied:');
    console.log('   ✓ Email Verified');
    console.log('   ✓ KYC Complete (User Level)');
    console.log('   ✓ KYC Record (Company Level)');
    console.log('   ✓ Company: Approved, Sandbox Tier');
    console.log('   ✓ Verification Level: 3 (Production)');
    console.log('   ✓ Onboarding: Complete\n');

    console.log('📊 Data Statistics:');
    console.log(`   Orders:        ${orders.length}`);
    console.log(`     - Delivered: ${delivered}`);
    console.log(`     - COD:       ${codOrders}`);
    console.log(`     - Prepaid:   ${prepaidOrders}`);
    console.log(`   Shipments:     ${shipments.length}`);
    console.log(`   Transactions:  ${walletTransactions.length}`);
    console.log(`   Inventory:     ${inventoryItems.length} SKUs`);
    console.log(`   Warehouses:    1\n`);

    console.log('💰 Financial Summary:');
    console.log(`   Total Revenue: ₹${(totalRevenue / 100000).toFixed(2)} Lac`);
    console.log(`   Avg Order:     ₹${Math.round(totalRevenue / orders.length)}`);
    console.log(`   Wallet:        ₹${testCompany.wallet.balance.toLocaleString('en-IN')}\n`);

    console.log('================================================');
    console.log('🚀 Ready for Production-Grade API Testing!');
    console.log('   NO BYPASSES - All validations will pass');
    console.log('================================================\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createProductionTestUser();
