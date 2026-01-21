/**
 * COD Remittance PDF Template
 * Generates remittance statements for COD collections with transaction details
 * Uses landscape A4 layout for wide transaction table
 */

import { BasePDFService } from '../base-pdf.service';
import { PDFTableColumn } from '../pdf.types';
import { ICODRemittance } from '../../../../../infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model';
import { ICompany } from '../../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import { formatINR } from '../../../../../shared/utils/indian-currency.util';
import { formatInvoiceDate } from '../../../../../shared/utils/date-format.util';

export class CODRemittancePDFTemplate {
    /**
     * Generate COD Remittance Statement PDF
     * 
     * Features:
     * - Landscape A4 layout (297mm × 210mm) for wide transaction table
     * - Company details and remittance period
     * - Financial summary box
     * - Detailed transaction table with all shipments
     * - Bank transfer details
     * - Terms and conditions
     */
    async generatePDF(remittance: ICODRemittance, company: ICompany): Promise<Buffer> {
        const pdfService = new BasePDFService({
            size: 'A4',
            layout: 'landscape',
            margins: { top: 40, bottom: 60, left: 40, right: 40 },
        });

        // Add header
        pdfService.addHeader(
            'COD REMITTANCE STATEMENT',
            `Remittance ID: ${remittance.remittanceId}`,
            undefined
        );

        // Add period and company details
        this.addRemittanceMetadata(pdfService, remittance, company);

        // Add financial summary
        this.addFinancialSummary(pdfService, remittance);

        // Add transaction table
        this.addTransactionTable(pdfService, remittance);

        // Add bank transfer details
        this.addBankDetails(pdfService, remittance);

        // Add footer with terms
        pdfService.addFooter([
            'COD remittance charges: 3-4% of collection amount (as per Helix standard rates)',
            'Settlement processed within 7 business days after delivery',
            'Disputes must be raised within 30 days of remittance date',
            'For queries: finance@Helix.com',
        ]);

        // Generate and return buffer
        return await pdfService.toBuffer();
    }

    /**
     * Add remittance metadata (ID, period, company details)
     */
    private addRemittanceMetadata(
        pdfService: BasePDFService,
        remittance: ICODRemittance,
        company: ICompany
    ): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 10;

        // Left column - Remittance details
        doc.fontSize(9).font('Helvetica').fillColor('#1a2332');
        doc.text('Remittance Period:', 40, y);
        doc.font('Helvetica-Bold').text(
            `${formatInvoiceDate(remittance.batch.shippingPeriod.start)} - ${formatInvoiceDate(remittance.batch.shippingPeriod.end)}`,
            160,
            y
        );

        doc.font('Helvetica').text('Remittance Date:', 40, y + 15);
        doc.font('Helvetica-Bold').text(formatInvoiceDate(remittance.batch.createdDate), 160, y + 15);

        doc.font('Helvetica').text('Batch Number:', 40, y + 30);
        doc.font('Helvetica-Bold').text(`#${remittance.batch.batchNumber}`, 160, y + 30);

        // Right column - Company details
        doc.font('Helvetica').text('Company Name:', 450, y);
        doc.font('Helvetica-Bold').text(company.name, 560, y, { width: 240 });

        doc.font('Helvetica').text('GSTIN:', 450, y + 15);
        doc.font('Helvetica-Bold').text(company.billingInfo?.gstin || 'N/A', 560, y + 15);

        doc.font('Helvetica').text('Contact:', 450, y + 30);
        doc.font('Helvetica-Bold').text(
            company.settings?.notificationEmail || 'N/A',
            560,
            y + 30,
            { width: 240 }
        );

