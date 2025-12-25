import { Response, NextFunction } from 'express';
import Shipment from '../../../../infrastructure/database/mongoose/models/Shipment';
import Order from '../../../../infrastructure/database/mongoose/models/Order';
import { AuthRequest } from '../../middleware/auth/auth';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/auditLog';
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

export const createShipment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
            sendError(res, 'Order not found', 404, 'ORDER_NOT_FOUND');
            return;
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

export const getShipments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

        const { page, limit, skip } = parsePagination(req.query as any);

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

export const getShipmentById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
            sendError(res, 'Shipment not found', 404, 'SHIPMENT_NOT_FOUND');
            return;
        }

        sendSuccess(res, { shipment }, 'Shipment retrieved successfully');
    } catch (error) {
        logger.error('Error fetching shipment:', error);
        next(error);
    }
};

export const trackShipment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
            sendError(res, 'Shipment not found', 404, 'SHIPMENT_NOT_FOUND');
            return;
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

export const updateShipmentStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
            sendError(res, 'Shipment not found', 404, 'SHIPMENT_NOT_FOUND');
            return;
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

export const deleteShipment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
            sendError(res, 'Shipment not found', 404, 'SHIPMENT_NOT_FOUND');
            return;
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

export default {
    createShipment,
    getShipments,
    getShipmentById,
    trackShipment,
    updateShipmentStatus,
    deleteShipment,
};
