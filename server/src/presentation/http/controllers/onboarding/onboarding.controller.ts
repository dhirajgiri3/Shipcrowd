import { NextFunction, Response } from 'express';
import { z } from 'zod';
import AchievementService from '../../../../core/application/services/onboarding/achievement.service';
import DemoDataService from '../../../../core/application/services/onboarding/demo-data.service';
import PersonalizationService from '../../../../core/application/services/onboarding/personalization.service';
import ProductTourService from '../../../../core/application/services/onboarding/product-tour.service';
import OnboardingProgressService from '../../../../core/application/services/onboarding/progress.service';
import { Company } from '../../../../infrastructure/database/mongoose/models';
import { NotFoundError, ValidationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import { guardChecks, requireCompanyContext } from '../../../../shared/helpers/controller.helpers';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { AuthRequest } from '../../../../types/express';

// Validation Schemas
// SECURITY: Only non-critical steps can be skipped
const skipStepSchema = z.object({
    step: z.enum(['demoDataCleared']) // walletRecharged removed - cannot be skipped
});

const personalizeSchema = z.object({
    industry: z.enum(['fashion', 'electronics', 'food', 'books', 'cosmetics', 'home_decor', 'sports', 'other']),
    monthlyVolume: z.enum(['under_100', '100_to_1000', '1000_to_5000', 'over_5000']),
    experienceLevel: z.enum(['new_to_ecommerce', 'beginner', 'intermediate', 'experienced']),
    primaryGoal: z.enum(['save_money', 'scale_fast', 'better_tracking', 'reduce_rto', 'automate_operations']),
    hasExistingEcommerce: z.boolean(),
    platforms: z.array(z.string()).default([])
});

const progressUpdateSchema = z.object({
    stepIndex: z.number().int().min(0),
    status: z.enum(['started', 'skipped'])
});

export class OnboardingController {

    // Progress & Actions

    async getProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const progress = await OnboardingProgressService.getProgress(auth.companyId, auth.userId);
            sendSuccess(res, progress, 'Onboarding progress retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getNextAction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const action = await OnboardingProgressService.getNextAction(auth.companyId);
            sendSuccess(res, action, 'Next recommended action');
        } catch (error) {
            next(error);
        }
    }

    async skipStep(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const result = skipStepSchema.safeParse(req.params);

            if (!result.success) {
                throw new ValidationError('Invalid step');
            }

            const progress = await OnboardingProgressService.skipStep(auth.companyId, result.data.step);
            sendSuccess(res, progress, 'Step skipped successfully');
        } catch (error) {
            next(error);
        }
    }

    // Personalization

    async submitPersonalization(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const result = personalizeSchema.safeParse(req.body);

            if (!result.success) {
                throw new ValidationError('Invalid survey data');
            }

            const persona = await PersonalizationService.savePersona(auth.companyId, auth.userId, result.data);

            // Also potentially generate demo data now if user wants it (could be a flag in body)
            // For now, trigger separately or auto-trigger via service orchestration

            sendSuccess(res, persona, 'Personalization saved');
        } catch (error) {
            next(error);
        }
    }

    async getRecommendations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const recommendations = await PersonalizationService.getRecommendations(auth.companyId, auth.userId);
            sendSuccess(res, recommendations, 'Recommendations retrieved');
        } catch (error) {
            next(error);
        }
    }

    // Gamification (Achievements)

    async getAchievements(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);

            // Update streak on view (optional, or rely on explicit login event)
            await AchievementService.checkStreak(auth.companyId, auth.userId);

            const stats = await AchievementService.getStats(auth.companyId, auth.userId);
            sendSuccess(res, stats, 'Achievements retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getLeaderboard(_req: AuthRequest, res: Response, _next: NextFunction): Promise<void> {
        // Optional feature for later
        // Could fetch top 10 companies by points
        sendSuccess(res, [], 'Leaderboard coming soon');
    }

    // Demo Data

    async generateDemoData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            await DemoDataService.generateDemoData({ companyId: auth.companyId, userId: auth.userId });
            sendSuccess(res, null, 'Demo data generation started');
        } catch (error) {
            next(error);
        }
    }

    async clearDemoData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            await DemoDataService.clearDemoData(auth.companyId);

            // Update progress step
            await OnboardingProgressService.updateStep(auth.companyId, 'demoDataCleared', auth.userId);

            sendSuccess(res, null, 'Demo data cleared');
        } catch (error) {
            next(error);
        }
    }

    // Product Tours

    async getAvailableTours(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const role = req.user?.role;
            const tours = await ProductTourService.getAvailableTours(auth.companyId, auth.userId, role!);
            sendSuccess(res, tours, 'Available tours retrieved');
        } catch (error) {
            next(error);
        }
    }

    async startTour(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            await ProductTourService.startTour(auth.companyId, auth.userId, id);
            sendSuccess(res, null, 'Tour started');
        } catch (error) {
            next(error);
        }
    }

    async completeTour(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;

            await ProductTourService.completeTour(auth.companyId, auth.userId, id);
            sendSuccess(res, null, 'Tour completed');
        } catch (error) {
            next(error);
        }
    }

    async updateTourProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);
            const { id } = req.params;
            const result = progressUpdateSchema.safeParse(req.body);

            if (!result.success) {
                throw new ValidationError('Invalid progress data');
            }

            await ProductTourService.updateProgress(auth.companyId, auth.userId, id, result.data.stepIndex, result.data.status);
            sendSuccess(res, null, 'Tour progress updated');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Complete Onboarding - Validates minimum company profile and sets profileStatus to 'complete'
     * SECURITY: This is the gate that unlocks seller dashboard access
     */
    async completeOnboarding(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const auth = guardChecks(req);
            requireCompanyContext(auth);

            // Fetch company with all required fields
            const company = await Company.findById(auth.companyId);
            if (!company) {
                throw new NotFoundError('Company not found', ErrorCode.RES_COMPANY_NOT_FOUND);
            }

            // Validate minimum required fields
            const errors: string[] = [];

            // Company name should not be auto-generated default
            if (!company.name || company.name.includes("'s Company")) {
                errors.push('Please set a proper company name');
            }

            // Address validation
            if (!company.address?.line1) {
                errors.push('Address line 1 is required');
            }
            if (!company.address?.city) {
                errors.push('City is required');
            }
            if (!company.address?.state) {
                errors.push('State is required');
            }
            if (!company.address?.postalCode) {
                errors.push('Postal code is required');
            }

            // If there are validation errors, return them
            if (errors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: 'Please complete your company profile',
                    code: 'ONBOARDING_INCOMPLETE',
                    errors,
                });
                return;
            }

            // Update company profileStatus to complete
            company.profileStatus = 'complete';
            await company.save();

            sendSuccess(res, {
                profileStatus: 'complete',
                redirectTo: '/seller'
            }, 'Onboarding completed successfully');
        } catch (error) {
            next(error);
        }
    }
}

export default new OnboardingController();

