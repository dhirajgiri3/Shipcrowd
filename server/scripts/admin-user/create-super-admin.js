/**
 * Create Super Admin Test User
 * 
 * Creates a comprehensive user with:
 * - DUAL ACCESS: Admin + Seller dashboards
 * - Links to existing seeded company (if available)
 * - Full authentication & authorization
 * - Complete KYC verification
 * - Access to all seeded data
 * 
 * Email: admin@Shipcrowd.com
 * Password: Admin@123456
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';
const ADMIN_EMAIL = 'admin@Shipcrowd.com';
const ADMIN_PASSWORD = 'Admin@123456';

async function createSuperAdminUser() {
    try {
        console.log('🚀 Creating Super Admin User with Dual Access\n');
        console.log('='.repeat(60));

        const dbName = MONGODB_URI.split('/').pop().split('?')[0];
        console.log(`🔌 Connecting to database: ${dbName}`);

        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB\n');

        const db = mongoose.connection.db;

        // ========================================
        // STEP 1: Find or Create Company
        // ========================================
        console.log('🏢 Finding existing company from seeder...');

        // Try to find an approved company with data
        const existingCompany = await db.collection('companies').findOne({
            status: 'approved',
            isDeleted: false,
            'wallet.balance': { $gt: 0 }
        });

        let companyId;
        let companyName;
        let walletBalance;

        if (existingCompany) {
            companyId = existingCompany._id;
            companyName = existingCompany.name;
            walletBalance = existingCompany.wallet?.balance || 0;
            console.log(`  ✓ Found existing company: ${companyName}`);
            console.log(`  ✓ Company ID: ${companyId}`);
            console.log(`  ✓ Wallet: ₹${walletBalance.toLocaleString('en-IN')}\n`);
        } else {
            // Create new company if none exists
            console.log('  ⚠️  No existing company found, creating new one...');
            companyId = new ObjectId();
            companyName = 'Shipcrowd Super Admin Enterprise';
            walletBalance = 500000;

            const newCompany = {
                _id: companyId,
                name: companyName,
                displayName: 'Shipcrowd Admin',
                businessType: 'ecommerce',
                status: 'approved',
                tier: 'production',
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
                    website: 'https://Shipcrowd.com',
                },
                gst: {
                    number: '27Shipcrowd1234A1Z5',
                    verified: true,
                    verifiedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                },
                wallet: {
                    balance: walletBalance,
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

            await db.collection('companies').insertOne(newCompany);
            console.log(`  ✓ Created company: ${companyName}\n`);
        }

        // ========================================
        // STEP 2: Check Data Availability
        // ========================================
        console.log('📊 Checking available data...');

        const orderCount = await db.collection('orders').countDocuments({
            companyId,
            isDeleted: false
        });
        const warehouseCount = await db.collection('warehouses').countDocuments({
            companyId,
            isDeleted: false
        });
        const inventoryCount = await db.collection('inventories').countDocuments({
            companyId,
            isDeleted: false
        });

        console.log(`  ✓ Orders: ${orderCount}`);
        console.log(`  ✓ Warehouses: ${warehouseCount}`);
        console.log(`  ✓ Inventory: ${inventoryCount}\n`);

        // ========================================
        // STEP 3: Cleanup Existing Admin User
        // ========================================
        console.log('🗑️  Cleaning up existing admin user...');
        const existingUser = await db.collection('users').findOne({ email: ADMIN_EMAIL });

        if (existingUser) {
            await db.collection('sessions').deleteMany({ userId: existingUser._id });
            await db.collection('consents').deleteMany({ userId: existingUser._id });
            await db.collection('kycs').deleteMany({ userId: existingUser._id });
            await db.collection('users').deleteOne({ email: ADMIN_EMAIL });
            console.log('  ✓ Deleted existing user\n');
        } else {
            console.log('  ✓ No existing user to clean\n');
        }

        // ========================================
        // STEP 4: Create Super Admin User
        // ========================================
        console.log('👤 Creating super admin user...');

        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
        const userId = new ObjectId();

        const superAdminUser = {
            _id: userId,
            email: ADMIN_EMAIL,
            password: hashedPassword,
            name: 'Shipcrowd Super Admin',

            // ✅ DUAL ACCESS: Admin role + Company association
            role: 'admin',           // Admin dashboard access
            companyId: companyId,    // Seller dashboard access

            teamRole: 'owner',
            teamStatus: 'active',
            accessTier: 'production',

            isEmailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpiry: null,

            verificationLevel: 3,
            onboardingStep: 'completed',

            kycStatus: {
                isComplete: true,
                state: 'verified',
                lastUpdated: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },

            oauthProvider: 'email',

            profile: {
                phone: '+91-98765-99999',
                city: 'Mumbai',
                state: 'Maharashtra',
                country: 'India',
                postalCode: '400001',
                gender: 'other',
                timezone: 'Asia/Kolkata',
                preferredCurrency: 'INR',
                website: 'https://Shipcrowd.com',
                bio: 'Super Admin - Full Platform Access',
            },

            profileCompletion: {
                status: 100,
                requiredFieldsCompleted: true,
                lastUpdated: new Date(),
            },

            security: {
                failedLoginAttempts: 0,
                tokenVersion: 0,
                lastLogin: {
                    timestamp: new Date(),
                    ip: '127.0.0.1',
                    userAgent: 'Script',
                    success: true,
                },
            },

            isActive: true,
            isDeleted: false,
            anonymized: false,

            createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
        };

        await db.collection('users').insertOne(superAdminUser);
        console.log(`  ✓ User: ${superAdminUser.email}`);
        console.log(`  ✓ Role: ${superAdminUser.role}`);
        console.log(`  ✓ Access Tier: ${superAdminUser.accessTier}`);
        console.log(`  ✓ Company ID: ${companyId}\n`);

        // ========================================
        // STEP 5: Create KYC Record
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
                    number: 'Shipcrowd1234A',
                    verified: true,
                    verifiedAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
                },
                gstin: {
                    number: '27Shipcrowd1234A1Z5',
                    verified: true,
                    verifiedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
                },
            },
            businessDetails: {
                businessName: companyName,
                businessType: 'ecommerce',
                established: '2023',
            },
            verifiedAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
            verifiedBy: 'system',
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
        };

        await db.collection('kycs').insertOne(kycRecord);
        console.log(`  ✓ KYC State: ${kycRecord.state}\n`);

        // ========================================
        // SUMMARY
        // ========================================
        console.log('='.repeat(60));
        console.log('✅ SUPER ADMIN USER CREATED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log('');

        console.log('🔐 LOGIN CREDENTIALS:');
        console.log(`   Email:    ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log('');

        console.log('✅ DUAL ACCESS ENABLED:');
        console.log(`   ✓ Admin Dashboard:  /admin/dashboard`);
        console.log(`   ✓ Seller Dashboard: /seller/dashboard`);
        console.log('');

        console.log('🏢 COMPANY ASSOCIATION:');
        console.log(`   Company: ${companyName}`);
        console.log(`   Orders:     ${orderCount}`);
        console.log(`   Warehouses: ${warehouseCount}`);
        console.log(`   Inventory:  ${inventoryCount}`);
        console.log(`   Wallet:     ₹${walletBalance.toLocaleString('en-IN')}`);
        console.log('');

        console.log('🎯 CAPABILITIES:');
        console.log('   ✓ View all dashboard metrics');
        console.log('   ✓ Manage orders & shipments');
        console.log('   ✓ Access analytics & reports');
        console.log('   ✓ Manage company settings');
        console.log('   ✓ Full admin privileges');
        console.log('');

        console.log('='.repeat(60));
        console.log('🚀 READY FOR TESTING!');
        console.log('='.repeat(60));
        console.log('');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
        process.exit(1);
    }
}

createSuperAdminUser();
