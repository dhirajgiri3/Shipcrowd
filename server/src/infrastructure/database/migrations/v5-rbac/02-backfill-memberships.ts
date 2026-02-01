// Load environment variables FIRST
import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import User from '../../mongoose/models/iam/users/user.model';
import Membership from '../../mongoose/models/iam/membership.model';
import Role from '../../mongoose/models/iam/role.model';
import logger from '../../../../shared/logger/winston.logger';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shipcrowd';

/**
 * Membership Backfill Script - V5 RBAC
 * 
 * Migrates existing user.companyId to Membership records.
 * Idempotent: Safe to run multiple times.
 * 
 * Logic:
 * - For each user with companyId, create a Membership
 * - Map user.teamRole to corresponding Role
 * - Default to 'owner' role if no teamRole
 */

async function backfillMemberships() {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB');

    // Get default roles
    const ownerRole = await Role.findOne({ name: 'owner', scope: 'company' });
    const managerRole = await Role.findOne({ name: 'manager', scope: 'company' });
    const memberRole = await Role.findOne({ name: 'member', scope: 'company' });
    const viewerRole = await Role.findOne({ name: 'viewer', scope: 'company' });

    if (!ownerRole) {
        throw new Error('Owner role not found. Run seed-roles.ts first.');
    }

    // Find all users with companyId
    const users = await User.find({
        companyId: { $exists: true, $ne: null }
    });

    logger.info(`Found ${users.length} users with companyId`);

    let created = 0, skipped = 0, errors = 0;

    for (const user of users) {
        try {
            // Check if membership already exists (idempotent)
            const existing = await Membership.findOne({
                userId: user._id,
                companyId: user.companyId
            });

            if (existing) {
                skipped++;
                continue;
            }

            // Map teamRole to Role
            let roleId = ownerRole._id;

            if (user.teamRole) {
                switch (user.teamRole) {
                    case 'admin':
                    case 'manager':
                        roleId = managerRole?._id || ownerRole._id;
                        break;
                    case 'member':
                        roleId = memberRole?._id || ownerRole._id;
                        break;
                    case 'viewer':
                        roleId = viewerRole?._id || ownerRole._id;
                        break;
                    default:
                        roleId = ownerRole._id;
                }
            }

            // Create membership
            await Membership.create({
                userId: user._id,
                companyId: user.companyId,
                roles: [roleId],
                status: user.teamStatus || 'active',
                permissionsVersion: 0
            });

            created++;

            if (created % 50 === 0) {
                logger.info(`Progress: ${created} memberships created`);
            }
        } catch (error) {
            logger.error(`Failed to create membership for user ${user._id}:`, error);
            errors++;
        }
    }

    logger.info(`\nMembership backfill complete!`);
    logger.info(`Created: ${created}`);
    logger.info(`Skipped: ${skipped}`);
    logger.info(`Errors: ${errors}`);

    await mongoose.disconnect();
}

backfillMemberships().catch((error) => {
    logger.error('Backfill failed:', error);
    process.exit(1);
});
