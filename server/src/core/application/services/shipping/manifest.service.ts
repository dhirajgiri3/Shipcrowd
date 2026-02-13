import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Manifest from '../../../../infrastructure/database/mongoose/models/logistics/shipping/manifest.model';
import ManifestCounter from '../../../../infrastructure/database/mongoose/models/logistics/shipping/manifest-counter.model';
import { Shipment, Warehouse } from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { CourierFactory } from '../courier/courier.factory';
import CourierProviderRegistry from '../courier/courier-provider-registry';
import QueueManager from '../../../../infrastructure/utilities/queue-manager';
import { getManifestCarrierStrategy } from './manifest-carrier-strategy';

/**
 * Manifest Service
 * Handles manifest creation, numbering, and pickup scheduling
 * 
 * Features:
 * - Transaction-safe manifest numbering
 * - Carrier validation (1 manifest = 1 carrier)
 * - Pickup scheduling
 * - A4 handover sheet generation
 */

interface CreateManifestData {
    companyId: string;
    warehouseId?: string;
    carrier: 'velocity' | 'delhivery' | 'ekart';
    shipmentIds: string[];
    pickup: {
        scheduledDate: Date;
        timeSlot: string;
        contactPerson: string;
        contactPhone: string;
    };
    notes?: string;
}

class ManifestService {
    private readonly ELIGIBLE_STATUSES = ['pending_pickup', 'ready_to_ship'];

    private normalizeCarrier(value?: string): string {
        const carrier = (value || '').toLowerCase();

        const supported = CourierProviderRegistry.toCanonical(carrier);
        if (supported) return supported;

        return carrier;
    }
    /**
     * Generate manifest number (transaction-safe)
     * Format: MAN-YYYYMM-XXXX
     */
    private async generateManifestNumber(
        session: mongoose.ClientSession
    ): Promise<string> {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // Atomic increment using findOneAndUpdate
        const counter = await ManifestCounter.findOneAndUpdate(
            { year, month },
            { $inc: { sequence: 1 } },
            {
                upsert: true,
                new: true,
                session,
            }
        );

        const paddedSeq = String(counter.sequence).padStart(4, '0');
        const yearMonth = `${year}${String(month).padStart(2, '0')}`;

        return `MAN-${yearMonth}-${paddedSeq}`;
    }

