import { Response, NextFunction, Request } from 'express';
import { Shipment, Warehouse } from '../../../../infrastructure/database/mongoose/models';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import AddressValidationService from '../../../../core/application/services/logistics/address-validation.service'; // Import Service
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import mongoose from 'mongoose';
import {
    guardChecks,
    requireCompanyContext,
    validateObjectId,
    parsePagination,
} from '../../../../shared/helpers/controller.helpers';
import {
    createShipmentSchema,
    bookFromQuoteSchema,
    updateShipmentStatusSchema,
    recommendCourierSchema
} from '../../../../shared/validation/schemas';
import SmartRateCalculator from '../../../../core/application/services/pricing/smart-rate-calculator.service';
import {
    sendSuccess,
    sendPaginated,
    sendCreated,
    calculatePagination
} from '../../../../shared/utils/responseHelper';
import { ShipmentService } from '../../../../core/application/services/shipping/shipment.service';
import CacheService from '../../../../infrastructure/utilities/cache.service';
import { AuthenticationError, ValidationError, DatabaseError, NotFoundError, ConflictError, AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import PricingOrchestratorService from '../../../../core/application/services/pricing/pricing-orchestrator.service';
import BookFromQuoteService from '../../../../core/application/services/shipping/book-from-quote.service';

export const createShipment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = createShipmentSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const order = await Order.findOne({
            _id: validation.data.orderId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!order) {
            throw new NotFoundError('Order', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        // Validate order status
        const orderValidation = ShipmentService.validateOrderForShipment(order);
        if (!orderValidation.canCreate) {
            throw new AppError(orderValidation.reason || 'Cannot create shipment', orderValidation.code!, 400);
        }

        // Check for existing active shipment
        const hasActive = await ShipmentService.hasActiveShipment(order._id as mongoose.Types.ObjectId);
        if (hasActive) {
            throw new ConflictError('An active shipment already exists for this order', ErrorCode.BIZ_SHIPMENT_EXISTS);
        }

        // RISK GUARD CHECK (Phase 2)
        const RiskGuardServiceClass = (await import('../../../../core/application/services/risk/risk-guard.service.js') as any).default;
        const riskGuard = new RiskGuardServiceClass();

        const riskResult = await riskGuard.evaluateOrder({
            companyId: auth.companyId,
            customerPhone: order.customerInfo.phone,
            customerEmail: order.customerInfo.email,
            destinationPincode: order.customerInfo.address.postalCode,
            paymentMode: order.paymentMethod === 'cod' ? 'cod' : 'prepaid',
            orderValue: order.totals.total
        });

        if (riskResult.status === 'BLOCKED') {
            throw new AppError(
                `Order Blocked by Risk Guard: ${riskResult.reasons.join(', ')}`,
                ErrorCode.BIZ_RISK_CHECK_FAILED, // Assuming this code exists or will map to 400
                400
            );
        }

        // VALIDATE ADDRESSES (Phase 2 Requirement)
        // 1. Validate Delivery Address from Order
        if (order.customerInfo?.address?.postalCode) {
            const deliveryVal = await AddressValidationService.validatePincode(order.customerInfo.address.postalCode);
            if (!deliveryVal.valid) {
                throw new ValidationError('Invalid delivery pincode in order details', [{
                    field: 'order.customerInfo.address.postalCode',
                    message: 'Invalid delivery pincode in order details'
                }]);
            }
        }

        // 2. Validate Pickup Address from Warehouse
        if (order.warehouseId) {
            const warehouse = await Warehouse.findById(order.warehouseId);
            if (!warehouse) {
                // Should not happen if data integrity is maintained, but safety check
                throw new NotFoundError('Warehouse associated with order', ErrorCode.RES_WAREHOUSE_NOT_FOUND);
            }

            if (warehouse.address?.postalCode) {
                const pickupVal = await AddressValidationService.validatePincode(warehouse.address.postalCode);
                if (!pickupVal.valid) {
                    throw new ValidationError('Invalid pickup (warehouse) pincode', [{
                        field: 'warehouse.address.postalCode',
                        message: 'Invalid pickup (warehouse) pincode'
                    }]);
                }
            }
        }

        // Calculate pricing
        // Determine Warehouse Pincode (Origin)
        let fromPincode = '110001'; // Default
        const effectiveWarehouseId = validation.data.warehouseId || order.warehouseId;

        if (effectiveWarehouseId) {
            const wh = await Warehouse.findById(effectiveWarehouseId);
            if (wh?.address?.postalCode) {
                fromPincode = wh.address.postalCode;
            }
        }

        const toPincode = order.customerInfo.address.postalCode;

        // Calculate weight from order products (matching Service logic)
        const totalWeight = order.products.reduce((sum: number, p: any) => sum + (p.weight || 0.5) * p.quantity, 0);

        const pricingDetails = await PricingOrchestratorService.calculateShipmentPricing({
            companyId: auth.companyId,
            fromPincode,
            toPincode,
            weight: totalWeight,
            dimensions: { length: 20, width: 15, height: 10 }, // Default dimensions matching Service
            paymentMode: order.paymentMethod === 'cod' ? 'cod' : 'prepaid',
            orderValue: order.totals.total,
            carrier: validation.data.carrierOverride,
            serviceType: validation.data.serviceType,
            // customerId: order.customerId?.toString() // Order model does not have customerId, skipping overrides for now
        });

        // Create shipment via service
        const result = await ShipmentService.createShipment({
            order,
            companyId: new mongoose.Types.ObjectId(auth.companyId),
            userId: auth.userId,
            payload: validation.data,
            pricingDetails // Pass calculated pricing
        });

        await createAuditLog(auth.userId, auth.companyId, 'create', 'shipment', String(result.shipment._id), {
            trackingNumber: result.shipment.trackingNumber,
            carrier: result.carrierSelection.selectedCarrier
        }, req);

        sendCreated(res, {
            shipment: result.shipment,
            carrierSelection: result.carrierSelection,
        }, 'Shipment created successfully');
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Failed to generate unique tracking number') {
                throw new DatabaseError('Failed to generate unique tracking number');
            }
            if (error.message.includes('Order was updated by another process')) {
                throw new ConflictError(error.message, ErrorCode.BIZ_CONCURRENT_MODIFICATION);
            }
        }
        logger.error('Error creating shipment:', error);
        next(error);
    }
};

