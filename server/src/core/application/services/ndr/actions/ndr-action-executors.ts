/**
 * NDRActionExecutors
 *
 * Execute specific workflow actions for NDR resolution.
 */

import { NDREvent, INDREvent, INDRResolutionAction } from '../../../../../infrastructure/database/mongoose/models';
import { CallLog } from '../../../../../infrastructure/database/mongoose/models';
import ExotelClient from '../../../../../infrastructure/external/communication/exotel/exotel.client';
import WhatsAppService from '../../../../../infrastructure/external/communication/whatsapp/whatsapp.service';
import OpenAIService from '../../../../../infrastructure/external/ai/openai/openai.service';
import TokenService from '../../../../../shared/services/token.service';
import logger from '../../../../../shared/logger/winston.logger';
import smsService from '../../communication/sms.service';
import NotificationPreferenceService from '../../communication/notification-preferences.service';

interface ActionResult {
    success: boolean;
    actionType: string;
    result: 'success' | 'failed' | 'pending' | 'skipped';
    metadata?: Record<string, any>;
    error?: string;
}

interface CustomerInfo {
    name: string;
    phone: string;
    email?: string;
}

interface ActionContext {
    ndrEvent: INDREvent;
    customer: CustomerInfo;
    orderId: string;
    companyId: string;
}

export class NDRActionExecutors {
    private static exotel = new ExotelClient();
    private static whatsapp = new WhatsAppService();

    private static async canSend(companyId: string, channel: 'email' | 'sms' | 'whatsapp'): Promise<boolean> {
        try {
            return await NotificationPreferenceService.shouldSend(companyId, channel);
        } catch {
            return true;
        }
    }

    /**
     * Execute action by type
     */
    static async executeAction(
        actionType: string,
        context: ActionContext,
        actionConfig: Record<string, any>
    ): Promise<ActionResult> {
        switch (actionType) {
            case 'call_customer':
                return this.executeCallCustomer(context, actionConfig);
            case 'send_whatsapp':
                return this.executeSendWhatsApp(context, actionConfig);
            case 'send_email':
                return this.executeSendEmail(context, actionConfig);
            case 'send_sms':
                return this.executeSendSMS(context, actionConfig);
            case 'update_address':
                return this.executeUpdateAddress(context, actionConfig);
            case 'request_reattempt':
                return this.executeRequestReattempt(context, actionConfig);
            case 'trigger_rto':
                return this.executeTriggerRTO(context, actionConfig);
            default:
                logger.warn('Unknown action type', { actionType });
                return {
                    success: false,
                    actionType,
                    result: 'failed',
                    error: `Unknown action type: ${actionType}`,
                };
        }
    }

    /**
     * Call customer via Exotel
     */
    static async executeCallCustomer(
        context: ActionContext,
        actionConfig: Record<string, any>
    ): Promise<ActionResult> {
        try {
            const { ndrEvent, customer, companyId } = context;

            // Initiate call
            const callResult = await this.exotel.initiateCall(
                customer.phone,
                actionConfig.callbackUrl,
                JSON.stringify({ ndrEventId: ndrEvent._id, orderId: context.orderId })
            );

            if (!callResult.success) {
                return {
                    success: false,
                    actionType: 'call_customer',
                    result: 'failed',
                    error: callResult.error,
                };
            }

            // Log call
            await CallLog.create({
                ndrEvent: ndrEvent._id,
                shipment: ndrEvent.shipment,
                customer: { name: customer.name, phone: customer.phone },
                callSid: callResult.callSid!,
                callProvider: 'exotel',
                status: 'initiated',
                direction: 'outbound',
                company: companyId,
            });

            // Update NDR event
            ndrEvent.customerContacted = true;
            await ndrEvent.save();

            return {
                success: true,
                actionType: 'call_customer',
                result: 'success',
                metadata: { callSid: callResult.callSid },
            };
        } catch (error: any) {
            logger.error('Call customer action failed', {
                error: error.message,
                ndrEventId: context.ndrEvent._id,
            });

            return {
                success: false,
                actionType: 'call_customer',
                result: 'failed',
                error: error.message,
            };
        }
    }

