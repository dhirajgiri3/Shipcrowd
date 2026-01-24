import { IUser } from '@/infrastructure/database/mongoose/models/iam/users/user.model';

/**
 * User Data Transfer Object
 * 
 * Transforms internal User model to safe API response format.
 * Excludes sensitive fields and ensures consistent serialization.
 */
export class UserDTO {
    /**
   * Convert User model to API response
   * @param user - User document from database
   * @returns Sanitized user object safe for API responses
   */
    static toResponse(user: IUser): UserResponse {
        return {
            _id: (user._id as any).toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId?.toString(), // Always string, never ObjectId
            teamRole: user.teamRole,
            teamStatus: user.teamStatus,
            googleId: user.googleId,
            oauthProvider: user.oauthProvider,
            isEmailVerified: user.isEmailVerified || false, // Default to false if undefined

            // ✅ Workflow-critical fields
            onboardingStep: user.onboardingStep,
            verificationLevel: user.verificationLevel || 0,

            avatar: user.profile?.avatar, // Use profile.avatar only
            profile: {
                phone: user.profile?.phone,
                address: user.profile?.address,
                city: user.profile?.city,
                state: user.profile?.state,
                country: user.profile?.country,
                postalCode: user.profile?.postalCode,
                dateOfBirth: user.profile?.dateOfBirth?.toISOString(),
                gender: user.profile?.gender,
                bio: user.profile?.bio,
                website: user.profile?.website,
                socialLinks: user.profile?.socialLinks,
                preferredLanguage: user.profile?.preferredLanguage,
                preferredCurrency: user.profile?.preferredCurrency,
                timezone: user.profile?.timezone,
            },
            kycStatus: {
                isComplete: user.kycStatus?.isComplete || false,
                lastUpdated: user.kycStatus?.lastUpdated?.toISOString(),
            },
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }

    /**
     * Convert User model to minimal response (for lists)
     * @param user - User document from database
     * @returns Minimal user object with essential fields only
     */
    static toMinimalResponse(user: IUser): MinimalUserResponse {
        return {
            _id: (user._id as any).toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.profile?.avatar,
            isActive: user.isActive,
        };
    };
}

/**
 * Full user response interface
 * Matches frontend User type exactly
 */
export interface UserResponse {
    _id: string;
    email: string;
    name: string;
    role: 'super_admin' | 'admin' | 'seller' | 'staff';
    companyId?: string;
    teamRole?: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
    teamStatus?: 'active' | 'invited' | 'suspended';
    googleId?: string;
    oauthProvider?: 'email' | 'google';
    isEmailVerified: boolean;

    // ✅ Workflow-critical fields
    onboardingStep?: 'email_verification' | 'business_profile' | 'kyc_submission' | 'completed';
    verificationLevel: 0 | 1 | 2 | 3;

    avatar?: string;
    profile?: {
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
        dateOfBirth?: string;
        gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
        bio?: string;
        website?: string;
        socialLinks?: {
            twitter?: string;
            linkedin?: string;
            github?: string;
            facebook?: string;
        };
        preferredLanguage?: string;
        preferredCurrency?: string;
        timezone?: string;
    };
    kycStatus: {
        isComplete: boolean;
        lastUpdated?: string;
    };
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Minimal user response for lists/references
 */
export interface MinimalUserResponse {
    _id: string;
    email: string;
    name: string;
    role: 'super_admin' | 'admin' | 'seller' | 'staff';
    avatar?: string;
    isActive: boolean;
}
