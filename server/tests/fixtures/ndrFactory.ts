/**
 * NDR Event Factory
 * Creates test data for NDREvent model
 */
import mongoose from 'mongoose';

// Import model lazily
const getNDREventModel = () => mongoose.model('NDREvent');

export interface CreateTestNDREventOptions {
    awb?: string;
    ndrReason?: string;
    ndrType?: 'address_issue' | 'customer_unavailable' | 'refused' | 'payment_issue' | 'other';
    status?: 'detected' | 'in_resolution' | 'resolved' | 'escalated' | 'rto_triggered';
    attemptNumber?: number;
    customerContacted?: boolean;
}

/**
 * Create a test NDR event
 */
export const createTestNDREvent = async (
    shipmentId: mongoose.Types.ObjectId | string,
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string,
    overrides: CreateTestNDREventOptions = {}
): Promise<any> => {
    const NDREvent = getNDREventModel();

    const ndrData = {
        shipment: new mongoose.Types.ObjectId(shipmentId),
        order: new mongoose.Types.ObjectId(orderId),
        company: new mongoose.Types.ObjectId(companyId),
        awb: overrides.awb || `AWB${Date.now()}`,
        ndrReason: overrides.ndrReason || 'Customer not available',
        ndrReasonClassified: 'Customer unavailable at address',
        ndrType: overrides.ndrType || 'customer_unavailable',
        detectedAt: new Date(),
        status: overrides.status || 'detected',
        attemptNumber: overrides.attemptNumber || 1,
        resolutionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        customerContacted: overrides.customerContacted || false,
        classificationSource: 'keyword' as 'openai' | 'keyword' | 'manual',
        ...overrides,
    };

    return NDREvent.create(ndrData);
};

/**
 * Create NDR event with specific type
 */
export const createTestNDREventByType = async (
    shipmentId: mongoose.Types.ObjectId | string,
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string,
    type: 'address_issue' | 'customer_unavailable' | 'refused' | 'payment_issue' | 'other'
): Promise<any> => {
    const reasons: Record<string, string> = {
        address_issue: 'Wrong address provided',
        customer_unavailable: 'Customer not available',
        refused: 'Customer refused delivery',
        payment_issue: 'COD amount not available',
        other: 'Other reason',
    };

    return createTestNDREvent(shipmentId, orderId, companyId, {
        ndrType: type,
        ndrReason: reasons[type],
    });
};

/**
 * Create multiple NDR events with different statuses
 */
export const createTestNDREventsWithStatuses = async (
    shipmentId: mongoose.Types.ObjectId | string,
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string
): Promise<Record<string, any>> => {
    const statuses = ['detected', 'in_resolution', 'resolved', 'escalated', 'rto_triggered'] as const;
    const ndrEvents: Record<string, any> = {};

    for (const status of statuses) {
        ndrEvents[status] = await createTestNDREvent(shipmentId, orderId, companyId, { status });
    }

    return ndrEvents;
};

/**
 * Create NDR event with resolution actions
 */
export const createTestNDREventWithActions = async (
    shipmentId: mongoose.Types.ObjectId | string,
    orderId: mongoose.Types.ObjectId | string,
    companyId: mongoose.Types.ObjectId | string
): Promise<any> => {
    const ndrEvent = await createTestNDREvent(shipmentId, orderId, companyId, {
        status: 'in_resolution',
        customerContacted: true,
    });

    ndrEvent.resolutionActions = [
        {
            action: 'Called customer',
            actionType: 'call_customer',
            takenAt: new Date(),
            takenBy: 'system',
            result: 'success',
        },
        {
            action: 'Sent WhatsApp message',
            actionType: 'send_whatsapp',
            takenAt: new Date(),
            takenBy: 'system',
            result: 'success',
        },
    ];

    return ndrEvent.save();
};
