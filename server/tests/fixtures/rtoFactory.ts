/**
 * RTO Event Factory
 * Creates test data for RTOEvent model
 */
import mongoose from 'mongoose';

// Import model lazily
const getRTOEventModel = () => mongoose.model('RTOEvent');

export interface CreateTestRTOEventOptions {
    rtoReason?: 'ndr_unresolved' | 'customer_cancellation' | 'qc_failure' | 'refused' | 'damaged_in_transit' | 'incorrect_product' | 'other';
    returnStatus?: 'initiated' | 'in_transit' | 'delivered_to_warehouse' | 'qc_pending' | 'qc_completed' | 'restocked' | 'disposed';
    triggeredBy?: 'auto' | 'manual';
    rtoCharges?: number;
    reverseAwb?: string;
    warehouseId?: mongoose.Types.ObjectId | string;
}

/**
 * Create a test RTO event
 */
export const createTestRTOEvent = async (
    shipmentId: mongoose.Types.ObjectId | string,
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string,
    warehouseId: mongoose.Types.ObjectId | string,
    overrides: CreateTestRTOEventOptions = {}
): Promise<any> => {
    const RTOEvent = getRTOEventModel();

    const rtoData = {
        shipment: new mongoose.Types.ObjectId(shipmentId),
        order: new mongoose.Types.ObjectId(orderId),
        company: new mongoose.Types.ObjectId(companyId),
        warehouse: new mongoose.Types.ObjectId(warehouseId),
        rtoReason: overrides.rtoReason || 'ndr_unresolved',
        triggeredBy: overrides.triggeredBy || 'auto',
        triggeredAt: new Date(),
        rtoCharges: overrides.rtoCharges || 75,
        chargesDeducted: false,
        returnStatus: overrides.returnStatus || 'initiated',
        reverseAwb: overrides.reverseAwb || `RTO${Date.now()}`,
        expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        customerNotified: true,
        warehouseNotified: true,
        ...overrides,
    };

    return RTOEvent.create(rtoData);
};

/**
 * Create RTO event by reason type
 */
export const createTestRTOEventByReason = async (
    shipmentId: mongoose.Types.ObjectId | string,
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string,
    warehouseId: mongoose.Types.ObjectId | string,
    reason: 'ndr_unresolved' | 'customer_cancellation' | 'qc_failure' | 'refused' | 'damaged_in_transit' | 'incorrect_product' | 'other'
): Promise<any> => {
    return createTestRTOEvent(shipmentId, orderId, companyId, warehouseId, {
        rtoReason: reason,
    });
};

/**
 * Create RTO events with different statuses
 */
export const createTestRTOEventsWithStatuses = async (
    shipmentId: mongoose.Types.ObjectId | string,
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string,
    warehouseId: mongoose.Types.ObjectId | string
): Promise<Record<string, any>> => {
    const statuses = ['initiated', 'in_transit', 'delivered_to_warehouse', 'qc_completed', 'restocked'] as const;
    const rtoEvents: Record<string, any> = {};

    for (const status of statuses) {
        rtoEvents[status] = await createTestRTOEvent(shipmentId, orderId, companyId, warehouseId, {
            returnStatus: status,
        });
    }

    return rtoEvents;
};

/**
 * Create RTO event with QC result
 */
export const createTestRTOEventWithQC = async (
    shipmentId: mongoose.Types.ObjectId | string,
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string,
    warehouseId: mongoose.Types.ObjectId | string,
    qcPassed: boolean = true
): Promise<any> => {
    const rtoEvent = await createTestRTOEvent(shipmentId, orderId, companyId, warehouseId, {
        returnStatus: 'qc_completed',
    });

    rtoEvent.qcResult = {
        passed: qcPassed,
        remarks: qcPassed ? 'Item in good condition' : 'Item damaged',
        images: ['https://example.com/qc1.jpg'],
        inspectedBy: 'QC_TEAM',
        inspectedAt: new Date(),
    };

    return rtoEvent.save();
};

/**
 * Create RTO event delivered to warehouse
 */
export const createTestRTOEventDelivered = async (
    shipmentId: mongoose.Types.ObjectId | string,
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string,
    warehouseId: mongoose.Types.ObjectId | string
): Promise<any> => {
    return createTestRTOEvent(shipmentId, orderId, companyId, warehouseId, {
        returnStatus: 'delivered_to_warehouse',
        actualReturnDate: new Date(),
    });
};
