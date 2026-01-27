import { FilterQuery, Types } from 'mongoose';
import SupportTicket, { ISupportTicket } from '@/infrastructure/database/mongoose/models/crm/support/support-ticket.model';
import { NotFoundError, ValidationError } from '@/shared/errors/app.error';
import { isSLABreached, getRemainingTime, Priority } from './sla.utils';

interface CreateTicketDTO {
    companyId: string;
    userId: string;
    subject: string;
    description: string;
    category: 'technical' | 'billing' | 'logistics' | 'other';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    relatedOrderId?: string;
    relatedNDREventId?: string;
    attachments?: string[];
}

interface UpdateTicketDTO {
    status?: 'open' | 'in_progress' | 'resolved' | 'closed';
    assignedTo?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    slaBreached?: boolean;
}

interface TicketFilters {
    companyId: string;
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
    relatedOrderId?: string;
    page?: number;
    limit?: number;
}

class SupportTicketService {
    private static instance: SupportTicketService;

    private constructor() { }

    public static getInstance(): SupportTicketService {
        if (!SupportTicketService.instance) {
            SupportTicketService.instance = new SupportTicketService();
        }
        return SupportTicketService.instance;
    }

    /**
     * Create a new support ticket
     */
    public async createTicket(data: CreateTicketDTO): Promise<ISupportTicket> {
        const ticket = await SupportTicket.create({
            companyId: new Types.ObjectId(data.companyId),
            userId: new Types.ObjectId(data.userId),
            subject: data.subject,
            description: data.description,
            category: data.category,
            priority: data.priority || 'medium',
            relatedOrderId: data.relatedOrderId,
            relatedNDREventId: data.relatedNDREventId ? new Types.ObjectId(data.relatedNDREventId) : undefined,
            attachments: data.attachments || [],
            history: [{
                action: 'created',
                actor: new Types.ObjectId(data.userId),
                message: 'Ticket created',
                timestamp: new Date()
            }]
        });

        return ticket;
    }

    /**
     * Get tickets with filtering and pagination
     */
    public async getTickets(filters: TicketFilters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;

        const query: FilterQuery<ISupportTicket> = {
            companyId: new Types.ObjectId(filters.companyId)
        };

        if (filters.status) query.status = filters.status;
        if (filters.priority) query.priority = filters.priority;
        if (filters.category) query.category = filters.category;
        if (filters.assignedTo) query.assignedTo = new Types.ObjectId(filters.assignedTo);
        if (filters.relatedOrderId) query.relatedOrderId = filters.relatedOrderId;

        const [tickets, total] = await Promise.all([
            SupportTicket.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('assignedTo', 'firstName lastName email')
                .populate('userId', 'firstName lastName email')
                .lean(),
            SupportTicket.countDocuments(query)
        ]);

        // Enrich with SLA status
        const enrichedTickets = tickets.map(ticket => ({
            ...ticket,
            slaBreached: isSLABreached(ticket.priority as Priority, ticket.createdAt, ticket.status),
            remainingTime: getRemainingTime(ticket.priority as Priority, ticket.createdAt, ticket.status)
        }));

        return {
            tickets: enrichedTickets,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
    }

    /**
     * Get single ticket by ID
     */
    public async getTicketById(ticketId: string, companyId: string): Promise<ISupportTicket> {
        const query: FilterQuery<ISupportTicket> = { companyId: new Types.ObjectId(companyId) };

        // Support querying by either _id or ticketId (TKT-XXXXXX)
        if (Types.ObjectId.isValid(ticketId)) {
            query._id = new Types.ObjectId(ticketId);
        } else {
            query.ticketId = ticketId;
        }

        const ticket = await SupportTicket.findOne(query)
            .populate('assignedTo', 'firstName lastName email')
            .populate('userId', 'firstName lastName email');

        if (!ticket) {
            throw new NotFoundError('Support ticket not found');
        }

        // Auto-calculate SLA breach on fetch
        const breached = isSLABreached(ticket.priority as Priority, ticket.createdAt, ticket.status);
        if (breached !== ticket.slaBreached) {
            ticket.slaBreached = breached;
            await ticket.save();
        }

        return ticket;
    }

    /**
     * Update ticket details
     */
    public async updateTicket(
        ticketId: string,
        companyId: string,
        updates: UpdateTicketDTO,
        actorId: string
    ): Promise<ISupportTicket> {
        const ticket = await this.getTicketById(ticketId, companyId);
        const historyEntry = {
            action: 'updated',
            actor: new Types.ObjectId(actorId),
            message: 'Ticket updated',
            timestamp: new Date()
        };

        if (updates.status) {
            ticket.status = updates.status;
            historyEntry.message = `Status changed to ${updates.status}`;

            if (updates.status === 'resolved' || updates.status === 'closed') {
                ticket.resolvedAt = new Date();
            }
        }

        if (updates.priority) {
            ticket.priority = updates.priority;
            historyEntry.message = `Priority changed to ${updates.priority}`;
        }

        if (updates.assignedTo) {
            ticket.assignedTo = new Types.ObjectId(updates.assignedTo);
            historyEntry.message = `Assigned to user ${updates.assignedTo}`;
        }

        if (updates.slaBreached !== undefined) {
            ticket.slaBreached = updates.slaBreached;
        }

        ticket.history.push(historyEntry);
        await ticket.save();

        return ticket;
    }

    /**
     * Add a note/reply to the ticket
     */
    public async addNote(
        ticketId: string,
        companyId: string,
        message: string,
        actorId: string,
        action: 'internal_note' | 'reply' = 'internal_note'
    ): Promise<ISupportTicket> {
        const ticket = await this.getTicketById(ticketId, companyId);

        ticket.history.push({
            action: action,
            actor: new Types.ObjectId(actorId),
            message: message,
            timestamp: new Date()
        });

        if (action === 'reply') {
            ticket.lastReplyAt = new Date();
            // If ticket was resolved, reopen it on reply? Or just track last reply?
            // Usually if customer replies, we might want to ensure it's not closed.
            // But let's stick to basic logic for now.
        }

        await ticket.save();
        return ticket;
    }

    /**
     * Get SLA metrics for dashboard
     */
    public async getSLAMetrics(companyId: string) {
        const tickets = await SupportTicket.find({
            companyId: new Types.ObjectId(companyId)
        }).lean();

        const metrics = {
            total: tickets.length,
            open: 0,
            breached: 0,
            breachRate: 0,
            averageResolutionTime: 0,
            byPriority: {
                critical: { total: 0, breached: 0 },
                high: { total: 0, breached: 0 },
                medium: { total: 0, breached: 0 },
                low: { total: 0, breached: 0 }
            }
        };

        let totalResolutionTime = 0;
        let resolvedCount = 0;

        tickets.forEach(ticket => {
            metrics.byPriority[ticket.priority as Priority].total++;

            if (ticket.status === 'open' || ticket.status === 'in_progress') {
                metrics.open++;
            }

            const breached = isSLABreached(ticket.priority as Priority, ticket.createdAt, ticket.status);
            if (breached) {
                metrics.breached++;
                metrics.byPriority[ticket.priority as Priority].breached++;
            }

            if (ticket.resolvedAt && ticket.createdAt) {
                totalResolutionTime += ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
                resolvedCount++;
            }
        });

        metrics.breachRate = metrics.total > 0 ? Math.round((metrics.breached / metrics.total) * 100 * 100) / 100 : 0;
        metrics.averageResolutionTime = resolvedCount > 0 ? Math.round((totalResolutionTime / resolvedCount) / (1000 * 60)) : 0; // in minutes

        return metrics;
    }
}

export default SupportTicketService;
