import { Request, Response, NextFunction } from 'express';
import AddressValidationService from '../../../../core/application/services/logistics/address-validation.service';
import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

/**
 * Validate Pincode
 * GET /api/v1/logistics/address/validate-pincode/:pincode
 */
export const validatePincode = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { pincode } = req.params;

        if (!pincode) {
            throw new AppError('Pincode is required', ErrorCode.VAL_MISSING_FIELD, 400);
        }

        const result = await AddressValidationService.validatePincode(pincode);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Check Serviceability
 * POST /api/v1/logistics/address/check-serviceability
 */
export const checkServiceability = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { fromPincode, toPincode, courierId } = req.body;

        if (!fromPincode || !toPincode || !courierId) {
            throw new AppError('From pincode, to pincode and courier ID are required', ErrorCode.VAL_MISSING_FIELD, 400);
        }

        const result = await AddressValidationService.checkServiceability(
            fromPincode,
            toPincode,
            courierId
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Calculate Distance
 * POST /api/v1/logistics/address/calculate-distance
 */
export const calculateDistance = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { fromPincode, toPincode } = req.body;

        if (!fromPincode || !toPincode) {
            throw new AppError('Both pincodes are required', ErrorCode.VAL_MISSING_FIELD, 400);
        }

        const result = await AddressValidationService.calculateDistance(
            fromPincode,
            toPincode
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
