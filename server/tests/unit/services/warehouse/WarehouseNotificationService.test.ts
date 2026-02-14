import WarehouseNotificationService from '../../../../src/core/application/services/warehouse/warehouse-notification.service';

jest.mock('../../../../src/infrastructure/external/communication/whatsapp/whatsapp.service');

describe('WarehouseNotificationService', () => {
    let sendMessageSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        sendMessageSpy = jest
            .spyOn((WarehouseNotificationService as any).whatsapp, 'sendMessage')
            .mockResolvedValue({ success: true });
    });

    afterEach(() => {
        sendMessageSpy.mockRestore();
    });

    describe('notifyRTOIncoming', () => {
        it('should send WhatsApp notification for RTO incoming', async () => {
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

            expect(sendMessageSpy).toHaveBeenCalled();
            const messageContent = sendMessageSpy.mock.calls[0][1];
            expect(messageContent).toContain('RTO Incoming');
            expect(messageContent).toContain('AWB123456');
        });

        it('should send address change notification', async () => {
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

            expect(sendMessageSpy).toHaveBeenCalled();
            const messageContent = sendMessageSpy.mock.calls[0][1];
            expect(messageContent).toContain('Address Updated');
            expect(messageContent).toContain('Pune');
        });

        it('should handle notification failures gracefully', async () => {
            sendMessageSpy.mockRejectedValue(new Error('WhatsApp API error'));

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
