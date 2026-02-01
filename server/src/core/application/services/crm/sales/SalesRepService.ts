import { FilterQuery, Types } from 'mongoose';
import SalesRepresentative, { ISalesRep } from '@/infrastructure/database/mongoose/models/crm/sales/sales-rep.model';
import SupportTicket from '@/infrastructure/database/mongoose/models/crm/support/support-ticket.model';
import { NotFoundError, ValidationError } from '@/shared/errors/app.error';
// import { encrypt, decrypt } from '@/shared/utils/encryption'; // TODO: Ensure this utility exists or create it

// Mock encryption for now if utility doesn't exist, to be replaced with real one
const encrypt = (text: string) => `enc_${text}`;
const decrypt = (text: string) => text.replace('enc_', '');

interface CreateSalesRepDTO {
    companyId: string;
    userId?: string;
    name: string;
    email: string;
    phone: string;
    territory: string;
    reportingTo?: string;
    bankDetails: {
        accountNumber: string;
        ifscCode: string;
        accountHolderName: string;
    };
}

interface UpdateSalesRepDTO {
    name?: string;
    email?: string;
    phone?: string;
    territory?: string;
    status?: 'active' | 'inactive';
    availabilityStatus?: 'available' | 'busy' | 'offline';
    reportingTo?: string;
    bankDetails?: {
        accountNumber: string;
        ifscCode: string;
        accountHolderName: string;
    };
}

class SalesRepService {
    private static instance: SalesRepService;

    private constructor() { }

    public static getInstance(): SalesRepService {
        if (!SalesRepService.instance) {
            SalesRepService.instance = new SalesRepService();
        }
        return SalesRepService.instance;
    }

    /**
     * Create a new Sales Representative
     */
    public async createSalesRep(data: CreateSalesRepDTO): Promise<ISalesRep> {
        // Check for existing rep with same email in company? 
        // Or globally unique email? Assuming company scoped uniqueness for now, but usually email is unique.
        const existing = await SalesRepresentative.findOne({
            companyId: new Types.ObjectId(data.companyId),
            email: data.email
        });

        if (existing) {
            throw new ValidationError('Sales Representative with this email already exists');
        }

        const salesRep = await SalesRepresentative.create({
            companyId: new Types.ObjectId(data.companyId),
            userId: data.userId ? new Types.ObjectId(data.userId) : undefined,
            name: data.name,
            email: data.email,
            phone: data.phone,
            territory: data.territory,
            reportingTo: data.reportingTo ? new Types.ObjectId(data.reportingTo) : undefined,
            bankDetails: {
                accountNumber: encrypt(data.bankDetails.accountNumber),
                ifscCode: encrypt(data.bankDetails.ifscCode),
                accountHolderName: data.bankDetails.accountHolderName
            }
        });

        return salesRep;
    }

    /**
     * Get Sales Reps with filtering
     */
    public async getSalesReps(
        companyId: string,
        filters: {
            territory?: string;
            status?: string;
            page?: number;
            limit?: number
        }
    ) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;

        const query: FilterQuery<ISalesRep> = {
            companyId: new Types.ObjectId(companyId)
        };

        if (filters.territory) query.territory = filters.territory;
        if (filters.status) query.status = filters.status;

        const [reps, total] = await Promise.all([
            SalesRepresentative.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('reportingTo', 'name email')
                .lean(),
            SalesRepresentative.countDocuments(query)
        ]);

        return {
            reps,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
    }

    /**
     * Get Sales Rep by ID
     */
    public async getSalesRepById(id: string, companyId: string, includeBankDetails = false): Promise<ISalesRep> {
        const query = SalesRepresentative.findOne({
            _id: new Types.ObjectId(id),
            companyId: new Types.ObjectId(companyId)
        }).populate('reportingTo', 'name email');

        if (includeBankDetails) {
            query.select('+bankDetails.accountNumber +bankDetails.ifscCode');
        }

        const rep = await query.exec();

        if (!rep) {
            throw new NotFoundError('Sales Representative not found');
        }

        if (includeBankDetails && rep.bankDetails) {
            // Decrypt on retrieval for authorized viewers
            // Note: We need to cast to any or define the type as potentially decrypted because the interface says string
            // but we want to return the plain text.
            const decryptedRep = rep.toObject();
            if (decryptedRep.bankDetails) {
                decryptedRep.bankDetails.accountNumber = decrypt(rep.bankDetails.accountNumber);
                decryptedRep.bankDetails.ifscCode = decrypt(rep.bankDetails.ifscCode);
            }
            return decryptedRep as any;
        }

        return rep;
    }

    /**
     * Update Sales Rep
     */
    public async updateSalesRep(
        id: string,
        companyId: string,
        updates: UpdateSalesRepDTO
    ): Promise<ISalesRep> {
        const rep = await SalesRepresentative.findOne({
            _id: new Types.ObjectId(id),
            companyId: new Types.ObjectId(companyId)
        });

        if (!rep) {
            throw new NotFoundError('Sales Representative not found');
        }

        if (updates.name) rep.name = updates.name;
        if (updates.email) rep.email = updates.email;
        if (updates.phone) rep.phone = updates.phone;
        if (updates.territory) rep.territory = updates.territory;
        if (updates.status) rep.status = updates.status;
        if (updates.availabilityStatus) rep.availabilityStatus = updates.availabilityStatus;
        if (updates.reportingTo) rep.reportingTo = new Types.ObjectId(updates.reportingTo);

        if (updates.bankDetails) {
            rep.bankDetails = {
                accountNumber: encrypt(updates.bankDetails.accountNumber),
                ifscCode: encrypt(updates.bankDetails.ifscCode),
                accountHolderName: updates.bankDetails.accountHolderName
            };
        }

        await rep.save();
        return rep;
    }

    /**
     * Get Performance Metrics
     */
    public async getPerformanceMetrics(id: string, companyId: string) {
        const repId = new Types.ObjectId(id);

        // Ensure rep exists
        const rep = await SalesRepresentative.exists({ _id: repId, companyId: new Types.ObjectId(companyId) });
        if (!rep) {
            throw new NotFoundError('Sales Representative not found');
        }

        // Aggregate tickets
        const stats = await SupportTicket.aggregate([
            { $match: { assignedTo: repId } },
            {
                $group: {
                    _id: null,
                    totalTickets: { $sum: 1 },
                    resolvedTickets: {
                        $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] }
                    },
                    openTickets: {
                        $sum: { $cond: [{ $in: ['$status', ['open', 'in_progress']] }, 1, 0] }
                    },
                    avgResolutionTime: {
                        $avg: {
                            $cond: [
                                { $and: [{ $ne: ['$resolvedAt', null] }, { $ne: ['$createdAt', null] }] },
                                { $subtract: ['$resolvedAt', '$createdAt'] },
                                null
                            ]
                        }
                    }
                }
            }
        ]);

        const metrics = stats[0] || {
            totalTickets: 0,
            resolvedTickets: 0,
            openTickets: 0,
            avgResolutionTime: 0
        };

        // Convert avgResolutionTime from ms to hours
        metrics.avgResolutionTimeHours = metrics.avgResolutionTime ? Math.round(metrics.avgResolutionTime / (1000 * 60 * 60) * 100) / 100 : 0;
        delete metrics._id;

        return metrics;
    }
}

export default SalesRepService;
