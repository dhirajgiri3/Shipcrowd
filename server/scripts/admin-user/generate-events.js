/**
 * Generate NDR and RTO Events for Admin Test User
 */

const { ObjectId } = require('mongodb');
const {
    randomInt,
    selectRandom,
    addDays,
    addHours,
} = require('./helpers');

function generateNDREvents(shipments, companyId) {
    const ndrShipments = shipments.filter(s =>
        s.ndrDetails && (s.currentStatus === 'ndr' || s.currentStatus === 'rto_initiated')
    );

    const ndrEvents = ndrShipments.map(shipment => {
        const ndrTypes = ['customer_unavailable', 'address_issue', 'payment_issue', 'refused'];
        const ndrType = selectRandom(ndrTypes);
        const detectedAt = shipment.ndrDetails.ndrDate;

        return {
            _id: new ObjectId(),
            shipment: shipment._id,
            order: shipment.orderId,
            awb: shipment.trackingNumber,
            ndrReason: shipment.ndrDetails.ndrReason,
            ndrReasonClassified: ndrType,
            ndrType: ndrType,
            detectedAt: detectedAt,
            status: shipment.currentStatus === 'rto_initiated' ? 'rto_triggered' : 'detected',
            resolutionActions: [],
            customerContacted: Math.random() < 0.7,
            resolutionDeadline: addHours(detectedAt, 48),
            company: companyId,
            attemptNumber: shipment.ndrDetails.ndrAttempts,
            classificationSource: selectRandom(['openai', 'keyword', 'manual']),
            idempotencyKey: `NDR-${shipment.trackingNumber}-${Math.floor(detectedAt.getTime() / 1000)}`,
            createdAt: detectedAt,
            updatedAt: detectedAt,
        };
    });

    return ndrEvents;
}

function generateRTOEvents(shipments, companyId, warehouses) {
    const rtoShipments = shipments.filter(s =>
        s.rtoDetails && s.currentStatus === 'rto_initiated'
    );

    const rtoEvents = rtoShipments.map(shipment => {
        const triggeredAt = shipment.rtoDetails.rtoInitiatedDate;
        const warehouse = selectRandom(warehouses);

        return {
            _id: new ObjectId(),
            shipment: shipment._id,
            order: shipment.orderId,
            reverseAwb: shipment.rtoDetails.rtoTrackingNumber,
            rtoReason: 'ndr_unresolved',
            triggeredAt: triggeredAt,
            triggeredBy: 'auto',
            returnStatus: 'in_transit',
            forwardShippingCost: shipment.paymentDetails.shippingCost,
            rtoCharges: Math.round(shipment.paymentDetails.shippingCost * 1.3),
            chargesDeducted: false,
            warehouse: warehouse._id,
            expectedReturnDate: addDays(triggeredAt, randomInt(5, 10)),
            company: companyId,
            warehouseNotified: true,
            metadata: {
                forwardAwb: shipment.trackingNumber,
                ndrAttempts: shipment.ndrDetails.ndrAttempts,
                carrier: shipment.carrier,
            },
            createdAt: triggeredAt,
            updatedAt: triggeredAt,
        };
    });

    return rtoEvents;
}

module.exports = {
    generateNDREvents,
    generateRTOEvents,
};
