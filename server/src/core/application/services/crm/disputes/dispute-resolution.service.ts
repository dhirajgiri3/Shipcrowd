import Dispute, { IDispute, DisputeResolution } from '@/infrastructure/database/mongoose/models/crm/disputes/dispute.model';
import SupportTicket from '@/infrastructure/database/mongoose/models/crm/support/support-ticket.model';
import { AppError, NotFoundError, ConflictError, ValidationError } from '@/shared/errors';
import mongoose from 'mongoose';

export class DisputeResolutionService {
  /**
   * Create a dispute from a support ticket
   */
  async createDisputeFromTicket(
    ticketId: string,
    type: string,
    description: string,
    companyId: string
  ): Promise<IDispute> {
    try {
      // Verify ticket exists and is unresolved
      const ticket = await SupportTicket.findById(ticketId);
      if (!ticket) {
        throw new NotFoundError('Support ticket not found');
      }

      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        throw new ConflictError('Cannot create dispute for already resolved ticket');
      }

      // Create dispute
      const dispute = await Dispute.create({
        company: new mongoose.Types.ObjectId(companyId),
        type,
        description,
        relatedSupportTicketId: new mongoose.Types.ObjectId(ticketId),
        relatedOrderId: ticket.relatedOrderId,
        status: 'open',
        priority: this.calculatePriority(ticket.priority),
        slaDeadline: this.calculateSLADeadline(),
        timeline: [
          {
            event: 'created_from_ticket',
            actor: ticket.assignedTo,
            details: `Dispute created from ticket ${ticket.ticketId}`,
            timestamp: new Date(),
          },
        ],
      });

      // Update ticket with dispute reference
      ticket.history?.push({
        action: 'dispute_created',
        message: `Dispute created due to unresolved issue`,
        timestamp: new Date(),
      });
      await ticket.save();

      return dispute;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create dispute', 'SYS_INTERNAL_ERROR', 500, false, error);
    }
  }

  /**
   * Create a new dispute
   */
  async createDispute(data: Partial<IDispute>): Promise<IDispute> {
    try {
      const dispute = await Dispute.create({
        ...data,
        slaDeadline: this.calculateSLADeadline(),
        timeline: [
          {
            event: 'dispute_created',
            details: 'Dispute created',
            timestamp: new Date(),
          },
        ],
      });

      return dispute;
    } catch (error: any) {
      throw new AppError('Failed to create dispute', 'SYS_INTERNAL_ERROR', 500, false, error);
    }
  }

  /**
   * Update a dispute
   */
  async updateDispute(id: string, data: Partial<IDispute>): Promise<IDispute> {
    const dispute = await Dispute.findByIdAndUpdate(id, data, { new: true });
    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }
    return dispute;
  }

  /**
   * Start investigation on a dispute
   */
  async startInvestigation(
    disputeId: string,
    assignedToId: string,
    initialNotes: string
  ): Promise<IDispute> {
    try {
      const dispute = await Dispute.findById(disputeId);
      if (!dispute) {
        throw new NotFoundError('Dispute not found');
      }

      if (dispute.status !== 'open') {
        throw new ConflictError('Can only start investigation on open disputes');
      }

      dispute.status = 'investigation';
      dispute.assignedTo = new mongoose.Types.ObjectId(assignedToId);
      dispute.investigationStartedAt = new Date();
      dispute.investigationNotes = initialNotes;

      dispute.timeline?.push({
        event: 'investigation_started',
        actor: new mongoose.Types.ObjectId(assignedToId),
        details: initialNotes,
        timestamp: new Date(),
      });

      await dispute.save();
      return dispute;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to start investigation', 'SYS_INTERNAL_ERROR', 500, false, error);
    }
  }

  /**
   * Complete investigation and move to decision phase
   */
  async completeInvestigation(
    disputeId: string,
    completionNotes: string,
    actorId: string
  ): Promise<IDispute> {
    try {
      const dispute = await Dispute.findById(disputeId);
      if (!dispute) {
        throw new NotFoundError('Dispute not found');
      }

      if (dispute.status !== 'investigation') {
        throw new ConflictError('Can only complete investigation on investigation-status disputes');
      }

      dispute.status = 'decision';
      dispute.investigationCompletedAt = new Date();
      dispute.investigationNotes = completionNotes;

      dispute.timeline?.push({
        event: 'investigation_completed',
        actor: new mongoose.Types.ObjectId(actorId),
        details: completionNotes,
        timestamp: new Date(),
      });

      await dispute.save();
      return dispute;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to complete investigation', 'SYS_INTERNAL_ERROR', 500, false, error);
    }
  }

  /**
   * Resolve a dispute with decision and refund
   */
  async resolveDispute(
    disputeId: string,
    resolution: DisputeResolution,
    refundAmount: number,
    notes: string,
    decidedById: string
  ): Promise<IDispute> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const dispute = await Dispute.findById(disputeId).session(session);
      if (!dispute) {
        throw new NotFoundError('Dispute not found');
      }

      if (dispute.status === 'resolved' || dispute.status === 'closed') {
        throw new ConflictError('Dispute already resolved');
      }

      if (!['refund', 'replacement', 'partial-refund', 'no-action'].includes(resolution)) {
        throw new ValidationError('Invalid resolution type', { resolution });
      }

      // Only allow refunds for refund/partial-refund resolutions
      if ((resolution === 'refund' || resolution === 'partial-refund') && refundAmount < 0) {
        throw new ValidationError('Refund amount must be non-negative', { refundAmount });
      }

      dispute.status = 'resolved';
      dispute.resolution = resolution;
      dispute.refundAmount = refundAmount;
      dispute.resolutionNotes = notes;
      dispute.decidedAt = new Date();
      dispute.decidedBy = new mongoose.Types.ObjectId(decidedById);
      dispute.resolvedAt = new Date();

      dispute.timeline?.push({
        event: 'dispute_resolved',
        actor: new mongoose.Types.ObjectId(decidedById),
        details: `${resolution.toUpperCase()}: ${notes}. Refund: ${refundAmount}`,
        timestamp: new Date(),
      });

      await dispute.save({ session });
      await session.commitTransaction();
      return dispute;
    } catch (error: any) {
      await session.abortTransaction();
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to resolve dispute', 'SYS_INTERNAL_ERROR', 500, false, error);
    } finally {
      session.endSession();
    }
  }

  /**
   * Get disputes with filtering and pagination
   */
  async getDisputes(
    companyId: string,
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ disputes: IDispute[]; total: number; pages: number }> {
    const query: any = {
      company: new mongoose.Types.ObjectId(companyId),
    };

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) {
      query.assignedTo = new mongoose.Types.ObjectId(filters.assignedTo as string);
    }

    const total = await Dispute.countDocuments(query);
    const disputes = await Dispute.find(query)
      .populate('assignedTo', 'name email')
      .populate('relatedSupportTicketId', 'ticketId subject')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      disputes,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get dispute by ID
   */
  async getDisputeById(id: string): Promise<IDispute> {
    const dispute = await Dispute.findById(id)
      .populate('assignedTo', 'name email')
      .populate('decidedBy', 'name email')
      .populate('relatedSupportTicketId', 'ticketId subject')
      .lean();

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    return dispute;
  }

  /**
   * Get open disputes by company
   */
  async getOpenDisputes(companyId: string): Promise<IDispute[]> {
    return Dispute.getOpenDisputes(companyId);
  }

  /**
   * Check for stalled disputes and auto-escalate
   */
  async getAndEscalateStalledDisputes(companyId: string, hoursOld: number = 24): Promise<IDispute[]> {
    const stalledDisputes = await Dispute.getStalledDisputes(companyId, hoursOld);

    for (const dispute of stalledDisputes) {
      dispute.slaBreached = true;
      dispute.timeline?.push({
        event: 'sla_breached',
        details: `Dispute stalled for ${hoursOld}+ hours`,
        timestamp: new Date(),
      });
      await dispute.save();
    }

    return stalledDisputes;
  }

  /**
   * Get metrics by dispute type
   */
  async getMetricsByType(companyId: string): Promise<any> {
    return Dispute.getMetricsByType(companyId);
  }

  /**
   * Get dispute resolution summary
   */
  async getResolutionSummary(companyId: string, dateFrom?: Date, dateTo?: Date): Promise<any> {
    const match: any = {
      company: new mongoose.Types.ObjectId(companyId),
      status: 'resolved',
    };

    if (dateFrom || dateTo) {
      match.resolvedAt = {};
      if (dateFrom) match.resolvedAt.$gte = dateFrom;
      if (dateTo) match.resolvedAt.$lte = dateTo;
    }

    const summary = await Dispute.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$resolution',
          count: { $sum: 1 },
          totalRefunded: { $sum: '$refundAmount' },
          avgRefund: { $avg: '$refundAmount' },
        },
      },
    ]);

    return summary;
  }

  /**
   * Add evidence to a dispute
   */
  async addEvidence(
    disputeId: string,
    evidenceType: string,
    url: string,
    actorId: string
  ): Promise<IDispute> {
    try {
      const dispute = await Dispute.findById(disputeId);
      if (!dispute) {
        throw new NotFoundError('Dispute not found');
      }

      dispute.evidence?.push({
        type: evidenceType as any,
        url,
        uploadedAt: new Date(),
      });

      dispute.timeline?.push({
        event: 'evidence_added',
        actor: new mongoose.Types.ObjectId(actorId),
        details: `Added ${evidenceType} evidence`,
        timestamp: new Date(),
      });

      await dispute.save();
      return dispute;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to add evidence', 'SYS_INTERNAL_ERROR', 500, false, error);
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Map ticket priority to dispute priority
   */
  private calculatePriority(ticketPriority: string): string {
    const priorityMap: any = {
      low: 'low',
      medium: 'medium',
      high: 'critical',
      critical: 'critical',
    };
    return priorityMap[ticketPriority] || 'medium';
  }

  /**
   * Calculate SLA deadline (48 hours from now)
   */
  private calculateSLADeadline(): Date {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 48);
    return deadline;
  }
}
