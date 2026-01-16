/**
 * Return Webhook Controller
 * 
 * Handles incoming webhook calls from courier partners for return pickup status updates.
 * Implements signature verification for security and processes status changes.
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import ReturnService from '@/core/application/services/logistics/return.service';
import logger from '@/shared/logger/winston.logger';
import { AppError } from '@/shared/errors/app.error';

/**
 * Webhook payload interface
 */
interface CourierWebhookPayload {
    awb: string;
    status: string;
    timestamp: string;
    location?: string;
    remarks?: string;
}

export default class ReturnWebhookController {
    /**
     * Handle courier pickup status update webhook
     * 
     * @route POST /webhooks/returns/courier/:courierId
     */
    static async handleCourierUpdate(req: Request, res: Response): Promise<void> {
        try {
            const { courierId } = req.params;
            const payload: CourierWebhookPayload = req.body;
            const signature = req.headers['x-webhook-signature'] as string;

            logger.info('Received courier webhook', {
                courierId,
                awb: payload.awb,
                status: payload.status,
            });

            // 1. Validate payload
            if (!payload.awb || !payload.status) {
                throw new AppError(
                    'Missing required fields: awb, status',
                    'INVALID_PAYLOAD',
                    400
                );
            }

            // 2. Verify webhook signature
            const isValid = ReturnWebhookController.verifySignature(
                courierId,
                payload,
                signature
            );

            if (!isValid) {
                logger.error('Invalid webhook signature', {
                    courierId,
                    awb: payload.awb,
                });
                throw new AppError(
                    'Invalid webhook signature',
                    'INVALID_SIGNATURE',
                    401
                );
            }

            // 3. Update pickup status
            const returnOrder = await ReturnService.updatePickupStatus(
                payload.awb,
                payload.status,
                payload.location,
                payload.remarks
            );

            logger.info('Webhook processed successfully', {
                returnId: returnOrder.returnId,
                awb: payload.awb,
                newStatus: returnOrder.status,
            });

            // 4. Return success response
            res.status(200).json({
                success: true,
                message: 'Webhook processed successfully',
                data: {
                    returnId: returnOrder.returnId,
                    status: returnOrder.status,
                },
            });
        } catch (error) {
            logger.error('Webhook processing failed', {
                error: error instanceof Error ? error.message : String(error),
                courierId: req.params.courierId,
                payload: req.body,
            });

            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                    code: error.code,
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    code: 'WEBHOOK_PROCESSING_FAILED',
                });
            }
        }
    }

    /**
     * Verify webhook signature using HMAC-SHA256
     * 
     * @param courierId Courier identifier
     * @param payload Webhook payload
     * @param signature Signature from webhook header
     * @returns True if signature is valid
     */
    private static verifySignature(
        courierId: string,
        payload: CourierWebhookPayload,
        signature?: string
    ): boolean {
        if (!signature) {
            logger.warn('No signature provided in webhook');
            return false;
        }

        // Get courier-specific webhook secret from environment
        const secretKey = ReturnWebhookController.getWebhookSecret(courierId);

        if (!secretKey) {
            logger.error('No webhook secret configured for courier', { courierId });
            // In development, allow webhooks without signature
            if (process.env.NODE_ENV === 'development') {
                logger.warn('Allowing webhook without signature in development mode');
                return true;
            }
            return false;
        }

        // Calculate expected signature
        const payloadString = JSON.stringify(payload);
        const expectedSignature = crypto
            .createHmac('sha256', secretKey)
            .update(payloadString)
            .digest('hex');

        // Compare signatures (constant-time comparison)
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Get webhook secret for courier
     * 
     * @param courierId Courier identifier
     * @returns Webhook secret or undefined
     */
    private static getWebhookSecret(courierId: string): string | undefined {
        const secretMap: Record<string, string | undefined> = {
            'delhivery': process.env.DELHIVERY_WEBHOOK_SECRET,
            'bluedart': process.env.BLUEDART_WEBHOOK_SECRET,
            'dtdc': process.env.DTDC_WEBHOOK_SECRET,
            'ecom': process.env.ECOM_WEBHOOK_SECRET,
            'xpressbees': process.env.XPRESSBEES_WEBHOOK_SECRET,
        };

        return secretMap[courierId.toLowerCase()];
    }

    /**
     * Test webhook endpoint (development only)
     * Allows testing webhook flow without signature verification
     * 
     * @route POST /webhooks/returns/test
     */
    static async testWebhook(req: Request, res: Response): Promise<void> {
        if (process.env.NODE_ENV !== 'development') {
            res.status(403).json({
                success: false,
                error: 'Test endpoint only available in development',
            });
            return;
        }

        try {
            const payload: CourierWebhookPayload = req.body;

            const returnOrder = await ReturnService.updatePickupStatus(
                payload.awb,
                payload.status,
                payload.location,
                payload.remarks
            );

            res.status(200).json({
                success: true,
                message: 'Test webhook processed successfully',
                data: {
                    returnId: returnOrder.returnId,
                    status: returnOrder.status,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
