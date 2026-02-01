/**
 * Razorpay Payment Webhook Controller
 * 
 * Handles incoming webhooks for payment events:
 * - payment.captured: Credit wallet if not already credited
 * - payment.failed: Log failure
 */

import { Request, Response } from 'express';
import razorpayPaymentService from '../../../../../core/application/services/payment/razorpay-payment.service';
import walletService from '../../../../../core/application/services/wallet/wallet.service';
import { AutoRechargeLog } from '../../../../../infrastructure/database/mongoose/models/finance/auto-recharge-log.model';
import redisLockService from '../../../../../core/application/services/infra/redis-lock.service';
import logger from '../../../../../shared/logger/winston.logger';

export const handlePaymentWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
        const event = req.body;

        // We only care about payment.captured for now
        // order.paid is also useful, but payment.captured confirms funds are secure
        if (event.event !== 'payment.captured') {
            res.status(200).json({ status: 'ignored' });
            return;
        }

        const payment = event.payload.payment.entity;
        const notes = payment.notes || {};
        const { companyId, purpose, idempotencyKey } = notes;

        // 1. Validate if this is an auto-recharge payment
        if (purpose !== 'auto-recharge' || !companyId) {
            logger.info('Razorpay webhook: Ignoring non-auto-recharge payment', { paymentId: payment.id });
            res.status(200).json({ status: 'ignored' });
            return;
        }

        logger.info('Razorpay webhook: Processing auto-recharge payment', {
            paymentId: payment.id,
            companyId,
            amount: payment.amount,
            status: payment.status
        });

        // 2. Acquire Lock to prevent race condition with synchronous response or other webhooks
        const lockKey = `auto-recharge:webhook:${payment.id}`;
        const hasLock = await redisLockService.acquireLock(lockKey, 30000); // 30s lock

        if (!hasLock) {
            logger.warn('Razorpay webhook: Lock contention, skipping', { paymentId: payment.id });
            res.status(200).json({ status: 'locked' });
            return;
        }

        try {
            // 3. Check idempotency / if already processed
            // Check if log exists and is already success
            const existingLog = await AutoRechargeLog.findOne({
                $or: [
                    { idempotencyKey }, // Check by our key
                    { paymentId: payment.id }  // Check by zero-trust payment ID
                ]
            });

            if (existingLog && existingLog.status === 'success') {
                logger.info('Razorpay webhook: Payment already processed', { paymentId: payment.id });
                res.status(200).json({ status: 'processed' });
                return;
            }

            // 4. Verify payment via API (Don't trust webhook payload blindly)
            const verifiedPayment = await razorpayPaymentService.verifyPayment(payment.id);

            if (verifiedPayment.status !== 'captured') {
                logger.warn('Razorpay webhook: Payment not captured despite webhook', {
                    paymentId: payment.id,
                    apiStatus: verifiedPayment.status
                });
                res.status(400).json({ error: 'Payment status mismatch' });
                return;
            }

            // 5. Credit Wallet
            // We use a transaction wrapper similar to processAutoRecharge, but here we just need to credit
            // Since the money is already deducted, we must credit unless logic fails

            const amountInRupees = verifiedPayment.amount; // verifyPayment returns standard unit (based on service)
            // Wait, razorpayPaymentService.verifyPayment returns amount in rupees (line 155 of service)

            const creditResult = await walletService.credit(
                companyId,
                amountInRupees,
                'recharge',
                `Auto-recharge: Payment Verified (Webhook)`,
                {
                    type: 'auto',
                    externalId: payment.id
                },
                'system'
            );

            if (!creditResult.success) {
                logger.error('Razorpay webhook: Wallet credit failed', {
                    paymentId: payment.id,
                    error: creditResult.error
                });
                // This is critical - money taken but not credited. 
                // In production, this should trigger a high-priority alert.
                throw new Error(creditResult.error || 'Wallet credit failed');
            }

            // 6. Update Log
            if (existingLog) {
                existingLog.status = 'success';
                existingLog.completedAt = new Date();
                existingLog.paymentId = payment.id;
                await existingLog.save();
            } else {
                // If log doesn't exist (unlikely for auto-recharge initiated by us, but possible if DB write failed)
                // We create a new success log to ensure audit trail
                await AutoRechargeLog.create({
                    companyId,
                    amount: amountInRupees,
                    status: 'success',
                    idempotencyKey: idempotencyKey || `webhook_${payment.id}`,
                    triggeredAt: new Date(),
                    completedAt: new Date(),
                    paymentId: payment.id,
                    razorpayOrderId: payment.order_id
                });
            }

            logger.info('Razorpay webhook: Wallet credited successfully', { paymentId: payment.id });
            res.status(200).json({ success: true });

        } finally {
            await redisLockService.releaseLock(lockKey);
        }

    } catch (error: any) {
        logger.error('Razorpay webhook error', { error: error.message });
        res.status(500).json({ error: 'Internal processing error' });
    }
};
