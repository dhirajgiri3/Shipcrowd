import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import WhatsAppService from './whatsapp.service';
import smsService from './sms.service';
import { sendEmail } from './email.service';
import logger from '../../../../shared/logger/winston.logger';
import { NotFoundError } from '../../../../shared/errors/app.error';
import NotificationPreferenceService from './notification-preferences.service';

/**
 * NDR Communication Service
 * Handles buyer communication for NDR (Non-Delivery Report) scenarios
 * 
 * Channels:
 * - WhatsApp (primary)
 * - SMS (fallback)
 * - Email (fallback)
 * 
 * Templates:
 * - NDR Alert
 * - Action Required
 * - Reattempt Scheduled
 * - RTO Initiated
 */

interface NDRCommunicationOptions {
    shipmentId: string;
    channel: 'whatsapp' | 'sms' | 'email' | 'all';
    templateType: 'ndr_alert' | 'action_required' | 'reattempt' | 'rto';
    customMessage?: string;
}

class NDRCommunicationService {
    /**
     * Send NDR notification to buyer
     */
    async sendNDRNotification(options: NDRCommunicationOptions) {
        const { shipmentId, channel, templateType, customMessage } = options;

        try {
            // Fetch shipment
            const shipment = await Shipment.findById(shipmentId);
            if (!shipment) {
                throw new NotFoundError('Shipment not found');
            }

            const recipientName = shipment.deliveryDetails.recipientName;
            const recipientPhone = shipment.deliveryDetails.recipientPhone;
            const recipientEmail = shipment.deliveryDetails.recipientEmail;
            const awb = shipment.carrierDetails?.carrierTrackingNumber || shipment.trackingNumber;
            const ndrReason = shipment.ndrDetails?.ndrReason || 'Delivery attempt failed';

            const results: any = {
                shipmentId,
                awb,
                channelsSent: [],
                channelsSkipped: [],
                success: false,
            };

            const companyId = shipment.companyId?.toString();
            const canSendEmail = companyId
                ? await NotificationPreferenceService.shouldSend(companyId, 'email')
                : true;
            const canSendSms = companyId
                ? await NotificationPreferenceService.shouldSend(companyId, 'sms')
                : true;
            const canSendWhatsApp = companyId
                ? await NotificationPreferenceService.shouldSend(companyId, 'whatsapp')
                : true;

            // Send via WhatsApp
            if ((channel === 'whatsapp' || channel === 'all') && canSendWhatsApp) {
                try {
                    let whatsappSent = false;

                    if (templateType === 'ndr_alert') {
                        whatsappSent = await WhatsAppService.sendWhatsAppMessage(
                            recipientPhone,
                            'NDR_ALERT',
                            {
                                '1': recipientName,
                                '2': awb,
                                '3': ndrReason,
                            }
                        );
                    } else if (templateType === 'action_required') {
                        const actionLink = `${process.env.FRONTEND_URL}/track/${awb}/ndr-action`;
                        whatsappSent = await WhatsAppService.sendWhatsAppMessage(
                            recipientPhone,
                            'NDR_ACTION',
                            {
                                '1': recipientName,
                                '2': awb,
                                '3': actionLink,
                            }
                        );
                    } else if (templateType === 'rto') {
                        whatsappSent = await WhatsAppService.sendWhatsAppMessage(
                            recipientPhone,
                            'RTO_INITIATED',
                            {
                                '1': recipientName,
                                '2': awb,
                                '3': ndrReason,
                            }
                        );
                    }

                    if (whatsappSent) {
                        results.channelsSent.push('whatsapp');
                        results.success = true;
                    }
                } catch (error: any) {
                    logger.error(`WhatsApp NDR send failed for ${awb}:`, error);
                }
            } else if (channel === 'whatsapp' || channel === 'all') {
                results.channelsSkipped.push('whatsapp');
            }

            // Send via SMS
            if ((channel === 'sms' || channel === 'all') && canSendSms) {
                try {
                    let smsMessage = '';

                    // Format SMS based on template type
                    if (templateType === 'ndr_alert') {
                        smsMessage = `Hi ${recipientName}, delivery for ${awb} failed. Reason: ${ndrReason}. Track: ${process.env.FRONTEND_URL}/track/${awb}`;
                    } else if (templateType === 'action_required') {
                        smsMessage = `Hi ${recipientName}, action needed for ${awb}. Delivery failed: ${ndrReason}. Update address: ${process.env.FRONTEND_URL}/track/${awb}/ndr-action`;
                    } else if (templateType === 'reattempt') {
                        smsMessage = `Hi ${recipientName}, delivery for ${awb} rescheduled. Track: ${process.env.FRONTEND_URL}/track/${awb}`;
                    } else if (templateType === 'rto') {
                        smsMessage = `Hi ${recipientName}, shipment ${awb} is being returned. Reason: ${ndrReason}. Contact support for details.`;
                    }

                    const smsSent = await smsService.sendSMS(recipientPhone, smsMessage);

                    if (smsSent) {
                        results.channelsSent.push('sms');
                        results.success = true;
                    }
                } catch (error: any) {
                    logger.error(`SMS NDR send failed for ${awb}:`, error);
                }
            } else if (channel === 'sms' || channel === 'all') {
                results.channelsSkipped.push('sms');
            }

            // Send via Email (fallback or all)
            if ((channel === 'email' || channel === 'all') && recipientEmail && canSendEmail) {
                try {
                    const htmlContent = this.generateEmailTemplate(templateType, {
                        recipientName,
                        awb,
                        ndrReason,
                        customMessage,
                    });
                    const textContent = customMessage || `Update for shipment ${awb}`;

                    await sendEmail(
                        [recipientEmail],
                        `Delivery Update - ${awb}`,
                        htmlContent,
                        textContent
                    );

                    results.channelsSent.push('email');
                    results.success = true;
                } catch (error: any) {
                    logger.error(`Email NDR send failed for ${awb}:`, error);
                }
            } else if ((channel === 'email' || channel === 'all') && recipientEmail) {
                results.channelsSkipped.push('email');
            }

            logger.info(`NDR notification sent for ${awb}, channels: ${results.channelsSent.join(', ')}`);

            return results;
        } catch (error: any) {
            logger.error(`NDR notification failed for shipment ${shipmentId}:`, error);
            throw error;
        }
    }

