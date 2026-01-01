import { Request, Response, NextFunction } from 'express';
import TokenService from '../../../../shared/services/TokenService';
import Shipment from '../../../../infrastructure/database/mongoose/models/Shipment';
import NDREvent from '../../../../infrastructure/database/mongoose/models/NDREvent';
import { AppError } from '../../../../shared/errors/AppError';
import WhatsAppService from '../../../../infrastructure/integrations/communication/WhatsAppService';
import WarehouseNotificationService from '../../../../core/application/services/warehouse/WarehouseNotificationService';
import logger from '../../../../shared/logger/winston.logger';

/**
 * AddressUpdateController
 * 
 * Handles public address update requests via magic link
 * No authentication required - security via JWT token
 */

export class AddressUpdateController {
    private static whatsapp = new WhatsAppService();

    /**
     * GET /public/update-address/:token
     * Render address update form or return shipment details
     */
    static async getAddressUpdateForm(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { token } = req.params;

            // Verify token
            const { shipmentId, ndrEventId } = TokenService.verifyAddressUpdateToken(token);

            // Load shipment details
            const shipment = await Shipment.findById(shipmentId);
            if (!shipment) {
                throw new AppError('Shipment not found', 'SHIPMENT_NOT_FOUND', 404);
            }

            // Load NDR event if exists
            let ndrEvent = null;
            if (ndrEventId) {
                ndrEvent = await NDREvent.findById(ndrEventId);
            }

            // Return shipment details for form rendering
            res.status(200).json({
                success: true,
                data: {
                    shipment: {
                        trackingNumber: shipment.trackingNumber,
                        currentAddress: shipment.deliveryDetails.address,
                        recipientName: shipment.deliveryDetails.recipientName,
                        recipientPhone: shipment.deliveryDetails.recipientPhone,
                    },
                    ndrReason: ndrEvent?.ndrReason,
                    token, // Return token for form submission
                },
            });

            logger.info('Address update form accessed', {
                shipmentId,
                trackingNumber: shipment.trackingNumber,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /public/update-address/:token
     * Process address update submission
     */
    static async updateAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { token } = req.params;
            const { address, phone } = req.body;

            // Validate input
            if (!address || !address.line1 || !address.city || !address.state || !address.postalCode) {
                throw new AppError('Complete address required', 'INVALID_ADDRESS', 400);
            }

            // Verify token
            const { shipmentId, ndrEventId } = TokenService.verifyAddressUpdateToken(token);

            // Load shipment
            const shipment = await Shipment.findById(shipmentId);
            if (!shipment) {
                throw new AppError('Shipment not found', 'SHIPMENT_NOT_FOUND', 404);
            }

            // Store old address for warehouse notification
            const oldAddress = {
                street: shipment.deliveryDetails.address.line1,
                city: shipment.deliveryDetails.address.city,
                state: shipment.deliveryDetails.address.state,
                pincode: shipment.deliveryDetails.address.postalCode,
                country: shipment.deliveryDetails.address.country,
            };

            // Update shipment address
            shipment.deliveryDetails.address = {
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country || 'India',
            };

            // Update phone if provided
            if (phone) {
                shipment.deliveryDetails.recipientPhone = phone;
            }

            // Add to status history as documentation
            shipment.statusHistory.push({
                status: shipment.currentStatus,
                timestamp: new Date(),
                description: `Address updated by customer. Old: ${oldAddress.street}, ${oldAddress.city}`,
            });

            await shipment.save();

            // Update NDR event if exists
            if (ndrEventId) {
                const ndrEvent = await NDREvent.findById(ndrEventId);
                if (ndrEvent && ndrEvent.status !== 'resolved') {
                    ndrEvent.resolutionActions.push({
                        action: 'Customer updated delivery address',
                        actionType: 'update_address',
                        takenAt: new Date(),
                        takenBy: 'customer',
                        result: 'success',
                        metadata: {
                            oldAddress,
                            newAddress: {
                                street: address.line1,
                                city: address.city,
                                state: address.state,
                                pincode: address.postalCode,
                            },
                        },
                    });
                    ndrEvent.status = 'in_resolution';
                    await ndrEvent.save();

                    logger.info('NDR event updated with address change', {
                        ndrEventId,
                        shipmentId,
                    });
                }
            }

            // Notify warehouse of address change
            const newAddress = {
                street: address.line1,
                city: address.city,
                state: address.state,
                pincode: address.postalCode,
                country: address.country || 'India',
            };

            await WarehouseNotificationService.notifyAddressChanged(
                String(shipment._id),
                oldAddress,
                newAddress
            );

            // TODO: Request courier reattempt via courier API
            // await CourierService.requestReattempt(shipment._id);
            logger.info('Courier reattempt request pending (not implemented)', {
                shipmentId: shipment._id,
            });

            // Send WhatsApp confirmation
            const confirmationMessage = `✅ Address Updated Successfully!

Your delivery address for tracking ${shipment.trackingNumber} has been updated.

New Address:
${address.line1}${address.line2 ? '\n' + address.line2 : ''}
${address.city}, ${address.state} - ${address.postalCode}

We'll attempt delivery to the new address shortly.

-Shipcrowd`;

            try {
                await this.whatsapp.sendMessage(shipment.deliveryDetails.recipientPhone, confirmationMessage);
            } catch (error) {
                logger.error('Failed to send WhatsApp confirmation', { error });
                // Don't fail the request if WhatsApp fails
            }

            // Invalidate token (one-time use)
            TokenService.invalidateToken(token);

            res.status(200).json({
                success: true,
                message: 'Address updated successfully. We will attempt delivery to the new address.',
                data: {
                    trackingNumber: shipment.trackingNumber,
                    newAddress: shipment.deliveryDetails.address,
                },
            });

            logger.info('Address updated via magic link', {
                shipmentId,
                trackingNumber: shipment.trackingNumber,
                oldPostalCode: oldAddress.pincode,
                newPostalCode: address.postalCode,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default AddressUpdateController;
