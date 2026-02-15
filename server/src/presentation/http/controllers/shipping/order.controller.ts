import csv from 'csv-parser';
import ExcelJS from 'exceljs';
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Readable } from 'stream';
import OnboardingProgressService from '../../../../core/application/services/onboarding/progress.service';
import RiskScoringService from '../../../../core/application/services/risk/risk-scoring.service';
import { OrderService } from '../../../../core/application/services/shipping/order.service';
import { BulkOrderImportJob, Order } from '../../../../infrastructure/database/mongoose/models';
import { BulkOrderImportJobProcessor } from '../../../../infrastructure/jobs/shipping/bulk-order-import.job';
import { AppError, ConflictError, DatabaseError, NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import {
guardChecks,
parsePagination,
requireCompanyContext,
validateObjectId,
} from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import {
sendCreated,
sendPaginated,
sendSuccess
} from '../../../../shared/utils/responseHelper';
import {
createOrderSchema,
updateOrderSchema,
} from '../../../../shared/validation/schemas';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';

export const createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = createOrderSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }
        // Prevention Layer: Risk Scoring & Validation
        const riskAssessment = await RiskScoringService.assessOrder({
            orderValue: OrderService.calculateTotalsLegacy(validation.data.products).total,
            paymentMethod: (validation.data.paymentMethod || 'prepaid').toUpperCase() as any,
            customer: {
                name: validation.data.customerInfo.name,
                phone: validation.data.customerInfo.phone,
                email: validation.data.customerInfo.email
            },
            shippingAddress: {
                line1: validation.data.customerInfo.address.line1,
                line2: validation.data.customerInfo.address.line2,
                city: validation.data.customerInfo.address.city,
                state: validation.data.customerInfo.address.state,
                pincode: validation.data.customerInfo.address.postalCode
            },
            companyId: auth.companyId
        });

        // Add Risk & Validation Info to Payload
        (validation.data as any).riskInfo = {
            score: riskAssessment.riskScore,
            level: riskAssessment.level,
            factors: riskAssessment.flags,
            recommendations: [riskAssessment.recommendation]
        };

        (validation.data as any).validationInfo = {
            address: riskAssessment.validationResults?.address ? {
                isValid: riskAssessment.validationResults.address.isValid,
                score: riskAssessment.validationResults.address.score,
                issues: riskAssessment.validationResults.address.issues,
                normalizedAddress: riskAssessment.validationResults.address.normalizedAddress
            } : undefined,
            phone: {
                isValid: riskAssessment.details.phoneValid
            },
            cod: riskAssessment.validationResults?.cod ? {
                isAllowed: riskAssessment.validationResults.cod.isAllowed,
                reason: riskAssessment.validationResults.cod.reasons.join(', ')
            } : undefined
        };

        // Note: Pickup address is determined by warehouse selection, validation should happen getting warehouse details or during shipment creation

        const order = await OrderService.getInstance().createOrder({
            companyId: new mongoose.Types.ObjectId(auth.companyId),
            userId: auth.userId,
            payload: validation.data
        });

        await createAuditLog(auth.userId, auth.companyId, 'create', 'order', String(order._id), { orderNumber: order.orderNumber }, req);

        // ✅ ONBOARDING HOOK: Update progress
        try {
            await OnboardingProgressService.updateStep(auth.companyId, 'firstOrderCreated', auth.userId);
        } catch (err) {
            logger.error('Error updating onboarding progress for order creation:', err);
        }

        sendCreated(res, { order }, 'Order created successfully');
    } catch (error) {
        if (error instanceof Error && error.message === 'Failed to generate unique order number') {
            throw new DatabaseError('Failed to generate unique order number');
        }
        logger.error('Error creating order:', error);
        next(error);
    }
};

export const getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        // Only require company context if not an admin or if specific company is requested
        // If admin and no companyId in token, we fetch all (companyId = null)
        if (!auth.isAdmin && !auth.companyId) {
            requireCompanyContext(auth);
        }

        const { page, limit } = parsePagination(req.query as Record<string, any>);
        const sortBy = req.query.sortBy as string || 'createdAt';
        const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

