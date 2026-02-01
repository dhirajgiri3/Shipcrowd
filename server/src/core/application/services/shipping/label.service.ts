import PDFDocument from 'pdfkit';
import BarcodeService from './barcode.service';
import logger from '../../../../shared/logger/winston.logger';
import { ICarrierLabelAdapter, LabelResponse } from '../../../domain/interfaces/carrier-label.interface';

/**
 * Label Service
 * Generates shipping labels in multiple formats (PDF, ZPL)
 * 
 * Formats:
 * - PDF: 4x6 inch thermal label (288x432 points)
 * - ZPL: Zebra Programming Language for thermal printers
 */

interface ShipmentData {
    awb: string;
    carrier: string;

    // Sender
    senderName: string;
    senderAddress: string;
    senderCity: string;
    senderState: string;
    senderPincode: string;
    senderPhone: string;

    // Receiver
    receiverName: string;
    receiverAddress: string;
    receiverCity: string;
    receiverState: string;
    receiverPincode: string;
    receiverPhone: string;

    // Shipment details
    weight: number;
    packages: number;
    codAmount?: number;
    paymentMode: 'cod' | 'prepaid';
    zone?: string;
    orderNumber?: string;
}

class LabelService {
    /**
     * Generate PDF label (4x6 inch, 288x432 points @ 72 DPI)
     * Standard thermal label size for shipping
     */
    async generatePDF(shipment: ShipmentData): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                // Create PDF document (4x6 inch)
                const doc = new PDFDocument({
                    size: [288, 432], // 4x6 inches at 72 DPI
                    margins: { top: 10, bottom: 10, left: 10, right: 10 },
                });

                const chunks: Buffer[] = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // ====== Header ======
                doc.fontSize(14).font('Helvetica-Bold').text('Shipcrowd', 10, 10);
                doc.fontSize(8).font('Helvetica').text(shipment.carrier.toUpperCase(), 200, 12);

                // ====== Barcode (AWB Number) ======
                const barcodeBuffer = await BarcodeService.generateCode128(shipment.awb, {
                    height: 40,
                    width: 2,
                    includeText: true,
                });
                doc.image(barcodeBuffer, 20, 35, { width: 248 });

                // ====== From Address ======
                let yPos = 90;
                doc.fontSize(8).font('Helvetica-Bold').text('FROM:', 10, yPos);
                yPos += 12;
                doc.fontSize(7).font('Helvetica').text(shipment.senderName, 10, yPos);
                yPos += 10;
                doc.text(shipment.senderAddress, 10, yPos, { width: 130 });
                yPos += 20;
                doc.text(`${shipment.senderCity}, ${shipment.senderState} - ${shipment.senderPincode}`, 10, yPos);
                yPos += 10;
                doc.text(`📞 ${shipment.senderPhone}`, 10, yPos);

                // ====== To Address (Prominent) ======
                yPos = 180;
                doc.fontSize(10).font('Helvetica-Bold').text('TO:', 10, yPos);
                yPos += 14;
                doc.fontSize(9).font('Helvetica-Bold').text(shipment.receiverName, 10, yPos);
                yPos += 12;
                doc.fontSize(8).font('Helvetica').text(shipment.receiverAddress, 10, yPos, { width: 260 });
                yPos += 25;
                doc.fontSize(9).font('Helvetica-Bold').text(
                    `${shipment.receiverCity}, ${shipment.receiverState}`,
                    10,
                    yPos
                );
                yPos += 12;
                doc.fontSize(11).font('Helvetica-Bold').text(
                    `PIN: ${shipment.receiverPincode}`,
                    10,
                    yPos
                );
                yPos += 12;
                doc.fontSize(8).font('Helvetica').text(`📞 ${shipment.receiverPhone}`, 10, yPos);

                // ====== Shipment Details ======
                yPos = 310;
                doc.fontSize(7).font('Helvetica');
                doc.text(`Weight: ${shipment.weight}kg`, 10, yPos);
                doc.text(`Packages: ${shipment.packages}`, 100, yPos);

                // Payment Mode (Highlighted)
                if (shipment.paymentMode === 'cod') {
                    doc.fontSize(10).font('Helvetica-Bold').fillColor('red');
                    doc.text(`COD: ₹${shipment.codAmount || 0}`, 180, yPos - 2);
                    doc.fillColor('black');
                } else {
                    doc.fontSize(9).font('Helvetica-Bold').fillColor('green');
                    doc.text('PREPAID', 200, yPos);
                    doc.fillColor('black');
                }

