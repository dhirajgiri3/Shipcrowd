/**
 * Geographic Analytics Service
 * 
 * Purpose: Geographic distribution and insights
 * Phase 4: Powers GeographicInsights dashboard component
 * 
 * DEPENDENCIES:
 * - Order Model
 * - Logger
 */

import { Order } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';
import mongoose from 'mongoose';

export interface CityMetric {
    city: string;
    state: string;
    orders: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
}

export interface RegionMetric {
    region: 'North' | 'South' | 'East' | 'West' | 'Northeast' | 'Central';
    orders: number;
    percentage: number;
    color: string;
}

// State to Region mapping for Indian states
const STATE_TO_REGION: Record<string, RegionMetric['region']> = {
    // North
    'Delhi': 'North', 'Haryana': 'North', 'Punjab': 'North', 'Himachal Pradesh': 'North',
    'Jammu and Kashmir': 'North', 'Ladakh': 'North', 'Uttarakhand': 'North', 'Chandigarh': 'North',

    // South
    'Karnataka': 'South', 'Tamil Nadu': 'South', 'Kerala': 'South', 'Andhra Pradesh': 'South',
    'Telangana': 'South', 'Puducherry': 'South', 'Lakshadweep': 'South',

    // East
    'West Bengal': 'East', 'Odisha': 'East', 'Bihar': 'East', 'Jharkhand': 'East',

    // West
    'Maharashtra': 'West', 'Gujarat': 'West', 'Rajasthan': 'West', 'Goa': 'West',
    'Daman and Diu': 'West', 'Dadra and Nagar Haveli': 'West',

    // Northeast
    'Assam': 'Northeast', 'Meghalaya': 'Northeast', 'Tripura': 'Northeast', 'Mizoram': 'Northeast',
    'Manipur': 'Northeast', 'Nagaland': 'Northeast', 'Arunachal Pradesh': 'Northeast', 'Sikkim': 'Northeast',

    // Central
    'Madhya Pradesh': 'Central', 'Chhattisgarh': 'Central', 'Uttar Pradesh': 'Central'
};

const REGION_COLORS: Record<string, string> = {
    North: '#3B82F6',     // Blue
    South: '#10B981',     // Green  
    East: '#F59E0B',      // Amber
    West: '#EF4444',      // Red
    Northeast: '#8B5CF6', // Purple
    Central: '#6366F1'    // Indigo
};

export default class GeographicAnalyticsService {
    /**
     * Get geographic insights - top cities and regional distribution
     * Phase 4: Powers GeographicInsights component
     */
    static async getGeographicInsights(companyId: string): Promise<{
        topCities: CityMetric[];
        regions: RegionMetric[];
        totalOrders: number;
    }> {
        try {
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

            // Aggregate orders by city (current month)
            const cityAggregation = await Order.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        createdAt: { $gte: currentMonthStart },
                        isDeleted: false
                    }
                },
                {
                    $group: {
                        _id: {
                            city: '$deliveryAddress.city',
                            state: '$deliveryAddress.state'
                        },
                        orders: { $sum: 1 }
                    }
                },
                {
                    $sort: { orders: -1 }
                },
                {
                    $limit: 10 // Top 10 cities
                }
            ]);

            // Previous month city data for trend comparison
            const previousCityAggregation = await Order.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                        createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
                        isDeleted: false
                    }
                },
                {
                    $group: {
                        _id: {
                            city: '$deliveryAddress.city',
                            state: '$deliveryAddress.state'
                        },
                        orders: { $sum: 1 }
                    }
                }
            ]);

            // Calculate total orders for percentage
            const totalOrders = cityAggregation.reduce((sum, item) => sum + item.orders, 0);

            // Build previous month lookup map
            const previousCityMap = new Map(
                previousCityAggregation.map(item => [
                    `${item._id.city}_${item._id.state}`,
                    item.orders
                ])
            );

            // Transform to CityMetric with trend calculation
            const topCities: CityMetric[] = cityAggregation.map(item => {
                const city = item._id.city || 'Unknown';
                const state = item._id.state || 'Unknown';
                const currentOrders = item.orders;
                const previousOrders = previousCityMap.get(`${city}_${state}`) || 0;

                let trend: 'up' | 'down' | 'stable' = 'stable';
                let trendValue = 0;

                if (previousOrders > 0) {
                    const change = ((currentOrders - previousOrders) / previousOrders) * 100;
                    trendValue = Math.round(Math.abs(change) * 10) / 10;
                    if (change > 5) trend = 'up';
                    else if (change < -5) trend = 'down';
                } else if (currentOrders > 0) {
                    trend = 'up';
                    trendValue = 100;
                }

                return {
                    city,
                    state,
                    orders: currentOrders,
                    percentage: totalOrders > 0 ? Math.round((currentOrders / totalOrders) * 1000) / 10 : 0,
                    trend,
                    trendValue
                };
            });

            // Aggregate by region
            const regionCounts = new Map<RegionMetric['region'], number>();
            cityAggregation.forEach(item => {
                const state = item._id.state || 'Unknown';
                const region = STATE_TO_REGION[state] || 'Central';
                regionCounts.set(region, (regionCounts.get(region) || 0) + item.orders);
            });

            // Transform to RegionMetric
            const regions: RegionMetric[] = Array.from(regionCounts.entries()).map(([region, orders]) => ({
                region,
                orders,
                percentage: totalOrders > 0 ? Math.round((orders / totalOrders) * 1000) / 10 : 0,
                color: REGION_COLORS[region] || '#6B7280'
            })).sort((a, b) => b.orders - a.orders);

            return {
                topCities,
                regions,
                totalOrders
            };
        } catch (error) {
            logger.error('Error getting geographic insights:', error);
            throw error;
        }
    }
}