// Extract filters
        const queryParams = {
            status: req.query.status,
            search: req.query.search,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            warehouse: req.query.warehouse,
            phone: req.query.phone,
            smartFilter: req.query.smartFilter, // Smart filter preset
            paymentStatus: req.query.paymentStatus // Payment status filter
        };

        // If admin with no companyId, pass null to service to fetch all
        const serviceCompanyId = auth.companyId || null;

        // Use the new Faceted Search service method
        const result = await OrderService.getInstance().listOrdersWithStats(
            serviceCompanyId,
            queryParams,
            { page, limit, sortBy, sortOrder }
        );

sendPaginated(res, result.orders, {
            page: result.page,
            pages: result.pages,
            total: result.total,
            limit: limit,
            hasNext: result.page < result.pages,
            hasPrev: result.page > 1
        }, 'Orders retrieved successfully', {
            stats: result.stats,
            filterCounts: result.filterCounts,
            globalStats: result.globalStats
        });
    } catch (error) {
        logger.error('Error fetching orders:', error);
        next(error);
    }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { orderId } = req.params;
        validateObjectId(orderId, 'order');

        const order = await Order.findOne({
            _id: orderId,
            companyId: auth.companyId,
            isDeleted: false,
        }).populate('warehouseId', 'name address').lean();

        if (!order) {
            throw new NotFoundError('Order', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        const status = String((order as any).currentStatus || '').toLowerCase();
        const hasShipment = Boolean((order as any).shippingDetails?.trackingNumber) ||
            ['shipped', 'delivered', 'rto', 'in_transit'].includes(status);

        sendSuccess(res, { order: { ...order, hasShipment } }, 'Order retrieved successfully');
    } catch (error) {
        logger.error('Error fetching order:', error);
        next(error);
    }
};

export const updateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { orderId } = req.params;
        validateObjectId(orderId, 'order');

        const validation = updateOrderSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const order = await Order.findOne({
            _id: orderId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!order) {
            throw new NotFoundError('Order', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        if (validation.data.currentStatus && validation.data.currentStatus !== order.currentStatus) {
            const result = await OrderService.getInstance().updateOrderStatus({
                orderId: String(order._id),
                currentStatus: order.currentStatus,
                newStatus: validation.data.currentStatus,
                currentVersion: order.__v,
                userId: auth.userId,
                companyId: auth.companyId // Added for cache tagging
            });

            if (!result.success) {
                if (result.code === 'CONCURRENT_MODIFICATION') {
                    throw new ConflictError(result.error || 'Concurrent modification detected');
                } else {
                    throw new ValidationError(result.error || 'Invalid status transition');
                }
            }
        }

        if (validation.data.customerInfo) {
            order.customerInfo = {
                ...order.customerInfo,
                ...validation.data.customerInfo
            };
        }
        if (validation.data.products) {
            order.products = validation.data.products;
            const totals = await OrderService.calculateTotals(validation.data.products);
            order.totals = { ...order.totals, ...totals };
        }
        if (validation.data.warehouseId !== undefined) {
            order.warehouseId = validation.data.warehouseId
                ? new mongoose.Types.ObjectId(validation.data.warehouseId)
                : undefined;
        }
        if (validation.data.externalOrderNumber !== undefined) {
            order.externalOrderNumber = validation.data.externalOrderNumber;
        }
        if (validation.data.paymentStatus) order.paymentStatus = validation.data.paymentStatus;
        if (validation.data.paymentMethod) order.paymentMethod = validation.data.paymentMethod;
        if (validation.data.notes !== undefined) order.notes = validation.data.notes;
        if (validation.data.tags) order.tags = validation.data.tags;

        await order.save();
        await createAuditLog(auth.userId, auth.companyId, 'update', 'order', orderId, { changes: Object.keys(validation.data) }, req);

        sendSuccess(res, { order }, 'Order updated successfully');
    } catch (error) {
        logger.error('Error updating order:', error);
        next(error);
    }
};

export const deleteOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { orderId } = req.params;
        validateObjectId(orderId, 'order');

        const order = await Order.findOne({
            _id: orderId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!order) {
            throw new NotFoundError('Order', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        const { canDelete, reason } = OrderService.getInstance().canDeleteOrder(order.currentStatus);
        if (!canDelete) {
            throw new AppError(reason || 'Cannot delete order', 'CANNOT_DELETE_ORDER', 400);
        }

        order.isDeleted = true;
        await order.save();
        await createAuditLog(auth.userId, auth.companyId, 'delete', 'order', orderId, { softDelete: true }, req);

        sendSuccess(res, null, 'Order deleted successfully');
    } catch (error) {
        logger.error('Error deleting order:', error);
        next(error);
    }
};

export const bulkImportOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        if (!req.file) {
            throw new ValidationError('CSV or Excel file is required');
        }

        const rows: any[] = [];
        const mimetype = req.file.mimetype;
        const isExcel = mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            || req.file.originalname.endsWith('.xlsx');

        if (isExcel) {
            // Excel parsing - pattern from remittance-reconciliation.service.ts
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(req.file.buffer);
            const worksheet = workbook.getWorksheet(1);

            if (!worksheet) {
                throw new ValidationError('Excel file contains no worksheets');
            }

            let headerRow: Record<number, string> | null = null;

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) {
                    headerRow = {};
                    row.eachCell((cell, colNumber) => {
                        headerRow![colNumber] = cell.toString().trim();
                    });
                    return;
                }

                if (headerRow) {
                    const rowData: any = {};
                    row.eachCell((cell, colNumber) => {
                        const columnName = headerRow![colNumber];
                        if (columnName) {
                            rowData[columnName] = cell.toString().trim();
                        }
                    });
                    rows.push(rowData);
                }
            });
        } else {
            // CSV parsing - wrap in Promise to ensure errors propagate
            await new Promise<void>((resolve, reject) => {
                const stream = Readable.from(req.file!.buffer.toString());
                stream
                    .pipe(csv())
                    .on('data', (row) => rows.push(row))
                    .on('end', () => resolve())
                    .on('error', (_err) => reject(new AppError('Failed to parse CSV file', 'CSV_PARSE_ERROR', 400)));
            });
        }

        const result = await OrderService.getInstance().bulkImportOrders({
            rows,
            companyId: new mongoose.Types.ObjectId(auth.companyId)
        });

        await createAuditLog(auth.userId, auth.companyId, 'create', 'order', 'bulk', {
            imported: result.created.length,
            failed: result.errors.length
        }, req);

        sendCreated(res, {
            created: result.created,
            errors: result.errors.length > 0 ? result.errors : undefined,
            imported: result.created.length,
            failed: result.errors.length
        }, `Imported ${result.created.length} orders`);
    } catch (error) {
        logger.error('Error importing orders:', error);
        next(error);
    }
};

