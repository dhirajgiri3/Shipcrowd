import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import ManifestService from '../../../../core/application/services/shipping/manifest.service';
import LabelService from '../../../../core/application/services/shipping/label.service';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import logger from '../../../../shared/logger/winston.logger';

class BulkShipmentController {
    /**
     * Create Bulk Manifests (Auto-group by Carrier & Warehouse)
     * Input: [shipmentIds]
     * Output: List of created manifests
     */
    async createBulkManifest(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;
            const { shipmentIds, pickup } = req.body;
            if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
                throw new ValidationError('Shipment IDs required');
            }

            // 1. Fetch Shipments
            const shipments = await Shipment.find({
                _id: { $in: shipmentIds },
                companyId: new mongoose.Types.ObjectId(companyId),
                currentStatus: 'ready_to_ship' // Only allow ready shipments
            });

            if (shipments.length === 0) throw new NotFoundError('No eligible shipments found');

            // 2. Group by Warehouse + Carrier
            const groups = new Map<string, any[]>();

            shipments.forEach(s => {
                const wid = s.pickupDetails?.warehouseId?.toString() || 'unknown';
                const key = `${wid}|${s.carrier}`;
                if (wid !== 'unknown') {
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(s);
                }
            });

            const createdManifests = [];
            const errors = [];

            // 3. Create Manifest per Group
            for (const [key, groupShipments] of groups) {
                const [warehouseId, carrier] = key.split('|');

                try {
                    const manifest = await ManifestService.createManifest({
                        companyId,
                        warehouseId,
                        carrier: carrier as any,
                        shipmentIds: groupShipments.map(s => s._id.toString()),
                        pickup: {
                            scheduledDate: new Date(pickup.scheduledDate),
                            timeSlot: pickup.timeSlot,
                            contactPerson: pickup.contactPerson,
                            contactPhone: pickup.contactPhone
                        },
                        notes: `Bulk created for ${groupShipments.length} shipments`
                    });
                    createdManifests.push(manifest);
                } catch (err: any) {
                    errors.push({ group: key, error: err.message });
                }
            }

            sendSuccess(res, {
                totalRequested: shipmentIds.length,
                processed: shipments.length,
                manifestsCreated: createdManifests.length,
                manifests: createdManifests,
                errors
            }, 'Bulk manifest creation processing complete');

        } catch (error) {
            next(error);
        }
    }

    /**
     * Generate Bulk Labels (Merged PDF)
     * Input: [shipmentIds]
     */
    async generateBulkLabels(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const companyId = auth.companyId;
            const { shipmentIds } = req.body; // or Query param ?ids=...

            // 1. Fetch Shipments with Sender/Receiver details
            const shipments = await Shipment.find({
                _id: { $in: shipmentIds },
                companyId: new mongoose.Types.ObjectId(companyId)
            }).populate('pickupDetails.warehouseId').lean();

            if (shipments.length === 0) throw new NotFoundError('No shipments found');

            // 2. Map to LabelService Format
            const labelData = shipments.map((s: any) => {
                const warehouse: any = s.pickupDetails?.warehouseId;
                return {
                    awb: s.trackingNumber,
                    carrier: s.carrier,
                    senderName: warehouse?.name || 'Fulfilment Center',
                    senderAddress: warehouse?.address?.line1 || warehouse?.address || '',
                    senderCity: warehouse?.address?.city || warehouse?.city || '',
                    senderState: warehouse?.address?.state || warehouse?.state || '',
                    senderPincode: warehouse?.address?.postalCode || warehouse?.pincode || '',
                    senderPhone: warehouse?.phone || '',
                    receiverName: s.deliveryDetails?.recipientName || 'N/A',
                    receiverAddress: s.deliveryDetails?.address?.line1 || 'N/A',
                    receiverCity: s.deliveryDetails?.address?.city || 'N/A',
                    receiverState: s.deliveryDetails?.address?.state || 'N/A',
                    receiverPincode: s.deliveryDetails?.address?.postalCode || 'N/A',
                    receiverPhone: s.deliveryDetails?.recipientPhone || 'N/A',
                    weight: s.packageDetails?.weight || 0.5,
                    packages: 1,
                    codAmount: s.paymentDetails?.type === 'cod' ? s.paymentDetails.codAmount : 0,
                    paymentMode: s.paymentDetails?.type === 'cod' ? 'cod' : 'prepaid',
                    orderNumber: s.orderId ? s.orderId.toString() : ''
                };
            });

            // 3. Generate PDF
            const pdfBuffer = await LabelService.generateBulk(labelData as any);

            // 4. Send Response
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="bulk-labels-${Date.now()}.pdf"`);
            res.send(pdfBuffer);

        } catch (error) {
            next(error);
        }
    }
}

export default new BulkShipmentController();
