import csvParser from 'csv-parser';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { Readable } from 'stream';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import CODRemittance from '../../../../infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model';
import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';

import ReconciliationReport from '../../../../infrastructure/database/mongoose/models/finance/reports/reconciliation-report.model';
import { VelocityRemittanceService } from './remittance/velocity-remittance.service';

interface MISRow {
    awb: string;
    amount: number;
    remittanceDate?: Date;
    utr?: string;
}

/**
 * Column mapping configuration for different courier MIS formats
 */
interface ColumnMapping {
    awbColumns: string[];      // Possible AWB column names
    amountColumns: string[];   // Possible amount column names
    dateColumns?: string[];    // Optional date columns
    utrColumns?: string[];     // Optional UTR columns
}

/**
 * Predefined column mappings for known couriers
 */
const COURIER_COLUMN_MAPPINGS: Record<string, ColumnMapping> = {
    velocity: {
        awbColumns: ['awb', 'awb_number', 'tracking_number', 'waybill', 'shipment_id', 'ref_no', 'refno', 'reference_no', 'reference_number'],
        amountColumns: ['cod_amount', 'cod_collected', 'collected_amount', 'amount', 'net_amount', 'collectible', 'value', 'amount_received', 'amount received'],
        dateColumns: ['remittance_date', 'settlement_date', 'delivery_date', 'date'],
        utrColumns: ['utr', 'utr_number', 'reference_number', 'transaction_id', 'ref_no']
    },
    delhivery: {
        awbColumns: ['awb', 'waybill_number', 'cn', 'reference_number', 'ref_no', 'refno'],
        amountColumns: ['cod_amount', 'total_cod', 'amount_collected', 'amount_received', 'value'],
        dateColumns: ['settlement_date', 'remittance_date', 'date'],
        utrColumns: ['utr_no', 'utr_number', 'reference_no', 'transaction_id']
    },
    generic: {
        awbColumns: ['awb', 'awb_number', 'tracking', 'tracking_number', 'waybill', 'ref', 'refno', 'ref_no', 'reference', 'reference_no', 'reference_number'],
        amountColumns: ['cod', 'cod_amount', 'amount', 'collected', 'value', 'total', 'net_amount', 'amount_received', 'amount received'],
        dateColumns: ['date', 'settlement_date', 'remittance_date', 'paid_date', 'delivery_date'],
        utrColumns: ['utr', 'utr_number', 'reference', 'transaction_id', 'ref_no', 'reference_no']
    }
}

export default class RemittanceReconciliationService {
    private static normalizeHeaderKey(key: string): string {
        return key.toLowerCase().replace(/[_\s-]/g, '');
    }

    private static mergeColumnMappings(
        base: ColumnMapping,
        override?: Partial<ColumnMapping>
    ): ColumnMapping {
        if (!override) return base;

        const merge = (baseArr: string[] = [], overrideArr: string[] = []) =>
            Array.from(new Set([...overrideArr, ...baseArr]));

        return {
            awbColumns: merge(base.awbColumns, override.awbColumns),
            amountColumns: merge(base.amountColumns, override.amountColumns),
            dateColumns: merge(base.dateColumns || [], override.dateColumns),
            utrColumns: merge(base.utrColumns || [], override.utrColumns),
        };
    }

