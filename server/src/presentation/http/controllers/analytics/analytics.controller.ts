import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import AdminInsightsService from '../../../../core/application/services/analytics/admin-insights.service';
import cacheService from '../../../../core/application/services/analytics/analytics-cache.service';
import GeographicAnalyticsService from '../../../../core/application/services/analytics/geographic-analytics.service';
import SmartInsightsService from '../../../../core/application/services/analytics/smart-insights.service';
import { Company, Order, Shipment, User } from '../../../../infrastructure/database/mongoose/models';
import { AuthorizationError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { isPlatformAdmin } from '../../../../shared/utils/role-helpers';

/**
 * Analytics Controller
 * Handles dashboard analytics, order trends, and shipment performance metrics
 */
export const getSellerDashboard = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        // If user has no company, return empty dashboard data with helpful message
        if (!auth.companyId) {
            sendSuccess(res, {
                totalOrders: 0,
                pendingOrders: 0,
                deliveredOrders: 0,
                totalRevenue: 0,
                successRate: 0,
                codPending: { count: 0, amount: 0 },
                revenueTrend: [],
                noCompany: true,
            }, 'Please complete company setup to view dashboard data.');
            return;
        }

        const companyObjectId = new mongoose.Types.ObjectId(auth.companyId);

        // Check cache first (5 min TTL)
        const cacheKey = `analytics:seller:${auth.companyId}:${req.query.startDate || 'default'}:${req.query.endDate || 'default'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Dashboard data retrieved from cache');
            return;
        }

        // Date filters - Default to "today" for dashboard (00:00 to 23:59)
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const startDate = req.query.startDate
            ? new Date(req.query.startDate as string)
            : todayStart; // Default to today 00:00
        const endDate = req.query.endDate
            ? new Date(req.query.endDate as string)
            : todayEnd; // Default to today 23:59
        const orderStats = await Order.aggregate([
            {
                $match: {
                    companyId: companyObjectId,
                    isDeleted: false,
                    createdAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: '$currentStatus',
                    count: { $sum: 1 },
                    totalValue: { $sum: '$totals.total' },
                },
            },
        ]);

        // Calculate totals
        const statusCounts: Record<string, number> = {};
        let totalOrders = 0;
        let totalRevenue = 0;

        orderStats.forEach(stat => {
            statusCounts[stat._id] = stat.count;
            totalOrders += stat.count;
            totalRevenue += stat.totalValue;
        });

        // Calculate success rate
        const deliveredCount = statusCounts['delivered'] || 0;
        const shippedCount = statusCounts['shipped'] || 0;
        const rtoCount = statusCounts['rto'] || 0;
        const attemptedDeliveries = deliveredCount + shippedCount + rtoCount;
        const successRate = attemptedDeliveries > 0
            ? ((deliveredCount / attemptedDeliveries) * 100).toFixed(1)
            : '0.0';

        // COD pending amount
        const codPending = await Order.aggregate([
            {
                $match: {
                    companyId: companyObjectId,
                    paymentMethod: 'cod',
                    paymentStatus: 'pending',
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totals.total' },
                    count: { $sum: 1 },
                },
            },
        ]);

        // Recent shipments
        const recentShipments = await Shipment.find({
            companyId: companyObjectId,
            isDeleted: false,
        })
            .populate('orderId', 'orderNumber customerInfo')
            .sort({ createdAt: -1 })
            .limit(5)
            .select('trackingNumber carrier currentStatus createdAt deliveryDetails')
            .lean();

        // ✅ PHASE 1.3: Calculate actual profit from all orders in date range
        const actualProfitData = await Order.aggregate([
            {
                $match: {
                    companyId: companyObjectId,
                    isDeleted: false,
                    createdAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $project: {
                    revenue: '$totals.total',
                    shippingCost: { $ifNull: ['$shippingCost', 0] },
                    platformFee: { $ifNull: ['$platformFee', 0] },
                    codCharge: { $ifNull: ['$codCharge', 0] },
                    taxes: { $ifNull: ['$totals.tax', 0] },
                },
            },
            {
                $project: {
                    revenue: 1,
                    totalCosts: {
                        $add: ['$shippingCost', '$platformFee', '$codCharge', '$taxes'],
                    },
                    profit: {
                        $subtract: [
                            '$revenue',
                            { $add: ['$shippingCost', '$platformFee', '$codCharge', '$taxes'] },
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    totalProfit: { $sum: '$profit' },
                    totalCosts: { $sum: '$totalCosts' },
                },
            },
        ]);

        const actualProfit = actualProfitData[0]?.totalProfit || 0;
        const totalCosts = actualProfitData[0]?.totalCosts || 0;

        // ✅ PHASE 1.4: Extended trend for delta calculation
        const selectedRangeDays = Math.max(
            1,
            Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
        );
        const extendedStartDate = new Date(startDate.getTime() - selectedRangeDays * 24 * 60 * 60 * 1000);

        const weeklyTrend = await Order.aggregate([
            {
                $match: {
                    companyId: companyObjectId,
                    isDeleted: false,
                    createdAt: { $gte: extendedStartDate, $lte: endDate },
                },
            },
            {
                $project: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: '$totals.total',
                    shippingCost: { $ifNull: ['$shippingCost', 0] },
                    platformFee: { $ifNull: ['$platformFee', 0] },
                    codCharge: { $ifNull: ['$codCharge', 0] },
                    taxes: { $ifNull: ['$totals.tax', 0] },
                },
            },
            {
                $project: {
                    date: 1,
                    revenue: 1,
                    profit: {
                        $subtract: [
                            '$revenue',
                            { $add: ['$shippingCost', '$platformFee', '$codCharge', '$taxes'] },
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '$date',
                    orders: { $sum: 1 },
                    revenue: { $sum: '$revenue' },
                    profit: { $sum: '$profit' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const calculateDelta = (data: any[], field: 'revenue' | 'profit' | 'orders') => {
            if (data.length < 2) return 0;
            const startDateStr = startDate.toISOString().split('T')[0];
            const currentPeriodData = data.filter(d => d._id >= startDateStr);
            const previousPeriodData = data.filter(d => d._id < startDateStr);
            if (currentPeriodData.length === 0 || previousPeriodData.length === 0) return 0;
            const currentTotal = currentPeriodData.reduce((sum, d) => sum + (d[field] || 0), 0);
            const previousTotal = previousPeriodData.reduce((sum, d) => sum + (d[field] || 0), 0);
            if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;
            return ((currentTotal - previousTotal) / previousTotal) * 100;
        };

        const revenueDelta = calculateDelta(weeklyTrend, 'revenue');
        const profitDelta = calculateDelta(weeklyTrend, 'profit');
        const ordersDelta = calculateDelta(weeklyTrend, 'orders');

        // ✅ PHASE 1.4: Calculate Shipping Streak
        const last30DaysOrders = await Order.aggregate([
            {
                $match: {
                    companyId: companyObjectId,
                    isDeleted: false,
                    createdAt: {
                        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        $lte: new Date()
                    },
                },
            },
            {
                $project: {
                    date: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' }
                    }
                }
            },
            { $group: { _id: '$date' } },
            { $sort: { _id: -1 } }
        ]);

        const activeDates = new Set(last30DaysOrders.map(o => o._id));
        let streak = 0;
        const checkDate = new Date();
        const getISTDateString = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        let currentDateStr = getISTDateString(checkDate);
        if (activeDates.has(currentDateStr)) streak++;

        for (let i = 1; i <= 30; i++) {
            const prevDate = new Date();
            prevDate.setDate(prevDate.getDate() - i);
            const prevDateStr = getISTDateString(prevDate);
            if (activeDates.has(prevDateStr)) {
                streak++;
            } else if (i === 1 && streak === 0) {
                continue;
            } else {
                if (streak > 0 || i > 1) break;
            }
        }

        // ✅ PHASE 1.4: Update streak history
        // Use raw collection access to avoid mongoose-field-encryption decrypt failures
        // from unrelated encrypted fields (billingInfo/integrations).
        let longestStreak = streak;
        let streakMilestones: Array<{ days: number; achievedAt: Date; badge: string }> = [];

        try {
            const companyDoc = await Company.collection.findOne(
                { _id: companyObjectId },
                { projection: { streakHistory: 1 } }
            ) as {
                streakHistory?: {
                    current?: number;
                    longest?: number;
                    longestAchievedAt?: Date;
                    milestones?: Array<{ days: number; achievedAt: Date; badge: string }>;
                };
            } | null;

            const nowDate = new Date();
            const currentLongest = companyDoc?.streakHistory?.longest || 0;
            const nextLongest = Math.max(currentLongest, streak);
            const nextLongestAchievedAt =
                streak > currentLongest
                    ? nowDate
                    : (companyDoc?.streakHistory?.longestAchievedAt || nowDate);

            const existingMilestones = (companyDoc?.streakHistory?.milestones || []).filter(Boolean);
            const milestoneSet = new Set(existingMilestones.map(m => m.days));
            const milestoneDefinitions = [
                { days: 7, badge: 'Week Warrior' },
                { days: 30, badge: 'Monthly Master' },
                { days: 100, badge: 'Century Champion' },
                { days: 365, badge: 'Year Legend' },
            ];

            const earnedMilestones = milestoneDefinitions
                .filter(m => streak >= m.days && !milestoneSet.has(m.days))
                .map(m => ({ days: m.days, achievedAt: nowDate, badge: m.badge }));

            streakMilestones = [...existingMilestones, ...earnedMilestones];
            longestStreak = nextLongest;

            await Company.collection.updateOne(
                { _id: companyObjectId },
                {
                    $set: {
                        'streakHistory.current': streak,
                        'streakHistory.longest': nextLongest,
                        'streakHistory.longestAchievedAt': nextLongestAchievedAt,
                        'streakHistory.milestones': streakMilestones,
                    },
                }
            );
        } catch (streakError) {
            logger.warn('Failed to update company streak history; continuing dashboard response', {
                companyId: auth.companyId,
                error: streakError instanceof Error ? streakError.message : String(streakError),
            });
        }

        const responseData = {
            totalOrders,
            totalShipments: totalOrders,
            pendingOrders: statusCounts['pending'] || 0,
            readyToShip: statusCounts['ready_to_ship'] || 0,
            shippedOrders: statusCounts['shipped'] || 0,
            deliveredOrders: statusCounts['delivered'] || 0,
            cancelledOrders: statusCounts['cancelled'] || 0,
            rtoOrders: statusCounts['rto'] || 0,
            totalRevenue,
            totalProfit: actualProfit,
            totalCosts,
            profitMargin: totalRevenue > 0 ? ((actualProfit / totalRevenue) * 100).toFixed(2) : '0.00',
            successRate: parseFloat(successRate),
            codPending: {
                amount: codPending[0]?.total || 0,
                count: codPending[0]?.count || 0,
            },
            recentShipments,
            weeklyTrend: weeklyTrend.filter(d => d._id >= startDate.toISOString().split('T')[0]),
            activeDays: streak,
            longestStreak,
            milestones: streakMilestones,
            deltas: {
                revenue: parseFloat(revenueDelta.toFixed(2)),
                profit: parseFloat(profitDelta.toFixed(2)),
                orders: parseFloat(ordersDelta.toFixed(2)),
            },
            dateRange: { startDate, endDate },
        };

        // Cache for 5 minutes
        await cacheService.set(cacheKey, responseData, 300);

        sendSuccess(res, responseData, 'Seller dashboard data retrieved successfully');
    } catch (error) {
        logger.error('Error fetching seller dashboard:', error);
        next(error);
    }
};

/**
 * Get admin dashboard analytics (multi-company).
 * Single Order aggregation via $facet for global stats, top companies, and revenue graph.
 * Shipment stats and seller count run in parallel with Promise.all.
 * @route GET /api/v1/analytics/dashboard/admin
 */
export const getAdminDashboard = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        guardChecks(req, { requireCompany: false });

        if (!isPlatformAdmin(req.user ?? {})) {
            throw new AuthorizationError('Admin access required', ErrorCode.AUTHZ_FORBIDDEN);
        }

        // Parse dates; treat date-only YYYY-MM-DD endDate as end-of-day for inclusive range
        const rawStart = req.query.startDate as string | undefined;
        const rawEnd = req.query.endDate as string | undefined;
        const startDate = rawStart
            ? new Date(rawStart)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        let endDate: Date;
        if (rawEnd) {
            const d = new Date(rawEnd);
            // If endDate is date-only (no time part), set to end of that day (23:59:59.999)
            if (/^\d{4}-\d{2}-\d{2}$/.test(rawEnd.trim())) {
                endDate = new Date(d);
                endDate.setUTCHours(23, 59, 59, 999);
            } else {
                endDate = d;
            }
        } else {
            endDate = new Date();
        }

        const orderMatch = { isDeleted: false, createdAt: { $gte: startDate, $lte: endDate } };
        const periodMs = endDate.getTime() - startDate.getTime();
        const previousEnd = startDate;
        const previousStart = new Date(startDate.getTime() - periodMs);
        const previousOrderMatch = { isDeleted: false, createdAt: { $gte: previousStart, $lt: previousEnd } };

        const [orderFacetResult, shipmentStats, totalRegisteredSellers, previousFacetResult] = await Promise.all([
            Order.aggregate([
                { $match: orderMatch },
                {
                    $facet: {
                        globalStats: [
                            {
                                $group: {
                                    _id: '$currentStatus',
                                    count: { $sum: 1 },
                                    totalValue: { $sum: '$totals.total' },
                                },
                            },
                        ],
                        companiesStats: [
                            {
                                $group: {
                                    _id: '$companyId',
                                    totalOrders: { $sum: 1 },
                                    totalRevenue: { $sum: '$totals.total' },
                                    pendingOrders: { $sum: { $cond: [{ $eq: ['$currentStatus', 'pending'] }, 1, 0] } },
                                    deliveredOrders: { $sum: { $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0] } },
                                },
                            },
                            {
                                $lookup: {
                                    from: 'companies',
                                    localField: '_id',
                                    foreignField: '_id',
                                    as: 'company',
                                },
                            },
                            { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    companyId: '$_id',
                                    companyName: '$company.name',
                                    totalOrders: 1,
                                    totalRevenue: 1,
                                    pendingOrders: 1,
                                    deliveredOrders: 1,
                                },
                            },
                            { $sort: { totalRevenue: -1 } },
                            { $limit: 10 },
                        ],
                        revenueGraph: [
                            {
                                $group: {
                                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                    orders: { $sum: 1 },
                                    revenue: { $sum: '$totals.total' },
                                },
                            },
                            { $sort: { _id: 1 } },
                        ],
                    },
                },
            ]).then(([row]) => row),
            Shipment.aggregate([
                { $match: { isDeleted: false, createdAt: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
            ]),
            User.countDocuments({ role: 'seller' }),
            Order.aggregate([
                { $match: previousOrderMatch },
                {
                    $group: {
                        _id: '$currentStatus',
                        count: { $sum: 1 },
                        totalValue: { $sum: '$totals.total' },
                    },
                },
            ]),
        ]);

        const statusCounts: Record<string, number> = {};
        let totalOrders = 0;
        let totalRevenue = 0;
        for (const stat of orderFacetResult.globalStats) {
            const key = (stat._id ?? '').toString().toLowerCase();
            statusCounts[key] = (statusCounts[key] || 0) + stat.count;
            totalOrders += stat.count;
            totalRevenue += stat.totalValue;
        }

        let totalShipments = 0;
        let ndrCases = 0;
        for (const stat of shipmentStats) {
            totalShipments += stat.count;
            if (stat._id === 'ndr') ndrCases = stat.count;
        }

        const deliveredCount = statusCounts['delivered'] || 0;
        const shippedCount = statusCounts['shipped'] || 0;
        const rtoCount = statusCounts['rto'] || 0;
        const attemptedDeliveries = deliveredCount + shippedCount + rtoCount;
        const globalSuccessRate =
            attemptedDeliveries > 0 ? ((deliveredCount / attemptedDeliveries) * 100).toFixed(1) : '0.0';
        const rtoRate =
            attemptedDeliveries > 0 ? ((rtoCount / attemptedDeliveries) * 100).toFixed(1) : '0.0';

        const prevStatusCounts: Record<string, number> = {};
        let prevTotalOrders = 0;
        let prevTotalRevenue = 0;
        for (const stat of previousFacetResult) {
            const key = (stat._id ?? '').toString().toLowerCase();
            prevStatusCounts[key] = (prevStatusCounts[key] || 0) + stat.count;
            prevTotalOrders += stat.count;
            prevTotalRevenue += stat.totalValue;
        }
        const prevDelivered = prevStatusCounts['delivered'] || 0;
        const prevAttempted =
            prevDelivered + (prevStatusCounts['shipped'] || 0) + (prevStatusCounts['rto'] || 0);
        const prevSuccessRate =
            prevAttempted > 0 ? ((prevDelivered / prevAttempted) * 100).toFixed(1) : '0.0';

        sendSuccess(
            res,
            {
                totalOrders,
                totalRevenue,
                totalShipments,
                globalSuccessRate: parseFloat(globalSuccessRate),
                attemptedDeliveries,
                successRateBasedOnAttempts: attemptedDeliveries > 0,
                rtoCount,
                rtoRate: parseFloat(rtoRate),
                ndrCases,
                pendingOrders: statusCounts['pending'] || 0,
                deliveredOrders: statusCounts['delivered'] || 0,
                totalRegisteredSellers: totalRegisteredSellers ?? 0,
                companiesStats: orderFacetResult.companiesStats,
                revenueGraph: orderFacetResult.revenueGraph,
                dateRange: { startDate, endDate },
                previousPeriod: {
                    totalRevenue: prevTotalRevenue,
                    totalOrders: prevTotalOrders,
                    globalSuccessRate: parseFloat(prevSuccessRate),
                },
            },
            'Admin dashboard data retrieved successfully'
        );
    } catch (error) {
        logger.error('Error fetching admin dashboard:', error);
        next(error);
    }
};

/**
 * Get order trends
 * @route GET /api/v1/analytics/orders
 */
export const getOrderTrends = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        const companyId = auth.companyId;
        const isAdmin = isPlatformAdmin(req.user ?? {});

        // Date filters
        const days = parseInt(req.query.days as string) || 30;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const matchQuery: any = {
            isDeleted: false,
            createdAt: { $gte: startDate },
        };

        if (!isAdmin && companyId) {
            matchQuery.companyId = new mongoose.Types.ObjectId(companyId);
        }

        // Parallel aggregations for better performance
        const [ordersByDate, ordersByStatus, ordersByPayment] = await Promise.all([
            Order.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        orders: { $sum: 1 },
                        revenue: { $sum: '$totals.total' },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            Order.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$currentStatus',
                        count: { $sum: 1 },
                    },
                },
            ]),
            Order.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$paymentMethod',
                        count: { $sum: 1 },
                        total: { $sum: '$totals.total' },
                    },
                },
            ]),
        ]);

        sendSuccess(res, {
            ordersByDate,
            ordersByStatus,
            ordersByPayment,
            period: { days, startDate, endDate: new Date() },
        }, 'Order trends retrieved successfully');
    } catch (error) {
        logger.error('Error fetching order trends:', error);
        next(error);
    }
};

/**
 * Get shipment/delivery performance metrics
 * @route GET /api/v1/analytics/shipments
 */
export const getShipmentPerformance = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        const companyId = auth.companyId;
        const isAdmin = isPlatformAdmin(req.user ?? {});

        // Date filters
        const days = parseInt(req.query.days as string) || 30;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const matchQuery: any = {
            isDeleted: false,
            createdAt: { $gte: startDate },
        };

        if (!isAdmin && companyId) {
            matchQuery.companyId = new mongoose.Types.ObjectId(companyId);
        }

        // Parallel aggregations
        const [shipmentsByCarrier, shipmentsByStatus, avgDeliveryTime, ndrAnalysis] = await Promise.all([
            Shipment.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$carrier',
                        count: { $sum: 1 },
                        totalShippingCost: { $sum: '$paymentDetails.shippingCost' },
                    },
                },
            ]),
            Shipment.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$currentStatus',
                        count: { $sum: 1 },
                    },
                },
            ]),
            Shipment.aggregate([
                {
                    $match: {
                        ...matchQuery,
                        currentStatus: 'delivered',
                        actualDelivery: { $exists: true },
                    },
                },
                {
                    $project: {
                        deliveryDays: {
                            $divide: [
                                { $subtract: ['$actualDelivery', '$createdAt'] },
                                1000 * 60 * 60 * 24, // milliseconds to days
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgDays: { $avg: '$deliveryDays' },
                        minDays: { $min: '$deliveryDays' },
                        maxDays: { $max: '$deliveryDays' },
                    },
                },
            ]),
            Shipment.aggregate([
                {
                    $match: {
                        ...matchQuery,
                        'ndrDetails.ndrStatus': { $exists: true },
                    },
                },
                {
                    $group: {
                        _id: '$ndrDetails.ndrReason',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        sendSuccess(res, {
            shipmentsByCarrier,
            shipmentsByStatus,
            avgDeliveryTime: avgDeliveryTime[0] || { avgDays: 0, minDays: 0, maxDays: 0 },
            ndrAnalysis,
            period: { days, startDate, endDate: new Date() },
        }, 'Shipment performance data retrieved successfully');
    } catch (error) {
        logger.error('Error fetching shipment performance:', error);
        next(error);
    }
};

// ============================================
// Week 9: New Analytics Endpoints
// ============================================

import CustomerAnalyticsService from '../../../../core/application/services/analytics/customer-analytics.service';
import CSVExportService from '../../../../core/application/services/analytics/export/csv-export.service';
import ExcelExportService from '../../../../core/application/services/analytics/export/excel-export.service';
import PDFExportService from '../../../../core/application/services/analytics/export/pdf-export.service';
import InventoryAnalyticsService from '../../../../core/application/services/analytics/inventory-analytics.service';
import OrderAnalyticsService from '../../../../core/application/services/analytics/order-analytics.service';
import ReportBuilderService from '../../../../core/application/services/analytics/report-builder.service';
import RevenueAnalyticsService from '../../../../core/application/services/analytics/revenue-analytics.service';
import SellerAnalyticsService from '../../../../core/application/services/analytics/seller-analytics.service';
import StorageService from '../../../../core/application/services/storage/storage.service';
import {
buildReportSchema,
reportExportSchema,
saveReportConfigSchema,
} from '../../../../shared/validation/analytics-schemas';

const isSpacesConfigured = () => {
    return Boolean(
        process.env.SPACES_ENDPOINT &&
        process.env.SPACES_ACCESS_KEY &&
        process.env.SPACES_SECRET_KEY &&
        process.env.SPACES_BUCKET
    );
};

const toExportRows = (payload: any): Record<string, unknown>[] => {
    if (!payload || typeof payload !== 'object') return [];

    const rows: Array<Record<string, unknown>> = [];
    const entries = Object.entries(payload);

    entries.forEach(([section, value]) => {
        if (Array.isArray(value)) {
            value.forEach((row, index) => {
                if (row && typeof row === 'object') {
                    rows.push({ section, row: index + 1, ...row });
                }
            });
            return;
        }

        if (value && typeof value === 'object') {
            rows.push({ section, ...(value as Record<string, unknown>) });
            return;
        }

        rows.push({ section, value });
    });

    return rows;
};

/**
 * Get seller cost analysis
 * @route GET /api/v1/analytics/cost
 */
export const getCostAnalysis = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const cacheKey = `analytics:cost:${auth.companyId}:${req.query.startDate || 'default'}:${req.query.endDate || 'default'}:${req.query.dateRange || 'default'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Cost analysis retrieved from cache');
            return;
        }

        const data = await SellerAnalyticsService.getCostAnalysis(auth.companyId, {
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
            dateRange: req.query.dateRange as string | undefined,
        });

        await cacheService.set(cacheKey, data, 300);
        sendSuccess(res, data, 'Cost analysis retrieved successfully');
    } catch (error) {
        logger.error('Error fetching cost analysis:', error);
        next(error);
    }
};

