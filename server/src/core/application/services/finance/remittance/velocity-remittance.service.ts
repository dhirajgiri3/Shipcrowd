import ExcelJS from 'exceljs';
import logger from '../../../../../shared/logger/winston.logger';

interface MISRow {
    awb: string;
    amount: number;
    remittanceDate?: Date;
    utr?: string;
}

interface ColumnMapping {
    awbColumns: string[];
    amountColumns: string[];
    dateColumns?: string[];
    utrColumns?: string[];
}

export class VelocityRemittanceService {
    /**
     * Parse Velocity MIS Excel Format
     * Expected Columns: AWB, Status, Collected Amount, Date
     */
    static async parseMIS(buffer: any, mappingOverride?: ColumnMapping): Promise<MISRow[]> {
        const rows: MISRow[] = [];
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        // Velocity usually has data in Sheet 1
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) return [];

        const mapping: ColumnMapping = mappingOverride || {
            awbColumns: ['awb', 'awb_number', 'tracking_number', 'waybill', 'shipment_id', 'reference_no', 'ref_no', 'refno'],
            amountColumns: ['cod_amount', 'collected_amount', 'amount', 'net_amount', 'collectible', 'value'],
            dateColumns: ['delivery_date', 'remittance_date', 'settlement_date', 'date'],
            utrColumns: ['utr', 'utr_number', 'reference_number', 'transaction_id']
        };

        const normalizeKey = (val: string) => val.toLowerCase().replace(/[_\s-]/g, '');
        const normalizedAwb = mapping.awbColumns.map(normalizeKey);
        const normalizedAmount = mapping.amountColumns.map(normalizeKey);
        const normalizedDate = (mapping.dateColumns || []).map(normalizeKey);
        const normalizedUtr = (mapping.utrColumns || []).map(normalizeKey);

        // Find header row (scan first 5 rows)
        let headerRowIdx = 1;
        let headerFound = false;
        const colMap = { awb: -1, amount: -1, date: -1, utr: -1 };

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 5 || headerFound) return;

            const headerKeys: Record<number, string> = {};
            row.eachCell((cell, colNumber) => {
                headerKeys[colNumber] = normalizeKey(cell.toString());
            });

            const findCol = (candidates: string[]) => {
                const match = Object.entries(headerKeys).find(([, key]) => candidates.includes(key));
                return match ? Number(match[0]) : -1;
            };

            const awbCol = findCol(normalizedAwb);
            const amountCol = findCol(normalizedAmount);

            if (awbCol !== -1 && amountCol !== -1) {
                headerFound = true;
                headerRowIdx = rowNumber;
                colMap.awb = awbCol;
                colMap.amount = amountCol;
                colMap.date = normalizedDate.length ? findCol(normalizedDate) : -1;
                colMap.utr = normalizedUtr.length ? findCol(normalizedUtr) : -1;
            }
        });

        if (!headerFound) {
            logger.warn('Velocity MIS parser: header row not found');
            return [];
        }

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= headerRowIdx) return;

            if (colMap.awb !== -1 && colMap.amount !== -1) {
                const awb = row.getCell(colMap.awb).toString().trim();
                const amountStr = row.getCell(colMap.amount).toString().replace(/,/g, '');
                const amount = parseFloat(amountStr) || 0;

                if (awb && awb !== 'null' && amount > 0) {
                    rows.push({
                        awb,
                        amount,
                        remittanceDate: colMap.date !== -1 ? new Date(row.getCell(colMap.date).toString()) : undefined,
                        utr: colMap.utr !== -1 ? row.getCell(colMap.utr).toString().trim() : undefined
                    });
                }
            }
        });

        logger.info(`Parsed ${rows.length} rows from Velocity MIS file`);
        return rows;
    }
}
