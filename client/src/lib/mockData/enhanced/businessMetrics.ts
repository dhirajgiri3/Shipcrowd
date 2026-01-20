/**
 * Business Metrics - Realistic seller performance data
 * Indian market context with realistic patterns
 */

export interface DailyMetric {
    date: string;
    orders: number;
    revenue: number;
    shippingCost: number;
    profit: number;
    rtoCount: number;
    codAmount: number;
}

export interface WeeklyMetric {
    week: string;
    orders: number;
    revenue: number;
    avgOrderValue: number;
    topZone: string;
    topCourier: string;
}

export interface MonthlyMetric {
    month: string;
    orders: number;
    revenue: number;
    shippingCost: number;
    profit: number;
    rtoRate: number;
    avgDeliveryTime: number;
}

/**
 * Generate last 30 days of daily metrics
 */
export function generateDailyMetrics(days: number = 30): DailyMetric[] {
    const metrics: DailyMetric[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        // Realistic Indian e-commerce patterns
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const baseOrders = isWeekend ? 25 : 45;
        const orders = Math.floor(baseOrders + Math.random() * 20);

        const avgOrderValue = 650 + Math.random() * 200;
        const revenue = Math.floor(orders * avgOrderValue);

        // Realistic shipping cost: ₹50-80 per order
        const avgShippingCost = 55 + Math.random() * 25;
        const shippingCost = Math.floor(orders * avgShippingCost);

        const profit = revenue - shippingCost;

        // RTO: 5-8% of orders
        const rtoCount = Math.floor(orders * (0.05 + Math.random() * 0.03));

        // COD: 65% of orders, avg value ₹600
        const codOrders = Math.floor(orders * 0.65);
        const codAmount = Math.floor(codOrders * 600);

        metrics.push({
            date: date.toISOString().split('T')[0],
            orders,
            revenue,
            shippingCost,
            profit,
            rtoCount,
            codAmount
        });
    }

    return metrics;
}

/**
 * Generate weekly summary metrics
 */
export function generateWeeklyMetrics(weeks: number = 12): WeeklyMetric[] {
    const metrics: WeeklyMetric[] = [];
    const today = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (i * 7));

        const orders = Math.floor(180 + Math.random() * 80);
        const avgOrderValue = Math.floor(650 + Math.random() * 200);
        const revenue = orders * avgOrderValue;

        const zones = ['A', 'B', 'C', 'D'];
        const couriers = ['Delhivery', 'BlueDart', 'Ecom Express', 'DTDC'];

        metrics.push({
            week: `Week of ${weekStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
            orders,
            revenue,
            avgOrderValue,
            topZone: zones[Math.floor(Math.random() * zones.length)],
            topCourier: couriers[Math.floor(Math.random() * couriers.length)]
        });
    }

    return metrics;
}

/**
 * Generate monthly metrics
 */
export function generateMonthlyMetrics(months: number = 6): MonthlyMetric[] {
    const metrics: MonthlyMetric[] = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
        const month = new Date(today);
        month.setMonth(month.getMonth() - i);

        const orders = Math.floor(750 + Math.random() * 250);
        const avgOrderValue = 650 + Math.random() * 200;
        const revenue = Math.floor(orders * avgOrderValue);
        const shippingCost = Math.floor(orders * (60 + Math.random() * 20));
        const profit = revenue - shippingCost;
        const rtoRate = 5 + Math.random() * 3;
        const avgDeliveryTime = 2.5 + Math.random() * 1.5;

        metrics.push({
            month: month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            orders,
            revenue,
            shippingCost,
            profit,
            rtoRate,
            avgDeliveryTime
        });
    }

    return metrics;
}

/**
 * Today's snapshot data
 */
export interface TodaySnapshot {
    revenue: number;
    orders: number;
    shippingCost: number;
    profit: number;
    walletBalance: number;
    pendingCOD: number;
    activeShipments: number;
    delivered: number;
}

export function getTodaySnapshot(): TodaySnapshot {
    const orders = Math.floor(35 + Math.random() * 15);
    const avgOrderValue = 650 + Math.random() * 200;
    const revenue = Math.floor(orders * avgOrderValue);
    const shippingCost = Math.floor(orders * (60 + Math.random() * 20));
    const profit = revenue - shippingCost;

    return {
        revenue,
        orders,
        shippingCost,
        profit,
        walletBalance: Math.floor(8000 + Math.random() * 7000),
        pendingCOD: Math.floor(12000 + Math.random() * 8000),
        activeShipments: Math.floor(orders * 0.6),
        delivered: Math.floor(orders * 0.3)
    };
}

/**
 * Zone distribution data
 */
export interface ZoneMetric {
    zone: string;
    orders: number;
    percentage: number;
    avgCost: number;
    avgDeliveryTime: number;
    topCourier: string;
}

export function getZoneDistribution(): ZoneMetric[] {
    return [
        {
            zone: 'A',
            orders: 130,
            percentage: 35,
            avgCost: 55,
            avgDeliveryTime: 2.0,
            topCourier: 'Delhivery'
        },
        {
            zone: 'B',
            orders: 150,
            percentage: 40,
            avgCost: 65,
            avgDeliveryTime: 2.5,
            topCourier: 'BlueDart'
        },
        {
            zone: 'C',
            orders: 65,
            percentage: 17,
            avgCost: 75,
            avgDeliveryTime: 3.5,
            topCourier: 'Ecom Express'
        },
        {
            zone: 'D',
            orders: 30,
            percentage: 8,
            avgCost: 85,
            avgDeliveryTime: 4.0,
            topCourier: 'DTDC'
        }
    ];
}

/**
 * Time-based order distribution (for charts)
 */
export interface HourlyDistribution {
    hour: string;
    orders: number;
}

export function getHourlyDistribution(): HourlyDistribution[] {
    const hours = [
        '12am', '3am', '6am', '9am', '12pm', '3pm', '6pm', '9pm'
    ];

    // Peak hours: 10am-1pm and 7pm-10pm
    const baseValues = [2, 1, 3, 15, 25, 18, 22, 12];

    return hours.map((hour, index) => ({
        hour,
        orders: baseValues[index] + Math.floor(Math.random() * 5)
    }));
}
