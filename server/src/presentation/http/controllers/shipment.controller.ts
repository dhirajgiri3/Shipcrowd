import { Response, NextFunction } from 'express';
import { z } from 'zod';
import Shipment from '../../../infrastructure/database/mongoose/models/Shipment';
import Order from '../../../infrastructure/database/mongoose/models/Order';
import Warehouse from '../../../infrastructure/database/mongoose/models/Warehouse';
import { AuthRequest } from '../middleware/auth';
import logger from '../../../shared/logger/winston.logger';
import { createAuditLog } from '../middleware/auditLog';
import mongoose from 'mongoose';
import { selectBestCarrier, CarrierSelectionResult } from '../../../lib/carrier-selection';
import {
    guardChecks,
    validateObjectId,
    parsePagination,
    buildPaginationResponse,
    generateTrackingNumber,
    validateStatusTransition,
} from '../../../shared/helpers/controller.helpers';
import {
    createShipmentSchema,
    updateShipmentStatusSchema,
    SHIPMENT_STATUS_TRANSITIONS,
} from '../../../shared/validation/schemas';

/**
 * Generate unique tracking number with collision retry
 */
const getUniqueTrackingNumber = async (maxAttempts = 10): Promise<string | null> => {
    for (let i = 0; i < maxAttempts; i++) {
        const trackingNumber = generateTrackingNumber();
        const exists = await Shipment.exists({ trackingNumber });
        if (!exists) return trackingNumber;
    }
    return null;
};

/**
 * Create a new shipment from an order
 * @route POST /api/v1/shipments
 */
export const createShipment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const data = createShipmentSchema.parse(req.body);

        // Get the order
        const order = await Order.findOne({
            _id: data.orderId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Check if order can be shipped
        if (!['pending', 'ready_to_ship'].includes(order.currentStatus)) {
            res.status(400).json({
                message: `Cannot create shipment for order with status '${order.currentStatus}'`,
            });
            return;
        }

        // Check for existing active shipment
        const existingShipment = await Shipment.findOne({
            orderId: order._id,
            isDeleted: false,
            currentStatus: { $nin: ['cancelled', 'rto'] },
        });

        if (existingShipment) {
            res.status(400).json({
                message: 'An active shipment already exists for this order',
                shipmentId: existingShipment._id,
                trackingNumber: existingShipment.trackingNumber,
            });
            return;
        }

        // Get warehouse for origin pincode
        const warehouseId = data.warehouseId || order.warehouseId;
        let originPincode = '110001';

        if (warehouseId) {
            const warehouse = await Warehouse.findOne({
                _id: warehouseId,
                companyId: auth.companyId,
                isDeleted: false,
            });
            if (warehouse?.address?.postalCode) {
                originPincode = warehouse.address.postalCode;
            }
        }

        // Calculate total weight
        const totalWeight = order.products.reduce(
            (sum, p) => sum + (p.weight || 0.5) * p.quantity,
            0
        );

        // Run carrier selection algorithm
        const serviceType = data.serviceType as 'express' | 'standard';
        const carrierResult: CarrierSelectionResult = selectBestCarrier(
            totalWeight,
            originPincode,
            order.customerInfo.address.postalCode,
            serviceType
        );

        // Allow carrier override
        const selectedCarrier = data.carrierOverride || carrierResult.selectedCarrier;
        const selectedOption = carrierResult.alternativeOptions.find(
            opt => opt.carrier.toLowerCase() === selectedCarrier.toLowerCase()
        ) || carrierResult.alternativeOptions[0];

        // Generate unique tracking number
        const trackingNumber = await getUniqueTrackingNumber();
        if (!trackingNumber) {
            res.status(500).json({ message: 'Failed to generate unique tracking number' });
            return;
        }

        // Calculate estimated delivery
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + selectedOption.deliveryTime);

        // Create shipment
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
                instructions: data.instructions,
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

        // Update order
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

        await createAuditLog(
            auth.userId,
            auth.companyId,
            'create',
            'shipment',
            String(shipment._id),
            { trackingNumber, carrier: selectedOption.carrier },
            req
        );

        res.status(201).json({
            message: 'Shipment created successfully',
            shipment,
            carrierSelection: {
                selectedCarrier: selectedOption.carrier,
                selectedRate: selectedOption.rate,
                selectedDeliveryTime: selectedOption.deliveryTime,
                alternativeOptions: carrierResult.alternativeOptions,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        logger.error('Error creating shipment:', error);
        next(error);
    }
};

/**
 * Get all shipments for the current user's company
 * @route GET /api/v1/shipments
 */
export const getShipments = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { page, limit, skip } = parsePagination(req.query as any);

        const filter: Record<string, any> = {
            companyId: auth.companyId,
            isDeleted: false,
        };

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
                .limit(limit),
            Shipment.countDocuments(filter),
        ]);

        res.json({
            shipments,
            pagination: buildPaginationResponse(total, page, limit),
        });
    } catch (error) {
        logger.error('Error fetching shipments:', error);
        next(error);
    }
};

