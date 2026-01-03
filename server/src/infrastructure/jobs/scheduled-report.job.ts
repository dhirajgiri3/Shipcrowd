/**
 * Scheduled Report Job
 *
 * Background job for generating and sending scheduled reports.
 * Follows the same pattern as NDRResolutionJob.
 */

import { Job } from 'bullmq';
import ReportConfig from '../database/mongoose/models/report-config.model';
import ReportBuilderService from '../../core/application/services/analytics/report-builder.service';
import CSVExportService from '../../shared/services/export/csv-export.service';
import ExcelExportService from '../../shared/services/export/excel-export.service';
import PDFExportService from '../../shared/services/export/pdf-export.service';
import CloudinaryStorageService from '../storage/cloudinary-storage.service';
import QueueManager from '../queue/queue.manager';
import logger from '../../shared/logger/winston.logger';

interface ScheduledReportJobData {
    reportConfigId: string;
    companyId: string;
    type?: 'generate' | 'send';
}

export class ScheduledReportJob {
    private static readonly QUEUE_NAME = 'scheduled-reports';

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 3,
        });

        // Schedule daily check for reports that need to run
        await this.scheduleReportChecker();

        logger.info('Scheduled report worker initialized');
    }

    /**
     * Process job
     */
    private static async processJob(job: Job<ScheduledReportJobData>): Promise<any> {
        const { reportConfigId, companyId, type = 'generate' } = job.data;

        logger.info('Processing scheduled report job', {
            jobId: job.id,
            reportConfigId,
            type,
        });

        try {
            switch (type) {
                case 'generate':
                    await this.generateReport(reportConfigId, companyId);
                    break;

                default:
                    logger.warn('Unknown job type', { type });
            }

            return { success: true };
        } catch (error: any) {
            logger.error('Scheduled report job failed', {
                jobId: job.id,
                reportConfigId,
                error: error.message,
            });

            throw error;
        }
    }

    /**
     * Generate scheduled report
     */
    private static async generateReport(reportConfigId: string, companyId: string): Promise<void> {
        const config = await ReportConfig.findOne({
            _id: reportConfigId,
            company: companyId,
            'schedule.enabled': true
        });

        if (!config) {
            logger.warn('Report config not found or disabled', { reportConfigId });
            return;
        }

        // Build the report
        const reportResult = await ReportBuilderService.buildReport(reportConfigId, companyId);

        // Export to configured format
        const format = config.schedule?.format || 'excel';
        let buffer: Buffer;
        let filename: string;

        const flatData = this.flattenReportData(reportResult.data);

        switch (format) {
            case 'csv':
                buffer = await CSVExportService.exportToCSV(flatData, CSVExportService.getOrderColumns());
                filename = `${config.name}_${Date.now()}.csv`;
                break;

            case 'pdf':
                buffer = await PDFExportService.exportToPDF(flatData, PDFExportService.getOrderColumns(), {
                    title: config.name
                });
                filename = `${config.name}_${Date.now()}.pdf`;
                break;

            case 'excel':
            default:
                buffer = await ExcelExportService.exportToExcel(flatData, ExcelExportService.getOrderColumns(), {
                    title: config.name,
                    sheetName: config.reportType
                });
                filename = `${config.name}_${Date.now()}.xlsx`;
                break;
        }

        // Upload to Cloudinary if configured
        if (CloudinaryStorageService.isConfigured()) {
            const uploadResult = await CloudinaryStorageService.uploadFile(
                buffer,
                filename,
                format as 'csv' | 'xlsx' | 'pdf'
            );

            // Generate signed URL with 7-day expiry for scheduled reports
            const signedUrl = CloudinaryStorageService.getSignedUrl(uploadResult.publicId, 7 * 24 * 3600);
            const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

            logger.info('Scheduled report generated and uploaded', {
                reportConfigId,
                filename,
                url: uploadResult.secureUrl
            });

            // Send email to recipients with download link
            if (config.schedule?.recipients?.length) {
                const EmailService = (await import('../../core/application/services/communication/email.service.js')).default;

                const emailSubject = `Scheduled Report: ${config.name}`;
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Your Scheduled Report is Ready</h2>
                        <p>Hello,</p>
                        <p>Your scheduled report "<strong>${config.name}</strong>" has been generated successfully.</p>

                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Report Type:</strong> ${config.reportType}</p>
                            <p style="margin: 5px 0;"><strong>Format:</strong> ${format.toUpperCase()}</p>
                            <p style="margin: 5px 0;"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                            <p style="margin: 5px 0;"><strong>Expires:</strong> ${expiresAt.toLocaleString()}</p>
                        </div>

                        <p>
                            <a href="${signedUrl}"
                               style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px;
                                      text-decoration: none; border-radius: 4px; font-weight: bold;">
                                Download Report
                            </a>
                        </p>

                        <p style="color: #666; font-size: 12px;">
                            Note: This download link will expire in 7 days for security purposes.
                        </p>

                        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                        <p style="color: #999; font-size: 11px;">
                            This is an automated email from Shipcrowd Analytics. Please do not reply to this message.
                        </p>
                    </div>
                `;

                // Send to all recipients
                for (const recipient of config.schedule.recipients) {
                    try {
                        await EmailService.sendEmail(recipient, emailSubject, emailHtml);
                        logger.info('Scheduled report email sent', { recipient, reportConfigId });
                    } catch (emailError: any) {
                        logger.error('Failed to send scheduled report email', {
                            recipient,
                            reportConfigId,
                            error: emailError.message
                        });
                        // Continue with other recipients even if one fails
                    }
                }
            }
        }

        // Update last run time
        await ReportConfig.updateOne(
            { _id: reportConfigId },
            { $set: { 'schedule.lastRun': new Date() } }
        );
    }

    /**
     * Flatten nested report data for export
     */
    private static flattenReportData(data: any): any[] {
        if (Array.isArray(data)) {
            return data;
        }

        // If data has a stats object, return it as single row
        if (data.stats) {
            return [data.stats];
        }

        // If data has trends, return those
        if (data.trends && Array.isArray(data.trends)) {
            return data.trends;
        }

        // Fallback: wrap in array
        return [data];
    }

    /**
     * Queue report generation
     */
    static async queueReportGeneration(reportConfigId: string, companyId: string): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            `report-${reportConfigId}-${Date.now()}`,
            {
                reportConfigId,
                companyId,
                type: 'generate',
            }
        );
    }

    /**
     * Schedule daily report checker
     */
    private static async scheduleReportChecker(): Promise<void> {
        // Run every hour to check for due reports
        await QueueManager.addJob(
            this.QUEUE_NAME,
            'report-checker',
            { type: 'check' as any },
            {
                repeat: {
                    pattern: '0 * * * *' // Every hour
                }
            }
        );
    }

    /**
     * Check for reports that need to run
     */
    static async checkDueReports(): Promise<number> {
        const now = new Date();
        let count = 0;

        // Find all enabled scheduled reports
        const configs = await ReportConfig.find({
            'schedule.enabled': true
        }).lean();

        for (const config of configs) {
            if (this.shouldRunReport(config, now)) {
                await this.queueReportGeneration(
                    config._id.toString(),
                    config.company.toString()
                );
                count++;
            }
        }

        if (count > 0) {
            logger.info(`Queued ${count} scheduled reports`);
        }

        return count;
    }

    /**
     * Determine if a report should run based on schedule
     */
    private static shouldRunReport(config: any, now: Date): boolean {
        const schedule = config.schedule;
        if (!schedule?.enabled) return false;

        const lastRun = schedule.lastRun ? new Date(schedule.lastRun) : null;

        switch (schedule.frequency) {
            case 'daily':
                // Run if never run or last run was yesterday or earlier
                if (!lastRun) return true;
                return now.getDate() !== lastRun.getDate();

            case 'weekly':
                // Run on Mondays if last run was more than 6 days ago
                if (now.getDay() !== 1) return false;
                if (!lastRun) return true;
                const daysSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24);
                return daysSinceLastRun >= 6;

            case 'monthly':
                // Run on 1st of month
                if (now.getDate() !== 1) return false;
                if (!lastRun) return true;
                return now.getMonth() !== lastRun.getMonth();

            default:
                return false;
        }
    }
}

export default ScheduledReportJob;
