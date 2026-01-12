import { Request, Response, NextFunction } from 'express';
import AddressValidationService from '../../../../core/application/services/logistics/address-validation.service';
import { AppError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import {
    validatePincodeSchema,
    checkServiceabilitySchema,
    calculateDistanceSchema
} from '../../../../shared/validation/schemas/address.schemas';

/**
 * Validate Pincode
 * GET /api/v1/logistics/address/validate-pincode/:pincode
 */
import { sendSuccess } from '../../../../shared/utils/responseHelper';

export const validatePincode = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const validation = validatePincodeSchema.safeParse(req);
        if (!validation.success) {
            throw new ValidationError('Invalid pincode', ErrorCode.VAL_PINCODE_INVALID);
        }

        const { pincode } = validation.data.params;

        const result = await AddressValidationService.validatePincode(pincode);

        sendSuccess(res, result, 'Pincode validated successfully');
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
        const validation = checkServiceabilitySchema.safeParse(req.body);
        if (!validation.success) {
            const details = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', details);
        }

        const { fromPincode, toPincode, courierId } = validation.data;

        const result = await AddressValidationService.checkServiceability(
            fromPincode,
            toPincode,
            courierId
        );

        sendSuccess(res, result, 'Serviceability checked successfully');
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
        const validation = calculateDistanceSchema.safeParse(req.body);
        if (!validation.success) {
            const details = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', details);
        }

        const { fromPincode, toPincode } = validation.data;

        const result = await AddressValidationService.calculateDistance(
            fromPincode,
            toPincode
        );

        sendSuccess(res, result, 'Distance calculated successfully');
    } catch (error) {
        next(error);
    }
};

