/**
 * Analytics Validation Schemas
 * 
 * Zod schemas for analytics endpoint validation.
 */

import { z } from 'zod';

// Date range query schema
export const dateRangeQuerySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    groupBy: z.enum(['day', 'week', 'month']).optional().default('day')
});

// Pagination query schema
export const paginationQuerySchema = z.object({
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('20').transform(Number)
});

// Combined analytics query schema
export const analyticsQuerySchema = dateRangeQuerySchema.merge(paginationQuerySchema);

// Build report request schema
export const buildReportSchema = z.object({
    reportType: z.enum(['order', 'shipment', 'revenue', 'customer', 'inventory', 'custom']),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    filters: z.object({
        dateRange: z.object({
            start: z.string(),
            end: z.string()
        }).optional(),
        orderStatus: z.array(z.string()).optional(),
        paymentMethod: z.array(z.string()).optional(),
        courier: z.array(z.string()).optional(),
        warehouse: z.array(z.string()).optional()
        custom: z.record(z.any()).optional()
    }).optional(),
    metrics: z.array(z.string()).min(1),
    groupBy: z.enum(['day', 'week', 'month', 'none']).optional(),
    dimensions: z.array(z.string()).optional(),
    chartType: z.enum(['line', 'bar', 'pie', 'area', 'donut', 'scatter']).optional()
});

// Save report config schema
export const saveReportConfigSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    reportType: z.enum(['order', 'shipment', 'revenue', 'customer', 'inventory', 'custom']),
    filters: z.object({
        dateRange: z.object({
            start: z.string(),
            end: z.string()
        }).optional(),
        orderStatus: z.array(z.string()).optional(),
        paymentMethod: z.array(z.string()).optional(),
        courier: z.array(z.string()).optional(),
        warehouse: z.array(z.string()).optional()
    }).optional(),
    metrics: z.array(z.string()).default([]),
    groupBy: z.enum(['day', 'week', 'month', 'product', 'customer', 'courier', 'none']).optional(),
    schedule: z.object({
        enabled: z.boolean().default(false),
        frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
        recipients: z.array(z.string().email()).optional(),
        format: z.enum(['csv', 'excel', 'pdf']).optional()
    }).optional()
});

// Top products query schema
export const topProductsQuerySchema = z.object({
    limit: z.string().optional().default('10').transform(Number),
    startDate: z.string().optional(),
    endDate: z.string().optional()
});

export const reportExportSchema = z.object({
    format: z.enum(['csv', 'excel', 'pdf']),
    reportType: z.enum(['order', 'shipment', 'revenue', 'customer', 'inventory', 'custom']),
    filters: z.object({
        dateRange: z.object({
            start: z.string(),
            end: z.string()
        }).optional(),
        orderStatus: z.array(z.string()).optional(),
        paymentMethod: z.array(z.string()).optional(),
        courier: z.array(z.string()).optional(),
        warehouse: z.array(z.string()).optional(),
        custom: z.record(z.any()).optional()
    }).optional(),
    metrics: z.array(z.string()).min(1),
    groupBy: z.enum(['day', 'week', 'month', 'none']).optional(),
    fileName: z.string().min(1).max(120).optional()
});

// Export types
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type BuildReportInput = z.infer<typeof buildReportSchema>;
export type SaveReportConfigInput = z.infer<typeof saveReportConfigSchema>;
export type ReportExportInput = z.infer<typeof reportExportSchema>;
