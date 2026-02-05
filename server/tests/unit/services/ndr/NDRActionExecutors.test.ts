/**
 * NDRActionExecutors Unit Tests
 * Tests for all NDR action execution methods
 */
import NDRActionExecutors from '../../../../src/core/application/services/ndr/actions/ndr-action-executors';
import ExotelClient from '../../../../src/infrastructure/external/communication/exotel/exotel.client';
import WhatsAppService from '../../../../src/infrastructure/external/communication/whatsapp/whatsapp.service';
import TokenService from '../../../../src/shared/services/token.service';
import { NDREvent } from '../../../../src/infrastructure/database/mongoose/models';
import mongoose from 'mongoose';

jest.mock('../../../../src/infrastructure/external/communication/exotel/exotel.client', () => {
    return require('../../../mocks/exotel.mock');
});
jest.mock('../../../../src/infrastructure/external/communication/whatsapp/whatsapp.service', () => {
    return require('../../../mocks/whatsapp.mock');
});
jest.mock('../../../../src/core/application/services/communication/email.service', () => {
    return require('../../../mocks/email.mock');
});
jest.mock('../../../../src/shared/services/token.service');
jest.mock('../../../../src/core/application/services/communication/notification-preferences.service', () => ({
    default: { shouldSend: jest.fn().mockResolvedValue(true) },
}));
jest.mock('../../../../src/infrastructure/external/ai/openai/openai.service', () => ({
    isConfigured: jest.fn().mockReturnValue(false),
    generateCustomerMessage: jest.fn().mockResolvedValue({ message: 'Test message' }),
}));
jest.mock('../../../../src/infrastructure/database/mongoose/models', () => {
    const actual = jest.requireActual('../../../../src/infrastructure/database/mongoose/models');
    return {
        ...actual,
        CallLog: { create: jest.fn().mockResolvedValue({}) },
        Shipment: { findById: jest.fn().mockResolvedValue({ carrier: 'velocity-shipfast' }) },
    };
});
jest.mock('../../../../src/core/application/services/courier/courier.factory', () => ({
    CourierFactory: {
        getProvider: jest.fn().mockResolvedValue({
            requestReattempt: jest.fn().mockResolvedValue({ success: true, message: 'Reattempt scheduled' }),
        }),
    },
}));
jest.mock('../../../../src/core/application/services/rto/rto.service', () => ({
    default: {
        triggerRTO: jest.fn().mockResolvedValue({
            rtoEventId: 'rto-123',
            reverseAwb: 'REV-AWB-456',
        }),
    },
}));



