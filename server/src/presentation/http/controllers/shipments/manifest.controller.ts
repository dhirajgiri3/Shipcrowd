import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import ManifestService from '../../../../core/application/services/shipping/manifest.service';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';
import Manifest from '../../../../infrastructure/database/mongoose/models/logistics/shipping/manifest.model';
import axios from 'axios';

/**
 * Manifest Controller
 * Handles manifest creation, pickup scheduling, and handover
 * 
 * Endpoints:
 * 1. POST /shipments/manifest - Create manifest
 * 2. GET /shipments/manifests - List manifests
 * 3. GET /shipments/manifests/:id - Get manifest details
 * 4. GET /shipments/manifests/:id/download - Download PDF
 * 5. POST /shipments/manifests/:id/close - Close & schedule pickup
 * 6. POST /shipments/manifests/:id/handover - Mark as handed over
 */

class ManifestController {
    /**
     * Create manifest
     * POST /shipments/manifest
     */
    createManifest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const userId = auth.userId?.toString();
            const companyId = auth.companyId;

            const { warehouseId, carrier, shipmentIds, pickup, notes } = req.body;

            // Validation
            if (!carrier || !shipmentIds || !Array.isArray(shipmentIds)) {
                throw new ValidationError('Missing required fields: carrier, shipmentIds');
            }

            if (!pickup || !pickup.scheduledDate || !pickup.timeSlot || !pickup.contactPerson || !pickup.contactPhone) {
                throw new ValidationError('Missing pickup details');
            }

            const manifest = await ManifestService.createManifest({
                companyId,
                warehouseId,
                carrier,
                shipmentIds,
                pickup: {
                    scheduledDate: new Date(pickup.scheduledDate),
                    timeSlot: pickup.timeSlot,
                    contactPerson: pickup.contactPerson,
                    contactPhone: pickup.contactPhone,
                },
                notes,
            });

            logger.info(`Manifest created: ${manifest.manifestNumber} by user ${userId}`);

