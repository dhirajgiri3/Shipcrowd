/**
 * Shipments Seeder
 * 
 * Generates shipments for orders (one per order) with 85% delivered, 5-8% NDR, 5-7% RTO.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';


import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';
import Warehouse from '../../mongoose/models/logistics/warehouse/structure/warehouse.model';
import Order from '../../mongoose/models/orders/core/order.model';
import { CarrierName } from '../config';
import {
generateTrackingNumber,
getEstimatedDeliveryDays,
resetTrackingCounters,
selectCarrier,
selectServiceType
} from '../data/carrier-data';
import { getShippingZone } from '../data/indian-cities';
import { addDays, addHours } from '../utils/date.utils';
import { createTimer, logger } from '../utils/logger.utils';
import { maybeExecute, randomInt, selectRandom } from '../utils/random.utils';

const ZONE_CODE_MAP: Record<string, 'zoneA' | 'zoneB' | 'zoneC' | 'zoneD' | 'zoneE'> = {
    zone_a: 'zoneA',
    zone_b: 'zoneB',
    zone_c: 'zoneC',
    zone_d: 'zoneD',
    zone_e: 'zoneE',
};

/**
 * Determine delivery status based on order status
 */
function deriveDeliveryStatus(orderStatus: string): 'delivered' | 'ndr' | 'rto' | 'in_transit' {
    if (orderStatus === 'delivered') return 'delivered';
    if (orderStatus === 'rto' || orderStatus === 'rto_delivered') return 'rto';
    if (orderStatus === 'in_transit') return 'in_transit';
    if (orderStatus === 'manifested') return 'in_transit'; // Just created/picked up
    // Default fallback if mismatch
    return 'delivered';
}

/**
 * Generate status history ensuring alignment with Order dates
 */
function generateAlignedStatusHistory(
    order: any,
    deliveryStatus: 'delivered' | 'ndr' | 'rto' | 'in_transit',
    carrier: CarrierName
): Array<{ status: string; timestamp: Date; location?: string; description?: string }> {
    const history: Array<{ status: string; timestamp: Date; location?: string; description?: string }> = [];

    // Extract key dates from Order History
    const orderHistory = order.statusHistory || [];
    const getOrderDate = (status: string) => orderHistory.find((h: any) => h.status === status)?.timestamp;

    const createdDate = getOrderDate('manifested') || order.createdAt; // Manifested date
    const pickupDate = getOrderDate('in_transit') || addHours(createdDate, 4); // Picked up date

    // 1. Created
    history.push({
        status: 'created',
        timestamp: createdDate,
        location: 'Origin Warehouse',
        description: 'Shipment created',
    });

    if (order.currentStatus === 'manifested') return history; // Stop here if just manifested

    // 2. Picked Up
    history.push({
        status: 'picked_up',
        timestamp: pickupDate,
        location: 'Origin Warehouse',
        description: `Package picked up by ${carrier}`,
    });

    // 3. In Transit
    // Typically same day or next day
    const transitDate = addHours(pickupDate, 12);
    // Don't add future dates
    if (transitDate > new Date()) return history;

    history.push({
        status: 'in_transit',
        timestamp: transitDate,
        location: 'Sorting Hub',
        description: 'In transit to destination',
    });

    if (deliveryStatus === 'in_transit') return history;

    // 4. Delivered / RTO Logic
    if (deliveryStatus === 'delivered') {
        const deliveryDate = getOrderDate('delivered') || addDays(pickupDate, 3);
        const outForDeliveryDate = getOrderDate('out_for_delivery') || addHours(deliveryDate, -4);

        history.push({
            status: 'out_for_delivery',
            timestamp: outForDeliveryDate,
            location: 'Destination Hub',
            description: 'Out for delivery',
        });

        history.push({
            status: 'delivered',
            timestamp: deliveryDate,
            location: 'Delivery Address',
            description: 'Delivered successfully',
        });
    } else if (deliveryStatus === 'rto') {
        // RTO Logic
        const ndrDate = getOrderDate('ndr') || addDays(pickupDate, 2);
        const rtoInitDate = getOrderDate('rto_initiated') || addDays(ndrDate, 2);
        const rtoDeliveredDate = getOrderDate('rto_delivered') || addDays(rtoInitDate, 4);

        history.push({
            status: 'out_for_delivery',
            timestamp: addHours(ndrDate, -4),
            location: 'Destination Hub',
            description: 'Out for delivery',
        });

        history.push({
            status: 'ndr',
            timestamp: ndrDate,
            location: 'Delivery Address',
            description: 'Customer unavailable',
        });

        history.push({
            status: 'rto_initiated',
            timestamp: rtoInitDate,
            location: 'Destination Hub',
            description: 'Return to origin initiated',
        });

        history.push({
            status: 'rto_in_transit',
            timestamp: addDays(rtoInitDate, 1),
            location: 'Transit Hub',
            description: 'In transit back to origin',
        });

        history.push({
            status: 'rto_delivered',
            timestamp: rtoDeliveredDate,
            location: 'Origin Warehouse',
            description: 'Returned to warehouse',
        });
    }

    return history;
}

