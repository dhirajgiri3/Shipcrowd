import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Shipment } from '../../../../../infrastructure/database/mongoose/models';
import { ShipmentService } from '../../../../../core/application/services/shipping/shipment.service';
import logger from '../../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';
import { ErrorCode } from '../../../../../shared/errors/errorCodes';
import { AppError, ValidationError } from '../../../../../shared/errors/app.error';

/**
 * VelocityWebhookController
 *
 * Handles incoming webhooks from Velocity Courier.
 * Endpoint: POST /webhooks/couriers/velocity
 */
export class VelocityWebhookController {

    /**
     * Handle incoming webhook event
     */
    static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const payload = req.body;

            logger.info('Velocity Webhook Received', {
                payload: JSON.stringify(payload)
            });

            // Velocity Webhook Payload Structure (Inferred)
            // {
            //   "awb": "12345",
            //   "status": "DELIVERED",
            //   "remark": "Delivered to neighbor",
            //   "location": "Bangalore"
            // }

            if (!payload || !payload.awb) {
                logger.warn('Invalid Velocity webhook payload', { payload });
                // Return 400 Bad Request
                throw new ValidationError('Invalid payload: Missing AWB');
            }

            const awb = payload.awb;
            const velocityStatus = payload.status?.toUpperCase();
            const description = payload.remark || payload.description || '';
            const location = payload.location || '';

            // Find shipment by AWB
            const shipment = await Shipment.findOne({
                $or: [
                    { trackingNumber: awb },
                    { 'carrierDetails.carrierTrackingNumber': awb }
                ]
            });

            if (!shipment) {
                logger.warn(`Shipment not found for Velocity webhook AWB: ${awb}`);
                // Return 200 to acknowledge receipt and stop retries (standard webhook practice when resource not found)
                sendSuccess(res, { status: 'ignored', message: 'Shipment not found' });
                return;
            }

            // Map Velocity status to Shipcrowd status
            let newStatus = '';

            if (['DELIVERED', 'DL'].includes(velocityStatus)) {
                newStatus = 'delivered';
            } else if (['RTO', 'RTO INITIATED', 'RETURNED'].some(s => velocityStatus?.includes(s))) {
                newStatus = 'rto';
            } else if (['CANCELLED', 'CN'].includes(velocityStatus)) {
                newStatus = 'cancelled';
            } else if (['PICKED UP', 'PU', 'IN TRANSIT', 'IT', 'OUT FOR DELIVERY', 'OFD'].some(s => velocityStatus?.includes(s))) {
                newStatus = 'in_transit';
            } else if (['NDR', 'UNDELIVERED', 'UD'].some(s => velocityStatus?.includes(s))) {
                newStatus = 'ndr';
            }

            if (!newStatus) {
                logger.info(`Velocity status '${velocityStatus}' ignored/unmapped`, { awb });
                sendSuccess(res, { status: 'ignored', message: 'Status not mapped' });
                return;
            }

            // Avoid redundant updates
            if (shipment.currentStatus === newStatus) {
                sendSuccess(res, { status: 'skipped', message: 'Status already up to date' });
                return;
            }

            // Update Shipment Status via Service
            const updateResult = await ShipmentService.updateShipmentStatus({
                shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                currentStatus: shipment.currentStatus,
                newStatus: newStatus,
                currentVersion: (shipment as any).__v || 0,
                userId: 'SYSTEM_WEBHOOK',
                location: location,
                description: `Velocity Update: ${velocityStatus} - ${description}`.trim()
            });

            if (!updateResult.success) {
                logger.error('Failed to update shipment status via webhook', {
                    awb,
                    error: updateResult.error
                });
                // Throwing error will be caught by catch block and sent to next(error)
                throw new AppError(updateResult.error || 'Update failed', ErrorCode.SYS_INTERNAL_ERROR, 500);
            }

            logger.info('Shipment status updated via Velocity webhook', {
                awb,
                oldStatus: shipment.currentStatus,
                newStatus: newStatus
            });

            sendSuccess(res, { status: 'success', message: 'Status updated' });

        } catch (error) {
            next(error);
        }
    }
}

export default VelocityWebhookController;
