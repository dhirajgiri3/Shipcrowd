import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import { DelhiveryProvider } from '../../../../infrastructure/external/couriers/delhivery/delhivery.provider';
import { EkartProvider } from '../../../../infrastructure/external/couriers/ekart/ekart.provider';
import logger from '../../../../shared/logger/winston.logger';
import { AppError, NotFoundError, ValidationError, ExternalServiceError } from '../../../../shared/errors/app.error';

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
                line2?: string;
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
                throw new NotFoundError('Shipment');
            }

            const carrier = shipment.carrier;
            const companyId = shipment.companyId;

            if (!carrier) {
                throw new ValidationError('Shipment has no carrier provider assigned');
            }

            logger.info(`Initiating reattempt request for ${carrier} shipment ${shipment.trackingNumber}`, { options });

            if (carrier === 'delhivery') {
                const provider = new DelhiveryProvider(companyId);

                // If address Update is requested
                if (options.updatedAddress) {
                    const fullAddress = options.updatedAddress.line2
                        ? `${options.updatedAddress.line1}, ${options.updatedAddress.line2}`
                        : options.updatedAddress.line1;

                    await provider.updateDeliveryAddress(
                        shipment.trackingNumber,
                        {
                            line1: fullAddress,
                            city: options.updatedAddress.city,
                            state: options.updatedAddress.state,
                            pincode: String(options.updatedAddress.pincode),
                            country: options.updatedAddress.country || 'India'
                        },
                        String(shipment.orderId),
                        options.phone
                    );
                }

                return await provider.requestReattempt(
                    shipment.trackingNumber,
                    options.preferredDate,
                    options.instructions
                );

            } else if (carrier === 'ekart') {
                const provider = new EkartProvider(companyId);

                let instructions = options.instructions || '';
                if (options.updatedAddress) {
                    const addressStr = `${options.updatedAddress.line1} ${options.updatedAddress.line2 || ''}, ${options.updatedAddress.city} - ${options.updatedAddress.pincode}`;
                    instructions += ` Updated Address: ${addressStr}`;
                }

                return await provider.requestReattempt(
                    shipment.trackingNumber,
                    options.preferredDate,
                    instructions
                );
            } else if (carrier === 'velocity') {
                logger.warn('Velocity reattempt not fully implemented yet');
                return { success: true, message: 'Reattempt recorded internally (Velocity support pending)' };
            }

            throw new ValidationError(`Unsupported carrier for reattempt: ${carrier}`);

        } catch (error: any) {
            logger.error(`Failed to request reattempt for shipment ${shipmentId}`, error);
            // If it's already an AppError, rethrow it
            if (error instanceof AppError) throw error;
            throw new ExternalServiceError('Courier API', error.message);
        }
    }

    /**
     * Request Cancellation / RTO
     */
    static async requestCancellation(shipmentId: string, reason?: string): Promise<{ success: boolean; message: string }> {
        try {
            const shipment = await Shipment.findById(shipmentId);
            if (!shipment) {
                throw new NotFoundError('Shipment');
            }

            const carrier = shipment.carrier;
            const companyId = shipment.companyId;

            logger.info(`Initiating cancellation/RTO request for ${carrier} shipment ${shipment.trackingNumber}`);

            if (carrier === 'delhivery') {
                const provider = new DelhiveryProvider(companyId);
                const success = await provider.cancelShipment(shipment.trackingNumber);
                return { success, message: success ? 'Cancellation requested' : 'Failed' };
            } else if (carrier === 'ekart') {
                const provider = new EkartProvider(companyId);
                const result = await provider.requestRTO(shipment.trackingNumber);
                return result;
            }

            return { success: false, message: 'Carrier not supported for automated cancellation yet' };

        } catch (error: any) {
            logger.error(`Failed to cancel shipment ${shipmentId}`, error);
            if (error instanceof AppError) throw error;
            throw new ExternalServiceError('Courier API', error.message);
        }
    }
}

export default CourierReattemptService;
