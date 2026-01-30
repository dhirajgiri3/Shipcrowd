import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import CODRemittance from '../../../../infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model';
import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';

import { VelocityRemittanceService } from './remittance/velocity-remittance.service';

interface MISRow {
    awb: string;
    amount: number;
    remittanceDate?: Date;
    utr?: string;
}

export default class RemittanceReconciliationService {
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
        provider: 'generic' | 'velocity' = 'generic'
    ) {
        // 1. Parse File
        let rows: MISRow[] = [];

        if (provider === 'velocity') {
            rows = await VelocityRemittanceService.parseMIS(fileBuffer);
        } else {
            rows = await this.parseFile(fileBuffer, mimetype);
        }

        if (rows.length === 0) {
            throw new AppError('MIS file is empty or invalid format', ErrorCode.VAL_INVALID_INPUT, 400);
        }

        logger.info(`[Reconciliation] Parsed ${rows.length} rows from MIS (${provider}) for company ${companyId}`);

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
        await Shipment.updateMany(
            { _id: { $in: processedShipments.map(s => s.shipmentId) } },
            {
                $set: {
                    'remittance.included': true,
                    'remittance.remittanceId': remittanceId
                }
            }
        );

        return {
            remittanceId,
            totalProcessed: processedShipments.length,
            mismatches: mismatchCount,
            netPayable: batch.financial.netPayable
        };
    }

    /**
     * Generic Parse generic Excel/CSV into simplified { awb, amount } format
     */
    private static async parseFile(buffer: any, mimetype: string): Promise<MISRow[]> {
        // ... (Existing implementation) ...
        const rows: MISRow[] = [];
        // Copying existing implementation for CSV/Excel logic safety
        if (mimetype.includes('csv')) {
            const stream = Readable.from(buffer.toString());
            return new Promise((resolve, reject) => {
                stream
                    .pipe(csvParser())
                    .on('data', (data) => {
                        const normalized = this.normalizeRow(data);
                        if (normalized) rows.push(normalized);
                    })
                    .on('end', () => resolve(rows))
                    .on('error', (err) => reject(err));
            });
        } else {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) return [];
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                const rowValues = row.values as any[];
                if (rowValues && rowValues.length >= 2) {
                    const awb = row.getCell(1).toString();
                    const amt = parseFloat(row.getCell(2).toString()) || 0;
                    if (awb && awb !== 'null') {
                        rows.push({ awb, amount: amt });
                    }
                }
            });
            return rows;
        }
    }

    private static normalizeRow(data: any): MISRow | null {
        const keys = Object.keys(data);
        const awbKey = keys.find(k => k.toLowerCase().includes('awb') || k.toLowerCase().includes('tracking'));
        const amountKey = keys.find(k => k.toLowerCase().includes('cod') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('collected'));
        if (!awbKey || !amountKey) return null;
        return {
            awb: data[awbKey]?.trim(),
            amount: parseFloat(data[amountKey]) || 0
        };
    }
}
