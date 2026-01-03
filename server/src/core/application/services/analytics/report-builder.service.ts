/**
 * Report Builder Service
 * 
 * Orchestrates report generation, saving, and retrieval.
 */

import { ReportConfig, IReportConfig } from '../../../../infrastructure/database/mongoose/models';
import OrderAnalyticsService from './order-analytics.service';
import ShipmentAnalyticsService from './shipment-analytics.service';
import RevenueAnalyticsService from './revenue-analytics.service';
import CustomerAnalyticsService from './customer-analytics.service';
import InventoryAnalyticsService from './inventory-analytics.service';
import { DateRange } from './analytics.service';
import logger from '../../../../shared/logger/winston.logger';

export interface ReportResult {
    reportType: string;
    generatedAt: Date;
    filters: any;
    data: any;
}

export interface SaveReportInput {
    name: string;
    description?: string;
    reportType: IReportConfig['reportType'];
    filters: IReportConfig['filters'];
    metrics: string[];
    groupBy?: IReportConfig['groupBy'];
    schedule?: IReportConfig['schedule'];
}

export default class ReportBuilderService {
    /**
     * Build report from saved configuration
     */
    static async buildReport(reportConfigId: string, companyId: string): Promise<ReportResult> {
        try {
            const config = await ReportConfig.findOne({
                _id: reportConfigId,
                company: companyId
            });

            if (!config) {
                throw new Error('Report configuration not found');
            }

            const data = await this.executeReport(
                config.reportType,
                companyId,
                config.filters,
                config.metrics,
                config.groupBy
            );

            return {
                reportType: config.reportType,
                generatedAt: new Date(),
                filters: config.filters,
                data
            };
        } catch (error) {
            logger.error('Error building report:', error);
            throw error;
        }
    }

    /**
     * Build ad-hoc report without saving
     */
    static async buildCustomReport(
        companyId: string,
        reportType: IReportConfig['reportType'],
        filters: IReportConfig['filters'],
        metrics: string[],
        groupBy?: IReportConfig['groupBy']
    ): Promise<ReportResult> {
        try {
            const data = await this.executeReport(reportType, companyId, filters, metrics, groupBy);

            return {
                reportType,
                generatedAt: new Date(),
                filters,
                data
            };
        } catch (error) {
            logger.error('Error building custom report:', error);
            throw error;
        }
    }

    /**
     * Execute report based on type
     */
    private static async executeReport(
        reportType: IReportConfig['reportType'],
        companyId: string,
        filters: IReportConfig['filters'],
        metrics: string[],
        groupBy?: IReportConfig['groupBy']
    ): Promise<any> {
        const dateRange: DateRange | undefined = filters?.dateRange ? {
            start: new Date(filters.dateRange.start),
            end: new Date(filters.dateRange.end)
        } : undefined;

        switch (reportType) {
            case 'order':
                return {
                    stats: await OrderAnalyticsService.getOrderStats(companyId, dateRange),
                    trends: groupBy && groupBy !== 'none'
                        ? await OrderAnalyticsService.getOrderTrends(companyId, dateRange!, groupBy as 'day' | 'week' | 'month')
                        : null,
                    byStatus: await OrderAnalyticsService.getOrdersByStatus(companyId, dateRange),
                    topProducts: metrics.includes('topProducts')
                        ? await OrderAnalyticsService.getTopProducts(companyId, dateRange)
                        : null
                };

            case 'shipment':
                return {
                    stats: await ShipmentAnalyticsService.getShipmentStats(companyId, dateRange),
                    courierPerformance: await ShipmentAnalyticsService.getCourierPerformance(companyId, dateRange),
                    deliveryTimeAnalysis: await ShipmentAnalyticsService.getDeliveryTimeAnalysis(companyId, dateRange)
                };

            case 'revenue':
                return {
                    stats: await RevenueAnalyticsService.getRevenueStats(companyId, dateRange),
                    wallet: metrics.includes('wallet')
                        ? await RevenueAnalyticsService.getWalletStats(companyId, dateRange)
                        : null,
                    codRemittance: metrics.includes('codRemittance')
                        ? await RevenueAnalyticsService.getCODRemittanceStats(companyId, dateRange)
                        : null
                };

            case 'customer':
                return {
                    stats: await CustomerAnalyticsService.getCustomerStats(companyId, dateRange),
                    topCustomers: metrics.includes('topCustomers')
                        ? await CustomerAnalyticsService.getTopCustomers(companyId, dateRange)
                        : null,
                    repeatRate: await CustomerAnalyticsService.getRepeatPurchaseRate(companyId, dateRange)
                };

            case 'inventory':
                return {
                    stockLevels: await InventoryAnalyticsService.getStockLevels(companyId),
                    slowMoving: metrics.includes('slowMoving')
                        ? await InventoryAnalyticsService.getSlowMovingProducts(companyId)
                        : null
                };

            default:
                throw new Error(`Unknown report type: ${reportType}`);
        }
    }

    /**
     * Save report configuration
     */
    static async saveReportConfig(
        data: SaveReportInput,
        userId: string,
        companyId: string
    ): Promise<IReportConfig> {
        try {
            const config = new ReportConfig({
                ...data,
                company: companyId,
                createdBy: userId
            });

            await config.save();
            return config;
        } catch (error) {
            logger.error('Error saving report config:', error);
            throw error;
        }
    }

    /**
     * List saved report configurations
     */
    static async listReportConfigs(
        companyId: string,
        page = 1,
        limit = 20
    ): Promise<{ configs: IReportConfig[]; total: number; pages: number }> {
        try {
            const skip = (page - 1) * limit;

            const [configs, total] = await Promise.all([
                ReportConfig.find({ company: companyId })
                    .sort({ updatedAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                ReportConfig.countDocuments({ company: companyId })
            ]);

            return {
                configs: configs as IReportConfig[],
                total,
                pages: Math.ceil(total / limit)
            };
        } catch (error) {
            logger.error('Error listing report configs:', error);
            throw error;
        }
    }

    /**
     * Delete report configuration
     */
    static async deleteReportConfig(configId: string, companyId: string): Promise<void> {
        try {
            const result = await ReportConfig.deleteOne({
                _id: configId,
                company: companyId
            });

            if (result.deletedCount === 0) {
                throw new Error('Report configuration not found');
            }
        } catch (error) {
            logger.error('Error deleting report config:', error);
            throw error;
        }
    }
}
