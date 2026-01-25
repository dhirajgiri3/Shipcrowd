/**
 * Companies Seeder
 * 
 * Generates companies linked to seller users (100-120).
 */

import mongoose from 'mongoose';
import Company from '../../mongoose/models/organization/core/company.model';
import User from '../../mongoose/models/iam/users/user.model';
import Membership from '../../mongoose/models/iam/membership.model'; // V5
import Role from '../../mongoose/models/iam/role.model'; // V5
import { SEED_CONFIG, BusinessType } from '../config';
import { randomInt, randomFloat, selectWeightedFromObject, selectRandom, generateHexColor } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { generateBusinessName, generateBusinessDomain } from '../data/business-names';
import { getCityByName, getStateCodeForCity } from '../data/indian-cities';
import { selectBank, generateIFSC, generateAccountNumber, generatePAN, generateGSTIN, generateUPIId } from '../data/indian-banks';
import { generateStreetAddress, generateLandmark } from '../utils/address.utils';

/**
 * Generate company data for a seller
 */
function generateCompanyData(
    seller: any,
    businessType: BusinessType
): any {
    const city = seller.profile?.city || 'Mumbai';
    const state = seller.profile?.state || 'Maharashtra';
    const stateCode = getStateCodeForCity(city);
    const cityData = getCityByName(city);
    const pincode = cityData ? selectRandom(cityData.pincodes) : '400001';

    const companyName = generateBusinessName(businessType, city);
    const bank = selectBank();
    const pan = generatePAN();

    // Generate integrations based on business type
    const hasShopify = businessType !== 'b2b' && Math.random() < 0.4;
    const hasWooCommerce = businessType !== 'b2b' && Math.random() < 0.3;

    return {
        name: companyName,
        address: {
            line1: generateStreetAddress(city),
            line2: generateLandmark(),
            city,
            state,
            country: 'India',
            postalCode: pincode,
        },
        billingInfo: {
            gstin: generateGSTIN(stateCode, pan),
            pan,
            bankName: bank.name,
            accountNumber: generateAccountNumber(bank),
            ifscCode: generateIFSC(bank),
            upiId: generateUPIId(seller.name),
        },
        branding: {
            logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName.slice(0, 2))}&background=random`,
            primaryColor: generateHexColor(),
            secondaryColor: generateHexColor(),
            emailTemplate: 'default',
        },
        integrations: {
            shopify: hasShopify ? {
                shopDomain: `${generateBusinessDomain(companyName).replace('.', '-')}.myshopify.com`,
                accessToken: `shpat_${Math.random().toString(36).substring(2, 34)}`,
                scope: 'read_orders,write_shipping',
                lastSyncAt: new Date(Date.now() - randomInt(1, 7) * 24 * 60 * 60 * 1000),
            } : undefined,
            woocommerce: hasWooCommerce ? {
                siteUrl: `https://${generateBusinessDomain(companyName)}`,
                consumerKey: `ck_${Math.random().toString(36).substring(2, 42)}`,
                consumerSecret: `cs_${Math.random().toString(36).substring(2, 42)}`,
                lastSyncAt: new Date(Date.now() - randomInt(1, 7) * 24 * 60 * 60 * 1000),
            } : undefined,
        },
        settings: {
            notificationEmail: seller.email,
            notificationPhone: seller.profile?.phone,
            autoGenerateInvoice: true,
        },
        wallet: {
            balance: randomFloat(
                SEED_CONFIG.wallet.initialBalance.min,
                SEED_CONFIG.wallet.initialBalance.max,
                2
            ),
            currency: 'INR',
            lastUpdated: new Date(),
            lowBalanceThreshold: SEED_CONFIG.wallet.lowBalanceThreshold,
        },
        status: selectWeightedFromObject(SEED_CONFIG.companyStatus),
        isActive: true,
        isDeleted: false,
    };
}

/**
 * Main seeder function
 */
