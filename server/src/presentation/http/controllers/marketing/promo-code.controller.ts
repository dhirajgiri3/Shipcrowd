import { NextFunction, Request, Response } from 'express';
import PromoCodeService from '../../../../core/application/services/marketing/promo-code.service';
import { ValidationError } from '../../../../shared/errors/app.error';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';

import { parseQueryDate } from '../../../../shared/utils/dateRange';
import { sendCreated, sendSuccess } from '../../../../shared/utils/responseHelper';

/**
 * Promo Code Controller
 * Handles marketing promotions
 * 
 * Endpoints:
 * 1. POST /promos - Create promo code
 * 2. POST /promos/validate - Validate promo
 * 3. POST /promos/apply - Apply promo (checkout)
 * 4. GET /promos - List promos
 */

class PromoCodeController {
    /**
     * Create promo code
     * POST /promos
     */
    async createPromo(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                code,
                discountType,
                discountValue,
                validFrom,
                validUntil,
                minOrderValue,
                maxDiscount,
                usageLimit,
                carriers
            } = req.body;

            const auth = guardChecks(req);
            requireCompanyContext(auth);

            const promo = await PromoCodeService.createPromo({
                code,
                companyId: auth.companyId,
                discountType,
                discountValue,
                validFrom: parseQueryDate(validFrom as string | undefined),
                validUntil: parseQueryDate(validUntil as string | undefined, { endOfDayIfDateOnly: true }) || new Date(),
                minOrderValue,
                maxDiscount,
                usageLimit,
                carriers,
            });

            sendCreated(res, promo, 'Promo code created successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Validate promo code
     * POST /promos/validate
     */
    async validatePromo(req: Request, res: Response, next: NextFunction) {
        try {
            const { code, orderAmount, carrier, serviceType } = req.body;

            if (!code || !orderAmount) {
                throw new ValidationError('Code and orderAmount are required');
            }

            const auth = guardChecks(req);
            requireCompanyContext(auth);

            const result = await PromoCodeService.validatePromo(
                code,
                orderAmount,
                auth.userId,
                auth.companyId,
                { carrier, serviceType }
            );

            sendSuccess(res, {
                valid: result.valid,
                discountAmount: result.discountAmount,
                code: result.coupon?.code,
                discountType: result.coupon?.discount.type,
                discountValue: result.coupon?.discount.value,
            }, result.message || (result.valid ? 'Promo code valid' : 'Invalid promo code'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * List promo codes
     * GET /promos
     */
    async listPromos(req: Request, res: Response, next: NextFunction) {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);

            const activeOnly = req.query.active === 'true';
            const promos = await PromoCodeService.listPromos(auth.companyId, activeOnly);

            sendSuccess(res, promos);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update promo code
     * PATCH /promos/:id
     */
    async updatePromo(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = req.body;

            const auth = guardChecks(req);
            requireCompanyContext(auth);

            const normalizedData = { ...data };
            if (typeof normalizedData.validFrom === 'string') {
                normalizedData.validFrom = parseQueryDate(normalizedData.validFrom);
            }
            if (typeof normalizedData.validUntil === 'string') {
                normalizedData.validUntil = parseQueryDate(normalizedData.validUntil, { endOfDayIfDateOnly: true });
            }

            const promo = await PromoCodeService.updatePromo(
                id,
                auth.companyId,
                normalizedData
            );

            sendSuccess(res, { promo }, 'Promo code updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete promo code (Soft Delete)
     * DELETE /promos/:id
     */
    async deletePromo(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const auth = guardChecks(req);
            requireCompanyContext(auth);

            await PromoCodeService.deletePromo(id, auth.companyId);

            sendSuccess(res, null, 'Promo code deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new PromoCodeController();
