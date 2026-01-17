/**
 * Dispute Service
 * 
 * Core business logic for dispute resolution:
 * - Dispute creation and validation
 * - Evidence management
 * - SLA tracking and auto-escalation
 * - Resolution workflow
 * - Courier integration
 */

import mongoose from 'mongoose';
import Dispute, { IDispute } from '@/infrastructure/database/mongoose/models/logistics/disputes/dispute.model';
import { Shipment } from '@/infrastructure/database/mongoose/models';
import logger from '@/shared/logger/winston.logger';
import { AppError, NotFoundError, ValidationError, ConflictError } from '@/shared/errors/app.error';
import { ErrorCode } from '@/shared/errors/errorCodes';

// ============================================================================
// INTERFACES
// ============================================================================

interface ICreateDisputeInput {
    shipmentId: string;
    companyId: string;
    userId: string;
    type: 'delivery' | 'damage' | 'lost' | 'other';
    category: string;
    description: string;
    evidence?: Array<{
        type: 'image' | 'document' | 'video' | 'note';
        url?: string;
        description: string;
    }>;
}

interface IAddEvidenceInput {
    disputeId: string;
    userId: string;
    evidence: {
        type: 'image' | 'document' | 'video' | 'note';
        url?: string;
        description: string;
    };
}

interface IUpdateStatusInput {
    disputeId: string;
    userId: string;
    status: 'pending' | 'investigating' | 'resolved' | 'closed' | 'escalated';
    notes?: string;
}

interface IResolveDisputeInput {
    disputeId: string;
    userId: string;
    resolution: {
        type: 'refund' | 'replacement' | 'compensation' | 'rejected';
        amount?: number;
        reason: string;
    };
}

// ============================================================================
// SERVICE
// ============================================================================

export default class DisputeService {
    /**
     * Create new dispute
     */
    static async createDispute(data: ICreateDisputeInput): Promise<IDispute> {
        logger.info('Creating dispute', {
            shipmentId: data.shipmentId,
            type: data.type,
        });

        // 1. Validate shipment exists
        const shipment = await Shipment.findById(data.shipmentId);
        if (!shipment) {
            throw new NotFoundError('Shipment', ErrorCode.RES_SHIPMENT_NOT_FOUND);
        }

        // 2. Check for existing open disputes
        const existingDispute = await Dispute.findOne({
            shipmentId: new mongoose.Types.ObjectId(data.shipmentId),
            status: { $in: ['pending', 'investigating', 'escalated'] },
        });

        if (existingDispute) {
            throw new ConflictError(
                'An open dispute already exists for this shipment',
                ErrorCode.BIZ_ALREADY_EXISTS
            );
        }

        // 3. Generate dispute ID
        const disputeId = await Dispute.generateDisputeId();

        // 4. Calculate SLA deadline
        const priority = this.calculatePriority(data.type, data.category);
        const slaDeadline = this.calculateSLADeadline(priority);

        // 5. Prepare evidence
        const evidence = data.evidence?.map(ev => ({
            ...ev,
            uploadedBy: new mongoose.Types.ObjectId(data.userId),
            uploadedAt: new Date(),
        })) || [];

        // 6. Create dispute
        const dispute = await Dispute.create({
            disputeId,
            shipmentId: new mongoose.Types.ObjectId(data.shipmentId),
            companyId: new mongoose.Types.ObjectId(data.companyId),
            type: data.type,
            category: data.category,
            description: data.description,
            priority,
            status: 'pending',
            evidence,
            timeline: [
                {
                    action: 'Dispute created',
                    performedBy: new mongoose.Types.ObjectId(data.userId),
                    timestamp: new Date(),
                    notes: `Created by user for ${data.type} issue`,
                },
            ],
            sla: {
                deadline: slaDeadline,
                isOverdue: false,
            },
        });

        logger.info('Dispute created successfully', {
            disputeId: dispute.disputeId,
            priority: dispute.priority,
            deadline: dispute.sla.deadline,
        });

        // TODO: Send notification to customer and admin
        // await NotificationService.sendDisputeCreated(dispute);

        return dispute;
    }

    /**
     * Add evidence to dispute
     */
    static async addEvidence(data: IAddEvidenceInput): Promise<IDispute> {
        const dispute = await Dispute.findOne({ disputeId: data.disputeId });

        if (!dispute) {
            throw new NotFoundError('Dispute', ErrorCode.BIZ_NOT_FOUND);
        }

        if (dispute.status === 'closed' || dispute.status === 'resolved') {
            throw new ValidationError(
                'Cannot add evidence to closed dispute'
            );
        }

        // Add evidence
        dispute.evidence.push({
            ...data.evidence,
            uploadedBy: new mongoose.Types.ObjectId(data.userId),
            uploadedAt: new Date(),
        } as any);

        // Add timeline entry
        dispute.timeline.push({
            action: 'Evidence added',
            performedBy: new mongoose.Types.ObjectId(data.userId),
            timestamp: new Date(),
            notes: `Added ${data.evidence.type}: ${data.evidence.description}`,
        } as any);

        await dispute.save();

        logger.info('Evidence added to dispute', {
            disputeId: dispute.disputeId,
            evidenceType: data.evidence.type,
        });

        // TODO: Send notification
        // await NotificationService.sendDisputeEvidenceAdded(dispute);

        return dispute;
    }

