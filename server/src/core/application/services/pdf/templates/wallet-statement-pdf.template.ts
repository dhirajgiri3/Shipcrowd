/**
 * Wallet Statement PDF Template
 * Generates wallet account statements with transaction ledger
 * Uses A4 portrait layout with balance summary and transaction history
 */

import { BasePDFService } from '../base-pdf.service';
import { PDFTableColumn } from '../pdf.types';
import { IWalletTransaction } from '../../../../../infrastructure/database/mongoose/models/finance/wallets/wallet-transaction.model';
import { ICompany } from '../../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import { formatINR } from '../../../../../shared/utils/indian-currency.util';
import { formatInvoiceDate } from '../../../../../shared/utils/date-format.util';

interface WalletStatementData {
    company: ICompany;
    period: {
        startDate: Date;
        endDate: Date;
    };
    balance: {
        opening: number;
        closing: number;
        totalCredits: number;
        totalDebits: number;
    };
    transactions: IWalletTransaction[];
}

export class WalletStatementPDFTemplate {
    /**
     * Generate Wallet Statement PDF
     * 
     * Features:
     * - A4 Portrait layout
     * - Account details section with wallet ID
     * - Balance summary (opening, credits, debits, closing)
     * - Transaction ledger table with full history
     * - Pagination support for long transaction lists
     * - Period selection display
     */
    async generatePDF(data: WalletStatementData): Promise<Buffer> {
        const pdfService = new BasePDFService({
            size: 'A4',
            layout: 'portrait',
            margins: { top: 40, bottom: 60, left: 40, right: 40 },
        });

        // Add header
        pdfService.addHeader(
            'WALLET STATEMENT',
            `Period: ${formatInvoiceDate(data.period.startDate)} - ${formatInvoiceDate(data.period.endDate)}`,
            undefined
        );

        // Add account details
        this.addAccountDetails(pdfService, data);

        // Add balance summary
        this.addBalanceSummary(pdfService, data);

        // Add transaction ledger
        this.addTransactionLedger(pdfService, data);

        // Add footer with notes
        pdfService.addFooter([
            'Minimum balance maintained: ₹500 (auto-debit protection)',
            'Interest on balance: Not applicable',
            'No monthly subscription fees',
            'For detailed transaction queries: support@shipcrowd.com',
        ]);

        // Generate and return buffer
        return await pdfService.toBuffer();
    }

    /**
     * Add account details section
     */
    private addAccountDetails(pdfService: BasePDFService, data: WalletStatementData): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 10;

        // Draw account details box
        doc.rect(40, y, 515, 60).strokeColor('#d8dce6').lineWidth(1).stroke();

        // Title
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a2332');
        doc.text('ACCOUNT DETAILS', 50, y + 10);

        // Company details
        doc.fontSize(9).font('Helvetica');

        doc.text('Account Holder:', 50, y + 30);
        doc.font('Helvetica-Bold').text(data.company.name, 160, y + 30);

        doc.font('Helvetica').text('Wallet ID:', 50, y + 45);
        doc.font('Helvetica-Bold').text(
            `WAL-${data.company.billingInfo?.gstin?.substring(0, 8) || data.company._id.toString().slice(-8)}`,
            160,
            y + 45
        );

        doc.font('Helvetica').text('Currency:', 350, y + 30);
        doc.font('Helvetica-Bold').text('INR', 430, y + 30);

        doc.font('Helvetica').text('Account Type:', 350, y + 45);
        doc.font('Helvetica-Bold').text('Prepaid Wallet', 430, y + 45);

        doc.y = y + 70;
    }

    /**
     * Add balance summary section
     */
    private addBalanceSummary(pdfService: BasePDFService, data: WalletStatementData): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 10;

        // Draw summary box
        doc.rect(40, y, 515, 85).fillColor('#f8f9fa').fillAndStroke('#d8dce6', '#d8dce6').lineWidth(1);

        // Title
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a2332');
        doc.text('BALANCE SUMMARY', 50, y + 10);

        // Opening balance
        doc.fontSize(9).font('Helvetica');
        doc.text(`Opening Balance (${formatInvoiceDate(data.period.startDate)}):`, 50, y + 30);
        doc.font('Helvetica-Bold').text(formatINR(data.balance.opening), 280, y + 30);

        // Credits
        doc.font('Helvetica').text('(+) Credits (Recharges):', 50, y + 45);
        doc.font('Helvetica-Bold').fillColor('#059669').text(formatINR(data.balance.totalCredits), 280, y + 45);

        // Debits
        doc.fillColor('#1a2332').font('Helvetica').text('(-) Debits (Charges):', 50, y + 60);
        doc.font('Helvetica-Bold').fillColor('#dc2626').text(`(${formatINR(data.balance.totalDebits)})`, 280, y + 60);

        // Closing balance (highlighted)
        doc.rect(50, y + 70, 490, 1).fillColor('#d8dce6').fill();

        doc.fillColor('#1a2332').fontSize(10).font('Helvetica-Bold');
        doc.text(`Closing Balance (${formatInvoiceDate(data.period.endDate)}):`, 50, y + 75);
        doc.fontSize(12).fillColor('#0066cc').text(formatINR(data.balance.closing), 280, y + 73);

        doc.y = y + 95;
    }

    /**
     * Add transaction ledger table
     */
    private addTransactionLedger(pdfService: BasePDFService, data: WalletStatementData): void {
        const doc = (pdfService as any).doc;
        const y = doc.y + 10;

        // Section title
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a2332');
        doc.text('TRANSACTION LEDGER', 40, y);

        doc.y = y + 20;

        const columns: PDFTableColumn[] = [
            { header: 'Date', key: 'date', width: 14, align: 'left' },
            { header: 'Type', key: 'type', width: 12, align: 'center' },
            { header: 'Description', key: 'description', width: 30, align: 'left' },
            { header: 'Debit', key: 'debit', width: 14, align: 'right', format: 'currency' },
            { header: 'Credit', key: 'credit', width: 14, align: 'right', format: 'currency' },
            { header: 'Balance', key: 'balance', width: 16, align: 'right', format: 'currency' },
        ];

        const rows = data.transactions.map((txn) => {
            const isCredit = txn.type === 'credit';
            return {
                date: formatInvoiceDate(txn.createdAt),
                type: this.formatTransactionType(txn.type),
                description: this.buildDescription(txn),
                debit: isCredit ? 0 : txn.amount,
                credit: isCredit ? txn.amount : 0,
                balance: txn.balanceAfter,
            };
        });

        pdfService.addTable({ headers: columns, rows });
    }

    /**
     * Format transaction type for display
     */
    private formatTransactionType(type: string): string {
        return type.toUpperCase();
    }

    /**
     * Build transaction description
     */
    private buildDescription(txn: IWalletTransaction): string {
        const reasonLabels: Record<string, string> = {
            recharge: 'Wallet Recharge',
            shipment_cost: 'Shipment Cost',
            rto_charge: 'RTO Charge',
            refund: 'Refund',
            cod_remittance: 'COD Remittance Credit',
            adjustment: 'Manual Adjustment',
            commission: 'Platform Commission',
            penalty: 'Penalty Charge',
        };

        let description = reasonLabels[txn.reason] || txn.reason;

        // Add reference if exists
        if (txn.reference?.externalId) {
            description += ` - ${txn.reference.externalId}`;
        }

        // Add custom description if provided
        if (txn.description) {
            description += ` (${txn.description})`;
        }

        return description;
    }
}
