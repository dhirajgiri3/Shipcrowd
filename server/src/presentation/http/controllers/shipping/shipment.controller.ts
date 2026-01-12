import { Response, NextFunction, Request } from 'express';
import { Shipment, Warehouse } from '../../../../infrastructure/database/mongoose/models';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import AddressValidationService from '../../../../core/application/services/logistics/address-validation.service'; // Import Service
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/audit-log.middleware';
import mongoose from 'mongoose';
import {
    guardChecks,
    validateObjectId,
    parsePagination,
} from '../../../../shared/helpers/controller.helpers';
import {
    createShipmentSchema,
    updateShipmentStatusSchema,
} from '../../../../shared/validation/schemas';
import {
    sendSuccess,
    sendError,
    sendValidationError,
    sendPaginated,
    sendCreated,
    calculatePagination
} from '../../../../shared/utils/responseHelper';
import { ShipmentService } from '../../../../core/application/services/shipping/shipment.service';
import { AuthenticationError, ValidationError, DatabaseError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

export const createShipment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const validation = createShipmentSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        const order = await Order.findOne({
            _id: validation.data.orderId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!order) {
            throw new ValidationError('Order not found', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        // Validate order status
        const orderValidation = ShipmentService.validateOrderForShipment(order);
        if (!orderValidation.canCreate) {
            sendError(res, orderValidation.reason!, 400, orderValidation.code!);
            return;
        }

        // Check for existing active shipment
        const hasActive = await ShipmentService.hasActiveShipment(order._id as mongoose.Types.ObjectId);
        if (hasActive) {
            sendError(res, 'An active shipment already exists for this order', 400, 'SHIPMENT_EXISTS');
            return;
        }

        // VALIDATE ADDRESSES (Phase 2 Requirement)
        // 1. Validate Delivery Address from Order
        if (order.customerInfo?.address?.postalCode) {
            const deliveryVal = await AddressValidationService.validatePincode(order.customerInfo.address.postalCode);
            if (!deliveryVal.valid) {
                sendValidationError(res, [{
                    code: 'VAL_PINCODE_INVALID',
                    message: 'Invalid delivery pincode in order details',
                    field: 'order.customerInfo.address.postalCode'
                }]);
                return;
            }
        }

        // 2. Validate Pickup Address from Warehouse
        if (order.warehouseId) {
            const warehouse = await Warehouse.findById(order.warehouseId);
            if (!warehouse) {
                // Should not happen if data integrity is maintained, but safety check
                throw new ValidationError('Warehouse associated with order not found', ErrorCode.RES_WAREHOUSE_NOT_FOUND);
            }

            if (warehouse.address?.postalCode) {
                const pickupVal = await AddressValidationService.validatePincode(warehouse.address.postalCode);
                if (!pickupVal.valid) {
                    sendValidationError(res, [{
                        code: 'VAL_PINCODE_INVALID',
                        message: 'Invalid pickup (warehouse) pincode',
                        field: 'warehouse.address.postalCode'
                    }]);
                    return;
                }
            }
        }

        // Create shipment via service
        const result = await ShipmentService.createShipment({
            order,
            companyId: new mongoose.Types.ObjectId(auth.companyId),
            userId: auth.userId,
            payload: validation.data
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
                sendError(res, 'Failed to generate unique tracking number', 500, 'TRACKING_NUMBER_GENERATION_FAILED');
                return;
            }
            if (error.message.includes('Order was updated by another process')) {
                sendError(res, error.message, 409, 'CONCURRENT_MODIFICATION');
                return;
            }
        }
        logger.error('Error creating shipment:', error);
        next(error);
    }
};

export const getShipments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, res, { requireCompany: false });
        if (!auth) return;

        if (!auth.companyId) {
            sendSuccess(res, {
                shipments: [],
                pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
                noCompany: true,
            }, 'Please complete company setup to view shipments.');
            return;
        }

        const { page, limit, skip } = parsePagination(req.query as Record<string, any>);

        const filter: Record<string, any> = { companyId: auth.companyId, isDeleted: false };

        if (req.query.status) filter.currentStatus = req.query.status;
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
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { shipmentId } = req.params;
        if (!validateObjectId(shipmentId, res, 'shipment')) return;

        const shipment = await Shipment.findOne({
            _id: shipmentId,
            companyId: auth.companyId,
            isDeleted: false,
        })
            .populate('orderId', 'orderNumber customerInfo products totals currentStatus')
            .populate('pickupDetails.warehouseId', 'name address contactInfo')
            .lean();

        if (!shipment) {
            throw new ValidationError('Shipment not found', ErrorCode.RES_SHIPMENT_NOT_FOUND);
        }

        sendSuccess(res, { shipment }, 'Shipment retrieved successfully');
    } catch (error) {
        logger.error('Error fetching shipment:', error);
        next(error);
    }
};