        doc.y = y + 55;
    }

    /**
     * Add financial summary section
     */
    private addFinancialSummary(pdfService: BasePDFService, remittance: ICODRemittance): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 10;

        // Draw summary box
        doc.rect(40, y, 760, 90).fillColor('#f8f9fa').fillAndStroke('#d8dce6', '#d8dce6').lineWidth(1);

        // Title
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a2332');
        doc.text('FINANCIAL SUMMARY', 50, y + 10);

        // First row - Shipments and Collections
        doc.fontSize(9).font('Helvetica');
        doc.text('Total Shipments:', 50, y + 30);
        doc.font('Helvetica-Bold').text(remittance.financial.totalShipments.toString(), 180, y + 30);

        doc.font('Helvetica').text('Total COD Collected:', 250, y + 30);
        doc.font('Helvetica-Bold').text(formatINR(remittance.financial.totalCODCollected), 380, y + 30);

        // Second row - Deductions
        doc.font('Helvetica').text('Shipping Charges:', 50, y + 48);
        doc.font('Helvetica-Bold').text(
            formatINR(remittance.financial.deductionsSummary.totalShippingCharges),
            180,
            y + 48
        );

        doc.font('Helvetica').text('Other Deductions:', 250, y + 48);
        const otherDeductions =
            remittance.financial.deductionsSummary.totalWeightDisputes +
            remittance.financial.deductionsSummary.totalRTOCharges +
            remittance.financial.deductionsSummary.totalInsuranceCharges +
            remittance.financial.deductionsSummary.totalPlatformFees +
            remittance.financial.deductionsSummary.totalOtherFees;
        doc.font('Helvetica-Bold').text(formatINR(otherDeductions), 380, y + 48);

        // Third row - Net Payable (highlighted)
        doc.rect(600, y + 30, 185, 48).fillColor('#0066cc').fill();
        doc.fontSize(9).font('Helvetica').fillColor('#ffffff');
        doc.text('NET AMOUNT PAYABLE', 615, y + 36);
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text(formatINR(remittance.financial.netPayable), 615, y + 54);

        doc.y = y + 100;
    }

    /**
     * Add transaction table with all shipments
     */
    private addTransactionTable(pdfService: BasePDFService, remittance: ICODRemittance): void {
        const columns: PDFTableColumn[] = [
            { header: 'S.No', key: 'sno', width: 6, align: 'center' },
            { header: 'AWB Number', key: 'awb', width: 16, align: 'left' },
            { header: 'Delivered On', key: 'deliveredAt', width: 14, align: 'center' },
            { header: 'COD Amount', key: 'codAmount', width: 12, align: 'right', format: 'currency' },
            {
                header: 'Shipping Charge',
                key: 'shippingCharge',
                width: 14,
                align: 'right',
                format: 'currency',
            },
            {
                header: 'Other Charges',
                key: 'otherCharges',
                width: 14,
                align: 'right',
                format: 'currency',
            },
            { header: 'Total Deduct', key: 'totalDeduct', width: 13, align: 'right', format: 'currency' },
            { header: 'Net Payable', key: 'netAmount', width: 13, align: 'right', format: 'currency' },
        ];

        const rows = remittance.shipments.map((shipment, index) => {
            const otherCharges =
                (shipment.deductions.weightDispute || 0) +
                (shipment.deductions.rtoCharge || 0) +
                (shipment.deductions.insuranceCharge || 0) +
                (shipment.deductions.platformFee || 0) +
                (shipment.deductions.otherFees || 0);

            return {
                sno: index + 1,
                awb: shipment.awb,
                deliveredAt: formatInvoiceDate(shipment.deliveredAt),
                codAmount: shipment.codAmount,
                shippingCharge: shipment.deductions.shippingCharge,
                otherCharges,
                totalDeduct: shipment.deductions.total,
                netAmount: shipment.netAmount,
            };
        });

        pdfService.addTable({ headers: columns, rows });
    }

    /**
     * Add bank transfer details section
     */
    private addBankDetails(pdfService: BasePDFService, remittance: ICODRemittance): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 10;

        // Draw bank details box
        doc.rect(40, y, 760, 70).strokeColor('#d8dce6').lineWidth(1).stroke();

        // Title
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a2332');
        doc.text('BANK TRANSFER DETAILS', 50, y + 10);

        // Bank details
        doc.fontSize(9).font('Helvetica');

        if (remittance.payout.accountDetails) {
            const account = remittance.payout.accountDetails;

            doc.text('Account Holder:', 50, y + 30);
            doc.font('Helvetica-Bold').text(account.accountHolderName, 160, y + 30);

            doc.font('Helvetica').text('Account Number:', 50, y + 45);
            // Mask account number (show last 4 digits)
            const maskedAccount = account.accountNumber
                ? `XXXXX${account.accountNumber.slice(-4)}`
                : 'N/A';
            doc.font('Helvetica-Bold').text(maskedAccount, 160, y + 45);

            doc.font('Helvetica').text('IFSC Code:', 300, y + 30);
            doc.font('Helvetica-Bold').text(account.ifscCode || 'N/A', 370, y + 30);

            doc.font('Helvetica').text('Bank Name:', 300, y + 45);
            doc.font('Helvetica-Bold').text(account.bankName || 'N/A', 370, y + 45);
        }

        // Transfer status and date
        doc.font('Helvetica').text('Transfer Status:', 550, y + 30);
        const statusColor = remittance.payout.status === 'completed' ? '#059669' : '#f59e0b';
        doc.font('Helvetica-Bold').fillColor(statusColor).text(
            remittance.payout.status.toUpperCase(),
            660,
            y + 30
        );

        if (remittance.payout.completedAt) {
            doc.fillColor('#1a2332').font('Helvetica').text('Transfer Date:', 550, y + 45);
            doc.font('Helvetica-Bold').text(formatInvoiceDate(remittance.payout.completedAt), 660, y + 45);
        }

        // UTR/Razorpay ID (if available)
        if (remittance.payout.razorpayPayoutId) {
            doc.fillColor('#1a2332').font('Helvetica').fontSize(8);
            doc.text(`Razorpay Payout ID: ${remittance.payout.razorpayPayoutId}`, 50, y + 60, {
                width: 700,
            });
        }

        doc.y = y + 80;
    }
}
