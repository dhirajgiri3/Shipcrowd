/**
 * Fraud Controller
 * 
 * Admin endpoints for fraud detection management.
 * All endpoints require admin authentication.
 */

import { Request, Response } from 'express';
import FraudDetectionService from '@/core/application/services/fraud/fraud-detection.service';
import FraudAlert from '@/infrastructure/database/mongoose/models/fraud/fraud-alert.model';
import FraudRule from '@/infrastructure/database/mongoose/models/fraud/fraud-rule.model';
import Blacklist from '@/infrastructure/database/mongoose/models/fraud/blacklist.model';
import logger from '@/shared/logger/winston.logger';
import { AppError } from '@/shared/errors/app.error';

export default class FraudController {
    /**
     * GET /fraud/alerts
     * List fraud alerts with filtering and pagination
     */
    static async getAlerts(req: Request, res: Response): Promise<void> {
        try {
            const {
                status,
                riskLevel,
                page = 1,
                limit = 20,
            } = req.query;

            const filter: any = {};
            if (status) filter.status = status;
            if (riskLevel) filter.riskLevel = riskLevel;

            const skip = (Number(page) - 1) * Number(limit);

            const [alerts, total] = await Promise.all([
                FraudAlert.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit))
                    .populate('orderId', 'orderId orderValue')
                    .populate('companyId', 'companyName')
                    .lean(),
                FraudAlert.countDocuments(filter),
            ]);

            res.status(200).json({
                success: true,
                data: alerts,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error) {
            logger.error('Error fetching fraud alerts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch fraud alerts',
            });
        }
    }

    /**
     * GET /fraud/alerts/:id
     * Get alert details
     */
    static async getAlertById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const alert = await FraudAlert.findById(id)
                .populate('orderId')
                .populate('companyId')
                .populate('assignedTo', 'name email');

            if (!alert) {
                throw new AppError('Fraud alert not found', 'ALERT_NOT_FOUND', 404);
            }

            res.status(200).json({
                success: true,
                data: alert,
            });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
            } else {
                logger.error('Error fetching alert:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch alert',
                });
            }
        }
    }

    /**
     * PUT /fraud/alerts/:id/resolve
     * Resolve fraud alert
     */
    static async resolveAlert(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { action, reason } = req.body;
            const userId = (req as any).user?.id;

            if (!action || !reason) {
                throw new AppError('Action and reason are required', 'INVALID_INPUT', 400);
            }

            const alert = await FraudAlert.findById(id);
            if (!alert) {
                throw new AppError('Fraud alert not found', 'ALERT_NOT_FOUND', 404);
            }

            alert.status = 'resolved';
            alert.resolution = {
                action,
                reason,
                resolvedBy: userId,
                resolvedAt: new Date(),
            };

            await alert.save();

            logger.info('Fraud alert resolved', {
                alertId: alert.alertId,
                action,
                resolvedBy: userId,
            });

            res.status(200).json({
                success: true,
                message: 'Alert resolved successfully',
                data: alert,
            });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
            } else {
                logger.error('Error resolving alert:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to resolve alert',
                });
            }
        }
    }

    /**
     * POST /fraud/blacklist
     * Add to blacklist
     */
    static async addToBlacklist(req: Request, res: Response): Promise<void> {
        try {
            const { type, value, reason, severity, expiresAt } = req.body;
            const userId = (req as any).user?.id;

            if (!type || !value || !reason) {
                throw new AppError('Type, value, and reason are required', 'INVALID_INPUT', 400);
            }

            const blacklist = await FraudDetectionService.addToBlacklist({
                type,
                value,
                reason,
                severity: severity || 'medium',
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                createdBy: userId,
            });

            res.status(201).json({
                success: true,
                message: 'Added to blacklist successfully',
                data: blacklist,
            });
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message,
                });
            } else {
                logger.error('Error adding to blacklist:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to add to blacklist',
                });
            }
        }
    }

    /**
     * GET /fraud/blacklist
     * List blacklist entries
     */
    static async getBlacklist(req: Request, res: Response): Promise<void> {
        try {
            const { type, page = 1, limit = 20 } = req.query;

            const filter: any = {};
            if (type) filter.type = type;

            const skip = (Number(page) - 1) * Number(limit);

            const [entries, total] = await Promise.all([
                Blacklist.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit))
                    .lean(),
                Blacklist.countDocuments(filter),
            ]);

            res.status(200).json({
                success: true,
                data: entries,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error) {
            logger.error('Error fetching blacklist:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch blacklist',
            });
        }
    }

    /**
     * DELETE /fraud/blacklist/:id
     * Remove from blacklist
     */
    static async removeFromBlacklist(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            await FraudDetectionService.removeFromBlacklist(id);

            res.status(200).json({
                success: true,
                message: 'Removed from blacklist successfully',
            });
        } catch (error) {
            logger.error('Error removing from blacklist:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to remove from blacklist',
            });
        }
    }

    /**
     * GET /fraud/stats
     * Get fraud statistics
     */
    static async getStats(req: Request, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;

            const dateFilter: any = {};
            if (startDate) dateFilter.$gte = new Date(startDate as string);
            if (endDate) dateFilter.$lte = new Date(endDate as string);

            const filter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

            const [
                totalAlerts,
                alertsByRisk,
                alertsByStatus,
                blacklistCount,
                activeRules,
            ] = await Promise.all([
                FraudAlert.countDocuments(filter),
                FraudAlert.aggregate([
                    { $match: filter },
                    { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
                ]),
                FraudAlert.aggregate([
                    { $match: filter },
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ]),
                Blacklist.countDocuments(),
                FraudRule.countDocuments({ active: true }),
            ]);

            res.status(200).json({
                success: true,
                data: {
                    totalAlerts,
                    alertsByRisk: alertsByRisk.reduce((acc, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {}),
                    alertsByStatus: alertsByStatus.reduce((acc, item) => {
                        acc[item._id] = item.count;
                        return acc;
                    }, {}),
                    blacklistCount,
                    activeRules,
                },
            });
        } catch (error) {
            logger.error('Error fetching fraud stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch fraud statistics',
            });
        }
    }
}
