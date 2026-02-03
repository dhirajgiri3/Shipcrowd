/**
 * Teams Seeder
 * 
 * Seeds team-related data:
 * - TeamInvitations: pending, accepted, and expired invitations
 * - TeamActivity: activity logs for team actions
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../../mongoose/models/iam/users/user.model';
import Company from '../../mongoose/models/organization/core/company.model';
import TeamInvitation from '../../mongoose/models/iam/access/team-invitation.model';
import TeamActivity from '../../mongoose/models/organization/teams/team-activity.model';
import { randomInt, selectRandom, selectWeightedFromObject } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { subDays, addDays } from '../utils/date.utils';
import { generateEmail } from '../data/customer-names';

// Invitation status distribution
const INVITATION_STATUS_DISTRIBUTION = {
    pending: 40,
    accepted: 50,
    expired: 10,
};

// Team role distribution for invitations
const TEAM_ROLE_DISTRIBUTION = {
    admin: 10,
    manager: 25,
    member: 50,
    viewer: 15,
};

// Activity action types with their modules
const ACTIVITY_ACTIONS: { action: string; module: string; description: string }[] = [
    { action: 'login', module: 'system', description: 'User logged in' },
    { action: 'logout', module: 'system', description: 'User logged out' },
    { action: 'view', module: 'orders', description: 'Viewed order details' },
    { action: 'create', module: 'orders', description: 'Created new order' },
    { action: 'update', module: 'orders', description: 'Updated order status' },
    { action: 'view', module: 'products', description: 'Viewed product catalog' },
    { action: 'create', module: 'products', description: 'Added new product' },
    { action: 'update', module: 'products', description: 'Updated product details' },
    { action: 'view', module: 'warehouses', description: 'Viewed warehouse info' },
    { action: 'create', module: 'warehouses', description: 'Added new warehouse' },
    { action: 'view', module: 'customers', description: 'Viewed customer list' },
    { action: 'view', module: 'reports', description: 'Viewed analytics report' },
    { action: 'export', module: 'reports', description: 'Exported report data' },
    { action: 'view', module: 'team', description: 'Viewed team members' },
    { action: 'create', module: 'team', description: 'Invited new team member' },
    { action: 'update', module: 'team', description: 'Updated team member role' },
    { action: 'delete', module: 'team', description: 'Removed team member' },
    { action: 'view', module: 'settings', description: 'Viewed company settings' },
    { action: 'update', module: 'settings', description: 'Updated settings' },
];

// Common IP addresses (simulated)
const IP_ADDRESSES = [
    '103.59.75.123', '49.207.203.45', '182.74.156.89', '223.190.86.12',
    '106.51.24.178', '117.200.45.67', '59.152.98.34', '124.153.67.89',
];

// Common user agents
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
];

/**
 * Generate team invitation
 */
function generateInvitation(companyId: mongoose.Types.ObjectId, invitedBy: mongoose.Types.ObjectId): any {
    const status = selectWeightedFromObject(INVITATION_STATUS_DISTRIBUTION);
    const teamRole = selectWeightedFromObject(TEAM_ROLE_DISTRIBUTION);
    const createdAt = subDays(new Date(), randomInt(1, 60));

    let expiresAt: Date;
    if (status === 'expired') {
        expiresAt = subDays(new Date(), randomInt(1, 30));
    } else if (status === 'accepted') {
        expiresAt = addDays(createdAt, 7);
    } else {
        expiresAt = addDays(new Date(), randomInt(1, 7));
    }

    const inviteIndex = Math.floor(Math.random() * 10000);

    return {
        email: `invite${inviteIndex}@example.com`,
        companyId,
        invitedBy,
        teamRole,
        invitationMessage: Math.random() > 0.5
            ? `You are invited to join our team as ${teamRole}. Looking forward to working with you!`
            : undefined,
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt,
        status,
        createdAt,
        updatedAt: status === 'accepted' ? addDays(createdAt, randomInt(0, 3)) : createdAt,
    };
}

/**
 * Generate team activity
 */
function generateActivity(
    userId: mongoose.Types.ObjectId,
    companyId: mongoose.Types.ObjectId,
    createdAt: Date
): any {
    const activity = selectRandom(ACTIVITY_ACTIONS);

    return {
        userId,
        companyId,
        action: activity.action,
        module: activity.module,
        details: {
            description: activity.description,
            timestamp: createdAt.toISOString(),
            resourceId: new mongoose.Types.ObjectId().toString(),
        },
        ipAddress: selectRandom(IP_ADDRESSES),
        userAgent: selectRandom(USER_AGENTS),
        createdAt,
    };
}

/**
 * Main seeder function
 */
export async function seedTeams(): Promise<void> {
    const timer = createTimer();
    logger.step(16, 'Seeding Teams (Invitations, Permissions, Activities)');

    try {
        // Get all companies with their owner users
        const companies = await Company.find({ isDeleted: false }).lean();
        const companyOwners = await User.find({ role: 'seller', teamRole: 'owner' }).lean();

        if (companies.length === 0 || companyOwners.length === 0) {
            logger.warn('No companies or owners found. Skipping teams seeder.');
            return;
        }

        // Get non-owner users (staff and other team members)
        const teamMembers = await User.find({
            role: { $in: ['seller', 'staff'] },
            teamRole: { $ne: 'owner' }
        }).lean();

        const invitations: any[] = [];
        const activities: any[] = [];

        // Create a map of company to owner
        const companyOwnerMap = new Map<string, any>();
        for (const owner of companyOwners) {
            if (owner.companyId) {
                companyOwnerMap.set(owner.companyId.toString(), owner);
            }
        }

        // Generate invitations and activities for each company
        for (const company of companies) {
            const companyAny = company as any;
            const owner = companyOwnerMap.get(companyAny._id.toString());
            if (!owner) continue;

            // Generate 1-3 invitations per company
            const inviteCount = randomInt(1, 3);
            for (let i = 0; i < inviteCount; i++) {
                invitations.push(generateInvitation(companyAny._id, owner._id));
            }

            // Generate 10-30 activity logs per company (spread over 30 days)
            const activityCount = randomInt(10, 30);
            for (let i = 0; i < activityCount; i++) {
                const daysAgo = randomInt(0, 30);
                const createdAt = subDays(new Date(), daysAgo);
                activities.push(generateActivity(owner._id, companyAny._id, createdAt));
            }
        }

        // Add some activity logs for team members
        for (const member of teamMembers) {
            const memberAny = member as any;
            if (memberAny.companyId) {
                const memberActivityCount = randomInt(5, 15);
                for (let i = 0; i < memberActivityCount; i++) {
                    const daysAgo = randomInt(0, 30);
                    const createdAt = subDays(new Date(), daysAgo);
                    activities.push(generateActivity(memberAny._id, memberAny.companyId, createdAt));
                }
            }
        }

        // Insert all data
        if (invitations.length > 0) {
            await TeamInvitation.insertMany(invitations, { ordered: false }).catch((err) => {
                // Handle duplicate key errors gracefully
                if (err.code !== 11000) throw err;
                logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate invitations`);
            });
        }

        if (activities.length > 0) {
            await TeamActivity.insertMany(activities);
        }

        logger.complete('teams', invitations.length + activities.length, timer.elapsed());
        logger.table({
            'Team Invitations': invitations.length,
            'Team Activities': activities.length,
            'Total Records': invitations.length + activities.length,
        });

    } catch (error) {
        logger.error('Failed to seed teams:', error);
        throw error;
    }
}
