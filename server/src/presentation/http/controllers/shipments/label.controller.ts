import { Request, Response, NextFunction } from 'express';
import LabelService from '../../../../core/application/services/shipping/label.service';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import DelhiveryLabelAdapter from '../../../../infrastructure/external/couriers/delhivery/delhivery-label.adapter';
import EkartLabelAdapter from '../../../../infrastructure/external/couriers/ekart/ekart-label.adapter';
import IndiaPostLabelAdapter from '../../../../infrastructure/external/couriers/india-post/india-post-label.adapter';
import VelocityLabelAdapter from '../../../../infrastructure/external/couriers/velocity/velocity-label.adapter';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import axios from 'axios';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

/**
 * Label Controller
 * Handles label generation and download endpoints
 * 
 * Endpoints:
 * 1. POST /shipments/:id/label - Generate label
 * 2. GET /shipments/:id/label/download - Download label
 * 3. POST /shipments/bulk-labels - Bulk generation
 * 4. POST /shipments/:id/label/reprint - Reprint label
 * 5. GET /shipments/:id/label/formats - Get supported formats
 */

class LabelController {
    private carrierAdapters: {
        [key: string]: typeof VelocityLabelAdapter | typeof DelhiveryLabelAdapter | typeof EkartLabelAdapter | typeof IndiaPostLabelAdapter;
    } = {
            velocity: VelocityLabelAdapter,
            'velocity-shipfast': VelocityLabelAdapter,
            delhivery: DelhiveryLabelAdapter,
            ekart: EkartLabelAdapter,
            india_post: IndiaPostLabelAdapter,
        };

    private resolveCarrierAdapter(carrier?: string) {
        const normalized = String(carrier || '').toLowerCase();

        if (this.carrierAdapters[normalized]) {
            return this.carrierAdapters[normalized];
        }
        if (normalized.includes('velocity')) {
            return this.carrierAdapters.velocity;
        }
        if (normalized.includes('delhivery')) {
            return this.carrierAdapters.delhivery;
        }
        if (normalized.includes('ekart')) {
            return this.carrierAdapters.ekart;
        }
        if (normalized.includes('india_post') || normalized.includes('indiapost')) {
            return this.carrierAdapters.india_post;
        }

        return undefined;
    }

    private getStoredLabelUrl(shipment: any): string | undefined {
        const docs = Array.isArray(shipment?.documents) ? shipment.documents : [];
        const labelDoc = [...docs]
            .reverse()
            .find((doc: any) => doc?.type === 'label' && typeof doc?.url === 'string' && doc.url.trim());
        return labelDoc?.url;
    }

    private async fetchLabelBufferFromUrl(url: string): Promise<Buffer> {
        const response = await axios.get<ArrayBuffer>(url, {
            responseType: 'arraybuffer',
            timeout: 15000,
        });
        return Buffer.from(response.data);
    }

    private async generateCarrierLabelPdfBuffer(shipment: any, awb: string): Promise<Buffer | null> {
        const adapter = this.resolveCarrierAdapter(shipment?.carrier);
        if (!adapter) {
            return null;
        }

        const label = await adapter.generateLabel({
            awb,
            label_url: this.getStoredLabelUrl(shipment),
        });

        if (label.format === 'pdf' && Buffer.isBuffer(label.data)) {
            return label.data as Buffer;
        }

        if (label.format === 'url' && typeof label.data === 'string') {
            return this.fetchLabelBufferFromUrl(label.data);
        }

        return null;
    }

    private formatAddress(address: any): string {
        if (!address) {
            return '';
        }

        if (typeof address === 'string') {
            return address;
        }

        const parts = [
            address.line1,
            address.line2,
            address.city,
            address.state,
            address.postalCode || address.pincode,
        ].filter(Boolean);

        return parts.join(', ');
    }

    private buildShipmentLabelData(shipment: any) {
        const warehouse = shipment.pickupDetails?.warehouseId as any;
        const warehouseAddress = warehouse?.address || {};
        const orderId = shipment.orderId;
        const orderNumber =
            typeof orderId === 'object' && orderId?.orderNumber
                ? orderId.orderNumber
                : String(orderId || '');

        return {
            awb: shipment.carrierDetails?.carrierTrackingNumber || shipment.trackingNumber,
            carrier: shipment.carrier,
            senderName: warehouse?.name || 'Seller',
            senderAddress: this.formatAddress(warehouseAddress),
            senderCity: warehouseAddress?.city || '',
            senderState: warehouseAddress?.state || '',
            senderPincode: warehouseAddress?.postalCode || warehouseAddress?.pincode || '',
            senderPhone: shipment.pickupDetails?.contactPhone || warehouse?.contactInfo?.phone || '',
            receiverName: shipment.deliveryDetails?.recipientName || '',
            receiverAddress: this.formatAddress(shipment.deliveryDetails?.address),
            receiverCity: shipment.deliveryDetails?.address?.city || '',
            receiverState: shipment.deliveryDetails?.address?.state || '',
            receiverPincode: shipment.deliveryDetails?.address?.postalCode || '',
            receiverPhone: shipment.deliveryDetails?.recipientPhone || '',
            weight: shipment.packageDetails?.weight || 0,
            packages: shipment.packageDetails?.packageCount || 1,
            codAmount: shipment.paymentDetails?.codAmount || 0,
            paymentMode: (shipment.paymentDetails?.type || 'prepaid') as 'cod' | 'prepaid',
            zone: undefined,
            orderNumber,
        };
    }

