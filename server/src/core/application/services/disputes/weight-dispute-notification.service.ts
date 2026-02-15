/**
 * Weight Dispute Notification Service
 * 
 * Integrates with EXISTING EmailService and WhatsAppService to notify sellers
 * about weight dispute creation, resolution, and reminders.
 */

import { Company, User } from '../../../../infrastructure/database/mongoose/models';
import WhatsAppService from '../../../../infrastructure/external/communication/whatsapp/whatsapp.service';
import logger from '../../../../shared/logger/winston.logger';
import EmailService from '../communication/email.service';

export class WeightDisputeNotificationService {
    private static whatsapp = new WhatsAppService();

    /**
     * Notify seller when a new weight dispute is created
     */
    static async notifyDisputeCreated(dispute: any): Promise<void> {
        try {
            const company = await Company.findById(dispute.companyId);
            if (!company) return;

            let sellerEmail = company.settings?.notificationEmail;
            const sellerPhone = company.settings?.notificationPhone;

            // Fallback to owner email if notification email not set
            if (!sellerEmail && company.owner) {
                const owner = await User.findById(company.owner).select('email');
                sellerEmail = owner?.email;
            }

            // 1. Send Email
            if (sellerEmail) {
                const emailSubject = `🚨 Weight Dispute Created: ${dispute.disputeId}`;
                const emailHtml = this.getDisputeCreatedEmailTemplate(dispute);
                await EmailService.sendEmail(sellerEmail, emailSubject, emailHtml);
            }

            // 2. Send WhatsApp
            if (sellerPhone) {
                const waMessage = `Hi ${company.name}, a weight dispute ${dispute.disputeId} has been created for AWB ${dispute.carrierEvidence?.awb || 'your shipment'}. Difference: ${dispute.discrepancy.percentage.toFixed(1)}%. Please submit evidence within 7 days to avoid auto-resolution. -Shipcrowd`;
                await this.whatsapp.sendMessage(sellerPhone, waMessage);
            }

            logger.info('[Notification] Dispute created alerts sent', { disputeId: dispute.disputeId });
        } catch (error: any) {
            logger.error('[Notification] Failed to send dispute created alerts', {
                disputeId: dispute.disputeId,
                error: error.message
            });
        }
    }

    /**
     * Notify seller when a dispute is resolved
     */
    static async notifyDisputeResolved(dispute: any, resolution: any): Promise<void> {
        try {
            const company = await Company.findById(dispute.companyId);
            if (!company) return;

            const sellerEmail = company.settings?.notificationEmail;
            const sellerPhone = company.settings?.notificationPhone;

            // 1. Send Email
            if (sellerEmail) {
                const emailSubject = `✅ Weight Dispute Resolved: ${dispute.disputeId}`;
                const emailHtml = this.getDisputeResolvedEmailTemplate(dispute, resolution);
                await EmailService.sendEmail(sellerEmail, emailSubject, emailHtml);
            }

            // 2. Send WhatsApp
            if (sellerPhone) {
                const waMessage = `Hi ${company.name}, your weight dispute ${dispute.disputeId} has been resolved. Outcome: ${resolution.outcome.replace(/_/g, ' ')}. ${resolution.refundAmount ? `Refund: ₹${resolution.refundAmount}` : ''} -Shipcrowd`;
                await this.whatsapp.sendMessage(sellerPhone, waMessage);
            }

            logger.info('[Notification] Dispute resolution alerts sent', { disputeId: dispute.disputeId });
        } catch (error: any) {
            logger.error('[Notification] Failed to send dispute resolution alerts', {
                disputeId: dispute.disputeId,
                error: error.message
            });
        }
    }

