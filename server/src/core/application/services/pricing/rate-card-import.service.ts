import csvParser from 'csv-parser';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import { RateCard } from '../../../../infrastructure/database/mongoose/models';
import { ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { createAuditLog } from '../../../../presentation/http/middleware/system/audit-log.middleware';
import PricingMetricsService from '../metrics/pricing-metrics.service';

interface ZonePricingImportRow {
    name: string;
    zone: string;
    baseWeight?: number;
    basePrice?: number;
    additionalPricePerKg?: number;
    status?: string;
    effectiveStartDate?: string;
    effectiveEndDate?: string;
    category?: string;
    shipmentType?: string;
    minimumFare?: number;
    minimumFareCalculatedOn?: string;
    codPercentage?: number;
    codMinimumCharge?: number;
    fuelSurcharge?: number;
    zoneBType?: string;
    rowNumber?: number;
}

interface ParsedImportData {
    headers: string[];
    rows: Array<{ data: Record<string, any>; rowNumber: number }>;
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
            let parsed: ParsedImportData;
            if (mimetype.includes('csv') || mimetype.includes('text/plain')) { // CSV
                parsed = await this.parseCSV(fileBuffer);
            } else if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) { // Excel
                parsed = await this.parseExcel(fileBuffer);
            } else {
                throw new ValidationError('Invalid file format. Please upload CSV or Excel.');
            }

            if (parsed.rows.length === 0) {
                throw new ValidationError('File is empty or contains no valid data rows');
            }

            const isZonePricing = this.detectZonePricingFormat(parsed.headers);
            if (!isZonePricing) {
                throw new ValidationError('Unsupported import format. Please use the Zone Pricing CSV template.');
            }

            // 2. Validate & Group Data by Rate Card Name
            // One Rate Card (document) can have multiple rows (zone pricing rows)
            const groupedData = new Map<string, ZonePricingImportRow[]>();
            const normalizedRows = parsed.rows
                .map((row) => this.normalizeZonePricingRow(row.data, row.rowNumber))
                .filter(Boolean) as ZonePricingImportRow[];

            if (normalizedRows.length === 0) {
                throw new ValidationError('File contains no valid data rows');
            }

            for (const row of normalizedRows) {
                if (!row.name || !row.zone) continue; // Skip empty rows

                const key = row.name.trim();
                if (!groupedData.has(key)) groupedData.set(key, []);
                groupedData.get(key)!.push(row);
            }

            let createdCount = 0;
            let updatedCount = 0;
            const errors: any[] = [];

            const companyObjectId = new mongoose.Types.ObjectId(companyId);
            const rateCardNames = Array.from(groupedData.keys());
            const existingRateCards = rateCardNames.length > 0
                ? await RateCard.find({
                    name: { $in: rateCardNames },
                    companyId: companyObjectId,
                    isDeleted: false,
                }).session(session)
                : [];
            const existingRateCardMap = new Map(existingRateCards.map(card => [card.name, card]));

            // 3. Process Each Rate Card Group
            for (const [rateCardName, cardRows] of groupedData) {
                try {
                    // Fetch or Instantiate
                    let rateCard = existingRateCardMap.get(rateCardName);

                    const firstRowNumber = (cardRows[0] as any)?.rowNumber;

                    if (rateCard && rateCard.isLocked) {
                        errors.push({
                            name: rateCardName,
                            rowNumber: firstRowNumber,
                            error: `Rate Card '${rateCardName}' is locked and cannot be updated via bulk import.`
                        });
                        continue;
                    }

                    const isNew = !rateCard;

                    const zonePricingRows = cardRows as ZonePricingImportRow[];
                    const referenceRow = zonePricingRows[0];
                    const metadataFields: Array<keyof ZonePricingImportRow> = [
                        'status',
                        'effectiveStartDate',
                        'effectiveEndDate',
                        'category',
                        'shipmentType',
                        'minimumFare',
                        'minimumFareCalculatedOn',
                        'codPercentage',
                        'codMinimumCharge',
                        'fuelSurcharge',
                        'zoneBType'
                    ];

                    let hasMetadataConflict = false;
                    for (const row of zonePricingRows) {
                        for (const field of metadataFields) {
                            if (row[field] !== undefined && referenceRow[field] !== undefined) {
                                if (String(row[field]).trim() !== String(referenceRow[field]).trim()) {
                                    errors.push({
                                        name: rateCardName,
                                        rowNumber: row.rowNumber,
                                        error: `Inconsistent ${field} value within rate card rows`
                                    });
                                    hasMetadataConflict = true;
                                }
                            }
                        }
                    }
                    if (hasMetadataConflict) {
                        PricingMetricsService.incrementImportError();
                        continue;
                    }

                    const requiredZones = ['A', 'B', 'C', 'D', 'E'];
                    const zoneMapByCode = new Map<string, ZonePricingImportRow>();
                    for (const row of zonePricingRows) {
                        const zoneCode = this.normalizeZoneCode(row.zone);
                        if (!zoneCode) {
                            errors.push({ name: rateCardName, rowNumber: row.rowNumber, error: `Invalid zone '${row.zone}'` });
                            continue;
                        }
                        if (zoneMapByCode.has(zoneCode)) {
                            errors.push({ name: rateCardName, rowNumber: row.rowNumber, error: `Duplicate zone '${zoneCode}'` });
                            continue;
                        }
                        zoneMapByCode.set(zoneCode, row);
                    }

                    const missingZones = requiredZones.filter(zone => !zoneMapByCode.has(zone));
                    if (missingZones.length > 0) {
                        PricingMetricsService.incrementImportError();
                        errors.push({
                            name: rateCardName,
                            rowNumber: referenceRow.rowNumber,
                            error: `Missing zones: ${missingZones.join(', ')}`
                        });
                        continue;
                    }

                    const zonePricing: any = {};
                    let hasZoneErrors = false;
                    for (const zoneCode of requiredZones) {
                        const row = zoneMapByCode.get(zoneCode)!;
                        const baseWeight = row.baseWeight;
                        const basePrice = row.basePrice;
                        const additionalPricePerKg = row.additionalPricePerKg;

                        if (![baseWeight, basePrice, additionalPricePerKg].every(val => Number.isFinite(val) && val >= 0)) {
                            errors.push({
                                name: rateCardName,
                                rowNumber: row.rowNumber,
                                error: `Invalid pricing values for zone '${zoneCode}'`
                            });
                            hasZoneErrors = true;
                            continue;
                        }

                        zonePricing[`zone${zoneCode}`] = {
                            baseWeight,
                            basePrice,
                            additionalPricePerKg
                        };
                    }

                    if (hasZoneErrors) {
                        PricingMetricsService.incrementImportError();
                        continue;
                    }

                    const effectiveStartDate = this.parseDate(referenceRow.effectiveStartDate) || new Date();
                    const effectiveEndDate = this.parseDate(referenceRow.effectiveEndDate);
                    const normalizedZoneBType = this.normalizeZoneBType(referenceRow.zoneBType);
                    if (referenceRow.zoneBType !== undefined && !normalizedZoneBType) {
                        PricingMetricsService.incrementImportError();
                        errors.push({
                            name: rateCardName,
                            rowNumber: referenceRow.rowNumber,
                            error: `Invalid zoneBType '${referenceRow.zoneBType}'. Use 'state' or 'distance'.`
                        });
                        continue;
                    }
                    const normalizedStatus = this.normalizeStatus(referenceRow.status);
                    const normalizedShipmentType = this.normalizeShipmentType(referenceRow.shipmentType);
                    const normalizedMinimumFareCalculatedOn = this.normalizeMinimumFareCalculatedOn(referenceRow.minimumFareCalculatedOn);
                    const resolvedFuelSurcharge = referenceRow.fuelSurcharge ?? options.overrides?.fuelSurcharge ?? 0;
                    const resolvedFuelSurchargeBase = options.overrides?.fuelSurchargeBase || 'freight';

                    if (isNew) {
                        rateCard = new RateCard({
                            name: rateCardName,
                            companyId: companyObjectId,
                            zonePricing,
                            status: normalizedStatus || 'draft',
                            effectiveDates: {
                                startDate: effectiveStartDate,
                                endDate: effectiveEndDate
                            },
                            rateCardCategory: referenceRow.category,
                            shipmentType: normalizedShipmentType,
                            minimumFare: referenceRow.minimumFare,
                            minimumFareCalculatedOn: normalizedMinimumFareCalculatedOn,
                            codPercentage: referenceRow.codPercentage,
                            codMinimumCharge: referenceRow.codMinimumCharge,
                            fuelSurcharge: resolvedFuelSurcharge,
                            fuelSurchargeBase: resolvedFuelSurchargeBase,
                            zoneBType: normalizedZoneBType || 'state',
                            version: options.overrides?.version || 'v2',
                            isLocked: options.overrides?.isLocked || false
                        });
                        createdCount++;
                    } else {
                        rateCard!.zonePricing = zonePricing;
                        if (normalizedStatus) rateCard!.status = normalizedStatus as any;
                        rateCard!.effectiveDates = {
                            startDate: effectiveStartDate,
                            endDate: effectiveEndDate
                        };
                        rateCard!.rateCardCategory = referenceRow.category || rateCard!.rateCardCategory;
                        rateCard!.shipmentType = normalizedShipmentType || rateCard!.shipmentType;
                        if (referenceRow.minimumFare !== undefined) rateCard!.minimumFare = referenceRow.minimumFare;
                        if (normalizedMinimumFareCalculatedOn) rateCard!.minimumFareCalculatedOn = normalizedMinimumFareCalculatedOn;
                        if (referenceRow.codPercentage !== undefined) rateCard!.codPercentage = referenceRow.codPercentage;
                        if (referenceRow.codMinimumCharge !== undefined) rateCard!.codMinimumCharge = referenceRow.codMinimumCharge;
                        rateCard!.fuelSurcharge = resolvedFuelSurcharge ?? rateCard!.fuelSurcharge;
                        rateCard!.fuelSurchargeBase = resolvedFuelSurchargeBase || rateCard!.fuelSurchargeBase;
                        rateCard!.zoneBType = normalizedZoneBType || rateCard!.zoneBType || 'state';

                        if (options.overrides) {
                            if (options.overrides.version) rateCard!.version = options.overrides.version;
                            if (options.overrides.isLocked !== undefined) rateCard!.isLocked = options.overrides.isLocked;
                        }
                    }

                    await rateCard!.save({ session });

                    if (!isNew) {
                        updatedCount++;
                    }

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
                    errors.push({ name: rateCardName, rowNumber: (cardRows[0] as any)?.rowNumber, error: err.message });
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

    private static async parseCSV(buffer: Buffer): Promise<ParsedImportData> {
        const rows: Array<{ data: Record<string, any>; rowNumber: number }> = [];
        let headers: string[] = [];
        let rowNumber = 1;
        return new Promise((resolve, reject) => {
            const stream = Readable.from(buffer.toString());
            stream
                .pipe(csvParser())
                .on('headers', (headerList) => {
                    headers = headerList.map((header: string) => header.toString().trim());
                })
                .on('data', (data) => {
                    rowNumber += 1;
                    rows.push({ data, rowNumber });
                })
                .on('end', () => resolve({ headers, rows }))
                .on('error', (err) => reject(err));
        });
    }

    private static async parseExcel(buffer: Buffer): Promise<ParsedImportData> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        const worksheet = workbook.getWorksheet(1);
        const rows: Array<{ data: Record<string, any>; rowNumber: number }> = [];

        if (!worksheet) return { headers: [], rows: [] };

        // Assuming Row 1 is header
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = cell.toString().trim();
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
            rows.push({ data: rowData, rowNumber });
        });

        return { headers, rows };
    }

    private static normalizeZonePricingRow(data: any, rowNumber: number): ZonePricingImportRow | null {
        const findVal = (keywords: string[]) => {
            const key = Object.keys(data).find(k => keywords.some(kw => k.toLowerCase().includes(kw)));
            return key ? data[key] : undefined;
        };

        const name = findVal(['name', 'rate card']);
        const zone = findVal(['zone']);

        if (!name || !zone) return null;

        return {
            name: String(name).trim(),
            zone: String(zone).trim(),
            baseWeight: this.parseNumber(findVal(['base weight'])),
            basePrice: this.parseNumber(findVal(['base price'])),
            additionalPricePerKg: this.parseNumber(findVal(['additional price per kg', 'additional per kg', 'additionalpriceperkg'])),
            status: findVal(['status']),
            effectiveStartDate: findVal(['effective start', 'start date', 'start']),
            effectiveEndDate: findVal(['effective end', 'end date', 'expiry']),
            category: findVal(['category']),
            shipmentType: findVal(['shipment type', 'shipment']),
            minimumFare: this.parseNumber(findVal(['minimum fare', 'min fare'])),
            minimumFareCalculatedOn: findVal(['minimum fare calculated on', 'minimum calculated']),
            codPercentage: this.parseNumber(findVal(['cod percentage', 'cod percent', 'cod%'])),
            codMinimumCharge: this.parseNumber(findVal(['cod minimum charge', 'cod min'])),
            fuelSurcharge: this.parseNumber(findVal(['fuel surcharge'])),
            zoneBType: findVal(['zonebtype', 'zone b type']),
            rowNumber
        };
    }

    private static detectZonePricingFormat(headers: string[]): boolean {
        const normalized = headers.map((header) => this.normalizeHeader(header));
        const hasZone = normalized.some(h => h === 'zone');
        const hasBaseWeight = normalized.some(h => h.includes('baseweight'));
        const hasAdditionalPerKg = normalized.some(h => h.includes('additionalpriceperkg') || (h.includes('additional') && h.includes('perkg')));
        return hasZone && hasBaseWeight && hasAdditionalPerKg;
    }

    private static normalizeHeader(header: string): string {
        return header.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    private static normalizeZoneCode(zone: string | undefined): string | null {
        if (!zone) return null;
        const cleaned = zone.toString().toUpperCase().replace(/ZONE/g, '').trim();
        return ['A', 'B', 'C', 'D', 'E'].includes(cleaned) ? cleaned : null;
    }

    private static normalizeZoneBType(zoneBType: string | undefined): 'state' | 'distance' | undefined {
        if (!zoneBType) return undefined;
        const normalized = zoneBType.toString().toLowerCase().trim();
        if (normalized === 'distance' || normalized === 'state') return normalized;
        return undefined;
    }

    private static normalizeStatus(status: any): 'draft' | 'active' | 'inactive' | 'expired' | undefined {
        if (!status) return undefined;
        const normalized = status.toString().toLowerCase().trim();
        if (['draft', 'active', 'inactive', 'expired'].includes(normalized)) {
            return normalized as 'draft' | 'active' | 'inactive' | 'expired';
        }
        return undefined;
    }

    private static normalizeShipmentType(shipmentType: any): 'forward' | 'reverse' | undefined {
        if (!shipmentType) return undefined;
        const normalized = shipmentType.toString().toLowerCase().trim();
        if (normalized === 'forward' || normalized === 'reverse') return normalized;
        return undefined;
    }

    private static normalizeMinimumFareCalculatedOn(value: any): 'freight' | 'freight_overhead' | undefined {
        if (!value) return undefined;
        const normalized = value.toString().toLowerCase().trim();
        if (normalized === 'freight' || normalized === 'freight_overhead') return normalized;
        return undefined;
    }

    private static parseNumber(value: any): number | undefined {
        if (value === undefined || value === null || value === '') return undefined;
        const cleaned = String(value).replace(/[%₹,]/g, '').trim();
        if (!cleaned) return undefined;
        const num = Number(cleaned);
        return Number.isFinite(num) ? num : undefined;
    }

    private static parseDate(value: any): Date | undefined {
        if (!value) return undefined;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
}
