/**
 * Dispute Event Listeners (Phase 6)
 *
 * Handles automated workflows triggered by dispute lifecycle events:
 * - dispute.created → Send notification to customer
 * - dispute.resolved → Send resolution notification with refund details
 */

import Dispute from '@/infrastructure/database/mongoose/models/crm/disputes/dispute.model';
import { NotificationService } from '@/core/application/services/crm/communication/notification.service';
import { eventBus } from '@/shared/events/eventBus';
import logger from '@/shared/logger/winston.logger';

const notificationService = new NotificationService();

// ============================================================================
// DISPUTE CREATED LISTENER
// ============================================================================

/**
 * When a dispute is created:
 * 1. Send email to customer acknowledging the dispute
 * 2. Log the event for audit trail
 */
export const onDisputeCreated = async (payload: any): Promise<void> => {
  try {
    const { disputeId, companyId } = payload;

    const dispute = await Dispute.findById(disputeId)
      .populate('customerId', 'email name')
      .populate('relatedSupportTicketId', 'ticketId subject');

    if (!dispute) {
      logger.warn(`Dispute not found: ${disputeId}`);
      return;
    }

    // Send email to customer about dispute creation
    if (dispute.customerId && (dispute.customerId as any).email) {
      await notificationService.sendNotification({
        channel: 'email',
        trigger: 'dispute_created',
        recipientEmail: (dispute.customerId as any).email,
        companyId,
        variables: {
          disputeId: dispute._id.toString(),
          type: dispute.type,
          priority: dispute.priority,
          description: dispute.description.substring(0, 100),
          customerName: (dispute.customerId as any).name || 'Valued Customer',
        },
      });
    }

    logger.info(`Dispute creation notification sent: ${disputeId}`);
  } catch (error: any) {
    logger.error('Error in onDisputeCreated listener:', error);
  }
};

// ============================================================================
// DISPUTE RESOLVED LISTENER
// ============================================================================

/**
 * When a dispute is resolved:
 * 1. Send email with resolution details and refund amount (if applicable)
 * 2. Log resolution for audit trail
 */
export const onDisputeResolved = async (payload: any): Promise<void> => {
  try {
    const { disputeId, companyId } = payload;

    const dispute = await Dispute.findById(disputeId)
      .populate('customerId', 'email name')
      .populate('decidedBy', 'name email');

    if (!dispute) {
      logger.warn(`Dispute not found: ${disputeId}`);
      return;
    }

    // Send resolution email to customer
    if (dispute.customerId && (dispute.customerId as any).email) {
      await notificationService.sendNotification({
        channel: 'email',
        trigger: 'dispute_resolved',
        recipientEmail: (dispute.customerId as any).email,
        companyId,
        variables: {
          disputeId: dispute._id.toString(),
          resolution: dispute.resolution || 'pending',
          refundAmount: dispute.refundAmount ? `₹${dispute.refundAmount}` : '₹0',
          notes: dispute.resolutionNotes?.substring(0, 200) || 'No additional notes',
          customerName: (dispute.customerId as any).name || 'Valued Customer',
        },
      });
    }

    logger.info(`Dispute resolution notification sent: ${disputeId}`);
  } catch (error: any) {
    logger.error('Error in onDisputeResolved listener:', error);
  }
};

// ============================================================================
// LISTENER REGISTRATION
// ============================================================================

/**
 * Register all Dispute event listeners
 * Call this function during application startup
 */
export const registerDisputeListeners = (): void => {
  eventBus.onEvent('dispute.created', onDisputeCreated);
  eventBus.onEvent('dispute.resolved', onDisputeResolved);

  logger.info('Dispute event listeners registered');
};
