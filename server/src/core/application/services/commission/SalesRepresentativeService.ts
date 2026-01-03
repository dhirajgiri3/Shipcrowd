/**
 * Sales Representative Service
 * 
 * Handles sales representative management including:
 * - CRUD operations
 * - Bank details encryption/decryption
 * - Performance metrics updates
 * - Territory management
 */

import mongoose from 'mongoose';
import SalesRepresentative, {
    ISalesRepresentative,
    SalesRepRole,
    SalesRepStatus,
} from '../../../../infrastructure/database/mongoose/models/sales-representative.model.js';
import User from '../../../../infrastructure/database/mongoose/models/user.model.js';
import AuditLog from '../../../../infrastructure/database/mongoose/models/audit-log.model.js';
import logger from '../../../../shared/logger/winston.logger.js';
import { AppError } from '../../../../shared/errors/index.js';

// DTOs
export interface CreateSalesRepDTO {
    userId?: string;
    email?: string;
    name?: string;
    phone?: string;
    employeeId: string;
    role?: SalesRepRole;
    territory: string[];
    reportingTo?: string;
    commissionRules?: string[];
    kpiTargets?: {
        monthlyRevenue?: number;
        monthlyOrders?: number;
        conversionRate?: number;
    };
    bankDetails: {
        accountNumber: string;
        ifscCode: string;
        accountHolderName: string;
        bankName: string;
        panNumber?: string;
    };
}

export interface UpdateSalesRepDTO {
    role?: SalesRepRole;
    territory?: string[];
    reportingTo?: string | null;
    commissionRules?: string[];
    status?: SalesRepStatus;
    kpiTargets?: {
        monthlyRevenue?: number;
        monthlyOrders?: number;
        conversionRate?: number;
    };
    bankDetails?: {
        accountNumber?: string;
        ifscCode?: string;
        accountHolderName?: string;
        bankName?: string;
        panNumber?: string;
    };
}

export interface ListSalesRepsFilters {
    status?: SalesRepStatus;
    role?: SalesRepRole;
    territory?: string;
}