/**
 * Get seller courier comparison analytics
 * @route GET /api/v1/analytics/courier-comparison
 */
export const getCourierComparison = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const cacheKey = `analytics:courier-comparison:${auth.companyId}:${req.query.startDate || 'default'}:${req.query.endDate || 'default'}:${req.query.dateRange || 'default'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Courier comparison retrieved from cache');
            return;
        }

        const data = await SellerAnalyticsService.getCourierComparison(auth.companyId, {
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
            dateRange: req.query.dateRange as string | undefined,
        });

        await cacheService.set(cacheKey, data, 300);
        sendSuccess(res, data, 'Courier comparison retrieved successfully');
    } catch (error) {
        logger.error('Error fetching courier comparison analytics:', error);
        next(error);
    }
};

/**
 * Get seller SLA analytics
 * @route GET /api/v1/analytics/sla
 */
export const getSLAPerformance = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const cacheKey = `analytics:sla:${auth.companyId}:${req.query.startDate || 'default'}:${req.query.endDate || 'default'}:${req.query.dateRange || 'default'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'SLA performance retrieved from cache');
            return;
        }

        const data = await SellerAnalyticsService.getSLAPerformance(auth.companyId, {
            startDate: req.query.startDate as string | undefined,
            endDate: req.query.endDate as string | undefined,
            dateRange: req.query.dateRange as string | undefined,
        });

        await cacheService.set(cacheKey, data, 300);
        sendSuccess(res, data, 'SLA performance retrieved successfully');
    } catch (error) {
        logger.error('Error fetching SLA analytics:', error);
        next(error);
    }
};

