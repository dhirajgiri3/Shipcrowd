import { Achievement, BADGE_DEFINITIONS, BadgeType } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

export class AchievementService {
    /**
     * Unlock a specific badge for a user
     */
    async unlockBadge(companyId: string, userId: string, badgeId: BadgeType) {
        try {
            let achievement = await Achievement.findOne({ companyId, userId });

            if (!achievement) {
                // Create initial record if logic flow skipped progress service
                achievement = new Achievement({
                    companyId,
                    userId,
                    badges: [],
                    totalPoints: 0,
                    level: 1
                });
            }

            // Attempt unlock
            // @ts-ignore
            const unlocked = achievement.unlockBadge(badgeId);

            if (unlocked) {
                await achievement.save();

                logger.info(`Badge unlocked: ${badgeId} for user ${userId}`);

                // Return details for frontend toast
                const badgeDef = BADGE_DEFINITIONS[badgeId];
                return {
                    unlocked: true,
                    badge: badgeDef,
                    newLevel: achievement.level,
                    totalPoints: achievement.totalPoints
                };
            }

            return { unlocked: false };
        } catch (error) {
            logger.error(`Error unlocking badge ${badgeId}:`, error);
            throw error;
        }
    }

    /**
     * Check and update streak for a user
     * Should be called on daily login or activity
     */
    async checkStreak(companyId: string, userId: string) {
        try {
            const achievement = await Achievement.findOne({ companyId, userId });
            if (!achievement) return null;

            const oldStreak = achievement.currentStreak;
            // @ts-ignore
            achievement.updateStreak();

            if (achievement.currentStreak !== oldStreak) {
                await achievement.save();

                // Return streak info for frontend
                return {
                    streakUpdated: true,
                    currentStreak: achievement.currentStreak,
                    longestStreak: achievement.longestStreak,
                    isPerfectWeek: achievement.badges.some((b: any) => b.badgeId === 'perfect_week')
                };
            }

            return { streakUpdated: false };
        } catch (error) {
            logger.error('Error updating streak:', error);
            return null;
        }
    }

    /**
     * Get user achievements and stats
     */
    async getStats(companyId: string, userId: string) {
        const achievement = await Achievement.findOne({ companyId, userId });

        if (!achievement) {
            return {
                badges: [],
                totalPoints: 0,
                level: 1,
                currentStreak: 0,
                nextLevelProgress: 0
            };
        }

        // Calculate progress to next level
        // Simple logic: Each level allows unlocking level * 100 points roughly
        // Or just use fixed thresholds: 50, 100, 200, 350, 500...
        const points = achievement.totalPoints;
        let nextThreshold = 50;
        if (points >= 2000) nextThreshold = 5000;
        else if (points >= 1500) nextThreshold = 2000;
        else if (points >= 1000) nextThreshold = 1500;
        else if (points >= 750) nextThreshold = 1000;
        else if (points >= 500) nextThreshold = 750;
        else if (points >= 350) nextThreshold = 500;
        else if (points >= 200) nextThreshold = 350;
        else if (points >= 100) nextThreshold = 200;
        else if (points >= 50) nextThreshold = 100;

        const progressPercent = Math.min(100, Math.floor((points / nextThreshold) * 100));

        return {
            badges: achievement.badges,
            totalPoints: achievement.totalPoints,
            level: achievement.level,
            currentStreak: achievement.currentStreak,
            nextLevelProgress: progressPercent,
            nextLevelThreshold: nextThreshold
        };
    }
}

export default new AchievementService();