/**
 * Generate shipment data for an order
 */
function generateShipmentData(order: any, warehouse: any): any {
    const carrier = selectCarrier();
    const deliveryStatus = deriveDeliveryStatus(order.currentStatus);
    const isExpress = Math.random() < 0.3; // 30% express
    const serviceType = selectServiceType(carrier, isExpress);

    // Use order's manifested date as baseline for pickup
    const baseDate = order.statusHistory.find((h: any) => h.status === 'manifested')?.timestamp || order.createdAt;

    // Pickup delay is already accounted for in Order Status (manifested -> in_transit)
    // So we align with Order 
    const pickupDate = order.statusHistory.find((h: any) => h.status === 'in_transit')?.timestamp || addDays(baseDate, 1);

    const destCity = order.customerInfo?.address?.city || 'Mumbai';
    const originCity = warehouse?.address?.city || 'Mumbai';
    const zoneKey = getShippingZone(originCity, destCity); // Uses cached zone calculation
    const zoneCode = ZONE_CODE_MAP[zoneKey] || 'zoneC';

    // Estimate delivery
    const deliveryDays = getEstimatedDeliveryDays(carrier, zoneCode, isExpress);
    const estimatedDelivery = addDays(pickupDate, randomInt(deliveryDays.min, deliveryDays.max));

    const statusHistory = generateAlignedStatusHistory(order, deliveryStatus, carrier);

    // Current status is the last one in history
    const currentStatus = statusHistory[statusHistory.length - 1].status;

    const actualDelivery = deliveryStatus === 'delivered'
        ? statusHistory.find(s => s.status === 'delivered')?.timestamp
        : undefined;

    // Calculate package details
    const products = order.products || [];
    const totalWeight = products.reduce((sum: number, p: any) => sum + (p.weight || 0.5) * (p.quantity || 1), 0);

    const paymentMode = (order.paymentMethod || 'prepaid') as 'prepaid' | 'cod';
    const orderValue = order.totals?.total || 0;

    const shippingCost = order.shippingDetails?.shippingCost
        || order.totals?.shipping
        || 100;

    return {
        trackingNumber: generateTrackingNumber(carrier),
        orderId: order._id,
        companyId: order.companyId,
        carrier: carrier.charAt(0).toUpperCase() + carrier.slice(1).replace(/_/g, ' '),
        serviceType,
        packageDetails: {
            weight: Math.round(totalWeight * 100) / 100,
            dimensions: {
                length: randomInt(10, 50),
                width: randomInt(10, 40),
                height: randomInt(5, 30),
            },
            packageCount: 1,
            packageType: totalWeight > 5 ? 'box' : 'polybag',
            declaredValue: order.totals?.subtotal || 1000,
        },
        pickupDetails: {
            warehouseId: warehouse?._id,
            pickupDate,
            pickupReference: `PU${randomInt(100000, 999999)}`,
            contactPerson: warehouse?.contactInfo?.name || 'Warehouse Manager',
            contactPhone: warehouse?.contactInfo?.phone || '+91-98765-43210',
        },
        deliveryDetails: {
            recipientName: order.customerInfo?.name || 'Customer',
            recipientPhone: order.customerInfo?.phone || '+91-98765-43210',
            recipientEmail: order.customerInfo?.email,
            address: order.customerInfo?.address || {
                line1: 'Address Line 1',
                city: 'Mumbai',
                state: 'Maharashtra',
                country: 'India',
                postalCode: '400001',
            },
            instructions: maybeExecute(() => selectRandom([
                'Call before delivery',
                'Leave at door',
                'Ring doorbell twice',
                'Contact security at gate',
            ]), 0.3),
        },
        paymentDetails: {
            type: paymentMode,
            codAmount: paymentMode === 'cod' ? orderValue : undefined,
            shippingCost,
            currency: 'INR',
        },
        pricingDetails: {
            selectedQuote: {
                optionId: `seed-${generateTrackingNumber(carrier)}`,
                provider: carrier,
                serviceName: serviceType,
                quotedSellAmount: shippingCost,
                expectedCostAmount: Math.round(shippingCost * 0.88 * 100) / 100,
                expectedMarginAmount: Math.round(shippingCost * 0.12 * 100) / 100,
                expectedMarginPercent: 12,
                chargeableWeight: Math.round(totalWeight * 100) / 100,
                zone: zoneCode,
                pricingSource: 'table',
                confidence: 'high',
                calculatedAt: new Date(),
            },
            rateCardId: null,
            rateCardName: 'service-level-pricing',
            zone: zoneCode,
            subtotal: shippingCost,
            codCharge: paymentMode === 'cod' ? Math.round(orderValue * 0.02 * 100) / 100 : 0,
            gstAmount: Math.round(shippingCost * 0.18 * 100) / 100,
            totalPrice: shippingCost,
            calculatedAt: new Date(),
            calculationMethod: 'override',
        },
        statusHistory,
        currentStatus,
        estimatedDelivery,
        actualDelivery,
        documents: [
            {
                type: 'label',
                url: `https://storage.Shipcrowd.com/labels/${generateTrackingNumber(carrier)}.pdf`,
                createdAt: pickupDate,
            },
            {
                type: 'invoice',
                url: `https://storage.Shipcrowd.com/invoices/${order.orderNumber}.pdf`,
                createdAt: pickupDate,
            },
        ],
        carrierDetails: {
            carrierTrackingNumber: `${carrier.slice(0, 3).toUpperCase()}${randomInt(10000000, 99999999)}`,
            carrierServiceType: serviceType,
            carrierAccount: order.companyId.toString().slice(-6),
        },
        // Weights
        weights: {
            declared: {
                value: Math.round(totalWeight * 100) / 100,
                unit: 'kg',
            },
            actual: deliveryStatus === 'delivered' ? {
                value: Math.round((totalWeight + (Math.random() * 0.4 - 0.1)) * 100) / 100,
                unit: 'kg',
                scannedAt: actualDelivery,
                scannedBy: carrier.charAt(0).toUpperCase() + carrier.slice(1).replace(/_/g, ' '),
            } : undefined,
            verified: deliveryStatus === 'delivered',
        },
        // NDR/RTO details
        ndrDetails: deliveryStatus === 'ndr' || deliveryStatus === 'rto' ? {
            ndrReason: selectRandom([
                'Customer unavailable',
                'Wrong address',
                'Customer refused',
                'COD not ready',
            ]),
            ndrDate: statusHistory.find(s => s.status === 'ndr')?.timestamp,
            ndrStatus: deliveryStatus === 'rto' ? 'return_initiated' : 'pending',
            ndrAttempts: randomInt(1, 3),
        } : undefined,
        rtoDetails: deliveryStatus === 'rto' ? {
            rtoInitiatedDate: statusHistory.find(s => s.status === 'rto_initiated')?.timestamp,
            rtoReason: 'NDR unresolved',
            rtoExpectedDate: addDays(pickupDate, randomInt(8, 12)),
            rtoActualDate: statusHistory.find(s => s.status === 'rto_delivered')?.timestamp,
            rtoStatus: statusHistory.some(s => s.status === 'rto_delivered') ? 'delivered_to_warehouse' : 'in_transit',
            rtoTrackingNumber: `RTO-${generateTrackingNumber(carrier)}`,
            rtoShippingCost: Math.round((order.shippingDetails?.shippingCost || 100) * 1.3),
        } : undefined,
        isDeleted: false,
        isDemoData: true,
        createdAt: order.createdAt,
        updatedAt: actualDelivery || new Date(),
    };
}

