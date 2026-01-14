import mongoose from 'mongoose';
import CreditNote, { ICreditNote } from '../../../../infrastructure/database/mongoose/models/finance/billing/credit-note.model';
import CreditNoteCounter from '../../../../infrastructure/database/mongoose/models/finance/billing/credit-note-counter.model';
import Invoice, { IInvoice } from '../../../../infrastructure/database/mongoose/models/finance/billing/invoice.model';
import logger from '../../../../shared/logger/winston.logger';
import { ValidationError, NotFoundError } from '../../../../shared/errors/app.error';

/**
 * Credit Note Service
 * Handles credit note creation, approval, and tax reversal calculations
 */

interface CreateCreditNoteDto {
    companyId: string;
    invoiceId: string;
    reason: 'sales_return' | 'deficiency_in_service' | 'price_adjustment' | 'rto_shipment' | 'shipment_cancellation' | 'invoice_error' | 'other';
    reasonDescription: string;
    adjustmentPercentage?: number; // 0-100, default 100 (full credit)
    referenceDocument?: {
        type: 'awb' | 'rto_event' | 'shipment' | 'other';
        id?: string;
        value: string;
    };
    createdBy: string;
}

class CreditNoteService {
    /**
     * Generate sequential credit note number (transaction-safe)
     * Format: CN-YYYYMM-XXXX
     */
    async generateCreditNoteNumber(): Promise<string> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            const counter = await CreditNoteCounter.findOneAndUpdate(
                { year, month },
                { $inc: { sequence: 1 } },
                { upsert: true, new: true, session }
            );

            const paddedSequence = counter.sequence.toString().padStart(4, '0');
            const paddedMonth = month.toString().padStart(2, '0');
            const creditNoteNumber = `CN-${year}${paddedMonth}-${paddedSequence}`;