    /**
     * Generate email template for NDR
     */
    private generateEmailTemplate(
        templateType: string,
        data: {
            recipientName: string;
            awb: string;
            ndrReason?: string;
            customMessage?: string;
        }
    ): string {
        const { recipientName, awb, ndrReason, customMessage } = data;

        const baseTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Shipcrowd - Delivery Update</h1>
            </div>
            <div class="content">
              <p>Dear ${recipientName},</p>
    `;

        let content = '';

        if (templateType === 'ndr_alert') {
            content = `
        <p>We attempted to deliver your shipment <strong>${awb}</strong>, but were unable to complete the delivery.</p>
        <p><strong>Reason:</strong> ${ndrReason}</p>
        <p>We will attempt redelivery soon. Please ensure someone is available to receive the package.</p>
      `;
        } else if (templateType === 'action_required') {
            content = `
        <p>Your shipment <strong>${awb}</strong> requires your immediate attention.</p>
        <p><strong>Reason:</strong> ${ndrReason}</p>
        <p>Please take action to avoid return to origin (RTO):</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/track/${awb}/ndr-action" class="button">
            Update Delivery Instructions
          </a>
        </p>
      `;
        } else if (templateType === 'rto') {
            content = `
        <p>Unfortunately, your shipment <strong>${awb}</strong> is being returned to the seller.</p>
        <p><strong>Reason:</strong> ${ndrReason}</p>
        <p>Please contact the seller for a refund or reshipment.</p>
      `;
        }

        if (customMessage) {
            content += `<p><em>${customMessage}</em></p>`;
        }

        const endTemplate = `
            </div>
            <div class="footer">
              <p>Track your shipment: <a href="${process.env.FRONTEND_URL}/track/${awb}">${awb}</a></p>
              <p>© ${new Date().getFullYear()} Shipcrowd. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

        return baseTemplate + content + endTemplate;
    }

    /**
     * Send bulk NDR notifications
     */
    async sendBulkNotifications(shipmentIds: string[], channel: 'whatsapp' | 'sms' | 'email' | 'all') {
        const results = [];

        for (const shipmentId of shipmentIds) {
            try {
                const result = await this.sendNDRNotification({
                    shipmentId,
                    channel,
                    templateType: 'ndr_alert',
                });
                results.push(result);
            } catch (error: any) {
                logger.error(`Bulk NDR failed for ${shipmentId}:`, error);
                results.push({
                    shipmentId,
                    success: false,
                    error: error.message,
                });
            }
        }

        return results;
    }
}

export default new NDRCommunicationService();
