import { Request, Response, NextFunction } from 'express';
import { Company, User } from '../../../../infrastructure/database/mongoose/models';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import { ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * KYC Webhook Controller
 * Handles webhooks from KYC verification providers (e.g., IDfy, DigiLocker)
 * 
 * Endpoints:
 * 1. POST /kyc/webhooks/idfy - IDfy webhook
 * 2. POST /kyc/webhooks/digilocker - DigiLocker webhook
 * 3. POST /kyc/manual-approval/:companyId - Manual KYC approval by admin
 */

class KYCWebhookController {
    /**
     * Handle IDfy KYC verification webhook
     * POST /kyc/webhooks/idfy
     */
    async handleIDfyWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const { request_id, status, result_data } = req.body;

            if (!request_id || !status) {
                throw new ValidationError('Invalid webhook payload');
            }

            // Find company by KYC request ID
            const company = await Company.findOne({ 'kyc.requestId': request_id });

            if (!company) {
                logger.warn(`Company not found for KYC request: ${request_id}`);
                // Still return 200 to acknowledge webhook
                return res.status(200).json({ received: true });
            }

            // Update KYC status based on webhook
            if (status === 'completed') {
                company.kyc.status = 'verified';
                company.kyc.verifiedAt = new Date();
                company.kyc.verificationData = result_data;
            } else if (status === 'failed') {
                company.kyc.status = 'rejected';
                company.kyc.rejectionReason = result_data?.reason || 'Verification failed';
            }

            await company.save();

            await createAuditLog(
                company.owner.toString(),
                company._id.toString(),
                'verify',
                'company',
                company._id.toString(),
                {
                    message: `KYC ${status} via IDfy`,
                    status,
                    requestId: request_id,
                }
            );

            logger.info(`KYC status updated for company ${company._id}: ${status}`);

            res.status(200).json({ received: true });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle DigiLocker webhook
     * POST /kyc/webhooks/digilocker
     */
    async handleDigiLockerWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const { transaction_id, status, documents } = req.body;

            if (!transaction_id || !status) {
                throw new ValidationError('Invalid webhook payload');
            }

            const company = await Company.findOne({ 'kyc.transactionId': transaction_id });

            if (!company) {
                logger.warn(`Company not found for DigiLocker transaction: ${transaction_id}`);
                return res.status(200).json({ received: true });
            }

            if (status === 'success' && documents) {
                company.kyc.status = 'verified';
                company.kyc.verifiedAt = new Date();
                company.kyc.documents = documents;
            } else {
                company.kyc.status = 'rejected';
                company.kyc.rejectionReason = 'DigiLocker verification failed';
            }

            await company.save();

            await createAuditLog(
                company.owner.toString(),
                company._id.toString(),
                'verify',
                'company',
                company._id.toString(),
                {
                    message: `KYC ${status} via DigiLocker`,
                    status,
                    transactionId: transaction_id,
                }
            );

            logger.info(`DigiLocker KYC updated for company ${company._id}: ${status}`);

            res.status(200).json({ received: true });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Manual KYC approval by admin
     * POST /kyc/manual-approval/:companyId
     */
    async manualApproval(req: Request, res: Response, next: NextFunction) {
        try {
            const { companyId } = req.params;
            const { status, reason } = req.body;
            const adminId = req.user?._id?.toString();

            if (!['verified', 'rejected'].includes(status)) {
                throw new ValidationError('Status must be "verified" or "rejected"');
            }

            const company = await Company.findById(companyId);
            if (!company) {
                throw new NotFoundError('Company not found');
            }

            company.kyc.status = status as any;

            if (status === 'verified') {
                company.kyc.verifiedAt = new Date();
                company.kyc.verifiedBy = adminId;
            } else {
                company.kyc.rejectionReason = reason || 'Manual rejection';
            }

            await company.save();

            await createAuditLog(
                adminId || 'system',
                companyId,
                'verify',
                'company',
                companyId,
                {
                    message: `Manual KYC ${status}`,
                    status,
                    reason,
                    approvedBy: adminId,
                }
            );

            logger.info(`Manual KYC ${status} for company ${companyId} by admin ${adminId}`);

            res.status(200).json({
                success: true,
                message: `KYC ${status} successfully`,
                data: {
                    companyId,
                    kycStatus: company.kyc.status,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new KYCWebhookController();