describe('NDRActionExecutors', () => {
    const mockContext = {
        ndrEvent: {
            _id: new mongoose.Types.ObjectId(),
            shipment: new mongoose.Types.ObjectId(),
            awb: 'TEST123',
            ndrReason: 'Address not found',
            customerContacted: false,
            save: jest.fn().mockResolvedValue(undefined),
            triggerRTO: jest.fn().mockResolvedValue(undefined),
        },
        customer: {
            name: 'John Doe',
            phone: '+919876543210',
            email: 'john@example.com',
        },
        orderId: new mongoose.Types.ObjectId().toString(),
        companyId: new mongoose.Types.ObjectId().toString(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (mockContext.ndrEvent as any).save.mockResolvedValue(undefined);
        // Exotel real API: initiateCall(toNumber, callbackUrl?, customField?)
        (ExotelClient.prototype.initiateCall as jest.Mock).mockImplementation(
            (_to: string, _callbackUrl?: string, _customField?: string) =>
                Promise.resolve({ success: true, callSid: 'CALL123', status: 'queued' })
        );
    });

    describe('executeCallCustomer', () => {
        it('should call customer successfully via Exotel', async () => {
            const mockCallSid = 'CALL123';
            (ExotelClient.prototype.initiateCall as jest.Mock).mockResolvedValue({
                success: true,
                callSid: mockCallSid,
                status: 'queued',
            });

            const result = await NDRActionExecutors['executeCallCustomer'](mockContext as any, {});

            expect(result.success).toBe(true);
            expect(result.actionType).toBe('call_customer');
            expect(result.result).toBe('success');
            expect(result.metadata?.callSid).toBe(mockCallSid);
            expect(ExotelClient.prototype.initiateCall).toHaveBeenCalledWith(
                mockContext.customer.phone,
                undefined,
                expect.any(String)
            );
        });

        it('should handle failed call attempt', async () => {
            (ExotelClient.prototype.initiateCall as jest.Mock).mockRejectedValue(
                new Error('Call failed')
            );

            const result = await NDRActionExecutors['executeCallCustomer'](mockContext as any, {});

            expect(result.success).toBe(false);
            expect(result.result).toBe('failed');
            expect(result.error).toContain('Call failed');
        });

        it('should pass callbackUrl and customField to Exotel when provided', async () => {
            const callbackUrl = 'https://api.example.com/exotel-callback';
            await NDRActionExecutors['executeCallCustomer'](mockContext as any, {
                callbackUrl,
            });

            expect(ExotelClient.prototype.initiateCall).toHaveBeenCalledWith(
                mockContext.customer.phone,
                callbackUrl,
                expect.stringContaining(mockContext.ndrEvent._id.toString())
            );
        });
    });

    describe('executeSendWhatsApp', () => {
        it('should send WhatsApp NDR notification successfully', async () => {
            (WhatsAppService.prototype.sendNDRNotification as jest.Mock).mockResolvedValue({
                success: true,
                messageId: 'MSG123',
            });

            const result = await NDRActionExecutors['executeSendWhatsApp'](mockContext as any, {});

            expect(result.success).toBe(true);
            expect(result.actionType).toBe('send_whatsapp');
            expect(result.metadata?.messageId).toBe('MSG123');
            expect(WhatsAppService.prototype.sendNDRNotification).toHaveBeenCalledWith(
                mockContext.customer.phone,
                mockContext.customer.name,
                mockContext.orderId,
                (mockContext.ndrEvent as any).ndrReason,
                expect.any(String)
            );
        });

        it('should handle failed NDR notification send', async () => {
            (WhatsAppService.prototype.sendNDRNotification as jest.Mock).mockResolvedValue({
                success: false,
                error: 'Message failed',
            });

            const result = await NDRActionExecutors['executeSendWhatsApp'](mockContext as any, {});

            expect(result.success).toBe(false);
            expect(result.error).toBe('Message failed');
        });
    });

    describe('executeSendEmail', () => {
        it('should send email successfully', async () => {
            const EmailService = require('../../../../src/core/application/services/communication/email.service').default;
            EmailService.sendEmail = jest.fn().mockResolvedValue(true);

            const result = await NDRActionExecutors['executeSendEmail'](mockContext as any, {});

            expect(result.success).toBe(true);
            expect(result.actionType).toBe('send_email');
            expect(result.result).toBe('success');
        });

        it('should skip if customer has no email', async () => {
            const contextNoEmail = {
                ...mockContext,
                customer: {
                    ...mockContext.customer,
                    email: undefined,
                },
            };

            const result = await NDRActionExecutors['executeSendEmail'](contextNoEmail as any, {});

            expect(result.result).toBe('skipped');
            expect(result.success).toBe(false);
            expect(result.error).toBe('No email address available');
        });
    });

    describe('executeUpdateAddress', () => {
        it('should generate magic link and send WhatsApp', async () => {
            const mockToken = 'test_token_123';
            const mockMagicLink = `https://example.com/update-address/${mockToken}`;

            (TokenService.generateAddressUpdateToken as jest.Mock).mockReturnValue(mockToken);
            (WhatsAppService.prototype.sendMessage as jest.Mock).mockResolvedValue({
                success: true,
                messageId: 'MSG123',
            });

            const result = await NDRActionExecutors['executeUpdateAddress'](mockContext as any, {});

            expect(result.success).toBe(true);
            expect(result.actionType).toBe('update_address');
            expect(TokenService.generateAddressUpdateToken).toHaveBeenCalledWith(
                String(mockContext.ndrEvent.shipment),
                mockContext.companyId,
                String(mockContext.ndrEvent._id)
            );
            expect(result.metadata?.token).toBe(mockToken);
            expect(result.metadata?.updateUrl).toContain(mockToken);
        });

        it('should handle token generation failure', async () => {
            (TokenService.generateAddressUpdateToken as jest.Mock).mockImplementation(() => {
                throw new Error('Token generation failed');
            });

            const result = await NDRActionExecutors['executeUpdateAddress'](mockContext as any, {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('Token generation failed');
        });
    });

    describe('executeRequestReattempt', () => {
        it('should request courier reattempt successfully', async () => {
            const result = await NDRActionExecutors['executeRequestReattempt'](mockContext as any, {});

            expect(result.success).toBe(true);
            expect(result.actionType).toBe('request_reattempt');
            expect(result.result).toBe('success');
        });

        it('should include AWB in metadata', async () => {
            const result = await NDRActionExecutors['executeRequestReattempt'](mockContext as any, {});

            expect(result.metadata?.awb).toBe(mockContext.ndrEvent.awb);
        });
    });

    describe('executeTriggerRTO', () => {
        it('should trigger RTO successfully', async () => {
            (WhatsAppService.prototype.sendRTONotification as jest.Mock).mockResolvedValue({
                success: true,
            });

            const result = await NDRActionExecutors['executeTriggerRTO'](mockContext as any, {});

            expect(result.success).toBe(true);
            expect(result.actionType).toBe('trigger_rto');
            expect(result.result).toBe('success');
            expect(result.metadata?.rtoEventId).toBe('rto-123');
            expect(result.metadata?.reverseAwb).toBe('REV-AWB-456');
        });

        it('should include RTO event and reverse AWB in metadata', async () => {
            (WhatsAppService.prototype.sendRTONotification as jest.Mock).mockResolvedValue({
                success: true,
            });

            const result = await NDRActionExecutors['executeTriggerRTO'](mockContext as any, {});

            expect(result.metadata?.rtoEventId).toBeDefined();
            expect(result.metadata?.reverseAwb).toBeDefined();
        });
    });

    describe('executeAction - Router', () => {
        it('should route to correct executor for call_customer', async () => {
            (ExotelClient.prototype.initiateCall as jest.Mock).mockResolvedValue({
                success: true,
                callSid: 'CALL123',
            });

            const result = await NDRActionExecutors.executeAction(
                'call_customer',
                mockContext as any,
                {}
            );

            expect(result.actionType).toBe('call_customer');
            expect(ExotelClient.prototype.initiateCall).toHaveBeenCalled();
        });

        it('should route to correct executor for send_whatsapp', async () => {
            (WhatsAppService.prototype.sendNDRNotification as jest.Mock).mockResolvedValue({
                success: true,
                messageId: 'MSG123',
            });

            const result = await NDRActionExecutors.executeAction(
                'send_whatsapp',
                mockContext as any,
                {}
            );

            expect(result.actionType).toBe('send_whatsapp');
            expect(WhatsAppService.prototype.sendNDRNotification).toHaveBeenCalled();
        });

        it('should handle unknown action type', async () => {
            const result = await NDRActionExecutors.executeAction(
                'unknown_action',
                mockContext as any,
                {}
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unknown action type');
        });
    });

    describe('recordActionResult', () => {
        it('should record successful action result via findByIdAndUpdate', async () => {
            const mockFindByIdAndUpdate = jest.fn().mockResolvedValue({});
            jest.spyOn(NDREvent, 'findByIdAndUpdate').mockImplementation(mockFindByIdAndUpdate as any);

            const actionResult = {
                success: true,
                actionType: 'call_customer',
                result: 'success' as const,
                metadata: { callSid: 'CALL123' },
            };

            const ndrEventId = new mongoose.Types.ObjectId().toString();
            await NDRActionExecutors.recordActionResult(ndrEventId, actionResult, 'system');

            expect(NDREvent.findByIdAndUpdate).toHaveBeenCalledWith(
                ndrEventId,
                expect.objectContaining({
                    $push: { resolutionActions: expect.objectContaining({ action: 'call_customer', result: 'success' }) },
                    $set: { status: 'in_resolution' },
                })
            );
        });
    });
});
