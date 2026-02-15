/**
 * RTO Notification Service
 *
 * Sends customer and/or warehouse notifications for RTO lifecycle events:
 * - RTO initiated
 * - Delivered to warehouse
 * - QC completed
 * - Refund processed (when applicable)
 */

import { RTOEvent } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { sendNotification } from '../communication/notification.service';

function getCustomerContact(rto: any): { email?: string; phone?: string } {
    const order = rto.order;
    const shipment = rto.shipment;
    const email = order?.customerInfo?.email ?? order?.customerEmail;
    const phone =
        order?.customerInfo?.phone ??
        order?.customerPhone ??
        shipment?.deliveryDetails?.recipientPhone ??
        shipment?.recipientPhone;
    return { email: email || undefined, phone: phone || undefined };
}

export class RTONotificationService {
    /**
     * Notify customer (and optionally warehouse) when RTO is initiated
     */
    static async notifyRTOInitiated(rtoEventId: string, options: { awb: string; reverseAwb?: string }): Promise<void> {
        try {
            const rto = await RTOEvent.findById(rtoEventId).populate('order shipment').lean();
            if (!rto) return;
            const to = getCustomerContact(rto);
            if (!to.phone && !to.email) {
                logger.debug('[RTO Notification] No customer contact for RTO initiated', { rtoEventId });
                return;
            }
            const text = `Your order return (RTO) has been initiated. AWB: ${options.awb}.${options.reverseAwb ? ` Track return: ${options.reverseAwb}` : ''} You can track status at our track page.`;
            await sendNotification(to, 'Order return initiated', { text }, { email: !!to.email, sms: false, whatsapp: !!to.phone });
        } catch (err: any) {
            logger.warn('[RTO Notification] notifyRTOInitiated failed', { rtoEventId, error: err?.message });
        }
    }

    /**
     * Notify when return is delivered to warehouse
     */
    static async notifyRTODeliveredToWarehouse(rtoEventId: string): Promise<void> {
        try {
            const rto = await RTOEvent.findById(rtoEventId).populate('order shipment').lean();
            if (!rto) return;
            const to = getCustomerContact(rto);
            if (!to.phone && !to.email) return;
            const awb = (rto.shipment as any)?.awb ?? (rto.shipment as any)?.trackingNumber ?? 'your order';
            const text = `Your returned order (AWB: ${awb}) has been received at our warehouse. Quality check will be done shortly.`;
            await sendNotification(to, 'Return received at warehouse', { text }, { email: !!to.email, sms: false, whatsapp: !!to.phone });
        } catch (err: any) {
            logger.warn('[RTO Notification] notifyRTODeliveredToWarehouse failed', { rtoEventId, error: err?.message });
        }
    }

    /**
     * Notify when QC is completed
     */
    static async notifyRTOQCCompleted(rtoEventId: string, options: { passed: boolean }): Promise<void> {
        try {
            const rto = await RTOEvent.findById(rtoEventId).populate('order shipment').lean();
            if (!rto) return;
            const to = getCustomerContact(rto);
            if (!to.phone && !to.email) return;
            const awb = (rto.shipment as any)?.awb ?? (rto.shipment as any)?.trackingNumber;
            const outcome = options.passed ? 'passed quality check and will be restocked.' : 'did not pass quality check.';
            const text = `Your returned order${awb ? ` (AWB: ${awb})` : ''} ${outcome} Refund will be processed as per policy.`;
            await sendNotification(to, 'Return quality check completed', { text }, { email: !!to.email, sms: false, whatsapp: !!to.phone });
        } catch (err: any) {
            logger.warn('[RTO Notification] notifyRTOQCCompleted failed', { rtoEventId, error: err?.message });
        }
    }

    /**
     * Notify when refund for RTO has been processed
     */
    static async notifyRTORefundProcessed(rtoEventId: string, options: { amount: number; awb?: string }): Promise<void> {
        try {
            const rto = await RTOEvent.findById(rtoEventId).populate('order shipment').lean();
            if (!rto) return;
            const to = getCustomerContact(rto);
            if (!to.phone && !to.email) return;
            const text = `Refund of ₹${options.amount} for your returned order${options.awb ? ` (AWB: ${options.awb})` : ''} has been processed. It will reflect in your account as per bank timelines.`;
            await sendNotification(to, 'Refund processed for return', { text }, { email: !!to.email, sms: false, whatsapp: !!to.phone });
        } catch (err: any) {
            logger.warn('[RTO Notification] notifyRTORefundProcessed failed', { rtoEventId, error: err?.message });
        }
    }
}