    /**
     * Send WhatsApp notification
     */
    static async executeSendWhatsApp(
        context: ActionContext,
        actionConfig: Record<string, any>
    ): Promise<ActionResult> {
        try {
            const { ndrEvent, customer } = context;

            const allowed = await this.canSend(context.companyId, 'whatsapp');
            if (!allowed) {
                return {
                    success: true,
                    actionType: 'send_whatsapp',
                    result: 'skipped',
                    metadata: { reason: 'notification_preferences' }
                };
            }

            // Import Magic Link Service
            const NDRMagicLinkService = (await import('../ndr-magic-link.service.js')).default;
            const magicLink = NDRMagicLinkService.generateMagicLink(String(ndrEvent._id));

            // Generate personalized message if OpenAI is available
            let message: string;
            if (OpenAIService.isConfigured() && actionConfig.useAI !== false) {
                const generated = await OpenAIService.generateCustomerMessage(
                    ndrEvent.ndrType,
                    customer.name,
                    context.orderId,
                    ndrEvent.ndrReason
                );
                message = generated.message + `\n\nResolve here: ${magicLink}`;
            } else {
                // Use default NDR notification
                message = ''; // Will use default in sendNDRNotification
            }

            const result = message
                ? await this.whatsapp.sendMessage(customer.phone, message)
                : await this.whatsapp.sendNDRNotification(
                    customer.phone,
                    customer.name,
                    context.orderId,
                    ndrEvent.ndrReason,
                    magicLink
                );

            if (!result.success) {
                return {
                    success: false,
                    actionType: 'send_whatsapp',
                    result: 'failed',
                    error: result.error,
                };
            }

            // Update NDR event
            ndrEvent.customerContacted = true;
            await ndrEvent.save();

            return {
                success: true,
                actionType: 'send_whatsapp',
                result: 'success',
                metadata: { messageId: result.messageId },
            };
        } catch (error: any) {
            logger.error('Send WhatsApp action failed', {
                error: error.message,
                ndrEventId: context.ndrEvent._id,
            });

            return {
                success: false,
                actionType: 'send_whatsapp',
                result: 'failed',
                error: error.message,
            };
        }
    }

    /**
     * Send email notification
     * Issue #17: Integrated with existing EmailService
     */
    static async executeSendEmail(
        context: ActionContext,
        actionConfig: Record<string, any>
    ): Promise<ActionResult> {
        try {
            const { ndrEvent, customer } = context;

            const allowed = await this.canSend(context.companyId, 'email');
            if (!allowed) {
                return {
                    success: true,
                    actionType: 'send_email',
                    result: 'skipped',
                    metadata: { reason: 'notification_preferences' }
                };
            }

            if (!customer.email) {
                return {
                    success: false,
                    actionType: 'send_email',
                    result: 'skipped',
                    error: 'No email address available',
                };
            }

            // Import email service & Magic Link Service
            const EmailService = (await import('../../communication/email.service.js')).default;
            const NDRMagicLinkService = (await import('../ndr-magic-link.service.js')).default;
            const magicLink = NDRMagicLinkService.generateMagicLink(String(ndrEvent._id));

            // Send NDR notification email
            const subject = `Update on your order ${context.orderId}`;
            const htmlContent = `
                <h2>Delivery Update</h2>
                <p>Dear ${customer.name},</p>
                <p>We attempted to deliver your order but encountered an issue:</p>
                <blockquote><strong>${ndrEvent.ndrReason || 'Delivery unsuccessful'}</strong></blockquote>
                <p>Please click the button below to resolve this issue and reschedule delivery:</p>
                <p style="text-align: center; margin: 20px 0;">
                    <a href="${magicLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Resolve Delivery Issue</a>
                </p>
                <p>Order ID: <strong>${context.orderId}</strong></p>
                <p>If you have any questions, please reply to this email.</p>
                <p>Thank you for your patience.</p>
                <p>- The Shipcrowd Team</p>
            `;

            const sent = await EmailService.sendEmail(
                customer.email,
                subject,
                htmlContent,
                `Delivery update for order ${context.orderId}: ${ndrEvent.ndrReason}\nResolve here: ${magicLink}` // Plain text fallback
            );

            if (!sent) {
                return {
                    success: false,
                    actionType: 'send_email',
                    result: 'failed',
                    error: 'Failed to send email',
                };
            }

            logger.info('NDR email notification sent', {
                to: customer.email,
                ndrEventId: ndrEvent._id,
                orderId: context.orderId,
            });

            return {
                success: true,
                actionType: 'send_email',
                result: 'success',
                metadata: { email: customer.email, orderId: context.orderId },
            };
        } catch (error: any) {
            logger.error('Send email action failed', {
                error: error.message,
                ndrEventId: context.ndrEvent._id,
            });
            return {
                success: false,
                actionType: 'send_email',
                result: 'failed',
                error: error.message,
            };
        }
    }

