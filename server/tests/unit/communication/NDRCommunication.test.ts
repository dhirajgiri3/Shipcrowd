/**
 * Unit Tests for NDR Communication Service
 * 
 * Tests:
 * - SMS channel support
 * - Multi-channel notifications (all)
 * - Template-based messaging
 */

import NDRCommunicationService from '../../../src/core/application/services/communication/ndr-communication.service';
import { Shipment } from '../../../src/infrastructure/database/mongoose/models';
import mongoose from 'mongoose';

jest.mock('../../../src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model');
jest.mock('../../../src/core/application/services/communication/sms.service', () => ({
    default: {
        sendSMS: jest.fn().mockResolvedValue(true)
    }
}));
jest.mock('../../../src/infrastructure/external/whatsapp/whatsapp.service', () => ({
    default: {
        sendWhatsAppMessage: jest.fn().mockResolvedValue(true)
    }
}));
jest.mock('../../../src/shared/helpers/email', () => ({
    sendEmail: jest.fn().mockResolvedValue(true)
}));

describe('NDR Communication Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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

            (Shipment.findById as jest.Mock).mockResolvedValue(mockShipment);

            const SMSService = require('../../../src/core/application/services/communication/sms.service').default;

            const result = await NDRCommunicationService.sendNDRNotification({
                shipmentId: mockShipment._id.toString(),
                channel: 'sms',
                templateType: 'ndr_alert'
            });

            expect(SMSService.sendSMS).toHaveBeenCalledWith(
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

            (Shipment.findById as jest.Mock).mockResolvedValue(mockShipment);

            const SMSService = require('../../../src/core/application/services/communication/sms.service').default;
            const WhatsAppService = require('../../../src/infrastructure/external/whatsapp/whatsapp.service').default;
            const { sendEmail } = require('../../../src/shared/helpers/email');

            const result = await NDRCommunicationService.sendNDRNotification({
                shipmentId: mockShipment._id.toString(),
                channel: 'all',
                templateType: 'action_required'
            });

            expect(SMSService.sendSMS).toHaveBeenCalled();
            expect(WhatsAppService.sendWhatsAppMessage).toHaveBeenCalled();
            expect(sendEmail).toHaveBeenCalled();
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

            (Shipment.findById as jest.Mock).mockResolvedValue(mockShipment);

            const SMSService = require('../../../src/core/application/services/communication/sms.service').default;

            // Test RTO template
            await NDRCommunicationService.sendNDRNotification({
                shipmentId: mockShipment._id.toString(),
                channel: 'sms',
                templateType: 'rto'
            });

            expect(SMSService.sendSMS).toHaveBeenCalledWith(
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

            (Shipment.findById as jest.Mock).mockResolvedValue(mockShipment);

            const SMSService = require('../../../src/core/application/services/communication/sms.service').default;
            const { sendEmail } = require('../../../src/shared/helpers/email');

            // Mock SMS failure
            SMSService.sendSMS.mockRejectedValueOnce(new Error('SMS service down'));

            const result = await NDRCommunicationService.sendNDRNotification({
                shipmentId: mockShipment._id.toString(),
                channel: 'all',
                templateType: 'ndr_alert'
            });

            // Should still send email even if SMS fails
            expect(sendEmail).toHaveBeenCalled();
            expect(result.channelsSent).toContain('email');
            expect(result.channelsSent).not.toContain('sms');
        });
    });
});