export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default class SalesRepresentativeService {
    /**
     * Create a new sales representative
     */
    static async createSalesRep(
        repData: CreateSalesRepDTO,
        userId: string,
        companyId: string
    ): Promise<ISalesRepresentative> {
        try {
            // Check if employee ID already exists
            const existingRep = await SalesRepresentative.findOne({
                company: new mongoose.Types.ObjectId(companyId),
                employeeId: repData.employeeId,
            });

            if (existingRep) {
                throw new AppError('Employee ID already exists', 'BIZ_CONFLICT', 400);
            }

            let userIdToUse = repData.userId;

            // If no userId provided, create or find user
            if (!userIdToUse && repData.email) {
                let user = await User.findOne({ email: repData.email.toLowerCase() });

                if (!user) {
                    // Create new user
                    user = await User.create({
                        email: repData.email.toLowerCase(),
                        name: repData.name,
                        phone: repData.phone,
                        role: 'salesperson',
                        companyId: new mongoose.Types.ObjectId(companyId),
                        isVerified: false,
                    });
                    logger.info(`Created new user for sales rep: ${user.email}`);
                }

                userIdToUse = String(user._id);
            }

            if (!userIdToUse) {
                throw new AppError('Either userId or email must be provided', 'BAD_REQUEST', 400);
            }

            // Check if user is already a sales rep in this company
            const existingUserRep = await SalesRepresentative.findOne({
                user: new mongoose.Types.ObjectId(userIdToUse),
                company: new mongoose.Types.ObjectId(companyId),
            });

            if (existingUserRep) {
                throw new AppError('User is already a sales representative in this company', 'BIZ_CONFLICT', 400);
            }

            // Validate reportingTo if provided
            if (repData.reportingTo) {
                const manager = await SalesRepresentative.findOne({
                    _id: new mongoose.Types.ObjectId(repData.reportingTo),
                    company: new mongoose.Types.ObjectId(companyId),
                });

                if (!manager) {
                    throw new AppError('Reporting manager not found', 'NOT_FOUND', 404);
                }
            }

            // Create the sales representative
            const salesRep = new SalesRepresentative({
                user: new mongoose.Types.ObjectId(userIdToUse),
                company: new mongoose.Types.ObjectId(companyId),
                employeeId: repData.employeeId,
                role: repData.role || 'rep',
                territory: repData.territory,
                reportingTo: repData.reportingTo
                    ? new mongoose.Types.ObjectId(repData.reportingTo)
                    : undefined,
                commissionRules: repData.commissionRules?.map(id => new mongoose.Types.ObjectId(id)) || [],
                kpiTargets: repData.kpiTargets,
                bankDetails: repData.bankDetails,
            });

            // Bank details will be encrypted by pre-save hook
            await salesRep.save();

            // Create audit log
            await AuditLog.create({
                userId: new mongoose.Types.ObjectId(userId),
                action: 'sales_representative.created',
                resource: 'SalesRepresentative',
                resourceId: salesRep._id,
                company: new mongoose.Types.ObjectId(companyId),
                details: {
                    employeeId: salesRep.employeeId,
                    role: salesRep.role,
                    territory: salesRep.territory,
                },
            });

            logger.info(`Sales representative created: ${salesRep.employeeId} for company ${companyId}`);

            // Populate user for response
            await salesRep.populate('user', 'name email phone');

            return salesRep;
        } catch (error) {
            logger.error('Error creating sales representative:', error);
            throw error;
        }
    }

    /**
     * Update a sales representative
     */
    static async updateSalesRep(
        repId: string,
        updates: UpdateSalesRepDTO,
        userId: string,
        companyId: string
    ): Promise<ISalesRepresentative> {
        try {
            const salesRep = await SalesRepresentative.findOne({
                _id: new mongoose.Types.ObjectId(repId),
                company: new mongoose.Types.ObjectId(companyId),
            });

            if (!salesRep) {
                throw new AppError('Sales representative not found', 'NOT_FOUND', 404);
            }

            // Validate reportingTo if changing
            if (updates.reportingTo !== undefined) {
                if (updates.reportingTo === null) {
                    salesRep.reportingTo = undefined;
                } else if (updates.reportingTo !== repId) {
                    const manager = await SalesRepresentative.findOne({
                        _id: new mongoose.Types.ObjectId(updates.reportingTo),
                        company: new mongoose.Types.ObjectId(companyId),
                    });

                    if (!manager) {
                        throw new AppError('Reporting manager not found', 'NOT_FOUND', 404);
                    }

                    salesRep.reportingTo = new mongoose.Types.ObjectId(updates.reportingTo);
                } else {
                    throw new AppError('Cannot set self as reporting manager', 'BAD_REQUEST', 400);
                }
            }

            // Apply other updates
            if (updates.role) salesRep.role = updates.role;
            if (updates.territory) salesRep.territory = updates.territory;
            if (updates.status) salesRep.status = updates.status;
            if (updates.kpiTargets) salesRep.kpiTargets = updates.kpiTargets;
            if (updates.commissionRules) {
                salesRep.commissionRules = updates.commissionRules.map(
                    id => new mongoose.Types.ObjectId(id)
                ) as any;
            }

            // Handle bank details update (will be encrypted by pre-save hook)
            if (updates.bankDetails) {
                salesRep.bankDetails = {
                    ...salesRep.bankDetails,
                    ...updates.bankDetails,
                };
            }

            await salesRep.save();

            // Create audit log
            await AuditLog.create({
                userId: new mongoose.Types.ObjectId(userId),
                action: 'sales_representative.updated',
                resource: 'SalesRepresentative',
                resourceId: salesRep._id,
                company: new mongoose.Types.ObjectId(companyId),
                changes: updates,
            });

            logger.info(`Sales representative updated: ${salesRep.employeeId} by user ${userId}`);

            await salesRep.populate('user', 'name email phone');
            return salesRep;
        } catch (error) {
            logger.error('Error updating sales representative:', error);
            throw error;
        }
    }

    /**
     * Delete (deactivate) a sales representative
     */
    static async deleteSalesRep(
        repId: string,
        userId: string,
        companyId: string
    ): Promise<void> {
        try {
            const salesRep = await SalesRepresentative.findOne({
                _id: new mongoose.Types.ObjectId(repId),
                company: new mongoose.Types.ObjectId(companyId),
            });

            if (!salesRep) {
                throw new AppError('Sales representative not found', 'NOT_FOUND', 404);
            }

            // Check for pending commissions
            const CommissionTransaction = mongoose.model('CommissionTransaction');
            const pendingCount = await CommissionTransaction.countDocuments({
                salesRepresentative: new mongoose.Types.ObjectId(repId),
                status: { $in: ['pending', 'approved'] },
            });

            if (pendingCount > 0) {
                throw new AppError(
                    `Cannot deactivate: ${pendingCount} pending/approved commissions exist`,
                    'BAD_REQUEST',
                    400
                );
            }

            // Soft delete - set status to inactive
            salesRep.status = 'inactive';
            await salesRep.save();

            // Create audit log
            await AuditLog.create({
                userId: new mongoose.Types.ObjectId(userId),
                action: 'sales_representative.deactivated',
                resource: 'SalesRepresentative',
                resourceId: salesRep._id,
                company: new mongoose.Types.ObjectId(companyId),
            });

            logger.info(`Sales representative deactivated: ${salesRep.employeeId}`);
        } catch (error) {
            logger.error('Error deactivating sales representative:', error);
            throw error;
        }
    }

    /**
     * Get a sales representative by ID
     */
    static async getSalesRep(
        repId: string,
        companyId: string,
        includeBankDetails: boolean = false
    ): Promise<ISalesRepresentative & { decryptedBankDetails?: any }> {
        try {
            const salesRep = await SalesRepresentative.findOne({
                _id: new mongoose.Types.ObjectId(repId),
                company: new mongoose.Types.ObjectId(companyId),
            })
                .populate('user', 'name email phone')
                .populate('reportingTo', 'employeeId user')
                .populate('commissionRules', 'name ruleType percentageRate');

            if (!salesRep) {
                throw new AppError('Sales representative not found', 'NOT_FOUND', 404);
            }

            // Decrypt bank details if requested and authorized
            if (includeBankDetails) {
                const decryptedBankDetails = salesRep.decryptBankDetails();
                return { ...salesRep.toObject(), decryptedBankDetails } as any;
            }

            return salesRep;
        } catch (error) {
            logger.error('Error getting sales representative:', error);
            throw error;
        }
    }

    /**
     * List sales representatives with filters and pagination
     */
    static async listSalesReps(
        companyId: string,
        filters: ListSalesRepsFilters,
        pagination: PaginationParams
    ): Promise<PaginatedResult<ISalesRepresentative>> {
        try {
            const query: any = {
                company: new mongoose.Types.ObjectId(companyId),
            };

            if (filters.status) query.status = filters.status;
            if (filters.role) query.role = filters.role;
            if (filters.territory) query.territory = filters.territory;

            // Build sort
            const sortMap: Record<string, string> = {
                onboardingDate: 'onboardingDate',
                employeeId: 'employeeId',
                totalCommission: 'performanceMetrics.totalCommission',
            };
            const sortField = sortMap[pagination.sortBy || 'onboardingDate'] || 'onboardingDate';
            const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

            const [salesReps, total] = await Promise.all([
                SalesRepresentative.find(query)
                    .sort({ [sortField]: sortOrder })
                    .skip((pagination.page - 1) * pagination.limit)
                    .limit(pagination.limit)
                    .populate('user', 'name email phone')
                    .populate('reportingTo', 'employeeId')
                    .lean(),
                SalesRepresentative.countDocuments(query),
            ]);

            return {
                data: salesReps as ISalesRepresentative[],
                total,
                page: pagination.page,
                limit: pagination.limit,
                totalPages: Math.ceil(total / pagination.limit),
            };
        } catch (error) {
            logger.error('Error listing sales representatives:', error);
            throw error;
        }
    }

    /**
     * Update cached performance metrics for a sales representative
     */
    static async updatePerformanceMetrics(
        repId: string,
        companyId: string
    ): Promise<void> {
        try {
            const salesRep = await SalesRepresentative.findOne({
                _id: new mongoose.Types.ObjectId(repId),
                company: new mongoose.Types.ObjectId(companyId),
            });

            if (!salesRep) {
                throw new AppError('Sales representative not found', 'NOT_FOUND', 404);
            }

            await salesRep.updatePerformanceMetrics();
            logger.info(`Performance metrics updated for sales rep: ${salesRep.employeeId}`);
        } catch (error) {
            logger.error('Error updating performance metrics:', error);
            throw error;
        }
    }

    /**
     * Assign territories to a sales representative
     */
    static async assignTerritory(
        repId: string,
        territories: string[],
        userId: string,
        companyId: string
    ): Promise<ISalesRepresentative> {
        try {
            const salesRep = await SalesRepresentative.findOne({
                _id: new mongoose.Types.ObjectId(repId),
                company: new mongoose.Types.ObjectId(companyId),
            });

            if (!salesRep) {
                throw new AppError('Sales representative not found', 'NOT_FOUND', 404);
            }

            const previousTerritories = [...salesRep.territory];
            salesRep.territory = territories;
            await salesRep.save();

            // Create audit log
            await AuditLog.create({
                userId: new mongoose.Types.ObjectId(userId),
                action: 'sales_representative.territory_assigned',
                resource: 'SalesRepresentative',
                resourceId: salesRep._id,
                company: new mongoose.Types.ObjectId(companyId),
                changes: {
                    from: previousTerritories,
                    to: territories,
                },
            });

            logger.info(`Territories updated for sales rep: ${salesRep.employeeId}`);

            await salesRep.populate('user', 'name email phone');
            return salesRep;
        } catch (error) {
            logger.error('Error assigning territories:', error);
            throw error;
        }
    }

    /**
     * Get team hierarchy for a manager
     */
    static async getTeamHierarchy(
        managerId: string,
        companyId: string
    ): Promise<ISalesRepresentative[]> {
        try {
            const team = await SalesRepresentative.findTeamMembers(managerId);

            // Filter by company for safety
            return team.filter(
                member => member.company.toString() === companyId
            );
        } catch (error) {
            logger.error('Error getting team hierarchy:', error);
            throw error;
        }
    }
}