/**
 * Main seeder function
 */
export async function seedShipments(): Promise<void> {
    const timer = createTimer();
    logger.step(8, 'Seeding Shipments');

    // Reset tracking counters for fresh unique number generation
    resetTrackingCounters();

    try {
        await Shipment.deleteMany({});
        logger.info('Cleared existing shipments');

        // Get all orders that are eligible for shipping (Manifested or further)
        // Skip 'pending', 'processing', 'cancelled'
        const orders = await Order.find({
            isDeleted: false,
            currentStatus: { $nin: ['pending', 'processing', 'cancelled'] }
        }).lean();

        const warehouses = await Warehouse.find({ isActive: true, isDeleted: false }).lean();
        if (orders.length === 0) {
            logger.warn('No eligible orders found for shipping. Skipping shipments seeder.');
            return;
        }

        // Create warehouse lookup
        const warehouseMap = new Map<string, any>();
        for (const wh of warehouses) {
            warehouseMap.set(wh._id.toString(), wh);
        }

        const shipments: any[] = [];
        const orderUpdates: any[] = [];
        let deliveredCount = 0;
        let ndrCount = 0;
        let rtoCount = 0;

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            const warehouse = warehouseMap.get(order.warehouseId?.toString() || '');

            const shipmentData = generateShipmentData(order, warehouse);
            shipments.push(shipmentData);

            orderUpdates.push({
                updateOne: {
                    filter: { _id: order._id },
                    update: {
                        $set: {
                            'shippingDetails.provider': shipmentData.carrier,
                            'shippingDetails.method': shipmentData.serviceType,
                            'shippingDetails.trackingNumber': shipmentData.trackingNumber,
                            'shippingDetails.estimatedDelivery': shipmentData.estimatedDelivery,
                            'shippingDetails.shippingCost': shipmentData.paymentDetails.shippingCost,
                        }
                    }
                }
            });

            // Count statuses
            if (shipmentData.currentStatus === 'delivered') deliveredCount++;
            else if (shipmentData.currentStatus === 'ndr') ndrCount++;
            else if (shipmentData.currentStatus.startsWith('rto')) rtoCount++;

            if ((i + 1) % 500 === 0 || i === orders.length - 1) {
                logger.progress(i + 1, orders.length, 'Shipments');
            }
        }

        // Insert in batches
        const batchSize = 1000;
        for (let i = 0; i < shipments.length; i += batchSize) {
            const batch = shipments.slice(i, i + batchSize);
            await Shipment.insertMany(batch);
        }

        // Update orders with shipment metadata (provider, tracking number, ETA)
        for (let i = 0; i < orderUpdates.length; i += batchSize) {
            const batch = orderUpdates.slice(i, i + batchSize);
            await Order.bulkWrite(batch, { ordered: false });
        }

        logger.complete('shipments', shipments.length, timer.elapsed());
        logger.table({
            'Total Shipments': shipments.length,
            'Delivered': `${deliveredCount} (${((deliveredCount / shipments.length) * 100).toFixed(1)}%)`,
            'NDR': `${ndrCount} (${((ndrCount / shipments.length) * 100).toFixed(1)}%)`,
            'RTO': `${rtoCount} (${((rtoCount / shipments.length) * 100).toFixed(1)}%)`,
        });

    } catch (error) {
        logger.error('Failed to seed shipments:', error);
        throw error;
    }
}

// Standalone Execution
// Standalone Execution
if (require.main === module) {
    dotenv.config();

    if (!process.env.ENCRYPTION_KEY) {
        console.warn('⚠️  ENCRYPTION_KEY not found in environment. Using default dev key for seeding.');
        process.env.ENCRYPTION_KEY = 'd99716e21c089e3c1d530e69ea1b956dc676cae451e9e4d47154d8dea2721875';
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';

    mongoose.connect(mongoUri)
        .then(() => {
            logger.info('Connected to MongoDB');
            return seedShipments();
        })
        .then(() => {
            logger.success('✅ Shipments seeding completed!');
            return mongoose.disconnect();
        })
        .catch((error) => {
            logger.error('Seeding failed:', error);
            process.exit(1);
        });
}

/**
 * Get shipments by status
 */
export async function getShipmentsByStatus(status: string) {
    return Shipment.find({ currentStatus: status, isDeleted: false }).lean();
}

/**
 * Get failed shipments (NDR/RTO)
 */
export async function getFailedShipments() {
    return Shipment.find({
        currentStatus: { $in: ['ndr', 'ndr_reattempt', 'rto_initiated', 'rto_in_transit', 'rto_delivered'] },
        isDeleted: false,
    }).lean();
}