/**
 * Bulk Import Orders (Async) - For large files (>1000 rows)
 * Queues the import job and returns job tracking ID for polling
 */
export const bulkImportOrdersAsync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        if (!req.file) {
            throw new ValidationError('CSV or Excel file is required');
        }

        const rows: any[] = [];
        const mimetype = req.file.mimetype;
        const fileName = req.file.originalname;
        const fileSize = req.file.size;
        const isExcel = mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            || fileName.endsWith('.xlsx');

        // Parse file (same logic as sync endpoint)
        if (isExcel) {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(req.file.buffer);
            const worksheet = workbook.getWorksheet(1);

            if (!worksheet) {
                throw new ValidationError('Excel file contains no worksheets');
            }

            let headerRow: Record<number, string> | null = null;

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) {
                    headerRow = {};
                    row.eachCell((cell, colNumber) => {
                        headerRow![colNumber] = cell.toString().trim();
                    });
                    return;
                }

                if (headerRow) {
                    const rowData: any = {};
                    row.eachCell((cell, colNumber) => {
                        const columnName = headerRow![colNumber];
                        if (columnName) {
                            rowData[columnName] = cell.toString().trim();
                        }
                    });
                    rows.push(rowData);
                }
            });
        } else {
            await new Promise<void>((resolve, reject) => {
                const stream = Readable.from(req.file!.buffer.toString());
                stream
                    .pipe(csv())
                    .on('data', (row) => rows.push(row))
                    .on('end', () => resolve())
                    .on('error', (_err) => reject(new AppError('Failed to parse CSV file', 'CSV_PARSE_ERROR', 400)));
            });
        }

        // Validate row count
        if (rows.length === 0) {
            throw new ValidationError('File contains no data rows');
        }

        // Create job tracking record
        const jobTracking = await BulkOrderImportJob.create({
            companyId: new mongoose.Types.ObjectId(auth.companyId),
            userId: new mongoose.Types.ObjectId(auth.userId),
            fileName,
            fileSize,
            totalRows: rows.length,
            status: 'pending',
            progress: 0,
            errors: [],
            created: [],
            jobId: '', // Will be set after queuing
        });

        // Queue the job
        const jobId = await BulkOrderImportJobProcessor.queueBulkImport({
            jobTrackingId: (jobTracking._id as mongoose.Types.ObjectId).toString(),
            companyId: auth.companyId,
            rows,
        });

        // Update job tracking with BullMQ job ID
        jobTracking.jobId = jobId;
        await jobTracking.save();

        await createAuditLog(auth.userId, auth.companyId, 'create', 'order', 'bulk_async', {
            jobId,
            totalRows: rows.length
        }, req);

        sendCreated(res, {
            jobId: (jobTracking._id as mongoose.Types.ObjectId).toString(),
            status: 'pending',
            totalRows: rows.length,
            message: 'Bulk import job queued successfully. Use the job ID to poll for status.'
        }, 'Bulk import job queued');
    } catch (error) {
        logger.error('Error queueing bulk import:', error);
        next(error);
    }
};