/**
 * Get revenue statistics
 * @route GET /api/v1/analytics/revenue/stats
 */
export const getRevenueStats = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Check cache
        const cacheKey = `analytics:revenue:${auth.companyId}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Revenue stats (cached)');
            return;
        }

        const stats = await RevenueAnalyticsService.getRevenueStats(auth.companyId, dateRange);
        await cacheService.set(cacheKey, stats, 300);
        sendSuccess(res, stats, 'Revenue stats retrieved successfully');
    } catch (error) {
        logger.error('Error fetching revenue stats:', error);
        next(error);
    }
};

/**
 * Get wallet statistics
 * @route GET /api/v1/analytics/revenue/wallet
 */
export const getWalletStats = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Check cache
        const cacheKey = `analytics:wallet:${auth.companyId}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Wallet stats (cached)');
            return;
        }

        const stats = await RevenueAnalyticsService.getWalletStats(auth.companyId, dateRange);
        await cacheService.set(cacheKey, stats, 300);
        sendSuccess(res, stats, 'Wallet stats retrieved successfully');
    } catch (error) {
        logger.error('Error fetching wallet stats:', error);
        next(error);
    }
};

/**
 * Get customer statistics
 * @route GET /api/v1/analytics/customers/stats
 */
export const getCustomerStats = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Check cache
        const cacheKey = `analytics:customer:${auth.companyId}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Customer stats (cached)');
            return;
        }

        const stats = await CustomerAnalyticsService.getCustomerStats(auth.companyId, dateRange);
        await cacheService.set(cacheKey, stats, 300);
        sendSuccess(res, stats, 'Customer stats retrieved successfully');
    } catch (error) {
        logger.error('Error fetching customer stats:', error);
        next(error);
    }
};

/**
 * Get top customers
 * @route GET /api/v1/analytics/customers/top
 */
export const getTopCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const limit = parseInt(req.query.limit as string) || 10;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Check cache
        const cacheKey = `analytics:topcustomers:${auth.companyId}:${limit}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Top customers (cached)');
            return;
        }

        const customers = await CustomerAnalyticsService.getTopCustomers(auth.companyId, dateRange, limit);
        await cacheService.set(cacheKey, customers, 300);
        sendSuccess(res, customers, 'Top customers retrieved successfully');
    } catch (error) {
        logger.error('Error fetching top customers:', error);
        next(error);
    }
};