    private static resolveColumnMapping(
        provider: 'velocity' | 'delhivery' | 'generic',
        override?: Partial<ColumnMapping>
    ): ColumnMapping {
        const base = COURIER_COLUMN_MAPPINGS[provider] || COURIER_COLUMN_MAPPINGS.generic;
        return this.mergeColumnMappings(base, override);
    }
    /**
     * Create a verified Remittance Batch from a Courier MIS File.
     * Unlike the standard 'createBatch' which pulls all eligible orders,
     * this ONLY includes orders confirmed by the Courier in the file.
     */
    static async createBatchFromMIS(
        companyId: string,
        fileBuffer: any,
        mimetype: string,
        uploadedBy: string,
        provider: 'generic' | 'velocity' = 'generic',
        mappingOverride?: Partial<ColumnMapping>
    ) {
        // 1. Parse File with provider-specific column mapping
        let rows: MISRow[] = [];

        if (provider === 'velocity') {
            // Use Velocity-specific parser if available, otherwise use generic with velocity mapping
            try {
                rows = await VelocityRemittanceService.parseMIS(
                    fileBuffer,
                    this.resolveColumnMapping('velocity', mappingOverride)
                );
            } catch (error) {
                logger.warn('Velocity-specific parser failed, falling back to generic with velocity mapping', { error });
                rows = await this.parseFile(
                    fileBuffer,
                    mimetype,
                    this.resolveColumnMapping('velocity', mappingOverride),
                    'velocity'
                );
            }
        } else {
            rows = await this.parseFile(
                fileBuffer,
                mimetype,
                this.resolveColumnMapping(provider, mappingOverride),
                provider
            );
        }

        if (rows.length === 0) {
            throw new AppError('MIS file is empty or invalid format', ErrorCode.VAL_INVALID_INPUT, 400);
        }

        logger.info(`[Reconciliation] Parsed ${rows.length} rows from MIS (${provider}) for company ${companyId}`);

        // Phase 4: Create Reconciliation Report (Audit Trail)
        const report = await ReconciliationReport.create({
            companyId: new mongoose.Types.ObjectId(companyId),
            type: 'cod_remittance',
            status: 'processing',
            period: {
                start: rows[0]?.remittanceDate || new Date(),
                end: rows[rows.length - 1]?.remittanceDate || new Date()
            },
            sourceFile: {
                name: 'manual_upload', // TODO: Pass filename from controller
                uploadedAt: new Date()
            },
            generatedBy: uploadedBy
        });

        // ... rest of logic ...
        // I need to keep the existing logic below, so I will return the replacement cursor to just update this method start and add the new method at the end.
        // Actually, replacing the whole createBatchFromMIS signature is needed.

        // 2. Fetch Shipments from DB
        const awbs = rows.map(r => r.awb);
        const dbShipments = await Shipment.find({
            trackingNumber: { $in: awbs },
            // companyId: new mongoose.Types.ObjectId(companyId), // Removed company check to find shipments even if company mismatch (warn later)
            // Actually, keep company check for security? 
            // Better to find by trackingNumber AND companyId to avoid data leak.
            companyId: new mongoose.Types.ObjectId(companyId),
            isDeleted: false
        }).select('trackingNumber paymentDetails.codAmount paymentDetails.shippingCost actualDelivery status currency remittance');

        // Map for quick lookup
        const shipmentMap = new Map(dbShipments.map(s => [s.trackingNumber, s]));

        // 3. Reconcile
        const processedShipments = [];
        let totalCOD = 0;
        let totalDeductions = 0;
        let mismatchCount = 0;

        for (const row of rows) {
            const shipment = shipmentMap.get(row.awb);

            if (!shipment) {
                logger.warn(`[Reconciliation] AWB ${row.awb} found in MIS but not in DB for company ${companyId}`);
                continue;
            }

            // Check if already remitted
            if ((shipment as any).remittance?.included) {
                logger.warn(`[Reconciliation] AWB ${row.awb} already remitted. Skipping.`);
                continue;
            }

            const dbAmount = (shipment as any).paymentDetails?.codAmount || 0;
            const courierAmount = row.amount;
            const diff = dbAmount - courierAmount;

            // Integrity Check
            let status: 'matched' | 'mismatch' = 'matched';
            if (Math.abs(diff) > 1) { // 1 Rupee tolerance
                status = 'mismatch';
                mismatchCount++;
            }

            // Calculate Deductions
            const shippingCharge = (shipment as any).paymentDetails?.shippingCost || 0;
            const platformFee = dbAmount * 0.005; // 0.5%
            const deductionsTotal = shippingCharge + platformFee;
            const netAmount = courierAmount - deductionsTotal;

            processedShipments.push({
                shipmentId: shipment._id,
                awb: shipment.trackingNumber,
                codAmount: dbAmount,
                deliveredAt: (shipment as any).actualDelivery || row.remittanceDate || new Date(),
                status: (shipment as any).status || 'delivered',

                deductions: {
                    shippingCharge,
                    platformFee,
                    total: deductionsTotal
                },

                netAmount: netAmount,

                reconciliation: {
                    status: status,
                    courierAmount: courierAmount,
                    diffAmount: diff,
                    remarks: status === 'mismatch' ? `Mismatch: DB(${dbAmount}) != MIS(${courierAmount})` : 'Verified via MIS'
                }
            });

            totalCOD += courierAmount;
            totalDeductions += deductionsTotal;
        }

        if (processedShipments.length === 0) {
            throw new AppError('No eligible shipments matches found in DB from this MIS file', ErrorCode.VAL_INVALID_INPUT, 400);
        }

        // 4. Create Batch
        const lastBatch = await CODRemittance.findOne({
            companyId: new mongoose.Types.ObjectId(companyId),
        }).sort({ 'batch.batchNumber': -1 }).select('batch.batchNumber').lean();

        const batchNumber = (lastBatch?.batch?.batchNumber || 0) + 1;
        const remittanceId = `REM-REC-${Date.now().toString(36).toUpperCase()}`;

        const batch = await CODRemittance.create({
            remittanceId,
            companyId: new mongoose.Types.ObjectId(companyId),
            batch: {
                batchNumber,
                createdDate: new Date(),
                cutoffDate: new Date(),
                shippingPeriod: {
                    start: new Date(),
                    end: new Date()
                }
            },
            schedule: {
                type: 'manual',
                requestedBy: new mongoose.Types.ObjectId(uploadedBy)
            },
            shipments: processedShipments,
            financial: {
                totalCODCollected: totalCOD,
                totalShipments: processedShipments.length,
                successfulDeliveries: processedShipments.length,
                rtoCount: 0,
                disputedCount: mismatchCount,
                deductionsSummary: {
                    totalShippingCharges: 0,
                    totalPlatformFees: 0,
                    grandTotal: totalDeductions
                },
                netPayable: totalCOD - totalDeductions
            },
            status: mismatchCount > 0 ? 'draft' : 'pending_approval',
            payout: {
                status: 'pending',
                method: 'razorpay_payout'
            },
            timeline: [{
                status: 'draft',
                timestamp: new Date(),
                actor: new mongoose.Types.ObjectId(uploadedBy),
                action: `Reconciliation Batch Created from MIS (${provider}). ${mismatchCount} Mismatches found.`
            }]
        });

        // Update Shipments
        const bulkOps = processedShipments.map(s => ({
            updateOne: {
                filter: { _id: s.shipmentId },
                update: {
                    $set: {
                        'remittance.included': true,
                        'remittance.remittanceId': remittanceId,
                        'remittance.remittedAt': new Date(),
                        'remittance.remittedAmount': s.netAmount,
                        'remittance.platformFee': s.deductions.platformFee
                    }
                }
            }
        }));

        if (bulkOps.length > 0) {
            await Shipment.bulkWrite(bulkOps);
        }

        // Phase 4: Update Report Statistics
        report.summary = {
            totalRecords: rows.length,
            matchedCount: processedShipments.filter(s => s.reconciliation.status === 'matched').length,
            mismatchCount: mismatchCount,
            notFoundCount: rows.length - processedShipments.length,
            totalAmount: totalCOD,
            discrepancyAmount: processedShipments.reduce((acc, s) => acc + (s.reconciliation.diffAmount || 0), 0)
        };

        report.discrepancies = processedShipments
            .filter(s => s.reconciliation.status === 'mismatch')
            .map(s => ({
                referenceId: s.awb,
                description: s.reconciliation.remarks || 'Mismatch',
                systemAmount: s.codAmount,
                externalAmount: s.reconciliation.courierAmount || 0,
                status: 'pending'
            }));

        report.status = 'completed';
        await report.save();

        return {
            remittanceId,
            reportId: report._id,
            totalProcessed: processedShipments.length,
            mismatches: mismatchCount,
            netPayable: batch.financial.netPayable
        };
    }

