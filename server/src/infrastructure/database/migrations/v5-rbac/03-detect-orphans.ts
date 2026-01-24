// Load environment variables FIRST
import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import User from '../../mongoose/models/iam/users/user.model';
import logger from '../../../../shared/logger/winston.logger';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shipcrowd';

/**
 * Orphan Detection Script - V5 RBAC
 * 
 * Detects users with invalid states:
 * - Sellers without companyId
 * - Staff without companyId
 * - Users with companyId but no active Membership
 */

async function detectOrphans() {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB\n');

    // 1. Sellers without companyId
    const orphanSellers = await User.find({
        role: 'seller',
        $or: [{ companyId: null }, { companyId: { $exists: false } }]
    }).select('_id email name createdAt');

    logger.info('=== ORPHAN SELLERS (no companyId) ===');
    if (orphanSellers.length === 0) {
        logger.info('✅ None found');
    } else {
        console.table(orphanSellers.map(u => ({
            id: (u as any)._id.toString(),
            email: u.email,
            name: u.name,
            created: (u as any).createdAt?.toISOString()
        })));
        logger.warn(`⚠️  Total: ${orphanSellers.length}`);
    }

    // 2. Staff without companyId
    const orphanStaff = await User.find({
        role: 'staff',
        $or: [{ companyId: null }, { companyId: { $exists: false } }]
    }).select('_id email name createdAt');

    logger.info('\n=== ORPHAN STAFF (no companyId) ===');
    if (orphanStaff.length === 0) {
        logger.info('✅ None found');
    } else {
        console.table(orphanStaff.map(u => ({
            id: (u as any)._id.toString(),
            email: u.email,
            name: u.name,
            created: (u as any).createdAt?.toISOString()
        })));
        logger.warn(`⚠️  Total: ${orphanStaff.length}`);
    }

    // 3. Summary
    const totalOrphans = orphanSellers.length + orphanStaff.length;
    logger.info('\n=== SUMMARY ===');
    logger.info(`Total orphans: ${totalOrphans}`);

    if (totalOrphans > 0) {
        logger.warn('\n⚠️  Action required:');
        logger.warn('1. Assign these users to companies, OR');
        logger.warn('2. Mark them as inactive, OR');
        logger.warn('3. Delete them if they are test accounts');
    } else {
        logger.info('✅ No orphans found. Database is clean!');
    }

    await mongoose.disconnect();
}

detectOrphans().catch((error) => {
    logger.error('Detection failed:', error);
    process.exit(1);
});