    /**
     * Create manifest from shipments
     */
    async createManifest(data: CreateManifestData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Validate shipment IDs
            if (!data.shipmentIds || data.shipmentIds.length === 0) {
                throw new ValidationError('At least one shipment is required');
            }

            // Fetch shipments (company-scoped)
            const shipments = await Shipment.find({
                _id: { $in: data.shipmentIds },
                companyId: new mongoose.Types.ObjectId(data.companyId),
                isDeleted: false,
            }).session(session);

            if (shipments.length === 0) {
                throw new NotFoundError('No valid shipments found');
            }

            if (shipments.length !== data.shipmentIds.length) {
                throw new ValidationError('Some shipment IDs are invalid or do not belong to your company');
            }

            // Validate shipment statuses for manifesting
            const invalidStatusShipments = shipments.filter(
                (s: any) => !this.ELIGIBLE_STATUSES.includes(s.currentStatus)
            );
            if (invalidStatusShipments.length > 0) {
                throw new ValidationError(
                    `Cannot manifest ${invalidStatusShipments.length} shipment(s): invalid status. Allowed statuses: ${this.ELIGIBLE_STATUSES.join(', ')}`
                );
            }

            // Prevent duplicate manifest membership for any shipment ID
            const existingManifest = await Manifest.findOne({
                companyId: new mongoose.Types.ObjectId(data.companyId),
                'shipments.shipmentId': {
                    $in: shipments.map((s: any) => s._id),
                },
            })
                .select('manifestNumber')
                .session(session);

            if (existingManifest) {
                throw new ValidationError(
                    `One or more shipments are already part of manifest ${existingManifest.manifestNumber}`
                );
            }

            // Derive warehouseId from shipments if not provided
            const warehouseIds = [
                ...new Set(
                    shipments
                        .map((s: any) => s.pickupDetails?.warehouseId?.toString())
                        .filter(Boolean)
                ),
            ];

            if (warehouseIds.length === 0) {
                throw new ValidationError('Warehouse ID is required for manifest creation');
            }

            if (warehouseIds.length > 1) {
                throw new ValidationError('Shipments must belong to the same warehouse');
            }

            let resolvedWarehouseId = data.warehouseId;
            if (!resolvedWarehouseId) {
                resolvedWarehouseId = warehouseIds[0];
            } else if (resolvedWarehouseId.toString() !== warehouseIds[0]) {
                throw new ValidationError('Provided warehouseId does not match shipment pickup warehouse');
            }

            // Validate all shipments belong to same carrier
            const carriers = [...new Set(shipments.map((s: any) => this.normalizeCarrier(s.carrier)))];
            if (carriers.length > 1) {
                throw new ValidationError(
                    'Cannot create manifest with shipments from different carriers'
                );
            }

            const requestedCarrier = this.normalizeCarrier(data.carrier);
            if (!CourierProviderRegistry.isSupported(requestedCarrier)) {
                throw new ValidationError(`Unsupported carrier '${data.carrier}'. Supported carriers: velocity, delhivery, ekart`);
            }
            if (carriers[0] !== requestedCarrier) {
                throw new ValidationError(
                    `Shipments belong to ${carriers[0]}, but manifest is for ${data.carrier}`
                );
            }

            const missingAwbShipments = shipments.filter(
                (s: any) => !String(s.carrierDetails?.carrierTrackingNumber || '').trim()
            );
            if (missingAwbShipments.length > 0) {
                throw new ValidationError(
                    `Cannot create manifest: ${missingAwbShipments.length} shipment(s) are missing carrier AWB`,
                    {
                        shipmentIds: missingAwbShipments.map((s: any) => s._id.toString()),
                        reason: 'carrier_awb_missing',
                    }
                );
            }

            // Generate manifest number
            const manifestNumber = await this.generateManifestNumber(session);

            // Calculate summary
            const summary = {
                totalShipments: shipments.length,
                totalWeight: shipments.reduce((sum, s: any) => sum + (s.packageDetails?.weight || 0), 0),
                totalPackages: shipments.reduce((sum, s: any) => sum + (s.packageDetails?.packageCount || 1), 0),
                totalCODAmount: shipments.reduce(
                    (sum, s: any) => sum + (s.paymentDetails?.type === 'cod' ? s.paymentDetails?.codAmount || 0 : 0),
                    0
                ),
            };

            // Call Carrier API for Manifest Creation (if supported)
            let carrierManifestId: string | undefined;
            let carrierManifestUrl: string | undefined;
            const carrierStrategy = getManifestCarrierStrategy(requestedCarrier);
            if (carrierStrategy.pickupMode === 'shipment') {
                const missingProviderShipments = shipments.filter(
                    (s: any) => !String(s.carrierDetails?.providerShipmentId || '').trim()
                );
                if (missingProviderShipments.length > 0) {
                    throw new ValidationError(
                        `Cannot create manifest: ${missingProviderShipments.length} shipment(s) are missing provider shipment IDs for pickup scheduling`,
                        {
                            shipmentIds: missingProviderShipments.map((s: any) => s._id.toString()),
                            reason: 'provider_shipment_id_missing',
                        }
                    );
                }
            }

            try {
                const provider = await CourierFactory.getProvider(
                    requestedCarrier,
                    new mongoose.Types.ObjectId(data.companyId)
                );

                logger.info('Resolved manifest carrier strategy', {
                    carrier: requestedCarrier,
                    externalManifestMode: carrierStrategy.externalManifestMode,
                    pickupMode: carrierStrategy.pickupMode,
                    pickupTrigger: carrierStrategy.pickupTrigger,
                });

                // Call external manifest API only when strategy explicitly allows it.
                if (
                    carrierStrategy.externalManifestMode === 'api' &&
                    provider &&
                    typeof (provider as any).createManifest === 'function'
                ) {
                    logger.info(`Calling ${requestedCarrier} API for manifest creation...`);

                    const apiResult = await (provider as any).createManifest({
                        shipmentIds: shipments.map((s: any) => s._id.toString()),
                        awbs: shipments.map((s: any) => s.carrierDetails?.carrierTrackingNumber),
                        warehouseId: resolvedWarehouseId
                    });

                    if (apiResult) {
                        carrierManifestId = apiResult.manifestId;
                        carrierManifestUrl = apiResult.manifestUrl;
                        logger.info(`Carrier manifest created: ${carrierManifestId}`, { carrier: requestedCarrier });
                    }
                } else {
                    logger.info('Skipping external carrier manifest call due to configured strategy', {
                        carrier: requestedCarrier,
                        externalManifestMode: carrierStrategy.externalManifestMode,
                    });
                }
            } catch (carrierError: any) {
                // We log error but proceed with internal manifest to avoid blocking operations
                // However, we mark it in notes that carrier sync failed
                logger.error('Carrier manifest creation failed', {
                    error: carrierError.message,
                    carrier: requestedCarrier
                });
                data.notes = (data.notes ? data.notes + '\n' : '') + `[WARNING] Carrier manifest syncing failed: ${carrierError.message}`;
            }

            // Prepare shipment data
            const manifestShipments = shipments.map((s: any) => ({
                shipmentId: s._id,
                awb: s.carrierDetails?.carrierTrackingNumber,
                weight: s.packageDetails?.weight || 0,
                packages: s.packageDetails?.packageCount || 1,
                codAmount: s.paymentDetails?.type === 'cod' ? s.paymentDetails?.codAmount || 0 : 0,
            }));

            // Create manifest
            const manifest = await Manifest.create(
                [
                    {
                        manifestNumber,
                        companyId: new mongoose.Types.ObjectId(data.companyId),
                        warehouseId: new mongoose.Types.ObjectId(resolvedWarehouseId),
                        carrier: requestedCarrier,
                        shipments: manifestShipments,
                        pickup: data.pickup,
                        summary,
                        status: 'open',
                        notes: data.notes,
                        metadata: {
                            carrierManifestId,
                            carrierManifestUrl,
                            generatedAt: new Date()
                        }
                    },
                ],
                { session }
            );

            await session.commitTransaction();

            logger.info(
                `Manifest created: ${manifestNumber} with ${shipments.length} shipments`
            );

            return manifest[0];
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Error creating manifest:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Generate manifest PDF (A4 handover sheet)
     */
    async generatePDF(manifestId: string, companyId: string): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                if (!mongoose.Types.ObjectId.isValid(manifestId)) {
                    throw new ValidationError('Invalid manifest ID format');
                }

                const manifest = await Manifest.findOne({
                    _id: manifestId,
                    companyId: new mongoose.Types.ObjectId(companyId),
                }).populate('warehouseId');

                if (!manifest) {
                    throw new NotFoundError('Manifest not found');
                }

                const shipmentIds = manifest.shipments.map((s: any) => s.shipmentId).filter(Boolean);
                const shipmentDocs = shipmentIds.length > 0
                    ? await Shipment.find({ _id: { $in: shipmentIds } })
                        .select('trackingNumber deliveryDetails.recipientName deliveryDetails.address')
                        .lean()
                    : [];

                const shipmentMap = new Map<string, any>();
                shipmentDocs.forEach((shipment: any) => {
                    shipmentMap.set(shipment._id.toString(), shipment);
                });

                const formatNumber = (value: number): string => {
                    if (!Number.isFinite(value)) return '0.00';
                    return value.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    });
                };

                const formatWeight = (value: number): string => `${formatNumber(value)} kg`;
                const formatMoney = (value: number): string => `INR ${formatNumber(value)}`;
                const formatDate = (value: Date): string =>
                    new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

                const warehouse: any = manifest.warehouseId || {};
                const address = warehouse?.address || {};
                const addressParts = [
                    address.line1,
                    address.line2,
                    address.city,
                    address.state,
                    address.postalCode,
                ].filter((part: any) => typeof part === 'string' && part.trim().length > 0);
                const warehouseAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
                const warehouseContact =
                    warehouse?.contactInfo?.phone ||
                    warehouse?.phone ||
                    manifest.pickup.contactPhone ||
                    'N/A';

                // Create PDF document (A4 size)
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 },
                });

                const chunks: Buffer[] = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
                const footerY = doc.page.height - doc.page.margins.bottom + 4;

                const drawFooter = () => {
                    doc
                        .fontSize(8)
                        .fillColor('#6B7280')
                        .text(`Generated on ${new Date().toLocaleString('en-IN')}`, doc.page.margins.left, footerY, {
                            width: pageWidth,
                            align: 'center',
                        })
                        .fillColor('#111827');
                };

                const tableStartX = doc.page.margins.left;
                const tableTopPadding = 6;
                const rowHeight = 20;
                const headerHeight = 18;
                const maxTableY = doc.page.height - doc.page.margins.bottom - 70;
                const colWidths = [26, 94, 164, 64, 48, 80];
                const headers = ['#', 'AWB', 'Consignee / Destination', 'Weight', 'Pkgs', 'COD'];
                const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);

                const drawTableHeader = (y: number) => {
                    doc
                        .rect(tableStartX, y, tableWidth, headerHeight)
                        .fill('#F3F4F6')
                        .strokeColor('#D1D5DB')
                        .stroke();

                    let x = tableStartX;
                    doc.fontSize(8).font('Helvetica-Bold').fillColor('#111827');
                    headers.forEach((header, index) => {
                        doc.text(header, x + 4, y + tableTopPadding, {
                            width: colWidths[index] - 8,
                            align: index >= 3 ? 'right' : 'left',
                        });
                        x += colWidths[index];
                        if (index < headers.length - 1) {
                            doc.moveTo(x, y).lineTo(x, y + headerHeight).strokeColor('#D1D5DB').stroke();
                        }
                    });
                };

                const drawRow = (row: string[], y: number, index: number) => {
                    const isEven = index % 2 === 0;
                    doc
                        .rect(tableStartX, y, tableWidth, rowHeight)
                        .fill(isEven ? '#FFFFFF' : '#FAFAFA')
                        .strokeColor('#E5E7EB')
                        .stroke();

                    let x = tableStartX;
                    doc.fontSize(8).font('Helvetica').fillColor('#111827');
                    row.forEach((value, columnIndex) => {
                        doc.text(value, x + 4, y + tableTopPadding, {
                            width: colWidths[columnIndex] - 8,
                            align: columnIndex >= 3 ? 'right' : 'left',
                            ellipsis: true,
                        });
                        x += colWidths[columnIndex];
                        if (columnIndex < row.length - 1) {
                            doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor('#E5E7EB').stroke();
                        }
                    });
                };

                // Header
                doc
                    .fontSize(18)
                    .font('Helvetica-Bold')
                    .fillColor('#111827')
                    .text('SHIPPING MANIFEST', { align: 'center' });

                doc.moveDown(0.3);

                doc
                    .fontSize(11)
                    .font('Helvetica')
                    .fillColor('#374151')
                    .text(`Manifest: ${manifest.manifestNumber}`, { align: 'center' });

                doc
                    .fontSize(9)
                    .fillColor('#6B7280')
                    .text(`Created: ${formatDate(manifest.createdAt)}`, { align: 'center' });

                doc.moveDown(1);

                // Warehouse + pickup
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('Warehouse Details');
                doc
                    .fontSize(9)
                    .font('Helvetica')
                    .fillColor('#111827')
                    .text(`Name: ${warehouse?.name || 'N/A'}`)
                    .text(`Address: ${warehouseAddress}`)
                    .text(`Contact: ${warehouseContact}`);

                doc.moveDown(0.5);

                doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('Carrier & Pickup');
                doc
                    .fontSize(9)
                    .font('Helvetica')
                    .fillColor('#111827')
                    .text(`Carrier: ${manifest.carrier.toUpperCase()}`)
                    .text(`Scheduled Date: ${formatDate(manifest.pickup.scheduledDate)}`)
                    .text(`Time Slot: ${manifest.pickup.timeSlot}`)
                    .text(`Contact Person: ${manifest.pickup.contactPerson}`)
                    .text(`Contact Phone: ${manifest.pickup.contactPhone}`);

                if ((manifest as any)?.metadata?.carrierManifestId) {
                    doc.text(`Carrier Manifest ID: ${(manifest as any).metadata.carrierManifestId}`);
                }

                doc.moveDown(1);

                // Shipments
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('Shipments');
                doc.moveDown(0.5);

                let yPos = doc.y;
                drawTableHeader(yPos);
                yPos += headerHeight;
                for (let i = 0; i < manifest.shipments.length; i++) {
                    if (yPos + rowHeight > maxTableY) {
                        doc.addPage();
                        yPos = doc.page.margins.top;
                        drawTableHeader(yPos);
                        yPos += headerHeight;
                    }

                    const shipment: any = manifest.shipments[i];
                    const shipmentDoc: any = shipmentMap.get(shipment.shipmentId.toString());
                    const city = shipmentDoc?.deliveryDetails?.address?.city || 'N/A';
                    const state = shipmentDoc?.deliveryDetails?.address?.state || '';
                    const destination = state ? `${city}, ${state}` : city;
                    const consignee = shipmentDoc?.deliveryDetails?.recipientName || 'N/A';

                    drawRow(
                        [
                            String(i + 1),
                            shipment.awb || shipmentDoc?.trackingNumber || 'N/A',
                            `${consignee} - ${destination}`,
                            formatWeight(Number(shipment.weight || 0)),
                            String(shipment.packages || 0),
                            formatMoney(Number(shipment.codAmount || 0)),
                        ],
                        yPos,
                        i
                    );
                    yPos += rowHeight;
                }

                doc.y = yPos + 16;
                if (doc.y > maxTableY) {
                    doc.addPage();
                    doc.y = doc.page.margins.top;
                }

                // Summary
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('Summary');
                doc
                    .fontSize(9)
                    .font('Helvetica')
                    .fillColor('#111827')
                    .text(`Total Shipments: ${manifest.summary.totalShipments}`)
                    .text(`Total Weight: ${formatWeight(Number(manifest.summary.totalWeight || 0))}`)
                    .text(`Total Packages: ${manifest.summary.totalPackages}`)
                    .text(`Total COD Amount: ${formatMoney(Number(manifest.summary.totalCODAmount || 0))}`);

                // Signatures
                doc.moveDown(3);
                doc.fontSize(9);
                const signatureY = doc.y;
                doc.text('________________________', 50, signatureY);
                doc.text('Seller Signature', 50, signatureY + 12);
                doc.text('Date: __________', 50, signatureY + 24);

                doc.text('________________________', 340, signatureY);
                doc.text('Carrier Signature', 340, signatureY + 12);
                doc.text('Date: __________', 340, signatureY + 24);

                drawFooter();

                doc.end();
            } catch (error: any) {
                logger.error(`Error generating manifest PDF for ${manifestId}:`, error);
                reject(error);
            }
        });
    }


    /**
     * Close manifest and schedule pickup
     *
     * Uses explicit carrier strategy so courier-specific behavior remains
     * centralized and predictable.
     */
    async closeManifest(manifestId: string, companyId: string, userId: string) {
        if (!mongoose.Types.ObjectId.isValid(manifestId)) {
            throw new ValidationError('Invalid manifest ID format');
        }

        const manifest = await Manifest.findOne({
            _id: manifestId,
            companyId: new mongoose.Types.ObjectId(companyId),
        });

        if (!manifest) {
            throw new NotFoundError('Manifest not found');
        }

        if (manifest.status !== 'open') {
            throw new ValidationError('Manifest is already closed or handed over');
        }

        const pickupResults = {
            successful: 0,
            failed: 0,
            skipped: 0,
            failedShipments: [] as Array<{ shipmentId: string; trackingNumber: string; error: string }>,
            skippedCarriers: [] as Array<{ carrier: string; reason: string; count: number }>,
        };
        const requiredSchedulingFailures: Array<{
            carrier: string;
            shipmentId?: string;
            reason: string;
        }> = [];

        try {
            const shipments = await Shipment.find({
                _id: { $in: manifest.shipments.map((s) => s.shipmentId) },
                companyId: manifest.companyId,
            });

            const carrierShipments = new Map<string, typeof shipments>();
            for (const shipment of shipments) {
                const carrier = this.normalizeCarrier(shipment.carrier);
                if (!carrierShipments.has(carrier)) {
                    carrierShipments.set(carrier, []);
                }
                carrierShipments.get(carrier)!.push(shipment);
            }

            for (const [carrier, carrierBatch] of carrierShipments) {
                const strategy = getManifestCarrierStrategy(carrier);
                try {
                    logger.info('Resolved pickup strategy for manifest close', {
                        manifestId,
                        carrier,
                        mode: strategy.pickupMode,
                        trigger: strategy.pickupTrigger,
                        shipmentCount: carrierBatch.length,
                    });

                    if (strategy.pickupMode === 'none') {
                        pickupResults.skipped += carrierBatch.length;
                        pickupResults.skippedCarriers.push({
                            carrier,
                            reason: strategy.notes,
                            count: carrierBatch.length,
                        });
                        continue;
                    }

                    const provider = await CourierFactory.getProvider(carrier, manifest.companyId);

                    if (!provider.schedulePickup) {
                        pickupResults.skipped += carrierBatch.length;
                        pickupResults.skippedCarriers.push({
                            carrier,
                            reason: 'Provider does not implement schedulePickup',
                            count: carrierBatch.length,
                        });
                        requiredSchedulingFailures.push({
                            carrier,
                            reason: 'Provider does not implement schedulePickup',
                        });
                        continue;
                    }

                    if (strategy.pickupMode === 'warehouse') {
                        const first = carrierBatch[0];
                        const warehouseId = first?.pickupDetails?.warehouseId;
                        if (!warehouseId) {
                            pickupResults.failed += carrierBatch.length;
                            requiredSchedulingFailures.push({
                                carrier,
                                reason: 'Warehouse ID missing on shipment batch for warehouse-level pickup',
                            });
                            continue;
                        }

                        const warehouse = await Warehouse.findById(warehouseId).lean();
                        const pickupLocationName = warehouse?.carrierDetails?.delhivery?.warehouseId || warehouse?.name;

                        if (!pickupLocationName) {
                            pickupResults.failed += carrierBatch.length;
                            requiredSchedulingFailures.push({
                                carrier,
                                reason: 'Pickup location unavailable for warehouse-level pickup',
                            });
                            continue;
                        }

                        try {
                            await provider.schedulePickup({
                                pickupDate: manifest.pickup.scheduledDate.toISOString().split('T')[0],
                                pickupTime: `${manifest.pickup.timeSlot.split('-')[0]}:00`,
                                pickupLocation: pickupLocationName,
                                expectedCount: carrierBatch.length,
                            });

                            pickupResults.successful += carrierBatch.length;
                        } catch (warehousePickupError: any) {
                            pickupResults.failed += carrierBatch.length;
                            requiredSchedulingFailures.push({
                                carrier,
                                reason: `Warehouse pickup scheduling failed: ${warehousePickupError?.message || 'Unknown error'}`,
                            });
                        }
                        continue;
                    }

                    for (const shipment of carrierBatch) {
                        const shipmentId = (shipment._id as mongoose.Types.ObjectId).toString();
                        const providerShipmentId = shipment.carrierDetails?.providerShipmentId;

                        if (!providerShipmentId) {
                            pickupResults.failed++;
                            pickupResults.failedShipments.push({
                                shipmentId,
                                trackingNumber: shipment.trackingNumber,
                                error: 'Missing providerShipmentId',
                            });
                            requiredSchedulingFailures.push({
                                carrier,
                                shipmentId,
                                reason: 'Missing providerShipmentId',
                            });
                            continue;
                        }

                        try {
                            await provider.schedulePickup({ providerShipmentId });
                            pickupResults.successful++;
                        } catch (pickupError: any) {
                            const errorMsg = pickupError.message || 'Unknown error';
                            pickupResults.failed++;
                            pickupResults.failedShipments.push({
                                shipmentId,
                                trackingNumber: shipment.trackingNumber,
                                error: errorMsg,
                            });
                            requiredSchedulingFailures.push({
                                carrier,
                                shipmentId,
                                reason: errorMsg,
                            });

                            try {
                                await QueueManager.addJob(
                                    'manifest-pickup-retry',
                                    'schedule-pickup',
                                    {
                                        manifestId,
                                        shipmentId,
                                        carrier,
                                        providerShipmentId,
                                    },
                                    {
                                        attempts: 3,
                                        backoff: { type: 'exponential', delay: 60000 },
                                    }
                                );
                            } catch (queueError) {
                                logger.error('Failed to queue pickup retry', {
                                    shipmentId,
                                    error: queueError instanceof Error ? queueError.message : 'Unknown error',
                                });
                            }
                        }
                    }
                } catch (providerError) {
                    pickupResults.failed += carrierBatch.length;
                    carrierBatch.forEach((shipment) => {
                        pickupResults.failedShipments.push({
                            shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                            trackingNumber: shipment.trackingNumber,
                            error: providerError instanceof Error ? providerError.message : 'Unknown provider error',
                        });
                        requiredSchedulingFailures.push({
                            carrier,
                            shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                            reason: providerError instanceof Error ? providerError.message : 'Unknown provider error',
                        });
                    });
                    logger.warn(`Could not schedule pickup for carrier '${carrier}'`, {
                        error: providerError instanceof Error ? providerError.message : 'Unknown error',
                    });
                }
            }
        } catch (error) {
            logger.error(`Error processing carrier pickup for manifest ${manifestId}:`, error);
            requiredSchedulingFailures.push({
                carrier: manifest.carrier,
                reason: error instanceof Error ? error.message : 'Unexpected pickup processing error',
            });
        }

        if (requiredSchedulingFailures.length > 0) {
            throw new ValidationError(
                'Cannot close manifest: required pickup scheduling failed',
                {
                    manifestId,
                    failures: requiredSchedulingFailures,
                    pickupResults,
                }
            );
        }

        manifest.status = 'closed';
        manifest.closedAt = new Date();
        manifest.closedBy = new mongoose.Types.ObjectId(userId);

        const resultsNote = `Pickup scheduling results: ${pickupResults.successful} successful, ${pickupResults.failed} failed, ${pickupResults.skipped} skipped`;
        manifest.notes = (manifest.notes ? manifest.notes + '\n' : '') + resultsNote;

        await manifest.save();

        logger.info(`Manifest ${manifest.manifestNumber} closed by user ${userId}`, {
            pickupResults,
        });

        return manifest;
    }

    /**
     * Mark manifest as handed over
     */
    async handoverManifest(manifestId: string, companyId: string, userId: string) {
        if (!mongoose.Types.ObjectId.isValid(manifestId)) {
            throw new ValidationError('Invalid manifest ID format');
        }

        const manifest = await Manifest.findOne({
            _id: manifestId,
            companyId: new mongoose.Types.ObjectId(companyId),
        });

        if (!manifest) {
            throw new NotFoundError('Manifest not found');
        }

        if (manifest.status !== 'closed') {
            throw new ValidationError('Manifest must be closed before handover');
        }

        manifest.status = 'handed_over';
        manifest.handedOverAt = new Date();
        manifest.handedOverBy = new mongoose.Types.ObjectId(userId);

        await manifest.save();

        logger.info(
            `Manifest ${manifest.manifestNumber} handed over by user ${userId}`
        );

        return manifest;
    }

    /**
     * Get manifest by ID
     */
    async getManifest(manifestId: string, companyId: string) {
        if (!mongoose.Types.ObjectId.isValid(manifestId)) {
            throw new ValidationError('Invalid manifest ID format');
        }

        const manifest = await Manifest.findOne({
            _id: manifestId,
            companyId: new mongoose.Types.ObjectId(companyId),
        })
            // Do not populate companyId: Company has field-level encryption and
            // malformed legacy records can crash this endpoint during decrypt.
            .populate('warehouseId')
            .populate('shipments.shipmentId');

        if (!manifest) {
            throw new NotFoundError('Manifest not found');
        }

        return manifest;
    }

    /**
     * List manifests with filters
     */
    async listManifests(filters: {
        companyId?: string;
        warehouseId?: string;
        status?: string;
        carrier?: string;
        search?: string;
        limit?: number;
        skip?: number;
    }) {
        const query: any = {};

        if (filters.companyId) query.companyId = filters.companyId;
        if (filters.warehouseId) query.warehouseId = filters.warehouseId;
        if (filters.status) query.status = filters.status;
        if (filters.carrier) query.carrier = this.normalizeCarrier(filters.carrier);
        if (filters.search) {
            const searchRegex = new RegExp(filters.search, 'i');
            query.$or = [
                { manifestNumber: searchRegex },
                { notes: searchRegex },
            ];
        }

        const manifests = await Manifest.find(query)
            .sort({ createdAt: -1 })
            .limit(filters.limit || 50)
            .skip(filters.skip || 0)
            .populate('warehouseId');

        const total = await Manifest.countDocuments(query);

        return {
            manifests,
            total,
            page: Math.floor((filters.skip || 0) / (filters.limit || 50)) + 1,
            pages: Math.ceil(total / (filters.limit || 50)),
        };
    }

    /**
     * List shipments eligible for manifest creation
     */
    async listEligibleShipments(filters: {
        companyId: string;
        carrier?: string;
        warehouseId?: string;
    }) {
        const manifestQuery: any = { companyId: filters.companyId };
        if (filters.carrier) {
            manifestQuery.carrier = this.normalizeCarrier(filters.carrier);
        }

        const manifests = await Manifest.find(manifestQuery).select('shipments.shipmentId').lean();
        const usedShipmentIds = new Set<string>();

        manifests.forEach((manifest: any) => {
            (manifest.shipments || []).forEach((s: any) => {
                if (s?.shipmentId) {
                    usedShipmentIds.add(s.shipmentId.toString());
                }
            });
        });

        const shipmentQuery: any = {
            companyId: new mongoose.Types.ObjectId(filters.companyId),
            isDeleted: false,
            currentStatus: { $in: this.ELIGIBLE_STATUSES },
            'pickupDetails.warehouseId': { $exists: true },
        };

        if (filters.warehouseId) {
            shipmentQuery['pickupDetails.warehouseId'] = new mongoose.Types.ObjectId(filters.warehouseId);
        }

        if (usedShipmentIds.size > 0) {
            shipmentQuery._id = { $nin: Array.from(usedShipmentIds) };
        }

        const shipments = await Shipment.find(shipmentQuery)
            .populate('pickupDetails.warehouseId', 'name address contactInfo')
            .select('trackingNumber carrierDetails packageDetails paymentDetails deliveryDetails pickupDetails')
            .lean();

        const normalizedFilter = filters.carrier ? this.normalizeCarrier(filters.carrier) : undefined;

        return shipments
            .filter((shipment: any) => {
                if (!normalizedFilter) return true;
                return this.normalizeCarrier(shipment.carrier) === normalizedFilter;
            })
            .map((shipment: any) => ({
            shipmentId: shipment._id.toString(),
            awb: shipment.carrierDetails?.carrierTrackingNumber || shipment.trackingNumber,
            weight: shipment.packageDetails?.weight || 0,
            packages: shipment.packageDetails?.packageCount || 1,
            codAmount: shipment.paymentDetails?.type === 'cod' ? shipment.paymentDetails?.codAmount || 0 : 0,
            destination: {
                city: shipment.deliveryDetails?.address?.city,
                state: shipment.deliveryDetails?.address?.state,
                pincode: shipment.deliveryDetails?.address?.postalCode,
            },
            warehouseId: shipment.pickupDetails?.warehouseId?._id?.toString(),
            warehouseName: shipment.pickupDetails?.warehouseId?.name,
            warehouseContact: shipment.pickupDetails?.warehouseId?.contactInfo,
        }));
    }

    /**
     * Update manifest (pickup details, notes)
     * Can only update manifests with status 'open'
     */
    async updateManifest(
        manifestId: string,
        companyId: string,
        updates: {
            pickup?: {
                scheduledDate?: Date;
                timeSlot?: string;
                contactPerson?: string;
                contactPhone?: string;
            };
            notes?: string;
        }
    ) {
        const manifest = await Manifest.findById(manifestId);

        if (!manifest) {
            throw new NotFoundError('Manifest not found');
        }

        // Verify manifest belongs to the company
        if (manifest.companyId.toString() !== companyId) {
            throw new ValidationError('Access denied: Manifest does not belong to your company');
        }

        // Only allow updates if manifest is still open
        if (manifest.status !== 'open') {
            throw new ValidationError('Cannot update manifest: Status must be "open"');
        }

        // Update pickup details if provided
        if (updates.pickup) {
            if (updates.pickup.scheduledDate !== undefined) {
                manifest.pickup.scheduledDate = updates.pickup.scheduledDate;
            }
            if (updates.pickup.timeSlot !== undefined) {
                manifest.pickup.timeSlot = updates.pickup.timeSlot;
            }
            if (updates.pickup.contactPerson !== undefined) {
                manifest.pickup.contactPerson = updates.pickup.contactPerson;
            }
            if (updates.pickup.contactPhone !== undefined) {
                manifest.pickup.contactPhone = updates.pickup.contactPhone;
            }
        }

        // Update notes if provided
        if (updates.notes !== undefined) {
            manifest.notes = updates.notes;
        }

        await manifest.save();

        logger.info(`Manifest ${manifest.manifestNumber} updated`);

        return manifest;
    }

    /**
     * Delete manifest
     * Can only delete manifests with status 'open'
     */
    async deleteManifest(manifestId: string, companyId: string) {
        const manifest = await Manifest.findById(manifestId);

        if (!manifest) {
            throw new NotFoundError('Manifest not found');
        }

        // Verify manifest belongs to the company
        if (manifest.companyId.toString() !== companyId) {
            throw new ValidationError('Access denied: Manifest does not belong to your company');
        }

        // Only allow deletion if manifest is still open
        if (manifest.status !== 'open') {
            throw new ValidationError('Cannot delete manifest: Only open manifests can be deleted');
        }

        await Manifest.deleteOne({ _id: manifestId });

        logger.info(`Manifest ${manifest.manifestNumber} deleted`);

        return true;
    }

    /**
     * Add shipments to existing manifest
     * Validates carrier consistency and recalculates summary
     */
    async addShipments(manifestId: string, companyId: string, shipmentIds: string[]) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const manifest = await Manifest.findById(manifestId).session(session);

            if (!manifest) {
                throw new NotFoundError('Manifest not found');
            }

            // Verify manifest belongs to the company
            if (manifest.companyId.toString() !== companyId) {
                throw new ValidationError('Access denied: Manifest does not belong to your company');
            }

            // Only allow adding shipments if manifest is still open
            if (manifest.status !== 'open') {
                throw new ValidationError('Cannot add shipments: Manifest status must be "open"');
            }

            // Fetch new shipments
            const shipments = await Shipment.find({
                _id: { $in: shipmentIds },
                companyId: new mongoose.Types.ObjectId(companyId),
                isDeleted: false,
            }).session(session);

            if (shipments.length === 0) {
                throw new NotFoundError('No valid shipments found');
            }

            if (shipments.length !== shipmentIds.length) {
                throw new ValidationError('Some shipment IDs are invalid or do not belong to your company');
            }

            const invalidStatusShipments = shipments.filter(
                (s: any) => !this.ELIGIBLE_STATUSES.includes(s.currentStatus)
            );
            if (invalidStatusShipments.length > 0) {
                throw new ValidationError(
                    `Cannot add ${invalidStatusShipments.length} shipment(s): invalid status. Allowed statuses: ${this.ELIGIBLE_STATUSES.join(', ')}`
                );
            }

            const invalidWarehouseShipments = shipments.filter(
                (s: any) => s.pickupDetails?.warehouseId?.toString() !== manifest.warehouseId.toString()
            );
            if (invalidWarehouseShipments.length > 0) {
                throw new ValidationError(
                    `Cannot add shipments from different warehouse. Manifest warehouse: ${manifest.warehouseId.toString()}`
                );
            }

            // Validate all new shipments belong to the same carrier as manifest
            const invalidShipments = shipments.filter(
                (s: any) => this.normalizeCarrier(s.carrier) !== manifest.carrier
            );
            if (invalidShipments.length > 0) {
                throw new ValidationError(
                    `Cannot add shipments: ${invalidShipments.length} shipment(s) belong to different carrier. Manifest is for ${manifest.carrier}.`
                );
            }

            const duplicateAcrossManifests = await Manifest.findOne({
                companyId: new mongoose.Types.ObjectId(companyId),
                _id: { $ne: manifest._id },
                'shipments.shipmentId': {
                    $in: shipments.map((s: any) => s._id),
                },
            })
                .select('manifestNumber')
                .session(session);

            if (duplicateAcrossManifests) {
                throw new ValidationError(
                    `One or more shipments are already part of manifest ${duplicateAcrossManifests.manifestNumber}`
                );
            }

            // Check for duplicates
            const existingShipmentIds = manifest.shipments.map((s) => s.shipmentId.toString());
            const duplicates = shipmentIds.filter((id) => existingShipmentIds.includes(id));
            if (duplicates.length > 0) {
                throw new ValidationError(`${duplicates.length} shipment(s) already exist in this manifest`);
            }

            // Add new shipments
            const newManifestShipments = shipments.map((s: any) => ({
                shipmentId: s._id,
                awb: s.carrierDetails?.carrierTrackingNumber || s.trackingNumber,
                weight: s.packageDetails?.weight || 0,
                packages: s.packageDetails?.packageCount || 1,
                codAmount: s.paymentDetails?.type === 'cod' ? s.paymentDetails?.codAmount || 0 : 0,
            }));

            manifest.shipments.push(...newManifestShipments);

            // Recalculate summary
            manifest.summary.totalShipments = manifest.shipments.length;
            manifest.summary.totalWeight = manifest.shipments.reduce(
                (sum, s) => sum + s.weight,
                0
            );
            manifest.summary.totalPackages = manifest.shipments.reduce(
                (sum, s) => sum + s.packages,
                0
            );
            manifest.summary.totalCODAmount = manifest.shipments.reduce(
                (sum, s) => sum + s.codAmount,
                0
            );

            await manifest.save({ session });
            await session.commitTransaction();

            logger.info(
                `${shipmentIds.length} shipment(s) added to manifest ${manifest.manifestNumber}`
            );

            return manifest;
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Error adding shipments to manifest:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Remove shipments from existing manifest
     * Recalculates summary and prevents removal if manifest is empty
     */
    async removeShipments(manifestId: string, companyId: string, shipmentIds: string[]) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const manifest = await Manifest.findById(manifestId).session(session);

            if (!manifest) {
                throw new NotFoundError('Manifest not found');
            }

            // Verify manifest belongs to the company
            if (manifest.companyId.toString() !== companyId) {
                throw new ValidationError('Access denied: Manifest does not belong to your company');
            }

            // Only allow removing shipments if manifest is still open
            if (manifest.status !== 'open') {
                throw new ValidationError('Cannot remove shipments: Manifest status must be "open"');
            }

            // Check if shipments exist in manifest
            const existingShipmentIds = manifest.shipments.map((s) => s.shipmentId.toString());
            const notFound = shipmentIds.filter((id) => !existingShipmentIds.includes(id));
            if (notFound.length > 0) {
                throw new ValidationError(`${notFound.length} shipment(s) not found in this manifest`);
            }

            // Prevent removing all shipments
            if (shipmentIds.length >= manifest.shipments.length) {
                throw new ValidationError(
                    'Cannot remove all shipments. Delete the manifest instead.'
                );
            }

            // Remove shipments
            manifest.shipments = manifest.shipments.filter(
                (s) => !shipmentIds.includes(s.shipmentId.toString())
            );

            // Recalculate summary
            manifest.summary.totalShipments = manifest.shipments.length;
            manifest.summary.totalWeight = manifest.shipments.reduce(
                (sum, s) => sum + s.weight,
                0
            );
            manifest.summary.totalPackages = manifest.shipments.reduce(
                (sum, s) => sum + s.packages,
                0
            );
            manifest.summary.totalCODAmount = manifest.shipments.reduce(
                (sum, s) => sum + s.codAmount,
                0
            );

            await manifest.save({ session });
            await session.commitTransaction();

            logger.info(
                `${shipmentIds.length} shipment(s) removed from manifest ${manifest.manifestNumber}`
            );

            return manifest;
        } catch (error: any) {
            await session.abortTransaction();
            logger.error('Error removing shipments from manifest:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }
}

export default new ManifestService();
