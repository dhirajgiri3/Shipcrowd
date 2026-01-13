import { Request, Response, NextFunction } from 'express';
import ManifestService from '../../../../core/application/services/shipping/manifest.service';
import { ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';

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
    async createManifest(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id?.toString();
            const companyId = req.user?.companyId?.toString();

            if (!companyId) {
                throw new ValidationError('Company ID is required');
            }

            const { warehouseId, carrier, shipmentIds, pickup, notes } = req.body;

            // Validation
            if (!warehouseId || !carrier || !shipmentIds || !Array.isArray(shipmentIds)) {
                throw new ValidationError('Missing required fields: warehouseId, carrier, shipmentIds');
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
     * List manifests
     * GET /shipments/manifests
     */
    async listManifests(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId?.toString();

            const {
                warehouseId,
                status,
                carrier,
                page = '1',
                limit = '50',
            } = req.query;

            const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

            const result = await ManifestService.listManifests({
                companyId,
                warehouseId: warehouseId as string,
                status: status as string,
                carrier: carrier as string,
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
            const { id } = req.params;

            const manifest = await ManifestService.getManifest(id);

            sendSuccess(res, manifest);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Download manifest PDF
     * GET /shipments/manifests/:id/download
     */
    async downloadManifest(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const manifest = await ManifestService.getManifest(id);
            const pdfBuffer = await ManifestService.generatePDF(id);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="manifest-${manifest.manifestNumber}.pdf"`
            );
            res.send(pdfBuffer);

            logger.info(`Manifest PDF downloaded: ${manifest.manifestNumber}`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Close manifest and schedule pickup
     * POST /shipments/manifests/:id/close
     */
    async closeManifest(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user?._id?.toString();

            if (!userId) {
                throw new ValidationError('User ID is required');
            }

            const manifest = await ManifestService.closeManifest(id, userId);

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
            const { id } = req.params;
            const userId = req.user?._id?.toString();

            if (!userId) {
                throw new ValidationError('User ID is required');
            }

            const manifest = await ManifestService.handoverManifest(id, userId);

            sendSuccess(res, manifest, 'Manifest marked as handed over');
        } catch (error) {
            next(error);
        }
    }
}

export default new ManifestController();
