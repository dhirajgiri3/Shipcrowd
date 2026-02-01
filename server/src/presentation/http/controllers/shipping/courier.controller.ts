import { Request, Response } from 'express';
import { Courier } from '../../../../infrastructure/database/mongoose/models';
import asyncHandler from '../../../../shared/utils/asyncHandler';
import { NotFoundError } from '../../../../shared/errors/app.error';

export class CourierController {
    /**
     * Get all couriers
     * Replaces CarrierController.getCarriers
     */
    getCouriers = asyncHandler(async (req: Request, res: Response) => {
        // Fetch from database instead of static file
        const couriers = await Courier.find({ isActive: true });

        // Map to response format consistent with frontend expectations
        // (Similar to CarrierController but using DB fields)
        const data = couriers.map(courier => ({
            id: courier.name,
            name: courier.displayName,
            code: courier.name,
            logo: courier.logo || courier.name.substring(0, 2).toUpperCase(),
            status: courier.isApiIntegrated ? 'active' : 'inactive',
            services: courier.serviceTypes,
            zones: courier.regions,
            apiIntegrated: courier.isApiIntegrated,
            pickupEnabled: courier.pickupEnabled,
            codEnabled: courier.codEnabled,
            trackingEnabled: courier.trackingEnabled,
            // These might be missing if not in DB schema, fallbacks provided
            codLimit: 50000,
            weightLimit: 50
        }));

        res.status(200).json({
            success: true,
            data
        });
    });

    /**
     * Get single courier details
     * Replaces CarrierController.getCarrier
     */
    getCourier = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const courier = await Courier.findOne({ name: id });

        if (!courier) {
            throw new NotFoundError('Courier');
        }

        res.status(200).json({
            success: true,
            data: {
                id: courier.name,
                name: courier.displayName,
                code: courier.name,
                logo: courier.logo || courier.name.substring(0, 2).toUpperCase(),
                status: courier.isApiIntegrated ? 'active' : 'inactive',
                services: courier.serviceTypes,
                zones: courier.regions,
                apiIntegrated: courier.isApiIntegrated,
                pickupEnabled: courier.pickupEnabled,
                codEnabled: courier.codEnabled,
                trackingEnabled: courier.trackingEnabled,
                codLimit: 50000,
                weightLimit: 50
            }
        });
    });
}
