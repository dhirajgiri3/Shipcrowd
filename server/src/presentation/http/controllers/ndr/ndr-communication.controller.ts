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
            const { id } = req.params;
            const { channel = 'whatsapp', templateType = 'ndr_alert', customMessage } = req.body;

            if (!['whatsapp', 'sms', 'email', 'all'].includes(channel)) {
                throw new ValidationError('Invalid channel. Must be: whatsapp, sms, email, or all');
            }

            if (!['ndr_alert', 'action_required', 'reattempt', 'rto'].includes(templateType)) {
                throw new ValidationError('Invalid template type');
            }

            const result = await NDRCommunicationService.sendNDRNotification({
                shipmentId: id,
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

            const results = await NDRCommunicationService.sendBulkNotifications(shipmentIds, channel);

            const successCount = results.filter((r) => r.success).length;

            sendSuccess(res, {
                total: results.length,
                successful: successCount,
                failed: results.length - successCount,
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

            const result = await NDRCommunicationService.sendNDRNotification({
                shipmentId: id,
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
