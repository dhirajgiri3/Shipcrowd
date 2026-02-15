/**
 * Invoice PDF Template
 * Generates GST Rule 46 compliant tax invoices with IRN/QR code support
 * Uses BasePDFService for consistent styling and reusable components
 */

import { IInvoice } from '../../../../../infrastructure/database/mongoose/models/finance/billing/invoice.model';
import { ICompany } from '../../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import { INVOICE_TERMS, Shipcrowd } from '../../../../../shared/constants/shipcrowd.constants';
import { formatInvoiceDate, formatInvoiceDateTime } from '../../../../../shared/utils/date-format.util';
import { convertToIndianWords } from '../../../../../shared/utils/number-to-words.util';
import { BasePDFService } from '../base-pdf.service';
import { PDFPartyDetails, PDFTableColumn } from '../pdf.types';

export class InvoicePDFTemplate {
    /**
     * Generate GST-compliant invoice PDF
     * 
     * Follows GST Council Rule 46 CGST mandatory field requirements:
     * - Supplier & recipient details with GSTIN
     * - Invoice number, date, place of supply
     * - Line items with SAC code, HSN, quantity, value
     * - Tax breakdown (CGST/SGST for intra-state, IGST for inter-state)
     * - Total amount in figures and words
     * - IRN and QR code (if applicable)
     * - Digital signature declaration
     */
    async generatePDF(invoice: IInvoice, company: ICompany): Promise<Buffer> {
        const pdfService = new BasePDFService({
            size: 'A4',
            layout: 'portrait',
            margins: { top: 40, bottom: 60, left: 40, right: 40 },
        });

        // Add header
        pdfService.addHeader('TAX INVOICE', undefined, 'ORIGINAL');

        // Add invoice metadata (Serial number, date, reverse charge)
        this.addInvoiceMetadata(pdfService, invoice);

        // Add party details (Billed From / Billed To)
        const seller = this.buildSellerDetails();
        const buyer = this.buildBuyerDetails(company, invoice);
        pdfService.addPartySection(seller, buyer);

        // Add supply details (Place of Supply, Supply Type)
        this.addSupplyDetails(pdfService, invoice);

        // Add line items table
        this.addLineItemsTable(pdfService, invoice);

        // Add tax summary
        pdfService.addTaxSummary({
            subtotal: invoice.financialSummary.subtotal,
            cgst: invoice.financialSummary.cgstTotal,
            sgst: invoice.financialSummary.sgstTotal,
            igst: invoice.financialSummary.igstTotal,
            grandTotal: invoice.financialSummary.grandTotal,
            isInterstate: invoice.gstDetails.isInterState,
        });

        // Add amount in words
        this.addAmountInWords(pdfService, invoice.financialSummary.grandTotal);

        // Add IRN and QR code (if available)
        if (invoice.irn && invoice.qrCodeData) {
            await this.addIRNSection(pdfService, invoice);
        }

        // Add footer
        pdfService.addFooter(INVOICE_TERMS as any);

        // Generate and return buffer
        return await pdfService.toBuffer();
    }

    /**
     * Add invoice metadata (number, date, reverse charge)
     */
    private addInvoiceMetadata(pdfService: BasePDFService, invoice: IInvoice): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 10;

        doc.fontSize(9).font('Helvetica');

        // Left column
        doc.fillColor('#1a2332').text(`Invoice Number: `, 40, y);
        doc.font('Helvetica-Bold').text(invoice.invoiceNumber, 140, y);

        doc.font('Helvetica').text(`Invoice Date: `, 40, y + 15);
        doc.font('Helvetica-Bold').text(formatInvoiceDate(invoice.createdAt), 140, y + 15);

        // Right column
        doc.font('Helvetica').text(`Reverse Charge: `, 350, y);
        doc.font('Helvetica-Bold').text(invoice.gstDetails.reverseCharge ? 'Yes' : 'No', 450, y);

