import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import NDRDetectionService from '../../../../src/core/application/services/ndr/ndr-detection.service';
import { NDREvent } from '../../../../src/infrastructure/database/mongoose/models';
import NDRClassificationService from '../../../../src/core/application/services/ndr/ndr-classification.service';
import logger from '../../../../src/shared/logger/winston.logger';
import { Shipment } from '../../../../src/infrastructure/database/mongoose/models';

// Mock dependencies
jest.mock('../../../../src/infrastructure/database/mongoose/models', () => ({
    NDREvent: {
        findOne: jest.fn(),
        countDocuments: jest.fn(),
        createNDREvent: jest.fn(),
        getPendingNDRs: jest.fn(),
        getExpiredNDRs: jest.fn(),
    },
    Shipment: {
        findOne: jest.fn(),
    }
}));

jest.mock('../../../../src/core/application/services/ndr/ndr-classification.service', () => ({
    classifyAndUpdate: jest.fn(),
}));

jest.mock('../../../../src/shared/logger/winston.logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

// Mock dynamic imports
jest.mock('../../../../src/core/application/services/communication/ndr-communication.service.js', () => ({
    default: {
        sendNDRNotification: jest.fn(),
        sendSellerNotification: jest.fn(),
    },
}), { virtual: true });


describe('NDRDetectionService', () => {
    let mockShipment: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockShipment = {
            _id: 'shipment_123',
            trackingNumber: 'AWB123',
            orderId: {
                _id: 'order_123',
                customer: {
                    name: 'John Doe',
                    phone: '9876543210'
                }
            },
            companyId: {
                _id: 'company_123'
            },
            currentStatus: 'shipped',
        };

        (Shipment.findOne as jest.Mock).mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockShipment),
        } as any);
    });

    describe('isNDRStatus', () => {
        it('should return true for known NDR status codes', () => {
            const ndrStatuses = ['undelivered', 'delivery_failed', 'rto_initiated', 'refused'];
            ndrStatuses.forEach(status => {
                expect(NDRDetectionService.isNDRStatus(status)).toBe(true);
            });
        });

        it('should return true when remarks contain NDR keywords', () => {
            const status = 'random_status';
            const remarks = 'Customer not available at home';
            expect(NDRDetectionService.isNDRStatus(status, remarks)).toBe(true);
        });

        it('should return false for non-NDR status and remarks', () => {
            expect(NDRDetectionService.isNDRStatus('delivered', 'Delivered successfully')).toBe(false);
            expect(NDRDetectionService.isNDRStatus('shipped', 'In transit')).toBe(false);
        });

        it('should be case insensitive', () => {
            expect(NDRDetectionService.isNDRStatus('UNDELIVERED')).toBe(true);
            expect(NDRDetectionService.isNDRStatus('status', 'CUSTOMER REFUSED')).toBe(true);
        });
    });

    describe('handleWebhookNDRDetection', () => {
        const webhookData = {
            carrier: 'velocity',
            awb: 'AWB123',
            status: 'UNDELIVERED',
            remarks: 'Customer refused',
            timestamp: new Date()
        };

        it('should detect NDR and create event when valid NDR webhook is received', async () => {
            (NDREvent.findOne as jest.Mock).mockResolvedValue(null); // No duplicate
            (NDREvent.countDocuments as jest.Mock).mockResolvedValue(0); // 1st attempt
            (NDREvent.createNDREvent as jest.Mock).mockResolvedValue({ _id: 'ndr_123' });

            const result = await NDRDetectionService.handleWebhookNDRDetection(webhookData);

            expect(result.created).toBe(true);
            expect(NDREvent.createNDREvent).toHaveBeenCalled();
            expect(Shipment.findOne).toHaveBeenCalledWith(expect.objectContaining({
                $or: expect.arrayContaining([{ trackingNumber: 'AWB123' }])
            }));
        });

        it('should return created: false if shipment not found', async () => {
            (Shipment.findOne as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(null),
            } as any);

            const result = await NDRDetectionService.handleWebhookNDRDetection(webhookData);

            expect(result.created).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Shipment not found'), expect.any(Object));
        });

        it('should return created: false if duplicate NDR exists within 24h', async () => {
            (NDREvent.findOne as jest.Mock).mockResolvedValue({ _id: 'existing_ndr' }); // Duplicate exists

            const result = await NDRDetectionService.handleWebhookNDRDetection(webhookData);

            expect(result.created).toBe(false);
            expect(NDREvent.createNDREvent).not.toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Duplicate NDR'), expect.any(Object));
        });
    });

    describe('extractNDRReason', () => {
        it('should prefer remarks if long enough', () => {
            const status = 'undelivered';
            const remarks = 'Customer refused delivery due to damage';
            expect(NDRDetectionService.extractNDRReason(status, remarks)).toBe(remarks);
        });

        it('should use formatted status if remarks are missing or too short', () => {
            expect(NDRDetectionService.extractNDRReason('undelivered', 'short')).toBe('undelivered');
            expect(NDRDetectionService.extractNDRReason('delivery_failed')).toBe('delivery failed');
            expect(NDRDetectionService.extractNDRReason('customerRefused')).toBe('customer Refused');
        });
    });
});
