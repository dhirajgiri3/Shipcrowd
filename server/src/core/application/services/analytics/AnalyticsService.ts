/**
 * Analytics Service - Base Utilities
 * 
 * Provides common utilities for all analytics services.
 * Follows patterns from NDRAnalyticsService.
 */

import mongoose from 'mongoose';

export interface DateRange {
    start: Date;
    end: Date;
}

export default class AnalyticsService {
    /**
     * Build date range filter for aggregation
     */
    static buildDateRangeFilter(range?: DateRange, field = 'createdAt'): Record<string, any> {
        if (!range) return {};
        return {
            [field]: {
                $gte: range.start,
                $lte: range.end
            }
        };
    }

    /**
     * Build company filter with ObjectId conversion
     */
    static buildCompanyFilter(companyId: string): { companyId: mongoose.Types.ObjectId } {
        return { companyId: new mongoose.Types.ObjectId(companyId) };
    }

    /**
     * Get date format string for $dateToString based on groupBy
     */
    static getDateFormat(groupBy: 'day' | 'week' | 'month'): string {
        switch (groupBy) {
            case 'day':
                return '%Y-%m-%d';
            case 'week':
                return '%Y-W%V';
            case 'month':
                return '%Y-%m';
            default:
                return '%Y-%m-%d';
        }
    }

    /**
     * Calculate growth percentage between two values
     */
    static calculateGrowth(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    }

    /**
     * Get default date range (last 30 days)
     */
    static getDefaultDateRange(): DateRange {
        return {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
        };
    }

    /**
     * Build match stage for aggregation pipeline
     */
    static buildMatchStage(companyId: string, dateRange?: DateRange, additionalFilters: Record<string, any> = {}): any {
        return {
            $match: {
                ...this.buildCompanyFilter(companyId),
                ...this.buildDateRangeFilter(dateRange),
                ...additionalFilters
            }
        };
    }
}