        doc.y = y + 35;
    }

    /**
     * Build seller (Shipcrowd) details from constants
     */
    private buildSellerDetails(): PDFPartyDetails {
        return {
            name: Shipcrowd.LEGAL_NAME,
            gstin: Shipcrowd.GSTIN,
            pan: Shipcrowd.PAN,
            address: Shipcrowd.ADDRESS,
            contact: {
                email: Shipcrowd.CONTACT.email,
                phone: Shipcrowd.CONTACT.phone,
            },
        };
    }

    /**
     * Build buyer (company) details from database
     */
    private buildBuyerDetails(company: ICompany, invoice: IInvoice): PDFPartyDetails {
        return {
            name: company.name,
            gstin: invoice.gstDetails.buyerGSTIN,
            address: {
                line1: company.address?.line1 || '',
                line2: company.address?.line2,
                city: company.address?.city || '',
                state: invoice.gstDetails.placeOfSupplyState,
                stateCode: invoice.gstDetails.placeOfSupply,
                pincode: company.address?.postalCode || '',
            },
        };
    }

    /**
     * Add supply details section (Place of Supply, Type)
     */
    private addSupplyDetails(pdfService: BasePDFService, invoice: IInvoice): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 5;

        // Draw supply details box
        doc.rect(40, y, 515, 25).strokeColor('#d8dce6').lineWidth(1).stroke();

        doc.fontSize(9).fillColor('#1a2332').font('Helvetica');

        doc.text(`Place of Supply: `, 50, y + 8);
        doc.font('Helvetica-Bold').text(
            `${invoice.gstDetails.placeOfSupplyState} (${invoice.gstDetails.placeOfSupply})`,
            150,
            y + 8
        );

        doc.font('Helvetica').text(`Supply Type: `, 350, y + 8);
        doc.font('Helvetica-Bold').text(invoice.gstDetails.isInterState ? 'Inter-State' : 'Intra-State', 430, y + 8);

        doc.y = y + 35;
    }

    /**
     * Add line items table
     */
    private addLineItemsTable(pdfService: BasePDFService, invoice: IInvoice): void {
        const columns: PDFTableColumn[] = [
            { header: 'S.No', key: 'sno', width: 8, align: 'center' },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'SAC', key: 'sacCode', width: 10, align: 'center' },
            { header: 'Qty', key: 'quantity', width: 8, align: 'center' },
            { header: 'Rate', key: 'unitPrice', width: 12, align: 'right', format: 'currency' },
            { header: 'Taxable', key: 'taxableAmount', width: 12, align: 'right', format: 'currency' },
            { header: 'CGST', key: 'cgst', width: 10, align: 'right', format: 'currency' },
            { header: 'SGST', key: 'sgst', width: 10, align: 'right', format: 'currency' },
        ];

        // If interstate, replace CGST/SGST with IGST
        if (invoice.gstDetails.isInterState) {
            columns[6] = { header: 'IGST', key: 'igst', width: 20, align: 'right', format: 'currency' };
            columns.splice(7, 1); // Remove SGST column
        }

        const rows = invoice.lineItems.map((item, index) => ({
            sno: index + 1,
            description: item.description,
            sacCode: item.sacCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxableAmount: item.taxableAmount,
            cgst: item.cgst,
            sgst: item.sgst,
            igst: item.igst,
        }));

        pdfService.addTable({ headers: columns, rows });
    }

    /**
     * Add amount in words section
     */
    private addAmountInWords(pdfService: BasePDFService, grandTotal: number): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 10;

        // Draw box
        doc.rect(40, y, 515, 30).strokeColor('#d8dce6').lineWidth(1).stroke();

        doc.fontSize(9).fillColor('#1a2332').font('Helvetica-Bold');
        doc.text('Amount in Words:', 50, y + 8);

        doc.font('Helvetica').fontSize(10);
        const amountInWords = convertToIndianWords(grandTotal);
        doc.text(amountInWords, 50, y + 20, { width: 500 });

        doc.y = y + 40;
    }

    /**
     * Add IRN and QR code section (if IRN is generated)
     */
    private async addIRNSection(pdfService: BasePDFService, invoice: IInvoice): Promise<void> {
        const doc = (pdfService as any).doc;
        const y = doc.y + 10;

        // Draw IRN section box
        doc.rect(40, y, 515, 100).strokeColor('#d8dce6').lineWidth(1).stroke();

        // IRN details (left side)
        doc.fontSize(9).fillColor('#1a2332').font('Helvetica-Bold');
        doc.text('IRN (Invoice Reference Number):', 50, y + 10);

        doc.font('Helvetica').fontSize(8);
        doc.text(invoice.irn!, 50, y + 25, { width: 300 });

        if (invoice.irnGeneratedAt) {
            doc.fontSize(8);
            doc.text(`Generated: ${formatInvoiceDateTime(invoice.irnGeneratedAt)}`, 50, y + 40);
        }

        doc.fontSize(7).fillColor('#6b7280');
        doc.text('Digitally signed e-Invoice as per GSTN regulations', 50, y + 60, {
            width: 300,
        });

        // QR Code (right side)
        if (invoice.qrCodeData) {
            await pdfService.addQRCode(invoice.qrCodeData, 400, y + 10, 80);
            doc.fontSize(7).fillColor('#6b7280').text('Scan to verify', 410, y + 92, { width: 60, align: 'center' });
        }

        doc.y = y + 110;
    }
}