/**
 * Get inventory statistics
 * @route GET /api/v1/analytics/inventory/stats
 */
export const getInventoryStats = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const warehouseId = req.query.warehouseId as string | undefined;

        // Check cache
        const cacheKey = `analytics:inventory:${auth.companyId}:${warehouseId || 'all'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Inventory stats (cached)');
            return;
        }

        const stats = await InventoryAnalyticsService.getStockLevels(auth.companyId, warehouseId);
        await cacheService.set(cacheKey, stats, 300);
        sendSuccess(res, stats, 'Inventory stats retrieved successfully');
    } catch (error) {
        logger.error('Error fetching inventory stats:', error);
        next(error);
    }
};

/**
 * Get top products
 * @route GET /api/v1/analytics/orders/top-products
 */
export const getTopProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const limit = parseInt(req.query.limit as string) || 10;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Check cache
        const cacheKey = `analytics:topproducts:${auth.companyId}:${limit}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Top products (cached)');
            return;
        }

        const products = await OrderAnalyticsService.getTopProducts(auth.companyId, dateRange, limit);
        await cacheService.set(cacheKey, products, 300);
        sendSuccess(res, products, 'Top products retrieved successfully');
    } catch (error) {
        logger.error('Error fetching top products:', error);
        next(error);
    }
};

