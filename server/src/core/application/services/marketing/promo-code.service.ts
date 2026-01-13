import mongoose from 'mongoose';
import Coupon, { ICoupon } from '../../../../infrastructure/database/mongoose/models/marketing/promotions/coupon.model';
import { ValidationError, NotFoundError, ConflictError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Promo Code Service
 * Handles promotion creation, validation, and application
 */

interface CreatePromoDto {
    code: string;
    companyId: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    validFrom?: Date;
    validUntil: Date;
    minOrderValue?: number;
    maxDiscount?: number;
    usageLimit?: number;
    carriers?: string[];
    serviceTypes?: string[];
}

interface ValidatePromoResult {
    valid: boolean;
    discountAmount: number;
    coupon?: ICoupon;
    message?: string;
}

class PromoCodeService {
    /**
     * Create a new promo code
     */
    async createPromo(data: CreatePromoDto): Promise<ICoupon> {
        const existingCoupon = await Coupon.findOne({ code: data.code.toUpperCase() });
        if (existingCoupon) {
            throw new ConflictError('Promo code already exists');
        }

        const coupon = new Coupon({
            code: data.code,
            companyId: new mongoose.Types.ObjectId(data.companyId),
            discount: {
                type: data.discountType,
                value: data.discountValue,
            },
            validFrom: data.validFrom || new Date(),
            validUntil: data.validUntil,
            restrictions: {
                minOrderValue: data.minOrderValue,
                maxDiscount: data.maxDiscount,
                usageLimit: data.usageLimit,
                carriers: data.carriers,
                serviceTypes: data.serviceTypes,
            },
        });

        await coupon.save();
        logger.info(`Promo code created: ${data.code}`);
        return coupon;
    }

    /**
     * Validate promo code applicability
     */
    async validatePromo(
        code: string,
        orderAmount: number,
        userId: string,
        companyId: string,
        context?: { carrier?: string; serviceType?: string; postalCode?: string }
    ): Promise<ValidatePromoResult> {
        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            companyId: new mongoose.Types.ObjectId(companyId),
            isActive: true,
            isDeleted: false
        });

        if (!coupon) {
            throw new NotFoundError('Invalid promo code');
        }

        const now = new Date();
        if (now < coupon.validFrom || now > coupon.validUntil) {
            return { valid: false, discountAmount: 0, message: 'Promo code expired' };
        }

        if (coupon.restrictions.usageLimit && (coupon.restrictions.usageCount || 0) >= coupon.restrictions.usageLimit) {
            return { valid: false, discountAmount: 0, message: 'Promo code usage limit exceeded' };
        }

        if (coupon.restrictions.minOrderValue && orderAmount < coupon.restrictions.minOrderValue) {
            return {
                valid: false,
                discountAmount: 0,
                message: `Minimum order value of ${coupon.restrictions.minOrderValue} required`
            };
        }

        // Check carrier restrictions
        if (context?.carrier && coupon.restrictions.carriers?.length && !coupon.restrictions.carriers.includes(context.carrier)) {
            return { valid: false, discountAmount: 0, message: 'Promo code not applicable for this carrier' };
        }

        // Check user restrictions
        if (coupon.restrictions.userIds?.length && !coupon.restrictions.userIds.map(id => id.toString()).includes(userId)) {
            return { valid: false, discountAmount: 0, message: 'Promo code not valid for this user' };
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discount.type === 'percentage') {
            discountAmount = (orderAmount * coupon.discount.value) / 100;
            if (coupon.restrictions.maxDiscount && discountAmount > coupon.restrictions.maxDiscount) {
                discountAmount = coupon.restrictions.maxDiscount;
            }
        } else {
            discountAmount = coupon.discount.value;
        }

        // Ensure discount doesn't exceed order amount
        if (discountAmount > orderAmount) {
            discountAmount = orderAmount;
        }

        return {
            valid: true,
            discountAmount,
            coupon,
        };
    }

    /**
     * Apply promo code (increment usage)
     * Atomic operation to prevent race conditions
     */
    async applyPromo(code: string): Promise<boolean> {
        const result = await Coupon.findOneAndUpdate(
            {
                code: code.toUpperCase(),
                isActive: true,
                $or: [
                    { 'restrictions.usageLimit': { $exists: false } },
                    { $expr: { $lt: ['$restrictions.usageCount', '$restrictions.usageLimit'] } }
                ]
            },
            { $inc: { 'restrictions.usageCount': 1 } },
            { new: true }
        );

        if (!result) {
            throw new ValidationError('Promo code invalid or usage limit exceeded');
        }

        return true;
    }

    /**
     * List promo codes
     */
    async listPromos(companyId: string, activeOnly: boolean = true) {
        const query: any = { companyId: new mongoose.Types.ObjectId(companyId), isDeleted: false };

        if (activeOnly) {
            query.isActive = true;
            query.validUntil = { $gte: new Date() };
        }

        return Coupon.find(query).sort({ createdAt: -1 });
    }
}

export default new PromoCodeService();
