/**
 * Order Trends Transformation
 * 
 * Transforms analytics API data into OrderTrendChart format
 */

interface OrderTrendAPIResponse {
    ordersByDate: Array<{
        _id: string;  // Date YYYY-MM-DD
        orders: number;
        revenue: number;
    }>;
}

interface ChartDataPoint {
    date: string;
    orders: number;
    revenue: number;
    dayOfWeek: number;
    isWeekend: boolean;
    isFestival: boolean;
}

/**
 * Transform order analytics to chart data
 */
export function transformOrderTrendsToChart(apiData: OrderTrendAPIResponse): ChartDataPoint[] | null {
    if (!apiData || !apiData.ordersByDate) {
        return null;
    }

    return apiData.ordersByDate.map((item) => ({
        date: item._id,
        orders: item.orders,
        revenue: item.revenue,
        dayOfWeek: new Date(item._id).getDay(),
        isWeekend: [0, 6].includes(new Date(item._id).getDay()),
        isFestival: false  // TODO: Add festival detection logic
    }));
}
