/**
 * Filter Builder Utility
 * 
 * Converts report filter objects to MongoDB query objects.
 */

import mongoose from 'mongoose';

export interface ReportFilters {
    dateRange?: {
        start: Date;
        end: Date;
    };
    orderStatus?: string[];
    paymentMethod?: string[];
    courier?: string[];
    warehouse?: mongoose.Types.ObjectId[] | string[];
}

/**
 * Build MongoDB query from report filters
 */
export function buildFilterQuery(filters: ReportFilters, dateField = 'createdAt'): Record<string, any> {
    const query: Record<string, any> = {};

    if (filters.dateRange?.start && filters.dateRange?.end) {
        query[dateField] = {
            $gte: new Date(filters.dateRange.start),
            $lte: new Date(filters.dateRange.end)
        };
    }

    if (filters.orderStatus?.length) {
        query.currentStatus = { $in: filters.orderStatus };
    }

    if (filters.paymentMethod?.length) {
        query.paymentMethod = { $in: filters.paymentMethod };
    }

    if (filters.courier?.length) {
        query.carrier = { $in: filters.courier };
    }

    if (filters.warehouse?.length) {
        query.warehouseId = {
            $in: filters.warehouse.map(id =>
                typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
            )
        };
    }

    return query;
}

/**
 * Build sort query from sortBy configuration
 */
export function buildSortQuery(sortBy?: { field: string; order: 'asc' | 'desc' }): Record<string, 1 | -1> {
    if (!sortBy?.field) {
        return { createdAt: -1 };
    }

    return { [sortBy.field]: sortBy.order === 'asc' ? 1 : -1 };
}
