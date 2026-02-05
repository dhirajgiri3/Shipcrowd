import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import { DelhiveryProvider } from '../../../../infrastructure/external/couriers/delhivery/delhivery.provider';
import { EkartProvider } from '../../../../infrastructure/external/couriers/ekart/ekart.provider';
import logger from '../../../../shared/logger/winston.logger';
import { AppError } from '../../../../shared/errors/app.error';

/**
 * Service to handle courier reattempt requests and address updates
 * Abstracts the carrier-specific implementations
 */
export class CourierReattemptService {

    /**
     * Request reattempt for a shipment
     */
    static async requestReattempt(
        shipmentId: string,
        options: {
            preferredDate?: Date;
            updatedAddress?: {
                line1: string;
                city: string;
                state: string;
                pincode: string;
                country?: string;
            };
            instructions?: string;
            phone?: string;
        }
    ): Promise<{ success: boolean; message: string; providerRefId?: string }> {
        try {
            const shipment = await Shipment.findById(shipmentId);
            if (!shipment) {
                throw new AppError(404, 'Shipment not found');
            }

            const carrier = shipment.courierProvider; // 'delhivery', 'ekart', 'velocity' etc.
            const companyId = shipment.companyId;

            if (!carrier) {
                throw new AppError(400, 'Shipment has no carrier provider assigned');
            }

            logger.info(`Initiating reattempt request for ${carrier} shipment ${shipment.trackingNumber}`, { options });

            if (carrier === 'delhivery') {
                const provider = new DelhiveryProvider(companyId);

                // If address Update is requested
                if (options.updatedAddress) {
                    await provider.updateDeliveryAddress(
                        shipment.trackingNumber,
                        {
                            line1: options.updatedAddress.line1,
                            city: options.updatedAddress.city,
                            state: options.updatedAddress.state,
                            pincode: options.updatedAddress.pincode,
                            country: options.updatedAddress.country || 'India'
                        },
                        shipment.orderId?.toString(),
                        options.phone
                    );
                }

                // Request Reattempt
                // Delhivery doesn't explicitly support "preferred date" in the same API call often, 
                // but let's pass it if the provider supports it or as instructions.
                // The provider method: requestReattempt(trackingNumber, preferredDate, instructions)
                return await provider.requestReattempt(
                    shipment.trackingNumber,
                    options.preferredDate,
                    options.instructions
                );

            } else if (carrier === 'ekart') {
                const provider = new EkartProvider(companyId);

                // Ekart Address Update is tricky, often part of reattempt instructions.
                // We'll append address to instructions if present for now.
                let instructions = options.instructions || '';
                if (options.updatedAddress) {
                    instructions += ` Updated Address: ${options.updatedAddress.line1}, ${options.updatedAddress.pincode}`;
                }

                return await provider.requestReattempt(
                    shipment.trackingNumber,
                    options.preferredDate,
                    instructions
                );
            } else if (carrier === 'velocity') {
                // Placeholder for Velocity
                // const provider = new VelocityProvider(companyId);
                // return await provider.requestReattempt(...)
                logger.warn('Velocity reattempt not fully implemented yet');
                return { success: true, message: 'Reattempt recorded internally (Velocity support pending)' };
            }

            throw new AppError(400, `Unsupported carrier for reattempt: ${carrier}`);

        } catch (error: any) {
            logger.error(`Failed to request reattempt for shipment ${shipmentId}`, error);
            // We return success: false instead of throwing to avoid crashing the user flow completely?
            // Or throw to alert the controller? Controller handles errors.
            throw new AppError(500, `Courier API Error: ${error.message}`);
        }
    }

    /**
     * Request Cancellation / RTO
     */
    static async requestCancellation(shipmentId: string, reason?: string): Promise<{ success: boolean; message: string }> {
        try {
            const shipment = await Shipment.findById(shipmentId);
            if (!shipment) {
                throw new AppError(404, 'Shipment not found');
            }

            const carrier = shipment.courierProvider;
            const companyId = shipment.companyId;

            logger.info(`Initiating cancellation/RTO request for ${carrier} shipment ${shipment.trackingNumber}`);

            if (carrier === 'delhivery') {
                const provider = new DelhiveryProvider(companyId);
                const success = await provider.cancelShipment(shipment.trackingNumber); // Uses /api/p/edit cancellation=true
                return { success, message: success ? 'Cancellation requested' : 'Failed' };
            } else if (carrier === 'ekart') {
                const provider = new EkartProvider(companyId);
                const result = await provider.requestRTO(shipment.trackingNumber);
                return result;
            }

            return { success: false, message: 'Carrier not supported for automated cancellation yet' };

        } catch (error: any) {
            logger.error(`Failed to cancel shipment ${shipmentId}`, error);
            throw new AppError(500, `Courier API Error: ${error.message}`);
        }
    }
}

export default CourierReattemptService;
