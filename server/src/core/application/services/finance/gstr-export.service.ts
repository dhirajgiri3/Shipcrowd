import Invoice from '../../../../infrastructure/database/mongoose/models/finance/billing/invoice.model';
import { Shipcrowd } from '../../../../shared/constants/shipcrowd.constants';
import { ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * GSTR-1 Export Service
 * Generates official GSTN GSTR-1 JSON for tax filing
 * 
 * Format: GSTR-1 JSON schema as per GSTN specifications
 * Use case: Monthly/quarterly tax returns
 */

// GSTN GSTR-1 Schema Interfaces
interface GSTR1B2BInvoice {
    inum: string; // Invoice number
    idt: string; // Invoice date (DD-MM-YYYY)
    val: number; // Invoice value
    pos: string; // Place of supply (state code)
    rchrg: 'Y' | 'N'; // Reverse charge
    inv_typ: 'R' | 'DBN' | 'CDN'; // R=Regular, DBN=Debit Note, CDN=Credit Note
    itms: Array<{
        num: number;
        itm_det: {
            sac_cd?: string; // SAC code
            rt: number; // GST rate
            txval: number; // Taxable value
            iamt: number; // IGST amount
            camt: number; // CGST amount
            samt: number; // SGST amount
            csamt: number; // CESS amount
        };
    }>;
}

interface GSTR1B2B {
    ctin: string; // Customer GSTIN
    inv: GSTR1B2BInvoice[];
}

interface GSTR1SACSum {
    sac_cd: string;
    desc: string;
    qty: number;
    uqc: string;
    val: number;
    txval: number;
    iamt: number;
    camt: number;
    samt: number;
    csamt: number;
}

interface GSTR1Export {
    gstin: string; // Seller GSTIN
    fp: string; // Financial period (MMYYYY)
    gt: number; // Grand total
    cur_gt: number; // Corrected grand total
    b2b: GSTR1B2B[]; // B2B invoices
    sac_sum: GSTR1SACSum[]; // SAC-wise summary
}

class GSTRExportService {
    /**
     * Generate GSTR-1 JSON export for a month
     */
    async generateGSTR1Export(month: number, year: number): Promise<GSTR1Export> {
        // Validate month and year
        if (month < 1 || month > 12) {
            throw new ValidationError('Month must be between 1 and 12');
        }

        if (year < 2000 || year > 2100) {
            throw new ValidationError('Invalid year');
        }

        // Calculate date range
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        logger.info(`Generating GSTR-1 export for ${month}/${year}`, {
            startDate,
            endDate,
        });

        // Fetch all invoices for the period
        const invoices = await Invoice.find({
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ['sent', 'paid'] }, // Only sent/paid invoices
            isDeleted: false,
        }).populate('companyId', 'name gstin');

        if (invoices.length === 0) {
            logger.warn(`No invoices found for ${month}/${year}`);
        }

        // Build B2B section
        const b2b = this.buildB2BSection(invoices);

        // Build SAC summary
        const sacSum = this.buildSACSection(invoices);

        // Calculate grand total
        const grandTotal = invoices.reduce(
            (sum, inv) => sum + inv.financialSummary.grandTotal,
            0
        );

        const gstr1Export: GSTR1Export = {
            gstin: Shipcrowd.GSTIN,
            fp: `${month.toString().padStart(2, '0')}${year}`,
            gt: Math.round(grandTotal * 100) / 100,
            cur_gt: Math.round(grandTotal * 100) / 100,
            b2b,
            sac_sum: sacSum,
        };

        // Validate export
        const validation = this.validateGSTR1Export(gstr1Export);
        if (!validation.valid) {
            logger.error('GSTR-1 export validation failed', { errors: validation.errors });
            throw new ValidationError(`GSTR-1 validation failed: ${validation.errors.join(', ')}`);
        }

        logger.info(`GSTR-1 export generated successfully`, {
            month,
            year,
            invoiceCount: invoices.length,
            grandTotal,
            b2bCount: b2b.length,
        });

        return gstr1Export;
    }

    /**
     * Build B2B section (invoices grouped by customer GSTIN)
     */
    private buildB2BSection(invoices: any[]): GSTR1B2B[] {
        // Group invoices by customer GSTIN
        const groupedByGSTIN = new Map<string, any[]>();

        for (const invoice of invoices) {
            const buyerGSTIN = invoice.gstDetails.buyerGSTIN;
            if (!groupedByGSTIN.has(buyerGSTIN)) {
                groupedByGSTIN.set(buyerGSTIN, []);
            }
            groupedByGSTIN.get(buyerGSTIN)!.push(invoice);
        }

        // Build B2B array
        const b2b: GSTR1B2B[] = [];

        for (const [ctin, invoices] of groupedByGSTIN.entries()) {
            const inv: GSTR1B2BInvoice[] = invoices.map((invoice) => ({
                inum: invoice.invoiceNumber,
                idt: this.formatDateForGSTN(invoice.createdAt),
                val: Math.round(invoice.financialSummary.grandTotal * 100) / 100,
                pos: invoice.gstDetails.placeOfSupply,
                rchrg: invoice.gstDetails.reverseCharge ? 'Y' : 'N',
                inv_typ: 'R', // Regular invoice
                itms: [
                    {
                        num: 1,
                        itm_det: {
                            sac_cd: '996812', // Courier services SAC code
                            rt: 18, // GST rate 18%
                            txval: Math.round(invoice.financialSummary.subtotal * 100) / 100,
                            iamt: Math.round(invoice.financialSummary.igstTotal * 100) / 100,
                            camt: Math.round(invoice.financialSummary.cgstTotal * 100) / 100,
                            samt: Math.round(invoice.financialSummary.sgstTotal * 100) / 100,
                            csamt: 0, // No CESS
                        },
                    },
                ],
            }));

            b2b.push({ ctin, inv });
        }

        return b2b;
    }

    /**
     * Build SAC-wise summary section
     */
    private buildSACSection(invoices: any[]): GSTR1SACSum[] {
        // Accumulate totals for SAC 996812 (Courier Services)
        let totalQty = 0;
        let totalVal = 0;
        let totalTxval = 0;
        let totalIamt = 0;
        let totalCamt = 0;
        let totalSamt = 0;

        for (const invoice of invoices) {
            totalQty += invoice.lineItems.length;
            totalVal += invoice.financialSummary.grandTotal;
            totalTxval += invoice.financialSummary.subtotal;
            totalIamt += invoice.financialSummary.igstTotal;
            totalCamt += invoice.financialSummary.cgstTotal;
            totalSamt += invoice.financialSummary.sgstTotal;
        }

        return [
            {
                sac_cd: '996812',
                desc: 'Courier Services',
                qty: totalQty,
                uqc: 'OTH', // Other
                val: Math.round(totalVal * 100) / 100,
                txval: Math.round(totalTxval * 100) / 100,
                iamt: Math.round(totalIamt * 100) / 100,
                camt: Math.round(totalCamt * 100) / 100,
                samt: Math.round(totalSamt * 100) / 100,
                csamt: 0,
            },
        ];
    }

    /**
     * Format date for GSTN (DD-MM-YYYY)
     */
    private formatDateForGSTN(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    /**
     * Validate GSTR-1 export against GSTN schema
     */
    validateGSTR1Export(export_: GSTR1Export): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate GSTIN
        if (!export_.gstin || !/^\d{2}[A-Z0-9]{13}$/.test(export_.gstin)) {
            errors.push('Invalid GSTIN format');
        }

        // Validate financial period
        if (!export_.fp || !/^\d{6}$/.test(export_.fp)) {
            errors.push('Invalid financial period format (should be MMYYYY)');
        }

        // Validate B2B section
        if (!export_.b2b || export_.b2b.length === 0) {
            errors.push('No B2B invoices found');
        }

        // Validate each B2B entry
        for (const b2b of export_.b2b || []) {
            if (!b2b.ctin || !/^\d{2}[A-Z0-9]{13}$/.test(b2b.ctin)) {
                errors.push(`Invalid customer GSTIN: ${b2b.ctin}`);
            }

            for (const inv of b2b.inv) {
                if (!inv.pos || !/^\d{2}$/.test(inv.pos)) {
                    errors.push(`Invalid place of supply: ${inv.pos}`);
                }

                if (!inv.itms || inv.itms.length === 0) {
                    errors.push(`No items in invoice: ${inv.inum}`);
                }

                for (const item of inv.itms) {
                    if (!item.itm_det.sac_cd) {
                        errors.push(`Missing SAC code in invoice: ${inv.inum}`);
                    }

                    // Validate tax calculation
                    const expectedTax = Math.round(item.itm_det.txval * 0.18 * 100) / 100;
                    const actualTax = item.itm_det.iamt + item.itm_det.camt + item.itm_det.samt;
                    const diff = Math.abs(expectedTax - actualTax);

                    if (diff > 0.01) { // Allow 1 paisa tolerance for rounding
                        errors.push(
                            `Tax calculation mismatch in invoice ${inv.inum}: expected ${expectedTax}, got ${actualTax}`
                        );
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}

export default new GSTRExportService();
