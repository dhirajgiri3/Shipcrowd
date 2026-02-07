import { Request, Response, NextFunction } from 'express';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import { Order, Shipment, User } from '../../../../infrastructure/database/mongoose/models';
import Dispute from '../../../../infrastructure/database/mongoose/models/crm/disputes/dispute.model';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import mongoose from 'mongoose';
import logger from '../../../../shared/logger/winston.logger';
import { Parser } from 'json2csv';

/**
 * Seller Health Controller
 * Aggregates metrics to show seller performance Scorecard using optimized aggregations.
 */

// Helper to calculate health score based on metrics
const calculateHealthScore = (metrics: any) => {
    let score = 100;

    // RTO Impact (Heavy penalty)
    if (metrics.rtoRate > 30) score -= 30;
    else if (metrics.rtoRate > 20) score -= 20;
    else if (metrics.rtoRate > 10) score -= 10;

    // Dispute Impact
    if (metrics.unresolvedDisputes > 0) score -= (metrics.unresolvedDisputes * 5);

    // Order Volume Bonus (Small bonus for consistency)
    if (metrics.orderVolume > 100) score += 5;

    // Cap score
    return Math.max(0, Math.min(100, Math.round(score)));
};

export const getSellerHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { isAdmin, companyId: userCompanyId } = guardChecks(req, { requireCompany: false });

        // Extract query params
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string || '').trim();
        const status = req.query.status as string || 'all';
        const sortBy = req.query.sortBy as string || 'healthScore';
        const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;

        const skip = (page - 1) * limit;

        // 1. Fetch Candidate Sellers
        const sellerPipeline: any[] = [
            { $match: { role: 'seller', companyId: { $ne: null } } },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'companyId',
                    foreignField: '_id',
                    as: 'company'
                }
            },
            { $unwind: '$company' },
            {
                $project: {
                    _id: 1,
                    email: 1,
                    companyName: '$company.name',
                    companyId: '$company._id'
                }
            }
        ];

        if (search) {
            const regex = new RegExp(search, 'i');
            sellerPipeline.push({
                $match: {
                    $or: [
                        { email: regex },
                        { companyName: regex }
                    ]
                }
            });
        }

        if (!isAdmin && userCompanyId) {
            sellerPipeline.unshift({ $match: { _id: new mongoose.Types.ObjectId((req.user as any)._id) } });
        }

        const candidateSellers = await User.aggregate(sellerPipeline);
        const companyIds = candidateSellers.map(s => s.companyId);

        if (companyIds.length === 0) {
            sendSuccess(res, {
                sellers: [],
                pagination: { total: 0, page, limit, totalPages: 0 },
                summary: { total: 0, byStatus: {}, avgHealthScore: 0 }
            });
            return;
        }

        // 2. Parallel Aggregations for Real Data
        const [orderStats, shipmentStats, disputeStats] = await Promise.all([
            // Order Metrics: Volume & Revenue
            Order.aggregate([
                { $match: { companyId: { $in: companyIds } } },
                {
                    $group: {
                        _id: '$companyId',
                        orderVolume: { $sum: 1 },
                        revenue: { $sum: '$totals.total' }
                    }
                }
            ]),
            // Shipment Metrics: RTO & NDR
            Shipment.aggregate([
                { $match: { companyId: { $in: companyIds } } },
                {
                    $group: {
                        _id: '$companyId',
                        totalShipments: { $sum: 1 },
                        rtoCount: {
                            $sum: {
                                $cond: [{ $in: ['$status', ['rto', 'returned']] }, 1, 0]
                            }
                        }, // Check status or rtoDetails
                        ndrCount: {
                            $sum: {
                                $cond: [{ $gt: ['$ndrDetails.ndrAttempts', 0] }, 1, 0]
                            }
                        }
                    }
                }
            ]),
            // Dispute Metrics: Unresolved
            Dispute.aggregate([
                {
                    $match: {
                        companyId: { $in: companyIds },
                        status: { $in: ['open', 'investigation', 'decision'] }
                    }
                },
                {
                    $group: {
                        _id: '$companyId',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        // 3. Map Results
        const statsMap = new Map();

        // Initialize map
        companyIds.forEach(id => {
            statsMap.set(id.toString(), {
                orderVolume: 0,
                revenue: 0,
                totalShipments: 0,
                rtoCount: 0,
                ndrCount: 0,
                unresolvedDisputes: 0
            });
        });

        // Fill data
        orderStats.forEach(stat => {
            const curr = statsMap.get(stat._id.toString()) || {};
            statsMap.set(stat._id.toString(), { ...curr, orderVolume: stat.orderVolume, revenue: stat.revenue });
        });
        shipmentStats.forEach(stat => {
            const curr = statsMap.get(stat._id.toString()) || {};
            statsMap.set(stat._id.toString(), { ...curr, totalShipments: stat.totalShipments, rtoCount: stat.rtoCount, ndrCount: stat.ndrCount });
        });
        disputeStats.forEach(stat => {
            const curr = statsMap.get(stat._id.toString()) || {};
            statsMap.set(stat._id.toString(), { ...curr, unresolvedDisputes: stat.count });
        });

        // 4. Construct Final Array with Scores
        let resultSellers = candidateSellers.map(seller => {
            const stats = statsMap.get(seller.companyId.toString());

            const rtoRate = stats.totalShipments > 0 ? (stats.rtoCount / stats.totalShipments) * 100 : 0;
            const ndrRate = stats.totalShipments > 0 ? (stats.ndrCount / stats.totalShipments) * 100 : 0;

            const healthScore = calculateHealthScore({ ...stats, rtoRate });
            const sellerStatus = healthScore > 80 ? 'excellent' : healthScore > 50 ? 'warning' : 'critical';

            return {
                sellerId: seller._id.toString(),
                companyName: seller.companyName,
                email: seller.email,
                healthScore,
                status: sellerStatus,
                metrics: {
                    revenue: stats.revenue,
                    revenueGrowth: 0, // Requires historical data comparison (out of scope for quick fix)
                    orderVolume: stats.orderVolume,
                    volumeGrowth: 0,
                    rtoRate: parseFloat(rtoRate.toFixed(2)),
                    ndrRate: parseFloat(ndrRate.toFixed(2)),
                    avgDeliveryTime: 0, // Requires complex diff calculation
                    customerSatisfaction: 4.5, // Placeholder
                    unresolvedDisputes: stats.unresolvedDisputes
                },
                lastUpdated: new Date().toISOString()
            };
        });

        // 5. Apply Status Filter
        if (status !== 'all') {
            resultSellers = resultSellers.filter(s => s.status === status);
        }

        // 6. Apply Sorting
        resultSellers.sort((a: any, b: any) => {
            let valA = a[sortBy];
            let valB = b[sortBy];

            if (sortBy === 'orderVolume') valA = a.metrics.orderVolume;
            if (sortBy === 'revenue') valA = a.metrics.revenue;

            if (sortBy === 'orderVolume') valB = b.metrics.orderVolume;
            if (sortBy === 'revenue') valB = b.metrics.revenue;

            if (valA < valB) return -1 * sortOrder;
            if (valA > valB) return 1 * sortOrder;
            return 0;
        });

        // 7. Pagination & Summary
        const total = resultSellers.length;
        const totalPages = Math.ceil(total / limit);
        const paginatedSellers = resultSellers.slice(skip, skip + limit);

        const byStatus = {
            excellent: resultSellers.filter(s => s.status === 'excellent').length,
            good: resultSellers.filter(s => s.status === 'good').length,
            warning: resultSellers.filter(s => s.status === 'warning').length,
            critical: resultSellers.filter(s => s.status === 'critical').length,
        };
        const avgHealthScore = total > 0
            ? resultSellers.reduce((acc, curr) => acc + curr.healthScore, 0) / total
            : 0;

        const responseData = {
            sellers: paginatedSellers,
            pagination: { total, page, limit, totalPages },
            summary: { total, byStatus, avgHealthScore }
        };

        sendSuccess(res, responseData, 'Seller health metrics retrieved successfully');

    } catch (error) {
        logger.error('Error calculating seller health:', error);
        next(error);
    }
};

export const exportSellers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { isAdmin } = guardChecks(req, { requireCompany: false });

        const search = (req.query.search as string || '').trim();
        const status = req.query.status as string || 'all';
        const sortBy = req.query.sortBy as string || 'healthScore';
        const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;

        // Reuse Logic: Fetch Candidates
        const sellerPipeline: any[] = [
            { $match: { role: 'seller', companyId: { $ne: null } } },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'companyId',
                    foreignField: '_id',
                    as: 'company'
                }
            },
            { $unwind: '$company' },
            {
                $project: {
                    _id: 1,
                    email: 1,
                    companyName: '$company.name',
                    companyId: '$company._id'
                }
            }
        ];

        if (search) {
            const regex = new RegExp(search, 'i');
            sellerPipeline.push({
                $match: {
                    $or: [
                        { email: regex },
                        { companyName: regex }
                    ]
                }
            });
        }

        const candidateSellers = await User.aggregate(sellerPipeline);
        const companyIds = candidateSellers.map(s => s.companyId);

        if (companyIds.length === 0) {
            // Empty CSV
            res.header('Content-Type', 'text/csv');
            res.attachment(`sellers_export_${new Date().toISOString().split('T')[0]}.csv`);
            res.send('');
            return;
        }

        // Parallel Aggregations (Identical to main controller)
        const [orderStats, shipmentStats, disputeStats] = await Promise.all([
            Order.aggregate([
                { $match: { companyId: { $in: companyIds } } },
                { $group: { _id: '$companyId', orderVolume: { $sum: 1 }, revenue: { $sum: '$totals.total' } } }
            ]),
            Shipment.aggregate([
                { $match: { companyId: { $in: companyIds } } },
                {
                    $group: {
                        _id: '$companyId',
                        totalShipments: { $sum: 1 },
                        rtoCount: { $sum: { $cond: [{ $in: ['$status', ['rto', 'returned']] }, 1, 0] } },
                        ndrCount: { $sum: { $cond: [{ $gt: ['$ndrDetails.ndrAttempts', 0] }, 1, 0] } }
                    }
                }
            ]),
            Dispute.aggregate([
                { $match: { companyId: { $in: companyIds }, status: { $in: ['open', 'investigation', 'decision'] } } },
                { $group: { _id: '$companyId', count: { $sum: 1 } } }
            ])
        ]);

        // Map Results
        const statsMap = new Map();
        companyIds.forEach(id => statsMap.set(id.toString(), {
            orderVolume: 0, revenue: 0, totalShipments: 0, rtoCount: 0, ndrCount: 0, unresolvedDisputes: 0
        }));

        orderStats.forEach(stat => {
            const curr = statsMap.get(stat._id.toString()) || {};
            statsMap.set(stat._id.toString(), { ...curr, orderVolume: stat.orderVolume, revenue: stat.revenue });
        });
        shipmentStats.forEach(stat => {
            const curr = statsMap.get(stat._id.toString()) || {};
            statsMap.set(stat._id.toString(), { ...curr, totalShipments: stat.totalShipments, rtoCount: stat.rtoCount, ndrCount: stat.ndrCount });
        });
        disputeStats.forEach(stat => {
            const curr = statsMap.get(stat._id.toString()) || {};
            statsMap.set(stat._id.toString(), { ...curr, unresolvedDisputes: stat.count });
        });

        // Build Final List
        let resultSellers = candidateSellers.map(seller => {
            const stats = statsMap.get(seller.companyId.toString());
            const rtoRate = stats.totalShipments > 0 ? (stats.rtoCount / stats.totalShipments) * 100 : 0;
            const healthScore = calculateHealthScore({ ...stats, rtoRate });
            const sellerStatus = healthScore > 80 ? 'excellent' : healthScore > 50 ? 'warning' : 'critical';

            return {
                companyName: seller.companyName,
                email: seller.email,
                healthScore,
                status: sellerStatus,
                metrics: {
                    revenue: stats.revenue,
                    orderVolume: stats.orderVolume,
                    rtoRate: parseFloat(rtoRate.toFixed(2)),
                    ndrRate: stats.totalShipments > 0 ? parseFloat(((stats.ndrCount / stats.totalShipments) * 100).toFixed(2)) : 0,
                    avgDeliveryTime: 0,
                    lastUpdated: new Date().toISOString()
                }
            };
        });

        if (status !== 'all') {
            resultSellers = resultSellers.filter(s => s.status === status);
        }

        resultSellers.sort((a: any, b: any) => {
            let valA = a[sortBy];
            let valB = b[sortBy];
            if (sortBy === 'orderVolume') valA = a.metrics.orderVolume;
            if (sortBy === 'revenue') valA = a.metrics.revenue;
            if (sortBy === 'orderVolume') valB = b.metrics.orderVolume;
            if (sortBy === 'revenue') valB = b.metrics.revenue;

            if (valA < valB) return -1 * sortOrder;
            if (valA > valB) return 1 * sortOrder;
            return 0;
        });

        const csvData = resultSellers.map(s => ({
            'Company Name': s.companyName,
            'Email': s.email,
            'Status': s.status.toUpperCase(),
            'Health Score': s.healthScore,
            'Revenue': s.metrics.revenue,
            'Order Volume': s.metrics.orderVolume,
            'RTO Rate (%)': s.metrics.rtoRate,
            'NDR Rate (%)': s.metrics.ndrRate,
            'Avg Delivery Time': s.metrics.avgDeliveryTime,
            'Last Updated': s.metrics.lastUpdated
        }));

        const fields = [
            'Company Name', 'Email', 'Status', 'Health Score', 'Revenue',
            'Order Volume', 'RTO Rate (%)', 'NDR Rate (%)', 'Avg Delivery Time', 'Last Updated'
        ];

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(csvData);

        res.header('Content-Type', 'text/csv');
        res.attachment(`sellers_export_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);

    } catch (error) {
        logger.error('Error exporting sellers:', error);
        next(error);
    }
};

export default {
    getSellerHealth,
    exportSellers
};
