import { Request, Response, NextFunction } from 'express';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError, CourierFeatureNotSupportedError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';
import StorageService from '../../../../core/application/services/storage/storage.service';
import { CourierFactory } from '../../../../core/application/services/courier/courier.factory';
import mongoose from 'mongoose';

const sanitizeFilename = (name: string): string =>
    name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);

class PODController {
    /**
     * Upload POD manually
     * POST /shipments/:id/pod/upload
     */
    async uploadPOD(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const file = req.file;

            if (!file) {
                throw new ValidationError('No POD file uploaded');
            }

            const shipment = await Shipment.findById(id);
            if (!shipment) {
                throw new NotFoundError('Shipment not found');
            }

            const extension = file.originalname.split('.').pop() || 'pdf';
            const safeName = sanitizeFilename(file.originalname);
            const uploadResult = await StorageService.upload(file.buffer, {
                folder: `pod/${id}`,
                fileName: `${Date.now()}-${safeName || `pod.${extension}`}`,
                contentType: file.mimetype,
            });
            const storedPath = uploadResult.key;
            const fileUrl = await StorageService.getFileUrl(storedPath);

            shipment.documents.push({
                type: 'pod',
                url: storedPath,
                createdAt: new Date()
            });
            await shipment.save();

            logger.info('POD uploaded manually', { shipmentId: id, filePath: storedPath });

            sendCreated(res, {
                shipmentId: id,
                podUrl: fileUrl,
                source: 'manual'
            }, 'POD uploaded successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get POD (manual or courier)
     * GET /shipments/:id/pod
     */
    async getPOD(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const shipment = await Shipment.findById(id);
            if (!shipment) {
                throw new NotFoundError('Shipment not found');
            }

            const podDocs = shipment.documents.filter((d) => d.type === 'pod');
            if (podDocs.length > 0) {
                const latest = podDocs[podDocs.length - 1];
                const url = latest.url.startsWith('http')
                    ? latest.url
                    : await StorageService.getFileUrl(latest.url);

                sendSuccess(res, {
                    shipmentId: id,
                    podUrl: url,
                    source: latest.url.startsWith('http') ? 'courier_api' : 'manual'
                }, 'POD retrieved successfully');
                return;
            }

            // Try courier if supported
            const courierProvider = shipment.carrier;
            if (!courierProvider) {
                throw new NotFoundError('POD not available for this shipment');
            }

            const courier = await CourierFactory.getProvider(
                courierProvider,
                new mongoose.Types.ObjectId(shipment.companyId)
            );

            if (courier && typeof (courier as any).getProofOfDelivery === 'function') {
                let response: any;
                try {
                    response = await (courier as any).getProofOfDelivery(
                        shipment.carrierDetails?.carrierTrackingNumber || shipment.trackingNumber
                    );
                } catch (error) {
                    if (error instanceof CourierFeatureNotSupportedError) {
                        throw new NotFoundError('POD not supported by courier');
                    }
                    throw error;
                }

                if (response?.source === 'not_supported') {
                    throw new NotFoundError('POD not supported by courier');
                }

                if (response?.url) {
                    shipment.documents.push({
                        type: 'pod',
                        url: response.url,
                        createdAt: new Date()
                    });
                    await shipment.save();

                    sendSuccess(res, {
                        shipmentId: id,
                        podUrl: response.url,
                        source: response.source || 'courier_api'
                    }, 'POD retrieved successfully');
                    return;
                }

                if (response?.fileBuffer) {
                    const uploadResult = await StorageService.upload(response.fileBuffer, {
                        folder: `pod/${id}`,
                        fileName: `${Date.now()}-courier-pod.pdf`,
                        contentType: response.mimeType || 'application/pdf',
                    });
                    const storedPath = uploadResult.key;
                    const fileUrl = await StorageService.getFileUrl(storedPath);

                    shipment.documents.push({
                        type: 'pod',
                        url: storedPath,
                        createdAt: new Date()
                    });
                    await shipment.save();

                    sendSuccess(res, {
                        shipmentId: id,
                        podUrl: fileUrl,
                        source: response.source || 'courier_api'
                    }, 'POD retrieved successfully');
                    return;
                }
            }

            throw new NotFoundError('POD not available for this shipment');
        } catch (error) {
            logger.error('Failed to retrieve POD', {
                shipmentId: req.params.id,
                error: error instanceof Error ? error.message : String(error)
            });
            next(error);
        }
    }
}

export default new PODController();
