import { NextFunction, Request, Response } from 'express';
import CODRemittanceService from '../../../../../core/application/services/finance/cod-remittance.service';
import logger from '../../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';

/**
 * Handle Razorpay Payout Webhooks
 * POST /api/v1/webhooks/razorpay/payout
 */
export const handlePayoutWebhook = async (
    req: Request,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        // Signature is already verified by verifyRazorpayWebhook middleware.

        const event = req.body;
        const eventType = event.event;

        logger.info(`Razorpay webhook received: ${eventType}`);

        // Handle different payout events
        if (eventType === 'payout.processed') {
            const payoutId = event.payload.payout.entity.id;
            await CODRemittanceService.handlePayoutWebhook(payoutId, 'completed');
            logger.info(`Payout processed: ${payoutId}`);
        } else if (eventType === 'payout.failed') {
            const payoutId = event.payload.payout.entity.id;
            const failureReason = event.payload.payout.entity.failure_reason || 'Unknown error';
            await CODRemittanceService.handlePayoutWebhook(payoutId, 'failed', failureReason);
            logger.error(`Payout failed: ${payoutId} - ${failureReason}`);
        } else if (eventType === 'payout.reversed') {
            const payoutId = event.payload.payout.entity.id;
            await CODRemittanceService.handlePayoutWebhook(payoutId, 'reversed', 'Payout reversed by bank');
            logger.warn(`Payout reversed: ${payoutId}`);
        } else {
            logger.info(`Unhandled payout event: ${eventType}`);
        }

        // Always respond with 200 to acknowledge receipt
        sendSuccess(res, { received: true });
    } catch (error) {
        logger.error('Error processing Razorpay payout webhook:', error);
        // SECURITY: Return 500 to trigger webhook retry - don't swallow failures
        res.status(500).json({
            success: false,
            error: 'Processing failed',
            message: 'Please retry'
        });
    }
};

export default {
    handlePayoutWebhook,
};
