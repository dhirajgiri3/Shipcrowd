import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../../types/express';
import { sendSuccess } from '../../../../shared/utils/responseHelper';
import { AuthenticationError, ValidationError, NotFoundError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import OnboardingProgressService from '../../../../core/application/services/onboarding/progress.service';
import AchievementService from '../../../../core/application/services/onboarding/achievement.service';
import PersonalizationService from '../../../../core/application/services/onboarding/personalization.service';
import DemoDataService from '../../../../core/application/services/onboarding/demo-data.service';
import ProductTourService from '../../../../core/application/services/onboarding/product-tour.service';
import { Company } from '../../../../infrastructure/database/mongoose/models';
import { z } from 'zod';

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
            const { companyId, _id: userId } = req.user!;
            if (!companyId || !userId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }
            const progress = await OnboardingProgressService.getProgress(companyId, userId);
            sendSuccess(res, progress, 'Onboarding progress retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getNextAction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyId } = req.user!;
            if (!companyId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }
            const action = await OnboardingProgressService.getNextAction(companyId);
            sendSuccess(res, action, 'Next recommended action');
        } catch (error) {
            next(error);
        }
    }

    async skipStep(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyId } = req.user!;
            if (!companyId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }
            const result = skipStepSchema.safeParse(req.params);

            if (!result.success) {
                throw new ValidationError('Invalid step');
            }

            const progress = await OnboardingProgressService.skipStep(companyId, result.data.step);
            sendSuccess(res, progress, 'Step skipped successfully');
        } catch (error) {
            next(error);
        }
    }

    // Personalization

    async submitPersonalization(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyId, _id: userId } = req.user!;
            if (!companyId || !userId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }
            const result = personalizeSchema.safeParse(req.body);

            if (!result.success) {
                throw new ValidationError('Invalid survey data');
            }

            const persona = await PersonalizationService.savePersona(companyId, userId, result.data);

            // Also potentially generate demo data now if user wants it (could be a flag in body)
            // For now, trigger separately or auto-trigger via service orchestration

            sendSuccess(res, persona, 'Personalization saved');
        } catch (error) {
            next(error);
        }
    }

    async getRecommendations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyId, _id: userId } = req.user!;
            if (!companyId || !userId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }
            const recommendations = await PersonalizationService.getRecommendations(companyId, userId);
            sendSuccess(res, recommendations, 'Recommendations retrieved');
        } catch (error) {
            next(error);
        }
    }

    // Gamification (Achievements)

    async getAchievements(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyId, _id: userId } = req.user!;
            if (!companyId || !userId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }

            // Update streak on view (optional, or rely on explicit login event)
            await AchievementService.checkStreak(companyId, userId);

            const stats = await AchievementService.getStats(companyId, userId);
            sendSuccess(res, stats, 'Achievements retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getLeaderboard(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        // Optional feature for later
        // Could fetch top 10 companies by points
        sendSuccess(res, [], 'Leaderboard coming soon');
    }

    // Demo Data

    async generateDemoData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyId, _id: userId } = req.user!;
            if (!companyId || !userId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }
            await DemoDataService.generateDemoData({ companyId, userId });
            sendSuccess(res, null, 'Demo data generation started');
        } catch (error) {
            next(error);
        }
    }

    async clearDemoData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyId } = req.user!;
            if (!companyId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }
            await DemoDataService.clearDemoData(companyId);

            // Update progress step
            await OnboardingProgressService.updateStep(companyId, 'demoDataCleared', req.user!._id!);

            sendSuccess(res, null, 'Demo data cleared');
        } catch (error) {
            next(error);
        }
    }

    // Product Tours

    async getAvailableTours(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyId, _id: userId, role } = req.user!;
            if (!companyId || !userId || !role) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }
            const tours = await ProductTourService.getAvailableTours(companyId, userId, role);
            sendSuccess(res, tours, 'Available tours retrieved');
        } catch (error) {
            next(error);
        }
    }

    async startTour(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyId, _id: userId } = req.user!;
            if (!companyId || !userId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }
            const { id } = req.params;

            await ProductTourService.startTour(companyId, userId, id);
            sendSuccess(res, null, 'Tour started');
        } catch (error) {
            next(error);
        }
    }

    async completeTour(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyId, _id: userId } = req.user!;
            if (!companyId || !userId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }
            const { id } = req.params;

            await ProductTourService.completeTour(companyId, userId, id);
            sendSuccess(res, null, 'Tour completed');
        } catch (error) {
            next(error);
        }
    }

    async updateTourProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { companyId, _id: userId } = req.user!;
            if (!companyId || !userId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }
            const { id } = req.params;
            const result = progressUpdateSchema.safeParse(req.body);

            if (!result.success) {
                throw new ValidationError('Invalid progress data');
            }

            await ProductTourService.updateProgress(companyId, userId, id, result.data.stepIndex, result.data.status);
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
            const { companyId, _id: userId } = req.user!;
            if (!companyId || !userId) {
                throw new AuthenticationError('User not properly authenticated', ErrorCode.AUTH_REQUIRED);
            }

            // Fetch company with all required fields
            const company = await Company.findById(companyId);
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

