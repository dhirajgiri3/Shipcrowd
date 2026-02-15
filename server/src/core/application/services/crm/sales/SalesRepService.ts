import SalesRepresentative from '@/infrastructure/database/mongoose/models/crm/sales/sales-representative.model';
import SupportTicket from '@/infrastructure/database/mongoose/models/crm/support/support-ticket.model';
import User from '@/infrastructure/database/mongoose/models/iam/users/user.model';
import { NotFoundError, ValidationError } from '@/shared/errors/app.error';
import { FilterQuery, Types } from 'mongoose';

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

type CRMRepResponse = {
    id: string;
    name: string;
    email: string;
    phone: string;
    territory: string;
    status: 'active' | 'inactive';
    availabilityStatus: 'available' | 'busy' | 'offline';
    reportingTo?: string;
    bankDetails?: {
        accountNumber?: string;
        ifscCode?: string;
        accountHolderName: string;
        bankName?: string;
    };
    createdAt: Date;
    updatedAt: Date;
};

class SalesRepService {
    private static instance: SalesRepService;

    private constructor() { }

    public static getInstance(): SalesRepService {
        if (!SalesRepService.instance) {
            SalesRepService.instance = new SalesRepService();
        }
        return SalesRepService.instance;
    }

    private async ensureUser(data: CreateSalesRepDTO): Promise<Types.ObjectId> {
        if (data.userId) {
            return new Types.ObjectId(data.userId);
        }

        let user = await User.findOne({ email: data.email.toLowerCase(), isDeleted: false });
        if (!user) {
            user = await User.create({
                name: data.name,
                email: data.email.toLowerCase(),
                phone: data.phone,
                role: 'salesperson',
                companyId: new Types.ObjectId(data.companyId),
                isVerified: false,
            });
        }

        return user._id as Types.ObjectId;
    }

    private async generateEmployeeId(companyId: Types.ObjectId): Promise<string> {
        const base = `CRM-${Date.now().toString().slice(-8)}`;
        let suffix = 0;
        while (true) {
            const candidate = suffix === 0 ? base : `${base}-${suffix}`;
            const exists = await SalesRepresentative.exists({ company: companyId, employeeId: candidate });
            if (!exists) {
                return candidate;
            }
            suffix += 1;
        }
    }

    private mapToCRMShape(rep: any, includeBankDetails = false): CRMRepResponse {
        const user = rep.user || {};
        const territory = Array.isArray(rep.territory) && rep.territory.length > 0 ? rep.territory[0] : '';

        const mapped: CRMRepResponse = {
            id: String(rep._id),
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            territory,
            status: rep.status === 'inactive' ? 'inactive' : 'active',
            availabilityStatus: rep.status === 'active' ? 'available' : 'offline',
            reportingTo: rep.reportingTo ? String(rep.reportingTo) : undefined,
            createdAt: rep.createdAt,
            updatedAt: rep.updatedAt,
        };

        if (includeBankDetails && rep.bankDetails) {
            const decrypted = typeof rep.decryptBankDetails === 'function'
                ? rep.decryptBankDetails()
                : rep.bankDetails;
            mapped.bankDetails = {
                accountNumber: decrypted.accountNumber,
                ifscCode: decrypted.ifscCode,
                accountHolderName: decrypted.accountHolderName,
                bankName: decrypted.bankName,
            };
        } else if (rep.bankDetails) {
            mapped.bankDetails = {
                accountHolderName: rep.bankDetails.accountHolderName,
                bankName: rep.bankDetails.bankName,
            };
        }

        return mapped;
    }

    public async createSalesRep(data: CreateSalesRepDTO): Promise<CRMRepResponse> {
        const companyObjectId = new Types.ObjectId(data.companyId);
        const normalizedEmail = data.email.toLowerCase();

        const existing = await SalesRepresentative.findOne({
            company: companyObjectId,
        })
            .populate('user', 'email')
            .lean();

        if (existing && (existing as any).user?.email === normalizedEmail) {
            throw new ValidationError('Sales Representative with this email already exists');
        }

        const userId = await this.ensureUser(data);
        const employeeId = await this.generateEmployeeId(companyObjectId);

        const salesRep = await SalesRepresentative.create({
            user: userId,
            company: companyObjectId,
            employeeId,
            role: 'rep',
            territory: [data.territory],
            reportingTo: data.reportingTo ? new Types.ObjectId(data.reportingTo) : undefined,
            status: 'active',
            bankDetails: {
                accountNumber: data.bankDetails.accountNumber,
                ifscCode: data.bankDetails.ifscCode,
                accountHolderName: data.bankDetails.accountHolderName,
                bankName: 'UNKNOWN',
            },
        });

        await salesRep.populate('user', 'name email phone');
        return this.mapToCRMShape(salesRep, true);
    }

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