export async function seedCompanies(): Promise<void> {
    const timer = createTimer();
    logger.step(2, 'Seeding Companies');

    try {
        // ============================================
        // Admin Company (for dual-role support)
        // ============================================

        // V5: Fetch Company Roles
        const ownerRole = await Role.findOne({ name: 'owner', scope: 'company' });
        const managerRole = await Role.findOne({ name: 'manager', scope: 'company' });
        const memberRole = await Role.findOne({ name: 'member', scope: 'company' });
        const viewerRole = await Role.findOne({ name: 'viewer', scope: 'company' });

        if (!ownerRole || !managerRole || !memberRole || !viewerRole) {
            throw new Error('Company roles not found. Run seed-roles migration first.');
        }

        const roleMap = {
            owner: ownerRole._id,
            manager: managerRole._id,
            member: memberRole._id,
            viewer: viewerRole._id
        };

        const CREATE_ADMIN_COMPANY = true; // Enabled for frontend role switching

        let adminCompanyCount = 0;
        if (CREATE_ADMIN_COMPANY) {
            logger.info('Creating admin company for dual-role testing...');
            const adminCompanyData = {
                name: 'Shipcrowd Demo Store',
                address: {
                    line1: 'Demo Store HQ',
                    line2: 'Tech Park',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    country: 'India',
                    postalCode: '400051',
                },
                billingInfo: {
                    gstin: generateGSTIN('27', 'ADMIN00000'),
                    pan: 'ADMIN00000',
                    bankName: 'HDFC Bank',
                    accountNumber: generateAccountNumber(selectBank()),
                    ifscCode: 'HDFC0000001',
                    upiId: 'admin@Shipcrowd',
                },
                branding: {
                    logo: 'https://ui-avatars.com/api/?name=HD&background=6366f1&color=fff',
                    primaryColor: '#6366f1',
                    secondaryColor: '#8b5cf6',
                    emailTemplate: 'default',
                },
                integrations: {},
                settings: {
                    notificationEmail: 'admin1@Shipcrowd.com',
                    notificationPhone: '+919999999999',
                    autoGenerateInvoice: true,
                },
                wallet: {
                    balance: 1000000,
                    currency: 'INR',
                    lastUpdated: new Date(),
                    lowBalanceThreshold: 100000,
                },
                status: 'approved',
                isActive: true,
                isDeleted: false,
            };

            const adminCompany = await Company.create(adminCompanyData);

            // Link only admin1 to this company using V5 Membership
            const adminUser = await User.findOne({ email: 'admin1@Shipcrowd.com' });
            if (adminUser) {
                await Membership.create({
                    userId: adminUser._id,
                    companyId: adminCompany._id,
                    roles: [roleMap.owner],
                    status: 'active'
                });
            }

            adminCompanyCount = 1;
            logger.success(`✓ Admin company created and linked to admin1@Shipcrowd.com`);
        }

        // ============================================
        // Create Seller Companies
        // ============================================
        // Get seller users
        const sellers = await User.find({ role: 'seller' }).lean();

        if (sellers.length === 0) {
            logger.warn('No seller users found. Skipping seller companies.');
            if (adminCompanyCount > 0) {
                logger.complete('companies', adminCompanyCount, timer.elapsed());
            }
            return;
        }

        const companies: any[] = [];
        const businessTypes: BusinessType[] = [];
        const usedNames = new Set<string>();
        if (CREATE_ADMIN_COMPANY) {
            usedNames.add('Shipcrowd Demo Store');
        }

        // Generate companies for each seller
        for (let i = 0; i < sellers.length; i++) {
            const seller = sellers[i];

            // Select business type based on distribution
            const businessType = selectWeightedFromObject(SEED_CONFIG.businessTypes) as BusinessType;
            businessTypes.push(businessType);

            let companyData = generateCompanyData(seller, businessType);

            // Ensure company name is unique
            if (usedNames.has(companyData.name)) {
                companyData.name = `${companyData.name} ${randomInt(100, 999)}`;
            }
            usedNames.add(companyData.name);

            // Store seller reference for later linking
            (companyData as any)._sellerId = seller._id;

            companies.push(companyData);

            if ((i + 1) % 20 === 0 || i === sellers.length - 1) {
                logger.progress(i + 1, sellers.length, 'Companies');
            }
        }

        // Insert all companies using create() to trigger encryption middleware
        // Note: insertMany() bypasses Mongoose middleware, leaving sensitive data unencrypted
        logger.info('Creating seller companies with encryption...');
        const insertedCompanies = await Promise.all(
            companies.map(companyData => Company.create(companyData))
        );

        // Link companies to seller users via Membership (Owner)
        // We use a loop to trigger pre/post save hooks (Critical for V5 Sync)
        logger.info('Creating owner memberships...');
        for (let i = 0; i < insertedCompanies.length; i++) {
            const company = insertedCompanies[i];
            const seller = sellers[i];

            await Membership.create({
                userId: seller._id,
                companyId: company._id,
                roles: [roleMap.owner], // Assign Owner Role
                status: 'active'
            });
        }

        // Link staff users to companies
        const staffUsers = await User.find({ role: 'staff' }).lean();
        const staffBulkOps: any[] = [];
        let staffLinked = 0;

        // Assign 40% of companies to have 0-3 staff members
        for (const company of insertedCompanies) {
            const hasStaff = Math.random() < 0.4;
            if (!hasStaff) continue;

            // 30% have 1 staff, 10% have 2-3 staff
            const staffCount = Math.random() < 0.3
                ? randomInt(1, 1)
                : Math.random() < 0.33
                    ? randomInt(2, 2)
                    : randomInt(3, 3);

            // Randomly select staff members
            for (let i = 0; i < staffCount && staffUsers.length > 0; i++) {
                const randomStaffIndex = randomInt(0, staffUsers.length - 1);
                const staffUser = staffUsers[randomStaffIndex];

                // Check if staff already has membership (skip if so)
                const existingMembership = await Membership.findOne({ userId: staffUser._id });
                if (existingMembership) continue;

                // V5: Select role
                const teamRoles = ['manager', 'member', 'member', 'member', 'member', 'viewer'];
                const selectedRoleName = selectRandom(teamRoles) as keyof typeof roleMap;
                const roleId = roleMap[selectedRoleName];

                const isActive = Math.random() < 0.85;

                // Create Membership
                await Membership.create({
                    userId: staffUser._id,
                    companyId: company._id,
                    roles: [roleId],
                    status: isActive ? 'active' : 'invited'
                });

                staffLinked++;
            }
        }

        // Count by business type
        const fashionCount = businessTypes.filter((t) => t === 'fashion').length;
        const electronicsCount = businessTypes.filter((t) => t === 'electronics').length;
        const b2bCount = businessTypes.filter((t) => t === 'b2b').length;

        // Count by status
        const approvedCount = companies.filter((c) => c.status === 'approved').length;
        const kycSubmittedCount = companies.filter((c) => c.status === 'kyc_submitted').length;
        const suspendedCount = companies.filter((c) => c.status === 'suspended').length;

        const totalCompanies = companies.length + adminCompanyCount;

        logger.complete('companies', totalCompanies, timer.elapsed());
        const tableData: Record<string, any> = {
            'Total Companies': totalCompanies,
        };

        if (adminCompanyCount > 0) {
            tableData['-- Admin Companies'] = adminCompanyCount;
        }

        tableData['-- Seller Companies'] = companies.length;
        tableData['Business Types:'] = '';
        tableData['  Fashion'] = fashionCount;
        tableData['  Electronics'] = electronicsCount;
        tableData['  B2B'] = b2bCount;
        tableData['Status:'] = '';
        tableData['  Approved'] = approvedCount + adminCompanyCount;
        tableData['  KYC Submitted'] = kycSubmittedCount;
        tableData['  Suspended'] = suspendedCount;
        tableData['Staff Linked'] = staffLinked;

        logger.table(tableData);

    } catch (error) {
        logger.error('Failed to seed companies:', error);
        throw error;
    }
}

/**
 * Get seeded companies
 */
export async function getCompanies(filter: any = {}) {
    return Company.find(filter).lean();
}

/**
 * Get approved companies
 */
export async function getApprovedCompanies() {
    return Company.find({ status: 'approved', isDeleted: false }).lean();
}

/**
 * Get company with its seller
 */
export async function getCompanyWithSeller(companyId: mongoose.Types.ObjectId) {
    const company = await Company.findById(companyId).lean();
    const seller = await User.findOne({
        companyId,
        role: 'seller',
        teamRole: 'owner'
    }).lean();

    return { company, seller };
}