/**
 * Build custom report
 * @route POST /api/v1/analytics/reports/build
 */
export const buildCustomReport = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const validation = buildReportSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError(validation.error.errors[0].message);
        }

        const { reportType, filters, metrics, groupBy } = validation.data;
        const report = await ReportBuilderService.buildCustomReport(
            auth.companyId,
            reportType,
            filters as any,
            metrics,
            groupBy as any
        );

        sendSuccess(res, report, 'Report generated successfully');
    } catch (error) {
        logger.error('Error building custom report:', error);
        next(error);
    }
};

/**
 * Export report output
 * @route POST /api/v1/analytics/reports/export
 */
export const exportReport = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const validation = reportExportSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError(validation.error.errors[0].message);
        }

        const { format, reportType, filters, metrics, groupBy, fileName } = validation.data;
        const report = await ReportBuilderService.buildCustomReport(
            auth.companyId,
            reportType as any,
            (filters || {}) as any,
            metrics,
            groupBy as any
        );

        const rows = toExportRows(report.data);
        if (rows.length === 0) {
            throw new ValidationError('No report data available to export');
        }

        const columns = Object.keys(rows[0]).map((key) => ({
            key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        }));

        const safeBaseName = (fileName || `${reportType}-report-${Date.now()}`)
            .replace(/[^a-zA-Z0-9-_]/g, '-')
            .toLowerCase();

        let buffer: Buffer;
        let extension: 'csv' | 'xlsx' | 'pdf';
        let contentType: string;

        if (format === 'csv') {
            buffer = await CSVExportService.exportToCSV(rows as any[], columns as any[]);
            extension = 'csv';
            contentType = 'text/csv';
        } else if (format === 'excel') {
            buffer = await ExcelExportService.exportToExcel(rows as any[], columns as any[], {
                title: `${reportType.toUpperCase()} Report`,
                sheetName: 'Report',
            });
            extension = 'xlsx';
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else {
            buffer = await PDFExportService.exportToPDF(rows as any[], columns as any[], {
                title: `${reportType.toUpperCase()} Report`,
                subtitle: 'Generated from Analytics > Reports',
            });
            extension = 'pdf';
            contentType = 'application/pdf';
        }

        const filename = `${safeBaseName}.${extension}`;

        if (isSpacesConfigured()) {
            const folder = `exports/${auth.companyId}`;
            const key = `${folder}/${filename}`;
            await StorageService.upload(buffer, {
                folder,
                fileName: filename,
                contentType,
            });

            const downloadUrl = await StorageService.getFileUrl(key);
            sendSuccess(res, {
                downloadUrl,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                fileSize: buffer.length,
                format,
                filename,
            }, 'Report exported successfully');
            return;
        }

        const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
        sendSuccess(res, {
            downloadUrl: dataUrl,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            fileSize: buffer.length,
            format,
            filename,
        }, 'Report exported successfully');
    } catch (error) {
        logger.error('Error exporting report:', error);
        next(error);
    }
};

