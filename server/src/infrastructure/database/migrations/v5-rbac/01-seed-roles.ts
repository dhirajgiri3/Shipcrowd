import mongoose from 'mongoose';
import Role from '../../mongoose/models/iam/role.model';
import logger from '../../../../shared/logger/winston.logger';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shipcrowd';

/**
 * Default Roles Seeder - V5 RBAC
 * 
 * Seeds the database with default platform and company roles.
 * Idempotent: Safe to run multiple times.
 */

const GLOBAL_ROLES = [
    {
        name: 'super_admin',
        scope: 'global',
        isSystem: true,
        permissions: [
            'roles.create',
            'roles.edit',
            'roles.deprecate',
            'roles.delete',
            'roles.assign',
            'users.manage',
            'users.suspend',
            'impersonate.start',
            'impersonate.write',
            'audit.view',
            'system.config'
        ]
    },
    {
        name: 'admin',
        scope: 'global',
        isSystem: true,
        permissions: [
            'users.manage',
            'roles.assign',
            'impersonate.start',
            'audit.view'
        ]
    },
    {
        name: 'user',
        scope: 'global',
        isSystem: true,
        permissions: []
    }
];

const COMPANY_ROLES = [
    {
        name: 'owner',
        scope: 'company',
        isSystem: true,
        permissions: [
            // Orders
            'orders.view',
            'orders.create',
            'orders.cancel',
            'orders.print_label',
            'orders.bulk_upload',
            // Shipments
            'shipments.view',
            'shipments.schedule',
            'shipments.track',
            'shipments.rto_manage',
            // Wallet
            'wallet.view_balance',
            'wallet.charge_create',
            'wallet.charge_approve',
            'wallet.refund_request',
            'wallet.refund_approve',
            // Billing
            'billing.view',
            // Team
            'users.invite',
            'users.manage',
            'roles.assign'
        ]
    },
    {
        name: 'manager',
        scope: 'company',
        isSystem: true,
        permissions: [
            'orders.view',
            'orders.create',
            'orders.cancel',
            'shipments.view',
            'shipments.schedule',
            'shipments.track',
            'wallet.view_balance',
            'billing.view',
            'users.invite'
        ]
    },
    {
        name: 'member',
        scope: 'company',
        isSystem: true,
        permissions: [
            'orders.view',
            'orders.create',
            'shipments.view',
            'shipments.schedule',
            'shipments.track',
            'wallet.view_balance'
        ]
    },
    {
        name: 'viewer',
        scope: 'company',
        isSystem: true,
        permissions: [
            'orders.view',
            'shipments.view',
            'shipments.track',
            'wallet.view_balance',
            'billing.view'
        ]
    }
];

async function seedRoles() {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB');

    let created = 0, skipped = 0;

    // Seed global roles
    for (const roleData of GLOBAL_ROLES) {
        const existing = await Role.findOne({ name: roleData.name, scope: roleData.scope });
        if (existing) {
            logger.info(`Skipping existing role: ${roleData.name} (${roleData.scope})`);
            skipped++;
            continue;
        }

        const role = await Role.create(roleData);
        logger.info(`Created role: ${role.name} (${role.scope}) with ${role.effectivePermissions.length} permissions`);
        created++;
    }

    // Seed company roles
    for (const roleData of COMPANY_ROLES) {
        const existing = await Role.findOne({ name: roleData.name, scope: roleData.scope });
        if (existing) {
            logger.info(`Skipping existing role: ${roleData.name} (${roleData.scope})`);
            skipped++;
            continue;
        }

        const role = await Role.create(roleData);
        logger.info(`Created role: ${role.name} (${role.scope}) with ${role.effectivePermissions.length} permissions`);
        created++;
    }

    logger.info(`\nRoles seeded successfully!\nCreated: ${created}, Skipped: ${skipped}`);
    await mongoose.disconnect();
}

seedRoles().catch((error) => {
    logger.error('Error seeding roles:', error);
    process.exit(1);
});
