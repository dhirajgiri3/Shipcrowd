/**
 * RTO Customer Portal Controller
 *
 * Unauthenticated endpoints for customers to track RTO (reverse shipment) status.
 */

import { Request, Response, NextFunction } from 'express';
import { RTOEvent } from '../../../../infrastructure/database/mongoose/models';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import RTOService from '../../../../core/application/services/rto/rto.service';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

const RTO_STATUS_LABELS_MAP: Record<string, string> = {
    initiated: 'Return initiated',
    in_transit: 'In transit to warehouse',
    delivered_to_warehouse: 'Received at warehouse',
    qc_pending: 'Under quality check',
    qc_completed: 'Quality check done',
    restocked: 'Item restocked',
    disposed: 'Closed',
};

export class RTOCustomerPortalController {
    /**
     * GET /public/rto/track?awb=XXX
     * GET /public/rto/track?orderNumber=XXX&phone=XXX
     * Returns sanitized RTO status and reverse tracking for customer view.
     */
    static async trackRTO(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { awb, orderNumber, phone } = req.query as { awb?: string; orderNumber?: string; phone?: string };

            let rtoEvent: any = null;

            if (awb && awb.trim()) {
                const awbTrimmed = awb.trim();
                rtoEvent = await RTOEvent.findOne({ reverseAwb: awbTrimmed })
                    .populate('shipment', 'trackingNumber deliveryDetails')
                    .populate('order', 'orderNumber')
                    .lean();

                if (!rtoEvent) {
                    const shipment = await Shipment.findOne({ trackingNumber: awbTrimmed }).select('_id').lean();
                    if (shipment) {
                        rtoEvent = await RTOEvent.findOne({ shipment: shipment._id })
                            .populate('shipment', 'trackingNumber deliveryDetails')
                            .populate('order', 'orderNumber')
                            .lean();
                    }
                }
            } else if (orderNumber && phone && orderNumber.trim() && phone.trim()) {
                const phoneDigits = phone.trim().replace(/\D/g, '').slice(-10);
                if (phoneDigits.length < 10) {
                    res.status(400).json({
                        success: false,
                        error: 'Please enter a valid 10-digit phone number.',
                        code: 'INVALID_PHONE',
                    });
                    return;
                }
                const order = await Order.findOne({
                    orderNumber: orderNumber.trim(),
                    $or: [
                        { 'customerInfo.phone': { $regex: phoneDigits } },
                        { 'customerInfo.phone': { $regex: `.*${phoneDigits}$` } },
                    ],
                }).select('_id').lean();
                if (order) {
                    rtoEvent = await RTOEvent.findOne({ order: order._id })
                        .populate('shipment', 'trackingNumber deliveryDetails')
                        .populate('order', 'orderNumber')
                        .lean();
                }
            }

            if (!rtoEvent) {
                res.status(404).json({
                    success: false,
                    error: 'No RTO found for the given AWB or order details.',
                    code: 'RTO_NOT_FOUND',
                });
                return;
            }

            const shipment = rtoEvent.shipment as any;
            const order = rtoEvent.order as any;
            const reverseAwb = rtoEvent.reverseAwb;

            let reverseTracking: any = null;
            if (reverseAwb) {
                try {
                    reverseTracking = await RTOService.trackReverseShipment(reverseAwb);
                } catch {
                    reverseTracking = {
                        reverseAwb,
                        status: rtoEvent.returnStatus,
                        message: 'Tracking details will be updated soon.',
                    };
                }
            }

            const customerPayload = {
                orderNumber: order?.orderNumber ?? null,
                forwardAwb: shipment?.trackingNumber ?? null,
                reverseAwb: rtoEvent.reverseAwb ?? null,
                status: rtoEvent.returnStatus,
                statusLabel: RTO_STATUS_LABELS_MAP[rtoEvent.returnStatus] ?? rtoEvent.returnStatus,
                initiatedAt: rtoEvent.triggeredAt,
                expectedReturnDate: rtoEvent.expectedReturnDate ?? null,
                reverseTracking,
                refundStatus: rtoEvent.returnStatus === 'restocked' || rtoEvent.returnStatus === 'disposed'
                    ? 'Refund will be processed as per policy'
                    : 'Pending',
            };

            sendSuccess(res, customerPayload);
        } catch (error) {
            next(error);
        }
    }
}
