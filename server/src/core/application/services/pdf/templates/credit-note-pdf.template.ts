/**
 * Credit Note PDF Template
 * Generates GST-compliant credit notes for refunds and adjustments
 * Uses BasePDFService for consistent styling
 */

import { BasePDFService } from '../base-pdf.service';
import { PDFPartyDetails, PDFTableColumn } from '../pdf.types';
import { ICreditNote } from '../../../../../infrastructure/database/mongoose/models/finance/billing/credit-note.model';
import { ICompany } from '../../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import { Helix } from '../../../../../shared/constants/Helix.constants';
import { convertToIndianWords } from '../../../../../shared/utils/number-to-words.util';
import { formatINR } from '../../../../../shared/utils/indian-currency.util';
import { formatInvoiceDate } from '../../../../../shared/utils/date-format.util';

export class CreditNotePDFTemplate {
    /**
     * Generate GST-compliant credit note PDF
     * 
     * Features:
     * - A4 Portrait layout
     * - Credit Note header
     * - Reference to original invoice
     * - Reason and description
     * - Line items with tax reversal (negative amounts)
     * - Tax adjustment summary
     * - Declaration and signature
     */
    async generatePDF(creditNote: ICreditNote, company: ICompany): Promise<Buffer> {
        const pdfService = new BasePDFService({
            size: 'A4',
            layout: 'portrait',
            margins: { top: 40, bottom: 60, left: 40, right: 40 },
        });

        // Add header
        pdfService.addHeader('CREDIT NOTE', undefined, 'ORIGINAL');

        // Add credit note metadata
        this.addCreditNoteMetadata(pdfService, creditNote);

        // Add reference section (original invoice details)
        this.addReferenceSection(pdfService, creditNote);

        // Add reason for credit note
        this.addReasonSection(pdfService, creditNote);

        // Add party details
        const seller = this.buildSellerDetails();
        const buyer = this.buildBuyerDetails(company, creditNote);
        pdfService.addPartySection(seller, buyer);

        // Add line items table
        this.addLineItemsTable(pdfService, creditNote);

        // Add tax adjustment summary
        pdfService.addTaxSummary({
            subtotal: creditNote.financialSummary.adjustedSubtotal,
            cgst: creditNote.financialSummary.adjustedCGSTTotal,
            sgst: creditNote.financialSummary.adjustedSGSTTotal,
            igst: creditNote.financialSummary.adjustedIGSTTotal,
            grandTotal: creditNote.financialSummary.adjustedGrandTotal,
            isInterstate: creditNote.gstDetails.isInterState,
        });

        // Add amount in words
        this.addAmountInWords(pdfService, Math.abs(creditNote.financialSummary.adjustedGrandTotal));

        // Add footer with declaration
        pdfService.addFooter([
            'This is a computer-generated credit note and does not require signature',
            'Credit amount will be adjusted in your next invoice or refunded as per terms',
            'For queries: finance@Helix.com',
        ]);

        // Generate and return buffer
        return await pdfService.toBuffer();
    }

    /**
     * Add credit note metadata
     */
    private addCreditNoteMetadata(pdfService: BasePDFService, creditNote: ICreditNote): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 10;

        doc.fontSize(9).font('Helvetica');

        // Left column
        doc.fillColor('#1a2332').text(`Credit Note Number: `, 40, y);
        doc.font('Helvetica-Bold').text(creditNote.creditNoteNumber, 160, y);

        doc.font('Helvetica').text(`Credit Note Date: `, 40, y + 15);
        doc.font('Helvetica-Bold').text(formatInvoiceDate(creditNote.creditNoteDate), 160, y + 15);

        // Right column
        doc.font('Helvetica').text(`Adjustment: `, 350, y);
        doc.font('Helvetica-Bold').text(
            creditNote.adjustment.isPartial
                ? `Partial (${creditNote.adjustment.percentage}%)`
                : 'Full (100%)',
            450,
            y
        );

