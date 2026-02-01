import { Request, Response, NextFunction } from 'express';
import PromoCodeService from '../../../../core/application/services/marketing/promo-code.service';
import { ValidationError } from '../../../../shared/errors/app.error';

import { sendSuccess, sendCreated } from '../../../../shared/utils/responseHelper';

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
                validUntil,
                minOrderValue,
                maxDiscount,
                usageLimit,
                carriers
            } = req.body;

            if (!req.user?.companyId) {
                throw new ValidationError('Company ID required');
            }

            const promo = await PromoCodeService.createPromo({
                code,
                companyId: req.user.companyId.toString(),
                discountType,
                discountValue,
                validUntil: new Date(validUntil),
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

            if (!req.user?.companyId) {
                throw new ValidationError('Company ID required');
            }

            const result = await PromoCodeService.validatePromo(
                code,
                orderAmount,
                req.user._id.toString(),
                req.user.companyId.toString(),
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
            if (!req.user?.companyId) {
                throw new ValidationError('Company ID required');
            }

            const activeOnly = req.query.active === 'true';
            const promos = await PromoCodeService.listPromos(req.user.companyId.toString(), activeOnly);

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

            if (!req.user?.companyId) {
                throw new ValidationError('Company ID required');
            }

            const promo = await PromoCodeService.updatePromo(
                id,
                req.user.companyId.toString(),
                data
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

            if (!req.user?.companyId) {
                throw new ValidationError('Company ID required');
            }

            await PromoCodeService.deletePromo(id, req.user.companyId.toString());

            sendSuccess(res, null, 'Promo code deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new PromoCodeController();