                yPos += 15;
                doc.fontSize(7).font('Helvetica');
                if (shipment.zone) {
                    doc.text(`Zone: ${shipment.zone}`, 10, yPos);
                }
                if (shipment.orderNumber) {
                    doc.text(`Order: ${shipment.orderNumber}`, 100, yPos);
                }

                // ====== Footer ======
                doc.fontSize(6).font('Helvetica').text(
                    'Powered by Shipcrowd',
                    10,
                    410,
                    { align: 'center', width: 268 }
                );

                doc.end();
            } catch (error: any) {
                logger.error(`Error generating PDF label for AWB ${shipment.awb}:`, error);
                reject(error);
            }
        });
    }

    /**
     * Generate ZPL label for Zebra thermal printers
     * Format: 4x6 inch (203 DPI)
     */
    generateZPL(shipment: ShipmentData): string {
        const zpl = `
^XA
^FO50,20^A0N,25,25^FDShipcrowd^FS
^FO200,20^A0N,20,20^FD${shipment.carrier.toUpperCase()}^FS

^FO50,50^BY2^BCN,80,Y,N,N^FD${shipment.awb}^FS

^FO50,150^A0N,20,20^FDFROM:^FS
^FO50,175^A0N,18,18^FD${shipment.senderName}^FS
^FO50,195^A0N,16,16^FD${shipment.senderAddress.substring(0, 40)}^FS
^FO50,215^A0N,16,16^FD${shipment.senderCity}, ${shipment.senderState} - ${shipment.senderPincode}^FS

^FO50,260^A0N,22,22^FDTO:^FS
^FO50,285^A0N,20,20^FD${shipment.receiverName}^FS
^FO50,310^A0N,18,18^FD${shipment.receiverAddress.substring(0, 40)}^FS
^FO50,335^A0N,18,18^FD${shipment.receiverCity}, ${shipment.receiverState}^FS
^FO50,360^A0N,24,24^FDPIN: ${shipment.receiverPincode}^FS

^FO50,400^A0N,18,18^FDWeight: ${shipment.weight}kg | Packages: ${shipment.packages}^FS
${shipment.paymentMode === 'cod'
                ? `^FO200,420^A0N,22,22^FR^FDCOD: Rs${shipment.codAmount || 0}^FS`
                : `^FO200,420^A0N,20,20^FDPREPAID^FS`}

^FO50,460^A0N,14,14^FDPowered by Shipcrowd^FS
^XZ
    `.trim();

        return zpl;
    }

    /**
     * Generate bulk labels (multi-page PDF)
     * @param shipments - Array of shipment data
     * @returns PDF buffer with all labels
     */
    async generateBulk(shipments: ShipmentData[]): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: [288, 432],
                    margins: { top: 10, bottom: 10, left: 10, right: 10 },
                });

                const chunks: Buffer[] = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                for (let i = 0; i < shipments.length; i++) {
                    if (i > 0) {
                        doc.addPage();
                    }

                    // Generate individual label (inline to avoid recursion)
                    const shipment = shipments[i];

                    // Header
                    doc.fontSize(14).font('Helvetica-Bold').text('Shipcrowd', 10, 10);
                    doc.fontSize(8).font('Helvetica').text(shipment.carrier.toUpperCase(), 200, 12);

                    // Barcode
                    const barcodeBuffer = await BarcodeService.generateCode128(shipment.awb, {
                        height: 40,
                        width: 2,
                    });
                    doc.image(barcodeBuffer, 20, 35, { width: 248 });

                    // Addresses and details (simplified for bulk)
                    let yPos = 90;
                    doc.fontSize(8).font('Helvetica-Bold').text('FROM:', 10, yPos);
                    yPos += 12;
                    doc.fontSize(7).font('Helvetica').text(shipment.senderName, 10, yPos);

                    yPos = 180;
                    doc.fontSize(10).font('Helvetica-Bold').text('TO:', 10, yPos);
                    yPos += 14;
                    doc.fontSize(9).text(shipment.receiverName, 10, yPos);
                    yPos += 12;
                    doc.fontSize(8).font('Helvetica').text(shipment.receiverAddress, 10, yPos, { width: 260 });
                    yPos += 25;
                    doc.fontSize(11).font('Helvetica-Bold').text(`PIN: ${shipment.receiverPincode}`, 10, yPos);

                    // Payment
                    yPos = 310;
                    if (shipment.paymentMode === 'cod') {
                        doc.fontSize(10).font('Helvetica-Bold').fillColor('red');
                        doc.text(`COD: ₹${shipment.codAmount || 0}`, 180, yPos);
                        doc.fillColor('black');
                    }
                }

                doc.end();
            } catch (error: any) {
                logger.error('Error generating bulk labels:', error);
                reject(error);
            }
        });
    }
}

export default new LabelService();