/**
 * Get a single shipment by ID
 * @route GET /api/v1/shipments/:shipmentId
 */
export const getShipmentById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
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
            .populate('pickupDetails.warehouseId', 'name address contactInfo');

        if (!shipment) {
            res.status(404).json({ message: 'Shipment not found' });
            return;
        }

        res.json({ shipment });
    } catch (error) {
        logger.error('Error fetching shipment:', error);
        next(error);
    }
};

/**
 * Track a shipment by tracking number
 * @route GET /api/v1/shipments/tracking/:trackingNumber
 */
export const trackShipment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { trackingNumber } = req.params;

        // Validate AWB format
        const awbRegex = /^SHP-\d{8}-\d{4}$/;
        if (!awbRegex.test(trackingNumber)) {
            res.status(400).json({
                message: 'Invalid tracking number format. Expected: SHP-YYYYMMDD-XXXX',
            });
            return;
        }

        const shipment = await Shipment.findOne({
            trackingNumber,
            companyId: auth.companyId,
            isDeleted: false,
        })
            .populate('orderId', 'orderNumber customerInfo')
            .select('trackingNumber carrier serviceType currentStatus statusHistory deliveryDetails estimatedDelivery actualDelivery');

        if (!shipment) {
            res.status(404).json({ message: 'Shipment not found' });
            return;
        }

        // Sort timeline chronologically
        const timeline = [...shipment.statusHistory].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        res.json({
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
        });
    } catch (error) {
        logger.error('Error tracking shipment:', error);
        next(error);
    }
};

/**
 * Update shipment status
 * @route PATCH /api/v1/shipments/:shipmentId/status
 */
export const updateShipmentStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const auth = guardChecks(req, res);
        if (!auth) return;

        const { shipmentId } = req.params;
        if (!validateObjectId(shipmentId, res, 'shipment')) return;

        const data = updateShipmentStatusSchema.parse(req.body);

        const shipment = await Shipment.findOne({
            _id: shipmentId,
            companyId: auth.companyId,
            isDeleted: false,
        });

        if (!shipment) {
            res.status(404).json({ message: 'Shipment not found' });
            return;
        }

        // Validate transition
        const { valid, allowedTransitions } = validateStatusTransition(
            shipment.currentStatus,
            data.status,
            SHIPMENT_STATUS_TRANSITIONS
        );

        if (!valid) {
            res.status(400).json({
                message: `Invalid status transition from '${shipment.currentStatus}' to '${data.status}'`,
                allowedTransitions,
            });
            return;
        }

        // Update status
        shipment.statusHistory.push({
            status: data.status,
            timestamp: new Date(),
            location: data.location,
            description: data.description,
            updatedBy: new mongoose.Types.ObjectId(auth.userId),
        });
        shipment.currentStatus = data.status;

        // Handle special statuses
        if (data.status === 'delivered') {
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
        } else if (data.status === 'rto') {
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
        } else if (data.status === 'ndr') {
            shipment.ndrDetails = {
                ndrDate: new Date(),
                ndrStatus: 'pending',
                ndrAttempts: (shipment.ndrDetails?.ndrAttempts || 0) + 1,
                ndrReason: data.description,
            };
        }

        await shipment.save();
        await createAuditLog(auth.userId, auth.companyId, 'update', 'shipment', shipmentId, { newStatus: data.status }, req);

        res.json({ message: 'Shipment status updated successfully', shipment });
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        logger.error('Error updating shipment status:', error);
        next(error);
    }
};

/**
 * Soft delete a shipment
 * @route DELETE /api/v1/shipments/:shipmentId
 */
export const deleteShipment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
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
            res.status(404).json({ message: 'Shipment not found' });
            return;
        }

        // Prevent deletion of in-transit or delivered
        const nonDeletableStatuses = ['in_transit', 'out_for_delivery', 'delivered'];
        if (nonDeletableStatuses.includes(shipment.currentStatus)) {
            res.status(400).json({
                message: `Cannot delete shipment with status '${shipment.currentStatus}'`,
            });
            return;
        }

        shipment.isDeleted = true;
        await shipment.save();
        await createAuditLog(auth.userId, auth.companyId, 'delete', 'shipment', shipmentId, { softDelete: true }, req);

        res.json({ message: 'Shipment deleted successfully' });
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
