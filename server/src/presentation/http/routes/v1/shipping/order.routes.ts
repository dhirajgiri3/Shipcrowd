import express from 'express';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess, requireCompleteCompany } from '../../../middleware/index';
import { AccessTier } from '../../../../../core/domain/types/access-tier';
import orderController from '../../../controllers/shipping/order.controller';
import shipmentController from '../../../controllers/shipping/shipment.controller';
import ratecardController from '../../../controllers/shipping/ratecard.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import multer from 'multer';
import { isFeatureEnabled } from '../../../middleware/system/feature-flag.middleware';
import QuoteEngineService from '../../../../../core/application/services/pricing/quote-engine.service';
import { sendSuccess } from '../../../../../shared/utils/responseHelper';
import {
    guardChecks,
    requireCompanyContext,
} from '../../../../../shared/helpers/controller.helpers';
import { AppError } from '../../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../../shared/errors/errorCodes';
import {
    QuoteOptionOutput,
    QuoteSessionOutput,
} from '../../../../../core/domain/types/service-level-pricing.types';

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

const normalizeLegacyRateRequestBody = (
    body: Record<string, unknown>,
    query: Record<string, unknown>
): Record<string, unknown> => {
    const merged: Record<string, unknown> = { ...body, ...query };

    if (!merged.originPincode && merged.fromPincode) {
        merged.originPincode = merged.fromPincode;
    }
    if (!merged.destinationPincode && merged.toPincode) {
        merged.destinationPincode = merged.toPincode;
    }

    if (typeof merged.weight === 'string') {
        merged.weight = parseNumericQuery(merged.weight, 0);
    }
    if (typeof merged.orderValue === 'string') {
        merged.orderValue = parseNumericQuery(merged.orderValue, 0);
    }

    const length = parseNumericQuery(merged.length, NaN);
    const width = parseNumericQuery(merged.width, NaN);
    const height = parseNumericQuery(merged.height, NaN);
    if (!merged.dimensions && Number.isFinite(length) && Number.isFinite(width) && Number.isFinite(height)) {
        merged.dimensions = { length, width, height };
    }

    if (typeof merged.paymentMode === 'string') {
        merged.paymentMode = merged.paymentMode.toLowerCase();
    }

    if (!merged.serviceType) {
        merged.serviceType = 'standard';
    }

    return merged;
};

const resolveLegacyServiceType = (serviceName: string): 'express' | 'standard' => {
    const normalized = String(serviceName || '').toLowerCase();
    if (normalized.includes('express') || normalized.includes('air')) {
        return 'express';
    }
    return 'standard';
};

const toLegacyRateRows = (quoteResult: QuoteSessionOutput) =>
    quoteResult.options.map((option: QuoteOptionOutput) => ({
        courierId: option.provider,
        courierName: option.serviceName,
        serviceType: resolveLegacyServiceType(option.serviceName),
        rate: option.quotedAmount,
        estimatedDeliveryDays: option.eta?.maxDays || 0,
        zone: option.zone,
        sessionId: quoteResult.sessionId,
        optionId: option.optionId,
        expiresAt: quoteResult.expiresAt,
        recommendation: quoteResult.recommendation,
        isRecommended: option.optionId === quoteResult.recommendation,
        confidence: option.confidence,
        tags: option.tags,
    }));

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
 * @desc Get courier rates (Adapter to RateCard Controller)
 * @access Private
 */
router.get(
    '/courier-rates',
    authenticate,
    async (req, res, next): Promise<void> => {
        const featureEnabled = await isFeatureEnabled(req, 'enable_service_level_pricing', false);

        if (featureEnabled) {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const paymentMode: 'cod' | 'prepaid' =
                String(req.query.paymentMode || 'Prepaid').toLowerCase() === 'cod' ? 'cod' : 'prepaid';

            const quoteInput = {
                companyId: auth.companyId,
                sellerId: auth.userId,
                fromPincode: String(req.query.fromPincode || ''),
                toPincode: String(req.query.toPincode || ''),
                weight: parseNumericQuery(req.query.weight, 0),
                dimensions: {
                    length: parseNumericQuery(req.query.length, 10),
                    width: parseNumericQuery(req.query.width, 10),
                    height: parseNumericQuery(req.query.height, 10),
                },
                paymentMode,
                orderValue: parseNumericQuery(req.query.orderValue, 0),
                shipmentType: 'forward' as const,
            };
            const quoteResult = await QuoteEngineService.generateQuotes(quoteInput);
            const legacy = toLegacyRateRows(quoteResult);

            sendSuccess(res, legacy, 'Courier rates fetched successfully');
            return;
        }

        // Legacy calculation fallback
        if (Object.keys(req.query).length > 0) {
            req.body = normalizeLegacyRateRequestBody(
                req.body as Record<string, unknown>,
                req.query as Record<string, unknown>
            );
        }
        await ratecardController.calculateRate(req, res, next);
    }
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
 * @desc Ship an order (Adapter to Shipment Controller)
 * @access Private (Production)
 */
router.post(
    '/:orderId/ship',
    authenticate,
    csrfProtection,
    requireAccess({ tier: AccessTier.PRODUCTION, kyc: true, roles: ['seller'], companyMatch: true }),
    async (req, res, next): Promise<void> => {
        const featureEnabled = await isFeatureEnabled(req, 'enable_service_level_pricing', false);
        req.body.orderId = req.params.orderId;

        if (featureEnabled && req.body.sessionId) {
            if (!req.body.optionId) {
                throw new AppError(
                    'optionId is required when booking from quote session',
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
            return;
        }

        await shipmentController.createShipment(req, res, next);
    }
);

export default router;
