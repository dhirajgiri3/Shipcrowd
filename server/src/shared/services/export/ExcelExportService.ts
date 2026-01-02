/**
 * Excel Export Service
 * 
 * Generates styled Excel files using exceljs.
 */

import ExcelJS from 'exceljs';
import logger from '../../logger/winston.logger.js';

export interface ExcelColumn {
    header: string;
    key: string;
    width?: number;
    style?: Partial<ExcelJS.Style>;
}

export interface ExcelExportOptions {
    sheetName?: string;
    title?: string;
    includeChart?: boolean;
}

export default class ExcelExportService {
    /**
     * Export data to Excel buffer
     */
    static async exportToExcel(
        data: any[],
        columns: ExcelColumn[],
        options: ExcelExportOptions = {}
    ): Promise<Buffer> {
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Shipcrowd Analytics';
            workbook.created = new Date();

            const worksheet = workbook.addWorksheet(options.sheetName || 'Report');

            // Add title if provided
            if (options.title) {
                worksheet.mergeCells('A1', `${String.fromCharCode(64 + columns.length)}1`);
                const titleCell = worksheet.getCell('A1');
                titleCell.value = options.title;
                titleCell.font = { bold: true, size: 16 };
                titleCell.alignment = { horizontal: 'center' };
                worksheet.addRow([]);
            }

            // Set up columns
            worksheet.columns = columns.map(col => ({
                header: col.header,
                key: col.key,
                width: col.width || 15
            }));

            // Style header row
            const headerRow = worksheet.getRow(options.title ? 3 : 1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '4472C4' }
            };
            headerRow.alignment = { horizontal: 'center' };

            // Add data rows
            data.forEach(row => {
                const rowData: any = {};
                columns.forEach(col => {
                    rowData[col.key] = row[col.key];
                });
                worksheet.addRow(rowData);
            });

            // Auto-fit columns based on content
            worksheet.columns.forEach(column => {
                if (column.eachCell) {
                    let maxLength = 0;
                    column.eachCell({ includeEmpty: true }, cell => {
                        const cellLength = cell.value ? String(cell.value).length : 0;
                        if (cellLength > maxLength) {
                            maxLength = cellLength;
                        }
                    });
                    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
                }
            });

            // Add borders to all cells
            worksheet.eachRow((row, rowNumber) => {
                row.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });

            // Apply number formatting for currency columns
            columns.forEach((col, index) => {
                if (col.key.toLowerCase().includes('revenue') ||
                    col.key.toLowerCase().includes('total') ||
                    col.key.toLowerCase().includes('amount')) {
                    worksheet.getColumn(index + 1).numFmt = '₹#,##0.00';
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        } catch (error) {
            logger.error('Error generating Excel:', error);
            throw error;
        }
    }

    /**
     * Create Excel with multiple sheets
     */
    static async exportMultiSheet(
        sheets: { name: string; data: any[]; columns: ExcelColumn[] }[]
    ): Promise<Buffer> {
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Shipcrowd Analytics';
            workbook.created = new Date();

            for (const sheet of sheets) {
                const worksheet = workbook.addWorksheet(sheet.name);

                worksheet.columns = sheet.columns.map(col => ({
                    header: col.header,
                    key: col.key,
                    width: col.width || 15
                }));

                // Style header
                const headerRow = worksheet.getRow(1);
                headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
                headerRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '4472C4' }
                };

                // Add data
                sheet.data.forEach(row => {
                    const rowData: any = {};
                    sheet.columns.forEach(col => {
                        rowData[col.key] = row[col.key];
                    });
                    worksheet.addRow(rowData);
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        } catch (error) {
            logger.error('Error generating multi-sheet Excel:', error);
            throw error;
        }
    }

    /**
     * Get standard column definitions
     */
    static getOrderColumns(): ExcelColumn[] {
        return [
            { header: 'Order Number', key: 'orderNumber', width: 15 },
            { header: 'Customer Name', key: 'customerName', width: 20 },
            { header: 'Status', key: 'currentStatus', width: 12 },
            { header: 'Payment', key: 'paymentMethod', width: 10 },
            { header: 'Total', key: 'total', width: 12 },
            { header: 'Created', key: 'createdAt', width: 12 }
        ];
    }
}
