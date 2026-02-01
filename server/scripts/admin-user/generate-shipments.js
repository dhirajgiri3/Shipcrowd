/**
 * Generate Shipments for Admin Test User
 */

const { ObjectId } = require('mongodb');
const {
    randomInt,
    selectRandom,
    addDays,
    addHours,
    CARRIERS,
} = require('./helpers');

function generateShipments(orders) {
    const shipments = [];

    // 85% delivered, 8% NDR, 7% RTO
    const statusDistribution = [
        ...Array(85).fill('delivered'),
        ...Array(8).fill('ndr'),
        ...Array(7).fill('rto'),
    ];

    orders.forEach((order, index) => {
        const deliveryStatus = selectRandom(statusDistribution);
        const carrier = selectRandom(CARRIERS);
        const trackingNumber = `${carrier.substring(0, 3).toUpperCase()}${Date.now()}${randomInt(10000, 99999)}${index}`;

        const pickupDate = addDays(order.createdAt, randomInt(1, 3));
        const deliveryDate = deliveryStatus === 'delivered'
            ? addDays(pickupDate, randomInt(2, 7))
            : null;

        const products = order.products || [];
        const totalWeight = products.reduce((sum, p) => sum + (p.weight || 0.5), 0);

        const statusHistory = [{
            status: 'created',
            timestamp: pickupDate,
            location: 'Origin Warehouse',
        }];

        if (deliveryStatus === 'delivered') {
            statusHistory.push({
                status: 'in_transit',
                timestamp: addDays(pickupDate, 1),
                location: 'Sorting Hub',
            });
            statusHistory.push({
                status: 'delivered',
                timestamp: deliveryDate,
                location: 'Delivery Address',
            });
        } else if (deliveryStatus === 'ndr') {
            statusHistory.push({
                status: 'ndr',
                timestamp: addDays(pickupDate, 3),
                location: 'Delivery Address',
            });
        } else if (deliveryStatus === 'rto') {
            statusHistory.push({
                status: 'ndr',
                timestamp: addDays(pickupDate, 3),
            });
            statusHistory.push({
                status: 'rto_initiated',
                timestamp: addDays(pickupDate, 5),
            });
        }

        const currentStatus = statusHistory[statusHistory.length - 1].status;

        const shipment = {
            _id: new ObjectId(),
            trackingNumber: trackingNumber,
            orderId: order._id,
            companyId: order.companyId,
            carrier: carrier,
            serviceType: selectRandom(['Surface', 'Express', 'Air']),
            packageDetails: {
                weight: totalWeight,
                dimensions: {
                    length: randomInt(10, 50),
                    width: randomInt(10, 40),
                    height: randomInt(5, 30),
                },
                packageCount: 1,
                packageType: 'box',
                declaredValue: order.totals.subtotal,
            },
            deliveryDetails: {
                recipientName: order.customerInfo.name,
                recipientPhone: order.customerInfo.phone,
                address: order.customerInfo.address,
            },
            paymentDetails: {
                type: order.paymentMethod,
                codAmount: order.paymentMethod === 'cod' ? order.totals.total : undefined,
                shippingCost: order.shippingDetails.shippingCost,
                currency: 'INR',
            },
            statusHistory: statusHistory,
            currentStatus: currentStatus,
            actualDelivery: deliveryDate,
            weights: {
                declared: { value: totalWeight, unit: 'kg' },
                actual: deliveryStatus === 'delivered' ? {
                    value: Math.round((totalWeight + (Math.random() * 0.4 - 0.1)) * 100) / 100,
                    unit: 'kg',
                    scannedAt: deliveryDate,
                } : undefined,
                verified: deliveryStatus === 'delivered',
            },
            ndrDetails: (deliveryStatus === 'ndr' || deliveryStatus === 'rto') ? {
                ndrReason: selectRandom([
                    'Customer unavailable',
                    'Wrong address',
                    'Customer refused',
                    'COD not ready',
                ]),
                ndrDate: addDays(pickupDate, 3),
                ndrStatus: deliveryStatus === 'rto' ? 'return_initiated' : 'pending',
                ndrAttempts: randomInt(1, 3),
            } : undefined,
            rtoDetails: deliveryStatus === 'rto' ? {
                rtoInitiatedDate: addDays(pickupDate, 5),
                rtoReason: 'NDR unresolved',
                rtoStatus: 'in_transit',
                rtoTrackingNumber: `RTO-${trackingNumber}`,
            } : undefined,
            isDeleted: false,
            createdAt: pickupDate,
            updatedAt: deliveryDate || new Date(),
        };

        shipments.push(shipment);
    });

    return shipments;
}

module.exports = { generateShipments };
