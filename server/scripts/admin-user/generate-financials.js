/**
 * Generate Financial Data for Admin Test User
 * - Wallet Transactions
 * - COD Remittances
 * - Weight Disputes
 */

const { ObjectId } = require('mongodb');
const {
    randomInt,
    randomFloat,
    selectRandom,
    addDays,
} = require('./helpers');

function generateWalletTransactions(companyId, shipments, orders) {
    const transactions = [];
    let currentBalance = 500000; // Starting balance

    // 1. Initial wallet recharge
    transactions.push({
        _id: new ObjectId(),
        company: companyId,
        type: 'credit',
        amount: 500000,
        balanceBefore: 0,
        balanceAfter: 500000,
        reason: 'recharge',
        description: 'Initial wallet recharge',
        reference: {
            type: 'payment',
            externalId: `PAY${randomInt(100000, 999999)}`,
        },
        createdBy: 'system',
        status: 'completed',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    });

    // 2. Shipping cost debits
    shipments.forEach(shipment => {
        const shippingCost = shipment.paymentDetails.shippingCost;
        currentBalance -= shippingCost;

        transactions.push({
            _id: new ObjectId(),
            company: companyId,
            type: 'debit',
            amount: shippingCost,
            balanceBefore: currentBalance + shippingCost,
            balanceAfter: currentBalance,
            reason: 'shipping_cost',
            description: `Shipping charge for AWB: ${shipment.trackingNumber}`,
            reference: {
                type: 'shipment',
                id: shipment._id,
                externalId: shipment.trackingNumber,
            },
            createdBy: 'system',
            status: 'completed',
            createdAt: shipment.createdAt,
            updatedAt: shipment.createdAt,
        });
    });

    // 3. COD remittances for delivered COD orders
    const codDeliveredShipments = shipments.filter(s =>
        s.paymentDetails.type === 'cod' && s.currentStatus === 'delivered'
    );

    codDeliveredShipments.forEach(shipment => {
        const codAmount = shipment.paymentDetails.codAmount;
        const remittanceDate = addDays(shipment.actualDelivery, randomInt(3, 7));
        currentBalance += codAmount;

        transactions.push({
            _id: new ObjectId(),
            company: companyId,
            type: 'credit',
            amount: codAmount,
            balanceBefore: currentBalance - codAmount,
            balanceAfter: currentBalance,
            reason: 'cod_remittance',
            description: `COD remittance for AWB: ${shipment.trackingNumber}`,
            reference: {
                type: 'shipment',
                id: shipment._id,
                externalId: shipment.trackingNumber,
            },
            createdBy: 'system',
            status: 'completed',
            createdAt: remittanceDate,
            updatedAt: remittanceDate,
        });
    });

    // 4. Periodic wallet recharges (5 times)
    for (let i = 0; i < 5; i++) {
        const rechargeDate = new Date(Date.now() - randomInt(30, 330) * 24 * 60 * 60 * 1000);
        const amount = randomInt(50000, 150000);
        currentBalance += amount;

        transactions.push({
            _id: new ObjectId(),
            company: companyId,
            type: 'credit',
            amount: amount,
            balanceBefore: currentBalance - amount,
            balanceAfter: currentBalance,
            reason: 'recharge',
            description: 'Wallet recharge via Razorpay',
            reference: {
                type: 'payment',
                externalId: `PAY${randomInt(100000, 999999)}`,
            },
            createdBy: 'system',
            status: 'completed',
            createdAt: rechargeDate,
            updatedAt: rechargeDate,
        });
    }

    return transactions.sort((a, b) => a.createdAt - b.createdAt);
}

function generateCODRemittances(companyId, shipments) {
    const codDeliveredShipments = shipments.filter(s =>
        s.paymentDetails.type === 'cod' && s.currentStatus === 'delivered'
    );

    const remittances = codDeliveredShipments.map(shipment => {
        const remittanceDate = addDays(shipment.actualDelivery, randomInt(3, 7));

        return {
            _id: new ObjectId(),
            companyId: companyId,
            shipmentId: shipment._id,
            orderId: shipment.orderId,
            awb: shipment.trackingNumber,
            codAmount: shipment.paymentDetails.codAmount,
            remittanceAmount: shipment.paymentDetails.codAmount,
            deductions: 0,
            status: 'completed',
            remittedAt: remittanceDate,
            utrNumber: `UTR${randomInt(1000000000, 9999999999)}`,
            createdAt: remittanceDate,
            updatedAt: remittanceDate,
        };
    });

    return remittances;
}

