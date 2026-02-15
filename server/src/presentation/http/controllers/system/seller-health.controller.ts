import { NextFunction, Request, Response } from 'express';
import { Parser } from 'json2csv';
import mongoose from 'mongoose';
import { Order, Shipment, User } from '../../../../infrastructure/database/mongoose/models';
import Dispute from '../../../../infrastructure/database/mongoose/models/crm/disputes/dispute.model';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

/**
 * Seller Health Controller
 * Aggregates metrics to show seller performance Scorecard using optimized aggregations.
 */

// Helper to calculate health score based on metrics
const calculateHealthScore = (metrics: any) => {
    let score = 100;

    // RTO Impact (Heavy penalty: 2 points per %)
    if (metrics.rtoRate > 0) score -= (metrics.rtoRate * 2);

    // NDR Impact (Standard penalty: 1 point per %)
    if (metrics.ndrRate > 0) score -= (metrics.ndrRate * 1);

    // Dispute Impact (5 points per dispute)
    if (metrics.unresolvedDisputes > 0) score -= (metrics.unresolvedDisputes * 5);

    // Order Volume Bonus (Small bonus for consistency)
    if (metrics.orderVolume > 100) score += 5;

    // Cap score between 0 and 100
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
                    companyId: '$company._id',
                    isSuspended: 1,
                    isActive: 1
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

        // OPTIMIZATION: If sorting by DB fields, apply sort/skip/limit HERE
        // Default sort is now companyName (Alphabetical)
        const isDbSort = ['companyName', 'email'].includes(sortBy);
        // Default to companyName asc if not specified or if sorting by DB field
        const effectiveSortBy = sortBy === 'healthScore' && !req.query.sortBy ? 'companyName' : sortBy;
        const effectiveSortOrder = !req.query.sortOrder && effectiveSortBy === 'companyName' ? 1 : sortOrder;

        let totalSellersCount = 0;

        if (isDbSort || effectiveSortBy === 'companyName') {
            // Count total matching docs first
            const countPipeline = [...sellerPipeline, { $count: 'total' }];
            const countRes = await User.aggregate(countPipeline);
            totalSellersCount = countRes.length > 0 ? countRes[0].total : 0;

            // Apply sort/pagination
            sellerPipeline.push({ $sort: { [effectiveSortBy]: effectiveSortOrder } });
            sellerPipeline.push({ $skip: skip });
            sellerPipeline.push({ $limit: limit });
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
            // Shipment Metrics: RTO & NDR (Current & Past for Trend)
            Shipment.aggregate([
                { $match: { companyId: { $in: companyIds } } },
                {
                    $group: {
                        _id: '$companyId',
                        totalShipments: { $sum: 1 },
                        pastTotalShipments: { $sum: { $cond: [{ $lt: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }, 1, 0] } },

                        rtoCount: {
                            $sum: {
                                $cond: [{ $in: ['$currentStatus', ['rto', 'returned', 'rto_initiated', 'rto_delivered', 'rto_acknowledged']] }, 1, 0]
                            }
                        },
                        pastRtoCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $in: ['$currentStatus', ['rto', 'returned', 'rto_initiated', 'rto_delivered', 'rto_acknowledged']] },
                                            { $lt: ['$rtoDetails.rtoInitiatedDate', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] } // Only count if RTO happened > 7 days ago
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },

                        ndrCount: {
                            $sum: {
                                $cond: [{ $gt: ['$ndrDetails.ndrAttempts', 0] }, 1, 0]
                            }
                        },
                        pastNdrCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $gt: ['$ndrDetails.ndrAttempts', 0] },
                                            { $lt: ['$ndrDetails.ndrDate', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
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
                pastTotalShipments: 0,
                rtoCount: 0,
                pastRtoCount: 0,
                ndrCount: 0,
                pastNdrCount: 0,
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
            statsMap.set(stat._id.toString(), {
                ...curr,
                totalShipments: stat.totalShipments,
                pastTotalShipments: stat.pastTotalShipments,
                rtoCount: stat.rtoCount,
                pastRtoCount: stat.pastRtoCount,
                ndrCount: stat.ndrCount,
                pastNdrCount: stat.pastNdrCount
            });
        });
        disputeStats.forEach(stat => {
            const curr = statsMap.get(stat._id.toString()) || {};
            statsMap.set(stat._id.toString(), { ...curr, unresolvedDisputes: stat.count });
        });

        // 4. Construct Final Array with Scores & Past Status
        let pastCriticalCount = 0;

        let resultSellers = candidateSellers.map(seller => {
            const stats = statsMap.get(seller.companyId.toString());

            // --- CURRENT METRICS ---
            const rtoRate = stats.totalShipments > 0 ? (stats.rtoCount / stats.totalShipments) * 100 : 0;
            const ndrRate = stats.totalShipments > 0 ? (stats.ndrCount / stats.totalShipments) * 100 : 0;

            const healthScore = calculateHealthScore({ ...stats, rtoRate, ndrRate });

            // Strict Status Logic (Current)
            let sellerStatus = 'excellent';
            if (healthScore < 50) sellerStatus = 'critical';
            else if (healthScore < 80) sellerStatus = 'warning';

            if (rtoRate > 30 || ndrRate > 20) sellerStatus = 'critical';
            else if (rtoRate > 15 || ndrRate > 10) sellerStatus = 'warning';

            // --- PAST METRICS (For Trend) ---
            const pastRtoRate = stats.pastTotalShipments > 0 ? (stats.pastRtoCount / stats.pastTotalShipments) * 100 : 0;
            const pastNdrRate = stats.pastTotalShipments > 0 ? (stats.pastNdrCount / stats.pastTotalShipments) * 100 : 0;

            // Strict Status Logic (Past) - checking if they WERE critical last week
            let isPastCritical = false;
            // Simple approximation: If they crossed thresholds back then
            if (pastRtoRate > 30 || pastNdrRate > 20) isPastCritical = true;

            if (isPastCritical) pastCriticalCount++;

            return {
                sellerId: seller._id.toString(),
                companyName: seller.companyName,
                email: seller.email,
                healthScore,
                status: sellerStatus,
                isSuspended: seller.isSuspended || false,
                isActive: seller.isActive !== undefined ? seller.isActive : true,
                metrics: {
                    revenue: stats.revenue,
                    revenueGrowth: 0,
                    orderVolume: stats.orderVolume,
                    volumeGrowth: 0,
                    rtoRate: parseFloat(rtoRate.toFixed(2)),
                    ndrRate: parseFloat(ndrRate.toFixed(2)),
                    avgDeliveryTime: 0,
                    customerSatisfaction: 4.5,
                    unresolvedDisputes: stats.unresolvedDisputes
                },
                lastUpdated: new Date().toISOString()
            };
        });

        // 5. Apply Status Filter
        if (status !== 'all') {
            resultSellers = resultSellers.filter(s => s.status === status);
        }

        // 6. Apply Sorting for Computed Fields (if NOT DB sort)
        let paginatedSellers = resultSellers;
        let total = totalSellersCount;

        if (!isDbSort && effectiveSortBy !== 'companyName') {
            // If sorting by computed field (healthScore, revenue), we fetch all candidates, calculate metrics, and then sort/slice in memory.
            resultSellers.sort((a: any, b: any) => {
                let valA = a[effectiveSortBy];
                let valB = b[effectiveSortBy];

                if (effectiveSortBy === 'orderVolume') valA = a.metrics.orderVolume;
                if (effectiveSortBy === 'revenue') valA = a.metrics.revenue;

                if (effectiveSortBy === 'orderVolume') valB = b.metrics.orderVolume;
                if (effectiveSortBy === 'revenue') valB = b.metrics.revenue;
                if (effectiveSortBy === 'healthScore') {
                    valA = a.healthScore;
                    valB = b.healthScore;
                }

                if (valA < valB) return -1 * effectiveSortOrder;
                if (valA > valB) return 1 * effectiveSortOrder;
                return 0;
            });

            total = resultSellers.length;
            const start = (page - 1) * limit;
            paginatedSellers = resultSellers.slice(start, start + limit);
        } else {
            // Already sorted and limited by DB aggregation
            paginatedSellers = resultSellers;
        }


        const totalPages = Math.ceil(total / limit);

        const currentCriticalCount = resultSellers.filter(s => s.status === 'critical').length;
        const byStatus = {
            excellent: resultSellers.filter(s => s.status === 'excellent').length,
            good: resultSellers.filter(s => s.status === 'good').length,
            warning: resultSellers.filter(s => s.status === 'warning').length,
            critical: currentCriticalCount,
        };

        const avgHealthScore = total > 0
            ? resultSellers.reduce((acc, curr) => acc + curr.healthScore, 0) / total
            : 0;

        // Calculate Trend Percentage
        let criticalTrendValue = 0;
        let criticalTrendPositive = false; // "Positive" here means BAD (increase in risk)

        if (pastCriticalCount > 0) {
            const diff = currentCriticalCount - pastCriticalCount;
            criticalTrendValue = Math.round((Math.abs(diff) / pastCriticalCount) * 100);
            criticalTrendPositive = diff > 0; // If count increased, it's a "positive" number trend, but semantically bad
        } else if (currentCriticalCount > 0) {
            criticalTrendValue = 100; // From 0 to something is 100% increase (effectively infinite but capped)
            criticalTrendPositive = true;
        }

        const responseData = {
            sellers: paginatedSellers,
            pagination: { total, page, limit, totalPages },
            summary: {
                total,
                byStatus,
                avgHealthScore,
                trends: {
                    criticalRisk: {
                        value: criticalTrendValue,
                        isIncrease: criticalTrendPositive, // True if risk INCREASED (bad)
                        label: 'vs last week'
                    }
                }
            }
        };

        sendSuccess(res, responseData, 'Seller health metrics retrieved successfully');

    } catch (error) {
        logger.error('Error calculating seller health:', error);
        next(error);
    }
};

export const exportSellers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        guardChecks(req, { requireCompany: false });

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
                        rtoCount: { $sum: { $cond: [{ $in: ['$currentStatus', ['rto', 'returned', 'rto_initiated', 'rto_delivered', 'rto_acknowledged']] }, 1, 0] } },
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
            // Cap score
            const healthScore = calculateHealthScore({ ...stats, rtoRate, ndrRate: stats.totalShipments > 0 ? (stats.ndrCount / stats.totalShipments) * 100 : 0 });

            // Determine Status (Strict alignment with Frontend "Risk" logic)
            let sellerStatus = 'excellent';
            if (healthScore < 50) sellerStatus = 'critical';
            else if (healthScore < 80) sellerStatus = 'warning';

            // FORCE Critical/Warning based on specific risk metrics
            const ndrRate = stats.totalShipments > 0 ? (stats.ndrCount / stats.totalShipments) * 100 : 0;
            if (rtoRate > 30 || ndrRate > 20) sellerStatus = 'critical';
            else if (rtoRate > 15 || ndrRate > 10) sellerStatus = 'warning';

            return {
                companyName: seller.companyName,
                email: seller.email,
                healthScore,
                status: sellerStatus,
                metrics: {
                    revenue: stats.revenue,
                    orderVolume: stats.orderVolume,
                    rtoRate: parseFloat(rtoRate.toFixed(2)),
                    ndrRate: parseFloat(ndrRate.toFixed(2)),
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
