import { NextFunction, Request, Response } from 'express';
import PincodeLookupService from '../../../../core/application/services/logistics/pincode-lookup.service';
import { ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

/**
 * Get Pincode Details
 * GET /api/v1/logistics/pincode/:pincode
 */
export const getPincodeDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { pincode } = req.params;

        // Validate format
        if (!PincodeLookupService.isValidPincodeFormat(pincode)) {
            throw new ValidationError('Invalid pincode format', ErrorCode.VAL_PINCODE_INVALID);
        }

        const details = PincodeLookupService.getPincodeDetails(pincode);

        if (!details) {
            throw new ValidationError('Pincode not found', ErrorCode.VAL_PINCODE_INVALID);
        }

        sendSuccess(res, details, 'Pincode details retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get All Pincodes (Paginated)
 * GET /api/v1/logistics/pincode/all?page=1&limit=100
 */
export const getAllPincodes = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000); // Max 1000 per page

        const allPincodes = PincodeLookupService.getAllPincodes();
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedResults = allPincodes.slice(startIndex, endIndex);

        sendSuccess(res, {
            pincodes: paginatedResults,
            pagination: {
                page,
                limit,
                total: allPincodes.length,
                totalPages: Math.ceil(allPincodes.length / limit)
            }
        }, 'Pincodes retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk Validate Pincodes
 * POST /api/v1/logistics/pincode/bulk-validate
 * Body: { pincodes: string[] }
 */
export const bulkValidatePincodes = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { pincodes } = req.body;

        if (!Array.isArray(pincodes) || pincodes.length === 0) {
            throw new ValidationError('Pincodes array is required', ErrorCode.VAL_INVALID_INPUT);
        }

        if (pincodes.length > 1000) {
            throw new ValidationError('Maximum 1000 pincodes allowed per request', ErrorCode.VAL_INVALID_INPUT);
        }

        const results = pincodes.map(pincode => {
            const isValidFormat = PincodeLookupService.isValidPincodeFormat(pincode);
            const details = isValidFormat ? PincodeLookupService.getPincodeDetails(pincode) : null;

            return {
                pincode,
                valid: !!details,
                details: details || null
            };
        });

        sendSuccess(res, { results }, 'Bulk validation completed');
    } catch (error) {
        next(error);
    }
};

/**
 * Search Pincodes by City/State
 * GET /api/v1/logistics/pincode/search?city=Mumbai&state=Maharashtra
 */
export const searchPincodes = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { city, state } = req.query;

        if (!city && !state) {
            throw new ValidationError('At least one search parameter (city or state) is required', ErrorCode.VAL_INVALID_INPUT);
        }

        const results = PincodeLookupService.searchPincodes({
            city: city as string,
            state: state as string
        });

        // Limit results to 500 for performance
        const limitedResults = results.slice(0, 500);

        sendSuccess(res, {
            results: limitedResults,
            total: results.length,
            limited: results.length > 500
        }, 'Search completed successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get Cache Statistics
 * GET /api/v1/logistics/pincode/stats
 */
export const getCacheStats = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const stats = PincodeLookupService.getStats();
        sendSuccess(res, stats, 'Cache statistics retrieved successfully');
    } catch (error) {
        next(error);
    }
};