        const query: FilterQuery<any> = {
            company: new Types.ObjectId(companyId),
        };

        if (filters.territory) {
            query.territory = filters.territory;
        }
        if (filters.status) {
            query.status = filters.status;
        }

        const [reps, total] = await Promise.all([
            SalesRepresentative.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user', 'name email phone')
                .populate('reportingTo', 'employeeId')
                .exec(),
            SalesRepresentative.countDocuments(query),
        ]);

        return {
            reps: reps.map((rep) => this.mapToCRMShape(rep, false)),
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }

    public async getSalesRepById(id: string, companyId: string, includeBankDetails = false): Promise<CRMRepResponse> {
        const rep = await SalesRepresentative.findOne({
            _id: new Types.ObjectId(id),
            company: new Types.ObjectId(companyId),
        })
            .populate('user', 'name email phone')
            .populate('reportingTo', 'employeeId');

        if (!rep) {
            throw new NotFoundError('Sales Representative not found');
        }

        return this.mapToCRMShape(rep, includeBankDetails);
    }

    public async updateSalesRep(
        id: string,
        companyId: string,
        updates: UpdateSalesRepDTO
    ): Promise<CRMRepResponse> {
        const rep = await SalesRepresentative.findOne({
            _id: new Types.ObjectId(id),
            company: new Types.ObjectId(companyId),
        }).populate('user', 'name email phone');

        if (!rep) {
            throw new NotFoundError('Sales Representative not found');
        }

        if (updates.territory) {
            rep.territory = [updates.territory];
        }
        if (updates.status) {
            rep.status = updates.status;
        }
        if (updates.reportingTo) {
            rep.reportingTo = new Types.ObjectId(updates.reportingTo);
        }

        if (updates.bankDetails) {
            rep.bankDetails = {
                ...rep.bankDetails,
                accountNumber: updates.bankDetails.accountNumber,
                ifscCode: updates.bankDetails.ifscCode,
                accountHolderName: updates.bankDetails.accountHolderName,
            } as any;
        }

        const user = rep.user as any;
        if (user) {
            if (updates.name) user.name = updates.name;
            if (updates.email) user.email = updates.email.toLowerCase();
            if (updates.phone) user.phone = updates.phone;
            await user.save();
        }

        await rep.save();
        await rep.populate('user', 'name email phone');
        return this.mapToCRMShape(rep, true);
    }

    public async getPerformanceMetrics(id: string, companyId: string) {
        const repId = new Types.ObjectId(id);

        const rep = await SalesRepresentative.exists({
            _id: repId,
            company: new Types.ObjectId(companyId),
        });

        if (!rep) {
            throw new NotFoundError('Sales Representative not found');
        }

        const stats = await SupportTicket.aggregate([
            { $match: { assignedTo: repId } },
            {
                $group: {
                    _id: null,
                    totalTickets: { $sum: 1 },
                    resolvedTickets: {
                        $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] },
                    },
                    openTickets: {
                        $sum: { $cond: [{ $in: ['$status', ['open', 'in_progress']] }, 1, 0] },
                    },
                    avgResolutionTime: {
                        $avg: {
                            $cond: [
                                { $and: [{ $ne: ['$resolvedAt', null] }, { $ne: ['$createdAt', null] }] },
                                { $subtract: ['$resolvedAt', '$createdAt'] },
                                null,
                            ],
                        },
                    },
                },
            },
        ]);

        const metrics = stats[0] || {
            totalTickets: 0,
            resolvedTickets: 0,
            openTickets: 0,
            avgResolutionTime: 0,
        };

        metrics.avgResolutionTimeHours = metrics.avgResolutionTime
            ? Math.round((metrics.avgResolutionTime / (1000 * 60 * 60)) * 100) / 100
            : 0;
        delete metrics._id;

        return metrics;
    }
}

export default SalesRepService;
