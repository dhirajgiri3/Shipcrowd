import mongoose from 'mongoose';
import { ICourierAdapter } from './base/courier.adapter.js';
import { AppError } from '../../../shared/errors/app.error.js';
import logger from '../../../shared/logger/winston.logger.js';

/**
 * Courier Factory
 * 
 * Centralized factory for instantiating courier adapters.
 * Decouples business logic from specific courier implementations.
 */
export class CourierFactory {
    /**
     * Get a courier provider instance
     * 
     * @param companyId - The ID of the company making the request
     * @param carrierName - The standardized carrier name (e.g., 'velocity', 'delhivery')
     * @returns Promise<ICourierAdapter>
     * @throws AppError if courier is not supported
     */
    static async getProvider(companyId: string, carrierName: string): Promise<ICourierAdapter> {
        const normalizedCarrier = carrierName.toLowerCase().trim();

        try {
            switch (true) {
                // Velocity
                case normalizedCarrier.includes('velocity'):
                    const { VelocityShipfastProvider } = await import('./velocity/velocity-shipfast.provider.js');
                    return new VelocityShipfastProvider(new mongoose.Types.ObjectId(companyId));

                // Add future couriers here (e.g., Delhivery, Ekart, etc.)
                // case normalizedCarrier.includes('delhivery'):
                //    const { DelhiveryProvider } = await import('./delhivery/delhivery.provider.js');
                //    return new DelhiveryProvider(new mongoose.Types.ObjectId(companyId));

                default:
                    logger.warn(`Unsupported courier requested: ${carrierName}`, { companyId });
                    throw new AppError(
                        `Courier provider not supported: ${carrierName}`,
                        'COURIER_NOT_SUPPORTED',
                        400
                    );
            }
        } catch (error) {
            if (error instanceof AppError) throw error;

            logger.error('Failed to instantiate courier provider', {
                carrier: carrierName,
                companyId,
                error: error instanceof Error ? error.message : error
            });
            throw new AppError(
                `Failed to initialize courier provider: ${carrierName}`,
                'COURIER_INIT_FAILED',
                500
            );
        }
    }
}
