jest.mock('../../../../src/infrastructure/database/mongoose/models', () => ({
    Order: {
        aggregate: jest.fn(),
    },
    Shipment: {
        aggregate: jest.fn(),
    },
}));

jest.mock('../../../../src/core/application/services/analytics/order-analytics.service', () => ({
    __esModule: true,
    default: {
        getOrderStats: jest.fn(),
    },
}));

jest.mock('../../../../src/core/application/services/analytics/shipment-analytics.service', () => ({
    __esModule: true,
    default: {
        getCourierPerformance: jest.fn(),
    },
}));

jest.mock('../../../../src/core/application/services/ndr/ndr-analytics.service', () => ({
    __esModule: true,
    default: {
        getNDRStats: jest.fn(),
    },
}));

jest.mock('../../../../src/core/application/services/finance/cod-analytics.service', () => ({
    CODAnalyticsService: {
        getHealthMetrics: jest.fn(),
    },
}));

jest.mock('../../../../src/core/application/services/rto/rto.service', () => ({
    __esModule: true,
    default: {
        getRTOAnalytics: jest.fn(),
    },
}));

import SellerAnalyticsService from '../../../../src/core/application/services/analytics/seller-analytics.service';
import { Order, Shipment } from '../../../../src/infrastructure/database/mongoose/models';
import OrderAnalyticsService from '../../../../src/core/application/services/analytics/order-analytics.service';
import ShipmentAnalyticsService from '../../../../src/core/application/services/analytics/shipment-analytics.service';
import NDRAnalyticsService from '../../../../src/core/application/services/ndr/ndr-analytics.service';
import { CODAnalyticsService } from '../../../../src/core/application/services/finance/cod-analytics.service';
import RTOService from '../../../../src/core/application/services/rto/rto.service';

