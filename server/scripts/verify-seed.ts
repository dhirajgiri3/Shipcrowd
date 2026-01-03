/**
 * Seed Data Verification Script
 * 
 * Verifies the integrity and correctness of seeded demo data.
 * 
 * Usage:
 *   npm run verify-seed
 *   OR
 *   npx ts-node src/scripts/verify-seed.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import models
import Company from '../infrastructure/database/mongoose/models/company.model';
import User from '../infrastructure/database/mongoose/models/user.model';
import Warehouse from '../infrastructure/database/mongoose/models/warehouse.model';
import Order from '../infrastructure/database/mongoose/models/order.model';
import Shipment from '../infrastructure/database/mongoose/models/shipment.model';
import Zone from '../infrastructure/database/mongoose/models/zone.model';
import RateCard from '../infrastructure/database/mongoose/models/rate-card.model';
import KYC from '../infrastructure/database/mongoose/models/kyc.model';

// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

async function verifySeed() {
    console.log('\n🔍 SEED DATA VERIFICATION');
    console.log('='.repeat(60));

    let allChecksPassed = true;

    // Entity Counts
    console.log('\n📊 ENTITY COUNTS');
    console.log('-'.repeat(60));

    const companiesCount = await Company.countDocuments({ isDeleted: false });
    console.log(`Companies: ${companiesCount} ${companiesCount === 5 ? '✅' : '❌ (expected: 5)'}`);
    if (companiesCount !== 5) allChecksPassed = false;

    const usersCount = await User.countDocuments({ isDeleted: false });
    console.log(`Users: ${usersCount} ${usersCount === 6 ? '✅' : '❌ (expected: 6)'}`);
    if (usersCount !== 6) allChecksPassed = false;

    const warehousesCount = await Warehouse.countDocuments({ isDeleted: false });
    console.log(`Warehouses: ${warehousesCount} ${warehousesCount === 10 ? '✅' : '❌ (expected: 10)'}`);
    if (warehousesCount !== 10) allChecksPassed = false;

    const ordersCount = await Order.countDocuments({ isDeleted: false });
    console.log(`Orders: ${ordersCount} ${ordersCount === 200 ? '✅' : '⚠️  (expected: 200, actual: ' + ordersCount + ')'}`);

    const shipmentsCount = await Shipment.countDocuments({ isDeleted: false });
    const expectedShipments = await Order.countDocuments({ currentStatus: { $in: ['shipped', 'delivered'] }, isDeleted: false });
    console.log(`Shipments: ${shipmentsCount} ${shipmentsCount === expectedShipments ? '✅' : '⚠️  (expected: ' + expectedShipments + ')'}`);

    const zonesCount = await Zone.countDocuments({ isDeleted: false });
    console.log(`Zones: ${zonesCount} ${zonesCount === 20 ? '✅' : '⚠️  (expected: 20, actual: ' + zonesCount + ')'}`);

    const rateCardsCount = await RateCard.countDocuments({ isDeleted: false });
    console.log(`Rate Cards: ${rateCardsCount} ${rateCardsCount === 15 ? '✅' : '⚠️  (expected: 15, actual: ' + rateCardsCount + ')'}`);

    const kycCount = await KYC.countDocuments({});
    console.log(`KYC Records: ${kycCount} ${kycCount === 5 ? '✅' : '❌ (expected: 5)'}`);
    if (kycCount !== 5) allChecksPassed = false;

    // Data Integrity Checks
    console.log('\n🔗 DATA INTEGRITY CHECKS');
    console.log('-'.repeat(60));

    // Check all users have verified email
    const unverifiedUsers = await User.countDocuments({ isEmailVerified: false });
    console.log(`Unverified users: ${unverifiedUsers} ${unverifiedUsers === 0 ? '✅' : '❌ (expected: 0)'}`);
    if (unverifiedUsers !== 0) allChecksPassed = false;

    // Check all companies have KYC
    const companiesWithKYC = await KYC.distinct('companyId');
    console.log(`Companies with KYC: ${companiesWithKYC.length} ${companiesWithKYC.length === 5 ? '✅' : '❌ (expected: 5)'}`);
    if (companiesWithKYC.length !== 5) allChecksPassed = false;

    // Check warehouse name uniqueness
    const warehouseNames = await Warehouse.distinct('name');
    console.log(`Unique warehouse names: ${warehouseNames.length} ${warehouseNames.length === warehousesCount ? '✅' : '❌'}`);
    if (warehouseNames.length !== warehousesCount) allChecksPassed = false;

    // Check default warehouses
    const defaultWarehouses = await Warehouse.countDocuments({ isDefault: true });
    console.log(`Default warehouses: ${defaultWarehouses} ${defaultWarehouses === 5 ? '✅' : '❌ (expected: 5)'}`);
    if (defaultWarehouses !== 5) allChecksPassed = false;

    // Check orphaned records
    const orphanedOrders = await Order.countDocuments({
        $or: [
            { companyId: null },
            { warehouseId: null }
        ]
    });
    console.log(`Orphaned orders: ${orphanedOrders} ${orphanedOrders === 0 ? '✅' : '❌ (expected: 0)'}`);
    if (orphanedOrders !== 0) allChecksPassed = false;

    const orphanedShipments = await Shipment.countDocuments({ orderId: null });
    console.log(`Orphaned shipments: ${orphanedShipments} ${orphanedShipments === 0 ? '✅' : '❌ (expected: 0)'}`);
    if (orphanedShipments !== 0) allChecksPassed = false;

    // Order Status Distribution
    console.log('\n📊 ORDER STATUS DISTRIBUTION');
    console.log('-'.repeat(60));

    const statusCounts = await Order.aggregate([
        { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    statusCounts.forEach(s => {
        console.log(`   ${s._id.padEnd(15)}: ${s.count}`);
    });

    // Carrier Distribution
    console.log('\n🚚 CARRIER DISTRIBUTION');
    console.log('-'.repeat(60));

    const carrierCounts = await Shipment.aggregate([
        { $group: { _id: '$carrier', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    if (carrierCounts.length > 0) {
        carrierCounts.forEach(c => {
            const percentage = ((c.count / shipmentsCount) * 100).toFixed(1);
            console.log(`   ${c._id.padEnd(15)}: ${c.count.toString().padStart(3)} (${percentage}%)`);
        });
    } else {
        console.log('   No shipments found');
    }

    // NDR Cases
    const ndrCases = await Shipment.countDocuments({ currentStatus: 'ndr' });
    console.log(`\n⚠️  NDR cases: ${ndrCases}`);

    // Payment Method Distribution
    console.log('\n💳 PAYMENT METHOD DISTRIBUTION');
    console.log('-'.repeat(60));

    const paymentCounts = await Order.aggregate([
        { $group: { _id: '$paymentMethod', count: { $sum: 1 } } }
    ]);

    paymentCounts.forEach(p => {
        const percentage = ((p.count / ordersCount) * 100).toFixed(1);
        console.log(`   ${p._id.padEnd(15)}: ${p.count.toString().padStart(3)} (${percentage}%)`);
    });

    // Demo Login Test
    console.log('\n🔐 DEMO LOGIN CREDENTIALS');
    console.log('-'.repeat(60));

    const demoUser = await User.findOne({ email: 'demo@shipcrowd.com' });
    if (demoUser) {
        console.log('✅ demo@shipcrowd.com exists');
        console.log(`   Password: Demo@2024`);
        console.log(`   Role: ${demoUser.role}`);
        console.log(`   Email Verified: ${demoUser.isEmailVerified ? '✅' : '❌'}`);
    } else {
        console.log('❌ demo@shipcrowd.com not found');
        allChecksPassed = false;
    }

    const adminUser = await User.findOne({ email: 'admin@shipcrowd.com' });
    if (adminUser) {
        console.log('✅ admin@shipcrowd.com exists');
        console.log(`   Password: Admin@2024`);
        console.log(`   Role: ${adminUser.role}`);
    } else {
        console.log('❌ admin@shipcrowd.com not found');
        allChecksPassed = false;
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    if (allChecksPassed) {
        console.log('🎉 ALL CRITICAL CHECKS PASSED!');
        console.log('✅ Seed data is valid and ready for use');
    } else {
        console.log('⚠️  SOME CHECKS FAILED');
        console.log('❌ Please review the issues above');
    }
    console.log('='.repeat(60));
    console.log('\n');
}

async function runVerification() {
    await connectDB();

    try {
        await verifySeed();
    } catch (error) {
        console.error('\n❌ Verification failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB\n');
    }
}

// Run if called directly
if (require.main === module) {
    runVerification();
}

export default runVerification;