export const bookFromQuote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = bookFromQuoteSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const result = await BookFromQuoteService.execute({
            companyId: auth.companyId,
            sellerId: auth.userId,
            userId: auth.userId,
            sessionId: validation.data.sessionId,
            optionId: validation.data.optionId,
            orderId: validation.data.orderId,
            warehouseId: validation.data.warehouseId,
            instructions: validation.data.instructions,
        });

        sendCreated(res, result, 'Shipment booked from quote successfully');
    } catch (error) {
        logger.error('Error booking shipment from quote:', error);
        next(error);
    }
};

export const getShipments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        // Seller/Staff must have company context
        if (!auth.isAdmin && !auth.companyId) {
            sendSuccess(res, {
                shipments: [],
                pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
                noCompany: true,
            }, 'Please complete company setup to view shipments.');
            return;
        }

        const { page, limit, skip } = parsePagination(req.query as Record<string, any>);

        // Admins see all, Sellers see their own
        const filter: Record<string, any> = { isDeleted: false };
        if (!auth.isAdmin) {
            filter.companyId = auth.companyId;
        }

        if (req.query.status) {
            const status = req.query.status as string;
            if (status === 'pending') {
                filter.currentStatus = { $in: ['created', 'ready_to_ship'] };
            } else if (status === 'in_transit') {
                filter.currentStatus = { $in: ['picked', 'picked_up', 'in_transit', 'out_for_delivery'] };
            } else if (status === 'rto') {
                filter.currentStatus = { $in: ['rto', 'returned', 'rto_delivered', 'return_initiated'] };
            } else if (status === 'delivered') {
                filter.currentStatus = 'delivered';
            } else if (status === 'ndr') {
                filter.currentStatus = 'ndr';
            } else {
                filter.currentStatus = status;
            }
        }

        if (req.query.carrier) filter.carrier = { $regex: req.query.carrier, $options: 'i' };
        if (req.query.pincode) filter['deliveryDetails.address.postalCode'] = req.query.pincode;

        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate as string);
            if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate as string);
        }

        if (req.query.search) {
            const searchRegex = { $regex: req.query.search, $options: 'i' };
            filter.$or = [
                { trackingNumber: searchRegex },
                { 'deliveryDetails.recipientName': searchRegex },
                { 'deliveryDetails.recipientPhone': searchRegex },
                { 'carrierDetails.carrierTrackingNumber': searchRegex }
            ];
        }

        const [shipments, total] = await Promise.all([
            Shipment.find(filter)
                .populate('orderId', 'orderNumber customerInfo totals')
                .populate('pickupDetails.warehouseId', 'name address')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Shipment.countDocuments(filter),
        ]);

        const pagination = calculatePagination(total, page, limit);
        sendPaginated(res, shipments, pagination, 'Shipments retrieved successfully');
    } catch (error) {
        logger.error('Error fetching shipments:', error);
        next(error);
    }
};