    /**
     * Update dispute status
     */
    static async updateStatus(data: IUpdateStatusInput): Promise<IDispute> {
        const dispute = await Dispute.findOne({ disputeId: data.disputeId });

        if (!dispute) {
            throw new NotFoundError('Dispute', ErrorCode.BIZ_NOT_FOUND);
        }

        // Validate status transition
        this.validateStatusTransition(dispute.status, data.status);

        const oldStatus = dispute.status;
        dispute.status = data.status;

        // Add timeline entry
        dispute.timeline.push({
            action: `Status changed from ${oldStatus} to ${data.status}`,
            performedBy: new mongoose.Types.ObjectId(data.userId),
            timestamp: new Date(),
            notes: data.notes,
        } as any);

        // Check if deadline passed
        if (new Date() > dispute.sla.deadline && data.status !== 'resolved') {
            dispute.sla.isOverdue = true;
        }

        await dispute.save();

        logger.info('Dispute status updated', {
            disputeId: dispute.disputeId,
            oldStatus,
            newStatus: data.status,
        });

        // TODO: Send notification
        // await NotificationService.sendDisputeStatusUpdated(dispute);

        return dispute;
    }

    /**
     * Escalate dispute
     */
    static async escalateDispute(
        disputeId: string,
        userId: string,
        reason: string
    ): Promise<IDispute> {
        const dispute = await Dispute.findOne({ disputeId });

        if (!dispute) {
            throw new NotFoundError('Dispute', ErrorCode.BIZ_NOT_FOUND);
        }

        if (dispute.status === 'resolved' || dispute.status === 'closed') {
            throw new AppError(
                'Cannot escalate resolved/closed dispute',
                'DISPUTE_CLOSED',
                400
            );
        }

        dispute.status = 'escalated';
        dispute.priority = 'urgent';
        dispute.sla.escalationDate = new Date();

        dispute.timeline.push({
            action: 'Dispute escalated',
            performedBy: new mongoose.Types.ObjectId(userId),
            timestamp: new Date(),
            notes: reason,
        } as any);

        await dispute.save();

        logger.warn('Dispute escalated', {
            disputeId: dispute.disputeId,
            reason,
        });

        // TODO: Send escalation notification
        // await NotificationService.sendDisputeEscalated(dispute);

        return dispute;
    }

    /**
     * Resolve dispute
     */
    static async resolveDispute(data: IResolveDisputeInput): Promise<IDispute> {
        const dispute = await Dispute.findOne({ disputeId: data.disputeId });

        if (!dispute) {
            throw new NotFoundError('Dispute', ErrorCode.BIZ_NOT_FOUND);
        }

        if (dispute.status === 'resolved' || dispute.status === 'closed') {
            throw new AppError(
                'Dispute already resolved',
                'DISPUTE_ALREADY_RESOLVED',
                400
            );
        }

        dispute.status = 'resolved';
        dispute.resolution = {
            ...data.resolution,
            resolvedBy: new mongoose.Types.ObjectId(data.userId),
            resolvedAt: new Date(),
        } as any;

        dispute.timeline.push({
            action: `Dispute resolved: ${data.resolution.type}`,
            performedBy: new mongoose.Types.ObjectId(data.userId),
            timestamp: new Date(),
            notes: data.resolution.reason,
        } as any);

        await dispute.save();

        logger.info('Dispute resolved', {
            disputeId: dispute.disputeId,
            resolutionType: data.resolution.type,
            amount: data.resolution.amount,
        });

        // TODO: Send resolution notification
        // await NotificationService.sendDisputeResolved(dispute);

        // TODO: Process refund if applicable
        // if (data.resolution.type === 'refund' && data.resolution.amount) {
        //     await PaymentService.processRefund(dispute, data.resolution.amount);
        // }

        return dispute;
    }

