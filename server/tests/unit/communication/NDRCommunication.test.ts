/**
 * Unit Tests for NDR Communication Service
 */

const mockFindById = jest.fn();
const mockSendSMS = jest.fn().mockResolvedValue(true);
const mockSendWhatsAppMessage = jest.fn().mockResolvedValue(true);

jest.mock('../../../src/infrastructure/database/mongoose/models', () => {
    const actual = jest.requireActual('../../../src/infrastructure/database/mongoose/models');
    return {
        ...actual,
        Shipment: { findById: mockFindById },
    };
});
jest.mock('../../../src/core/application/services/communication/sms.service', () => ({
    __esModule: true,
    default: { sendSMS: mockSendSMS },
}));
jest.mock('../../../src/core/application/services/communication/whatsapp.service', () => ({
    __esModule: true,
    default: { sendWhatsAppMessage: mockSendWhatsAppMessage },
}));
jest.mock('../../../src/core/application/services/communication/email.service', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../../src/core/application/services/communication/notification-preferences.service', () => ({
    default: { shouldSend: jest.fn().mockResolvedValue(true) },
}));
jest.mock('../../../src/core/application/services/ndr/ndr-magic-link.service', () => ({
    __esModule: true,
    default: { generateMagicLink: jest.fn().mockReturnValue('https://example.com/ndr/magic-link') },
}));

import NDRCommunicationService from '../../../src/core/application/services/communication/ndr-communication.service';
import mongoose from 'mongoose';

describe('NDR Communication Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSendSMS.mockResolvedValue(true);
        mockSendWhatsAppMessage.mockResolvedValue(true);
        mockFindById.mockResolvedValue(null);
    });

    describe('sendNDRNotification', () => {
        it('should send SMS notification for NDR alert', async () => {
            const mockShipment = {
                _id: new mongoose.Types.ObjectId(),
                trackingNumber: 'VEL123456789',
                deliveryDetails: {
                    recipientName: 'John Doe',
                    recipientPhone: '9123456789',
                    recipientEmail: 'john@test.com'
                },
                carrierDetails: {
                    carrierTrackingNumber: 'VEL123456789'
                },
                ndrDetails: {
                    ndrReason: 'Customer not available'
                }
            };

            mockFindById.mockResolvedValue(mockShipment);

            const result = await NDRCommunicationService.sendNDRNotification({
                ndrEventId: 'ndr-event-123',
                shipmentId: mockShipment._id.toString(),
                channel: 'sms',
                templateType: 'ndr_alert'
            });

            expect(mockSendSMS).toHaveBeenCalledWith(
                '9123456789',
                expect.stringContaining('delivery for VEL123456789 failed')
            );
            expect(result.channelsSent).toContain('sms');
            expect(result.success).toBe(true);
        });

        it('should send multi-channel notification when channel is "all"', async () => {
            const mockShipment = {
                _id: new mongoose.Types.ObjectId(),
                trackingNumber: 'VEL123456789',
                deliveryDetails: {
                    recipientName: 'Jane Smith',
                    recipientPhone: '9987654321',
                    recipientEmail: 'jane@test.com'
                },
                carrierDetails: {
                    carrierTrackingNumber: 'VEL123456789'
                },
                ndrDetails: {
                    ndrReason: 'Address incomplete'
                }
            };

            mockFindById.mockResolvedValue(mockShipment);

            const result = await NDRCommunicationService.sendNDRNotification({
                ndrEventId: 'ndr-event-123',
                shipmentId: mockShipment._id.toString(),
                channel: 'all',
                templateType: 'action_required'
            });

            expect(mockSendSMS).toHaveBeenCalled();
            expect(mockSendWhatsAppMessage).toHaveBeenCalled();
            expect(result.channelsSent).toContain('sms');
            expect(result.channelsSent).toContain('whatsapp');
            expect(result.channelsSent).toContain('email');
        });

        it('should format SMS message correctly for different templates', async () => {
            const mockShipment = {
                _id: new mongoose.Types.ObjectId(),
                trackingNumber: 'VEL111222333',
                deliveryDetails: {
                    recipientName: 'Test User',
                    recipientPhone: '9999999999'
                },
                ndrDetails: {
                    ndrReason: 'Wrong address'
                }
            };

            mockFindById.mockResolvedValue(mockShipment);

            // Test RTO template
            await NDRCommunicationService.sendNDRNotification({
                ndrEventId: 'ndr-event-123',
                shipmentId: mockShipment._id.toString(),
                channel: 'sms',
                templateType: 'rto'
            });

            expect(mockSendSMS).toHaveBeenCalledWith(
                '9999999999',
                expect.stringContaining('being returned')
            );
        });

        it('should handle SMS service failure gracefully', async () => {
            const mockShipment = {
                _id: new mongoose.Types.ObjectId(),
                trackingNumber: 'VEL444555666',
                deliveryDetails: {
                    recipientName: 'Error User',
                    recipientPhone: '9000000000',
                    recipientEmail: 'error@test.com'
                },
                ndrDetails: {
                    ndrReason: 'Test reason'
                }
            };

            mockFindById.mockResolvedValue(mockShipment);

            mockSendSMS.mockRejectedValueOnce(new Error('SMS service down'));

            const result = await NDRCommunicationService.sendNDRNotification({
                ndrEventId: 'ndr-event-123',
                shipmentId: mockShipment._id.toString(),
                channel: 'all',
                templateType: 'ndr_alert'
            });

            expect(result.channelsSent).toContain('email');
            expect(result.channelsSent).not.toContain('sms');
        });
    });
});
