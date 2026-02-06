import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import ScheduledReport from '../../../../infrastructure/database/mongoose/models/analytics/scheduled-report.model';
import ScheduledReportExecutorService from '../../../../core/application/services/analytics/scheduled-report-executor.service';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';
import { ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { validateObjectId } from '../../../../shared/helpers/controller.helpers';

/**
 * Scheduled Report Controller
 * Manage automated report generation and delivery
 */

/**
 * GET /api/v1/reports/scheduled
 * List all scheduled reports
 */
export const listScheduledReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { reportType, isActive, frequency } = req.query;

        const filters: any = { companyId: auth.companyId };
        if (reportType) filters.reportType = reportType;
        if (isActive !== undefined) filters.isActive = isActive === 'true';
        if (frequency) filters['schedule.frequency'] = frequency;

        const reports = await ScheduledReport.find(filters)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        sendSuccess(res, { reports, total: reports.length }, 'Scheduled reports retrieved successfully');
    } catch (error) {
        logger.error('Error listing scheduled reports:', error);
        next(error);
    }
};

/**
 * GET /api/v1/reports/scheduled/:id
 * Get single scheduled report
 */
export const getScheduledReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        validateObjectId(id, 'report');

        const report = await ScheduledReport.findOne({
            _id: id,
            companyId: auth.companyId,
        })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .lean();

        if (!report) {
            throw new ValidationError('Scheduled report not found');
        }

        sendSuccess(res, { report }, 'Scheduled report retrieved successfully');
    } catch (error) {
        logger.error('Error getting scheduled report:', error);
        next(error);
    }
};

/**
 * POST /api/v1/reports/scheduled
 * Create new scheduled report
 */
export const createScheduledReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const reportData = {
            ...req.body,
            companyId: auth.companyId,
            createdBy: auth.userId,
        };

        // Validate required fields
        if (!reportData.name || !reportData.reportType || !reportData.format) {
            throw new ValidationError('Name, report type, and format are required');
        }

        if (!reportData.schedule?.frequency) {
            throw new ValidationError('Schedule frequency is required');
        }

        if (!reportData.delivery?.method) {
            throw new ValidationError('Delivery method is required');
        }

        const report = await ScheduledReport.create(reportData);

        logger.info('Scheduled report created', {
            reportId: report._id,
            companyId: auth.companyId,
            createdBy: auth.userId,
        });

        sendCreated(res, { report }, 'Scheduled report created successfully');
    } catch (error) {
        logger.error('Error creating scheduled report:', error);
        next(error);
    }
};

/**
 * PATCH /api/v1/reports/scheduled/:id
 * Update scheduled report
 */
export const updateScheduledReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        validateObjectId(id, 'report');

        const report = await ScheduledReport.findOne({
            _id: id,
            companyId: auth.companyId,
        });

        if (!report) {
            throw new ValidationError('Scheduled report not found');
        }

        // Update fields
        const allowedUpdates = [
            'name',
            'description',
            'reportType',
            'filters',
            'columns',
            'groupBy',
            'sortBy',
            'aggregations',
            'schedule',
            'delivery',
            'format',
            'includeCharts',
            'includeNarrative',
            'isActive',
            'isPaused',
        ];

        allowedUpdates.forEach((field) => {
            if (req.body[field] !== undefined) {
                (report as any)[field] = req.body[field];
            }
        });

        report.updatedBy = new mongoose.Types.ObjectId(auth.userId);
        await report.save();

        logger.info('Scheduled report updated', {
            reportId: report._id,
            updatedBy: auth.userId,
        });

        sendSuccess(res, { report }, 'Scheduled report updated successfully');
    } catch (error) {
        logger.error('Error updating scheduled report:', error);
        next(error);
    }
};

/**
 * DELETE /api/v1/reports/scheduled/:id
 * Delete scheduled report
 */
export const deleteScheduledReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        validateObjectId(id, 'report');

        const report = await ScheduledReport.findOne({
            _id: id,
            companyId: auth.companyId,
        });

        if (!report) {
            throw new ValidationError('Scheduled report not found');
        }

        await report.deleteOne();

        logger.info('Scheduled report deleted', {
            reportId: report._id,
            deletedBy: auth.userId,
        });

        sendSuccess(res, null, 'Scheduled report deleted successfully');
    } catch (error) {
        logger.error('Error deleting scheduled report:', error);
        next(error);
    }
};

/**
 * POST /api/v1/reports/scheduled/:id/execute
 * Execute report immediately (manual trigger)
 */
export const executeReportNow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        validateObjectId(id, 'report');

        const report = await ScheduledReport.findOne({
            _id: id,
            companyId: auth.companyId,
        });

        if (!report) {
            throw new ValidationError('Scheduled report not found');
        }

        // Execute in background
        ScheduledReportExecutorService.executeReport(id)
            .then(() => {
                logger.info('Report executed successfully (manual trigger)', {
                    reportId: id,
                    triggeredBy: auth.userId,
                });
            })
            .catch((error) => {
                logger.error('Report execution failed (manual trigger)', {
                    reportId: id,
                    error: error.message,
                });
            });

        sendSuccess(res, { message: 'Report execution started' }, 'Report is being generated and will be delivered shortly');
    } catch (error) {
        logger.error('Error executing report:', error);
        next(error);
    }
};

/**
 * POST /api/v1/reports/scheduled/:id/pause
 * Pause scheduled report
 */
export const pauseReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        validateObjectId(id, 'report');

        const report = await ScheduledReport.findOne({
            _id: id,
            companyId: auth.companyId,
        });

        if (!report) {
            throw new ValidationError('Scheduled report not found');
        }

        report.isPaused = true;
        report.updatedBy = new mongoose.Types.ObjectId(auth.userId);
        await report.save();

        logger.info('Scheduled report paused', {
            reportId: report._id,
            pausedBy: auth.userId,
        });

        sendSuccess(res, { report }, 'Scheduled report paused successfully');
    } catch (error) {
        logger.error('Error pausing report:', error);
        next(error);
    }
};

/**
 * POST /api/v1/reports/scheduled/:id/resume
 * Resume scheduled report
 */
export const resumeReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const { id } = req.params;
        validateObjectId(id, 'report');

        const report = await ScheduledReport.findOne({
            _id: id,
            companyId: auth.companyId,
        });

        if (!report) {
            throw new ValidationError('Scheduled report not found');
        }

        report.isPaused = false;
        report.nextRunAt = report.calculateNextRun();
        report.updatedBy = new mongoose.Types.ObjectId(auth.userId);
        await report.save();

        logger.info('Scheduled report resumed', {
            reportId: report._id,
            resumedBy: auth.userId,
        });

        sendSuccess(res, { report }, 'Scheduled report resumed successfully');
    } catch (error) {
        logger.error('Error resuming report:', error);
        next(error);
    }
};

export default {
    listScheduledReports,
    getScheduledReport,
    createScheduledReport,
    updateScheduledReport,
    deleteScheduledReport,
    executeReportNow,
    pauseReport,
    resumeReport,
};
