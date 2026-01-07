/**
 * Analytics
 * 
 * Purpose: Analytics Service - Base Utilities
 * 
 * DEPENDENCIES:
 * - None specified
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
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
