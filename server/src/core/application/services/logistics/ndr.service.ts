
import mongoose from 'mongoose';
import { NDREvent, NDRWorkflow, Shipment, Company, User } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/app.error';

interface NDRPayload {
    awb: string;
    courierStatus: string;
    remarks: string;
    timestamp: Date;
    courierCode: string;
    ndrType?: 'address_issue' | 'customer_unavailable' | 'refused' | 'payment_issue' | 'other';
}

export default class NDRService {

    /**
     * Process an incoming NDR Signal (Webhook)
     */
    /**
     * Process an incoming NDR Signal (triggered by Webhook Service)
     */
    async processNDREvent(shipment: any, payload: NDRPayload): Promise<void> {
        // 1. Classify NDR Type
        const ndrType = payload.ndrType || this.classifyNDR(payload.remarks);

        // 2. Find or Create NDREvent
        let event = await NDREvent.findOne({ awb: payload.awb, status: { $in: ['detected', 'in_resolution'] } });

        if (event) {
            // Update existing event if it's a subsequent attempt
            if (event.courierRemarks !== payload.remarks) {
                event.attemptNumber += 1;
                event.courierRemarks = payload.remarks;
                await event.save();
                // Optionally re-trigger workflow or specific actions for re-occurrence
            }
        } else {
            // Create New Event
            const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

            event = await NDREvent.create({
                shipment: shipment._id,
                awb: payload.awb,
                ndrReason: payload.remarks,
                ndrType: ndrType,
                detectedAt: payload.timestamp,
                status: 'detected',
                company: shipment.companyId,
                order: shipment.orderId,
                resolutionDeadline: deadline,
                classificationSource: 'keyword'
            });

            // Notify Workflow
            await this.executeWorkflow(event);
        }
    }

    /**
     * Execute Automation Workflow for an Event
     */
    private async executeWorkflow(event: any): Promise<void> {
        // 1. Get Workflow
        const workflow = await NDRWorkflow.findOne({
            ndrType: event.ndrType,
            company: event.company,
            isActive: true
        }) || await NDRWorkflow.findOne({
            ndrType: event.ndrType,
            isDefault: true
        });

        if (!workflow) {
            logger.warn(`No workflow found for NDR Type: ${event.ndrType}`);
            return;
        }

        // 2. Execute Actions (Auto)
        for (const action of workflow.actions) {
            if (action.autoExecute && action.delayMinutes === 0) {
                logger.info(`Executing Action: ${action.actionType} for NDR ${event.awb}`);

                let result = 'success';
                let metadata = {};

                // Execute Action based on Type
                if (action.actionType === 'send_whatsapp') {
                    try {
                        const { default: WhatsappService } = await import('../communication/whatsapp.service.js');
                        // Fetch customer details from shipment
                        const shipment = await Shipment.findById(event.shipment).select('deliveryDetails.recipientPhone deliveryDetails.recipientName');

                        if (shipment) {
                            await WhatsappService.sendNDRWhatsApp(
                                shipment.deliveryDetails.recipientPhone,
                                shipment.deliveryDetails.recipientName,
                                event.order ? event.order.toString() : 'N/A',
                                event.awb,
                                event.ndrReason
                            );
                            logger.info(`NDR WhatsApp Sent to ${shipment.deliveryDetails.recipientPhone}`);
                        }
                    } catch (err: any) {
                        logger.error('Failed to send NDR WhatsApp', err);
                        result = 'failed';
                        metadata = { error: err.message };
                    }
                }

                await event.addResolutionAction({
                    action: action.description || action.actionType,
                    actionType: action.actionType,
                    takenBy: 'SYSTEM',
                    result: result,
                    metadata: metadata,
                    takenAt: new Date()
                });
            }
        }

        event.status = 'in_resolution';
        await event.save();
    }

    /**
     * Helper: Classify text remarks to Type
     */
    private classifyNDR(remarks: string): 'address_issue' | 'customer_unavailable' | 'refused' | 'payment_issue' | 'other' {
        const r = remarks.toLowerCase();
        if (r.includes('address') || r.includes('incomplete') || r.includes('wrong')) return 'address_issue';
        if (r.includes('refuse') || r.includes('reject') || r.includes('cancelled')) return 'refused';
        if (r.includes('cod') || r.includes('cash') || r.includes('money')) return 'payment_issue';
        if (r.includes('available') || r.includes('phone') || r.includes('switch off')) return 'customer_unavailable';
        return 'other';
    }

    /**
     * Resolve NDR (Manual/API Action)
     */
    async resolveNDR(ndrId: string, action: 'reattempt' | 'rto', remarks?: string): Promise<boolean> {
        const event = await NDREvent.findById(ndrId);
        if (!event) throw new AppError('NDR Not Found', 'RES_NOT_FOUND', 404);

        if (action === 'reattempt') {
            // Call Courier API for Reattempt
            logger.info(`Requesting Reattempt for ${event.awb}`);
            await event.addResolutionAction({
                action: 'Manual Reattempt Request',
                actionType: 'request_reattempt',
                takenBy: 'USER',
                result: 'success',
                metadata: { remarks }
            } as any);
            await event.markResolved('USER', 'reattempt_requested');
        } else if (action === 'rto') {
            // Call Courier API for RTO
            logger.info(`Requesting RTO for ${event.awb}`);
            await event.triggerRTO();
            await event.markResolved('USER', 'rto_triggered');
        }

        return true;
    }
}
