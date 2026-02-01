import Lead, { ILead } from '@/infrastructure/database/mongoose/models/crm/leads/lead.model';
import SalesRepresentative from '@/infrastructure/database/mongoose/models/crm/sales/sales-rep.model';
import { AppError, NotFoundError, ConflictError } from '@/shared/errors';
import mongoose from 'mongoose';

export class LeadService {
    /**
     * Create a new lead
     */
    async createLead(data: Partial<ILead>): Promise<ILead> {
        try {
            // Auto-assign logic based on territory if not provided
            if (!data.salesRepresentative && data.territory) {
                // Find a rep in this territory
                const rep = await SalesRepresentative.findOne({
                    territory: data.territory,
                    availabilityStatus: 'available' // Assuming field
                });

                if (rep) {
                    data.salesRepresentative = rep._id;
                }
            }

            // Initial lead score calculation
            data.score = this.calculateInitialScore(data);

            const lead = await Lead.create(data);
            return lead;
        } catch (error: any) {
            throw new AppError('Failed to create lead', 'SYS_INTERNAL_ERROR', 500, false, error);
        }
    }

    /**
     * Update a lead
     */
    async updateLead(id: string, data: Partial<ILead>): Promise<ILead> {
        const lead = await Lead.findByIdAndUpdate(id, data, { new: true });
        if (!lead) {
            throw new NotFoundError('Lead not found');
        }
        return lead;
    }

    /**
     * Get leads with filtering and pagination
     */
    async getLeads(filters: any, page: number = 1, limit: number = 20): Promise<{ leads: ILead[], total: number, pages: number }> {
        const query: any = {};

        if (filters.status) query.status = filters.status;
        if (filters.territory) query.territory = filters.territory;
        if (filters.source) query.source = filters.source;
        if (filters.assignedTo) query.assignedTo = new mongoose.Types.ObjectId(filters.assignedTo as string);

        const total = await Lead.countDocuments(query);
        const leads = await Lead.find(query)
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return {
            leads,
            total,
            pages: Math.ceil(total / limit)
        };
    }

    /**
     * Convert lead to won/order
     */
    async convertLead(id: string, orderId: string): Promise<ILead> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const lead = await Lead.findById(id).session(session);
            if (!lead) {
                throw new NotFoundError('Lead not found');
            }

            if (lead.status === 'won') {
                throw new ConflictError('Lead already converted');
            }

            lead.status = 'won';
            lead.convertedToOrder = new mongoose.Types.ObjectId(orderId);
            lead.conversionDate = new Date();
            lead.actualValue = 1000; // Placeholder or fetch order value

            await lead.save({ session });
            await session.commitTransaction();
            return lead;
        } catch (error: any) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Calculate initial lead score
     */
    private calculateInitialScore(data: Partial<ILead>): number {
        let score = 0;

        // Source scoring
        if (data.source === 'referral') score += 20;
        if (data.source === 'website') score += 10;

        // Completeness scoring
        if (data.email && data.phone) score += 10;
        if (data.companyName) score += 5;

        return score;
    }

    /**
     * Get funnel metrics
     */
    async getFunnelMetrics(dateFrom?: Date): Promise<any> {
        const match: any = {};
        if (dateFrom) {
            match.createdAt = { $gte: dateFrom };
        }

        const metrics = await Lead.aggregate([
            { $match: match },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        return metrics.reduce((acc: any, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});
    }
}
