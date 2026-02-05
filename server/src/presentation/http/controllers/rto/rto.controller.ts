/**
 * RTO Controller
 *
 * Handles RTO management endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { RTOEvent } from '../../../../infrastructure/database/mongoose/models';
import RTOService from '../../../../core/application/services/rto/rto.service';
import { RTODispositionService } from '../../../../core/application/services/rto/rto-disposition.service';
import NDRAnalyticsService from '../../../../core/application/services/ndr/ndr-analytics.service';
import { AppError, ValidationError, NotFoundError, AuthenticationError, RateLimitError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import StorageService from '../../../../infrastructure/external/storage/storage.service';
import {
    listRTOEventsQuerySchema,
    triggerManualRTOSchema,
    updateRTOStatusSchema,
    recordQCResultSchema,
    getRTOStatsQuerySchema,
    getPendingRTOsQuerySchema,
    executeDispositionSchema,
} from '../../../../shared/validation/rto-schemas';

export class RTOController {
    /**
     * List RTO events
     * GET /rto/events
     */
    static async listRTOEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AuthenticationError('Unauthorized', ErrorCode.AUTH_REQUIRED);
            }

            // Validate query parameters
            const validation = listRTOEventsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const {
                returnStatus,
                rtoReason,
                warehouseId,
                page,
                limit,
                sortBy,
                sortOrder,
            } = validation.data;

            const filter: any = { company: companyId };

            if (returnStatus) {
                filter.returnStatus = returnStatus;
            }

            if (rtoReason) {
                filter.rtoReason = rtoReason;
            }

            if (warehouseId) {
                filter.warehouse = warehouseId;
            }

            const skip = (page - 1) * limit;

            const [events, total] = await Promise.all([
                RTOEvent.find(filter)
                    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('shipment order warehouse'),
                RTOEvent.countDocuments(filter),
            ]);

            sendSuccess(res, {
                data: events,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get RTO event by ID
     * GET /rto/events/:id
     */
    static async getRTOEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            const rtoEvent = await RTOEvent.findOne({ _id: id, company: companyId })
                .populate('shipment order warehouse ndrEvent');

            if (!rtoEvent) {
                throw new NotFoundError('RTO event', ErrorCode.RES_NOT_FOUND);
            }

            sendSuccess(res, { data: rtoEvent });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Trigger RTO manually
     * POST /rto/trigger
     */
    static async triggerRTO(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?._id;
            const companyId = req.user?.companyId;

            // Validate request body
            const validation = triggerManualRTOSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { shipmentId, reason, notes, warehouseId, expectedReturnDate } = validation.data;

            const result = await RTOService.triggerRTO(
                shipmentId,
                reason,
                undefined, // ndrEventId
                'manual',
                userId
            );

            if (!result.success) {
                // Issue #A: Add Retry-After header for rate limit errors (RFC 7231)
                if (result.error?.includes('Rate limit exceeded')) {
                    const retryAfterMatch = result.error.match(/Retry after (\d+) seconds/);
                    if (retryAfterMatch) {
                        const retryAfter = parseInt(retryAfterMatch[1], 10);
                        res.set('Retry-After', String(retryAfter));
                        throw new RateLimitError(result.error, retryAfter);
                    }
                }
                throw new AppError(result.error || 'Failed to trigger RTO', ErrorCode.EXT_SERVICE_ERROR, 400);
            }

            sendSuccess(res, {
                data: {
                    rtoEventId: result.rtoEventId,
                    reverseAwb: result.reverseAwb,
                }
            }, 'RTO triggered successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update RTO status
     * PATCH /rto/events/:id/status
     */
    static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            // Validate request body
            const validation = updateRTOStatusSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { returnStatus, notes, actualReturnDate, reverseAwb } = validation.data;
            const performedBy = req.user?._id?.toString() ?? 'system';

            // Verify ownership
            const rtoEvent = await RTOEvent.findOne({ _id: id, company: companyId });
            if (!rtoEvent) {
                throw new NotFoundError('RTO event', ErrorCode.RES_NOT_FOUND);
            }

            await RTOService.updateRTOStatus(id, returnStatus, {
                notes,
                actualReturnDate,
                reverseAwb,
                performedBy,
            });

            sendSuccess(res, null, 'RTO status updated');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Upload QC photos for an RTO event
     * POST /rto/events/:id/qc/upload
     * Expects multipart/form-data with field "photos" (array of image files)
     */
    static async uploadQCPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            const rtoEvent = await RTOEvent.findOne({ _id: id, company: companyId });
            if (!rtoEvent) {
                throw new NotFoundError('RTO event', ErrorCode.RES_NOT_FOUND);
            }

            const files = req.files as Express.Multer.File[];
            if (!files?.length) {
                throw new ValidationError('At least one photo is required', [{ field: 'photos', message: 'No files uploaded' }]);
            }

            const urls: string[] = [];
            for (const file of files) {
                if (!file.mimetype?.startsWith('image/')) {
                    throw new ValidationError('Only image files are allowed', [{ field: 'photos', message: `Invalid type: ${file.mimetype}` }]);
                }
                const result = await StorageService.upload(file.buffer, {
                    folder: `rto/qc/${id}`,
                    contentType: file.mimetype,
                });
                urls.push(result.url);
            }

            sendSuccess(res, { data: { urls } }, 'Photos uploaded');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Record QC result
     * POST /rto/events/:id/qc
     */
    static async recordQC(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user?._id;
            const companyId = req.user?.companyId;

            // Validate request body
            const validation = recordQCResultSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { qcResult, nextAction } = validation.data;

            // Verify ownership
            const rtoEvent = await RTOEvent.findOne({ _id: id, company: companyId });
            if (!rtoEvent) {
                throw new NotFoundError('RTO event', ErrorCode.RES_NOT_FOUND);
            }

            await RTOService.recordQCResult(id, {
                ...qcResult,
                inspectedBy: qcResult.inspectedBy || userId || 'system',
            });

            sendSuccess(res, null, 'QC result recorded');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get RTO statistics
     * GET /rto/analytics/stats
     */
    static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AuthenticationError('Unauthorized', ErrorCode.AUTH_REQUIRED);
            }

            // Validate query parameters
            const validation = getRTOStatsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { startDate, endDate, warehouseId, rtoReason } = validation.data;

            let dateRange;
            if (startDate && endDate) {
                dateRange = {
                    start: new Date(startDate),
                    end: new Date(endDate),
                };
            }

            const stats = await NDRAnalyticsService.getRTOStats(companyId, dateRange);

            sendSuccess(res, { data: stats });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Suggest disposition for an RTO (after QC completed)
     * GET /rto/events/:id/disposition/suggest
     */
    static async suggestDisposition(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;

            const rtoEvent = await RTOEvent.findOne({ _id: id, company: companyId });
            if (!rtoEvent) {
                throw new NotFoundError('RTO event', ErrorCode.RES_NOT_FOUND);
            }

            const suggestion = await RTODispositionService.suggestDisposition(id);
            sendSuccess(res, { data: suggestion });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Execute disposition for an RTO
     * POST /rto/events/:id/disposition/execute
     */
    static async executeDisposition(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const companyId = req.user?.companyId;
            const performedBy = req.user?._id?.toString() ?? 'system';

            const validation = executeDispositionSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const rtoEvent = await RTOEvent.findOne({ _id: id, company: companyId });
            if (!rtoEvent) {
                throw new NotFoundError('RTO event', ErrorCode.RES_NOT_FOUND);
            }

            const { action, notes } = validation.data;
            const updated = await RTODispositionService.executeDisposition(id, action, performedBy, { notes });

            sendSuccess(res, { data: updated }, 'Disposition applied');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get pending RTOs
     * GET /rto/pending
     */
    static async getPendingRTOs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new AuthenticationError('Unauthorized', ErrorCode.AUTH_REQUIRED);
            }

            // Validate query parameters
            const validation = getPendingRTOsQuerySchema.safeParse(req.query);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { warehouseId, daysUntilReturn } = validation.data;

            const pendingRTOs = await RTOEvent.getPendingRTOs(companyId);

            sendSuccess(res, { data: pendingRTOs });
        } catch (error) {
            next(error);
        }
    }
}

export default RTOController;
