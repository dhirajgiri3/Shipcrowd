/**
 * Generic Webhook Processor Service
 * 
 * Processes courier webhooks in a courier-agnostic way using status mappers
 * Eliminates code duplication across different courier webhook handlers
 */

import mongoose from 'mongoose';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import { ShipmentService } from '../shipping/shipment.service';
import { ICourierStatusMapper } from '../../../domain/courier/courier-status-mapper.interface';
import weightDisputeDetectionService from '../disputes/weight-dispute-detection.service';
import logger from '../../../../shared/logger/winston.logger';

export interface WebhookProcessResult {
    success: boolean;
    status: 'updated' | 'ignored' | 'skipped' | 'error';
    message: string;
    shipment?: any;
}

export class WebhookProcessorService {
    /**
     * Process a courier webhook using the appropriate status mapper
     * 
     * @param mapper Courier-specific status mapper
     * @param rawPayload Raw webhook payload from courier
     * @returns Processing result
     */
    static async processWebhook(
        mapper: ICourierStatusMapper,
        rawPayload: any
    ): Promise<WebhookProcessResult> {
        try {
            const courierName = mapper.getCourierName();

            logger.info(`${courierName} Webhook Received`, {
                payload: JSON.stringify(rawPayload)
            });

            // Extract fields using courier-specific mapper
            const { awb, status: courierStatus, location, description, weight, dimensions, timestamp } = mapper.extractFields(rawPayload);

            if (!awb) {
                logger.warn(`Invalid ${courierName} webhook payload: Missing AWB`, { rawPayload });
                return {
                    success: false,
                    status: 'error',
                    message: 'Invalid payload: Missing AWB'
                };
            }

            // Find shipment by AWB
            const shipment = await Shipment.findOne({
                $or: [
                    { trackingNumber: awb },
                    { 'carrierDetails.carrierTrackingNumber': awb }
                ]
            });

            if (!shipment) {
                logger.warn(`Shipment not found for ${courierName} webhook AWB: ${awb}`);
                return {
                    success: true,
                    status: 'ignored',
                    message: 'Shipment not found'
                };
            }

            // --- WEIGHT PROCESSING ---
            if (weight && weight.value > 0) {
                logger.info(`[${courierName}] Weight extracted from webhook`, {
                    awb,
                    weight,
                    dimensions
                });

                // Update shipment weights
                shipment.weights.actual = {
                    value: weight.value,
                    unit: weight.unit,
                    scannedAt: timestamp || new Date(),
                    scannedBy: courierName,
                    scannedLocation: location
                };

                if (dimensions) {
                    shipment.weights.actual.dimensions = dimensions;
                }

                await shipment.save();

                // Trigger dispute detection
                try {
                    await weightDisputeDetectionService.detectOnCarrierScan(
                        (shipment._id as mongoose.Types.ObjectId).toString(),
                        weight,
                        {
                            scannedAt: timestamp || new Date(),
                            location: location || `${courierName} Hub`,
                            notes: `${courierName} scan: ${weight.value}${weight.unit}`,
                            carrierName: courierName
                        }
                    );
                } catch (disputeError) {
                    logger.error(`[${courierName}] Error triggering weight dispute detection`, {
                        shipmentId: shipment._id,
                        error: disputeError instanceof Error ? disputeError.message : disputeError
                    });
                }
            }
            // -------------------------

            // Map courier status to internal status
            const internalStatus = mapper.mapStatus(courierStatus);

            if (internalStatus === 'unknown' || !internalStatus) {
                logger.info(`${courierName} status '${courierStatus}' ignored/unmapped`, { awb });
                return {
                    success: true,
                    status: 'ignored',
                    message: 'Status not mapped'
                };
            }

            // Avoid redundant updates
            if (shipment.currentStatus === internalStatus) {
                return {
                    success: true,
                    status: 'skipped',
                    message: 'Status already up to date',
                    shipment
                };
            }

            // Update shipment status via service
            const updateResult = await ShipmentService.updateShipmentStatus({
                shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                currentStatus: shipment.currentStatus,
                newStatus: internalStatus,
                currentVersion: (shipment as any).__v || 0,
                userId: 'SYSTEM_WEBHOOK',
                location: location,
                description: `${courierName} Update: ${courierStatus} - ${description}`.trim()
            });

            if (!updateResult.success) {
                logger.error(`Failed to update shipment status via ${courierName} webhook`, {
                    awb,
                    error: updateResult.error
                });
                return {
                    success: false,
                    status: 'error',
                    message: updateResult.error || 'Update failed'
                };
            }

            logger.info(`Shipment status updated via ${courierName} webhook`, {
                awb,
                oldStatus: shipment.currentStatus,
                newStatus: internalStatus
            });

            return {
                success: true,
                status: 'updated',
                message: 'Status updated successfully',
                shipment: updateResult.shipment
            };

        } catch (error) {
            logger.error('Webhook processing failed', {
                courierName: mapper.getCourierName(),
                error: error instanceof Error ? error.message : error
            });

            return {
                success: false,
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