    /**
     * Generate label for a shipment
     * POST /shipments/:id/label
     */
    generateLabel = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { format = 'pdf' } = req.body || {}; // pdf or zpl

            if (!['pdf', 'zpl'].includes(format)) {
                throw new ValidationError('Invalid format. Must be pdf or zpl.');
            }

            const shipment = await Shipment.findById(id)
                .populate('pickupDetails.warehouseId')
                .populate('orderId', 'orderNumber');
            if (!shipment) {
                throw new NotFoundError('Shipment not found');
            }

            const shipmentData = this.buildShipmentLabelData(shipment);

            let labelBuffer: Buffer;

            if (format === 'pdf') {
                try {
                    const carrierLabelBuffer = await this.generateCarrierLabelPdfBuffer(
                        shipment,
                        shipmentData.awb
                    );
                    if (carrierLabelBuffer) {
                        labelBuffer = carrierLabelBuffer;
                    } else {
                        labelBuffer = await LabelService.generatePDF(shipmentData);
                    }
                } catch (error: any) {
                    logger.warn('Carrier label generation failed, using internal PDF fallback', {
                        shipmentId: id,
                        carrier: shipment.carrier,
                        error: error?.message || error,
                    });
                    labelBuffer = await LabelService.generatePDF(shipmentData);
                }
            } else {
                const zpl = LabelService.generateZPL(shipmentData);
                labelBuffer = Buffer.from(zpl, 'utf-8');
            }

            logger.info(`Label generated for shipment ${id} in ${format} format`);

            sendSuccess(res, {
                shipmentId: id,
                awb: shipmentData.awb,
                format,
                labelData: labelBuffer.toString('base64'),
            }, 'Label generated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Download label
     * GET /shipments/:id/label/download?format=pdf|zpl
     */
    downloadLabel = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const format = (req.query?.format as string) || 'pdf';

            if (!['pdf', 'zpl'].includes(format as string)) {
                throw new ValidationError('Invalid format. Must be pdf or zpl.');
            }

            const shipment = await Shipment.findById(id)
                .populate('pickupDetails.warehouseId')
                .populate('orderId', 'orderNumber');
            if (!shipment) {
                throw new NotFoundError('Shipment not found');
            }

            const shipmentData = this.buildShipmentLabelData(shipment);

            if (format === 'pdf') {
                let labelBuffer: Buffer;
                try {
                    const carrierLabelBuffer = await this.generateCarrierLabelPdfBuffer(
                        shipment,
                        shipmentData.awb
                    );
                    if (carrierLabelBuffer) {
                        labelBuffer = carrierLabelBuffer;
                    } else {
                        labelBuffer = await LabelService.generatePDF(shipmentData);
                    }
                } catch (error: any) {
                    logger.warn('Carrier label download failed, using internal PDF fallback', {
                        shipmentId: id,
                        carrier: shipment.carrier,
                        error: error?.message || error,
                    });
                    labelBuffer = await LabelService.generatePDF(shipmentData);
                }
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="label-${shipmentData.awb}.pdf"`);
                res.send(labelBuffer);
            } else {
                const zpl = LabelService.generateZPL(shipmentData);
                res.setHeader('Content-Type', 'text/plain');
                res.setHeader('Content-Disposition', `attachment; filename="label-${shipmentData.awb}.zpl"`);
                res.send(zpl);
            }

            logger.info(`Label downloaded for shipment ${id} in ${format} format`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Generate bulk labels
     * POST /shipments/bulk-labels
     */
    generateBulkLabels = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { shipmentIds } = req.body || {};

            if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
                throw new ValidationError('shipmentIds must be a non-empty array');
            }

            if (shipmentIds.length > 100) {
                throw new ValidationError('Maximum 100 shipments allowed per bulk request');
            }

            const shipments = await Shipment.find({ _id: { $in: shipmentIds } }).populate('pickupDetails.warehouseId');

            if (shipments.length === 0) {
                throw new NotFoundError('No shipments found');
            }

            const shipmentsData = shipments.map((shipment) => {
                return this.buildShipmentLabelData(shipment);
            });

            const bulkPDF = await LabelService.generateBulk(shipmentsData);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="bulk-labels-${Date.now()}.pdf"`);
            res.send(bulkPDF);

            logger.info(`Bulk labels generated for ${shipments.length} shipments`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reprint label (same as generate)
     * POST /shipments/:id/label/reprint
     */
    reprintLabel = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Call generateLabel with same logic
            await this.generateLabel(req, res, next);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get supported label formats for carrier
     * GET /shipments/:id/label/formats
     */
    getSupportedFormats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const shipment = await Shipment.findById(id);
            if (!shipment) {
                throw new NotFoundError('Shipment not found');
            }

            const adapter = this.resolveCarrierAdapter(shipment.carrier);
            const formats = adapter ? adapter.getFormats() : ['pdf', 'zpl'];

            sendSuccess(res, {
                carrier: shipment.carrier,
                supportedFormats: formats,
                internalFormats: ['pdf', 'zpl'], // Always available via label service
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new LabelController();
