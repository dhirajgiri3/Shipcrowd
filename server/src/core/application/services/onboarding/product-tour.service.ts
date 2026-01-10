import { ProductTour, TourCompletion, ITourStep } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

export class ProductTourService {
    /**
     * Get available tours for a user based on role and criteria
     */
    async getAvailableTours(companyId: string, userId: string, role: string) {
        try {
            // Fetch user persona
            const { UserPersona } = await import('../../../../infrastructure/database/mongoose/models/index.js');
            const userPersona = await UserPersona.findOne({ userId });

            // Build query
            const query: any = { isActive: true };
            if (role) query.targetRoles = role;

            // Filter by persona/industry/stage if available
            if (userPersona) {
                // Example: If tour targets specific industries
                // Note: Assuming ProductTour model has 'targetIndustries' or similar. 
                // If not, we'll stick to role for now and just log the persona usage
                // or add logic if specific fields exist.

                // For this implementation, we'll prioritize tours that match the user's industry
                if (userPersona.industry) {
                    // logic to boost or filter
                    // Example: if (tour.targetIndustry === userPersona.industry) ...
                }
            }

            const tours = await ProductTour.find(query);

            // Fetch completion status for these tours
            const completions = await TourCompletion.find({
                companyId,
                userId,
                tourId: { $in: tours.map((t: any) => t._id) }
            });

            // Map completion status to tours
            return tours.map((tour: any) => {
                const completion = completions.find((c: any) => c.tourId.toString() === tour._id.toString());
                return {
                    ...tour.toObject(),
                    userStatus: completion ? completion.status : 'not_started',
                    currentStepIndex: completion ? completion.currentStepIndex : 0,
                    // Dynamic Priority: Boost priority if matches persona
                    priority: (tour.targetRoles?.includes(role) ? 10 : 0) // Simple example
                };
            });
        } catch (error) {
            logger.error('Error fetching available tours:', error);
            throw error;
        }
    }

    /**
     * Start a tour interaction
     */
    async startTour(companyId: string, userId: string, tourId: string) {
        try {
            const tour = await ProductTour.findById(tourId);
            if (!tour) throw new Error('Tour not found');

            let completion = await TourCompletion.findOne({ companyId, userId, tourId });

            if (!completion) {
                completion = new TourCompletion({
                    companyId,
                    userId,
                    tourId,
                    tourIdentifier: tour.tourId,
                    status: 'started',
                    currentStepIndex: 0
                });
                await completion.save();
            }

            return completion;
        } catch (error) {
            logger.error('Error starting tour:', error);
            throw error;
        }
    }

    /**
     * Complete a tour interaction
     */
    async completeTour(companyId: string, userId: string, tourId: string) {
        try {
            const completion = await TourCompletion.findOne({ companyId, userId, tourId });

            if (completion && completion.status !== 'completed') {
                completion.status = 'completed';
                completion.completedAt = new Date();
                completion.currentStepIndex = -1; // Done
                await completion.save();

                // TODO: Trigger achievement rewards here if applicable
            }

            return { success: true };
        } catch (error) {
            logger.error('Error completing tour:', error);
            throw error;
        }
    }

    /**
     * Update progress (skip or next step)
     */
    async updateProgress(companyId: string, userId: string, tourId: string, stepIndex: number, status: 'started' | 'skipped') {
        try {
            const completion = await TourCompletion.findOne({ companyId, userId, tourId });

            if (completion) {
                completion.currentStepIndex = stepIndex;
                completion.status = status;
                completion.lastInteractionAt = new Date();
                await completion.save();
            }

            return completion;
        } catch (error) {
            logger.error('Error updating tour progress:', error);
            throw error;
        }
    }
}

export default new ProductTourService();
