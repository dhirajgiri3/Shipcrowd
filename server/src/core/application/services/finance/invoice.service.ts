import mongoose from 'mongoose';
import Invoice, { IInvoice, ILineItem } from '../../../../infrastructure/database/mongoose/models/finance/billing/invoice.model';
import InvoiceCounter from '../../../../infrastructure/database/mongoose/models/finance/billing/invoice-counter.model';
import { Shipment } from '../../../../infrastructure/database/mongoose/models';
import GSTService from './gst.service';
import logger from '../../../../shared/logger/winston.logger';
import { ValidationError, NotFoundError } from '../../../../shared/errors/app.error';

/**
 * Invoice Service
 * Handles invoice generation with GST compliance
 */

interface CreateInvoiceDto {
    companyId: string;
    shipmentIds: string[];
    billingPeriod: {
        startDate: Date;
        endDate: Date;
    };
    sellerGSTIN: string; // ShipCrowd's GSTIN
    buyerGSTIN: string; // Company's GSTIN
    createdBy: string;
}

class InvoiceService {
    /**
     * Generate sequential invoice number (transaction-safe)
     * Format: INV-YYYYMM-XXXX
     */
    async generateInvoiceNumber(): Promise<string> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            const counter = await InvoiceCounter.findOneAndUpdate(
                { year, month },
                { $inc: { sequence: 1 } },
                { upsert: true, new: true, session }
            );

            const paddedSequence = counter.sequence.toString().padStart(4, '0');
            const paddedMonth = month.toString().padStart(2, '0');
            const invoiceNumber = `INV-${year}${paddedMonth}-${paddedSequence}`;

            await session.commitTransaction();
            return invoiceNumber;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Create invoice from shipments
     */
    async createInvoice(data: CreateInvoiceDto): Promise<IInvoice> {
        // Validate GSTINs
        if (!GSTService.validateGSTIN(data.sellerGSTIN)) {
            throw new ValidationError('Invalid seller GSTIN');
        }
        if (!GSTService.validateGSTIN(data.buyerGSTIN)) {
            throw new ValidationError('Invalid buyer GSTIN');
        }

        // Get state codes
        const sellerState = GSTService.getStateFromGSTIN(data.sellerGSTIN);
        const buyerState = GSTService.getStateFromGSTIN(data.buyerGSTIN);
        const isInterState = sellerState.code !== buyerState.code;

        // Fetch shipments
        const shipments = await Shipment.find({
            _id: { $in: data.shipmentIds.map(id => new mongoose.Types.ObjectId(id)) },
            companyId: new mongoose.Types.ObjectId(data.companyId),
            currentStatus: 'delivered',
        });

        if (shipments.length === 0) {
            throw new ValidationError('No delivered shipments found for invoicing');
        }

        // Generate line items
        const lineItems: ILineItem[] = [];
        let subtotal = 0;
        let cgstTotal = 0;
        let sgstTotal = 0;
        let igstTotal = 0;

        for (const shipment of shipments) {
            const freightCharge = (shipment as any).pricing?.totalAmount || (shipment as any).totalAmount || 0;

            const gstCalc = GSTService.calculateLineItemGST(
                1, // quantity
                freightCharge,
                sellerState.code,
                buyerState.code
            );

            lineItems.push({
                description: `Freight Charges - AWB: ${shipment.trackingNumber}`,
                sacCode: '996812',
                quantity: 1,
                unitPrice: freightCharge,
                taxableAmount: gstCalc.taxableAmount,
                cgst: gstCalc.cgst,
                sgst: gstCalc.sgst,
                igst: gstCalc.igst,
                totalAmount: gstCalc.totalAmount,
                shipmentReference: {
                    shipmentId: shipment._id as mongoose.Types.ObjectId,
                    awb: shipment.trackingNumber,
                },
            });

            subtotal += gstCalc.taxableAmount;
            cgstTotal += gstCalc.cgst;
            sgstTotal += gstCalc.sgst;
            igstTotal += gstCalc.igst;
        }

        const grandTotal = subtotal + cgstTotal + sgstTotal + igstTotal;

        // Generate invoice number
        const invoiceNumber = await this.generateInvoiceNumber();
        const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Create invoice
        const invoice = new Invoice({
            invoiceId,
            invoiceNumber,
            invoiceType: 'invoice',
            companyId: new mongoose.Types.ObjectId(data.companyId),
            billingPeriod: data.billingPeriod,
            lineItems,
            financialSummary: {
                subtotal: Math.round(subtotal * 100) / 100,
                cgstTotal: Math.round(cgstTotal * 100) / 100,
                sgstTotal: Math.round(sgstTotal * 100) / 100,
                igstTotal: Math.round(igstTotal * 100) / 100,
                grandTotal: Math.round(grandTotal * 100) / 100,
            },
            gstDetails: {
                sellerGSTIN: data.sellerGSTIN,
                buyerGSTIN: data.buyerGSTIN,
                placeOfSupply: buyerState.code,
                placeOfSupplyState: buyerState.name,
                isInterState,
                reverseCharge: false,
            },
            status: 'draft',
            createdBy: new mongoose.Types.ObjectId(data.createdBy),
        });

        await invoice.save();

        logger.info(`Invoice created: ${invoiceNumber}`, {
            invoiceId,
            companyId: data.companyId,
            shipmentCount: shipments.length,
            grandTotal,
        });

        return invoice;
    }

