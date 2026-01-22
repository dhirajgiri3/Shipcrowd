/**
 * Create Top-Tier Admin Test User
 * 
 * Creates a comprehensive admin user with:
 * - Full authentication & authorization
 * - Complete KYC verification
 * - 3 warehouses across metro cities
 * - 45 inventory SKUs
 * - 300 orders with shipments
 * - NDR/RTO events
 * - Wallet transactions
 * - Disputes
 * 
 * Email: admin1@shipcrowd.com
 * Password: Admin@123456
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const path = require('path');

// Load environment variables from server/.env
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { generateOrders } = require('./generate-orders');
const { generateShipments } = require('./generate-shipments');
const {
    randomInt,
    selectRandom,
    PRODUCT_CATALOG,
    CITIES,
} = require('./helpers');

// Use environment variable to match server's database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';
const ADMIN_EMAIL = 'admin1@shipcrowd.com';
const ADMIN_PASSWORD = 'Admin@123456';

async function createAdminTestUser() {
    try {
        // Log database connection (hide credentials)
        const dbName = MONGODB_URI.split('/').pop().split('?')[0];
        console.log(`🔌 Connecting to database: ${dbName}`);

        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB\n');

        const db = mongoose.connection.db;

        // ========================================
        // CLEANUP: Remove existing admin user
        // ========================================
        console.log('🗑️  Cleaning up existing admin data...');
        const existingUser = await db.collection('users').findOne({ email: ADMIN_EMAIL });
        if (existingUser && existingUser.companyId) {
            await db.collection('orders').deleteMany({ companyId: existingUser.companyId });
            await db.collection('shipments').deleteMany({ companyId: existingUser.companyId });
            await db.collection('wallet_transactions').deleteMany({ company: existingUser.companyId });
            await db.collection('ndr_events').deleteMany({ company: existingUser.companyId });
            await db.collection('rto_events').deleteMany({ company: existingUser.companyId });
            await db.collection('weight_disputes').deleteMany({ companyId: existingUser.companyId });
            await db.collection('disputes').deleteMany({ companyId: existingUser.companyId });
            await db.collection('cod_remittances').deleteMany({ companyId: existingUser.companyId });
            await db.collection('inventories').deleteMany({ companyId: existingUser.companyId });
            await db.collection('warehouses').deleteMany({ companyId: existingUser.companyId });
            await db.collection('kycs').deleteMany({ userId: existingUser._id });
            await db.collection('sessions').deleteMany({ userId: existingUser._id });
            await db.collection('consents').deleteMany({ userId: existingUser._id });
            await db.collection('companies').deleteOne({ _id: existingUser.companyId });
            console.log('  ✓ Deleted existing admin data');
        }
        await db.collection('users').deleteOne({ email: ADMIN_EMAIL });
        console.log('');

        // ========================================
        // 1. CREATE ADMIN USER
        // ========================================
        console.log('👤 Creating admin user...');
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
        const userId = new ObjectId();
        const companyId = new ObjectId();

        const adminUser = {
            _id: userId,
            email: ADMIN_EMAIL,
            password: hashedPassword,
            name: 'Admin Test User',
            role: 'admin', // Admin role for access to both dashboards
            teamRole: 'owner',
            teamStatus: 'active',
            accessTier: 'production',
            isEmailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpiry: null,
            verificationLevel: 3, // Full production access
            onboardingStep: 'completed',
            kycStatus: {
                isComplete: true,
                state: 'verified',
                lastUpdated: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
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
                website: 'https://admin.shipcrowd.com',
                bio: 'Admin Test Account - Full Access',
            },
            profileCompletion: {
                status: 100,
                requiredFieldsCompleted: true,
                lastUpdated: new Date(),
            },
            isActive: true,
            isDeleted: false,
            anonymized: false,
            createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
        };

        await db.collection('users').insertOne(adminUser);
        console.log(`  ✓ User: ${adminUser.email}`);
        console.log(`  ✓ Role: ${adminUser.role} (${adminUser.accessTier})`);
        console.log('');

        // ========================================
        // 2. CREATE COMPANY
        // ========================================
        console.log('🏢 Creating company...');
        const company = {
            _id: companyId,
            name: 'ShipCrowd Admin Test Enterprise',
            displayName: 'Admin Test Co',
            businessType: 'ecommerce',
            status: 'approved',
            tier: 'production', // Production tier
            address: {
                line1: 'Admin Tower, BKC',
                line2: 'Bandra East',
                city: 'Mumbai',
                state: 'Maharashtra',
                country: 'India',
                postalCode: '400051',
            },
            contact: {
                email: ADMIN_EMAIL,
                phone: '+91-98765-00001',
                website: 'https://admin.shipcrowd.com',
            },
            gst: {
                number: '27ADMTE1234A1Z5',
                verified: true,
                verifiedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            },
            wallet: {
                balance: 500000, // ₹5,00,000
                currency: 'INR',
                lowBalanceThreshold: 50000,
                lastUpdated: new Date(),
            },
            settings: {
                autoRecharge: {
                    enabled: true,
                    threshold: 50000,
                    amount: 200000,
                },
                notifications: {
                    email: true,
                    sms: true,
                    whatsapp: true,
                },
            },
            integrations: {
                shopify: {
                    shopDomain: 'admin-test-shop.myshopify.com',
                    accessToken: `shpat_${Math.random().toString(36).substring(2, 34)}`,
                    scope: 'read_orders,write_shipping',
                    lastSyncAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                },
                woocommerce: {
                    siteUrl: 'https://admin-test.com',
                    consumerKey: `ck_${Math.random().toString(36).substring(2, 42)}`,
                    consumerSecret: `cs_${Math.random().toString(36).substring(2, 42)}`,
                    lastSyncAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                },
            },
            subscription: {
                plan: 'production',
                status: 'active',
                startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            },
            isActive: true,
            isSuspended: false,
            isDeleted: false,
            createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
        };

        await db.collection('companies').insertOne(company);
        console.log(`  ✓ Company: ${company.name}`);
        console.log(`  ✓ Tier: ${company.tier}`);
        console.log(`  ✓ Wallet: ₹${company.wallet.balance.toLocaleString('en-IN')}`);
        console.log('');

        // ========================================
        // 3. CREATE KYC RECORD
        // ========================================
        console.log('📋 Creating KYC record...');
        const kycRecord = {
            _id: new ObjectId(),
            userId: userId,
            companyId: companyId,
            state: 'verified',
            status: 'verified',
            kycType: 'business',
            documents: {
                pan: {
                    number: 'ADMTE1234A',
                    verified: true,
                    verifiedAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
                },
                gstin: {
                    number: '27ADMTE1234A1Z5',
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
                businessName: 'ShipCrowd Admin Test Enterprise',
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
        console.log('');

        // ========================================
        // 4. CREATE WAREHOUSES (3)
        // ========================================
        console.log('🏭 Creating warehouses...');
        const warehouseCities = [CITIES[0], CITIES[1], CITIES[2]]; // Mumbai, Delhi, Bangalore
        const warehouses = [];

        warehouseCities.forEach((city, index) => {
            const warehouse = {
                _id: new ObjectId(),
                companyId: companyId,
                name: `Admin ${city.name} Warehouse`,
                code: `ADMIN-WH-${index + 1}`,
                type: 'owned',
                address: {
                    line1: `Warehouse Complex ${index + 1}`,
                    line2: 'Industrial Area',
                    city: city.name,
                    state: city.state,
                    country: 'India',
                    postalCode: city.pincode,
                },
                // ✅ FIXED: Use contactInfo (not contact) to match warehouse.model.ts
                contactInfo: {
                    name: 'Warehouse Manager',
                    phone: `+91-98765-${String(10000 + index).padStart(5, '0')}`,
                    email: `warehouse${index + 1}@admintest.com`,
                },
                // ✅ FIXED: Use individual days (not weekdays/saturday/sunday) to match warehouse.model.ts
                operatingHours: {
                    monday: { open: '09:00', close: '19:00' },
                    tuesday: { open: '09:00', close: '19:00' },
                    wednesday: { open: '09:00', close: '19:00' },
                    thursday: { open: '09:00', close: '19:00' },
                    friday: { open: '09:00', close: '19:00' },
                    saturday: { open: '09:00', close: '14:00' },
                    sunday: { open: null, close: null },
                },
                isActive: true,
                isDefault: index === 0,
                isDeleted: false,
                createdAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(),
            };
            warehouses.push(warehouse);
        });

        await db.collection('warehouses').insertMany(warehouses);
        console.log(`  ✓ Created ${warehouses.length} warehouses`);
        console.log('');

        // ========================================
        // 5. CREATE INVENTORY (45 SKUs)
        // ========================================
        console.log('📦 Creating inventory...');
        const inventoryItems = [];
        const allProducts = [...PRODUCT_CATALOG.electronics, ...PRODUCT_CATALOG.fashion];

        warehouses.forEach(warehouse => {
            allProducts.forEach(product => {
                inventoryItems.push({
                    _id: new ObjectId(),
                    companyId: companyId,
                    warehouseId: warehouse._id,
                    sku: product.sku,
                    name: product.name,
                    onHand: randomInt(100, 500),
                    available: randomInt(80, 450),
                    reserved: randomInt(0, 50),
                    reorderPoint: 50,
                    reorderQuantity: 200,
                    unitCost: product.price * 0.6,
                    weight: product.weight,
                    dimensions: {
                        length: randomInt(10, 30),
                        width: randomInt(10, 20),
                        height: randomInt(5, 15),
                        unit: 'cm',
                    },
                    status: 'ACTIVE',
                    isActive: true,
                    isDeleted: false,
                    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
                    updatedAt: new Date(),
                });
            });
        });

        await db.collection('inventories').insertMany(inventoryItems);
        console.log(`  ✓ Created ${inventoryItems.length} inventory items`);
        console.log('');

        // ========================================
        // 6. CREATE ORDERS (300)
        // ========================================
        console.log('📋 Creating orders...');
        const warehouseIds = warehouses.map(w => w._id);
        const orders = generateOrders(companyId, warehouseIds, 300);
        await db.collection('orders').insertMany(orders);
        console.log(`  ✓ Created ${orders.length} orders`);
        console.log('');

        // ========================================
        // 7. CREATE SHIPMENTS (300)
        // ========================================
        console.log('🚚 Creating shipments...');
        const shipments = generateShipments(orders);
        await db.collection('shipments').insertMany(shipments);

        const deliveredCount = shipments.filter(s => s.currentStatus === 'delivered').length;
        const ndrCount = shipments.filter(s => s.currentStatus === 'ndr').length;
        const rtoCount = shipments.filter(s => s.currentStatus === 'rto_initiated').length;

        console.log(`  ✓ Created ${shipments.length} shipments`);
        console.log(`    - Delivered: ${deliveredCount}`);
        console.log(`    - NDR: ${ndrCount}`);
        console.log(`    - RTO: ${rtoCount}`);
        console.log('');

        // ========================================
        // SUMMARY
        // ========================================
        console.log('================================================');
        console.log('✅ ADMIN TEST USER CREATED!');
        console.log('================================================\n');

        console.log('🔐 Login Credentials:');
        console.log(`   Email:    ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}\n`);

        console.log('✅ Features Available:');
        console.log(`   ✓ Role: Admin (Seller + Admin Dashboard Access)`);
        console.log(`   ✓ Access Tier: Production`);
        console.log(`   ✓ Email Verified`);
        console.log(`   ✓ KYC Complete`);
        console.log(`   ✓ Company Approved\n`);

        console.log('📊 Data Created:');
        console.log(`   Warehouses:     ${warehouses.length}`);
        console.log(`   Inventory SKUs: ${inventoryItems.length}`);
        console.log(`   Orders:         ${orders.length}`);
        console.log(`   Shipments:      ${shipments.length}`);
        console.log(`   Wallet Balance: ₹${company.wallet.balance.toLocaleString('en-IN')}\n`);

        console.log('================================================');
        console.log('🚀 Ready for Testing!');
        console.log('================================================\n');

        await mongoose.connection.close();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

createAdminTestUser();
