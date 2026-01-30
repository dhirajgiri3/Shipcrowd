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

            // Generate personalized message if OpenAI is available
            let message: string;
            if (OpenAIService.isConfigured() && actionConfig.useAI !== false) {
                const generated = await OpenAIService.generateCustomerMessage(
                    ndrEvent.ndrType,
                    customer.name,
                    context.orderId,
                    ndrEvent.ndrReason
                );
                message = generated.message;
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
                    ndrEvent.ndrReason
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

            if (!customer.email) {
                return {
                    success: false,
                    actionType: 'send_email',
                    result: 'skipped',
                    error: 'No email address available',
                };
            }

            // Import email service
            const EmailService = (await import('../../communication/email.service.js')).default;

            // Send NDR notification email
            const subject = `Update on your order ${context.orderId}`;
            const htmlContent = `
                <h2>Delivery Update</h2>
                <p>Dear ${customer.name},</p>
                <p>We attempted to deliver your order but encountered an issue:</p>
                <blockquote><strong>${ndrEvent.ndrReason || 'Delivery unsuccessful'}</strong></blockquote>
                <p>Our team is working to resolve this. We will attempt delivery again soon.</p>
                <p>Order ID: <strong>${context.orderId}</strong></p>
                <p>If you have any questions, please reply to this email.</p>
                <p>Thank you for your patience.</p>
                <p>- The Shipcrowd Team</p>
            `;

            const sent = await EmailService.sendEmail(
                customer.email,
                subject,
                htmlContent,
                `Delivery update for order ${context.orderId}: ${ndrEvent.ndrReason}` // Plain text fallback
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

        await NDREvent.findByIdAndUpdate(ndrEventId, {
            $push: { resolutionActions: action },
            $set: { status: actionResult.result === 'success' ? 'in_resolution' : 'detected' },
        });
    }
}

export default NDRActionExecutors;