/**
 * Get Bulk Import Job Status
 * Returns the current status and progress of a bulk import job
 */
export const getBulkImportJobStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { jobId } = req.params;
        validateObjectId(jobId, 'jobId');

        const job = await BulkOrderImportJob.findOne({
            _id: jobId,
            companyId: new mongoose.Types.ObjectId(auth.companyId)
        });

        if (!job) {
            throw new NotFoundError('Bulk import job not found');
        }

        sendSuccess(res, {
            jobId: (job._id as mongoose.Types.ObjectId).toString(),
            status: job.status,
            progress: job.progress,
            totalRows: job.totalRows,
            processedRows: job.processedRows,
            successCount: job.successCount,
            errorCount: job.errorCount,
            fileName: job.fileName,
            fileSize: job.fileSize,
            created: job.created,
            errors: job.errors,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            errorMessage: job.errorMessage,
            metadata: job.metadata,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
        });
    } catch (error) {
        logger.error('Error fetching bulk import job status:', error);
        next(error);
    }
};

export const cloneOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { orderId } = req.params;
        validateObjectId(orderId, 'order');

        const result = await OrderService.getInstance().cloneOrder({
            orderId,
            companyId: auth.companyId,
            modifications: req.body.modifications
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'create',
            'order',
            String(result.clonedOrder._id),
            { clonedFrom: result.originalOrderNumber },
            req
        );

        sendCreated(res, result, 'Order cloned successfully');
    } catch (error) {
        logger.error('Error cloning order:', error);
        next(error);
    }
};

export const splitOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { orderId } = req.params;
        validateObjectId(orderId, 'order');

        if (!req.body.splits || !Array.isArray(req.body.splits) || req.body.splits.length < 2) {
            throw new ValidationError('At least 2 splits are required');
        }

        const result = await OrderService.getInstance().splitOrder({
            orderId,
            companyId: auth.companyId,
            splits: req.body.splits
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'create',
            'order',
            'split',
            {
                originalOrder: result.originalOrderNumber,
                splitCount: result.splitOrders.length,
                splitOrders: result.splitOrders.map(o => o.orderNumber)
            },
            req
        );

        sendCreated(res, result, `Order split into ${result.splitOrders.length} orders`);
    } catch (error) {
        logger.error('Error splitting order:', error);
        next(error);
    }
};

export const mergeOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        if (!req.body.orderIds || !Array.isArray(req.body.orderIds) || req.body.orderIds.length < 2) {
            throw new ValidationError('At least 2 order IDs are required for merging');
        }

        // Validate all orderIds
        req.body.orderIds.forEach((id: string, index: number) => {
            validateObjectId(id, `orderIds[${index}]`);
        });

        const result = await OrderService.getInstance().mergeOrders({
            orderIds: req.body.orderIds,
            companyId: auth.companyId,
            mergeOptions: req.body.mergeOptions
        });

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'create',
            'order',
            String(result.mergedOrder.id),
            {
                mergedFrom: result.cancelledOrders,
                mergedOrderNumber: result.mergedOrder.orderNumber
            },
            req
        );

        sendCreated(res, result, `${result.cancelledOrders.length} orders merged successfully`);
    } catch (error) {
        logger.error('Error merging orders:', error);
        next(error);
    }
};

export default {
    createOrder,
    getOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    bulkImportOrders,
    bulkImportOrdersAsync,
    getBulkImportJobStatus,
    cloneOrder,
    splitOrder,
    mergeOrders,
};
