/**
 * Consent Controller
 * 
 * Purpose: Handle GDPR consent management
 * 
 * Endpoints:
 * - GET /consent - Get user's current consents
 * - POST /consent - Accept a consent
 * - DELETE /consent/:type - Withdraw consent
 * - GET /consent/export - Export user data (GDPR right)
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Consent, ConsentHistory, ConsentType } from '../../../../infrastructure/database/mongoose/models/iam/consent.model';
import { User } from '../../../../infrastructure/database/mongoose/models';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';
import { AuthenticationError, ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

// Validation schemas
const acceptConsentSchema = z.object({
    type: z.enum(['terms', 'privacy', 'marketing', 'cookies', 'data_processing']),
    version: z.string().default('1.0'),
    source: z.enum(['registration', 'settings', 'banner', 'api']).optional().default('api'),
});

const withdrawConsentSchema = z.object({
    type: z.enum(['terms', 'privacy', 'marketing', 'cookies', 'data_processing']),
});

/**
 * Get user's current consents
 * @route GET /consent
 */
export const getConsents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const consents = await Consent.find({ userId: req.user._id });

        // Transform to a more usable format
        const consentMap: Record<string, { accepted: boolean; version: string; acceptedAt?: Date; withdrawnAt?: Date }> = {};
        for (const consent of consents) {
            consentMap[consent.type] = {
                accepted: consent.accepted && !consent.withdrawnAt,
                version: consent.version,
                acceptedAt: consent.acceptedAt,
                withdrawnAt: consent.withdrawnAt,
            };
        }

        sendSuccess(res, { consents: consentMap }, 'Consents retrieved successfully');
    } catch (error) {
        logger.error('Error fetching consents:', error);
        next(error);
    }
};

/**
 * Accept a consent
 * @route POST /consent
 */
export const acceptConsent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const validatedData = acceptConsentSchema.parse(req.body);
        const ip = req.ip || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        // Find or create consent
        let consent = await Consent.findOne({ userId: req.user._id, type: validatedData.type });
        const previousVersion = consent?.version;

        if (consent) {
            // Update existing consent
            consent.accepted = true;
            consent.version = validatedData.version;
            consent.acceptedAt = new Date();
            consent.withdrawnAt = undefined;
            consent.ip = ip;
            consent.userAgent = userAgent;
            consent.source = validatedData.source;
            await consent.save();
        } else {
            // Create new consent
            consent = await Consent.create({
                userId: req.user._id,
                type: validatedData.type,
                version: validatedData.version,
                accepted: true,
                acceptedAt: new Date(),
                ip,
                userAgent,
                source: validatedData.source,
            });
        }

        // Record in history
        await ConsentHistory.create({
            userId: req.user._id,
            consentId: consent._id,
            action: previousVersion && previousVersion !== validatedData.version ? 'updated' : 'accepted',
            type: validatedData.type,
            version: validatedData.version,
            previousVersion,
            ip,
            userAgent,
        });

        await createAuditLog(
            req.user._id,
            req.user.companyId,
            'update',
            'consent',
            consent._id?.toString(),
            { message: `Consent accepted: ${validatedData.type}`, version: validatedData.version },
            req
        );

        logger.info('Consent accepted', {
            userId: req.user._id,
            type: validatedData.type,
            version: validatedData.version,
        });

        sendCreated(res, {
            consent: {
                type: consent.type,
                accepted: true,
                version: consent.version,
                acceptedAt: consent.acceptedAt,
            }
        }, 'Consent accepted successfully');
    } catch (error) {
        logger.error('Error accepting consent:', error);
        if (error instanceof z.ZodError) {
            throw new ValidationError(error.errors[0].message);
        }
        next(error);
    }
};

/**
 * Withdraw consent (required for GDPR)
 * @route DELETE /consent/:type
 */
export const withdrawConsent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const type = req.params.type as ConsentType;

        // Validate type
        if (!['terms', 'privacy', 'marketing', 'cookies', 'data_processing'].includes(type)) {
            throw new ValidationError('Invalid consent type', ErrorCode.VAL_INVALID_INPUT);
        }

        // Cannot withdraw core consents (terms and privacy) - must delete account instead
        if (type === 'terms' || type === 'privacy') {
            throw new ValidationError('Cannot withdraw terms or privacy consent. Please delete your account instead.', ErrorCode.VAL_INVALID_INPUT);
        }

        const consent = await Consent.findOne({ userId: req.user._id, type });

        if (!consent) {
            throw new NotFoundError('Consent not found', ErrorCode.RES_NOT_FOUND);
        }

        const ip = req.ip || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        // Withdraw consent
        consent.accepted = false;
        consent.withdrawnAt = new Date();
        consent.ip = ip;
        consent.userAgent = userAgent;
        await consent.save();

        // Record in history
        await ConsentHistory.create({
            userId: req.user._id,
            consentId: consent._id,
            action: 'withdrawn',
            type,
            version: consent.version,
            ip,
            userAgent,
        });

        await createAuditLog(
            req.user._id,
            req.user.companyId,
            'update',
            'consent',
            consent._id?.toString(),
            { message: `Consent withdrawn: ${type}` },
            req
        );

        logger.info('Consent withdrawn', {
            userId: req.user._id,
            type,
        });

        sendSuccess(res, null, 'Consent withdrawn successfully');
    } catch (error) {
        logger.error('Error withdrawing consent:', error);
        next(error);
    }
};

/**
 * Export user data (GDPR right to data portability)
 * @route GET /consent/export
 */
export const exportUserData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        // Collect all user data
        const [user, consents, consentHistory] = await Promise.all([
            User.findById(req.user._id).select('-password -security.verificationToken -security.resetToken'),
            Consent.find({ userId: req.user._id }),
            ConsentHistory.find({ userId: req.user._id }),
        ]);

        if (!user) {
            throw new NotFoundError('User not found', ErrorCode.RES_USER_NOT_FOUND);
        }

        // Build export data
        const exportData = {
            exportDate: new Date().toISOString(),
            exportVersion: '1.0',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                teamRole: user.teamRole,
                createdAt: user.createdAt,
                isActive: user.isActive,
                isEmailVerified: user.isEmailVerified,
                oauthProvider: user.oauthProvider,
            },
            consents: consents.map(c => ({
                type: c.type,
                version: c.version,
                accepted: c.accepted,
                acceptedAt: c.acceptedAt,
                withdrawnAt: c.withdrawnAt,
            })),
            consentHistory: consentHistory.map(h => ({
                action: h.action,
                type: h.type,
                version: h.version,
                createdAt: h.createdAt,
            })),
        };

        await createAuditLog(
            req.user._id,
            req.user.companyId,
            'read',
            'user',
            req.user._id.toString(),
            { message: 'User data exported (GDPR)' },
            req
        );

        logger.info('User data exported', { userId: req.user._id });

        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="user-data-export-${user._id}.json"`);

        res.json(exportData);
    } catch (error) {
        logger.error('Error exporting user data:', error);
        next(error);
    }
};

/**
 * Get consent history
 * @route GET /consent/history
 */
export const getConsentHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            throw new AuthenticationError('Authentication required', ErrorCode.AUTH_REQUIRED);
        }

        const history = await ConsentHistory.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);

        sendSuccess(res, { history }, 'Consent history retrieved successfully');
    } catch (error) {
        logger.error('Error fetching consent history:', error);
        next(error);
    }
};

export default {
    getConsents,
    acceptConsent,
    withdrawConsent,
    exportUserData,
    getConsentHistory,
};
