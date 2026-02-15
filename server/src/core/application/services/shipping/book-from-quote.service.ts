import mongoose from 'mongoose';
import { Order, Shipment } from '../../../../infrastructure/database/mongoose/models';
import { AppError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';
import { QuoteOptionOutput } from '../../../domain/types/service-level-pricing.types';
import ServiceLevelPricingMetricsService from '../metrics/service-level-pricing-metrics.service';
import QuoteEngineService from '../pricing/quote-engine.service';
import WalletService from '../wallet/wallet.service';
import { ShipmentService } from './shipment.service';

type BookingFailureStage = 'before_awb' | 'after_awb' | 'unknown';

type ShipmentCompensationHint = {
    shipmentId?: string;
    awbGenerated?: boolean;
    carrierTrackingNumber?: string;
    shipment?: {
        _id?: string;
    };
};

const FALLBACK_CONFIG = {
    enabled: true,
    maxRetries: 3,
    retryOnlyPreAWB: true,
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

        const fallbackOptions = this.getRankedFallbackOptions(
            session.options,
            option.optionId,
            FALLBACK_CONFIG.maxRetries
        );
        const attemptedOptionIds: string[] = [];
        let lastError: unknown;

        for (let index = 0; index < fallbackOptions.length; index += 1) {
            const attemptNumber = index + 1;
            const attemptOption = fallbackOptions[index];
            attemptedOptionIds.push(attemptOption.optionId);

            try {
                const result = await this.attemptBookingWithOption({
                    companyId: input.companyId,
                    userId: input.userId,
                    order,
                    sessionId: session._id.toString(),
                    option: attemptOption,
                    attemptNumber,
                    instructions: input.instructions,
                    warehouseId: input.warehouseId,
                });

                try {
                    await QuoteEngineService.selectOption(
                        input.companyId,
                        input.sellerId,
                        input.sessionId,
                        attemptOption.optionId
                    );
                } catch (selectionError) {
                    logger.warn('Shipment booked, but quote selection lock failed', {
                        sessionId: input.sessionId,
                        optionId: attemptOption.optionId,
                        error:
                            selectionError instanceof Error
                                ? selectionError.message
                                : selectionError,
                    });
                }

                ServiceLevelPricingMetricsService.recordBookingSuccess({
                    attemptNumber,
                    provider: attemptOption.provider,
                    fallbackUsed: attemptNumber > 1,
                });

                return {
                    sessionId: input.sessionId,
                    optionId: attemptOption.optionId,
                    shipment: result.shipment,
                    carrierSelection: result.carrierSelection,
                    pricingSnapshot: {
                        quotedAmount: attemptOption.quotedAmount,
                        expectedCost: attemptOption.costAmount,
                        expectedMargin: attemptOption.estimatedMargin,
                    },
                    fallbackInfo: {
                        attemptNumber,
                        fallbackUsed: attemptNumber > 1,
                        totalOptionsAvailable: session.options.length,
                        attemptedOptionIds,
                    },
                };
            } catch (error) {
                lastError = error;
                const stage = await this.applyCompensation({
                    companyId: input.companyId,
                    userId: input.userId,
                    orderId: input.orderId,
                    quoteSessionId: session._id.toString(),
                    optionId: attemptOption.optionId,
                    error,
                });
                const recoverable = this.isRecoverableError(error);
                const isLastAttempt = attemptNumber >= fallbackOptions.length;

                ServiceLevelPricingMetricsService.recordBookingFailure(stage, {
                    attemptNumber,
                    fallbackAttempted: attemptNumber > 1,
                    allOptionsExhausted: recoverable && isLastAttempt,
                    nonRecoverableStop: !recoverable,
                });

                if (!recoverable || isLastAttempt || !FALLBACK_CONFIG.enabled) {
                    throw error;
                }

                const nextOption = fallbackOptions[index + 1];
                if (nextOption) {
                    ServiceLevelPricingMetricsService.recordFallbackEvent({
                        sessionId: input.sessionId,
                        initialProvider: attemptOption.provider,
                        fallbackProvider: nextOption.provider,
                        attemptNumber: attemptNumber + 1,
                        reason: this.errorReason(error),
                    });
                }
            }
        }

        ServiceLevelPricingMetricsService.recordBookingFailure('unknown', {
            allOptionsExhausted: true,
        });
        throw (
            lastError ||
            new AppError(
                'Shipment booking failed before completion',
                ErrorCode.SYS_INTERNAL_ERROR,
                500
            )
        );
    }

    private getRankedFallbackOptions(
        sessionOptions: QuoteOptionOutput[],
        selectedOptionId: string,
        maxRetries: number
    ): QuoteOptionOutput[] {
        const selected =
            sessionOptions.find((item) => item.optionId === selectedOptionId) ||
            sessionOptions[0];
        if (!selected) {
            return [];
        }

        const remaining = sessionOptions
            .filter((item) => item.optionId !== selected.optionId)
            .sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));

        return [selected, ...remaining].slice(0, Math.max(1, maxRetries));
    }

    private async attemptBookingWithOption(args: {
        companyId: string;
        userId: string;
        order: Awaited<ReturnType<typeof Order.findOne>>;
        sessionId: string;
        option: QuoteOptionOutput;
        attemptNumber: number;
        instructions?: string;
        warehouseId?: string;
    }) {
        const { option, sessionId, attemptNumber } = args;
        const serviceType = this.mapServiceType(option.serviceName);
        const idempotencyKey = `quote-${sessionId}-${option.optionId}-a${attemptNumber}`;

        return ShipmentService.createShipment({
            order: args.order,
            companyId: new mongoose.Types.ObjectId(args.companyId),
            userId: args.userId,
            idempotencyKey,
            payload: {
                serviceType,
                carrierOverride: option.provider,
                instructions: args.instructions,
                warehouseId: args.warehouseId,
            },
            pricingDetails: {
                selectedQuote: {
                    quoteSessionId: new mongoose.Types.ObjectId(sessionId),
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
                rateCardId: null,
                rateCardName: 'service-level-pricing',
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
    }

    private isRecoverableError(error: unknown): boolean {
        if (!FALLBACK_CONFIG.retryOnlyPreAWB) {
            return true;
        }

        const hint = this.extractCompensationHint(error);
        if (hint.awbGenerated || hint.carrierTrackingNumber) {
            return false;
        }

        if (error instanceof AppError) {
            if (error.statusCode >= 500) return true;
            if (
                error.code === ErrorCode.SYS_TIMEOUT ||
                error.code === ErrorCode.EXT_SERVICE_ERROR ||
                error.code === ErrorCode.EXT_SERVICE_UNAVAILABLE ||
                error.code === ErrorCode.EXT_COURIER_FAILURE ||
                error.code === ErrorCode.VAL_PINCODE_NOT_SERVICEABLE
            ) {
                return true;
            }
            return false;
        }

        const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
        return (
            message.includes('timeout') ||
            message.includes('timed out') ||
            message.includes('temporarily unavailable') ||
            message.includes('serviceable') ||
            message.includes('econn') ||
            message.includes('etimedout')
        );
    }

    private errorReason(error: unknown): string {
        if (error instanceof AppError) {
            return `${error.code}:${error.message}`;
        }
        if (error instanceof Error) {
            return error.message;
        }
        return 'unknown_error';
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
