/**
 * Base PDF Service
 * Reusable foundation for generating all PDF documents (Invoice, Manifest, Labels, etc.)
 * Provides common utilities for headers, tables, styling, and layout
 */

import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { PDF_BRAND_COLORS } from '../../../../shared/constants/shipcrowd.constants';
import { formatINR } from '../../../../shared/utils/indian-currency.util';
import {
PDFBrandConfig,
PDFPageOptions,
PDFPartyDetails,
PDFTableColumn,
PDFTaxSummary,
} from './pdf.types';

export class BasePDFService {
    protected doc: PDFKit.PDFDocument;
    protected brandConfig: PDFBrandConfig;
    protected pageWidth: number;
    protected pageHeight: number;
    protected margins: { top: number; bottom: number; left: number; right: number };

    constructor(options: PDFPageOptions) {
        this.doc = new PDFDocument({
            size: options.size,
            layout: options.layout,
            margins: options.margins || { top: 40, bottom: 40, left: 40, right: 40 },
            bufferPages: true,
        });

        this.margins = options.margins || { top: 40, bottom: 40, left: 40, right: 40 };

        // Calculate usable page dimensions
        if (options.size === 'A4') {
            this.pageWidth = options.layout === 'portrait' ? 595 : 842;
            this.pageHeight = options.layout === 'portrait' ? 842 : 595;
        } else {
            // A6
            this.pageWidth = options.layout === 'portrait' ? 297 : 420;
            this.pageHeight = options.layout === 'portrait' ? 420 : 297;
        }

        this.brandConfig = {
            primaryColor: PDF_BRAND_COLORS.PRIMARY_BLUE,
            secondaryColor: PDF_BRAND_COLORS.TEXT_PRIMARY,
            borderColor: PDF_BRAND_COLORS.BORDER_DEFAULT,
            logoPath: path.join(__dirname, '../../../../../assets/Shipcrowd-logo.png'),
            companyName: 'Shipcrowd',
        };
    }

    /**
     * Add Shipcrowd branded header with logo and document title
     */
    addHeader(title: string, subtitle?: string, copyType?: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'): this {
        const y = this.margins.top;

        // Logo (left side)
        if (fs.existsSync(this.brandConfig.logoPath)) {
            this.doc.image(this.brandConfig.logoPath, this.margins.left, y, {
                width: 120,
                height: 40,
            });
        } else {
            // Fallback text if logo not found
            this.doc
                .fontSize(16)
                .fillColor(this.brandConfig.primaryColor)
                .font('Helvetica-Bold')
                .text('Shipcrowd', this.margins.left, y);
        }

        // Document title (center)
        this.doc
            .fontSize(18)
            .fillColor(this.brandConfig.secondaryColor)
            .font('Helvetica-Bold')
            .text(title, 0, y + 10, {
                align: 'center',
                width: this.pageWidth,
            });

        // Copy type (right side)
        if (copyType) {
            this.doc
                .fontSize(10)
                .fillColor(this.brandConfig.secondaryColor)
                .font('Helvetica')
                .text(copyType, this.pageWidth - this.margins.right - 100, y, {
                    width: 100,
                    align: 'right',
                });
        }

        // Subtitle if provided
        if (subtitle) {
            this.doc
                .fontSize(10)
                .fillColor(this.brandConfig.secondaryColor)
                .font('Helvetica')
                .text(subtitle, 0, y + 35, {
                    align: 'center',
                    width: this.pageWidth,
                });
        }

        // Horizontal line below header
        this.doc
            .moveTo(this.margins.left, y + 55)
            .lineTo(this.pageWidth - this.margins.right, y + 55)
            .strokeColor(this.brandConfig.borderColor)
            .lineWidth(1)
            .stroke();

        this.doc.moveDown(4);

        return this;
    }

