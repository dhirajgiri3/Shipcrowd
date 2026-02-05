import { Shipment, Company } from '../../../../infrastructure/database/mongoose/models';
import WhatsAppService from './whatsapp.service';
import smsService from './sms.service';
import { sendEmail } from './email.service';
import logger from '../../../../shared/logger/winston.logger';
import { NotFoundError } from '../../../../shared/errors/app.error';
import NotificationPreferenceService from './notification-preferences.service';
import NDRMagicLinkService from '../ndr/ndr-magic-link.service';

/**
 * NDR Communication Service
 * Handles buyer and seller communication for NDR (Non-Delivery Report) scenarios
 * 
 * Channels:
 * - WhatsApp (primary)
 * - SMS (fallback)
 * - Email (fallback)
 * 
 * Templates:
 * - NDR Alert (uses secure Magic Links)
 * - Action Required
 * - Reattempt Scheduled
 * - RTO Initiated
 */

interface NDRCommunicationOptions {
    ndrEventId: string;
    shipmentId: string;
    channel: 'whatsapp' | 'sms' | 'email' | 'all';
    templateType: 'ndr_alert' | 'action_required' | 'reattempt' | 'rto';
    customMessage?: string;
}

class NDRCommunicationService {
    /**
     * Send NDR notification to buyer and optionally seller
     */
    async sendNDRNotification(options: NDRCommunicationOptions) {
        const { ndrEventId, shipmentId, channel, templateType, customMessage } = options;

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

            // Generate Magic Link
            const magicLink = NDRMagicLinkService.generateMagicLink(ndrEventId);

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
                                '4': magicLink // Replaced hardcoded AWB with magic link
                            }
                        );
                    } else if (templateType === 'action_required') {
                        whatsappSent = await WhatsAppService.sendWhatsAppMessage(
                            recipientPhone,
                            'NDR_ACTION',
                            {
                                '1': recipientName,
                                '2': awb,
                                '3': magicLink,
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
                        smsMessage = `Hi ${recipientName}, delivery for ${awb} failed. Reason: ${ndrReason}. Update instructions: ${magicLink}`;
                    } else if (templateType === 'action_required') {
                        smsMessage = `Hi ${recipientName}, action needed for ${awb}. Delivery failed: ${ndrReason}. Update address: ${magicLink}`;
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
                        magicLink,
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
     * Send alert to seller about NDR
     */
    async sendSellerNotification(ndrEventId: string, shipmentId: string) {
        try {
            // Dynamic import to avoid circular dependency
            const { NDREvent } = await import('../../../../infrastructure/database/mongoose/models');

            const shipment = await Shipment.findById(shipmentId).populate('orderId');
            const ndrEvent = await NDREvent.findById(ndrEventId);

            if (!shipment || !ndrEvent) {
                logger.warn('Missing data for seller notification', { ndrEventId, shipmentId });
                return;
            }

            const company = await Company.findById(shipment.companyId);
            if (!company || !(company as any).settings?.notifications?.email?.ndr) {
                return; // Seller disabled notifications or not found
            }

            const orderNumber = shipment.orderId ? (shipment.orderId as any).orderNumber : 'Unknown';

            // Simple email to seller
            await sendEmail(
                [(company as any).email],
                `NDR Alert: Order ${orderNumber}`,
                this.generateSellerEmailTemplate(shipment, ndrEvent, orderNumber),
                `NDR detected for order ${orderNumber}. Reason: ${ndrEvent.ndrReason}`
            );

            logger.info(`Seller notification sent for NDR on shipment ${shipment._id}`);
        } catch (error) {
            logger.error('Failed to send seller notification', error);
        }
    }

    private generateSellerEmailTemplate(shipment: any, ndrEvent: any, orderNumber: string): string {
        return `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #d97706;">NDR Detected for Order ${orderNumber}</h2>
                <p><strong>AWB:</strong> ${shipment.trackingNumber}</p>
                <p><strong>Reason:</strong> ${ndrEvent.ndrReason}</p>
                <p><strong>Detected At:</strong> ${new Date(ndrEvent.detectedAt).toLocaleString()}</p>
                <br/>
                <p>Please log in to your dashboard to take action.</p>
                <a href="${process.env.FRONTEND_URL}/dashboard/ndr" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
            </div>
        `;
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
            magicLink?: string;
            customMessage?: string;
        }
    ): string {
        const { recipientName, awb, ndrReason, magicLink, customMessage } = data;

        const baseTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
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
        <p>Please provide instructions for the next delivery attempt:</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="${magicLink}" class="button">
            Resolve Issue
          </a>
        </p>
      `;
        } else if (templateType === 'action_required') {
            content = `
        <p>Your shipment <strong>${awb}</strong> requires your immediate attention.</p>
        <p><strong>Reason:</strong> ${ndrReason}</p>
        <p>Please take action to avoid return to origin (RTO):</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="${magicLink}" class="button">
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
    async sendBulkNotifications(ndrEvents: Array<{ ndrEventId: string; shipmentId: string }>, channel: 'whatsapp' | 'sms' | 'email' | 'all') {
        const results = [];

        for (const event of ndrEvents) {
            try {
                const result = await this.sendNDRNotification({
                    ndrEventId: event.ndrEventId,
                    shipmentId: event.shipmentId,
                    channel,
                    templateType: 'ndr_alert',
                });
                results.push(result);
            } catch (error: any) {
                logger.error(`Bulk NDR failed for ${event.shipmentId}:`, error);
                results.push({
                    shipmentId: event.shipmentId,
                    success: false,
                    error: error.message,
                });
            }
        }

        return results;
    }
}


export default new NDRCommunicationService();