            await session.commitTransaction();
            return creditNoteNumber;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Create credit note from invoice
     */
    async createCreditNote(data: CreateCreditNoteDto): Promise<ICreditNote> {
        // Fetch original invoice
        const invoice = await Invoice.findById(data.invoiceId)
            .populate('companyId', 'name gstin address');

        if (!invoice) {
            throw new NotFoundError('Invoice not found');
        }

        // Verify invoice belongs to company
        if (invoice.companyId._id.toString() !== data.companyId) {
            throw new ValidationError('Invoice does not belong to this company');
        }

        // Verify invoice is not cancelled
        if (invoice.status === 'cancelled') {
            throw new ValidationError('Cannot create credit note for cancelled invoice');
        }

        // Check if credit note already exists for this invoice
        const existingCreditNote = await CreditNote.findOne({
            companyId: new mongoose.Types.ObjectId(data.companyId),
            'originalInvoice.invoiceId': invoice._id,
            status: { $ne: 'cancelled' },
        });

        if (existingCreditNote) {
            throw new ValidationError(
                `Credit note ${existingCreditNote.creditNoteNumber} already exists for this invoice`
            );
        }

        // Calculate adjustment percentage
        const adjustmentPercentage = data.adjustmentPercentage || 100;
        if (adjustmentPercentage < 0 || adjustmentPercentage > 100) {
            throw new ValidationError('Adjustment percentage must be between 0 and 100');
        }

        const adjustmentRatio = adjustmentPercentage / 100;

        // Calculate tax reversal
        const adjustedLineItems = invoice.lineItems.map((item) => ({
            description: item.description,
            sacCode: item.sacCode || '',
            quantity: item.quantity,
            unitPrice: item.unitPrice,

            // Original amounts
            originalTaxableAmount: item.taxableAmount,
            originalCGST: item.cgst,
            originalSGST: item.sgst,
            originalIGST: item.igst,
            originalTotalAmount: item.totalAmount,

            // Adjusted amounts (negative for reversal)
            adjustedTaxableAmount: -Math.round(item.taxableAmount * adjustmentRatio * 100) / 100,
            adjustedCGST: -Math.round(item.cgst * adjustmentRatio * 100) / 100,
            adjustedSGST: -Math.round(item.sgst * adjustmentRatio * 100) / 100,
            adjustedIGST: -Math.round(item.igst * adjustmentRatio * 100) / 100,
            adjustedTotalAmount: -Math.round(item.totalAmount * adjustmentRatio * 100) / 100,
        }));

        // Generate credit note number
        const creditNoteNumber = await this.generateCreditNoteNumber();
        const creditNoteId = `CN-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Create credit note
        const creditNote = new CreditNote({
            creditNoteNumber,
            creditNoteId,
            creditNoteDate: new Date(),
            invoiceType: 'credit_note',
            companyId: new mongoose.Types.ObjectId(data.companyId),
            originalInvoice: {
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.createdAt,
                invoiceAmount: invoice.financialSummary.grandTotal,
            },
            reason: data.reason,
            reasonDescription: data.reasonDescription,
            referenceDocument: data.referenceDocument ? {
                type: data.referenceDocument.type,
                id: data.referenceDocument.id ? new mongoose.Types.ObjectId(data.referenceDocument.id) : undefined,
                value: data.referenceDocument.value,
            } : undefined,
            adjustment: {
                percentage: adjustmentPercentage,
                isPartial: adjustmentPercentage < 100,
            },
            lineItems: adjustedLineItems,
            financialSummary: {
                // Original totals
                originalSubtotal: invoice.financialSummary.subtotal,
                originalCGSTTotal: invoice.financialSummary.cgstTotal,
                originalSGSTTotal: invoice.financialSummary.sgstTotal,
                originalIGSTTotal: invoice.financialSummary.igstTotal,
                originalGrandTotal: invoice.financialSummary.grandTotal,

                // Adjusted totals (negative for reversal)
                adjustedSubtotal: -Math.round(invoice.financialSummary.subtotal * adjustmentRatio * 100) / 100,
                adjustedCGSTTotal: -Math.round(invoice.financialSummary.cgstTotal * adjustmentRatio * 100) / 100,
                adjustedSGSTTotal: -Math.round(invoice.financialSummary.sgstTotal * adjustmentRatio * 100) / 100,
                adjustedIGSTTotal: -Math.round(invoice.financialSummary.igstTotal * adjustmentRatio * 100) / 100,
                adjustedGrandTotal: -Math.round(invoice.financialSummary.grandTotal * adjustmentRatio * 100) / 100,
            },
            gstDetails: {
                sellerGSTIN: invoice.gstDetails.sellerGSTIN,
                buyerGSTIN: invoice.gstDetails.buyerGSTIN,
                placeOfSupply: invoice.gstDetails.placeOfSupply,
                placeOfSupplyState: invoice.gstDetails.placeOfSupplyState,
                isInterState: invoice.gstDetails.isInterState,
                reverseCharge: invoice.gstDetails.reverseCharge,
            },
            status: 'pending_approval',
            createdBy: new mongoose.Types.ObjectId(data.createdBy),
        });

        await creditNote.save();

        logger.info(`Credit note created: ${creditNoteNumber}`, {
            creditNoteId,
            invoiceNumber: invoice.invoiceNumber,
            companyId: data.companyId,
            adjustmentPercentage,
            adjustedGrandTotal: creditNote.financialSummary.adjustedGrandTotal,
        });

        return creditNote;
    }

    /**
     * List credit notes with filters
     */
    async listCreditNotes(
        companyId: string,
        filters: {
            status?: string;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        }
    ) {
        const query: any = { companyId: new mongoose.Types.ObjectId(companyId), isDeleted: false };

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

        const [creditNotes, total] = await Promise.all([
            CreditNote.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('createdBy', 'name email')
                .populate('approvedBy', 'name email'),
            CreditNote.countDocuments(query),
        ]);

        return {
            creditNotes,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get credit note by ID
     */
    async getCreditNoteById(creditNoteId: string): Promise<ICreditNote> {
        const creditNote = await CreditNote.findById(creditNoteId)
            .populate('companyId', 'name gstin address')
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name email');

        if (!creditNote) {
            throw new NotFoundError('Credit note not found');
        }

        return creditNote;
    }

    /**
     * Approve credit note (admin/auto action)
     */
    async approveCreditNote(
        creditNoteId: string,
        approvedBy: string,
        approvalNotes?: string
    ): Promise<ICreditNote> {
        const creditNote = await CreditNote.findById(creditNoteId);

        if (!creditNote) {
            throw new NotFoundError('Credit note not found');
        }

        if (creditNote.status !== 'pending_approval') {
            throw new ValidationError(`Credit note cannot be approved. Current status: ${creditNote.status}`);
        }

        creditNote.status = 'approved';
        creditNote.approvedBy = new mongoose.Types.ObjectId(approvedBy);
        creditNote.approvedAt = new Date();
        creditNote.approvalNotes = approvalNotes;

        await creditNote.save();

        logger.info(`Credit note approved: ${creditNote.creditNoteNumber}`, {
            creditNoteId,
            approvedBy,
        });

        return creditNote;
    }

    /**
     * Reject credit note
     */
    async rejectCreditNote(
        creditNoteId: string,
        rejectedBy: string,
        rejectionReason: string
    ): Promise<ICreditNote> {
        const creditNote = await CreditNote.findById(creditNoteId);

        if (!creditNote) {
            throw new NotFoundError('Credit note not found');
        }

        if (creditNote.status !== 'pending_approval') {
            throw new ValidationError(`Credit note cannot be rejected. Current status: ${creditNote.status}`);
        }

        creditNote.status = 'rejected';
        creditNote.rejectedBy = new mongoose.Types.ObjectId(rejectedBy);
        creditNote.rejectedAt = new Date();
        creditNote.rejectionReason = rejectionReason;

        await creditNote.save();

        logger.info(`Credit note rejected: ${creditNote.creditNoteNumber}`, {
            creditNoteId,
            rejectedBy,
            rejectionReason,
        });

        return creditNote;
    }
}

export default new CreditNoteService();