    /**
     * Send reminder 3 days before auto-resolution
     */
    static async sendAutoResolveReminder(dispute: any): Promise<void> {
        try {
            const company = await Company.findById(dispute.companyId);
            if (!company) return;

            const sellerEmail = company.settings?.notificationEmail;
            const sellerPhone = company.settings?.notificationPhone;

            // 1. Send Email
            if (sellerEmail) {
                const emailSubject = `⏳ Reminder: Weight Dispute ${dispute.disputeId} expires in 3 days`;
                const emailHtml = this.getReminderEmailTemplate(dispute);
                await EmailService.sendEmail(sellerEmail, emailSubject, emailHtml);
            }

            // 2. Send WhatsApp
            if (sellerPhone) {
                const waMessage = `Hi ${company.name}, reminder for weight dispute ${dispute.disputeId}. Only 3 days left to submit evidence before it auto-resolves in carrier's favor. -Shipcrowd`;
                await this.whatsapp.sendMessage(sellerPhone, waMessage);
            }

            logger.info('[Notification] Auto-resolve reminder sent', { disputeId: dispute.disputeId });
        } catch (error: any) {
            logger.error('[Notification] Failed to send auto-resolve reminder', {
                disputeId: dispute.disputeId,
                error: error.message
            });
        }
    }

    private static getDisputeCreatedEmailTemplate(dispute: any): string {
        return `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Weight Dispute Created</h2>
                <p>A weight discrepancy has been detected by the carrier for your shipment.</p>
                <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0;">
                    <p><strong>Dispute ID:</strong> ${dispute.disputeId}</p>
                    <p><strong>Declared Weight:</strong> ${dispute.declaredWeight.value}${dispute.declaredWeight.unit}</p>
                    <p><strong>Carrier Weight:</strong> ${dispute.actualWeight.value}${dispute.actualWeight.unit}</p>
                    <p><strong>Difference:</strong> ${dispute.discrepancy.percentage.toFixed(1)}%</p>
                    <p><strong>Financial Impact:</strong> ₹${dispute.financialImpact.difference.toFixed(2)} (${dispute.financialImpact.chargeDirection})</p>
                </div>
                <p>Please log in to your dashboard to submit evidence (packing photos/videos) within <strong>7 days</strong>.</p>
                <p>If no evidence is submitted, the dispute will be automatically resolved in favor of the carrier.</p>
                <a href="${process.env.CLIENT_URL}/seller/disputes/weight/${dispute._id}" style="display: inline-block; padding: 10px 20px; background: #3498db; color: #fff; text-decoration: none; border-radius: 5px;">View Dispute & Submit Evidence</a>
            </div>
        `;
    }

    private static getDisputeResolvedEmailTemplate(dispute: any, resolution: any): string {
        return `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Weight Dispute Resolved</h2>
                <p>Your weight dispute has been reviewed and resolved by our team.</p>
                <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #2ecc71; margin: 20px 0;">
                    <p><strong>Dispute ID:</strong> ${dispute.disputeId}</p>
                    <p><strong>Outcome:</strong> ${resolution.outcome.replace(/_/g, ' ')}</p>
                    <p><strong>Notes:</strong> ${resolution.notes}</p>
                    ${resolution.refundAmount ? `<p><strong>Refund Amount:</strong> ₹${resolution.refundAmount}</p>` : ''}
                </div>
                <p>Thank you for your patience.</p>
            </div>
        `;
    }

    private static getReminderEmailTemplate(dispute: any): string {
        return `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>⏳ Action Required: Weight Dispute Expiring Soon</h2>
                <p>This is a reminder that you have <strong>3 days left</strong> to submit evidence for weight dispute ${dispute.disputeId}.</p>
                <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                    <p><strong>Dispute ID:</strong> ${dispute.disputeId}</p>
                    <p><strong>AWB:</strong> ${dispute.carrierEvidence?.awb || 'N/A'}</p>
                </div>
                <p>Failure to submit evidence will result in the dispute being closed in the carrier's favor.</p>
                <a href="${process.env.CLIENT_URL}/seller/disputes/weight/${dispute._id}" style="display: inline-block; padding: 10px 20px; background: #f39c12; color: #fff; text-decoration: none; border-radius: 5px;">Submit Evidence Now</a>
            </div>
        `;
    }
}
