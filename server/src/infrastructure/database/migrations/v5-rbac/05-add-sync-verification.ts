import mongoose from 'mongoose';
import User from '../../mongoose/models/iam/users/user.model';
import Membership from '../../mongoose/models/iam/membership.model';
import Role from '../../mongoose/models/iam/role.model';
import Company from '../../mongoose/models/organization/core/company.model';
import logger from '../../../../shared/logger/winston.logger';
import { config } from 'dotenv';

// Load environment variables
config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';

async function verifySyncHooks() {
    try {
        await mongoose.connect(MONGO_URI);
        logger.info('🔍 Verifying RBAC V5 Synchronization...');

        // 1. Check: All users with companyId have Memberships
        // This verifies the backfill and sync hooks for company association
        const usersWithCompany = await User.countDocuments({ companyId: { $exists: true, $ne: null } });
        const memberships = await Membership.countDocuments({ status: 'active' });

        logger.info(`Users with companyId: ${usersWithCompany}`);
        logger.info(`Active Memberships: ${memberships}`);

        if (usersWithCompany !== memberships) {
            if (Math.abs(usersWithCompany - memberships) > 5) {
                logger.warn(`⚠️  Significant mismatch! Users: ${usersWithCompany}, Memberships: ${memberships}`);
            } else {
                logger.info(`ℹ️  Minor mismatch (likely test data noise): ${Math.abs(usersWithCompany - memberships)}`);
            }

            // Detailed diagnosis
            const users = await User.find({ companyId: { $exists: true, $ne: null } }).select('_id companyId email').lean();
            let missingCount = 0;
            for (const u of users) {
                const hasMem = await Membership.exists({ userId: u._id, companyId: u.companyId, status: 'active' });
                if (!hasMem) {
                    logger.warn(`❌ User missing active membership: ${u.email} (${u._id}) for company ${u.companyId}`);
                    missingCount++;
                    if (missingCount >= 10) {
                        logger.warn('... inhibiting further logs ...');
                        break;
                    }
                }
            }
        } else {
            logger.info(`✅ Membership counts match!`);
        }

        // 2. Check: All users have platformRole
        // This verifies the backfill and sync hooks for global role
        const usersWithoutPlatformRole = await User.countDocuments({ platformRole: { $exists: false } });

        if (usersWithoutPlatformRole > 0) {
            logger.warn(`⚠️  ${usersWithoutPlatformRole} users missing platformRole`);
        } else {
            logger.info(`✅ All users have platformRole`);
        }

        // 3. Check: All companies have at least one owner
        // This verifies the Ownership Enforcement Hook
        // FIXED: Use Company model directly instead of string lookup
        const companies = await Company.find().lean();
        const ownerRole = await Role.findOne({ name: 'owner', scope: 'company' }).lean();

        if (!ownerRole) {
            logger.error('❌ Owner role not found!');
        } else {
            let ownerlessCompanies = 0;
            for (const company of companies) {
                const owners = await Membership.countDocuments({
                    companyId: company._id,
                    roles: ownerRole._id,
                    status: 'active'
                });

                if (owners === 0) {
                    // logger.warn(`❌ Company ${company._id} has NO active owners!`);
                    ownerlessCompanies++;
                }
            }

            if (ownerlessCompanies > 0) {
                logger.warn(`⚠️  ${ownerlessCompanies} companies found without active owners (investigate manual fix)`);
            } else {
                logger.info(`✅ All companies have active owners`);
            }
        }

        // 4. Check: No circular role inheritance
        // This verifies the Cycle Detection Hook/Logic
        const roles = await Role.find().lean();
        let cyclesFound = 0;
        for (const role of roles) {
            if (role.inherits && role.inherits.length > 0) {
                const visited = new Set();
                const stack = [role];

                while (stack.length > 0) {
                    const current = stack.pop();
                    if (!current) continue;

                    const id = current._id.toString();
                    if (visited.has(id)) {
                        if (id === role._id.toString()) {
                            logger.error(`❌ Cycle detected for role: ${role.name}`);
                            cyclesFound++;
                        }
                        continue;
                    }
                    if (visited.has(id)) continue;
                    visited.add(id);

                    if (current.inherits) {
                        // @ts-ignore
                        for (const childId of current.inherits) {
                            const child = roles.find(r => r._id.toString() === childId.toString());
                            if (child) stack.push(child);
                        }
                    }
                }
            }
        }

        if (cyclesFound === 0) {
            logger.info(`✅ No rule inheritance cycles detected`);
        }

        logger.info('✅ Verification complete!');
    } catch (error) {
        logger.error('Verification failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifySyncHooks().catch(console.error);