    /**
     * Add two-column party details section (Billed From / Billed To)
     */
    addPartySection(seller: PDFPartyDetails, buyer: PDFPartyDetails, startY?: number): this {
        const y = startY || this.doc.y;
        const columnWidth = (this.pageWidth - this.margins.left - this.margins.right) / 2 - 10;

        // Draw box around party section
        this.doc
            .rect(this.margins.left, y, this.pageWidth - this.margins.left - this.margins.right, 120)
            .strokeColor(this.brandConfig.borderColor)
            .lineWidth(1)
            .stroke();

        // Vertical divider
        this.doc
            .moveTo(this.pageWidth / 2, y)
            .lineTo(this.pageWidth / 2, y + 120)
            .stroke();

        // Seller (Left column)
        let currentY = y + 10;
        this.doc
            .fontSize(10)
            .fillColor(this.brandConfig.secondaryColor)
            .font('Helvetica-Bold')
            .text('BILLED FROM', this.margins.left + 10, currentY);

        currentY += 15;
        this.doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(seller.name, this.margins.left + 10, currentY, { width: columnWidth });

        currentY += 12;
        if (seller.gstin) {
            this.doc
                .font('Helvetica')
                .text(`GSTIN: ${seller.gstin}`, this.margins.left + 10, currentY, { width: columnWidth });
            currentY += 12;
        }

        if (seller.pan) {
            this.doc.text(`PAN: ${seller.pan}`, this.margins.left + 10, currentY, { width: columnWidth });
            currentY += 12;
        }

        this.doc.text(
            `${seller.address.line1}${seller.address.line2 ? ', ' + seller.address.line2 : ''}`,
            this.margins.left + 10,
            currentY,
            { width: columnWidth }
        );
        currentY += 12;

        this.doc.text(
            `${seller.address.city}, ${seller.address.state} - ${seller.address.pincode}`,
            this.margins.left + 10,
            currentY,
            { width: columnWidth }
        );

        // Buyer (Right column)
        currentY = y + 10;
        this.doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('BILLED TO', this.pageWidth / 2 + 10, currentY);

        currentY += 15;
        this.doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(buyer.name, this.pageWidth / 2 + 10, currentY, { width: columnWidth });

        currentY += 12;
        if (buyer.gstin) {
            this.doc
                .font('Helvetica')
                .text(`GSTIN: ${buyer.gstin}`, this.pageWidth / 2 + 10, currentY, { width: columnWidth });
            currentY += 12;
        }

        this.doc.text(
            `${buyer.address.line1}${buyer.address.line2 ? ', ' + buyer.address.line2 : ''}`,
            this.pageWidth / 2 + 10,
            currentY,
            { width: columnWidth }
        );
        currentY += 12;

        this.doc.text(
            `${buyer.address.city}, ${buyer.address.state} - ${buyer.address.pincode}`,
            this.pageWidth / 2 + 10,
            currentY,
            { width: columnWidth }
        );

        this.doc.y = y + 130;

        return this;
    }

    /**
     * Render a data table with headers and rows
     */
    addTable(config: {
        headers: PDFTableColumn[];
        rows: Array<Record<string, any>>;
        startY?: number;
    }): this {
        const startY = config.startY || this.doc.y;
        const tableWidth = this.pageWidth - this.margins.left - this.margins.right;
        let currentY = startY;

        // Draw table header
        this.doc
            .rect(this.margins.left, currentY, tableWidth, 20)
            .fillAndStroke(this.brandConfig.primaryColor, this.brandConfig.borderColor);

        let currentX = this.margins.left;
        this.doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold');

        config.headers.forEach((col) => {
            const colWidth = (col.width / 100) * tableWidth;
            this.doc.text(col.header, currentX + 5, currentY + 6, {
                width: colWidth - 10,
                align: col.align || 'left',
            });
            currentX += colWidth;
        });

        currentY += 20;
        this.doc.fillColor(this.brandConfig.secondaryColor);

        // Draw table rows
        this.doc.fontSize(8).font('Helvetica');

        config.rows.forEach((row, index) => {
            // Alternate row background
            if (index % 2 === 0) {
                this.doc
                    .rect(this.margins.left, currentY, tableWidth, 18)
                    .fillAndStroke(PDF_BRAND_COLORS.BG_LIGHT, this.brandConfig.borderColor);
            } else {
                this.doc
                    .rect(this.margins.left, currentY, tableWidth, 18)
                    .stroke(this.brandConfig.borderColor);
            }

            currentX = this.margins.left;

            config.headers.forEach((col) => {
                const colWidth = (col.width / 100) * tableWidth;
                let value = row[col.key];

                // Format value based on column format
                if (col.format === 'currency' && typeof value === 'number') {
                    value = formatINR(value);
                } else if (col.format === 'number' && typeof value === 'number') {
                    value = value.toLocaleString('en-IN');
                } else if (value === null || value === undefined) {
                    value = '-';
                }

                this.doc.text(String(value), currentX + 5, currentY + 5, {
                    width: colWidth - 10,
                    align: col.align || 'left',
                    lineBreak: false,
                });

                currentX += colWidth;
            });

            currentY += 18;
        });

        this.doc.y = currentY + 10;

        return this;
    }

