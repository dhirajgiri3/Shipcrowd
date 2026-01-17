/**
 * Analytics Hooks
 * 
 * Hooks for fetching and managing analytics data.
 * Currently uses mock data until backend endpoints are ready.
 */

import { useQuery } from '@tanstack/react-query';
import { addDays, format, subDays } from 'date-fns';
import { useState } from 'react';
import {
    CostAnalysisData,
    CourierPerformance,
    DateRange,
    ReportConfig,
    ReportDataPoint,
    SLASummary,
    TimeRange
} from '@/src/types/analytics.types';

// ==========================================
// MOCK DATA GENERATORS
// ==========================================

const generateHistory = (days: number, base: number, variance: number) => {
    return Array.from({ length: days }).map((_, i) => ({
        date: format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd'),
        value: base + (Math.random() * variance * 2 - variance)
    }));
};

const mockSLAData: SLASummary = {
    pickupCompliance: {
        type: 'pickup',
        label: 'Pickup within 24h',
        target: 98,
        actual: 95.4,
        compliance: 97.3,
        trend: 1.2,
        status: 'warning',
        history: generateHistory(14, 95, 3)
    },
    deliveryCompliance: {
        type: 'delivery',
        label: 'Delivery within EDD',
        target: 95,
        actual: 92.1,
        compliance: 96.9,
        trend: -0.5,
        status: 'compliant',
        history: generateHistory(14, 92, 4)
    },
    ndrResponseTime: {
        type: 'ndr',
        label: 'NDR Response Time',
        target: 4, // hours
        actual: 2.5,
        compliance: 100,
        trend: 0.8,
        status: 'compliant',
        history: generateHistory(14, 3, 1)
    },
    codSettlementTime: {
        type: 'cod',
        label: 'COD Settlement',
        target: 3, // days
        actual: 4.2,
        compliance: 80,
        trend: -1.5,
        status: 'breached',
        history: generateHistory(14, 4, 1)
    }
};

const mockCourierData: CourierPerformance[] = [
    {
        courierId: 'smartr',
        courierName: 'Smartr Logistics',
        color: '#F97316', // orange-500
        metrics: {
            deliverySuccessRate: 98.2,
            avgDeliveryTime: 2.4, // days
            rtoRate: 1.8,
            ndrRate: 4.5,
            avgCostPerKg: 45,
            codRemittanceTime: 2,
            lostDamagedRate: 0.1
        }
    },
    {
        courierId: 'delhivery',
        courierName: 'Delhivery Surface',
        color: '#EF4444', // red-500
        metrics: {
            deliverySuccessRate: 94.5,
            avgDeliveryTime: 3.2,
            rtoRate: 5.5,
            ndrRate: 8.2,
            avgCostPerKg: 38,
            codRemittanceTime: 3,
            lostDamagedRate: 0.3
        }
    },
    {
        courierId: 'bluedart',
        courierName: 'BlueDart Air',
        color: '#3B82F6', // blue-500
        metrics: {
            deliverySuccessRate: 99.1,
            avgDeliveryTime: 1.8,
            rtoRate: 0.9,
            ndrRate: 2.1,
            avgCostPerKg: 85,
            codRemittanceTime: 2,
            lostDamagedRate: 0.05
        }
    },
    {
        courierId: 'ekart',
        courierName: 'Ekart Logistics',
        color: '#10B981', // green-500
        metrics: {
            deliverySuccessRate: 96.8,
            avgDeliveryTime: 2.9,
            rtoRate: 3.2,
            ndrRate: 5.4,
            avgCostPerKg: 42,
            codRemittanceTime: 4,
            lostDamagedRate: 0.2
        }
    }
];

const mockCostData: CostAnalysisData = {
    totalSpend: 125430,
    avgCostPerOrder: 68.5,
    costPerZone: [
        { category: 'Zone A', amount: 45000, percentage: 35.8 },
        { category: 'Zone B', amount: 35000, percentage: 27.9 },
        { category: 'Zone C', amount: 25000, percentage: 19.9 },
        { category: 'Zone D', amount: 15430, percentage: 12.3 },
        { category: 'Zone E', amount: 5000, percentage: 4.1 }
    ],
    costPerCourier: [
        { category: 'Delhivery', amount: 55000, percentage: 43.8 },
        { category: 'Smartr', amount: 35000, percentage: 27.9 },
        { category: 'Ekart', amount: 25000, percentage: 19.9 },
        { category: 'BlueDart', amount: 10430, percentage: 8.4 }
    ],
    paymentModeSplit: {
        prepaid: 45000,
        cod: 80430
    },
    trend: Array.from({ length: 30 }).map((_, i) => ({
        date: format(subDays(new Date(), 29 - i), 'MMM dd'),
        shipping: 3000 + Math.random() * 1000,
        rto: 500 + Math.random() * 200,
        codFees: 800 + Math.random() * 300,
        other: 100 + Math.random() * 50
    }))
};

// ==========================================
// HOOKS
// ==========================================

export function useAnalyticsParams() {
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');
    const [dateRange, setDateRange] = useState<DateRange>({
        from: subDays(new Date(), 30),
        to: new Date()
    });

    const handleTimeRangeChange = (range: TimeRange) => {
        setTimeRange(range);
        const today = new Date();
        switch (range) {
            case '7d':
                setDateRange({ from: subDays(today, 7), to: today });
                break;
            case '30d':
                setDateRange({ from: subDays(today, 30), to: today });
                break;
            case '90d':
                setDateRange({ from: subDays(today, 90), to: today });
                break;
            // MTD and YTD implementation omitted for brevity
            default:
                break;
        }
    };

    return {
        timeRange,
        setTimeRange: handleTimeRangeChange,
        dateRange,
        setDateRange
    };
}

export function useSLAData(dateRange: DateRange) {
    return useQuery({
        queryKey: ['analytics', 'sla', dateRange],
        queryFn: async () => {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800));
            return mockSLAData;
        },
        staleTime: 5 * 60 * 1000 // 5 minutes
    });
}

export function useCourierComparison(dateRange: DateRange) {
    return useQuery({
        queryKey: ['analytics', 'courier-comparison', dateRange],
        queryFn: async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return mockCourierData;
        },
        staleTime: 5 * 60 * 1000
    });
}

export function useCostAnalysis(dateRange: DateRange) {
    return useQuery({
        queryKey: ['analytics', 'costs', dateRange],
        queryFn: async () => {
            await new Promise(resolve => setTimeout(resolve, 1200));
            return mockCostData;
        },
        staleTime: 5 * 60 * 1000
    });
}

export function useCustomReport(config: ReportConfig | null) {
    return useQuery({
        queryKey: ['analytics', 'custom-report', config],
        queryFn: async () => {
            if (!config) return null;
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mock report data based on chart type
            const isTimeSeries = ['line', 'bar', 'area'].includes(config.chartType);
            const count = isTimeSeries ? 30 : 5;

            return Array.from({ length: count }).map((_, i) => {
                const point: ReportDataPoint = {
                    date: isTimeSeries
                        ? format(subDays(new Date(), count - 1 - i), 'yyyy-MM-dd')
                        : `Category ${i + 1}`
                };

                config.metrics.forEach(metric => {
                    point[metric] = Math.floor(Math.random() * 1000);
                });

                return point;
            });
        },
        enabled: !!config,
        staleTime: 5 * 60 * 1000
    });
}
