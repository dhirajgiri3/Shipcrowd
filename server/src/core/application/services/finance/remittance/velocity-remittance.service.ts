import ExcelJS from 'exceljs';
import logger from '../../../../shared/logger/winston.logger';

interface MISRow {
    awb: string;
    amount: number;
    remittanceDate?: Date;
    utr?: string;
}

export class VelocityRemittanceService {
    /**
     * Parse Velocity MIS Excel Format
     * Expected Columns: AWB, Status, Collected Amount, Date
     */
    static async parseMIS(buffer: any): Promise<MISRow[]> {
        const rows: MISRow[] = [];
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        // Velocity usually has data in Sheet 1
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) return [];

        // Find Headers Row
        let headerRowIdx = 1;

        // Map headers to column indices
        const colMap = {
            awb: -1,
            amount: -1,
            date: -1
        };

        worksheet.eachRow((row, rowNumber) => {
            // Assume first row is header if we haven't found dynamic headers yet
            // Or better: scan first few rows for header keywords
            if (rowNumber === headerRowIdx) {
                row.eachCell((cell, colNumber) => {
                    const val = cell.toString().toLowerCase();
                    if (val.includes('awb') || val.includes('tracking')) colMap.awb = colNumber;
                    if (val.includes('collected amount') || val.includes('cod amount')) colMap.amount = colNumber;
                    if (val.includes('delivery date') || val.includes('date')) colMap.date = colNumber;
                });

                // If we didn't find headers, maybe they are on next row?
                // For now assuming row 1 is likely header or near it.
                // If colMap values are still -1, we could try to detect on next row logic (omitted for brevity unless needed)
                return;
            }

            if (colMap.awb !== -1 && colMap.amount !== -1) {
                const awb = row.getCell(colMap.awb).toString();
                // Handle currency strings "1,200.00"
                const amountStr = row.getCell(colMap.amount).toString().replace(/,/g, '');
                const amount = parseFloat(amountStr) || 0;

                if (awb && awb !== 'null' && amount > 0) {
                    rows.push({
                        awb,
                        amount,
                        remittanceDate: colMap.date !== -1 ? new Date(row.getCell(colMap.date).toString()) : undefined
                    });
                }
            }
        });

        logger.info(`Parsed ${rows.length} rows from Velocity MIS file`);
        return rows;
    }
}