            sendCreated(res, manifest, 'Manifest created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * List shipments eligible for manifest creation
     * GET /shipments/manifests/eligible-shipments
     */
    async listEligibleShipments(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;
            const { carrier, warehouseId } = req.query;

            const shipments = await ManifestService.listEligibleShipments({
                companyId,
                carrier: carrier as string | undefined,
                warehouseId: warehouseId as string | undefined,
            });

            sendSuccess(res, shipments, 'Eligible shipments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Manifest statistics
     * GET /shipments/manifests/stats
     */
    async getManifestStats(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const [totalManifests, pendingPickup, scheduledToday, pickedUpToday, carrierBreakdown, shipmentTotals] = await Promise.all([
                Manifest.countDocuments({ companyId }),
                Manifest.countDocuments({ companyId, status: 'open' }),
                Manifest.countDocuments({
                    companyId,
                    'pickup.scheduledDate': { $gte: startOfDay, $lte: endOfDay },
                }),
                Manifest.countDocuments({
                    companyId,
                    status: 'handed_over',
                    handedOverAt: { $gte: startOfDay, $lte: endOfDay },
                }),
                Manifest.aggregate([
                    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
                    { $group: { _id: '$carrier', count: { $sum: 1 } } },
                ]),
                Manifest.aggregate([
                    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
                    { $group: { _id: null, total: { $sum: { $size: '$shipments' } } } },
                ]),
            ]);

            const totalShipments = shipmentTotals[0]?.total || 0;

            sendSuccess(res, {
                totalManifests,
                pendingPickup,
                scheduledToday,
                pickedUpToday,
                averageShipmentsPerManifest: totalManifests ? Number((totalShipments / totalManifests).toFixed(2)) : 0,
                courierBreakdown: carrierBreakdown.map((c: any) => ({
                    courier: c._id,
                    count: c.count,
                })),
            }, 'Manifest stats retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * List manifests
     * GET /shipments/manifests
     */
    async listManifests(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;

            const {
                warehouseId,
                status,
                carrier,
                search,
                page = '1',
                limit = '50',
            } = req.query;

            const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

            const result = await ManifestService.listManifests({
                companyId,
                warehouseId: warehouseId as string,
                status: status as string,
                carrier: carrier as string,
                search: search as string,
                limit: parseInt(limit as string),
                skip,
            });

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get manifest details
     * GET /shipments/manifests/:id
     */
    async getManifest(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            const manifest = await ManifestService.getManifest(id, auth.companyId);

            sendSuccess(res, manifest);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Download manifest PDF
     * GET /shipments/manifests/:id/download
     */
    downloadManifest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const companyId = auth.companyId;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new ValidationError('Invalid manifest ID format');
            }
            logger.info(`Downloading manifest PDF for ${id}`);

            const manifest = await Manifest.findOne({
                _id: id,
                companyId: new mongoose.Types.ObjectId(companyId),
            })
                .select('manifestNumber carrier metadata')
                .lean();
            if (!manifest) {
                throw new NotFoundError('Manifest not found');
            }
            logger.info(`Manifest found: ${manifest.manifestNumber}, Carrier: ${manifest.carrier}`);

            // Check if we have a carrier manifest URL available
            const carrierUrl = (manifest as any)?.metadata?.carrierManifestUrl || (manifest as any)?.metadata?.manifestUrl;
            logger.info(`Carrier URL: ${carrierUrl || 'None'}`);

            if (carrierUrl && (carrierUrl.startsWith('http') || carrierUrl.startsWith('https'))) {
                try {
                    logger.info(`Fetching from carrier URL...`);
                    const carrierFile = await axios.get<ArrayBuffer>(carrierUrl, {
                        responseType: 'arraybuffer',
                        timeout: 15000,
                    });

                    const contentType = carrierFile.headers['content-type'] || 'application/pdf';
                    res.setHeader('Content-Type', contentType);
                    res.setHeader(
                        'Content-Disposition',
                        `attachment; filename="manifest-${manifest.manifestNumber}.pdf"`
                    );
                    res.send(Buffer.from(carrierFile.data));

                    logger.info(`Manifest PDF served from carrier URL: ${manifest.manifestNumber}`);
                    return;
                } catch (carrierDownloadError: any) {
                    logger.warn('Carrier manifest download failed, using internal PDF fallback', {
                        manifestId: id,
                        carrierUrl,
                        error: carrierDownloadError?.message || carrierDownloadError,
                    });
                }
            }

            // Fallback to internal PDF generation
            logger.info(`Generating internal PDF...`);
            const pdfBuffer = await ManifestService.generatePDF(id, companyId);
            logger.info(`Internal PDF generated, size: ${pdfBuffer.length}`);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="manifest-${manifest.manifestNumber}.pdf"`
            );

            res.send(pdfBuffer);

            logger.info(`Manifest PDF downloaded (Internal): ${manifest.manifestNumber}`);
        } catch (error) {
            logger.error(`Error in downloadManifest:`, error);
            next(error);
        }
    }

    /**
     * Close manifest and schedule pickup
     * POST /shipments/manifests/:id/close
     */
    async closeManifest(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const companyId = auth.companyId;
            const userId = req.user?._id?.toString();

            if (!userId) {
                throw new ValidationError('User ID is required');
            }

            const manifest = await ManifestService.closeManifest(id, companyId, userId);

            sendSuccess(res, manifest, 'Manifest closed and pickup scheduled');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark manifest as handed over to carrier
     * POST /shipments/manifests/:id/handover
     */
    async handoverManifest(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const companyId = auth.companyId;
            const userId = req.user?._id?.toString();

            if (!userId) {
                throw new ValidationError('User ID is required');
            }

            const manifest = await ManifestService.handoverManifest(id, companyId, userId);

            sendSuccess(res, manifest, 'Manifest marked as handed over');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update manifest (pickup details, notes)
     * PATCH /shipments/manifests/:id
     */
    async updateManifest(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const companyId = auth.companyId;
            const { pickup, notes } = req.body;

            // Validate at least one field is being updated
            if (!pickup && notes === undefined) {
                throw new ValidationError('At least one field (pickup or notes) must be provided');
            }

            const manifest = await ManifestService.updateManifest(id, companyId, {
                pickup: pickup ? {
                    scheduledDate: pickup.scheduledDate ? new Date(pickup.scheduledDate) : undefined,
                    timeSlot: pickup.timeSlot,
                    contactPerson: pickup.contactPerson,
                    contactPhone: pickup.contactPhone,
                } : undefined,
                notes,
            });

            sendSuccess(res, manifest, 'Manifest updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete manifest (only if status is 'open')
     * DELETE /shipments/manifests/:id
     */
    async deleteManifest(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const companyId = auth.companyId;

            await ManifestService.deleteManifest(id, companyId);

            sendSuccess(res, { deleted: true }, 'Manifest deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Add shipments to manifest
     * POST /shipments/manifests/:id/add-shipments
     */
    async addShipments(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const companyId = auth.companyId;
            const { shipmentIds } = req.body;

            if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
                throw new ValidationError('shipmentIds array is required and must not be empty');
            }

            const manifest = await ManifestService.addShipments(id, companyId, shipmentIds);

            sendSuccess(res, manifest, `${shipmentIds.length} shipment(s) added to manifest`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Remove shipments from manifest
     * POST /shipments/manifests/:id/remove-shipments
     */
    async removeShipments(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const companyId = auth.companyId;
            const { shipmentIds } = req.body;

            if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
                throw new ValidationError('shipmentIds array is required and must not be empty');
            }

            const manifest = await ManifestService.removeShipments(id, companyId, shipmentIds);

            sendSuccess(res, manifest, `${shipmentIds.length} shipment(s) removed from manifest`);
        } catch (error) {
            next(error);
        }
    }
}

export default new ManifestController();
