/**
 * Packing Station Controller
 * 
 * Handles evidence capture at packing stations before courier pickup
 */

import { Request, Response } from 'express';
import PackingStationEvidenceService from '../../../../core/application/services/disputes/packing-station-evidence.service';
import { ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import {
PackingStationEvidenceSchema,
PhotoUploadRequestSchema
} from '../../dtos/disputes/evidence-submission.dto';

class PackingStationController {
    /**
     * POST /api/v1/packing-station/evidence
     * Submit packing evidence with photos
     * 
     * Expects multipart/form-data with:
     * - shipmentId
     * - actualWeight
     * - weightUnit
     * - dimensions (optional JSON)
     * - notes (optional)
     * - packedBy
     * - location (optional)
     * - photos[] (files)
     */
    async submitEvidence(req: Request, res: Response): Promise<void> {
        try {
            const {
                shipmentId,
                actualWeight,
                weightUnit,
                dimensions,
                notes,
                packedBy,
                location,
            } = req.body;

            // Validate request body using Zod
            const validationResult = PackingStationEvidenceSchema.safeParse({
                shipmentId,
                actualWeight: parseFloat(actualWeight),
                weightUnit,
                dimensions: dimensions ? JSON.parse(dimensions) : undefined,
                notes,
                packedBy,
                location,
                photos: [], // Will be filled after upload
            });

            if (!validationResult.success) {
                const errorMessages = validationResult.error.errors
                    .map(e => `${e.path.join('.')}: ${e.message}`)
                    .join('; ');
                throw new ValidationError(
                    `Validation failed: ${errorMessages}`,
                    ErrorCode.VAL_INVALID_INPUT
                );
            }

            const dto = validationResult.data;

            // Process uploaded photos
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                throw new ValidationError('At least one photo is required', ErrorCode.VAL_INVALID_INPUT);
            }

            // Validate and upload photos
            const photoData = files.map(file => ({
                buffer: file.buffer,
                contentType: file.mimetype,
                originalName: file.originalname,
            }));

            // Validate each photo
            for (const photo of photoData) {
                const validation = PackingStationEvidenceService.validatePhoto(photo.buffer, photo.contentType);
                if (!validation.valid) {
                    throw new ValidationError(`Photo validation failed: ${validation.reason}`, ErrorCode.VAL_INVALID_INPUT);
                }
            }

            // Upload photos to storage
            const photoUrls = await PackingStationEvidenceService.uploadEvidencePhotos(shipmentId, photoData);

            // Submit evidence
            dto.photos = photoUrls;
            const shipment = await PackingStationEvidenceService.submitPackingEvidence({
                shipmentId: dto.shipmentId,
                actualWeight: dto.actualWeight,
                weightUnit: dto.weightUnit,
                dimensions: dto.dimensions,
                photos: dto.photos,
                notes: dto.notes,
                packedBy: dto.packedBy,
                location: dto.location,
            });

            res.status(200).json({
                success: true,
                message: 'Packing evidence submitted successfully',
                data: {
                    shipmentId: shipment._id,
                    trackingNumber: shipment.trackingNumber,
                    weightKg: shipment.weights.declared.value,
                    photoCount: photoUrls.length,
                    photoUrls,
                },
            });

        } catch (error: any) {
            logger.error('[PackingStation] Failed to submit evidence', {
                error: error.message,
                body: req.body,
            });

            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message || 'Failed to submit packing evidence',
                code: error.code || 'INTERNAL_ERROR',
            });
        }
    }

    /**
     * POST /api/v1/packing-station/upload-urls
     * Generate pre-signed URLs for direct client upload (S3 only)
     * 
     * Body: {
     *   shipmentId: string,
     *   files: [{ fileName: string, contentType: string, fileSize: number }]
     * }
     */
    async generateUploadUrls(req: Request, res: Response): Promise<void> {
        try {
            const { shipmentId, files } = req.body;

            if (!shipmentId || !files || !Array.isArray(files)) {
                throw new ValidationError('shipmentId and files array are required', ErrorCode.VAL_INVALID_INPUT);
            }

            // Validate each file request using Zod
            for (const file of files) {
                const validationResult = PhotoUploadRequestSchema.safeParse({
                    fileName: file.fileName,
                    contentType: file.contentType,
                    fileSize: file.fileSize,
                    category: 'packing_station',
                });

                if (!validationResult.success) {
                    const errorMessages = validationResult.error.errors
                        .map(e => `${e.path.join('.')}: ${e.message}`)
                        .join('; ');
                    throw new ValidationError(
                        `File validation failed: ${errorMessages}`,
                        ErrorCode.VAL_INVALID_INPUT
                    );
                }
            }

            // Generate pre-signed URLs
            const fileNames = files.map((f: any) => f.fileName);
            const contentTypes = files.map((f: any) => f.contentType);

            const uploadData = await PackingStationEvidenceService.generateUploadUrls(
                shipmentId,
                fileNames,
                contentTypes
            );

            res.status(200).json({
                success: true,
                message: 'Pre-signed URLs generated successfully',
                data: {
                    shipmentId,
                    uploads: uploadData,
                    expiresIn: 300, // 5 minutes
                },
            });

        } catch (error: any) {
            logger.error('[PackingStation] Failed to generate upload URLs', {
                error: error.message,
                body: req.body,
            });

            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message || 'Failed to generate upload URLs',
                code: error.code || 'INTERNAL_ERROR',
            });
        }
    }

    /**
     * GET /api/v1/packing-station/evidence/:shipmentId
     * Get packing evidence for a shipment
     */
    async getEvidence(req: Request, res: Response): Promise<void> {
        try {
            const { shipmentId } = req.params;

            const evidence = await PackingStationEvidenceService.getPackingEvidence(shipmentId);

            res.status(200).json({
                success: true,
                data: evidence,
            });

        } catch (error: any) {
            logger.error('[PackingStation] Failed to get evidence', {
                error: error.message,
                shipmentId: req.params.shipmentId,
            });

            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message || 'Failed to get packing evidence',
                code: error.code || 'INTERNAL_ERROR',
            });
        }
    }
}

export default new PackingStationController();
