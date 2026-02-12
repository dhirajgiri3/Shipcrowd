import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Manifest from '../../../../infrastructure/database/mongoose/models/logistics/shipping/manifest.model';
import ManifestCounter from '../../../../infrastructure/database/mongoose/models/logistics/shipping/manifest-counter.model';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { CourierFactory } from '../courier/courier.factory';
import QueueManager from '../../../../infrastructure/utilities/queue-manager';

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
    carrier: 'velocity' | 'delhivery' | 'ekart' | 'xpressbees' | 'india_post';
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
    private readonly ELIGIBLE_STATUSES = ['created', 'pending_pickup', 'ready_to_ship'];

    private normalizeCarrier(value?: string): string {
        const carrier = (value || '').toLowerCase();

        if (carrier.includes('velocity') || carrier.includes('shipfast')) return 'velocity';
        if (carrier.includes('delhivery')) return 'delhivery';
        if (carrier.includes('ekart')) return 'ekart';
        if (carrier.includes('xpressbees') || carrier.includes('xpress')) return 'xpressbees';
        if (carrier.includes('india post') || carrier.includes('india_post') || carrier.includes('india-post') || carrier.includes('indiapost')) {
            return 'india_post';
        }

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

            // Fetch shipments
            const shipments = await Shipment.find({
                _id: { $in: data.shipmentIds },
            }).session(session);

            if (shipments.length === 0) {
                throw new NotFoundError('No valid shipments found');
            }

            if (shipments.length !== data.shipmentIds.length) {
                throw new ValidationError('Some shipment IDs are invalid');
            }

            // Derive warehouseId from shipments if not provided
            let resolvedWarehouseId = data.warehouseId;
            if (!resolvedWarehouseId) {
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

                resolvedWarehouseId = warehouseIds[0];
            }

            // Validate all shipments belong to same carrier
            const carriers = [...new Set(shipments.map((s: any) => this.normalizeCarrier(s.carrier)))];
            if (carriers.length > 1) {
                throw new ValidationError(
                    'Cannot create manifest with shipments from different carriers'
                );
            }

            const requestedCarrier = this.normalizeCarrier(data.carrier);
            if (carriers[0] !== requestedCarrier) {
                throw new ValidationError(
                    `Shipments belong to ${carriers[0]}, but manifest is for ${data.carrier}`
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

            try {
                const provider = await CourierFactory.getProvider(
                    data.carrier,
                    new mongoose.Types.ObjectId(data.companyId)
                );

                // Check if provider supports createManifest
                if (provider && typeof (provider as any).createManifest === 'function') {
                    logger.info(`Calling ${data.carrier} API for manifest creation...`);

                    const apiResult = await (provider as any).createManifest({
                        shipmentIds: shipments.map((s: any) => s._id.toString()),
                        awbs: shipments.map((s: any) => s.carrierDetails?.carrierTrackingNumber || s.trackingNumber),
                        warehouseId: resolvedWarehouseId
                    });

                    if (apiResult) {
                        carrierManifestId = apiResult.manifestId;
                        carrierManifestUrl = apiResult.manifestUrl;
                        logger.info(`Carrier manifest created: ${carrierManifestId}`, { carrier: data.carrier });
                    }
                }
            } catch (carrierError: any) {
                // We log error but proceed with internal manifest to avoid blocking operations
                // However, we mark it in notes that carrier sync failed
                logger.error('Carrier manifest creation failed', {
                    error: carrierError.message,
                    carrier: data.carrier
                });
                data.notes = (data.notes ? data.notes + '\n' : '') + `[WARNING] Carrier manifest syncing failed: ${carrierError.message}`;
            }

            // Prepare shipment data
            const manifestShipments = shipments.map((s: any) => ({
                shipmentId: s._id,
                awb: s.carrierDetails?.carrierTrackingNumber || s.trackingNumber, // Prefer carrier AWB
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
                        carrier: data.carrier,
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
    async generatePDF(manifestId: string): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const manifest = await Manifest.findById(manifestId)
                    .populate('warehouseId');

                if (!manifest) {
                    throw new NotFoundError('Manifest not found');
                }

                // Create PDF document (A4 size)
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 },
                });

                const chunks: Buffer[] = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // ====== Header ======
                doc
                    .fontSize(20)
                    .font('Helvetica-Bold')
                    .text('SHIPPING MANIFEST', { align: 'center' });

                doc.moveDown(0.5);

                doc
                    .fontSize(12)
                    .font('Helvetica')
                    .text(`Manifest #: ${manifest.manifestNumber}`, { align: 'center' });

                doc.moveDown(1);

                // ====== Warehouse & Carrier Info ======
                doc.fontSize(10).font('Helvetica-Bold').text('Warehouse Details:');
                doc
                    .fontSize(9)
                    .font('Helvetica')
                    .text(`Name: ${(manifest.warehouseId as any)?.name || 'N/A'}`);
                doc.text(
                    `Address: ${(manifest.warehouseId as any)?.address || 'N/A'}`
                );
                doc.text(
                    `Contact: ${(manifest.warehouseId as any)?.phone || 'N/A'}`
                );

                doc.moveDown(0.5);

                doc.fontSize(10).font('Helvetica-Bold').text('Carrier & Pickup:');
                doc
                    .fontSize(9)
                    .font('Helvetica')
                    .text(`Carrier: ${manifest.carrier.toUpperCase()}`);
                doc.text(
                    `Scheduled Date: ${manifest.pickup.scheduledDate.toLocaleDateString()}`
                );
                doc.text(`Time Slot: ${manifest.pickup.timeSlot}`);
                doc.text(`Contact Person: ${manifest.pickup.contactPerson}`);
                doc.text(`Contact Phone: ${manifest.pickup.contactPhone}`);

                doc.moveDown(1);

                // ====== Shipments Table ======
                doc.fontSize(10).font('Helvetica-Bold').text('Shipments:');
                doc.moveDown(0.5);

                const tableTop = doc.y;
                const colWidths = [30, 100, 150, 60, 50, 60];
                const headers = ['#', 'AWB', 'Consignee', 'Weight', 'Pkgs', 'COD'];

                // Table headers
                doc.fontSize(8).font('Helvetica-Bold');
                let xPos = 50;
                headers.forEach((header, i) => {
                    doc.text(header, xPos, tableTop, { width: colWidths[i] });
                    xPos += colWidths[i];
                });

                // Underline headers
                doc
                    .moveTo(50, tableTop + 12)
                    .lineTo(50 + colWidths.reduce((a, b) => a + b, 0), tableTop + 12)
                    .stroke();

                // Table rows
                let yPos = tableTop + 20;
                doc.fontSize(7).font('Helvetica');

                for (let i = 0; i < manifest.shipments.length; i++) {
                    const shipment = manifest.shipments[i];
                    xPos = 50;

                    doc.text(String(i + 1), xPos, yPos, { width: colWidths[0] });
                    xPos += colWidths[0];

                    doc.text(shipment.awb, xPos, yPos, { width: colWidths[1] });
                    xPos += colWidths[1];

                    doc.text('Customer Name', xPos, yPos, { width: colWidths[2] }); // Placeholder
                    xPos += colWidths[2];

                    doc.text(`${shipment.weight}kg`, xPos, yPos, { width: colWidths[3] });
                    xPos += colWidths[3];

                    doc.text(String(shipment.packages), xPos, yPos, { width: colWidths[4] });
                    xPos += colWidths[4];

                    doc.text(`₹${shipment.codAmount}`, xPos, yPos, { width: colWidths[5] });

                    yPos += 15;

                    // Add new page if needed
                    if (yPos > 700 && i < manifest.shipments.length - 1) {
                        doc.addPage();
                        yPos = 50;
                    }
                }

                // ====== Summary ======
                doc.moveDown(2);
                doc.fontSize(10).font('Helvetica-Bold').text('Summary:');
                doc.fontSize(9).font('Helvetica');
                doc.text(`Total Shipments: ${manifest.summary.totalShipments}`);
                doc.text(`Total Weight: ${manifest.summary.totalWeight}kg`);
                doc.text(`Total Packages: ${manifest.summary.totalPackages}`);
                doc.text(`Total COD Amount: ₹${manifest.summary.totalCODAmount}`);

                // ====== Signature Blocks ======
                doc.moveDown(3);
                doc.fontSize(9);

                doc.text('_____________________', 50, doc.y);
                doc.text('Seller Signature', 50, doc.y + 5);
                doc.text('Date: __________', 50, doc.y + 5);

                doc.text('_____________________', 350, doc.y - 35);
                doc.text('Carrier Signature', 350, doc.y + 5);
                doc.text('Date: __________', 350, doc.y + 5);

                // ====== Footer ======
                doc
                    .fontSize(8)
                    .text(
                        `Generated on ${new Date().toLocaleString()}`,
                        50,
                        750,
                        { align: 'center' }
                    );

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
     * Attempts to schedule pickups with carriers. Failed pickups are queued for retry
     * rather than silently failing, ensuring operational visibility.
     */
    async closeManifest(manifestId: string, userId: string) {
        const manifest = await Manifest.findById(manifestId);

        if (!manifest) {
            throw new NotFoundError('Manifest not found');
        }

        if (manifest.status !== 'open') {
            throw new ValidationError('Manifest is already closed or handed over');
        }

        // Track pickup scheduling results for audit
        const pickupResults = {
            successful: 0,
            failed: 0,
            failedShipments: [] as Array<{ shipmentId: string; trackingNumber: string; error: string }>
        };

        // Call carrier API to schedule pickup if supported
        try {
            const shipments = await Shipment.find({
                _id: { $in: manifest.shipments.map(s => s.shipmentId) }
            });

            // Group by carrier
            const carrierShipments = new Map<string, typeof shipments>();
            for (const shipment of shipments) {
                const carrier = shipment.carrier;
                if (!carrierShipments.has(carrier)) {
                    carrierShipments.set(carrier, []);
                }
                carrierShipments.get(carrier)!.push(shipment);
            }

            // Schedule pickup for each carrier's shipments
            for (const [carrier, carrierBatch] of carrierShipments) {
                try {
                    const provider = await CourierFactory.getProvider(carrier, manifest.companyId);

                    if (provider.schedulePickup) {
                        logger.info(`Scheduling pickups for manifest ${manifest.manifestNumber} (${carrier})`, {
                            shipmentCount: carrierBatch.length
                        });

                        // Delhivery pickup requests are warehouse-level, not shipment-level
                        if (carrier === 'delhivery') {
                            const first = carrierBatch[0];
                            const warehouseId = first.pickupDetails?.warehouseId;
                            if (!warehouseId) {
                                logger.warn('Missing warehouse for Delhivery pickup scheduling', {
                                    manifestId,
                                    carrier
                                });
                                continue;
                            }

                            const warehouse = await (await import('../../../../infrastructure/database/mongoose/models/logistics/warehouse/structure/warehouse.model.js')).default.findById(warehouseId).lean();

                            const pickupLocationName = warehouse?.carrierDetails?.delhivery?.warehouseId || warehouse?.name;
                            if (!pickupLocationName) {
                                logger.warn('Missing pickup location name for Delhivery scheduling', {
                                    warehouseId: warehouseId.toString()
                                });
                                continue;
                            }

                            try {
                                await provider.schedulePickup({
                                    pickupDate: manifest.pickup.scheduledDate.toISOString().split('T')[0],
                                    pickupTime: `${manifest.pickup.timeSlot.split('-')[0]}:00`,
                                    pickupLocation: pickupLocationName,
                                    expectedCount: carrierBatch.length
                                });
                                pickupResults.successful += carrierBatch.length;
                            } catch (pickupError: any) {
                                const errorMsg = pickupError.message || 'Unknown error';
                                logger.error('Failed to schedule Delhivery pickup', {
                                    manifestId,
                                    error: errorMsg
                                });
                                pickupResults.failed += carrierBatch.length;
                                carrierBatch.forEach((shipment) => {
                                    pickupResults.failedShipments.push({
                                        shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                                        trackingNumber: shipment.trackingNumber,
                                        error: errorMsg
                                    });
                                });
                            }

                            continue;
                        }

                        // Process serially to avoid rate limits
                        for (const shipment of carrierBatch) {
                            if (shipment.carrierDetails?.providerShipmentId) {
                                try {
                                    await provider.schedulePickup({
                                        providerShipmentId: shipment.carrierDetails.providerShipmentId
                                    });

                                    pickupResults.successful++;
                                    logger.info(`Pickup scheduled successfully`, {
                                        shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                                        trackingNumber: shipment.trackingNumber
                                    });
                                } catch (pickupError: any) {
                                    const errorMsg = pickupError.message || 'Unknown error';

                                    logger.error(`Failed to schedule pickup for shipment ${shipment.trackingNumber}`, {
                                        shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                                        error: errorMsg
                                    });

                                    pickupResults.failed++;
                                    pickupResults.failedShipments.push({
                                        shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                                        trackingNumber: shipment.trackingNumber,
                                        error: errorMsg
                                    });

                                    // ✅ Queue failed pickup for retry (instead of silencing it)
                                    try {
                                        await QueueManager.addJob(
                                            'manifest-pickup-retry',
                                            'schedule-pickup',
                                            {
                                                manifestId,
                                                shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                                                carrier,
                                                providerShipmentId: shipment.carrierDetails.providerShipmentId
                                            },
                                            {
                                                attempts: 3,
                                                backoff: { type: 'exponential', delay: 60000 } // 1 minute initial delay
                                            }
                                        );

                                        logger.info(`Queued pickup retry for shipment`, {
                                            shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                                            trackingNumber: shipment.trackingNumber
                                        });
                                    } catch (queueError) {
                                        logger.error(`Failed to queue pickup retry`, {
                                            shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                                            error: queueError instanceof Error ? queueError.message : 'Unknown error'
                                        });
                                    }
                                }
                            } else {
                                logger.warn(`Shipment missing providerShipmentId, cannot schedule pickup`, {
                                    shipmentId: (shipment._id as mongoose.Types.ObjectId).toString(),
                                    trackingNumber: shipment.trackingNumber
                                });
                            }
                        }
                    } else {
                        logger.info(`Provider does not support pickup scheduling`, { carrier });
                    }
                } catch (providerError) {
                    logger.warn(`Could not get provider '${carrier}' for manifest pickup scheduling`, {
                        error: providerError instanceof Error ? providerError.message : 'Unknown error'
                    });
                }
            }
        } catch (error) {
            logger.error(`Error processing carrier pickup for manifest ${manifestId}:`, error);
            // Don't throw - allow manifest to close even if pickup scheduling had errors
        }

        // Mark manifest as closed
        manifest.status = 'closed';
        manifest.closedAt = new Date();
        manifest.closedBy = new mongoose.Types.ObjectId(userId);

        // ✅ Store pickup scheduling results in manifest notes for audit trail
        const resultsNote = `Pickup scheduling results: ${pickupResults.successful} successful, ${pickupResults.failed} failed`;
        manifest.notes = (manifest.notes ? manifest.notes + '\n' : '') + resultsNote;

        await manifest.save();

        logger.info(`Manifest ${manifest.manifestNumber} closed by user ${userId}`, {
            pickupResults
        });

        return manifest;
    }

    /**
     * Mark manifest as handed over
     */
    async handoverManifest(manifestId: string, userId: string) {
        const manifest = await Manifest.findById(manifestId);

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
    async getManifest(manifestId: string) {
        const manifest = await Manifest.findById(manifestId)
            .populate('companyId')
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
        if (filters.carrier) query.carrier = filters.carrier;
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
            manifestQuery.carrier = filters.carrier;
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
            }).session(session);

            if (shipments.length === 0) {
                throw new NotFoundError('No valid shipments found');
            }

            if (shipments.length !== shipmentIds.length) {
                throw new ValidationError('Some shipment IDs are invalid');
            }

            // Validate all new shipments belong to the same carrier as manifest
            const invalidShipments = shipments.filter((s: any) => s.carrier !== manifest.carrier);
            if (invalidShipments.length > 0) {
                throw new ValidationError(
                    `Cannot add shipments: ${invalidShipments.length} shipment(s) belong to different carrier. Manifest is for ${manifest.carrier}.`
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
                awb: s.awb,
                weight: s.weights?.total || 0,
                packages: s.no_of_boxes || 1,
                codAmount: s.payment_method === 'cod' ? s.cod_amount || 0 : 0,
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
