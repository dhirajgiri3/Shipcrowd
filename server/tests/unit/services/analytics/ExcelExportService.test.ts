/**
 * ExcelExportService Unit Tests
 */

import ExcelExportService from '../../../../src/shared/services/export/ExcelExportService';

describe('ExcelExportService', () => {
    describe('exportToExcel', () => {
        it('should generate an Excel buffer', async () => {
            const data = [
                { orderNumber: 'ORD001', customerName: 'John Doe', total: 1000 },
                { orderNumber: 'ORD002', customerName: 'Jane Doe', total: 2000 }
            ];

            const columns = [
                { header: 'Order Number', key: 'orderNumber', width: 15 },
                { header: 'Customer', key: 'customerName', width: 20 },
                { header: 'Total', key: 'total', width: 12 }
            ];

            const buffer = await ExcelExportService.exportToExcel(data, columns);

            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.length).toBeGreaterThan(0);
        });

        it('should include title when provided', async () => {
            const data = [{ name: 'Test' }];
            const columns = [{ header: 'Name', key: 'name', width: 10 }];

            const buffer = await ExcelExportService.exportToExcel(data, columns, {
                title: 'Test Report'
            });

            expect(buffer).toBeInstanceOf(Buffer);
        });

        it('should handle empty data', async () => {
            const data: any[] = [];
            const columns = [{ header: 'Name', key: 'name', width: 10 }];

            const buffer = await ExcelExportService.exportToExcel(data, columns);

            expect(buffer).toBeInstanceOf(Buffer);
        });
    });

    describe('exportMultiSheet', () => {
        it('should create workbook with multiple sheets', async () => {
            const sheets = [
                {
                    name: 'Orders',
                    data: [{ id: 1, value: 100 }],
                    columns: [
                        { header: 'ID', key: 'id', width: 10 },
                        { header: 'Value', key: 'value', width: 15 }
                    ]
                },
                {
                    name: 'Summary',
                    data: [{ total: 100 }],
                    columns: [{ header: 'Total', key: 'total', width: 15 }]
                }
            ];

            const buffer = await ExcelExportService.exportMultiSheet(sheets);

            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.length).toBeGreaterThan(0);
        });
    });

    describe('getOrderColumns', () => {
        it('should return standard order columns', () => {
            const columns = ExcelExportService.getOrderColumns();

            expect(columns).toHaveLength(6);
            expect(columns[0].header).toBe('Order Number');
            expect(columns[0].key).toBe('orderNumber');
        });
    });
});
