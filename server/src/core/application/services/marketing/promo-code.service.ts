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
    async applyPromo(code: string, session?: mongoose.ClientSession): Promise<boolean> {
        let query = Coupon.findOneAndUpdate(
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
        if (session) {
            query = query.session(session);
        }
        const result = await query;

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

    /**
     * Update a promo code
     */
    async updatePromo(
        id: string,
        companyId: string,
        data: Partial<CreatePromoDto> & { isActive?: boolean }
    ): Promise<ICoupon> {
        const coupon = await Coupon.findOne({
            _id: id,
            companyId: new mongoose.Types.ObjectId(companyId),
            isDeleted: false
        });

        if (!coupon) {
            throw new NotFoundError('Promo code not found');
        }

        if (data.code && data.code.toUpperCase() !== coupon.code) {
            const existing = await Coupon.findOne({ code: data.code.toUpperCase() });
            if (existing && (existing._id as mongoose.Types.ObjectId).toString() !== id) {
                throw new ConflictError('Promo code already exists');
            }
            coupon.code = data.code.toUpperCase();
        }

        // Update core fields
        if (data.discountType) coupon.discount.type = data.discountType;
        if (data.discountValue !== undefined) coupon.discount.value = data.discountValue;
        if (data.validFrom) coupon.validFrom = data.validFrom;
        if (data.validUntil) coupon.validUntil = data.validUntil;
        if (data.isActive !== undefined) coupon.isActive = data.isActive;

        // Update restrictions
        if (data.minOrderValue !== undefined) coupon.restrictions.minOrderValue = data.minOrderValue;
        if (data.maxDiscount !== undefined) coupon.restrictions.maxDiscount = data.maxDiscount;
        if (data.usageLimit !== undefined) coupon.restrictions.usageLimit = data.usageLimit;
        if (data.carriers) coupon.restrictions.carriers = data.carriers;
        if (data.serviceTypes) coupon.restrictions.serviceTypes = data.serviceTypes;

        await coupon.save();
        logger.info(`Promo code updated: ${coupon.code}`);
        return coupon;
    }

    /**
     * Soft delete a promo code
     */
    async deletePromo(id: string, companyId: string): Promise<void> {
        const coupon = await Coupon.findOne({
            _id: id,
            companyId: new mongoose.Types.ObjectId(companyId),
            isDeleted: false
        });

        if (!coupon) {
            throw new NotFoundError('Promo code not found');
        }

        coupon.isDeleted = true;
        await coupon.save();
        logger.info(`Promo code deleted: ${coupon.code}`);
    }
}

export default new PromoCodeService();
