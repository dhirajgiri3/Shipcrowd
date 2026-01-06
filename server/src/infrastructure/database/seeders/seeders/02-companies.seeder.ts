/**
 * Companies Seeder
 * 
 * Generates companies linked to seller users (100-120).
 */

import mongoose from 'mongoose';
import Company from '../../mongoose/models/organization/core/company.model';
import User from '../../mongoose/models/iam/users/user.model';
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
        // Get seller users
        const sellers = await User.find({ role: 'seller', teamRole: 'owner' }).lean();

        if (sellers.length === 0) {
            logger.warn('No seller users found. Skipping companies seeder.');
            return;
        }

        const companies: any[] = [];
        const businessTypes: BusinessType[] = [];

        // Generate companies for each seller
        for (let i = 0; i < sellers.length; i++) {
            const seller = sellers[i];

            // Select business type based on distribution
            const businessType = selectWeightedFromObject(SEED_CONFIG.businessTypes) as BusinessType;
            businessTypes.push(businessType);

            const companyData = generateCompanyData(seller, businessType);

            // Store seller reference for later linking
            (companyData as any)._sellerId = seller._id;

            companies.push(companyData);

            if ((i + 1) % 20 === 0 || i === sellers.length - 1) {
                logger.progress(i + 1, sellers.length, 'Companies');
            }
        }

        // Insert all companies
        const insertedCompanies = await Company.insertMany(companies);

        // Link companies to seller users
        const bulkOps = insertedCompanies.map((company, index) => ({
            updateOne: {
                filter: { _id: sellers[index]._id },
                update: { companyId: company._id },
            },
        }));

        await User.bulkWrite(bulkOps);

        // Count by business type
        const fashionCount = businessTypes.filter((t) => t === 'fashion').length;
        const electronicsCount = businessTypes.filter((t) => t === 'electronics').length;
        const b2bCount = businessTypes.filter((t) => t === 'b2b').length;

        // Count by status
        const approvedCount = companies.filter((c) => c.status === 'approved').length;
        const kycSubmittedCount = companies.filter((c) => c.status === 'kyc_submitted').length;
        const suspendedCount = companies.filter((c) => c.status === 'suspended').length;

        logger.complete('companies', companies.length, timer.elapsed());
        logger.table({
            'Total Companies': companies.length,
            '-- Fashion': fashionCount,
            '-- Electronics': electronicsCount,
            '-- B2B': b2bCount,
            'Status: Approved': approvedCount,
            'Status: KYC Submitted': kycSubmittedCount,
            'Status: Suspended': suspendedCount,
        });

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
