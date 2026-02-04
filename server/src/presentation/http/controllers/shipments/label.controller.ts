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
            delhivery: DelhiveryLabelAdapter,
            ekart: EkartLabelAdapter,
            india_post: IndiaPostLabelAdapter,
        };

    /**
     * Generate label for a shipment
     * POST /shipments/:id/label
     */
    async generateLabel(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { format = 'pdf' } = req.body; // pdf or zpl

            if (!['pdf', 'zpl'].includes(format)) {
                throw new ValidationError('Invalid format. Must be pdf or zpl.');
            }

            const shipment = await Shipment.findById(id).populate('pickupDetails.warehouseId');
            if (!shipment) {
                throw new NotFoundError('Shipment not found');
            }

            // Prepare shipment data using correct shipment model structure
            const warehouse = shipment.pickupDetails?.warehouseId as any;
            const shipmentData = {
                awb: shipment.carrierDetails?.carrierTrackingNumber || shipment.trackingNumber,
                carrier: shipment.carrier,
                senderName: warehouse?.name || 'Seller',
                senderAddress: warehouse?.address || '',
                senderCity: warehouse?.city || '',
                senderState: warehouse?.state || '',
                senderPincode: warehouse?.pincode || '',
                senderPhone: shipment.pickupDetails?.contactPhone || warehouse?.phone || '',
                receiverName: shipment.deliveryDetails.recipientName,
                receiverAddress: shipment.deliveryDetails.address.line1 + (shipment.deliveryDetails.address.line2 ? ', ' + shipment.deliveryDetails.address.line2 : ''),
                receiverCity: shipment.deliveryDetails.address.city,
                receiverState: shipment.deliveryDetails.address.state,
                receiverPincode: shipment.deliveryDetails.address.postalCode,
                receiverPhone: shipment.deliveryDetails.recipientPhone,
                weight: shipment.packageDetails.weight,
                packages: shipment.packageDetails.packageCount,
                codAmount: shipment.paymentDetails.codAmount || 0,
                paymentMode: shipment.paymentDetails.type as 'cod' | 'prepaid',
                zone: undefined,  // Not in current model
                orderNumber: shipment.orderId.toString(),
            };

            let labelBuffer: Buffer;
            let labelFormat: string;

            if (format === 'pdf' && shipment.carrier === 'delhivery') {
                try {
                    const adapter = this.carrierAdapters[shipment.carrier];
                    if (adapter) {
                        const label = await adapter.generateLabel({ awb: shipmentData.awb });
                        if (label.format === 'pdf' && Buffer.isBuffer(label.data)) {
                            labelBuffer = label.data as Buffer;
                            labelFormat = 'application/pdf';
                        } else {
                            throw new Error('Delhivery label format not supported');
                        }
                    } else {
                        throw new Error('Carrier adapter not found');
                    }
                } catch (error: any) {
                    const status = error?.response?.status;
                    // Fallback only on network/5xx
                    if (status && status >= 400 && status < 500) {
                        throw error;
                    }
                    labelBuffer = await LabelService.generatePDF(shipmentData);
                    labelFormat = 'application/pdf';
                }
            } else if (format === 'pdf') {
                labelBuffer = await LabelService.generatePDF(shipmentData);
                labelFormat = 'application/pdf';
            } else {
                const zpl = LabelService.generateZPL(shipmentData);
                labelBuffer = Buffer.from(zpl, 'utf-8');
                labelFormat = 'text/plain';
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
    async downloadLabel(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { format = 'pdf' } = req.query;

            if (!['pdf', 'zpl'].includes(format as string)) {
                throw new ValidationError('Invalid format. Must be pdf or zpl.');
            }

            const shipment = await Shipment.findById(id).populate('pickupDetails.warehouseId');
            if (!shipment) {
                throw new NotFoundError('Shipment not found');
            }

            const warehouse = shipment.pickupDetails?.warehouseId as any;
            const shipmentData = {
                awb: shipment.carrierDetails?.carrierTrackingNumber || shipment.trackingNumber,
                carrier: shipment.carrier,
                senderName: warehouse?.name || 'Seller',
                senderAddress: warehouse?.address || '',
                senderCity: warehouse?.city || '',
                senderState: warehouse?.state || '',
                senderPincode: warehouse?.pincode || '',
                senderPhone: shipment.pickupDetails?.contactPhone || warehouse?.phone || '',
                receiverName: shipment.deliveryDetails.recipientName,
                receiverAddress: shipment.deliveryDetails.address.line1 + (shipment.deliveryDetails.address.line2 ? ', ' + shipment.deliveryDetails.address.line2 : ''),
                receiverCity: shipment.deliveryDetails.address.city,
                receiverState: shipment.deliveryDetails.address.state,
                receiverPincode: shipment.deliveryDetails.address.postalCode,
                receiverPhone: shipment.deliveryDetails.recipientPhone,
                weight: shipment.packageDetails.weight,
                packages: shipment.packageDetails.packageCount,
                codAmount: shipment.paymentDetails.codAmount || 0,
                paymentMode: shipment.paymentDetails.type as 'cod' | 'prepaid',
                zone: undefined,
                orderNumber: shipment.orderId.toString(),
            };

            if (format === 'pdf' && shipment.carrier === 'delhivery') {
                try {
                    const adapter = this.carrierAdapters[shipment.carrier];
                    if (adapter) {
                        const label = await adapter.generateLabel({ awb: shipmentData.awb });
                        if (label.format === 'pdf' && Buffer.isBuffer(label.data)) {
                            res.setHeader('Content-Type', 'application/pdf');
                            res.setHeader('Content-Disposition', `attachment; filename=\"label-${shipmentData.awb}.pdf\"`);
                            res.send(label.data);
                            return;
                        }
                    }
                    throw new Error('Delhivery label format not supported');
                } catch (error: any) {
                    const status = error?.response?.status;
                    if (status && status >= 400 && status < 500) {
                        throw error;
                    }
                    const labelBuffer = await LabelService.generatePDF(shipmentData);
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename=\"label-${shipmentData.awb}.pdf\"`);
                    res.send(labelBuffer);
                    return;
                }
            }

            if (format === 'pdf') {
                const labelBuffer = await LabelService.generatePDF(shipmentData);
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
    async generateBulkLabels(req: Request, res: Response, next: NextFunction) {
        try {
            const { shipmentIds } = req.body;

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
                const warehouse = shipment.pickupDetails?.warehouseId as any;
                return {
                    awb: shipment.carrierDetails?.carrierTrackingNumber || shipment.trackingNumber,
                    carrier: shipment.carrier,
                    senderName: warehouse?.name || 'Seller',
                    senderAddress: warehouse?.address || '',
                    senderCity: warehouse?.city || '',
                    senderState: warehouse?.state || '',
                    senderPincode: warehouse?.pincode || '',
                    senderPhone: shipment.pickupDetails?.contactPhone || warehouse?.phone || '',
                    receiverName: shipment.deliveryDetails.recipientName,
                    receiverAddress: shipment.deliveryDetails.address.line1 + (shipment.deliveryDetails.address.line2 ? ', ' + shipment.deliveryDetails.address.line2 : ''),
                    receiverCity: shipment.deliveryDetails.address.city,
                    receiverState: shipment.deliveryDetails.address.state,
                    receiverPincode: shipment.deliveryDetails.address.postalCode,
                    receiverPhone: shipment.deliveryDetails.recipientPhone,
                    weight: shipment.packageDetails.weight,
                    packages: shipment.packageDetails.packageCount,
                    codAmount: shipment.paymentDetails.codAmount || 0,
                    paymentMode: shipment.paymentDetails.type as 'cod' | 'prepaid',
                    zone: undefined,
                    orderNumber: shipment.orderId.toString(),
                };
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
    async reprintLabel(req: Request, res: Response, next: NextFunction) {
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
    async getSupportedFormats(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const shipment = await Shipment.findById(id);
            if (!shipment) {
                throw new NotFoundError('Shipment not found');
            }

            const adapter = this.carrierAdapters[shipment.carrier];
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
