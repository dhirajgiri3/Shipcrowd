/**
 * Unit Tests for Velocity Reports API
 * 
 * Tests:
 * - getSummaryReport()
 */

import mongoose from 'mongoose';
import { VelocityShipfastProvider } from '../../../src/infrastructure/external/couriers/velocity/velocity-shipfast.provider';
import { VelocityReportsResponse } from '../../../src/infrastructure/external/couriers/velocity/velocity.types';

jest.mock('../../../src/infrastructure/external/couriers/velocity/velocity.auth');

describe('Velocity Reports API', () => {
    let velocityProvider: VelocityShipfastProvider;
    let mockCompanyId: mongoose.Types.ObjectId;

    beforeEach(() => {
        mockCompanyId = new mongoose.Types.ObjectId();
        velocityProvider = new VelocityShipfastProvider(mockCompanyId);
    });

    describe('getSummaryReport', () => {
        it('should fetch forward shipment summary', async () => {
            const mockHttpClient = (velocityProvider as any).httpClient;
            const mockResponse: VelocityReportsResponse = {
                date_range: {
                    start_date_time: '2026-01-01T00:00:00Z',
                    end_date_time: '2026-02-01T00:00:00Z'
                },
                shipment_type: 'forward',
                summary: {
                    pickup_pending: { count: 10, sum_of_prepaid_orders: 5000, sum_of_cod_orders: 3000 },
                    in_transit: { count: 50, sum_of_prepaid_orders: 25000, sum_of_cod_orders: 15000 },
                    delivered: { count: 100, sum_of_prepaid_orders: 50000, sum_of_cod_orders: 30000 },
                    total_shipments: 160
                }
            };

            mockHttpClient.post = jest.fn().mockResolvedValue({ data: mockResponse });

            const startDate = new Date('2026-01-01');
            const endDate = new Date('2026-02-01');
            const result = await velocityProvider.getSummaryReport(startDate, endDate, 'forward');

            expect(result.shipment_type).toBe('forward');
            expect(result.summary.total_shipments).toBe(160);
            expect(result.summary.delivered?.count).toBe(100);
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/custom/api/v1/reports',
                expect.objectContaining({
                    shipment_type: 'forward',
                    start_date_time: startDate.toISOString(),
                    end_date_time: endDate.toISOString()
                })
            );
        });

        it('should fetch return shipment summary', async () => {
            const mockHttpClient = (velocityProvider as any).httpClient;
            const mockResponse: VelocityReportsResponse = {
                date_range: {
                    start_date_time: '2026-01-01T00:00:00Z',
                    end_date_time: '2026-02-01T00:00:00Z'
                },
                shipment_type: 'return',
                summary: {
                    return_pickup_scheduled: { count: 5, sum_of_prepaid_orders: 2000, sum_of_cod_orders: 0 },
                    return_in_transit: { count: 3, sum_of_prepaid_orders: 1500, sum_of_cod_orders: 0 },
                    return_delivered: { count: 2, sum_of_prepaid_orders: 1000, sum_of_cod_orders: 0 },
                    total_shipments: 10
                }
            };

            mockHttpClient.post = jest.fn().mockResolvedValue({ data: mockResponse });

            const result = await velocityProvider.getSummaryReport(
                new Date('2026-01-01'),
                new Date('2026-02-01'),
                'return'
            );

            expect(result.shipment_type).toBe('return');
            expect(result.summary.total_shipments).toBe(10);
        });

        it('should handle empty results', async () => {
            const mockHttpClient = (velocityProvider as any).httpClient;
            mockHttpClient.post = jest.fn().mockResolvedValue({
                data: {
                    date_range: {
                        start_date_time: '2026-01-01T00:00:00Z',
                        end_date_time: '2026-02-01T00:00:00Z'
                    },
                    shipment_type: 'forward',
                    summary: {
                        total_shipments: 0
                    }
                }
            });

            const result = await velocityProvider.getSummaryReport(
                new Date('2026-01-01'),
                new Date('2026-02-01'),
                'forward'
            );

            expect(result.summary.total_shipments).toBe(0);
        });
    });
});
