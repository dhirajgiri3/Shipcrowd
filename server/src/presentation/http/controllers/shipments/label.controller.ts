import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import LabelService from '../../../../core/application/services/shipping/label.service';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { CourierFactory } from '../../../../core/application/services/courier/courier.factory';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import CourierProviderRegistry from '../../../../core/application/services/courier/courier-provider-registry';

class LabelController {
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

    private canUseCarrierLabel(shipment: any): { allowed: boolean; reason?: string } {
        const carrier = String(shipment?.carrier || '').toLowerCase();
        const carrierAwb = String(shipment?.carrierDetails?.carrierTrackingNumber || '').trim();
        const storedLabelUrl = this.getStoredLabelUrl(shipment);

        const normalizedStatus = String(shipment?.currentStatus || '').toLowerCase();
        if (normalizedStatus === 'awaiting_sync' || normalizedStatus === 'awaiting_carrier_sync') {
            return { allowed: false, reason: 'Shipment is awaiting carrier sync' };
        }

        if (carrier === 'velocity') {
            if (!storedLabelUrl) {
                return { allowed: false, reason: 'Velocity label URL not stored yet' };
            }
            return { allowed: true };
        }

        if (!carrierAwb) {
            return { allowed: false, reason: 'Carrier AWB is not available yet' };
        }

        return { allowed: true };
    }

    private async generateCarrierLabelPdfBuffer(shipment: any, awb: string): Promise<Buffer | null> {
        const canonicalCarrier = CourierProviderRegistry.toCanonical(String(shipment?.carrier || ''));
        if (!canonicalCarrier) {
            return null;
        }

        const eligibility = this.canUseCarrierLabel(shipment);
        if (!eligibility.allowed) {
            logger.info('Skipping carrier label fetch, using internal label fallback', {
                shipmentId: shipment?._id?.toString?.() || shipment?._id,
                carrier: shipment?.carrier,
                reason: eligibility.reason,
            });
            return null;
        }

        if (canonicalCarrier === 'velocity') {
            const storedLabelUrl = this.getStoredLabelUrl(shipment);
            if (!storedLabelUrl) {
                return null;
            }
            try {
                return await this.fetchLabelBufferFromUrl(storedLabelUrl);
            } catch (error: any) {
                logger.warn('Velocity stored label URL fetch failed, using internal fallback', {
                    shipmentId: shipment?._id?.toString?.() || shipment?._id,
                    awb,
                    error: error?.message || error,
                });
                return null;
            }
        }

        const companyId =
            shipment?.companyId instanceof mongoose.Types.ObjectId
                ? shipment.companyId
                : new mongoose.Types.ObjectId(String(shipment?.companyId));

        const provider = await CourierFactory.getProvider(canonicalCarrier, companyId);
        if (typeof provider.getLabel !== 'function') {
            return null;
        }

        const labelResult = await provider.getLabel([awb], 'pdf');
        if (labelResult?.pdfBuffer && Buffer.isBuffer(labelResult.pdfBuffer)) {
            return labelResult.pdfBuffer;
        }

        if (labelResult?.labels?.length) {
            const labelUrl = labelResult.labels[0]?.label_url;
            if (typeof labelUrl === 'string' && labelUrl.trim()) {
                return this.fetchLabelBufferFromUrl(labelUrl);
            }
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

    private async getCompanyShipmentOrThrow(req: Request, shipmentId: string, populate: boolean = true): Promise<any> {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const query = {
            _id: shipmentId,
            companyId: new mongoose.Types.ObjectId(auth.companyId),
            isDeleted: false,
        };

        const shipmentQuery = Shipment.findOne(query);
        if (populate) {
            shipmentQuery.populate('pickupDetails.warehouseId').populate('orderId', 'orderNumber');
        }

        const shipment = await shipmentQuery;
        if (!shipment) {
            throw new NotFoundError('Shipment not found');
        }

        return shipment;
    }

    generateLabel = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { format = 'pdf' } = req.body || {};

            if (!['pdf', 'zpl'].includes(format)) {
                throw new ValidationError('Invalid format. Must be pdf or zpl.');
            }

            const shipment = await this.getCompanyShipmentOrThrow(req, id);
            const shipmentData = this.buildShipmentLabelData(shipment);

            let labelBuffer: Buffer;

            if (format === 'pdf') {
                try {
                    const carrierLabelBuffer = await this.generateCarrierLabelPdfBuffer(shipment, shipmentData.awb);
                    labelBuffer = carrierLabelBuffer || await LabelService.generatePDF(shipmentData);
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

    downloadLabel = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const format = (req.query?.format as string) || 'pdf';

            if (!['pdf', 'zpl'].includes(format)) {
                throw new ValidationError('Invalid format. Must be pdf or zpl.');
            }

            const shipment = await this.getCompanyShipmentOrThrow(req, id);
            const shipmentData = this.buildShipmentLabelData(shipment);

            if (format === 'pdf') {
                let labelBuffer: Buffer;
                try {
                    const carrierLabelBuffer = await this.generateCarrierLabelPdfBuffer(shipment, shipmentData.awb);
                    labelBuffer = carrierLabelBuffer || await LabelService.generatePDF(shipmentData);
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

    generateBulkLabels = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { shipmentIds } = req.body || {};

            if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
                throw new ValidationError('shipmentIds must be a non-empty array');
            }

            if (shipmentIds.length > 100) {
                throw new ValidationError('Maximum 100 shipments allowed per bulk request');
            }

            const shipments = await Shipment.find({
                _id: { $in: shipmentIds },
                companyId: new mongoose.Types.ObjectId(auth.companyId),
                isDeleted: false,
            }).populate('pickupDetails.warehouseId');

            if (shipments.length !== shipmentIds.length) {
                throw new ValidationError('One or more shipment IDs are invalid or do not belong to your company');
            }

            const shipmentsData = shipments.map((shipment) => this.buildShipmentLabelData(shipment));
            const bulkPDF = await LabelService.generateBulk(shipmentsData);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="bulk-labels-${Date.now()}.pdf"`);
            res.send(bulkPDF);

            logger.info(`Bulk labels generated for ${shipments.length} shipments`);
        } catch (error) {
            next(error);
        }
    }

    reprintLabel = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.generateLabel(req, res, next);
        } catch (error) {
            next(error);
        }
    }

    getSupportedFormats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const shipment = await this.getCompanyShipmentOrThrow(req, id, false);
            const canonicalCarrier = CourierProviderRegistry.toCanonical(String(shipment.carrier || ''));

            let supportedFormats: Array<'pdf' | 'zpl' | 'url'> = ['pdf', 'zpl'];
            if (canonicalCarrier === 'velocity') {
                supportedFormats = ['url'];
            } else if (canonicalCarrier === 'delhivery' || canonicalCarrier === 'ekart') {
                supportedFormats = ['pdf', 'url'];
            }

            sendSuccess(res, {
                carrier: shipment.carrier,
                supportedFormats,
                internalFormats: ['pdf', 'zpl'],
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new LabelController();
