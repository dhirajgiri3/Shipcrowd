import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import LabelTemplate from '../../../../infrastructure/database/mongoose/models/shipping/label-template.model';
import Order from '../../../../infrastructure/database/mongoose/models/orders/core/order.model';
import { AppError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Label Generator Service
 * Generates custom shipping labels using templates
 */

interface LabelData {
    awb: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    shipping_address: string;
    shipping_city: string;
    shipping_state: string;
    shipping_pincode: string;
    shipping_country: string;
    seller_name: string;
    seller_address: string;
    seller_phone: string;
    weight: number;
    dimensions?: string;
    declared_value: number;
    payment_mode: string;
    cod_amount?: number;
    delivery_instructions?: string;
    package_count: number;
    service_type: string;
    expected_delivery_date?: string;
    qr_code_data: string; // Tracking URL
}

class LabelGeneratorService {
    /**
     * Generate label for an order using template
     */
    async generateLabel(
        orderId: string,
        companyId: string,
        templateId?: string
    ): Promise<Buffer> {
        try {
            // Fetch order
            const order = await Order.findOne({
                _id: orderId,
                companyId: new mongoose.Types.ObjectId(companyId),
            });

            if (!order) {
                throw new AppError('Order not found', ErrorCode.RES_NOT_FOUND, 404);
            }

            // Fetch template
            let template;
            if (templateId) {
                template = await LabelTemplate.findOne({
                    _id: templateId,
                    companyId: new mongoose.Types.ObjectId(companyId),
                    isActive: true,
                });
            } else {
                // Get default template
                template = await LabelTemplate.findOne({
                    companyId: new mongoose.Types.ObjectId(companyId),
                    type: 'shipping',
                    isDefault: true,
                    isActive: true,
                });
            }

            if (!template) {
                throw new AppError('Label template not found', ErrorCode.RES_NOT_FOUND, 404);
            }

            // Prepare label data
            // Calculate total weight from products
            const totalWeight = order.products.reduce((sum, p) => sum + (p.weight || 0.5) * p.quantity, 0);

            // Prepare label data
            const labelData: LabelData = {
                awb: order.shippingDetails?.trackingNumber || 'PENDING',
                order_number: order.orderNumber,
                customer_name: order.customerInfo.name,
                customer_phone: order.customerInfo.phone,
                customer_email: order.customerInfo.email,
                shipping_address: order.customerInfo.address.line1,
                shipping_city: order.customerInfo.address.city,
                shipping_state: order.customerInfo.address.state,
                shipping_pincode: order.customerInfo.address.postalCode,
                shipping_country: order.customerInfo.address.country || 'India',
                seller_name: 'Seller', // Placeholder as IOrder doesn't have seller details directly
                seller_address: '',
                seller_phone: '',
                weight: totalWeight > 0 ? totalWeight : 0.5,
                dimensions: order.products[0]?.dimensions
                    ? `${order.products[0].dimensions.length || 10}x${order.products[0].dimensions.width || 10}x${order.products[0].dimensions.height || 10} cm`
                    : '10x10x10 cm',
                declared_value: order.totals.subtotal,
                payment_mode: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
                cod_amount: order.paymentMethod === 'cod' ? order.totals.total : undefined,
                delivery_instructions: order.notes,
                package_count: 1,
                service_type: order.shippingDetails?.method || 'Standard',
                expected_delivery_date: order.shippingDetails?.estimatedDelivery?.toISOString().split('T')[0],
                qr_code_data: `https://track.shipcrowd.com/${order.shippingDetails?.trackingNumber || order.orderNumber}`,
            };

            // Generate label based on format
            let labelBuffer: Buffer;
            switch (template.format) {
                case 'pdf':
                    labelBuffer = await this.generatePDFLabel(template, labelData);
                    break;
                case 'thermal':
                    labelBuffer = await this.generateThermalLabel(template, labelData);
                    break;
                case 'zpl':
                    labelBuffer = await this.generateZPLLabel(template, labelData);
                    break;
                default:
                    throw new AppError('Unsupported label format', ErrorCode.VALIDATION_ERROR, 400);
            }

            // Update template usage
            await LabelTemplate.updateOne(
                { _id: template._id },
                {
                    $inc: { usageCount: 1 },
                    $set: { lastUsedAt: new Date() },
                }
            );

            logger.info('Label generated successfully', {
                orderId,
                templateId: template._id,
                format: template.format,
            });

            return labelBuffer;
        } catch (error) {
            logger.error('Label generation failed', {
                orderId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }

    /**
     * Generate PDF label
     */
    private async generatePDFLabel(template: any, data: LabelData): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: this.getPageSize(template.pageSize, template.customDimensions),
                    margins: template.layout.margins,
                });

                const buffers: Buffer[] = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));

                // Add branding
                if (template.branding?.showCompanyInfo && template.branding.companyName) {
                    doc.fontSize(16)
                        .font('Helvetica-Bold')
                        .text(template.branding.companyName, 50, 30);
                }

                // Render sections
                for (const section of template.layout.sections) {
                    this.renderPDFSection(doc, section, data);
                }

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Render PDF section
     */
    private async renderPDFSection(doc: PDFKit.PDFDocument, section: any, data: LabelData) {
        const { position, type, content, style } = section;
        const x = position.x;
        const y = position.y;

        // Apply styles
        if (style.fontSize) doc.fontSize(style.fontSize);
        if (style.fontWeight === 'bold') doc.font('Helvetica-Bold');
        else doc.font('Helvetica');

        // Render based on type
        switch (type) {
            case 'text': {
                const renderedContent = this.replaceVariables(content, data);
                doc.text(renderedContent, x, y, {
                    width: position.width,
                    align: style.textAlign || 'left',
                });
                break;
            }
            case 'barcode': {
                const barcodeValue = this.replaceVariables(content, data);
                const barcodeImage = await bwipjs.toBuffer({
                    bcid: section.barcodeType?.toLowerCase() || 'code128',
                    text: barcodeValue,
                    scale: 3,
                    height: 10,
                    includetext: true,
                });
                doc.image(barcodeImage, x, y, {
                    width: position.width,
                    height: position.height,
                });
                break;
            }
            case 'qrcode': {
                const qrValue = this.replaceVariables(content, data);
                const qrImage = await QRCode.toBuffer(qrValue, {
                    width: position.width,
                    margin: 1,
                });
                doc.image(qrImage, x, y, {
                    width: position.width,
                    height: position.height,
                });
                break;
            }
            case 'image':
            case 'logo': {
                if (section.imageUrl) {
                    doc.image(section.imageUrl, x, y, {
                        width: position.width,
                        height: position.height,
                    });
                }
                break;
            }
            case 'table': {
                // Simple table rendering
                const tableData = this.parseTableContent(content, data);
                let currentY = y;
                for (const row of tableData) {
                    doc.text(row.join(' | '), x, currentY);
                    currentY += 20;
                }
                break;
            }
        }

        // Draw border if specified
        if (style.border) {
            doc.rect(x, y, position.width, position.height).stroke(style.borderColor || '#000000');
        }
    }

    /**
     * Generate thermal printer label (simplified)
     */
    private async generateThermalLabel(template: any, data: LabelData): Promise<Buffer> {
        // For thermal printers, we generate a simple text-based format
        // In production, this would integrate with specific thermal printer commands
        const lines: string[] = [
            '===== SHIPPING LABEL =====',
            '',
            `AWB: ${data.awb}`,
            `Order: ${data.order_number}`,
            '',
            `TO: ${data.customer_name}`,
            `    ${data.shipping_address}`,
            `    ${data.shipping_city}, ${data.shipping_state} - ${data.shipping_pincode}`,
            `    Phone: ${data.customer_phone}`,
            '',
            `FROM: ${data.seller_name}`,
            `Weight: ${data.weight} kg`,
            `Payment: ${data.payment_mode}`,
        ];

        if (data.cod_amount) {
            lines.push(`COD Amount: ₹${data.cod_amount}`);
        }

        lines.push('', '=========================');

        return Buffer.from(lines.join('\n'), 'utf-8');
    }

    /**
     * Generate ZPL label for Zebra printers
     */
    private async generateZPLLabel(template: any, data: LabelData): Promise<Buffer> {
        // ZPL (Zebra Programming Language) commands
        const zpl: string[] = [
            '^XA', // Start format
            '^CF0,30', // Font
            '^FO50,50^FD' + data.awb + '^FS', // AWB
            '^FO50,100^FD' + data.customer_name + '^FS', // Customer name
            '^FO50,150^FD' + data.shipping_address + '^FS', // Address
            '^FO50,200^FD' + data.shipping_city + ', ' + data.shipping_state + '^FS',
            '^FO50,250^FD' + data.shipping_pincode + '^FS',
            '^BY3,3,100', // Barcode settings
            '^FO50,300^BC^FD' + data.awb + '^FS', // Barcode
            '^XZ', // End format
        ];

        return Buffer.from(zpl.join('\n'), 'utf-8');
    }

    /**
     * Replace template variables with actual data
     */
    private replaceVariables(content: string, data: LabelData): string {
        let result = content;
        const variables = {
            awb: data.awb,
            order_number: data.order_number,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            customer_email: data.customer_email || '',
            shipping_address: data.shipping_address,
            shipping_city: data.shipping_city,
            shipping_state: data.shipping_state,
            shipping_pincode: data.shipping_pincode,
            shipping_country: data.shipping_country,
            seller_name: data.seller_name,
            seller_address: data.seller_address,
            seller_phone: data.seller_phone,
            weight: data.weight.toString(),
            dimensions: data.dimensions || '',
            declared_value: data.declared_value.toString(),
            payment_mode: data.payment_mode,
            cod_amount: data.cod_amount?.toString() || '',
            delivery_instructions: data.delivery_instructions || '',
            package_count: data.package_count.toString(),
            service_type: data.service_type,
            expected_delivery_date: data.expected_delivery_date || '',
            qr_code_data: data.qr_code_data,
        };

        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        return result;
    }

    /**
     * Parse table content
     */
    private parseTableContent(content: string, data: LabelData): string[][] {
        // Simple table parsing - in production, this would be more sophisticated
        const rows = content.split('\n').filter((row) => row.trim());
        return rows.map((row) => {
            const rendered = this.replaceVariables(row, data);
            return rendered.split('|').map((cell) => cell.trim());
        });
    }

    /**
     * Get page size dimensions
     */
    private getPageSize(
        pageSize: string,
        customDimensions?: { width: number; height: number }
    ): [number, number] | string {
        const sizes: Record<string, [number, number]> = {
            '4x6': [288, 432], // 4x6 inches in points (72 points per inch)
            '4x8': [288, 576], // 4x8 inches
        };

        if (pageSize === 'custom' && customDimensions) {
            // Convert mm to points (1 mm = 2.83465 points)
            return [customDimensions.width * 2.83465, customDimensions.height * 2.83465];
        }

        return sizes[pageSize] || pageSize.toUpperCase() as any;
    }

    /**
     * Create default template for a company
     */
    async createDefaultTemplate(companyId: string, userId: string) {
        const defaultTemplate = {
            name: 'Default Shipping Label',
            description: 'Standard 4x6 shipping label with barcode',
            companyId: new mongoose.Types.ObjectId(companyId),
            type: 'shipping',
            format: 'pdf',
            pageSize: '4x6',
            layout: {
                orientation: 'portrait',
                margins: { top: 10, right: 10, bottom: 10, left: 10 },
                sections: [
                    {
                        id: 'awb-barcode',
                        type: 'barcode',
                        position: { x: 20, y: 20, width: 250, height: 60 },
                        content: '{{awb}}',
                        style: {},
                        barcodeType: 'CODE128',
                    },
                    {
                        id: 'to-address',
                        type: 'text',
                        position: { x: 20, y: 100, width: 250, height: 100 },
                        content: 'TO:\n{{customer_name}}\n{{shipping_address}}\n{{shipping_city}}, {{shipping_state}} - {{shipping_pincode}}\nPhone: {{customer_phone}}',
                        style: { fontSize: 10, textAlign: 'left' },
                    },
                    {
                        id: 'from-address',
                        type: 'text',
                        position: { x: 20, y: 220, width: 250, height: 60 },
                        content: 'FROM: {{seller_name}}\n{{seller_address}}',
                        style: { fontSize: 8, textAlign: 'left' },
                    },
                    {
                        id: 'order-details',
                        type: 'text',
                        position: { x: 20, y: 300, width: 250, height: 80 },
                        content: 'Order: {{order_number}}\nWeight: {{weight}} kg\n{{payment_mode}}{{cod_amount}}',
                        style: { fontSize: 9, textAlign: 'left' },
                    },
                    {
                        id: 'qr-code',
                        type: 'qrcode',
                        position: { x: 220, y: 300, width: 60, height: 60 },
                        content: '{{qr_code_data}}',
                        style: {},
                    },
                ],
            },
            printSettings: {
                dpi: 300,
            },
            supportedVariables: [
                'awb', 'order_number', 'customer_name', 'customer_phone',
                'shipping_address', 'shipping_city', 'shipping_state', 'shipping_pincode',
                'seller_name', 'weight', 'payment_mode', 'cod_amount', 'qr_code_data'
            ],
            isActive: true,
            isDefault: true,
            createdBy: new mongoose.Types.ObjectId(userId),
        };

        const template = await LabelTemplate.create(defaultTemplate);
        logger.info('Default label template created', { companyId, templateId: template._id });
        return template;
    }
}

export default new LabelGeneratorService();
