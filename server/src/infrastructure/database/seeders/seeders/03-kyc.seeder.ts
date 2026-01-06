/**
 * KYC Seeder
 * 
 * Generates KYC records for companies (one per company).
 */

import mongoose from 'mongoose';
import KYC from '../../mongoose/models/organization/core/kyc.model';
import Company from '../../mongoose/models/organization/core/company.model';
import User from '../../mongoose/models/iam/users/user.model';
import { SEED_CONFIG } from '../config';
import { randomInt, selectWeightedFromObject, generateUUID } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { subDays, randomDateBetween } from '../utils/date.utils';
import { generatePAN, generateGSTIN, generateAadhaar, generateAccountNumber, generateIFSC, selectBank } from '../data/indian-banks';

/**
 * Generate KYC data for a company
 */
function generateKYCData(
    userId: mongoose.Types.ObjectId,
    company: any
): any {
    const isApproved = company.status === 'approved';
    const status = isApproved
        ? 'verified'
        : selectWeightedFromObject(SEED_CONFIG.kycStatus);

    const verifiedAt = status === 'verified'
        ? randomDateBetween(subDays(new Date(), 365), subDays(new Date(), 30))
        : undefined;

    const bank = selectBank();

    return {
        userId,
        companyId: company._id,
        status,
        documents: {
            pan: {
                number: company.billingInfo?.pan || generatePAN(),
                image: `https://storage.shipcrowd.com/kyc/pan/${generateUUID()}.pdf`,
                verified: status === 'verified',
                verifiedAt,
                name: company.name,
            },
            aadhaar: {
                number: generateAadhaar(),
                frontImage: `https://storage.shipcrowd.com/kyc/aadhaar/${generateUUID()}_front.jpg`,
                backImage: `https://storage.shipcrowd.com/kyc/aadhaar/${generateUUID()}_back.jpg`,
                verified: status === 'verified',
                verifiedAt,
            },
            gstin: {
                number: company.billingInfo?.gstin || generateGSTIN('27'),
                verified: status === 'verified',
                verifiedAt,
                businessName: company.name,
                legalName: company.name,
                status: 'Active',
                registrationType: 'Regular',
                businessType: ['Retail Business', 'E-commerce'],
                addresses: [{
                    type: 'Principal',
                    address: `${company.address?.line1 || ''}, ${company.address?.city || ''}, ${company.address?.state || ''} - ${company.address?.postalCode || ''}`,
                    businessNature: 'Warehouse / Depot',
                }],
                registrationDate: randomDateBetween(
                    subDays(new Date(), 1095), // 3 years ago
                    subDays(new Date(), 365)   // 1 year ago
                ).toISOString().split('T')[0],
                lastUpdated: new Date().toISOString().split('T')[0],
            },
            bankAccount: {
                accountNumber: company.billingInfo?.accountNumber || generateAccountNumber(bank),
                ifscCode: company.billingInfo?.ifscCode || generateIFSC(bank),
                accountHolderName: company.name,
                bankName: company.billingInfo?.bankName || bank.name,
                verified: status === 'verified',
                verifiedAt,
                proofImage: `https://storage.shipcrowd.com/kyc/bank/${generateUUID()}.pdf`,
            },
        },
        completionStatus: {
            personalKycComplete: true,
            companyInfoComplete: true,
            bankDetailsComplete: true,
            agreementComplete: status === 'verified',
        },
        verificationNotes: status === 'verified'
            ? 'All documents verified successfully'
            : status === 'pending'
                ? 'Pending verification'
                : 'Documents under review',
        rejectionReason: status === 'rejected'
            ? 'Document mismatch or unclear images'
            : undefined,
    };
}

/**
 * Main seeder function
 */
export async function seedKYC(): Promise<void> {
    const timer = createTimer();
    logger.step(3, 'Seeding KYC Records');

    try {
        // Get companies with their owners
        const companies = await Company.find({
            status: { $in: ['approved', 'kyc_submitted', 'pending_verification'] }
        }).lean();

        if (companies.length === 0) {
            logger.warn('No companies found. Skipping KYC seeder.');
            return;
        }

        const kycRecords: any[] = [];

        for (let i = 0; i < companies.length; i++) {
            const company = companies[i];

            // Find the owner of this company
            const owner = await User.findOne({
                companyId: company._id,
                role: 'seller',
                teamRole: 'owner'
            }).lean();

            if (!owner) {
                logger.warn(`No owner found for company ${company.name}. Skipping.`);
                continue;
            }

            const kycData = generateKYCData(owner._id as mongoose.Types.ObjectId, company);
            kycRecords.push(kycData);

            if ((i + 1) % 20 === 0 || i === companies.length - 1) {
                logger.progress(i + 1, companies.length, 'KYC Records');
            }
        }

        // Insert all KYC records
        await KYC.insertMany(kycRecords);

        // Count by status
        const verifiedCount = kycRecords.filter((k) => k.status === 'verified').length;
        const pendingCount = kycRecords.filter((k) => k.status === 'pending').length;
        const rejectedCount = kycRecords.filter((k) => k.status === 'rejected').length;

        logger.complete('KYC records', kycRecords.length, timer.elapsed());
        logger.table({
            'Total KYC Records': kycRecords.length,
            'Verified': verifiedCount,
            'Pending': pendingCount,
            'Rejected': rejectedCount,
        });

    } catch (error) {
        logger.error('Failed to seed KYC records:', error);
        throw error;
    }
}

/**
 * Get KYC by company
 */
export async function getKYCByCompany(companyId: mongoose.Types.ObjectId) {
    return KYC.findOne({ companyId }).lean();
}

/**
 * Get verified KYC records
 */
export async function getVerifiedKYCRecords() {
    return KYC.find({ status: 'verified' }).lean();
}
