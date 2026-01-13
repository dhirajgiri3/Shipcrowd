import { Request, Response, NextFunction } from 'express';
import VelocityProviderService from '../../../../infrastructure/external/couriers/velocity/velocity-provider.service';
import { ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Velocity Integration Controller
 * Direct API integration with Velocity Courier
 * 
 * Endpoints:
 * 1. POST /velocity/shipments - Create shipment
 * 2. GET /velocity/shipments/:awb/track - Track shipment
 * 3. POST /velocity/shipments/:awb/cancel - Cancel shipment
 * 4. POST /velocity/rates/calculate - Calculate rate
 */

class VelocityIntegrationController {
    /**
     * Create shipment with Velocity
     * POST /velocity/shipments
     */
    async createShipment(req: Request, res: Response, next: NextFunction) {
        try {
            const { pickup, delivery, shipment, orderNumber } = req.body;

            if (!pickup || !delivery || !shipment || !orderNumber) {
                throw new ValidationError('Missing required fields: pickup, delivery, shipment, orderNumber');
            }

            const result = await VelocityProviderService.createShipment({
                pickup,
                delivery,
                shipment,
                orderNumber,
            });

            logger.info(`Velocity shipment created for order ${orderNumber}: ${result.awb}`);

            res.status(201).json({
                success: true,
                message: 'Shipment created successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Track shipment
     * GET /velocity/shipments/:awb/track
     */
    async trackShipment(req: Request, res: Response, next: NextFunction) {
        try {
            const { awb } = req.params;

            const result = await VelocityProviderService.trackShipment(awb);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel shipment
     * POST /velocity/shipments/:awb/cancel
     */
    async cancelShipment(req: Request, res: Response, next: NextFunction) {
        try {
            const { awb } = req.params;
            const { reason } = req.body;

            if (!reason) {
                throw new ValidationError('Cancellation reason is required');
            }

            const result = await VelocityProviderService.cancelShipment(awb, reason);

            logger.info(`Velocity shipment cancelled: ${awb}`);

            res.status(200).json({
                success: true,
                message: 'Shipment cancelled successfully',
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Calculate shipping rate
     * POST /velocity/rates/calculate
     */
    async calculateRate(req: Request, res: Response, next: NextFunction) {
        try {
            const { fromPincode, toPincode, weight, codAmount, paymentMode = 'prepaid' } = req.body;

            if (!fromPincode || !toPincode || !weight) {
                throw new ValidationError('Missing required fields: fromPincode, toPincode, weight');
            }

            const result = await VelocityProviderService.calculateRate({
                fromPincode,
                toPincode,
                weight,
                codAmount,
                paymentMode,
            });

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new VelocityIntegrationController();
