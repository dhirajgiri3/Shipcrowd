import axios from 'axios';
import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import nodemailer from 'nodemailer';
import ScheduledReport from '../../../../infrastructure/database/mongoose/models/analytics/scheduled-report.model';
import WalletTransaction from '../../../../infrastructure/database/mongoose/models/finance/wallets/wallet-transaction.model';
import Shipment from '../../../../infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';
import Order from '../../../../infrastructure/database/mongoose/models/orders/core/order.model';
import { AppError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Scheduled Report Executor Service
 * Executes scheduled reports and delivers them
 */

class ScheduledReportExecutorService {
    private emailTransporter: nodemailer.Transporter;

    constructor() {
        // Initialize email transporter
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    /**
     * Execute a single scheduled report
     */
    async executeReport(reportId: string): Promise<void> {
        const report = await ScheduledReport.findById(reportId);

        if (!report || !report.isActive || report.isPaused) {
            logger.warn('Report not found or inactive', { reportId });
            return;
        }

        try {
            logger.info('Executing scheduled report', {
                reportId: report._id,
                name: report.name,
                type: report.reportType,
            });

            // Fetch data based on report type
            const data = await this.fetchReportData(report);

            // Generate report file
            const { buffer, filename } = await this.generateReportFile(report, data);

            // Deliver report
            await this.deliverReport(report, buffer, filename);

            // Update report status
            report.lastExecution = {
                executedAt: new Date(),
                status: 'success',
                recordCount: data.length,
            };
            report.executionCount += 1;
            report.successCount += 1;
            report.lastRunAt = new Date();
            report.nextRunAt = report.calculateNextRun();

            await report.save();

            logger.info('Report executed successfully', {
                reportId: report._id,
                recordCount: data.length,
            });
        } catch (error) {
            logger.error('Report execution failed', {
                reportId: report._id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            report.lastExecution = {
                executedAt: new Date(),
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            report.executionCount += 1;
            report.failureCount += 1;
            report.lastRunAt = new Date();
            report.nextRunAt = report.calculateNextRun();

            await report.save();

            throw error;
        }
    }

    /**
     * Fetch data for report
     */
    private async fetchReportData(report: any): Promise<any[]> {
        const { filters, columns, sortBy, groupBy, aggregations } = report;

        // Build date range
        const dateRange = this.buildDateRange(filters.dateRange, filters.customStartDate, filters.customEndDate);

        // Build query based on report type
        let query: any = {
            companyId: report.companyId,
        };

        if (dateRange) {
            query.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
        }

        // Add filters
        if (filters.status?.length) {
            query.status = { $in: filters.status };
        }

        if (filters.customFilters) {
            query = { ...query, ...filters.customFilters };
        }

        // Fetch data based on report type
        let data: any[] = [];
        switch (report.reportType) {
            case 'orders':
                data = await Order.find(query)
                    .select(columns.join(' '))
                    .sort(this.buildSort(sortBy))
                    .lean();
                break;

            case 'shipments':
                data = await Shipment.find(query)
                    .select(columns.join(' '))
                    .sort(this.buildSort(sortBy))
                    .lean();
                break;

            case 'finance':
                data = await WalletTransaction.find(query)
                    .select(columns.join(' '))
                    .sort(this.buildSort(sortBy))
                    .lean();
                break;

            case 'analytics':
            case 'performance':
            case 'custom':
                // For analytics, would aggregate across multiple collections
                data = await this.fetchAnalyticsData(report, query, dateRange);
                break;

            default:
                throw new AppError('Unsupported report type', 'VALIDATION_ERROR', 400);
        }

        // Apply aggregations if specified
        if (aggregations?.length && groupBy?.length) {
            data = this.applyAggregations(data, groupBy, aggregations);
        }

        return data;
    }

    /**
     * Fetch analytics data (aggregated from multiple sources)
     */
    private async fetchAnalyticsData(_report: any, baseQuery: any, _dateRange: any): Promise<any[]> {
        // Example: Aggregate order metrics
        const pipeline: any[] = [
            { $match: baseQuery },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totals.totalAmount' },
                    avgOrderValue: { $avg: '$totals.totalAmount' },
                    totalWeight: { $sum: '$packageDetails.weight' },
                },
            },
        ];

        const result = await Order.aggregate(pipeline);
        return result;
    }

    /**
     * Build date range from filters
     */
    private buildDateRange(
        dateRange?: string,
        customStart?: Date,
        customEnd?: Date
    ): { start: Date; end: Date } | null {
        const now = new Date();
        let start: Date;
        let end: Date = new Date(now);

        switch (dateRange) {
            case 'today':
                start = new Date(now.setHours(0, 0, 0, 0));
                end = new Date(now.setHours(23, 59, 59, 999));
                break;

            case 'yesterday':
                start = new Date(now.setDate(now.getDate() - 1));
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setHours(23, 59, 59, 999);
                break;

            case 'last_7_days':
                start = new Date(now.setDate(now.getDate() - 7));
                break;

            case 'last_30_days':
                start = new Date(now.setDate(now.getDate() - 30));
                break;

            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;

            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;

            case 'custom':
                if (!customStart || !customEnd) return null;
                start = new Date(customStart);
                end = new Date(customEnd);
                break;

            default:
                return null;
        }

        return { start, end };
    }

    /**
     * Build sort object
     */
    private buildSort(sortBy?: Array<{ field: string; order: 'asc' | 'desc' }>): any {
        if (!sortBy?.length) return { createdAt: -1 };

        const sort: any = {};
        sortBy.forEach((s) => {
            sort[s.field] = s.order === 'asc' ? 1 : -1;
        });
        return sort;
    }

    /**
     * Apply aggregations to data
     */
    private applyAggregations(data: any[], groupBy: string[], aggregations: any[]): any[] {
        const grouped = new Map<string, any>();

        data.forEach((row) => {
            const key = groupBy.map((field) => row[field]).join('|');

            if (!grouped.has(key)) {
                const groupData: any = {};
                groupBy.forEach((field) => {
                    groupData[field] = row[field];
                });
                aggregations.forEach((agg) => {
                    groupData[agg.label] = agg.type === 'count' ? 0 : [];
                });
                grouped.set(key, groupData);
            }

            const groupData = grouped.get(key)!;
            aggregations.forEach((agg) => {
                switch (agg.type) {
                    case 'count':
                        groupData[agg.label] += 1;
                        break;
                    case 'sum':
                    case 'avg':
                        groupData[agg.label].push(row[agg.field]);
                        break;
                    case 'min':
                    case 'max':
                        groupData[agg.label].push(row[agg.field]);
                        break;
                }
            });
        });

        // Calculate final aggregations
        return Array.from(grouped.values()).map((groupData) => {
            aggregations.forEach((agg) => {
                if (agg.type === 'avg') {
                    const values = groupData[agg.label];
                    groupData[agg.label] = values.reduce((a: number, b: number) => a + b, 0) / values.length;
                } else if (agg.type === 'sum') {
                    groupData[agg.label] = groupData[agg.label].reduce((a: number, b: number) => a + b, 0);
                } else if (agg.type === 'min') {
                    groupData[agg.label] = Math.min(...groupData[agg.label]);
                } else if (agg.type === 'max') {
                    groupData[agg.label] = Math.max(...groupData[agg.label]);
                }
            });
            return groupData;
        });
    }

    /**
     * Generate report file
     */
    private async generateReportFile(
        report: any,
        data: any[]
    ): Promise<{ buffer: Buffer; filename: string }> {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${report.name.replace(/\s+/g, '_')}_${timestamp}`;

        switch (report.format) {
            case 'csv': {
                const parser = new Parser({ fields: report.columns });
                const csv = parser.parse(data);
                return { buffer: Buffer.from(csv, 'utf-8'), filename: `${filename}.csv` };
            }

            case 'excel': {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Report');

                // Add headers
                worksheet.columns = report.columns.map((col: string) => ({
                    header: col,
                    key: col,
                    width: 15,
                }));

                // Add data
                data.forEach((row) => worksheet.addRow(row));

                // Style headers
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' },
                };

                const buffer = await workbook.xlsx.writeBuffer();
                return { buffer: Buffer.from(buffer), filename: `${filename}.xlsx` };
            }

            case 'json': {
                const json = JSON.stringify(data, null, 2);
                return { buffer: Buffer.from(json, 'utf-8'), filename: `${filename}.json` };
            }

            case 'pdf':
                // PDF generation would require additional library like pdfkit
                throw new AppError('PDF format not yet implemented', 'NOT_IMPLEMENTED', 501);

            default:
                throw new AppError('Unsupported format', 'VALIDATION_ERROR', 400);
        }
    }

    /**
     * Deliver report via configured methods
     */
    private async deliverReport(report: any, buffer: Buffer, filename: string): Promise<void> {
        const { delivery } = report;

        if (delivery.method === 'email' || delivery.method === 'both') {
            await this.deliverViaEmail(report, buffer, filename);
        }

        if (delivery.method === 'webhook' || delivery.method === 'both') {
            await this.deliverViaWebhook(report, buffer, filename);
        }
    }

    /**
     * Deliver via email
     */
    private async deliverViaEmail(report: any, buffer: Buffer, filename: string): Promise<void> {
        const { email } = report.delivery;

        if (!email?.recipients?.length) {
            throw new AppError('No email recipients configured', 'VALIDATION_ERROR', 400);
        }

        const subject = email.subject || `Scheduled Report: ${report.name}`;
        const body = email.body || `Please find attached the scheduled report: ${report.name}`;

        await this.emailTransporter.sendMail({
            from: process.env.SMTP_FROM || 'reports@shipcrowd.com',
            to: email.recipients.join(', '),
            subject,
            text: body,
            attachments: [
                {
                    filename,
                    content: buffer,
                },
            ],
        });

        logger.info('Report delivered via email', {
            reportId: report._id,
            recipients: email.recipients.length,
        });
    }

    /**
     * Deliver via webhook
     */
    private async deliverViaWebhook(report: any, buffer: Buffer, _filename: string): Promise<void> {
        const { webhook } = report.delivery;

        if (!webhook?.url) {
            throw new AppError('No webhook URL configured', 'VALIDATION_ERROR', 400);
        }

        const payload =
            webhook.format === 'json'
                ? JSON.parse(buffer.toString('utf-8'))
                : buffer.toString('utf-8');

        await axios({
            method: webhook.method || 'POST',
            url: webhook.url,
            headers: webhook.headers || { 'Content-Type': 'application/json' },
            data: payload,
        });

        logger.info('Report delivered via webhook', {
            reportId: report._id,
            url: webhook.url,
        });
    }

    /**
     * Execute all due reports
     */
    async executeDueReports(): Promise<void> {
        const now = new Date();

        const dueReports = await ScheduledReport.find({
            isActive: true,
            isPaused: false,
            nextRunAt: { $lte: now },
        });

        logger.info('Executing due reports', { count: dueReports.length });

        for (const report of dueReports) {
            try {
                await this.executeReport(report.id);
            } catch (error) {
                logger.error('Failed to execute report', {
                    reportId: report._id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                // Continue with other reports
            }
        }
    }
}

export default new ScheduledReportExecutorService();
