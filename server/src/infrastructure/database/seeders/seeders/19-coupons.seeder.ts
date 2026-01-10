/**
 * Coupons Seeder
 * 
 * Seeds promotional coupons:
 * - 30-50 coupons across companies
 * - Various types (percentage, fixed)
 * - Various states (active, expired, usage limit reached)
 */

import mongoose from 'mongoose';
import Company from '../../mongoose/models/organization/core/company.model';
import Coupon from '../../mongoose/models/marketing/promotions/coupon.model';
import { randomInt, selectRandom, selectWeightedFromObject, generateAlphanumeric } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { subDays, addDays } from '../utils/date.utils';

// Discount type distribution
const DISCOUNT_TYPE_DISTRIBUTION = {
    percentage: 60,
    fixed: 40,
};

// Coupon status (based on dates and usage)
const COUPON_STATUS_DISTRIBUTION = {
    active: 60,
    expired: 25,
    exhausted: 15,
};

// Coupon name templates
const COUPON_TEMPLATES = [
    { prefix: 'SHIP', suffix: ['10', '15', '20', '25', '50'] },
    { prefix: 'SAVE', suffix: ['NOW', 'MORE', 'BIG', 'FAST'] },
    { prefix: 'FIRST', suffix: ['ORDER', 'SHIP', 'TIME'] },
    { prefix: 'WELCOME', suffix: ['10', '20', '25'] },
    { prefix: 'FESTIVE', suffix: ['SALE', 'DIWALI', 'HOLI', 'XMAS'] },
    { prefix: 'BULK', suffix: ['50', '100', 'DEAL'] },
    { prefix: 'VIP', suffix: ['ONLY', 'SPECIAL', 'MEMBER'] },
];

// Carriers
const CARRIERS = ['delhivery', 'bluedart', 'ecom_express', 'dtdc', 'xpressbees'];

// Service types
const SERVICE_TYPES = ['standard', 'express', 'surface', 'air', 'cod'];

/**
 * Generate a unique coupon code
 */
function generateCouponCode(usedCodes: Set<string>): string {
    let code: string;
    do {
        const template = selectRandom(COUPON_TEMPLATES);
        const suffix = selectRandom(template.suffix);
        const random = generateAlphanumeric(4).toUpperCase();
        code = `${template.prefix}${suffix}${random}`;
    } while (usedCodes.has(code));

    usedCodes.add(code);
    return code;
}

/**
 * Generate a coupon
 */
function generateCoupon(companyId: mongoose.Types.ObjectId, usedCodes: Set<string>): any {
    const discountType = selectWeightedFromObject(DISCOUNT_TYPE_DISTRIBUTION);
    const status = selectWeightedFromObject(COUPON_STATUS_DISTRIBUTION);

    let validFrom: Date;
    let validUntil: Date;
    let usageLimit: number;
    let usageCount: number;

    switch (status) {
        case 'active':
            validFrom = subDays(new Date(), randomInt(1, 30));
            validUntil = addDays(new Date(), randomInt(7, 90));
            usageLimit = randomInt(100, 1000);
            usageCount = randomInt(0, Math.floor(usageLimit * 0.6));
            break;
        case 'expired':
            validFrom = subDays(new Date(), randomInt(60, 180));
            validUntil = subDays(new Date(), randomInt(1, 30));
            usageLimit = randomInt(100, 500);
            usageCount = randomInt(10, usageLimit);
            break;
        case 'exhausted':
            validFrom = subDays(new Date(), randomInt(30, 90));
            validUntil = addDays(new Date(), randomInt(7, 30));
            usageLimit = randomInt(50, 200);
            usageCount = usageLimit; // Fully used
            break;
        default:
            validFrom = new Date();
            validUntil = addDays(new Date(), 30);
            usageLimit = 100;
            usageCount = 0;
    }

    const discountValue = discountType === 'percentage'
        ? randomInt(5, 30)
        : randomInt(50, 500);

    const coupon: any = {
        code: generateCouponCode(usedCodes),
        companyId,
        discount: {
            type: discountType,
            value: discountValue,
        },
        validFrom,
        validUntil,
        restrictions: {
            usageLimit,
            usageCount,
        },
        isActive: status === 'active',
        isDeleted: false,
        createdAt: validFrom,
        updatedAt: validFrom,
    };

    // Add optional restrictions
    if (Math.random() > 0.5) {
        coupon.restrictions.minOrderValue = randomInt(500, 5000);
    }

    if (discountType === 'percentage' && Math.random() > 0.5) {
        coupon.restrictions.maxDiscount = randomInt(200, 1000);
    }

    if (Math.random() > 0.7) {
        coupon.restrictions.carriers = [selectRandom(CARRIERS), selectRandom(CARRIERS)].filter((v, i, a) => a.indexOf(v) === i);
    }

    if (Math.random() > 0.7) {
        coupon.restrictions.serviceTypes = [selectRandom(SERVICE_TYPES)];
    }

    return coupon;
}

/**
 * Main seeder function
 */
export async function seedCoupons(): Promise<void> {
    const timer = createTimer();
    logger.step(19, 'Seeding Coupons');

    try {
        const companies = await Company.find({ status: 'approved', isDeleted: false }).lean();

        if (companies.length === 0) {
            logger.warn('No approved companies found. Skipping coupons seeder.');
            return;
        }

        const coupons: any[] = [];
        const usedCodes = new Set<string>();

        // Generate 30-50 coupons distributed across companies
        const couponCount = randomInt(30, 50);

        for (let i = 0; i < couponCount; i++) {
            const company = selectRandom(companies);
            coupons.push(generateCoupon(company._id, usedCodes));
        }

        // Insert coupons
        await Coupon.insertMany(coupons, { ordered: false }).catch((err) => {
            if (err.code !== 11000) throw err;
            logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate coupons`);
        });

        // Count by status
        const activeCoupons = coupons.filter(c => c.isActive).length;
        const expiredCoupons = coupons.filter(c => c.validUntil < new Date()).length;
        const exhaustedCoupons = coupons.filter(c => c.restrictions.usageCount >= c.restrictions.usageLimit).length;

        logger.complete('coupons', coupons.length, timer.elapsed());
        logger.table({
            'Total Coupons': coupons.length,
            'Active': activeCoupons,
            'Expired': expiredCoupons,
            'Exhausted': exhaustedCoupons,
            'Percentage Type': coupons.filter(c => c.discount.type === 'percentage').length,
            'Fixed Type': coupons.filter(c => c.discount.type === 'fixed').length,
        });

    } catch (error) {
        logger.error('Failed to seed coupons:', error);
        throw error;
    }
}
