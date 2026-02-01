/**
 * CRM Ticket Event Listeners (Phase 6)
 *
 * Handles automated workflows triggered by ticket lifecycle events:
 * - ticket.created → Send confirmation email to customer
 * - ticket.assigned → Send WhatsApp to sales rep
 * - ticket.status_changed → Update customer via email
 * - ticket.escalated → Notify supervisors
 * - ticket escalated 24h → Auto-escalate to supervisor
 * - ticket unresolved 48h → Auto-create dispute
 */

import SupportTicket from '@/infrastructure/database/mongoose/models/crm/support/support-ticket.model';
import { NotificationService } from '@/core/application/services/crm/communication/notification.service';
import { DisputeResolutionService } from '@/core/application/services/crm/disputes/dispute-resolution.service';
import { eventBus } from '@/shared/events/eventBus';
import logger from '@/shared/logger/winston.logger';

const notificationService = new NotificationService();
const disputeService = new DisputeResolutionService();

// ============================================================================
// TICKET CREATED LISTENER
// ============================================================================

/**
 * When a ticket is created:
 * 1. Send confirmation email to customer
 * 2. Send WhatsApp notification if assigned
 */
export const onTicketCreated = async (payload: any): Promise<void> => {
  try {
    const { ticketId, companyId } = payload;

    const ticket = await SupportTicket.findById(ticketId).populate('userId', 'email name');
    if (!ticket) {
      logger.warn(`Ticket not found for listener: ${ticketId}`);
      return;
    }

    // Send confirmation email to customer
    if (ticket.userId && (ticket.userId as any).email) {
      await notificationService.sendNotification({
        channel: 'email',
        trigger: 'ticket_created',
        recipientEmail: (ticket.userId as any).email,
        companyId,
        variables: {
          ticketId: ticket.ticketId,
          subject: ticket.subject,
          category: ticket.category,
          customerName: (ticket.userId as any).name || 'Valued Customer',
        },
      });
    }

    logger.info(`Ticket confirmation sent: ${ticketId}`);
  } catch (error: any) {
    logger.error('Error in onTicketCreated listener:', error);
  }
};

// ============================================================================
// TICKET ASSIGNED LISTENER
// ============================================================================

/**
 * When a ticket is assigned to a sales rep:
 * 1. Send WhatsApp message to the assigned rep
 */
export const onTicketAssigned = async (payload: any): Promise<void> => {
  try {
    const { ticketId, companyId } = payload;

    const ticket = await SupportTicket.findById(ticketId).populate('assignedTo', 'phone name');
    if (!ticket || !ticket.assignedTo) {
      logger.warn(`Ticket or assignment not found: ${ticketId}`);
      return;
    }

    const rep = ticket.assignedTo as any;

    // Send WhatsApp to sales rep
    if (rep.phone) {
      await notificationService.sendNotification({
        channel: 'whatsapp',
        trigger: 'ticket_assigned',
        recipientWhatsApp: rep.phone,
        companyId,
        variables: {
          ticketId: ticket.ticketId,
          subject: ticket.subject,
          priority: ticket.priority,
          repName: rep.name || 'Sales Rep',
        },
      });
    }

    logger.info(`Ticket assignment notification sent: ${ticketId}`);
  } catch (error: any) {
    logger.error('Error in onTicketAssigned listener:', error);
  }
};

// ============================================================================
// TICKET STATUS CHANGED LISTENER
// ============================================================================

/**
 * When ticket status changes:
 * 1. Send email update to customer
 * 2. Notify assigned sales rep
 */
export const onTicketStatusChanged = async (payload: any): Promise<void> => {
  try {
    const { ticketId, companyId } = payload;

    const ticket = await SupportTicket.findById(ticketId)
      .populate('userId', 'email name')
      .populate('assignedTo', 'phone name');

    if (!ticket) {
      logger.warn(`Ticket not found: ${ticketId}`);
      return;
    }

    // Send email to customer about status change
    if (ticket.userId && (ticket.userId as any).email) {
      await notificationService.sendNotification({
        channel: 'email',
        trigger: 'ticket_status_changed',
        recipientEmail: (ticket.userId as any).email,
        companyId,
        variables: {
          ticketId: ticket.ticketId,
          status: ticket.status,
          priority: ticket.priority,
          customerName: (ticket.userId as any).name || 'Valued Customer',
        },
      });
    }

    logger.info(`Ticket status change notification sent: ${ticketId}`);
  } catch (error: any) {
    logger.error('Error in onTicketStatusChanged listener:', error);
  }
};

