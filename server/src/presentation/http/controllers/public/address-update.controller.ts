import { Request, Response, NextFunction } from 'express';
import TokenService from '../../../../shared/services/token.service';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import { NDREvent } from '../../../../infrastructure/database/mongoose/models';
import { AppError, ValidationError } from '../../../../shared/errors/app.error';
import WhatsAppService from '../../../../infrastructure/external/communication/whatsapp/whatsapp.service';
import WarehouseNotificationService from '../../../../core/application/services/warehouse/warehouse-notification.service';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { publicAddressUpdateSchema } from '../../../../shared/validation/ndr-schemas';

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
            const { shipmentId, ndrEventId, companyId } = TokenService.verifyAddressUpdateToken(token);

            // Load shipment details
            const shipment = await Shipment.findById(shipmentId);
            if (!shipment) {
                throw new AppError('Shipment not found', 'SHIPMENT_NOT_FOUND', 404);
            }

            // Verify multi-tenancy: ensure shipment belongs to the company in the token
            if (String(shipment.companyId) !== companyId) {
                throw new AppError('Access denied', 'ACCESS_DENIED', 403);
            }

            // Load NDR event if exists
            let ndrEvent = null;
            if (ndrEventId) {
                ndrEvent = await NDREvent.findById(ndrEventId);
            }

            // Return shipment details for form rendering
            sendSuccess(res, {
                shipment: {
                    trackingNumber: shipment.trackingNumber,
                    currentAddress: shipment.deliveryDetails.address,
                    recipientName: shipment.deliveryDetails.recipientName,
                    recipientPhone: shipment.deliveryDetails.recipientPhone,
                },
                ndrReason: ndrEvent?.ndrReason,
                token, // Return token for form submission
            }, 'Address update form data');

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

            // Validate request body with Zod
            const validation = publicAddressUpdateSchema.safeParse(req.body);
            if (!validation.success) {
                const errors = validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                throw new ValidationError('Validation failed', errors);
            }

            const { newAddress: address, customerPhone: phone } = validation.data;

            // Verify token
            const { shipmentId, ndrEventId, companyId } = TokenService.verifyAddressUpdateToken(token);

            // Load shipment
            const shipment = await Shipment.findById(shipmentId);
            if (!shipment) {
                throw new AppError('Shipment not found', 'SHIPMENT_NOT_FOUND', 404);
            }

            // Verify multi-tenancy: ensure shipment belongs to the company in the token
            if (String(shipment.companyId) !== companyId) {
                throw new AppError('Access denied', 'ACCESS_DENIED', 403);
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
                    ndrEvent.customerResponse = 'address_updated';
                    ndrEvent.customerContacted = true;
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

            // Sync address update with Courier (multi-courier friendly)
            try {
                const mongoose = await import('mongoose');
                const { CourierFactory } = await import('../../../../core/application/services/courier/courier.factory.js');

                const { CarrierNormalizationService } = await import('../../../../core/application/services/shipping/carrier-normalization.service');
                const { default: CourierProviderRegistry } = await import('../../../../core/application/services/courier/courier-provider-registry');
                const rawCarrier = shipment.carrier || 'velocity-shipfast';
                const courierProvider = CarrierNormalizationService.resolveCarrierForProviderLookup(rawCarrier)
                    || CourierProviderRegistry.getIntegrationProvider(rawCarrier)
                    || rawCarrier;

                const courierClient = await CourierFactory.getProvider(
                    courierProvider,
                    new mongoose.Types.ObjectId(String(shipment.companyId))
                );

                // 1. Update address on Courier side (if supported)
                if (courierClient && typeof (courierClient as any).updateDeliveryAddress === 'function') {
                    const courierUpdateResult = await (courierClient as any).updateDeliveryAddress(
                        shipment.trackingNumber,
                        {
                            line1: address.line1,
                            city: address.city,
                            state: address.state,
                            pincode: address.postalCode,
                            country: address.country || 'India'
                        },
                        (shipment as any).orderId || shipment.trackingNumber, // Fallback if orderId missing
                        phone || shipment.deliveryDetails.recipientPhone
                    );

                    if (!courierUpdateResult.success) {
                        logger.error('Failed to sync address to courier', {
                            shipmentId: shipment._id,
                            error: courierUpdateResult.message
                        });
                    } else {
                        logger.info('Address synced to courier', { shipmentId: shipment._id, courier: courierProvider });
                    }
                } else {
                    logger.warn('Courier does not support address update API', {
                        shipmentId: shipment._id,
                        courier: courierProvider
                    });
                }

                // 2. Request Reattempt immediately with new address (if supported)
                if (courierClient && typeof (courierClient as any).requestReattempt === 'function') {
                    const reattemptResult = await courierClient.requestReattempt(
                        shipment.trackingNumber,
                        new Date(Date.now() + 24 * 60 * 60 * 1000), // Schedule for next day
                        'Customer updated address via Magic Link'
                    );

                    logger.info('Courier reattempt requested after address update', {
                        shipmentId: shipment._id,
                        courier: courierProvider,
                        success: reattemptResult.success
                    });
                }
            } catch (courierError: any) {
                logger.error('Courier sync failed during address update', {
                    shipmentId: shipment._id,
                    error: courierError.message
                });
            }

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

            sendSuccess(res, {
                trackingNumber: shipment.trackingNumber,
                newAddress: shipment.deliveryDetails.address,
            }, 'Address updated successfully. We will attempt delivery to the new address.');

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
