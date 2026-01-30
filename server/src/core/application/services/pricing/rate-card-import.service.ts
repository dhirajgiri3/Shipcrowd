import csvParser from 'csv-parser';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import { RateCard, Zone } from '../../../../infrastructure/database/mongoose/models';
import { AppError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../../../presentation/http/middleware/system/audit-log.middleware';
import PricingMetricsService from '../metrics/pricing-metrics.service';

interface RateCardImportRow {
    name: string;
    carrier: string;
    serviceType: string;
    basePrice: number;
    minWeight: number;
    maxWeight: number;
    zone: string; // "A", "B", etc. or "Within City"
    zonePrice: number;
    status?: string | 'active';
    startDate?: string;
    endDate?: string;
}

export default class RateCardImportService {
    /**
     * Import Rate Cards from Buffer (CSV or Excel)
     */
    static async importRateCards(
        companyId: string,
        fileBuffer: Buffer,
        mimetype: string,
        userId: string,
        req: any, // Request object for audit log
        options: { dryRun?: boolean; overrides?: any; } = {}
    ): Promise<{ created: number; updated: number; errors: any[] }> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Parse File
            let rows: RateCardImportRow[] = [];
            if (mimetype.includes('csv') || mimetype.includes('text/plain')) { // CSV
                rows = await this.parseCSV(fileBuffer);
            } else if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) { // Excel
                rows = await this.parseExcel(fileBuffer);
            } else {
                throw new ValidationError('Invalid file format. Please upload CSV or Excel.');
            }

            if (rows.length === 0) {
                throw new ValidationError('File is empty or contains no valid data rows');
            }

            // 2. Validate & Group Data by Rate Card Name
            // One Rate Card (document) can have multiple rows (base rates/zones)
            const groupedData = new Map<string, RateCardImportRow[]>();

            for (const row of rows) {
                if (!row.name || !row.carrier || !row.zone) continue; // Skip empty rows

                const key = row.name.trim();
                if (!groupedData.has(key)) groupedData.set(key, []);
                groupedData.get(key)!.push(row);
            }

            let createdCount = 0;
            let updatedCount = 0;
            const errors: any[] = [];

            // 3. Process Each Rate Card Group
            for (const [rateCardName, cardRows] of groupedData) {
                try {
                    // Fetch or Instantiate
                    let rateCard = await RateCard.findOne({
                        name: rateCardName,
                        companyId: new mongoose.Types.ObjectId(companyId),
                        isDeleted: false
                    }).session(session);

                    if (rateCard && rateCard.isLocked) {
                        errors.push(`Rate Card '${rateCardName}' is locked and cannot be updated via bulk import.`);
                        continue;
                    }

                    const isNew = !rateCard;

                    if (isNew) {
                        rateCard = new RateCard({
                            name: rateCardName,
                            companyId: new mongoose.Types.ObjectId(companyId),
                            baseRates: [],
                            zoneRules: [],
                            status: cardRows[0].status || 'draft',
                            effectiveDates: {
                                startDate: cardRows[0].startDate ? new Date(cardRows[0].startDate) : new Date(),
                                endDate: cardRows[0].endDate ? new Date(cardRows[0].endDate) : undefined
                            },
                            // V2 Fields (Defaults or Overrides)
                            fuelSurcharge: options.overrides?.fuelSurcharge || 0,
                            fuelSurchargeBase: options.overrides?.fuelSurchargeBase || 'freight',
                            minimumCall: options.overrides?.minimumCall || 0,
                            version: options.overrides?.version || 'v1',
                            isLocked: options.overrides?.isLocked || false,
                            codSurcharges: []
                        });
                        createdCount++;
                    } else {
                        // Simplification: We will upsert BaseRates and ZoneRules.
                        // Apply overrides on update too? Yes, usually desired if passed.
                        if (options.overrides) {
                            if (options.overrides.fuelSurcharge !== undefined) rateCard!.fuelSurcharge = options.overrides.fuelSurcharge;
                            if (options.overrides.fuelSurchargeBase) rateCard!.fuelSurchargeBase = options.overrides.fuelSurchargeBase;
                            if (options.overrides.minimumCall !== undefined) rateCard!.minimumCall = options.overrides.minimumCall;
                            if (options.overrides.version) rateCard!.version = options.overrides.version;
                            if (options.overrides.isLocked !== undefined) rateCard!.isLocked = options.overrides.isLocked;
                        }
                    }

                    // Process Rows into Sub-Documents
                    // We need to fetch Zones to map "A" -> ObjectId
                    const zones = await Zone.find({ companyId: new mongoose.Types.ObjectId(companyId) }).session(session).lean();
                    const zoneMap = new Map(zones.map(z => [z.standardZoneCode?.toUpperCase() || z.name.toUpperCase(), z._id]));

                    const newBaseRates: any[] = [];
                    const newZoneRules: any[] = [];

                    for (const row of cardRows) {
                        // Base Rate
                        // Only add if not duplicate in this batch
                        const existingBase = newBaseRates.find(br =>
                            br.carrier === row.carrier &&
                            br.serviceType === row.serviceType &&
                            br.minWeight === row.minWeight &&
                            br.maxWeight === row.maxWeight
                        );

                        if (!existingBase) {
                            newBaseRates.push({
                                carrier: row.carrier,
                                serviceType: row.serviceType,
                                basePrice: row.basePrice || 0,
                                minWeight: row.minWeight || 0,
                                maxWeight: row.maxWeight || 50 // Default max
                            });
                        }

                        // Zone Rule
                        const zoneId = zoneMap.get(row.zone.toUpperCase());
                        // If generic zone like "A", "B", verify existence. 
                        // If not found, skip or create? For now skip with warning.
                        if (zoneId) {
                            newZoneRules.push({
                                zoneId,
                                carrier: row.carrier,
                                serviceType: row.serviceType,
                                additionalPrice: row.zonePrice || 0
                            });
                        } else {
                            // Log warning but don't fail entire batch
                            errors.push(`Zone '${row.zone}' not found for card '${rateCardName}'`);
                        }
                    }

                    // For new cards, just assign. For existing, merge? 
                    // Best practice for "Import" is usually "Overwrite/Sync" for consistency.
                    // Let's Overwrite BaseRates and ZoneRules for cleanliness.
                    rateCard!.baseRates = newBaseRates;
                    rateCard!.zoneRules = newZoneRules as any;

                    if (cardRows[0].status) rateCard!.status = cardRows[0].status as any;


                    // Validate Weight Slabs
                    const validationErrors = this.validateWeightSlabs(newBaseRates);
                    if (validationErrors.length > 0) {
                        PricingMetricsService.incrementImportError();
                        errors.push(...validationErrors.map(e => `[${rateCardName}] ${e}`));
                        continue; // Skip saving this card
                    }

                    await rateCard!.save({ session });

                    // Audit Log
                    await createAuditLog(
                        userId,
                        companyId,
                        isNew ? 'create' : 'update',
                        'ratecard',
                        String(rateCard!._id),
                        { message: `Rate Card '${rateCardName}' imported via CSV`, rows: cardRows.length },
                        req
                    );

                } catch (err: any) {
                    PricingMetricsService.incrementImportError();
                    errors.push({ name: rateCardName, error: err.message });
                }
            }

            if (options.dryRun) {
                await session.abortTransaction();
                logger.info(`Bulk Rate Card Import DRY RUN: ${createdCount} created, ${updatedCount} updated (simulated)`);
            } else {
                await session.commitTransaction();
                logger.info(`Bulk Rate Card Import Complete: ${createdCount} created, ${updatedCount} updated`);

                // Invalidate Cache to ensure immediate propagation
                const cacheService = (await import('./pricing-cache.service.js')).getPricingCache();
                await cacheService.invalidateRateCard(companyId);
                logger.info(`Invalidated Pricing Cache for Company ${companyId}`);
            }

            return { created: createdCount, updated: updatedCount, errors };

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error in Rate Card Import Service:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    private static async parseCSV(buffer: Buffer): Promise<RateCardImportRow[]> {
        const rows: RateCardImportRow[] = [];
        return new Promise((resolve, reject) => {
            const stream = Readable.from(buffer.toString());
            stream
                .pipe(csvParser())
                .on('data', (data) => {
                    const row = this.normalizeRow(data);
                    if (row) rows.push(row);
                })
                .on('end', () => resolve(rows))
                .on('error', (err) => reject(err));
        });
    }

    private static async parseExcel(buffer: Buffer): Promise<RateCardImportRow[]> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        const worksheet = workbook.getWorksheet(1);
        const rows: RateCardImportRow[] = [];

        if (!worksheet) return [];

        // Assuming Row 1 is header
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = cell.toString().toLowerCase().trim();
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const rowData: any = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    rowData[header] = cell.value; // Keep original value types if possible
                }
            });
            const normalized = this.normalizeRow(rowData);
            if (normalized) rows.push(normalized);
        });

        return rows;
    }

    private static normalizeRow(data: any): RateCardImportRow | null {
        // Map loose headers to strict interface
        // Helper to find key efficiently
        const findVal = (keywords: string[]) => {
            const key = Object.keys(data).find(k => keywords.some(kw => k.toLowerCase().includes(kw)));
            return key ? data[key] : undefined;
        };

        const name = findVal(['name', 'rate card']);
        const carrier = findVal(['carrier', 'logistics']);
        const service = findVal(['service', 'mode']);

        if (!name || !carrier || !service) return null;

        return {
            name: String(name).trim(),
            carrier: String(carrier).trim(),
            serviceType: String(service).trim(),
            basePrice: Number(findVal(['base', 'price'])) || 0,
            minWeight: Number(findVal(['min', 'weight'])) || 0,
            maxWeight: Number(findVal(['max', 'weight'])) || 50,
            zone: String(findVal(['zone'])).trim(),
            zonePrice: Number(findVal(['zone price', 'additional'])) || 0,
            status: findVal(['status']),
            startDate: findVal(['start', 'effective']),
            endDate: findVal(['end', 'expiry'])
        };
    }
    private static validateWeightSlabs(baseRates: any[]): string[] {
        const errors: string[] = [];
        const groups = new Map<string, any[]>();

        // Group by carrier + service
        for (const rate of baseRates) {
            const key = `${rate.carrier}:${rate.serviceType}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(rate);
        }

        // Validate each group
        for (const [key, rates] of groups) {
            const sorted = rates.sort((a, b) => a.minWeight - b.minWeight);
            for (let i = 1; i < sorted.length; i++) {
                if (sorted[i].minWeight < sorted[i - 1].maxWeight) {
                    errors.push(`Overlapping weight slabs for ${key}: [${sorted[i - 1].minWeight}-${sorted[i - 1].maxWeight}] overlaps with [${sorted[i].minWeight}-${sorted[i].maxWeight}]`);
                }
            }
        }

        return errors;
    }
}
