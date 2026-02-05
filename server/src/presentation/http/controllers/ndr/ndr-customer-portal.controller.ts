import { Request, Response, NextFunction } from 'express';
import { NDREvent } from '../../../../infrastructure/database/mongoose/models';
import NDRMagicLinkService from '../../../../core/application/services/ndr/ndr-magic-link.service';
import logger from '../../../../shared/logger/winston.logger';

export class NDRCustomerPortalController {
    /**
     * GET /public/resolve-ndr/:token
     * Load NDR details for customer
     */
    static async getNDRDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.params;

            const validation = await NDRMagicLinkService.validateToken(token);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.error,
                    code: 'INVALID_TOKEN'
                });
            }

            const ndrEvent = await NDREvent.findById(validation.ndrEventId)
                .populate({
                    path: 'shipment',
                    populate: { path: 'orderId' }
                });

            if (!ndrEvent) {
                return res.status(404).json({ success: false, error: 'NDR not found' });
            }

            // Sanitize for customer view - only return safe data
            const shipment = ndrEvent.shipment as any;
            const order = shipment.orderId as any;

            const customerData = {
                success: true,
                data: {
                    id: ndrEvent._id,
                    orderNumber: order.orderNumber,
                    awb: ndrEvent.awb,
                    reason: ndrEvent.ndrReason,
                    attemptNumber: ndrEvent.attemptNumber,
                    detectedAt: ndrEvent.detectedAt,
                    resolutionDeadline: ndrEvent.resolutionDeadline,
                    shippingAddress: {
                        line1: shipment.destination.line1,
                        line2: shipment.destination.line2,
                        city: shipment.destination.city,
                        state: shipment.destination.state,
                        pincode: shipment.destination.pincode,
                        phone: shipment.destination.phone
                    },
                    orderItems: order.items ? order.items.map((item: any) => ({
                        name: item.name,
                        quantity: item.quantity,
                        image: item.image
                    })) : [],
                    totalAmount: order.totalAmount,
                    paymentMode: order.paymentMode
                }
            };

            res.json(customerData);

        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /public/resolve-ndr/:token/update-address
     * Customer updates delivery address
     */
    static async updateAddress(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.params;
            const { line1, line2, landmark, alternatePhone } = req.body;

            // Basic validation
            if (!line1 || line1.length < 5) {
                return res.status(400).json({ success: false, error: 'Valid address line 1 is required' });
            }

            const validation = await NDRMagicLinkService.validateToken(token);
            if (!validation.valid) {
                return res.status(400).json({ success: false, error: validation.error });
            }

            const ndrEvent = await NDREvent.findById(validation.ndrEventId).populate('shipment');
            if (!ndrEvent) {
                return res.status(404).json({ success: false, error: 'NDR not found' });
            }

            // Update address in shipment (for reattempt)
            // Note: In a real system, we might want to validate this address first
            const shipment = ndrEvent.shipment as any;
            shipment.destination.line1 = line1;
            shipment.destination.line2 = line2;
            shipment.destination.landmark = landmark;
            if (alternatePhone) {
                shipment.destination.phone = alternatePhone;
            }
            await shipment.save();

            // Record customer action
            await ndrEvent.addResolutionAction({
                action: 'Customer updated address',
                actionType: 'update_address',
                takenAt: new Date(),
                takenBy: 'customer',
                result: 'success',
                metadata: { oldAddress: shipment.destination.line1, newAddress: line1 }
            });

            ndrEvent.customerContacted = true;
            ndrEvent.customerResponse = 'address_updated';
            ndrEvent.status = 'in_resolution';
            await ndrEvent.save();

            // TODO: Trigger reattempt request to courier (Phase 5)
            // await CourierNDRActionService.requestReattempt(shipment, { updatedAddress: ... });

            res.json({
                success: true,
                message: 'Address updated. Delivery will be reattempted.'
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /public/resolve-ndr/:token/reschedule
     * Customer reschedules delivery
     */
    static async rescheduleDelivery(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.params;
            const { date } = req.body;

            if (!date || isNaN(new Date(date).getTime())) {
                return res.status(400).json({ success: false, error: 'Valid date is required' });
            }

            const validation = await NDRMagicLinkService.validateToken(token);
            if (!validation.valid) {
                return res.status(400).json({ success: false, error: validation.error });
            }

            const ndrEvent = await NDREvent.findById(validation.ndrEventId);
            if (!ndrEvent) {
                return res.status(404).json({ success: false, error: 'NDR not found' });
            }

            await ndrEvent.addResolutionAction({
                action: 'Customer requested reschedule',
                actionType: 'request_reattempt',
                takenAt: new Date(),
                takenBy: 'customer',
                result: 'success',
                metadata: { requestedDate: date }
            });

            ndrEvent.customerContacted = true;
            ndrEvent.customerResponse = 'reschedule_requested';
            ndrEvent.status = 'in_resolution';
            await ndrEvent.save();

            // TODO: Trigger reattempt request to courier (Phase 5)

            res.json({
                success: true,
                message: `Delivery rescheduled for ${new Date(date).toDateString()}`
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /public/resolve-ndr/:token/cancel
     * Customer cancels order
     */
    static async cancelOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.params;
            const { reason } = req.body;

            const validation = await NDRMagicLinkService.validateToken(token);
            if (!validation.valid) {
                return res.status(400).json({ success: false, error: validation.error });
            }

            const ndrEvent = await NDREvent.findById(validation.ndrEventId).populate('shipment');
            if (!ndrEvent) {
                return res.status(404).json({ success: false, error: 'NDR not found' });
            }

            await ndrEvent.addResolutionAction({
                action: 'Customer requested cancellation',
                actionType: 'trigger_rto', // This will eventually trigger RTO
                takenAt: new Date(),
                takenBy: 'customer',
                result: 'success',
                metadata: { reason }
            });

            ndrEvent.customerContacted = true;
            ndrEvent.customerResponse = 'cancellation_requested';
            // Depending on business logic, might move directly to rto_initiated
            ndrEvent.status = 'in_resolution';
            await ndrEvent.save();

            // TODO: Trigger RTO/Cancellation to courier (Phase 5)

            res.json({
                success: true,
                message: 'Order cancellation requested.'
            });

        } catch (error) {
            next(error);
        }
    }
}
