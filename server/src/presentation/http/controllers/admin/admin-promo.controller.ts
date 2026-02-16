import PromoCodeService from '../../../../core/application/services/marketing/promo-code.service';
import { Coupon } from '../../../../infrastructure/database/mongoose/models';
import { ValidationError } from '../../../../shared/errors/app.error';
import { guardChecks, requirePlatformAdmin } from '../../../../shared/helpers/controller.helpers';
import { sendCreated, sendSuccess } from '../../../../shared/utils/responseHelper';
import { NextFunction, Request, Response } from 'express';

const resolveTargetCompanyId = async (req: Request, id?: string): Promise<string> => {
    if (req.body?.companyId) return String(req.body.companyId);
    if (req.query?.companyId) return String(req.query.companyId);

    if (id) {
        const promo = await Coupon.findById(id).select('companyId').lean();
        if (promo?.companyId) return String(promo.companyId);
    }

    throw new ValidationError('companyId is required');
};

export const listPromosAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const activeOnly = req.query.active === 'true';
        const companyId = req.query.companyId ? String(req.query.companyId) : undefined;

        if (companyId) {
            const promos = await PromoCodeService.listPromos(companyId, activeOnly);
            sendSuccess(res, promos, 'Promos retrieved successfully');
            return;
        }

        const query: Record<string, unknown> = { isDeleted: false };
        if (activeOnly) {
            query.isActive = true;
            query.validUntil = { $gte: new Date() };
        }

        const promos = await Coupon.find(query).sort({ createdAt: -1 }).lean();
        sendSuccess(res, promos, 'Promos retrieved successfully');
    } catch (error) {
        next(error);
    }
};

export const createPromoAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const companyId = await resolveTargetCompanyId(req);
        const promo = await PromoCodeService.createPromo({
            ...req.body,
            companyId,
        });

        sendCreated(res, { promoCode: promo }, 'Promo code created successfully');
    } catch (error) {
        next(error);
    }
};

export const updatePromoAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const { id } = req.params;
        const companyId = await resolveTargetCompanyId(req, id);
        const promo = await PromoCodeService.updatePromo(id, companyId, req.body || {});

        sendSuccess(res, { promoCode: promo }, 'Promo code updated successfully');
    } catch (error) {
        next(error);
    }
};

export const deletePromoAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        requirePlatformAdmin(auth);

        const { id } = req.params;
        const companyId = await resolveTargetCompanyId(req, id);
        await PromoCodeService.deletePromo(id, companyId);

        sendSuccess(res, null, 'Promo code deleted successfully');
    } catch (error) {
        next(error);
    }
};

export default {
    listPromosAdmin,
    createPromoAdmin,
    updatePromoAdmin,
    deletePromoAdmin,
};
