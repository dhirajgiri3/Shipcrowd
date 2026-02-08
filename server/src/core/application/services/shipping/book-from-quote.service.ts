import mongoose from 'mongoose';
import { Order } from '../../../../infrastructure/database/mongoose/models';
import { ShipmentService } from './shipment.service';
import QuoteEngineService from '../pricing/quote-engine.service';
import { AppError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import ServiceLevelPricingMetricsService from '../metrics/service-level-pricing-metrics.service';

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
            throw new AppError(orderValidation.reason || 'Cannot create shipment', orderValidation.code || ErrorCode.BIZ_INVALID_STATE, 400);
        }

        const hasActive = await ShipmentService.hasActiveShipment(order._id as mongoose.Types.ObjectId);
        if (hasActive) {
            throw new AppError('An active shipment already exists for this order', ErrorCode.BIZ_SHIPMENT_EXISTS, 409);
        }

        const serviceType = this.mapServiceType(option.serviceName);
        const idempotencyKey = `quote-${session._id.toString()}-${option.optionId}`;

        try {
            const result = await ShipmentService.createShipment({
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
                        sellBreakdown: {
                            total: option.quotedAmount,
                        },
                        costBreakdown: {
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

            await QuoteEngineService.selectOption(input.companyId, input.sellerId, input.sessionId, option.optionId);
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
        } catch (error) {
            ServiceLevelPricingMetricsService.recordBookingFailure('unknown');
            throw error;
        }
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
