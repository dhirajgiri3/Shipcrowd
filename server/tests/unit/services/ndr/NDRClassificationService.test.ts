import NDRClassificationService from '../../../../src/core/application/services/ndr/ndr-classification.service';
import OpenAIService from '../../../../src/infrastructure/external/ai/openai/openai.service';
import { NDREvent } from '../../../../src/infrastructure/database/mongoose/models';

// Mock OpenAI Service
jest.mock('../../../../src/infrastructure/external/ai/openai/openai.service');
jest.mock('../../../../src/infrastructure/database/mongoose/models/ndr-event.model');

describe('NDRClassificationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('classifyNDRReason with OpenAI', () => {
        it('should classify "wrong address" as address_issue', async () => {
            // Mock OpenAI response
            (OpenAIService.classifyNDRReason as jest.Mock).mockResolvedValue({
                category: 'address_issue',
                explanation: 'Address is incorrect or incomplete',
            });

            const mockNDREvent = {
                _id: 'ndr123',
                ndrReason: 'wrong address provided',
                courierRemarks: 'Address not found',
                ndrReasonClassified: '',
                ndrType: '' as any,
                save: jest.fn().mockResolvedValue(true),
            };
            (NDREvent.findById as jest.Mock).mockResolvedValue(mockNDREvent);

            await NDRClassificationService.classifyAndUpdate('ndr123');

            expect(mockNDREvent.ndrReasonClassified).toBe('Address is incorrect or incomplete');
            expect(mockNDREvent.ndrType).toBe('address_issue');
            expect(mockNDREvent.save).toHaveBeenCalled();
        });

        it('should classify "customer unavailable" as customer_unavailable', async () => {
            (OpenAIService.classifyNDRReason as jest.Mock).mockResolvedValue({
                category: 'customer_unavailable',
                explanation: 'Customer was not available to receive delivery',
            });

            const mockNDREvent = {
                _id: 'ndr124',
                ndrReason: 'customer not available',
                courierRemarks: 'Phone switched off',
                ndrReasonClassified: '',
                ndrType: '' as any,
                save: jest.fn().mockResolvedValue(true),
            };
            (NDREvent.findById as jest.Mock).mockResolvedValue(mockNDREvent);

            await NDRClassificationService.classifyAndUpdate('ndr124');

            expect(mockNDREvent.ndrReasonClassified).toBe('Customer was not available to receive delivery');
            expect(mockNDREvent.ndrType).toBe('customer_unavailable');
        });

        it('should classify "refused delivery" as refused', async () => {
            (OpenAIService.classifyNDRReason as jest.Mock).mockResolvedValue({
                category: 'refused',
                explanation: 'Customer refused to accept the package',
            });

            const mockNDREvent = {
                _id: 'ndr125',
                ndrReason: 'customer refused package',
                courierRemarks: 'Rejected delivery',
                ndrReasonClassified: '',
                ndrType: '' as any,
                save: jest.fn().mockResolvedValue(true),
            };
            (NDREvent.findById as jest.Mock).mockResolvedValue(mockNDREvent);

            await NDRClassificationService.classifyAndUpdate('ndr125');

            expect(mockNDREvent.ndrReasonClassified).toBe('Customer refused to accept the package');
            expect(mockNDREvent.ndrType).toBe('refused');
        });

        it('should fallback to keyword matching if OpenAI fails', async () => {
            // Mock OpenAI to throw error
            (OpenAIService.classifyNDRReason as jest.Mock).mockRejectedValue(
                new Error('OpenAI API timeout')
            );

            const mockNDREvent = {
                _id: 'ndr126',
                ndrReason: 'wrong address',
                courierRemarks: 'Address incomplete',
                ndrReasonClassified: '',
                ndrType: '' as any,
                save: jest.fn().mockResolvedValue(true),
            };
            (NDREvent.findById as jest.Mock).mockResolvedValue(mockNDREvent);

            await NDRClassificationService.classifyAndUpdate('ndr126');

            // Should use fallback keyword matching
            expect(mockNDREvent.ndrType).toBe('address_issue'); // "address" keyword
            expect(mockNDREvent.save).toHaveBeenCalled();
        });

        it('should handle OpenAI API timeout gracefully', async () => {
            (OpenAIService.classifyNDRReason as jest.Mock).mockImplementation(() => {
                return new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Timeout')), 100);
                });
            });

            const mockNDREvent = {
                _id: 'ndr127',
                ndrReason: 'delivery failed',
                courierRemarks: 'Customer not reachable',
                ndrReasonClassified: '',
                ndrType: '' as any,
                save: jest.fn().mockResolvedValue(true),
            };
            (NDREvent.findById as jest.Mock).mockResolvedValue(mockNDREvent);

            await NDRClassificationService.classifyAndUpdate('ndr127');

            // Should fallback to keyword matching
            expect(mockNDREvent.ndrType).toBeDefined();
            expect(mockNDREvent.save).toHaveBeenCalled();
        });
    });

    describe('batchClassify', () => {
        it('should classify multiple unclassified NDRs', async () => {
            const mockNDREvents = [
                {
                    _id: 'ndr1',
                    ndrReason: 'address issue',
                    ndrType: undefined,
                },
                {
                    _id: 'ndr2',
                    ndrReason: 'customer unavailable',
                    ndrType: undefined,
                },
            ];

            const mockFindResult = {
                limit: jest.fn().mockResolvedValue(mockNDREvents)
            };
            (NDREvent.find as jest.Mock).mockReturnValue(mockFindResult);

            // Mock classifyAndUpdate
            const classifySpy = jest.spyOn(NDRClassificationService, 'classifyAndUpdate')
                .mockResolvedValue(undefined);

            const result = await NDRClassificationService.batchClassify(10);

            expect(result).toBe(2);
            expect(classifySpy).toHaveBeenCalledTimes(2);
        });
    });
});
