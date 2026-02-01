/**
 * Velocity Webhook
 * 
 * Purpose: Velocity Webhook Event Handler Service
 * 
 * DEPENDENCIES:
 * - Database Models, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import mongoose from 'mongoose';
import logger from '../../../../shared/logger/winston.logger';
import { Shipment, RTOEvent } from '../../../../infrastructure/database/mongoose/models';
import { IRTOEvent } from '../../../../infrastructure/database/mongoose/models/logistics/shipping/exceptions/rto-event.model';
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

      // Idempotency: Check if we already processed this exact webhook
      const webhookId = payload.webhook_id || `${awb}-${status_code}-${payload.timestamp}`;
      const cacheKey = `webhook:velocity:${webhookId}`;

      try {
        // Try Redis first (if available), fall back to in-memory Set if needed
        // Note: Dynamic import to avoid circular dependency issues during initialization
        const { CacheService } = await import('@/infrastructure/utilities/cache.service.js');
        const alreadyProcessed = await CacheService.get(cacheKey);

        if (alreadyProcessed) {
          logger.info('Duplicate webhook detected, skipping', { webhookId, awb });
          return {
            success: true,
            awb,
            orderId: order_id,
            statusUpdated: false,
            timestamp: new Date()
          };
        }
        // Mark as processed (TTL: 24 hours)
        await CacheService.set(cacheKey, '1', 86400);
      } catch (cacheError) {
        // Cache unavailable - proceed without dedup (log warning)
        logger.warn('Webhook dedup cache unavailable, proceeding', { webhookId });
      }

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

      // Refactored: Delegate to ShipmentService for consistent state transitions and transaction safety
      // Dynamic import to avoid circular dependencies if any
      const { ShipmentService } = await import('../shipping/shipment.service.js');

      const updateResult = await ShipmentService.updateShipmentStatus({
        shipmentId: String(shipment._id),
        currentStatus: shipment.currentStatus,
        newStatus: internalStatus,
        currentVersion: shipment.__v || 0,
        userId: 'system',
        location: current_location || payload.tracking_event?.location,
        description: description || payload.tracking_event?.description
      });

      if (!updateResult.success) {
        // If concurrent modification, we should retry or fail gracefully. 
        // Since this is a webhook, we can fail and let Velocity retry.
        logger.warn('Failed to update shipment status via webhook', {
          awb,
          error: updateResult.error,
          code: updateResult.code
        });
        throw new Error(updateResult.error || 'Failed to update shipment status');
      }

      // If status updated, we might need to handle specific logic if it wasn't handled in ShipmentService
      // Note: ShipmentService handles delivered, ndr, order sync, and outbound webhooks.
      // We don't need to duplicate that logic here.

      // Reload shipment to get latest state for logging/response
      // (Optional, or just use what we have. ShipmentService returns updated shipment)
      const updatedShipment = updateResult.shipment;

      // Update local reference for subsequent logic (like auto-sync) if needed
      if (updatedShipment) {
        shipment.currentStatus = updatedShipment.currentStatus;
        shipment.statusHistory = updatedShipment.statusHistory;
        shipment.ndrDetails = updatedShipment.ndrDetails;
        shipment.actualDelivery = updatedShipment.actualDelivery;
      }

      logger.info('Shipment status updated successfully', {
        awb,
        newStatus: internalStatus,
        orderId: order_id,
      });

      // **AUTO-SYNC: Push fulfillment updates to all connected e-commerce platforms**
      // This runs asynchronously after the shipment is saved and doesn't block the webhook response
      if (isStatusUpdate) {
        try {
          // Dynamic imports to avoid circular dependencies
          const { ShopifyFulfillmentService } = await import('../shopify/index.js');
          const { WooCommerceFulfillmentService } = await import('../woocommerce/index.js');
          const { AmazonFulfillmentService } = await import('../amazon/index.js');
          const { FlipkartFulfillmentService } = await import('../flipkart/index.js');

          // Run all platform syncs in parallel, don't block webhook response
          Promise.allSettled([
            ShopifyFulfillmentService.handleShipmentStatusChange(
              String(shipment._id),
              internalStatus
            ),
            WooCommerceFulfillmentService.handleShipmentStatusChange(
              String(shipment._id),
              internalStatus
            ),
            AmazonFulfillmentService.handleShipmentStatusChange(
              String(shipment._id),
              internalStatus
            ),
            FlipkartFulfillmentService.handleShipmentStatusChange(
              String(shipment._id),
              internalStatus
            ),
          ]).then((results) => {
            const platforms = ['Shopify', 'WooCommerce', 'Amazon', 'Flipkart'];
            results.forEach((result, index) => {
              if (result.status === 'rejected') {
                logger.warn(`${platforms[index]} fulfillment sync failed`, {
                  shipmentId: String(shipment._id),
                  status: internalStatus,
                  error: result.reason?.message || result.reason
                });
              }
            });
          });

          logger.debug('E-commerce fulfillment auto-sync triggered for all platforms', {
            shipmentId: shipment._id,
            status: internalStatus,
            platforms: ['Shopify', 'WooCommerce', 'Amazon', 'Flipkart'],
          });
        } catch (error) {
          logger.warn('Failed to trigger e-commerce fulfillment auto-sync', {
            shipmentId: shipment._id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

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
   * Handle reverse/RTO shipment status update webhook
   *
   * This handler processes status updates for RTO (Return to Origin) shipments.
   * It updates the RTOEvent model with the latest status and tracking information.
   */
  async handleReverseShipmentStatusUpdate(payload: VelocityWebhookPayload): Promise<WebhookProcessingResult> {
    const startTime = Date.now();

    try {
      const { awb, order_id, status, status_code, current_location, description } = payload.shipment_data;

      logger.info('Processing Velocity reverse/RTO shipment status update webhook', {
        reverseAwb: awb,
        orderId: order_id,
        status,
        statusCode: status_code
      });

      // RTOEvent model is imported at the top of the file
      // Find RTO event by reverse AWB
      const rtoEvent = await RTOEvent.findOne({
        reverseAwb: awb
      }).populate('shipment');

      if (!rtoEvent) {
        logger.warn('RTO event not found for reverse shipment webhook', { reverseAwb: awb, orderId: order_id });
        return {
          success: false,
          awb,
          orderId: order_id,
          statusUpdated: false,
          error: 'RTO event not found',
          timestamp: new Date()
        };
      }

      // Map Velocity status to RTO return status
      const statusMapping: Record<string, IRTOEvent['returnStatus']> = {
        'NEW': 'initiated',
        'PKP': 'in_transit',           // Picked up from customer
        'IT': 'in_transit',             // In transit to warehouse
        'OFD': 'in_transit',            // Out for delivery to warehouse
        'DEL': 'delivered_to_warehouse', // Delivered to warehouse
        'RTO': 'in_transit',            // RTO-in-RTO (rare edge case)
        'CANCELLED': 'initiated'        // Map cancelled to initiated
      };

      const newReturnStatus = statusMapping[status_code] || 'in_transit';
      const isStatusChange = rtoEvent.returnStatus !== newReturnStatus;

      // Update RTO event status
      if (isStatusChange) {
        rtoEvent.returnStatus = newReturnStatus as IRTOEvent['returnStatus'];

        // Update actualReturnDate if delivered to warehouse
        if (newReturnStatus === 'delivered_to_warehouse') {
          rtoEvent.actualReturnDate = new Date();
          rtoEvent.warehouseNotified = true;

          // Auto-transition to QC pending
          rtoEvent.returnStatus = 'qc_pending';

          logger.info('RTO shipment delivered to warehouse, transitioning to QC', {
            reverseAwb: awb,
            rtoEventId: rtoEvent._id
          });
        }

        // Add metadata tracking
        if (!rtoEvent.metadata) {
          rtoEvent.metadata = {};
        }
        rtoEvent.metadata.lastWebhookUpdate = new Date().toISOString();
        rtoEvent.metadata.lastVelocityStatus = status_code;
        rtoEvent.metadata.lastLocation = current_location;
        rtoEvent.metadata.lastDescription = description;

        await rtoEvent.save();

        logger.info('RTO event status updated successfully', {
          reverseAwb: awb,
          rtoEventId: rtoEvent._id,
          newStatus: newReturnStatus,
          orderId: order_id,
          processingTimeMs: Date.now() - startTime
        });
      } else {
        logger.info('Reverse shipment webhook received but RTO status unchanged', {
          reverseAwb: awb,
          currentStatus: rtoEvent.returnStatus,
          webhookStatus: newReturnStatus
        });
      }

      return {
        success: true,
        awb,
        orderId: order_id,
        statusUpdated: isStatusChange,
        timestamp: new Date()
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error processing reverse shipment status update webhook', {
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
      case 'REVERSE_SHIPMENT_STATUS_UPDATE':
        return this.handleReverseShipmentStatusUpdate(payload);
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