    /**
     * Add GST tax summary box
     */
    addTaxSummary(summary: PDFTaxSummary, startY?: number): this {
        const y = startY || this.doc.y;
        const boxWidth = 250;
        const boxX = this.pageWidth - this.margins.right - boxWidth;

        this.doc
            .rect(boxX, y, boxWidth, summary.isInterstate ? 80 : 100)
            .strokeColor(this.brandConfig.borderColor)
            .lineWidth(1)
            .stroke();

        let currentY = y + 10;
        this.doc.fontSize(9).font('Helvetica');

        // Subtotal
        this.doc.text('Taxable Amount:', boxX + 10, currentY);
        this.doc.text(formatINR(summary.subtotal), boxX + 150, currentY, { align: 'right', width: 90 });
        currentY += 15;

        if (summary.isInterstate) {
            // IGST only
            this.doc.text('IGST @ 18%:', boxX + 10, currentY);
            this.doc.text(formatINR(summary.igst), boxX + 150, currentY, { align: 'right', width: 90 });
            currentY += 15;
        } else {
            // CGST + SGST
            this.doc.text('CGST @ 9%:', boxX + 10, currentY);
            this.doc.text(formatINR(summary.cgst), boxX + 150, currentY, { align: 'right', width: 90 });
            currentY += 15;

            this.doc.text('SGST @ 9%:', boxX + 10, currentY);
            this.doc.text(formatINR(summary.sgst), boxX + 150, currentY, { align: 'right', width: 90 });
            currentY += 15;
        }

        // Horizontal line
        this.doc
            .moveTo(boxX + 10, currentY)
            .lineTo(boxX + boxWidth - 10, currentY)
            .stroke();
        currentY += 10;

        // Grand total
        this.doc.font('Helvetica-Bold');
        this.doc.text('GRAND TOTAL:', boxX + 10, currentY);
        this.doc.text(formatINR(summary.grandTotal), boxX + 150, currentY, { align: 'right', width: 90 });

        this.doc.y = y + (summary.isInterstate ? 90 : 110);

        return this;
    }

    /**
     * Add QR code from base64 data or data URL
     */
    async addQRCode(base64Data: string, x: number, y: number, size: number): Promise<this> {
        try {
            // Handle data URLs (e.g., data:image/png;base64,...)
            let base64String = base64Data;
            if (base64Data.startsWith('data:image')) {
                // Extract base64 part from data URL
                const matches = base64Data.match(/^data:image\/\w+;base64,(.+)$/);
                if (matches && matches[1]) {
                    base64String = matches[1];
                }
            }

            // Convert base64 to buffer
            const buffer = Buffer.from(base64String, 'base64');
            this.doc.image(buffer, x, y, { width: size, height: size });
        } catch (error) {
            console.error('Error adding QR code:', error);
            // Draw placeholder box if QR code fails
            this.doc.rect(x, y, size, size).stroke();
        }

        return this;
    }

    /**
     * Generate QR code from text data
     */
    async generateQRCode(data: string): Promise<string> {
        try {
            const qrCodeDataURL = await QRCode.toDataURL(data, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                width: 200,
                margin: 1,
            });
            // Remove data URL prefix to get base64
            return qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
        } catch (error) {
            console.error('Error generating QR code:', error);
            throw error;
        }
    }

    /**
     * Add footer with page numbers and terms
     */
    addFooter(terms?: string[]): this {
        const footerY = this.pageHeight - this.margins.bottom - 40;

        // Horizontal line
        this.doc
            .moveTo(this.margins.left, footerY)
            .lineTo(this.pageWidth - this.margins.right, footerY)
            .strokeColor(this.brandConfig.borderColor)
            .lineWidth(1)
            .stroke();

        // Terms
        if (terms && terms.length > 0) {
            this.doc.fontSize(7).fillColor(this.brandConfig.secondaryColor).font('Helvetica');

            let currentY = footerY + 5;
            terms.forEach((term) => {
                this.doc.text(term, this.margins.left, currentY, {
                    width: this.pageWidth - this.margins.left - this.margins.right,
                });
                currentY += 10;
            });
        }

        return this;
    }

    /**
     * Finalize and return PDF as buffer
     */
    async toBuffer(): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];

            this.doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            this.doc.on('end', () => resolve(Buffer.concat(chunks)));
            this.doc.on('error', reject);

            this.doc.end();
        });
    }
}
