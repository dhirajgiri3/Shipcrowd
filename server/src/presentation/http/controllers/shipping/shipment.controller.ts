import { Response, NextFunction } from 'express';
import { z } from 'zod';
import Shipment from '../../../../infrastructure/database/mongoose/models/Shipment';
import Order from '../../../../infrastructure/database/mongoose/models/Order';
import Warehouse from '../../../../infrastructure/database/mongoose/models/Warehouse';
import { AuthRequest } from '../../middleware/auth/auth';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../middleware/system/auditLog';
import mongoose from 'mongoose';
import { selectBestCarrier, CarrierSelectionResult } from '../../../../core/application/services/shipping/carrier.service';
import {
    guardChecks,
    validateObjectId,
    parsePagination,
    generateTrackingNumber,
    validateStatusTransition,
} from '../../../../shared/helpers/controller.helpers';
import {
    createShipmentSchema,
    updateShipmentStatusSchema,
    SHIPMENT_STATUS_TRANSITIONS,
} from '../../../../shared/validation/schemas';
import {
    sendSuccess,
    sendError,
    sendValidationError,
    sendPaginated,
    sendCreated,
    calculatePagination
} from '../../../../shared/utils/responseHelper';

const getUniqueTrackingNumber = async (maxAttempts = 10): Promise<string | null> => {
    for (let i = 0; i < maxAttempts; i++) {
        const trackingNumber = generateTrackingNumber();
        const exists = await Shipment.exists({ trackingNumber });
        if (!exists) return trackingNumber;
    }
    return null;
};

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

        if (!['pending', 'ready_to_ship'].includes(order.currentStatus)) {
            sendError(res, `Cannot create shipment for order with status '${order.currentStatus}'`, 400, 'INVALID_ORDER_STATUS');
            return;
        }

        const existingShipment = await Shipment.findOne({
            orderId: order._id,
            isDeleted: false,
            currentStatus: { $nin: ['cancelled', 'rto'] },
        }).lean();

        if (existingShipment) {
            sendError(res, 'An active shipment already exists for this order', 400, 'SHIPMENT_EXISTS');
            return;
        }

        const warehouseId = validation.data.warehouseId || order.warehouseId;
        let originPincode = '110001';

        if (warehouseId) {
            const warehouse = await Warehouse.findOne({
                _id: warehouseId,
                companyId: auth.companyId,
                isDeleted: false,
            }).lean();
            if (warehouse?.address?.postalCode) {
                originPincode = warehouse.address.postalCode;
            }
        }

        const totalWeight = order.products.reduce((sum, p) => sum + (p.weight || 0.5) * p.quantity, 0);

        const serviceType = validation.data.serviceType as 'express' | 'standard';
        const carrierResult: CarrierSelectionResult = selectBestCarrier(
            totalWeight,
            originPincode,
            order.customerInfo.address.postalCode,
            serviceType
        );

        const selectedCarrier = validation.data.carrierOverride || carrierResult.selectedCarrier;
        const selectedOption = carrierResult.alternativeOptions.find(
            (opt: any) => opt.carrier.toLowerCase() === selectedCarrier.toLowerCase()
        ) || carrierResult.alternativeOptions[0];

        const trackingNumber = await getUniqueTrackingNumber();
        if (!trackingNumber) {
            sendError(res, 'Failed to generate unique tracking number', 500, 'TRACKING_NUMBER_GENERATION_FAILED');
            return;
        }

        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + selectedOption.deliveryTime);

        const shipment = new Shipment({
            trackingNumber,
            orderId: order._id,
            companyId: auth.companyId,
            carrier: selectedOption.carrier,
            serviceType,
            packageDetails: {
                weight: totalWeight,
                dimensions: { length: 20, width: 15, height: 10 },
                packageCount: 1,
                packageType: 'box',
                declaredValue: order.totals.total,
            },
            pickupDetails: warehouseId ? { warehouseId } : undefined,
            deliveryDetails: {
                recipientName: order.customerInfo.name,
                recipientPhone: order.customerInfo.phone,
                recipientEmail: order.customerInfo.email,
                address: order.customerInfo.address,
                instructions: validation.data.instructions,
            },
            paymentDetails: {
                type: order.paymentMethod || 'prepaid',
                codAmount: order.paymentMethod === 'cod' ? order.totals.total : undefined,
                shippingCost: selectedOption.rate,
                currency: 'INR',
            },
            currentStatus: 'created',
            estimatedDelivery,
        });

        await shipment.save();

        order.currentStatus = 'shipped';
        order.statusHistory.push({
            status: 'shipped',
            timestamp: new Date(),
            comment: `Shipment created via ${selectedOption.carrier}`,
            updatedBy: new mongoose.Types.ObjectId(auth.userId),
        });
        order.shippingDetails = {
            provider: selectedOption.carrier,
            method: serviceType,
            trackingNumber,
            estimatedDelivery,
            shippingCost: selectedOption.rate,
        };
        order.totals.shipping = selectedOption.rate;
        order.totals.total = order.totals.subtotal + order.totals.shipping + order.totals.tax - order.totals.discount;
        await order.save();

        await createAuditLog(auth.userId, auth.companyId, 'create', 'shipment', String(shipment._id), { trackingNumber, carrier: selectedOption.carrier }, req);

        sendCreated(res, {
            shipment,
            carrierSelection: {
                selectedCarrier: selectedOption.carrier,
                selectedRate: selectedOption.rate,
                selectedDeliveryTime: selectedOption.deliveryTime,
                alternativeOptions: carrierResult.alternativeOptions,
            },
        }, 'Shipment created successfully');
    } catch (error) {
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

        const timeline = [...shipment.statusHistory].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

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

        const { valid, allowedTransitions } = validateStatusTransition(
            shipment.currentStatus,
            validation.data.status,
            SHIPMENT_STATUS_TRANSITIONS
        );

        if (!valid) {
            sendError(res, `Invalid status transition from '${shipment.currentStatus}' to '${validation.data.status}'`, 400, 'INVALID_STATUS_TRANSITION');
            return;
        }

        shipment.statusHistory.push({
            status: validation.data.status,
            timestamp: new Date(),
            location: validation.data.location,
            description: validation.data.description,
            updatedBy: new mongoose.Types.ObjectId(auth.userId),
        });
        shipment.currentStatus = validation.data.status;

        if (validation.data.status === 'delivered') {
            shipment.actualDelivery = new Date();
            await Order.findByIdAndUpdate(shipment.orderId, {
                currentStatus: 'delivered',
                $push: {
                    statusHistory: {
                        status: 'delivered',
                        timestamp: new Date(),
                        comment: `Delivered via ${shipment.carrier}`,
                        updatedBy: new mongoose.Types.ObjectId(auth.userId),
                    },
                },
            });
        } else if (validation.data.status === 'rto') {
            await Order.findByIdAndUpdate(shipment.orderId, {
                currentStatus: 'rto',
                $push: {
                    statusHistory: {
                        status: 'rto',
                        timestamp: new Date(),
                        comment: 'Return to origin initiated',
                        updatedBy: new mongoose.Types.ObjectId(auth.userId),
                    },
                },
            });
        } else if (validation.data.status === 'ndr') {
            shipment.ndrDetails = {
                ndrDate: new Date(),
                ndrStatus: 'pending',
                ndrAttempts: (shipment.ndrDetails?.ndrAttempts || 0) + 1,
                ndrReason: validation.data.description,
            };
        }

        await shipment.save();
        await createAuditLog(auth.userId, auth.companyId, 'update', 'shipment', shipmentId, { newStatus: validation.data.status }, req);

        sendSuccess(res, { shipment }, 'Shipment status updated successfully');
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

        const nonDeletableStatuses = ['in_transit', 'out_for_delivery', 'delivered'];
        if (nonDeletableStatuses.includes(shipment.currentStatus)) {
            sendError(res, `Cannot delete shipment with status '${shipment.currentStatus}'`, 400, 'CANNOT_DELETE_SHIPMENT');
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
