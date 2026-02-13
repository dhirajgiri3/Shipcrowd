import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { csrfProtection } from '../../../middleware/auth/csrf';
import { requireAccess, requireCompleteCompany } from '../../../middleware/index';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import orderController from '../../../controllers/shipping/order.controller';
import shipmentController from '../../../controllers/shipping/shipment.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import multer from 'multer';
import QuoteEngineService from '../../../../../core/application/services/pricing/quote-engine.service';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';
import {
    guardChecks,
    requireCompanyContext,
} from '../../../../../shared/helpers/controller.helpers';
import { AppError } from '../../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../../shared/errors/errorCodes';

const router = express.Router();

// Configure multer for CSV file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (_req, file, cb) => {
        // Accept only CSV files
        if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(null, false);
            return cb(new Error('Only CSV files are allowed'));
        }
    },
});

const parseNumericQuery = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const PINCODE_REGEX = /^\d{6}$/;
const COURIER_RATE_LIMITS = {
    minWeightKg: 0.001,
    maxWeightKg: 200,
    minDimensionCm: 1,
    maxDimensionCm: 300,
    minOrderValue: 0,
    maxOrderValue: 1_000_000,
};

const validatePincode = (field: 'fromPincode' | 'toPincode', value: string): void => {
    if (!PINCODE_REGEX.test(value)) {
        throw new AppError(
            `${field} must be a valid 6-digit pincode`,
            ErrorCode.VAL_INVALID_INPUT,
            422,
            true,
            { field, value }
        );
    }
};

const validateNumericRange = (
    field: string,
    value: number,
    min: number,
    max: number
): void => {
    if (!Number.isFinite(value) || value < min || value > max) {
        throw new AppError(
            `${field} must be between ${min} and ${max}`,
            ErrorCode.VAL_INVALID_INPUT,
            422,
            true,
            { field, min, max, value }
        );
    }
};

/**
 * @route POST /api/v1/orders
 * @desc Create a new order
 * @access Private (Production, Complete Profile)
 */
router.post(
    '/',
    authenticate,
    csrfProtection,
    requireCompleteCompany,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    asyncHandler(orderController.createOrder)
);

/**
 * @route GET /api/v1/orders
 * @desc Get all orders with pagination and filters
 * @access Private (Sandbox+)
 */
router.get(
    '/',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(orderController.getOrders)
);

/**
 * @route GET /api/v1/orders/courier-rates
 * @desc Get courier rates via quote engine (service-level only)
 * @access Private
 */
router.get(
    '/courier-rates',
    authenticate,
    asyncHandler(async (req, res): Promise<void> => {
        const auth = guardChecks(req);
        requireCompanyContext(auth);
        const paymentMode: 'cod' | 'prepaid' =
            String(req.query.paymentMode || 'Prepaid').toLowerCase() === 'cod' ? 'cod' : 'prepaid';
        const fromPincode = String(req.query.fromPincode || '').trim();
        const toPincode = String(req.query.toPincode || '').trim();
        const weight = parseNumericQuery(req.query.weight, 0);
        const length = parseNumericQuery(req.query.length, 10);
        const width = parseNumericQuery(req.query.width, 10);
        const height = parseNumericQuery(req.query.height, 10);
        const orderValue = parseNumericQuery(req.query.orderValue, 0);

        validatePincode('fromPincode', fromPincode);
        validatePincode('toPincode', toPincode);
        validateNumericRange(
            'weight',
            weight,
            COURIER_RATE_LIMITS.minWeightKg,
            COURIER_RATE_LIMITS.maxWeightKg
        );
        validateNumericRange(
            'length',
            length,
            COURIER_RATE_LIMITS.minDimensionCm,
            COURIER_RATE_LIMITS.maxDimensionCm
        );
        validateNumericRange(
            'width',
            width,
            COURIER_RATE_LIMITS.minDimensionCm,
            COURIER_RATE_LIMITS.maxDimensionCm
        );
        validateNumericRange(
            'height',
            height,
            COURIER_RATE_LIMITS.minDimensionCm,
            COURIER_RATE_LIMITS.maxDimensionCm
        );
        validateNumericRange(
            'orderValue',
            orderValue,
            COURIER_RATE_LIMITS.minOrderValue,
            COURIER_RATE_LIMITS.maxOrderValue
        );

        const quoteInput = {
            companyId: auth.companyId,
            sellerId: auth.userId,
            fromPincode,
            toPincode,
            weight,
            dimensions: {
                length,
                width,
                height,
            },
            paymentMode,
            orderValue,
            shipmentType: 'forward' as const,
        };
        const quoteResult = await QuoteEngineService.generateQuotes(quoteInput);
        sendSuccess(res, quoteResult, 'Courier rates fetched successfully');
    })
);

/**
 * @route GET /api/v1/orders/:orderId
 * @desc Get a single order by ID
 * @access Private (Sandbox+)
 */
router.get(
    '/:orderId',
    authenticate,
    requireAccess({ tier: AccessTier.SANDBOX }),
    asyncHandler(orderController.getOrderById)
);

/**
 * @route PATCH /api/v1/orders/:orderId
 * @desc Update an order
 * @access Private (Production)
 */
router.patch(
    '/:orderId',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    asyncHandler(orderController.updateOrder)
);

/**
 * @route DELETE /api/v1/orders/:orderId
 * @desc Soft delete an order
 * @access Private (Production)
 */
router.delete(
    '/:orderId',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'] }),
    asyncHandler(orderController.deleteOrder)
);

/**
 * @route POST /api/v1/orders/bulk
 * @desc Bulk import orders from CSV
 * @access Private (Production, Complete Profile)
 */
router.post(
    '/bulk',
    authenticate,
    csrfProtection,
    requireCompleteCompany,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    upload.single('file'),
    asyncHandler(orderController.bulkImportOrders)
);

/**
 * @route POST /api/v1/orders/:orderId/clone
 * @desc Clone an existing order with optional modifications
 * @access Private (Production)
 */
router.post(
    '/:orderId/clone',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    asyncHandler(orderController.cloneOrder)
);

/**
 * @route POST /api/v1/orders/:orderId/split
 * @desc Split a single order into multiple orders
 * @access Private (Production)
 */
router.post(
    '/:orderId/split',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    asyncHandler(orderController.splitOrder)
);

/**
 * @route POST /api/v1/orders/merge
 * @desc Merge multiple orders into a single order
 * @access Private (Production)
 */
router.post(
    '/merge',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    asyncHandler(orderController.mergeOrders)
);

/**
 * @route POST /api/v1/orders/:orderId/ship
 * @desc Ship an order from quote session (service-level only)
 * @access Private (Production)
 */
router.post(
    '/:orderId/ship',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    asyncHandler(async (req, res, next): Promise<void> => {
        if (!req.body.sessionId) {
            throw new AppError(
                'sessionId is required when booking shipment from quote session',
                ErrorCode.VAL_INVALID_INPUT,
                422
            );
        }
        if (!req.body.optionId) {
            throw new AppError(
                'optionId is required when booking shipment from quote session',
                ErrorCode.VAL_INVALID_INPUT,
                422
            );
        }
        req.body = {
            sessionId: req.body.sessionId,
            optionId: req.body.optionId,
            orderId: req.params.orderId,
            warehouseId: req.body.warehouseId,
            instructions: req.body.specialInstructions || req.body.instructions,
        };
        await shipmentController.bookFromQuote(req, res, next);
    })
);

export default router;
