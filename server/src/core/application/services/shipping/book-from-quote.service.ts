import mongoose from 'mongoose';
import { Order, Shipment } from '../../../../infrastructure/database/mongoose/models';
import { ShipmentService } from './shipment.service';
import QuoteEngineService from '../pricing/quote-engine.service';
import WalletService from '../wallet/wallet.service';
import { AppError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import ServiceLevelPricingMetricsService from '../metrics/service-level-pricing-metrics.service';
import logger from '../../../../shared/logger/winston.logger';

type BookingFailureStage = 'before_awb' | 'after_awb' | 'unknown';

type ShipmentCompensationHint = {
    shipmentId?: string;
    awbGenerated?: boolean;
    carrierTrackingNumber?: string;
    shipment?: {
        _id?: string;
    };
};

export interface BookFromQuoteInput {
    companyId: string;
    sellerId: string;
    userId: string;
    sessionId: string;
    optionId?: string;
    orderId: string;
    instructions?: string;
    warehouseId?: string;
}

class BookFromQuoteService {
    async execute(input: BookFromQuoteInput) {
        ServiceLevelPricingMetricsService.recordBookingAttempt();

        const { session, option } = await QuoteEngineService.getSelectedOption(
            input.companyId,
            input.sellerId,
            input.sessionId,
            input.optionId
        );

        const order = await Order.findOne({
            _id: input.orderId,
            companyId: input.companyId,
            isDeleted: false,
        });

        if (!order) {
            throw new NotFoundError('Order', ErrorCode.RES_ORDER_NOT_FOUND);
        }

        const orderValidation = ShipmentService.validateOrderForShipment(order);
        if (!orderValidation.canCreate) {
            throw new AppError(
                orderValidation.reason || 'Cannot create shipment',
                orderValidation.code || ErrorCode.BIZ_INVALID_STATE,
                400
            );
        }

        const hasActive = await ShipmentService.hasActiveShipment(
            order._id as mongoose.Types.ObjectId
        );
        if (hasActive) {
            throw new AppError(
                'An active shipment already exists for this order',
                ErrorCode.BIZ_SHIPMENT_EXISTS,
                409
            );
        }

        const serviceType = this.mapServiceType(option.serviceName);
        const idempotencyKey = `quote-${session._id.toString()}-${option.optionId}`;

        let result: Awaited<ReturnType<typeof ShipmentService.createShipment>> | undefined;

        try {
            result = await ShipmentService.createShipment({
                order,
                companyId: new mongoose.Types.ObjectId(input.companyId),
                userId: input.userId,
                idempotencyKey,
                payload: {
                    serviceType,
                    carrierOverride: option.provider,
                    instructions: input.instructions,
                    warehouseId: input.warehouseId,
                },
                pricingDetails: {
                    selectedQuote: {
                        quoteSessionId: session._id,
                        optionId: option.optionId,
                        provider: option.provider,
                        serviceId: option.serviceId,
                        serviceName: option.serviceName,
                        quotedSellAmount: option.quotedAmount,
                        expectedCostAmount: option.costAmount,
                        expectedMarginAmount: option.estimatedMargin,
                        expectedMarginPercent: option.estimatedMarginPercent,
                        chargeableWeight: option.chargeableWeight,
                        zone: option.zone,
                        pricingSource: option.pricingSource,
                        confidence: option.confidence,
                        calculatedAt: new Date(),
                        sellBreakdown: option.sellBreakdown || {
                            total: option.quotedAmount,
                        },
                        costBreakdown: option.costBreakdown || {
                            total: option.costAmount,
                        },
                    },
                    rateCardName: 'Quote Session',
                    totalPrice: option.quotedAmount,
                    subtotal: option.quotedAmount,
                    codCharge: 0,
                    gstAmount: 0,
                    baseRate: option.quotedAmount,
                    weightCharge: 0,
                    zoneCharge: 0,
                    zone: option.zone,
                    customerDiscount: 0,
                    calculatedAt: new Date(),
                    calculationMethod: 'override',
                },
            });
        } catch (error) {
            const stage = await this.applyCompensation({
                companyId: input.companyId,
                userId: input.userId,
                orderId: input.orderId,
                quoteSessionId: session._id.toString(),
                optionId: option.optionId,
                error,
            });
            ServiceLevelPricingMetricsService.recordBookingFailure(stage);
            throw error;
        }

        if (!result) {
            ServiceLevelPricingMetricsService.recordBookingFailure('unknown');
            throw new AppError(
                'Shipment booking failed before completion',
                ErrorCode.SYS_INTERNAL_ERROR,
                500
            );
        }

        try {
            await QuoteEngineService.selectOption(
                input.companyId,
                input.sellerId,
                input.sessionId,
                option.optionId
            );
        } catch (selectionError) {
            logger.warn('Shipment booked, but quote selection lock failed', {
                sessionId: input.sessionId,
                optionId: option.optionId,
                error:
                    selectionError instanceof Error
                        ? selectionError.message
                        : selectionError,
            });
        }

        ServiceLevelPricingMetricsService.recordBookingSuccess();

        return {
            sessionId: input.sessionId,
            optionId: option.optionId,
            shipment: result.shipment,
            carrierSelection: result.carrierSelection,
            pricingSnapshot: {
                quotedAmount: option.quotedAmount,
                expectedCost: option.costAmount,
                expectedMargin: option.estimatedMargin,
            },
        };
    }

    private async applyCompensation(args: {
        companyId: string;
        userId: string;
        orderId: string;
        quoteSessionId: string;
        optionId: string;
        error: unknown;
    }): Promise<BookingFailureStage> {
        const hint = this.extractCompensationHint(args.error);

        const shipment = await this.findCompensationShipment({
            companyId: args.companyId,
            orderId: args.orderId,
            quoteSessionId: args.quoteSessionId,
            optionId: args.optionId,
            hintedShipmentId: hint.shipmentId,
        });

        if (!shipment) {
            return 'before_awb';
        }

        const hasAwb = Boolean(
            hint.awbGenerated ||
                hint.carrierTrackingNumber ||
                shipment.carrierDetails?.carrierTrackingNumber
        );
        const nextStatus = hasAwb ? 'booking_partial' : 'booking_failed';

        shipment.currentStatus = nextStatus;
        shipment.statusHistory.push({
            status: nextStatus,
            timestamp: new Date(),
            description: hasAwb
                ? 'Quote booking partially failed after AWB assignment. Compensation initiated.'
                : 'Quote booking failed before AWB assignment. Compensation initiated.',
        });

        await shipment.save();

        if (shipment.walletTransactionId) {
            const refundResult = await WalletService.refund(
                args.companyId,
                String(shipment.walletTransactionId),
                `Quote booking compensation (${nextStatus})`,
                args.userId
            );
            if (!refundResult.success) {
                logger.warn('Wallet refund failed during quote booking compensation', {
                    shipmentId: String(shipment._id),
                    walletTransactionId: String(shipment.walletTransactionId),
                    reason: refundResult.error,
                });
            }
        }

        return hasAwb ? 'after_awb' : 'before_awb';
    }

    private extractCompensationHint(error: unknown): ShipmentCompensationHint {
        const hint: ShipmentCompensationHint = {};
        if (!error || typeof error !== 'object') {
            return hint;
        }

        const asObject = error as ShipmentCompensationHint;
        if (typeof asObject.shipmentId === 'string') {
            hint.shipmentId = asObject.shipmentId;
        }
        if (typeof asObject.carrierTrackingNumber === 'string') {
            hint.carrierTrackingNumber = asObject.carrierTrackingNumber;
        }
        if (typeof asObject.awbGenerated === 'boolean') {
            hint.awbGenerated = asObject.awbGenerated;
        }
        if (asObject.shipment?._id) {
            hint.shipmentId = asObject.shipment._id;
        }

        return hint;
    }

    private async findCompensationShipment(args: {
        companyId: string;
        orderId: string;
        quoteSessionId: string;
        optionId: string;
        hintedShipmentId?: string;
    }) {
        if (args.hintedShipmentId && mongoose.Types.ObjectId.isValid(args.hintedShipmentId)) {
            const byId = await Shipment.findOne({
                _id: args.hintedShipmentId,
                companyId: args.companyId,
                isDeleted: false,
            });
            if (byId) {
                return byId;
            }
        }

        return Shipment.findOne({
            companyId: args.companyId,
            orderId: args.orderId,
            isDeleted: false,
            'pricingDetails.selectedQuote.quoteSessionId': args.quoteSessionId,
            'pricingDetails.selectedQuote.optionId': args.optionId,
        }).sort({ createdAt: -1 });
    }

    private mapServiceType(serviceName: string): 'express' | 'standard' {
        const normalized = (serviceName || '').toLowerCase();
        if (normalized.includes('express') || normalized.includes('air')) {
            return 'express';
        }
        return 'standard';
    }
}

export default new BookFromQuoteService();
