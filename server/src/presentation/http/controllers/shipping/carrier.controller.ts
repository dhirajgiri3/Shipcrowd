import { Request, Response } from 'express';
import { CARRIERS } from '../../../../infrastructure/database/seeders/data/carrier-data';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
import { AppError as ApiError, NotFoundError } from '../../../../shared/errors/app.error';

export class CarrierController {
    /**
     * Get all configured carriers (from static config)
     */
    getCarriers = asyncHandler(async (req: Request, res: Response) => {
        // Convert the record object to an array of carrier objects
        const carriersList = Object.values(CARRIERS).map(carrier => ({
            id: carrier.name, // Use name as ID for now
            name: carrier.displayName,
            code: carrier.name,
            logo: carrier.trackingPrefix.substring(0, 2), // Placeholder logic for logo
            status: 'active', // Default to active as they are in the system
            services: carrier.serviceTypes,
            zones: ['Pan India'], // Default
            apiIntegrated: true, // They have adapters
            pickupEnabled: true,
            codEnabled: true,
            trackingEnabled: true,
            codLimit: carrier.codLimit,
            weightLimit: carrier.weightLimit
        }));

        res.status(200).json({
            success: true,
            data: carriersList
        });
    });

    /**
     * Get carrier details by ID (name)
     */
    getCarrier = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const carrier = Object.values(CARRIERS).find(c => c.name === id);

        if (!carrier) {
            throw new NotFoundError('Carrier');
        }

        res.status(200).json({
            success: true,
            data: {
                id: carrier.name,
                name: carrier.displayName,
                code: carrier.name,
                logo: carrier.trackingPrefix.substring(0, 2),
                status: 'active',
                services: carrier.serviceTypes,
                zones: ['Pan India'],
                apiIntegrated: true,
                pickupEnabled: true,
                codEnabled: true,
                trackingEnabled: true,
                codLimit: carrier.codLimit,
                weightLimit: carrier.weightLimit
            }
        });
    });
}
