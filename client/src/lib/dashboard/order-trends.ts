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
    period?: {
        startDate?: string | Date;
        endDate?: string | Date;
    };
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

    if (apiData.ordersByDate.length === 0) return [];

    const sorted = [...apiData.ordersByDate].sort((a, b) => a._id.localeCompare(b._id));
    const byDate = new Map(sorted.map((item) => [item._id, item]));
    const start = apiData.period?.startDate
        ? new Date(apiData.period.startDate)
        : new Date(sorted[0]._id);
    const end = apiData.period?.endDate
        ? new Date(apiData.period.endDate)
        : new Date(sorted[sorted.length - 1]._id);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const points: ChartDataPoint[] = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const date = cursor.toISOString().split('T')[0];
        const item = byDate.get(date);
        const dayOfWeek = new Date(date).getDay();

        points.push({
            date,
            orders: item?.orders || 0,
            revenue: item?.revenue || 0,
            dayOfWeek,
            isWeekend: [0, 6].includes(dayOfWeek),
            isFestival: isIndianFestival(date),
        });
    }

    return points;
}