export const trackShipment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { trackingNumber } = req.params;

        const awbRegex = /^SHP-\d{8}-\d{4}$/;
        if (!awbRegex.test(trackingNumber)) {
            sendError(res, 'Invalid tracking number format. Expected: SHP-YYYYMMDD-XXXX', 400, 'INVALID_TRACKING_FORMAT');
            return;
        }

        const shipment = await Shipment.findOne({
            trackingNumber,
            companyId: auth.companyId,
            isDeleted: false,
        })
            .populate('orderId', 'orderNumber customerInfo')
            .select('trackingNumber carrier serviceType currentStatus statusHistory deliveryDetails estimatedDelivery actualDelivery')
            .lean();

        if (!shipment) {
            throw new ValidationError('Shipment not found', ErrorCode.RES_SHIPMENT_NOT_FOUND);
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
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { shipmentId } = req.params;
        if (!validateObjectId(shipmentId, res, 'shipment')) return;

        const validation = updateShipmentStatusSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map(err => ({
                code: 'VALIDATION_ERROR',
                message: err.message,
                field: err.path.join('.'),
            }));
            sendValidationError(res, errors);
            return;
        }

        const shipment = await Shipment.findOne({
            _id: shipmentId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!shipment) {
            throw new ValidationError('Shipment not found', ErrorCode.RES_SHIPMENT_NOT_FOUND);
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
                sendError(res, result.error!, 409, result.code);
            } else {
                sendError(res, result.error!, 400, result.code!);
            }
            return;
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
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { shipmentId } = req.params;
        if (!validateObjectId(shipmentId, res, 'shipment')) return;

        const shipment = await Shipment.findOne({
            _id: shipmentId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!shipment) {
            throw new ValidationError('Shipment not found', ErrorCode.RES_SHIPMENT_NOT_FOUND);
        }

        const { canDelete, reason } = ShipmentService.canDeleteShipment(shipment.currentStatus);
        if (!canDelete) {
            sendError(res, reason!, 400, 'CANNOT_DELETE_SHIPMENT');
            return;
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

        // Basic format validation
        const awbRegex = /^SHP-\d{8}-\d{4}$/;
        if (!awbRegex.test(trackingNumber)) {
            sendError(res, 'Invalid tracking number format. Expected: SHP-YYYYMMDD-XXXX', 400, 'INVALID_TRACKING_FORMAT');
            return;
        }

        const shipment = await Shipment.findOne({
            trackingNumber,
            isDeleted: false,
        })
            .populate('orderId', 'orderNumber')
            .select('trackingNumber carrier serviceType currentStatus statusHistory deliveryDetails estimatedDelivery actualDelivery createdAt')
            .lean();

        if (!shipment) {
            throw new ValidationError('Shipment not found', ErrorCode.RES_SHIPMENT_NOT_FOUND);
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

        sendSuccess(res, publicResponse, 'Shipment tracking information retrieved successfully');
    } catch (error) {
        logger.error('Error tracking shipment (public):', error);
        next(error);
    }
};

export default {
    createShipment,
    getShipments,
    getShipmentById,
    trackShipment,
    updateShipmentStatus,
    deleteShipment,
    trackShipmentPublic,
};
