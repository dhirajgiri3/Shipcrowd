import { Request, Response, NextFunction } from 'express';
import NDRCommunicationService from '../../../../core/application/services/communication/ndr-communication.service';
import { ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

/**
 * NDR Communication Controller
 * Handles buyer communication for NDR scenarios
 * 
 * Endpoints:
 * 1. POST /ndr/:id/notify - Send NDR notification
 * 2. POST /ndr/bulk-notify - Bulk NDR notifications
 * 3. POST /shipments/:id/status-update - Send status update (shipped, out-for-delivery)
 * 4. GET /ndr/templates - Get available templates
 */

class NDRCommunicationController {
    /**
     * Send NDR notification to buyer
     * POST /ndr/:id/notify
     */
    async sendNDRNotification(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params; // shipmentId
            const { channel = 'whatsapp', templateType = 'ndr_alert', customMessage, ndrEventId } = req.body;

            if (!['whatsapp', 'sms', 'email', 'all'].includes(channel)) {
                throw new ValidationError('Invalid channel. Must be: whatsapp, sms, email, or all');
            }

            if (!['ndr_alert', 'action_required', 'reattempt', 'rto'].includes(templateType)) {
                throw new ValidationError('Invalid template type');
            }

            // Resolve ndrEventId if not provided
            let resolvedNdrEventId = ndrEventId;
            if (!resolvedNdrEventId) {
                // Dynamically import to avoid circular dependency issues if any (Controller -> Model)
                const { NDREvent } = await import('../../../../infrastructure/database/mongoose/models');
                const activeNdr = await NDREvent.findOne({
                    shipment: id,
                    status: { $in: ['detected', 'in_resolution'] }
                }).sort({ createdAt: -1 });

                if (!activeNdr) {
                    throw new ValidationError('No active NDR event found for this shipment. Cannot send notification.');
                }
                resolvedNdrEventId = (activeNdr as any)._id.toString();
            }

            const result = await NDRCommunicationService.sendNDRNotification({
                shipmentId: id,
                ndrEventId: resolvedNdrEventId,
                channel,
                templateType,
                customMessage,
            });

            sendSuccess(res, result, 'NDR notification sent');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Send bulk NDR notifications
     * POST /ndr/bulk-notify
     */
    async sendBulkNotifications(req: Request, res: Response, next: NextFunction) {
        try {
            const { shipmentIds, channel = 'whatsapp' } = req.body;

            if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
                throw new ValidationError('shipmentIds must be a non-empty array');
            }

            if (shipmentIds.length > 50) {
                throw new ValidationError('Maximum 50 shipments allowed per bulk request');
            }

            // Resolve NDR Events for bulk
            const { NDREvent } = await import('../../../../infrastructure/database/mongoose/models');
            const activeNdrs = await NDREvent.find({
                shipment: { $in: shipmentIds },
                status: { $in: ['detected', 'in_resolution'] }
            }).select('_id shipment');

            // Map shipmentId to ndrEventId
            const ndrMap = new Map(activeNdrs.map(n => [n.shipment.toString(), (n as any)._id.toString()]));

            const eventsToSend: Array<{ ndrEventId: string; shipmentId: string }> = [];

            // Only send for shipments that have active NDRs
            for (const shipId of shipmentIds) {
                const ndrId = ndrMap.get(shipId);
                if (ndrId) {
                    eventsToSend.push({ ndrEventId: ndrId, shipmentId: shipId });
                }
            }

            const results = await NDRCommunicationService.sendBulkNotifications(eventsToSend, channel);

            const successCount = results.filter((r) => r.success).length;

            sendSuccess(res, {
                total: results.length,
                successful: successCount,
                failed: results.length - successCount,
                skipped: shipmentIds.length - eventsToSend.length, // Shipments without active NDR
                results,
            }, `Sent ${successCount}/${results.length} notifications`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Send shipment status update
     * POST /shipments/:id/status-update
     */
    async sendStatusUpdate(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status, channel = 'whatsapp' } = req.body;

            if (!status) {
                throw new ValidationError('Status is required');
            }

            // Map status to template type
            let templateType: any = 'ndr_alert';
            if (status === 'shipped' || status === 'in_transit') {
                templateType = 'ndr_alert'; // Can use generic template
            } else if (status === 'out_for_delivery') {
                templateType = 'action_required';
            } else if (status === 'rto') {
                templateType = 'rto';
            }

            // Resolve ndrEventId if needed (only for NDR/RTO types really)
            // For general status updates, we might not have an NDR event. 
            // However, sendNDRNotification REQUIREs ndrEventId for Magic Link generation.
            // If this is just a general status update ("Out for Delivery"), we might NOT want to generate a magic link?
            // But sendNDRNotification is specifically for NDR. 
            // If we are using this for general status updates, we might be misusing the service.
            // But the controller method existed before. 
            // Let's assume for RTO it needs NDR. For others... 

            // Hack: If status is NOT NDR-related, we shouldn't use NDRService?
            // But verify: The method calls NDRCommunicationService.sendNDRNotification.
            // That method generates a magic link.
            // If we don't have an NDR event, we can't generate a magic link.
            // If the status is 'out_for_delivery', maybe we don't need magic link?

            // Let's enforce NDR existence for now, as this is the "NDR Communication Controller".

            const { NDREvent } = await import('../../../../infrastructure/database/mongoose/models');
            const activeNdr = await NDREvent.findOne({
                shipment: id,
                status: { $in: ['detected', 'in_resolution', 'rto_triggered'] }
            }).sort({ createdAt: -1 });

            if (!activeNdr) {
                // For general status updates without NDR, we might need a different service method
                // or just skip.
                throw new ValidationError('No active NDR event found. Status update requires active NDR context currently.');
            }

            const result = await NDRCommunicationService.sendNDRNotification({
                shipmentId: id,
                ndrEventId: (activeNdr as any)._id.toString(),
                channel,
                templateType,
            });

            sendSuccess(res, result, 'Status update sent');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get available communication templates
     * GET /ndr/templates
     */
    async getTemplates(req: Request, res: Response, next: NextFunction) {
        try {
            const templates = {
                whatsapp: [
                    {
                        name: 'ndr_alert',
                        description: 'NDR - Delivery failed',
                        parameters: ['customerName', 'awb', 'reason'],
                    },
                    {
                        name: 'action_required',
                        description: 'NDR - Action required',
                        parameters: ['customerName', 'awb', 'actionLink'],
                    },
                    {
                        name: 'rto',
                        description: 'RTO initiated',
                        parameters: ['customerName', 'awb', 'reason'],
                    },
                    {
                        name: 'order_shipped',
                        description: 'Order shipped notification',
                        parameters: ['customerName', 'awb', 'estimatedDelivery'],
                    },
                    {
                        name: 'out_for_delivery',
                        description: 'Out for delivery',
                        parameters: ['customerName', 'awb'],
                    },
                ],
                email: [
                    {
                        name: 'ndr_alert',
                        description: 'NDR email with delivery failure details',
                    },
                    {
                        name: 'action_required',
                        description: 'NDR email with action link',
                    },
                    {
                        name: 'rto',
                        description: 'RTO notification email',
                    },
                ],
                sms: [
                    {
                        name: 'ndr_alert',
                        description: 'SMS notification for NDR',
                    },
                ],
            };

            sendSuccess(res, templates);
        } catch (error) {
            next(error);
        }
    }
}

export default new NDRCommunicationController();
