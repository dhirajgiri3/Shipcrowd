/**
 * CSV Export Service
 * 
 * Generates CSV files from analytics data.
 */

import { Response } from 'express';
import logger from '../../logger/winston.logger.js';

export interface CSVColumn {
    header: string;
    key: string;
    formatter?: (value: any) => string;
}

export default class CSVExportService {
    /**
     * Format a single cell value for CSV
     */
    private static formatCell(value: any, formatter?: (v: any) => string): string {
        if (formatter) {
            value = formatter(value);
        }

        if (value === null || value === undefined) {
            return '""';
        }

        if (typeof value === 'string') {
            value = value.replace(/"/g, '""');
            return `"${value}"`;
        }

        if (value instanceof Date) {
            return `"${value.toISOString()}"`;
        }

        return String(value);
    }

    /**
     * Export data to CSV buffer
     */
    static async exportToCSV(data: any[], columns: CSVColumn[]): Promise<Buffer> {
        try {
            const headers = columns.map(col => `"${col.header}"`).join(',');
            const rows = data.map(row =>
                columns.map(col => this.formatCell(row[col.key], col.formatter)).join(',')
            );

            const csv = [headers, ...rows].join('\n');
            return Buffer.from(csv, 'utf-8');
        } catch (error) {
            logger.error('Error generating CSV:', error);
            throw error;
        }
    }

    /**
     * Stream CSV directly to response
     */
    static streamCSVResponse(
        res: Response,
        data: any[],
        columns: CSVColumn[],
        filename: string
    ): void {
        try {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            const headers = columns.map(col => `"${col.header}"`).join(',');
            res.write(headers + '\n');

            data.forEach(row => {
                const rowData = columns.map(col => this.formatCell(row[col.key], col.formatter)).join(',');
                res.write(rowData + '\n');
            });

            res.end();
        } catch (error) {
            logger.error('Error streaming CSV:', error);
            throw error;
        }
    }

    /**
     * Get common column definitions for report types
     */
    static getOrderColumns(): CSVColumn[] {
        return [
            { header: 'Order Number', key: 'orderNumber' },
            { header: 'Customer Name', key: 'customerName' },
            { header: 'Customer Phone', key: 'customerPhone' },
            { header: 'Status', key: 'currentStatus' },
            { header: 'Payment Method', key: 'paymentMethod' },
            { header: 'Total', key: 'total', formatter: (v) => `₹${(v || 0).toFixed(2)}` },
            { header: 'Created At', key: 'createdAt', formatter: (v) => v ? new Date(v).toLocaleDateString() : '' }
        ];
    }

    static getShipmentColumns(): CSVColumn[] {
        return [
            { header: 'Tracking Number', key: 'trackingNumber' },
            { header: 'Carrier', key: 'carrier' },
            { header: 'Status', key: 'currentStatus' },
            { header: 'Created At', key: 'createdAt', formatter: (v) => v ? new Date(v).toLocaleDateString() : '' },
            { header: 'Delivered At', key: 'actualDelivery', formatter: (v) => v ? new Date(v).toLocaleDateString() : '' }
        ];
    }
}
