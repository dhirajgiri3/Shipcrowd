import WarehouseNotificationService from '../../../../src/core/application/services/warehouse/WarehouseNotificationService';
import WhatsAppService from '../../../../src/infrastructure/integrations/communication/WhatsAppService';

jest.mock('../../../../src/infrastructure/integrations/communication/WhatsAppService');

describe('WarehouseNotificationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('notifyRTOIncoming', () => {
        it('should send WhatsApp notification for RTO incoming', async () => {
            const mockSendMessage = jest.fn().mockResolvedValue({ success: true });
            (WhatsAppService.prototype.sendMessage as jest.Mock) = mockSendMessage;

            await WarehouseNotificationService.notifyRTOIncoming(
                'rto123',
                'warehouse123',
                {
                    awb: 'AWB123456',
                    reverseAwb: 'RAWB654321',
                    expectedReturnDate: new Date('2026-01-10'),
                    rtoReason: 'customer_cancellation',
                    requiresQC: true,
                }
            );

            expect(mockSendMessage).toHaveBeenCalled();
            const messageContent = mockSendMessage.mock.calls[0][1];
            expect(messageContent).toContain('RTO Incoming');
            expect(messageContent).toContain('AWB123456');
        });

        it('should send address change notification', async () => {
            const mockSendMessage = jest.fn().mockResolvedValue({ success: true });
            (WhatsAppService.prototype.sendMessage as jest.Mock) = mockSendMessage;

            const oldAddress = {
                street: '123 Old Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                country: 'India',
            };

            const newAddress = {
                street: '456 New Street',
                city: 'Pune',
                state: 'Maharashtra',
                pincode: '411001',
                country: 'India',
            };

            await WarehouseNotificationService.notifyAddressChanged(
                'shipment123',
                oldAddress,
                newAddress
            );

            expect(mockSendMessage).toHaveBeenCalled();
            const messageContent = mockSendMessage.mock.calls[0][1];
            expect(messageContent).toContain('Address Updated');
            expect(messageContent).toContain('Pune');
        });

        it('should handle notification failures gracefully', async () => {
            const mockSendMessage = jest.fn().mockRejectedValue(new Error('WhatsApp API error'));
            (WhatsAppService.prototype.sendMessage as jest.Mock) = mockSendMessage;

            // Should not throw error even if notification fails
            await expect(
                WarehouseNotificationService.notifyRTOIncoming(
                    'rto124',
                    'warehouse124',
                    {
                        awb: 'AWB123457',
                        expectedReturnDate: new Date(),
                        rtoReason: 'ndr_unresolved',
                        requiresQC: true,
                    }
                )
            ).resolves.not.toThrow();
        });
    });
});
