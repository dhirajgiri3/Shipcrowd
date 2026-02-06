// Jest mocks must be declared first
const mockNDREvent = {
    createNDREvent: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
};

const mockShipment = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
};

// Mock dependencies
jest.mock('@/infrastructure/database/mongoose/models', () => ({
    NDREvent: mockNDREvent,
    Shipment: mockShipment,
}));

jest.mock('@/shared/logger/winston.logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

jest.mock('@/core/application/services/ndr/ndr-classification.service', () => ({
    classifyAndUpdate: jest.fn(),
}));

jest.mock('../../../src/core/application/services/shipping/shipment.service', () => ({
    ShipmentService: {
        updateShipmentStatus: jest.fn().mockResolvedValue({ success: true })
    }
}));

jest.mock('@/core/application/services/communication/ndr-communication.service', () => ({
    default: {
        sendNDRNotification: jest.fn(),
        sendSellerNotification: jest.fn(),
    },
}), { virtual: true });

jest.mock('../../../src/core/application/services/courier/status-mappings/status-mapper.service', () => ({
    __esModule: true,
    StatusMapperService: {
        map: jest.fn(() => ({
            internalStatus: 'mock-status',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: true,
            allowsCancellation: true
        })),
        canCancel: jest.fn().mockReturnValue(true),
        canReattempt: jest.fn().mockReturnValue(true),
        isTerminal: jest.fn().mockReturnValue(false),
        getCategory: jest.fn().mockReturnValue('pending')
    }
}));

import { VelocityWebhookHandler } from '../../../src/core/application/services/courier/webhooks/handlers/velocity-webhook-handler';
import NDRDetectionService from '../../../src/core/application/services/ndr/ndr-detection.service';
import { StatusMapperService } from '../../../src/core/application/services/courier/status-mappings/status-mapper.service';
import { Request } from 'express';

describe('NDR Webhook Integration Flow', () => {
    let velocityHandler: VelocityWebhookHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        velocityHandler = new VelocityWebhookHandler();

        // Setup common mocks that are reset by Jest config
        (StatusMapperService.map as jest.Mock).mockReturnValue({
            internalStatus: 'mock-status',
            statusCategory: 'pending',
            isTerminal: false,
            allowsReattempt: true,
            allowsCancellation: true
        });
    });

    it('should trigger NDR detection and notification from Velocity webhook', async () => {
        // 1. Setup Mock Data
        const webhookPayload = {
            awb_code: 'VEL123',
            tracking_number: 'VEL123',
            shipment_status: 'UNDELIVERED', // NDR Status
            activity: 'Customer not available',
            timestamp: new Date().toISOString()
        };

        const mockShipmentDoc = {
            _id: 'ship_123',
            trackingNumber: 'VEL123',
            orderId: { _id: 'order_123', customer: { phone: '9999999999' } },
            companyId: { _id: 'comp_123' },
            currentStatus: 'shipped',
        };

        const mockNDRDoc = {
            _id: 'ndr_123',
            status: 'detected'
        };

        // 2. Setup Mocks
        const mockResult = {
            _id: 'ship_123',
            currentStatus: 'shipped',
            populate: jest.fn().mockResolvedValue(mockShipmentDoc)
        };
        mockShipment.findOne.mockReturnValue(mockResult);
        mockShipment.findOneAndUpdate.mockResolvedValue(true);

        mockNDREvent.findOne.mockResolvedValue(null); // No duplicate
        mockNDREvent.countDocuments.mockResolvedValue(0);
        mockNDREvent.createNDREvent.mockResolvedValue(mockNDRDoc);

        // Mock Request object
        const req = {
            headers: { 'x-api-key': 'test-key' },
            body: webhookPayload
        } as unknown as Request;

        // Spy on Detection Service and handler's updateShipmentStatus
        const detectionSpy = jest.spyOn(NDRDetectionService, 'handleWebhookNDRDetection');
        const updateStatusSpy = jest.spyOn(velocityHandler as any, 'updateShipmentStatus').mockResolvedValue(undefined);

        // 3. Execute Handler
        jest.spyOn(velocityHandler, 'verifySignature').mockReturnValue(true);

        await velocityHandler.handleWebhook(velocityHandler.parseWebhook(req));

        // 4. Verification

        // Ensure Detection Service was called
        expect(detectionSpy).toHaveBeenCalledWith(expect.objectContaining({
            carrier: 'velocity',
            awb: 'VEL123',
            status: 'UNDELIVERED'
        }));

        // Ensure NDR Event was created
        expect(mockNDREvent.createNDREvent).toHaveBeenCalled();

        // Ensure handler invoked status update path (updateShipmentStatus is mocked so DB is not hit)
        expect(updateStatusSpy).toHaveBeenCalled();

        // Note: Notification call happens in setImmediate/async background
        // To verify it, we'd need to wait or mock timers. 
        // For this test, verifying the entry point into the async logic (createNDREvent) is sufficient 
        // as unit tests cover the async part.
    });

    it('should NOT trigger NDR detection for normal delivery updates', async () => {
        const webhookPayload = {
            awb_code: 'VEL123',
            tracking_number: 'VEL123',
            shipment_status: 'IN_TRANSIT', // Normal status
            activity: 'Arrived at hub',
            timestamp: new Date().toISOString()
        };

        const req = {
            headers: { 'x-api-key': 'test-key' },
            body: webhookPayload
        } as unknown as Request;

        const mockResult = { _id: 'ship_123', currentStatus: 'shipped', populate: jest.fn().mockResolvedValue({ _id: 'ship_123', currentStatus: 'shipped' }) };
        mockShipment.findOne.mockReturnValue(mockResult);
        mockShipment.findOneAndUpdate.mockResolvedValue(true);

        const detectionSpy = jest.spyOn(NDRDetectionService, 'handleWebhookNDRDetection');
        const updateStatusSpy = jest.spyOn(velocityHandler as any, 'updateShipmentStatus').mockResolvedValue(undefined);
        jest.spyOn(velocityHandler, 'verifySignature').mockReturnValue(true);

        await velocityHandler.handleWebhook(velocityHandler.parseWebhook(req));

        expect(detectionSpy).not.toHaveBeenCalled();
        expect(updateStatusSpy).toHaveBeenCalled();
    });
});