    /**
     * List invoices with filters
     */
    async listInvoices(
        companyId: string,
        filters: {
            status?: string;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        }
    ) {
        const query: any = { companyId: new mongoose.Types.ObjectId(companyId) };

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) {
                query.createdAt.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.createdAt.$lte = filters.endDate;
            }
        }

        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const [invoices, total] = await Promise.all([
            Invoice.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('createdBy', 'name email'),
            Invoice.countDocuments(query),
        ]);

        return {
            invoices,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get invoice by ID
     */
    async getInvoiceById(invoiceId: string): Promise<IInvoice> {
        const invoice = await Invoice.findById(invoiceId)
            .populate('companyId', 'name gstin address')
            .populate('createdBy', 'name email');

        if (!invoice) {
            throw new NotFoundError('Invoice not found');
        }

        return invoice;
    }

    /**
     * Update invoice status
     */
    async updateInvoiceStatus(
        invoiceId: string,
        status: 'sent' | 'paid' | 'overdue' | 'cancelled'
    ): Promise<IInvoice> {
        const invoice = await Invoice.findByIdAndUpdate(
            invoiceId,
            {
                $set: {
                    status,
                    ...(status === 'sent' && { sentAt: new Date() }),
                    ...(status === 'paid' && { paidAt: new Date() }),
                },
            },
            { new: true }
        );

        if (!invoice) {
            throw new NotFoundError('Invoice not found');
        }

        return invoice;
    }

    /**
     * Get GST summary for a period
     */
    async getGSTSummary(companyId: string, month: string) {
        // month format: YYYYMM (e.g., "202601")
        const year = parseInt(month.substring(0, 4));
        const monthNum = parseInt(month.substring(4, 6));

        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59);

        const invoices = await Invoice.find({
            companyId: new mongoose.Types.ObjectId(companyId),
            status: { $in: ['sent', 'paid'] },
            createdAt: { $gte: startDate, $lte: endDate },
        });

        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;
        let totalTaxable = 0;

        for (const invoice of invoices) {
            totalCGST += invoice.financialSummary.cgstTotal;
            totalSGST += invoice.financialSummary.sgstTotal;
            totalIGST += invoice.financialSummary.igstTotal;
            totalTaxable += invoice.financialSummary.subtotal;
        }

        return {
            period: month,
            invoiceCount: invoices.length,
            totalTaxable: Math.round(totalTaxable * 100) / 100,
            totalCGST: Math.round(totalCGST * 100) / 100,
            totalSGST: Math.round(totalSGST * 100) / 100,
            totalIGST: Math.round(totalIGST * 100) / 100,
            totalGST: Math.round((totalCGST + totalSGST + totalIGST) * 100) / 100,
        };
    }
}

export default new InvoiceService();