/**
 * Save report configuration
 * @route POST /api/v1/analytics/reports/save
 */
export const saveReportConfig = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const validation = saveReportConfigSchema.safeParse(req.body);
        if (!validation.success) {
            throw new ValidationError(validation.error.errors[0].message);
        }

        const config = await ReportBuilderService.saveReportConfig(
            validation.data as any,
            auth.userId,
            auth.companyId
        );

        sendSuccess(res, config, 'Report configuration saved successfully');
    } catch (error) {
        logger.error('Error saving report config:', error);
        next(error);
    }
};

/**
 * List saved report configurations
 * @route GET /api/v1/analytics/reports
 */
export const listReportConfigs = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await ReportBuilderService.listReportConfigs(auth.companyId, page, limit);
        sendSuccess(res, result, 'Report configurations retrieved successfully');
    } catch (error) {
        logger.error('Error listing report configs:', error);
        next(error);
    }
};

/**
 * Delete report configuration
 * @route DELETE /api/v1/analytics/reports/:id
 */
export const deleteReportConfig = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        await ReportBuilderService.deleteReportConfig(req.params.id, auth.companyId);
        sendSuccess(res, null, 'Report configuration deleted successfully');
    } catch (error) {
        logger.error('Error deleting report config:', error);
        next(error);
    }
};


