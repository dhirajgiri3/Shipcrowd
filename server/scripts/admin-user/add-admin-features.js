/**
 * Add Advanced Features to Admin Test User
 * 
 * This script adds:
 * - NDR Events
 * - RTO Events
 * - Wallet Transactions
 * - COD Remittances
 * - Weight Disputes
 * - General Disputes
 * - Sessions
 * - Consents
 * 
 * Run after create-admin-test-user.js
 */

const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const path = require('path');

// Load environment variables from server/.env
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { generateNDREvents, generateRTOEvents } = require('./generate-events');
const {
    generateWalletTransactions,
    generateCODRemittances,
    generateWeightDisputes,
    generateDisputes,
} = require('./generate-financials');

// Use environment variable to match server's database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';
const ADMIN_EMAIL = 'admin1@shipcrowd.com';

async function addAdvancedFeatures() {
    try {
        // Log database connection (hide credentials)
        const dbName = MONGODB_URI.split('/').pop().split('?')[0];
        console.log(`🔌 Connecting to database: ${dbName}`);

        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB\n');

        const db = mongoose.connection.db;

        // Find the admin user and company
        const user = await db.collection('users').findOne({ email: ADMIN_EMAIL });
        if (!user) {
            console.error('❌ Admin user not found. Run create-admin-test-user.js first.');
            process.exit(1);
        }

        const companyId = user.companyId;
        console.log(`Found admin user: ${user.email}`);
        console.log(`Company ID: ${companyId}\n`);

        // Get existing data
        const shipments = await db.collection('shipments').find({ companyId }).toArray();
        const orders = await db.collection('orders').find({ companyId }).toArray();
        const warehouses = await db.collection('warehouses').find({ companyId }).toArray();

        console.log(`Loaded ${shipments.length} shipments`);
        console.log(`Loaded ${orders.length} orders`);
        console.log(`Loaded ${warehouses.length} warehouses\n`);

        // ========================================
        // 1. CREATE NDR EVENTS
        // ========================================
        console.log('📍 Creating NDR events...');
        const ndrEvents = generateNDREvents(shipments, companyId);
        if (ndrEvents.length > 0) {
            await db.collection('ndr_events').insertMany(ndrEvents);
            console.log(`  ✓ Created ${ndrEvents.length} NDR events\n`);
        } else {
            console.log('  ℹ No NDR shipments found\n');
        }

        // ========================================
        // 2. CREATE RTO EVENTS
        // ========================================
        console.log('🔄 Creating RTO events...');
        const rtoEvents = generateRTOEvents(shipments, companyId, warehouses);
        if (rtoEvents.length > 0) {
            await db.collection('rto_events').insertMany(rtoEvents);
            console.log(`  ✓ Created ${rtoEvents.length} RTO events\n`);
        } else {
            console.log('  ℹ No RTO shipments found\n');
        }

        // ========================================
        // 3. CREATE WALLET TRANSACTIONS
        // ========================================
        console.log('💰 Creating wallet transactions...');
        const walletTransactions = generateWalletTransactions(companyId, shipments, orders);
        await db.collection('wallet_transactions').insertMany(walletTransactions);
        console.log(`  ✓ Created ${walletTransactions.length} wallet transactions\n`);

        // ========================================
        // 4. CREATE COD REMITTANCES
        // ========================================
        console.log('💵 Creating COD remittances...');
        const codRemittances = generateCODRemittances(companyId, shipments);
        if (codRemittances.length > 0) {
            await db.collection('cod_remittances').insertMany(codRemittances);
            console.log(`  ✓ Created ${codRemittances.length} COD remittances\n`);
        } else {
            console.log('  ℹ No COD deliveries found\n');
        }

        // ========================================
        // 5. CREATE WEIGHT DISPUTES
        // ========================================
        console.log('⚖️  Creating weight disputes...');
        const weightDisputes = generateWeightDisputes(companyId, shipments);
        if (weightDisputes.length > 0) {
            await db.collection('weight_disputes').insertMany(weightDisputes);
            console.log(`  ✓ Created ${weightDisputes.length} weight disputes\n`);
        } else {
            console.log('  ℹ No weight discrepancies found\n');
        }

        // ========================================
        // 6. CREATE GENERAL DISPUTES
        // ========================================
        console.log('⚠️  Creating general disputes...');
        const disputes = generateDisputes(companyId, shipments);
        if (disputes.length > 0) {
            await db.collection('disputes').insertMany(disputes);
            console.log(`  ✓ Created ${disputes.length} disputes\n`);
        }

        // ========================================
        // 7. CREATE SESSIONS
        // ========================================
        console.log('🔐 Creating login sessions...');
        const sessions = [];
        for (let i = 0; i < 10; i++) {
            const sessionDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            sessions.push({
                _id: new ObjectId(),
                userId: user._id,
                token: require('crypto').randomBytes(32).toString('hex'),
                deviceInfo: {
                    userAgent: 'Mozilla/5.0',
                    ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
                },
                isActive: i < 2, // Only last 2 sessions are active
                expiresAt: new Date(sessionDate.getTime() + 7 * 24 * 60 * 60 * 1000),
                createdAt: sessionDate,
                updatedAt: sessionDate,
            });
        }
        await db.collection('sessions').insertMany(sessions);
        console.log(`  ✓ Created ${sessions.length} sessions\n`);

        // ========================================
        // 8. CREATE CONSENTS
        // ========================================
        console.log('✅ Creating user consents...');
        const consents = [
            {
                _id: new ObjectId(),
                userId: user._id,
                type: 'terms_and_conditions',
                version: '1.0',
                accepted: true,
                acceptedAt: user.createdAt,
                createdAt: user.createdAt,
            },
            {
                _id: new ObjectId(),
                userId: user._id,
                type: 'privacy_policy',
                version: '1.0',
                accepted: true,
                acceptedAt: user.createdAt,
                createdAt: user.createdAt,
            },
            {
                _id: new ObjectId(),
                userId: user._id,
                type: 'marketing_emails',
                version: '1.0',
                accepted: true,
                acceptedAt: user.createdAt,
                createdAt: user.createdAt,
            },
        ];
        await db.collection('consents').insertMany(consents);
        console.log(`  ✓ Created ${consents.length} consents\n`);

        // ========================================
        // SUMMARY
        // ========================================
        console.log('================================================');
        console.log('✅ ADVANCED FEATURES ADDED!');
        console.log('================================================\n');

        console.log('📊 Additional Data Created:');
        console.log(`   NDR Events:        ${ndrEvents.length}`);
        console.log(`   RTO Events:        ${rtoEvents.length}`);
        console.log(`   Wallet Txns:       ${walletTransactions.length}`);
        console.log(`   COD Remittances:   ${codRemittances.length}`);
        console.log(`   Weight Disputes:   ${weightDisputes.length}`);
        console.log(`   General Disputes:  ${disputes.length}`);
        console.log(`   Sessions:          ${sessions.length}`);
        console.log(`   Consents:          ${consents.length}\n`);

        console.log('================================================');
        console.log('🚀 Admin User Now Has Complete Data!');
        console.log('================================================\n');

        await mongoose.connection.close();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addAdvancedFeatures();
