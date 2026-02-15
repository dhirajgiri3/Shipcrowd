import { UserPersona } from '../../../../infrastructure/database/mongoose/models';
import { ExperienceLevelType, IndustryType, MonthlyVolumeType, PrimaryGoalType } from '../../../../infrastructure/database/mongoose/models/onboarding/user-persona.model';
import logger from '../../../../shared/logger/winston.logger';

interface IPersonaInput {
    industry: IndustryType;
    monthlyVolume: MonthlyVolumeType;
    experienceLevel: ExperienceLevelType;
    primaryGoal: PrimaryGoalType;
    hasExistingEcommerce: boolean;
    platforms: string[];
}

export class PersonalizationService {
    /**
     * Save survey responses and generate recommendations
     */
    async savePersona(companyId: string, userId: string, data: IPersonaInput) {
        try {
            let persona = await UserPersona.findOne({ companyId, userId });

            if (persona) {
                // Update existing
                persona.industry = data.industry;
                persona.monthlyVolume = data.monthlyVolume;
                persona.experienceLevel = data.experienceLevel;
                persona.primaryGoal = data.primaryGoal;
                persona.hasExistingEcommerce = data.hasExistingEcommerce;
                persona.platforms = data.platforms;
            } else {
                // Create new
                persona = new UserPersona({
                    companyId,
                    userId,
                    ...data
                });
            }

            // Pre-save hook will generate recommendations automatically
            await persona.save();

            return persona;
        } catch (error) {
            logger.error('Error saving user persona:', error);
            throw error;
        }
    }

    /**
     * Get personalized recommendations for a user
     */
    async getRecommendations(companyId: string, userId: string) {
        const persona = await UserPersona.findOne({ companyId, userId });

        if (!persona) {
            // Return default/generic recommendations if no persona exists
            return {
                hasPersona: false,
                recommendedFeatures: ['Rate Calculator', 'Create Order', 'Track Shipments'],
                customOnboardingPath: ['verify_email', 'create_warehouse', 'sample_manifest'],
                priorityFeatures: []
            };
        }

        return {
            hasPersona: true,
            recommendedFeatures: persona.recommendedFeatures,
            customOnboardingPath: persona.customOnboardingPath,
            priorityFeatures: persona.priorityFeatures,
            industry: persona.industry
        };
    }
}

export default new PersonalizationService();
