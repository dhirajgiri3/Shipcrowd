// Load environment variables FIRST
import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import User from '../../mongoose/models/iam/users/user.model';
import Role from '../../mongoose/models/iam/role.model';
import logger from '../../../../shared/logger/winston.logger';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shipcrowd';

/**
 * Platform Role Backfill Script - V5 RBAC
 * 
 * Maps existing `user.role` (enum) to `user.platformRole` (ObjectId).
 * Critical for Identity Context in V5.
 */

async function backfillPlatformRoles() {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB');

    // Get global roles
    const superAdminRole = await Role.findOne({ name: 'super_admin', scope: 'global' });
    const adminRole = await Role.findOne({ name: 'admin', scope: 'global' });
    const userRole = await Role.findOne({ name: 'user', scope: 'global' });

    if (!superAdminRole || !adminRole || !userRole) {
        throw new Error('Global roles not found. Run seed-roles.ts first.');
    }

    const roleMap: Record<string, mongoose.Types.ObjectId> = {
        'super_admin': (superAdminRole as any)._id,
        'admin': (adminRole as any)._id,
        'seller': (userRole as any)._id,  // Sellers are standard users
        'staff': (userRole as any)._id    // Staff are standard users (permissions come from Membership)
    };

    const users = await User.find({ platformRole: { $exists: false } });
    logger.info(`Found ${users.length} users without platformRole`);

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
        // Current role enum: 'super_admin' | 'admin' | 'seller' | 'staff'
        const oldRole = user.role || 'seller'; // Default to seller/user if missing

        if (roleMap[oldRole]) {
            user.platformRole = roleMap[oldRole];
            await user.save(); // Triggers field encryption but that's fine inside script
            updated++;

            if (updated % 50 === 0) process.stdout.write('.');
        } else {
            logger.warn(`Unknown role '${oldRole}' for user ${user._id}`);
            skipped++;
        }
    }

    logger.info(`\nPlatform Role Backfill Complete!`);
    logger.info(`Updated: ${updated}`);
    logger.info(`Skipped: ${skipped}`);

    await mongoose.disconnect();
}

backfillPlatformRoles().catch((error) => {
    logger.error('Backfill failed:', error);
    process.exit(1);
});