    /**
     * Generic Parse generic Excel/CSV into simplified { awb, amount } format
     * @param buffer - File buffer
     * @param mimetype - File MIME type
     * @param provider - Courier provider for column mapping
     */
    private static async parseFile(
        buffer: any,
        mimetype: string,
        mapping: ColumnMapping,
        provider: string
    ): Promise<MISRow[]> {
        const rows: MISRow[] = [];

        if (mimetype.includes('csv') || mimetype.includes('text')) {
            const stream = Readable.from(buffer.toString());
            return new Promise((resolve, reject) => {
                stream
                    .pipe(csvParser())
                    .on('data', (data) => {
                        const normalized = this.normalizeRow(data, mapping);
                        if (normalized) rows.push(normalized);
                    })
                    .on('end', () => {
                        logger.info(`Parsed ${rows.length} rows from CSV`, { provider });
                        resolve(rows);
                    })
                    .on('error', (err) => reject(err));
            });
        } else {
            // Excel file
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const worksheet = workbook.getWorksheet(1);

            if (!worksheet) {
                logger.warn('No worksheet found in Excel file');
                return [];
            }

            let headerRow: any = null;

            worksheet.eachRow((row, rowNumber) => {
                // First row is header
                if (rowNumber === 1) {
                    headerRow = {};
                    row.eachCell((cell, colNumber) => {
                        headerRow[colNumber] = cell.toString();
                    });
                    return;
                }

                // Data rows - convert to object using header
                if (headerRow) {
                    const rowData: any = {};
                    row.eachCell((cell, colNumber) => {
                        const columnName = headerRow[colNumber];
                        if (columnName) {
                            rowData[columnName] = cell.toString();
                        }
                    });

                    const normalized = this.normalizeRow(rowData, mapping);
                    if (normalized) {
                        rows.push(normalized);
                    }
                }
            });

            logger.info(`Parsed ${rows.length} rows from Excel`, { provider });
            return rows;
        }
    }

