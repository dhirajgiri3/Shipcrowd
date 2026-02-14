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
    search?: string;
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

        // Support comma-separated values for status, priority, category
        if (filters.status) {
            query.status = filters.status.includes(',')
                ? { $in: filters.status.split(',').map(s => s.trim()) }
                : filters.status;
        }
        if (filters.priority) {
            query.priority = filters.priority.includes(',')
                ? { $in: filters.priority.split(',').map(s => s.trim()) }
                : filters.priority;
        }
        if (filters.category) {
            query.category = filters.category.includes(',')
                ? { $in: filters.category.split(',').map(s => s.trim()) }
                : filters.category;
        }
        if (filters.assignedTo) query.assignedTo = new Types.ObjectId(filters.assignedTo);
        if (filters.relatedOrderId) query.relatedOrderId = filters.relatedOrderId;

        // Text search across ticket ID, subject, and description
        if (filters.search) {
            const searchRegex = { $regex: filters.search, $options: 'i' };
            query.$or = [
                { ticketId: searchRegex },
                { subject: searchRegex },
                { description: searchRegex },
            ];
        }

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
    public async getTicketById(ticketId: string, companyId: string): Promise<ISupportTicket & { notes?: any[] }> {
        const query: FilterQuery<ISupportTicket> = { companyId: new Types.ObjectId(companyId) };

        // Support querying by either _id or ticketId (TKT-XXXXXX)
        if (Types.ObjectId.isValid(ticketId)) {
            query._id = new Types.ObjectId(ticketId);
        } else {
            query.ticketId = ticketId;
        }

        const ticket = await SupportTicket.findOne(query)
            .populate('assignedTo', 'firstName lastName email')
            .populate('userId', 'firstName lastName email')
            .populate('history.actor', 'firstName lastName email');

        if (!ticket) {
            throw new NotFoundError('Support ticket not found');
        }

        // Auto-calculate SLA breach on fetch
        const breached = isSLABreached(ticket.priority as Priority, ticket.createdAt, ticket.status);
        if (breached !== ticket.slaBreached) {
            ticket.slaBreached = breached;
            await ticket.save();
        }

        // Transform to include notes array for frontend consumption
        const ticketObj: any = ticket.toObject();
        ticketObj.notes = ticketObj.history
            .filter((h: any) => h.action === 'reply' || h.action === 'internal_note')
            .map((h: any) => ({
                id: h._id?.toString(),
                userId: h.actor?._id?.toString() || h.actor?.toString(),
                userName: h.actor?.firstName
                    ? `${h.actor.firstName} ${h.actor.lastName || ''}`.trim()
                    : undefined,
                message: h.message,
                type: h.action as 'internal_note' | 'reply',
                createdAt: h.timestamp?.toISOString() || new Date().toISOString(),
            }));

        return ticketObj as ISupportTicket & { notes?: any[] };
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
        const query: FilterQuery<ISupportTicket> = { companyId: new Types.ObjectId(companyId) };

        if (Types.ObjectId.isValid(ticketId)) {
            query._id = new Types.ObjectId(ticketId);
        } else {
            query.ticketId = ticketId;
        }

        const ticket = await SupportTicket.findOne(query);
        if (!ticket) {
            throw new NotFoundError('Support ticket not found');
        }
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
    ): Promise<ISupportTicket & { notes?: any[] }> {
        const query: FilterQuery<ISupportTicket> = { companyId: new Types.ObjectId(companyId) };

        // Support querying by either _id or ticketId (TKT-XXXXXX)
        if (Types.ObjectId.isValid(ticketId)) {
            query._id = new Types.ObjectId(ticketId);
        } else {
            query.ticketId = ticketId;
        }

        const ticket = await SupportTicket.findOne(query);
        if (!ticket) {
            throw new NotFoundError('Support ticket not found');
        }

        ticket.history.push({
            action: action,
            actor: new Types.ObjectId(actorId),
            message: message,
            timestamp: new Date()
        });

        if (action === 'reply') {
            ticket.lastReplyAt = new Date();
        }

        await ticket.save();

        // Re-fetch with populated actors for response
        const populated = await SupportTicket.findById(ticket._id)
            .populate('assignedTo', 'firstName lastName email')
            .populate('userId', 'firstName lastName email')
            .populate('history.actor', 'firstName lastName email');

        const result: any = populated!.toObject();
        result.notes = result.history
            .filter((h: any) => h.action === 'reply' || h.action === 'internal_note')
            .map((h: any) => ({
                id: h._id?.toString(),
                userId: h.actor?._id?.toString() || h.actor?.toString(),
                userName: h.actor?.firstName
                    ? `${h.actor.firstName} ${h.actor.lastName || ''}`.trim()
                    : undefined,
                message: h.message,
                type: h.action,
                createdAt: h.timestamp?.toISOString(),
            }));

        return result as ISupportTicket & { notes?: any[] };
    }

    /**
     * Get SLA metrics for dashboard
     */
    public async getSLAMetrics(companyId: string) {
        const tickets = await SupportTicket.find({
            companyId: new Types.ObjectId(companyId)
        }).lean();

        let openCount = 0;
        let inProgressCount = 0;
        let resolvedCount = 0;
        let breachedCount = 0;
        let totalResolutionTime = 0;

        const byPriority = {
            critical: { total: 0, breached: 0 },
            high: { total: 0, breached: 0 },
            medium: { total: 0, breached: 0 },
            low: { total: 0, breached: 0 }
        };

        tickets.forEach(ticket => {
            // Count by priority
            byPriority[ticket.priority as Priority].total++;

            // Count by status
            if (ticket.status === 'open') openCount++;
            if (ticket.status === 'in_progress') inProgressCount++;
            if (ticket.status === 'resolved' || ticket.status === 'closed') resolvedCount++;

            // Check SLA breach
            const breached = isSLABreached(ticket.priority as Priority, ticket.createdAt, ticket.status);
            if (breached) {
                breachedCount++;
                byPriority[ticket.priority as Priority].breached++;
            }

            // Calculate resolution time
            if (ticket.resolvedAt && ticket.createdAt) {
                totalResolutionTime += ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
            }
        });

        const slaBreachRate = tickets.length > 0
            ? Math.round((breachedCount / tickets.length) * 100 * 100) / 100
            : 0;

        const avgResolutionTime = resolvedCount > 0
            ? Math.round((totalResolutionTime / resolvedCount) / (1000 * 60))
            : 0; // in minutes

        return {
            totalTickets: tickets.length,
            openTickets: openCount,
            inProgressTickets: inProgressCount,
            resolvedTickets: resolvedCount,
            avgResolutionTime,
            slaBreachRate,
            byPriority
        };
    }
}

export default SupportTicketService;
