import mongoose, { Document, Schema } from 'mongoose';

/**
 * Achievement Model
 * Gamification system for onboarding and feature adoption
 */

export type BadgeType =
    | 'email_verified'
    | 'kyc_submitted'
    | 'kyc_approved'
    | 'warehouse_created'
    | 'first_order'
    | 'power_user_50'
    | 'power_user_100'
    | 'power_user_500'
    | 'wallet_recharged'
    | 'integration_connected'
    | 'team_invite'
    | 'perfect_week'
    | 'quick_start';

export interface IBadge {
    badgeId: BadgeType;
    name: string;
    description: string;
    icon: string;
    points: number;
    unlockedAt: Date;
}

export interface IAchievement extends Document {
    _id: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;

    badges: IBadge[];
    totalPoints: number;
    level: number;

    // Streak tracking
    currentStreak: number;
    longestStreak: number;
    lastActiveDate?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>({
    badgeId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    points: {
        type: Number,
        required: true
    },
    unlockedAt: {
        type: Date,
        required: true,
        default: Date.now
    }
}, { _id: false });

const AchievementSchema = new Schema<IAchievement>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        badges: {
            type: [BadgeSchema],
            default: []
        },
        totalPoints: {
            type: Number,
            default: 0,
            min: 0
        },
        level: {
            type: Number,
            default: 1,
            min: 1,
            max: 10
        },
        currentStreak: {
            type: Number,
            default: 0,
            min: 0
        },
        longestStreak: {
            type: Number,
            default: 0,
            min: 0
        },
        lastActiveDate: Date
    },
    {
        timestamps: true
    }
);

// Indexes
AchievementSchema.index({ companyId: 1, userId: 1 }, { unique: true });
AchievementSchema.index({ totalPoints: -1 }); // For leaderboard
AchievementSchema.index({ level: -1 });

// Badge definitions
export const BADGE_DEFINITIONS: Record<BadgeType, Omit<IBadge, 'unlockedAt'>> = {
    email_verified: {
        badgeId: 'email_verified',
        name: 'First Steps',
        description: 'Verified your email address',
        icon: '🎯',
        points: 10
    },
    kyc_submitted: {
        badgeId: 'kyc_submitted',
        name: 'Paperwork Started',
        description: 'Submitted KYC documents',
        icon: '📋',
        points: 20
    },
    kyc_approved: {
        badgeId: 'kyc_approved',
        name: 'Verified Shipper',
        description: 'KYC approved and ready to ship',
        icon: '✅',
        points: 50
    },
    warehouse_created: {
        badgeId: 'warehouse_created',
        name: 'Base Camp',
        description: 'Created your first warehouse',
        icon: '🏭',
        points: 30
    },
    first_order: {
        badgeId: 'first_order',
        name: 'Launch Day',
        description: 'Created your first shipping order',
        icon: '🚀',
        points: 100
    },
    power_user_50: {
        badgeId: 'power_user_50',
        name: 'Getting Started',
        description: 'Shipped 50 orders',
        icon: '📦',
        points: 150
    },
    power_user_100: {
        badgeId: 'power_user_100',
        name: 'Power Shipper',
        description: 'Shipped 100 orders',
        icon: '⚡',
        points: 300
    },
    power_user_500: {
        badgeId: 'power_user_500',
        name: 'Elite Shipper',
        description: 'Shipped 500 orders',
        icon: '💎',
        points: 1000
    },
    wallet_recharged: {
        badgeId: 'wallet_recharged',
        name: 'Fueled Up',
        description: 'Recharged your wallet',
        icon: '💰',
        points: 25
    },
    integration_connected: {
        badgeId: 'integration_connected',
        name: 'Connected',
        description: 'Connected an e-commerce integration',
        icon: '🔗',
        points: 75
    },
    team_invite: {
        badgeId: 'team_invite',
        name: 'Team Builder',
        description: 'Invited a team member',
        icon: '👥',
        points: 40
    },
    perfect_week: {
        badgeId: 'perfect_week',
        name: 'Perfect Week',
        description: 'Active for 7 days straight',
        icon: '🔥',
        points: 200
    },
    quick_start: {
        badgeId: 'quick_start',
        name: 'Quick Start',
        description: 'Completed onboarding in under 24 hours',
        icon: '⚡',
        points: 150
    }
};

// Methods
AchievementSchema.methods.unlockBadge = function (badgeId: BadgeType): boolean {
    // Check if already unlocked
    if (this.badges.some((b: IBadge) => b.badgeId === badgeId)) {
        return false;
    }

    const badgeDefinition = BADGE_DEFINITIONS[badgeId];
    if (!badgeDefinition) {
        return false;
    }

    const newBadge: IBadge = {
        ...badgeDefinition,
        unlockedAt: new Date()
    };

    this.badges.push(newBadge);
    this.totalPoints += badgeDefinition.points;
    this.level = this.calculateLevel();

    return true;
};

AchievementSchema.methods.calculateLevel = function (): number {
    const points = this.totalPoints;

    // Level thresholds
    if (points >= 2000) return 10;
    if (points >= 1500) return 9;
    if (points >= 1000) return 8;
    if (points >= 750) return 7;
    if (points >= 500) return 6;
    if (points >= 350) return 5;
    if (points >= 200) return 4;
    if (points >= 100) return 3;
    if (points >= 50) return 2;
    return 1;
};

AchievementSchema.methods.updateStreak = function (): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!this.lastActiveDate) {
        this.currentStreak = 1;
        this.lastActiveDate = today;
        this.longestStreak = Math.max(this.longestStreak, 1);
        return;
    }

    const lastActive = new Date(this.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // Same day, no change
        return;
    } else if (diffDays === 1) {
        // Consecutive day
        this.currentStreak += 1;
        this.lastActiveDate = today;
        this.longestStreak = Math.max(this.longestStreak, this.currentStreak);

        // Check for perfect week badge
        if (this.currentStreak === 7) {
            this.unlockBadge('perfect_week');
        }
    } else {
        // Streak broken
        this.currentStreak = 1;
        this.lastActiveDate = today;
    }
};

const Achievement = mongoose.model<IAchievement>('Achievement', AchievementSchema);

export default Achievement;
