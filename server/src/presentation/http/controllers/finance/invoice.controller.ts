import { Request, Response, NextFunction } from 'express';
import InvoiceService from '../../../../core/application/services/finance/invoice.service';
import IRNService from '../../../../core/application/services/finance/irn.service';
import CreditNoteService from '../../../../core/application/services/finance/credit-note.service';
import GSTRExportService from '../../../../core/application/services/finance/gstr-export.service';
import DiskStorageService from '../../../../core/application/services/storage/disk-storage.service';
import { InvoicePDFTemplate } from '../../../../core/application/services/pdf/templates/invoice-pdf.template';
import { CreditNotePDFTemplate } from '../../../../core/application/services/pdf/templates/credit-note-pdf.template';
import Company from '../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import { sendEmail } from '../../../../core/application/services/communication/email.service';
import { formatFinancialPeriod } from '../../../../shared/utils/date-format.util';
import { ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Invoice Controller
 * Handles GST-compliant invoice generation and management
 * 
 * Endpoints:
 * 1. POST /billing/invoices - Create invoice
 * 2. GET /billing/invoices - List invoices
 * 3. GET /billing/invoices/:id - Get invoice details
 * 4. GET /billing/invoices/:id/download - Download PDF/CSV
 * 5. POST /billing/invoices/:id/send - Email invoice
 * 6. POST /billing/credit-notes - Create credit note
 * 7. GET /billing/tax/gst-summary - GST summary report
 * 8. POST /billing/tax/gstr-export - Export GSTR-1 JSON
 */

class InvoiceController {
    /**
     * 1. Create invoice
     * POST /billing/invoices
     */
    async createInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                shipmentIds,
                billingPeriod,
                sellerGSTIN,
                buyerGSTIN,
            } = req.body;

            if (!req.user?.companyId) {
                throw new ValidationError('Company ID required');
            }

            if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
                throw new ValidationError('At least one shipment ID required');
            }

            if (!billingPeriod || !billingPeriod.startDate || !billingPeriod.endDate) {
                throw new ValidationError('Billing period required');
            }

            if (!sellerGSTIN || !buyerGSTIN) {
                throw new ValidationError('Seller and buyer GSTIN required');
            }

            const invoice = await InvoiceService.createInvoice({
                companyId: req.user.companyId.toString(),
                shipmentIds,
                billingPeriod: {
                    startDate: new Date(billingPeriod.startDate),
                    endDate: new Date(billingPeriod.endDate),
                },
                sellerGSTIN,
                buyerGSTIN,
                createdBy: req.user._id.toString(),
            });

            res.status(201).json({
                success: true,
                message: 'Invoice created successfully',
                data: invoice,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 2. List invoices
     * GET /billing/invoices
     */
    async listInvoices(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new ValidationError('Company ID required');
            }

            const filters = {
                status: req.query.status as string,
                startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
            };

            const result = await InvoiceService.listInvoices(
                req.user.companyId.toString(),
                filters
            );

            res.status(200).json({
                success: true,
                data: result.invoices,
                pagination: result.pagination,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 3. Get invoice details
     * GET /billing/invoices/:id
     */
    async getInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const invoice = await InvoiceService.getInvoiceById(id);

            res.status(200).json({
                success: true,
                data: invoice,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 4. Download invoice
     * GET /billing/invoices/:id/download?format=pdf|csv
     */
    async downloadInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const format = (req.query.format as string) || 'pdf';

            if (!['pdf', 'csv'].includes(format)) {
                throw new ValidationError('Format must be pdf or csv');
            }

            const invoice = await InvoiceService.getInvoiceById(id);
            const company = await Company.findById(invoice.companyId);

            if (!company) {
                throw new ValidationError('Company not found');
            }

            if (format === 'pdf') {
                // Check if PDF already exists
                if (invoice.pdfUrl && await DiskStorageService.exists(invoice.pdfUrl)) {
                    // Redirect to existing file
                    const fileUrl = await DiskStorageService.getFileUrl(invoice.pdfUrl);
                    res.redirect(fileUrl);
                    return;
                }

                // Generate new PDF
                const pdfTemplate = new InvoicePDFTemplate();
                const pdfBuffer = await pdfTemplate.generatePDF(invoice, company);

                // Define storage path: invoices/YYYYMM/INV-XXXX.pdf
                const period = formatFinancialPeriod(invoice.createdAt);
                const filename = `${invoice.invoiceNumber}.pdf`;
                const storagePath = `invoices/${period}/${filename}`;

                // Upload to storage (Local Disk for now)
                const storedPath = await DiskStorageService.uploadFile(
                    pdfBuffer,
                    storagePath,
                    'application/pdf'
                );

                // Update invoice with PDF URL (relative path)
                invoice.pdfUrl = storedPath;
                await invoice.save();

                // Serve the file
                const fileUrl = await DiskStorageService.getFileUrl(storedPath);

                // If it's a download request, we might want to pipe the buffer directly 
                // for immediate download, but redirecting is cleaner for caching.
                // However, for API consistency let's serve the buffer this time 
                // and use the URL for future requests.
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Length', pdfBuffer.length);
                res.send(pdfBuffer);
                return;
            } else {
                // CSV format - TODO: Implement CSV export
                res.status(501).json({
                    success: false,
                    message: 'CSV export not yet implemented',
                });
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * 5. Send invoice via email
     * POST /billing/invoices/:id/send
     */
    async sendInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { recipients } = req.body;

            if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
                throw new ValidationError('At least one recipient email required');
            }

            const invoice = await InvoiceService.getInvoiceById(id);
            const company = await Company.findById(invoice.companyId);

            if (!company) {
                throw new ValidationError('Company not found');
            }

            // Ensure PDF is generated and stored
            let pdfBuffer: Buffer;

            if (invoice.pdfUrl && await DiskStorageService.exists(invoice.pdfUrl)) {
                // Read from storage
                const absolutePath = DiskStorageService.getAbsolutePath(invoice.pdfUrl);
                // We need fs to read it back to buffer for email attachment
                // In a perfect world, email service handles streams, but this checks out
                const fs = require('fs');
                pdfBuffer = await fs.promises.readFile(absolutePath);
            } else {
                // Generate and store
                const pdfTemplate = new InvoicePDFTemplate();
                pdfBuffer = await pdfTemplate.generatePDF(invoice, company);

                const period = formatFinancialPeriod(invoice.createdAt);
                const storagePath = `invoices/${period}/${invoice.invoiceNumber}.pdf`;

                const storedPath = await DiskStorageService.uploadFile(
                    pdfBuffer,
                    storagePath,
                    'application/pdf'
                );

                invoice.pdfUrl = storedPath;
                await invoice.save();
            }

            // Send email with PDF attachment
            const emailSubject = `Invoice ${invoice.invoiceNumber} from ShipCrowd`;
            const emailHtml = `
                <h2>Invoice from ShipCrowd</h2>
                <p>Dear ${company.name},</p>
                <p>Please find attached your invoice <strong>${invoice.invoiceNumber}</strong> for the billing period 
                ${new Date(invoice.billingPeriod.startDate).toLocaleDateString()} to 
                ${new Date(invoice.billingPeriod.endDate).toLocaleDateString()}.</p>
                <p><strong>Invoice Summary:</strong></p>
                <ul>
                    <li>Invoice Number: ${invoice.invoiceNumber}</li>
                    <li>Date: ${new Date(invoice.createdAt).toLocaleDateString()}</li>
                    <li>Subtotal: ₹${invoice.financialSummary.subtotal.toFixed(2)}</li>
                    <li>GST: ₹${(invoice.financialSummary.cgstTotal + invoice.financialSummary.sgstTotal + invoice.financialSummary.igstTotal).toFixed(2)}</li>
                    <li>Grand Total: ₹${invoice.financialSummary.grandTotal.toFixed(2)}</li>
                </ul>
                <p>Thank you for your business!</p>
                <p>Best regards,<br>ShipCrowd Team</p>
            `;

            await sendEmail(
                recipients,
                emailSubject,
                emailHtml,
                undefined,
                [
                    {
                        content: pdfBuffer.toString('base64'),
                        filename: `${invoice.invoiceNumber}.pdf`,
                        mimetype: 'application/pdf',
                    },
                ]
            );

            // Update status to sent
            await InvoiceService.updateInvoiceStatus(id, 'sent');

            logger.info(`Invoice ${invoice.invoiceNumber} sent to ${recipients.join(', ')}`);

            res.status(200).json({
                success: true,
                message: 'Invoice sent successfully',
                data: {
                    invoiceNumber: invoice.invoiceNumber,
                    sentTo: recipients,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 6. Create credit note
     * POST /billing/credit-notes
     */
    async createCreditNote(req: Request, res: Response, next: NextFunction) {
        try {
            const { invoiceId, reason, reasonDescription, adjustmentPercentage, referenceDocument } = req.body;

            if (!req.user?.companyId) {
                throw new ValidationError('Company ID required');
            }

            if (!invoiceId) {
                throw new ValidationError('Invoice ID required');
            }

            if (!reason) {
                throw new ValidationError('Reason required');
            }

            if (!reasonDescription) {
                throw new ValidationError('Reason description required');
            }

            const creditNote = await CreditNoteService.createCreditNote({
                companyId: req.user.companyId.toString(),
                invoiceId,
                reason,
                reasonDescription,
                adjustmentPercentage,
                referenceDocument,
                createdBy: req.user._id.toString(),
            });

            logger.info(`Credit note created: ${creditNote.creditNoteNumber}`, {
                creditNoteId: creditNote._id,
                invoiceId,
                reason,
            });

            res.status(201).json({
                success: true,
                message: 'Credit note created successfully',
                data: creditNote,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 7. Get GST summary
     * GET /billing/tax/gst-summary?month=202601
     */
    async getGSTSummary(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new ValidationError('Company ID required');
            }

            const month = req.query.month as string;
            if (!month || !/^\d{6}$/.test(month)) {
                throw new ValidationError('Month must be in YYYYMM format (e.g., 202601)');
            }

            const summary = await InvoiceService.getGSTSummary(
                req.user.companyId.toString(),
                month
            );

            res.status(200).json({
                success: true,
                data: summary,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 8. Export GSTR-1 JSON
     * POST /billing/tax/gstr-export?month=202601
     */
    async exportGSTR(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new ValidationError('Company ID required');
            }

            const month = req.query.month as string;
            if (!month || !/^\d{6}$/.test(month)) {
                throw new ValidationError('Month must be in YYYYMM format (e.g., 202601)');
            }

            // Parse month and year
            const monthNum = parseInt(month.substring(4, 6));
            const yearNum = parseInt(month.substring(0, 4));

            // Generate GSTR-1 export
            const gstr1Export = await GSTRExportService.generateGSTR1Export(monthNum, yearNum);

            // Set appropriate headers for JSON download
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="GSTR1_${month}.json"`);

            logger.info(`GSTR-1 export generated for ${month}`, {
                invoiceCount: gstr1Export.b2b.length,
                grandTotal: gstr1Export.gt,
            });

            res.status(200).json(gstr1Export);
        } catch (error) {
            next(error);
        }
    }

    /**
     * 9. Generate IRN for invoice
     * POST /billing/invoices/:id/generate-irn
     */
    async generateIRN(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const invoice = await InvoiceService.getInvoiceById(id);

            // Check if IRN generation is needed
            if (!IRNService.shouldGenerateIRN(invoice.financialSummary.grandTotal)) {
                res.status(400).json({
                    success: false,
                    message: `IRN not required for invoices below threshold amount`,
                    threshold: process.env.IRN_THRESHOLD_AMOUNT || 50000,
                });
                return;
            }

            // Generate IRN
            const irnResponse = await IRNService.generateIRN(id);

            res.status(200).json({
                success: true,
                message: 'IRN generated successfully',
                data: {
                    irn: irnResponse.irn,
                    ackNo: irnResponse.ackNo,
                    ackDate: irnResponse.ackDate,
                    status: irnResponse.status,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 10. Cancel IRN
     * POST /billing/invoices/:id/cancel-irn
     */
    async cancelIRN(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { reason, remarks } = req.body;

            if (!reason || !remarks) {
                throw new ValidationError('Reason and remarks are required for IRN cancellation');
            }

            const cancelResponse = await IRNService.cancelIRN(id, reason, remarks);

            res.status(200).json({
                success: true,
                message: 'IRN cancelled successfully',
                data: cancelResponse,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new InvoiceController();
