/**
 * Base Export
 * 
 * Purpose: Base Export Service
 * 
 * DEPENDENCIES:
 * - Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import logger from '../../../../../shared/logger/winston.logger';

export interface BaseColumn {
    header: string;
    key: string;
    width?: number;
    formatter?: (value: any) => string;
}

export interface OrderColumnData {
    orderNumber: string;
    customerName: string;
    customerPhone?: string;
    currentStatus: string;
    paymentMethod: string;
    total: number;
    createdAt: Date;
}

export interface ShipmentColumnData {
    trackingNumber: string;
    carrier: string;
    currentStatus: string;
    createdAt: Date;
    actualDelivery?: Date;
}

export default abstract class BaseExportService {
    /**
     * Format a cell value for export
     */
    protected static formatValue(value: any, formatter?: (v: any) => string): string {
        if (formatter) {
            value = formatter(value);
        }

        if (value === null || value === undefined) {
            return '';
        }

        if (value instanceof Date) {
            return value.toLocaleDateString();
        }

        if (typeof value === 'number') {
            return value.toLocaleString();
        }

        return String(value);
    }

    /**
     * Standard order columns shared across all export formats
     */
    static getOrderColumnDefinitions(): BaseColumn[] {
        return [
            { header: 'Order Number', key: 'orderNumber', width: 15 },
            { header: 'Customer Name', key: 'customerName', width: 20 },
            { header: 'Customer Phone', key: 'customerPhone', width: 15 },
            { header: 'Status', key: 'currentStatus', width: 12 },
            { header: 'Payment Method', key: 'paymentMethod', width: 12 },
            { header: 'Total', key: 'total', width: 12, formatter: (v) => `₹${(v || 0).toFixed(2)}` },
            { header: 'Created At', key: 'createdAt', width: 12 }
        ];
    }

    /**
     * Standard shipment columns shared across all export formats
     */
    static getShipmentColumnDefinitions(): BaseColumn[] {
        return [
            { header: 'Tracking Number', key: 'trackingNumber', width: 18 },
            { header: 'Carrier', key: 'carrier', width: 15 },
            { header: 'Status', key: 'currentStatus', width: 12 },
            { header: 'Created At', key: 'createdAt', width: 12 },
            { header: 'Delivered At', key: 'actualDelivery', width: 12 }
        ];
    }

    /**
     * Get columns by data type
     */
    static getColumns(dataType: 'orders' | 'shipments'): BaseColumn[] {
        return dataType === 'orders'
            ? this.getOrderColumnDefinitions()
            : this.getShipmentColumnDefinitions();
    }

    /**
     * Validate export data
     */
    protected static validateData(data: any[]): void {
        if (!Array.isArray(data)) {
            throw new Error('Export data must be an array');
        }
    }

    /**
     * Log export operation
     */
    protected static logExport(format: string, recordCount: number): void {
        logger.info(`Export: Generated ${format} with ${recordCount} records`);
    }
}