/**
 * Get seller actions (quick actions/notifications)
 * @route GET /api/v1/analytics/seller-actions
 */
export const getSellerActions = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        // If no company, return empty actions (user hasn't completed onboarding)
        if (!auth.companyId) {
            sendSuccess(res, [], 'No company associated - complete onboarding first');
            return;
        }

        const companyObjectId = new mongoose.Types.ObjectId(auth.companyId);

        // Calculate action items dynamically
        // 1. Pending Manifests
        const readyToShipCount = await Order.countDocuments({
            companyId: companyObjectId,
            currentStatus: 'ready_to_ship',
            isDeleted: false
        });

        // 2. NDR Actions needed
        const ndrCount = await Shipment.countDocuments({
            companyId: companyObjectId,
            currentStatus: 'ndr',
            'ndrDetails.requiresAction': true,
            isDeleted: false
        });

        // 3. Weight Disputes
        // Mocking this for now as WeightDispute model might not be fully linked here yet or to keep it simple
        const disputeCount = 0;

        const actions = [
            {
                type: 'manifest',
                count: readyToShipCount,
                label: 'Orders to Manifest',
                priority: readyToShipCount > 0 ? 'high' : 'low',
                link: '/shipments/manifest'
            },
            {
                type: 'ndr',
                count: ndrCount,
                label: 'NDR Actions Required',
                priority: ndrCount > 0 ? 'critical' : 'low',
                link: '/ndr'
            },
            {
                type: 'dispute',
                count: disputeCount,
                label: 'Weight Disputes',
                priority: disputeCount > 0 ? 'medium' : 'low',
                link: '/disputes'
            }
        ].filter(a => a.count > 0);

        sendSuccess(res, actions, 'Seller actions retrieved successfully');
    } catch (error) {
        logger.error('Error fetching seller actions:', error);
        next(error);
    }
};

/**
 * Get recent unique customers
 * @route GET /api/v1/analytics/recent-customers
 */
