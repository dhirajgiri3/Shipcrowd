/**
 * Shipment Factory
 * Creates test data for Shipment model
 */
import mongoose from 'mongoose';
import {
randomAddress,
randomCity,
randomEmail,
randomFutureDate,
randomInt,
randomName,
randomNumeric,
randomPhone,
randomPincode,
randomState,
uniqueId,
} from '../helpers/randomData';

// Import model lazily
const getShipmentModel = () => mongoose.model('Shipment');

export interface CreateTestShipmentOptions {
    trackingNumber?: string;
    orderId?: mongoose.Types.ObjectId | string;
    companyId?: mongoose.Types.ObjectId | string;
    carrier?: string;
    serviceType?: string;
    currentStatus?: string;
    paymentType?: 'prepaid' | 'cod';
    codAmount?: number;
}

/**
 * Create a test shipment with optional overrides
 */
export const createTestShipment = async (
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string,
    overrides: CreateTestShipmentOptions = {}
): Promise<any> => {
    const Shipment = getShipmentModel();

    const shippingCost = randomInt(50, 500);
    const codAmount = overrides.paymentType === 'cod'
        ? overrides.codAmount || randomInt(500, 5000)
        : undefined;

    const shipmentData = {
        trackingNumber: overrides.trackingNumber || uniqueId('SC'),
        orderId: new mongoose.Types.ObjectId(orderId),
        companyId: new mongoose.Types.ObjectId(companyId),
        carrier: overrides.carrier || 'Velocity Shipfast',
        serviceType: overrides.serviceType || 'standard',
        packageDetails: {
            weight: randomInt(1, 100) / 10,
            dimensions: {
                length: randomInt(5, 50),
                width: randomInt(5, 50),
                height: randomInt(5, 30),
            },
            packageCount: 1,
            packageType: 'box',
            declaredValue: randomInt(500, 10000),
        },
        pickupDetails: {
            pickupDate: randomFutureDate(7),
            contactPerson: randomName(),
            contactPhone: randomPhone(),
        },
        deliveryDetails: {
            recipientName: randomName(),
            recipientPhone: randomPhone(),
            recipientEmail: randomEmail(),
            address: {
                line1: randomAddress(),
                line2: '',
                city: randomCity(),
                state: randomState(),
                country: 'India',
                postalCode: randomPincode(),
            },
            instructions: 'Handle with care',
        },
        paymentDetails: {
            type: overrides.paymentType || 'prepaid',
            codAmount,
            shippingCost,
            currency: 'INR',
        },
        currentStatus: overrides.currentStatus || 'created',
        estimatedDelivery: randomFutureDate(5),
        carrierDetails: {
            carrierTrackingNumber: `VS${randomNumeric(12)}`,
            carrierServiceType: 'EXPRESS',
        },
        ...overrides,
    };

    return Shipment.create(shipmentData);
};

/**
 * Create multiple test shipments
 */
export const createTestShipments = async (
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string,
    count: number,
    overrides: CreateTestShipmentOptions = {}
): Promise<any[]> => {
    const shipments = [];
    for (let i = 0; i < count; i++) {
        shipments.push(await createTestShipment(orderId, companyId, overrides));
    }
    return shipments;
};

/**
 * Create a COD shipment
 */
export const createTestCodShipment = async (
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string,
    codAmount: number = 1000,
    overrides: CreateTestShipmentOptions = {}
): Promise<any> => {
    return createTestShipment(orderId, companyId, {
        ...overrides,
        paymentType: 'cod',
        codAmount,
    });
};

/**
 * Create shipments with various statuses for testing
 */
export const createTestShipmentsWithStatuses = async (
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string
): Promise<Record<string, any>> => {
    const statuses = [
        'created',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'rto_initiated',
    ];
    const shipments: Record<string, any> = {};

    for (const status of statuses) {
        shipments[status] = await createTestShipment(orderId, companyId, { currentStatus: status });
    }

    return shipments;
};

/**
 * Create a shipment with NDR (Non-Delivery Report) details
 */
export const createTestNdrShipment = async (
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string,
    ndrReason: string = 'Customer not available',
    overrides: CreateTestShipmentOptions = {}
): Promise<any> => {
    const shipment = await createTestShipment(orderId, companyId, {
        ...overrides,
        currentStatus: 'ndr',
    });

    // Add NDR details
    shipment.ndrDetails = {
        ndrReason,
        ndrDate: new Date(),
        ndrStatus: 'pending',
        ndrAttempts: 1,
        ndrComments: 'Customer not available at delivery address',
    };

    return shipment.save();
};