export const getShipmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { shipmentId } = req.params;
        validateObjectId(shipmentId, 'shipment');

        const shipment = await Shipment.findOne({
            _id: shipmentId,
            companyId: auth.companyId,
            isDeleted: false,
        })
            .populate('orderId', 'orderNumber customerInfo products totals currentStatus')
            .populate('pickupDetails.warehouseId', 'name address contactInfo')
            .lean();

        if (!shipment) {
            throw new NotFoundError('Shipment', ErrorCode.RES_SHIPMENT_NOT_FOUND);
        }

        sendSuccess(res, { shipment }, 'Shipment retrieved successfully');
    } catch (error) {
        logger.error('Error fetching shipment:', error);
        next(error);
    }
};

export const trackShipment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { trackingNumber } = req.params;

        // Allow searching by either Internal ID or Carrier AWB
        // We removed the strict regex check to accommodate diverse carrier AWB formats
        const shipment = await Shipment.findOne({
            $or: [
                { trackingNumber: trackingNumber },
                { 'carrierDetails.carrierTrackingNumber': trackingNumber }
            ],
            companyId: auth.companyId,
            isDeleted: false,
        })
            .populate('orderId', 'orderNumber customerInfo')
            .select('trackingNumber carrier serviceType currentStatus statusHistory deliveryDetails estimatedDelivery actualDelivery')
            .lean();

        if (!shipment) {
            throw new NotFoundError('Shipment', ErrorCode.RES_SHIPMENT_NOT_FOUND);
        }

        const timeline = ShipmentService.formatTrackingTimeline(shipment.statusHistory);

        sendSuccess(res, {
            trackingNumber: shipment.trackingNumber,
            carrier: shipment.carrier,
            serviceType: shipment.serviceType,
            currentStatus: shipment.currentStatus,
            estimatedDelivery: shipment.estimatedDelivery,
            actualDelivery: shipment.actualDelivery,
            recipient: {
                name: shipment.deliveryDetails.recipientName,
                city: shipment.deliveryDetails.address.city,
                state: shipment.deliveryDetails.address.state,
            },
            timeline,
        }, 'Shipment tracking retrieved successfully');
    } catch (error) {
        logger.error('Error tracking shipment:', error);
        next(error);
    }
};

export const updateShipmentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { shipmentId } = req.params;
        validateObjectId(shipmentId, 'shipment');

        const validation = updateShipmentStatusSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const shipment = await Shipment.findOne({
            _id: shipmentId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!shipment) {
            throw new NotFoundError('Shipment', ErrorCode.RES_SHIPMENT_NOT_FOUND);
        }

        // Update shipment status via service
        const result = await ShipmentService.updateShipmentStatus({
            shipmentId,
            currentStatus: shipment.currentStatus,
            newStatus: validation.data.status,
            currentVersion: shipment.__v,
            userId: auth.userId,
            location: validation.data.location,
            description: validation.data.description
        });

        if (!result.success) {
            if (result.code === 'CONCURRENT_MODIFICATION') {
                throw new ConflictError(result.error || 'Concurrent modification detected', ErrorCode.BIZ_CONCURRENT_MODIFICATION);
            } else {
                throw new AppError(result.error || 'Update failed', result.code!, 400);
            }
        }

        // Update related order status
        await ShipmentService.updateRelatedOrderStatus(result.shipment, auth.userId);

        await createAuditLog(auth.userId, auth.companyId, 'update', 'shipment', shipmentId, { newStatus: validation.data.status }, req);

        sendSuccess(res, { shipment: result.shipment }, 'Shipment status updated successfully');
    } catch (error) {
        logger.error('Error updating shipment status:', error);
        next(error);
    }
};

export const deleteShipment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { shipmentId } = req.params;
        validateObjectId(shipmentId, 'shipment');

        const shipment = await Shipment.findOne({
            _id: shipmentId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!shipment) {
            throw new NotFoundError('Shipment', ErrorCode.RES_SHIPMENT_NOT_FOUND);
        }

        const { canDelete, reason } = ShipmentService.canDeleteShipment(shipment.currentStatus);
        if (!canDelete) {
            throw new AppError(reason || 'Cannot delete shipment', 'CANNOT_DELETE_SHIPMENT', 400);
        }

        shipment.isDeleted = true;
        await shipment.save();
        await createAuditLog(auth.userId, auth.companyId, 'delete', 'shipment', shipmentId, { softDelete: true }, req);

        sendSuccess(res, null, 'Shipment deleted successfully');
    } catch (error) {
        logger.error('Error deleting shipment:', error);
        next(error);
    }
};