    /**
     * Send SMS notification
     */
    static async executeSendSMS(
        context: ActionContext,
        actionConfig: Record<string, any>
    ): Promise<ActionResult> {
        try {
            const { ndrEvent, customer } = context;

            const allowed = await this.canSend(context.companyId, 'sms');
            if (!allowed) {
                return {
                    success: true,
                    actionType: 'send_sms',
                    result: 'skipped',
                    metadata: { reason: 'notification_preferences' }
                };
            }

            // Import Magic Link Service
            const NDRMagicLinkService = (await import('../ndr-magic-link.service.js')).default;
            const magicLink = NDRMagicLinkService.generateMagicLink(String(ndrEvent._id));

            const awb = ndrEvent.awb;
            const ndrReason = ndrEvent.ndrReason || 'Delivery attempt failed';
            const template = actionConfig.template || 'ndr_alert';
            const frontendUrl = process.env.FRONTEND_URL || 'https://app.shipcrowd.com'; // Fallback for tracking links

            let message: string = actionConfig.message;

            if (!message) {
                switch (template) {
                    case 'action_required':
                        message = `Hi ${customer.name}, action needed for ${awb}. Delivery failed: ${ndrReason}. Update address: ${magicLink}`;
                        break;
                    case 'reattempt':
                        message = `Hi ${customer.name}, delivery for ${awb} rescheduled. Track: ${frontendUrl}/track/${awb}`;
                        break;
                    case 'rto':
                        message = `Hi ${customer.name}, shipment ${awb} is being returned. Reason: ${ndrReason}. Contact support for details.`;
                        break;
                    case 'ndr_alert':
                    default:
                        message = `Hi ${customer.name}, delivery for ${awb} failed. Reason: ${ndrReason}. Resolve: ${magicLink}`;
                        break;
                }
            }

            const smsSent = await smsService.sendSMS(customer.phone, message);

            if (!smsSent) {
                return {
                    success: false,
                    actionType: 'send_sms',
                    result: 'failed',
                    error: 'SMS send failed',
                };
            }

            return {
                success: true,
                actionType: 'send_sms',
                result: 'success',
                metadata: { template }
            };
        } catch (error: any) {
            logger.error('Send SMS action failed', {
                error: error.message,
                ndrEventId: context.ndrEvent._id,
            });

            return {
                success: false,
                actionType: 'send_sms',
                result: 'failed',
                error: error.message,
            };
        }
    }

    /**
     * Send address update magic link
     */
    static async executeUpdateAddress(
        context: ActionContext,
        actionConfig: Record<string, any>
    ): Promise<ActionResult> {
        try {
            const { ndrEvent, customer, companyId } = context;

            // Generate magic link token using TokenService (48-hour expiry)
            const shipmentId = String(ndrEvent.shipment);
            const ndrEventId = String(ndrEvent._id);
            const token = TokenService.generateAddressUpdateToken(shipmentId, companyId, ndrEventId);
            const updateUrl = `${process.env.BASE_URL || 'https://Shipcrowd.com'}/public/update-address/${token}`;

            // Send via WhatsApp with update link
            const message = `Hi ${customer.name},

We attempted to deliver your order but encountered an address issue.

Please update your delivery address:
${updateUrl}

✓ Secure link (expires in 48 hours)
✓ We'll retry delivery immediately after update

Need help? Reply to this message.

-Shipcrowd`;

            const result = await this.whatsapp.sendMessage(customer.phone, message);

            return {
                success: result.success,
                actionType: 'update_address',
                result: result.success ? 'success' : 'failed',
                metadata: { token, updateUrl, messageId: result.messageId },
                error: result.error,
            };
        } catch (error: any) {
            return {
                success: false,
                actionType: 'update_address',
                result: 'failed',
                error: error.message,
            };
        }
    }