    /**
     * Get disputes with pagination
     */
    static async getDisputes(
        filter: any = {},
        limit: number = 20,
        skip: number = 0
    ): Promise<IDispute[]> {
        filter.isDeleted = false;

        return await Dispute.find(filter)
            .populate('shipmentId', 'trackingNumber currentStatus')
            .populate('assignedTo', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .lean();
    }

    /**
     * Get dispute by ID
     */
    static async getDisputeById(disputeId: string): Promise<IDispute> {
        const dispute = await Dispute.findOne({ disputeId, isDeleted: false })
            .populate('shipmentId')
            .populate('companyId', 'name email')
            .populate('assignedTo', 'firstName lastName email')
            .populate('evidence.uploadedBy', 'firstName lastName')
            .populate('timeline.performedBy', 'firstName lastName');

        if (!dispute) {
            throw new NotFoundError('Dispute', ErrorCode.BIZ_NOT_FOUND);
        }

        return dispute;
    }

    /**
     * Count disputes matching filter
     */
    static async countDisputes(filter: any = {}): Promise<number> {
        filter.isDeleted = false;
        return await Dispute.countDocuments(filter);
    }

    /**
     * Assign dispute to agent
     */
    static async assignDispute(
        disputeId: string,
        assignedTo: string,
        userId: string
    ): Promise<IDispute> {
        const dispute = await Dispute.findOne({ disputeId, isDeleted: false });

        if (!dispute) {
            throw new NotFoundError('Dispute', ErrorCode.BIZ_NOT_FOUND);
        }

        const oldAssignee = dispute.assignedTo;
        dispute.assignedTo = new mongoose.Types.ObjectId(assignedTo);

        dispute.timeline.push({
            action: oldAssignee
                ? `Reassigned from ${oldAssignee} to ${assignedTo}`
                : `Assigned to ${assignedTo}`,
            performedBy: new mongoose.Types.ObjectId(userId),
            timestamp: new Date(),
        } as any);

        await dispute.save();

        logger.info('Dispute assigned', {
            disputeId,
            assignedTo,
            oldAssignee,
        });

        return dispute;
    }

    /**
     * Soft delete dispute
     */
    static async deleteDispute(disputeId: string, userId: string): Promise<void> {
        const dispute = await Dispute.findOne({ disputeId, isDeleted: false });

        if (!dispute) {
            throw new NotFoundError('Dispute', ErrorCode.BIZ_NOT_FOUND);
        }

        dispute.isDeleted = true;
        dispute.deletedAt = new Date();
        dispute.deletedBy = new mongoose.Types.ObjectId(userId);

        await dispute.save();

        logger.info('Dispute deleted', {
            disputeId,
            deletedBy: userId,
        });
    }

    /**
     * Get dispute statistics
     */
    static async getDisputeStats(companyId?: string): Promise<any> {
        const filter: any = { isDeleted: false };
        if (companyId) {
            filter.companyId = new mongoose.Types.ObjectId(companyId);
        }

        const [
            totalDisputes,
            disputesByType,
            disputesByStatus,
            overdueDisputes,
            avgResolutionTime,
        ] = await Promise.all([
            Dispute.countDocuments(filter),
            Dispute.aggregate([
                { $match: filter },
                { $group: { _id: '$type', count: { $sum: 1 } } },
            ]),
            Dispute.aggregate([
                { $match: filter },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Dispute.countDocuments({ ...filter, 'sla.isOverdue': true, status: { $nin: ['resolved', 'closed'] } }),
            Dispute.aggregate([
                {
                    $match: {
                        ...filter,
                        status: 'resolved',
                        'resolution.resolvedAt': { $exists: true },
                    },
                },
                {
                    $project: {
                        resolutionTime: {
                            $subtract: ['$resolution.resolvedAt', '$createdAt'],
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgTime: { $avg: '$resolutionTime' },
                    },
                },
            ]),
        ]);

        const avgResolutionHours = avgResolutionTime[0]
            ? Math.round(avgResolutionTime[0].avgTime / (1000 * 60 * 60))
            : 0;

        return {
            totalDisputes,
            disputesByType: disputesByType.reduce((acc: any, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            disputesByStatus: disputesByStatus.reduce((acc: any, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            overdueDisputes,
            avgResolutionHours,
            slaComplianceRate:
                totalDisputes > 0
                    ? Math.round(((totalDisputes - overdueDisputes) / totalDisputes) * 100)
                    : 100,
        };
    }

    // ========================================================================
    // PRIVATE HELPER METHODS
    // ========================================================================

    private static calculatePriority(
        type: string,
        category: string
    ): 'low' | 'medium' | 'high' | 'urgent' {
        // Damaged and lost items are high priority
        if (type === 'damage' || type === 'lost') {
            return 'high';
        }

        // Not delivered is high priority
        if (category === 'not_delivered') {
            return 'high';
        }

        // Delayed is low priority
        if (category === 'delayed') {
            return 'low';
        }

        return 'medium';
    }

    private static calculateSLADeadline(priority: string): Date {
        const hours: Record<string, number> = {
            urgent: 24,
            high: 48,
            medium: 72,
            low: 96,
        };

        const deadline = new Date();
        deadline.setHours(deadline.getHours() + hours[priority]);

        return deadline;
    }

    private static validateStatusTransition(
        currentStatus: string,
        newStatus: string
    ): void {
        const validTransitions: Record<string, string[]> = {
            pending: ['investigating', 'escalated', 'closed'],
            investigating: ['resolved', 'escalated', 'closed'],
            escalated: ['resolved', 'closed'],
            resolved: ['closed'],
            closed: [],
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new AppError(
                `Invalid status transition from ${currentStatus} to ${newStatus}`,
                'INVALID_STATUS_TRANSITION',
                400
            );
        }
    }
}
