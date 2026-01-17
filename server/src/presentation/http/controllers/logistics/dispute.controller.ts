/**
 * Dispute Controller
 *
 * Handles all HTTP requests for dispute resolution system:
 * - CRUD operations for disputes
 * - Evidence management (upload, view, delete)
 * - Status transitions (pending → investigating → resolved → closed)
 * - Escalation management
 * - Analytics and reporting
 * - Courier integration
 *
 * AUTHENTICATION:
 * ==============
 * - Customer endpoints: Require authentication, can only access own disputes
 * - Admin endpoints: Require admin role
 * - System endpoints: Internal use only
 *
 * RATE LIMITING:
 * =============
 * - Create dispute: 10 requests/hour per company
 * - Add evidence: 20 requests/hour per dispute
 * - Analytics: 100 requests/hour per company
 */

import { Request, Response } from 'express';
import DisputeService from '@/core/application/services/logistics/dispute.service';
import DisputeAnalyticsService from '@/core/application/services/logistics/dispute-analytics.service';
import logger from '@/shared/logger/winston.logger';
import { AppError, normalizeError } from '@/shared/errors/app.error';
import { sendSuccess, sendCreated, sendPaginated, calculatePagination } from '@/shared/utils/responseHelper';

// ============================================================================
// CUSTOMER ENDPOINTS
// ============================================================================

export default class DisputeController {
    /**
     * POST /disputes
     * Create new dispute
     */
    static async createDispute(req: Request, res: Response): Promise<void> {
        try {
            const {
                shipmentId,
                type,
                category,
                description,
                evidence,
            } = req.body;

            const userId = req.user?._id?.toString();
            const companyId = req.user?.companyId;

            if (!userId || !companyId) {
                throw new AppError('Authentication required', 'AUTH_REQUIRED', 401);
            }

            const dispute = await DisputeService.createDispute({
                shipmentId,
                companyId,
                userId,
                type,
                category,
                description,
                evidence,
            });

            logger.info('Dispute created successfully', {
                disputeId: dispute.disputeId,
                userId,
                companyId,
            });

            sendCreated(res, dispute, 'Dispute created successfully');
        } catch (error) {
            logger.error('Error creating dispute:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * GET /disputes
     * List all disputes for authenticated user/company
     */
    static async getDisputes(req: Request, res: Response): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

            if (!companyId && !isAdmin) {
                throw new AppError('Authentication required', 'AUTH_REQUIRED', 401);
            }

            const {
                page = 1,
                limit = 20,
                status,
                priority,
                type,
                category,
                startDate,
                endDate,
                search,
            } = req.query;

            const filter: any = {};

            // Non-admin users can only see their company's disputes
            if (!isAdmin && companyId) {
                filter.companyId = companyId;
            }

            if (status) filter.status = status;
            if (priority) filter.priority = priority;
            if (type) filter.type = type;
            if (category) filter.category = category;

            if (startDate || endDate) {
                filter.createdAt = {};
                if (startDate) filter.createdAt.$gte = new Date(startDate as string);
                if (endDate) filter.createdAt.$lte = new Date(endDate as string);
            }

            if (search) {
                filter.$or = [
                    { disputeId: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { 'customerDetails.name': { $regex: search, $options: 'i' } },
                    { 'customerDetails.phone': { $regex: search, $options: 'i' } },
                ];
            }

            const skip = (Number(page) - 1) * Number(limit);

            const [disputes, total] = await Promise.all([
                DisputeService.getDisputes(filter, Number(limit), skip),
                DisputeService.countDisputes(filter),
            ]);

            const pagination = calculatePagination(total, Number(page), Number(limit));
            sendPaginated(res, disputes, pagination);
        } catch (error) {
            logger.error('Error fetching disputes:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * GET /disputes/:id
     * Get single dispute details
     */
    static async getDisputeById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

            const dispute = await DisputeService.getDisputeById(id);

            // Authorization check: users can only view their company's disputes
            if (!isAdmin && dispute.companyId.toString() !== companyId) {
                throw new AppError(
                    'Not authorized to view this dispute',
                    'UNAUTHORIZED',
                    403
                );
            }

            res.status(200).json({ success: true, data: dispute });
        } catch (error) {
            logger.error('Error fetching dispute:', error);
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
            } else {
                res.status(500).json({ success: false, message: 'Internal server error' });
            }
        }
    }

    /**
     * POST /disputes/:id/evidence
     * Add evidence to dispute
     */
    static async addEvidence(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { type, url, description } = req.body;
            const userId = req.user?._id?.toString();

            if (!userId) {
                throw new AppError('Authentication required', 'AUTH_REQUIRED', 401);
            }

            const dispute = await DisputeService.addEvidence({
                disputeId: id,
                userId,
                evidence: {
                    type,
                    url,
                    description,
                },
            });

            logger.info('Evidence added to dispute', {
                disputeId: id,
                evidenceType: type,
                userId,
            });

            res.status(200).json({ success: true, data: dispute, message: 'Evidence added successfully' });
        } catch (error) {
            logger.error('Error adding evidence:', error);
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
            } else {
                res.status(500).json({ success: false, message: 'Internal server error' });
            }
        }
    }