    /**
     * Normalize row from MIS file using configurable column mapping
     * @param data - Row data from CSV/Excel
     * @param provider - Courier provider ('velocity', 'delhivery', 'generic')
     */
    private static normalizeRow(data: any, mapping: ColumnMapping): MISRow | null {
        const effectiveMapping = mapping || COURIER_COLUMN_MAPPINGS.generic;

        // Find AWB column
        let awbKey: string | undefined;
        for (const possibleAwbColumn of effectiveMapping.awbColumns) {
            awbKey = Object.keys(data).find(k =>
                k.toLowerCase() === possibleAwbColumn.toLowerCase() ||
                this.normalizeHeaderKey(k) === this.normalizeHeaderKey(possibleAwbColumn)
            );
            if (awbKey) break;
        }

        // Find Amount column
        let amountKey: string | undefined;
        for (const possibleAmountColumn of effectiveMapping.amountColumns) {
            amountKey = Object.keys(data).find(k =>
                k.toLowerCase() === possibleAmountColumn.toLowerCase() ||
                this.normalizeHeaderKey(k) === this.normalizeHeaderKey(possibleAmountColumn)
            );
            if (amountKey) break;
        }

        // Find Date column (optional)
        let dateKey: string | undefined;
        if (effectiveMapping.dateColumns) {
            for (const possibleDateColumn of effectiveMapping.dateColumns) {
                dateKey = Object.keys(data).find(k =>
                    k.toLowerCase() === possibleDateColumn.toLowerCase() ||
                    this.normalizeHeaderKey(k) === this.normalizeHeaderKey(possibleDateColumn)
                );
                if (dateKey) break;
            }
        }

        // Find UTR column (optional)
        let utrKey: string | undefined;
        if (effectiveMapping.utrColumns) {
            for (const possibleUtrColumn of effectiveMapping.utrColumns) {
                utrKey = Object.keys(data).find(k =>
                    k.toLowerCase() === possibleUtrColumn.toLowerCase() ||
                    this.normalizeHeaderKey(k) === this.normalizeHeaderKey(possibleUtrColumn)
                );
                if (utrKey) break;
            }
        }

        // Validate required fields
        if (!awbKey || !amountKey) {
            logger.debug('Row missing required columns', {
                keys: Object.keys(data),
                awbFound: !!awbKey,
                amountFound: !!amountKey
            });
            return null;
        }

        const awbValue = data[awbKey]?.toString().trim();
        const amountValue = parseFloat(String(data[amountKey]).replace(/,/g, '')) || 0;

        if (!awbValue || awbValue === 'null' || awbValue === '') {
            return null;
        }

        return {
            awb: awbValue,
            amount: amountValue,
            remittanceDate: dateKey ? new Date(data[dateKey]) : undefined,
            utr: utrKey ? data[utrKey]?.toString().trim() : undefined
        };
    }
}