describe('SellerAnalyticsService', () => {
    const companyId = '507f1f77bcf86cd799439011';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCostAnalysis', () => {
        it('returns cost analysis with savings opportunities', async () => {
            (RTOService.getRTOAnalytics as jest.Mock)
                .mockResolvedValueOnce({ summary: { estimatedLoss: 1200 } })
                .mockResolvedValueOnce({ summary: { estimatedLoss: 900 } });

            (OrderAnalyticsService.getOrderStats as jest.Mock).mockResolvedValue({
                totalOrders: 40,
                averageOrderValue: 400,
            });

            (Shipment.aggregate as jest.Mock)
                .mockResolvedValueOnce([{ shipmentCount: 20, shippingCost: 6000, codCharges: 500, weightCharges: 300, fuelSurcharge: 200, otherCharges: 100 }])
                .mockResolvedValueOnce([{ shipmentCount: 15, shippingCost: 5000, codCharges: 450, weightCharges: 250, fuelSurcharge: 180, otherCharges: 90 }])
                .mockResolvedValueOnce([
                    { courierId: 'a', courierName: 'Courier A', shipmentCount: 12, cost: 5000, avgCostPerShipment: 416.67 },
                    { courierId: 'b', courierName: 'Courier B', shipmentCount: 8, cost: 2000, avgCostPerShipment: 250 },
                ])
                .mockResolvedValueOnce([{ zoneName: 'West', shipmentCount: 10, cost: 3000, avgCostPerShipment: 300 }])
                .mockResolvedValueOnce([{ _id: 'cod', count: 10, cost: 3400 }, { _id: 'prepaid', count: 10, cost: 3600 }])
                .mockResolvedValueOnce([{ date: '2026-02-10', totalCost: 900, shippingCost: 800, codCharges: 100 }]);

            const data = await SellerAnalyticsService.getCostAnalysis(companyId, {
                startDate: '2026-02-01',
                endDate: '2026-02-10',
            });

            expect(data.current.totalCost).toBeGreaterThan(0);
            expect(data.current.byCourier).toHaveLength(2);
            expect(data.current.byPaymentMethod.cod.count).toBe(10);
            expect(data.savingsOpportunities.length).toBeGreaterThan(0);
        });
    });

    describe('getCourierComparison', () => {
        it('returns courier-level recommendation', async () => {
            (Shipment.aggregate as jest.Mock).mockResolvedValue([
                {
                    _id: 'Courier A',
                    totalShipments: 100,
                    delivered: 95,
                    rto: 3,
                    ndr: 2,
                    damaged: 0,
                    lost: 0,
                    totalCost: 25000,
                    totalDeliveryHours: 4200,
                    deliveredWithTime: 95,
                    onTimeDelivered: 90,
                },
                {
                    _id: 'Courier B',
                    totalShipments: 80,
                    delivered: 68,
                    rto: 8,
                    ndr: 4,
                    damaged: 1,
                    lost: 0,
                    totalCost: 18000,
                    totalDeliveryHours: 4200,
                    deliveredWithTime: 68,
                    onTimeDelivered: 55,
                },
            ]);

            (CODAnalyticsService.getHealthMetrics as jest.Mock).mockResolvedValue({
                averageRemittanceTime: 2.8,
            });

            (ShipmentAnalyticsService.getCourierPerformance as jest.Mock).mockResolvedValue([]);

            const data = await SellerAnalyticsService.getCourierComparison(companyId, {
                startDate: '2026-02-01',
                endDate: '2026-02-10',
            });

            expect(data.couriers).toHaveLength(2);
            expect(data.recommendation?.overall).toBeDefined();
            expect(data.recommendation?.reasoning).toContain('leads');
        });
    });

    describe('getSLAPerformance', () => {
        it('builds SLA response with targets and statuses', async () => {
            (Shipment.aggregate as jest.Mock)
                .mockResolvedValueOnce([{ total: 100, onTimePickup: 97 }])
                .mockResolvedValueOnce([{ delivered: 90, onTime: 84 }])
                .mockResolvedValueOnce([{ _id: 'Courier A', total: 60, onTimePickup: 58, delivered: 55, onTimeDelivery: 52 }])
                .mockResolvedValueOnce([{ _id: 'Maharashtra', total: 60, delivered: 55, onTimeDelivery: 50, totalDeliveryHours: 2640 }])
                .mockResolvedValueOnce([{ _id: '2026-02-10', total: 20, onTimePickup: 19, delivered: 18, onTimeDelivery: 16 }]);

            (NDRAnalyticsService.getNDRStats as jest.Mock).mockResolvedValue({
                avgResolutionTime: 3.2,
            });

            (CODAnalyticsService.getHealthMetrics as jest.Mock).mockResolvedValue({
                averageRemittanceTime: 2.5,
            });

            const data = await SellerAnalyticsService.getSLAPerformance(companyId, {
                startDate: '2026-02-01',
                endDate: '2026-02-10',
            });

            expect(data.pickupSLA.target).toBe(98);
            expect(data.deliverySLA.target).toBe(95);
            expect(data.ndrResponseSLA.target).toBe(4);
            expect(data.codSettlementSLA.target).toBe(3);
            expect(data.byCourier[0].courierName).toBe('Courier A');
            expect(data.timeSeries).toHaveLength(1);
        });
    });

    describe('resolveDateRange', () => {
        it('uses explicit start/end date when provided', () => {
            const range = SellerAnalyticsService.resolveDateRange({
                startDate: '2026-02-01',
                endDate: '2026-02-10',
            });

            const inputStart = new Date('2026-02-01T00:00:00.000Z').getTime();
            const inputEnd = new Date('2026-02-10T00:00:00.000Z').getTime();

            expect(range.start.getTime()).toBeLessThanOrEqual(inputStart);
            expect(range.end.getTime()).toBeGreaterThan(inputEnd);
            expect(range.start.getTime()).toBeLessThan(range.end.getTime());
        });
    });
});