    /**
     * Request courier reattempt
     */
    static async executeRequestReattempt(
        context: ActionContext,
        actionConfig: Record<string, any>
    ): Promise<ActionResult> {
        try {
            const { ndrEvent, companyId } = context;

            // Dynamically import dependencies
            const mongoose = await import('mongoose');
            const { CourierFactory } = await import('../../courier/courier.factory.js');
            const { Shipment } = await import('../../../../../infrastructure/database/mongoose/models/index.js');

            // Determine carrier from shipment
            let carrierName = 'velocity-shipfast'; // Default fallback, though should always be present

            // Check if shipment is populated and has carrier
            if (ndrEvent.shipment && (ndrEvent.shipment as any).carrier) {
                carrierName = (ndrEvent.shipment as any).carrier;
            } else {
                // Fetch shipment if mostly likely just an ID
                const shipmentDoc = await Shipment.findById(ndrEvent.shipment).select('carrier');
                if (shipmentDoc) {
                    carrierName = shipmentDoc.carrier;
                } else {
                    logger.warn('Shipment not found for NDR reattempt, defaulting to velocity-shipfast', {
                        shipmentId: ndrEvent.shipment,
                        ndrEventId: ndrEvent._id
                    });
                }
            }

            // Get generic courier provider
            const provider = await CourierFactory.getProvider(
                carrierName,
                new mongoose.Types.ObjectId(companyId)
            );

            // Execute reattempt request via common interface
            const result = await provider.requestReattempt(
                ndrEvent.awb,
                actionConfig.preferredDate ? new Date(actionConfig.preferredDate) : undefined,
                actionConfig.notes // "notes" maps to "instructions" in interface
            );

            if (result.success && (result as any).uplId && carrierName.toLowerCase().includes('delhivery')) {
                try {
                    const QueueManager = (await import('../../../../../infrastructure/utilities/queue-manager.js')).default as any;
                    await QueueManager.addJob(
                        'delhivery-ndr-status',
                        'poll-ndr-status',
                        {
                            uplId: (result as any).uplId,
                            awb: ndrEvent.awb,
                            ndrEventId: String(ndrEvent._id)
                        },
                        {
                            attempts: 10,
                            backoff: { type: 'exponential', delay: 60000 }
                        }
                    );
                } catch (queueError) {
                    logger.warn('Failed to queue Delhivery NDR status polling', {
                        ndrEventId: ndrEvent._id,
                        error: queueError instanceof Error ? queueError.message : 'Unknown error'
                    });
                }
            }

            logger.info('Courier reattempt requested', {
                ndrEventId: ndrEvent._id,
                awb: ndrEvent.awb,
                carrier: carrierName,
                success: result.success,
                message: result.message
            });

            return {
                success: result.success,
                actionType: 'request_reattempt',
                result: result.success ? 'success' : 'failed',
                metadata: {
                    awb: ndrEvent.awb,
                    message: result.message,
                    carrier: carrierName,
                    uplId: (result as any).uplId,
                    manualActionRequired: !result.success
                },
                error: result.success ? undefined : result.message
            };
        } catch (error: any) {
            return {
                success: false,
                actionType: 'request_reattempt',
                result: 'failed',
                error: error.message,
            };
        }
    }

    /**
     * Trigger RTO
     */
    static async executeTriggerRTO(
        context: ActionContext,
        actionConfig: Record<string, any>
    ): Promise<ActionResult> {
        try {
            const { ndrEvent, customer } = context;

            // Import RTOService dynamically to avoid circular dependency
            const RTOServiceModule = await import('../../rto/rto.service.js') as any;
            const RTOService = RTOServiceModule.default;

            // Trigger RTO
            const rtoResult = await RTOService.triggerRTO(
                ndrEvent.shipment.toString(),
                'ndr_unresolved',
                String(ndrEvent._id),
                'auto'
            );

            // Notify customer
            await this.whatsapp.sendRTONotification(
                customer.phone,
                customer.name,
                context.orderId,
                'Delivery attempts exhausted',
                rtoResult.reverseAwb
            );

            // Update NDR status
            await ndrEvent.triggerRTO();

            return {
                success: true,
                actionType: 'trigger_rto',
                result: 'success',
                metadata: { rtoEventId: rtoResult.rtoEventId, reverseAwb: rtoResult.reverseAwb },
            };
        } catch (error: any) {
            logger.error('Trigger RTO action failed', {
                error: error.message,
                ndrEventId: context.ndrEvent._id,
            });

            return {
                success: false,
                actionType: 'trigger_rto',
                result: 'failed',
                error: error.message,
            };
        }
    }

    // Note: generateAddressUpdateToken removed - now using TokenService.generateAddressUpdateToken()

    /**
     * Record action result in NDR event
     */
    static async recordActionResult(
        ndrEventId: string,
        actionResult: ActionResult,
        executedBy: string
    ): Promise<void> {
        const action: INDRResolutionAction = {
            action: actionResult.actionType,
            actionType: actionResult.actionType as any,
            takenAt: new Date(),
            takenBy: executedBy,
            result: actionResult.result,
            metadata: actionResult.metadata,
        };

        const nextStatus =
            actionResult.result === 'success' || actionResult.result === 'skipped'
                ? 'in_resolution'
                : 'detected';

        await NDREvent.findByIdAndUpdate(ndrEventId, {
            $push: { resolutionActions: action },
            $set: { status: nextStatus },
        });
    }
}

export default NDRActionExecutors;
