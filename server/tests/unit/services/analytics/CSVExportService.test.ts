/**
 * CSVExportService Unit Tests
 */

import CSVExportService from '../../../../src/shared/services/export/csv-export.service';

describe('CSVExportService', () => {
    describe('exportToCSV', () => {
        it('should generate a CSV buffer with correct headers', async () => {
            const data = [
                { orderNumber: 'ORD001', customerName: 'John Doe', total: 1000 },
                { orderNumber: 'ORD002', customerName: 'Jane Doe', total: 2000 }
            ];

            const columns = [
                { header: 'Order Number', key: 'orderNumber' },
                { header: 'Customer', key: 'customerName' },
                { header: 'Total', key: 'total' }
            ];

            const buffer = await CSVExportService.exportToCSV(data, columns);
            const csv = buffer.toString('utf-8');

            expect(csv).toContain('"Order Number","Customer","Total"');
            expect(csv).toContain('"ORD001","John Doe",1000');
            expect(csv).toContain('"ORD002","Jane Doe",2000');
        });

        it('should handle null and undefined values', async () => {
            const data = [
                { name: null, value: undefined }
            ];

            const columns = [
                { header: 'Name', key: 'name' },
                { header: 'Value', key: 'value' }
            ];

            const buffer = await CSVExportService.exportToCSV(data, columns);
            const csv = buffer.toString('utf-8');

            expect(csv).toContain('""');
        });

        it('should escape double quotes in strings', async () => {
            const data = [
                { name: 'Test "Quoted" Value' }
            ];

            const columns = [
                { header: 'Name', key: 'name' }
            ];

            const buffer = await CSVExportService.exportToCSV(data, columns);
            const csv = buffer.toString('utf-8');

            expect(csv).toContain('"Test ""Quoted"" Value"');
        });

        it('should apply formatter when provided', async () => {
            const data = [
                { price: 1000.5 }
            ];

            const columns = [
                {
                    header: 'Price',
                    key: 'price',
                    formatter: (v: number) => `₹${v.toFixed(2)}`
                }
            ];

            const buffer = await CSVExportService.exportToCSV(data, columns);
            const csv = buffer.toString('utf-8');

            expect(csv).toContain('"₹1000.50"');
        });

        it('should handle empty data array', async () => {
            const data: any[] = [];
            const columns = [{ header: 'Name', key: 'name' }];

            const buffer = await CSVExportService.exportToCSV(data, columns);
            const csv = buffer.toString('utf-8');

            expect(csv).toBe('"Name"');
        });
    });

    describe('getOrderColumns', () => {
        it('should return standard order columns', () => {
            const columns = CSVExportService.getOrderColumns();

            expect(columns).toHaveLength(7);
            expect(columns[0].header).toBe('Order Number');
            expect(columns[0].key).toBe('orderNumber');
        });

        it('should have formatters for currency columns', () => {
            const columns = CSVExportService.getOrderColumns();
            const totalColumn = columns.find(c => c.key === 'total');

            expect(totalColumn?.formatter).toBeDefined();
            expect(totalColumn?.formatter!(1000)).toBe('₹1000.00');
        });
    });

    describe('getShipmentColumns', () => {
        it('should return standard shipment columns', () => {
            const columns = CSVExportService.getShipmentColumns();

            expect(columns).toHaveLength(5);
            expect(columns[0].header).toBe('Tracking Number');
        });
    });
});
