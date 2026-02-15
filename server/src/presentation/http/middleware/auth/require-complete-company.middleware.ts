/**
 * requireCompleteCompany Middleware
 * 
 * Blocks access to seller routes if company profile is incomplete.
 * Part of the onboarding state machine security fix.
 */

import { NextFunction, Response } from 'express';
import { Company } from '../../../../infrastructure/database/mongoose/models';
import { AuthorizationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import { AuthRequest } from '../../../../types/express';

export const requireCompleteCompany = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Skip for admin users
        if (req.user?.role === 'admin') {
            next();
            return;
        }

        if (!req.user?.companyId) {
            logger.warn('requireCompleteCompany: User has no company', {
                userId: req.user?._id,
                path: req.path,
            });
            res.status(403).json({
                success: false,
                message: 'Company required. Please complete onboarding.',
                code: 'COMPANY_REQUIRED',
                redirectTo: '/onboarding',
            });
            return;
        }

        const company = await Company.findById(req.user.companyId)
            .select('profileStatus name address')
            .lean();

        if (!company) {
            logger.error('requireCompleteCompany: Company not found', {
                userId: req.user._id,
                companyId: req.user.companyId,
            });
            throw new AuthorizationError(
                'Company not found',
                ErrorCode.AUTHZ_FORBIDDEN
            );
        }

        // Check if profile is complete
        if (company.profileStatus === 'incomplete') {
            logger.info('requireCompleteCompany: Blocking incomplete company', {
                userId: req.user._id,
                companyId: req.user.companyId,
                companyName: company.name,
            });
            res.status(403).json({
                success: false,
                message: 'Please complete your company profile first',
                code: 'COMPANY_INCOMPLETE',
                redirectTo: '/onboarding',
            });
            return;
        }

        next();
    } catch (error) {
        next(error);
    }
};

export default requireCompleteCompany;
