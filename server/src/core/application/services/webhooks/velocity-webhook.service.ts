/**
 * Velocity Webhook Event Handler Service
 *
 * Processes webhook events from Velocity Shipfast and updates shipment status
 */

import mongoose from 'mongoose';
import logger from '../../../../shared/logger/winston.logger';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import {
  VelocityWebhookPayload,
  WebhookProcessingResult,
  WebhookEventHandler
} from '../../../../infrastructure/external/couriers/velocity/velocity-webhook.types';
import { VELOCITY_STATUS_MAP } from '../../../../infrastructure/external/couriers/velocity/velocity.types';
import WeightDisputeDetectionService from '../disputes/weight-dispute-detection.service';

export class VelocityWebhookService implements WebhookEventHandler {
  /**
   * Handle shipment status update webhook
   */
  async handleStatusUpdate(payload: VelocityWebhookPayload): Promise<WebhookProcessingResult> {
    const startTime = Date.now();

    try {
      const { awb, order_id, status, status_code, current_location, description } = payload.shipment_data;

      logger.info('Processing Velocity status update webhook', {
        awb,
        orderId: order_id,
        status,
        statusCode: status_code
      });

      // Find shipment by AWB (carrier tracking number) or order ID
      const shipment = await Shipment.findOne({
        $or: [
          { 'carrierDetails.carrierTrackingNumber': awb },
          { trackingNumber: order_id }
        ],
        isDeleted: false
      });

      if (!shipment) {
        logger.warn('Shipment not found for webhook', { awb, orderId: order_id });
        return {
          success: false,
          awb,
          orderId: order_id,
          statusUpdated: false,
          error: 'Shipment not found',
          timestamp: new Date()
        };
      }

      // Map Velocity status to internal status
      const internalStatus = VELOCITY_STATUS_MAP[status_code] || status.toLowerCase();

      // Check if status is newer than current status
      const isStatusUpdate = shipment.currentStatus !== internalStatus;

      if (!isStatusUpdate) {
        logger.info('Webhook received but status unchanged', {
          awb,
          currentStatus: shipment.currentStatus,
          webhookStatus: internalStatus
        });
        return {
          success: true,
          awb,
          orderId: order_id,
          statusUpdated: false,
          timestamp: new Date()
        };
      }

      // Add status to history
      shipment.statusHistory.push({
        status: internalStatus,
        timestamp: new Date(payload.timestamp || Date.now()),
        location: current_location || payload.tracking_event?.location,
        description: description || payload.tracking_event?.description,
        updatedBy: undefined // Webhook update, no user
      });

      // Update current status
      shipment.currentStatus = internalStatus;

      // Handle special status updates
      if (internalStatus === 'delivered') {
        shipment.actualDelivery = new Date();
      }

      if (internalStatus === 'ndr') {
        if (!shipment.ndrDetails) {
          shipment.ndrDetails = {
            ndrAttempts: 0,
            ndrStatus: 'pending'
          };
        }
        shipment.ndrDetails.ndrReason = description;
        shipment.ndrDetails.ndrDate = new Date();
        shipment.ndrDetails.ndrAttempts = (shipment.ndrDetails.ndrAttempts || 0) + 1;
        shipment.ndrDetails.ndrStatus = 'pending';
      }

      // Save shipment
      await shipment.save();

      const processingTime = Date.now() - startTime;
      logger.info('Webhook processed successfully', {
        awb,
        orderId: order_id,
        oldStatus: shipment.currentStatus,
        newStatus: internalStatus,
        processingTimeMs: processingTime
      });

      return {
        success: true,
        awb,
        orderId: order_id,
        statusUpdated: true,
        timestamp: new Date()
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error processing webhook status update', {
        error,
        payload,
        processingTimeMs: processingTime
      });

      return {
        success: false,
        awb: payload.shipment_data.awb,
        orderId: payload.shipment_data.order_id,
        statusUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle shipment created webhook
   */
  async handleShipmentCreated(payload: VelocityWebhookPayload): Promise<WebhookProcessingResult> {
    try {
      const { awb, order_id, courier_name } = payload.shipment_data;

      logger.info('Processing Velocity shipment created webhook', {
        awb,
        orderId: order_id,
        courier: courier_name
      });

      // Find shipment by order ID
      const shipment = await Shipment.findOne({
        trackingNumber: order_id,
        isDeleted: false
      });

      if (!shipment) {
        logger.warn('Shipment not found for created webhook', { awb, orderId: order_id });
        return {
          success: false,
          awb,
          orderId: order_id,
          statusUpdated: false,
          error: 'Shipment not found',
          timestamp: new Date()
        };
      }

      // Update carrier details
      if (!shipment.carrierDetails.carrierTrackingNumber) {
        shipment.carrierDetails.carrierTrackingNumber = awb;
      }

      await shipment.save();

      logger.info('Shipment created webhook processed', { awb, orderId: order_id });

      return {
        success: true,
        awb,
        orderId: order_id,
        statusUpdated: false,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error processing shipment created webhook', { error, payload });

      return {
        success: false,
        awb: payload.shipment_data.awb,
        orderId: payload.shipment_data.order_id,
        statusUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle shipment cancelled webhook
   */
  async handleShipmentCancelled(payload: VelocityWebhookPayload): Promise<WebhookProcessingResult> {
    try {
      const { awb, order_id } = payload.shipment_data;

      logger.info('Processing Velocity shipment cancelled webhook', {
        awb,
        orderId: order_id
      });

      // Find shipment
      const shipment = await Shipment.findOne({
        $or: [
          { 'carrierDetails.carrierTrackingNumber': awb },
          { trackingNumber: order_id }
        ],
        isDeleted: false
      });

      if (!shipment) {
        logger.warn('Shipment not found for cancelled webhook', { awb, orderId: order_id });
        return {
          success: false,
          awb,
          orderId: order_id,
          statusUpdated: false,
          error: 'Shipment not found',
          timestamp: new Date()
        };
      }

      // Update status to cancelled
      shipment.statusHistory.push({
        status: 'cancelled',
        timestamp: new Date(payload.timestamp || Date.now()),
        description: 'Shipment cancelled by carrier',
        updatedBy: undefined
      });

      shipment.currentStatus = 'cancelled';

      await shipment.save();

      logger.info('Shipment cancelled webhook processed', { awb, orderId: order_id });

      return {
        success: true,
        awb,
        orderId: order_id,
        statusUpdated: true,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error processing shipment cancelled webhook', { error, payload });

      return {
        success: false,
        awb: payload.shipment_data.awb,
        orderId: payload.shipment_data.order_id,
        statusUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Handle shipment weight scanned webhook (Week 11: Weight Dispute Management)
   * Triggers automatic dispute detection when carrier scans package weight
   */
  async handleWeightScanned(payload: VelocityWebhookPayload): Promise<WebhookProcessingResult> {
    const startTime = Date.now();

    try {
      const { awb, order_id, courier_name } = payload.shipment_data;
      const weightData = payload.weight_data;

      if (!weightData) {
        logger.warn('Weight data missing in weight_scanned webhook', { awb, orderId: order_id });
        return {
          success: false,
          awb,
          orderId: order_id,
          statusUpdated: false,
          error: 'Weight data missing',
          timestamp: new Date()
        };
      }

      logger.info('Processing Velocity weight scanned webhook', {
        awb,
        orderId: order_id,
        scannedWeight: weightData.scanned_weight,
        unit: weightData.unit,
        location: weightData.scan_location
      });

      // Find shipment by AWB or order ID
      const shipment = await Shipment.findOne({
        $or: [
          { 'carrierDetails.carrierTrackingNumber': awb },
          { trackingNumber: order_id }
        ],
        isDeleted: false
      });

      if (!shipment) {
        logger.warn('Shipment not found for weight scanned webhook', { awb, orderId: order_id });
        return {
          success: false,
          awb,
          orderId: order_id,
          statusUpdated: false,
          error: 'Shipment not found',
          timestamp: new Date()
        };
      }

      // Trigger weight dispute detection
      try {
        const dispute = await WeightDisputeDetectionService.detectOnCarrierScan(
          String(shipment._id),
          {
            value: weightData.scanned_weight,
            unit: weightData.unit
          },
          {
            photoUrl: weightData.scan_photo_url,
            scannedAt: new Date(weightData.scan_timestamp),
            location: weightData.scan_location,
            notes: `Weight scanned at ${weightData.scan_location || courier_name} hub`,
            carrierName: courier_name
          }
        );

        const processingTime = Date.now() - startTime;

        if (dispute) {
          logger.info('Weight dispute created from webhook', {
            awb,
            orderId: order_id,
            disputeId: dispute.disputeId,
            discrepancyPercent: dispute.discrepancy.percentage,
            financialImpact: dispute.financialImpact.difference,
            processingTimeMs: processingTime
          });
        } else {
          logger.info('Weight verified - no dispute created', {
            awb,
            orderId: order_id,
            declaredWeight: shipment.packageDetails.weight,
            scannedWeight: weightData.scanned_weight,
            processingTimeMs: processingTime
          });
        }

        return {
          success: true,
          awb,
          orderId: order_id,
          statusUpdated: true, // Weight verified/dispute created
          timestamp: new Date()
        };
      } catch (detectionError) {
        logger.error('Error in weight dispute detection', {
          awb,
          orderId: order_id,
          error: detectionError instanceof Error ? detectionError.message : detectionError
        });

        // Still return success for webhook since shipment exists
        // Detection error should not fail webhook processing
        return {
          success: true,
          awb,
          orderId: order_id,
          statusUpdated: false,
          error: 'Dispute detection failed but webhook processed',
          timestamp: new Date()
        };
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error processing weight scanned webhook', {
        error,
        payload,
        processingTimeMs: processingTime
      });

      return {
        success: false,
        awb: payload.shipment_data.awb,
        orderId: payload.shipment_data.order_id,
        statusUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Route webhook to appropriate handler based on event type
   */
  async processWebhook(payload: VelocityWebhookPayload): Promise<WebhookProcessingResult> {
    switch (payload.event_type) {
      case 'SHIPMENT_STATUS_UPDATE':
        return this.handleStatusUpdate(payload);
      case 'SHIPMENT_CREATED':
        return this.handleShipmentCreated(payload);
      case 'SHIPMENT_CANCELLED':
        return this.handleShipmentCancelled(payload);
      case 'SHIPMENT_WEIGHT_SCANNED':
        return this.handleWeightScanned(payload);
      default:
        logger.warn('Unknown webhook event type', { eventType: payload.event_type });
        return {
          success: false,
          awb: payload.shipment_data.awb,
          orderId: payload.shipment_data.order_id,
          statusUpdated: false,
          error: `Unknown event type: ${payload.event_type}`,
          timestamp: new Date()
        };
    }
  }
}
