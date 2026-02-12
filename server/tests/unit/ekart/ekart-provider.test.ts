/**
 * Unit Tests for EkartProvider - New Methods
 * 
 * Tests cover:
 * - Manifest generation (with chunking)
 * - NDR actions (reattempt, RTO)
 * - Label generation (PDF and JSON formats)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EkartProvider } from '@/infrastructure/external/couriers/ekart/ekart.provider';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('@/infrastructure/external/couriers/ekart/ekart.auth');
jest.mock('@/infrastructure/external/couriers/ekart/ekart-error-handler', () => ({
    handleEkartError: (error: any) => error,
    waitForRateLimit: jest.fn(),
}));
jest.mock('@/infrastructure/database/mongoose/models/courier-idempotency.model');

describe('EkartProvider - New Methods', () => {
    let provider: EkartProvider;
    const mockCompanyId = new mongoose.Types.ObjectId();

    beforeEach(() => {
        provider = new EkartProvider(mockCompanyId, {
            baseUrl: 'https://test.ekart.com',
            clientId: 'test-client',
            username: 'test-user',
            password: 'test-pass'
        });
    });

    describe('generateManifest', () => {
        it('should generate manifest for valid AWBs', async () => {
            const trackingIds = ['AWB001', 'AWB002', 'AWB003'];

            // Mock axios response
            const mockResponse = {
                data: {
                    manifestNumber: 12345,
                    manifestDownloadUrl: 'https://ekart.com/manifest/12345.pdf',
                    ctime: Date.now()
                }
            };

            jest.spyOn(provider['axiosInstance'], 'post').mockResolvedValue(mockResponse);

            const result = await provider.generateManifest(trackingIds);

            expect(result.manifestNumber).toBe(12345);
            expect(result.downloadUrl).toBe('https://ekart.com/manifest/12345.pdf');
            expect(result.ctime).toBeDefined();
        });

        it('should chunk AWBs into batches of 100', async () => {
            const trackingIds = Array.from({ length: 250 }, (_, i) => `AWB${i}`);

            const mockResponse = {
                data: {
                    manifestNumber: 12345,
                    manifestDownloadUrl: 'https://ekart.com/manifest/12345.pdf',
                    ctime: Date.now()
                }
            };

            const postSpy = jest.spyOn(provider['axiosInstance'], 'post').mockResolvedValue(mockResponse);

            await provider.generateManifest(trackingIds);

            // Should be called 3 times (100 + 100 + 50)
            expect(postSpy).toHaveBeenCalledTimes(3);
        });

        it('should throw error for empty tracking IDs', async () => {
            await expect(provider.generateManifest([])).rejects.toThrow('At least one tracking ID is required');
        });

        it('should handle API errors gracefully', async () => {
            const trackingIds = ['AWB001'];

            jest.spyOn(provider['axiosInstance'], 'post').mockRejectedValue(
                new Error('API Error')
            );

            await expect(provider.generateManifest(trackingIds)).rejects.toThrow();
        });
    });

    describe('requestReattempt', () => {
        it('should send NDR action with correct payload', async () => {
            const trackingNumber = 'AWB123';
            const preferredDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
            const instructions = 'Call before delivery';

            const mockResponse = {
                data: {
                    status: true,
                    remark: 'Reattempt scheduled',
                    tracking_id: trackingNumber
                }
            };

            const postSpy = jest.spyOn(provider['axiosInstance'], 'post').mockResolvedValue(mockResponse);

            const result = await provider.requestReattempt(trackingNumber, preferredDate, instructions);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Reattempt scheduled');
            expect(postSpy).toHaveBeenCalledWith('/api/v2/package/ndr', {
                action: 'Re-Attempt',
                wbn: trackingNumber,
                date: preferredDate.getTime(),
                instructions
            });
        });

        it('should validate date is within 7 days', async () => {
            const trackingNumber = 'AWB123';
            const invalidDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

            const result = await provider.requestReattempt(trackingNumber, invalidDate);

            expect(result.success).toBe(false);
            expect(result.message).toContain('within 7 days');
        });

        it('should handle success response', async () => {
            const trackingNumber = 'AWB123';

            const mockResponse = {
                data: {
                    status: true,
                    remark: 'Success',
                    tracking_id: trackingNumber
                }
            };

            jest.spyOn(provider['axiosInstance'], 'post').mockResolvedValue(mockResponse);

            const result = await provider.requestReattempt(trackingNumber);

            expect(result.success).toBe(true);
            expect(result.uplId).toBe(trackingNumber);
        });

        it('should handle API errors', async () => {
            const trackingNumber = 'AWB123';

            jest.spyOn(provider['axiosInstance'], 'post').mockRejectedValue(
                new Error('Network error')
            );

            const result = await provider.requestReattempt(trackingNumber);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Network error');
        });
    });

    describe('requestRTO', () => {
        it('should send RTO action with correct payload', async () => {
            const trackingNumber = 'AWB123';

            const mockResponse = {
                data: {
                    status: true,
                    remark: 'RTO initiated'
                }
            };

            const postSpy = jest.spyOn(provider['axiosInstance'], 'post').mockResolvedValue(mockResponse);

            const result = await provider.requestRTO(trackingNumber);

            expect(result.success).toBe(true);
            expect(result.message).toBe('RTO initiated');
            expect(postSpy).toHaveBeenCalledWith('/api/v2/package/ndr', {
                action: 'RTO',
                wbn: trackingNumber
            });
        });

        it('should handle API errors', async () => {
            const trackingNumber = 'AWB123';

            jest.spyOn(provider['axiosInstance'], 'post').mockRejectedValue(
                new Error('API Error')
            );

            const result = await provider.requestRTO(trackingNumber);

            expect(result.success).toBe(false);
        });
    });

    describe('getLaneServiceability', () => {
        it('should return lane-level result with high confidence when API succeeds', async () => {
            const mockLaneOptions = [
                {
                    courierGroup: 'Ekart Standard',
                    forwardDeliveredCharges: {
                        zone: 'D',
                        total: '120',
                    },
                    tat: {
                        minDays: 3,
                        maxDays: 5,
                    },
                },
            ];

            jest.spyOn(provider['axiosInstance'], 'post').mockResolvedValue({ data: mockLaneOptions } as any);

            const result = await provider.getLaneServiceability({
                pickupPincode: '560001',
                dropPincode: '110001',
                weight: 0.5,
                paymentMode: 'cod',
            });

            expect(result.serviceable).toBe(true);
            expect(result.source).toBe('lane');
            expect(result.confidence).toBe('high');
            expect(result.zone).toBe('D');
            expect(result.options).toHaveLength(1);
        });

        it('should fallback to pincode check with medium confidence when lane API fails', async () => {
            jest.spyOn(provider['axiosInstance'], 'post').mockRejectedValue(new Error('lane endpoint down'));
            jest.spyOn(provider as any, 'checkServiceability').mockResolvedValue(true);

            const result = await provider.getLaneServiceability({
                pickupPincode: '560001',
                dropPincode: '110001',
                weight: 1,
                paymentMode: 'prepaid',
            });

            expect(result.serviceable).toBe(true);
            expect(result.source).toBe('pincode');
            expect(result.confidence).toBe('medium');
            expect(result.options).toEqual([]);
        });
    });

    describe('getLabel', () => {
        it('should return PDF buffer for pdf format', async () => {
            const trackingIds = ['AWB001', 'AWB002'];
            const mockPdfData = Buffer.from('PDF content');

            const mockResponse = {
                data: mockPdfData
            };

            jest.spyOn(provider['axiosInstance'], 'post').mockResolvedValue(mockResponse);

            const result = await provider.getLabel(trackingIds, 'pdf');

            expect(result.pdfBuffer).toBeDefined();
            expect(result.labels).toBeUndefined();
        });

        it('should return label URLs for json format', async () => {
            const trackingIds = ['AWB001', 'AWB002'];
            const mockLabels = [
                { tracking_id: 'AWB001', label_url: 'https://ekart.com/label1.pdf' },
                { tracking_id: 'AWB002', label_url: 'https://ekart.com/label2.pdf' }
            ];

            const mockResponse = {
                data: mockLabels
            };

            jest.spyOn(provider['axiosInstance'], 'post').mockResolvedValue(mockResponse);

            const result = await provider.getLabel(trackingIds, 'json');

            expect(result.labels).toEqual(mockLabels);
            expect(result.pdfBuffer).toBeUndefined();
        });

        it('should throw error for empty tracking IDs', async () => {
            await expect(provider.getLabel([])).rejects.toThrow('At least one tracking ID is required');
        });

        it('should throw error for more than 100 AWBs', async () => {
            const trackingIds = Array.from({ length: 101 }, (_, i) => `AWB${i}`);

            await expect(provider.getLabel(trackingIds)).rejects.toThrow('Maximum 100 tracking IDs allowed per request');
        });

        it('should handle API errors', async () => {
            const trackingIds = ['AWB001'];

            jest.spyOn(provider['axiosInstance'], 'post').mockRejectedValue(
                new Error('API Error')
            );

            await expect(provider.getLabel(trackingIds)).rejects.toThrow();
        });
    });

    describe('getRates service type mapping', () => {
        it('maps express serviceType hint to EXPRESS request payload', async () => {
            const postSpy = jest.spyOn(provider['axiosInstance'], 'post').mockResolvedValue({
                data: {
                    shippingCharge: '100',
                    taxes: '18',
                    total: '118',
                    zone: 'D',
                },
            } as any);

            const result = await provider.getRates({
                origin: { pincode: '560001' },
                destination: { pincode: '110001' },
                package: { weight: 1, length: 10, width: 10, height: 10 },
                paymentMode: 'prepaid',
                serviceType: 'express',
            });

            expect(postSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ serviceType: 'EXPRESS' })
            );
            expect(result[0].serviceType).toBe('Express');
        });

        it('prefers providerServiceId when it is a valid Ekart service type', async () => {
            const postSpy = jest.spyOn(provider['axiosInstance'], 'post').mockResolvedValue({
                data: {
                    shippingCharge: '120',
                    taxes: '21.6',
                    total: '141.6',
                    zone: 'A',
                },
            } as any);

            await provider.getRates({
                origin: { pincode: '560001' },
                destination: { pincode: '110001' },
                package: { weight: 1, length: 10, width: 10, height: 10 },
                paymentMode: 'prepaid',
                serviceType: 'express',
                providerServiceId: 'SURFACE',
            });

            expect(postSpy).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ serviceType: 'SURFACE' })
            );
        });
    });
});
