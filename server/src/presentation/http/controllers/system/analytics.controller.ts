import { Response, NextFunction } from 'express';
import Order from '../../../../infrastructure/database/mongoose/models/Order';
import Shipment from '../../../../infrastructure/database/mongoose/models/Shipment';
import { AuthRequest } from '../../middleware/auth/auth';
import logger from '../../../../shared/logger/winston.logger';
import mongoose from 'mongoose';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import cacheService from '../../../../shared/services/cache.service';
import { sendSuccess, sendError } from '../../../../shared/utils/responseHelper';

/**
 * Analytics Controller
 * Handles dashboard analytics, order trends, and shipment performance metrics
 */
export const getSellerDashboard = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: false });
        if (!auth) return;

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
        const cached = cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Dashboard data retrieved from cache');
            return;
        }

        // Date filters
        const startDate = req.query.startDate
            ? new Date(req.query.startDate as string)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        const endDate = req.query.endDate
            ? new Date(req.query.endDate as string)
            : new Date();

        // Order counts by status
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

        // Weekly trend (last 7 days)
        const weeklyTrend = await Order.aggregate([
            {
                $match: {
                    companyId: companyObjectId,
                    isDeleted: false,
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$totals.total' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const responseData = {
            totalOrders,
            pendingOrders: statusCounts['pending'] || 0,
            readyToShip: statusCounts['ready_to_ship'] || 0,
            shippedOrders: statusCounts['shipped'] || 0,
            deliveredOrders: statusCounts['delivered'] || 0,
            cancelledOrders: statusCounts['cancelled'] || 0,
            rtoOrders: statusCounts['rto'] || 0,
            totalRevenue,
            successRate: parseFloat(successRate),
            codPending: {
                amount: codPending[0]?.total || 0,
                count: codPending[0]?.count || 0,
            },
            recentShipments,
            weeklyTrend,
            dateRange: { startDate, endDate },
        };

        // Cache for 5 minutes
        cacheService.set(cacheKey, responseData, 300);

        sendSuccess(res, responseData, 'Seller dashboard data retrieved successfully');
    } catch (error) {
        logger.error('Error fetching seller dashboard:', error);
        next(error);
    }
};

/**
 * Get admin dashboard analytics (multi-company)
 * @route GET /api/v1/analytics/dashboard/admin
 */
export const getAdminDashboard = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: false });
        if (!auth) return;

        // Admin role check
        if (req.user!.role !== 'admin') {
            sendError(res, 'Admin access required', 403, 'INSUFFICIENT_PERMISSIONS');
            return;
        }

        // Date filters
        const startDate = req.query.startDate
            ? new Date(req.query.startDate as string)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate
            ? new Date(req.query.endDate as string)
            : new Date();

        // Global order stats
        const globalOrderStats = await Order.aggregate([
            {
                $match: {
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

        const statusCounts: Record<string, number> = {};
        let totalOrders = 0;
        let totalRevenue = 0;

        globalOrderStats.forEach(stat => {
            statusCounts[stat._id] = stat.count;
            totalOrders += stat.count;
            totalRevenue += stat.totalValue;
        });

        // Global shipment stats
        const shipmentStats = await Shipment.aggregate([
            {
                $match: {
                    isDeleted: false,
                    createdAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: '$currentStatus',
                    count: { $sum: 1 },
                },
            },
        ]);

        let totalShipments = 0;
        let ndrCases = 0;
        shipmentStats.forEach(stat => {
            totalShipments += stat.count;
            if (stat._id === 'ndr') ndrCases = stat.count;
        });

        // Calculate global success rate
        const deliveredCount = statusCounts['delivered'] || 0;
        const shippedCount = statusCounts['shipped'] || 0;
        const rtoCount = statusCounts['rto'] || 0;
        const attemptedDeliveries = deliveredCount + shippedCount + rtoCount;
        const globalSuccessRate = attemptedDeliveries > 0
            ? ((deliveredCount / attemptedDeliveries) * 100).toFixed(1)
            : '0.0';

        // Per-company statistics
        const companiesStats = await Order.aggregate([
            {
                $match: {
                    isDeleted: false,
                    createdAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: '$companyId',
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totals.total' },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ['$currentStatus', 'pending'] }, 1, 0] },
                    },
                    deliveredOrders: {
                        $sum: { $cond: [{ $eq: ['$currentStatus', 'delivered'] }, 1, 0] },
                    },
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
            {
                $unwind: { path: '$company', preserveNullAndEmptyArrays: true },
            },
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
        ]);

        // Revenue graph (last 7 days)
        const revenueGraph = await Order.aggregate([
            {
                $match: {
                    isDeleted: false,
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$totals.total' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        sendSuccess(res, {
            totalOrders,
            totalRevenue,
            totalShipments,
            globalSuccessRate: parseFloat(globalSuccessRate),
            ndrCases,
            pendingOrders: statusCounts['pending'] || 0,
            deliveredOrders: statusCounts['delivered'] || 0,
            companiesStats,
            revenueGraph,
            dateRange: { startDate, endDate },
        }, 'Admin dashboard data retrieved successfully');
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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: false });
        if (!auth) return;

        const companyId = auth.companyId;
        const isAdmin = req.user!.role === 'admin';

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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: false });
        if (!auth) return;

        const companyId = auth.companyId;
        const isAdmin = req.user!.role === 'admin';

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

import RevenueAnalyticsService from '../../../../core/application/services/analytics/RevenueAnalyticsService.js';
import CustomerAnalyticsService from '../../../../core/application/services/analytics/CustomerAnalyticsService.js';
import InventoryAnalyticsService from '../../../../core/application/services/analytics/InventoryAnalyticsService.js';
import OrderAnalyticsService from '../../../../core/application/services/analytics/OrderAnalyticsService.js';
import ReportBuilderService from '../../../../core/application/services/analytics/ReportBuilderService.js';
import { buildReportSchema, saveReportConfigSchema } from '../../../../shared/validation/analytics-schemas.js';

/**
 * Get revenue statistics
 * @route GET /api/v1/analytics/revenue/stats
 */
export const getRevenueStats = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Check cache
        const cacheKey = `analytics:revenue:${auth.companyId}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Revenue stats (cached)');
            return;
        }

        const stats = await RevenueAnalyticsService.getRevenueStats(auth.companyId!, dateRange);
        cacheService.set(cacheKey, stats, 300);
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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Check cache
        const cacheKey = `analytics:wallet:${auth.companyId}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Wallet stats (cached)');
            return;
        }

        const stats = await RevenueAnalyticsService.getWalletStats(auth.companyId!, dateRange);
        cacheService.set(cacheKey, stats, 300);
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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Check cache
        const cacheKey = `analytics:customer:${auth.companyId}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Customer stats (cached)');
            return;
        }

        const stats = await CustomerAnalyticsService.getCustomerStats(auth.companyId!, dateRange);
        cacheService.set(cacheKey, stats, 300);
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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const limit = parseInt(req.query.limit as string) || 10;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Check cache
        const cacheKey = `analytics:topcustomers:${auth.companyId}:${limit}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Top customers (cached)');
            return;
        }

        const customers = await CustomerAnalyticsService.getTopCustomers(auth.companyId!, dateRange, limit);
        cacheService.set(cacheKey, customers, 300);
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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const warehouseId = req.query.warehouseId as string | undefined;

        // Check cache
        const cacheKey = `analytics:inventory:${auth.companyId}:${warehouseId || 'all'}`;
        const cached = cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Inventory stats (cached)');
            return;
        }

        const stats = await InventoryAnalyticsService.getStockLevels(auth.companyId!, warehouseId);
        cacheService.set(cacheKey, stats, 300);
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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const limit = parseInt(req.query.limit as string) || 10;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

        // Check cache
        const cacheKey = `analytics:topproducts:${auth.companyId}:${limit}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = cacheService.get(cacheKey);
        if (cached) {
            sendSuccess(res, cached, 'Top products (cached)');
            return;
        }

        const products = await OrderAnalyticsService.getTopProducts(auth.companyId!, dateRange, limit);
        cacheService.set(cacheKey, products, 300);
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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const validation = buildReportSchema.safeParse(req.body);
        if (!validation.success) {
            sendError(res, validation.error.errors[0].message, 400, 'VALIDATION_ERROR');
            return;
        }

        const { reportType, filters, metrics, groupBy } = validation.data;
        const report = await ReportBuilderService.buildCustomReport(
            auth.companyId!,
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
 * Save report configuration
 * @route POST /api/v1/analytics/reports/save
 */
export const saveReportConfig = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const validation = saveReportConfigSchema.safeParse(req.body);
        if (!validation.success) {
            sendError(res, validation.error.errors[0].message, 400, 'VALIDATION_ERROR');
            return;
        }

        const config = await ReportBuilderService.saveReportConfig(
            validation.data as any,
            auth.userId!,
            auth.companyId!
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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await ReportBuilderService.listReportConfigs(auth.companyId!, page, limit);
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
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: true });
        if (!auth) return;

        await ReportBuilderService.deleteReportConfig(req.params.id, auth.companyId!);
        sendSuccess(res, null, 'Report configuration deleted successfully');
    } catch (error) {
        logger.error('Error deleting report config:', error);
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
    buildCustomReport,
    saveReportConfig,
    listReportConfigs,
    deleteReportConfig,
};