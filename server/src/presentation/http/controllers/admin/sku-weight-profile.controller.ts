/**
 * Admin SKU Weight Profile Controller (Week 3)
 *
 * List, freeze, unfreeze, and bulk-learn SKU weight profiles.
 */

import { Request, Response, NextFunction } from 'express';
import skuWeightProfileService from '../../../../core/application/services/sku/sku-weight-profile.service';
import { sendSuccess, sendPaginated, calculatePagination } from '../../../../shared/utils/responseHelper';
import { guardChecks, parsePagination } from '../../../../shared/helpers/controller.helpers';
import { AppError, ValidationError } from '../../../../shared/errors/app.error';

/**
 * GET /api/v1/admin/sku-weight-profiles
 * List SKU weight profiles (admin: all companies with companyId filter; seller: own company)
 */
export async function listProfiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req);
        const { page, limit, skip } = parsePagination(req);
        const companyId = (req.query.companyId as string) || auth.companyId?.toString();
        const minConfidence = req.query.minConfidence ? Number(req.query.minConfidence) : undefined;
        const onlyFrozen = req.query.onlyFrozen === 'true';
        const search = (req.query.search as string) || undefined;

        if (!companyId) {
            throw new ValidationError('companyId is required');
        }

        const profiles = await skuWeightProfileService.listSKUMasters(companyId, {
            minConfidence,
            onlyFrozen,
            search,
        });

        const total = profiles.length;
        const paginated = profiles.slice(skip, skip + limit);
        const pagination = calculatePagination(total, page, limit);

        sendPaginated(res, paginated, pagination, 'SKU weight profiles');
    } catch (error: any) {
        next(error);
    }
}

/**
 * GET /api/v1/admin/sku-weight-profiles/:sku
 * Get one SKU weight profile (companyId in query or auth)
 */
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req);
        const { sku } = req.params;
        const companyId = (req.query.companyId as string) || auth.companyId?.toString();

        if (!companyId || !sku) {
            throw new ValidationError('companyId and sku are required');
        }

        const profile = await skuWeightProfileService.getSKUMasterDetails(companyId, sku);

        if (!profile) {
            throw new AppError(`SKU weight profile not found: ${sku}`, 'BIZ_NOT_FOUND', 404);
        }

        sendSuccess(res, profile, 'SKU weight profile');
    } catch (error: any) {
        next(error);
    }
}

/**
 * POST /api/v1/admin/sku-weight-profiles/:sku/freeze
 * Freeze weight for a SKU (admin/seller for own company)
 * Body: { frozenWeight: number, reason: string }
 */
export async function freezeWeight(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req);
        const { sku } = req.params;
        const companyId = (req.body.companyId as string) || (req.query.companyId as string) || auth.companyId?.toString();
        const { frozenWeight, reason } = req.body;

        if (!companyId || !sku) {
            throw new ValidationError('companyId and sku are required');
        }
        if (typeof frozenWeight !== 'number' || frozenWeight <= 0) {
            throw new ValidationError('frozenWeight (number > 0) is required');
        }
        if (!reason || typeof reason !== 'string') {
            throw new ValidationError('reason (string) is required');
        }

        await skuWeightProfileService.freezeWeight(
            companyId,
            sku,
            frozenWeight,
            auth.userId,
            reason
        );

        sendSuccess(res, { sku, frozenWeight, reason }, 'SKU weight frozen');
    } catch (error: any) {
        next(error);
    }
}

/**
 * POST /api/v1/admin/sku-weight-profiles/:sku/unfreeze
 * Unfreeze weight for a SKU
 */
export async function unfreezeWeight(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req);
        const { sku } = req.params;
        const companyId = (req.body.companyId as string) || (req.query.companyId as string) || auth.companyId?.toString();

        if (!companyId || !sku) {
            throw new ValidationError('companyId and sku are required');
        }

        await skuWeightProfileService.unfreezeWeight(companyId, sku);

        sendSuccess(res, { sku }, 'SKU weight unfrozen');
    } catch (error: any) {
        next(error);
    }
}

/**
 * POST /api/v1/admin/sku-weight-profiles/bulk-learn
 * Trigger bulk learning from verified shipments (admin or company)
 * Body: { companyId?: string, limit?: number }
 */
export async function bulkLearn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const auth = guardChecks(req);
        const companyId = (req.body.companyId as string) || auth.companyId?.toString();
        const limit = Math.min(Number(req.body.limit) || 1000, 5000);

        if (!companyId) {
            throw new ValidationError('companyId is required');
        }

        const processed = await skuWeightProfileService.bulkLearnFromHistory(companyId, limit);

        sendSuccess(res, { companyId, processed, limit }, `Bulk learn completed: ${processed} shipments processed`);
    } catch (error: any) {
        next(error);
    }
}

export default {
    listProfiles,
    getProfile,
    freezeWeight,
    unfreezeWeight,
    bulkLearn,
};
