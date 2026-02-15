import { NextFunction, Request, Response } from 'express';
import QuoteEngineService from '../../../../core/application/services/pricing/quote-engine.service';
import { ValidationError } from '../../../../shared/errors/app.error';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import logger from '../../../../shared/logger/winston.logger';
import { sendCreated, sendSuccess } from '../../../../shared/utils/responseHelper';
import {
quoteCourierOptionsSchema,
selectQuoteOptionSchema,
} from '../../../../shared/validation/schemas';

export const getCourierOptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const validation = quoteCourierOptionsSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const result = await QuoteEngineService.generateQuotes({
            companyId: auth.companyId,
            sellerId: auth.userId,
            fromPincode: validation.data.fromPincode,
            toPincode: validation.data.toPincode,
            weight: validation.data.weight,
            dimensions: validation.data.dimensions,
            paymentMode: validation.data.paymentMode,
            orderValue: validation.data.orderValue,
            shipmentType: validation.data.shipmentType,
        });

        sendCreated(res, result, 'Courier quote options generated');
    } catch (error) {
        logger.error('Error generating courier options:', error);
        next(error);
    }
};

export const selectCourierOption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req);
        requireCompanyContext(auth);

        const { sessionId } = req.params;
        const validation = selectQuoteOptionSchema.safeParse(req.body);
        if (!validation.success) {
            const errors = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', errors);
        }

        const result = await QuoteEngineService.selectOption(
            auth.companyId,
            auth.userId,
            sessionId,
            validation.data.optionId
        );

        sendSuccess(res, result, 'Courier quote option selected');
    } catch (error) {
        logger.error('Error selecting courier option:', error);
        next(error);
    }
};

export default {
    getCourierOptions,
    selectCourierOption,
};
