import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';
import { Types } from 'mongoose';
import NDRAnalyticsService from './ndr-analytics.service';
import EmailService from '../communication/email.service';
import Company from '../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import logger from '../../../../shared/logger/winston.logger';

/**
 * NDR Report Service
 * 
 * Orchestrates the generation and delivery of automated NDR reports.
 */
class NDRReportService {
    /**
     * Send weekly NDR report to a specific company
     */
    async sendWeeklyReport(companyId: string): Promise<void> {
        try {
            // 1. Fetch Company Details
            const company = await Company.findById(companyId);
            const recipientEmail = company?.settings?.notificationEmail;

            if (!company || !recipientEmail) {
                logger.warn(`Cannot send NDR report. Company not found or no notification email: ${companyId}`);
                return;
            }

            // 2. Determine Date Range (Last Week)
            const today = new Date();
            const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }); // Monday
            const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }); // Sunday

            const dateRange = {
                start: lastWeekStart,
                end: lastWeekEnd
            };

            // 3. Fetch Analytics Data
            const [stats, selfService, prevention, roi] = await Promise.all([
                NDRAnalyticsService.getNDRStats(companyId, dateRange),
                NDRAnalyticsService.getCustomerSelfServiceMetrics(companyId, dateRange),
                NDRAnalyticsService.getPreventionLayerMetrics(companyId, dateRange),
                NDRAnalyticsService.getROIMetrics(companyId, dateRange)
            ]);

            // 4. Generate HTML Content
            const reportHtml = this.generateWeeklyReportHtml({
                analytics: stats, // Pass stats directly as analytics
                selfService,
                prevention,
                roi
            });

            // 5. Send Email
            await EmailService.sendNDRWeeklyReportEmail(
                recipientEmail,
                company.name,
                reportHtml,
                format(lastWeekStart, 'MMM dd, yyyy'),
                format(lastWeekEnd, 'MMM dd, yyyy')
            );

            logger.info(`Weekly NDR report sent to ${company.name} (${companyId})`);

        } catch (error) {
            logger.error(`Error sending weekly NDR report to ${companyId}:`, error);
            throw error;
        }
    }

    /**
     * Generate HTML body for the report
     */
    private generateWeeklyReportHtml(data: any): string {
        const { analytics, selfService, prevention, roi } = data;

        // Helper to format currency
        const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

        return `
            <div style="font-family: Arial, sans-serif; color: #333;">
                
                <!-- Summary Cards -->
                <div style="display: flex; gap: 15px; margin-bottom: 30px;">
                    <div style="flex: 1; background: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #bae6fd;">
                        <div style="font-size: 12px; color: #0369a1; text-transform: uppercase; font-weight: bold;">Resolution Rate</div>
                        <div style="font-size: 24px; font-weight: bold; color: #0284c7;">${(analytics.resolutionRate).toFixed(1)}%</div>
                    </div>
                    <div style="flex: 1; background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                         <div style="font-size: 12px; color: #15803d; text-transform: uppercase; font-weight: bold;">Net Savings</div>
                        <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${formatCurrency(roi.netSavings)}</div>
                    </div>
                     <div style="flex: 1; background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca;">
                         <div style="font-size: 12px; color: #b91c1c; text-transform: uppercase; font-weight: bold;">Prevented RTOs</div>
                        <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${prevention.totalPrevented}</div>
                    </div>
                </div>

                <!-- ROI Section -->
                <h3 style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px;">💰 ROI Analysis</h3>
                <p>By automating NDR management, you saved <strong>${formatCurrency(roi.netSavings)}</strong> this week compared to baseline RTO costs.</p>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr style="background: #f9fafb;">
                        <td style="padding: 10px; border: 1px solid #eee;">Baseline RTO Cost</td>
                        <td style="padding: 10px; border: 1px solid #eee;">Current RTO Cost</td>
                        <td style="padding: 10px; border: 1px solid #eee;"><strong>Net Savings</strong></td>
                         <td style="padding: 10px; border: 1px solid #eee;"><strong>ROI</strong></td>
                    </tr>
                    <tr>
                         <td style="padding: 10px; border: 1px solid #eee;">${formatCurrency(roi.baselineRTOCost)}</td>
                         <td style="padding: 10px; border: 1px solid #eee;">${formatCurrency(roi.currentRTOCost)}</td>
                         <td style="padding: 10px; border: 1px solid #eee; color: #16a34a; font-weight: bold;">${formatCurrency(roi.netSavings)}</td>
                         <td style="padding: 10px; border: 1px solid #eee; color: #2563eb; font-weight: bold;">${roi.roi}%</td>
                    </tr>
                </table>

                <!-- Self Service Section -->
                <h3 style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px;">📱 Customer Self-Service</h3>
                <p>Magic links are helping customers resolve issues instantly without support intervention.</p>
                 <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Magic Links Sent:</td>
                        <td style="padding: 8px;">${selfService.magicLinksSent}</td>
                    </tr>
                     <tr>
                        <td style="padding: 8px; font-weight: bold;">Clicked:</td>
                        <td style="padding: 8px;">${selfService.magicLinksClicked} (${selfService.ctr}%)</td>
                    </tr>
                     <tr>
                        <td style="padding: 8px; font-weight: bold;">Customer Responses:</td>
                        <td style="padding: 8px;">${selfService.customerResponses} (${selfService.responseRate}%)</td>
                    </tr>
                </table>
            </div>
        `;
    }
}

export default new NDRReportService();