// ============================================================================
// TICKET ESCALATION LISTENER
// ============================================================================

/**
 * When a ticket is escalated:
 * 1. Send escalation notification to supervisor
 * 2. Update SLA breach flag if needed
 */
export const onTicketEscalated = async (payload: any): Promise<void> => {
  try {
    const { ticketId, companyId } = payload;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      logger.warn(`Ticket not found: ${ticketId}`);
      return;
    }

    ticket.slaBreached = true;
    ticket.history?.push({
      action: 'escalated',
      message: 'Ticket escalated due to SLA breach or unresolved status',
      timestamp: new Date(),
    });

    await ticket.save();
    logger.info(`Ticket escalation recorded: ${ticketId}`);
  } catch (error: any) {
    logger.error('Error in onTicketEscalated listener:', error);
  }
};

// ============================================================================
// BACKGROUND JOBS / CRON TASKS
// ============================================================================

/**
 * Check for tickets unresolved for 24+ hours and escalate them
 * Should be called by a scheduled job/cron
 */
export const checkAndEscalateStalledTickets = async (companyId: string): Promise<void> => {
  try {
    const stalledThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const stalledTickets = await SupportTicket.find({
      companyId,
      status: { $in: ['open', 'in_progress'] },
      createdAt: { $lte: stalledThreshold },
      slaBreached: false,
    });

    for (const ticket of stalledTickets) {
      // Mark as escalated
      ticket.slaBreached = true;
      ticket.priority = ticket.priority === 'critical' ? 'critical' : 'high';

      ticket.history?.push({
        action: 'auto_escalated',
        message: 'Auto-escalated: Unresolved for 24+ hours',
        timestamp: new Date(),
      });

      await ticket.save();

      // Emit escalation event
      eventBus.emitEvent('ticket.escalated', {
        ticketId: (ticket as any)._id.toString(),
        ticketNumber: ticket.ticketId,
        companyId: ticket.companyId.toString(),
        status: ticket.status,
        priority: ticket.priority,
      });

      logger.info(`Ticket auto-escalated: ${ticket.ticketId}`);
    }

    logger.info(`Auto-escalated ${stalledTickets.length} stalled tickets for company ${companyId}`);
  } catch (error: any) {
    logger.error('Error checking stalled tickets:', error);
  }
};

/**
 * Check for tickets unresolved for 48+ hours and auto-create disputes
 * Should be called by a scheduled job/cron
 */
export const checkAndCreateDisputes = async (companyId: string): Promise<void> => {
  try {
    const unresoldThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

    const unresolvdTickets = await SupportTicket.find({
      companyId,
      status: { $in: ['open', 'in_progress'] },
      createdAt: { $lte: unresoldThreshold },
    });

    for (const ticket of unresolvdTickets) {
      try {
        // Check if dispute already exists
        const existingDispute = await (global as any).DisputeModel?.findOne({
          relatedSupportTicketId: ticket._id,
        });

        if (existingDispute) {
          continue; // Skip if dispute already created
        }

        // Create dispute
        const dispute = await disputeService.createDisputeFromTicket(
          (ticket as any)._id.toString(),
          'quality-issue', // Default type for auto-escalation
          `Auto-created from unresolved support ticket after 48 hours`,
          ticket.companyId.toString()
        );

        // Emit dispute created event
        eventBus.emitEvent('dispute.created', {
          disputeId: (dispute as any)._id.toString(),
          companyId: ticket.companyId.toString(),
          type: dispute.type,
          relatedTicketId: (ticket as any)._id.toString(),
        });

        logger.info(`Auto-dispute created from ticket: ${ticket.ticketId}`);
      } catch (error: any) {
        logger.error(`Failed to create dispute for ticket ${ticket.ticketId}:`, error);
      }
    }

    logger.info(`Processed ${unresolvdTickets.length} unresolved tickets for company ${companyId}`);
  } catch (error: any) {
    logger.error('Error creating disputes:', error);
  }
};

// ============================================================================
// LISTENER REGISTRATION
// ============================================================================

/**
 * Register all CRM ticket listeners
 * Call this function during application startup
 */
export const registerCRMTicketListeners = (): void => {
  eventBus.onEvent('ticket.created', onTicketCreated);
  eventBus.onEvent('ticket.assigned', onTicketAssigned);
  eventBus.onEvent('ticket.status_changed', onTicketStatusChanged);
  eventBus.onEvent('ticket.escalated', onTicketEscalated);

  logger.info('CRM Ticket event listeners registered');
};