    /**
     * GET /disputes/:id/timeline
     * Get dispute timeline
     */
    static async getTimeline(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

            const dispute = await DisputeService.getDisputeById(id);

            // Authorization check
            if (!isAdmin && dispute.companyId.toString() !== companyId) {
                throw new AppError(
                    'Not authorized to view this dispute',
                    'UNAUTHORIZED',
                    403
                );
            }

            res.status(200).json({ success: true, data: { timeline: dispute.timeline } });
        } catch (error) {
            logger.error('Error fetching timeline:', error);
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
            } else {
                res.status(500).json({ success: false, message: 'Internal server error' });
            }
        }
    }

    // ========================================================================
    // ADMIN ENDPOINTS
    // ========================================================================

    /**
     * PUT /admin/disputes/:id/status
     * Update dispute status (admin only)
     */
    static async updateStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            const userId = req.user?._id?.toString();

            if (!userId) {
                throw new AppError('Authentication required', 'AUTH_REQUIRED', 401);
            }

            const dispute = await DisputeService.updateStatus({
                disputeId: id,
                userId,
                status,
                notes,
            });

            logger.info('Dispute status updated', {
                disputeId: id,
                newStatus: status,
                userId,
            });

            res.status(200).json({ success: true, data: dispute, message: 'Status updated successfully' });
        } catch (error) {
            logger.error('Error updating status:', error);
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
            } else {
                res.status(500).json({ success: false, message: 'Internal server error' });
            }
        }
    }

    /**
     * POST /admin/disputes/:id/escalate
     * Escalate dispute (admin only)
     */
    static async escalateDispute(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.user?._id?.toString();

            if (!userId) {
                throw new AppError('Authentication required', 'AUTH_REQUIRED', 401);
            }

            const dispute = await DisputeService.escalateDispute(id, userId, reason);

            logger.warn('Dispute escalated', {
                disputeId: id,
                reason,
                userId,
            });

            res.status(200).json({ success: true, data: dispute, message: 'Dispute escalated successfully' });
        } catch (error) {
            logger.error('Error escalating dispute:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * PUT /admin/disputes/:id/resolve
     * Resolve dispute (admin only)
     */
    static async resolveDispute(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { resolution } = req.body;
            const userId = req.user?._id?.toString();

            if (!userId) {
                throw new AppError('Authentication required', 'AUTH_REQUIRED', 401);
            }

            const dispute = await DisputeService.resolveDispute({
                disputeId: id,
                userId,
                resolution,
            });

            logger.info('Dispute resolved', {
                disputeId: id,
                resolutionType: resolution.type,
                userId,
            });

            res.status(200).json({ success: true, data: dispute, message: 'Dispute resolved successfully' });
        } catch (error) {
            logger.error('Error resolving dispute:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * PUT /admin/disputes/:id/assign
     * Assign dispute to agent (admin only)
     */
    static async assignDispute(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { assignedTo } = req.body;
            const userId = req.user?._id?.toString();

            if (!userId) {
                throw new AppError('Authentication required', 'AUTH_REQUIRED', 401);
            }

            const dispute = await DisputeService.assignDispute(id, assignedTo, userId);

            logger.info('Dispute assigned', {
                disputeId: id,
                assignedTo,
                assignedBy: userId,
            });

            res.status(200).json({ success: true, data: dispute, message: 'Dispute assigned successfully' });
        } catch (error) {
            logger.error('Error assigning dispute:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * DELETE /admin/disputes/:id
     * Soft delete dispute (admin only)
     */
    static async deleteDispute(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user?._id?.toString();

            if (!userId) {
                throw new AppError('Authentication required', 'AUTH_REQUIRED', 401);
            }

            await DisputeService.deleteDispute(id, userId);

            logger.info('Dispute deleted', {
                disputeId: id,
                deletedBy: userId,
            });

            res.status(200).json({ success: true, data: null, message: 'Dispute deleted successfully' });
        } catch (error) {
            logger.error('Error deleting dispute:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    // ========================================================================
    // ANALYTICS ENDPOINTS
    // ========================================================================

    /**
     * GET /disputes/stats
     * Get dispute statistics
     */
    static async getStats(req: Request, res: Response): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

            const {
                startDate,
                endDate,
                type,
                status,
                priority,
            } = req.query;

            const filter: any = {};

            // Non-admin users can only see their company's stats
            if (!isAdmin && companyId) {
                filter.companyId = companyId;
            }

            if (startDate) filter.startDate = new Date(startDate as string);
            if (endDate) filter.endDate = new Date(endDate as string);
            if (type) filter.type = type as string;
            if (status) filter.status = status as string;
            if (priority) filter.priority = priority as string;

            const stats = await DisputeAnalyticsService.getDisputeStats(filter);

            res.status(200).json({ success: true, data: stats });
        } catch (error) {
            logger.error('Error fetching dispute stats:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * GET /disputes/trends
     * Get dispute trends over time
     */
    static async getTrends(req: Request, res: Response): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

            const { startDate, endDate, groupBy = 'day' } = req.query;

            const filter: any = {};

            if (!isAdmin && companyId) {
                filter.companyId = companyId;
            }

            if (startDate) filter.startDate = new Date(startDate as string);
            if (endDate) filter.endDate = new Date(endDate as string);

            const trends = await DisputeAnalyticsService.getDisputeTrends(
                filter,
                groupBy as 'day' | 'week' | 'month'
            );

            res.status(200).json({ success: true, data: { trends } });
        } catch (error) {
            logger.error('Error fetching dispute trends:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * GET /admin/disputes/agent-performance
     * Get agent performance metrics (admin only)
     */
    static async getAgentPerformance(req: Request, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;

            const filter: any = {};

            if (startDate) filter.startDate = new Date(startDate as string);
            if (endDate) filter.endDate = new Date(endDate as string);

            const performance = await DisputeAnalyticsService.getAgentPerformance(filter);

            res.status(200).json({ success: true, data: { agents: performance } });
        } catch (error) {
            logger.error('Error fetching agent performance:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * GET /disputes/top-reasons
     * Get top dispute reasons/categories
     */
    static async getTopReasons(req: Request, res: Response): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

            const { startDate, endDate, limit = 10 } = req.query;

            const filter: any = {};

            if (!isAdmin && companyId) {
                filter.companyId = companyId;
            }

            if (startDate) filter.startDate = new Date(startDate as string);
            if (endDate) filter.endDate = new Date(endDate as string);

            const reasons = await DisputeAnalyticsService.getTopDisputeReasons(
                filter,
                Number(limit)
            );

            res.status(200).json({ success: true, data: { reasons } });
        } catch (error) {
            logger.error('Error fetching top dispute reasons:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * GET /admin/disputes/sla-breaches
     * Get SLA breach summary (admin only)
     */
    static async getSLABreaches(req: Request, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;

            const filter: any = {};

            if (startDate) filter.startDate = new Date(startDate as string);
            if (endDate) filter.endDate = new Date(endDate as string);

            const breaches = await DisputeAnalyticsService.getSLABreachSummary(filter);

            res.status(200).json({ success: true, data: breaches });
        } catch (error) {
            logger.error('Error fetching SLA breaches:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    // ========================================================================
    // COURIER INTEGRATION ENDPOINTS
    // ========================================================================

    /**
     * POST /admin/disputes/:id/courier-query
     * Query courier about dispute (admin only)
     */
    static async queryCourier(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user?._id?.toString();

            if (!userId) {
                throw new AppError('Authentication required', 'AUTH_REQUIRED', 401);
            }

            // TODO: Implement courier integration
            // This will integrate with carrier APIs to query dispute status

            logger.info('Courier query initiated', {
                disputeId: id,
                userId,
            });

            sendSuccess(res, {
                message: 'Courier query initiated. You will be notified when response is received.',
            });
        } catch (error) {
            logger.error('Error querying courier:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }

    /**
     * POST /webhooks/disputes/courier/:courierId
     * Webhook to receive courier responses
     */
    static async courierWebhook(req: Request, res: Response): Promise<void> {
        try {
            const { courierId } = req.params;
            const webhookData = req.body;

            logger.info('Courier webhook received', {
                courierId,
                data: webhookData,
            });

            // TODO: Implement webhook processing
            // Parse webhook data, update dispute with courier response

            res.status(200).json({ success: true, data: { received: true } });
        } catch (error) {
            logger.error('Error processing courier webhook:', error);
            const appError = normalizeError(error);
            res.status(appError.statusCode).json(appError.toJSON());
        }
    }
}
