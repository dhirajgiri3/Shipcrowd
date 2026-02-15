import { NextFunction, Request, Response } from 'express';
import AddressValidationService from '../../../../core/application/services/logistics/address-validation.service';
import PincodeLookupService from '../../../../core/application/services/logistics/pincode-lookup.service';
import { ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import {
calculateDistanceSchema,
checkServiceabilitySchema,
validatePincodeSchema
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

/**
 * Get Address Suggestions for Autocomplete
 * GET /api/v1/logistics/address/suggestions?q=query
 */
export const getAddressSuggestions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { q } = req.query;

        if (!q || typeof q !== 'string') {
            throw new ValidationError(
                'Query parameter "q" is required',
                ErrorCode.VAL_INVALID_INPUT
            );
        }

        if (q.length < 1) {
            sendSuccess(res, [], 'Address suggestions retrieved');
            return;
        }

        const suggestions = PincodeLookupService.searchAddressSuggestions(q);

        sendSuccess(res, suggestions, 'Address suggestions retrieved');
    } catch (error) {
        next(error);
    }
}
/**
 * Get Pincode Info (City/State lookup)
 * GET /api/v1/serviceability/pincode/:pincode/info
 */
export const getPincodeInfo = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { pincode } = req.params;

        // Validate format
        if (!PincodeLookupService.isValidPincodeFormat(pincode)) {
            throw new ValidationError('Invalid pincode format', ErrorCode.VAL_PINCODE_INVALID);
        }

        const details = PincodeLookupService.getPincodeDetails(pincode);

        if (!details) {
            res.status(404).json({
                success: false,
                message: 'Pincode not found',
                code: 'PINCODE_NOT_FOUND'
            });
            return;
        }

        // details is an array, return the first match
        const detailsArray = Array.isArray(details) ? details : [details];

        if (detailsArray.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Pincode not found',
                code: 'PINCODE_NOT_FOUND'
            });
            return;
        }

        const info = {
            pincode: detailsArray[0].pincode,
            city: detailsArray[0].city,
            state: detailsArray[0].state,
            // Include all matches if there are multiple cities for same pincode
            alternatives: detailsArray.length > 1 ? detailsArray.map(d => ({
                city: d.city,
                state: d.state
            })) : undefined
        };

        sendSuccess(res, info, 'Pincode information retrieved successfully');
    } catch (error) {
        next(error);
    }
};

