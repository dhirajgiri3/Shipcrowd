/**
 * IRN Service
 * Handles GSTN e-Invoice (IRN) generation, cancellation, and status checks
 * Supports both production GSTN API and mock mode for development
 */

import axios, { AxiosInstance } from 'axios';
import InvoiceIRNLog from '../../../../infrastructure/database/mongoose/models/finance/billing/invoice-irn-log.model';
import Invoice, { IInvoice } from '../../../../infrastructure/database/mongoose/models/finance/billing/invoice.model';
import Company from '../../../../infrastructure/database/mongoose/models/organization/core/company.model';
import { IRN_CONFIG, Shipcrowd } from '../../../../shared/constants/shipcrowd.constants';
import { ExternalServiceError, ValidationError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';
import { formatGSTNDate } from '../../../../shared/utils/date-format.util';
import {
GSTNErrorResponse,
GSTNInvoicePayload,
IRNCancelRequest,
IRNCancelResponse,
IRNResponse,
} from './irn.types';

class IRNService {
    private client: AxiosInstance | null = null;
    private isMockMode: boolean;

    constructor() {
        this.isMockMode = !process.env.GSTN_API_URL;

        if (!this.isMockMode) {
            this.client = axios.create({
                baseURL: process.env.GSTN_API_URL,
                timeout: IRN_CONFIG.API_TIMEOUT_MS,
                headers: {
                    'Content-Type': 'application/json',
                    'client_id': process.env.GSTN_CLIENT_ID || '',
                    'client_secret': process.env.GSTN_CLIENT_SECRET || '',
                },
            });

            logger.info('IRN Service initialized in PRODUCTION mode');
        } else {
            logger.warn('⚠️  IRN Service running in MOCK MODE - No GSTN_API_URL configured');
            logger.warn('⚠️  Mock IRNs will be generated for development/testing purposes');
        }
    }

    /**
     * Check if invoice qualifies for IRN generation based on amount threshold
     */
    shouldGenerateIRN(grandTotal: number): boolean {
        return grandTotal >= IRN_CONFIG.THRESHOLD_AMOUNT;
    }

    /**
     * Generate IRN for an invoice
     */
    async generateIRN(invoiceId: string): Promise<IRNResponse> {
        const startTime = Date.now();

        // Fetch invoice with company details
        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            throw new ValidationError('Invoice not found');
        }

        const company = await Company.findById(invoice.companyId);
        if (!company) {
            throw new ValidationError('Company not found');
        }

        // Check if IRN already generated
        if (invoice.irn && invoice.irnStatus === 'generated') {
            throw new ValidationError(`IRN already generated: ${invoice.irn}`);
        }

        // Build GSTN payload
        const payload = this.buildIRNPayload(invoice, company);

        try {
            let response: IRNResponse;

            if (this.isMockMode) {
                // Generate mock IRN for development
                response = this.generateMockIRN(invoice);
                logger.info(`[MOCK] Generated IRN for invoice ${invoice.invoiceNumber}`, {
                    irn: response.irn,
                });
            } else {
                // Call production GSTN API
                const apiResponse = await this.client!.post('/eInvoice/generate', payload);
                response = this.parseGSTNResponse(apiResponse.data);
                logger.info(`Generated IRN for invoice ${invoice.invoiceNumber}`, {
                    irn: response.irn,
                    ackNo: response.ackNo,
                });
            }

            // Update invoice with IRN data
            await Invoice.updateOne(
                { _id: invoiceId },
                {
                    $set: {
                        irn: response.irn,
                        irnGeneratedAt: new Date(),
                        irnStatus: 'generated',
                        qrCodeData: response.qrCode,
                        signedInvoiceJson: response.signedInvoice,
                    },
                }
            );

            // Log success
            await this.logIRNAction(
                invoiceId,
                'generate',
                payload,
                response,
                'success',
                Date.now() - startTime
            );

            return response;
        } catch (error: any) {
            // Log failure
            await this.logIRNAction(
                invoiceId,
                'generate',
                payload,
                null,
                'failed',
                Date.now() - startTime,
                error.message,
                error.response?.data?.error_cd
            );

            // Update invoice status to failed
            await Invoice.updateOne({ _id: invoiceId }, { $set: { irnStatus: 'failed' } });

            // Parse GSTN error if available
            if (error.response?.data?.error_cd) {
                const gstnError = error.response.data as GSTNErrorResponse;
                throw new ExternalServiceError(
                    'GSTN IRP',
                    `IRN generation failed: [${gstnError.error_cd}] ${gstnError.message}`
                );
            }

            throw new ExternalServiceError('GSTN IRP', `IRN generation failed: ${error.message}`);
        }
    }

    /**
     * Cancel an existing IRN
     */
    async cancelIRN(invoiceId: string, reason: string, remarks: string): Promise<IRNCancelResponse> {
        const startTime = Date.now();

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            throw new ValidationError('Invoice not found');
        }

        if (!invoice.irn) {
            throw new ValidationError('No IRN found for this invoice');
        }

        if (invoice.irnStatus === 'cancelled') {
            throw new ValidationError('IRN already cancelled');
        }

        const cancelRequest: IRNCancelRequest = {
            irn: invoice.irn,
            cnlRsn: reason,
            cnlRem: remarks,
        };

        try {
            let response: IRNCancelResponse;

            if (this.isMockMode) {
                response = {
                    irn: invoice.irn,
                    cancelDate: new Date().toISOString(),
                    status: 'CNL',
                };
                logger.info(`[MOCK] Cancelled IRN ${invoice.irn}`);
            } else {
                const apiResponse = await this.client!.post('/eInvoice/cancel', cancelRequest);
                response = apiResponse.data;
                logger.info(`Cancelled IRN ${invoice.irn}`);
            }

            // Update invoice status
            await Invoice.updateOne(
                { _id: invoiceId },
                { $set: { irnStatus: 'cancelled' } }
            );

            // Log cancellation
            await this.logIRNAction(
                invoiceId,
                'cancel',
                cancelRequest,
                response,
                'success',
                Date.now() - startTime
            );

            return response;
        } catch (error: any) {
            await this.logIRNAction(
                invoiceId,
                'cancel',
                cancelRequest,
                null,
                'failed',
                Date.now() - startTime,
                error.message
            );

            throw new ExternalServiceError('GSTN IRP', `IRN cancellation failed: ${error.message}`);
        }
    }

    /**
     * Build GSTN INV-01 payload from invoice data
     */
    private buildIRNPayload(invoice: IInvoice, company: any): GSTNInvoicePayload {
        return {
            Version: '1.1',
            TranDtls: {
                TaxSch: 'GST',
                SupTyp: 'B2B',
                RegRev: invoice.gstDetails.reverseCharge ? 'Y' : 'N',
                IgstOnIntra: 'N',
            },
            DocDtls: {
                Typ: invoice.invoiceType === 'credit_note' ? 'CRN' : 'INV',
                No: invoice.invoiceNumber,
                Dt: formatGSTNDate(invoice.createdAt),
            },
            SellerDtls: {
                Gstin: Shipcrowd.GSTIN,
                LglNm: Shipcrowd.LEGAL_NAME,
                Addr1: Shipcrowd.ADDRESS.line1,
                Addr2: Shipcrowd.ADDRESS.line2 || undefined,
                Loc: Shipcrowd.ADDRESS.city,
                Pin: parseInt(Shipcrowd.ADDRESS.pincode),
                Stcd: Shipcrowd.ADDRESS.stateCode,
                Em: Shipcrowd.CONTACT.email,
            },
            BuyerDtls: {
                Gstin: invoice.gstDetails.buyerGSTIN,
                LglNm: company.name,
                Pos: invoice.gstDetails.placeOfSupply,
                Addr1: company.address?.line1 || '',
                Addr2: company.address?.line2 || undefined,
                Loc: company.address?.city || '',
                Pin: parseInt(company.address?.postalCode || '000000'),
                Stcd: invoice.gstDetails.placeOfSupply,
            },
            ItemList: invoice.lineItems.map((item, index) => ({
                SlNo: (index + 1).toString(),
                PrdDesc: item.description,
                IsServc: 'Y', // Courier services
                Qty: item.quantity,
                Unit: 'OTH',
                UnitPrice: item.unitPrice,
                TotAmt: item.taxableAmount,
                AssAmt: item.taxableAmount,
                GstRt: Shipcrowd.GST_RATE * 100, // 18
                IgstAmt: item.igst || undefined,
                CgstAmt: item.cgst || undefined,
                SgstAmt: item.sgst || undefined,
                TotItemVal: item.totalAmount,
            })),
            ValDtls: {
                AssVal: invoice.financialSummary.subtotal,
                CgstVal: invoice.financialSummary.cgstTotal || undefined,
                SgstVal: invoice.financialSummary.sgstTotal || undefined,
                IgstVal: invoice.financialSummary.igstTotal || undefined,
                TotInvVal: invoice.financialSummary.grandTotal,
            },
        };
    }

    /**
     * Generate mock IRN for development/testing
     */
    private generateMockIRN(invoice: IInvoice): IRNResponse {
        // Generate realistic-looking mock IRN (64 characters)
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 15).toUpperCase();
        const mockIRN = `MOCK${timestamp}${random}`.padEnd(64, '0').substring(0, 64);

        // Mock QR code data (in production, this is a signed QR from GSTN)
        const qrData = JSON.stringify({
            irn: mockIRN,
            invoice: invoice.invoiceNumber,
            date: formatGSTNDate(invoice.createdAt),
            seller: Shipcrowd.GSTIN,
            buyer: invoice.gstDetails.buyerGSTIN,
            total: invoice.financialSummary.grandTotal,
        });

        return {
            irn: mockIRN,
            ackNo: `ACK${Date.now()}`,
            ackDate: new Date().toISOString(),
            qrCode: Buffer.from(qrData).toString('base64'),
            signedInvoice: JSON.stringify({ mock: true, invoiceNumber: invoice.invoiceNumber }),
            status: 'ACT',
        };
    }

    /**
     * Parse GSTN API response
     */
    private parseGSTNResponse(data: any): IRNResponse {
        return {
            irn: data.Irn,
            ackNo: data.AckNo,
            ackDate: data.AckDt,
            qrCode: data.SignedQRCode,
            signedInvoice: data.SignedInvoice,
            status: data.Status,
            ewbNo: data.EwbNo,
            ewbDt: data.EwbDt,
            ewbValidTill: data.EwbValidTill,
        };
    }

    /**
     * Log IRN action to audit trail
     */
    private async logIRNAction(
        invoiceId: string,
        action: 'generate' | 'cancel' | 'get_status',
        requestPayload: any,
        responsePayload: any,
        status: 'success' | 'failed',
        responseTimeMs: number,
        errorMessage?: string,
        errorCode?: string
    ): Promise<void> {
        try {
            await InvoiceIRNLog.create({
                invoiceId,
                action,
                requestPayload,
                responsePayload,
                status,
                errorCode,
                errorMessage,
                attemptNumber: 1, // TODO: Implement retry logic with attempt tracking
                responseTimeMs,
            });
        } catch (error) {
            logger.error('Failed to log IRN action:', error);
            // Don't throw - logging failure shouldn't break the main flow
        }
    }
}

export default new IRNService();
