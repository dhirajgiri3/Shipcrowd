/**
 * Shipments Seeder
 * 
 * Generates shipments for orders (one per order) with 85% delivered, 5-8% NDR, 5-7% RTO.
 */

import mongoose from 'mongoose';
import Shipment from '../../mongoose/models/logistics/shipping/core/shipment.model';
import Order from '../../mongoose/models/orders/core/order.model';
import Warehouse from '../../mongoose/models/logistics/warehouse/structure/warehouse.model';
import { SEED_CONFIG } from '../config';
import { randomInt, selectRandom, selectWeightedFromObject, maybeExecute } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { addDays, addHours, randomDateBetween } from '../utils/date.utils';
import { INDIAN_CITIES, getCityByName, CityData, getShippingZone, getCityTier } from '../data/indian-cities';
import {
    selectCarrier,
    generateTrackingNumber,
    selectServiceType,
    getEstimatedDeliveryDays,
    calculateShippingCost,
    resetTrackingCounters
} from '../data/carrier-data';
import { CarrierName } from '../config';

/**
 * Determine delivery status based on configured distribution
 */
function selectDeliveryStatus(): 'delivered' | 'ndr' | 'rto' {
    return selectWeightedFromObject(SEED_CONFIG.deliveryStatus) as 'delivered' | 'ndr' | 'rto';
}

/**
 * Generate status history based on delivery outcome
 */
function generateStatusHistory(
    pickupDate: Date,
    deliveryStatus: 'delivered' | 'ndr' | 'rto',
    carrier: CarrierName
): Array<{ status: string; timestamp: Date; location?: string; description?: string }> {
    const history: Array<{ status: string; timestamp: Date; location?: string; description?: string }> = [];

    // Initial statuses (always present)
    history.push({
        status: 'created',
        timestamp: pickupDate,
        location: 'Origin Warehouse',
        description: 'Shipment created',
    });

    history.push({
        status: 'picked_up',
        timestamp: addHours(pickupDate, randomInt(2, 8)),
        location: 'Origin Warehouse',
        description: `Package picked up by ${carrier}`,
    });

    history.push({
        status: 'in_transit',
        timestamp: addDays(pickupDate, 1),
        location: 'Sorting Hub',
        description: 'In transit to destination',
    });

    if (deliveryStatus === 'delivered') {
        const deliveryDate = addDays(pickupDate, randomInt(2, 7));

        history.push({
            status: 'out_for_delivery',
            timestamp: addHours(deliveryDate, -randomInt(2, 6)),
            location: 'Destination Hub',
            description: 'Out for delivery',
        });

        history.push({
            status: 'delivered',
            timestamp: deliveryDate,
            location: 'Delivery Address',
            description: 'Delivered successfully',
        });
    } else if (deliveryStatus === 'ndr') {
        history.push({
            status: 'out_for_delivery',
            timestamp: addDays(pickupDate, 2),
            location: 'Destination Hub',
            description: 'Out for delivery',
        });

        history.push({
            status: 'ndr',
            timestamp: addDays(pickupDate, 3),
            location: 'Delivery Address',
            description: selectRandom([
                'Customer unavailable',
                'Address not found',
                'Customer refused delivery',
                'COD amount not ready',
            ]),
        });
    } else if (deliveryStatus === 'rto') {
        history.push({
            status: 'out_for_delivery',
            timestamp: addDays(pickupDate, 2),
            location: 'Destination Hub',
            description: 'Out for delivery',
        });

        history.push({
            status: 'ndr',
            timestamp: addDays(pickupDate, 3),
            location: 'Delivery Address',
            description: 'Delivery attempt failed',
        });

        history.push({
            status: 'rto_initiated',
            timestamp: addDays(pickupDate, 5),
            location: 'Destination Hub',
            description: 'Return to origin initiated',
        });

        // Some RTOs complete, some still in transit
        if (Math.random() < 0.6) {
            history.push({
                status: 'rto_in_transit',
                timestamp: addDays(pickupDate, 7),
                location: 'Transit Hub',
                description: 'In transit back to origin',
            });

            history.push({
                status: 'rto_delivered',
                timestamp: addDays(pickupDate, 10),
                location: 'Origin Warehouse',
                description: 'Returned to warehouse',
            });
        }
    }

    return history;
}

/**
 * Generate shipment data for an order
 */
function generateShipmentData(order: any, warehouse: any): any {
    const carrier = selectCarrier();
    const deliveryStatus = selectDeliveryStatus();
    const isExpress = Math.random() < 0.3; // 30% express
    const serviceType = selectServiceType(carrier, isExpress);

    const pickupDate = addDays(order.createdAt, randomInt(
        SEED_CONFIG.pickupDelay.min,
        SEED_CONFIG.pickupDelay.max
    ));

    const destCity = order.customerInfo?.address?.city || 'Mumbai';
    const originCity = warehouse?.address?.city || 'Mumbai';
    const zone = getShippingZone(originCity, destCity);
    const cityTier = getCityTier(destCity);
    const isMetroToMetro = cityTier === 'metro' && getCityTier(originCity) === 'metro';

    const deliveryDays = getEstimatedDeliveryDays(carrier, zone, isExpress);
    const estimatedDelivery = addDays(pickupDate, randomInt(deliveryDays.min, deliveryDays.max));

    const statusHistory = generateStatusHistory(pickupDate, deliveryStatus, carrier);
    const currentStatus = statusHistory[statusHistory.length - 1].status;

    const actualDelivery = deliveryStatus === 'delivered'
        ? statusHistory.find(s => s.status === 'delivered')?.timestamp
        : undefined;

    // Calculate package details
    const products = order.products || [];
    const totalWeight = products.reduce((sum: number, p: any) => sum + (p.weight || 0.5) * (p.quantity || 1), 0);

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
            type: order.paymentMethod || 'prepaid',
            codAmount: order.paymentMethod === 'cod' ? order.totals?.total : undefined,
            shippingCost: order.shippingDetails?.shippingCost || order.totals?.shipping || 100,
            currency: 'INR',
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
        // Week 11: Weight tracking and verification
        weights: {
            declared: {
                value: Math.round(totalWeight * 100) / 100, // Same as packageDetails.weight
                unit: 'kg',
            },
            // Add actual weight for delivered shipments (simulates carrier scanning)
            actual: deliveryStatus === 'delivered' ? {
                value: Math.round((totalWeight + (Math.random() * 0.4 - 0.1)) * 100) / 100, // Slight variance (-0.1 to +0.3 kg)
                unit: 'kg',
                scannedAt: actualDelivery,
                scannedBy: carrier.charAt(0).toUpperCase() + carrier.slice(1).replace(/_/g, ' '),
            } : undefined,
            verified: deliveryStatus === 'delivered',
        },
        // NDR/RTO details will be populated by their respective seeders
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
        // Get all orders
        const orders = await Order.find({ isDeleted: false }).lean();
        const warehouses = await Warehouse.find({ isActive: true, isDeleted: false }).lean();

        if (orders.length === 0) {
            logger.warn('No orders found. Skipping shipments seeder.');
            return;
        }

        // Create warehouse lookup
        const warehouseMap = new Map<string, any>();
        for (const wh of warehouses) {
            warehouseMap.set(wh._id.toString(), wh);
        }

        const shipments: any[] = [];
        let deliveredCount = 0;
        let ndrCount = 0;
        let rtoCount = 0;

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            const warehouse = warehouseMap.get(order.warehouseId?.toString() || '');

            const shipmentData = generateShipmentData(order, warehouse);
            shipments.push(shipmentData);

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
