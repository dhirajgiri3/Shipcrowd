import { Request, Response, NextFunction } from 'express';
import Order from '../../../infrastructure/database/mongoose/models/Order';
import Shipment from '../../../infrastructure/database/mongoose/models/Shipment';
import Company from '../../../infrastructure/database/mongoose/models/Company';
import { AuthRequest } from '../middleware/auth';
import logger from '../../../shared/logger/winston.logger';
import mongoose from 'mongoose';

/**
 * Get seller dashboard analytics
 * @route GET /api/v1/analytics/dashboard/seller
 */
export const getSellerDashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        if (!companyId) {
            res.status(403).json({ message: 'User is not associated with any company' });
            return;
        }

        const companyObjectId = new mongoose.Types.ObjectId(companyId);

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
            .select('trackingNumber carrier currentStatus createdAt deliveryDetails');

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

        res.json({
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
        });
    } catch (error) {
        logger.error('Error fetching seller dashboard:', error);
        next(error);
    }
};

/**
 * Get admin dashboard analytics (multi-company)
 * @route GET /api/v1/analytics/dashboard/admin
 */
export const getAdminDashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        // Admin role check
        if (req.user.role !== 'admin') {
            res.status(403).json({ message: 'Admin access required' });
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

        res.json({
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
        });
    } catch (error) {
        logger.error('Error fetching admin dashboard:', error);
        next(error);
    }
};

/**
 * Get order trends
 * @route GET /api/v1/analytics/orders
 */
export const getOrderTrends = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        const isAdmin = req.user.role === 'admin';

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

        // Orders by date
        const ordersByDate = await Order.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$totals.total' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Orders by status
        const ordersByStatus = await Order.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$currentStatus',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Orders by payment method
        const ordersByPayment = await Order.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$paymentMethod',
                    count: { $sum: 1 },
                    total: { $sum: '$totals.total' },
                },
            },
        ]);

        res.json({
            ordersByDate,
            ordersByStatus,
            ordersByPayment,
            period: { days, startDate, endDate: new Date() },
        });
    } catch (error) {
        logger.error('Error fetching order trends:', error);
        next(error);
    }
};

/**
 * Get shipment/delivery performance metrics
 * @route GET /api/v1/analytics/shipments
 */
export const getShipmentPerformance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const companyId = req.user.companyId;
        const isAdmin = req.user.role === 'admin';

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

        // Shipments by carrier
        const shipmentsByCarrier = await Shipment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$carrier',
                    count: { $sum: 1 },
                    totalShippingCost: { $sum: '$paymentDetails.shippingCost' },
                },
            },
        ]);

        // Shipments by status
        const shipmentsByStatus = await Shipment.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$currentStatus',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Average delivery time for delivered shipments
        const avgDeliveryTime = await Shipment.aggregate([
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
        ]);

        // NDR analysis
        const ndrAnalysis = await Shipment.aggregate([
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
        ]);

        res.json({
            shipmentsByCarrier,
            shipmentsByStatus,
            avgDeliveryTime: avgDeliveryTime[0] || { avgDays: 0, minDays: 0, maxDays: 0 },
            ndrAnalysis,
            period: { days, startDate, endDate: new Date() },
        });
    } catch (error) {
        logger.error('Error fetching shipment performance:', error);
        next(error);
    }
};

export default {
    getSellerDashboard,
    getAdminDashboard,
    getOrderTrends,
    getShipmentPerformance,
};