export const getRecentCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        const limit = parseInt(req.query.limit as string) || 6;

        // If no company, return empty customers (user hasn't completed onboarding)
        if (!auth.companyId) {
            sendSuccess(res, [], 'No company associated - complete onboarding first');
            return;
        }

        const companyObjectId = new mongoose.Types.ObjectId(auth.companyId);

        // Aggregate orders to find unique customers recently
        // Group by email OR phone to handle customers without emails (COD orders)
        const recentCustomers = await Order.aggregate([
            {
                $match: {
                    companyId: companyObjectId,
                    isDeleted: false
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $addFields: {
                    // Create a unique customer identifier (email if available, otherwise phone)
                    customerId: {
                        $ifNull: ['$customerInfo.email', '$customerInfo.phone']
                    }
                }
            },
            {
                $group: {
                    _id: '$customerId',
                    name: { $first: '$customerInfo.name' },
                    phone: { $first: '$customerInfo.phone' },
                    email: { $first: '$customerInfo.email' },
                    lastOrderDate: { $first: '$createdAt' },
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: '$totals.total' },
                    lastOrderAmount: { $first: '$totals.total' }
                }
            },
            {
                $match: {
                    _id: { $ne: null } // Exclude customers with no email or phone
                }
            },
            { $sort: { lastOrderDate: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    customerId: '$_id',
                    name: 1,
                    phone: 1,
                    email: 1,
                    lastOrderDate: 1,
                    totalOrders: 1,
                    totalSpent: 1,
                    lastOrderAmount: 1
                }
            }
        ]);

        sendSuccess(res, recentCustomers, 'Recent customers retrieved successfully');
    } catch (error) {
        logger.error('Error fetching recent customers:', error);
        next(error);
    }
};

/**
 * Get Profitability Analytics for dashboard
 * Phase 4: Powers ProfitabilityCard component
 * @route GET /api/v1/analytics/profitability
 */
export const getProfitabilityAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
            throw new ValidationError('Invalid startDate or endDate format');
        }

        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Cache key
        const cacheKey = `analytics:profitability:${auth.companyId}:${startDate?.toISOString() || 'default'}:${endDate?.toISOString() || 'default'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Profitability analytics retrieved from cache');
            return;
        }

        const analytics = await RevenueAnalyticsService.getProfitabilityAnalytics(auth.companyId, dateRange);

        // Cache for 5 minutes
        await cacheService.set(cacheKey, analytics, 300);

        sendSuccess(res, analytics, 'Profitability analytics retrieved successfully');
    } catch (error) {
        logger.error('Error fetching profitability analytics:', error);
        next(error);
    }
};

/**
 * Get Admin Insights for admin dashboard (platform-level)
 * @route GET /api/v1/analytics/dashboard/admin/insights
 */
export const getAdminInsights = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const insights = await AdminInsightsService.generateInsights();
        sendSuccess(res, insights, 'Admin insights retrieved successfully');
    } catch (error) {
        logger.error('Error generating admin insights:', error);
        next(error);
    }
};

/**
 * Get Smart Insights for dashboard
 * Phase 5: Powers SmartInsightsPanel component
 * @route GET /api/v1/analytics/insights
 */
export const getSmartInsights = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);

        // Cache handled within Service layer (1 hour)
        const insights = await SmartInsightsService.generateInsights(auth.companyId);

        sendSuccess(res, insights, 'Smart insights generated successfully');
    } catch (error) {
        logger.error('Error generating smart insights:', error);
        next(error);
    }
};

/**
 * Get Geographic Insights for dashboard
 * Phase 4: Powers GeographicInsights component
 * @route GET /api/v1/analytics/geography
 */
export const getGeographicInsights = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: true });
        requireCompanyContext(auth);
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
            throw new ValidationError('Invalid startDate or endDate format');
        }

        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Cache key
        const cacheKey = `analytics:geography:${auth.companyId}:${startDate?.toISOString() || 'default'}:${endDate?.toISOString() || 'default'}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Geographic insights retrieved from cache');
            return;
        }

        const analytics = await GeographicAnalyticsService.getGeographicInsights(auth.companyId, dateRange);

        // Cache for 5 minutes
        await cacheService.set(cacheKey, analytics, 300);

        sendSuccess(res, analytics, 'Geographic insights retrieved successfully');
    } catch (error) {
        logger.error('Error fetching geographic insights:', error);
        next(error);
    }
};

export default {
    getSellerDashboard,
    getAdminDashboard,
    getOrderTrends,
    getShipmentPerformance,
    // Week 9: New endpoints
    getRevenueStats,
    getWalletStats,
    getCustomerStats,
    getTopCustomers,
    getInventoryStats,
    getTopProducts,
    getCostAnalysis,
    getCourierComparison,
    getSLAPerformance,
    buildCustomReport,
    exportReport,
    saveReportConfig,
    listReportConfigs,
    deleteReportConfig,
    getSellerActions,
    getRecentCustomers,
    // Phase 4: Dashboard Analytics
    getProfitabilityAnalytics,
    getGeographicInsights,
    // Phase 5: Smart Insights
    getSmartInsights,
    getAdminInsights,
};
