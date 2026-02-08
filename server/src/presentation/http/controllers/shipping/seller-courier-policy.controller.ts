import { NextFunction, Request, Response } from 'express';
import { SellerCourierPolicy } from '../../../../infrastructure/database/mongoose/models';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import logger from '../../../../shared/logger/winston.logger';
import { ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { upsertSellerCourierPolicySchema } from '../../../../shared/validation/schemas';

export const getSellerCourierPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { sellerId } = req.params;
        if (!sellerId) {
            throw new ValidationError('sellerId is required', ErrorCode.VAL_MISSING_FIELD);
        }

        const policy = await SellerCourierPolicy.findOne({
            companyId: auth.companyId,
            sellerId,
            isActive: true,
        }).lean();

        sendSuccess(
            res,
            policy || {
                companyId: auth.companyId,
                sellerId,
                allowedProviders: [],
                allowedServiceIds: [],
                blockedProviders: [],
                blockedServiceIds: [],
                selectionMode: 'manual_with_recommendation',
                autoPriority: 'balanced',
                balancedDeltaPercent: 5,
                isActive: true,
            },
            'Seller courier policy retrieved'
        );
    } catch (error) {
        logger.error('Error getting seller courier policy:', error);
        next(error);
    }
};

export const upsertSellerCourierPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { sellerId } = req.params;
        if (!sellerId) {
            throw new ValidationError('sellerId is required', ErrorCode.VAL_MISSING_FIELD);
        }

        const validation = upsertSellerCourierPolicySchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const allowedProviders = new Set(validation.data.allowedProviders || []);
        const blockedProviders = (validation.data.blockedProviders || [])
            .filter((provider) => !allowedProviders.has(provider));

        const payload = {
            ...validation.data,
            companyId: auth.companyId,
            sellerId,
            isActive: validation.data.isActive !== false,
            blockedProviders,
            metadata: {
                ...(validation.data.metadata || {}),
                updatedBy: auth.userId,
            },
        };

        const policy = await SellerCourierPolicy.findOneAndUpdate(
            {
                companyId: auth.companyId,
                sellerId,
            },
            { $set: payload },
            { new: true, upsert: true }
        ).lean();

        sendSuccess(res, policy, 'Seller courier policy updated');
    } catch (error) {
        logger.error('Error upserting seller courier policy:', error);
        next(error);
    }
};

export default {
    getSellerCourierPolicy,
    upsertSellerCourierPolicy,
};
