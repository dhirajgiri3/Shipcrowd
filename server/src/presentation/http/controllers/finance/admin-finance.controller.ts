import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Company, WalletTransaction } from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import {
calculatePagination,
sendPaginated,
sendSuccess
} from '../../../../shared/utils/responseHelper';

/**
 * Get all wallet transactions (Admin View)
 * Can see transactions from ALL companies
 * GET /api/v1/admin/finance/transactions
 */
export const getAllTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
void auth;

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
        const skip = (page - 1) * limit;

        const filter: any = {};

        // Admin filters
        if (req.query.companyId) {
            filter.company = req.query.companyId;
        }

        if (req.query.type) {
            filter.type = req.query.type;
        }

        if (req.query.reason) {
            filter.reason = req.query.reason;
        }

        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate) {
                filter.createdAt.$gte = new Date(req.query.startDate as string);
            }
            if (req.query.endDate) {
                filter.createdAt.$lte = new Date(req.query.endDate as string);
            }
        }

        const [transactions, total] = await Promise.all([
            WalletTransaction.find(filter)
                .populate('company', 'name settings.notificationEmail settings.notificationPhone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WalletTransaction.countDocuments(filter),
        ]);

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, transactions, pagination, 'Transactions retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin transactions:', error);
        next(error);
    }
};

/**
 * Get all company wallets (Admin View)
 * GET /api/v1/admin/finance/wallets
 */
export const getAllWallets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
void auth;

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
        const skip = (page - 1) * limit;

        const filter: any = {};

        // Filter by low balance if requested
        if (req.query.lowBalance === 'true') {
            filter.$expr = { $lt: ['$wallet.balance', '$wallet.lowBalanceThreshold'] };
        }

        const [companies, total] = await Promise.all([
            Company.find(filter)
                .select('name settings.notificationEmail settings.notificationPhone wallet')
                .sort({ 'wallet.balance': 1 }) // Show lowest balances first
                .skip(skip)
                .limit(limit)
                .lean(),
            Company.countDocuments(filter),
        ]);

        // Transform to wallet-like objects
        const wallets = companies.map(c => ({
            _id: c._id,
            companyId: {
                _id: c._id,
                name: c.name,
                email: c.settings?.notificationEmail,
                phone: c.settings?.notificationPhone
            },
            balance: c.wallet?.balance || 0,
            currency: c.wallet?.currency || 'INR',
            lowBalanceThreshold: c.wallet?.lowBalanceThreshold || 500,
            autoRecharge: c.wallet?.autoRecharge,
            updatedAt: c.wallet?.lastUpdated || c.updatedAt
        }));

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, wallets, pagination, 'Wallets retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin wallets:', error);
        next(error);
    }
};

/**
 * Get specific company wallet (Admin View)
 * GET /api/v1/admin/finance/wallets/:companyId
 */
export const getWalletByCompanyId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
void auth;

        const { companyId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            throw new ValidationError('Invalid company ID format');
        }

        const company = await Company.findById(companyId)
            .select('name settings.notificationEmail settings.notificationPhone wallet')
            .lean();

        if (!company) {
            throw new NotFoundError('Company not found');
        }

        const wallet = {
            _id: company._id,
            companyId: {
                _id: company._id,
                name: company.name,
                email: company.settings?.notificationEmail,
                phone: company.settings?.notificationPhone
            },
            balance: company.wallet?.balance || 0,
            currency: company.wallet?.currency || 'INR',
            lowBalanceThreshold: company.wallet?.lowBalanceThreshold || 500,
            autoRecharge: company.wallet?.autoRecharge,
            updatedAt: company.wallet?.lastUpdated || company.updatedAt
        };

        // Get recent transactions for context
        const recentTransactions = await WalletTransaction.find({ company: companyId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        sendSuccess(res, { wallet, recentTransactions }, 'Wallet retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin wallet:', error);
        next(error);
    }
};

/**
 * Get wallet statistics (Admin View)
 * Aggregated stats across all companies
 * GET /api/v1/admin/finance/stats
 */
export const getFinanceStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
void auth;

        const dateRange = req.query.startDate && req.query.endDate
            ? {
                start: new Date(req.query.startDate as string),
                end: new Date(req.query.endDate as string),
            }
            : undefined;

        // Aggregate wallet balances from Company model
        const walletStats = await Company.aggregate([
            {
                $group: {
                    _id: null,
                    totalBalance: { $sum: '$wallet.balance' },
                    avgBalance: { $avg: '$wallet.balance' },
                    lowBalanceCount: {
                        $sum: {
                            $cond: [{ $lt: ['$wallet.balance', '$wallet.lowBalanceThreshold'] }, 1, 0]
                        }
                    },
                    totalWallets: { $sum: 1 }
                }
            }
        ]);

        // Transaction volume stats
        const transactionFilter: any = {};
        if (dateRange) {
            transactionFilter.createdAt = {
                $gte: dateRange.start,
                $lte: dateRange.end
            };
        }

        const transactionStats = await WalletTransaction.aggregate([
            { $match: transactionFilter },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        sendSuccess(res, {
            wallets: walletStats[0] || {
                totalBalance: 0,
                avgBalance: 0,
                lowBalanceCount: 0,
                totalWallets: 0
            },
            transactions: transactionStats
        }, 'Finance statistics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching admin finance stats:', error);
        next(error);
    }
};

export default {
    getAllTransactions,
    getAllWallets,
    getWalletByCompanyId,
    getFinanceStats,
};
