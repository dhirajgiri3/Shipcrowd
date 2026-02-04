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
 * Check if a date falls on or near a major Indian festival
 */
function isIndianFestival(dateStr: string): boolean {
    const date = new Date(dateStr);
    const month = date.getMonth(); // 0-11
    const day = date.getDate();

    // Diwali - October/November (Oct 20-Nov 15)
    if ((month === 9 && day >= 20) || (month === 10 && day <= 15)) return true;

    // Eid al-Fitr - April/May (Apr 20-May 10)
    if ((month === 3 && day >= 20) || (month === 4 && day <= 10)) return true;

    // Holi - February/March (Feb 25-Mar 15)
    if ((month === 1 && day >= 25) || (month === 2 && day <= 15)) return true;

    // Navratri - September/October (Sep 20-Oct 5)
    if ((month === 8 && day >= 20) || (month === 9 && day <= 5)) return true;

    // Raksha Bandhan - August (Aug 10-20)
    if (month === 7 && day >= 10 && day <= 20) return true;

    // Christmas - Dec 25
    if (month === 11 && day === 25) return true;

    // New Year - Dec 31 - Jan 2
    if ((month === 11 && day === 31) || (month === 0 && day <= 2)) return true;

    // Independence Day - Aug 15
    if (month === 7 && day === 15) return true;

    // Republic Day - Jan 26
    if (month === 0 && day === 26) return true;

    return false;
}

/**
 * Transform order analytics to chart data
 */
export function transformOrderTrendsToChart(apiData: OrderTrendAPIResponse): ChartDataPoint[] {
    if (!apiData || !apiData.ordersByDate || !Array.isArray(apiData.ordersByDate)) {
        return []; // Return empty array instead of null
    }

    return apiData.ordersByDate.map((item) => ({
        date: item._id,
        orders: item.orders || 0, // Fallback to 0
        revenue: item.revenue || 0, // Fallback to 0
        dayOfWeek: new Date(item._id).getDay(),
        isWeekend: [0, 6].includes(new Date(item._id).getDay()),
        isFestival: isIndianFestival(item._id)
    }));
}
