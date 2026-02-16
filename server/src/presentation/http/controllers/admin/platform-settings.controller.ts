import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import adminPlatformSettingsService from '../../../../core/application/services/system/admin-platform-settings.service';
import { ValidationError } from '../../../../shared/errors/app.error';
import { guardChecks } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';

const updatePlatformSettingsSchema = z.object({
    serviceability: z.object({
        metroCities: z.array(z.string().min(1)).max(200),
    }),
});

export const getPlatformSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await adminPlatformSettingsService.getSettings();
        sendSuccess(res, settings, 'Platform settings retrieved successfully');
    } catch (error) {
        next(error);
    }
};

export const updatePlatformSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const auth = guardChecks(req, { requireCompany: false });
        const validation = updatePlatformSettingsSchema.safeParse(req.body);

        if (!validation.success) {
            const details = validation.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            throw new ValidationError('Validation failed', details);
        }

        const settings = await adminPlatformSettingsService.updateMetroCities(
            validation.data.serviceability.metroCities,
            auth.userId
        );

        sendSuccess(res, settings, 'Platform settings updated successfully');
    } catch (error) {
        next(error);
    }
};

export default {
    getPlatformSettings,
    updatePlatformSettings,
};