        doc.y = y + 35;
    }

    /**
     * Add reference to original invoice
     */
    private addReferenceSection(pdfService: BasePDFService, creditNote: ICreditNote): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 5;

        // Draw reference box
        doc.rect(40, y, 515, 50).strokeColor('#d8dce6').lineWidth(1).stroke();

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a2332');
        doc.text('AGAINST ORIGINAL INVOICE', 50, y + 10);

        doc.fontSize(9).font('Helvetica');
        doc.text('Invoice Number:', 50, y + 28);
        doc.font('Helvetica-Bold').text(creditNote.originalInvoice.invoiceNumber, 160, y + 28);

        doc.font('Helvetica').text('Invoice Date:', 300, y + 28);
        doc.font('Helvetica-Bold').text(formatInvoiceDate(creditNote.originalInvoice.invoiceDate), 400, y + 28);

        doc.y = y + 60;
    }

    /**
     * Add reason section
     */
    private addReasonSection(pdfService: BasePDFService, creditNote: ICreditNote): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 5;

        // Draw reason box
        doc.rect(40, y, 515, 50).strokeColor('#d8dce6').lineWidth(1).stroke();

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a2332');
        doc.text('REASON FOR CREDIT NOTE', 50, y + 10);

        doc.fontSize(9).font('Helvetica');
        doc.text('Reason:', 50, y + 28);
        doc.font('Helvetica-Bold').text(this.formatReason(creditNote.reason), 110, y + 28);

        doc.font('Helvetica').fontSize(8);
        doc.text('Details:', 50, y + 40);
        doc.text(creditNote.reasonDescription, 110, y + 40, { width: 430 });

        doc.y = y + 60;
    }

    /**
     * Format reason for display
     */
    private formatReason(reason: string): string {
        const reasonMap: Record<string, string> = {
            sales_return: 'Sales Return',
            deficiency_in_service: 'Deficiency in Service',
            price_adjustment: 'Price Adjustment',
            rto_shipment: 'RTO Shipment',
            shipment_cancellation: 'Shipment Cancellation',
            invoice_error: 'Invoice Error',
            other: 'Other',
        };

        return reasonMap[reason] || reason;
    }

    /**
     * Build seller details
     */
    private buildSellerDetails(): PDFPartyDetails {
        return {
            name: Helix.LEGAL_NAME,
            gstin: Helix.GSTIN,
            pan: Helix.PAN,
            address: Helix.ADDRESS,
            contact: {
                email: Helix.CONTACT.email,
                phone: Helix.CONTACT.phone,
            },
        };
    }

    /**
     * Build buyer details
     */
    private buildBuyerDetails(company: ICompany, creditNote: ICreditNote): PDFPartyDetails {
        return {
            name: company.name,
            gstin: creditNote.gstDetails.buyerGSTIN,
            address: {
                line1: company.address?.line1 || '',
                line2: company.address?.line2,
                city: company.address?.city || '',
                state: creditNote.gstDetails.placeOfSupplyState,
                stateCode: creditNote.gstDetails.placeOfSupply,
                pincode: company.address?.postalCode || '',
            },
        };
    }

    /**
     * Add line items table
     */
    private addLineItemsTable(pdfService: BasePDFService, creditNote: ICreditNote): void {
        const columns: PDFTableColumn[] = [
            { header: 'S.No', key: 'sno', width: 8, align: 'center' },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'SAC', key: 'sacCode', width: 10, align: 'center' },
            { header: 'Original', key: 'originalAmount', width: 12, align: 'right', format: 'currency' },
            { header: 'Adjusted', key: 'adjustedAmount', width: 12, align: 'right', format: 'currency' },
            { header: 'CGST', key: 'adjustedCGST', width: 10, align: 'right', format: 'currency' },
            { header: 'SGST', key: 'adjustedSGST', width: 10, align: 'right', format: 'currency' },
        ];

        // If interstate, replace CGST/SGST with IGST
        if (creditNote.gstDetails.isInterState) {
            columns[5] = { header: 'IGST', key: 'adjustedIGST', width: 20, align: 'right', format: 'currency' };
            columns.splice(6, 1); // Remove SGST column
        }

        const rows = creditNote.lineItems.map((item, index) => ({
            sno: index + 1,
            description: item.description,
            sacCode: item.sacCode,
            originalAmount: item.originalTaxableAmount,
            adjustedAmount: item.adjustedTaxableAmount,
            adjustedCGST: item.adjustedCGST,
            adjustedSGST: item.adjustedSGST,
            adjustedIGST: item.adjustedIGST,
        }));

        pdfService.addTable({ headers: columns, rows });
    }

    /**
     * Add amount in words
     */
    private addAmountInWords(pdfService: BasePDFService, grandTotal: number): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 10;

        // Draw box
        doc.rect(40, y, 515, 30).strokeColor('#d8dce6').lineWidth(1).stroke();

        doc.fontSize(9).fillColor('#1a2332').font('Helvetica-Bold');
        doc.text('Net Credit Amount in Words (Absolute Value):', 50, y + 8);

        doc.font('Helvetica').fontSize(10);
        const amountInWords = convertToIndianWords(grandTotal);
        doc.text(amountInWords, 50, y + 20, { width: 500 });

        doc.y = y + 40;
    }
}