export const trackShipmentPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { trackingNumber } = req.params;

        // 1. INPUT VALIDATION: Prevent Parameter DoS
        if (trackingNumber.length > 50) {
            throw new AppError('Invalid tracking number length', 'INVALID_TRACKING_FORMAT', 400);
        }

        // 2. CACHING: Check Redis first
        // Key: tracking:public:{trackingNumber}
        const cacheKey = `tracking:public:${trackingNumber}`;
        const cachedResponse = await CacheService.get(cacheKey);

        if (cachedResponse) {
            sendSuccess(res, cachedResponse, 'Shipment tracking information retrieved successfully (from cache)');
            return;
        }

        // Allow searching by either Internal ID or Carrier AWB
        // We removed the strict regex check to accommodate diverse carrier AWB formats
        const shipment = await Shipment.findOne({
            $or: [
                { trackingNumber: trackingNumber },
                { 'carrierDetails.carrierTrackingNumber': trackingNumber }
            ],
            isDeleted: false,
        })
            .populate('orderId', 'orderNumber')
            .select('trackingNumber carrier serviceType currentStatus statusHistory deliveryDetails estimatedDelivery actualDelivery createdAt')
            .lean();

        if (!shipment) {
            throw new NotFoundError('Shipment', ErrorCode.RES_SHIPMENT_NOT_FOUND);
        }

        const timeline = ShipmentService.formatTrackingTimeline(shipment.statusHistory);

        // Sanitize sensitive info for public view logic
        const publicResponse = {
            trackingNumber: shipment.trackingNumber,
            carrier: shipment.carrier,
            serviceType: shipment.serviceType,
            currentStatus: shipment.currentStatus,
            estimatedDelivery: shipment.estimatedDelivery,
            actualDelivery: shipment.actualDelivery,
            createdAt: shipment.createdAt,
            recipient: {
                // Only show City/State for privacy in public tracking
                city: shipment.deliveryDetails.address.city,
                state: shipment.deliveryDetails.address.state,
            },
            timeline,
        };

        // 3. CACHE SET: Store result for 5 minutes (300 seconds)
        await CacheService.set(cacheKey, publicResponse, 300);

        sendSuccess(res, publicResponse, 'Shipment tracking information retrieved successfully');
    } catch (error) {
        logger.error('Error tracking shipment (public):', error);
        next(error);
    }
};

export const recommendCourier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = recommendCourierSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const { pickupPincode, deliveryPincode, weight, declaredValue, paymentMode } = validation.data;

        const recommendations = await SmartRateCalculator.calculateSmartRates({
            companyId: auth.companyId,
            originPincode: pickupPincode,
            destinationPincode: deliveryPincode,
            weight: weight,
            paymentMode: paymentMode,
            orderValue: declaredValue || 0
        });

        sendSuccess(res, { recommendations: recommendations.rates }, 'Courier recommendations retrieved');
    } catch (error) {
        logger.error('Error getting recommendations:', error);
        next(error);
    }
};

export const getShipmentStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });

        if (!auth.isAdmin && !auth.companyId) {
            sendSuccess(res, {
                total: 0,
                pending: 0,
                in_transit: 0,
                delivered: 0,
                ndr: 0,
                rto: 0,
            }, 'No company context');
            return;
        }

        // Define match phase based on role
        const matchStage: Record<string, any> = { isDeleted: false };
        if (!auth.isAdmin) {
            matchStage.companyId = new mongoose.Types.ObjectId(auth.companyId);
        }

        const stats = await Shipment.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$currentStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statusCounts: Record<string, number> = {};
        let total = 0;

        stats.forEach(stat => {
            const status = stat._id || 'unknown';
            statusCounts[status] = stat.count;
            total += stat.count;
        });

        const response = {
            total,
            pending: (statusCounts['created'] || 0) + (statusCounts['ready_to_ship'] || 0),
            in_transit: (statusCounts['picked'] || 0) + (statusCounts['picked_up'] || 0) + (statusCounts['in_transit'] || 0) + (statusCounts['out_for_delivery'] || 0),
            delivered: statusCounts['delivered'] || 0,
            ndr: statusCounts['ndr'] || 0,
            rto: (statusCounts['rto'] || 0) + (statusCounts['returned'] || 0) + (statusCounts['rto_delivered'] || 0) + (statusCounts['return_initiated'] || 0),
        };

        sendSuccess(res, response, 'Shipment stats retrieved successfully');
    } catch (error) {
        logger.error('Error fetching shipment stats:', error);
        next(error);
    }
};

export default {
    createShipment,
    bookFromQuote,
    getShipments,
    getShipmentById,
    trackShipment,
    updateShipmentStatus,
    deleteShipment,
    trackShipmentPublic,
    recommendCourier,
    getShipmentStats
};