function generateWeightDisputes(companyId, shipments) {
    // Select ~5% of delivered shipments for weight disputes
    const deliveredShipments = shipments.filter(s =>
        s.currentStatus === 'delivered' && s.weights.actual
    );

    const disputeCount = Math.floor(deliveredShipments.length * 0.05);
    const disputeShipments = deliveredShipments
        .sort(() => Math.random() - 0.5)
        .slice(0, disputeCount);

    const disputes = disputeShipments.map(shipment => {
        const declaredWeight = shipment.weights.declared.value;
        const actualWeight = shipment.weights.actual.value;
        const discrepancy = Math.abs(actualWeight - declaredWeight);
        const discrepancyPercentage = (discrepancy / declaredWeight) * 100;

        const originalCharge = shipment.paymentDetails.shippingCost;
        const revisedCharge = Math.round(originalCharge * (actualWeight / declaredWeight));
        const difference = Math.abs(revisedCharge - originalCharge);

        const detectedAt = addDays(shipment.actualDelivery, randomInt(1, 3));
        const status = selectRandom(['pending', 'under_review', 'auto_resolved']);

        return {
            _id: new ObjectId(),
            disputeId: `WD-${Date.now()}-${randomInt(1000, 9999)}`,
            shipmentId: shipment._id,
            orderId: shipment.orderId,
            companyId: companyId,
            declaredWeight: {
                value: declaredWeight,
                unit: 'kg',
            },
            actualWeight: {
                value: actualWeight,
                unit: 'kg',
            },
            discrepancy: {
                value: discrepancy,
                percentage: discrepancyPercentage,
                thresholdExceeded: discrepancyPercentage > 5,
            },
            status: status,
            detectedAt: detectedAt,
            detectedBy: 'carrier_webhook',
            financialImpact: {
                originalCharge: originalCharge,
                revisedCharge: revisedCharge,
                difference: difference,
                chargeDirection: actualWeight > declaredWeight ? 'debit' : 'credit',
            },
            timeline: [{
                status: 'pending',
                timestamp: detectedAt,
                actor: 'carrier',
                action: `Weight discrepancy detected: ${discrepancyPercentage.toFixed(1)}%`,
            }],
            isDeleted: false,
            createdAt: detectedAt,
            updatedAt: detectedAt,
        };
    });

    return disputes;
}

function generateDisputes(companyId, shipments) {
    // Create 10-15 disputes for various issues
    const disputeCount = randomInt(10, 15);
    const eligibleShipments = shipments
        .filter(s => s.currentStatus === 'delivered' || s.currentStatus === 'ndr')
        .sort(() => Math.random() - 0.5)
        .slice(0, disputeCount);

    const disputeTypes = [
        { type: 'delivery', category: 'not_delivered' },
        { type: 'damage', category: 'damaged_product' },
        { type: 'delivery', category: 'delayed' },
        { type: 'delivery', category: 'wrong_item' },
    ];

    const disputes = eligibleShipments.map((shipment, index) => {
        const { type, category } = selectRandom(disputeTypes);
        const createdAt = addDays(shipment.createdAt, randomInt(5, 15));
        const status = selectRandom(['pending', 'investigating', 'resolved', 'closed']);

        return {
            _id: new ObjectId(),
            disputeId: `DIS-${Date.now()}-${String(index + 1).padStart(5, '0')}`,
            shipmentId: shipment._id,
            companyId: companyId,
            orderId: shipment.orderId,
            type: type,
            category: category,
            status: status,
            priority: selectRandom(['low', 'medium', 'high']),
            description: `Customer reported ${category.replace('_', ' ')}`,
            customerDetails: {
                name: shipment.deliveryDetails.recipientName,
                phone: shipment.deliveryDetails.recipientPhone,
            },
            evidence: [],
            timeline: [{
                action: 'Dispute created',
                performedBy: new ObjectId(),
                timestamp: createdAt,
            }],
            sla: {
                deadline: addDays(createdAt, 7),
                isOverdue: status === 'pending' && new Date() > addDays(createdAt, 7),
            },
            isDeleted: false,
            createdAt: createdAt,
            updatedAt: createdAt,
        };
    });

    return disputes;
}

module.exports = {
    generateWalletTransactions,
    generateCODRemittances,
    generateWeightDisputes,
    generateDisputes,
};
