/**
 * NDRActionExecutors Unit Tests
 * Tests for all NDR action execution methods
 */
import NDRActionExecutors from '../../../../src/core/application/services/ndr/actions/ndr-action-executors';
import ExotelClient from '../../../../src/infrastructure/external/communication/exotel/exotel.client';
import WhatsAppService from '../../../../src/infrastructure/external/communication/whatsapp/whatsapp.service';
import TokenService from '../../../../src/shared/services/token.service';
import { createTestNDREvent } from '../../../fixtures/ndrFactory';
import mongoose from 'mongoose';

// Mock external services with manual mocks
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



describe('NDRActionExecutors', () => {
    const mockContext = {
        ndrEvent: {
            _id: new mongoose.Types.ObjectId(),
            shipment: new mongoose.Types.ObjectId(),
            awb: 'TEST123',
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

        it('should use custom agent number from config', async () => {
            const customAgentNumber = '+919999999999';
            await NDRActionExecutors['executeCallCustomer'](mockContext as any, {
                agentNumber: customAgentNumber,
            });

            expect(ExotelClient.prototype.initiateCall).toHaveBeenCalledWith(
                mockContext.customer.phone,
                customAgentNumber
            );
        });
    });

    describe('executeSendWhatsApp', () => {
        it('should send WhatsApp message successfully', async () => {
            (WhatsAppService.prototype.sendMessage as jest.Mock).mockResolvedValue({
                success: true,
                messageId: 'MSG123',
                status: 'sent',
            });

            const result = await NDRActionExecutors['executeSendWhatsApp'](mockContext as any, {});

            expect(result.success).toBe(true);
            expect(result.actionType).toBe('send_whatsapp');
            expect(result.metadata?.messageId).toBe('MSG123');
        });

        it('should handle failed message send', async () => {
            (WhatsAppService.prototype.sendMessage as jest.Mock).mockRejectedValue(
                new Error('Message failed')
            );

            const result = await NDRActionExecutors['executeSendWhatsApp'](mockContext as any, {});

            expect(result.success).toBe(false);
            expect(result.error).toContain('Message failed');
        });

        it('should use custom message template', async () => {
            const customTemplate = 'custom_template';
            await NDRActionExecutors['executeSendWhatsApp'](mockContext as any, {
                templateName: customTemplate,
            });

            expect(WhatsAppService.prototype.sendMessage).toHaveBeenCalledWith(
                mockContext.customer.phone,
                expect.objectContaining({
                    templateName: customTemplate,
                })
            );
        });
    });

    describe('executeSendEmail', () => {
        it('should send email successfully', async () => {
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
            expect(result.metadata?.reason).toBe('No email provided');
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
            expect(result.metadata?.magicLink).toContain(mockToken);
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
            const result = await NDRActionExecutors['executeTriggerRTO'](mockContext as any, {});

            expect(result.success).toBe(true);
            expect(result.actionType).toBe('trigger_rto');
            expect(result.result).toBe('success');
        });

        it('should include RTO reason in metadata', async () => {
            const result = await NDRActionExecutors['executeTriggerRTO'](mockContext as any, {
                rtoReason: 'ndr_unresolved',
            });

            expect(result.metadata?.rtoReason).toBe('ndr_unresolved');
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
            (WhatsAppService.prototype.sendMessage as jest.Mock).mockResolvedValue({
                success: true,
                messageId: 'MSG123',
            });

            const result = await NDRActionExecutors.executeAction(
                'send_whatsapp',
                mockContext as any,
                {}
            );

            expect(result.actionType).toBe('send_whatsapp');
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
        it('should record successful action result', async () => {
            const mockNDREvent = {
                _id: new mongoose.Types.ObjectId(),
                resolutionActions: [],
                save: jest.fn().mockResolvedValue(true),
            };

            // Mock NDREvent.findById
            const mockFindById = jest.fn().mockResolvedValue(mockNDREvent);
            (mongoose.model as jest.Mock) = jest.fn(() => ({
                findById: mockFindById,
            }));

            const actionResult = {
                success: true,
                actionType: 'call_customer',
                result: 'success' as const,
                metadata: { callSid: 'CALL123' },
            };

            await NDRActionExecutors.recordActionResult(
                mockNDREvent._id.toString(),
                actionResult,
                'system'
            );

            expect(mockNDREvent.resolutionActions).toHaveLength(1);
            expect(mockNDREvent.save).toHaveBeenCalled();
        });
    });
});
